// Downloads raw data into data/raw/. Re-running skips files that already
// exist; pass --force to download everything again, or --max-age-days=N to
// download again only files older than N days (the weekly refresh resumes a
// failed run this way instead of starting over).
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES } from '../src/rules.js'

const RAW = join(import.meta.dirname, '..', 'data', 'raw')
const FORCE = process.argv.includes('--force')
const MAX_AGE_DAYS = Number(process.argv.find((a) => a.startsWith('--max-age-days='))?.split('=')[1] ?? Infinity)
// Tried in turn when one is busy. The mirror can lag the main server by weeks.
const OVERPASS_SERVERS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ]
const USER_AGENT = 'smoke-finder-sg/0.1 (data pipeline)'
const NEA_DSA_DATASET = 'd_d0fa8f07ef80ab23feaa3b870323bf27'

// Singapore split into tiles so the building query stays under Overpass limits.
const SG_BBOX = { s: 1.15, w: 103.59, n: 1.48, e: 104.1 }
const TILE_ROWS = 3
const TILE_COLS = 4

// Age of a file in days, or null if it doesn't exist.
const ageDays = (path) => stat(path).then((s) => (Date.now() - s.mtimeMs) / 86_400_000, () => null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// A server that stops answering mid-download would otherwise hang the job for
// hours; give up on the request and try the other server instead.
const REQUEST_TIMEOUT_MS = 5 * 60_000

async function overpass(query, attempts = 15) {
  for (let i = 1; i <= attempts; i++) {
    const server = OVERPASS_SERVERS[(i - 1) % OVERPASS_SERVERS.length]
    const res = await fetch(server, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((err) => ({ ok: false, status: 0, text: async () => err.message }))
    if (res.ok) {
      // The body can stall too; the same timeout signal covers reading it.
      const body = await res.json().catch((err) => ({ failed: `stopped mid-download: ${err.message}` }))
      // Overpass answers 200 with partial data and a "runtime error" remark
      // when a query runs out of time or memory. Never keep that.
      if (/runtime error/i.test(body.remark ?? '')) body.failed = `incomplete answer: ${body.remark.slice(0, 120)}`
      if (!body.failed) return body
      if (i === attempts) throw new Error(`Overpass ${new URL(server).host}: ${body.failed}`)
      console.log(`  ${new URL(server).host} ${body.failed}, retrying`)
      continue
    }
    if (i === attempts || ![0, 429, 502, 503, 504].includes(res.status)) {
      throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    const wait = Math.min(15 * i, 120)
    console.log(`  ${new URL(server).host} ${res.status ? `busy (${res.status})` : `unreachable (${(await res.text()).slice(0, 80)})`}, retrying in ${wait}s`)
    await sleep(wait * 1000)
  }
  throw new Error('Overpass: out of attempts')
}

async function save(name, fetcher) {
  const path = join(RAW, name)
  const age = await ageDays(path)
  if (!FORCE && age !== null && age < MAX_AGE_DAYS) {
    console.log(`skip  ${name} (${age.toFixed(1)} days old)`)
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

for (const rule of RULES.filter((r) => r.query && !r.tiled)) {
  const selectors = rule.query.map((q) => `${q}(area.sg);`).join('')
  await save(`osm-${rule.id}.json`, () =>
    overpass(`[out:json][timeout:180];area["ISO3166-1"="SG"][admin_level=2]->.sg;(${selectors});out geom;`),
  )
}

// Tiles are rectangles that also catch Johor Bahru and Batam;
// build-zones.js clips them to this boundary.
await save('osm-sg-boundary.json', () =>
  overpass('[out:json][timeout:180];rel["ISO3166-1"="SG"][admin_level=2];out geom;'),
)

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
    for (const rule of RULES.filter((r) => r.tiled)) {
      const selectors = rule.query.map((q) => `${q}(${bbox});`).join('')
      await save(`osm-${rule.id}-${row}-${col}.json`, () => overpass(`[out:json][timeout:180];(${selectors});out geom;`))
    }
  }
}

console.log('done')
