// Usage: npm run check -- <lat> <lng> [accuracyM]
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createChecker } from './engine.js'

const [lat, lng, accuracyM] = process.argv.slice(2).map(Number)
if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
  console.error('Usage: npm run check -- <lat> <lng> [accuracyM]')
  process.exit(1)
}

const data = JSON.parse(await readFile(join(import.meta.dirname, '..', 'data', 'zones.json'), 'utf8'))
const check = createChecker(data)

const started = performance.now()
const result = check({ lat, lng, accuracyM })
const ms = (performance.now() - started).toFixed(2)

const COLOURS = { green: '\x1b[32m', amber: '\x1b[33m', red: '\x1b[31m' }
console.log(`${COLOURS[result.verdict]}${result.verdict.toUpperCase()}\x1b[0m  ${result.headline}`)
console.log(result.summary)
for (const r of result.reasons) {
  console.log(`  - ${r.verdict.padEnd(5)} ${r.label}${r.name ? ` "${r.name}"` : ''}: ${r.distanceM} m (${r.how})`)
}
if (result.fineNote) console.log(result.fineNote)
console.log(`${result.disclaimer}  [${ms} ms]`)
