import { useState } from 'react'
import { CHANGI_AREAS, CHANGI_SOURCE, TERMINALS } from '../../../src/changi.js'
import { useI18n } from '../i18n/index.jsx'

// Official smoking areas at the terminal the user is at. Shown as a list,
// not map pins: Changi publishes them in words only.
export default function ChangiCard({ terminal }) {
  const { t } = useI18n()
  const [selected, setSelected] = useState(terminal)
  const areas = CHANGI_AREAS.filter((a) => a.terminal === selected)

  const group = (zone, title) => (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{title}</p>
      <ul className="mt-1 space-y-1">
        {areas
          .filter((a) => a.zone === zone)
          .map((a) => (
            <li key={a.where} className="text-sm">
              <span className="font-medium">{t('changi.level', { n: a.level })}</span> · {a.where}
            </li>
          ))}
      </ul>
    </div>
  )

  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <h2 className="font-semibold">✈️ {t('changi.title')}</h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{t('changi.intro')}</p>
      <div className="mt-3 flex gap-2" role="tablist">
        {TERMINALS.map((term) => (
          <button
            key={term.id}
            type="button"
            role="tab"
            aria-selected={selected === term.id}
            onClick={() => setSelected(term.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              selected === term.id ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800'
            }`}
          >
            {term.id}
          </button>
        ))}
      </div>
      {group('public', t('changi.public'))}
      {group('transit', t('changi.transit'))}
      <a href={CHANGI_SOURCE} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-stone-500 underline dark:text-stone-400">
        {t('changi.source')}
      </a>
    </section>
  )
}
