import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createChecker } from '../src/engine.js'
import { project, unproject, bboxOf, inRings } from '../src/geo.js'
import { buildingRuleFor, parkWithDsas } from '../src/rules.js'
import { elementToZone, stitchRings } from '../src/osm.js'
import { findLegalSpots, walkMinutes } from '../src/nearby.js'
import { CHANGI_AREAS, terminalFor } from '../src/changi.js'
import { decodePolyline } from '../src/polyline.js'

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
    zone({ rule: 'orchard_nsz', kind: 'poly', rings: [square(5000, 0, 500)], name: 'NSZ', osm: null, nearM: 150 }), // estimated boundary
    zone({ rule: 'carpark_building', kind: 'poly', rings: [square(6000, 0, 50)], name: null, osm: 'way/6' }),
    zone({ rule: 'road', kind: 'line', path: [OX + 7000, OY - 500, OX + 7000, OY + 500], bufferM: 10, name: 'Test Ave', osm: 'way/7' }),
    zone({ rule: 'taxi_stand', kind: 'circle', x: OX + 8000, y: OY, r: 10, name: null, osm: 'node/8' }),
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

test('taxi stand: red in the queue area, amber just beyond, green further out', () => {
  const r = check(at(8000 + 6, 0))
  assert.equal(r.verdict, 'red')
  assert.equal(r.reasons[0].rule, 'taxi_stand')
  assert.equal(check(at(8000 + 16, 0)).verdict, 'amber')
  assert.equal(check(at(8000 + 40, 0)).verdict, 'green')
})

test('parkWithDsas finds the NParks parks that have smoking areas, zones included', () => {
  const at = (name) => parkWithDsas({ reasons: [{ rule: 'park', name }] })
  assert.equal(at('East Coast Park (Zone C)'), 'East Coast Park')
  assert.equal(at('Pasir Ris Park'), 'Pasir Ris Park')
  assert.equal(at('Pasir Ris Town Park'), null)
  assert.equal(at('East Coast Terrace Park'), null)
  assert.equal(parkWithDsas({ reasons: [{ rule: 'building', name: 'West Coast Park' }] }), null)
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

test('findLegalSpots: nearest green points first, spaced apart, none inside banned zones', () => {
  // Stand in the middle of the test park: everything within ~100 m is red.
  const spots = findLegalSpots(check, at(2100, 100), { radiusM: 200, limit: 3 })
  assert.ok(spots.length > 0)
  assert.ok(spots.every((s) => check(s).verdict === 'green'))
  assert.ok(spots.every((s, i) => i === 0 || s.distanceM >= spots[i - 1].distanceM))
  assert.ok(spots[0].distanceM > 100, 'first legal spot is outside the 200 m park')
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      const a = project(spots[i].lat, spots[i].lng), b = project(spots[j].lat, spots[j].lng)
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 59)
    }
  }
})

test('a road never changes the verdict, but flags onRoad within its own width', () => {
  const onRoad = check(at(7008, 0))
  assert.equal(onRoad.verdict, 'green')
  assert.equal(onRoad.onRoad, true)
  assert.equal(onRoad.reasons.length, 0)
  assert.equal(check(at(7015, 0)).onRoad, false)
})

test('findLegalSpots skips points on a road', () => {
  const spots = findLegalSpots(check, at(7000, 0), { radiusM: 40, spacingM: 5, limit: 50 })
  assert.ok(spots.length > 0)
  assert.ok(spots.every((s) => !check(s).onRoad))
  assert.ok(spots[0].distanceM > 10)
})

test('findLegalSpots does not list a DSA as an open area', () => {
  const spots = findLegalSpots(check, at(5250, 250), { radiusM: 30, spacingM: 1, limit: 100 })
  assert.ok(spots.every((s) => !check(s).designatedArea))
})

test('findLegalSpots returns nothing when the whole area is banned', () => {
  assert.deepEqual(findLegalSpots(check, at(5250, 100), { radiusM: 100 }), [])
})

test('walkMinutes is at least 1 and grows with distance', () => {
  assert.equal(walkMinutes(0), 1)
  assert.ok(walkMinutes(400) > walkMinutes(100))
})

test('Changi: 32 areas across T1-T4; terminal found from the check or by distance', () => {
  assert.equal(CHANGI_AREAS.length, 32)
  assert.deepEqual([...new Set(CHANGI_AREAS.map((a) => a.terminal))].sort(), ['T1', 'T2', 'T3', 'T4'])
  assert.ok(CHANGI_AREAS.every((a) => ['public', 'transit'].includes(a.zone) && a.where))
  // Inside T3's building outline, even if T2's centre happens to be nearer
  assert.equal(terminalFor({ lat: 1.3540, lng: 103.9890, reasons: [{ rule: 'building', osm: 'way/173010413' }] }), 'T3')
  assert.equal(terminalFor({ lat: 1.3388, lng: 103.9843 }), 'T4')
  assert.equal(terminalFor({ lat: 1.3138, lng: 103.8159 }), null) // Botanic Gardens
})

test("decodePolyline reads OneMap's documented sample", () => {
  assert.deepEqual(decodePolyline('{u`GktxxR?G'), [
    [1.3195, 103.84214],
    [1.3195, 103.84218],
  ])
})

test('a zone can carry its own near band (estimated boundary) over the rule default', () => {
  const wide = zone({ rule: 'orchard_nsz', kind: 'poly', rings: [square(8000, 0, 100)], nearM: 150 })
  const exact = zone({ rule: 'orchard_nsz', kind: 'poly', rings: [square(9000, 0, 100)] })
  const c = createChecker({ zones: [wide, exact], dsas: [] })
  assert.equal(c(at(8100 + 100, 50)).verdict, 'amber') // 100 m outside the estimate
  assert.equal(c(at(9100 + 100, 50)).verdict, 'green') // 100 m outside the official line
  assert.equal(c(at(9100 + 5, 50)).verdict, 'amber') // still cautious right at the edge
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
