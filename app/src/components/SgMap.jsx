import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'

// OneMap (Singapore Land Authority) base tiles; Night style in dark mode.
const TILES = (style) => `https://www.onemap.gov.sg/maps/tiles/${style}/{z}/{x}/{y}.png`
const ATTRIBUTION =
  '© <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> SLA · data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OSM</a>'
const SG_BOUNDS = [
  [1.144, 103.535],
  [1.494, 104.502],
]

function usePrefersDark() {
  const query = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = (e) => setDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return dark
}

// Keeps every given point in view whenever the list of points changes.
function FitPoints({ points }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
  useEffect(() => {
    if (!points.length) return
    // No animation: a fit that arrives while the previous one is still animating gets dropped.
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 18, { animate: false })
    // Padding allows for marker size; extra at the bottom keeps markers clear of the attribution line.
    else map.fitBounds(points.map((p) => [p.lat, p.lng]), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 72], maxZoom: 18, animate: false })
  }, [key, map]) // `key` stands in for `points`, which is a new array every render
  return null
}

export default function SgMap({ center, fit = [], zoomControl = true, className = '', children }) {
  const dark = usePrefersDark()
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={17}
      minZoom={11}
      maxZoom={19}
      maxBounds={SG_BOUNDS}
      zoomControl={zoomControl}
      className={className}
      attributionControl
    >
      {/* No detectRetina: it lowers the layer's maxZoom by one, which left close-up maps blank. */}
      <TileLayer
        key={dark ? 'night' : 'day'}
        url={TILES(dark ? 'Night' : 'Default')}
        attribution={ATTRIBUTION}
        minZoom={11}
        maxZoom={19}
        maxNativeZoom={19}
      />
      <FitPoints points={fit} />
      {children}
    </MapContainer>
  )
}
