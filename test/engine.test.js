import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createChecker } from '../src/engine.js'
import { project, unproject, bboxOf, inRings } from '../src/geo.js'
import { buildingRuleFor } from '../src/rules.js'
import { elementToZone, stitchRings } from '../src/osm.js'

// Everything is laid out in metres around an origin in Tampines, then
// converted back to lat/lng for the checker.
const [OX, OY] = project(1.3521, 103.9447)
const at = (dx, dy) => {
  const [lat, lng] = unproject(OX + dx, OY + dy)
  return { lat, lng }
}
const square = (x0, y0, size) => [x0, y0, x0 + size, y0, x0 + size, y0 + size, x0, y0 + size, x0, y0].map((v, i) => v + (i % 2 ? OY : OX))
const zone = (z) => ({ ...z, bbox: bboxOf(z) })

const data = {
  zones: [
    zone({ rule: 'bus_stop', kind: 'circle', x: OX + 1000, y: OY, r: 7, name: 'Blk 201', osm: 'node/1' }),
    zone({ rule: 'park', kind: 'poly', rings: [square(2000, 0, 200)], name: 'Tampines Eco Green', osm: 'way/2' }),
    zone({ rule: 'building', kind: 'poly', rings: [square(3000, 0, 40)], name: 'Blk 123', osm: 'way/3' }),
    zone({ rule: 'covered_walkway', kind: 'line', path: [OX + 4000, OY, OX + 4100, OY], name: null, osm: 'way/4' }),
    zone({ rule: 'orchard_nsz', kind: 'poly', rings: [square(5000, 0, 500)], name: 'NSZ', osm: null }),
    zone({ rule: 'carpark_building', kind: 'poly', rings: [square(6000, 0, 50)], name: null, osm: 'way/6' }),
  ],
  dsas: [{ id: 1, name: 'TEST MALL', description: 'Back of building', x: OX + 5250, y: OY + 250 }],
  builtAt: '2026-10-27T00:00:00Z',
}
const check = createChecker(data)

test('open area with good GPS is green', () => {
  const r = check({ ...at(-500, -500), accuracyM: 5 })
  assert.equal(r.verdict, 'green')
  assert.equal(r.reasons.length, 0)
  assert.equal(r.fineNote, null)
})

test('poor GPS turns a clear area amber', () => {
  const r = check({ ...at(-500, -500), accuracyM: 40 })
  assert.equal(r.verdict, 'amber')
  assert.match(r.summary, /accurate to 40 m/)
})

test('bus stop: red within shelter radius + 5 m, amber just beyond, green further out', () => {
  assert.equal(check(at(1000 + 11, 0)).verdict, 'red')
  const near = check(at(1000 + 18, 0))
  assert.equal(near.verdict, 'amber')
  assert.equal(near.reasons[0].how, 'near')
  assert.equal(check(at(1000 + 40, 0)).verdict, 'green')
})

test('inside a park is red and names the park', () => {
  const r = check(at(2100, 100))
  assert.equal(r.verdict, 'red')
  assert.equal(r.reasons[0].rule, 'park')
  assert.equal(r.reasons[0].name, 'Tampines Eco Green')
  assert.ok(r.fineNote)
})

test('inside a building is red; within 5 m of it is amber; beyond is green', () => {
  assert.equal(check(at(3020, 20)).verdict, 'red')
  const nearWall = check(at(3043, 20))
  assert.equal(nearWall.verdict, 'amber')
  assert.equal(nearWall.reasons[0].how, 'buffer')
  assert.equal(check(at(3060, 20)).verdict, 'green')
})

test('covered walkway counts as a 2 m wide line', () => {
  assert.equal(check(at(4050, 1.5)).verdict, 'red')
})

test('Orchard NSZ: red away from a DSA, green at the DSA, amber just outside the boundary', () => {
  assert.equal(check(at(5100, 100)).verdict, 'red')
  const atDsa = check({ ...at(5253, 250), accuracyM: 8 })
  assert.equal(atDsa.verdict, 'green')
  assert.equal(atDsa.designatedArea.name, 'TEST MALL')
  assert.equal(check(at(5600, 250)).verdict, 'amber')
})

test('a DSA with poor GPS is amber, not green', () => {
  assert.equal(check({ ...at(5250, 250), accuracyM: 35 }).verdict, 'amber')
})

test('inside a multi-storey carpark is amber', () => {
  assert.equal(check(at(6025, 25)).verdict, 'amber')
})

test('reasons list the most severe first', () => {
  const r = check(at(3043, 20))
  assert.ok(r.reasons.every((x, i, a) => i === 0 || a[i - 1].verdict !== 'amber' || x.verdict !== 'red'))
})

test('inRings tells points inside the boundary from points outside it', () => {
  const rings = [square(0, 0, 100)]
  const inside = at(50, 50)
  const outside = at(150, 50)
  assert.equal(inRings(inside.lat, inside.lng, rings), true)
  assert.equal(inRings(outside.lat, outside.lng, rings), false)
})

test('landed homes are skipped; HDB blocks, roofs and carparks are classified', () => {
  assert.equal(buildingRuleFor({ building: 'terrace' }), null)
  assert.equal(buildingRuleFor({ building: 'house' }), null)
  assert.equal(buildingRuleFor({ building: 'apartments' }), 'building')
  assert.equal(buildingRuleFor({ building: 'yes' }), 'building')
  assert.equal(buildingRuleFor({ building: 'roof' }), 'shelter')
  assert.equal(buildingRuleFor({ building: 'parking' }), 'carpark_building')
})

test('relation outer ways are stitched into one ring, reversed pieces included', () => {
  const a = [0, 0, 10, 0, 10, 10]
  const b = [0, 0, 0, 10, 10, 10] // runs the other way round
  const rings = stitchRings([a, b])
  assert.equal(rings.length, 1)
  assert.deepEqual(rings[0].slice(0, 2), rings[0].slice(-2))
})

test('OSM node becomes a circle, closed way a polygon, open way a line', () => {
  const rule = { id: 'bus_stop', pointRadiusM: 7 }
  assert.equal(elementToZone({ type: 'node', id: 1, lat: 1.35, lon: 103.9 }, rule).kind, 'circle')
  const ring = [[1.35, 103.9], [1.35, 103.901], [1.351, 103.901], [1.35, 103.9]].map(([lat, lon]) => ({ lat, lon }))
  assert.equal(elementToZone({ type: 'way', id: 2, geometry: ring }, rule).kind, 'poly')
  assert.equal(elementToZone({ type: 'way', id: 3, geometry: ring.slice(0, 3) }, rule).kind, 'line')
  assert.equal(elementToZone({ type: 'way', id: 4, geometry: ring }, { ...rule, geom: 'line' }).kind, 'line')
})
