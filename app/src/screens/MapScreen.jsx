import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Circle, CircleMarker, Tooltip } from 'react-leaflet'
import { useGeo } from '../geo.jsx'
import { fetchNearby, fetchRoutes } from '../api.js'
import { distanceText, featureText, hoursText, metresBetween, spotTitle, walkMinutes } from '../format.js'
import { useFavourites } from '../favourites.jsx'
import { useI18n } from '../i18n/index.jsx'
import { load, save, KEYS } from '../storage.js'
import SgMap from '../components/SgMap.jsx'
import AlertsCard from '../components/AlertsCard.jsx'
import ChangiCard from '../components/ChangiCard.jsx'
import PlaceSearch from '../components/PlaceSearch.jsx'
import { terminalFor } from '../../../src/changi.js'
import { COLOURS } from '../colours.js'

const MAX_FIT_M = 600 // don't zoom out for far-away spots; they're still in the list
const ROUTED = 5 // the nearest spots get real walking times (F2), the rest an estimate
const spotKey = (s) => `${s.lat.toFixed(6)},${s.lng.toFixed(6)}`

// Feature filters. A spot passes if it's known to have the feature; NEA areas
// (equipment unknown, and in Orchard the only legal places) always pass.
const NEEDS = [
  { key: 'hasAshtray', label: 'add.f.ashtray' },
  { key: 'hasSeating', label: 'add.f.seats' },
]
const meetsNeeds = (s, needs) => s.kind === 'dsa' || needs.every((key) => s[key] === true)
function loadNeeds() {
  try {
    const saved = JSON.parse(load(KEYS.needs) ?? '[]')
    return NEEDS.map((n) => n.key).filter((key) => saved.includes(key))
  } catch {
    return []
  }
}

// Real walking times replace the estimate, and the list is sorted by them.
function withRoutes(spots, routes) {
  if (!routes) return spots
  return spots
    .map((s) => {
      const r = routes[spotKey(s)]
      return r ? { ...s, walkMin: r.minutes, routeM: r.metres, routed: true } : s
    })
    .sort((a, b) => a.walkMin - b.walkMin || a.distanceM - b.distanceM)
}

function communityStatus(s, t) {
  if (s.approximate) return t('status.approx')
  if (s.stale) return t('status.stale')
  return s.status === 'verified' ? t('status.verified') : t('status.unverified')
}

function subtitle(s, t) {
  if (s.kind === 'open') return t('spot.openSubtitle')
  const busy = s.busyNow > 0 ? t('busy.short', { n: s.busyNow }) : null
  if (s.kind === 'dsa') return [busy, t('spot.neaArea'), s.description].filter(Boolean).join(' · ')
  return [busy, communityStatus(s, t), featureText(s, t), hoursText(s, t)].filter(Boolean).join(' · ')
}

// All three kinds in one list, nearest first. Open areas are by definition
// uncovered (anything under a roof is amber), so they count as unsheltered.
function toSpots(nearby) {
  const open = nearby.open.map((s, i) => ({ ...s, kind: 'open', id: `open-${i}`, sheltered: false }))
  const dsas = nearby.dsas.map((d) => ({ ...d, kind: 'dsa', id: `dsa-${d.neaId}`, sheltered: null })) // shelter unknown
  const community = (nearby.community ?? []).map((c) => ({ ...c, kind: 'community' }))
  return [...open, ...dsas, ...community].sort((a, b) => a.distanceM - b.distanceM)
}

// Last good Nearby results, kept on the phone for when there's no signal.
const MAX_SAVED_DAYS = 7
function saveNearby(nearby) {
  save(KEYS.lastNearby, JSON.stringify({ at: Date.now(), nearby: { ...nearby, weather: null } }))
}
function savedNearby(you) {
  try {
    const { at, nearby } = JSON.parse(load(KEYS.lastNearby))
    if (Date.now() - at > MAX_SAVED_DAYS * 86_400_000) return null
    // Distances were from where the user was then; work them out again.
    // Who was there then says nothing about now, so drop the busy counts.
    const fromYou = (s) => {
      const distanceM = Math.round(metresBetween(you, s))
      return { ...s, distanceM, walkMin: walkMinutes(distanceM), busyNow: 0 }
    }
    return {
      at,
      nearby: { ...nearby, open: nearby.open.map(fromYou), dsas: nearby.dsas.map(fromYou), community: (nearby.community ?? []).map(fromYou) },
    }
  } catch {
    return null
  }
}

export default function MapScreen() {
  const { geo, locate } = useGeo()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  // A searched place replaces the user's position as the starting point. It
  // lives in the history entry, so coming back from a spot keeps it.
  const place = location.state?.place ?? null
  const setPlace = (p) => navigate('/map', { replace: true, state: p ? { place: p } : null })
  const [searching, setSearching] = useState(false)
  const favourites = useFavourites()
  // offlineAt: set when showing saved results because the server couldn't be reached
  const [state, setState] = useState({ status: 'idle', nearby: null, error: null, offlineAt: null })
  // { "lat,lng": { minutes, metres } } for the nearest spots, once OneMap answers
  const [routes, setRoutes] = useState(null)
  // null = follow the weather; true/false = the user's own choice
  const [shelteredChoice, setShelteredChoice] = useState(() => {
    const saved = load(KEYS.shelteredOnly)
    return saved === null ? null : saved === '1'
  })
  const [needs, setNeeds] = useState(loadNeeds)
  const toggleNeed = (key) => {
    const next = needs.includes(key) ? needs.filter((k) => k !== key) : [...needs, key]
    setNeeds(next)
    save(KEYS.needs, JSON.stringify(next))
  }

  useEffect(() => {
    if (geo.status === 'idle') locate()
  }, [geo.status, locate])

  // Where distances are measured from: the searched place, or the user.
  const origin = place ?? (geo.status === 'ready' ? geo.coords : null)
  const originKey = origin ? `${origin.lat},${origin.lng}` : null
  const isPlace = Boolean(place)

  useEffect(() => {
    if (!originKey) return
    let cancelled = false
    const [lat, lng] = originKey.split(',').map(Number)
    setState({ status: 'loading', nearby: null, error: null, offlineAt: null })
    fetchNearby({ lat, lng })
      .then((nearby) => {
        if (!isPlace) saveNearby(nearby) // the no-signal copy is for where the user is
        if (!cancelled) setState({ status: 'done', nearby, error: null, offlineAt: null })
      })
      .catch((err) => {
        if (cancelled) return
        const saved = err.offline && !isPlace ? savedNearby({ lat, lng }) : null
        if (saved) setState({ status: 'done', nearby: saved.nearby, error: null, offlineAt: saved.at })
        else setState({ status: 'error', nearby: null, error: err.message, offlineAt: null })
      })
    return () => {
      cancelled = true
    }
  }, [originKey, isPlace, geo.at]) // geo.at: "Refresh" can return the same position

  // Then real walking times for the nearest few. The list shows estimates
  // until they arrive, and keeps them if routing fails.
  useEffect(() => {
    setRoutes(null)
    if (state.status !== 'done' || state.offlineAt || !originKey) return
    const nearest = toSpots(state.nearby).slice(0, ROUTED)
    if (!nearest.length) return
    let cancelled = false
    const [lat, lng] = originKey.split(',').map(Number)
    fetchRoutes({ lat, lng }, nearest)
      .then(({ routes: list }) => {
        if (cancelled) return
        const byKey = {}
        nearest.forEach((s, i) => list[i] && (byKey[spotKey(s)] = list[i]))
        setRoutes(byKey)
      })
      .catch(() => {}) // keep the estimates
    return () => {
      cancelled = true
    }
  }, [state.status, state.nearby, state.offlineAt, originKey])

  const weather = state.nearby?.weather
  const shelteredOnly = shelteredChoice ?? Boolean(weather?.raining)
  const baseSpots = useMemo(() => (state.nearby ? toSpots(state.nearby) : []), [state.nearby])
  const allSpots = useMemo(() => withRoutes(baseSpots, routes), [baseSpots, routes])
  // In rain, hide only spots known to be uncovered. NEA areas (shelter unknown)
  // stay: in Orchard they're the only legal places at all.
  const spots = allSpots.filter((s) => (!shelteredOnly || s.sheltered !== false) && meetsNeeds(s, needs))
  const you = origin
  const open = (spot) => navigate('/spot', { state: { spot, from: you } })
  const pick = (p) => {
    setSearching(false)
    setPlace(p)
  }
  const searchBox = searching && <PlaceSearch onPick={pick} onClose={() => setSearching(false)} />
  const saved = you
    ? favourites.list
        .map((f) => {
          const distanceM = Math.round(metresBetween(you, f))
          return { ...f, distanceM, walkMin: walkMinutes(distanceM) }
        })
        .sort((a, b) => a.distanceM - b.distanceM)
    : []
  const toggleSheltered = () => {
    const next = !shelteredOnly
    setShelteredChoice(next)
    save(KEYS.shelteredOnly, next ? '1' : '0')
  }

  if (!you) {
    return (
      <main className="flex flex-1 flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-bold">{t('near.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          {geo.status === 'locating' ? t('common.locating') : geo.error ? t(`geo.${geo.error}`) : t('geo.needed')}
        </p>
        {geo.status !== 'locating' && (
          <button type="button" onClick={locate} className="mx-auto mt-6 rounded-xl bg-go px-6 py-3 font-semibold text-white dark:bg-go-dark dark:text-stone-950">
            {t('common.useLocation')}
          </button>
        )}
        {searching ? (
          <div className="text-left">{searchBox}</div>
        ) : (
          <button type="button" onClick={() => setSearching(true)} className="mx-auto mt-4 text-sm font-medium text-go underline dark:text-go-dark">
            {t('search.button')}
          </button>
        )}
      </main>
    )
  }

  const fit = [you, ...spots.filter((s) => s.distanceM <= MAX_FIT_M)]
  const terminal = place ? null : terminalFor(you)

  return (
    <main className="flex flex-1 flex-col">
      <SgMap center={you} fit={fit} className="h-[42dvh] w-full">
        {!place && <Circle center={[you.lat, you.lng]} radius={you.accuracy} pathOptions={{ color: COLOURS.you, weight: 1, fillOpacity: 0.08 }} />}
        {/* A searched place is a hollow ring, so it doesn't look like "you are here". */}
        <CircleMarker
          center={[you.lat, you.lng]}
          radius={8}
          pathOptions={place ? { color: COLOURS.you, weight: 4, fillColor: '#fff', fillOpacity: 1 } : { color: '#fff', weight: 3, fillColor: COLOURS.you, fillOpacity: 1 }}
        />
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
          <h1 className="text-xl font-bold">{place ? t('search.title') : t('near.title')}</h1>
          <div className="flex shrink-0 items-center gap-4 text-sm font-medium">
            <button type="button" onClick={() => setSearching((s) => !s)} aria-expanded={searching} className="text-go dark:text-go-dark">
              {t('search.short')}
            </button>
            {!place && (
              <button type="button" onClick={locate} className="text-go dark:text-go-dark">
                {t('near.refresh')}
              </button>
            )}
            <Link to="/add" className="rounded-full px-3 py-1.5 text-white" style={{ backgroundColor: COLOURS.community }} aria-label={t('near.addLabel')}>
              {t('near.add')}
            </Link>
          </div>
        </div>

        {searchBox}

        {place && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-stone-900" role="status">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{t('search.near', { name: place.name })}</span>
              {place.address && <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{place.address}</span>}
            </span>
            <button
              type="button"
              onClick={() => {
                setPlace(null)
                if (geo.status !== 'ready') locate()
              }}
              className="shrink-0 text-sm font-medium text-go dark:text-go-dark"
            >
              {t('search.backToMe')}
            </button>
          </div>
        )}

        {state.offlineAt && (
          <p className="mt-3 rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">
            {t('near.offline', {
              when: new Date(state.offlineAt).toLocaleString(lang === 'th' ? 'th-TH' : `${lang}-SG`, {
                ...(Date.now() - state.offlineAt > 12 * 3_600_000 && { day: 'numeric', month: 'short' }),
                hour: 'numeric',
                minute: '2-digit',
              }),
            })}
          </p>
        )}

        {terminal && <ChangiCard key={terminal} terminal={terminal} />}

        {saved.length > 0 && (
          <div className="mt-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{t('near.saved')}</h2>
            <ul className="mt-1 divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
              {saved.slice(0, 5).map((f) => (
                <li key={f.key}>
                  <button type="button" onClick={() => open(f)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-stone-100 dark:active:bg-stone-800">
                    <span className="text-lg" style={{ color: COLOURS[f.kind] }} aria-hidden="true">
                      ★
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{spotTitle(f, t)}</span>
                    <span className="shrink-0 text-sm text-stone-500 dark:text-stone-400">
                      {t('common.approxMin', { n: f.walkMin })} · {distanceText(f.distanceM)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <AlertsCard />
          </div>
        )}

        {weather?.raining && (
          <p className="mt-3 rounded-xl bg-sky-100 px-4 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
            {t('near.rain', { forecast: weather.forecast, area: weather.area, period: weather.period })}
          </p>
        )}

        {state.status === 'done' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={t('near.needs')}>
            <span className="text-stone-500 dark:text-stone-400">{t('near.needs')}</span>
            {[
              { key: 'sheltered', label: 'add.f.sheltered', icon: '☂️', on: shelteredOnly, toggle: toggleSheltered, hint: t('near.shelteredHint') },
              ...NEEDS.map((n) => ({ ...n, icon: n.key === 'hasAshtray' ? '🗑️' : '🪑', on: needs.includes(n.key), toggle: () => toggleNeed(n.key) })),
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-pressed={chip.on}
                title={chip.hint}
                onClick={chip.toggle}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
                  chip.on ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-white shadow-sm dark:bg-stone-900'
                }`}
              >
                <span aria-hidden="true">{chip.on ? '✓' : chip.icon}</span>
                {t(chip.label)}
              </button>
            ))}
          </div>
        )}

        {state.status === 'loading' && (
          <p className="mt-4 text-stone-500 dark:text-stone-400" role="status">
            {t('near.loading')}
          </p>
        )}
        {state.status === 'error' && (
          <p className="mt-4 text-stop dark:text-stop-dark" role="alert">
            {state.error}
          </p>
        )}

        {state.status === 'done' && spots.length === 0 && (
          <p className="mt-4 text-stone-600 dark:text-stone-300">
            {needs.length ? t('near.noneNeeds') : shelteredOnly ? t('near.noneSheltered') : t('near.none', { m: state.nearby.searchRadiusM })}
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
                    <span className="block truncate font-medium">{spotTitle(s, t)}</span>
                    <span className="block truncate text-sm text-stone-500 dark:text-stone-400">{subtitle(s, t)}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-medium">{s.routed ? t('near.walkMin', { n: s.walkMin }) : t('common.approxMin', { n: s.walkMin })}</span>
                    <span className="block text-stone-500 dark:text-stone-400">{distanceText(s.routeM ?? s.distanceM)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {state.status === 'done' && (
          <p className="mt-3 pb-4 text-xs text-stone-500 dark:text-stone-400">
            <span style={{ color: COLOURS.community }}>●</span> {t('near.legendCommunity')} · <span style={{ color: COLOURS.dsa }}>●</span>{' '}
            {t('near.legendNea')} · <span style={{ color: COLOURS.open }}>●</span> {t('near.legendOpen')}
          </p>
        )}
      </section>
    </main>
  )
}
