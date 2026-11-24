import { context2d, createCanvas, sizeOf, type Drawable } from './canvas'
import { placeImage } from './geometry'

export type ModelQuality = 'standard' | 'high'

export const MODEL_INFO: Record<ModelQuality, { model: 'isnet_quint8' | 'isnet_fp16'; label: string; download: string }> = {
  standard: { model: 'isnet_quint8', label: 'Standard', download: '≈55 MB' },
  high: { model: 'isnet_fp16', label: 'High detail', download: '≈100 MB' },
}

export interface RemovalProgress {
  stage: 'download' | 'compute'
  /** 0–1, or null while the total is unknown. */
  fraction: number | null
}

/** Largest side fed to the model; bigger inputs only cost time, the mask is upscaled anyway. */
const MAX_INPUT = 2048

async function prepare(source: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(source, { imageOrientation: 'from-image' })
  try {
    const f = Math.min(1, MAX_INPUT / Math.max(bmp.width, bmp.height))
    const c = createCanvas(Math.round(bmp.width * f), Math.round(bmp.height * f))
    context2d(c).drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/png'))
  } finally {
    bmp.close()
  }
}

/**
 * Cuts the subject out of a photo with an on-device segmentation model (IS-Net via ONNX Runtime).
 * The model files download once from the IMG.LY CDN and are then cached by the service worker.
 */
export async function removeBackground(
  source: Blob,
  quality: ModelQuality,
  onProgress?: (p: RemovalProgress) => void,
): Promise<Blob> {
  const { removeBackground: run } = await import('@imgly/background-removal')
  const input = await prepare(source)
  const downloads = new Map<string, [number, number]>()
  const config = {
    model: MODEL_INFO[quality].model,
    output: { format: 'image/png' as const },
    progress: (key: string, current: number, total: number) => {
      if (key.startsWith('fetch:')) {
        downloads.set(key, [current, total])
        let done = 0
        let all = 0
        for (const [c, t] of downloads.values()) {
          done += c
          all += t
        }
        onProgress?.({ stage: 'download', fraction: all ? done / all : null })
      } else {
        onProgress?.({ stage: 'compute', fraction: total ? current / total : null })
      }
    },
  }
  // WASM on the CPU: WebGPU support for this model is still uneven across drivers and phones.
  return run(input, { ...config, device: 'cpu' })
}

export type Backdrop = { kind: 'transparent' } | { kind: 'color'; color: string } | { kind: 'image'; image: Drawable } | { kind: 'blur'; image: Drawable; radius: number }

/** Places a cut-out over a new background at the cut-out's resolution. */
export function composite(cutout: Drawable, backdrop: Backdrop): HTMLCanvasElement {
  const size = sizeOf(cutout)
  const canvas = createCanvas(size.width, size.height)
  const ctx = context2d(canvas)
  if (backdrop.kind === 'color') {
    ctx.fillStyle = backdrop.color
    ctx.fillRect(0, 0, size.width, size.height)
  } else if (backdrop.kind === 'image' || backdrop.kind === 'blur') {
    const { source, dest } = placeImage(sizeOf(backdrop.image), size, 'cover')
    if (backdrop.kind === 'blur') ctx.filter = `blur(${backdrop.radius}px)`
    // Overdraw slightly so the blur does not fade in from the edges.
    const bleed = backdrop.kind === 'blur' ? backdrop.radius * 2 : 0
    ctx.drawImage(
      backdrop.image,
      source.x,
      source.y,
      source.width,
      source.height,
      dest.x - bleed,
      dest.y - bleed,
      dest.width + 2 * bleed,
      dest.height + 2 * bleed,
    )
    ctx.filter = 'none'
  }
  ctx.drawImage(cutout, 0, 0)
  return canvas
}
