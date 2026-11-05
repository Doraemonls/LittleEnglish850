/* global CONFIG */
// Little English 850 service worker, emitted only by production builds as sw.js.
// scripts/vite-offline.ts prepends CONFIG = { version, audioVersion, precache }:
// version changes with every deployment, audioVersion only when an audio file changes.
// GitHub Pages sends max-age=600 for every file and has no servers in mainland China,
// so this worker keeps the app, catalogues and audio on the device after first use.
const APP_CACHE = `le850-app-${CONFIG.version}`
const RUNTIME_CACHE = `le850-runtime-${CONFIG.version}`
const AUDIO_CACHE = `le850-audio-${CONFIG.audioVersion}`
const scope = new URL(self.registration.scope)
const href = path => new URL(path, scope).href
const ASSETS_ROOT = href('assets/')
const AUDIO_ROOT = href('assets/audio/')
const INDEX = href('index.html')

// A new version waits until every page using the old one has closed (or the page asks it
// to take over before the app starts), so one page never mixes files from two deployments.
self.addEventListener('install', event => event.waitUntil(precache()))

async function precache() {
  const cache = await caches.open(APP_CACHE)
  await Promise.all(CONFIG.precache.map(async path => {
    const target = href(path)
    // index.html must come from the server; content-hashed files may come from the HTTP cache.
    const request = new Request(target, { cache: path === 'index.html' ? 'reload' : 'default' })
    let response
    for (let attempt = 0; attempt < 2 && !response?.ok; attempt++) {
      try { response = await fetch(request) } catch { response = undefined }
    }
    if (!response?.ok) throw new Error(`Could not cache ${path}`)
    await cache.put(target, response)
  }))
}

self.addEventListener('activate', event => event.waitUntil((async () => {
  const current = [APP_CACHE, RUNTIME_CACHE, AUDIO_CACHE]
  const names = await caches.keys()
  await Promise.all(names.filter(name => name.startsWith('le850-') && !current.includes(name)).map(name => caches.delete(name)))
  await self.clients.claim()
})()))

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(scope.href)) return
  const path = new URL(request.url).pathname.slice(scope.pathname.length)
  if (request.mode === 'navigate') {
    // Only the app page itself; opening a data file in a new tab still goes to the network.
    if (path === '' || path === 'index.html') event.respondWith(cacheFirst(INDEX, request))
    return
  }
  if (request.url.startsWith(AUDIO_ROOT)) event.respondWith(audio(request))
  else if (path !== 'sw.js') event.respondWith(cacheFirst(request.url, request))
})

async function cacheFirst(key, request) {
  const cached = await caches.match(key, { ignoreSearch: true })
  if (cached) return cached
  const response = await fetch(request)
  // Built assets have content-hashed names, so a stored copy never goes stale.
  if (response.status === 200 && key.startsWith(ASSETS_ROOT)) {
    const copy = response.clone()
    caches.open(RUNTIME_CACHE).then(cache => cache.put(key, copy)).catch(() => undefined)
  }
  return response
}

async function audio(request) {
  const key = request.url.split('?')[0]
  let response = await caches.match(key, { cacheName: AUDIO_CACHE })
  if (!response) {
    // Always download the whole file, even when the media element asked for a byte range.
    response = await fetch(key)
    if (response.status === 200) await (await caches.open(AUDIO_CACHE)).put(key, response.clone())
  }
  return partial(request, response)
}

// Safari plays media only when byte-range requests are answered with 206 responses.
async function partial(request, response) {
  const range = request.headers.get('range')
  if (!range || response.status !== 200) return response
  const body = await response.blob()
  const size = body.size
  const [first, last] = range.trim().replace('bytes=', '').split(',')[0].split('-').map(value => value.trim())
  let start = first === '' ? NaN : Number(first)
  let end = last === '' ? NaN : Number(last)
  if (Number.isNaN(start)) {
    start = Math.max(size - (Number.isNaN(end) ? size : end), 0)
    end = size - 1
  } else end = Number.isNaN(end) ? size - 1 : Math.min(end, size - 1)
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  }
  return new Response(body.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
    },
  })
}

self.addEventListener('message', event => {
  const message = event.data || {}
  if (message.type === 'skip-waiting') self.skipWaiting()
  else if (message.type === 'prefetch-audio' && Array.isArray(message.paths)) event.waitUntil(prefetch(message.paths))
})

// Download upcoming audio a few files at a time; failures are retried on a later visit.
async function prefetch(paths) {
  const cache = await caches.open(AUDIO_CACHE)
  const queue = paths.map(path => href(String(path))).filter(target => target.startsWith(AUDIO_ROOT))
  const worker = async () => {
    for (let target = queue.shift(); target; target = queue.shift()) {
      if (await cache.match(target)) continue
      try {
        const response = await fetch(target)
        if (response.status === 200) await cache.put(target, response)
      } catch { /* Offline or blocked; the next visit asks again. */ }
    }
  }
  await Promise.all([worker(), worker(), worker()])
}
