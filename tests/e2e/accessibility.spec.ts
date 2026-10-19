import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { freshState } from '../../src/domain/session'
import { STORAGE_KEY } from '../../src/services/storage'
import { addDays, localDay } from '../../src/domain/progress'

test('main pages and exercises have no serious accessibility violations', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'One engine is sufficient for the shared DOM accessibility audit')
  for (const route of ['./', './#/book', './#/book/ogden-apple', './#/parent', './#/about', './#/about/en']) {
    await page.goto(route)
    await expect(page.locator('.site-header')).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(results.violations).toEqual([])
  }
  await page.goto('./')
  await page.getByRole('button', { name: '开始学单词', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await page.getByRole('button', { name: 'I know this word', exact: true }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Keep practising' }).click()
  await page.getByRole('button', { name: 'Try it', exact: true }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})

test('independent due review reaches gold only after all three questions', async ({ page }) => {
  const state = freshState()
  state.settings.onboardingSeen = true
  state.settings.spokenGuidance = false
  state.words['ogden-apple'] = { teaching: 'completed', reviewStep: 2, lastReviewedOn: addDays(localDay(), -7), nextReviewOn: localDay() }
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)) }, { key: STORAGE_KEY, state })
  await page.goto('./')
  await page.getByRole('button', { name: '复习一下', exact: true }).click()
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Listen again', exact: true })).toBeVisible()
  await page.getByRole('textbox').pressSequentially('apple')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Listen again', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).words['ogden-apple'], STORAGE_KEY)
  expect(before.reviewStep).toBe(2)
  const order = await page.locator('.choice').allTextContents()
  await page.reload()
  await expect(page.locator('.choice')).toHaveText(order)
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).words['ogden-apple'], STORAGE_KEY)
  expect(after.reviewStep).toBe(3)
  expect(after.nextReviewOn).toBe(addDays(localDay(), 30))
})
