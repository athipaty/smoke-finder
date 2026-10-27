// Opt-in web push alerts for saved spots. Saved spots stay on the phone unless
// alerts are on; turning alerts off deletes them from the server.
import { alertsApi } from './api.js'
import { load, save } from './storage.js'

const KEY = 'sf.alerts'

export const alertsSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// iPhone only allows web push for apps added to the Home Screen.
export const needsHomeScreen = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia?.('(display-mode: standalone)').matches

export const alertsEnabled = () => load(KEY) === '1'

function keyBytes(base64url) {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function subscription() {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  const { publicKey } = await alertsApi.key()
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
}

// points: [{ key, label, lat, lng }]
export async function enableAlerts(points, lang) {
  if (!alertsSupported()) throw Object.assign(new Error('unsupported'), { code: 'unsupported' })
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw Object.assign(new Error('denied'), { code: 'denied' })
  const sub = await subscription()
  const result = await alertsApi.save({ subscription: sub.toJSON(), lang, points })
  save(KEY, '1')
  return result
}

// Keeps the server's copy in step with the saved spots and language.
export async function syncAlerts(points, lang) {
  if (!alertsEnabled() || !alertsSupported() || Notification.permission !== 'granted') return null
  const sub = await subscription()
  return alertsApi.save({ subscription: sub.toJSON(), lang, points })
}

export async function disableAlerts() {
  save(KEY, '0')
  await alertsApi.remove()
  if (alertsSupported()) {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    await sub?.unsubscribe()
  }
}
