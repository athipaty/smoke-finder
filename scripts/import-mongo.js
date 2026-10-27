// Loads data/zones.json into MongoDB for the center-kitchen backend (/api/smoke).
// Writes to *_next collections first and swaps them in by rename, so the API
// never sees a half-imported dataset.
//
//   MONGO_URI=... npm run import      (or put MONGO_URI in smoke-finder/.env)
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MongoClient } from 'mongodb'
import { RULES_BY_ID } from '../src/rules.js'
import { unproject } from '../src/geo.js'

const BATCH = 5000

const uri = process.env.MONGO_URI
if (!uri) {
  console.error('Set MONGO_URI (e.g. in smoke-finder/.env) first.')
  process.exit(1)
}

// ZONES_FILE lets a test import a different file; normally data/zones.json.
const data = JSON.parse(await readFile(process.env.ZONES_FILE ?? join(import.meta.dirname, '..', 'data', 'zones.json'), 'utf8'))

// Bounding box + legal buffer as a lng/lat rectangle; the API finds candidates with it.
function areaOf(zone) {
  const pad = zone.bufferM ?? RULES_BY_ID[zone.rule]?.bufferM ?? 0
  const [x0, y0, x1, y1] = zone.bbox
  const [s, w] = unproject(x0 - pad, y0 - pad)
  const [n, e] = unproject(x1 + pad, y1 + pad)
  return { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] }
}

async function replaceCollection(db, name, docs, indexes) {
  const next = db.collection(`${name}_next`)
  await next.drop().catch(() => {})
  for (let i = 0; i < docs.length; i += BATCH) {
    await next.insertMany(docs.slice(i, i + BATCH), { ordered: false })
    process.stdout.write(`\r  ${name}: ${Math.min(i + BATCH, docs.length)}/${docs.length}`)
  }
  process.stdout.write('\n')
  for (const index of indexes) await next.createIndex(index)
  await next.rename(name, { dropTarget: true })
}

const FORCE = process.argv.includes('--force')
const MIN_RULE_SHARE = 0.85 // a rule with 50+ zones may not shrink by more than 15%
const MIN_TOTAL_SHARE = 0.9
const MIN_DSA_SHARE = 0.8

// Refuses to replace live data with a much smaller dataset (e.g. Overpass
// returned partial results). Returns a list of problems; empty means OK.
function shrinkProblems(previous, counts, dsaCount) {
  if (!previous?.counts) return []
  const problems = []
  for (const [rule, before] of Object.entries(previous.counts)) {
    const now = counts[rule] ?? 0
    if (before >= 50 && now < before * MIN_RULE_SHARE) problems.push(`${rule}: ${before} -> ${now}`)
  }
  const total = (c) => Object.values(c).reduce((a, b) => a + b, 0)
  if (total(counts) < total(previous.counts) * MIN_TOTAL_SHARE) problems.push(`total: ${total(previous.counts)} -> ${total(counts)}`)
  if (dsaCount < (previous.dsaCount ?? 0) * MIN_DSA_SHARE) problems.push(`NEA DSAs: ${previous.dsaCount} -> ${dsaCount}`)
  return problems
}

const counts = {}
for (const z of data.zones) counts[z.rule] = (counts[z.rule] ?? 0) + 1

const client = new MongoClient(uri)
try {
  await client.connect()
  const db = client.db()
  console.log(`Importing into database "${db.databaseName}"`)

  const previous = await db.collection('smokemeta').findOne({ _id: 'current' })
  const problems = shrinkProblems(previous, counts, data.dsas.length)
  if (problems.length && !FORCE) {
    console.error('Refusing to import: the new data is much smaller than the live data.')
    for (const p of problems) console.error(`  ${p}`)
    console.error('Check the fetch, or run with --force if the drop is real.')
    process.exitCode = 1
    throw new Error('import refused')
  }
  if (problems.length) console.warn(`Importing anyway (--force): ${problems.join('; ')}`)

  await replaceCollection(db, 'smokezones', data.zones.map((z) => ({ ...z, area: areaOf(z) })), [
    { area: '2dsphere' },
    { rule: 1 },
  ])
  await replaceCollection(
    db,
    'smokedsas',
    data.dsas.map(({ id, ...d }) => ({ neaId: id, ...d, location: { type: 'Point', coordinates: [d.lng, d.lat] } })),
    [{ location: '2dsphere' }],
  )

  await db.collection('smokemeta').replaceOne(
    { _id: 'current' },
    {
      builtAt: data.builtAt,
      importedAt: new Date().toISOString(),
      sources: data.sources,
      counts,
      dsaCount: data.dsas.length,
      boundary: data.boundary,
    },
    { upsert: true },
  )

  const stats = await db.command({ collStats: 'smokezones' })
  console.log(`Done. smokezones: ${(stats.storageSize / 1e6).toFixed(1)} MB stored, ${(stats.totalIndexSize / 1e6).toFixed(1)} MB indexes`)
} catch (err) {
  if (err.message !== 'import refused') throw err
} finally {
  await client.close()
}
