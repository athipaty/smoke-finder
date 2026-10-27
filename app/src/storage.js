// localStorage can throw (private mode, blocked storage); the app works without it.
export function load(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export const KEYS = {
  ageConfirmed: 'sf.ageConfirmed',
  locationAllowed: 'sf.locationAllowed',
  deviceId: 'sf.deviceId',
  shelteredOnly: 'sf.shelteredOnly',
  lastPing: 'sf.lastPing',
}

// Random id so the server can count one vote per phone. It identifies nothing
// else, and the server only keeps a hash of it.
let deviceId = null
export function getDeviceId() {
  deviceId ??= load(KEYS.deviceId)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    save(KEYS.deviceId, deviceId)
  }
  return deviceId
}
