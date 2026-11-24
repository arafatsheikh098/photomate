import { LoaderCircle, TriangleExclamationPoint, Info } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600 disabled:bg-brand-600/50',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950',
}

export function Button({
  variant = 'primary',
  busy,
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        className,
      )}
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700'

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  suffix,
}: {
  id?: string
  value: number | ''
  onChange: (v: number | '') => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className={cx(inputClass, suffix && 'pr-12')}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  id?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        className="w-full"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
        {format ? format(value) : value}
      </span>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 dark:bg-slate-700" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

const SWATCHES = ['#ffffff', '#f1f5f9', '#dbeafe', '#3b82f6', '#1e3a8a', '#ef4444', '#000000']

export function ColorPicker({ value, onChange, transparent }: { value: string | null; onChange: (v: string | null) => void; transparent?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {transparent && (
        <button
          type="button"
          title="Transparent"
          aria-label="Transparent"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cx('checker size-8 rounded-full ring-1 ring-slate-300 dark:ring-slate-600', value === null && 'ring-2 ring-brand-600 ring-offset-2 dark:ring-offset-slate-900')}
        />
      )}
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          aria-label={`Colour ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={cx('size-8 rounded-full ring-1 ring-slate-300 dark:ring-slate-600', value === c && 'ring-2 ring-brand-600 ring-offset-2 dark:ring-offset-slate-900')}
        />
      ))}
      <label className="relative size-8 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-1 ring-slate-300 dark:ring-slate-600" title="Custom colour">
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value ?? '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom colour"
        />
      </label>
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  const Icon = tone === 'error' ? TriangleExclamationPoint : Info
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex gap-2 rounded-lg p-3 text-sm',
        tone === 'error'
          ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200'
          : 'bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Progress({ value, label }: { value: number | null; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={cx('h-full rounded-full bg-brand-600 transition-[width]', value === null && 'w-1/3 animate-pulse')}
          style={value === null ? undefined : { width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  )
}
