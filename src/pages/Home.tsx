import { useApp, store } from '../app/store'
import { navigate } from '../app/router'
import { useToday } from '../app/useToday'
import { counts, dueWords, localDay, mainAction, nextClass } from '../domain/progress'
import { unitById } from '../data/course'
import { ProgressBar } from '../components/ProgressBar'
import { Icon } from '../components/Icon'
import { BookIllustration } from '../components/BookIllustration'

export function Home() {
  const { state } = useApp()
  const today = useToday()
  const action = mainAction(state, today)
  const stats = counts(state)
  const due = dueWords(state, today).length
  const courseClass = nextClass(state)
  const unit = courseClass ? unitById.get(courseClass.unitId) : null
  const planLabel = state.settings.learningPlan === 'standard' ? '标准学习' : '加速学习'

  if (!state.settings.planSelected) return <main className="home page plan-choice" id="main"><div className="home-card"><BookIllustration/><p className="eyebrow">家长设置</p><h1>选择学习计划</h1><p>两个计划都学习同一套 850 词，之后可以在家长设置中切换，不会丢失进度。</p><div className="plan-choice-grid"><button className="plan-choice-card recommended" onClick={() => store.dispatch({ type: 'settings', value: { learningPlan: 'standard', planSelected: true } })}><strong>标准学习</strong><span>每课约 5 个新词</span><small>约 5–10 分钟 · 推荐</small></button><button className="plan-choice-card" onClick={() => store.dispatch({ type: 'settings', value: { learningPlan: 'accelerated', planSelected: true } })}><strong>加速学习</strong><span>每课约 7 个新词</span><small>约 10–15 分钟</small></button></div></div></main>

  const headings = { continue: '接着上次学', review: '再读一读，记得更牢', lesson: '一起学单词吧', wordbook: '今天真棒，全部完成！' }
  const labels = { continue: '继续学', review: '复习一下', lesson: '开始学单词', wordbook: '翻翻词语书' }

  const taskBadge = action === 'continue'
    ? (state.session?.mode === 'lesson'
        ? `进行中 · ${state.session.phase === 'exit-test' ? '课堂小测' : `第 ${state.session.index + 1}/${state.session.wordIds.length} 词`}`
        : `进行中 · 复习（第 ${(state.session?.index ?? 0) + 1}/${state.session?.wordIds.length ?? 0} 词）`)
    : action === 'review'
    ? `🎯 今日任务 · 复习 ${due} 个到期单词`
    : action === 'lesson'
    ? `🎯 今日新课 · ${unit?.titleZh ?? ''}（${courseClass?.wordIds.filter(id => state.words[id]?.teaching !== 'completed').length ?? 0} 个新词）`
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
          {stats.learned + stats.mastered > 0 && <span className="home-progress-total">累计学过 <strong>{stats.learned + stats.mastered}</strong> 词</span>}
        </div>
        <ProgressBar state={state}/>
        {action === 'lesson' && <p className="course-context">{planLabel} · 第 {courseClass?.sequence} 课 · 约 {state.settings.learningPlan === 'standard' ? '5–10' : '10–15'} 分钟</p>}
        {stats.learned + stats.mastered > 0 && <div className="home-stats-chips" aria-label="学习状态统计">
          <span className="stat-chip mastered"><i className="status-dot mastered" aria-hidden="true"/>记牢了 <strong>{stats.mastered}</strong></span>
          <span className="stat-chip learned"><i className="status-dot learned" aria-hidden="true"/>学过 <strong>{stats.learned}</strong></span>
        </div>}
      </section>
      <button className="button primary home-start" onClick={start}>{labels[action]}<Icon name="arrow"/></button>
      {action !== 'wordbook' && <a className="home-wordbook" href="#/book"><Icon name="book"/>翻翻词语书<Icon name="arrow" size={18}/></a>}
    </div>
  </main>
}
