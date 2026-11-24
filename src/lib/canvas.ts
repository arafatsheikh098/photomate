import { isLossy, supportsAlpha, type OutputMime } from './format'
import { placeImage, rotatedBounds, type FitMode, type Rect, type Size } from './geometry'

export type Drawable = ImageBitmap | HTMLCanvasElement | HTMLImageElement

/** Browsers refuse canvases much past this many pixels (iOS Safari is the strictest). */
export const MAX_CANVAS_PIXELS = 16_777_216

export class ImageLoadError extends Error {}

/** Decodes a file, applying its EXIF orientation so phone photos come out upright. */
export async function loadImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const isHeic = /hei[cf]/i.test(file.type) || (file instanceof File && /\.hei[cf]$/i.test(file.name))
    throw new ImageLoadError(
      isHeic
        ? 'HEIC photos can only be opened in Safari. On iPhone, set Camera → Formats → Most Compatible, or share the photo as JPG.'
        : 'This file could not be read as an image.',
    )
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

/** Crops a region (in the rotated image's coordinates) after rotating and flipping. */
export function cropTransformed(
  img: Drawable,
  area: Rect,
  rotation: number,
  flip: { h: boolean; v: boolean },
  output?: Size,
): HTMLCanvasElement {
  const size = sizeOf(img)
  const bounds = rotatedBounds(size, rotation)
  const stage = createCanvas(bounds.width, bounds.height)
  const ctx = context2d(stage)
  ctx.translate(bounds.width / 2, bounds.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1)
  ctx.drawImage(img, -size.width / 2, -size.height / 2)

  const x = Math.round(area.x)
  const y = Math.round(area.y)
  const w = Math.max(1, Math.round(area.width))
  const h = Math.max(1, Math.round(area.height))
  if (!output || (output.width === w && output.height === h)) {
    const out = createCanvas(w, h)
    context2d(out).drawImage(stage, x, y, w, h, 0, 0, w, h)
    return out
  }
  const cropped = createCanvas(w, h)
  context2d(cropped).drawImage(stage, x, y, w, h, 0, 0, w, h)
  return render(cropped, { size: output })
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
