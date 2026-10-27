import { project, bboxOf } from './geo.js'

const flatten = (geometry) => geometry.flatMap((p) => project(p.lat, p.lon))

const isClosed = (flat) =>
  flat.length >= 8 && flat[0] === flat.at(-2) && flat[1] === flat.at(-1)

// Joins relation member ways that share end points into closed rings.
// Rings that never close are dropped.
export function stitchRings(paths) {
  const open = paths.map((p) => [...p])
  const rings = []
  while (open.length) {
    let ring = open.shift()
    let grew = true
    while (!isClosed(ring) && grew) {
      grew = false
      const ex = ring.at(-2), ey = ring.at(-1)
      for (let i = 0; i < open.length; i++) {
        const p = open[i]
        if (p[0] === ex && p[1] === ey) {
          ring = ring.concat(p.slice(2))
        } else if (p.at(-2) === ex && p.at(-1) === ey) {
          const rev = []
          for (let k = p.length - 2; k >= 0; k -= 2) rev.push(p[k], p[k + 1])
          ring = ring.concat(rev.slice(2))
        } else continue
        open.splice(i, 1)
        grew = true
        break
      }
    }
    if (isClosed(ring)) rings.push(ring)
  }
  return rings
}

// Converts one Overpass element (fetched with `out geom`) into a zone, or null.
export function elementToZone(el, rule) {
  const base = { rule: rule.id, osm: `${el.type}/${el.id}`, name: el.tags?.name ?? null }
  let zone = null

  if (el.type === 'node') {
    if (!rule.pointRadiusM) return null
    const [x, y] = project(el.lat, el.lon)
    zone = { ...base, kind: 'circle', x, y, r: rule.pointRadiusM }
  } else if (el.type === 'way' && el.geometry?.length >= 2) {
    const flat = flatten(el.geometry)
    zone = rule.geom !== 'line' && isClosed(flat)
      ? { ...base, kind: 'poly', rings: [flat] }
      : { ...base, kind: 'line', path: flat }
  } else if (el.type === 'relation' && el.members) {
    // Holes (inner rings) are ignored on purpose: treating them as banned errs on the safe side.
    const outers = el.members
      .filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry?.length >= 2)
      .map((m) => flatten(m.geometry))
    const rings = stitchRings(outers)
    if (rings.length) zone = { ...base, kind: 'poly', rings }
  }

  if (!zone) return null
  // Lines only get the rule's buffer; an open way for an area rule (e.g. a
  // park outline split oddly) is still worth keeping as a line.
  zone.bbox = bboxOf(zone)
  return zone
}
