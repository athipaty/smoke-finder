import { RULES, NEA_SOURCE, RULES_CHECKED, PARKS_WITH_DSAS } from '../../../src/rules.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMeta } from '../api.js'
import { LanguagePicker, useI18n } from '../i18n/index.jsx'

// Same rules the checker uses, so the guide and the answers never disagree.
const BANNED = RULES.filter((r) => r.inside === 'red' && r.id !== 'orchard_nsz')
const CHECK_SIGNS = RULES.filter((r) => r.inside === 'amber')
// From NEA's "List of Areas where Smoking is Allowed".
const ALLOWED = [1, 2, 3, 4, 5, 6, 7].map((n) => `rules.allowed.${n}`)

// One picture per kind of place, so the list can be scanned at a glance.
const ICONS = {
  bus_stop: '🚏',
  bus_interchange: '🚌',
  taxi_stand: '🚕',
  education: '🏫',
  hospital: '🏥',
  community_club: '🏘️',
  stadium: '🏟️',
  park: '🌳',
  playground_exercise: '🛝',
  swimming_pool: '🏊',
  reservoir: '💧',
  beach: '🏖️',
  covered_walkway: '🌉',
  ferry_terminal: '⛴️',
  toilets: '🚻',
  hawker_centre: '🍜',
  building: '🏢',
  shelter: '⛱️',
  carpark_building: '🅿️',
  orchard_nsz: '🛍️',
}

// Section colours: the same red / amber / green as the check answers.
const TONES = {
  red: { dot: 'bg-stop dark:bg-stop-dark', edge: 'border-stop dark:border-stop-dark', tile: 'bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100' },
  orange: { dot: 'bg-[#b45309]', edge: 'border-[#b45309]', tile: '' },
  amber: { dot: 'bg-maybe dark:bg-maybe-dark', edge: 'border-maybe dark:border-maybe-dark', tile: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100' },
  green: { dot: 'bg-go dark:bg-go-dark', edge: 'border-go dark:border-go-dark', tile: 'bg-green-50 text-green-900 dark:bg-green-950/60 dark:text-green-100' },
}

function Section({ id, title, tone, count, children }) {
  return (
    <section id={id} className="mt-7 scroll-mt-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
        <span className={`h-2.5 w-2.5 rounded-full ${TONES[tone].dot}`} aria-hidden="true" />
        {title}
        {count != null && <span className="font-normal text-stone-500 dark:text-stone-400">· {count}</span>}
      </h2>
      <div className={`mt-2 overflow-hidden rounded-2xl border-l-4 bg-white shadow-sm dark:bg-stone-900 ${TONES[tone].edge}`}>{children}</div>
    </section>
  )
}

// Tap a place to read why; keeps the page short.
function RuleRow({ rule }) {
  const { t, ruleLabel, ruleReason } = useI18n()
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 active:bg-stone-100 dark:active:bg-stone-800 [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg dark:bg-stone-800" aria-hidden="true">
            {ICONS[rule.id] ?? '•'}
          </span>
          <span className="min-w-0 flex-1 font-medium">{ruleLabel(rule.id)}</span>
          {rule.bufferM > 0 && (
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {t('rules.around', { m: rule.bufferM })}
            </span>
          )}
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true">
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <p className="px-4 pb-3 pl-16 text-sm text-stone-600 dark:text-stone-300">{ruleReason(rule.id)}</p>
        {rule.id === 'park' && (
          <p className="px-4 pb-3 pl-16 text-sm text-stone-600 dark:text-stone-300">
            🌳 {t('park.listIntro')} {PARKS_WITH_DSAS.join(', ')}.
          </p>
        )}
      </details>
    </li>
  )
}

function RuleList({ rules }) {
  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {rules.map((r) => (
        <RuleRow key={r.id} rule={r} />
      ))}
    </ul>
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
      className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-go py-3.5 font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
    <section className="mt-7">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">{t('about.title')}</h2>
      <ul className="mt-2 space-y-2 rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-stone-900">
        {date && (
          <li className="flex gap-2">
            <span aria-hidden="true">🗓️</span>
            {t('about.updated', { date })}
          </li>
        )}
        <li className="flex gap-2">
          <span aria-hidden="true">🛍️</span>
          {t('about.orchard')}
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true">🗺️</span>
          {t('about.sources')}
        </li>
        <li className="pl-6 text-stone-500 dark:text-stone-400">{t('about.version', { v: __APP_VERSION__ })}</li>
      </ul>
    </section>
  )
}

// Three tiles that jump to their section.
function Summary() {
  const { t } = useI18n()
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const tiles = [
    { id: 'never', tone: 'red', icon: '🚭', label: t('rules.never'), n: BANNED.length },
    { id: 'signs', tone: 'amber', icon: '⚠️', label: t('rules.checkSigns'), n: CHECK_SIGNS.length },
    { id: 'allowed', tone: 'green', icon: '✅', label: t('rules.usually'), n: ALLOWED.length },
  ]
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => jump(tile.id)}
          className={`flex flex-col items-start rounded-2xl p-3 text-left active:opacity-80 ${TONES[tile.tone].tile}`}
        >
          <span className="text-xl" aria-hidden="true">
            {tile.icon}
          </span>
          <span className="mt-1 text-2xl font-bold leading-none">{tile.n}</span>
          <span className="mt-1 text-xs font-medium leading-tight">{tile.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function Rules() {
  const { t, lang, ruleLabel, ruleReason } = useI18n()
  const day = (iso) =>
    new Date(`${iso}T12:00:00+08:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : `${lang}-SG`, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <main className="px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">{t('rules.title')}</h1>
        <LanguagePicker className="shrink-0" />
      </div>

      {/* The one thing to remember, then the details. */}
      <div className="mt-4 flex gap-3 rounded-2xl bg-stone-900 p-4 text-white dark:bg-stone-800">
        <span className="text-2xl" aria-hidden="true">
          💸
        </span>
        <p className="text-sm leading-relaxed text-stone-100">{t('rules.intro')}</p>
      </div>
      {t('rules.translationNote') && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{t('rules.translationNote')}</p>}

      <Summary />

      <Section id="never" title={t('rules.never')} tone="red" count={BANNED.length}>
        <RuleList rules={BANNED} />
      </Section>

      <Section id="orchard" title={t('rules.orchard')} tone="orange">
        <div className="flex gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg dark:bg-stone-800" aria-hidden="true">
            {ICONS.orchard_nsz}
          </span>
          <div>
            <p className="font-medium">{ruleLabel('orchard_nsz')}</p>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{ruleReason('orchard_nsz')}</p>
            <Link to="/map" className="mt-2 inline-block text-sm font-medium text-go underline dark:text-go-dark">
              {t('rules.orchardExtra')}
            </Link>
          </div>
        </div>
      </Section>

      <Section id="signs" title={t('rules.checkSigns')} tone="amber" count={CHECK_SIGNS.length}>
        <RuleList rules={CHECK_SIGNS} />
      </Section>

      <Section id="allowed" title={t('rules.usually')} tone="green" count={ALLOWED.length}>
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {ALLOWED.map((key) => (
            <li key={key} className="flex items-start gap-3 px-4 py-3 text-sm">
              <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-go dark:text-go-dark" aria-hidden="true">
                <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t(key)}
            </li>
          ))}
        </ul>
      </Section>

      <ShareApp />

      <AboutData />

      <div className="mt-7 space-y-3 rounded-2xl bg-stone-200/60 p-4 text-xs text-stone-600 dark:bg-stone-900/60 dark:text-stone-400">
        <p>
          {t('disclaimer')} {t('rules.source')}{' '}
          <a href={NEA_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
            {t('rules.sourceLink')}
          </a>
          . {t('rules.owners')} {t('rules.checked', { on: day(RULES_CHECKED.on), nea: day(RULES_CHECKED.neaPageUpdated) })}
        </p>
        <p>
          {t('rules.privacy')}{' '}
          <Link to="/privacy" className="underline">
            {t('privacy.link')}
          </Link>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Link to="/report" className="flex items-center gap-2 rounded-xl bg-white p-3 font-medium shadow-sm active:opacity-80 dark:bg-stone-900">
          <span aria-hidden="true">🛠️</span>
          {t('rules.report')}
        </Link>
        <a
          href="https://www.healthhub.sg/programmes/iquit"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-white p-3 font-medium shadow-sm active:opacity-80 dark:bg-stone-900"
        >
          <span aria-hidden="true">💚</span>
          <span>
            <span className="block text-xs font-normal text-stone-500 dark:text-stone-400">{t('rules.quit')}</span>
            {t('onb.iquit')}
          </span>
        </a>
      </div>
    </main>
  )
}
