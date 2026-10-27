import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CircleMarker } from 'react-leaflet'
import { fetchSpot, voteSpot } from '../api.js'
import { directionsUrl, distanceText, featureText, sinceText } from '../format.js'
import SgMap from '../components/SgMap.jsx'
import { COLOURS } from '../colours.js'

const KIND = {
  dsa: {
    badge: 'NEA designated smoking area',
    note: 'An official smoking area. Smoke only inside the marked area.',
  },
  open: {
    badge: 'Open area · rules allow',
    note: 'Our data shows no no-smoking places right here. Stay 5 m from building entrances, bus stops and covered walkways, and follow any signs.',
  },
  community: {
    badge: 'Added by people',
    note: 'Added and checked by other users. It passed the NEA rules check when it was added, but follow any signs on site.',
  },
}

const VOTES = [
  { type: 'here', label: 'Still here', done: 'Thanks for confirming.' },
  { type: 'gone', label: 'Gone', done: "Thanks. After 3 reports it's hidden." },
  { type: 'not_allowed', label: 'Not allowed here', done: "Thanks. After 3 reports it's hidden." },
]

function statusText(s) {
  const confirmed = `Last confirmed ${sinceText(s.lastConfirmedAt)}`
  if (s.stale) return `${confirmed} · may be out of date`
  if (s.status === 'verified') return `Verified by ${s.hereCount} people · ${confirmed}`
  return `Unverified · confirmed by ${s.hereCount} of 3 · ${confirmed}`
}

function CommunityActions({ spot, onChange }) {
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const vote = async (type, done) => {
    setBusy(type)
    setMessage(null)
    try {
      const updated = await voteSpot(spot.id, type)
      onChange(updated)
      setMessage(updated.status === 'hidden' ? 'Thanks. This spot is now hidden.' : done)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">Is this spot still right?</p>
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
                chosen
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-white shadow-sm dark:bg-stone-900'
              }`}
            >
              {busy === v.type ? '…' : v.label}
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
          onClick={() => vote('bad_photo', 'Thanks. The photo is hidden after 2 reports.')}
          className="mt-2 text-xs text-stone-500 underline dark:text-stone-400"
        >
          Report photo (shows people or private property)
        </button>
      )}
    </div>
  )
}

export default function SpotDetail() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [spot, setSpot] = useState(state?.spot ?? null)

  // Community spots change as people vote, so fetch the latest copy.
  useEffect(() => {
    if (state?.spot?.kind !== 'community') return
    let cancelled = false
    fetchSpot(state.spot.id)
      .then((fresh) => !cancelled && setSpot((s) => ({ ...s, ...fresh })))
      .catch(() => {}) // keep showing what we have
    return () => {
      cancelled = true
    }
  }, [state?.spot?.id, state?.spot?.kind])

  if (!spot) return <Navigate to="/map" replace />

  const { from } = state
  const kind = KIND[spot.kind]
  const colour = COLOURS[spot.kind]
  const features = spot.kind === 'community' ? featureText(spot) : ''

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
          ‹ Back
        </button>
      </div>

      <section className="flex flex-1 flex-col px-4 pt-4">
        <span className="self-start rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: colour }}>
          {kind.badge}
        </span>
        <h1 className="mt-2 text-2xl font-bold">{spot.title}</h1>
        {spot.kind === 'dsa' && spot.description && <p className="text-stone-600 dark:text-stone-300">{spot.description}</p>}
        {features && <p className="capitalize text-stone-600 dark:text-stone-300">{features}</p>}
        {spot.distanceM != null && (
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            About {spot.walkMin} min walk · {distanceText(spot.distanceM)}
          </p>
        )}
        {spot.kind === 'community' && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{statusText(spot)}</p>}

        {spot.photo && (
          <img src={spot.photo} alt={`Smoking spot: ${spot.title}`} loading="lazy" className="mt-4 h-44 w-full rounded-2xl object-cover" />
        )}

        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{kind.note}</p>

        {spot.kind === 'community' && <CommunityActions spot={spot} onChange={(fresh) => setSpot((s) => ({ ...s, ...fresh }))} />}

        <div className="mt-auto pb-4 pt-6">
          <a
            href={directionsUrl(spot)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-go py-4 text-center text-lg font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
          >
            Walking directions
          </a>
        </div>
      </section>
    </main>
  )
}
