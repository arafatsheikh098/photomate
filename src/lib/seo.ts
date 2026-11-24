export interface PageMeta {
  title: string
  description: string
  /** Absolute URL of the page. */
  url: string
  image: string
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Rewrites the title, description, canonical and social tags of the built index.html for
 * one page. Used at build time to give each tool its own crawlable HTML file.
 */
export function withPageMeta(html: string, meta: PageMeta, opts: { noindex?: boolean } = {}): string {
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(meta.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PhotoMate" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.url)}" />`,
    `<meta property="og:image" content="${esc(meta.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(opts.noindex ? ['<meta name="robots" content="noindex" />'] : []),
  ].join('\n    ')
  const start = html.indexOf('<!--seo-->')
  const end = html.indexOf('<!--/seo-->')
  if (start < 0 || end < 0) throw new Error('index.html is missing the <!--seo--> markers')
  return `${html.slice(0, start)}<!--seo-->\n    ${tags}\n    ${html.slice(end)}`
}

export function sitemap(urls: string[]): string {
  const items = urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`
}
