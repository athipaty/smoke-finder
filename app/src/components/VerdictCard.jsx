import { titleCase } from '../format.js'
import { useI18n } from '../i18n/index.jsx'

const STYLE = {
  green: { ring: 'border-go dark:border-go-dark', text: 'text-go dark:text-go-dark', dot: 'bg-go dark:bg-go-dark' },
  amber: { ring: 'border-maybe dark:border-maybe-dark', text: 'text-maybe dark:text-maybe-dark', dot: 'bg-maybe dark:bg-maybe-dark' },
  red: { ring: 'border-stop dark:border-stop-dark', text: 'text-stop dark:text-stop-dark', dot: 'bg-stop dark:bg-stop-dark' },
}

// The server words its answer in English; build it here from the structured
// result instead, so every language gets the full sentence. Mirrors the
// engine's summarise() in src/engine.js.
function summaryText(r, { t, ruleLabel, ruleReason }) {
  if (r.designatedArea) {
    const where = t('summary.dsa', { name: titleCase(r.designatedArea.name) })
    return r.verdict === 'green' ? where : `${where}. ${t('summary.gps', { m: Math.round(r.accuracyM) })}`
  }
  const top = r.reasons[0]
  if (r.verdict === 'green') return t('summary.green')
  if (!top) return t('summary.gps', { m: Math.round(r.accuracyM) })
  if (r.verdict === 'amber' && top.how === 'near') {
    return t('summary.near', { m: Math.round(top.distanceM), place: ruleLabel(top.rule).toLowerCase() })
  }
  return ruleReason(top.rule)
}

export default function VerdictCard({ result }) {
  const i18n = useI18n()
  const { t, ruleLabel } = i18n
  const style = STYLE[result.verdict]
  const reasons = result.reasons.slice(0, 4)

  return (
    <section aria-live="polite" className={`rounded-2xl border-l-8 bg-white p-5 shadow-sm dark:bg-stone-900 ${style.ring}`}>
      <p className={`text-3xl font-bold ${style.text}`}>{t(`verdict.${result.verdict}`)}</p>
      <p className="mt-2 text-base leading-snug">{summaryText(result, i18n)}</p>

      {reasons.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {reasons.map((r) => (
            <li key={r.rule} className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STYLE[r.verdict].dot}`} aria-hidden="true" />
              <span>
                <span className="font-medium">{ruleLabel(r.rule)}</span>
                {r.name && <span className="text-stone-500 dark:text-stone-400"> · {r.name}</span>}
                <span className="text-stone-500 dark:text-stone-400">
                  {' '}
                  · {r.distanceM === 0 ? t('reason.inside') : t('reason.away', { m: Math.round(r.distanceM) })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.verdict !== 'green' && <p className="mt-4 text-sm font-semibold">{t('fine')}</p>}

      <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
        {t('disclaimer')}{' '}
        <a href={result.source} target="_blank" rel="noopener noreferrer" className="underline">
          {t('neaRules')}
        </a>
        {result.accuracyM > 0 && <> · {t('gps', { m: Math.round(result.accuracyM) })}</>}
      </p>
    </section>
  )
}
