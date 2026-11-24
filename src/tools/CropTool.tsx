import { ArrowLeftRight, ArrowUpDown, Download, RotateCcw, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Area } from 'react-easy-crop'
import { CropStage, initialCrop, type CropState } from '../components/CropStage'
import { Dropzone } from '../components/Dropzone'
import { FormatPicker, type FormatChoice } from '../components/FormatPicker'
import { Button, Card, Field, Select, Slider } from '../components/ui'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { cropTransformed, encode, loadImage } from '../lib/canvas'
import { downloadBlob } from '../lib/files'
import { extFor, isLossy, renameFile } from '../lib/format'
import { resolveFormat } from '../lib/output'

const RATIOS: { value: string; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: '1', label: 'Square 1:1' },
  { value: '0.8', label: 'Portrait 4:5' },
  { value: '0.75', label: 'Portrait 3:4' },
  { value: '0.6667', label: 'Portrait 2:3' },
  { value: '0.5625', label: 'Story 9:16' },
  { value: '1.3333', label: 'Landscape 4:3' },
  { value: '1.5', label: 'Landscape 3:2' },
  { value: '1.7778', label: 'Widescreen 16:9' },
  { value: '3', label: 'Banner 3:1' },
]

export default function CropTool() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<ImageBitmap | null>(null)
  const url = useObjectUrl(file)
  const [ratio, setRatio] = useState('original')
  const [state, setState] = useState<CropState>(initialCrop)
  const [area, setArea] = useState<Area | null>(null)
  const [format, setFormat] = useState<FormatChoice>('original')
  const [quality, setQuality] = useState(92)
  const [saving, setSaving] = useState(false)

  useEffect(() => () => img?.close(), [img])

  if (!file || !url) {
    return (
      <Dropzone
        onFiles={async ([f]) => {
          setImg(await loadImage(f))
          setFile(f)
          setState(initialCrop)
        }}
      />
    )
  }

  // Quarter turns swap the sides, so "original" follows the rotated shape.
  const turned = Math.round(state.rotation / 90) % 2 !== 0
  const aspect =
    ratio === 'original' ? (img ? (turned ? img.height / img.width : img.width / img.height) : 1) : Number(ratio)

  const rotateBy = (d: number) => setState((s) => ({ ...s, rotation: (((s.rotation + d) % 360) + 360) % 360 }))

  const save = async () => {
    if (!img || !area) return
    setSaving(true)
    try {
      const canvas = cropTransformed(img, area, state.rotation, { h: state.flipH, v: state.flipV })
      const mime = await resolveFormat(format, file)
      downloadBlob(await encode(canvas, mime, quality / 100), renameFile(file.name, extFor(mime), '-cropped'))
    } finally {
      setSaving(false)
    }
  }

  // Fine rotation is shown as −45…45 around the nearest quarter turn.
  const quarter = Math.round(state.rotation / 90) * 90
  const fine = state.rotation - quarter

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <CropStage image={url} aspect={aspect} state={state} onChange={setState} onArea={setArea} />
        <p className="text-center text-xs text-slate-500">Drag to move, pinch or scroll to zoom.</p>
      </div>
      <Card className="space-y-5 self-start">
        <Field label="Aspect ratio">{(id) => <Select id={id} value={ratio} onChange={setRatio} options={RATIOS} />}</Field>
        <Field label="Zoom">
          {(id) => <Slider id={id} value={state.zoom} onChange={(zoom) => setState((s) => ({ ...s, zoom }))} min={0.5} max={6} step={0.01} format={(v) => `${v.toFixed(1)}×`} />}
        </Field>
        <Field label="Straighten">
          {(id) => (
            <Slider
              id={id}
              value={fine}
              onChange={(v) => setState((s) => ({ ...s, rotation: quarter + v }))}
              min={-45}
              max={45}
              step={0.5}
              format={(v) => `${v.toFixed(1)}°`}
            />
          )}
        </Field>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="secondary" aria-label="Rotate left" title="Rotate left" onClick={() => rotateBy(-90)} icon={<RotateCcw className="size-4" />} />
          <Button variant="secondary" aria-label="Rotate right" title="Rotate right" onClick={() => rotateBy(90)} icon={<RotateCw className="size-4" />} />
          <Button
            variant="secondary"
            aria-label="Flip horizontally"
            title="Flip horizontally"
            aria-pressed={state.flipH}
            onClick={() => setState((s) => ({ ...s, flipH: !s.flipH }))}
            icon={<ArrowLeftRight className="size-4" />}
          />
          <Button
            variant="secondary"
            aria-label="Flip vertically"
            title="Flip vertically"
            aria-pressed={state.flipV}
            onClick={() => setState((s) => ({ ...s, flipV: !s.flipV }))}
            icon={<ArrowUpDown className="size-4" />}
          />
        </div>
        <FormatPicker value={format} onChange={setFormat} allowOriginal />
        {(format === 'original' || isLossy(format)) && (
          <Field label="Quality">{(id) => <Slider id={id} value={quality} onChange={setQuality} min={10} max={100} format={(v) => `${v}%`} />}</Field>
        )}
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button className="w-full" onClick={save} busy={saving} disabled={!area} icon={<Download className="size-4" />}>
            Download {area && `${Math.round(area.width)}×${Math.round(area.height)}`}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setState(initialCrop)}>
            Reset
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setFile(null)}>
            Use another image
          </Button>
        </div>
      </Card>
    </div>
  )
}
