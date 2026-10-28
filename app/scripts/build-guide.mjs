// Builds the public guide pages (plain HTML Google can read) into dist/guide/,
// plus sitemap.xml and robots.txt. Runs after `vite build`. Rules come from the
// same src/rules.js the checker uses; NEA areas from the live API (if that's
// unreachable the Orchard page links to the app instead of failing the build).
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES, NEA_SOURCE, RULES_CHECKED, PARKS_WITH_DSAS } from '../../src/rules.js'

const SITE = 'https://smoke-finder-eight.vercel.app'
const API = process.env.VITE_API_URL ?? 'https://center-kitchen-backend.onrender.com/api/smoke'
const DIST = join(import.meta.dirname, '..', 'dist')
const OUT = join(DIST, 'guide')

// Sentosa Development Corporation's list (sentosa.com.sg/smoking-prohibition-at-sentosa-beaches, read 28 Oct 2026).
const SENTOSA = {
  'Siloso Beach': ['Outside Beach Station Car Park, opposite Palawan Green', 'Outside Sapphire Pavilion', 'Siloso Point (Siloso Beach end)', 'Outside Beach Station Car Park, opposite Wings of Time'],
  'Palawan Beach': ['Near the suspension bridge', 'Near FOC Sentosa, opposite Palawan East Restrooms', 'Near Palawan Kidz City'],
  'Tanjong Beach': ['Middle of Tanjong Beach', 'Between Tanjong Beach Car Park and Tanjong Beach Club'],
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, b, c) => b + c.toUpperCase())
const day = (iso) => new Date(`${iso}T12:00:00+08:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })

const PAGES = [
  { slug: 'where-can-i-smoke-in-singapore', title: 'Where can you smoke in Singapore?', short: 'The rules' },
  { slug: 'orchard-road-smoking-areas', title: 'Orchard Road smoking areas', short: 'Orchard Road' },
  { slug: 'sentosa-smoking-areas', title: 'Sentosa smoking areas', short: 'Sentosa' },
  { slug: 'parks-with-smoking-areas', title: 'Parks with smoking areas in Singapore', short: 'Parks' },
]

function layout({ slug, title, description, body }) {
  const nav = PAGES.map((p) => (p.slug === slug ? `<b>${esc(p.short)}</b>` : `<a href="/guide/${p.slug}.html">${esc(p.short)}</a>`)).join(' · ')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Smoke Finder SG</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}/guide/${slug}.html">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="/icon.svg">
<style>
:root{--bg:#f5f5f4;--card:#fff;--ink:#1c1917;--muted:#57534e;--line:#e7e5e4;--go:#1b7d44;--stop:#c0392b}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--card:#1c1917;--ink:#f5f5f4;--muted:#a8a29e;--line:#292524;--go:#3fb872;--stop:#e5604f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:44rem;margin:0 auto;padding:1.25rem 1rem 3rem}a{color:var(--go)}
h1{font-size:1.75rem;line-height:1.2;margin:.75rem 0 .25rem}h2{font-size:1.1rem;margin:1.75rem 0 .5rem}
.muted{color:var(--muted);font-size:.9rem}.nav{font-size:.9rem;color:var(--muted)}
.card{background:var(--card);border-radius:1rem;padding:.25rem 1rem;box-shadow:0 1px 2px rgb(0 0 0/.06)}
.card li{padding:.7rem 0;border-bottom:1px solid var(--line)}.card li:last-child{border:0}ul.card{list-style:none;margin:0}
.cta{display:block;text-align:center;background:var(--go);color:#fff;font-weight:600;border-radius:.9rem;padding:.9rem;margin:1.5rem 0;text-decoration:none}
@media (prefers-color-scheme:dark){.cta{color:#0c0a09}}
.small{font-size:.85rem}.red{color:var(--stop);font-weight:600}
</style>
</head>
<body>
<main>
<p class="nav"><a href="/">Smoke Finder SG</a> › Guide: ${nav}</p>
<h1>${esc(title)}</h1>
${body}
<a class="cta" href="/">Check if you can smoke where you are →</a>
<p class="muted small">Guidance only, based on NEA rules (<a href="${NEA_SOURCE}">NEA smoking prohibition</a>) and open map data. Always follow signs on site. Fines are up to $1,000. For adults aged 21 and over. Thinking of quitting? Free help: <a href="https://www.healthhub.sg/programmes/iquit">I Quit programme</a>. Rules last checked against NEA's list on ${day(RULES_CHECKED.on)}.</p>
</main>
</body>
</html>
`
}

function rulesPage() {
  const banned = RULES.filter((r) => r.inside === 'red' && r.id !== 'orchard_nsz')
  const signs = RULES.filter((r) => r.inside === 'amber')
  const item = (r) => `<li><b>${esc(r.label)}</b>${r.bufferM ? ` <span class="muted">(+${r.bufferM} m around)</span>` : ''}<br><span class="muted">${esc(r.reason)}</span></li>`
  return layout({
    slug: PAGES[0].slug,
    title: PAGES[0].title,
    description: "Singapore's smoking rules in plain English: where smoking is banned (bus stops, parks, HDB void decks, taxi stands and more), the Orchard Road No Smoking Zone, and where it's usually allowed.",
    body: `<p>In Singapore, smoking is allowed in open public spaces unless the place is on the National Environment Agency's (NEA) list. Fines go up to $1,000.</p>
<h2 class="red">Never allowed (${banned.length})</h2><ul class="card">${banned.map(item).join('')}</ul>
<h2>Orchard Road</h2><p>The whole Orchard Road precinct is a No Smoking Zone. Smoking is only allowed inside its marked designated smoking areas: <a href="/guide/orchard-road-smoking-areas.html">see all Orchard Road smoking areas</a>.</p>
<h2>Check the signs (${signs.length})</h2><ul class="card">${signs.map(item).join('')}</ul>
<h2>Usually allowed</h2><ul class="card">${['Open public spaces, away from the places above', 'Surface carparks', 'Uncovered top decks of multi-storey carparks', 'Uncovered walkways', 'Open spaces in housing estates and town centres (not void decks)', 'Approved smoking corners in coffee shops', 'Smoking rooms in offices, the airport and nightlife outlets'].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<p class="muted">Also see: <a href="/guide/sentosa-smoking-areas.html">Sentosa smoking areas</a> · <a href="/guide/parks-with-smoking-areas.html">parks with smoking areas</a>.</p>`,
  })
}

async function orchardPage() {
  let dsas = null
  try {
    const res = await fetch(`${API}/dsas`, { signal: AbortSignal.timeout(20_000) })
    if (res.ok) dsas = await res.json()
  } catch {
    // unreachable: the page still explains the rule and links to the app
  }
  const list = dsas?.length
    ? `<p>There are <b>${dsas.length}</b> NEA designated smoking areas in the Orchard Road No Smoking Zone. Outside these marked areas, smoking anywhere in the zone can be fined.</p>
<ul class="card">${dsas
        .map((d) => `<li><b>${esc(titleCase(d.name))}</b>${d.description ? `<br><span class="muted">${esc(d.description)}</span>` : ''}<br><span class="small"><a href="https://www.google.com/maps/search/?api=1&amp;query=${d.lat},${d.lng}">Google Maps</a> · <a href="/spot?nea=${d.neaId}">open in the app</a></span></li>`)
        .join('')}</ul>`
    : `<p>The list of NEA designated smoking areas couldn't be loaded when this page was built. <a href="/map">Open the app's Nearby list</a> to see them.</p>`
  return layout({
    slug: PAGES[1].slug,
    title: PAGES[1].title,
    description: `All${dsas?.length ? ` ${dsas.length}` : ''} NEA designated smoking areas in the Orchard Road No Smoking Zone, with descriptions and map links.`,
    body: `<p>Since 2019 the Orchard Road precinct has been a No Smoking Zone, expanded along Exeter Road and Killiney Road in February 2024. You can only smoke inside the yellow-marked designated smoking areas (DSAs).</p>${list}
<p class="muted small">Source: NEA designated smoking areas (data.gov.sg), refreshed weekly.</p>`,
  })
}

function sentosaPage() {
  return layout({
    slug: PAGES[2].slug,
    title: PAGES[2].title,
    description: "Sentosa's designated smoking areas at Siloso, Palawan and Tanjong beaches. Smoking on Sentosa's beaches is banned.",
    body: `<p>Smoking is banned on Sentosa's three beaches (Siloso, Palawan and Tanjong). Sentosa Development Corporation officers enforce it: a $200 composition sum, or a fine of up to $1,000 in court. Use the designated smoking areas near the beaches instead.</p>
${Object.entries(SENTOSA)
  .map(([beach, places]) => `<h2>${esc(beach)}</h2><ul class="card">${places.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`)
  .join('')}
<p class="muted small">Source: <a href="https://www.sentosa.com.sg/smoking-prohibition-at-sentosa-beaches">Sentosa: smoking prohibited at Sentosa beaches</a>. Look for the Designated Smoking Area signs on site; the app shows these areas at approximate positions.</p>`,
  })
}

function parksPage() {
  return layout({
    slug: PAGES[3].slug,
    title: PAGES[3].title,
    description: 'Smoking is banned in all Singapore parks, except in designated smoking areas in these 12 NParks parks.',
    body: `<p>Smoking is banned in all parks, gardens and nature reserves in Singapore. NParks provides designated smoking areas in these ${PARKS_WITH_DSAS.length} parks, usually near the carparks or away from the main park area:</p>
<ul class="card">${PARKS_WITH_DSAS.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
<p>NParks doesn't publish the exact positions, so look for the signs when you're there.</p>
<p class="muted small">Source: <a href="https://www.nparks.gov.sg/visit/when-visiting-parks/etiquette/parks-dos-donts">NParks: parks dos and don'ts</a>.</p>`,
  })
}

await mkdir(OUT, { recursive: true })
const pages = [rulesPage(), await orchardPage(), sentosaPage(), parksPage()]
for (const [i, html] of pages.entries()) await writeFile(join(OUT, `${PAGES[i].slug}.html`), html)

const today = new Date().toISOString().slice(0, 10)
const urls = ['/', ...PAGES.map((p) => `/guide/${p.slug}.html`)]
await writeFile(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
)
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nDisallow: /admin\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`guide: ${pages.length} pages, sitemap.xml, robots.txt`)
