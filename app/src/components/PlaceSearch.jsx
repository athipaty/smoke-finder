import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../api.js'
import { useI18n } from '../i18n/index.jsx'

const DEBOUNCE_MS = 400

// Search box for a place, address, postcode or MRT exit (OneMap via our server).
// onPick({ name, address, lat, lng }); onClose() hides it.
export default function PlaceSearch({ onPick, onClose }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ status: 'idle', results: [], error: null })
  const input = useRef(null)

  useEffect(() => input.current?.focus(), [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setState({ status: 'idle', results: [], error: null })
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading', error: null }))
      searchPlaces(q)
        .then(({ results }) => !cancelled && setState({ status: 'done', results, error: null }))
        .catch((err) => !cancelled && setState({ status: 'error', results: [], error: err.message }))
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900">
      <div className="flex items-center gap-2">
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          enterKeyHint="search"
          maxLength={80}
          className="min-w-0 flex-1 rounded-xl bg-stone-100 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-go dark:bg-stone-800"
        />
        <button type="button" onClick={onClose} className="shrink-0 px-2 py-2 text-sm font-medium text-stone-500 dark:text-stone-400">
          {t('search.cancel')}
        </button>
      </div>

      {state.status === 'loading' && (
        <p className="px-1 pt-2 text-sm text-stone-500 dark:text-stone-400" role="status">
          {t('search.searching')}
        </p>
      )}
      {state.status === 'error' && (
        <p className="px-1 pt-2 text-sm text-stop dark:text-stop-dark" role="alert">
          {state.error}
        </p>
      )}
      {state.status === 'done' && state.results.length === 0 && (
        <p className="px-1 pt-2 text-sm text-stone-500 dark:text-stone-400">{t('search.none')}</p>
      )}
      {state.results.length > 0 && (
        <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          {state.results.map((p) => (
            <li key={`${p.name}|${p.lat},${p.lng}`}>
              <button type="button" onClick={() => onPick(p)} className="w-full px-1 py-2.5 text-left active:bg-stone-100 dark:active:bg-stone-800">
                <span className="block font-medium">{p.name}</span>
                {p.address && <span className="block text-sm text-stone-500 dark:text-stone-400">{p.address}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
