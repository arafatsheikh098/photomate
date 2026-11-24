import { expect, test } from '@playwright/test'
import { collectErrors, downloadBytes, expectNoErrors, imageSize, makeImage, upload } from './helpers'

// Modern phones shoot 48–200 MP. These used to blank the page; they must just work.
test.describe('very large photos (48 MP)', () => {
  test.setTimeout(120_000)

  test('passport photo', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('./passport-photo/')
    await upload(page, [{ name: 'phone.jpg', buffer: await makeImage(page, 'portrait', 6000, 8000) }])
    await page.getByLabel('Photo size').selectOption('bd-job')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download photo (JPG)' }).click()
    const bytes = await downloadBytes(await dl)
    expect(bytes.length).toBeLessThanOrEqual(100 * 1024)
    expect(await imageSize(page, bytes, 'image/jpeg')).toEqual({ width: 300, height: 300 })
    await expectNoErrors(page, errors)
  })

  test('crop keeps full resolution', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('./crop-image/')
    await upload(page, [{ name: 'phone.jpg', buffer: await makeImage(page, 'portrait', 6000, 8000) }])
    const btn = page.getByRole('button', { name: /^Download \d+×\d+$/ })
    await expect(btn).toBeEnabled()
    const dl = page.waitForEvent('download')
    await btn.click()
    const size = await imageSize(page, await downloadBytes(await dl), 'image/jpeg')
    expect(size.width).toBeGreaterThan(5000)
    await expectNoErrors(page, errors)
  })

  test('compress to 200 KB', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('./compress-image/')
    await upload(page, [{ name: 'phone.jpg', buffer: await makeImage(page, 'portrait', 6000, 8000) }])
    await page.getByRole('button', { name: '200 KB' }).click()
    await page.getByRole('button', { name: 'Compress image' }).click()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    expect((await downloadBytes(await dl)).length).toBeLessThanOrEqual(200 * 1024)
    await expectNoErrors(page, errors)
  })
})
