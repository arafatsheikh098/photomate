/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/chobi/ on GitHub Pages.
// Override with BASE=/ for a custom domain or root deployment.
const base = process.env.BASE ?? '/chobi/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
