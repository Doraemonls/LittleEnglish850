import { useApp, store } from '../app/store'
import { navigate } from '../app/router'
import { useToday } from '../app/useToday'
import { counts, dueWords, localDay, mainAction, nextLesson } from '../domain/progress'
import { ProgressBar } from '../components/ProgressBar'
import { Icon } from '../components/Icon'
import { BookIllustration } from '../components/BookIllustration'

export function Home() {
  const { state } = useApp()
  const today = useToday()
  const action = mainAction(state, today)
  const stats = counts(state)
  const due = dueWords(state, today).length
  const lesson = nextLesson(state) || 1

  const headings = { continue: '接着上次学', review: '再读一读，记得更牢', lesson: '一起学单词吧', wordbook: '今天真棒，全部完成！' }
  const labels = { continue: '继续学', review: '复习一下', lesson: '开始学单词', wordbook: '翻翻词语书' }

  const taskBadge = action === 'continue'
    ? (state.session?.mode === 'lesson'
        ? `进行中 · 第 ${state.session.lessonId} 课（第 ${state.session.index + 1}/${state.session.wordIds.length} 词）`
        : `进行中 · 复习（第 ${(state.session?.index ?? 0) + 1}/${state.session?.wordIds.length ?? 0} 词）`)
    : action === 'review'
    ? `🎯 今日任务 · 复习 ${due} 个到期单词`
    : action === 'lesson'
    ? `🎯 今日新课 · 第 ${lesson} 课（5 个新词）`
    : '🎉 今日目标已全部达成！明天继续来巩固哦~'

  const start = () => {
    const action = mainAction(state, localDay())
    if (action === 'wordbook') { navigate('/book'); return }
    if (action === 'lesson' || action === 'review') store.dispatch({ type: 'start', mode: action })
    navigate('/learn')
  }

  return <main className="home page" id="main">
    <div className={`home-card ${action === 'wordbook' ? 'home-card-completed' : ''}`}>
      <BookIllustration/>
      <h1>{headings[action]}</h1>
      <div className={`home-task-badge ${action === 'wordbook' ? 'completed' : ''}`}>
        <Icon name={action === 'wordbook' ? 'check' : 'bulb'} size={18}/>
        <span>{taskBadge}</span>
      </div>
      <section className="home-progress" aria-label="我的单词">
        <div className="home-progress-header">
          <h2>我的单词</h2>
          <span className="home-progress-total">累计学过 <strong>{stats.learned + stats.mastered}</strong> / 850 词</span>
        </div>
        <ProgressBar state={state}/>
        <div className="home-stats-chips" aria-label="学习状态统计">
          <span className="stat-chip mastered"><i className="status-dot mastered" aria-hidden="true"/>记牢了 <strong>{stats.mastered}</strong></span>
          <span className="stat-chip learned"><i className="status-dot learned" aria-hidden="true"/>学过 <strong>{stats.learned}</strong></span>
          <span className="stat-chip unstarted"><i className="status-dot unstarted" aria-hidden="true"/>未开始 <strong>{stats.unstarted}</strong></span>
        </div>
      </section>
      <button className="button primary home-start" onClick={start}>{labels[action]}<Icon name="arrow"/></button>
      {action !== 'wordbook' && <a className="home-wordbook" href="#/book"><Icon name="book"/>翻翻词语书<Icon name="arrow" size={18}/></a>}
    </div>
  </main>
}
