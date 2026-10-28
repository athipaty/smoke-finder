import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin } from '../api.js'
import { featureText, sinceText } from '../format.js'
import { useI18n } from '../i18n/index.jsx'
import MetricsView from '../components/MetricsView.jsx'
import ReportsView from '../components/ReportsView.jsx'
import ErrorsView from '../components/ErrorsView.jsx'

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
    <main className="mx-auto mt-16 w-full max-w-xs px-4">
    <form onSubmit={submit}>
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
    </main>
  )
}

const EDIT_FEATURES = [
  { key: 'sheltered', label: 'Sheltered' },
  { key: 'hasAshtray', label: 'Ashtray or bin' },
  { key: 'hasSeating', label: 'Seats' },
]

// Name, features, and whether the moderator vouches for the spot.
function EditSpot({ spot, onSave, onCancel, busy }) {
  const [form, setForm] = useState({
    name: spot.name ?? '',
    hours: spot.hours ?? '',
    sheltered: spot.sheltered,
    hasAshtray: spot.hasAshtray,
    hasSeating: spot.hasSeating,
    verified: spot.addedByModerator,
  })
  const tick = (key) => (e) => setForm({ ...form, [key]: e.target.checked })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
      className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-800/60"
    >
      <label className="block">
        <span className="font-medium">Name</span>
        <input
          type="text"
          maxLength={60}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Unnamed spot"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-900"
        />
      </label>
      <label className="block">
        <span className="font-medium">Opening hours</span>
        <input
          type="text"
          maxLength={40}
          value={form.hours}
          onChange={(e) => setForm({ ...form, hours: e.target.value })}
          placeholder='e.g. 7am-11pm, or "24h"; empty = unknown'
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 dark:border-stone-700 dark:bg-stone-900"
        />
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {EDIT_FEATURES.map((f) => (
          <label key={f.key} className="flex items-center gap-1.5">
            <input type="checkbox" checked={form[f.key]} onChange={tick(f.key)} className="h-4 w-4 accent-go" />
            {f.label}
          </label>
        ))}
      </div>
      <label className="flex items-start gap-1.5">
        <input type="checkbox" checked={form.verified} onChange={tick('verified')} className="mt-0.5 h-4 w-4 accent-go" />
        <span>
          Verified by moderator
          <span className="block text-xs text-stone-500 dark:text-stone-400">Shows as "Added by the Smoke Finder team". Off: verified only after 3 "Still here" votes.</span>
        </span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy} className="rounded-lg bg-stone-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 font-medium text-stone-600 dark:text-stone-300">
          Cancel
        </button>
      </div>
    </form>
  )
}

function SpotCard({ spot, onChange, onRemoved }) {
  const { t } = useI18n() // moderation stays in English; the shared helpers just need t
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
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
  const save = (body) =>
    run(async () => {
      onChange(await admin.call(`/spots/${spot.id}`, { method: 'PATCH', body }))
      setEditing(false)
    })
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
            {spot.status}
            {spot.addedByModerator && ' (moderator)'}
            {spot.source === 'sdc' && ' · Sentosa list'}
            {spot.approximate && ' · APPROXIMATE position'} · added {sinceText(spot.createdAt, t)} · {featureText(spot, t) || 'no features ticked'}
            {spot.hours && ` · hours: ${spot.hours}`}
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

      {editing && <EditSpot spot={spot} busy={busy} onSave={save} onCancel={() => setEditing(false)} />}

      <div className="mt-3 flex flex-wrap gap-2">
        {!editing && (
          <button type="button" disabled={busy} onClick={() => setEditing(true)} className={button}>
            Edit
          </button>
        )}
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
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('') // query, applied a moment after typing stops
  const [state, setState] = useState({ status: 'idle', spots: [], counts: {}, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const { spots, counts } = await admin.call(`/spots?${new URLSearchParams({ filter, ...(q && { q }) })}`)
      setState({ status: 'done', spots, counts, error: null })
    } catch (err) {
      if (err.status === 401) setLoggedIn(false)
      setState((s) => ({ ...s, status: 'error', error: err.message }))
    }
  }, [filter, q])

  useEffect(() => {
    if (loggedIn) load()
  }, [loggedIn, load])

  useEffect(() => {
    const timer = setTimeout(() => setQ(query.trim()), 400)
    return () => clearTimeout(timer)
  }, [query])

  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />

  const replace = (fresh) => setState((s) => ({ ...s, spots: s.spots.map((x) => (x.id === fresh.id ? fresh : x)) }))
  const removeLocal = (id) => setState((s) => ({ ...s, spots: s.spots.filter((x) => x.id !== id) }))
  const c = state.counts

  return (
    <main className="px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moderation</h1>
        <Link to="/add" className="ml-auto mr-4 text-sm font-medium text-go underline dark:text-go-dark">
          Add spots anywhere
        </Link>
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
          { id: 'reports', label: 'Reports' },
          { id: 'metrics', label: 'Metrics' },
          { id: 'errors', label: 'Errors' },
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
      ) : view === 'reports' ? (
        <ReportsView />
      ) : view === 'errors' ? (
        <ErrorsView />
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
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spots by name"
            aria-label="Search spots by name"
            maxLength={60}
            className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          />

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
