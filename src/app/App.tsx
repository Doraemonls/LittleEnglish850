import { useLayoutEffect } from 'react'
import { useApp, store } from './store'
import { useRoute } from './router'
import { byId } from '../data/catalog'
import { audioPlayer } from '../services/audio'
import { Home } from '../pages/Home'
import { Learn, Practice } from '../pages/Learn'
import { Wordbook } from '../pages/Wordbook'
import { Parent } from '../pages/Parent'
import { About } from '../pages/About'
import { Icon } from '../components/Icon'

export function App() {
  const route = useRoute()
  const { status } = useApp()
  const parts = route.split('/')
  const page = parts[1] || 'home'
  const id = parts[2]
  const about = page === 'about' && (!id || id === 'en')
  const englishAbout = about && id === 'en'
  const blocked = status === 'unreadable' || status === 'conflict'
  useLayoutEffect(() => {
    audioPlayer.stop()
    if (page !== 'learn') store.dispatch({ type: 'leaveResult' })
    if (page !== 'book' || id) window.scrollTo(0, 0)
    const main = document.getElementById('main')
    if (main) { main.tabIndex = -1; if (page !== 'book' || id) main.focus({ preventScroll: true }) }
    document.title = englishAbout ? 'About · Little English' : `${({ home: '首页', learn: '学习', practice: '自由练习', book: '词语书', parent: '家长设置', about: '关于' } as Record<string, string>)[page] || '小小英语'} · 小小英语`
  }, [route, page, id, englishAbout])
  return <>
    <a className="skip-link" href="#main" lang={englishAbout ? 'en' : 'zh-CN'} onClick={event => { event.preventDefault(); document.getElementById('main')?.focus() }}>{englishAbout ? 'Skip to main content' : '跳到主要内容'}</a>
    <header className="site-header"><a className="brand" href="#/" aria-label={englishAbout ? 'Little English home' : '小小英语首页'}><span className="brand-icon"><Icon name="book" size={23}/></span><span>小小英语<small>LITTLE ENGLISH</small></span></a>{page !== 'parent' && !about && <a className="parent-link" href="#/parent"><Icon name="parent" size={19}/><span>家长</span></a>}</header>
    {status === 'unsaved' && <div className="save-banner" role="alert"><span>这次进度还没保存，先别关闭页面。</span><button className="text-button" onClick={() => store.retry()}>重试保存</button></div>}
    {blocked ? <main className="empty page" id="main"><Icon name="book" size={44}/><h1>{status === 'conflict' ? '另一页更新了学习记录' : '学习记录暂时无法读取'}</h1><p>{status === 'conflict' ? '请在一个页面里学习，读取最新进度后再继续。' : '原有记录保留在浏览器中。请重试读取，或请家长检查浏览器。'}</p><button className="button primary" onClick={() => store.retry()}>{status === 'conflict' ? '读取最新进度' : '重试读取'}</button></main> : <>
      {page === 'home' && <Home/>}
      {page === 'learn' && <Learn/>}
      {page === 'practice' && id && byId.has(id) && <Practice key={id} wordId={id}/>}
      <Wordbook visible={page === 'book' && (!id || byId.has(id))} wordId={id}/>
      {page === 'parent' && <Parent/>}
      {about && <About language={englishAbout ? 'en' : 'zh-CN'}/>}
      {(!['home', 'learn', 'practice', 'book', 'parent', 'about'].includes(page) || (['practice', 'book'].includes(page) && id && !byId.has(id)) || (page === 'practice' && !id) || (page === 'about' && !about)) && <main className="empty page" id="main"><h1>这一页找不到了</h1><a className="button primary" href="#/">返回首页</a></main>}
    </>}
  </>
}
