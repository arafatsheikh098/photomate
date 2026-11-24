/** Encodes the image at a given quality (0–1) and scale (0–1 of the original dimensions). */
export type Encoder = (quality: number, scale: number) => Promise<Blob>

export interface TargetOptions {
  /** PNG and other lossless formats ignore quality, so only resizing can shrink them. */
  lossy: boolean
  /** When false the pixel dimensions are fixed (e.g. a 300×300 form photo). */
  allowResize: boolean
  minQuality?: number
  maxQuality?: number
  /** Binary-search iterations on quality; 7 gets within ~1% of the best quality. */
  steps?: number
  minScale?: number
}

export interface TargetResult {
  blob: Blob
  quality: number
  scale: number
  /** False when even the smallest allowed output is still over the target. */
  fits: boolean
  attempts: number
}

/**
 * Finds the highest-quality encoding that fits under `targetBytes`.
 *
 * Quality is binary-searched first. If the lowest acceptable quality is still too big
 * (and resizing is allowed) the image is scaled down by the square root of the overshoot,
 * since file size grows roughly with pixel count, and the search repeats.
 */
export async function encodeToTarget(
  encode: Encoder,
  targetBytes: number,
  opts: TargetOptions,
): Promise<TargetResult> {
  const maxQ = opts.maxQuality ?? 0.92
  const minQ = opts.minQuality ?? (opts.allowResize ? 0.4 : 0.05)
  const steps = opts.steps ?? 7
  const minScale = opts.minScale ?? 0.05
  let attempts = 0
  const run = async (q: number, s: number) => {
    attempts++
    return encode(q, s)
  }

  let scale = 1
  let last: Blob | undefined
  for (let round = 0; round < 10; round++) {
    if (!opts.lossy) {
      const blob = await run(1, scale)
      last = blob
      if (blob.size <= targetBytes) return { blob, quality: 1, scale, fits: true, attempts }
    } else {
      const top = await run(maxQ, scale)
      if (top.size <= targetBytes) return { blob: top, quality: maxQ, scale, fits: true, attempts }
      const bottom = await run(minQ, scale)
      last = bottom
      if (bottom.size <= targetBytes) {
        let lo = minQ
        let hi = maxQ
        let best = { blob: bottom, quality: minQ }
        for (let i = 0; i < steps; i++) {
          const mid = (lo + hi) / 2
          const blob = await run(mid, scale)
          if (blob.size <= targetBytes) {
            best = { blob, quality: mid }
            lo = mid
          } else {
            hi = mid
          }
        }
        return { ...best, scale, fits: true, attempts }
      }
    }

    if (!opts.allowResize || scale <= minScale) break
    const shrink = Math.sqrt(targetBytes / last.size) * 0.92
    scale = Math.max(minScale, scale * Math.min(shrink, 0.95))
  }

  return { blob: last!, quality: opts.lossy ? minQ : 1, scale, fits: false, attempts }
}
