import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMapEvents } from 'react-leaflet'
import { useGeo } from '../geo.jsx'
import { addSpot, checkSpot } from '../api.js'
import { useI18n } from '../i18n/index.jsx'
import SgMap from '../components/SgMap.jsx'
import { COLOURS } from '../colours.js'

const CHECK_DELAY_MS = 600

const FEATURES = [
  { key: 'sheltered', label: 'add.f.sheltered', hint: 'add.f.shelteredHint' },
  { key: 'hasAshtray', label: 'add.f.ashtray', hint: 'add.f.ashtrayHint' },
  { key: 'hasSeating', label: 'add.f.seats', hint: 'add.f.seatsHint' },
]

// Reports the map centre (where the fixed pin points) after every pan or zoom.
function CentreTracker({ onMove }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      onMove({ lat: c.lat, lng: c.lng })
    },
  })
  return null
}

function PinCheck({ check }) {
  const { t, ruleLabel } = useI18n()
  if (!check) return null
  if (check.status === 'loading') return <p className="text-sm text-stone-500 dark:text-stone-400">{t('add.checking')}</p>
  if (check.status === 'error') return <p className="text-sm text-stop dark:text-stop-dark">{check.error}</p>
  const r = check.result
  const place = r.reasons[0] ? ruleLabel(r.reasons[0].rule) : ''
  if (r.designatedArea) return <p className="text-sm font-medium text-maybe dark:text-maybe-dark">{t('add.alreadyDsa')}</p>
  if (r.verdict === 'red') return <p className="text-sm font-medium text-stop dark:text-stop-dark">{t('add.notAllowed', { place })}</p>
  if (r.verdict === 'amber') return <p className="text-sm font-medium text-maybe dark:text-maybe-dark">{t('add.checkSigns', { place: place.toLowerCase() })}</p>
  return <p className="text-sm font-medium text-go dark:text-go-dark">{t('add.allowed')}</p>
}

export default function AddSpot() {
  const { geo, locate } = useGeo()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [pin, setPin] = useState(null)
  const [check, setCheck] = useState(null)
  const [form, setForm] = useState({ name: '', sheltered: false, hasAshtray: false, hasSeating: false })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submit, setSubmit] = useState({ status: 'idle', error: null, existing: null })

  useEffect(() => {
    if (geo.status === 'idle') locate()
  }, [geo.status, locate])

  useEffect(() => {
    if (geo.coords && !pin) setPin({ lat: geo.coords.lat, lng: geo.coords.lng })
  }, [geo.coords, pin])

  // Check the pin against the rules shortly after it stops moving.
  useEffect(() => {
    if (!pin) return
    let cancelled = false
    setCheck({ status: 'loading' })
    const timer = setTimeout(() => {
      checkSpot(pin)
        .then((result) => !cancelled && setCheck({ status: 'done', result }))
        .catch((err) => !cancelled && setCheck({ status: 'error', error: err.message }))
    }, CHECK_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pin])

  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const blocked = check?.status !== 'done' || check.result.verdict === 'red' || Boolean(check.result.designatedArea)
  const openSpot = (spot) => navigate('/spot', { replace: true, state: { spot: { ...spot, kind: 'community' }, from: geo.coords } })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (blocked || submit.status === 'saving') return
    setSubmit({ status: 'saving', error: null, existing: null })
    try {
      openSpot(await addSpot({ ...pin, ...form, photo }))
    } catch (err) {
      setSubmit({ status: 'error', error: err.message, existing: err.body?.spot ?? null })
    }
  }

  if (!geo.coords) {
    return (
      <main className="flex flex-1 flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold">{t('add.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          {geo.status === 'locating' ? t('common.locating') : geo.error ? t(`geo.${geo.error}`) : t('add.needLocation')}
        </p>
        {geo.status !== 'locating' && (
          <button type="button" onClick={locate} className="mx-auto mt-6 rounded-xl bg-go px-6 py-3 font-semibold text-white dark:bg-go-dark dark:text-stone-950">
            {t('common.useLocation')}
          </button>
        )}
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative">
        <SgMap center={geo.coords} fit={[geo.coords]} zoomControl={false} className="h-[36dvh] w-full">
          <CentreTracker onMove={setPin} />
        </SgMap>
        {/* Fixed pin: the spot is wherever the map centre is. */}
        <svg viewBox="0 0 24 32" className="pointer-events-none absolute left-1/2 top-1/2 z-[400] h-10 w-8 -translate-x-1/2 -translate-y-full" aria-hidden="true">
          <path d="M12 31s10-11.3 10-19A10 10 0 0 0 2 12c0 7.7 10 19 10 19z" fill={COLOURS.community} stroke="#fff" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="#fff" />
        </svg>
        <Link
          to="/map"
          className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[400] rounded-full bg-white/95 px-4 py-2 text-sm font-semibold shadow dark:bg-stone-900/95"
        >
          {t('add.cancel')}
        </Link>
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col px-4 pt-4">
        <h1 className="text-xl font-bold">{t('add.title')}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">{t('add.moveMap')}</p>
        <div className="mt-2 min-h-5" aria-live="polite">
          <PinCheck check={check} />
        </div>

        <fieldset className="mt-3 grid grid-cols-3 gap-2">
          <legend className="sr-only">{t('add.whatsThere')}</legend>
          {FEATURES.map((f) => (
            <label
              key={f.key}
              className={`flex cursor-pointer flex-col rounded-xl px-3 py-2 text-sm shadow-sm ${form[f.key] ? 'text-white' : 'bg-white dark:bg-stone-900'}`}
              style={form[f.key] ? { backgroundColor: COLOURS.community } : undefined}
            >
              <input type="checkbox" className="sr-only" checked={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
              <span className="font-medium">{t(f.label)}</span>
              <span className={`text-xs ${form[f.key] ? 'text-white/80' : 'text-stone-500 dark:text-stone-400'}`}>{t(f.hint)}</span>
            </label>
          ))}
        </fieldset>

        <label className="mt-3 block text-sm">
          <span className="font-medium">{t('add.name')}</span>
          <input
            type="text"
            maxLength={60}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('add.namePlaceholder')}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
          />
        </label>

        <div className="mt-3 flex items-center gap-3">
          <label className="cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm dark:bg-stone-900">
            {photo ? t('add.changePhoto') : t('add.photo')}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          {preview && <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />}
          <span className="text-xs text-stone-500 dark:text-stone-400">{t('add.photoHint')}</span>
        </div>

        {submit.error && (
          <p className="mt-3 text-sm text-stop dark:text-stop-dark" role="alert">
            {submit.error}{' '}
            {submit.existing && (
              <button type="button" className="underline" onClick={() => openSpot(submit.existing)}>
                {t('add.openIt')}
              </button>
            )}
          </p>
        )}

        <div className="mt-auto pb-4 pt-5">
          <button
            type="submit"
            disabled={blocked || submit.status === 'saving'}
            className="w-full rounded-xl py-4 text-lg font-semibold text-white active:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: COLOURS.community }}
          >
            {submit.status === 'saving' ? t('add.saving') : t('add.submit')}
          </button>
        </div>
      </form>
    </main>
  )
}
