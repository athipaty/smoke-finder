import { project, unproject } from './geo.js'

const WALK_FACTOR = 1.3 // streets are rarely straight; crude until a routing API is used
const WALK_M_PER_MIN = 80

export const walkMinutes = (distanceM) => Math.max(1, Math.round((distanceM * WALK_FACTOR) / WALK_M_PER_MIN))

/**
 * Finds the nearest points around (lat, lng) where `check` returns green.
 * Scans a square grid out to `radiusM`, nearest cells first, and keeps
 * results at least `spacingM` apart so they are distinct places.
 *
 * @param {(input: { lat: number, lng: number }) => { verdict: string }} check  from createChecker
 */
export function findLegalSpots(check, { lat, lng }, { radiusM = 250, stepM = 10, spacingM = 60, limit = 5 } = {}) {
  const [ox, oy] = project(lat, lng)
  const cells = []
  const n = Math.floor(radiusM / stepM)
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const d = Math.hypot(i * stepM, j * stepM)
      if (d <= radiusM) cells.push({ dx: i * stepM, dy: j * stepM, d })
    }
  }
  cells.sort((a, b) => a.d - b.d)

  const found = []
  for (const cell of cells) {
    if (found.length >= limit) break
    const x = ox + cell.dx, y = oy + cell.dy
    if (found.some((f) => Math.hypot(f.x - x, f.y - y) < spacingM)) continue
    const [pLat, pLng] = unproject(x, y)
    const r = check({ lat: pLat, lng: pLng })
    // DSAs are listed on their own, and a spot on a road is no use even if legal.
    if (r.verdict !== 'green' || r.designatedArea || r.onRoad) continue
    found.push({ x, y, lat: pLat, lng: pLng })
  }

  return found.map(({ lat, lng, x, y }) => {
    const distanceM = Math.round(Math.hypot(x - ox, y - oy))
    return { lat: round6(lat), lng: round6(lng), distanceM, walkMin: walkMinutes(distanceM) }
  })
}

const round6 = (v) => Math.round(v * 1e6) / 1e6
