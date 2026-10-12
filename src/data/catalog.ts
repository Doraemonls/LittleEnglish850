import type { Word } from './types'

export const CONTENT_VERSION = 'ogden-850-2026-10-10-v1'
export const words: Word[] = []
export const byId = new Map<string, Word>()
export const lessonIds: number[] = []
export function initializeCatalog(data: unknown): void {
  if (!Array.isArray(data) || data.length !== 850 || new Set(data.map(word => word?.id)).size !== 850) throw new Error('Incomplete word catalogue')
  const ids = new Set(data.map(word => word.id))
  const nonempty = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const audioPath = (value: unknown) => typeof value === 'string' && /^assets\/audio\/[a-z_-]+\.mp3$/.test(value)
  if (!data.every((word, index) => word && typeof word.word === 'string' && word.id === `ogden-${word.word.toLowerCase()}` && word.lessonId === Math.floor(index / 5) + 1 && word.position === index % 5 + 1 && ['meaning', 'context', 'sentence', 'sentenceZh', 'partOfSpeech'].every(key => nonempty(word[key])) && typeof word.illustration === 'string' && audioPath(word.audio?.word) && audioPath(word.audio?.sentence) && audioPath(word.audio?.meaning) && Array.isArray(word.support) && word.support.every((helper: Word['support'][number]) => helper && nonempty(helper.word) && nonempty(helper.meaning) && audioPath(helper.audio)) && Array.isArray(word.options) && word.options.length >= 2 && word.options.length <= 3 && new Set(word.options).size === word.options.length && word.options.includes(word.id) && word.options.every((id: string) => ids.has(id)))) throw new Error('Invalid word catalogue')
  words.splice(0, words.length, ...data as Word[])
  byId.clear()
  words.forEach(word => byId.set(word.id, word))
  lessonIds.splice(0, lessonIds.length, ...new Set(words.map(word => word.lessonId)))
}
export const lessonWords = (lessonId: number) => words.filter(word => word.lessonId === lessonId)
export const getWord = (id: string): Word => {
  const word = byId.get(id)
  if (!word) throw new Error(`Unknown word: ${id}`)
  return word
}
