import { isLossy, supportsAlpha, type OutputMime } from './format'
import { fitWithin, placeImage, rotatedBounds, type FitMode, type Rect, type Size } from './geometry'

export type Drawable = ImageBitmap | HTMLCanvasElement | HTMLImageElement

/**
 * Canvas area browsers will actually allocate. iOS/iPadOS WebKit refuses anything over
 * 16.7 MP; desktop and Android allow far more, but very large canvases still risk running
 * out of memory, so they get a generous but finite budget.
 */
export const MAX_CANVAS_PIXELS = (() => {
  if (typeof navigator === 'undefined') return 16_777_216
  const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios ? 16_777_216 : 100_000_000
})()

export class ImageLoadError extends Error {}

/** Dimensions of the file before loadImage scaled it down, if it did. */
const originalSizes = new WeakMap<ImageBitmap, Size>()

export function originalSizeOf(img: ImageBitmap): Size {
  return originalSizes.get(img) ?? { width: img.width, height: img.height }
}

/**
 * Decodes a file, applying its EXIF orientation so phone photos come out upright.
 * Photos larger than the browser's canvas limit (or `maxSide`) are scaled down here, once,
 * so every tool can work with them; 48–200 MP phone shots would otherwise fail.
 */
export async function loadImage(file: Blob, opts: { maxSide?: number } = {}): Promise<ImageBitmap> {
  let full: ImageBitmap
  try {
    full = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const isHeic = /hei[cf]/i.test(file.type) || (file instanceof File && /\.hei[cf]$/i.test(file.name))
    throw new ImageLoadError(
      isHeic
        ? 'HEIC photos can only be opened in Safari. On iPhone, set Camera → Formats → Most Compatible, or share the photo as JPG.'
        : 'This file could not be read as an image.',
    )
  }
  const target = fitWithin(full, MAX_CANVAS_PIXELS, opts.maxSide)
  if (target.width === full.width && target.height === full.height) return full
  try {
    let small: ImageBitmap | undefined
    try {
      small = await createImageBitmap(full, { resizeWidth: target.width, resizeHeight: target.height, resizeQuality: 'high' })
    } catch {
      /* resize options unsupported */
    }
    // Older Safari ignores the resize options and hands back a full-size bitmap.
    if (!small || small.width !== target.width || small.height !== target.height) {
      small?.close()
      const c = createCanvas(target.width, target.height)
      context2d(c).drawImage(full, 0, 0, target.width, target.height)
      small = await createImageBitmap(c)
    }
    originalSizes.set(small, { width: full.width, height: full.height })
    return small
  } finally {
    full.close()
  }
}

export function sizeOf(img: Drawable): Size {
  if (img instanceof HTMLImageElement) return { width: img.naturalWidth, height: img.naturalHeight }
  return { width: img.width, height: img.height }
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error(`Output of ${width}×${height} px is larger than browsers can handle. Choose a smaller size.`)
  }
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  return c
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return ctx
}

/**
 * Downscales in halving steps before the final draw. A single large reduction with
 * drawImage skips source pixels and looks jagged; stepping keeps it smooth.
 */
function stepDown(img: Drawable, source: Rect, target: Size): { img: Drawable; source: Rect } {
  let current: Drawable = img
  let src = source
  while (src.width / 2 >= target.width && src.height / 2 >= target.height) {
    const w = Math.round(src.width / 2)
    const h = Math.round(src.height / 2)
    const c = createCanvas(w, h)
    context2d(c).drawImage(current, src.x, src.y, src.width, src.height, 0, 0, w, h)
    current = c
    src = { x: 0, y: 0, width: w, height: h }
  }
  return { img: current, source: src }
}

export interface RenderOptions {
  size: Size
  fit?: FitMode
  /** Fill colour behind the image; required when the output format has no alpha. */
  background?: string | null
  /** CSS filter string, e.g. "brightness(1.1) contrast(1.05)". */
  filter?: string
}

/** Draws an image into a new canvas of the requested size. */
export function render(img: Drawable, opts: RenderOptions): HTMLCanvasElement {
  const canvas = createCanvas(opts.size.width, opts.size.height)
  const ctx = context2d(canvas)
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  const { source, dest } = placeImage(sizeOf(img), opts.size, opts.fit ?? 'stretch')
  const stepped = stepDown(img, source, { width: dest.width, height: dest.height })
  if (opts.filter) ctx.filter = opts.filter
  ctx.drawImage(
    stepped.img,
    stepped.source.x,
    stepped.source.y,
    stepped.source.width,
    stepped.source.height,
    dest.x,
    dest.y,
    dest.width,
    dest.height,
  )
  ctx.filter = 'none'
  return canvas
}

/**
 * Crops a region (in the rotated image's coordinates) after rotating and flipping.
 * Only the cropped area is ever allocated, never the whole rotated image, so this
 * stays cheap even for very large photos.
 */
export function cropTransformed(
  img: Drawable,
  area: Rect,
  rotation: number,
  flip: { h: boolean; v: boolean },
  output?: Size,
): HTMLCanvasElement {
  const size = sizeOf(img)
  const bounds = rotatedBounds(size, rotation)
  const w = Math.max(1, Math.round(area.width))
  const h = Math.max(1, Math.round(area.height))
  const out = fitWithin({ width: w, height: h }, MAX_CANVAS_PIXELS)
  const canvas = createCanvas(out.width, out.height)
  const ctx = context2d(canvas)
  ctx.scale(out.width / w, out.height / h)
  ctx.translate(-Math.round(area.x), -Math.round(area.y))
  ctx.translate(bounds.width / 2, bounds.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1)
  ctx.drawImage(img, -size.width / 2, -size.height / 2)
  if (!output || (output.width === canvas.width && output.height === canvas.height)) return canvas
  return render(canvas, { size: output })
}

/** Converts a crop given in percent of the rotated image into pixels of `img`. */
export function percentToPixels(img: Drawable, pct: Rect, rotation: number): Rect {
  const box = rotatedBounds(sizeOf(img), rotation)
  return {
    x: (pct.x / 100) * box.width,
    y: (pct.y / 100) * box.height,
    width: (pct.width / 100) * box.width,
    height: (pct.height / 100) * box.height,
  }
}

export function toBlob(canvas: HTMLCanvasElement, mime: OutputMime, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode this image.'))),
      mime,
      isLossy(mime) ? quality : undefined,
    )
  })
}

/** Flattens transparency onto a colour, needed before saving as JPG. */
export function flatten(canvas: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const out = createCanvas(canvas.width, canvas.height)
  const ctx = context2d(out)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0)
  return out
}

/** Encodes, flattening onto white first when the format cannot store transparency. */
export function encode(canvas: HTMLCanvasElement, mime: OutputMime, quality = 0.9, matte = '#ffffff') {
  return toBlob(supportsAlpha(mime) ? canvas : flatten(canvas, matte), mime, quality)
}

let supportCache: Promise<OutputMime[]> | undefined

/** Output formats this browser's canvas can actually encode (AVIF and WebP vary). */
export function supportedFormats(): Promise<OutputMime[]> {
  supportCache ??= (async () => {
    const all: OutputMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    const c = createCanvas(2, 2)
    const ok: OutputMime[] = []
    for (const mime of all) {
      // Unsupported types silently fall back to PNG, so compare the result's type.
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, mime, 0.8))
      if (blob?.type === mime) ok.push(mime)
    }
    return ok
  })()
  return supportCache
}

export function blobToImageUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}
