// "Can I smoke here?" without signal. After each online check the app keeps the
// map data around that place (from /api/smoke/area); with no signal it runs the
// same rules engine as the server on that data. Kept on the phone only.
import { fetchArea } from './api.js'
import { metresBetween } from './format.js'
import { load, save, KEYS } from './storage.js'

const MAX_AREAS = 5 // about 100 KB each
const REFRESH_DAYS = 7 // the map data is rebuilt weekly
const MAX_AGE_DAYS = 30 // older than this, better no answer than an old one
const DAY_MS = 86_400_000

const loadEngine = () => import('../../src/engine.js')

function readAreas() {
  try {
    return JSON.parse(load(KEYS.offlineAreas) ?? '[]')
  } catch {
    return []
  }
}

// A full phone storage drops the oldest areas until the list fits.
function writeAreas(areas) {
  for (let list = areas; list.length; list = list.slice(0, -1)) {
    try {
      localStorage.setItem(KEYS.offlineAreas, JSON.stringify(list))
      return
    } catch {
      // try again with one fewer
    }
  }
  save(KEYS.offlineAreas, '[]')
}

// The saved area whose usable part contains the point, if any.
function areaFor(point, areas, maxAgeDays) {
  return areas.find((a) => Date.now() - a.savedAt < maxAgeDays * DAY_MS && metresBetween(point, a) <= a.usableM)
}

// Called after an online check: keep the data around this place, unless a
// recent copy already covers it. Errors don't matter; it's only a backup.
export async function keepAreaAround(point) {
  const areas = readAreas()
  if (areaFor(point, areas, REFRESH_DAYS)) return
  try {
    const [area] = await Promise.all([fetchArea(point), loadEngine()]) // fetching the engine now caches it for later
    const others = areas.filter((a) => metresBetween(a, area) > area.usableM)
    writeAreas([{ ...area, savedAt: Date.now() }, ...others].slice(0, MAX_AREAS))
  } catch {
    // no signal or server busy: try again after the next check
  }
}

// The answer from saved data, or null if no saved area covers the point.
// The result carries `offline: { savedAt, builtAt }` for the "no signal" note.
export async function offlineCheck({ lat, lng, accuracy }) {
  const area = areaFor({ lat, lng }, readAreas(), MAX_AGE_DAYS)
  if (!area) return null
  let createChecker
  try {
    ;({ createChecker } = await loadEngine())
  } catch {
    return null // the engine file was never downloaded on this phone
  }
  const result = createChecker(area)({ lat, lng, accuracyM: accuracy ?? 0 })
  return { ...result, offline: { savedAt: area.savedAt, builtAt: area.builtAt } }
}
