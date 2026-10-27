// Changi Airport designated smoking areas, as listed (in words, without map
// positions) on https://www.changiairport.com/en/at-changi/facilities-and-services-directory/smoking-areas.html
// Read 2026-10-27. All open daily, with seats and ashtray bins. Smoking is only
// allowed in these areas at the airport. Locations are copied as written;
// they are not placed on the map because the page gives no coordinates.
//
// `zone`: 'public' = before immigration (kerbside); 'transit' = after immigration.

export const CHANGI_SOURCE = 'https://www.changiairport.com/en/at-changi/facilities-and-services-directory/smoking-areas.html'

// Terminal building centres (OpenStreetMap outlines), to tell which terminal
// someone is at. `osm` matches the building zone the F1 check reports.
export const TERMINALS = [
  { id: 'T1', lat: 1.36271, lng: 103.99108, osm: 'way/26561741' },
  { id: 'T2', lat: 1.35379, lng: 103.99045, osm: 'way/173010412' },
  { id: 'T3', lat: 1.35461, lng: 103.98508, osm: 'way/173010413' },
  { id: 'T4', lat: 1.33879, lng: 103.98427, osm: 'way/409015814' },
]

export const CHANGI_AREAS = [
  { terminal: 'T1', zone: 'public', level: '1', where: 'Kerbside, East (near Coach Stand)' },
  { terminal: 'T1', zone: 'public', level: '2', where: 'Kerbside, East (near door 5)' },
  { terminal: 'T1', zone: 'public', level: '2', where: 'Kerbside, West (near door 1)' },
  { terminal: 'T2', zone: 'public', level: '1', where: 'Kerbside, South (near Lift Lobby 13/14)' },
  { terminal: 'T2', zone: 'public', level: '1', where: 'Kerbside, North (near Lift Lobby 15/16)' },
  { terminal: 'T2', zone: 'public', level: '2', where: 'Kerbside, North (near Lift Lobby 15/16)' },
  { terminal: 'T3', zone: 'public', level: '1', where: 'Kerbside South (near Coach Stand)' },
  { terminal: 'T3', zone: 'public', level: '2', where: 'Kerbside North (near door 8)' },
  { terminal: 'T3', zone: 'public', level: '2', where: 'Kerbside North (near door 1)' },
  { terminal: 'T3', zone: 'public', level: '1', where: 'Kerbside North (near Lift Lobby PL12/13)' },
  { terminal: 'T4', zone: 'public', level: '1', where: 'Kerbside North (near coach lounge)' },
  { terminal: 'T4', zone: 'public', level: '1', where: 'Kerbside South (near door 4)' },
  { terminal: 'T4', zone: 'public', level: '2', where: 'Kerbside South (near door 6)' },
  { terminal: 'T1', zone: 'transit', level: '2', where: 'Departure Transit Hall East (near Gate C16)' },
  { terminal: 'T1', zone: 'transit', level: '2', where: 'Departure Transit Hall East (near Gate D36)' },
  { terminal: 'T1', zone: 'transit', level: '2', where: 'Departure Transit Hall West (Outdoor Deck near Quick Bites area)' },
  { terminal: 'T1', zone: 'transit', level: '3', where: 'Departure Transit Hall West (near Cactus Garden)' },
  { terminal: 'T1', zone: 'transit', level: '3', where: 'Departure Transit Hall Central (near Snooze Lounge)' },
  { terminal: 'T2', zone: 'transit', level: '2', where: 'Departure Transit Hall, South Finger Pier (Pavilion Lounge)' },
  { terminal: 'T2', zone: 'transit', level: '2', where: 'Departure Transit Hall South (next to GST refund counters)' },
  { terminal: 'T2', zone: 'transit', level: '3', where: 'Departure Transit Hall South (Sunflower Garden)' },
  { terminal: 'T2', zone: 'transit', level: '2', where: 'Departure Transit Hall, North Finger Pier (Sanctuary Lounge)' },
  { terminal: 'T2', zone: 'transit', level: '2', where: "Departure Transit Hall North (next to Children's Play Area)" },
  { terminal: 'T3', zone: 'transit', level: '2', where: 'Departure Transit Hall North, Indoor Smoking Area (opposite Butterfly Garden)' },
  { terminal: 'T3', zone: 'transit', level: '2', where: 'Departure Transit Hall South, Indoor Smoking Area (Garden Terrace near Gate A1 to A8, opposite Koi Pond)' },
  { terminal: 'T3', zone: 'transit', level: '2', where: 'Departure Transit Hall South, Outdoor Smoking Area (next to Gate A21)' },
  { terminal: 'T3', zone: 'transit', level: '2', where: 'Departure Transit Hall North, Outdoor Smoking Area (opposite Gate B10)' },
  { terminal: 'T3', zone: 'transit', level: '2', where: 'Departure Transit Hall South, Outdoor Smoking Area (Garden Terrace next to Gate A1 to A8 and Koi Pond)' },
  { terminal: 'T4', zone: 'transit', level: '2', where: 'Departure Transit Hall North (near Gate G4)' },
  { terminal: 'T4', zone: 'transit', level: '2', where: 'Departure Transit Hall North (near Heritage)' },
  { terminal: 'T4', zone: 'transit', level: '2', where: 'Departure Transit Hall North Pier (near Gate G16)' },
  { terminal: 'T4', zone: 'transit', level: '2M', where: 'Departure Transit Hall North (near Lift Lobby 10/11)' },
]

const NEAR_TERMINAL_M = 900

// Which terminal a check result or a position points to, or null.
// A check that reports being inside a terminal building wins over distance.
export function terminalFor({ lat, lng, reasons = [] }) {
  const inside = reasons.find((r) => TERMINALS.some((t) => t.osm === r.osm))
  if (inside) return TERMINALS.find((t) => t.osm === inside.osm).id
  let best = null
  for (const t of TERMINALS) {
    const d = Math.hypot((t.lng - lng) * 111320 * Math.cos((lat * Math.PI) / 180), (t.lat - lat) * 110574)
    if (d <= NEAR_TERMINAL_M && (!best || d < best.d)) best = { id: t.id, d }
  }
  return best?.id ?? null
}
