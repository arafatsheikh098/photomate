import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { collectErrors, downloadBytes, expectNoErrors, imageSize, makeImage, upload } from './helpers'

test.describe('batch tools', () => {
  test('compress hits a 100 KB target', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('./compress-image/')
    const photo = await makeImage(page, 'photo', 2400, 1600)
    expect(photo.length).toBeGreaterThan(400 * 1024)
    await upload(page, [{ name: 'holiday.jpg', buffer: photo }])
    await page.getByRole('button', { name: 'Compress image' }).click()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const download = await dl
    expect(download.suggestedFilename()).toBe('holiday-compressed.jpg')
    const bytes = await downloadBytes(download)
    expect(bytes.length).toBeLessThanOrEqual(100 * 1024)
    expect(bytes.length).toBeGreaterThan(30 * 1024)
    await expectNoErrors(page, errors)
  })

  test('compress keeps fixed dimensions when resizing is off', async ({ page }) => {
    await page.goto('./compress-image/')
    await upload(page, [{ name: 'a.jpg', buffer: await makeImage(page, 'photo', 1200, 800) }])
    await page.getByRole('button', { name: '50 KB' }).click()
    await page.getByText('Reduce dimensions if needed').click()
    await expect(page.getByLabel('Reduce dimensions if needed')).not.toBeChecked()
    await page.getByRole('button', { name: 'Compress image' }).click()
    await expect(page.getByText(/1200×800 → .*1200×800/)).toBeVisible()
  })

  test('resize to a width keeps the aspect ratio and zips batches', async ({ page }) => {
    await page.goto('./resize-image/')
    const a = await makeImage(page, 'photo', 2000, 1000)
    const b = await makeImage(page, 'photo', 1000, 2000)
    await upload(page, [
      { name: 'wide.jpg', buffer: a },
      { name: 'tall.jpg', buffer: b },
    ])
    await page.getByLabel('Width').fill('500')
    await page.getByRole('button', { name: 'Resize 2 images' }).click()
    await expect(page.getByText('500×250', { exact: false })).toBeVisible()
    await expect(page.getByText('500×1000', { exact: false })).toBeVisible()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: /Download all as ZIP/ }).click()
    const zip = await downloadBytes(await dl)
    expect(zip.subarray(0, 2).toString()).toBe('PK')
  })

  test('resize to an exact preset crops to fill', async ({ page }) => {
    await page.goto('./resize-image/')
    await upload(page, [{ name: 'x.jpg', buffer: await makeImage(page, 'photo', 1600, 900) }])
    await page.getByLabel('Preset').selectOption({ label: 'Instagram post 1080×1080' })
    await page.getByRole('button', { name: 'Resize image' }).click()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const bytes = await downloadBytes(await dl)
    expect(await imageSize(page, bytes, 'image/jpeg')).toEqual({ width: 1080, height: 1080 })
  })

  test('convert PNG with transparency to WebP and JPG', async ({ page, browserName }) => {
    await page.goto('./convert-image/')
    await upload(page, [{ name: 'logo.png', buffer: await makeImage(page, 'transparent', 400, 300, 'image/png'), mimeType: 'image/png' }])
    if (browserName === 'webkit') {
      // Safari cannot encode WebP from a canvas; the option must be hidden and explained.
      await expect(page.getByRole('radio', { name: 'WebP' })).toHaveCount(0)
      await expect(page.getByText(/can.t save WebP/)).toBeVisible()
      return
    }
    await page.getByRole('radio', { name: 'WebP' }).click()
    await page.getByRole('button', { name: 'Convert image' }).click()
    let dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    let download = await dl
    expect(download.suggestedFilename()).toBe('logo.webp')
    expect((await downloadBytes(download)).subarray(8, 12).toString()).toBe('WEBP')

    await page.getByRole('radio', { name: 'JPG' }).click()
    await expect(page.getByText('Options changed')).toBeVisible()
    await page.getByRole('button', { name: 'Convert image' }).click()
    dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    download = await dl
    expect(download.suggestedFilename()).toBe('logo.jpg')
    expect((await downloadBytes(download))[0]).toBe(0xff)
  })
})

test('crop to a square', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./crop-image/')
  await upload(page, [{ name: 'c.jpg', buffer: await makeImage(page, 'photo', 1200, 800) }])
  await page.getByLabel('Aspect ratio').selectOption('1')
  await page.getByRole('button', { name: 'Rotate right' }).click()
  const btn = page.getByRole('button', { name: /^Download \d+×\d+$/ })
  await expect(btn).toBeEnabled()
  const label = (await btn.textContent())!
  const [, w, h] = label.match(/(\d+)×(\d+)/)!.map(Number)
  expect(Math.abs(w - h)).toBeLessThanOrEqual(1)
  const dl = page.waitForEvent('download')
  await btn.click()
  const bytes = await downloadBytes(await dl)
  const size = await imageSize(page, bytes, 'image/jpeg')
  expect(Math.abs(size.width - size.height)).toBeLessThanOrEqual(1)
  await expectNoErrors(page, errors)
})

test('passport photo for a BD job form is 300×300 and under 100 KB', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./passport-photo/')
  await upload(page, [{ name: 'me.jpg', buffer: await makeImage(page, 'portrait', 1200, 1600) }])
  await page.getByLabel('Photo size').selectOption('bd-job')
  await expect(page.getByLabel('Max file size (optional)')).toHaveValue('100')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download photo (JPG)' }).click()
  const download = await dl
  const bytes = await downloadBytes(download)
  expect(bytes.length).toBeLessThanOrEqual(100 * 1024)
  expect(await imageSize(page, bytes, 'image/jpeg')).toEqual({ width: 300, height: 300 })
  expect(download.suggestedFilename()).toBe('me-300x300.jpg')
  await expectNoErrors(page, errors)
})

test('passport print sheet as PDF', async ({ page }) => {
  await page.goto('./passport-photo/')
  await upload(page, [{ name: 'me.jpg', buffer: await makeImage(page, 'portrait', 1200, 1600) }])
  await expect(page.getByText('Up to 8 fit on this paper.')).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF', exact: true }).click()
  const pdf = await downloadBytes(await dl)
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
})

test('signature becomes 300×80 under 60 KB', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./signature-resize/')
  await upload(page, [{ name: 'sign.jpg', buffer: await makeImage(page, 'signature', 1600, 900) }])
  await expect(page.getByText('300×80 px', { exact: true })).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JPG' }).click()
  const bytes = await downloadBytes(await dl)
  expect(bytes.length).toBeLessThanOrEqual(60 * 1024)
  expect(await imageSize(page, bytes, 'image/jpeg')).toEqual({ width: 300, height: 80 })
  await expectNoErrors(page, errors)
})

test('images to PDF keeps page order and count', async ({ page }) => {
  await page.goto('./images-to-pdf/')
  await upload(page, [
    { name: '1.jpg', buffer: await makeImage(page, 'photo', 800, 1100) },
    { name: '2.jpg', buffer: await makeImage(page, 'photo', 1100, 800) },
    { name: '3.png', buffer: await makeImage(page, 'transparent', 500, 500, 'image/png'), mimeType: 'image/png' },
  ])
  await page.getByRole('button', { name: 'Move later' }).first().click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Create PDF (3 pages)' }).click()
  const doc = await PDFDocument.load(await downloadBytes(await dl))
  const pages = doc.getPages().map((p) => p.getSize())
  expect(pages).toHaveLength(3)
  // Page 2 (the landscape image, moved first) is landscape A4; the other two are portrait.
  expect(pages[0].width).toBeGreaterThan(pages[0].height)
  expect(pages[1].width).toBeLessThan(pages[1].height)
})
