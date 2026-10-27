import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CircleMarker } from 'react-leaflet'
import { directionsUrl, distanceText } from '../format.js'
import SgMap from '../components/SgMap.jsx'

const KIND = {
  dsa: {
    badge: 'NEA designated smoking area',
    colour: '#d97706',
    note: 'An official smoking area. Smoke only inside the marked area.',
  },
  open: {
    badge: 'Open area · rules allow',
    colour: '#1f8a4c',
    note: 'Our data shows no no-smoking places right here. Stay 5 m from building entrances, bus stops and covered walkways, and follow any signs.',
  },
}

export default function SpotDetail() {
  const { state } = useLocation()
  const navigate = useNavigate()
  if (!state?.spot) return <Navigate to="/map" replace />

  const { spot, from } = state
  const kind = KIND[spot.kind]

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative">
        <SgMap center={spot} fit={from ? [spot, from] : [spot]} zoomControl={false} className="h-56 w-full">
          {from && <CircleMarker center={[from.lat, from.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />}
          <CircleMarker center={[spot.lat, spot.lng]} radius={11} pathOptions={{ color: '#fff', weight: 2, fillColor: kind.colour, fillOpacity: 1 }} />
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
        <span className="self-start rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: kind.colour }}>
          {kind.badge}
        </span>
        <h1 className="mt-2 text-2xl font-bold">{spot.title}</h1>
        {spot.kind === 'dsa' && spot.description && <p className="text-stone-600 dark:text-stone-300">{spot.description}</p>}
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          About {spot.walkMin} min walk · {distanceText(spot.distanceM)}
        </p>

        {spot.kind === 'dsa' && spot.photo && (
          <img src={spot.photo} alt={`Smoking area at ${spot.title}`} loading="lazy" className="mt-4 max-h-64 w-full rounded-2xl object-cover" />
        )}

        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{kind.note}</p>

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
