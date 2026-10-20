import type { Word } from './types'

type CompactHelper = [word: string, meaning: string, audio: string]
type CompactWord = [
  word: string, meaning: string, context: string, illustration: string,
  sentence: string, sentenceZh: string, support: number[], options: number[],
  wordAudio: string, sentenceAudio: string,
]
interface CompactCatalogue { v: 1; h: CompactHelper[]; w: CompactWord[] }

export const CONTENT_VERSION = 'ogden-850-2026-10-10-v1'
export const words: Word[] = []
export const byId = new Map<string, Word>()
export const lessonIds: number[] = []
export function initializeCatalog(data: unknown): void {
  const compact = data as Partial<CompactCatalogue>
  if (!compact || compact.v !== 1 || !Array.isArray(compact.h) || !Array.isArray(compact.w) || compact.w.length !== 850) throw new Error('Incomplete word catalogue')
  const nonempty = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const audioPath = (value: unknown) => typeof value === 'string' && /^assets\/audio\/(?:[a-z_-]+\/)?[a-z_-]+\.mp3$/.test(value)
  if (!compact.h.every(helper => Array.isArray(helper) && helper.length === 3 && nonempty(helper[0]) && nonempty(helper[1]) && audioPath(helper[2]))) throw new Error('Invalid catalogue helpers')
  const validIndex = (value: unknown, length: number) => Number.isInteger(value) && Number(value) >= 0 && Number(value) < length
  if (!compact.w.every((word, index) => Array.isArray(word) && word.length === 10
    && [word[0], word[1], word[2], word[4], word[5]].every(nonempty) && typeof word[3] === 'string'
    && Array.isArray(word[6]) && word[6].every(helper => validIndex(helper, compact.h!.length))
    && Array.isArray(word[7]) && word[7].length >= 2 && word[7].length <= 3 && new Set(word[7]).size === word[7].length
    && word[7].includes(index) && word[7].every(option => validIndex(option, compact.w!.length))
    && audioPath(word[8]) && audioPath(word[9]))) throw new Error('Invalid word catalogue')
  const ids = compact.w.map(word => `ogden-${word[0].toLowerCase()}`)
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate catalogue words')
  const helpers = compact.h.map(([word, meaning, audio]) => ({ word, meaning, audio }))
  const decoded = compact.w.map((entry, index): Word => ({
    id: ids[index], word: entry[0], lessonId: Math.floor(index / 5) + 1,
    meaning: entry[1], context: entry[2], illustration: entry[3], sentence: entry[4], sentenceZh: entry[5],
    support: entry[6].map(helper => helpers[helper]), options: entry[7].map(option => ids[option]),
    audio: { word: entry[8], sentence: entry[9] },
  }))
  words.splice(0, words.length, ...decoded)
  byId.clear()
  words.forEach(word => byId.set(word.id, word))
  lessonIds.splice(0, lessonIds.length, ...new Set(words.map(word => word.lessonId)))
}
// The validated catalogue contains exactly five consecutive words per lesson.
export const lessonWords = (lessonId: number) => Number.isInteger(lessonId) && lessonId > 0
  ? words.slice((lessonId - 1) * 5, lessonId * 5) : []
export const getWord = (id: string): Word => {
  const word = byId.get(id)
  if (!word) throw new Error(`Unknown word: ${id}`)
  return word
}
