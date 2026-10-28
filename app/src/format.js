// NEA names come in capitals: "THE PARAGON" -> "The Paragon"
export const titleCase = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Of|And|At|The|In)\b(?!$)/g, (w, _m, i) => (i === 0 ? w : w.toLowerCase()))

export const distanceText = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)

// Straight-line metres between two points; fine at Singapore's scale. Walking
// time uses the same rough factors as the engine's nearby.js.
export function metresBetween(a, b) {
  const kx = 111320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot((b.lng - a.lng) * kx, (b.lat - a.lat) * 110574)
}
export const walkMinutes = (m) => Math.max(1, Math.round((m * 1.3) / 80))

// Built at display time (not stored), so saved spots follow a language change.
export function spotTitle(spot, t) {
  if (spot.kind === 'dsa') return titleCase(spot.name)
  if (spot.kind === 'open') return t('spot.openTitle')
  return spot.name ?? t('spot.communityTitle')
}

// `t` is the i18n translate function (useI18n().t).
export function sinceText(date, t) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days < 1) return t('since.today')
  if (days === 1) return t('since.yesterday')
  if (days < 60) return t('since.days', { n: days })
  return t('since.months', { n: Math.round(days / 30) })
}

// Opening hours as typed by whoever added the spot; "24h" is translated.
export const hoursText = (s, t) => (s.hours === '24h' ? t('hours.24h') : s.hours ?? '')

export const featureText = (s, t) =>
  [s.sheltered && t('feature.sheltered'), s.hasAshtray && t('feature.ashtray'), s.hasSeating && t('feature.seats')]
    .filter(Boolean)
    .join(' · ')

export const directionsUrl =({ lat, lng }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`

// Which spot a "busy now" check-in is for; open areas have none.
export function checkinKey(spot) {
  if (spot.kind === 'community') return `c:${spot.id}`
  if (spot.kind === 'dsa') return `nea:${spot.neaId}`
  return null
}
