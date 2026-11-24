import { ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IMAGE_ACCEPT, isImageFile } from '../lib/files'
import { cx } from './cx'

/**
 * File picker that also accepts drag-and-drop and pasting from the clipboard.
 */
export function Dropzone({
  onFiles,
  multiple = false,
  accept = IMAGE_ACCEPT,
  compact = false,
  title,
  hint = 'JPG, PNG, WebP, AVIF, GIF, BMP',
}: {
  onFiles: (files: File[]) => void
  multiple?: boolean
  accept?: string
  compact?: boolean
  title?: string
  hint?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)
  const filesRef = useRef(onFiles)
  useEffect(() => {
    filesRef.current = onFiles
  })

  const take = (list: FileList | File[] | null | undefined) => {
    const all = Array.from(list ?? [])
    const files = all.filter(isImageFile)
    setRejected(
      files.length < all.length
        ? `${all.length - files.length === 1 ? 'That file is' : 'Some files are'} not an image and ${all.length - files.length === 1 ? 'was' : 'were'} skipped.`
        : null,
    )
    if (files.length) filesRef.current(multiple ? files : files.slice(0, 1))
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter(isImageFile)
      if (files.length) {
        e.preventDefault()
        filesRef.current(multiple ? files : files.slice(0, 1))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [multiple])

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files)
        }}
        className={cx(
          'group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition',
          compact ? 'p-4' : 'p-10 sm:p-14',
          over
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600 dark:hover:bg-slate-900/60',
        )}
      >
        <span
          className={cx(
            'rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
            compact ? 'p-2' : 'p-4',
          )}
        >
          <ImagePlus className={compact ? 'size-5' : 'size-8'} />
        </span>
        <span>
          <span className="block font-semibold text-slate-900 dark:text-white">
            {title ?? (multiple ? 'Choose images' : 'Choose an image')}
          </span>
          {!compact && (
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
              Drop here, tap to browse, or paste with Ctrl+V · {hint}
            </span>
          )}
        </span>
        <input
          ref={input}
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            take(e.target.files)
            e.target.value = ''
          }}
        />
      </button>
      {rejected && (
        <p role="alert" className="text-center text-sm text-amber-700 dark:text-amber-400">
          {rejected}
        </p>
      )}
    </div>
  )
}
