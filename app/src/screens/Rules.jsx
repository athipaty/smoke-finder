import { RULES, NEA_SOURCE, RULES_CHECKED } from '../../../src/rules.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMeta } from '../api.js'
import { LanguagePicker, useI18n } from '../i18n/index.jsx'

// Same rules the checker uses, so the guide and the answers never disagree.
const BANNED = RULES.filter((r) => r.inside === 'red' && r.id !== 'orchard_nsz')
const CHECK_SIGNS = RULES.filter((r) => r.inside === 'amber')
// From NEA's "List of Areas where Smoking is Allowed".
const ALLOWED = [1, 2, 3, 4, 5, 6, 7].map((n) => `rules.allowed.${n}`)

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{title}</h2>
      <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">{children}</div>
    </section>
  )
}

// Opens the phone's share sheet (WhatsApp, Telegram...), or copies the link.
function ShareApp() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.origin
    try {
      if (navigator.share) return await navigator.share({ title: 'Smoke Finder SG', text: t('shareApp.text'), url })
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // share sheet closed, or clipboard blocked: nothing to do
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="mt-6 w-full rounded-xl bg-white py-3 font-semibold shadow-sm active:opacity-80 dark:bg-stone-900"
    >
      {copied ? t('detail.copied') : t('shareApp.button')}
    </button>
  )
}

// Data date (from the server), boundary source and app version.
function AboutData() {
  const { t, lang } = useI18n()
  const [meta, setMeta] = useState(null)
  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => {}) // the section still shows sources and version
  }, [])
  const date = meta?.importedAt
    ? new Date(meta.importedAt).toLocaleDateString(lang === 'th' ? 'th-TH' : `${lang}-SG`, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Singapore',
      })
    : null
  return (
    <Section title={t('about.title')}>
      <ul className="divide-y divide-stone-200 text-sm dark:divide-stone-800">
        {date && <li className="px-4 py-3">{t('about.updated', { date })}</li>}
        <li className="px-4 py-3">{t('about.orchard')}</li>
        <li className="px-4 py-3">{t('about.sources')}</li>
        <li className="px-4 py-3 text-stone-500 dark:text-stone-400">{t('about.version', { v: __APP_VERSION__ })}</li>
      </ul>
    </Section>
  )
}

function RuleList({ rules }) {
  const { ruleLabel, ruleReason } = useI18n()
  return (
    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
      {rules.map((r) => (
        <li key={r.id} className="px-4 py-3">
          <p className="font-medium">{ruleLabel(r.id)}</p>
          <p className="text-sm text-stone-600 dark:text-stone-300">{ruleReason(r.id)}</p>
        </li>
      ))}
    </ul>
  )
}

export default function Rules() {
  const { t, lang, ruleLabel, ruleReason } = useI18n()
  const day = (iso) =>
    new Date(`${iso}T12:00:00+08:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : `${lang}-SG`, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <main className="px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">{t('rules.title')}</h1>
      <LanguagePicker className="mt-2" />
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{t('rules.intro')}</p>
      {t('rules.translationNote') && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{t('rules.translationNote')}</p>}

      <Section title={t('rules.never')}>
        <RuleList rules={BANNED} />
      </Section>

      <Section title={t('rules.orchard')}>
        <div className="px-4 py-3">
          <p className="font-medium">{ruleLabel('orchard_nsz')}</p>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            {ruleReason('orchard_nsz')} {t('rules.orchardExtra')}
          </p>
        </div>
      </Section>

      <Section title={t('rules.checkSigns')}>
        <RuleList rules={CHECK_SIGNS} />
      </Section>

      <Section title={t('rules.usually')}>
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {ALLOWED.map((key) => (
            <li key={key} className="px-4 py-3 text-sm">
              {t(key)}
            </li>
          ))}
        </ul>
      </Section>

      <ShareApp />

      <AboutData />

      <p className="mt-6 text-xs text-stone-500 dark:text-stone-400">
        {t('disclaimer')} {t('rules.source')}{' '}
        <a href={NEA_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
          {t('rules.sourceLink')}
        </a>
        . {t('rules.owners')} {t('rules.checked', { on: day(RULES_CHECKED.on), nea: day(RULES_CHECKED.neaPageUpdated) })}
      </p>
      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        {t('rules.privacy')}{' '}
        <Link to="/privacy" className="underline">
          {t('privacy.link')}
        </Link>
      </p>
      <p className="mt-3 text-sm">
        <Link to="/report" className="font-medium text-go underline dark:text-go-dark">
          {t('rules.report')}
        </Link>
      </p>
      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        {t('rules.quit')}{' '}
        <a href="https://www.healthhub.sg/programmes/iquit" target="_blank" rel="noopener noreferrer" className="underline">
          {t('onb.iquit')}
        </a>
      </p>
    </main>
  )
}
