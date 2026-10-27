import { useState } from 'react'
import { alertsEnabled, alertsSupported, disableAlerts, enableAlerts, needsHomeScreen } from '../alerts.js'
import { alertPoints, useFavourites } from '../favourites.jsx'
import { useI18n } from '../i18n/index.jsx'
import { save } from '../storage.js'

// Opt-in for "tell me if the rules change at my saved spots".
export default function AlertsCard() {
  const { t, lang } = useI18n()
  const { list } = useFavourites()
  const [on, setOn] = useState(alertsEnabled)
  const [state, setState] = useState({ busy: false, message: null })

  const supported = alertsSupported()
  const homeScreen = needsHomeScreen()

  const turnOn = async () => {
    setState({ busy: true, message: null })
    try {
      const points = alertPoints(list, t)
      await enableAlerts(points, lang)
      save('sf.alertsSynced', JSON.stringify([lang, points]))
      setOn(true)
      setState({ busy: false, message: null })
    } catch (err) {
      setState({ busy: false, message: err.code ? t(`alerts.${err.code}`) : err.message })
    }
  }

  const turnOff = async () => {
    setState({ busy: true, message: null })
    try {
      await disableAlerts()
      setOn(false)
      setState({ busy: false, message: null })
    } catch (err) {
      setState({ busy: false, message: err.message })
    }
  }

  return (
    <div className="mt-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-stone-900">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">🔔 {t('alerts.title')}</p>
          <p className="text-stone-500 dark:text-stone-400">{on ? t('alerts.on', { n: list.length }) : t('alerts.body')}</p>
        </div>
        {supported && !homeScreen && (
          <button
            type="button"
            disabled={state.busy}
            onClick={on ? turnOff : turnOn}
            className={`shrink-0 rounded-full px-3 py-1.5 font-medium disabled:opacity-50 ${
              on ? 'bg-stone-100 dark:bg-stone-800' : 'bg-go text-white dark:bg-go-dark dark:text-stone-950'
            }`}
          >
            {state.busy ? t('alerts.working') : on ? t('alerts.turnOff') : t('alerts.turnOn')}
          </button>
        )}
      </div>
      {!on && supported && !homeScreen && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{t('alerts.privacy')}</p>}
      {homeScreen && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{t('alerts.iosHint')}</p>}
      {!supported && !homeScreen && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{t('alerts.unsupported')}</p>}
      {state.message && (
        <p className="mt-2 text-xs text-stop dark:text-stop-dark" role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}
