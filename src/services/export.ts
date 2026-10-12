import { words } from '../data/catalog'
import type { AppState } from '../data/types'
import { localDay, statusOf, STATUS_LABELS } from '../domain/progress'

export function makeExport(state: AppState, now = new Date()) {
  const offset = -now.getTimezoneOffset()
  const pad = (value: number) => String(value).padStart(2, '0')
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const timestamp = `${localDay(now)}T${clock}${offset >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  const rows: (string | number)[][] = [['导出时间', '词表版本', '词ID', '单词', '课次', '学习状态', '连续独立通过阶段', '最近复习判定日', '下次复习日']]
  for (const word of words) {
    const progress = state.words[word.id]
    rows.push([timestamp, state.contentVersion, word.id, word.word, word.lessonId, STATUS_LABELS[statusOf(progress)], progress?.reviewStep ?? 0, progress?.lastReviewedOn ?? '', progress?.nextReviewOn ?? ''])
  }
  const escape = (value: string | number) => String(value).replace(/[\t\r\n]/g, ' ')
  return {
    filename: `little-english-progress-${localDay(now).replaceAll('-', '')}-${clock.replaceAll(':', '')}.tsv`,
    text: '\uFEFF' + rows.map(row => row.map(escape).join('\t')).join('\r\n') + '\r\n',
  }
}

export function downloadProgress(state: AppState) {
  const { text, filename } = makeExport(state)
  const url = URL.createObjectURL(new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  try { document.body.append(anchor); anchor.click() }
  finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000) }
}
