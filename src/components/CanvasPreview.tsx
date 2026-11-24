import { useEffect, useRef } from 'react'
import { cx } from './cx'

/** Shows an off-screen canvas by copying it into a visible one, scaled to fit with CSS. */
export function CanvasPreview({ source, className, label }: { source: HTMLCanvasElement | null; className?: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !source) return
    el.width = source.width
    el.height = source.height
    const ctx = el.getContext('2d')
    ctx?.clearRect(0, 0, el.width, el.height)
    ctx?.drawImage(source, 0, 0)
  }, [source])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={cx('block h-auto max-w-full', className)}
      style={source ? { aspectRatio: `${source.width} / ${source.height}` } : undefined}
    />
  )
}
