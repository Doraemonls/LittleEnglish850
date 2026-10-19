import { CONTENT_VERSION, getWord, lessonWords } from '../data/catalog'
import type { AppState, Question, Quiz, QuizFlag, Session } from '../data/types'
import { addDays, dueWords, nextLesson, reviewed } from './progress'

export type SpellEdit = { kind: 'insert'; value: string } | { kind: 'delete' } | { kind: 'reject' }
export type ExerciseAction =
  | { type: 'answer'; choice: string }
  | { type: 'spell'; edit: SpellEdit }
  | { type: 'next' }
  | { type: 'hint'; open: boolean }
  | { type: 'heard' }

export type Action = ExerciseAction
  | { type: 'start'; mode: 'lesson' | 'review'; lessonId?: number }
  | { type: 'leaveResult' }
  | { type: 'peek'; wordId: string }
  | { type: 'settings'; value: Partial<AppState['settings']> }

export const freshState = (): AppState => ({
  schemaVersion: 1, contentVersion: CONTENT_VERSION, words: {}, session: null,
  settings: { volume: 0.8, spokenGuidance: true, onboardingSeen: false, chineseVoice: 'xiaoxiao' },
})

const newFlag = (): QuizFlag => ({ done: false, error: false, hint: false })
export const isQuiz = (question: Question): question is Quiz => ['read', 'listen', 'spell'].includes(question)
export const independent = (session: Session) => Object.values(session.flags).every(flag => flag.done && !flag.error && !flag.hint)

function shuffle(list: string[], random: () => number): string[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function prepareWord(session: Session, random: () => number): Session {
  const ids = getWord(session.wordIds[session.index]).options
  return {
    ...session, question: session.mode === 'review' ? 'spell' : 'card',
    choices: { read: shuffle(ids, random), listen: shuffle(ids, random) },
    input: '', flags: { read: newFlag(), listen: newFlag(), spell: newFlag() },
    hintOpen: false, heard: false, feedback: null, settled: false,
  }
}

export function createSession(mode: Session['mode'], ids: string[], lessonId: number | null, random = Math.random): Session {
  if (!ids.length) throw new Error('An exercise needs at least one word')
  return prepareWord({ mode, phase: 'active', lessonId, wordIds: ids, index: 0, completed: 0, retry: 0 } as Session, random)
}

export function spellEdit(answer: string, input: string, edit: SpellEdit) {
  const letters = answer.toLowerCase().replace(/[^a-z]/g, '')
  if (edit.kind === 'delete') return { input: input.slice(0, -1), error: false, done: false, rejected: false }
  if (edit.kind === 'reject' || !/^[a-z]$/i.test(edit.value)) return { input: '', error: true, done: false, rejected: true }
  const value = edit.value.toLowerCase()
  if (value !== letters[input.length]) return { input: '', error: true, done: false, rejected: false }
  const next = input + value
  return { input: next, error: false, done: next === letters, rejected: false }
}

export function stepSession(original: Session, action: ExerciseAction, random = Math.random): Session {
  if (original.phase !== 'active') return original
  const session = structuredClone(original)
  const q = session.question
  if (action.type === 'hint') {
    if (!isQuiz(q) || session.flags[q].done) return original
    session.hintOpen = action.open
    if (action.open) session.flags[q].hint = true
    session.input = ''
    session.feedback = null
    return session
  }
  if (session.hintOpen) return original
  if (action.type === 'heard') { session.heard = true; return session }
  if (action.type === 'answer') {
    if (q !== 'read' && q !== 'listen') return original
    if (session.flags[q].done || (q === 'listen' && !session.heard) || !session.choices[q].includes(action.choice)) return original
    const correct = action.choice === session.wordIds[session.index]
    session.flags[q].done = correct
    session.flags[q].error ||= !correct
    session.feedback = correct ? 'correct' : 'retry'
  } else if (action.type === 'spell') {
    if (q !== 'spell' || session.flags.spell.done || !session.heard) return original
    const result = spellEdit(getWord(session.wordIds[session.index]).word, session.input, action.edit)
    session.input = result.input
    session.flags.spell.done = result.done
    session.flags.spell.error ||= result.error
    session.feedback = result.done ? 'correct' : result.rejected ? 'letters' : result.error ? 'retry' : null
  } else if (action.type === 'next') {
    if (isQuiz(q) && !session.flags[q].done) return original
    if (q === 'sentence') {
      if (session.index === session.wordIds.length - 1) {
        session.phase = 'result'
        return session
      }
      session.index++
      return prepareWord(session, random)
    }
    const flow: Question[] = session.mode === 'review' ? ['spell', 'listen', 'read', 'sentence'] : ['card', 'read', 'listen', 'spell', 'sentence']
    session.question = flow[flow.indexOf(q) + 1]
    session.heard = false
    session.feedback = null
    session.input = ''
  }
  if (!session.settled && Object.values(session.flags).every(flag => flag.done)) {
    session.settled = true
    session.completed++
    if (!independent(session)) session.retry++
  }
  return session
}

export function reduce(state: AppState, action: Action, day: string, random = Math.random): AppState {
  if (action.type === 'settings') return { ...state, settings: { ...state.settings, ...action.value } }
  if (action.type === 'leaveResult') return state.session?.phase === 'result' ? { ...state, session: null } : state
  if (action.type === 'start') {
    if (state.session?.phase === 'active') return state
    const lessonId = action.mode === 'lesson' ? action.lessonId ?? nextLesson(state) : null
    const ids = action.mode === 'review' ? dueWords(state, day).slice(0, 10) : lessonId ? lessonWords(lessonId).filter(word => state.words[word.id]?.teaching !== 'completed').map(word => word.id) : []
    if (!ids.length) return state
    const session = createSession(action.mode, ids, lessonId, random)
    const progress = { ...state.words }
    if (action.mode === 'lesson') progress[ids[0]] = { teaching: 'started', reviewStep: 0, nextReviewOn: null, lastReviewedOn: null }
    return { ...state, session, words: progress }
  }
  const old = state.session
  if (!old) return state
  if (action.type === 'peek') {
    if (old.mode !== 'review' || old.phase !== 'active' || old.settled || old.wordIds[old.index] !== action.wordId) return state
    const session = structuredClone(old)
    // Browsing an answer disqualifies this word's whole round, including future questions.
    Object.values(session.flags).forEach(flag => { flag.hint = true })
    if (session.question === 'spell' && !session.flags.spell.done) { session.input = ''; session.feedback = null }
    return { ...state, session }
  }
  const session = stepSession(old, action, random)
  if (session === old) return state
  const progress = { ...state.words }
  if (!old.settled && session.settled) {
    const id = old.wordIds[old.index]
    if (old.mode === 'lesson') progress[id] = { teaching: 'completed', reviewStep: 0, lastReviewedOn: null, nextReviewOn: addDays(day, 1) }
    if (old.mode === 'review') progress[id] = reviewed(progress[id], independent(session), day)
  }
  if (session.mode === 'lesson' && old.index !== session.index) {
    progress[session.wordIds[session.index]] = { teaching: 'started', reviewStep: 0, lastReviewedOn: null, nextReviewOn: null }
  }
  return { ...state, session, words: progress }
}
