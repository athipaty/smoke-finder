// Sends app errors to our server so moderators see them (Moderation > Errors).
// Only the message, stack, page path and app version: no location, no device id.
const API = import.meta.env.VITE_API_URL ?? 'https://center-kitchen-backend.onrender.com/api/smoke'
const MAX_PER_PAGE_LOAD = 10

const sent = new Set()

// Not our bugs: browser extensions, a known harmless browser warning, network
// failures (shown to the user already), and cross-origin errors with no detail.
const IGNORE = [/extension:\/\//, /ResizeObserver loop/, /^Script error\.?$/, /Failed to fetch|NetworkError|Load failed/]

export function reportError(error, extra = '') {
  try {
    const message = String(error?.message ?? error ?? 'Unknown error').slice(0, 300)
    const stack = `${String(error?.stack ?? '').slice(0, 1800)}${extra ? `\n${extra}` : ''}`.slice(0, 2000)
    if (error?.offline || IGNORE.some((re) => re.test(message) || re.test(stack))) return
    if (sent.has(message) || sent.size >= MAX_PER_PAGE_LOAD) return
    sent.add(message)
    fetch(`${API}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack, page: window.location.pathname, version: __APP_VERSION__ }),
      keepalive: true, // still sent if the page is closing
    }).catch(() => {})
  } catch {
    // reporting must never cause an error itself
  }
}

// After a new release, a phone still running the old version may ask for a
// screen file that no longer exists. Reloading picks up the new version.
// Once per 10 minutes, so a real outage can't cause a reload loop.
export function isStaleBuild(error) {
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(String(error?.message ?? ''))
}
const RELOADED_AT = 'sf.staleReloadAt'
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0)
    if (Date.now() - last < 10 * 60_000) return false
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

window.addEventListener('error', (e) => reportError(e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => {
  if (isStaleBuild(e.reason) && reloadForNewVersion()) return
  reportError(e.reason)
})
