import { CONTENT_VERSION, getWord } from '../data/catalog'
import { nextCourseClass } from '../data/course'
import type { AppState, CourseClass, ExitTestState, Question, Quiz, QuizFlag, SentenceTestItem, Session } from '../data/types'
import { addDays, dueWords, reviewed } from './progress'

export type ExerciseAction =
  | { type: 'answer'; choice: string }
  | { type: 'spellInput'; value: string }
  | { type: 'submitSpell' }
  | { type: 'next' }
  | { type: 'skip' }
  | { type: 'hint'; open: boolean }
  | { type: 'heard' }
  | { type: 'sentenceTestInput'; value: string }
  | { type: 'submitSentenceTest' }
  | { type: 'nextSentenceTest' }

export type Action = ExerciseAction
  | { type: 'start'; mode: 'lesson' | 'review'; classId?: string }
  | { type: 'leaveResult' }
  | { type: 'peek'; wordId: string }
  | { type: 'settings'; value: Partial<AppState['settings']> }

export const freshState = (): AppState => ({
  schemaVersion: 2, contentVersion: CONTENT_VERSION, words: {}, session: null,
  settings: { volume: 0.8, spokenGuidance: true, onboardingSeen: false, learningPlan: 'standard', planSelected: false, chineseVoice: 'xiaoxiao' },
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
    ...session, phase: 'active', question: session.mode === 'review' ? 'spell' : 'card',
    choices: { read: shuffle(ids, random), listen: shuffle(ids, random) }, input: '',
    flags: { read: newFlag(), listen: newFlag(), spell: newFlag() },
    hintOpen: false, heard: false, feedback: null, settled: false,
  }
}

function sentenceItem(wordId: string): SentenceTestItem {
  const word = getWord(wordId)
  const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(^|[^A-Za-z])(${escaped})(?![A-Za-z])`, 'i').exec(word.sentence)
  if (!match) throw new Error(`Sentence does not contain ${word.word}`)
  const start = match.index + match[1].length
  return { wordId, promptBefore: word.sentence.slice(0, start), promptAfter: word.sentence.slice(start + match[2].length), displayAnswer: match[2], sentenceZh: word.sentenceZh, audio: word.audio.sentence }
}

function beginExitTest(session: Session): Session {
  const items = session.wordIds.filter(id => !session.skippedWordIds.includes(id)).map(sentenceItem)
  if (!items.length) return { ...session, phase: 'result', exitTest: null }
  const results = Object.fromEntries(items.map(item => [item.wordId, { firstAttemptCorrect: null, attempts: 0, correct: false }]))
  const exitTest: ExitTestState = { items, index: 0, input: '', feedback: null, results, passed: false }
  return { ...session, phase: 'exit-test', exitTest, input: '', feedback: null, heard: false }
}

export function createSession(mode: Session['mode'], ids: string[], courseClass: CourseClass | null, random = Math.random): Session {
  if (!ids.length) throw new Error('An exercise needs at least one word')
  if (mode === 'lesson' && !courseClass) throw new Error('A lesson needs a course class')
  return prepareWord({
    mode, phase: 'active', classId: courseClass?.id ?? null, classSequence: courseClass?.sequence ?? null, unitId: courseClass?.unitId ?? null,
    groupIds: courseClass?.groupIds ?? [], planAtStart: courseClass?.plan ?? null, wordIds: ids,
    skippedWordIds: [], index: 0, completed: 0, retry: 0, exitTest: null,
  } as unknown as Session, random)
}

export const normalizeSpelling = (value: string) => value.trim().toLocaleLowerCase('en-US')
export const validSpellingInput = (value: string) => value.length <= 64 && Array.from(value).every(character => {
  const code = character.charCodeAt(0)
  return code >= 32 && code !== 127
})

function stepExitTest(original: Session, action: ExerciseAction): Session {
  if (original.phase !== 'exit-test' || !original.exitTest) return original
  const session = structuredClone(original)
  const test = session.exitTest!
  const item = test.items[test.index]
  const result = test.results[item.wordId]
  if (action.type === 'sentenceTestInput') {
    if (result.correct || !validSpellingInput(action.value)) return original
    test.input = action.value; test.feedback = null
  } else if (action.type === 'submitSentenceTest') {
    if (result.correct || !test.input.trim()) return original
    const correct = normalizeSpelling(test.input) === normalizeSpelling(item.displayAnswer)
    result.attempts++
    if (result.firstAttemptCorrect === null) result.firstAttemptCorrect = correct
    result.correct = correct; test.feedback = correct ? 'correct' : 'retry'
  } else if (action.type === 'nextSentenceTest') {
    if (!result.correct) return original
    if (test.index === test.items.length - 1) { test.passed = true; session.phase = 'result' }
    else { test.index++; test.input = ''; test.feedback = null }
  } else return original
  return session
}

export function stepSession(original: Session, action: ExerciseAction, random = Math.random): Session {
  if (original.phase === 'exit-test') return stepExitTest(original, action)
  if (original.phase !== 'active' || action.type === 'skip') return original
  const session = structuredClone(original)
  const q = session.question
  if (action.type === 'hint') {
    if (!isQuiz(q) || session.flags[q].done) return original
    session.hintOpen = action.open
    if (action.open) session.flags[q].hint = true
    session.input = ''; session.feedback = null
    return session
  }
  if (session.hintOpen) return original
  if (action.type === 'heard') { session.heard = true; return session }
  if (action.type === 'answer') {
    if (q !== 'read' && q !== 'listen') return original
    if (session.flags[q].done || (q === 'listen' && !session.heard) || !session.choices[q].includes(action.choice)) return original
    const correct = action.choice === session.wordIds[session.index]
    session.flags[q].done = correct; session.flags[q].error ||= !correct; session.feedback = correct ? 'correct' : 'retry'
  } else if (action.type === 'spellInput') {
    if (q !== 'spell' || session.flags.spell.done || !session.heard || !validSpellingInput(action.value)) return original
    session.input = action.value; session.feedback = null
  } else if (action.type === 'submitSpell') {
    if (q !== 'spell' || session.flags.spell.done || !session.heard) return original
    const correct = normalizeSpelling(session.input) === normalizeSpelling(getWord(session.wordIds[session.index]).word)
    session.flags.spell.done = correct; session.flags.spell.error ||= !correct; session.feedback = correct ? 'correct' : 'retry'
  } else if (action.type === 'next') {
    if (isQuiz(q) && !session.flags[q].done) return original
    if (q === 'sentence') {
      if (session.index === session.wordIds.length - 1) return session.mode === 'lesson' ? beginExitTest(session) : { ...session, phase: 'result' }
      session.index++
      return prepareWord(session, random)
    }
    const flow: Question[] = session.mode === 'review' ? ['spell', 'listen', 'read', 'sentence'] : ['card', 'read', 'listen', 'spell', 'sentence']
    session.question = flow[flow.indexOf(q) + 1]; session.heard = false; session.feedback = null; session.input = ''
  } else return original
  if (!session.settled && Object.values(session.flags).every(flag => flag.done)) {
    session.settled = true; session.completed++
    if (!independent(session)) session.retry++
  }
  return session
}

export function reduce(state: AppState, action: Action, day: string, random = Math.random): AppState {
  if (action.type === 'settings') return { ...state, settings: { ...state.settings, ...action.value } }
  if (action.type === 'leaveResult') return state.session?.phase === 'result' ? { ...state, session: null } : state
  if (action.type === 'start') {
    if (state.session && state.session.phase !== 'result') return state
    let courseClass: CourseClass | null = null
    let ids: string[] = []
    if (action.mode === 'review') ids = dueWords(state, day).slice(0, 10)
    else {
      if (dueWords(state, day).length) return state
      courseClass = nextCourseClass(state.settings.learningPlan, id => state.words[id]?.teaching === 'completed')
      if (!courseClass || courseClass.plan !== state.settings.learningPlan || (action.classId && action.classId !== courseClass.id)) return state
      ids = courseClass.wordIds
    }
    if (!ids.length) return state
    const session = createSession(action.mode, ids, courseClass, random)
    const progress = { ...state.words }
    if (action.mode === 'lesson') progress[ids[0]] = { teaching: 'started', reviewStep: 0, nextReviewOn: null, lastReviewedOn: null }
    return { ...state, session, words: progress }
  }
  const old = state.session
  if (!old) return state
  if (action.type === 'peek') {
    if (old.mode !== 'review' || old.phase !== 'active' || old.settled || old.wordIds[old.index] !== action.wordId) return state
    const session = structuredClone(old)
    Object.values(session.flags).forEach(flag => { flag.hint = true })
    if (session.question === 'spell' && !session.flags.spell.done) { session.input = ''; session.feedback = null }
    return { ...state, session }
  }
  if (action.type === 'skip') {
    if (old.mode !== 'lesson' || old.phase !== 'active' || old.question !== 'card') return state
    const session = structuredClone(old)
    const progress = { ...state.words }
    const id = old.wordIds[old.index]
    progress[id] = { teaching: 'completed', reviewStep: 0, lastReviewedOn: null, nextReviewOn: addDays(day, 1) }
    session.skippedWordIds.push(id); session.completed++
    if (old.index === old.wordIds.length - 1) return { ...state, session: beginExitTest(session), words: progress }
    session.index++
    const prepared = prepareWord(session, random)
    progress[prepared.wordIds[prepared.index]] = { teaching: 'started', reviewStep: 0, nextReviewOn: null, lastReviewedOn: null }
    return { ...state, session: prepared, words: progress }
  }
  const session = stepSession(old, action, random)
  if (session === old) return state
  const progress = { ...state.words }
  if (old.mode === 'review' && !old.settled && session.settled) {
    const id = old.wordIds[old.index]
    progress[id] = reviewed(progress[id], independent(session), day)
  }
  if (session.mode === 'lesson' && old.phase === 'active' && old.index !== session.index) {
    const oldId = old.wordIds[old.index]
    if (progress[oldId]?.teaching === 'started') delete progress[oldId]
    progress[session.wordIds[session.index]] = { teaching: 'started', reviewStep: 0, nextReviewOn: null, lastReviewedOn: null }
  }
  if (session.mode === 'lesson' && old.phase === 'active' && session.phase === 'exit-test') {
    const current = old.wordIds[old.index]
    if (progress[current]?.teaching === 'started') delete progress[current]
  }
  if (session.mode === 'lesson' && old.phase === 'exit-test' && session.phase === 'result' && session.exitTest?.passed) {
    for (const id of session.wordIds.filter(id => !session.skippedWordIds.includes(id))) progress[id] = { teaching: 'completed', reviewStep: 0, lastReviewedOn: null, nextReviewOn: addDays(day, 1) }
  }
  return { ...state, session, words: progress }
}
