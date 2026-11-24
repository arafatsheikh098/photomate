import { Suspense } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout, ToolHeader } from './components/Layout'
import { Progress } from './components/ui'
import Home from './tools/Home'
import { TOOLS } from './tools/registry'

function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-brand-700 underline dark:text-brand-300">
        Back to all tools
      </Link>
    </div>
  )
}

export default function App() {
  return (
    // Hash routing: GitHub Pages serves a single index.html and has no rewrite rules.
    <HashRouter>
      <Layout>
        <Suspense fallback={<Progress value={null} label="Loading tool…" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {TOOLS.map((t) => (
              <Route
                key={t.slug}
                path={`/${t.slug}`}
                element={
                  <>
                    <ToolHeader title={t.name} description={t.blurb} icon={t.icon} tint={t.tint} />
                    <ErrorBoundary key={t.slug}>
                      <t.Component />
                    </ErrorBoundary>
                  </>
                }
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  )
}
