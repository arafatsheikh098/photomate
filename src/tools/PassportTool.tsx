import { Download, FileDown, Printer, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Area } from 'react-easy-crop'
import { CanvasPreview } from '../components/CanvasPreview'
import { CropStage, initialCrop, type CropState } from '../components/CropStage'
import { Dropzone } from '../components/Dropzone'
import { Alert, Button, Card, ColorPicker, Field, NumberInput, Progress, Segmented, Select, Slider, Toggle } from '../components/ui'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { composite, removeBackground, type RemovalProgress } from '../lib/bgRemoval'
import { cropTransformed, encode, loadImage, percentToPixels, render, toBlob } from '../lib/canvas'
import { encodeToTarget } from '../lib/compress'
import { downloadBlob } from '../lib/files'
import { formatBytes, renameFile } from '../lib/format'
import { mmToPx } from '../lib/geometry'
import { sheetToPdf } from '../lib/pdf'
import { PAPER_SIZES, PHOTO_PRESETS, type PhotoPreset } from '../lib/presets'
import { renderSheet } from '../lib/sheet'

const BG_COLORS = ['#ffffff', '#f1f5f9', '#dbeafe', '#bfdbfe', '#60a5fa']

function FaceGuide({ width, height, head }: { width: number; height: number; head: [number, number] }) {
  const mid = (head[0] + head[1]) / 2
  const crown = height * (1 - mid) * 0.42
  const ovalH = height * mid
  const ovalW = ovalH * 0.74
  const cx = width / 2
  const line = (y: number, label: string) => (
    <g>
      <line x1={0} x2={width} y1={y} y2={y} stroke="#fde047" strokeWidth={1.5} strokeDasharray="6 5" />
      <text x={6} y={y - 4} fill="#fde047" fontSize={11} style={{ paintOrder: 'stroke' }} stroke="rgba(0,0,0,.6)" strokeWidth={3}>
        {label}
      </text>
    </g>
  )
  return (
    <svg width={width} height={height} className="absolute inset-0" aria-hidden>
      <ellipse cx={cx} cy={crown + ovalH / 2} rx={ovalW / 2} ry={ovalH / 2} fill="none" stroke="rgba(0,0,0,.5)" strokeWidth={4} />
      <ellipse cx={cx} cy={crown + ovalH / 2} rx={ovalW / 2} ry={ovalH / 2} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="8 6" />
      <line x1={cx} x2={cx} y1={0} y2={height} stroke="rgba(255,255,255,.35)" strokeWidth={1} />
      {line(crown, 'Top of head')}
      {line(crown + height * head[0], 'Chin: between these lines')}
      {line(crown + height * head[1], '')}
    </svg>
  )
}

export default function PassportTool() {
  const [file, setFile] = useState<File | null>(null)
  const [original, setOriginal] = useState<ImageBitmap | null>(null)
  const [presetId, setPresetId] = useState(PHOTO_PRESETS[0].id)
  const [custom, setCustom] = useState<{ width: number | ''; height: number | ''; unit: 'mm' | 'px' }>({ width: 35, height: 45, unit: 'mm' })
  const [maxKB, setMaxKB] = useState<number | ''>('')
  const [state, setState] = useState<CropState>(initialCrop)
  const [area, setArea] = useState<Area | null>(null)
  const [replaceBg, setReplaceBg] = useState(false)
  const [bgColor, setBgColor] = useState<string | null>('#ffffff')
  const [cutout, setCutout] = useState<ImageBitmap | null>(null)
  const [bgProgress, setBgProgress] = useState<RemovalProgress | null>(null)
  const [bgError, setBgError] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [paperId, setPaperId] = useState(PAPER_SIZES[0].id)
  const [cutLines, setCutLines] = useState(true)
  const [copies, setCopies] = useState<number | ''>('')
  const [busy, setBusy] = useState<string | null>(null)
  const [lastSize, setLastSize] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const currentFile = useRef<File | null>(null)
  useEffect(() => {
    currentFile.current = file
  }, [file])

  useEffect(() => () => original?.close(), [original])
  useEffect(() => () => cutout?.close(), [cutout])

  const preset: PhotoPreset = useMemo(() => {
    const p = PHOTO_PRESETS.find((x) => x.id === presetId)
    if (p) return p
    const px = custom.unit === 'px'
    // Fall back to sensible values while a field is empty or out of range mid-typing.
    const cw = Math.min(Math.max(Number(custom.width) || (px ? 300 : 35), 1), px ? 4000 : 300)
    const ch = Math.min(Math.max(Number(custom.height) || (px ? 300 : 45), 1), px ? 4000 : 300)
    return {
      id: 'custom',
      label: 'Custom',
      detail: '',
      widthPx: Math.round(px ? cw : mmToPx(cw, 300)),
      heightPx: Math.round(px ? ch : mmToPx(ch, 300)),
      widthMm: px ? undefined : cw,
      heightMm: px ? undefined : ch,
      dpi: 300,
      head: [0.6, 0.75],
      background: '#ffffff',
    }
  }, [presetId, custom])

  // The image shown in the cropper: either the original or the cut-out on the chosen colour.
  const source = useMemo(() => {
    if (replaceBg && cutout) return composite(cutout, { kind: 'color', color: bgColor ?? '#ffffff' })
    return original
  }, [replaceBg, cutout, bgColor, original])

  // The cropper shows a PNG of the composite; recreated only when the background changes.
  const [compositeBlob, setCompositeBlob] = useState<Blob | null>(null)
  useEffect(() => {
    let live = true
    if (source instanceof HTMLCanvasElement) toBlob(source, 'image/png').then((b) => live && setCompositeBlob(b))
    return () => {
      live = false
    }
  }, [source])
  const fileUrl = useObjectUrl(file)
  const compositeUrl = useObjectUrl(compositeBlob)
  const sourceUrl = source instanceof HTMLCanvasElement ? compositeUrl : fileUrl

  const finalPhoto = useMemo(() => {
    if (!source || !area) return null
    // Percentages survive swapping between the working copy and the smaller cut-out.
    const px = percentToPixels(source, area, state.rotation)
    const cropped = cropTransformed(source, px, state.rotation, { h: state.flipH, v: state.flipV }, { width: preset.widthPx, height: preset.heightPx })
    const filter = brightness !== 100 || contrast !== 100 ? `brightness(${brightness}%) contrast(${contrast}%)` : undefined
    return render(cropped, { size: { width: preset.widthPx, height: preset.heightPx }, background: '#ffffff', filter })
  }, [source, area, state.rotation, state.flipH, state.flipV, preset.widthPx, preset.heightPx, brightness, contrast])

  const paper = PAPER_SIZES.find((p) => p.id === paperId) ?? PAPER_SIZES[0]
  const printable = !!preset.widthMm
  const sheet = useMemo(() => {
    if (!finalPhoto || !printable) return null
    return renderSheet(finalPhoto, { paper, dpi: preset.dpi, gapMm: 2, marginMm: 3, cutLines, copies: copies || undefined })
  }, [finalPhoto, printable, paper, preset.dpi, cutLines, copies])

  const runRemoval = async () => {
    if (!file) return
    const forFile = file
    setBgError(null)
    setBgProgress({ stage: 'download', fraction: null })
    try {
      const blob = await removeBackground(forFile, 'standard', setBgProgress)
      const bmp = await createImageBitmap(blob)
      // The user may have switched photos while the model was running.
      if (currentFile.current !== forFile) {
        bmp.close()
        return
      }
      setCutout(bmp)
    } catch (e) {
      if (currentFile.current !== forFile) return
      setBgError(e instanceof Error ? e.message : 'Background removal failed.')
      setReplaceBg(false)
    } finally {
      if (currentFile.current === forFile) setBgProgress(null)
    }
  }

  const stem = file ? renameFile(file.name, '', '').replace(/\.$/, '') : 'photo'

  const downloadPhoto = async () => {
    if (!finalPhoto) return
    setBusy('photo')
    try {
      let blob: Blob
      if (maxKB) {
        const r = await encodeToTarget((q) => encode(finalPhoto, 'image/jpeg', q), Number(maxKB) * 1024, { lossy: true, allowResize: false, minQuality: 0.3 })
        blob = r.blob
        setLastSize(
          r.fits
            ? `Last download: ${formatBytes(blob.size)}`
            : `Could not get under ${maxKB} KB without ruining the photo; saved at ${formatBytes(blob.size)}.`,
        )
      } else {
        blob = await encode(finalPhoto, 'image/jpeg', 0.95)
        setLastSize(`Last download: ${formatBytes(blob.size)}`)
      }
      downloadBlob(blob, `${stem}-${preset.widthPx}x${preset.heightPx}.jpg`)
    } finally {
      setBusy(null)
    }
  }

  const downloadSheet = async (as: 'jpg' | 'pdf') => {
    if (!sheet) return
    setBusy(as)
    try {
      const jpg = await encode(sheet.canvas, 'image/jpeg', 0.95)
      if (as === 'jpg') downloadBlob(jpg, `${stem}-print-${paper.id}.jpg`)
      else downloadBlob(await sheetToPdf(new Uint8Array(await jpg.arrayBuffer()), paper.widthMm, paper.heightMm, `${stem} print sheet`), `${stem}-print-${paper.id}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  if (!file || !original) {
    return (
      <div className="space-y-4">
        <Dropzone
          title="Choose a portrait photo"
          onFiles={async ([f]) => {
            setLoadError(null)
            try {
              // Output is at most ~830 px tall, so a 2400 px working copy is plenty and keeps edits fast.
              setOriginal(await loadImage(f, { maxSide: 2400 }))
            } catch (e) {
              setLoadError(e instanceof Error ? e.message : 'Could not open this image.')
              return
            }
            setFile(f)
            setCutout(null)
            setReplaceBg(false)
            setState(initialCrop)
          }}
        />
        {loadError && <Alert>{loadError}</Alert>}
        <Alert tone="info">
          Use a well-lit, front-facing photo with a plain background, taken from about 1.5 m away. Requirements change, so
          check the issuing authority’s current rules before you submit.
        </Alert>
      </div>
    )
  }

  const removing = bgProgress !== null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {sourceUrl && (
          <CropStage
            image={sourceUrl}
            aspect={preset.widthPx / preset.heightPx}
            state={state}
            onChange={setState}
            onArea={(_, pct) => setArea(pct)}
            overlay={(s) => <FaceGuide {...s} head={preset.head} />}
          />
        )}
        <p className="text-center text-xs text-slate-500">
          Drag and zoom so the head fits the oval, with the top of the head on the first line and the chin between the other two.
        </p>
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Zoom">
            {(id) => <Slider id={id} value={state.zoom} onChange={(zoom) => setState((s) => ({ ...s, zoom }))} min={0.5} max={6} step={0.01} format={(v) => `${v.toFixed(1)}×`} />}
          </Field>
          <Field label="Straighten">
            {(id) => <Slider id={id} value={state.rotation} onChange={(rotation) => setState((s) => ({ ...s, rotation }))} min={-20} max={20} step={0.5} format={(v) => `${v}°`} />}
          </Field>
          <Field label="Brightness">
            {(id) => <Slider id={id} value={brightness} onChange={setBrightness} min={60} max={150} format={(v) => `${v}%`} />}
          </Field>
          <Field label="Contrast">
            {(id) => <Slider id={id} value={contrast} onChange={setContrast} min={60} max={150} format={(v) => `${v}%`} />}
          </Field>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="space-y-4">
          <Field label="Photo size" hint={PHOTO_PRESETS.find((p) => p.id === presetId)?.detail}>
            {(id) => (
              <Select
                id={id}
                value={presetId}
                onChange={(id) => {
                  setPresetId(id)
                  setMaxKB(PHOTO_PRESETS.find((p) => p.id === id)?.maxKB ?? '')
                }}
                options={[...PHOTO_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom', label: 'Custom size…' }]}
              />
            )}
          </Field>
          {presetId === 'custom' && (
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field label="Width">{(id) => <NumberInput id={id} value={custom.width} min={1} onChange={(v) => setCustom((c) => ({ ...c, width: v }))} />}</Field>
              <Field label="Height">{(id) => <NumberInput id={id} value={custom.height} min={1} onChange={(v) => setCustom((c) => ({ ...c, height: v }))} />}</Field>
              <Segmented label="Unit" value={custom.unit} onChange={(unit) => setCustom((c) => ({ ...c, unit }))} options={[{ value: 'mm', label: 'mm' }, { value: 'px', label: 'px' }]} />
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Output: {preset.widthPx}×{preset.heightPx} px{preset.widthMm && ` · ${preset.widthMm}×${preset.heightMm} mm at ${preset.dpi} DPI`}
          </p>
        </Card>

        <Card className="space-y-4">
          <Toggle
            checked={replaceBg}
            label={<span className="flex items-center gap-1.5"><Sparkles className="size-4 text-brand-600" /> Replace background</span>}
            onChange={(on) => {
              setReplaceBg(on)
              if (on && !cutout && !removing) runRemoval()
            }}
          />
          {removing && (
            <Progress
              value={bgProgress?.stage === 'download' ? bgProgress.fraction : null}
              label={bgProgress?.stage === 'download' ? 'Downloading the AI model (first time only)…' : 'Removing background…'}
            />
          )}
          {bgError && <Alert>{bgError}</Alert>}
          {replaceBg && cutout && (
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Background ${c}`}
                  aria-pressed={bgColor === c}
                  onClick={() => setBgColor(c)}
                  style={{ background: c }}
                  className="size-8 rounded-full ring-1 ring-slate-300 aria-pressed:ring-2 aria-pressed:ring-brand-600 aria-pressed:ring-offset-2 dark:ring-slate-600 dark:aria-pressed:ring-offset-slate-900"
                />
              ))}
              <ColorPicker value={bgColor} onChange={setBgColor} />
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 overflow-hidden rounded ring-1 ring-slate-200 dark:ring-slate-700">
              <CanvasPreview source={finalPhoto} label="Final photo" className="w-full" />
            </div>
            <div className="flex-1 space-y-2">
              <Field label="Max file size (optional)">{(id) => <NumberInput id={id} value={maxKB} onChange={setMaxKB} min={10} placeholder="no limit" suffix="KB" />}</Field>
            </div>
          </div>
          <Button className="w-full" onClick={downloadPhoto} busy={busy === 'photo'} disabled={!finalPhoto} icon={<Download className="size-4" />}>
            Download photo (JPG)
          </Button>
          {lastSize && <p className="text-center text-xs text-slate-500">{lastSize}</p>}
        </Card>

        {printable && (
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Printer className="size-4" /> Print sheet
            </h2>
            <Field label="Paper">{(id) => <Select id={id} value={paperId} onChange={setPaperId} options={PAPER_SIZES.map((p) => ({ value: p.id, label: p.label }))} />}</Field>
            <Field label="Copies" hint={sheet ? `Up to ${sheet.max} fit on this paper.` : undefined}>
              {(id) => <NumberInput id={id} value={copies} onChange={setCopies} min={1} max={sheet?.max} placeholder={sheet ? `${sheet.max} (fill the sheet)` : ''} />}
            </Field>
            <Toggle checked={cutLines} onChange={setCutLines} label="Cutting guides" />
            {sheet && (
              <div className="mx-auto w-40 overflow-hidden rounded shadow ring-1 ring-slate-200 dark:ring-slate-700">
                <CanvasPreview source={sheet.canvas} label={`Print sheet with ${sheet.count} photos`} className="w-full" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => downloadSheet('jpg')} busy={busy === 'jpg'} disabled={!sheet} icon={<Download className="size-4" />}>
                JPG
              </Button>
              <Button variant="secondary" onClick={() => downloadSheet('pdf')} busy={busy === 'pdf'} disabled={!sheet} icon={<FileDown className="size-4" />}>
                PDF
              </Button>
            </div>
            <p className="text-xs text-slate-500">Print at 100% / “Actual size”, not “Fit to page”, so the photos come out the right size.</p>
          </Card>
        )}

        <Button
          variant="ghost"
          className="w-full"
          icon={<RotateCcw className="size-4" />}
          onClick={() => {
            setFile(null)
            setOriginal(null)
            setCutout(null)
            setReplaceBg(false)
            setBgProgress(null)
            setBgError(null)
            setLastSize(null)
          }}
        >
          Use another photo
        </Button>
      </aside>
    </div>
  )
}
