import { getDeviceId } from './storage.js'
import { translate } from './i18n/index.jsx'

// VITE_API_URL=http://localhost:5000/api/smoke to use a local backend.
const API = import.meta.env.VITE_API_URL ?? 'https://center-kitchen-backend.onrender.com/api/smoke'

// `device: true` sends the device id. It's a custom header, so the browser
// adds a preflight request; /check doesn't need it and stays a simple GET.
async function request(path, { params, device = false, ...init } = {}) {
  const url = `${API}${path}${params ? `?${new URLSearchParams(params)}` : ''}`
  const headers = { ...(device && { 'X-Device-Id': getDeviceId() }), ...init.headers }
  let res
  try {
    res = await fetch(url, { ...init, headers })
  } catch {
    // No signal, or the server can't be reached at all.
    const err = new Error(translate(navigator.onLine === false ? 'common.offline' : 'common.noServer'))
    err.offline = true
    throw err
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body.error ?? `Server error (${res.status})`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

// Locations go in a POST body, not the URL, so they don't end up in server logs.
const postJson = (path, body, opts) =>
  request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...opts })

export const checkSpot = ({ lat, lng, accuracy }) => postJson('/check', { lat, lng, ...(accuracy != null && { acc: Math.round(accuracy) }) })

export const fetchNearby = ({ lat, lng }) => postJson('/nearby', { lat, lng }, { device: true })

export const fetchSpot = (id) => request(`/spots/${id}`, { device: true })

export const fetchDsas = () => request('/dsas')

// Places by name, address, postcode or MRT exit: { results: [{ name, address, lat, lng }] }
export const searchPlaces = (q) => postJson('/search', { q })

// When the rules data was built and imported, and its sources.
export const fetchMeta = () => request('/meta')

// Map data around a point for checks without signal (offline.js)
export const fetchArea = ({ lat, lng }) => postJson('/area', { lat, lng })

// Real walking route (OneMap): { minutes, metres, path: [[lat, lng], ...] }
export const fetchRoute = (from, to) => postJson('/route', { from: `${from.lat},${from.lng}`, to: `${to.lat},${to.lng}` })

// "Report a problem". report: { kind, message, lat?, lng?, verdict?, rules?, lang }
export const sendReport = (report) =>
  request('/reports', { method: 'POST', device: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) })

// Once a day per device: "the app was opened" (no location).
export const ping = () => request('/ping', { method: 'POST', device: true })

// F5. `spot`: { lat, lng, name, sheltered, hasAshtray, hasSeating, photo?: File }
// A logged-in moderator's token goes along: their spots skip the daily limit
// and count as verified.
export function addSpot(spot) {
  const form = new FormData()
  for (const [key, value] of Object.entries(spot)) {
    if (value != null && value !== '') form.set(key, value instanceof File ? value : String(value))
  }
  const token = readToken()
  return request('/spots', { method: 'POST', body: form, device: true, headers: token ? { Authorization: `Bearer ${token}` } : {} })
}

// Rule-change alerts (see alerts.js)
export const alertsApi = {
  key: () => request('/alerts/key'),
  save: (body) =>
    request('/alerts', { method: 'PUT', device: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  remove: () => request('/alerts', { method: 'DELETE', device: true }),
}

// Moderation. The token lives in sessionStorage, so closing the tab logs out.
const ADMIN_TOKEN = 'sf.adminToken'
const readToken = () => {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN)
  } catch {
    return null
  }
}
const writeToken = (token) => {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN, token)
    else sessionStorage.removeItem(ADMIN_TOKEN)
  } catch {
    // ignore: the moderator just logs in again
  }
}

export const admin = {
  loggedIn: () => Boolean(readToken()),
  logout: () => writeToken(null),
  async login(password) {
    const { token } = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    writeToken(token)
  },
  call(path, { method = 'GET', body } = {}) {
    return request(`/admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${readToken()}`, ...(body && { 'Content-Type': 'application/json' }) },
      ...(body && { body: JSON.stringify(body) }),
    }).catch((err) => {
      if (err.status === 401) writeToken(null)
      throw err
    })
  },
}

// "Busy now". key: 'c:<community id>' or 'nea:<NEA id>' (see checkinKey in format.js)
export const checkins = {
  status: (key) => request('/checkins', { params: { spot: key }, device: true }),
  checkIn: (key) =>
    request('/checkins', { method: 'POST', device: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spot: key }) }),
  leave: () => request('/checkins', { method: 'DELETE', device: true }),
}

// F6. type: 'here' | 'gone' | 'not_allowed' | 'bad_photo'
export const voteSpot = (id, type) =>
  request(`/spots/${id}/vote`, {
    method: 'POST',
    device: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
