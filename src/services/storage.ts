import { byId, CONTENT_VERSION, getWord } from '../data/catalog'
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

function validSession(value: unknown, state: AppState): value is Session {
  if (!object(value) || !['lesson', 'review'].includes(String(value.mode)) || !['active', 'result'].includes(String(value.phase))) return false
  if (!Array.isArray(value.wordIds) || !value.wordIds.length || value.wordIds.length > (value.mode === 'lesson' ? 5 : 10) || new Set(value.wordIds).size !== value.wordIds.length || !value.wordIds.every(id => typeof id === 'string' && byId.has(id))) return false
  if (!integer(value.index, 0, value.wordIds.length - 1) || !integer(value.completed, 0, value.wordIds.length) || !integer(value.retry, 0, value.completed)) return false
  if (value.mode === 'lesson' && (!integer(value.lessonId, 1, 170) || !value.wordIds.every(id => getWord(id).lessonId === value.lessonId))) return false
  if (value.mode === 'review' && (value.lessonId !== null || !value.wordIds.every(id => state.words[id]?.teaching === 'completed'))) return false
  const questions = value.mode === 'review' ? ['spell', 'listen', 'read', 'sentence'] : ['card', 'read', 'listen', 'spell', 'sentence']
  if (!questions.includes(String(value.question)) || typeof value.input !== 'string' || !validSpellingInput(value.input)) return false
  if (!bool(value.hintOpen) || !bool(value.heard) || !bool(value.settled) || ![null, 'correct', 'retry', 'letters'].includes(value.feedback as string | null)) return false
  if (!object(value.flags) || !object(value.choices)) return false
  const current = getWord(value.wordIds[value.index])
  const answer = normalizeSpelling(current.word)
  for (const quiz of ['read', 'listen', 'spell']) {
    const flag = value.flags[quiz]
    if (!object(flag) || !bool(flag.done) || !bool(flag.error) || !bool(flag.hint)) return false
    const position = questions.indexOf(quiz)
    if (position < questions.indexOf(String(value.question)) && !flag.done) return false
    if (position > questions.indexOf(String(value.question)) && flag.done) return false
    if (quiz === 'spell' && value.question === 'spell' && flag.done && normalizeSpelling(value.input) !== answer) return false
  }
  const allDone = ['read', 'listen', 'spell'].every(q => (value.flags as Record<string, {done: boolean}>)[q].done)
  if (value.settled !== allDone || value.completed !== value.index + (value.settled ? 1 : 0)) return false
  if (value.phase === 'result' && (value.question !== 'sentence' || value.completed !== value.wordIds.length)) return false
  for (const quiz of ['read', 'listen']) {
    const order = value.choices[quiz]
    if (!Array.isArray(order) || order.length !== current.options.length || new Set(order).size !== order.length || !order.every(id => current.options.includes(id))) return false
  }
  for (let index = 0; index <= value.index; index++) {
    const progress = state.words[value.wordIds[index]]
    const completed = value.mode === 'review' || index < value.index || value.settled
    if (!progress || progress.teaching !== (completed ? 'completed' : 'started')) return false
  }
  return true
}

export function parseState(raw: string | null): AppState {
  if (raw === null) return freshState()
  const value: unknown = JSON.parse(raw)
  const invalid = () => { throw new Error('Stored progress is incompatible or damaged') }
  if (!object(value) || value.schemaVersion !== 1 || value.contentVersion !== CONTENT_VERSION || !object(value.words) || !object(value.settings)) return invalid()
  const settings = value.settings
  if (typeof settings.volume !== 'number' || !Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1 || !bool(settings.spokenGuidance) || !bool(settings.onboardingSeen)) return invalid()
  if (settings.chineseVoice !== undefined && !['xiaoxiao', 'yunxia', 'yunxi'].includes(String(settings.chineseVoice))) return invalid()
  let started = 0
  for (const [id, progress] of Object.entries(value.words)) {
    if (!byId.has(id) || !object(progress) || !['started', 'completed'].includes(String(progress.teaching)) || !integer(progress.reviewStep, 0, 3)) return invalid()
    if (progress.lastReviewedOn !== null && !date(progress.lastReviewedOn)) return invalid()
    if (progress.teaching === 'started') {
      started++
      if (progress.reviewStep !== 0 || progress.lastReviewedOn !== null || progress.nextReviewOn !== null) return invalid()
    } else if (!date(progress.nextReviewOn) || (progress.lastReviewedOn && progress.nextReviewOn <= String(progress.lastReviewedOn)) || (progress.reviewStep > 0 && progress.lastReviewedOn === null)) return invalid()
  }
  if (started > 1) return invalid()
  const state = value as unknown as AppState
  if (state.settings.chineseVoice === ('yunxi' as unknown)) state.settings.chineseVoice = 'yunxia'
  if (!state.settings.chineseVoice) state.settings.chineseVoice = 'xiaoxiao'
  // Repair only the old wordbook-peek bug: completed spelling lost its input.
  // The full validator still checks this session before any state is accepted.
  const session = state.session
  if (session?.mode === 'review' && session.phase === 'active' && session.question === 'spell'
    && session.input === '' && session.feedback === null && session.heard === true && session.settled === false
    && session.flags?.spell?.done === true
    && ['read', 'listen', 'spell'].every(quiz => object(session.flags[quiz as keyof Session['flags']]) && session.flags[quiz as keyof Session['flags']].hint === true)
    && Array.isArray(session.wordIds) && integer(session.index, 0, session.wordIds.length - 1) && byId.has(session.wordIds[session.index])) {
    session.input = normalizeSpelling(getWord(session.wordIds[session.index]).word)
    session.feedback = 'correct'
  }
  if (value.session !== null && !validSession(value.session, state)) return invalid()
  if (started && (!state.session || state.session.mode !== 'lesson' || state.session.settled || state.words[state.session.wordIds[state.session.index]]?.teaching !== 'started')) return invalid()
  return state
}

export function createStore(storage: StoragePort) {
  let raw: string | null = null
  let snapshot: Snapshot = { state: freshState(), status: 'saved' }
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach(listener => listener())
  const load = () => {
    try {
      const latest = storage.getItem(STORAGE_KEY)
      const state = parseState(latest)
      raw = latest
      snapshot = { state, status: 'saved' }
    } catch { snapshot = { ...snapshot, status: 'unreadable' } }
    emit()
  }
  load()
  const save = () => {
    try {
      if (storage.getItem(STORAGE_KEY) !== raw) {
        snapshot = { ...snapshot, status: 'conflict' }
        emit()
        return
      }
      const next = JSON.stringify(snapshot.state)
      storage.setItem(STORAGE_KEY, next)
      raw = next
      snapshot = { ...snapshot, status: 'saved' }
    } catch { snapshot = { ...snapshot, status: 'unsaved' } }
    emit()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    dispatch(action: Action, day = localDay()) {
      if (snapshot.status === 'unreadable' || snapshot.status === 'conflict') return
      // Detect writes from a second tab even before its storage event is delivered.
      try {
        if (storage.getItem(STORAGE_KEY) !== raw) {
          snapshot = { ...snapshot, status: 'conflict' }; emit(); return
        }
      } catch { snapshot = { ...snapshot, status: 'unsaved' } }
      const state = reduce(snapshot.state, action, day)
      if (state === snapshot.state) return
      snapshot = { ...snapshot, state }
      save()
    },
    retry() { if (snapshot.status === 'conflict' || snapshot.status === 'unreadable') load(); else save() },
    externalChange() { snapshot = { ...snapshot, status: 'conflict' }; emit() },
  }
}
