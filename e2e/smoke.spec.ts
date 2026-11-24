import { expect, test } from '@playwright/test'
import { collectErrors, expectNoErrors } from './helpers'

test('home lists every tool and each page opens', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('private by design')
  const cards = page.getByRole('region', { name: 'Tools' }).getByRole('link')
  await expect(cards).toHaveCount(8)

  for (const name of ['Compress', 'Resize', 'Convert', 'Passport photo', 'Remove background', 'Crop & rotate', 'Signature', 'Images to PDF']) {
    await page.goto('./')
    await page.getByRole('region', { name: 'Tools' }).getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(page.getByRole('button', { name: /Choose/ })).toBeVisible()
  }
  await expectNoErrors(page, errors)
})

test('search filters tools', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('searchbox').fill('passport')
  await expect(page.getByRole('region', { name: 'Tools' }).getByRole('link')).toHaveCount(1)
})

test('theme toggle persists', async ({ page }) => {
  await page.goto('./')
  const html = page.locator('html')
  const wasDark = (await html.getAttribute('class'))?.includes('dark') ?? false
  await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click()
  await page.reload()
  await expect(html).toHaveClass(wasDark ? /^(?!.*dark)/ : /dark/)
})
