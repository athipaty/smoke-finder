import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGeo } from '../geo.jsx'
import { checkSpot } from '../api.js'
import { load, KEYS } from '../storage.js'
import VerdictCard from '../components/VerdictCard.jsx'

const SLOW_MS = 3000 // the free backend can take ~30 s to wake up

export default function Check() {
  const { geo, locate } = useGeo()
  const [state, setState] = useState({ status: 'idle', result: null, error: null })
  const [slow, setSlow] = useState(false)

  // Check straight away on open if the user has allowed location before.
  useEffect(() => {
    if (geo.status === 'idle' && load(KEYS.locationAllowed) === '1') locate()
  }, [geo.status, locate])

  useEffect(() => {
    if (geo.status !== 'ready') return
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading', error: null }))
    setSlow(false)
    const timer = setTimeout(() => setSlow(true), SLOW_MS)
    checkSpot(geo.coords)
      .then((result) => !cancelled && setState({ status: 'done', result, error: null }))
      .catch((err) => !cancelled && setState({ status: 'error', result: null, error: err.message }))
      .finally(() => clearTimeout(timer))
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [geo.status, geo.at, geo.coords])

  const busy = geo.status === 'locating' || state.status === 'loading'
  const result = state.status === 'done' ? state.result : null

  return (
    <main className="flex flex-1 flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Can I smoke here?</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Singapore only · NEA rules</p>

      <div className="mt-6">
        {result && <VerdictCard result={result} />}

        {busy && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-stone-900" role="status">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-go dark:border-stone-700 dark:border-t-go-dark" />
            <p className="mt-3 font-medium">{geo.status === 'locating' ? 'Finding your location…' : 'Checking the rules here…'}</p>
            {slow && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">The server is waking up. This can take up to 30 seconds.</p>}
          </div>
        )}

        {!busy && (geo.error || state.error) && (
          <p className="rounded-2xl bg-white p-5 text-stop shadow-sm dark:bg-stone-900 dark:text-stop-dark" role="alert">
            {geo.error ?? state.error}
          </p>
        )}

        {!busy && !result && !geo.error && !state.error && (
          <p className="rounded-2xl bg-white p-5 text-stone-600 shadow-sm dark:bg-stone-900 dark:text-stone-300">
            Tap the button to check the spot you're standing on. Your browser will ask to use your location.
          </p>
        )}
      </div>

      <div className="mt-auto space-y-3 pb-4 pt-6">
        {result && result.verdict !== 'green' && (
          <Link
            to="/map"
            className="block w-full rounded-xl bg-go py-4 text-center text-lg font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
          >
            Find a legal spot nearby
          </Link>
        )}
        <button
          type="button"
          onClick={locate}
          disabled={busy}
          className={`w-full rounded-xl py-4 text-lg font-semibold active:opacity-80 disabled:opacity-50 ${
            result && result.verdict !== 'green'
              ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
              : 'bg-go text-white dark:bg-go-dark dark:text-stone-950'
          }`}
        >
          {result ? 'Check again' : 'Check my location'}
        </button>
      </div>
    </main>
  )
}
