import { lessonWords, words } from '../data/catalog'
import type { AppState, LearningStatus, WordProgress } from '../data/types'

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(day: string, count: number): string {
  const [year, month, date] = day.split('-').map(Number)
  // Calendar arithmetic at local noon also works across daylight-saving changes.
  return localDay(new Date(year, month - 1, date + count, 12))
}

export function statusOf(progress?: WordProgress): LearningStatus {
  if (!progress) return 'unstarted'
  if (progress.teaching === 'started') return 'started'
  return progress.reviewStep === 3 ? 'mastered' : 'learned'
}

export const STATUS_LABELS: Record<LearningStatus, string> = {
  unstarted: '未开始', started: '正在学', learned: '学过', mastered: '记牢了',
}

export function counts(state: AppState): Record<LearningStatus, number> {
  const result = { unstarted: 0, started: 0, learned: 0, mastered: 0 }
  for (const word of words) result[statusOf(state.words[word.id])]++
  return result
}

export function dueWords(state: AppState, day: string): string[] {
  return words.filter(word => {
    const progress = state.words[word.id]
    return progress?.teaching === 'completed' && progress.nextReviewOn && progress.nextReviewOn <= day && progress.lastReviewedOn !== day
  }).sort((a, b) => state.words[a.id].nextReviewOn!.localeCompare(state.words[b.id].nextReviewOn!))
    .map(word => word.id)
}

export function lessonStatus(state: AppState, lessonId: number): '已学过' | '未学完' | '未开始' {
  const list = lessonWords(lessonId)
  if (list.every(word => state.words[word.id]?.teaching === 'completed')) return '已学过'
  return list.some(word => state.words[word.id]) ? '未学完' : '未开始'
}

export function nextLesson(state: AppState): number | null {
  return words.find(word => state.words[word.id]?.teaching !== 'completed')?.lessonId ?? null
}

export function mainAction(state: AppState, day: string) {
  if (state.session?.phase === 'active') return 'continue'
  if (dueWords(state, day).length) return 'review'
  return nextLesson(state) ? 'lesson' : 'wordbook'
}

export function reviewed(progress: WordProgress, independent: boolean, day: string): WordProgress {
  if (progress.teaching !== 'completed' || !progress.nextReviewOn || progress.nextReviewOn > day || progress.lastReviewedOn === day) return progress
  const step = independent ? Math.min(progress.reviewStep + 1, 3) as 1 | 2 | 3 : 0
  return { ...progress, reviewStep: step, lastReviewedOn: day, nextReviewOn: addDays(day, [1, 3, 7, 30][step]) }
}
