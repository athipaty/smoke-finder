import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GeoProvider } from './geo.jsx'
import { FavouritesProvider } from './favourites.jsx'
import { I18nProvider, useI18n } from './i18n/index.jsx'
import { load, save, KEYS } from './storage.js'
import { ping } from './api.js'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Check from './screens/Check.jsx'
import Rules from './screens/Rules.jsx'
import PrivacyRoute from './screens/Privacy.jsx' // small, and the first screen needs it anyway

// Loaded when first opened, so the Check screen (what most people open the
// app for) starts sooner. The map library alone is about a third of the code.
const loadMapScreen = () => import('./screens/MapScreen.jsx')
const loadSpotDetail = () => import('./screens/SpotDetail.jsx')
const MapScreen = lazy(loadMapScreen)
const SpotDetail = lazy(loadSpotDetail)
const AddSpot = lazy(() => import('./screens/AddSpot.jsx'))
const Admin = lazy(() => import('./screens/Admin.jsx'))
const Report = lazy(() => import('./screens/Report.jsx'))

// Each screen gets its own page title, so screen readers and the browser's
// tab list say where you are. The spot screen keeps the app name.
const TITLES = { '/': 'check.title', '/map': 'near.title', '/add': 'add.title', '/rules': 'rules.title', '/report': 'report.title', '/privacy': 'privacy.title' }
function PageTitle() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  useEffect(() => {
    const key = TITLES[pathname]
    document.title = key ? `${t(key)} · Smoke Finder SG` : 'Smoke Finder SG'
  }, [pathname, t])
  return null
}

// A crash shows the error screen for that screen only; the tab bar still works,
// and moving to another screen starts fresh.
function ScreenBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
}

// Today's date in Singapore, to ping at most once a day.
const sgToday = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10)

export default function App() {
  const [ageConfirmed, setAgeConfirmed] = useState(() => load(KEYS.ageConfirmed) === '1')

  // Counts the app as used today (random device id only; see Rules > privacy).
  useEffect(() => {
    if (!ageConfirmed || load(KEYS.lastPing) === sgToday()) return
    ping()
      .then(() => save(KEYS.lastPing, sgToday()))
      .catch(() => {}) // not important enough to retry
  }, [ageConfirmed])

  // Fetch Nearby and spot details once the first screen is up, so they open
  // instantly and the service worker has them for use without signal.
  useEffect(() => {
    if (!ageConfirmed) return
    const preload = () => Promise.all([loadMapScreen(), loadSpotDetail()]).catch(() => {})
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 2000))
    idle(preload)
  }, [ageConfirmed])

  return (
    <I18nProvider>
      {ageConfirmed ? (
        <GeoProvider>
          <FavouritesProvider>
            <BrowserRouter>
              <PageTitle />
              <div className="mx-auto flex min-h-dvh max-w-lg flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
                <ScreenBoundary>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<Check />} />
                    <Route path="/map" element={<MapScreen />} />
                    <Route path="/spot" element={<SpotDetail />} />
                    <Route path="/add" element={<AddSpot />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/report" element={<Report />} />
                    <Route path="/rules" element={<Rules />} />
                    <Route path="/privacy" element={<PrivacyRoute />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
                </ScreenBoundary>
              </div>
              <TabBar />
            </BrowserRouter>
          </FavouritesProvider>
        </GeoProvider>
      ) : (
        <Onboarding
          onConfirm={() => {
            save(KEYS.ageConfirmed, '1')
            setAgeConfirmed(true)
          }}
        />
      )}
    </I18nProvider>
  )
}
