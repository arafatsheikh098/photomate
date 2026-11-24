import { Lock, Search, WifiOff, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../components/ui'
import { TOOLS } from './registry'

const PERKS = [
  { icon: Lock, title: 'Private', text: 'Everything runs in your browser. Nothing is uploaded.' },
  { icon: Zap, title: 'Fast', text: 'No upload or download wait. Batch dozens of photos at once.' },
  { icon: WifiOff, title: 'Works offline', text: 'Install it as an app and use it without internet.' },
]

export default function Home() {
  const [q, setQ] = useState('')
  const tools = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return TOOLS
    return TOOLS.filter((t) => `${t.name} ${t.blurb} ${t.keywords}`.toLowerCase().includes(s))
  }, [q])

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-3xl pt-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl dark:text-white">
          Every everyday image tool, <span className="text-brand-600 dark:text-brand-400">private by design</span>
        </h1>
        <p className="mt-4 text-lg text-pretty text-slate-600 dark:text-slate-400">
          Compress to 100 KB, resize for forms, make passport photos, remove backgrounds and build PDFs. It is free, has
          no watermark, and runs entirely on your device.
        </p>
        <div className="relative mx-auto mt-8 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools: compress, passport, pdf…"
            aria-label="Search tools"
            className="w-full rounded-xl border-0 bg-white py-3 pr-4 pl-10 text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-brand-600 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
          />
        </div>
      </section>

      <section aria-label="Tools" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t) => (
          <Link
            key={t.slug}
            to={`/${t.slug}`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
          >
            <span className={cx('inline-flex rounded-xl p-3', t.tint)}>
              <t.icon className="size-6" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
              {t.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.blurb}</p>
          </Link>
        ))}
        {tools.length === 0 && <p className="col-span-full text-center text-slate-500">No tool matches “{q}”.</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {PERKS.map((p) => (
          <div key={p.title} className="flex gap-3 rounded-2xl bg-brand-50 p-5 dark:bg-brand-900/20">
            <p.icon className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{p.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{p.text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
