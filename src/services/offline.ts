// Page side of the production service worker (src/sw/service-worker.js).
const enabled = import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator
const requested = new Set<string>()
const wait = (ms: number) => new Promise<null>(resolve => window.setTimeout(() => resolve(null), ms))

export function registerServiceWorker() {
  if (!enabled) return
  // Register after the first load so the worker's downloads never compete with startup.
  const register = () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined) }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

/**
 * Switch to a deployment downloaded during an earlier visit before the app starts, so a tab
 * that is never closed still receives updates. Resolves true when the page is reloading.
 */
export async function applyWaitingUpdate(): Promise<boolean> {
  if (!enabled || !navigator.serviceWorker.controller) return false
  const registration = await Promise.race([navigator.serviceWorker.getRegistration(), wait(2000)])
  const waiting = registration?.waiting
  if (!waiting) return false
  const changed = new Promise<boolean>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), { once: true }))
  waiting.postMessage({ type: 'skip-waiting' })
  if (!await Promise.race([changed, wait(3000).then(() => false)])) return false
  window.location.reload()
  return true
}

/** Download audio before it is needed. Each path is requested at most once per page load. */
export function prefetchAudio(paths: string[]) {
  const fresh = paths.filter(path => path && !requested.has(path))
  if (!fresh.length) return
  fresh.forEach(path => requested.add(path))
  void deliver(fresh)
}

async function deliver(paths: string[]) {
  if (enabled) {
    // On a first visit the worker may still be installing; it stores the files itself once active.
    const registration = await Promise.race([navigator.serviceWorker.ready, wait(10_000)])
    if (registration?.active) {
      registration.active.postMessage({ type: 'prefetch-audio', paths })
      return
    }
  }
  // Without a service worker (development, or in-app browsers without support), warm the HTTP cache.
  const queue = [...paths]
  const worker = async () => {
    for (let path = queue.shift(); path; path = queue.shift()) {
      await fetch(`${import.meta.env.BASE_URL}${path}`).then(response => response.blob()).catch(() => undefined)
    }
  }
  await Promise.all([worker(), worker()])
}
