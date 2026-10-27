// "Add to Home Screen". Chrome, Edge and Samsung Internet fire
// beforeinstallprompt early, often before any screen is shown, so it's caught
// here at startup and kept until the user taps Install. iPhone has no such
// event; there we can only explain the Share > Add to Home Screen steps.
import { load, save, KEYS } from './storage.js'

const SNOOZE_DAYS = 30
let deferred = null
const listeners = new Set()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // show our own card instead of the browser's banner
  deferred = e
  listeners.forEach((fn) => fn())
})
window.addEventListener('appinstalled', () => {
  deferred = null
  listeners.forEach((fn) => fn())
})

export const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// 'prompt' (one-tap install), 'ios' (show steps) or null (nothing to offer)
export function installMode() {
  if (isInstalled()) return null
  const snoozed = Number(load(KEYS.installSnoozed) || 0)
  if (Date.now() - snoozed < SNOOZE_DAYS * 86_400_000) return null
  if (isIos()) return 'ios'
  return deferred ? 'prompt' : null
}

export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function install() {
  if (!deferred) return false
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  listeners.forEach((fn) => fn())
  return outcome === 'accepted'
}

export const snoozeInstall = () => save(KEYS.installSnoozed, String(Date.now()))
