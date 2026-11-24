import { describe, expect, it } from 'vitest'
import { fitOnPage, layoutSheet } from './layout'

describe('layoutSheet', () => {
  it('fits eight 35×45 mm photos on 4×6 in paper at 300 DPI', () => {
    // 4×6 in = 1200×1800 px; 35×45 mm = 413×531 px
    const l = layoutSheet({ width: 1200, height: 1800 }, { width: 413, height: 531 }, 12, 24)
    expect(l.rotated).toBe(true)
    expect(l.columns * l.rows).toBe(8)
    expect(l.cells).toHaveLength(8)
    for (const c of l.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width).toBeLessThanOrEqual(1200)
      expect(c.y + c.height).toBeLessThanOrEqual(1800)
    }
  })

  it('rotates photos when that fits more', () => {
    const l = layoutSheet({ width: 1000, height: 300 }, { width: 200, height: 400 }, 0, 0)
    expect(l.rotated).toBe(true)
    expect(l.cells).toHaveLength(2)
  })

  it('respects a copy limit and returns nothing when the photo is too big', () => {
    expect(layoutSheet({ width: 1200, height: 1800 }, { width: 400, height: 500 }, 0, 0, 2).cells).toHaveLength(2)
    expect(layoutSheet({ width: 100, height: 100 }, { width: 400, height: 500 }, 0, 0).cells).toHaveLength(0)
  })
})

describe('fitOnPage', () => {
  it('centres an image inside the margins', () => {
    const r = fitOnPage({ width: 1000, height: 500 }, { width: 600, height: 800 }, 50)
    expect(r.width).toBeCloseTo(500)
    expect(r.height).toBeCloseTo(250)
    expect(r.x).toBeCloseTo(50)
    expect(r.y).toBeCloseTo(275)
  })
})
