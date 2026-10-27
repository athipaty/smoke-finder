// Turns data/raw/ into data/zones.json, the single file the engine loads.
import { readFile, readdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES, RULES_BY_ID, buildingRuleFor } from '../src/rules.js'
import { elementToZone } from '../src/osm.js'
import { project, bboxOf, convexHull, inflateRing } from '../src/geo.js'

const DATA = join(import.meta.dirname, '..', 'data')
const RAW = join(DATA, 'raw')
const NSZ_MARGIN_M = 60 // how far past the outermost DSAs the zone is assumed to reach

const readJson = async (name) => JSON.parse(await readFile(join(RAW, name), 'utf8'))

const zones = []
const counts = {}
const add = (zone) => {
  zones.push(zone)
  counts[zone.rule] = (counts[zone.rule] ?? 0) + 1
}

// OSM rules
let osmTimestamp = null
for (const rule of RULES.filter((r) => r.query)) {
  const raw = await readJson(`osm-${rule.id}.json`)
  osmTimestamp ??= raw.osm3s?.timestamp_osm_base ?? null
  for (const el of raw.elements) {
    const zone = elementToZone(el, rule)
    if (zone) add(zone)
  }
}

// Buildings, deduplicated across tiles
const seen = new Set()
const tiles = (await readdir(RAW)).filter((f) => f.startsWith('osm-buildings-'))
for (const file of tiles) {
  for (const el of (await readJson(file)).elements) {
    if (seen.has(el.id)) continue
    seen.add(el.id)
    const ruleId = buildingRuleFor(el.tags)
    if (!ruleId) continue
    const zone = elementToZone(el, { ...RULES_BY_ID[ruleId], geom: 'area' })
    if (zone?.kind === 'poly') add(zone)
  }
}

// NEA designated smoking areas
const dsaRaw = await readJson('nea-dsa.geojson')
const dsas = dsaRaw.features.map((f) => {
  const [lng, lat] = f.geometry.coordinates
  const [x, y] = project(lat, lng)
  return {
    id: f.properties.OBJECTID,
    name: f.properties.BUILDING_N,
    description: f.properties.DESCRIPTION ?? null,
    photo: f.properties.PHOTOURL ?? null,
    lat, lng, x, y,
  }
})

// Orchard Road No Smoking Zone, approximated from the DSAs (they only exist inside it).
// TODO: replace with the official boundary traced from NEA's OneMap layer.
const hull = inflateRing(convexHull(dsas.map((d) => [d.x, d.y])), NSZ_MARGIN_M)
const nsz = { rule: 'orchard_nsz', osm: null, name: 'Orchard Road No Smoking Zone (approximate)', kind: 'poly', rings: [hull] }
nsz.bbox = bboxOf(nsz)
add(nsz)

const out = {
  version: 1,
  builtAt: new Date().toISOString(),
  sources: {
    osm: { timestamp: osmTimestamp, licence: 'ODbL, © OpenStreetMap contributors' },
    nea: { dataset: 'Designated Smoking Areas, data.gov.sg', count: dsas.length },
  },
  zones,
  dsas,
}

const path = join(DATA, 'zones.json')
await writeFile(path, JSON.stringify(out))
const mb = ((await stat(path)).size / 1e6).toFixed(1)

console.table(Object.entries(counts).map(([rule, n]) => ({ rule, zones: n })))
console.log(`${zones.length} zones, ${dsas.length} DSAs -> data/zones.json (${mb} MB)`)
