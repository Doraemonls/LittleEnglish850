import { describe, expect, it } from 'vitest'
import { getWord, words, CONTENT_VERSION } from '../src/data/catalog'
import { courseClasses } from '../src/data/course'
import type { AppState, WordProgress } from '../src/data/types'
import { addDays, counts, dueWords, lessonStatus, localDay, mainAction, nextClass, nextLesson, reviewed, statusOf } from '../src/domain/progress'
import { createSession, freshState, normalizeSpelling, reduce, stepSession, type Action } from '../src/domain/session'
import { createStore, parseState, STORAGE_KEY } from '../src/services/storage'
import { makeExport } from '../src/services/export'
import { resolveAudioUrl } from '../src/services/audio'
import { upcomingAudio } from '../src/domain/prefetch'

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
        state = act(state, { type: 'spellInput', value: word.word }, today)
        state = act(state, { type: 'submitSpell' }, today)
      } else state = act(state, { type: 'answer', choice: word.id }, today)
      state = act(state, { type: 'next' }, today)
    }
  }
  throw new Error('Unexpected session loop')
}
function finishClass(initial: AppState, today = day): AppState {
  let state = initial
  while (state.session?.phase === 'active') {
    state = finishQuestions(state, today)
    state = act(state, { type: 'next' }, today)
  }
  while (state.session?.phase === 'exit-test') {
    const item = state.session.exitTest!.items[state.session.exitTest!.index]
    state = act(state, { type: 'sentenceTestInput', value: item.displayAnswer }, today)
    state = act(state, { type: 'submitSentenceTest' }, today)
    state = act(state, { type: 'nextSentenceTest' }, today)
  }
  return state
}

describe('spelling', () => {
  it('normalizes case and surrounding whitespace only when checking the whole answer', () => {
    expect(normalizeSpelling('  ApPlE ')).toBe('apple')
    expect(normalizeSpelling('ice cream')).toBe('ice cream')
  })
  it('requires successful listening and keeps an incorrect answer editable', () => {
    let session = createSession('review', ['ogden-apple'], null)
    expect(stepSession(session, { type: 'spellInput', value: 'apple' })).toBe(session)
    expect(stepSession(session, { type: 'submitSpell' })).toBe(session)
    session = stepSession(session, { type: 'heard' })
    session = stepSession(session, { type: 'spellInput', value: 'apxle' })
    session = stepSession(session, { type: 'submitSpell' })
    expect(session).toMatchObject({ input: 'apxle', feedback: 'retry', flags: { spell: { done: false, error: true } } })
    session = stepSession(session, { type: 'spellInput', value: 'APPLE' })
    expect(session).toMatchObject({ input: 'APPLE', feedback: null })
    session = stepSession(session, { type: 'submitSpell' })
    expect(session.flags.spell).toEqual({ done: true, error: true, hint: false })
    expect(session.input).toBe('APPLE')
  })
  it('preserves legacy hint tracking without exposing it in the routine flow', () => {
    let session = createSession('review', ['ogden-apple'], null)
    session = stepSession(session, { type: 'heard' })
    session = stepSession(session, { type: 'spellInput', value: 'ap' })
    session = stepSession(session, { type: 'hint', open: true })
    session = stepSession(session, { type: 'hint', open: false })
    session = stepSession(session, { type: 'spellInput', value: 'apple' })
    session = stepSession(session, { type: 'submitSpell' })
    expect(session.flags.spell).toEqual({ done: true, error: false, hint: true })
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
    state = act(state, { type: 'spellInput', value: 'x' })
    state = act(state, { type: 'submitSpell' })
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
    state = act(state, { type: 'spellInput', value: 'apple' })
    state = act(state, { type: 'submitSpell' })
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
  it('skips known class words into learned status and can finish when all are skipped', () => {
    let state = act(freshState(), { type: 'start', mode: 'lesson' })
    const total = state.session!.wordIds.length
    const firstId = state.session!.wordIds[0]
    state = act(state, { type: 'skip' })
    expect(state.words[firstId]).toEqual(learned())
    expect(state.session).toMatchObject({ index: 1, completed: 1, question: 'card', phase: 'active', retry: 0 })
    expect(state.words[state.session!.wordIds[1]].teaching).toBe('started')
    for (let index = 1; index < total; index++) state = act(state, { type: 'skip' })
    expect(state.session).toMatchObject({ index: total - 1, completed: total, phase: 'result', exitTest: null })
    expect(counts(state)).toEqual({ unstarted: 850 - total, started: 0, learned: total, mastered: 0 })
    expect(lessonStatus(state, 1)).toBe('已学过')
  })
  it('ignores skip outside a new-lesson word card', () => {
    let lesson = act(freshState(), { type: 'start', mode: 'lesson' })
    lesson = act(lesson, { type: 'next' })
    expect(act(lesson, { type: 'skip' })).toBe(lesson)
    const reviewState = freshState()
    reviewState.words['ogden-apple'] = learned({ nextReviewOn: day })
    const review = act(reviewState, { type: 'start', mode: 'review' })
    expect(act(review, { type: 'skip' })).toBe(review)
  })
  it('completes a class only after its fixed-sentence test', () => {
    let state = act(freshState(), { type: 'start', mode: 'lesson' })
    const ids = [...state.session!.wordIds]
    const options = state.session!.choices
    expect(parseState(JSON.stringify(state)).session!.choices).toEqual(options)
    expect(counts(state).started).toBe(1)
    while (state.session!.phase === 'active') { state = finishQuestions(state); state = act(state, { type: 'next' }) }
    expect(state.session!.phase).toBe('exit-test')
    expect(ids.every(id => state.words[id]?.teaching !== 'completed')).toBe(true)
    state = finishClass(state)
    expect(state.session!.phase).toBe('result')
    expect(counts(state)).toEqual({ unstarted: 850 - ids.length, started: 0, learned: ids.length, mastered: 0 })
    expect(lessonStatus(state, 1)).toBe('已学过')
    expect(state.words[ids[0]].nextReviewOn).toBe('2026-10-09')
    state = act(state, { type: 'leaveResult' })
    expect(state.session).toBeNull()
    expect(mainAction(state, day)).toBe('lesson')
    expect(mainAction(state, '2026-10-09')).toBe('review')
  })
  it('records a sentence-test mistake, resumes it, and requires a correct word', () => {
    let state = act(freshState(), { type: 'start', mode: 'lesson' })
    while (state.session!.phase === 'active') { state = finishQuestions(state); state = act(state, { type: 'next' }) }
    const item = state.session!.exitTest!.items[0]
    state = act(state, { type: 'sentenceTestInput', value: 'wrong' })
    state = act(state, { type: 'submitSentenceTest' })
    expect(state.session!.exitTest!.results[item.wordId]).toEqual({ firstAttemptCorrect: false, attempts: 1, correct: false })
    expect(parseState(JSON.stringify(state))).toEqual(state)
    expect(act(state, { type: 'nextSentenceTest' })).toBe(state)
    state = act(state, { type: 'sentenceTestInput', value: item.displayAnswer.toUpperCase() })
    state = act(state, { type: 'submitSentenceTest' })
    expect(state.session!.exitTest!.results[item.wordId]).toEqual({ firstAttemptCorrect: false, attempts: 2, correct: true })
  })
  it('uses the accelerated plan for the next class without duplicating progress', () => {
    let state = freshState()
    state.settings.learningPlan = 'accelerated'
    state = act(state, { type: 'start', mode: 'lesson' })
    expect(state.session).toMatchObject({ classId: 'accelerated-001', planAtStart: 'accelerated' })
    expect(state.session!.wordIds).toHaveLength(6)
  })
  it('reassembles a full-sized class when switching plans after partial progress', () => {
    let state = freshState()
    for (let completedClasses = 0; completedClasses < 2; completedClasses++) {
      state = act(state, { type: 'start', mode: 'lesson' })
      state = finishClass(state)
      state = act(state, { type: 'leaveResult' })
    }
    state.settings.learningPlan = 'accelerated'
    const upcoming = nextClass(state)!
    expect(upcoming.wordIds.length).toBeGreaterThanOrEqual(6)
    expect(upcoming.wordIds.length).toBeLessThanOrEqual(8)
    expect(upcoming.wordIds.every(id => state.words[id]?.teaching !== 'completed')).toBe(true)
    state = act(state, { type: 'start', mode: 'lesson' })
    expect(state.session).toMatchObject({ classId: upcoming.id, groupIds: upcoming.groupIds, wordIds: upcoming.wordIds, planAtStart: 'accelerated' })
  })
  it('keeps only one formal session, preserves practice isolation, and prioritizes continue', () => {
    const state = act(freshState(), { type: 'start', mode: 'lesson' })
    expect(act(state, { type: 'start', mode: 'lesson', classId: 'standard-002' })).toBe(state)
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
    const ids = courseClasses.standard[0].wordIds
    for (const id of ids) state.words[id] = learned({ reviewStep: 3 })
    expect(counts(state).mastered).toBe(ids.length)
    state.words[ids[0]] = reviewed(state.words[ids[0]], false, '2026-10-09')
    expect(counts(state).learned + counts(state).mastered).toBe(ids.length)
    expect(lessonStatus(state, 1)).toBe('已学过')
    expect(statusOf(state.words[ids[0]])).toBe('learned')
  })
  it('finishes the final class without offering nonexistent content', () => {
    let state = freshState()
    const finalClass = courseClasses.standard.at(-1)!
    const finalIds = new Set(finalClass.wordIds)
    for (const word of words) if (!finalIds.has(word.id)) state.words[word.id] = learned()
    state = act(state, { type: 'start', mode: 'lesson' })
    expect(state.session!.classId).toBe('standard-170')
    state = finishClass(state)
    expect(nextLesson(state)).toBeNull()
    expect(mainAction(state, day)).toBe('wordbook')
  })
})

describe('storage and TSV', () => {
  it('migrates schema-1 progress to Standard and drops only an unsettled word', () => {
    const legacy = {
      schemaVersion: 1, contentVersion: 'ogden-850-2026-10-10-v1', session: null,
      words: { 'ogden-apple': learned(), 'ogden-ball': { teaching: 'started', reviewStep: 0, lastReviewedOn: null, nextReviewOn: null } },
      settings: { volume: .5, spokenGuidance: false, onboardingSeen: true, chineseVoice: 'xiaoxiao' },
    }
    const migrated = parseState(JSON.stringify(legacy))
    expect(migrated).toMatchObject({ schemaVersion: 2, contentVersion: CONTENT_VERSION, settings: { learningPlan: 'standard' }, session: null })
    expect(migrated.words['ogden-apple']).toEqual(learned())
    expect(migrated.words['ogden-ball']).toBeUndefined()
  })
  it('restores a completed review spelling snapshot without changing word progress', () => {
    let state = freshState()
    state.words['ogden-apple'] = learned({ nextReviewOn: day })
    state = act(state, { type: 'start', mode: 'review' })
    state = act(state, { type: 'heard' })
    state = act(state, { type: 'spellInput', value: 'apple' })
    state = act(state, { type: 'submitSpell' })
    state = act(state, { type: 'peek', wordId: 'ogden-apple' })
    let raw = JSON.stringify(state)
    const original = raw
    const storage = createStore({ getItem: () => raw, setItem: (_, value) => { raw = value } })
    expect(storage.getSnapshot().status).toBe('saved')
    expect(storage.getSnapshot().state.words).toEqual(state.words)
    expect(storage.getSnapshot().state.session).toMatchObject({ input: 'apple', feedback: 'correct', flags: { spell: { done: true, hint: true } } })
    expect(raw).toBe(original)
    storage.dispatch({ type: 'next' }, day)
    expect(parseState(raw).session!.question).toBe('listen')
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
    expect(store.getSnapshot().state.session?.wordIds[0]).toBe('ogden-i')
    fail = false; store.retry()
    expect(store.getSnapshot().status).toBe('saved')
    expect(parseState(value).session?.wordIds[0]).toBe('ogden-i')
  })
  it('blocks a stale tab before a storage event and loads the latest snapshot', () => {
    let value: string | null = null
    const port = { getItem: () => value, setItem: (key: string, raw: string) => { expect(key).toBe(STORAGE_KEY); value = raw } }
    const a = createStore(port), b = createStore(port)
    a.dispatch({ type: 'start', mode: 'lesson' }, day)
    b.dispatch({ type: 'start', mode: 'lesson', classId: 'standard-002' }, day)
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
  it('rejects shortened or altered saved sentence tests', () => {
    let state = act(freshState(), { type: 'start', mode: 'lesson' })
    while (state.session!.phase === 'active') { state = finishQuestions(state); state = act(state, { type: 'next' }) }
    const shortened = structuredClone(state)
    shortened.session!.exitTest!.items = shortened.session!.exitTest!.items.slice(0, 1)
    shortened.session!.exitTest!.results = Object.fromEntries(Object.entries(shortened.session!.exitTest!.results).slice(0, 1))
    expect(() => parseState(JSON.stringify(shortened))).toThrow()
    const altered = structuredClone(state)
    altered.session!.exitTest!.items[0].promptBefore = 'Changed '
    expect(() => parseState(JSON.stringify(altered))).toThrow()
  })
  it('exports all words with BOM, Chinese labels, blank dates and timezone without changing state', () => {
    const state = freshState()
    const original = JSON.stringify(state)
    const result = makeExport(state, new Date(2026, 9, 8, 9, 8, 7))
    const lines = result.text.slice(1).trimEnd().split('\r\n')
    expect(result.text.charCodeAt(0)).toBe(0xfeff)
    expect(result.filename).toBe('little-english-progress-20261008-090807.tsv')
    expect(lines).toHaveLength(851)
    expect(lines[0].split('\t')).toHaveLength(11)
    expect(lines[1]).toContain(`\t${CONTENT_VERSION}\togden-apple\tapple\tfood-farm\tfood-farm-g01\tstandard\t未开始\t0\t\t`)
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

describe('audio prefetch plan', () => {
  it('waits for a plan, then lists due reviews before the next class', () => {
    const state = freshState()
    expect(upcomingAudio(state, day)).toEqual([])
    state.settings.planSelected = true
    state.settings.chineseVoice = 'yunxia'
    state.words['ogden-apple'] = learned({ nextReviewOn: day })
    const paths = upcomingAudio(state, day)
    expect(paths).toContain('assets/audio/yunxia/prompt-spell.mp3')
    expect(paths).not.toContain('assets/audio/xiaoxiao/prompt-spell.mp3')
    const apple = paths.indexOf(getWord('ogden-apple').audio.word)
    const first = paths.indexOf(getWord(nextClass(state)!.wordIds[0]).audio.word)
    expect(apple).toBeGreaterThan(-1)
    expect(first).toBeGreaterThan(apple)
    for (const id of nextClass(state)!.wordIds) {
      const word = getWord(id)
      expect(paths).toEqual(expect.arrayContaining([word.audio.word, word.audio.sentence, ...word.support.map(item => item.audio)]))
    }
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every(path => path.startsWith('assets/audio/') && path.endsWith('.mp3'))).toBe(true)
  })

  it('skips spoken guidance prompts when guidance is off', () => {
    const state = freshState()
    state.settings.planSelected = true
    state.settings.spokenGuidance = false
    expect(upcomingAudio(state, day).some(path => path.includes('prompt-'))).toBe(false)
  })
})
