/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/chobi/ on GitHub Pages.
// Override with BASE=/ for a custom domain or root deployment.
const base = process.env.BASE ?? '/chobi/'

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
      name: 'chobi-version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId }) })
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
        name: 'Chobi — Image Toolkit',
        short_name: 'Chobi',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Background removal runs on the WASM backend only, so the WebGPU build is never loaded.
        globIgnores: ['**/ort.webgpu*'],
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
