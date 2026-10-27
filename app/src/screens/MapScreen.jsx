import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, CircleMarker, Tooltip } from 'react-leaflet'
import { useGeo } from '../geo.jsx'
import { fetchNearby } from '../api.js'
import { distanceText, titleCase } from '../format.js'
import SgMap from '../components/SgMap.jsx'

const COLOURS = { you: '#2563eb', open: '#1f8a4c', dsa: '#d97706' }
const MAX_FIT_M = 600 // don't zoom out for far-away DSAs; they're still in the list

// Open spots and DSAs in one list, nearest first.
function toSpots(nearby) {
  const open = nearby.open.map((s, i) => ({
    ...s,
    kind: 'open',
    id: `open-${i}`,
    title: 'Open area',
    subtitle: 'No no-smoking places here in our data',
  }))
  const dsas = nearby.dsas.map((d) => ({
    ...d,
    kind: 'dsa',
    id: `dsa-${d.neaId}`,
    title: titleCase(d.name),
    subtitle: `NEA smoking area · ${d.description ?? ''}`.replace(/ · $/, ''),
  }))
  return [...open, ...dsas].sort((a, b) => a.distanceM - b.distanceM)
}

export default function MapScreen() {
  const { geo, locate } = useGeo()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'idle', nearby: null, error: null })

  useEffect(() => {
    if (geo.status === 'idle') locate()
  }, [geo.status, locate])

  useEffect(() => {
    if (geo.status !== 'ready') return
    let cancelled = false
    setState({ status: 'loading', nearby: null, error: null })
    fetchNearby(geo.coords)
      .then((nearby) => !cancelled && setState({ status: 'done', nearby, error: null }))
      .catch((err) => !cancelled && setState({ status: 'error', nearby: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [geo.status, geo.at, geo.coords])

  const spots = useMemo(() => (state.nearby ? toSpots(state.nearby) : []), [state.nearby])
  const you = geo.coords
  const open = (spot) => navigate('/spot', { state: { spot, from: you } })

  if (!you) {
    return (
      <main className="flex flex-1 flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold">Legal spots near you</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          {geo.status === 'locating' ? 'Finding your location…' : geo.error ?? 'We need your location to find spots nearby.'}
        </p>
        {geo.status !== 'locating' && (
          <button type="button" onClick={locate} className="mx-auto mt-6 rounded-xl bg-go px-6 py-3 font-semibold text-white dark:bg-go-dark dark:text-stone-950">
            Use my location
          </button>
        )}
      </main>
    )
  }

  const fit = [you, ...spots.filter((s) => s.distanceM <= MAX_FIT_M)]

  return (
    <main className="flex flex-1 flex-col">
      <SgMap center={you} fit={fit} className="h-[45dvh] w-full">
        <Circle center={[you.lat, you.lng]} radius={you.accuracy} pathOptions={{ color: COLOURS.you, weight: 1, fillOpacity: 0.08 }} />
        <CircleMarker center={[you.lat, you.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: COLOURS.you, fillOpacity: 1 }}>
          <Tooltip>You</Tooltip>
        </CircleMarker>
        {spots.map((s, i) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={11}
            pathOptions={{ color: '#fff', weight: 2, fillColor: COLOURS[s.kind], fillOpacity: 1 }}
            eventHandlers={{ click: () => open(s) }}
          >
            <Tooltip permanent direction="center" className="!border-0 !bg-transparent !p-0 !font-bold !text-white !shadow-none">
              {i + 1}
            </Tooltip>
          </CircleMarker>
        ))}
      </SgMap>

      <section className="flex-1 px-4 pt-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">Legal spots near you</h1>
          <button type="button" onClick={locate} className="text-sm font-medium text-go dark:text-go-dark">
            Refresh
          </button>
        </div>

        {state.status === 'loading' && <p className="mt-4 text-stone-500 dark:text-stone-400" role="status">Looking around you…</p>}
        {state.status === 'error' && <p className="mt-4 text-stop dark:text-stop-dark" role="alert">{state.error}</p>}

        {state.status === 'done' && spots.length === 0 && (
          <p className="mt-4 text-stone-600 dark:text-stone-300">
            No legal spot within {state.nearby.searchRadiusM} m in our data. Try moving away from buildings, bus stops and parks, then refresh.
          </p>
        )}

        {spots.length > 0 && (
          <ol className="mt-3 divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
            {spots.map((s, i) => (
              <li key={s.id}>
                <button type="button" onClick={() => open(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-100 dark:active:bg-stone-800">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: COLOURS[s.kind] }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.title}</span>
                    <span className="block truncate text-sm text-stone-500 dark:text-stone-400">{s.subtitle}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-medium">{s.walkMin} min</span>
                    <span className="block text-stone-500 dark:text-stone-400">{distanceText(s.distanceM)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {state.status === 'done' && (
          <p className="mt-3 pb-4 text-xs text-stone-500 dark:text-stone-400">
            Open areas are worked out from NEA rules and map data, not visited by anyone yet. Walking times are estimates. Check for signs when you get there.
          </p>
        )}
      </section>
    </main>
  )
}
