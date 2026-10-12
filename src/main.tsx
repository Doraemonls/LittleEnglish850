import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeCatalog } from './data/catalog'
import catalogueUrl from './data/words.generated.json?url'
import './app/styles.css'

const root = createRoot(document.getElementById('root')!)

async function start() {
  root.render(<main className="empty page"><h1>正在翻开词语书…</h1></main>)
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    try {
      const response = await fetch(catalogueUrl, { signal: controller.signal })
      if (!response.ok) throw new Error('Catalogue unavailable')
      initializeCatalog(await response.json())
    } finally { window.clearTimeout(timeout) }
    // Read saved progress only after catalogue IDs are known.
    const { App } = await import('./app/App')
    root.render(<StrictMode><App/></StrictMode>)
  } catch {
    root.render(<main className="empty page"><h1>词语书还没准备好</h1><p>请检查网络，再试一次。</p><button className="button primary" onClick={() => void start()}>重新加载</button></main>)
  }
}
void start()
