import { createContext, useCallback, useContext, useState } from 'react'
import { save, KEYS } from './storage.js'

// One GPS fix shared by all screens. Location is read only when asked and is
// never stored; only the fact that permission was given is remembered.
const GeoContext = createContext(null)

export function GeoProvider({ children }) {
  const [geo, setGeo] = useState({ status: 'idle', coords: null, error: null, at: 0 })

  const locate = useCallback(() => {
    // `error` is an i18n key suffix: geo.noBrowser / geo.blocked / geo.failed
    if (!navigator.geolocation) {
      setGeo((g) => ({ ...g, status: 'error', error: 'noBrowser' }))
      return
    }
    setGeo((g) => ({ ...g, status: 'locating', error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        save(KEYS.locationAllowed, '1')
        setGeo({
          status: 'ready',
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
          error: null,
          at: Date.now(),
        })
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED
        setGeo((g) => ({ ...g, status: denied ? 'denied' : 'error', error: denied ? 'blocked' : 'failed' }))
      },
      // maximumAge 0: "Check again" after a few steps must not reuse the previous fix.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

  return <GeoContext.Provider value={{ geo, locate }}>{children}</GeoContext.Provider>
}

export const useGeo = () => useContext(GeoContext)
