// Fetches NEA's official Orchard Road No Smoking Zone boundary from OneMap's
// themes API and writes data/orchard-nsz.json, which is committed (the boundary
// rarely changes, so the weekly refresh doesn't need OneMap credentials).
//
//   ONEMAP_EMAIL=... ONEMAP_PASSWORD=... npm run fetch:nsz
//   npm run fetch:nsz -- --list     only list the themes that mention smoking
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const API = 'https://www.onemap.gov.sg/api'
const OUT = join(import.meta.dirname, '..', 'data', 'orchard-nsz.json')

const { ONEMAP_EMAIL: email, ONEMAP_PASSWORD: password } = process.env
if (!email || !password) {
  console.error('Set ONEMAP_EMAIL and ONEMAP_PASSWORD (e.g. in smoke-finder/.env).')
  process.exit(1)
}

async function json(url, init) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${url.split('?')[0]}: ${JSON.stringify(body).slice(0, 200)}`)
  return body
}

const { access_token: token } = await json(`${API}/auth/post/getToken`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const auth = { headers: { Authorization: token } }

const { Theme_Names: themes = [] } = await json(`${API}/public/themesvc/getAllThemesInfo?moreInfo=Y`, auth)
const smoking = themes.filter((t) => /smok/i.test(`${t.THEMENAME} ${t.QUERYNAME}`))
console.log(`${themes.length} OneMap themes; mentioning smoking:`)
for (const t of smoking) console.log(`  ${t.QUERYNAME}  "${t.THEMENAME}"  (${t.CATEGORY ?? ''} / ${t.THEME_OWNER ?? ''})`)
if (process.argv.includes('--list')) process.exit(0)

// The zone theme is the one whose name mentions a no-smoking zone and that has polygons.
const candidates = smoking.filter((t) => /zone|nsz/i.test(`${t.THEMENAME} ${t.QUERYNAME}`))
let picked = null
for (const t of candidates.length ? candidates : smoking) {
  const { SrchResults: results = [] } = await json(`${API}/public/themesvc/retrieveTheme?queryName=${encodeURIComponent(t.QUERYNAME)}`, auth)
  const polygons = results
    .filter((r) => r.Type === 'Polygon' && r.LatLng)
    .map((r) => JSON.parse(r.LatLng).map(([lng, lat]) => [lat, lng])) // OneMap gives [lng, lat]
    .filter((poly) => poly.length >= 4)
  console.log(`  ${t.QUERYNAME}: ${results.length - 1} features, ${polygons.length} polygon(s)`)
  if (polygons.length && !picked) picked = { theme: t.QUERYNAME, themeName: t.THEMENAME, polygons }
}
if (!picked) {
  console.error('No smoking-zone theme with polygons found. Run with --list and check the names above.')
  process.exit(1)
}

// Sanity check: the boundary must contain Orchard Road (outside ION Orchard).
const inside = (lat, lng, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
if (!picked.polygons.some((p) => inside(1.30395, 103.83185, p))) {
  console.error(`Theme ${picked.theme} does not contain Orchard Road; not saving it.`)
  process.exit(1)
}

await writeFile(
  OUT,
  JSON.stringify(
    {
      source: 'OneMap themes API (NEA)',
      theme: picked.theme,
      themeName: picked.themeName,
      fetchedAt: new Date().toISOString(),
      polygons: picked.polygons.map((p) => p.map(([lat, lng]) => [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6])),
    },
    null,
    1,
  ),
)
console.log(`Saved ${picked.polygons.length} polygon(s) from "${picked.themeName}" to data/orchard-nsz.json`)
