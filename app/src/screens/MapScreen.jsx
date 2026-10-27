import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Circle, CircleMarker, Tooltip } from 'react-leaflet'
import { useGeo } from '../geo.jsx'
import { fetchNearby } from '../api.js'
import { distanceText, featureText, titleCase } from '../format.js'
import { load, save, KEYS } from '../storage.js'
import SgMap from '../components/SgMap.jsx'
import { COLOURS } from '../colours.js'
const MAX_FIT_M = 600 // don't zoom out for far-away spots; they're still in the list

function communityStatus(s) {
  if (s.stale) return 'Not confirmed lately'
  return s.status === 'verified' ? 'Verified' : 'Unverified'
}

// All three kinds in one list, nearest first. Open areas are by definition
// uncovered (anything under a roof is amber), so they count as unsheltered.
function toSpots(nearby) {
  const open = nearby.open.map((s, i) => ({
    ...s,
    kind: 'open',
    id: `open-${i}`,
    title: 'Open area',
    subtitle: 'No no-smoking places here in our data',
    sheltered: false,
  }))
  const dsas = nearby.dsas.map((d) => ({
    ...d,
    kind: 'dsa',
    id: `dsa-${d.neaId}`,
    title: titleCase(d.name),
    subtitle: `NEA smoking area · ${d.description ?? ''}`.replace(/ · $/, ''),
    sheltered: null, // unknown
  }))
  const community = (nearby.community ?? []).map((c) => ({
    ...c,
    kind: 'community',
    title: c.name ?? 'Community spot',
    subtitle: [communityStatus(c), featureText(c)].filter(Boolean).join(' · '),
  }))
  return [...open, ...dsas, ...community].sort((a, b) => a.distanceM - b.distanceM)
}

export default function MapScreen() {
  const { geo, locate } = useGeo()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'idle', nearby: null, error: null })
  // null = follow the weather; true/false = the user's own choice
  const [shelteredChoice, setShelteredChoice] = useState(() => {
    const saved = load(KEYS.shelteredOnly)
    return saved === null ? null : saved === '1'
  })

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

  const weather = state.nearby?.weather
  const shelteredOnly = shelteredChoice ?? Boolean(weather?.raining)
  const allSpots = useMemo(() => (state.nearby ? toSpots(state.nearby) : []), [state.nearby])
  const spots = shelteredOnly ? allSpots.filter((s) => s.sheltered) : allSpots
  const you = geo.coords
  const open = (spot) => navigate('/spot', { state: { spot, from: you } })
  const toggleSheltered = () => {
    const next = !shelteredOnly
    setShelteredChoice(next)
    save(KEYS.shelteredOnly, next ? '1' : '0')
  }

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
      <SgMap center={you} fit={fit} className="h-[42dvh] w-full">
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
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">Spots near you</h1>
          <div className="flex shrink-0 items-center gap-4 text-sm font-medium">
            <button type="button" onClick={locate} className="text-go dark:text-go-dark">
              Refresh
            </button>
            <Link to="/add" className="rounded-full px-3 py-1.5 text-white" style={{ backgroundColor: COLOURS.community }} aria-label="Add a spot">
              + Add
            </Link>
          </div>
        </div>

        {weather?.raining && (
          <p className="mt-3 rounded-xl bg-sky-100 px-4 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
            {weather.forecast} expected in {weather.area} ({weather.period}).
          </p>
        )}

        {state.status === 'done' && (
          <label className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-stone-900">
            <span>
              <span className="font-medium">Sheltered spots only</span>
              <span className="block text-stone-500 dark:text-stone-400">Spots people marked as covered</span>
            </span>
            <input type="checkbox" checked={shelteredOnly} onChange={toggleSheltered} className="h-5 w-5 accent-go" />
          </label>
        )}

        {state.status === 'loading' && <p className="mt-4 text-stone-500 dark:text-stone-400" role="status">Looking around you…</p>}
        {state.status === 'error' && <p className="mt-4 text-stop dark:text-stop-dark" role="alert">{state.error}</p>}

        {state.status === 'done' && spots.length === 0 && (
          <p className="mt-4 text-stone-600 dark:text-stone-300">
            {shelteredOnly
              ? 'No sheltered spots known nearby yet. Turn the filter off to see open areas, or add a covered spot when you find one.'
              : `No legal spot within ${state.nearby.searchRadiusM} m in our data. Try moving away from buildings, bus stops and parks, then refresh.`}
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
            <span style={{ color: COLOURS.community }}>●</span> added by people ·{' '}
            <span style={{ color: COLOURS.dsa }}>●</span> NEA ·{' '}
            <span style={{ color: COLOURS.open }}>●</span> open areas worked out from NEA rules and map data, not visited. Walking times are estimates.
          </p>
        )}
      </section>
    </main>
  )
}
