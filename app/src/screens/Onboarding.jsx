import { useState } from 'react'
import { LanguagePicker, useI18n } from '../i18n/index.jsx'

const POINTS = ['onb.p1', 'onb.p2', 'onb.p3']

export default function Onboarding({ onConfirm }) {
  const { t } = useI18n()
  const [underAge, setUnderAge] = useState(false)

  if (underAge) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">{t('onb.adultsTitle')}</h1>
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <LanguagePicker className="self-end" />
      <img src="/icon.svg" alt="" className="mt-4 h-16 w-16 rounded-2xl" />
      <h1 className="mt-6 text-3xl font-bold">{t('onb.title')}</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-300">{t('onb.tagline')}</p>

      <ul className="mt-8 space-y-5">
        {POINTS.map((p) => (
          <li key={p}>
            <p className="font-semibold">{t(`${p}.title`)}</p>
            <p className="text-sm text-stone-600 dark:text-stone-300">{t(`${p}.body`)}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-stone-500 dark:text-stone-400">{t('onb.guidance')}</p>

      <div className="mt-auto space-y-3 pt-8">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-go py-4 text-lg font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
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
