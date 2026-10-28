import { useCallback, useEffect, useState } from 'react'
import { admin } from '../api.js'
import { sinceText } from '../format.js'
import { useI18n } from '../i18n/index.jsx'

// App errors reported by phones, grouped by kind (English only, like the rest of /admin).
export default function ErrorsView() {
  const { t } = useI18n() // only for sinceText
  const [state, setState] = useState({ loading: true, errors: [], error: null })
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { errors } = await admin.call('/errors')
      setState({ loading: false, errors, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const fixed = async (id) => {
    try {
      await admin.call(`/errors/${id}`, { method: 'DELETE' })
      setState((s) => ({ ...s, errors: s.errors.filter((e) => e.id !== id) }))
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }))
    }
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Errors from people&apos;s phones, last 30 days. Mark one fixed once a new version is out; it comes back if it happens again.
      </p>
      {state.loading && <p className="mt-4 text-stone-500" role="status">Loading…</p>}
      {state.error && <p className="mt-4 text-stop dark:text-stop-dark" role="alert">{state.error}</p>}
      {!state.loading && !state.error && state.errors.length === 0 && <p className="mt-4 text-stone-500 dark:text-stone-400">No errors. 🎉</p>}
      <ul className="mt-3 space-y-3">
        {state.errors.map((e) => (
          <li key={e.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
            <p className="break-words font-mono text-sm font-semibold">{e.message}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {e.count}× · last {sinceText(e.lastAt, t)} · first {sinceText(e.firstAt, t)}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {[e.pages.join(', '), e.versions.join(', '), e.browsers.join(', ')].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-2 flex gap-2">
              {e.stack && (
                <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium dark:bg-stone-800">
                  {open === e.id ? 'Hide details' : 'Details'}
                </button>
              )}
              <button type="button" onClick={() => fixed(e.id)} className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium dark:bg-stone-800">
                Mark fixed
              </button>
            </div>
            {open === e.id && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-stone-100 p-2 text-xs dark:bg-stone-800">{e.stack}</pre>}
          </li>
        ))}
      </ul>
    </div>
  )
}
