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
}
