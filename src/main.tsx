import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeCatalog } from './data/catalog'
import { initializeCourse } from './data/course'
import { applyWaitingUpdate, registerServiceWorker } from './services/offline'
import catalogueUrl from './data/words.generated.json?url'
import courseUrl from './data/course.generated.json?url'
import './app/styles.css'

const root = createRoot(document.getElementById('root')!)

declare global {
  // Catalogue downloads started by the inline script in the built index.html (scripts/vite-offline.ts).
  interface Window { littleEnglishStartupFetches?: Record<string, Promise<Response>> }
}

function takeStartupFetch(url: string) {
  const key = new URL(url, document.baseURI).href
  const pending = window.littleEnglishStartupFetches?.[key]
  if (pending) delete window.littleEnglishStartupFetches![key]
  return pending
}

function untilAborted<T>(work: Promise<T>, signal: AbortSignal) {
  return Promise.race([work, new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new Error('Catalogue timed out')), { once: true }))])
}

async function loadJson(url: string, signal: AbortSignal) {
  const early = takeStartupFetch(url)
  const response = await (early ? untilAborted(early, signal) : fetch(url, { signal }))
  if (!response.ok) throw new Error('Catalogue unavailable')
  return untilAborted(response.json() as Promise<unknown>, signal)
}

// Distant or unstable networks often fail only once, so try a second time before showing an error.
async function loadCatalogues(attempts = 2) {
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    try {
      return await Promise.all([loadJson(catalogueUrl, controller.signal), loadJson(courseUrl, controller.signal)])
    } catch (error) {
      if (attempt >= attempts) throw error
      await new Promise(resolve => window.setTimeout(resolve, 1000))
    } finally { window.clearTimeout(timeout) }
  }
}

async function start() {
  root.render(<main className="empty page"><h1>正在翻开词语书…</h1></main>)
  try {
    // Fetch the UI chunk beside the catalogue instead of creating a network waterfall.
    const appModule = import('./app/App')
    const [catalogue, course] = await loadCatalogues()
    initializeCatalog(catalogue)
    initializeCourse(course)
    // Read saved progress only after catalogue IDs are known.
    const { App } = await appModule
    root.render(<StrictMode><App/></StrictMode>)
  } catch {
    root.render(<main className="empty page"><h1>词语书还没准备好</h1><p>请检查网络，再试一次。</p><button className="button primary" onClick={() => void start()}>重新加载</button></main>)
  }
}

registerServiceWorker()
void applyWaitingUpdate().catch(() => false).then(reloading => { if (!reloading) return start() })
