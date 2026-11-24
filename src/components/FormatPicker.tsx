import { FORMAT_LABEL, type OutputMime } from '../lib/format'
import { useFormats } from '../hooks/useFormats'
import { Field, Segmented } from './ui'

export type FormatChoice = OutputMime | 'original'

export function FormatPicker({
  value,
  onChange,
  allowOriginal = false,
  only,
  label = 'Output format',
}: {
  value: FormatChoice
  onChange: (v: FormatChoice) => void
  allowOriginal?: boolean
  only?: OutputMime[]
  label?: string
}) {
  const detected = useFormats()
  // JPG and PNG work everywhere, so show them while detection runs.
  const all = detected ?? (['image/jpeg', 'image/png'] as OutputMime[])
  const supported = all.filter((f) => !only || only.includes(f))
  const missingWebp = !!detected && !detected.includes('image/webp') && (!only || only.includes('image/webp'))
  const options: { value: FormatChoice; label: string }[] = [
    ...(allowOriginal ? [{ value: 'original' as const, label: 'Same' }] : []),
    ...supported.map((f) => ({ value: f, label: FORMAT_LABEL[f] })),
  ]
  return (
    <Field
      label={label}
      hint={missingWebp ? 'This browser can’t save WebP. Use Chrome, Edge or Firefox if you need WebP.' : undefined}
    >
      {() => <Segmented label={label} value={value} onChange={onChange} options={options} />}
    </Field>
  )
}
