// Decodes an encoded polyline (Google format, 5 decimal places), as OneMap
// returns for walking routes. Returns [[lat, lng], ...].
export function decodePolyline(encoded, precision = 5) {
  const factor = 10 ** precision
  const points = []
  let i = 0
  let lat = 0
  let lng = 0
  const next = () => {
    let result = 0
    let shift = 0
    let byte
    do {
      byte = encoded.charCodeAt(i++) - 63
      result |= (byte & 31) << shift
      shift += 5
    } while (byte >= 32)
    return result & 1 ? ~(result >> 1) : result >> 1
  }
  while (i < encoded.length) {
    lat += next()
    lng += next()
    points.push([lat / factor, lng / factor])
  }
  return points
}
