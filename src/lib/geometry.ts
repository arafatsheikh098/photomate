export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type ResizeSpec =
  | { mode: 'pixels'; width?: number; height?: number; keepAspect: boolean }
  | { mode: 'percent'; percent: number }
  | { mode: 'longest'; size: number }

const clampDim = (n: number) => Math.max(1, Math.round(n))

/**
 * Works out the output size for a resize request.
 * In pixel mode with the aspect locked, a single dimension derives the other and
 * two dimensions act as a bounding box the image is fitted inside.
 */
export function computeResize(src: Size, spec: ResizeSpec): Size {
  const { width: w, height: h } = src
  switch (spec.mode) {
    case 'percent': {
      const f = Math.max(spec.percent, 0.1) / 100
      return { width: clampDim(w * f), height: clampDim(h * f) }
    }
    case 'longest': {
      const f = spec.size / Math.max(w, h)
      return { width: clampDim(w * f), height: clampDim(h * f) }
    }
    case 'pixels': {
      const tw = spec.width && spec.width > 0 ? spec.width : undefined
      const th = spec.height && spec.height > 0 ? spec.height : undefined
      if (!tw && !th) return { width: w, height: h }
      if (!spec.keepAspect) return { width: clampDim(tw ?? w), height: clampDim(th ?? h) }
      if (tw && th) {
        const f = Math.min(tw / w, th / h)
        return { width: clampDim(w * f), height: clampDim(h * f) }
      }
      if (tw) return { width: clampDim(tw), height: clampDim((h * tw) / w) }
      return { width: clampDim((w * th!) / h), height: clampDim(th!) }
    }
  }
}

export type FitMode = 'stretch' | 'contain' | 'cover'

/**
 * Where to draw a `src`-sized image on a `dst`-sized canvas.
 * Returns the source crop and destination rectangle for drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh).
 */
export function placeImage(src: Size, dst: Size, fit: FitMode): { source: Rect; dest: Rect } {
  const full: Rect = { x: 0, y: 0, width: src.width, height: src.height }
  if (fit === 'stretch') {
    return { source: full, dest: { x: 0, y: 0, width: dst.width, height: dst.height } }
  }
  if (fit === 'contain') {
    const f = Math.min(dst.width / src.width, dst.height / src.height)
    const width = src.width * f
    const height = src.height * f
    return {
      source: full,
      dest: { x: (dst.width - width) / 2, y: (dst.height - height) / 2, width, height },
    }
  }
  // cover: crop the source centrally to the destination aspect ratio
  const dstAspect = dst.width / dst.height
  const srcAspect = src.width / src.height
  let sw = src.width
  let sh = src.height
  if (srcAspect > dstAspect) sw = src.height * dstAspect
  else sh = src.width / dstAspect
  return {
    source: { x: (src.width - sw) / 2, y: (src.height - sh) / 2, width: sw, height: sh },
    dest: { x: 0, y: 0, width: dst.width, height: dst.height },
  }
}

/** Bounding box of a rectangle after rotating it by `deg` degrees. */
export function rotatedBounds(size: Size, deg: number): Size {
  const r = (deg * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return {
    width: Math.round(size.width * c + size.height * s),
    height: Math.round(size.width * s + size.height * c),
  }
}

/**
 * Largest size with the same aspect ratio that stays within a pixel budget and an
 * optional longest-side cap. Never upscales.
 */
export function fitWithin(size: Size, maxPixels: number, maxSide = Infinity): Size {
  const byArea = Math.sqrt(maxPixels / (size.width * size.height))
  const bySide = maxSide / Math.max(size.width, size.height)
  const f = Math.min(1, byArea, bySide)
  if (f >= 1) return { width: size.width, height: size.height }
  // floor so rounding can never push the result back over the budget
  return { width: Math.max(1, Math.floor(size.width * f)), height: Math.max(1, Math.floor(size.height * f)) }
}

export const MM_PER_INCH = 25.4

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi)
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH
}
