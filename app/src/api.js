import { getDeviceId } from './storage.js'

// VITE_API_URL=http://localhost:5000/api/smoke to use a local backend.
const API = import.meta.env.VITE_API_URL ?? 'https://center-kitchen-backend.onrender.com/api/smoke'

// `device: true` sends the device id. It's a custom header, so the browser
// adds a preflight request; /check doesn't need it and stays a simple GET.
async function request(path, { params, device = false, ...init } = {}) {
  const url = `${API}${path}${params ? `?${new URLSearchParams(params)}` : ''}`
  const headers = { ...(device && { 'X-Device-Id': getDeviceId() }), ...init.headers }
  const res = await fetch(url, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body.error ?? `Server error (${res.status})`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

export const checkSpot = ({ lat, lng, accuracy }) =>
  request('/check', { params: { lat, lng, ...(accuracy != null && { acc: Math.round(accuracy) }) } })

export const fetchNearby = ({ lat, lng }) => request('/nearby', { params: { lat, lng }, device: true })

export const fetchSpot = (id) => request(`/spots/${id}`, { device: true })

// F5. `spot`: { lat, lng, name, sheltered, hasAshtray, hasSeating, photo?: File }
export function addSpot(spot) {
  const form = new FormData()
  for (const [key, value] of Object.entries(spot)) {
    if (value != null && value !== '') form.set(key, value instanceof File ? value : String(value))
  }
  return request('/spots', { method: 'POST', body: form, device: true })
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

// F6. type: 'here' | 'gone' | 'not_allowed' | 'bad_photo'
export const voteSpot = (id, type) =>
  request(`/spots/${id}/vote`, {
    method: 'POST',
    device: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
