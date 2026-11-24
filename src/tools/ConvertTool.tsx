import { useState } from 'react'
import { BatchTool, type Processor } from '../components/BatchTool'
import { FormatPicker, type FormatChoice } from '../components/FormatPicker'
import { Alert, ColorPicker, Field, Slider } from '../components/ui'
import { encode, render } from '../lib/canvas'
import { extFor, isLossy, supportsAlpha, type OutputMime } from '../lib/format'
import { renameFile } from '../lib/format'

export default function ConvertTool() {
  const [format, setFormat] = useState<FormatChoice>('image/jpeg')
  const [quality, setQuality] = useState(92)
  const [matte, setMatte] = useState<string | null>('#ffffff')
  const mime = (format === 'original' ? 'image/jpeg' : format) as OutputMime

  const process: Processor = async (file, img) => {
    const canvas = render(img, { size: { width: img.width, height: img.height } })
    const blob = await encode(canvas, mime, quality / 100, matte ?? '#ffffff')
    return { blob, name: renameFile(file.name, extFor(mime)), width: img.width, height: img.height }
  }

  return (
    <BatchTool
      actionLabel="Convert"
      process={process}
      optionsKey={JSON.stringify([format, quality, matte])}
      options={
        <>
          <FormatPicker value={format} onChange={setFormat} label="Convert to" />
          {isLossy(mime) && (
            <Field label="Quality">
              {(id) => <Slider id={id} value={quality} onChange={setQuality} min={10} max={100} format={(v) => `${v}%`} />}
            </Field>
          )}
          {!supportsAlpha(mime) && (
            <Field label="Background for transparent areas" hint="JPG cannot store transparency.">
              {() => <ColorPicker value={matte} onChange={setMatte} />}
            </Field>
          )}
          <Alert tone="info">
            Converting re-draws the pixels, so camera metadata such as GPS location and device details is removed.
          </Alert>
        </>
      }
    />
  )
}
