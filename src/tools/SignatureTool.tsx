import { Download, RotateCcw, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CanvasPreview } from '../components/CanvasPreview'
import { Dropzone } from '../components/Dropzone'
import { Alert, Button, Card, Field, NumberInput, Segmented, Select, Slider, Toggle } from '../components/ui'
import { context2d, createCanvas, encode, loadImage, render } from '../lib/canvas'
import { encodeToTarget } from '../lib/compress'
import { downloadBlob } from '../lib/files'
import { formatBytes, renameFile } from '../lib/format'
import { SIGNATURE_PRESETS } from '../lib/presets'
import { cleanSignature, flattenLighting, inkBounds, otsuThreshold, toGray, type InkOptions } from '../lib/signature'

type Ink = 'black' | 'blue' | 'original'
const INKS: Record<Ink, InkOptions['ink']> = {
  black: [17, 17, 17],
  blue: [21, 48, 150],
  original: 'original',
}

/** Working resolution: plenty for a signature, and keeps the per-pixel passes fast. */
const WORK_MAX = 1600

interface Prepared {
  rgba: Uint8ClampedArray
  gray: Uint8Array
  flat: Uint8Array
  width: number
  height: number
}

function prepare(img: ImageBitmap, rotation: number): Prepared {
  const f = Math.min(1, WORK_MAX / Math.max(img.width, img.height))
  const w0 = Math.round(img.width * f)
  const h0 = Math.round(img.height * f)
  const turned = rotation % 180 !== 0
  const width = turned ? h0 : w0
  const height = turned ? w0 : h0
  const c = createCanvas(width, height)
  const ctx = context2d(c)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.translate(width / 2, height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(img, -w0 / 2, -h0 / 2, w0, h0)
  const rgba = ctx.getImageData(0, 0, width, height).data

  // Estimate the paper's brightness everywhere by blurring heavily via a tiny copy.
  const small = createCanvas(Math.max(1, Math.round(width / 24)), Math.max(1, Math.round(height / 24)))
  context2d(small).drawImage(c, 0, 0, small.width, small.height)
  const bg = createCanvas(width, height)
  const bctx = context2d(bg)
  bctx.filter = 'blur(2px)'
  bctx.drawImage(small, 0, 0, width, height)
  const gray = toGray(rgba)
  const flat = flattenLighting(gray, toGray(bctx.getImageData(0, 0, width, height).data))
  return { rgba, gray, flat, width, height }
}

export default function SignatureTool() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<ImageBitmap | null>(null)
  const [rotation, setRotation] = useState(0)
  const [evenLight, setEvenLight] = useState(true)
  const [offset, setOffset] = useState(0)
  const [ink, setInk] = useState<Ink>('black')
  const [transparent, setTransparent] = useState(false)
  const [presetId, setPresetId] = useState(SIGNATURE_PRESETS[0].id)
  const [maxKB, setMaxKB] = useState<number | ''>(SIGNATURE_PRESETS[0].maxKB ?? '')
  const [saving, setSaving] = useState(false)
  const [lastSize, setLastSize] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => () => img?.close(), [img])

  const prepared = useMemo(() => (img ? prepare(img, rotation) : null), [img, rotation])
  const preset = SIGNATURE_PRESETS.find((p) => p.id === presetId) ?? SIGNATURE_PRESETS[0]

  const result = useMemo(() => {
    if (!prepared) return null
    const { rgba, width, height } = prepared
    const gray = evenLight ? prepared.flat : prepared.gray
    const auto = otsuThreshold(gray)
    const threshold = Math.max(1, Math.min(254, auto + offset))
    const softness = 14
    const pixels = cleanSignature(rgba, gray, { threshold, softness, ink: INKS[ink], transparent })

    const full = createCanvas(width, height)
    context2d(full).putImageData(new ImageData(pixels as ImageDataArray, width, height), 0, 0)

    // Trim to the ink, ignoring lines with only a couple of stray dark pixels.
    const pad = Math.round(Math.max(width, height) * 0.02)
    const box = inkBounds(gray, width, height, threshold - softness / 2, pad, 3) ?? { x: 0, y: 0, width, height }
    const trimmed = createCanvas(box.width, box.height)
    context2d(trimmed).drawImage(full, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height)

    if (!preset.width) return { canvas: trimmed, threshold: auto }
    const canvas = render(trimmed, {
      size: { width: preset.width, height: preset.height },
      fit: 'contain',
      background: transparent ? null : '#ffffff',
    })
    return { canvas, threshold: auto }
  }, [prepared, evenLight, offset, ink, transparent, preset])

  const save = async () => {
    if (!result || !file) return
    setSaving(true)
    try {
      let blob: Blob
      if (transparent) {
        blob = await encode(result.canvas, 'image/png')
      } else if (maxKB) {
        const r = await encodeToTarget((q) => encode(result.canvas, 'image/jpeg', q), Number(maxKB) * 1024, { lossy: true, allowResize: false })
        blob = r.blob
        if (!r.fits) {
          setLastSize(`${formatBytes(blob.size)} — could not get under ${maxKB} KB`)
          downloadBlob(blob, renameFile(file.name, 'jpg', '-signature'))
          return
        }
      } else {
        blob = await encode(result.canvas, 'image/jpeg', 0.95)
      }
      setLastSize(formatBytes(blob.size))
      downloadBlob(blob, renameFile(file.name, transparent ? 'png' : 'jpg', '-signature'))
    } finally {
      setSaving(false)
    }
  }

  if (!file || !img) {
    return (
      <div className="space-y-4">
        <Dropzone
          title="Choose a photo of your signature"
          onFiles={async ([f]) => {
            setLoadError(null)
            try {
              setImg(await loadImage(f, { maxSide: 3200 }))
            } catch (e) {
              setLoadError(e instanceof Error ? e.message : 'Could not open this image.')
              return
            }
            setFile(f)
            setRotation(0)
            setOffset(0)
          }}
        />
        {loadError && <Alert>{loadError}</Alert>}
        <Alert tone="info">Sign on plain white paper with a dark pen, then take the photo from straight above in good light.</Alert>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="space-y-3 self-start">
        <div className={`flex min-h-48 items-center justify-center rounded-xl p-6 ${transparent ? 'checker' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <CanvasPreview source={result?.canvas ?? null} label="Cleaned signature" className="max-h-[50vh] shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" />
        </div>
        <p className="text-center text-xs text-slate-500">
          {result && `${result.canvas.width}×${result.canvas.height} px`}
          {lastSize && ` · last download ${lastSize}`}
        </p>
      </Card>

      <Card className="space-y-5 self-start">
        <Field label="Output size">
          {(id) => (
            <Select
              id={id}
              value={presetId}
              onChange={(v) => {
                setPresetId(v)
                setMaxKB(SIGNATURE_PRESETS.find((p) => p.id === v)?.maxKB ?? '')
              }}
              options={SIGNATURE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            />
          )}
        </Field>
        <Field label="Ink cut-off" hint="Move left if paper texture shows, right if thin strokes disappear.">
          {(id) => <Slider id={id} value={offset} onChange={setOffset} min={-80} max={80} format={(v) => (v > 0 ? `+${v}` : `${v}`)} />}
        </Field>
        <Toggle checked={evenLight} onChange={setEvenLight} label="Remove shadows" />
        <Field label="Ink colour">
          {() => (
            <Segmented
              label="Ink colour"
              value={ink}
              onChange={setInk}
              options={[
                { value: 'black', label: 'Black' },
                { value: 'blue', label: 'Blue' },
                { value: 'original', label: 'Original' },
              ]}
            />
          )}
        </Field>
        <Toggle checked={transparent} onChange={setTransparent} label="Transparent background (PNG)" />
        {!transparent && (
          <Field label="Max file size (optional)">{(id) => <NumberInput id={id} value={maxKB} onChange={setMaxKB} min={5} placeholder="no limit" suffix="KB" />}</Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setRotation((r) => (r + 270) % 360)} icon={<RotateCcw className="size-4" />}>
            Rotate
          </Button>
          <Button variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)} icon={<RotateCw className="size-4" />}>
            Rotate
          </Button>
        </div>
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button className="w-full" onClick={save} busy={saving} disabled={!result} icon={<Download className="size-4" />}>
            Download {transparent ? 'PNG' : 'JPG'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setFile(null)}>
            Use another photo
          </Button>
        </div>
      </Card>
    </div>
  )
}
