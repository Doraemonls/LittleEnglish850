import { byId, CONTENT_VERSION, getWord } from '../data/catalog'
import { unitById } from '../data/course'
import type { AppState, Session } from '../data/types'
import { freshState, normalizeSpelling, reduce, validSpellingInput, type Action } from '../domain/session'
import { localDay } from '../domain/progress'

export const STORAGE_KEY = 'little-english-850'
export type SaveStatus = 'saved' | 'unsaved' | 'unreadable' | 'conflict'
export interface Snapshot { state: AppState; status: SaveStatus }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const bool = (value: unknown) => typeof value === 'boolean'
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && Number(value) >= min && Number(value) <= max
const date = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  return localDay(new Date(y, m - 1, d, 12)) === value
}

function validateProgress(value: Record<string, unknown>) {
  let started = 0
  for (const [id, progress] of Object.entries(value)) {
    if (!byId.has(id) || !object(progress) || !['started', 'completed'].includes(String(progress.teaching)) || !integer(progress.reviewStep, 0, 3)) throw new Error('Invalid progress')
    if (progress.lastReviewedOn !== null && !date(progress.lastReviewedOn)) throw new Error('Invalid review date')
    if (progress.teaching === 'started') {
      started++
      if (progress.reviewStep !== 0 || progress.lastReviewedOn !== null || progress.nextReviewOn !== null) throw new Error('Invalid started progress')
    } else if (!date(progress.nextReviewOn) || (progress.lastReviewedOn && progress.nextReviewOn <= String(progress.lastReviewedOn)) || (Number(progress.reviewStep) > 0 && progress.lastReviewedOn === null)) throw new Error('Invalid completed progress')
  }
  if (started > 1) throw new Error('Too many started words')
  return started
}

function validSession(value: unknown, state: AppState): value is Session {
  if (!object(value) || !['lesson', 'review'].includes(String(value.mode)) || !['active', 'exit-test', 'result'].includes(String(value.phase))) return false
  if (!Array.isArray(value.wordIds) || !value.wordIds.length || value.wordIds.length > (value.mode === 'lesson' ? 8 : 10) || new Set(value.wordIds).size !== value.wordIds.length || !value.wordIds.every(id => typeof id === 'string' && byId.has(id))) return false
  const wordIds = value.wordIds as string[]
  if (!Array.isArray(value.skippedWordIds) || !value.skippedWordIds.every(id => wordIds.includes(id)) || new Set(value.skippedWordIds).size !== value.skippedWordIds.length) return false
  if (!integer(value.index, 0, value.wordIds.length - 1) || !integer(value.completed, 0, value.wordIds.length) || !integer(value.retry, 0, value.completed)) return false
  if (value.mode === 'lesson') {
    if (typeof value.classId !== 'string' || !value.classId || !integer(value.classSequence, 1, 170) || typeof value.unitId !== 'string' || !['standard', 'accelerated'].includes(String(value.planAtStart)) || !Array.isArray(value.groupIds) || !value.groupIds.length || !value.groupIds.every(id => typeof id === 'string') || new Set(value.groupIds).size !== value.groupIds.length) return false
    const unit = unitById.get(value.unitId)
    const selectedGroups = value.groupIds.map(id => unit?.groups.find(group => group.id === id))
    if (!unit || selectedGroups.some(group => !group) || selectedGroups.some(group => !group!.wordIds.some(id => wordIds.includes(id)))) return false
    const orderedIds = selectedGroups.flatMap(group => group!.wordIds).filter(id => wordIds.includes(id))
    if (orderedIds.length !== wordIds.length || orderedIds.some((id, index) => id !== wordIds[index])) return false
  } else if (value.classId !== null || value.classSequence !== null || value.unitId !== null || value.planAtStart !== null || !Array.isArray(value.groupIds) || value.groupIds.length) return false

  const expectedTestIds = wordIds.filter(id => !(value.skippedWordIds as string[]).includes(id))
  const validExitTest = (candidate: unknown, passed: boolean) => {
    if (!object(candidate) || !Array.isArray(candidate.items) || candidate.items.length !== expectedTestIds.length || !integer(candidate.index, 0, candidate.items.length - 1) || typeof candidate.input !== 'string' || !validSpellingInput(candidate.input) || ![null, 'correct', 'retry'].includes(candidate.feedback as string | null) || !object(candidate.results) || candidate.passed !== passed) return false
    if (Object.keys(candidate.results).length !== expectedTestIds.length || Object.keys(candidate.results).some(id => !expectedTestIds.includes(id))) return false
    for (let index = 0; index < candidate.items.length; index++) {
      const item = candidate.items[index]
      const id = expectedTestIds[index]
      const word = getWord(id)
      const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match = new RegExp(`(^|[^A-Za-z])(${escaped})(?![A-Za-z])`, 'i').exec(word.sentence)
      if (!object(item) || !match) return false
      const start = match.index + match[1].length
      const expected = {
        wordId: id, promptBefore: word.sentence.slice(0, start), promptAfter: word.sentence.slice(start + match[2].length),
        displayAnswer: match[2], sentenceZh: word.sentenceZh, audio: word.audio.sentence,
      }
      if (Object.entries(expected).some(([key, expectedValue]) => item[key] !== expectedValue)) return false
      const result = candidate.results[id]
      if (!object(result) || !integer(result.attempts, 0, 1000) || !bool(result.correct)) return false
      if (result.attempts === 0 ? result.firstAttemptCorrect !== null || result.correct : !bool(result.firstAttemptCorrect)) return false
      if (result.firstAttemptCorrect === true && !result.correct) return false
      if (passed ? !result.correct : index < candidate.index ? !result.correct : index > candidate.index && (result.correct || result.attempts !== 0)) return false
    }
    const current = candidate.results[expectedTestIds[candidate.index]] as Record<string, unknown>
    if (candidate.feedback === 'correct' ? current.correct !== true : candidate.feedback === 'retry' ? current.correct !== false || Number(current.attempts) < 1 : current.correct === true) return false
    if (current.correct && normalizeSpelling(candidate.input) !== normalizeSpelling(getWord(expectedTestIds[candidate.index]).word)) return false
    return true
  }

  if (value.phase === 'exit-test') {
    if (value.mode !== 'lesson' || !expectedTestIds.length || !validExitTest(value.exitTest, false)) return false
  } else if (value.phase === 'result' && value.mode === 'lesson' && value.exitTest !== null) {
    if (!validExitTest(value.exitTest, true)) return false
  } else if (value.exitTest !== null) return false

  if (value.phase === 'active') {
    const questions = value.mode === 'review' ? ['spell', 'listen', 'read', 'sentence'] : ['card', 'read', 'listen', 'spell', 'sentence']
    if (!questions.includes(String(value.question)) || typeof value.input !== 'string' || !validSpellingInput(value.input) || !bool(value.hintOpen) || !bool(value.heard) || !bool(value.settled) || ![null, 'correct', 'retry', 'letters'].includes(value.feedback as string | null) || !object(value.flags) || !object(value.choices)) return false
    const current = getWord(value.wordIds[value.index])
    for (const quiz of ['read', 'listen', 'spell']) {
      const flag = value.flags[quiz]
      if (!object(flag) || !bool(flag.done) || !bool(flag.error) || !bool(flag.hint)) return false
      const position = questions.indexOf(quiz)
      if (position < questions.indexOf(String(value.question)) && !flag.done) return false
      if (position > questions.indexOf(String(value.question)) && flag.done) return false
      if (quiz === 'spell' && value.question === 'spell' && flag.done && normalizeSpelling(value.input) !== normalizeSpelling(current.word)) return false
    }
    const allDone = ['read', 'listen', 'spell'].every(quiz => (value.flags as Record<string, { done: boolean }>)[quiz].done)
    if (value.settled !== allDone || value.completed !== value.index + (value.settled ? 1 : 0)) return false
    for (const quiz of ['read', 'listen']) {
      const choices = value.choices[quiz]
      if (!Array.isArray(choices) || choices.length !== current.options.length || new Set(choices).size !== choices.length || !choices.every(id => current.options.includes(id))) return false
    }
  }
  if (value.phase !== 'active' && value.completed !== value.wordIds.length) return false
  if (value.mode === 'review' && !value.wordIds.every(id => state.words[id]?.teaching === 'completed')) return false
  if (value.mode === 'lesson' && value.phase === 'result' && !value.wordIds.every(id => state.words[id]?.teaching === 'completed')) return false
  return true
}

function migrateLegacy(value: Record<string, unknown>): AppState {
  if (!object(value.words) || !object(value.settings)) throw new Error('Stored progress is incompatible or damaged')
  validateProgress(value.words)
  const next = freshState()
  for (const [id, progress] of Object.entries(value.words)) {
    if (object(progress) && progress.teaching === 'completed') next.words[id] = progress as unknown as AppState['words'][string]
  }
  const settings = value.settings
  if (typeof settings.volume === 'number' && settings.volume >= 0 && settings.volume <= 1) next.settings.volume = settings.volume
  if (typeof settings.spokenGuidance === 'boolean') next.settings.spokenGuidance = settings.spokenGuidance
  if (typeof settings.onboardingSeen === 'boolean') next.settings.onboardingSeen = settings.onboardingSeen
  next.settings.planSelected = true
  if (['xiaoxiao', 'yunxia', 'yunxi'].includes(String(settings.chineseVoice))) next.settings.chineseVoice = settings.chineseVoice === 'yunxi' ? 'yunxia' : settings.chineseVoice as 'xiaoxiao' | 'yunxia'
  return next
}

export function parseState(raw: string | null): AppState {
  if (raw === null) return freshState()
  const value: unknown = JSON.parse(raw)
  const invalid = () => { throw new Error('Stored progress is incompatible or damaged') }
  if (!object(value)) return invalid()
  if (value.schemaVersion === 1) return migrateLegacy(value)
  if (value.schemaVersion !== 2 || value.contentVersion !== CONTENT_VERSION || !object(value.words) || !object(value.settings)) return invalid()
  const settings = value.settings
  if (typeof settings.volume !== 'number' || !Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1 || !bool(settings.spokenGuidance) || !bool(settings.onboardingSeen) || !bool(settings.planSelected) || !['standard', 'accelerated'].includes(String(settings.learningPlan))) return invalid()
  if (settings.chineseVoice !== undefined && !['xiaoxiao', 'yunxia'].includes(String(settings.chineseVoice))) return invalid()
  const started = validateProgress(value.words)
  const state = value as unknown as AppState
  if (!state.settings.chineseVoice) state.settings.chineseVoice = 'xiaoxiao'
  if (value.session !== null && !validSession(value.session, state)) return invalid()
  if (started && (!state.session || state.session.mode !== 'lesson' || state.session.phase !== 'active' || state.words[state.session.wordIds[state.session.index]]?.teaching !== 'started')) return invalid()
  return state
}

export function createStore(storage: StoragePort) {
  let raw: string | null = null
  let snapshot: Snapshot = { state: freshState(), status: 'saved' }
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach(listener => listener())
  const load = () => {
    try { const latest = storage.getItem(STORAGE_KEY); const state = parseState(latest); raw = latest; snapshot = { state, status: 'saved' } }
    catch { snapshot = { ...snapshot, status: 'unreadable' } }
    emit()
  }
  load()
  const save = () => {
    try {
      if (storage.getItem(STORAGE_KEY) !== raw) { snapshot = { ...snapshot, status: 'conflict' }; emit(); return }
      const next = JSON.stringify(snapshot.state); storage.setItem(STORAGE_KEY, next); raw = next; snapshot = { ...snapshot, status: 'saved' }
    } catch { snapshot = { ...snapshot, status: 'unsaved' } }
    emit()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    dispatch(action: Action, day = localDay()) {
      if (snapshot.status === 'unreadable' || snapshot.status === 'conflict') return
      try { if (storage.getItem(STORAGE_KEY) !== raw) { snapshot = { ...snapshot, status: 'conflict' }; emit(); return } }
      catch { snapshot = { ...snapshot, status: 'unsaved' } }
      const state = reduce(snapshot.state, action, day)
      if (state === snapshot.state) return
      snapshot = { ...snapshot, state }; save()
    },
    retry() { if (snapshot.status === 'conflict' || snapshot.status === 'unreadable') load(); else save() },
    externalChange() { snapshot = { ...snapshot, status: 'conflict' }; emit() },
  }
}
