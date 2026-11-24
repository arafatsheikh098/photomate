/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { sitemap, withPageMeta } from './src/lib/seo.ts'
import { APP_NAME, HOME_DESCRIPTION, HOME_TITLE, TOOL_META } from './src/tools/meta.ts'

// Served from https://<user>.github.io/photomate/ on GitHub Pages.
// Override with BASE=/ for a custom domain or root deployment.
const base = process.env.BASE ?? '/photomate/'
// Absolute origin for canonical URLs, the sitemap and social previews.
const origin = (process.env.SITE_ORIGIN ?? 'https://arafatsheikh098.github.io').replace(/\/$/, '')
const siteUrl = origin + base

// Short commit + date, shown in the footer so it is obvious which build is running.
const buildId = process.env.BUILD_ID ?? (() => {
  let sha = 'dev'
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    /* not a git checkout */
  }
  return `${sha} · ${new Date().toISOString().slice(0, 10)}`
})()

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    {
      // Lets an open tab ask the network which build is live (see src/pwa.ts).
      name: 'photomate-version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId }) })
      },
    },
    {
      // One real HTML file per tool (e.g. /passport-photo/index.html) with its own title and
      // description, so search engines can index each tool. GitHub Pages serves them as-is.
      name: 'photomate-seo-pages',
      enforce: 'post',
      generateBundle(_, bundle) {
        const index = bundle['index.html']
        if (!index || index.type !== 'asset') return
        const html = String(index.source)
        const image = `${siteUrl}og.png`
        index.source = withPageMeta(html, { title: HOME_TITLE, description: HOME_DESCRIPTION, url: siteUrl, image })
        for (const t of TOOL_META) {
          this.emitFile({
            type: 'asset',
            fileName: `${t.slug}/index.html`,
            source: withPageMeta(html, { title: `${t.title} | ${APP_NAME}`, description: t.description, url: `${siteUrl}${t.slug}/`, image }),
          })
        }
        // Unknown paths still boot the app, which shows its own "not found" page.
        this.emitFile({
          type: 'asset',
          fileName: '404.html',
          source: withPageMeta(html, { title: HOME_TITLE, description: HOME_DESCRIPTION, url: siteUrl, image }, { noindex: true }),
        })
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap([siteUrl, ...TOOL_META.map((t) => `${siteUrl}${t.slug}/`)]) })
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n` })
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/pwa.ts so updates can reload the page safely.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PhotoMate — Image Tools',
        short_name: 'PhotoMate',
        description:
          'Resize, compress, convert, crop, remove backgrounds and make passport photos. Runs entirely in your browser.',
        theme_color: '#0f766e',
        background_color: '#0b1120',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Activate a new version straight away instead of waiting for every tab to close;
        // src/pwa.ts then reloads (or offers to) so the page runs the new code.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Offline, any page of the app boots from the cached shell.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/version\.json$/, /\/sitemap\.xml$/, /\/robots\.txt$/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Background removal runs on the WASM backend only, so the WebGPU build is never loaded.
        globIgnores: ['**/ort.webgpu*', '**/og.png', '404.html'],
        // The background-removal runtime chunk is large; precache it so the tool works offline.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // ONNX runtime + segmentation model, fetched on first use of the background remover.
            urlPattern: /^https:\/\/staticimgly\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bg-removal-model',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
