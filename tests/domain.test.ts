import { describe, expect, it } from 'vitest'
import { getWord, words, CONTENT_VERSION } from '../src/data/catalog'
import type { AppState, WordProgress } from '../src/data/types'
import { addDays, counts, dueWords, lessonStatus, localDay, mainAction, nextLesson, reviewed, statusOf } from '../src/domain/progress'
import { createSession, freshState, reduce, spellEdit, stepSession, type Action } from '../src/domain/session'
import { createStore, parseState, STORAGE_KEY } from '../src/services/storage'
import { makeExport } from '../src/services/export'
import { resolveAudioUrl } from '../src/services/audio'

const day = '2026-10-08'
const learned = (overrides: Partial<WordProgress> = {}): WordProgress => ({ teaching: 'completed', reviewStep: 0, lastReviewedOn: null, nextReviewOn: '2026-10-09', ...overrides })
function act(state: AppState, action: Action, today = day): AppState {
  const next = reduce(state, action, today, () => .3)
  // Every transition must itself be a valid recoverable snapshot.
  expect(parseState(JSON.stringify(next))).toEqual(next)
  return next
}
function finishQuestions(initial: AppState, today = day): AppState {
  let state = initial
  for (let guard = 0; guard < 20; guard++) {
    const session = state.session!
    const word = getWord(session.wordIds[session.index])
    if (session.question === 'sentence') return state
    if (session.question === 'card') state = act(state, { type: 'next' }, today)
    else {
      state = act(state, { type: 'heard' }, today)
      if (session.question === 'spell') {
        for (const letter of word.word.toLowerCase().replace(/[^a-z]/g, '').slice(state.session!.input.length)) state = act(state, { type: 'spell', edit: { kind: 'insert', value: letter } }, today)
      } else state = act(state, { type: 'answer', choice: word.id }, today)
      state = act(state, { type: 'next' }, today)
    }
  }
  throw new Error('Unexpected session loop')
}

describe('spelling', () => {
  it.each(['', 'ap', 'appl'])('clears the whole word after an error at %s', prefix => {
    expect(spellEdit('apple', prefix, { kind: 'insert', value: 'x' })).toMatchObject({ input: '', error: true, done: false })
  })
  it('accepts uppercase and backspace and only completes a whole word', () => {
    expect(spellEdit('apple', '', { kind: 'insert', value: 'A' })).toMatchObject({ input: 'a', done: false })
    expect(spellEdit('apple', 'app', { kind: 'delete' })).toMatchObject({ input: 'ap', done: false })
    expect(spellEdit('apple', 'appl', { kind: 'insert', value: 'e' })).toMatchObject({ input: 'apple', done: true })
  })
  it('excludes fixed separators and rejects replacement and multi-letter input', () => {
    expect(spellEdit('ice-cream', 'icecrea', { kind: 'insert', value: 'm' })).toMatchObject({ done: true })
    expect(spellEdit('apple', '', { kind: 'insert', value: 'apple' })).toMatchObject({ done: false, rejected: true })
    expect(spellEdit('apple', 'ap', { kind: 'reject' })).toMatchObject({ input: '', error: true })
  })
  it('requires successful listening and preserves mistakes and hints through a retry', () => {
    let session = createSession('review', ['ogden-apple'], null)
    expect(stepSession(session, { type: 'spell', edit: { kind: 'insert', value: 'a' } })).toBe(session)
    session = stepSession(session, { type: 'heard' })
    session = stepSession(session, { type: 'spell', edit: { kind: 'insert', value: 'x' } })
    session = stepSession(session, { type: 'hint', open: true })
    session = stepSession(session, { type: 'hint', open: false })
    for (const value of 'apple') session = stepSession(session, { type: 'spell', edit: { kind: 'insert', value } })
    expect(session.flags.spell).toEqual({ done: true, error: true, hint: true })
    expect(session.hintOpen).toBe(false)
  })
})

describe('calendar and review', () => {
  it.each([
    ['2026-12-31', 1, '2027-01-01'], ['2028-02-28', 1, '2028-02-29'], ['2026-02-28', 1, '2026-03-01'],
    ['2026-03-07', 3, '2026-03-10'], ['2026-10-31', 3, '2026-11-03'],
  ])('adds local calendar days to %s', (input, n, expected) => expect(addDays(input, n)).toBe(expected))
  it('uses local date components', () => expect(localDay(new Date(2026, 9, 8, 23, 59))).toBe(day))
  it('advances 1/3/7/30 days and keeps mastered words on maintenance', () => {
    let progress = learned()
    progress = reviewed(progress, true, '2026-10-09')
    expect(progress).toMatchObject({ reviewStep: 1, nextReviewOn: '2026-10-12' })
    progress = reviewed(progress, true, '2026-10-12')
    expect(progress).toMatchObject({ reviewStep: 2, nextReviewOn: '2026-10-19' })
    progress = reviewed(progress, true, '2026-10-19')
    expect(progress).toMatchObject({ reviewStep: 3, nextReviewOn: '2026-11-18' })
    progress = reviewed(progress, true, '2026-11-18')
    expect(progress).toMatchObject({ reviewStep: 3, nextReviewOn: '2026-12-18' })
    progress = reviewed(progress, false, '2026-12-18')
    expect(progress).toMatchObject({ teaching: 'completed', reviewStep: 0, nextReviewOn: '2026-12-19' })
  })
  it('cannot settle twice in a day or before due', () => {
    const progress = reviewed(learned(), true, '2026-10-09')
    expect(reviewed(progress, true, '2026-10-09')).toBe(progress)
    expect(reviewed(progress, false, '2026-10-10')).toBe(progress)
  })
  it('sorts overdue words by date then fixed order and caps a round at ten', () => {
    const state = freshState()
    for (const word of words.slice(0, 12)) state.words[word.id] = learned({ nextReviewOn: word.id === 'ogden-book' ? '2026-10-07' : day })
    state.words['ogden-egg'].lastReviewedOn = day
    expect(dueWords(state, day).slice(0, 3)).toEqual(['ogden-book', 'ogden-apple', 'ogden-ball'])
    const next = reduce(state, { type: 'start', mode: 'review' }, day)
    expect(next.session!.wordIds).toHaveLength(10)
    expect(next.session!.wordIds).not.toContain('ogden-egg')
  })
  it('settles a resumed review on the completion day with persisted mistakes', () => {
    let state = freshState()
    state.words['ogden-apple'] = learned({ reviewStep: 2, lastReviewedOn: '2026-09-30', nextReviewOn: day })
    state = act(state, { type: 'start', mode: 'review' })
    state = act(state, { type: 'heard' })
    state = act(state, { type: 'spell', edit: { kind: 'insert', value: 'x' } })
    state = parseState(JSON.stringify(state))
    state = finishQuestions(state, '2026-10-09')
    expect(state.words['ogden-apple']).toEqual(learned({ reviewStep: 0, lastReviewedOn: '2026-10-09', nextReviewOn: '2026-10-10' }))
    expect(state.session!.retry).toBe(1)
    expect(act(state, { type: 'answer', choice: 'ogden-apple' }, '2026-10-10').words).toEqual(state.words)
  })
  it('keeps completed spelling readable after viewing the wordbook and preserves the hinted outcome', () => {
    let state = freshState()
    state.words['ogden-apple'] = learned({ reviewStep: 2, lastReviewedOn: '2026-09-30', nextReviewOn: day })
    state = act(state, { type: 'start', mode: 'review' })
    state = act(state, { type: 'heard' })
    for (const value of 'apple') state = act(state, { type: 'spell', edit: { kind: 'insert', value } })
    state = act(state, { type: 'peek', wordId: 'ogden-apple' })
    expect(state.session!.input).toBe('apple')
    state = parseState(JSON.stringify(state))
    expect(Object.values(state.session!.flags).every(flag => flag.hint)).toBe(true)
    state = finishQuestions(state)
    expect(state.words['ogden-apple']).toEqual(learned({ lastReviewedOn: day, nextReviewOn: '2026-10-09' }))
    expect(state.session!.retry).toBe(1)
  })
  it('opening the current unsettled review answer counts as a hint', () => {
    let state = freshState()
    state.words['ogden-apple'] = learned({ nextReviewOn: day })
    state = act(state, { type: 'start', mode: 'review' })
    expect(act(state, { type: 'peek', wordId: 'ogden-cat' })).toBe(state)
    state = act(state, { type: 'peek', wordId: 'ogden-apple' })
    expect(Object.values(state.session!.flags).every(flag => flag.hint)).toBe(true)
    state = finishQuestions(state)
    expect(state.words['ogden-apple'].reviewStep).toBe(0)
    expect(state.words['ogden-apple'].nextReviewOn).toBe('2026-10-09')
  })
})

describe('formal session and derived progress', () => {
  it('completes a five-word lesson with atomic resumable transitions', () => {
    let state = act(freshState(), { type: 'start', mode: 'lesson' })
    const options = state.session!.choices
    expect(parseState(JSON.stringify(state)).session!.choices).toEqual(options)
    expect(counts(state).started).toBe(1)
    for (let i = 0; i < 5; i++) {
      state = finishQuestions(state)
      expect(state.session!.completed).toBe(i + 1)
      state = act(state, { type: 'next' })
    }
    expect(state.session!.phase).toBe('result')
    expect(counts(state)).toEqual({ unstarted: 845, started: 0, learned: 5, mastered: 0 })
    expect(lessonStatus(state, 1)).toBe('已学过')
    expect(state.words['ogden-apple'].nextReviewOn).toBe('2026-10-09')
    state = act(state, { type: 'leaveResult' })
    expect(state.session).toBeNull()
    expect(mainAction(state, day)).toBe('lesson')
    expect(mainAction(state, '2026-10-09')).toBe('review')
  })
  it('keeps only one formal session, preserves practice isolation, and prioritizes continue', () => {
    const state = act(freshState(), { type: 'start', mode: 'lesson' })
    expect(act(state, { type: 'start', mode: 'lesson', lessonId: 2 })).toBe(state)
    expect(act(state, { type: 'start', mode: 'review' })).toBe(state)
    expect(mainAction(state, day)).toBe('continue')
    const snapshot = JSON.stringify(state)
    let practice = createSession('practice', ['ogden-cat'], null)
    practice = stepSession(practice, { type: 'next' })
    practice = stepSession(practice, { type: 'answer', choice: 'ogden-cat' })
    expect(JSON.stringify(state)).toBe(snapshot)
    expect(practice.flags.read.done).toBe(true)
  })
  it('does not reverse cumulative teaching or course completion after failed review', () => {
    const state = freshState()
    for (const word of words.slice(0, 5)) state.words[word.id] = learned({ reviewStep: 3 })
    expect(counts(state).mastered).toBe(5)
    state.words['ogden-apple'] = reviewed(state.words['ogden-apple'], false, '2026-10-09')
    expect(counts(state).learned + counts(state).mastered).toBe(5)
    expect(lessonStatus(state, 1)).toBe('已学过')
    expect(statusOf(state.words['ogden-apple'])).toBe('learned')
  })
  it('finishes the final lesson without offering a nonexistent next lesson', () => {
    let state = freshState()
    for (const word of words.slice(0, -5)) state.words[word.id] = learned()
    state = act(state, { type: 'start', mode: 'lesson' })
    expect(state.session!.lessonId).toBe(170)
    for (let i = 0; i < 5; i++) { state = finishQuestions(state); state = act(state, { type: 'next' }) }
    expect(nextLesson(state)).toBeNull()
    expect(mainAction(state, day)).toBe('wordbook')
  })
})

describe('storage and TSV', () => {
  it('recovers the old completed-spelling peek snapshot without changing word progress', () => {
    let state = freshState()
    state.words['ogden-apple'] = learned({ nextReviewOn: day })
    state = act(state, { type: 'start', mode: 'review' })
    state = act(state, { type: 'heard' })
    for (const value of 'apple') state = act(state, { type: 'spell', edit: { kind: 'insert', value } })
    state = act(state, { type: 'peek', wordId: 'ogden-apple' })
    state.session!.input = ''
    state.session!.feedback = null
    let raw = JSON.stringify(state)
    const original = raw
    const storage = createStore({ getItem: () => raw, setItem: (_, value) => { raw = value } })
    expect(storage.getSnapshot().status).toBe('saved')
    expect(storage.getSnapshot().state.words).toEqual(state.words)
    expect(storage.getSnapshot().state.session).toMatchObject({ input: 'apple', feedback: 'correct', flags: { spell: { done: true, hint: true } } })
    expect(raw).toBe(original)
    storage.dispatch({ type: 'next' }, day)
    expect(parseState(raw).session!.question).toBe('listen')
    state.session!.flags.read.hint = false
    expect(() => parseState(JSON.stringify(state))).toThrow()
    state.session!.flags.read.hint = true
    state.session!.completed = 5
    expect(() => parseState(JSON.stringify(state))).toThrow()
  })
  it.each(['{bad', JSON.stringify({ schemaVersion: 2 }), JSON.stringify({ ...freshState(), contentVersion: 'other' }), JSON.stringify({ ...freshState(), words: { mystery: learned() } })])('rejects unreadable and incompatible data %s', raw => {
    expect(() => parseState(raw)).toThrow()
    let original = raw
    const store = createStore({ getItem: () => original, setItem: (_, value) => { original = value } })
    expect(store.getSnapshot().status).toBe('unreadable')
    store.dispatch({ type: 'start', mode: 'lesson' })
    store.retry()
    expect(original).toBe(raw)
  })
  it('preserves memory after a failed save and retries without losing progress', () => {
    let value: string | null = null
    let fail = true
    const store = createStore({ getItem: () => value, setItem: (_, raw) => { if (fail) throw new Error('Quota'); value = raw } })
    store.dispatch({ type: 'start', mode: 'lesson' }, day)
    expect(store.getSnapshot().status).toBe('unsaved')
    expect(store.getSnapshot().state.session?.wordIds[0]).toBe('ogden-apple')
    fail = false; store.retry()
    expect(store.getSnapshot().status).toBe('saved')
    expect(parseState(value).session?.wordIds[0]).toBe('ogden-apple')
  })
  it('blocks a stale tab before a storage event and loads the latest snapshot', () => {
    let value: string | null = null
    const port = { getItem: () => value, setItem: (key: string, raw: string) => { expect(key).toBe(STORAGE_KEY); value = raw } }
    const a = createStore(port), b = createStore(port)
    a.dispatch({ type: 'start', mode: 'lesson' }, day)
    b.dispatch({ type: 'start', mode: 'lesson', lessonId: 2 }, day)
    expect(b.getSnapshot().status).toBe('conflict')
    b.retry()
    expect(b.getSnapshot().state).toEqual(a.getSnapshot().state)
  })
  it('rejects malformed flags and impossible completed teaching', () => {
    const state = act(freshState(), { type: 'start', mode: 'lesson' })
    const invalid = structuredClone(state)
    invalid.session!.flags.spell.done = true
    expect(() => parseState(JSON.stringify(invalid))).toThrow()
    invalid.session = null
    expect(() => parseState(JSON.stringify(invalid))).toThrow()
  })
  it('exports all words with BOM, Chinese labels, blank dates and timezone without changing state', () => {
    const state = freshState()
    const original = JSON.stringify(state)
    const result = makeExport(state, new Date(2026, 9, 8, 9, 8, 7))
    const lines = result.text.slice(1).trimEnd().split('\r\n')
    expect(result.text.charCodeAt(0)).toBe(0xfeff)
    expect(result.filename).toBe('little-english-progress-20261008-090807.tsv')
    expect(lines).toHaveLength(851)
    expect(lines[0].split('\t')).toHaveLength(9)
    expect(lines[1]).toContain(`\t${CONTENT_VERSION}\togden-apple\tapple\t1\t未开始\t0\t\t`)
    expect(lines[1]).toMatch(/2026-10-08T09:08:07[+-]\d{2}:\d{2}/)
    expect(JSON.stringify(state)).toBe(original)
  })
})

describe('audio routing', () => {
  it('routes word meaning audio to the selected voice subfolder', () => {
    expect(resolveAudioUrl('assets/audio/xiaoxiao/apple-meaning.mp3', 'xiaoxiao')).toBe('assets/audio/xiaoxiao/apple-meaning.mp3')
    expect(resolveAudioUrl('assets/audio/xiaoxiao/apple-meaning.mp3', 'yunxia')).toBe('assets/audio/yunxia/apple-meaning.mp3')
    expect(resolveAudioUrl('assets/audio/xiaoxiao/apple-meaning.mp3')).toBe('assets/audio/xiaoxiao/apple-meaning.mp3')
  })

  it('routes prompts to the selected voice subfolder', () => {
    expect(resolveAudioUrl('assets/audio/prompt-welcome.mp3', 'xiaoxiao')).toBe('assets/audio/xiaoxiao/prompt-welcome.mp3')
    expect(resolveAudioUrl('assets/audio/prompt-welcome.mp3', 'yunxia')).toBe('assets/audio/yunxia/prompt-welcome.mp3')
    expect(resolveAudioUrl('assets/audio/xiaoxiao/prompt-welcome.mp3', 'yunxia')).toBe('assets/audio/yunxia/prompt-welcome.mp3')
  })

  it('preserves English word, sentence, and support audio paths unchanged', () => {
    expect(resolveAudioUrl('assets/audio/apple-word.mp3', 'yunxia')).toBe('assets/audio/apple-word.mp3')
    expect(resolveAudioUrl('assets/audio/apple-sentence.mp3', 'yunxia')).toBe('assets/audio/apple-sentence.mp3')
    expect(resolveAudioUrl('assets/audio/support-an.mp3', 'yunxia')).toBe('assets/audio/support-an.mp3')
  })
})
