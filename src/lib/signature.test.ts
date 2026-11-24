import { describe, expect, it } from 'vitest'
import { cleanSignature, flattenLighting, inkBounds, otsuThreshold, toGray } from './signature'

/** 10×10 light-grey "paper" with a dark 3×2 stroke at (4,5). */
function sample() {
  const w = 10
  const h = 10
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) rgba.set([220, 215, 205, 255], i * 4)
  for (let y = 5; y < 7; y++) for (let x = 4; x < 7; x++) rgba.set([30, 30, 60, 255], (y * w + x) * 4)
  return { w, h, rgba }
}

describe('signature cleanup', () => {
  it('finds a threshold between ink and paper', () => {
    const { rgba } = sample()
    const t = otsuThreshold(toGray(rgba))
    expect(t).toBeGreaterThan(40)
    expect(t).toBeLessThan(210)
  })

  it('treats transparent pixels as paper', () => {
    expect(toGray(new Uint8ClampedArray([0, 0, 0, 0]))[0]).toBe(255)
  })

  it('locates the ink with padding', () => {
    const { w, h, rgba } = sample()
    const gray = toGray(rgba)
    expect(inkBounds(gray, w, h, otsuThreshold(gray), 1)).toEqual({ x: 3, y: 4, width: 5, height: 4 })
    expect(inkBounds(new Uint8Array(100).fill(255), 10, 10, 128)).toBeNull()
  })

  it('whitens the paper and recolours the ink', () => {
    const { w, rgba } = sample()
    const gray = toGray(rgba)
    const out = cleanSignature(rgba, gray, { threshold: otsuThreshold(gray), softness: 1, ink: [0, 0, 128], transparent: false })
    expect(Array.from(out.slice(0, 4))).toEqual([255, 255, 255, 255])
    const ink = (5 * w + 4) * 4
    expect(Array.from(out.slice(ink, ink + 4))).toEqual([0, 0, 128, 255])
  })

  it('can make the paper transparent', () => {
    const { rgba } = sample()
    const gray = toGray(rgba)
    const out = cleanSignature(rgba, gray, { threshold: otsuThreshold(gray), softness: 1, ink: 'original', transparent: true })
    expect(out[3]).toBe(0)
  })
})

describe('inkBounds noise filtering', () => {
  it('ignores isolated specks when a minimum count is set', () => {
    const w = 20
    const gray = new Uint8Array(w * w).fill(255)
    // a 6-pixel-wide stroke on rows 8–10 and a single speck at (19, 0)
    for (let y = 8; y <= 10; y++) for (let x = 5; x <= 10; x++) gray[y * w + x] = 0
    gray[19] = 0
    expect(inkBounds(gray, w, w, 128)).toEqual({ x: 5, y: 0, width: 15, height: 11 })
    expect(inkBounds(gray, w, w, 128, 0, 2)).toEqual({ x: 5, y: 8, width: 6, height: 3 })
  })
})

describe('flattenLighting', () => {
  it('lifts shadowed paper to white while keeping ink dark', () => {
    const gray = Uint8Array.from([120, 40, 240])
    const bg = Uint8Array.from([120, 120, 240])
    expect(Array.from(flattenLighting(gray, bg))).toEqual([255, 85, 255])
  })
})
