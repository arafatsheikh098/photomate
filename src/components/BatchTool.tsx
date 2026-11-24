import { Archive, CircleCheck, Download, Trash, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { loadImage, originalSizeOf } from '../lib/canvas'
import { downloadBlob, zipFiles } from '../lib/files'
import { formatBytes, savedPercent } from '../lib/format'
import { Compare } from './Compare'
import { Dropzone } from './Dropzone'
import { Alert, Button, Card, Progress } from './ui'
import { cx } from './cx'

export interface BatchResult {
  blob: Blob
  name: string
  width: number
  height: number
  note?: string
  warn?: boolean
}

export type Processor = (file: File, img: ImageBitmap) => Promise<BatchResult>

interface Item {
  id: string
  file: File
  url: string
  width?: number
  height?: number
  status: 'pending' | 'working' | 'done' | 'error'
  result?: BatchResult & { url: string }
  error?: string
}

let nextId = 0

/**
 * Shared shell for tools that apply the same operation to many images:
 * queue, sequential processing, per-file results and ZIP download.
 */
export function BatchTool({
  options,
  process,
  actionLabel,
  optionsKey,
  compare = true,
}: {
  options: ReactNode
  process: Processor
  actionLabel: string
  /** Changes whenever the options change, so finished results can be marked out of date. */
  optionsKey: string
  /** Show a before/after slider for a single image; off when the output shape changes. */
  compare?: boolean
}) {
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const [doneKey, setDoneKey] = useState<string | null>(null)
  const [zipping, setZipping] = useState(false)
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })

  // Revoke every object URL when the tool unmounts.
  useEffect(
    () => () => {
      for (const it of itemsRef.current) {
        URL.revokeObjectURL(it.url)
        if (it.result) URL.revokeObjectURL(it.result.url)
      }
    },
    [],
  )

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it)))

  const add = (files: File[]) => {
    setItems((list) => [
      ...list,
      ...files.map((file) => ({ id: String(nextId++), file, url: URL.createObjectURL(file), status: 'pending' as const })),
    ])
    setDoneKey(null)
  }

  const remove = (id: string) => {
    setItems((list) => {
      const it = list.find((x) => x.id === id)
      if (it) {
        URL.revokeObjectURL(it.url)
        if (it.result) URL.revokeObjectURL(it.result.url)
      }
      return list.filter((x) => x.id !== id)
    })
  }

  const clear = () => {
    for (const it of items) {
      URL.revokeObjectURL(it.url)
      if (it.result) URL.revokeObjectURL(it.result.url)
    }
    setItems([])
    setDoneKey(null)
  }

  const run = async () => {
    setRunning(true)
    const key = optionsKey
    // Process one at a time: phone photos are large and decoding many at once can exhaust memory.
    for (const it of itemsRef.current) {
      patch(it.id, { status: 'working', error: undefined })
      let img: ImageBitmap | undefined
      try {
        img = await loadImage(it.file)
        const res = await process(it.file, img)
        const orig = originalSizeOf(img)
        if (orig.width !== img.width) {
          const scaled = `Very large photo: reduced from ${orig.width}×${orig.height} to fit this browser.`
          res.note = res.note ? `${scaled} ${res.note}` : scaled
        }
        if (it.result) URL.revokeObjectURL(it.result.url)
        patch(it.id, {
          status: 'done',
          width: orig.width,
          height: orig.height,
          result: { ...res, url: URL.createObjectURL(res.blob) },
        })
      } catch (e) {
        patch(it.id, { status: 'error', error: e instanceof Error ? e.message : String(e) })
      } finally {
        img?.close()
      }
      // Let the browser paint progress between files.
      await new Promise((r) => setTimeout(r, 0))
    }
    setDoneKey(key)
    setRunning(false)
  }

  const finished = items.filter((i) => i.status === 'done' && i.result)
  const stale = doneKey !== null && doneKey !== optionsKey
  const progress = items.length ? items.filter((i) => i.status === 'done' || i.status === 'error').length / items.length : 0
  const totalBefore = finished.reduce((s, i) => s + i.file.size, 0)
  const totalAfter = finished.reduce((s, i) => s + i.result!.blob.size, 0)

  const downloadAll = async () => {
    if (finished.length === 1) {
      const r = finished[0].result!
      downloadBlob(r.blob, r.name)
      return
    }
    setZipping(true)
    try {
      const zip = await zipFiles(finished.map((i) => ({ name: i.result!.name, blob: i.result!.blob })))
      downloadBlob(zip, `chobi-${actionLabel.toLowerCase()}-${finished.length}-images.zip`)
    } finally {
      setZipping(false)
    }
  }

  if (!items.length) return <Dropzone multiple onFiles={add} />

  const single = items.length === 1 && items[0].status === 'done' && items[0].result ? items[0] : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-2 space-y-4 lg:order-1">
        {single &&
          (compare ? (
            <Compare before={single.url} after={single.result!.url} />
          ) : (
            <div className="checker overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800">
              <img src={single.result!.url} alt="Result" className="mx-auto block max-h-[60vh] object-contain" />
            </div>
          ))}

        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 p-3">
                <img
                  src={it.result?.url ?? it.url}
                  alt=""
                  loading="lazy"
                  className="checker size-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white" title={it.file.name}>
                    {it.file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatBytes(it.file.size)}
                    {it.width && ` · ${it.width}×${it.height}`}
                    {it.result && (
                      <>
                        {' → '}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatBytes(it.result.blob.size)} · {it.result.width}×{it.result.height}
                        </span>
                        <SavedBadge before={it.file.size} after={it.result.blob.size} />
                      </>
                    )}
                  </p>
                  {it.result?.note && (
                    <p className={cx('text-xs', it.result.warn ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500')}>
                      {it.result.note}
                    </p>
                  )}
                  {it.error && <p className="text-xs text-red-600 dark:text-red-400">{it.error}</p>}
                  {it.status === 'working' && <p className="text-xs text-brand-700 dark:text-brand-300">Working…</p>}
                </div>
                {it.result && (
                  <Button
                    variant="secondary"
                    className="px-2.5"
                    aria-label={`Download ${it.result.name}`}
                    onClick={() => downloadBlob(it.result!.blob, it.result!.name)}
                    icon={<Download className="size-4" />}
                  />
                )}
                <Button variant="ghost" className="px-2" aria-label={`Remove ${it.file.name}`} onClick={() => remove(it.id)} disabled={running}>
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
        <Dropzone multiple compact onFiles={add} title="Add more images" />
      </div>

      <aside className="order-1 space-y-4 lg:order-2">
        <Card className="space-y-5">
          {options}
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            {running && <Progress value={progress} label={`Processing ${Math.round(progress * items.length)} of ${items.length}…`} />}
            {stale && !running && <Alert tone="info">Options changed. Run again to update the results.</Alert>}
            <Button className="w-full" onClick={run} busy={running}>
              {actionLabel} {items.length > 1 ? `${items.length} images` : 'image'}
            </Button>
            {finished.length > 0 && !running && (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={downloadAll}
                  busy={zipping}
                  icon={finished.length > 1 ? <Archive className="size-4" /> : <Download className="size-4" />}
                >
                  {finished.length > 1 ? `Download all as ZIP (${formatBytes(totalAfter)})` : 'Download'}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-center text-sm text-slate-600 dark:text-slate-400">
                  <CircleCheck className="size-4 text-emerald-600" />
                  {formatBytes(totalBefore)} → {formatBytes(totalAfter)}
                  <SavedBadge before={totalBefore} after={totalAfter} />
                </p>
              </>
            )}
            <Button variant="danger" className="w-full" onClick={clear} disabled={running} icon={<Trash className="size-4" />}>
              Clear all
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  )
}

function SavedBadge({ before, after }: { before: number; after: number }) {
  const p = savedPercent(before, after)
  if (p === 0) return null
  return (
    <span
      className={cx(
        'ml-1.5 rounded px-1 py-0.5 text-[11px] font-semibold',
        p > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      )}
    >
      {p > 0 ? `−${p}%` : `+${-p}%`}
    </span>
  )
}
