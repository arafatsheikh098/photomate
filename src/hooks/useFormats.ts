import { useEffect, useState } from 'react'
import { supportedFormats } from '../lib/canvas'
import type { OutputMime } from '../lib/format'

/** Output formats the current browser can encode, or null while detection is running. */
export function useFormats(): OutputMime[] | null {
  const [formats, setFormats] = useState<OutputMime[] | null>(null)
  useEffect(() => {
    let live = true
    supportedFormats().then((f) => live && setFormats(f))
    return () => {
      live = false
    }
  }, [])
  return formats
}
