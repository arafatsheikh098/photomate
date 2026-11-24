import { useEffect, useState } from 'react'
import { supportedFormats } from '../lib/canvas'
import type { OutputMime } from '../lib/format'

/** Output formats the current browser can encode; JPG/PNG until detection finishes. */
export function useFormats(): OutputMime[] {
  const [formats, setFormats] = useState<OutputMime[]>(['image/jpeg', 'image/png'])
  useEffect(() => {
    let live = true
    supportedFormats().then((f) => live && setFormats(f))
    return () => {
      live = false
    }
  }, [])
  return formats
}
