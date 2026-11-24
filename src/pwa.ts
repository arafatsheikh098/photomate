import { registerSW } from 'virtual:pwa-register'

type Listener = () => void
let updateReady = false
const listeners = new Set<Listener>()

/** True when the user has an image open, so a surprise reload would lose their work. */
function hasWorkInProgress() {
  return !!document.querySelector('main img, main canvas')
}

const RELOADED_FOR = 'chobi-reloaded-for'

/** Reload now if nothing is open; otherwise show the "new version" bar. */
function applyUpdate(target: string) {
  if (!hasWorkInProgress()) {
    // Never loop: reload at most once per target build.
    if (sessionStorage.getItem(RELOADED_FOR) === target) return
    sessionStorage.setItem(RELOADED_FOR, target)
    window.location.reload()
    return
  }
  if (!updateReady) {
    updateReady = true
    listeners.forEach((l) => l())
  }
}

/** The page's controller changes when a new service worker takes over (skipWaiting + clientsClaim). */
function nextControllerChange(timeoutMs: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', done)
      resolve()
    }
    navigator.serviceWorker.addEventListener('controllerchange', done)
    setTimeout(done, timeoutMs)
  })
}

/**
 * Compares this page's build with the one live on the server. Service-worker events alone
 * are not enough: with skipWaiting the new worker can activate during page load, before any
 * listener exists, leaving the tab on the old cached code. version.json is never precached,
 * so this always asks the network (and quietly does nothing offline).
 */
async function checkVersion() {
  let live: string
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    live = ((await res.json()) as { id: string }).id
  } catch {
    return
  }
  if (!live || live === __BUILD_ID__) {
    sessionStorage.removeItem(RELOADED_FOR)
    return
  }
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) {
    await reg.update().catch(() => {})
    // Wait for the new worker to take control so the reload is served the new files.
    if (reg.installing || reg.waiting) {
      const changed = nextControllerChange(30_000)
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
      await changed
    }
  }
  applyUpdate(live)
}

/**
 * Registers the service worker and keeps open tabs on the latest build.
 */
export function startServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  registerSW({
    immediate: true,
    onNeedReload: () => applyUpdate('sw-update'),
  })
  checkVersion()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion()
  })
}

export function subscribeUpdate(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const isUpdateReady = () => updateReady

const CHUNK_RELOAD = 'chobi-chunk-reload'

/**
 * Lazy-import wrapper for route chunks. After a deploy, an open tab may ask for a chunk
 * name that no longer exists; reload once to pick up the new build instead of failing.
 */
export function importWithReload<T>(load: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      const mod = await load()
      sessionStorage.removeItem(CHUNK_RELOAD)
      return mod
    } catch (e) {
      if (!sessionStorage.getItem(CHUNK_RELOAD)) {
        sessionStorage.setItem(CHUNK_RELOAD, '1')
        window.location.reload()
        return new Promise<T>(() => {})
      }
      throw e
    }
  }
}
