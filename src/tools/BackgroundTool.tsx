import { Download, Eye, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { CanvasPreview } from '../components/CanvasPreview'
import { Dropzone } from '../components/Dropzone'
import { FormatPicker, type FormatChoice } from '../components/FormatPicker'
import { Alert, Button, Card, ColorPicker, Field, Progress, Segmented, Slider } from '../components/ui'
import { composite, MODEL_INFO, removeBackground, type Backdrop, type ModelQuality, type RemovalProgress } from '../lib/bgRemoval'
import { encode, loadImage } from '../lib/canvas'
import { downloadBlob } from '../lib/files'
import { extFor, formatBytes, renameFile, supportsAlpha, type OutputMime } from '../lib/format'

type BackdropKind = 'transparent' | 'color' | 'blur' | 'image'

export default function BackgroundTool() {
  const [file, setFile] = useState<File | null>(null)
  const [original, setOriginal] = useState<ImageBitmap | null>(null)
  const [cutout, setCutout] = useState<ImageBitmap | null>(null)
  const [quality, setQuality] = useState<ModelQuality>('standard')
  const [progress, setProgress] = useState<RemovalProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<BackdropKind>('transparent')
  const [color, setColor] = useState<string | null>('#ffffff')
  const [blur, setBlur] = useState(12)
  const [bgImage, setBgImage] = useState<ImageBitmap | null>(null)
  const [format, setFormat] = useState<FormatChoice>('image/png')
  const [peek, setPeek] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => () => original?.close(), [original])
  useEffect(() => () => cutout?.close(), [cutout])
  useEffect(() => () => bgImage?.close(), [bgImage])

  const start = async (f: File, q = quality) => {
    setFile(f)
    setError(null)
    setCutout(null)
    setProgress({ stage: 'download', fraction: null })
    try {
      const orig = await loadImage(f, { maxSide: 2048 })
      setOriginal(orig)
      const blob = await removeBackground(f, q, setProgress)
      setCutout(await createImageBitmap(blob))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Background removal failed.')
    } finally {
      setProgress(null)
    }
  }

  const backdrop: Backdrop = useMemo(() => {
    if (kind === 'color' && color) return { kind: 'color', color }
    if (kind === 'blur' && original) return { kind: 'blur', image: original, radius: blur }
    if (kind === 'image' && bgImage) return { kind: 'image', image: bgImage }
    return { kind: 'transparent' }
  }, [kind, color, blur, original, bgImage])

  const result = useMemo(() => (cutout ? composite(cutout, backdrop) : null), [cutout, backdrop])

  // A transparent result saved as JPG would get a white matte, so steer to PNG/WebP.
  const mime = (format === 'original' ? 'image/png' : format) as OutputMime
  const transparentLost = backdrop.kind === 'transparent' && !supportsAlpha(mime)

  const save = async () => {
    if (!result || !file) return
    setSaving(true)
    try {
      const blob = await encode(result, mime, 0.92)
      downloadBlob(blob, renameFile(file.name, extFor(mime), '-no-bg'))
    } finally {
      setSaving(false)
    }
  }

  if (!file) {
    return (
      <div className="space-y-4">
        <Dropzone onFiles={([f]) => start(f)} />
        <Alert tone="info">
          The AI model runs on your device. The first use downloads it once ({MODEL_INFO.standard.download}); after that
          it works offline.
        </Alert>
      </div>
    )
  }

  const busy = progress !== null
  const progressLabel =
    progress?.stage === 'download'
      ? `Downloading the AI model (first time only)${progress.fraction !== null ? ` · ${Math.round(progress.fraction * 100)}%` : '…'}`
      : 'Finding the subject and removing the background…'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="order-2 lg:order-1">
        <div className="checker relative flex min-h-64 items-center justify-center overflow-hidden rounded-xl">
          {result && !peek ? (
            <CanvasPreview source={result} label="Image with background removed" className="max-h-[65vh]" />
          ) : original ? (
            <OriginalPreview file={file} dim={busy} />
          ) : null}
          {busy && (
            <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/90 p-4 shadow dark:bg-slate-900/90">
              <Progress value={progress?.stage === 'download' ? progress.fraction : null} label={progressLabel} />
            </div>
          )}
        </div>
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
      </Card>

      <aside className="order-1 space-y-4 lg:order-2">
        <Card className="space-y-5">
          <Field label="Model" hint={`Downloaded once: ${MODEL_INFO[quality].download}. High detail is better for hair and fur.`}>
            {() => (
              <Segmented
                label="Model quality"
                value={quality}
                onChange={(q) => {
                  setQuality(q)
                  if (file && !busy) start(file, q)
                }}
                options={[
                  { value: 'standard', label: MODEL_INFO.standard.label },
                  { value: 'high', label: MODEL_INFO.high.label },
                ]}
              />
            )}
          </Field>

          <Field label="New background">
            {() => (
              <Segmented
                label="Background type"
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'transparent', label: 'None' },
                  { value: 'color', label: 'Colour' },
                  { value: 'blur', label: 'Blur' },
                  { value: 'image', label: 'Photo' },
                ]}
              />
            )}
          </Field>
          {kind === 'color' && <ColorPicker value={color} onChange={setColor} />}
          {kind === 'blur' && (
            <Field label="Blur strength">{(id) => <Slider id={id} value={blur} onChange={setBlur} min={2} max={40} format={(v) => `${v}px`} />}</Field>
          )}
          {kind === 'image' && (
            <Dropzone compact title={bgImage ? 'Change background photo' : 'Choose a background photo'} onFiles={async ([f]) => {
              try {
                setBgImage(await loadImage(f, { maxSide: 2048 }))
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not open this image.')
              }
            }} />
          )}

          <FormatPicker value={format} onChange={setFormat} />
          {transparentLost && <p className="text-xs text-amber-700 dark:text-amber-400">JPG has no transparency; the background will be white.</p>}

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button className="w-full" onClick={save} disabled={!result} busy={saving} icon={<Download className="size-4" />}>
              Download {result && `${result.width}×${result.height}`}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!result}
              icon={<Eye className="size-4" />}
              onPointerDown={() => setPeek(true)}
              onPointerUp={() => setPeek(false)}
              onPointerLeave={() => setPeek(false)}
            >
              Hold to see original
            </Button>
            {error && (
              <Button variant="secondary" className="w-full" icon={<Sparkles className="size-4" />} onClick={() => start(file)}>
                Try again
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full"
              disabled={busy}
              icon={<RotateCcw className="size-4" />}
              onClick={() => {
                setFile(null)
                setCutout(null)
                setOriginal(null)
              }}
            >
              Use another image
            </Button>
            <p className="text-center text-xs text-slate-500">Original: {formatBytes(file.size)}</p>
          </div>
        </Card>
      </aside>
    </div>
  )
}

function OriginalPreview({ file, dim }: { file: File; dim: boolean }) {
  const url = useObjectUrl(file)
  return url ? <img src={url} alt="Original" className={`max-h-[65vh] object-contain transition ${dim ? 'opacity-50 blur-[1px]' : ''}`} /> : null
}
