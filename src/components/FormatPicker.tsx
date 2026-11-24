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
  const supported = useFormats().filter((f) => !only || only.includes(f))
  const options: { value: FormatChoice; label: string }[] = [
    ...(allowOriginal ? [{ value: 'original' as const, label: 'Same' }] : []),
    ...supported.map((f) => ({ value: f, label: FORMAT_LABEL[f] })),
  ]
  return (
    <Field label={label}>
      {() => <Segmented label={label} value={value} onChange={onChange} options={options} />}
    </Field>
  )
}
