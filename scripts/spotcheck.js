// Checks real places against the built data. Coordinates are approximate,
// so a failure means "look at this", not necessarily a bug. With --strict
// (used by the scheduled refresh) any unexpected result exits non-zero, so
// a suspicious dataset is never imported.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createChecker } from '../src/engine.js'

const CASES = [
  { place: 'Singapore Botanic Gardens, middle', lat: 1.3138, lng: 103.8159, expect: 'red' },
  { place: 'MacRitchie Reservoir, on the water', lat: 1.3440, lng: 103.8220, expect: 'red' },
  { place: 'East Coast Park, beach', lat: 1.3010, lng: 103.9120, expect: 'red' },
  { place: 'Orchard Road outside ION', lat: 1.3039, lng: 103.8318, expect: 'red' },
  { place: 'Orchard Road, between DSAs on the street', lat: 1.3016, lng: 103.8380, expect: 'red' },
  { place: 'NEA DSA: The Paragon (side of building)', lat: 1.3040475, lng: 103.8350909, expect: 'green', accuracyM: 5 },
  { place: 'Changi Airport T3, inside the terminal', lat: 1.3555, lng: 103.9865, expect: 'red' },
  { place: 'Tiny open field, Pulau Ubin (far from buildings)', lat: 1.4150, lng: 103.9750, expect: 'green' },
  // expectRule: the answer must also name this rule, not just be red for another reason.
  { place: 'Taxi stand F02 outside Ang Mo Kio MRT', lat: 1.3698269, lng: 103.8494387, expect: 'red', expectRule: 'taxi_stand' },
]

const data = JSON.parse(await readFile(join(import.meta.dirname, '..', 'data', 'zones.json'), 'utf8'))
const check = createChecker(data)

let ok = 0
const started = performance.now()
for (const c of CASES) {
  const r = check(c)
  const pass = r.verdict === c.expect && (!c.expectRule || r.reasons.some((x) => x.rule === c.expectRule))
  if (pass) ok++
  const why = r.designatedArea ? `DSA ${r.designatedArea.name}` : r.reasons.slice(0, 2).map((x) => `${x.rule}${x.name ? `:${x.name}` : ''}`).join(', ')
  console.log(`${pass ? 'PASS' : 'LOOK'}  ${c.place}: ${r.verdict} (expected ${c.expect})  ${why}`)
}
const perCheck = ((performance.now() - started) / CASES.length).toFixed(2)
console.log(`\n${ok}/${CASES.length} as expected, ${perCheck} ms per check, data built ${data.builtAt}`)

// Rough throughput over random points across Singapore
const N = 20000
const t0 = performance.now()
for (let i = 0; i < N; i++) check({ lat: 1.27 + Math.random() * 0.17, lng: 103.65 + Math.random() * 0.33 })
console.log(`${N} random checks: ${((performance.now() - t0) / N).toFixed(3)} ms each`)

if (process.argv.includes('--strict') && ok !== CASES.length) {
  console.error(`--strict: ${CASES.length - ok} place(s) gave an unexpected result`)
  process.exitCode = 1
}
