// Turns data/raw/ into data/zones.json, the single file the engine loads.
import { readFile, readdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES, RULES_BY_ID, buildingRuleFor } from '../src/rules.js'
import { elementToZone } from '../src/osm.js'
import { project, bboxOf, convexHull, inflateRing, zoneDistance } from '../src/geo.js'

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
for (const rule of RULES.filter((r) => r.query && !r.tiled)) {
  const raw = await readJson(`osm-${rule.id}.json`)
  osmTimestamp ??= raw.osm3s?.timestamp_osm_base ?? null
  for (const el of raw.elements) {
    const zone = elementToZone(el, rule)
    if (zone) add(zone)
  }
}

// Tiled layers (buildings, roads): deduplicated across tiles and clipped to Singapore
const sg = elementToZone((await readJson('osm-sg-boundary.json')).elements[0], { id: 'sg' })
if (!sg) throw new Error('Could not assemble the Singapore boundary')
const inSingapore = (zone) => {
  const x = (zone.bbox[0] + zone.bbox[2]) / 2
  const y = (zone.bbox[1] + zone.bbox[3]) / 2
  return zoneDistance(x, y, sg) === 0
}
const rawFiles = await readdir(RAW)

// `toZone(el)` returns a zone or null; tile files are `osm-<prefix>-<row>-<col>.json`.
async function addTiled(prefix, toZone) {
  let outside = 0
  const seen = new Set()
  for (const file of rawFiles.filter((f) => new RegExp(`^osm-${prefix}-\\d+-\\d+\\.json$`).test(f))) {
    for (const el of (await readJson(file)).elements) {
      if (seen.has(el.id)) continue
      seen.add(el.id)
      const zone = toZone(el)
      if (!zone) continue
      if (inSingapore(zone)) add(zone)
      else outside++
    }
  }
  console.log(`${prefix}: ${seen.size} downloaded, ${outside} outside Singapore skipped`)
}

await addTiled('buildings', (el) => {
  const ruleId = buildingRuleFor(el.tags)
  if (!ruleId) return null
  const zone = elementToZone(el, { ...RULES_BY_ID[ruleId], geom: 'area' })
  return zone?.kind === 'poly' ? zone : null
})

for (const rule of RULES.filter((r) => r.tiled)) {
  await addTiled(rule.id, (el) => {
    const zone = elementToZone(el, rule)
    if (zone && rule.bufferFor) zone.bufferM = rule.bufferFor(el.tags)
    return zone
  })
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

// Orchard Road No Smoking Zone: NEA's official boundary (data/orchard-nsz.json,
// written by scripts/fetch-nsz.js and committed), or else an estimate from the
// DSAs, which only exist inside it. The estimate gets a wide amber band.
const nszFile = join(DATA, 'orchard-nsz.json')
let nszSource
try {
  const official = JSON.parse(await readFile(nszFile, 'utf8'))
  const rings = official.polygons.map((poly) => poly.flatMap(([lat, lng]) => project(lat, lng)))
  const nsz = { rule: 'orchard_nsz', osm: null, name: 'Orchard Road No Smoking Zone', kind: 'poly', rings }
  nsz.bbox = bboxOf(nsz)
  add(nsz)
  nszSource = `official (${official.theme}, fetched ${official.fetchedAt.slice(0, 10)}, ${rings.length} polygon(s))`
} catch (err) {
  if (err.code !== 'ENOENT') throw err
  const hull = inflateRing(convexHull(dsas.map((d) => [d.x, d.y])), NSZ_MARGIN_M)
  const nsz = { rule: 'orchard_nsz', osm: null, name: 'Orchard Road No Smoking Zone (estimated)', kind: 'poly', rings: [hull], nearM: 150 }
  nsz.bbox = bboxOf(nsz)
  add(nsz)
  nszSource = 'estimated from the DSAs (data/orchard-nsz.json not found)'
}
console.log(`Orchard NSZ boundary: ${nszSource}`)

const out = {
  version: 1,
  builtAt: new Date().toISOString(),
  sources: {
    osm: { timestamp: osmTimestamp, licence: 'ODbL, © OpenStreetMap contributors' },
    nea: { dataset: 'Designated Smoking Areas, data.gov.sg', count: dsas.length },
  },
  // Lets the API turn away points outside Singapore (e.g. Johor Bahru), where these rules don't apply.
  boundary: sg.rings,
  zones,
  dsas,
}

const path = join(DATA, 'zones.json')
await writeFile(path, JSON.stringify(out))
const mb = ((await stat(path)).size / 1e6).toFixed(1)

console.table(Object.entries(counts).map(([rule, n]) => ({ rule, zones: n })))
console.log(`${zones.length} zones, ${dsas.length} DSAs -> data/zones.json (${mb} MB)`)
