import { expect, test } from '@playwright/test'
import { TOOL_META } from '../src/tools/meta'
import { collectErrors, expectNoErrors } from './helpers'

test('home lists every tool and each page opens', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('passport photo maker')
  const cards = page.getByRole('region', { name: 'Tools' }).getByRole('link')
  await expect(cards).toHaveCount(8)

  for (const t of TOOL_META) {
    await page.goto('./')
    await page.getByRole('region', { name: 'Tools' }).getByRole('link', { name: t.name }).click()
    await expect(page).toHaveURL(new RegExp(`/photomate/${t.slug}/$`))
    await expect(page.getByRole('heading', { level: 1, name: t.heading })).toBeVisible()
    await expect(page.getByRole('button', { name: /Choose/ })).toBeVisible()
    await expect(page).toHaveTitle(`${t.title} | PhotoMate`)
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

test('each tool has its own crawlable page with its own title and description', async ({ request }) => {
  for (const t of TOOL_META) {
    const res = await request.get(`./${t.slug}/`)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain(`<title>${t.title.replace(/&/g, '&amp;')} | PhotoMate</title>`)
    expect(html).toContain(`<link rel="canonical" href="https://arafatsheikh098.github.io/photomate/${t.slug}/" />`)
  }
  const sitemap = await (await request.get('./sitemap.xml')).text()
  expect(sitemap.match(/<loc>/g)).toHaveLength(TOOL_META.length + 1)
  expect(await (await request.get('./robots.txt')).text()).toContain('Sitemap: https://arafatsheikh098.github.io/photomate/sitemap.xml')
})

test('opening a tool URL directly works', async ({ page }) => {
  await page.goto('./passport-photo/')
  await expect(page.getByRole('heading', { level: 1, name: 'Passport size photo maker' })).toBeVisible()
})
