import { test, expect } from '@playwright/test'
import { STORAGE_KEY } from '../../src/services/storage'

test('catalogue load failure retries without changing saved progress', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, 'keep-original'), STORAGE_KEY)
  const catalogue = /\/words\.generated(?:-[\w-]+)?\.json$/
  await page.route(catalogue, route => route.abort())
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '词语书还没准备好' })).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('keep-original')
  await page.unroute(catalogue)
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.getByRole('heading', { name: '学习记录暂时无法读取' })).toBeVisible()
})

test('storage write failure keeps in-memory exercise and offers successful retry', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('heading', { name: '一起学单词吧' }).waitFor()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
    ;(window as typeof window & { restoreStorage?: () => void }).restoreStorage = () => { Storage.prototype.setItem = original }
  })
  await page.getByRole('button', { name: '开始学单词', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Progress not saved')
  await page.getByRole('button', { name: 'Try it', exact: true }).click()
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  await page.evaluate(() => (window as typeof window & { restoreStorage?: () => void }).restoreStorage?.())
  await page.getByRole('button', { name: 'Save again' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
})

test('export failure uses the same button for retry', async ({ page }) => {
  await page.goto('./#/parent')
  await page.getByRole('heading', { name: '家长设置' }).waitFor()
  await page.evaluate(() => {
    const original = URL.createObjectURL
    URL.createObjectURL = () => { throw new Error('Download unavailable') }
    ;(window as typeof window & { restoreDownload?: () => void }).restoreDownload = () => { URL.createObjectURL = original }
  })
  const button = page.getByRole('button', { name: '导出学习记录', exact: true })
  await button.click()
  await expect(page.locator('.export-status')).toContainText('导出未完成')
  await expect(button).toBeEnabled()
  await page.evaluate(() => (window as typeof window & { restoreDownload?: () => void }).restoreDownload?.())
  const download = page.waitForEvent('download')
  await button.click()
  await download
  await expect(page.locator('.export-status')).toContainText('已发起下载')
})
