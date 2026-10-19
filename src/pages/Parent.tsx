import { useState } from 'react'
import { useApp, store } from '../app/store'
import { useToday } from '../app/useToday'
import { counts, dueWords, STATUS_LABELS } from '../domain/progress'
import type { LearningStatus } from '../data/types'
import { words } from '../data/catalog'
import { downloadProgress } from '../services/export'
import { ProgressBar } from '../components/ProgressBar'
import { Icon } from '../components/Icon'
import { AudioButton } from '../components/AudioButton'
import { Onboarding } from '../components/Onboarding'
import attributions from '../../content/attributions.json' with { type: 'json' }
import catalogueUrl from '../data/words.generated.json?url'

export function Parent() {
  const { state } = useApp()
  const today = useToday()
  const [onboarding, setOnboarding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const stats = counts(state)
  const exportData = async () => {
    setExporting(true); setMessage('')
    await new Promise(resolve => window.setTimeout(resolve, 0))
    try { downloadProgress(state); setMessage('已发起下载，请在浏览器中查看文件。') }
    catch { setMessage('导出未完成，请再试一次。') }
    finally { setExporting(false) }
  }
  return <main className="parent page" id="main"><a className="text-button back-link" href="#/"><Icon name="back"/>首页</a><div className="page-heading"><h1>家长设置</h1><Icon name="parent" size={38}/></div>
    <div className="parent-panels">
    <section className="settings-panel overview-panel"><h2>学习概览</h2><ProgressBar state={state} showLegend={false}/><dl className="stats-grid">{(['mastered', 'learned', 'started', 'unstarted'] as LearningStatus[]).map(key => <div key={key}><dt><i className={`status-dot ${key}`}/>{STATUS_LABELS[key]}</dt><dd>{stats[key]}<small>词 · {(stats[key] / words.length * 100).toFixed(1)}%</small></dd></div>)}</dl><div className="totals"><span>累计学过 <strong>{stats.learned + stats.mastered}</strong> 词</span><span>待复习 <strong>{dueWords(state, today).length}</strong> 词</span></div><details className="progress-info"><summary>进度说明</summary><p>「记牢了」表示连续三次到期复习独立通过，之后仍会定期巩固。累计学过包含「学过」和「记牢了」。</p></details></section>
    <section className="settings-panel"><h2>声音与引导</h2><div className="setting-row"><label htmlFor="guidance">语音引导</label><input id="guidance" type="checkbox" role="switch" checked={state.settings.spokenGuidance} onChange={event => store.dispatch({ type: 'settings', value: { spokenGuidance: event.target.checked } })}/></div><div className="setting-row"><label htmlFor="chinese-voice">中文发音</label><select id="chinese-voice" aria-label="中文发音音色" value={state.settings.chineseVoice || 'xiaoxiao'} onChange={event => store.dispatch({ type: 'settings', value: { chineseVoice: event.target.value as 'xiaoxiao' | 'yunxia' } })}><option value="xiaoxiao">温暖女声（晓晓 · 默认）</option><option value="yunxia">活泼童声（云夏 · 备选）</option></select></div><div className="volume-row"><label htmlFor="volume">音量</label><input id="volume" aria-label="音量" type="range" min="0" max="1" step="0.05" value={state.settings.volume} onChange={event => store.dispatch({ type: 'settings', value: { volume: Number(event.target.value) } })}/><output htmlFor="volume">{Math.round(state.settings.volume * 100)}%</output></div><div className="sound-actions"><AudioButton src="assets/audio/prompt-welcome.mp3" label="试听"/><button className="text-button" onClick={() => setOnboarding(true)}>重看操作引导<Icon name="arrow" size={18}/></button></div></section>
    <section className="settings-panel export-panel"><h2>学习记录</h2><p>记录仅保存在当前浏览器，清除浏览器数据会丢失记录。</p><button className="button primary" disabled={exporting} onClick={exportData}><Icon name="export"/>{exporting ? '正在导出…' : '导出学习记录'}</button><p className="export-status" role="status">{message}</p></section>
    </div>
    <details className="sources"><summary>词库与素材来源</summary><p className="small">Ogden Basic English · 850 词。当前文字与生成音频已接入，逐词人工审校、审听和儿童试用尚待完成。</p>{attributions.sources.map(source => <div key={source.id}><strong>{source.title}</strong><p>{source.author}</p><a href={source.id === 'project-text' ? catalogueUrl : source.url} target="_blank" rel="noreferrer">查看来源</a> · <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a><p>{source.changes}</p></div>)}</details>
    <a className="text-button" href="#/about">关于小小英语 / <span lang="en">About</span><Icon name="arrow" size={18}/></a>
    {onboarding && <Onboarding onClose={() => setOnboarding(false)}/>}
  </main>
}
