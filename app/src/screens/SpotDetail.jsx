import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CircleMarker } from 'react-leaflet'
import { fetchSpot, voteSpot } from '../api.js'
import { directionsUrl, distanceText, featureText, sinceText, spotTitle } from '../format.js'
import { useI18n } from '../i18n/index.jsx'
import SgMap from '../components/SgMap.jsx'
import { COLOURS } from '../colours.js'
import { useFavourites } from '../favourites.jsx'

const VOTES = [
  { type: 'here', label: 'vote.here', done: 'vote.thanksHere' },
  { type: 'gone', label: 'vote.gone', done: 'vote.thanksReport' },
  { type: 'not_allowed', label: 'vote.notAllowed', done: 'vote.thanksReport' },
]

function statusText(s, t) {
  const confirmed = t('detail.lastConfirmed', { when: sinceText(s.lastConfirmedAt, t) })
  if (s.stale) return `${confirmed} · ${t('detail.mayBeOld')}`
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
    <div className="mt-5">
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
                chosen ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-white shadow-sm dark:bg-stone-900'
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

export default function SpotDetail() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const favourites = useFavourites()
  const [spot, setSpot] = useState(state?.spot ?? null)
  const [removed, setRemoved] = useState(false)

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

  if (!spot) return <Navigate to="/map" replace />

  const { from } = state
  const colour = COLOURS[spot.kind]
  const title = spotTitle(spot, t)
  const features = spot.kind === 'community' ? featureText(spot, t) : ''

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative">
        <SgMap center={spot} fit={from ? [spot, from] : [spot]} zoomControl={false} className="h-56 w-full">
          {from && <CircleMarker center={[from.lat, from.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: COLOURS.you, fillOpacity: 1 }} />}
          <CircleMarker center={[spot.lat, spot.lng]} radius={11} pathOptions={{ color: '#fff', weight: 2, fillColor: colour, fillOpacity: 1 }} />
        </SgMap>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[400] rounded-full bg-white/95 px-4 py-2 text-sm font-semibold shadow dark:bg-stone-900/95"
        >
          {t('common.back')}
        </button>
      </div>

      <section className="flex flex-1 flex-col px-4 pt-4">
        <span className="self-start rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: colour }}>
          {t(`kind.${spot.kind}.badge`)}
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
        {features && <p className="text-stone-600 first-letter:uppercase dark:text-stone-300">{features}</p>}
        {spot.distanceM != null && (
          <p className="mt-1 text-stone-500 dark:text-stone-400">{t('detail.walk', { n: spot.walkMin, d: distanceText(spot.distanceM) })}</p>
        )}
        {spot.kind === 'community' && !removed && spot.lastConfirmedAt && (
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{statusText(spot, t)}</p>
        )}

        {spot.photo && (
          <img src={spot.photo} alt={t('detail.photoAlt', { name: title })} loading="lazy" className="mt-4 h-44 w-full rounded-2xl object-cover" />
        )}

        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{t(`kind.${spot.kind}.note`)}</p>

        {spot.kind === 'community' && !removed && <CommunityActions spot={spot} onChange={(fresh) => setSpot((s) => ({ ...s, ...fresh }))} />}

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
