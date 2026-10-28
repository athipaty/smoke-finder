import { useCallback, useEffect, useState } from 'react'
import { admin } from '../api.js'
import { sinceText } from '../format.js'
import { useI18n } from '../i18n/index.jsx'

// User problem reports, for moderators (English only, like the rest of /admin).
const KIND_LABEL = { wrong_answer: '🧭 Answer looks wrong', spot: '📍 Spot or photo', app: '📱 App problem', other: '💬 Other' }
const VERDICT_LABEL = { green: 'allowed', amber: 'check the signs', red: 'not allowed' }

export default function ReportsView() {
  const { t } = useI18n() // only for sinceText
  const [status, setStatus] = useState('open')
  const [state, setState] = useState({ loading: true, reports: [], open: 0, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { reports, open } = await admin.call(`/reports?status=${status}`)
      setState({ loading: false, reports, open, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const mark = async (id, next) => {
    try {
      await admin.call(`/reports/${id}`, { method: 'POST', body: { status: next } })
      setState((s) => ({
        ...s,
        reports: s.reports.filter((r) => r.id !== id || status === 'all').map((r) => (r.id === id ? { ...r, status: next } : r)),
        open: s.open + (next === 'done' ? -1 : 1),
      }))
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }))
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500 dark:text-stone-400">{state.open} open</p>
        <div className="flex gap-2">
          {['open', 'done', 'all'].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                status === s ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-white shadow-sm dark:bg-stone-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {state.loading && <p className="mt-4 text-stone-500" role="status">Loading…</p>}
      {state.error && <p className="mt-4 text-stop dark:text-stop-dark" role="alert">{state.error}</p>}
      {!state.loading && state.reports.length === 0 && <p className="mt-4 text-stone-500 dark:text-stone-400">No reports.</p>}

      <ul className="mt-3 space-y-3">
        {state.reports.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-stone-900">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{KIND_LABEL[r.kind] ?? r.kind}</p>
              <p className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                {sinceText(r.createdAt, t)} · {r.lang}
              </p>
            </div>
            {r.message && <p className="mt-1 whitespace-pre-wrap">{r.message}</p>}
            {r.verdict && (
              <p className="mt-1 text-stone-600 dark:text-stone-300">
                App said: {VERDICT_LABEL[r.verdict]}
                {r.rules.length > 0 && ` (${r.rules.join(', ')})`}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {r.lat !== null && (
                <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] underline">
                  {r.lat.toFixed(5)}, {r.lng.toFixed(5)} on Google Maps
                </a>
              )}
              <button
                type="button"
                onClick={() => mark(r.id, r.status === 'open' ? 'done' : 'open')}
                className="ml-auto rounded-lg bg-stone-100 px-3 py-1.5 font-medium dark:bg-stone-800"
              >
                {r.status === 'open' ? 'Mark done' : 'Reopen'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">Reports are deleted automatically after 180 days.</p>
    </div>
  )
}
