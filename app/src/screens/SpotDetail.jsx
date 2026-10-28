import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CircleMarker, Polyline } from 'react-leaflet'
import { addSpotPhoto, checkins, fetchDsas, fetchRoute, fetchSpot, voteFeature, voteSpot } from '../api.js'
import { checkinKey, directionsUrl, distanceText, hoursText, metresBetween, sinceText, spotTitle, walkMinutes } from '../format.js'
import { useGeo } from '../geo.jsx'
import { useI18n } from '../i18n/index.jsx'
import SgMap from '../components/SgMap.jsx'
import { COLOURS } from '../colours.js'
import { useFavourites } from '../favourites.jsx'

const VOTES = [
  { type: 'here', label: 'vote.here', done: 'vote.thanksHere' },
  { type: 'gone', label: 'vote.gone', done: 'vote.thanksReport' },
  { type: 'not_allowed', label: 'vote.notAllowed', done: 'vote.thanksReport' },
]

// Links that open a spot directly: /spot?c=<id> (community), ?nea=<id> (NEA area),
// ?at=<lat>,<lng> (open area).
function shareUrl(spot) {
  const params =
    spot.kind === 'community' ? { c: spot.id } : spot.kind === 'dsa' ? { nea: spot.neaId } : { at: `${spot.lat.toFixed(6)},${spot.lng.toFixed(6)}` }
  return `${window.location.origin}/spot?${new URLSearchParams(params)}`
}

async function spotFromLink(params) {
  if (params.get('c')) return { ...(await fetchSpot(params.get('c'))), kind: 'community' }
  if (params.get('nea')) {
    const dsa = (await fetchDsas()).find((d) => String(d.neaId) === params.get('nea'))
    if (!dsa) throw Object.assign(new Error('not found'), { status: 404 })
    return { ...dsa, kind: 'dsa' }
  }
  const [lat, lng] = (params.get('at') ?? '').split(',').map(Number)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { kind: 'open', lat, lng }
  return null
}

// Operators' own smoking areas (Sentosa "sdc", NTU "ntu") are stored as
// community spots with their source; they get their own badge and note.
const OPERATOR_SOURCES = ['sdc', 'ntu']
const kindKey = (s) => (OPERATOR_SOURCES.includes(s.source) ? s.source : s.kind)

function statusText(s, t) {
  const confirmed = t('detail.lastConfirmed', { when: sinceText(s.lastConfirmedAt, t) })
  if (s.stale) return `${confirmed} · ${t('detail.mayBeOld')}`
  if (s.source === 'sdc') return t('detail.bySdc')
  if (s.source === 'ntu') return t('detail.byNtu')
  if (s.byModerator) return `${t('detail.byModerator')} · ${confirmed}`
  if (s.status === 'verified') return `${t('detail.verifiedBy', { n: s.hereCount })} · ${confirmed}`
  return `${t('detail.unverifiedBy', { n: s.hereCount })} · ${confirmed}`
}

function CommunityActions({ spot, onChange }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const vote = async (type, doneKey) => {
    setBusy(type)
    setMessage(null)
    try {
      const updated = await voteSpot(spot.id, type)
      onChange(updated)
      setMessage(updated.status === 'hidden' ? t('vote.hidden') : t(doneKey))
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <p className="text-sm font-semibold">{t('vote.question')}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {VOTES.map((v) => {
          const chosen = spot.myVote === v.type
          return (
            <button
              key={v.type}
              type="button"
              disabled={busy !== null}
              aria-pressed={chosen}
              onClick={() => vote(v.type, v.done)}
              className={`rounded-xl px-2 py-3 text-sm font-medium active:opacity-80 disabled:opacity-60 ${
                chosen ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800'
              }`}
            >
              {busy === v.type ? '…' : t(v.label)}
            </button>
          )
        })}
      </div>
      {message && (
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300" role="status">
          {message}
        </p>
      )}
      {spot.photo && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => vote('bad_photo', 'vote.photoThanks')}
          className="mt-2 text-xs text-stone-500 underline dark:text-stone-400"
        >
          {t('vote.reportPhoto')}
        </button>
      )}
    </div>
  )
}

const FIX_FEATURES = [
  { key: 'sheltered', label: 'add.f.sheltered' },
  { key: 'hasAshtray', label: 'add.f.ashtray' },
  { key: 'hasSeating', label: 'add.f.seats' },
]

// "Details wrong?": anyone can say whether it's sheltered / has an ashtray /
// has seats. Each detail follows what most people say (see the backend).
function FixDetails({ spot, onChange }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const answer = async (feature, value) => {
    setBusy(feature)
    setMessage(null)
    try {
      onChange(await voteFeature(spot.id, feature, value))
      setMessage(t('fix.thanks'))
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(null)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm text-stone-500 underline dark:text-stone-400">
        {t('fix.button')}
      </button>
    )
  }
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900">
      <p className="text-sm font-semibold">{t('fix.title')}</p>
      <ul className="mt-2 space-y-2">
        {FIX_FEATURES.map((f) => {
          const mine = spot.myFeatures?.[f.key]
          const current = mine ?? spot[f.key]
          return (
            <li key={f.key} className="flex items-center justify-between gap-3 text-sm">
              <span>{t(f.label)}</span>
              <span className="flex shrink-0 gap-1" role="group" aria-label={t(f.label)}>
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={busy !== null}
                    aria-pressed={current === value}
                    onClick={() => answer(f.key, value)}
                    className={`rounded-lg px-3 py-1.5 font-medium disabled:opacity-60 ${
                      current === value ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                  >
                    {value ? t('fix.yes') : t('fix.no')}
                  </button>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
      {message && (
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300" role="status">
          {message}
        </p>
      )}
    </div>
  )
}

// A photo for a spot that has none.
function AddPhoto({ spot, onChange }) {
  const { t } = useI18n()
  const [state, setState] = useState({ busy: false, message: null })
  const pick = async (file) => {
    if (!file) return
    setState({ busy: true, message: null })
    try {
      onChange(await addSpotPhoto(spot.id, file))
      setState({ busy: false, message: t('photo.thanks') })
    } catch (err) {
      setState({ busy: false, message: err.message })
    }
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className={`cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm dark:bg-stone-900 ${state.busy ? 'opacity-60' : ''}`}>
        {state.busy ? t('photo.adding') : t('add.photo')}
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={state.busy} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <span className="text-xs text-stone-500 dark:text-stone-400">{state.message ?? t('add.photoHint')}</span>
    </div>
  )
}

// "Busy now": how many people said "I'm here now" in the last hour, and a
// button to say it yourself. onCheckIn runs after a check-in (at a community
// spot it also counts as "Still here", so the votes change).
function BusyNow({ spotKey, onCheckIn }) {
  const { t } = useI18n()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    checkins
      .status(spotKey)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => {}) // not essential: leave the section out
    return () => {
      cancelled = true
    }
  }, [spotKey])

  if (!status) return null

  const act = async (here) => {
    setBusy(true)
    setMessage(null)
    try {
      setStatus(await (here ? checkins.checkIn(spotKey) : checkins.leave()))
      if (here) onCheckIn?.()
      setMessage(here ? t('busy.thanks') : null)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <p className="text-sm font-semibold">{t('busy.title')}</p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
        {status.busyNow > 0 ? t('busy.count', { n: status.busyNow }) : t('busy.none')}
      </p>
      <button
        type="button"
        disabled={busy}
        aria-pressed={status.here}
        onClick={() => act(!status.here)}
        className={`mt-2 w-full rounded-xl px-3 py-3 text-sm font-medium active:opacity-80 disabled:opacity-60 ${
          status.here ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800'
        }`}
      >
        {busy ? '…' : status.here ? t('busy.leave') : t('busy.checkIn')}
      </button>
      {message && (
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300" role="status">
          {message}
        </p>
      )}
    </div>
  )
}

export default function SpotDetail() {
  const location = useLocation()
  const { state } = location
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { geo } = useGeo()
  const favourites = useFavourites()
  const [spot, setSpot] = useState(state?.spot ?? null)
  const [removed, setRemoved] = useState(false)
  const [link, setLink] = useState({ status: state?.spot ? 'done' : 'loading' })
  const [copied, setCopied] = useState(false)
  const [route, setRoute] = useState(null)

  // Real walking route from where the user is, when we know that.
  const fromPoint = state?.from ?? geo.coords
  const fromKey = fromPoint ? `${fromPoint.lat.toFixed(5)},${fromPoint.lng.toFixed(5)}` : null
  const spotKey = spot ? `${spot.lat},${spot.lng}` : null
  useEffect(() => {
    if (!fromKey || !spotKey) return
    let cancelled = false
    const [fLat, fLng] = fromKey.split(',').map(Number)
    const [sLat, sLng] = spotKey.split(',').map(Number)
    fetchRoute({ lat: fLat, lng: fLng }, { lat: sLat, lng: sLng })
      .then((r) => !cancelled && setRoute(r))
      .catch(() => !cancelled && setRoute(null)) // keep the straight-line estimate
    return () => {
      cancelled = true
    }
  }, [fromKey, spotKey])

  // Opened from a shared link: load the spot it points to.
  useEffect(() => {
    if (state?.spot) return
    let cancelled = false
    spotFromLink(params)
      .then((s) => !cancelled && (s ? (setSpot(s), setLink({ status: 'done' })) : setLink({ status: 'none' })))
      .catch(() => !cancelled && setLink({ status: 'missing' }))
    return () => {
      cancelled = true
    }
  }, [state?.spot, params])

  // Community spots change as people vote, so fetch the latest copy.
  useEffect(() => {
    if (state?.spot?.kind !== 'community') return
    let cancelled = false
    fetchSpot(state.spot.id)
      .then((fresh) => !cancelled && setSpot((s) => ({ ...s, ...fresh })))
      .catch((err) => !cancelled && err.status === 404 && setRemoved(true)) // otherwise keep what we have
    return () => {
      cancelled = true
    }
  }, [state?.spot?.id, state?.spot?.kind])

  if (link.status === 'none') return <Navigate to="/map" replace />
  if (link.status !== 'done' || !spot) {
    return (
      <main className="flex flex-1 flex-col justify-center px-6 text-center">
        <p className="text-stone-600 dark:text-stone-300" role="status">
          {link.status === 'loading' ? t('detail.loading') : t('detail.notFound')}
        </p>
        {link.status === 'missing' && (
          <Link to="/map" className="mx-auto mt-4 rounded-xl bg-go px-5 py-3 font-semibold text-white dark:bg-go-dark dark:text-stone-950">
            {t('detail.seeNearby')}
          </Link>
        )}
      </main>
    )
  }

  // From the list we know where the user was; from a link, use their position if we have it.
  const from = state?.from ?? geo.coords
  const distanceM = spot.distanceM ?? (from ? Math.round(metresBetween(from, spot)) : null)
  const walkMin = spot.walkMin ?? (distanceM != null ? walkMinutes(distanceM) : null)
  const colour = COLOURS[spot.kind]
  const title = spotTitle(spot, t)
  // A link opened in a new tab has no in-app history to go back to.
  const goBack = () => (location.key === 'default' ? navigate('/map') : navigate(-1))

  const share = async () => {
    const url = shareUrl(spot)
    try {
      if (navigator.share) return await navigator.share({ title, url })
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // share sheet closed, or clipboard blocked: nothing to do
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative">
        <SgMap
          center={spot}
          fit={[spot, ...(from ? [from] : []), ...(route?.path ?? []).map(([lat, lng]) => ({ lat, lng }))]}
          zoomControl={false}
          className="h-56 w-full"
        >
          {route?.path?.length > 1 && (
            <Polyline positions={route.path} pathOptions={{ color: COLOURS.you, weight: 4, opacity: 0.8, dashArray: '2 8', lineCap: 'round' }} />
          )}
          {from && <CircleMarker center={[from.lat, from.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: COLOURS.you, fillOpacity: 1 }} />}
          <CircleMarker center={[spot.lat, spot.lng]} radius={11} pathOptions={{ color: '#fff', weight: 2, fillColor: colour, fillOpacity: 1 }} />
        </SgMap>
        <button
          type="button"
          onClick={goBack}
          className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[400] rounded-full bg-white/95 px-4 py-2 text-sm font-semibold shadow dark:bg-stone-900/95"
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={share}
          className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[400] rounded-full bg-white/95 px-4 py-2 text-sm font-semibold shadow dark:bg-stone-900/95"
        >
          {copied ? t('detail.copied') : t('detail.share')}
        </button>
      </div>

      <section className="flex flex-1 flex-col px-4 pt-4">
        <span className="self-start rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: colour }}>
          {t(`kind.${kindKey(spot)}.badge`)}
        </span>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <button
            type="button"
            onClick={() => favourites.toggle(spot)}
            aria-pressed={favourites.isSaved(spot)}
            className="mt-1 shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow-sm dark:bg-stone-900"
          >
            {favourites.isSaved(spot) ? t('detail.saved') : t('detail.save')}
          </button>
        </div>
        {removed && (
          <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">
            {t('detail.removed')}
          </p>
        )}
        {spot.kind === 'dsa' && spot.description && <p className="text-stone-600 dark:text-stone-300">{spot.description}</p>}
        {/* The facts at a glance: walk, what's there, hours. */}
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {(route || distanceM != null) && (
            <li className="flex items-center gap-1.5 rounded-full bg-go px-3 py-1.5 font-semibold text-white dark:bg-go-dark dark:text-stone-950">
              <span aria-hidden="true">🚶</span>
              {route ? t('detail.walkRoute', { n: route.minutes, d: distanceText(route.metres) }) : t('detail.walk', { n: walkMin, d: distanceText(distanceM) })}
            </li>
          )}
          {spot.kind === 'community' &&
            [
              ['sheltered', '☂️', 'feature.sheltered'],
              ['hasAshtray', '🗑️', 'feature.ashtray'],
              ['hasSeating', '🪑', 'feature.seats'],
            ]
              .filter(([key]) => spot[key])
              .map(([key, icon, label]) => (
                <li key={key} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-medium shadow-sm first-letter:uppercase dark:bg-stone-900">
                  <span aria-hidden="true">{icon}</span>
                  <span className="first-letter:uppercase">{t(label)}</span>
                </li>
              ))}
          {spot.kind === 'community' && spot.hours && (
            <li className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-medium shadow-sm dark:bg-stone-900">
              <span aria-hidden="true">🕒</span>
              {hoursText(spot, t)}
            </li>
          )}
        </ul>
        {spot.kind === 'community' && !removed && spot.lastConfirmedAt && (
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{statusText(spot, t)}</p>
        )}

        {spot.photo && (
          <img src={spot.photo} alt={t('detail.photoAlt', { name: title })} loading="lazy" className="mt-4 h-44 w-full rounded-2xl object-cover" />
        )}

        {spot.approximate && (
          <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{t('detail.approximate')}</p>
        )}
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{t(`kind.${kindKey(spot)}.note`)}</p>

        {checkinKey(spot) && !removed && (
          <BusyNow
            key={checkinKey(spot)}
            spotKey={checkinKey(spot)}
            onCheckIn={
              spot.kind === 'community'
                ? () => fetchSpot(spot.id).then((fresh) => setSpot((s) => ({ ...s, ...fresh })), () => {})
                : undefined
            }
          />
        )}

        {spot.kind === 'community' && !removed && spot.canAddPhoto && !spot.photo && (
          <AddPhoto spot={spot} onChange={(fresh) => setSpot((s) => ({ ...s, ...fresh }))} />
        )}

        {spot.kind === 'community' && !removed && <CommunityActions spot={spot} onChange={(fresh) => setSpot((s) => ({ ...s, ...fresh }))} />}
        {spot.kind === 'community' && !removed && <FixDetails spot={spot} onChange={(fresh) => setSpot((s) => ({ ...s, ...fresh }))} />}

        <div className="mt-auto pb-4 pt-6">
          <a
            href={directionsUrl(spot)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-go py-4 text-center text-lg font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
          >
            {t('detail.directions')}
          </a>
        </div>
      </section>
    </main>
  )
}
