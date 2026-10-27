// Downloads raw data into data/raw/. Re-running skips files that already
// exist; pass --force to download everything again.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES } from '../src/rules.js'

const RAW = join(import.meta.dirname, '..', 'data', 'raw')
const FORCE = process.argv.includes('--force')
const OVERPASS = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'smoke-finder-sg/0.1 (data pipeline)'
const NEA_DSA_DATASET = 'd_d0fa8f07ef80ab23feaa3b870323bf27'

// Singapore split into tiles so the building query stays under Overpass limits.
const SG_BBOX = { s: 1.15, w: 103.59, n: 1.48, e: 104.1 }
const TILE_ROWS = 3
const TILE_COLS = 4

const exists = (path) => access(path).then(() => true, () => false)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function overpass(query, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      body: new URLSearchParams({ data: query }),
    })
    if (res.ok) return res.json()
    if (i === attempts || ![429, 502, 503, 504].includes(res.status)) {
      throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    console.log(`  Overpass busy (${res.status}), retrying in ${15 * i}s`)
    await sleep(15000 * i)
  }
}

async function save(name, fetcher) {
  const path = join(RAW, name)
  if (!FORCE && (await exists(path))) {
    console.log(`skip  ${name} (exists)`)
    return
  }
  const started = Date.now()
  const body = await fetcher()
  await writeFile(path, JSON.stringify(body))
  const count = body.elements?.length ?? body.features?.length ?? '?'
  console.log(`saved ${name}: ${count} items in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  await sleep(2000) // be polite to the public Overpass server
}

async function fetchNeaDsa() {
  const poll = await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${NEA_DSA_DATASET}/poll-download`)
  const { data } = await poll.json()
  if (!data?.url) throw new Error('data.gov.sg did not return a download URL')
  const res = await fetch(data.url)
  if (!res.ok) throw new Error(`NEA DSA download failed: ${res.status}`)
  return res.json()
}

await mkdir(RAW, { recursive: true })

await save('nea-dsa.geojson', fetchNeaDsa)

for (const rule of RULES.filter((r) => r.query)) {
  const selectors = rule.query.map((q) => `${q}(area.sg);`).join('')
  await save(`osm-${rule.id}.json`, () =>
    overpass(`[out:json][timeout:180];area["ISO3166-1"="SG"][admin_level=2]->.sg;(${selectors});out geom;`),
  )
}

const dLat = (SG_BBOX.n - SG_BBOX.s) / TILE_ROWS
const dLng = (SG_BBOX.e - SG_BBOX.w) / TILE_COLS
for (let row = 0; row < TILE_ROWS; row++) {
  for (let col = 0; col < TILE_COLS; col++) {
    const s = SG_BBOX.s + row * dLat
    const w = SG_BBOX.w + col * dLng
    const bbox = [s, w, s + dLat, w + dLng].map((v) => v.toFixed(4)).join(',')
    await save(`osm-buildings-${row}-${col}.json`, () =>
      overpass(`[out:json][timeout:180];way["building"](${bbox});out geom;`),
    )
  }
}

console.log('done')
