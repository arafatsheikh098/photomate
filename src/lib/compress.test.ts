import { describe, expect, it } from 'vitest'
import { encodeToTarget, type Encoder } from './compress'

/** A fake encoder whose size grows with quality and pixel count, like a real JPEG. */
function fakeEncoder(baseBytes: number): Encoder & { calls: [number, number][] } {
  const calls: [number, number][] = []
  const fn = (async (q: number, s: number) => {
    calls.push([q, s])
    const size = Math.round(baseBytes * s * s * (0.1 + q))
    return new Blob([new Uint8Array(size)])
  }) as Encoder & { calls: [number, number][] }
  fn.calls = calls
  return fn
}

describe('encodeToTarget', () => {
  it('returns max quality straight away when it already fits', async () => {
    const enc = fakeEncoder(10_000)
    const r = await encodeToTarget(enc, 50_000, { lossy: true, allowResize: true })
    expect(r.fits).toBe(true)
    expect(r.quality).toBeCloseTo(0.92)
    expect(r.attempts).toBe(1)
  })

  it('binary-searches quality to land just under the target', async () => {
    const enc = fakeEncoder(200_000)
    const target = 100 * 1024
    const r = await encodeToTarget(enc, target, { lossy: true, allowResize: false })
    expect(r.fits).toBe(true)
    expect(r.scale).toBe(1)
    expect(r.blob.size).toBeLessThanOrEqual(target)
    // the ideal quality is target/base - 0.1 ≈ 0.412; the search should get close
    expect(r.quality).toBeGreaterThan(0.38)
    expect(r.quality).toBeLessThan(0.42)
  })

  it('shrinks the image when quality alone is not enough', async () => {
    const enc = fakeEncoder(5_000_000)
    const target = 100 * 1024
    const r = await encodeToTarget(enc, target, { lossy: true, allowResize: true })
    expect(r.fits).toBe(true)
    expect(r.scale).toBeLessThan(1)
    expect(r.blob.size).toBeLessThanOrEqual(target)
  })

  it('reports failure when dimensions are fixed and the target is impossible', async () => {
    const enc = fakeEncoder(5_000_000)
    const r = await encodeToTarget(enc, 10_000, { lossy: true, allowResize: false })
    expect(r.fits).toBe(false)
    expect(r.scale).toBe(1)
  })

  it('only resizes lossless formats', async () => {
    const enc = fakeEncoder(1_000_000)
    const r = await encodeToTarget(enc, 200_000, { lossy: false, allowResize: true })
    expect(r.fits).toBe(true)
    expect(enc.calls.every(([q]) => q === 1)).toBe(true)
    expect(r.scale).toBeLessThan(1)
  })
})
