import { expect, type Download, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

export type Kind = 'photo' | 'portrait' | 'signature' | 'transparent'

/**
 * Draws a test image in the browser and returns its bytes, so no binary fixtures live in the repo.
 * "photo" adds per-pixel noise so it compresses like a real camera shot.
 */
export async function makeImage(page: Page, kind: Kind, width: number, height: number, mime = 'image/jpeg'): Promise<Buffer> {
  const b64 = await page.evaluate(
    async ({ kind, width, height, mime }) => {
      const c = document.createElement('canvas')
      c.width = width
      c.height = height
      const ctx = c.getContext('2d')!
      if (kind === 'photo') {
        const g = ctx.createLinearGradient(0, 0, width, height)
        g.addColorStop(0, '#2b6cb0')
        g.addColorStop(1, '#f6ad55')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)
        const d = ctx.getImageData(0, 0, width, height)
        for (let i = 0; i < d.data.length; i += 4) {
          const n = (Math.random() - 0.5) * 70
          d.data[i] += n
          d.data[i + 1] += n
          d.data[i + 2] += n
        }
        ctx.putImageData(d, 0, 0)
      } else if (kind === 'portrait') {
        ctx.fillStyle = '#8fa9c2'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = '#1f2937'
        ctx.beginPath()
        ctx.ellipse(width / 2, height, width * 0.42, height * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#e0ac69'
        ctx.beginPath()
        ctx.ellipse(width / 2, height * 0.42, width * 0.2, height * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (kind === 'signature') {
        // Paper with a shadow across one corner and a looping pen stroke.
        const g = ctx.createLinearGradient(0, 0, width, height)
        g.addColorStop(0, '#f4f1ea')
        g.addColorStop(1, '#9d988c')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)
        ctx.strokeStyle = '#1d2a6b'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(width * 0.2, height * 0.6)
        for (let x = 0; x <= 1; x += 0.02) {
          ctx.lineTo(width * (0.2 + x * 0.6), height * (0.55 + Math.sin(x * 18) * 0.12 - x * 0.1))
        }
        ctx.stroke()
      } else {
        ctx.fillStyle = '#e53e3e'
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, 0, Math.PI * 2)
        ctx.fill()
      }
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), mime, 0.95))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of bytes) s += String.fromCharCode(b)
      return btoa(s)
    },
    { kind, width, height, mime },
  )
  return Buffer.from(b64, 'base64')
}

export async function upload(page: Page, files: { name: string; buffer: Buffer; mimeType?: string }[]) {
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(files.map((f) => ({ mimeType: f.mimeType ?? 'image/jpeg', ...f })))
}

export async function downloadBytes(download: Download): Promise<Buffer> {
  return readFile((await download.path())!)
}

/** Decodes downloaded image bytes in the page to read back the real dimensions. */
export async function imageSize(page: Page, bytes: Buffer, mime: string) {
  return page.evaluate(
    async ({ b64, mime }) => {
      const bin = atob(b64)
      const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0))
      const bmp = await createImageBitmap(new Blob([arr], { type: mime }))
      return { width: bmp.width, height: bmp.height }
    },
    { b64: bytes.toString('base64'), mime },
  )
}

export async function expectNoErrors(page: Page, errors: string[]) {
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([])
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}
