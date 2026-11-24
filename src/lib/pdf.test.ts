import { describe, expect, it } from 'vitest'
import { mmToPt, pageFor } from './pdf'

describe('pageFor', () => {
  it('uses portrait A4 for tall images and landscape for wide ones in auto mode', () => {
    expect(pageFor({ width: 1000, height: 1400 }, { pageSize: 'a4', orientation: 'auto', margin: 0 })).toEqual([595.28, 841.89])
    expect(pageFor({ width: 1400, height: 1000 }, { pageSize: 'a4', orientation: 'auto', margin: 0 })).toEqual([841.89, 595.28])
  })

  it('honours a forced orientation', () => {
    expect(pageFor({ width: 1400, height: 1000 }, { pageSize: 'letter', orientation: 'portrait', margin: 0 })).toEqual([612, 792])
  })

  it('sizes "fit" pages to the image aspect ratio plus margins', () => {
    const [w, h] = pageFor({ width: 1000, height: 500 }, { pageSize: 'fit', orientation: 'auto', margin: 20 })
    expect(w).toBeCloseTo(595.28)
    expect(h).toBeCloseTo((595.28 - 40) / 2 + 40)
  })

  it('converts millimetres to points', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72)
    expect(mmToPt(210)).toBeCloseTo(595.28, 1)
  })
})
