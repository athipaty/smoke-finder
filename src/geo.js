// Flat-earth projection around Singapore. Over ~50 km the error is well under
// 0.1%, so distances in metres can use plain Pythagoras.
const LAT0 = 1.35
const LNG0 = 103.82
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180)
const KY = 110574

const round = (v) => Math.round(v * 10) / 10

export const project = (lat, lng) => [round((lng - LNG0) * KX), round((lat - LAT0) * KY)]

export const unproject = (x, y) => [y / KY + LAT0, x / KX + LNG0]

// Rings and paths are flat arrays: [x0, y0, x1, y1, ...]
export function pointInRing(px, py, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export const inRings = (lat, lng, rings) => {
  const [x, y] = project(lat, lng)
  return rings.some((ring) => pointInRing(x, y, ring))
}

export function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function pathDistance(px, py, path) {
  let best = Infinity
  for (let i = 0; i + 3 < path.length; i += 2) {
    const d = segmentDistance(px, py, path[i], path[i + 1], path[i + 2], path[i + 3])
    if (d < best) best = d
  }
  return best
}

// Distance from a point to a zone's shape in metres; 0 when inside.
export function zoneDistance(px, py, zone) {
  if (zone.kind === 'circle') return Math.max(0, Math.hypot(px - zone.x, py - zone.y) - zone.r)
  if (zone.kind === 'line') return pathDistance(px, py, zone.path)
  if (zone.rings.some((ring) => pointInRing(px, py, ring))) return 0
  return Math.min(...zone.rings.map((ring) => pathDistance(px, py, ring)))
}

export function bboxOf(zone) {
  if (zone.kind === 'circle') return [zone.x - zone.r, zone.y - zone.r, zone.x + zone.r, zone.y + zone.r]
  const coords = zone.kind === 'line' ? [zone.path] : zone.rings
  const b = [Infinity, Infinity, -Infinity, -Infinity]
  for (const flat of coords) {
    for (let i = 0; i < flat.length; i += 2) {
      if (flat[i] < b[0]) b[0] = flat[i]
      if (flat[i + 1] < b[1]) b[1] = flat[i + 1]
      if (flat[i] > b[2]) b[2] = flat[i]
      if (flat[i + 1] > b[3]) b[3] = flat[i + 1]
    }
  }
  return b
}

// Monotone-chain convex hull over [[x, y], ...]; returns a closed flat ring.
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list) => {
    const out = []
    for (const p of list) {
      while (out.length >= 2 && cross(out.at(-2), out.at(-1), p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  const hull = [...half(pts), ...half([...pts].reverse())]
  return [...hull, hull[0]].flat()
}

// Pushes every hull vertex outward from the centroid by `metres`.
// Good enough for a rough boundary; not a true polygon offset.
export function inflateRing(ring, metres) {
  const n = ring.length / 2 - 1
  let cx = 0, cy = 0
  for (let i = 0; i < n * 2; i += 2) { cx += ring[i]; cy += ring[i + 1] }
  cx /= n; cy /= n
  const out = []
  for (let i = 0; i < ring.length; i += 2) {
    const dx = ring[i] - cx, dy = ring[i + 1] - cy
    const len = Math.hypot(dx, dy) || 1
    out.push(round(ring[i] + (dx / len) * metres), round(ring[i + 1] + (dy / len) * metres))
  }
  return out
}
