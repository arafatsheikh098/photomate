import { Lock, Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { TOOLS } from '../tools/registry'
import { cx } from './ui'

const REPO_URL = 'https://github.com/arafatsheikh098/chobi'

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('chobi-theme', dark ? 'dark' : 'light')
    } catch {
      /* private mode */
    }
  }, [dark])
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
      <span className="text-lg tracking-tight">
        Chobi <span className="font-normal text-slate-400">ছবি</span>
      </span>
    </Link>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Source code on GitHub"
            >
              <GitHubMark className="size-5" />
            </a>
            <ThemeToggle />
          </div>
        </div>
        {pathname !== '/' && (
          <nav aria-label="Tools" className="mx-auto max-w-6xl overflow-x-auto px-4 [scrollbar-width:none]">
            <ul className="flex gap-1 pb-2">
              {TOOLS.map((t) => (
                <li key={t.slug}>
                  <NavLink
                    to={`/${t.slug}`}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                      )
                    }
                  >
                    <t.icon className="size-4" />
                    {t.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">{children}</main>

      <footer className="border-t border-slate-200 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <p className="flex items-center gap-1.5">
            <Lock className="size-4" /> Your images never leave this device. No uploads, no account, no watermark.
          </p>
          <p>
            Open source ·{' '}
            <a className="underline hover:text-slate-900 dark:hover:text-white" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export function ToolHeader({ title, description, icon: Icon, tint }: { title: string; description: string; icon: typeof Lock; tint: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className={cx('rounded-xl p-3', tint)}>
        <Icon className="size-6" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{title}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}
