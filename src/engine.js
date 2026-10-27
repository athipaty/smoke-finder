import { project, zoneDistance } from './geo.js'
import { RULES_BY_ID, NEA_SOURCE, FINE_NOTE, DISCLAIMER } from './rules.js'

const CELL_M = 100
const DSA_RADIUS_M = 10
const MIN_NEAR_M = 10
const MAX_NEAR_M = 150 // also the widest rule-specific nearM (Orchard NSZ)
const GOOD_ACCURACY_M = 20

const RANK = { green: 0, amber: 1, red: 2 }

const HEADLINES = {
  green: 'You can smoke here',
  amber: 'Not sure. Check the signs',
  red: 'Not allowed here',
}

const cellKey = (cx, cy) => `${cx},${cy}`

// A zone can carry its own buffer (e.g. a road's width); otherwise the rule's applies.
const bufferOf = (zone, rule) => zone.bufferM ?? rule?.bufferM ?? 0

function buildIndex(zones) {
  const grid = new Map()
  zones.forEach((zone, i) => {
    const pad = bufferOf(zone, RULES_BY_ID[zone.rule])
    const [x0, y0, x1, y1] = zone.bbox
    for (let cx = Math.floor((x0 - pad) / CELL_M); cx <= Math.floor((x1 + pad) / CELL_M); cx++) {
      for (let cy = Math.floor((y0 - pad) / CELL_M); cy <= Math.floor((y1 + pad) / CELL_M); cy++) {
        const key = cellKey(cx, cy)
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(i)
      }
    }
  })
  return grid
}

function candidates(grid, x, y, radius) {
  const seen = new Set()
  for (let cx = Math.floor((x - radius) / CELL_M); cx <= Math.floor((x + radius) / CELL_M); cx++) {
    for (let cy = Math.floor((y - radius) / CELL_M); cy <= Math.floor((y + radius) / CELL_M); cy++) {
      for (const i of grid.get(cellKey(cx, cy)) ?? []) seen.add(i)
    }
  }
  return seen
}

// Verdict for one zone, or null when the point is clear of it.
function judge(zone, rule, d, nearM) {
  const buffer = bufferOf(zone, rule)
  if (d === 0 || (zone.kind === 'line' && d <= buffer)) return { verdict: rule.inside, how: 'inside' }
  if (d <= buffer) return { verdict: rule.bufferVerdict ?? rule.inside, how: 'buffer' }
  const near = rule.nearM ?? nearM
  if (near > 0 && rule.inside === 'red' && d <= buffer + near) return { verdict: 'amber', how: 'near' }
  return null
}

/**
 * @param {{ zones: object[], dsas: object[], builtAt?: string }} data  output of build-zones.js
 * @returns {(input: { lat: number, lng: number, accuracyM?: number }) => object}
 */
export function createChecker(data) {
  const zones = data.zones
  const grid = buildIndex(zones)

  return function check({ lat, lng, accuracyM = 0 }) {
    const [x, y] = project(lat, lng)
    const accuracy = Number.isFinite(accuracyM) ? accuracyM : 0
    const nearM = Math.min(MAX_NEAR_M, Math.max(MIN_NEAR_M, accuracy))

    let dsa = null
    for (const d of data.dsas) {
      const dist = Math.hypot(x - d.x, y - d.y)
      if (dist <= DSA_RADIUS_M && (!dsa || dist < dsa.distanceM)) dsa = { ...d, distanceM: Math.round(dist) }
    }

    const byRule = new Map()
    let onRoad = false
    for (const i of candidates(grid, x, y, MAX_NEAR_M + 10)) {
      const zone = zones[i]
      const rule = RULES_BY_ID[zone.rule]
      if (!rule) continue
      const d = zoneDistance(x, y, zone)
      if (rule.avoid) {
        if (d <= bufferOf(zone, rule)) onRoad = true
        continue
      }
      const hit = judge(zone, rule, d, nearM)
      if (!hit) continue
      const prev = byRule.get(rule.id)
      if (prev && (RANK[prev.verdict] > RANK[hit.verdict] || (prev.verdict === hit.verdict && prev.distanceM <= d))) continue
      byRule.set(rule.id, {
        rule: rule.id,
        label: rule.label,
        reason: rule.reason,
        verdict: hit.verdict,
        how: hit.how,
        distanceM: Math.round(d * 10) / 10,
        name: zone.name,
        osm: zone.osm,
      })
    }

    const reasons = [...byRule.values()].sort(
      (a, b) => RANK[b.verdict] - RANK[a.verdict] || a.distanceM - b.distanceM,
    )

    let verdict
    if (dsa) {
      verdict = accuracy > GOOD_ACCURACY_M ? 'amber' : 'green'
    } else {
      verdict = reasons.reduce((v, r) => (RANK[r.verdict] > RANK[v] ? r.verdict : v), 'green')
      if (verdict === 'green' && accuracy > GOOD_ACCURACY_M) verdict = 'amber'
    }

    return {
      verdict,
      headline: HEADLINES[verdict],
      summary: summarise(verdict, reasons, dsa, accuracy),
      reasons,
      designatedArea: dsa,
      onRoad,
      fineNote: verdict === 'green' ? null : FINE_NOTE,
      disclaimer: DISCLAIMER,
      source: NEA_SOURCE,
      accuracyM: accuracy,
      dataBuiltAt: data.builtAt ?? null,
    }
  }
}

function summarise(verdict, reasons, dsa, accuracy) {
  if (dsa) {
    const where = `NEA designated smoking area: ${dsa.name}${dsa.description ? ` (${dsa.description})` : ''}`
    return verdict === 'green' ? where : `${where}. GPS is only accurate to ${Math.round(accuracy)} m.`
  }
  const top = reasons[0]
  if (verdict === 'red') return top.reason
  if (verdict === 'amber') {
    if (!top) return `GPS is only accurate to ${Math.round(accuracy)} m, so we can't be sure.`
    if (top.how === 'near') return `You're about ${Math.round(top.distanceM)} m from a no-smoking place (${top.label.toLowerCase()}). Move further away to be safe.`
    return top.reason
  }
  return 'Open public area. No no-smoking places nearby in our data.'
}
