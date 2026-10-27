import { useEffect, useState } from 'react'
import { install, installMode, onInstallChange, snoozeInstall } from '../install.js'
import { useI18n } from '../i18n/index.jsx'

// iOS share icon (square with an arrow up), so the steps match what's on screen.
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="mx-0.5 inline h-4 w-4 align-[-2px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
  </svg>
)

export default function InstallCard() {
  const { t } = useI18n()
  const [mode, setMode] = useState(installMode)

  useEffect(() => onInstallChange(() => setMode(installMode())), [])

  if (!mode) return null
  const later = () => {
    snoozeInstall()
    setMode(null)
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <div className="flex items-start gap-3">
        <img src="/icon.svg" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold">{t('install.title')}</p>
          <p className="text-sm text-stone-600 dark:text-stone-300">{t('install.body')}</p>
          {mode === 'ios' && (
            <p className="mt-2 text-sm">
              {t('install.iosBefore')}
              <ShareIcon />
              {t('install.iosAfter')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2 text-sm font-medium">
        <button type="button" onClick={later} className="rounded-lg px-3 py-2 text-stone-500 dark:text-stone-400">
          {mode === 'ios' ? t('install.ok') : t('install.later')}
        </button>
        {mode === 'prompt' && (
          <button type="button" onClick={() => install().then(() => setMode(installMode()))} className="rounded-lg bg-go px-4 py-2 text-white dark:bg-go-dark dark:text-stone-950">
            {t('install.button')}
          </button>
        )}
      </div>
    </div>
  )
}
