import { zip } from 'fflate'
import { uniqueNames } from './format'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Bundles files into a ZIP. Images are already compressed, so entries are stored, not deflated. */
export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const names = uniqueNames(files.map((f) => f.name))
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {}
  await Promise.all(
    files.map(async (f, i) => {
      entries[names[i]] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }]
    }),
  )
  const data = await new Promise<Uint8Array>((resolve, reject) =>
    zip(entries, (err, out) => (err ? reject(err) : resolve(out))),
  )
  return new Blob([data as BlobPart], { type: 'application/zip' })
}

export const IMAGE_ACCEPT = 'image/*,.heic,.heif'

export function isImageFile(f: File): boolean {
  return f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif|tiff?)$/i.test(f.name)
}
