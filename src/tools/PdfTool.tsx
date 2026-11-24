import { ArrowDown, ArrowUp, FileDown, RotateCw, Trash, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { Alert, Button, Card, Field, Segmented, Select } from '../components/ui'
import { context2d, createCanvas, encode, loadImage } from '../lib/canvas'
import { downloadBlob } from '../lib/files'
import { formatBytes } from '../lib/format'
import { rotatedBounds } from '../lib/geometry'
import { imagesToPdf, mmToPt, type Orientation, type PageSize, type PdfPageImage } from '../lib/pdf'

interface Page {
  id: number
  file: File
  url: string
  rotation: number
}

const QUALITY = {
  high: { label: 'High', maxSide: 4000, q: 0.92 },
  balanced: { label: 'Balanced', maxSide: 2480, q: 0.8 },
  small: { label: 'Small file', maxSide: 1600, q: 0.6 },
} as const
type Quality = keyof typeof QUALITY

let nextId = 0

async function toJpegPage(file: File, rotation: number, quality: Quality): Promise<PdfPageImage> {
  const img = await loadImage(file)
  try {
    const { maxSide, q } = QUALITY[quality]
    const f = Math.min(1, maxSide / Math.max(img.width, img.height))
    const w = Math.round(img.width * f)
    const h = Math.round(img.height * f)
    const out = rotatedBounds({ width: w, height: h }, rotation)
    const c = createCanvas(out.width, out.height)
    const ctx = context2d(c)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    const blob = await encode(c, 'image/jpeg', q)
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height }
  } finally {
    img.close()
  }
}

export default function PdfTool() {
  const [pages, setPages] = useState<Page[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [margin, setMargin] = useState('10')
  const [quality, setQuality] = useState<Quality>('balanced')
  const [name, setName] = useState('document')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSize, setLastSize] = useState<number | null>(null)
  const pagesRef = useRef(pages)
  useEffect(() => {
    pagesRef.current = pages
  })
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const add = (files: File[]) => {
    setPages((p) => [...p, ...files.map((file) => ({ id: nextId++, file, url: URL.createObjectURL(file), rotation: 0 }))])
    setLastSize(null)
  }
  const move = (i: number, d: number) =>
    setPages((p) => {
      const j = i + d
      if (j < 0 || j >= p.length) return p
      const copy = [...p]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  const remove = (id: number) =>
    setPages((p) => {
      const gone = p.find((x) => x.id === id)
      if (gone) URL.revokeObjectURL(gone.url)
      return p.filter((x) => x.id !== id)
    })

  const build = async () => {
    setError(null)
    setBusy('Preparing pages…')
    try {
      const images: PdfPageImage[] = []
      for (const [i, p] of pages.entries()) {
        setBusy(`Preparing page ${i + 1} of ${pages.length}…`)
        images.push(await toJpegPage(p.file, p.rotation, quality))
      }
      setBusy('Building PDF…')
      const pdf = await imagesToPdf(images, { pageSize, orientation, margin: mmToPt(Number(margin)), title: name })
      setLastSize(pdf.size)
      downloadBlob(pdf, `${name.trim() || 'document'}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the PDF.')
    } finally {
      setBusy(null)
    }
  }

  if (!pages.length) return <Dropzone multiple onFiles={add} title="Choose images or scanned pages" />

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {pages.map((p, i) => (
            <li key={p.id} className="group relative rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <img src={p.url} alt={`Page ${i + 1}`} className="max-h-full max-w-full object-contain transition" style={{ transform: `rotate(${p.rotation}deg)` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="rounded bg-slate-900/80 px-1.5 text-xs font-semibold text-white">{i + 1}</span>
                <div className="flex">
                  <IconBtn label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn label="Move later" onClick={() => move(i, 1)} disabled={i === pages.length - 1}>
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label="Rotate page" onClick={() => setPages((ps) => ps.map((x) => (x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x)))}>
                    <RotateCw className="size-4" />
                  </IconBtn>
                  <IconBtn label="Remove page" onClick={() => remove(p.id)}>
                    <X className="size-4" />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <Dropzone multiple compact onFiles={add} title="Add more pages" />
      </div>

      <Card className="space-y-5 self-start">
        <Field label="Page size">
          {(id) => (
            <Select
              id={id}
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'US Letter' },
                { value: 'fit', label: 'Fit each image' },
              ]}
            />
          )}
        </Field>
        {pageSize !== 'fit' && (
          <Field label="Orientation">
            {() => (
              <Segmented
                label="Orientation"
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
              />
            )}
          </Field>
        )}
        <Field label="Margin">
          {() => (
            <Segmented
              label="Margin"
              value={margin}
              onChange={setMargin}
              options={[
                { value: '0', label: 'None' },
                { value: '10', label: 'Small' },
                { value: '20', label: 'Large' },
              ]}
            />
          )}
        </Field>
        <Field label="Image quality">
          {() => (
            <Segmented
              label="Image quality"
              value={quality}
              onChange={setQuality}
              options={(Object.keys(QUALITY) as Quality[]).map((k) => ({ value: k, label: QUALITY[k].label }))}
            />
          )}
        </Field>
        <Field label="File name">
          {(id) => (
            <input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-brand-600 dark:bg-slate-950 dark:ring-slate-700"
            />
          )}
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button className="w-full" onClick={build} busy={!!busy} icon={<FileDown className="size-4" />}>
            {busy ?? `Create PDF (${pages.length} page${pages.length > 1 ? 's' : ''})`}
          </Button>
          {lastSize !== null && <p className="text-center text-xs text-slate-500">Created {formatBytes(lastSize)}</p>}
          <Button
            variant="danger"
            className="w-full"
            disabled={!!busy}
            icon={<Trash className="size-4" />}
            onClick={() => {
              pages.forEach((p) => URL.revokeObjectURL(p.url))
              setPages([])
            }}
          >
            Clear all
          </Button>
        </div>
      </Card>
    </div>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {children}
    </button>
  )
}
