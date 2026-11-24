import { Link2, Link2Off } from 'lucide-react'
import { useState } from 'react'
import { BatchTool, type Processor } from '../components/BatchTool'
import { FormatPicker, type FormatChoice } from '../components/FormatPicker'
import { ColorPicker, Field, NumberInput, Segmented, Select, Slider } from '../components/ui'
import { encode, render } from '../lib/canvas'
import { extFor, isLossy, renameFile } from '../lib/format'
import { computeResize, type FitMode, type ResizeSpec } from '../lib/geometry'
import { resolveFormat } from '../lib/output'
import { RESIZE_PRESETS } from '../lib/presets'

type Mode = ResizeSpec['mode']

export default function ResizeTool() {
  const [mode, setMode] = useState<Mode>('pixels')
  const [width, setWidth] = useState<number | ''>(1080)
  const [height, setHeight] = useState<number | ''>('')
  const [keepAspect, setKeepAspect] = useState(true)
  const [percent, setPercent] = useState(50)
  const [longest, setLongest] = useState<number | ''>(1600)
  const [fit, setFit] = useState<FitMode>('cover')
  const [pad, setPad] = useState<string | null>('#ffffff')
  const [format, setFormat] = useState<FormatChoice>('original')
  const [quality, setQuality] = useState(90)

  const exact = mode === 'pixels' && !keepAspect && !!width && !!height

  const spec = (): ResizeSpec => {
    if (mode === 'percent') return { mode, percent }
    if (mode === 'longest') return { mode, size: Number(longest) || 1600 }
    return { mode, width: width || undefined, height: height || undefined, keepAspect }
  }

  const process: Processor = async (file, img) => {
    const mime = await resolveFormat(format, file)
    const size = computeResize({ width: img.width, height: img.height }, spec())
    const canvas = render(img, {
      size,
      fit: exact ? fit : 'stretch',
      background: exact && fit === 'contain' ? pad : null,
    })
    const blob = await encode(canvas, mime, quality / 100)
    return { blob, name: renameFile(file.name, extFor(mime), `-${size.width}x${size.height}`), ...size }
  }

  return (
    <BatchTool
      actionLabel="Resize"
      process={process}
      compare={false}
      optionsKey={JSON.stringify([mode, width, height, keepAspect, percent, longest, fit, pad, format, quality])}
      options={
        <>
          <Segmented
            label="Resize by"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'pixels', label: 'Pixels' },
              { value: 'percent', label: 'Percent' },
              { value: 'longest', label: 'Longest side' },
            ]}
          />

          {mode === 'pixels' && (
            <>
              <Field label="Preset">
                {(id) => (
                  <Select
                    id={id}
                    value=""
                    onChange={(v) => {
                      const p = RESIZE_PRESETS[Number(v)]
                      if (!p) return
                      setWidth(p.width)
                      setHeight(p.height)
                      setKeepAspect(false)
                    }}
                    options={[{ value: '', label: 'Choose a preset…' }, ...RESIZE_PRESETS.map((p, i) => ({ value: String(i), label: p.label }))]}
                  />
                )}
              </Field>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Width">{(id) => <NumberInput id={id} value={width} onChange={setWidth} min={1} placeholder="auto" suffix="px" />}</Field>
                </div>
                <button
                  type="button"
                  onClick={() => setKeepAspect((k) => !k)}
                  aria-pressed={keepAspect}
                  title={keepAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                  aria-label="Lock aspect ratio"
                  className="mb-0.5 rounded-lg p-2 text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100 aria-pressed:bg-brand-50 aria-pressed:text-brand-700 aria-pressed:ring-brand-300 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:aria-pressed:bg-brand-900/40 dark:aria-pressed:text-brand-300"
                >
                  {keepAspect ? <Link2 className="size-5" /> : <Link2Off className="size-5" />}
                </button>
                <div className="flex-1">
                  <Field label="Height">{(id) => <NumberInput id={id} value={height} onChange={setHeight} min={1} placeholder="auto" suffix="px" />}</Field>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {keepAspect
                  ? 'Aspect ratio locked: leave one side empty, or give both to fit inside that box.'
                  : 'Exact size: the image is changed to exactly these dimensions.'}
              </p>
              {exact && (
                <>
                  <Field label="When the shape differs">
                    {(id) => (
                      <Select
                        id={id}
                        value={fit}
                        onChange={setFit}
                        options={[
                          { value: 'cover', label: 'Crop to fill (no distortion)' },
                          { value: 'contain', label: 'Fit and pad with colour' },
                          { value: 'stretch', label: 'Stretch' },
                        ]}
                      />
                    )}
                  </Field>
                  {fit === 'contain' && (
                    <Field label="Padding colour">{() => <ColorPicker value={pad} onChange={setPad} transparent />}</Field>
                  )}
                </>
              )}
            </>
          )}

          {mode === 'percent' && (
            <Field label="Scale">
              {(id) => <Slider id={id} value={percent} onChange={setPercent} min={5} max={200} step={5} format={(v) => `${v}%`} />}
            </Field>
          )}

          {mode === 'longest' && (
            <Field label="Longest side" hint="Width or height, whichever is bigger, becomes this size.">
              {(id) => <NumberInput id={id} value={longest} onChange={setLongest} min={1} suffix="px" />}
            </Field>
          )}

          <FormatPicker value={format} onChange={setFormat} allowOriginal />
          {(format === 'original' || isLossy(format)) && (
            <Field label="Quality">
              {(id) => <Slider id={id} value={quality} onChange={setQuality} min={10} max={100} format={(v) => `${v}%`} />}
            </Field>
          )}
        </>
      }
    />
  )
}
