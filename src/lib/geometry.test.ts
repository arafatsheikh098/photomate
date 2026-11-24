import { describe, expect, it } from 'vitest'
import { computeResize, fitWithin, mmToPx, placeImage, pxToMm, rotatedBounds } from './geometry'

const src = { width: 4000, height: 3000 }

describe('computeResize', () => {
  it('derives the missing side when the aspect ratio is locked', () => {
    expect(computeResize(src, { mode: 'pixels', width: 800, keepAspect: true })).toEqual({ width: 800, height: 600 })
    expect(computeResize(src, { mode: 'pixels', height: 300, keepAspect: true })).toEqual({ width: 400, height: 300 })
  })

  it('fits inside a box when both sides are given with the aspect locked', () => {
    expect(computeResize(src, { mode: 'pixels', width: 1000, height: 1000, keepAspect: true })).toEqual({
      width: 1000,
      height: 750,
    })
  })

  it('stretches to exact dimensions when unlocked', () => {
    expect(computeResize(src, { mode: 'pixels', width: 300, height: 300, keepAspect: false })).toEqual({
      width: 300,
      height: 300,
    })
    expect(computeResize(src, { mode: 'pixels', width: 300, keepAspect: false })).toEqual({ width: 300, height: 3000 })
  })

  it('returns the original size when nothing is specified', () => {
    expect(computeResize(src, { mode: 'pixels', keepAspect: true })).toEqual(src)
  })

  it('handles percent and longest-side modes', () => {
    expect(computeResize(src, { mode: 'percent', percent: 25 })).toEqual({ width: 1000, height: 750 })
    expect(computeResize({ width: 3000, height: 4000 }, { mode: 'longest', size: 1600 })).toEqual({
      width: 1200,
      height: 1600,
    })
  })

  it('never returns a zero dimension', () => {
    expect(computeResize({ width: 1000, height: 10 }, { mode: 'percent', percent: 1 })).toEqual({ width: 10, height: 1 })
  })
})

describe('placeImage', () => {
  it('letterboxes with contain', () => {
    const { dest } = placeImage({ width: 200, height: 100 }, { width: 100, height: 100 }, 'contain')
    expect(dest).toEqual({ x: 0, y: 25, width: 100, height: 50 })
  })

  it('crops the centre with cover', () => {
    const { source, dest } = placeImage({ width: 200, height: 100 }, { width: 100, height: 100 }, 'cover')
    expect(source).toEqual({ x: 50, y: 0, width: 100, height: 100 })
    expect(dest).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })
})

describe('units and rotation', () => {
  it('converts millimetres at a DPI', () => {
    expect(mmToPx(35, 300)).toBe(413)
    expect(mmToPx(45, 300)).toBe(531)
    expect(mmToPx(50.8, 300)).toBe(600)
    expect(pxToMm(600, 300)).toBeCloseTo(50.8)
  })

  it('computes rotated bounds', () => {
    expect(rotatedBounds({ width: 400, height: 300 }, 90)).toEqual({ width: 300, height: 400 })
    expect(rotatedBounds({ width: 100, height: 100 }, 45)).toEqual({ width: 141, height: 141 })
  })
})

describe('fitWithin', () => {
  it('leaves images inside the budget alone', () => {
    expect(fitWithin({ width: 3000, height: 4000 }, 16_777_216)).toEqual({ width: 3000, height: 4000 })
  })

  it('shrinks a 48 MP photo under the iOS canvas limit, keeping the ratio', () => {
    const r = fitWithin({ width: 6000, height: 8000 }, 16_777_216)
    expect(r.width * r.height).toBeLessThanOrEqual(16_777_216)
    expect(r.width / r.height).toBeCloseTo(0.75, 2)
  })

  it('applies a longest-side cap', () => {
    expect(fitWithin({ width: 4000, height: 6000 }, Infinity, 2400)).toEqual({ width: 1600, height: 2400 })
  })
})
