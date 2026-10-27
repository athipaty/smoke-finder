// NEA names come in capitals: "THE PARAGON" -> "The Paragon"
export const titleCase = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Of|And|At|The|In)\b(?!$)/g, (w, _m, i) => (i === 0 ? w : w.toLowerCase()))

export const distanceText = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)

export const directionsUrl = ({ lat, lng }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
