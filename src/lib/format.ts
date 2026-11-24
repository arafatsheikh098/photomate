export type OutputMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

export const FORMAT_LABEL: Record<OutputMime, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
}

const EXT: Record<OutputMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export function extFor(mime: OutputMime): string {
  return EXT[mime]
}

/** True for formats whose encoder takes a quality setting. */
export function isLossy(mime: OutputMime): boolean {
  return mime !== 'image/png'
}

/** True for formats that can store an alpha channel. */
export function supportsAlpha(mime: OutputMime): boolean {
  return mime !== 'image/jpeg'
}

/** Formats a canvas can definitely read back; anything else is treated as JPEG on output. */
export function asOutputMime(type: string): OutputMime {
  return (Object.keys(EXT) as OutputMime[]).includes(type as OutputMime)
    ? (type as OutputMime)
    : 'image/jpeg'
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`
}

/** "holiday photo.HEIC" + "webp" → "holiday photo.webp"; adds an optional suffix before the extension. */
export function renameFile(name: string, ext: string, suffix = ''): string {
  const dot = name.lastIndexOf('.')
  const stem = (dot > 0 ? name.slice(0, dot) : name) || 'image'
  return `${stem}${suffix}.${ext}`
}

/** Percentage saved going from `before` to `after` bytes (negative when the file grew). */
export function savedPercent(before: number, after: number): number {
  if (before <= 0) return 0
  return Math.round((1 - after / before) * 100)
}

/** Makes names unique inside one ZIP: a.jpg, a (2).jpg, a (3).jpg … */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((n) => {
    const dot = n.lastIndexOf('.')
    const stem = dot > 0 ? n.slice(0, dot) : n
    const ext = dot > 0 ? n.slice(dot) : ''
    let candidate = n
    for (let i = 2; used.has(candidate); i++) candidate = `${stem} (${i})${ext}`
    used.add(candidate)
    return candidate
  })
}
