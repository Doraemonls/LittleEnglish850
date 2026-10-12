import { useApp, store } from '../app/store'
import { navigate } from '../app/router'
import { useToday } from '../app/useToday'
import { localDay, mainAction } from '../domain/progress'
import { ProgressBar } from '../components/ProgressBar'
import { Icon } from '../components/Icon'

export function Home() {
  const { state } = useApp()
  const today = useToday()
  const action = mainAction(state, today)
  const headings = { continue: '接着上次学', review: '再读一读，记得更牢', lesson: '一起学单词吧', wordbook: '今天可以歇一歇' }
  const labels = { continue: '继续学', review: '复习一下', lesson: '开始学单词', wordbook: '翻翻词语书' }
  const start = () => {
    const action = mainAction(state, localDay())
    if (action === 'wordbook') { navigate('/book'); return }
    if (action === 'lesson' || action === 'review') store.dispatch({ type: 'start', mode: action })
    navigate('/learn')
  }
  return <main className="home page" id="main">
    <div className="home-book" aria-hidden="true"><div className="book-shadow"/><div className="book-left"><span>hello</span><i/><i/></div><div className="book-right"><span>🍎</span><small>apple</small></div></div>
    <h1>{headings[action]}</h1>
    <section className="home-progress" aria-label="我的单词"><h2>我的单词</h2><ProgressBar state={state}/></section>
    <button className="button primary home-start" onClick={start}>{labels[action]}<Icon name="arrow"/></button>
    {action !== 'wordbook' && <a className="home-wordbook" href="#/book"><Icon name="book"/>翻翻词语书<Icon name="arrow" size={18}/></a>}
  </main>
}
