// VITE_API_URL=http://localhost:5000/api/smoke to use a local backend.
const API = import.meta.env.VITE_API_URL ?? 'https://center-kitchen-backend.onrender.com/api/smoke'

async function get(path, params) {
  const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Server error (${res.status})`)
  return body
}

export const checkSpot = ({ lat, lng, accuracy }) =>
  get('/check', { lat, lng, ...(accuracy != null && { acc: Math.round(accuracy) }) })

export const fetchNearby = ({ lat, lng }) => get('/nearby', { lat, lng })
