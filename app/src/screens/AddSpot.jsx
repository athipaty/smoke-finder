import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMapEvents } from 'react-leaflet'
import { useGeo } from '../geo.jsx'
import { addSpot, admin, checkSpot } from '../api.js'
import { useI18n } from '../i18n/index.jsx'
import SgMap from '../components/SgMap.jsx'
import PlaceSearch from '../components/PlaceSearch.jsx'
import { COLOURS } from '../colours.js'

const CHECK_DELAY_MS = 600
const SG_CENTRE = { lat: 1.3521, lng: 103.8198 } // where a moderator without GPS starts
const EMPTY_FORM = { name: '', hours: '', allDay: false, sheltered: false, hasAshtray: false, hasSeating: false }

const FEATURES = [
  { key: 'sheltered', label: 'add.f.sheltered', hint: 'add.f.shelteredHint', icon: '☂️' },
  { key: 'hasAshtray', label: 'add.f.ashtray', hint: 'add.f.ashtrayHint', icon: '🗑️' },
  { key: 'hasSeating', label: 'add.f.seats', hint: 'add.f.seatsHint', icon: '🪑' },
]

// The pin's rules check as a banner, in the same colours and marks as answers.
const BANNERS = {
  green: { box: 'bg-green-50 text-green-900 dark:bg-green-950/60 dark:text-green-100', mark: '✓' },
  amber: { box: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100', mark: '!' },
  red: { box: 'bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100', mark: '✕' },
  wait: { box: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300', mark: '…' },
}
function Banner({ tone, children }) {
  const b = BANNERS[tone]
  return (
    <p className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${b.box}`}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-bold dark:bg-black/30" aria-hidden="true">
        {b.mark}
      </span>
      {children}
    </p>
  )
}

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
  if (check.status === 'loading') return <Banner tone="wait">{t('add.checking')}</Banner>
  if (check.status === 'error') return <Banner tone="red">{check.error}</Banner>
  const r = check.result
  const place = r.reasons[0] ? ruleLabel(r.reasons[0].rule) : ''
  if (r.designatedArea) return <Banner tone="amber">{t('add.alreadyDsa')}</Banner>
  if (r.verdict === 'red') return <Banner tone="red">{t('add.notAllowed', { place })}</Banner>
  if (r.verdict === 'amber') return <Banner tone="amber">{t('add.checkSigns', { place: place.toLowerCase() })}</Banner>
  return <Banner tone="green">{t('add.allowed')}</Banner>
}

export default function AddSpot() {
  const { geo, locate } = useGeo()
  const { t } = useI18n()
  const navigate = useNavigate()
  // Moderators seed spots they know: anywhere (search a place), no GPS needed,
  // and they stay on this screen to add the next one.
  const [moderator] = useState(() => admin.loggedIn())
  const [jumpTo, setJumpTo] = useState(null)
  const [searching, setSearching] = useState(false)
  const [added, setAdded] = useState([])
  const [pin, setPin] = useState(null)
  const [check, setCheck] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submit, setSubmit] = useState({ status: 'idle', error: null, existing: null })

  useEffect(() => {
    if (geo.status === 'idle') locate()
  }, [geo.status, locate])

  const start = jumpTo ?? geo.coords ?? (moderator && geo.status !== 'locating' ? SG_CENTRE : null)

  useEffect(() => {
    if (start && !pin) setPin({ lat: start.lat, lng: start.lng })
  }, [start, pin])

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
      const { allDay, hours, ...rest } = form
      const spot = await addSpot({ ...pin, ...rest, hours: allDay ? '24h' : hours, photo })
      if (!moderator) return openSpot(spot)
      setAdded((list) => [spot, ...list])
      setForm(EMPTY_FORM)
      setPhoto(null)
      setSubmit({ status: 'idle', error: null, existing: null })
    } catch (err) {
      setSubmit({ status: 'error', error: err.message, existing: err.body?.spot ?? null })
    }
  }

  if (!start) {
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
        <SgMap center={start} fit={[start]} zoomControl={false} className="h-[36dvh] w-full">
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
        {moderator && (
          <button
            type="button"
            onClick={() => setSearching((s) => !s)}
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[400] rounded-full bg-white/95 px-4 py-2 text-sm font-semibold shadow dark:bg-stone-900/95"
          >
            {t('search.short')}
          </button>
        )}
      </div>
      {searching && (
        <div className="px-4">
          <PlaceSearch
            onPick={(p) => {
              setSearching(false)
              setJumpTo({ lat: p.lat, lng: p.lng })
            }}
            onClose={() => setSearching(false)}
          />
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-1 flex-col px-4 pt-4">
        <h1 className="text-xl font-bold">{t('add.title')}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">{t('add.moveMap')}</p>
        {moderator && (
          <p className="mt-2 rounded-xl px-3 py-2 text-sm text-white" style={{ backgroundColor: COLOURS.community }} lang="en">
            Moderator: add spots anywhere (Search to jump), no daily limit. They show as verified.
            {added.length > 0 && ` Added this session: ${added.length} (last: ${added[0].name ?? 'unnamed spot'}).`}
          </p>
        )}
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
              <span className="flex items-center justify-between text-lg" aria-hidden="true">
                {f.icon}
                {form[f.key] && <span className="text-sm font-bold">✓</span>}
              </span>
              <span className="mt-1 font-medium">{t(f.label)}</span>
              <span className={`text-xs ${form[f.key] ? 'text-white' : 'text-stone-500 dark:text-stone-400'}`}>{t(f.hint)}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-3 space-y-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900">
        <label className="block text-sm">
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

        <div className="text-sm">
          <label htmlFor="add-hours" className="font-medium">
            {t('add.hours')}
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              id="add-hours"
              type="text"
              maxLength={40}
              value={form.allDay ? '' : form.hours}
              disabled={form.allDay}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              placeholder={form.allDay ? t('hours.24h') : t('add.hoursPlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900"
            />
            <label className="flex shrink-0 items-center gap-1.5">
              <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} className="h-4 w-4 accent-go" />
              {t('add.allDay')}
            </label>
          </div>
        </div>

        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 p-3 active:opacity-80 dark:border-stone-700">
          {preview ? (
            <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-2xl dark:bg-stone-800" aria-hidden="true">
              📷
            </span>
          )}
          <span className="text-sm">
            <span className="block font-medium">{photo ? t('add.changePhoto') : t('add.photo')}</span>
            <span className="block text-xs text-stone-500 dark:text-stone-400">{t('add.photoHint')}</span>
          </span>
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>

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
