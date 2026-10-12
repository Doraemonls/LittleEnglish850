import { words } from '../data/catalog'
import type { AppState, LearningStatus } from '../data/types'
import { counts, STATUS_LABELS } from '../domain/progress'

const order: LearningStatus[] = ['mastered', 'learned', 'started', 'unstarted']
export function ProgressBar({ state, showLegend = true }: { state: AppState; showLegend?: boolean }) {
  const stats = counts(state)
  const description = order.map(status => `${STATUS_LABELS[status]} ${stats[status]} 个词`).join('，')
  return <div className="progress-block">
    <div className="progress-track" role="img" aria-label={description}>
      {order.map(status => <span key={status} className={`progress-segment ${status}`} style={{ width: `${stats[status] / words.length * 100}%` }}/>) }
    </div>
    {showLegend && <div className="progress-legend" aria-hidden="true">{order.slice(0, 3).map(status => <span key={status}><i className={status}/>{STATUS_LABELS[status]}</span>)}</div>}
  </div>
}
