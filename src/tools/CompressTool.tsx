import { useState } from 'react'
import { BatchTool, type Processor } from '../components/BatchTool'
import { FormatPicker, type FormatChoice } from '../components/FormatPicker'
import { Field, NumberInput, Segmented, Slider, Toggle } from '../components/ui'
import { cx } from '../components/cx'
import { createCanvas, encode, render } from '../lib/canvas'
import { encodeToTarget } from '../lib/compress'
import { extFor, formatBytes, isLossy, renameFile } from '../lib/format'
import { resolveFormat } from '../lib/output'

const QUICK_KB = [20, 50, 100, 200, 500, 1000]

export default function CompressTool() {
  const [mode, setMode] = useState<'target' | 'quality'>('target')
  const [targetKB, setTargetKB] = useState<number | ''>(100)
  const [quality, setQuality] = useState(75)
  const [format, setFormat] = useState<FormatChoice>('image/jpeg')
  const [allowResize, setAllowResize] = useState(true)

  const process: Processor = async (file, img) => {
    const mime = await resolveFormat(format, file)
    const name = renameFile(file.name, extFor(mime), '-compressed')
    const full = render(img, { size: { width: img.width, height: img.height } })

    if (mode === 'quality') {
      const blob = await encode(full, mime, quality / 100)
      // Re-encoding an already-optimised file can make it bigger; keep the original then.
      if (blob.size >= file.size && file.type === mime) {
        return { blob: file, name, width: img.width, height: img.height, note: 'Already well compressed, kept the original.' }
      }
      return { blob, name, width: img.width, height: img.height }
    }

    const target = (Number(targetKB) || 100) * 1024
    if (file.size <= target && file.type === mime) {
      return { blob: file, name, width: img.width, height: img.height, note: 'Already under the target size.' }
    }
    const scaled = new Map<number, HTMLCanvasElement>([[1, full]])
    const result = await encodeToTarget(
      (q, s) => {
        let c = scaled.get(s)
        if (!c) {
          c = render(full, { size: { width: Math.max(1, Math.round(img.width * s)), height: Math.max(1, Math.round(img.height * s)) } })
          scaled.set(s, c)
        }
        return encode(c, mime, q)
      },
      target,
      { lossy: isLossy(mime), allowResize },
    )
    const c = scaled.get(result.scale) ?? createCanvas(1, 1)
    const parts = [`quality ${Math.round(result.quality * 100)}%`]
    if (result.scale < 1) parts.push(`resized to ${c.width}×${c.height}`)
    return {
      blob: result.blob,
      name,
      width: c.width,
      height: c.height,
      note: result.fits
        ? `Fits under ${formatBytes(target)} (${parts.join(', ')}).`
        : `Could not reach ${formatBytes(target)}${allowResize ? '' : ' without resizing'}; this is the smallest possible.`,
      warn: !result.fits,
    }
  }

  return (
    <BatchTool
      actionLabel="Compress"
      process={process}
      optionsKey={JSON.stringify([mode, targetKB, quality, format, allowResize])}
      options={
        <>
          <Segmented
            label="Compression mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'target', label: 'Target size' },
              { value: 'quality', label: 'Quality' },
            ]}
          />
          {mode === 'target' ? (
            <>
              <Field label="Maximum file size" hint="Gets the best quality that stays under this size.">
                {(id) => <NumberInput id={id} value={targetKB} onChange={setTargetKB} min={5} step={5} suffix="KB" />}
              </Field>
              <div className="flex flex-wrap gap-2">
                {QUICK_KB.map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetKB(kb)}
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-medium ring-1 transition',
                      targetKB === kb
                        ? 'bg-brand-600 text-white ring-brand-600'
                        : 'text-slate-600 ring-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800',
                    )}
                  >
                    {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
                  </button>
                ))}
              </div>
              <Toggle checked={allowResize} onChange={setAllowResize} label="Reduce dimensions if needed" />
            </>
          ) : (
            <Field label="Quality" hint="70–80% looks the same as the original for most photos.">
              {(id) => <Slider id={id} value={quality} onChange={setQuality} min={10} max={100} format={(v) => `${v}%`} />}
            </Field>
          )}
          <FormatPicker value={format} onChange={setFormat} allowOriginal />
          {format === 'image/png' && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              PNG is lossless, so only resizing makes it smaller. Choose JPG or WebP for much smaller photos.
            </p>
          )}
        </>
      }
    />
  )
}
