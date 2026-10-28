import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGeo } from '../geo.jsx'
import { checkSpot } from '../api.js'
import { keepAreaAround, offlineCheck } from '../offline.js'
import { load, KEYS } from '../storage.js'
import { useI18n } from '../i18n/index.jsx'
import { sinceText } from '../format.js'
import VerdictCard from '../components/VerdictCard.jsx'
import ChangiCard from '../components/ChangiCard.jsx'
import InstallCard from '../components/InstallCard.jsx'
import { terminalFor } from '../../../src/changi.js'
import { parkWithDsas } from '../../../src/rules.js'

const SLOW_MS = 3000 // the backend can take a while to wake up

export default function Check() {
  const { geo, locate } = useGeo()
  const { t } = useI18n()
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
      .then((result) => {
        if (cancelled) return
        setState({ status: 'done', result, error: null })
        // Keep the map data around here for checks without signal (in the background).
        const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500))
        idle(() => keepAreaAround(geo.coords))
      })
      .catch(async (err) => {
        // No signal: answer from map data saved on an earlier check nearby, if any.
        const offline = err.offline ? await offlineCheck(geo.coords).catch(() => null) : null
        if (cancelled) return
        if (offline) setState({ status: 'done', result: offline, error: null })
        else setState({ status: 'error', result: null, error: err.message })
      })
      .finally(() => clearTimeout(timer))
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [geo.status, geo.at, geo.coords])

  const busy = geo.status === 'locating' || state.status === 'loading'
  const result = state.status === 'done' ? state.result : null
  const error = geo.error ? t(`geo.${geo.error}`) : state.error
  const terminal = result && geo.coords ? terminalFor({ ...geo.coords, reasons: result.reasons }) : null

  return (
    <main className="flex flex-1 flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">{t('check.title')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('check.subtitle')}</p>

      <div className="mt-6">
        {result?.offline && (
          <p className="mb-3 rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">
            {t('check.offlineAnswer', { when: sinceText(result.offline.savedAt, t) })}
          </p>
        )}
        {result && <VerdictCard result={result} />}
        {result && (
          <Link
            to="/report"
            state={{ kind: 'wrong_answer', result, coords: geo.coords }}
            className="mt-2 block text-right text-xs text-stone-500 underline dark:text-stone-400"
          >
            {t('check.wrongAnswer')}
          </Link>
        )}
        {terminal && <ChangiCard key={terminal} terminal={terminal} />}
        {result && parkWithDsas(result) && (
          <p className="mt-3 flex gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900 dark:bg-green-950/60 dark:text-green-100">
            <span aria-hidden="true">🌳</span>
            {t('park.hasDsas', { park: parkWithDsas(result) })}
          </p>
        )}

        {busy && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-stone-900" role="status">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-go dark:border-stone-700 dark:border-t-go-dark" />
            <p className="mt-3 font-medium">{geo.status === 'locating' ? t('common.locating') : t('check.checking')}</p>
            {slow && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('check.slow')}</p>}
          </div>
        )}

        {!busy && error && (
          <p className="rounded-2xl bg-white p-5 text-stop shadow-sm dark:bg-stone-900 dark:text-stop-dark" role="alert">
            {error}
          </p>
        )}

        {!busy && !result && !error && (
          <p className="rounded-2xl bg-white p-5 text-stone-600 shadow-sm dark:bg-stone-900 dark:text-stone-300">{t('check.intro')}</p>
        )}
      </div>

      <div className="mt-auto space-y-3 pb-4 pt-6">
        {result?.verdict === 'green' && !result.designatedArea && (
          <Link to="/add" className="block text-center text-sm font-medium text-[#7c3aed] underline">
            {t('check.addHere')}
          </Link>
        )}
        {result && result.verdict !== 'green' && (
          <Link
            to="/map"
            className="block w-full rounded-xl bg-go py-4 text-center text-lg font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
          >
            {t('check.findSpot')}
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
          {result ? t('check.again') : t('check.mine')}
        </button>
      </div>
      {/* Offered once the app has been useful, below the main buttons. */}
      {result && (
        <div className="-mt-1 pb-4">
          <InstallCard />
        </div>
      )}
    </main>
  )
}
