import { test, expect } from '@playwright/test'
import { freshState } from '../../src/domain/session'
import { STORAGE_KEY } from '../../src/services/storage'
import { addDays, localDay } from '../../src/domain/progress'

test('startup requests one compact catalogue and leaves audio on demand', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '一起学单词吧' })).toBeVisible()
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => ({ name: entry.name, decodedBodySize: (entry as PerformanceResourceTiming).decodedBodySize })))
  const catalogues = resources.filter(entry => /\/words\.generated(?:-[\w-]+)?\.json$/.test(entry.name))
  expect(catalogues).toHaveLength(1)
  expect(catalogues[0].decodedBodySize).toBeLessThan(220_000)
  expect(resources.some(entry => entry.name.includes('.mp3'))).toBe(false)
  await expect(page.locator('.word-row')).toHaveCount(0)
  await page.goto('./#/parent')
  await page.getByText('词库与素材来源', { exact: true }).click()
  const link = page.locator('.sources > div').filter({ hasText: 'Little English 850 teaching text' }).getByRole('link', { name: '查看来源' })
  const response = await page.request.get((await link.getAttribute('href'))!)
  expect(response.ok()).toBe(true)
  expect((await response.body()).length).toBeLessThan(800_000)
  expect(await response.json()).toHaveLength(850)
  expect(errors).toEqual([])
})

test('saved progress waits for a delayed catalogue before it is read', async ({ page }) => {
  const state = freshState()
  state.settings.onboardingSeen = true
  state.words['ogden-apple'] = { teaching: 'completed', reviewStep: 1, lastReviewedOn: addDays(localDay(), -3), nextReviewOn: localDay() }
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: STORAGE_KEY, state })
  await page.route(/\/words\.generated(?:-[\w-]+)?\.json$/, async route => {
    const response = await route.fetch()
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({ response })
  })
  await page.goto('./')
  await expect(page.getByRole('button', { name: '复习一下', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '学习记录暂时无法读取' })).toHaveCount(0)
})

test('both About languages refresh and keep the slogan above the title', async ({ page }) => {
  for (const [route, title, slogan] of [
    ['./#/about', '关于小小英语', 'AI 让答案更近，学习让世界更大。'],
    ['./#/about/en', 'About Little English', 'AI brings answers closer.Learning opens up your world.'],
  ]) {
    await page.goto(route)
    await page.reload()
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.locator('.about-article > :first-child')).toHaveClass('about-slogan')
    await expect(page.locator('.about-slogan')).toHaveText(slogan)
  }
})
