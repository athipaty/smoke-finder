import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GeoProvider } from './geo.jsx'
import { FavouritesProvider } from './favourites.jsx'
import { I18nProvider } from './i18n/index.jsx'
import { load, save, KEYS } from './storage.js'
import TabBar from './components/TabBar.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Check from './screens/Check.jsx'
import MapScreen from './screens/MapScreen.jsx'
import SpotDetail from './screens/SpotDetail.jsx'
import Rules from './screens/Rules.jsx'
import AddSpot from './screens/AddSpot.jsx'
import Admin from './screens/Admin.jsx'

export default function App() {
  const [ageConfirmed, setAgeConfirmed] = useState(() => load(KEYS.ageConfirmed) === '1')

  return (
    <I18nProvider>
      {ageConfirmed ? (
        <GeoProvider>
          <FavouritesProvider>
            <BrowserRouter>
              <div className="mx-auto flex min-h-dvh max-w-lg flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
                <Routes>
                  <Route path="/" element={<Check />} />
                  <Route path="/map" element={<MapScreen />} />
                  <Route path="/spot" element={<SpotDetail />} />
                  <Route path="/add" element={<AddSpot />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
