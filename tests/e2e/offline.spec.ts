import { test, expect, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

// The service worker exists only in production builds (scripts/vite-offline.ts).
const production = process.env.PLAYWRIGHT_PRODUCTION === '1'
test.use({ serviceWorkers: 'allow' })
test.skip(!production, 'The service worker is emitted only by production builds')

// The preview server serves dist/ directly, so rewriting this file is a new deployment.
const WORKER = 'dist/sw.js'
const cached = (page: Page, path: string) => page.evaluate(async path => Boolean(await caches.match(new URL(path, location.href).href)), path)

test('startup page starts catalogues and the app chunk in one wave', async ({ page }) => {
  const response = await page.request.get('./')
  const html = await response.text()
  const preload = html.slice(html.indexOf('littleEnglishStartupFetches'), html.indexOf('<script type="module"'))
  expect(preload.match(/(?:words|course)[.]generated-[^"]+[.]json/g)).toHaveLength(2)
  expect(preload).toContain('fetch(href)')
  expect(html).toMatch(/rel="modulepreload" crossorigin href="[^"]+App-[^"]+js"/)
  expect(html).toContain('<div id="root"><main class="empty page"><h1>正在翻开词语书…</h1></main></div>')
  const worker = await page.request.get('./sw.js')
  expect(worker.ok()).toBe(true)
  expect(await worker.text()).toContain('"precache":[')
})

test('after one visit the app and next class reopen offline', async ({ page, context, browserName }) => {
  // Playwright's WebKit fails offline reloads internally, so WebKit reloads online but is still
  // served by the worker cache; that also covers Safari's byte-range audio requests.
  const offline = browserName !== 'webkit'
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  // An unused preload would mean a catalogue was downloaded twice.
  page.on('console', message => { if (message.text().includes('preload')) errors.push(message.text()) })
  await page.goto('./')
  await page.getByRole('button', { name: /标准学习/ }).click()
  await expect(page.getByRole('heading', { name: '一起学单词吧' })).toBeVisible()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 30_000 })
  for (const path of ['index.html', 'assets/audio/i-word.mp3', 'assets/audio/i-sentence.mp3', 'assets/audio/that-word.mp3', 'assets/audio/xiaoxiao/prompt-listen.mp3']) {
    await expect.poll(() => cached(page, path), { timeout: 30_000, message: `${path} cached` }).toBe(true)
  }

  await context.setOffline(offline)
  const reload = await page.reload()
  expect(reload?.fromServiceWorker()).toBe(true)
  await expect(page.getByRole('heading', { name: '一起学单词吧' })).toBeVisible()
  const ranges = await page.evaluate(async () => {
    const read = async (range: string) => {
      const response = await fetch('assets/audio/i-word.mp3', { headers: { Range: range } })
      return { status: response.status, range: response.headers.get('Content-Range'), length: (await response.arrayBuffer()).byteLength }
    }
    const full = (await (await fetch('assets/audio/i-word.mp3')).arrayBuffer()).byteLength
    return { full, start: await read('bytes=0-1'), open: await read('bytes=10-'), suffix: await read('bytes=-5'), beyond: await read(`bytes=${full}-`) }
  })
  expect(ranges.start).toEqual({ status: 206, range: `bytes 0-1/${ranges.full}`, length: 2 })
  expect(ranges.open).toEqual({ status: 206, range: `bytes 10-${ranges.full - 1}/${ranges.full}`, length: ranges.full - 10 })
  expect(ranges.suffix).toEqual({ status: 206, range: `bytes ${ranges.full - 5}-${ranges.full - 1}/${ranges.full}`, length: 5 })
  expect(ranges.beyond).toMatchObject({ status: 416, range: `bytes */${ranges.full}` })
  await page.getByRole('button', { name: '开始学单词', exact: true }).click()
  await page.getByRole('button', { name: 'Try it', exact: true }).click()
  await page.getByRole('button', { name: '我', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What do you hear?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Listen again', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await context.setOffline(false)
  expect(errors).toEqual([])
})

test('a deployment downloaded earlier takes over at the next startup', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One engine is enough for the update hand-over')
  test.setTimeout(90_000)
  await page.goto('./')
  await page.getByRole('button', { name: /标准学习/ }).click()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 30_000 })
  const original = await readFile(WORKER, 'utf8')
  try {
    // Simulate a new deployment on the server: same files, new version.
    await writeFile(WORKER, original.replace('"version":"', '"version":"next'))
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update() })
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting), undefined, { timeout: 30_000 })
    await page.reload()
    await expect(page.getByRole('heading', { name: '一起学单词吧' })).toBeVisible()
    await expect.poll(async () => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return { waiting: Boolean(registration?.waiting), apps: (await caches.keys()).filter(name => name.startsWith('le850-app-')) }
    }), { timeout: 30_000 }).toEqual({ waiting: false, apps: [expect.stringMatching(/^le850-app-next/)] })
  } finally { await writeFile(WORKER, original) }
})
