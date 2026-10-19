import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp, store } from '../app/store'
import { navigate } from '../app/router'
import { byId, lessonIds, lessonWords, words } from '../data/catalog'
import type { LearningStatus } from '../data/types'
import { lessonStatus, STATUS_LABELS, statusOf } from '../domain/progress'
import { WordCard } from '../components/WordCard'
import { Icon } from '../components/Icon'
import { AudioButton } from '../components/AudioButton'

export function Wordbook({ visible, wordId }: { visible: boolean; wordId?: string }) {
  const { state } = useApp()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<LearningStatus | ''>('')
  const [lesson, setLesson] = useState('')
  const [tab, setTab] = useState<'words' | 'courses'>('words')
  const [limit, setLimit] = useState(40)
  const scroll = useRef(0)
  const previous = useRef(false)
  const browsing = visible && !wordId
  useLayoutEffect(() => {
    if (browsing) window.scrollTo(0, scroll.current)
    previous.current = browsing
    const record = () => { if (previous.current) scroll.current = window.scrollY }
    window.addEventListener('scroll', record)
    return () => { previous.current = false; window.removeEventListener('scroll', record) }
  }, [browsing])
  useEffect(() => { if (visible && wordId && byId.has(wordId)) store.dispatch({ type: 'peek', wordId }) }, [visible, wordId])
  // Keep browsing state between routes without rebuilding the hidden list.
  if (!visible) return null
  const current = wordId && byId.get(wordId)
  const active = state.session?.phase === 'active'
  const reviewTarget = active && state.session?.mode === 'review' && !state.session.settled ? state.session.wordIds[state.session.index] : null
  if (visible && current) return <main className="word-detail page" id="main"><a href="#/book" className="text-button back-link"><Icon name="back"/>返回词语书</a><div className="detail-heading"><span>第 {current.lessonId} 课</span><span className={`status-tag ${statusOf(state.words[current.id])}`}>{STATUS_LABELS[statusOf(state.words[current.id])]}</span></div><section className="detail-panel"><WordCard word={current}/><button className="button primary full" onClick={() => { store.dispatch({ type: 'peek', wordId: current.id }); navigate(`/practice/${current.id}`) }}>练练这个词<Icon name="arrow"/></button></section>{active && <a className="text-button resume-link" href="#/learn">继续正在学的内容<Icon name="arrow"/></a>}</main>
  const filtered = words.filter(word => (!query.trim() || `${word.word} ${word.meaning}`.toLowerCase().includes(query.trim().toLowerCase())) && (!status || statusOf(state.words[word.id]) === status) && (!lesson || word.lessonId === Number(lesson)))
  return <main className="wordbook page" id="main">
    <a href="#/" className="text-button back-link"><Icon name="back"/>首页</a>
    <div className="page-heading"><h1>我的词语书</h1><Icon name="book" size={40}/></div>
    {active && <a className="resume-banner" href="#/learn"><span>继续学</span><Icon name="arrow" size={18}/></a>}
    <div className="tabs" aria-label="词语书视图"><button aria-pressed={tab === 'words'} onClick={() => { setTab('words'); setLimit(40) }}>查单词</button><button aria-pressed={tab === 'courses'} onClick={() => { setTab('courses'); setLimit(40) }}>看课程</button></div>
    {tab === 'words' ? <>
      <div className="search-input"><Icon name="search"/><input aria-label="搜索单词或中文" type="search" placeholder="单词或中文" value={query} onChange={event => { setQuery(event.target.value); setLimit(40) }}/>{query && <button type="button" className="search-clear-btn" aria-label="清空搜索内容" onClick={() => { setQuery(''); setLimit(40) }}><Icon name="close" size={18}/></button>}</div>
      <div className="filters"><label>学习状态<select value={status} onChange={event => { setStatus(event.target.value as LearningStatus | ''); setLimit(40) }}><option value="">全部状态</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>课程<select value={lesson} onChange={event => { setLesson(event.target.value); setLimit(40) }}><option value="">全部课程</option>{lessonIds.map(id => <option value={id} key={id}>第 {id} 课</option>)}</select></label></div>
      <div className="word-grid">{filtered.slice(0, limit).map(word => {
        const isTarget = word.id === reviewTarget
        const st = statusOf(state.words[word.id])
        return <div className="word-row" key={word.id}>
          <a className="word-row-main" href={`#/book/${word.id}`} onClick={() => store.dispatch({ type: 'peek', wordId: word.id })}>
            <span className="word-row-image" aria-hidden="true">{isTarget ? <Icon name="bulb"/> : word.illustration || <Icon name="book"/>}</span>
            <span className="word-row-content">
              <strong lang={isTarget ? 'zh-CN' : 'en'}>{isTarget ? '正在复习的词' : word.word}</strong>
              <span>{isTarget ? '查看提示' : word.meaning}</span>
            </span>
            <span className="word-row-status"><i className={`status-dot ${st}`} aria-hidden="true"/>{STATUS_LABELS[st]}</span>
            <Icon name="arrow" size={18}/>
          </a>
          <div className="word-row-quick-audio" onClick={e => e.stopPropagation()}>
            <AudioButton src={word.audio.word} label={`听 ${word.word}`} variant="icon" language="en"/>
          </div>
        </div>
      })}</div>
      {!filtered.length && <div className="empty"><Icon name="search" size={40}/><h2>还没找到这个词</h2><button className="button secondary" onClick={() => { setQuery(''); setStatus(''); setLesson('') }}>清除搜索和筛选</button></div>}
      {filtered.length > limit && <button className="button secondary more-button" onClick={() => setLimit(limit + 40)}>再看一些词</button>}
    </> : <><div className="course-grid">{lessonIds.slice(0, limit).map(id => {
      const list = lessonWords(id)
      const label = lessonStatus(state, id)
      const completedCount = list.filter(w => state.words[w.id]?.teaching === 'completed').length
      return <article className="course-card" key={id}>
        <div className="course-heading">
          <div className="course-title-group">
            <h2>第 {id} 课</h2>
            <div className="course-dots-bar" aria-label={`学习进度 ${completedCount}/5 词`}>
              {list.map(w => {
                const s = statusOf(state.words[w.id])
                return <span key={w.id} className={`course-dot ${s}`} title={`${w.word}: ${STATUS_LABELS[s]}`}/>
              })}
            </div>
          </div>
          <span className={`course-badge ${label === '已学过' ? 'done' : label === '未学完' ? 'active' : ''}`}>{label}</span>
        </div>
        <ul>{list.map(word => <li key={word.id}><a href={`#/book/${word.id}`} onClick={() => store.dispatch({ type: 'peek', wordId: word.id })}><span lang={word.id === reviewTarget ? 'zh-CN' : 'en'}>{word.id === reviewTarget ? '正在复习的词' : word.word}</span><span>{word.id === reviewTarget ? '查看提示' : word.meaning}</span></a></li>)}</ul>
        {!active && label !== '已学过' && <button className="button secondary full" onClick={() => { store.dispatch({ type: 'start', mode: 'lesson', lessonId: id }); navigate('/learn') }}>{label === '未学完' ? '接着学这课' : '学这一课'}<Icon name="arrow" size={18}/></button>}
      </article>
    })}</div>{lessonIds.length > limit && <button className="button secondary more-button" onClick={() => setLimit(limit + 40)}>再看一些课</button>}</>}
  </main>
}
