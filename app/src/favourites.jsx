import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { load, save } from './storage.js'
import { useI18n } from './i18n/index.jsx'
import { spotTitle } from './format.js'
import { alertsEnabled, syncAlerts } from './alerts.js'

// Saved spots ("my office spot") live only on this phone. A saved spot is a
// copy of what the app showed when it was saved; community spots are
// re-fetched when opened, so a removed one is noticed then.
const KEY = 'sf.favourites'
const MAX = 20

// Open areas are computed, so their list ids change; key them by position instead.
export const favouriteKey = (spot) =>
  spot.kind === 'open' ? `open:${spot.lat.toFixed(5)},${spot.lng.toFixed(5)}` : `${spot.kind}:${spot.kind === 'dsa' ? spot.neaId : spot.id}`

// No display titles: those are built per language at render time (spotTitle).
const FIELDS = ['kind', 'id', 'neaId', 'name', 'lat', 'lng', 'description', 'photo', 'sheltered', 'hasAshtray', 'hasSeating']

function readAll() {
  try {
    const list = JSON.parse(load(KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const FavouritesContext = createContext(null)

// What alerts need from each saved spot; labels are in the current language.
export const alertPoints = (list, t) => list.map((f) => ({ key: f.key, label: spotTitle(f, t), lat: f.lat, lng: f.lng }))

const SYNC_KEY = 'sf.alertsSynced'

export function FavouritesProvider({ children }) {
  const [list, setList] = useState(readAll)
  const { lang, t } = useI18n()

  // With alerts on, keep the server's copy of the saved spots up to date.
  useEffect(() => {
    if (!alertsEnabled()) return
    const points = alertPoints(list, t)
    const signature = JSON.stringify([lang, points])
    if (load(SYNC_KEY) === signature) return
    const timer = setTimeout(() => {
      syncAlerts(points, lang)
        .then((r) => r && save(SYNC_KEY, signature))
        .catch(() => {}) // try again next time something changes
    }, 1000)
    return () => clearTimeout(timer)
  }, [list, lang, t])

  const update = useCallback((fn) => {
    setList((prev) => {
      const next = fn(prev)
      save(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      list,
      isSaved: (spot) => list.some((f) => f.key === favouriteKey(spot)),
      toggle: (spot) =>
        update((prev) => {
          const key = favouriteKey(spot)
          if (prev.some((f) => f.key === key)) return prev.filter((f) => f.key !== key)
          const copy = Object.fromEntries(FIELDS.filter((k) => spot[k] !== undefined).map((k) => [k, spot[k]]))
          return [{ ...copy, key, savedAt: new Date().toISOString() }, ...prev].slice(0, MAX)
        }),
      remove: (key) => update((prev) => prev.filter((f) => f.key !== key)),
    }),
    [list, update],
  )

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export const useFavourites = () => useContext(FavouritesContext)
