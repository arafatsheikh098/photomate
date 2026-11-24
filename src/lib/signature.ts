import type { Rect } from './geometry'

/** Rec. 601 luma of each pixel in an RGBA buffer. */
export function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4)
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    // Treat transparent pixels as white paper.
    const a = rgba[i + 3] / 255
    const y = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
    out[p] = Math.round(y * a + 255 * (1 - a))
  }
  return out
}

/** Otsu's method: the threshold that best separates ink from paper in the histogram. */
export function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0)
  for (const v of gray) hist[v]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]

  let sumB = 0
  let weightB = 0
  let best = -1
  let first = 127
  let last = 127
  for (let t = 0; t < 256; t++) {
    weightB += hist[t]
    if (weightB === 0) continue
    const weightF = total - weightB
    if (weightF === 0) break
    sumB += t * hist[t]
    const meanB = sumB / weightB
    const meanF = (sum - sumB) / weightF
    const between = weightB * weightF * (meanB - meanF) ** 2
    if (between > best * (1 + 1e-9)) {
      best = between
      first = last = t
    } else if (between >= best * (1 - 1e-9)) {
      last = t
    }
  }
  // Empty bins between ink and paper all score the same; take the middle of that plateau
  // so the cut sits between the two tones rather than right on the ink.
  return Math.round((first + last) / 2)
}

/**
 * Bounding box of the ink, padded and clamped. Rows and columns with fewer than
 * `minCount` ink pixels are ignored so stray specks of dust do not stretch the box.
 */
export function inkBounds(
  gray: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  pad = 0,
  minCount = 1,
): Rect | null {
  const cols = new Uint32Array(width)
  const rows = new Uint32Array(height)
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (gray[row + x] <= threshold) {
        cols[x]++
        rows[y]++
      }
    }
  }
  const first = (a: Uint32Array) => a.findIndex((n) => n >= minCount)
  const last = (a: Uint32Array) => a.findLastIndex((n) => n >= minCount)
  const minX = first(cols)
  const minY = first(rows)
  if (minX < 0 || minY < 0) return null
  const maxX = last(cols)
  const maxY = last(rows)
  const x = Math.max(0, minX - pad)
  const y = Math.max(0, minY - pad)
  return {
    x,
    y,
    width: Math.min(width, maxX + pad + 1) - x,
    height: Math.min(height, maxY + pad + 1) - y,
  }
}

/**
 * Evens out shadows and uneven lighting by dividing each pixel by a blurred copy of the page.
 * Paper becomes ~255 everywhere while ink stays dark relative to its surroundings.
 */
export function flattenLighting(gray: Uint8Array, background: Uint8Array): Uint8Array {
  const out = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) {
    out[i] = Math.min(255, Math.round((gray[i] * 255) / Math.max(background[i], 1)))
  }
  return out
}

export interface InkOptions {
  threshold: number
  /** Softens the cut-off over this many grey levels so strokes keep smooth edges. */
  softness: number
  ink: [number, number, number] | 'original'
  transparent: boolean
}

/**
 * Turns a photo of a signature into clean ink on white (or transparent) paper.
 * Pixels lighter than the threshold become paper; darker ones become ink, with
 * a linear ramp of width `softness` for anti-aliasing.
 */
export function cleanSignature(rgba: Uint8ClampedArray, gray: Uint8Array, opts: InkOptions): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length)
  const soft = Math.max(1, opts.softness)
  const lo = opts.threshold - soft
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const g = gray[p]
    // coverage: 1 = full ink, 0 = paper
    const coverage = g <= lo ? 1 : g >= opts.threshold ? 0 : (opts.threshold - g) / soft
    const [r, gr, b] = opts.ink === 'original' ? [rgba[i], rgba[i + 1], rgba[i + 2]] : opts.ink
    if (opts.transparent) {
      out[i] = r
      out[i + 1] = gr
      out[i + 2] = b
      out[i + 3] = Math.round(coverage * 255)
    } else {
      out[i] = Math.round(r * coverage + 255 * (1 - coverage))
      out[i + 1] = Math.round(gr * coverage + 255 * (1 - coverage))
      out[i + 2] = Math.round(b * coverage + 255 * (1 - coverage))
      out[i + 3] = 255
    }
  }
  return out
}
