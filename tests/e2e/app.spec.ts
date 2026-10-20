import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { freshState } from '../../src/domain/session'
import { STORAGE_KEY } from '../../src/services/storage'
import { addDays, localDay } from '../../src/domain/progress'

async function stored(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY) }
async function start(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: '开始学单词', exact: true }).click()
}
async function hear(page: Page) {
  await expect(page.getByRole('button', { name: 'Listen again', exact: true })).toBeVisible()
}
async function prepareSpell(page: Page, meaning = '苹果') {
  await page.getByRole('button', { name: 'Try it', exact: true }).click()
  await page.getByRole('button', { name: meaning, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What do you hear?' })).toBeVisible()
  await expect(page.getByRole('button', { name: meaning, exact: true })).toBeDisabled()
  await hear(page)
  await page.getByRole('button', { name: meaning, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Listen and spell.' })).toBeVisible()
  await hear(page)
}

test('simple child home and working search with retained filters', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '一起学单词吧' })).toBeVisible()
  await expect(page.locator('.word-row')).toHaveCount(0)
  const text = await page.locator('main:visible').innerText()
  expect(text).not.toMatch(/850|0\s*\/|%|字母课程|积分|签到/)
  await page.getByRole('link', { name: '翻翻词语书' }).click()
  await page.getByRole('searchbox').fill('苹果')
  await page.locator('.word-row').click()
  await expect(page.getByRole('heading', { name: 'apple', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '返回词语书' }).click()
  await expect(page.getByRole('searchbox')).toHaveValue('苹果')
  await page.getByRole('searchbox').fill('no-such-word')
  await expect(page.getByRole('heading', { name: '还没找到这个词' })).toBeVisible()
  await page.getByRole('button', { name: '清除搜索和筛选' }).click()
  await expect(page.locator('.word-row')).toHaveCount(40)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('a known lesson word can be safely confirmed and skipped', async ({ page }) => {
  await start(page)
  const skip = page.getByRole('button', { name: 'I know this word', exact: true })
  await skip.click()
  const dialog = page.getByRole('dialog', { name: 'Skip apple?' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Keep practising' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(skip).toBeFocused()
  expect((await stored(page)).words['ogden-apple'].teaching).toBe('started')

  await skip.click()
  await page.getByRole('button', { name: 'Yes, skip' }).click()
  await expect(page.getByRole('heading', { name: 'ball', exact: true })).toBeVisible()
  await expect(page.locator('.skip-word-status')).toContainText('apple · Learned')
  const snapshot = await stored(page)
  expect(snapshot.words['ogden-apple']).toEqual({ teaching: 'completed', reviewStep: 0, lastReviewedOn: null, nextReviewOn: addDays(localDay(), 1) })
  expect(snapshot.session).toMatchObject({ index: 1, completed: 1, question: 'card', phase: 'active' })
})

test('five-word lesson, whole-answer retry, focus, refresh resume and result', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await start(page)
  const entries = [['apple', '苹果'], ['ball', '球'], ['cat', '猫'], ['dog', '狗'], ['book', '书']]
  for (let index = 0; index < entries.length; index++) {
    const [word, meaning] = entries[index]
    await expect(page.getByRole('heading', { name: word, exact: true })).toBeVisible()
    await prepareSpell(page, meaning)
    const input = page.getByRole('textbox', { name: 'Type the word you hear' })
    await expect(input).toBeFocused()
    if (!index) {
      expect(await page.locator('main:visible').innerText()).not.toContain('apple')
      await input.pressSequentially('ap')
      await page.reload()
      await hear(page)
      await expect(input).toHaveValue('ap')
      await input.pressSequentially('x')
      await input.press('Enter')
      await expect(input).toHaveValue('apx')
      await expect(page.getByText('Try again', { exact: true })).toBeVisible()
      await expect(input).toBeFocused()
      await page.reload()
      await hear(page)
      expect((await stored(page)).session.flags.spell.error).toBe(true)
      await input.fill('a')
      await input.press('Backspace')
      await expect(input).toHaveValue('')
    }
    await input.pressSequentially(word.toUpperCase())
    await input.press('Enter')
    await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Read a sentence.' })).toBeVisible()
    await page.getByRole('button', { name: index === 4 ? 'Finish' : 'Next word', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'All done!' })).toBeVisible()
  await expect(page.getByText('You practised 5 words.')).toBeVisible()
  const snapshot = await stored(page)
  expect(Object.keys(snapshot.words)).toHaveLength(5)
  expect(snapshot.session.retry).toBe(1)
  expect(snapshot.words['ogden-apple'].nextReviewOn).toBe(addDays(localDay(), 1))
  await page.getByRole('button', { name: 'Done for today' }).click()
  expect((await stored(page)).session).toBeNull()
  expect(errors).toEqual([])
})

test('natural whole-word editing keeps wrong text and accepts replacement input', async ({ page }) => {
  await start(page)
  await prepareSpell(page)
  const input = page.getByRole('textbox', { name: 'Type the word you hear' })
  await input.fill('apxle')
  await input.press('Enter')
  await expect(input).toHaveValue('apxle')
  await expect(page.getByText('Try again', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0)
  await input.fill('APPLE')
  await input.press('Enter')
  await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Read a sentence.' })).toBeVisible()
})

test('failed audio blocks listening answers and supports retry', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: 'Try it', exact: true }).click()
  // WebKit's platform media loader bypasses Playwright request interception.
  // Reject play() at the media boundary to exercise the same failure UI in all engines.
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () { return this.src.endsWith('apple-word.mp3') ? Promise.reject(new DOMException('Media unavailable', 'NotSupportedError')) : original.call(this) }
    ;(window as typeof window & { restoreAudio?: () => void }).restoreAudio = () => { HTMLMediaElement.prototype.play = original }
  })
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What do you hear?' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Sound is unavailable')
  await expect(page.getByRole('button', { name: '苹果', exact: true })).toBeDisabled()
  await page.evaluate(() => (window as typeof window & { restoreAudio?: () => void }).restoreAudio?.())
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await hear(page)
  await expect(page.getByRole('button', { name: '苹果', exact: true })).toBeEnabled()
})

test('sentence rows play with click and keyboard, while each quiz row is one action', async ({ page }) => {
  const initial = freshState()
  initial.settings.onboardingSeen = true
  initial.settings.spokenGuidance = false
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: STORAGE_KEY, state: initial })
  await page.goto('./')
  await page.getByRole('button', { name: '开始学单词', exact: true }).click()
  const sentence = page.getByRole('button', { name: 'Play sentence: This is an apple.', exact: true })
  const text = sentence.locator('.english-sentence')
  await expect(text).toHaveCSS('font-weight', '400')
  await expect(page.getByText('听句子', { exact: true })).toHaveCount(0)
  for (const activation of ['click', 'Enter', 'Space']) {
    if (activation === 'click') await sentence.click()
    else { await sentence.focus(); await sentence.press(activation) }
    await expect(sentence).toHaveClass(/playing/)
    await expect(text).toHaveText('This is an apple.')
    await expect(sentence).not.toHaveClass(/playing/)
    expect((await stored(page)).session.question).toBe('card')
  }
  await page.getByRole('button', { name: 'Try it', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What does apple mean?' })).toHaveCSS('font-weight', '400')
  await expect(page.getByRole('button', { name: /^Play meaning:/ })).toHaveCount(0)
  await expect(page.locator('.choice-row')).toHaveCount(3)
  await expect(page.locator('.choice-row button')).toHaveCount(0)
  expect((await stored(page)).session.flags.read.done).toBe(false)
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
})

test('wordbook practice preserves the formal session and marks current review hints', async ({ page }) => {
  const state = freshState()
  state.settings.onboardingSeen = true
  state.settings.spokenGuidance = false
  state.words['ogden-apple'] = { teaching: 'completed', reviewStep: 2, lastReviewedOn: addDays(localDay(), -7), nextReviewOn: localDay() }
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)) }, { key: STORAGE_KEY, state })
  await page.goto('./')
  await page.getByRole('button', { name: '复习一下', exact: true }).click()
  await hear(page)
  await page.getByRole('textbox').pressSequentially('ap')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('link', { name: 'Wordbook' }).click()
  await page.getByRole('searchbox').fill('apple')
  await expect(page.locator('.word-row')).toContainText('正在复习的词')
  await expect(page.locator('.word-row')).not.toContainText('苹果')
  await page.locator('.word-row').click()
  let snapshot = await stored(page)
  expect(snapshot.session.flags.spell.hint).toBe(true)
  expect(snapshot.session.input).toBe('')
  await page.getByRole('button', { name: '练练这个词' }).click()
  await prepareSpell(page)
  await page.getByRole('textbox').pressSequentially('apple')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByRole('heading', { name: 'Read a sentence.' })).toBeVisible()
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await page.getByRole('button', { name: 'Back to word', exact: true }).click()
  snapshot = await stored(page)
  expect(snapshot.words).toEqual(state.words)
  expect(snapshot.session.mode).toBe('review')
  await page.getByRole('link', { name: '继续正在学的内容' }).click()
  await expect(page.getByRole('heading', { name: 'Listen and spell.' })).toBeVisible()
})

test('parent has one export action with 850 UTF-8 rows', async ({ page }) => {
  await page.goto('./#/parent')
  await expect(page.getByRole('heading', { name: '家长设置' })).toBeVisible()
  await expect(page.getByRole('button', { name: /导出/ })).toHaveCount(1)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出学习记录', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^little-english-progress-\d{8}-\d{6}\.tsv$/)
  const bytes = await readFile((await download.path())!)
  expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191])
  const text = bytes.toString('utf8')
  expect(text.trimEnd().split('\r\n')).toHaveLength(851)
  expect(text).toContain('最近复习判定日')
  expect(text).toContain('\togden-apple\tapple\t1\t未开始\t0\t\t')
  await expect(page.locator('.export-status')).toContainText('已发起下载')
})

test('completed review spelling survives a wordbook visit and reload', async ({ page }) => {
  const initial = freshState()
  initial.settings.onboardingSeen = true
  initial.settings.spokenGuidance = false
  initial.words['ogden-apple'] = { teaching: 'completed', reviewStep: 1, lastReviewedOn: '2026-01-01', nextReviewOn: '2026-01-04' }
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
  }, { key: STORAGE_KEY, state: initial })
  await page.goto('./')
  await page.getByRole('button', { name: '复习一下', exact: true }).click()
  await hear(page)
  await page.getByRole('textbox').pressSequentially('apple')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('link', { name: 'Wordbook', exact: true }).click()
  await page.getByRole('searchbox').fill('apple')
  await page.locator('.word-row').click()
  await expect(page.getByRole('heading', { name: 'apple', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'apple', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '继续正在学的内容' }).click()
  await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
  await hear(page)
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What does apple mean?' })).toBeVisible()
  await page.getByRole('button', { name: '苹果', exact: true }).click()
  const saved = await stored(page)
  expect(saved.words['ogden-apple'].reviewStep).toBe(0)
  expect(saved.words['ogden-apple'].nextReviewOn).toBe(addDays(localDay(), 1))
  expect(saved.session.retry).toBe(1)
})

test('damaged storage remains intact and the application blocks overwrites', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), STORAGE_KEY)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '学习记录暂时无法读取' })).toBeVisible()
  await page.getByRole('button', { name: '重试读取' }).click()
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{broken')
})

test('a second tab blocks stale editing and reloads the current exercise', async ({ page, context }) => {
  await page.goto('./')
  const second = await context.newPage()
  await second.goto('./')
  await expect(second.getByRole('button', { name: '开始学单词', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始学单词', exact: true }).click()
  await expect(second.getByRole('heading', { name: '另一页更新了学习记录' })).toBeVisible()
  await second.getByRole('button', { name: '读取最新进度' }).click()
  await second.getByRole('button', { name: '继续学', exact: true }).click()
  await expect(second.getByRole('heading', { name: 'apple', exact: true })).toBeVisible()
})
