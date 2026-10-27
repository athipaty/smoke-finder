import { useCallback, useEffect, useState } from 'react'
import { admin } from '../api.js'
import { featureText, sinceText } from '../format.js'
import { useI18n } from '../i18n/index.jsx'
import MetricsView from '../components/MetricsView.jsx'

const FILTERS = [
  { id: 'review', label: 'Needs review' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'photos', label: 'Photo reports' },
  { id: 'all', label: 'All' },
]

function Login({ onDone }) {
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ busy: false, error: null })

  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, error: null })
    try {
      await admin.login(password)
      onDone()
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 w-full max-w-xs px-4">
      <h1 className="text-xl font-bold">Moderation</h1>
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Moderator password"
        aria-label="Moderator password"
        className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
      />
      {state.error && <p className="mt-2 text-sm text-stop dark:text-stop-dark" role="alert">{state.error}</p>}
      <button type="submit" disabled={state.busy || !password} className="mt-4 w-full rounded-xl bg-stone-900 py-3 font-semibold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
        {state.busy ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  )
}

function SpotCard({ spot, onChange, onRemoved }) {
  const { t } = useI18n() // moderation stays in English; the shared helpers just need t
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const photoAction = (action) => run(async () => onChange(await admin.call(`/spots/${spot.id}/photo`, { method: 'POST', body: { action } })))
  const restore = () => run(async () => onChange(await admin.call(`/spots/${spot.id}/restore`, { method: 'POST' })))
  const remove = () =>
    run(async () => {
      await admin.call(`/spots/${spot.id}`, { method: 'DELETE' })
      onRemoved(spot.id)
    })

  const button = 'rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:bg-stone-800'

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{spot.name ?? 'Unnamed spot'}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {spot.status} · added {sinceText(spot.createdAt, t)} · {featureText(spot, t) || 'no features ticked'}
          </p>
          <p className="mt-1 text-sm">
            ✓ {spot.hereCount} still here · {spot.goneCount} gone · {spot.notAllowedCount} not allowed · {spot.badPhotoCount} photo reports
          </p>
          <a
            href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#7c3aed] underline"
          >
            Open in Google Maps
          </a>
        </div>
        {spot.photoUrl && (
          <a href={spot.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img src={spot.photoUrl} alt="" className={`h-20 w-20 rounded-lg object-cover ${spot.photoHidden ? 'opacity-40' : ''}`} />
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {spot.status === 'hidden' && (
          <button type="button" disabled={busy} onClick={restore} className={button}>
            Restore spot
          </button>
        )}
        {spot.photoUrl && spot.photoHidden && (
          <button type="button" disabled={busy} onClick={() => photoAction('show')} className={button}>
            Show photo
          </button>
        )}
        {spot.photoUrl && !spot.photoHidden && (
          <button type="button" disabled={busy} onClick={() => photoAction('hide')} className={button}>
            Hide photo
          </button>
        )}
        {spot.photoUrl && (
          <button type="button" disabled={busy} onClick={() => photoAction('delete')} className={button}>
            Delete photo
          </button>
        )}
        {confirmDelete ? (
          <button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-stop px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            Tap again to delete spot
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className={`${button} text-stop dark:text-stop-dark`}>
            Delete spot
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-stop dark:text-stop-dark" role="alert">{error}</p>}
    </li>
  )
}

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(admin.loggedIn)
  const [view, setView] = useState('spots')
  const [filter, setFilter] = useState('review')
  const [state, setState] = useState({ status: 'idle', spots: [], counts: {}, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const { spots, counts } = await admin.call(`/spots?filter=${filter}`)
      setState({ status: 'done', spots, counts, error: null })
    } catch (err) {
      if (err.status === 401) setLoggedIn(false)
      setState((s) => ({ ...s, status: 'error', error: err.message }))
    }
  }, [filter])

  useEffect(() => {
    if (loggedIn) load()
  }, [loggedIn, load])

  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />

  const replace = (fresh) => setState((s) => ({ ...s, spots: s.spots.map((x) => (x.id === fresh.id ? fresh : x)) }))
  const removeLocal = (id) => setState((s) => ({ ...s, spots: s.spots.filter((x) => x.id !== id) }))
  const c = state.counts

  return (
    <main className="px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moderation</h1>
        <button
          type="button"
          onClick={() => {
            admin.logout()
            setLoggedIn(false)
          }}
          className="text-sm text-stone-500 underline dark:text-stone-400"
        >
          Log out
        </button>
      </div>
      <div className="mt-3 flex rounded-xl bg-stone-200 p-1 text-sm font-medium dark:bg-stone-800" role="tablist">
        {[
          { id: 'spots', label: 'Spots' },
          { id: 'metrics', label: 'Metrics' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 rounded-lg py-1.5 ${view === v.id ? 'bg-white shadow-sm dark:bg-stone-900' : 'text-stone-600 dark:text-stone-300'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'metrics' ? (
        <MetricsView />
      ) : (
        <>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            {c.verified ?? 0} verified · {c.unverified ?? 0} unverified · {c.hidden ?? 0} hidden
          </p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  filter === f.id ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-white shadow-sm dark:bg-stone-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {state.status === 'loading' && <p className="mt-4 text-stone-500" role="status">Loading…</p>}
          {state.error && <p className="mt-4 text-stop dark:text-stop-dark" role="alert">{state.error}</p>}
          {state.status === 'done' && state.spots.length === 0 && <p className="mt-4 text-stone-500 dark:text-stone-400">Nothing here.</p>}

          <ul className="mt-4 space-y-3">
            {state.spots.map((s) => (
              <SpotCard key={s.id} spot={s} onChange={replace} onRemoved={removeLocal} />
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
