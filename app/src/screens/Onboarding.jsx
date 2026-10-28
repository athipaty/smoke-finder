import { useState } from 'react'
import { LanguagePicker, useI18n } from '../i18n/index.jsx'
import { Privacy } from './Privacy.jsx'

const POINTS = [
  { key: 'onb.p1', icon: '📍', tile: 'bg-green-100 dark:bg-green-950' },
  { key: 'onb.p2', icon: '🚶', tile: 'bg-sky-100 dark:bg-sky-950' },
  { key: 'onb.p3', icon: '🔒', tile: 'bg-violet-100 dark:bg-violet-950' },
]

// A preview of the three answers the app gives, in the same colours.
const ANSWERS = [
  { verdict: 'green', dot: 'bg-go-dark' },
  { verdict: 'amber', dot: 'bg-maybe-dark' },
  { verdict: 'red', dot: 'bg-stop-dark' },
]

export default function Onboarding({ onConfirm }) {
  const { t } = useI18n()
  const [underAge, setUnderAge] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  if (showPrivacy) {
    return (
      <div className="mx-auto max-w-lg">
        <Privacy onBack={() => setShowPrivacy(false)} />
      </div>
    )
  }

  if (underAge) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 text-center">
        <span className="text-5xl" aria-hidden="true">
          💚
        </span>
        <h1 className="mt-4 text-2xl font-bold">{t('onb.adultsTitle')}</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-300">
          {t('onb.adultsBody')}{' '}
          <a href="https://www.healthhub.sg/programmes/iquit" target="_blank" rel="noopener noreferrer" className="underline">
            {t('onb.iquit')}
          </a>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <LanguagePicker className="self-end" />

      {/* Who we are and what the answers look like. */}
      <section className="mt-3 rounded-3xl bg-stone-900 p-6 text-white shadow-lg dark:bg-stone-800">
        <img src="/icon.svg" alt="" className="h-14 w-14 rounded-2xl ring-1 ring-white/10" />
        <h1 className="mt-4 text-3xl font-bold">{t('onb.title')}</h1>
        <p className="mt-1 text-stone-300">{t('onb.tagline')}</p>
        <ul className="mt-5 space-y-2" aria-hidden="true">
          {ANSWERS.map((a) => (
            <li key={a.verdict} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium">
              <span className={`h-3 w-3 shrink-0 rounded-full ${a.dot}`} />
              {t(`verdict.${a.verdict}`)}
            </li>
          ))}
        </ul>
      </section>

      <ul className="mt-6 space-y-4">
        {POINTS.map((p) => (
          <li key={p.key} className="flex gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${p.tile}`} aria-hidden="true">
              {p.icon}
            </span>
            <span>
              <span className="block font-semibold">{t(`${p.key}.title`)}</span>
              <span className="block text-sm text-stone-600 dark:text-stone-300">{t(`${p.key}.body`)}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-stone-500 dark:text-stone-400">
        {t('onb.guidance')}{' '}
        <button type="button" onClick={() => setShowPrivacy(true)} className="underline">
          {t('privacy.link')}
        </button>
      </p>

      <div className="mt-auto space-y-2 pt-6">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-2xl bg-go py-4 text-lg font-semibold text-white shadow-sm active:opacity-80 dark:bg-go-dark dark:text-stone-950"
        >
          {t('onb.over21')}
        </button>
        <button type="button" onClick={() => setUnderAge(true)} className="w-full rounded-xl py-3 text-stone-600 active:opacity-70 dark:text-stone-300">
          {t('onb.under21')}
        </button>
      </div>
    </main>
  )
}
