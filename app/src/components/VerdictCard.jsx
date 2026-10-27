import { titleCase } from '../format.js'

const STYLE = {
  green: { ring: 'border-go dark:border-go-dark', text: 'text-go dark:text-go-dark', dot: 'bg-go dark:bg-go-dark' },
  amber: { ring: 'border-maybe dark:border-maybe-dark', text: 'text-maybe dark:text-maybe-dark', dot: 'bg-maybe dark:bg-maybe-dark' },
  red: { ring: 'border-stop dark:border-stop-dark', text: 'text-stop dark:text-stop-dark', dot: 'bg-stop dark:bg-stop-dark' },
}

function reasonDistance(r) {
  if (r.distanceM === 0) return "you're inside"
  return `${Math.round(r.distanceM)} m away`
}

export default function VerdictCard({ result }) {
  const style = STYLE[result.verdict]
  const reasons = result.reasons.slice(0, 4)

  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border-l-8 bg-white p-5 shadow-sm dark:bg-stone-900 ${style.ring}`}
    >
      <p className={`text-3xl font-bold ${style.text}`}>{result.headline}</p>
      <p className="mt-2 text-base leading-snug">
        {result.designatedArea ? `NEA designated smoking area: ${titleCase(result.designatedArea.name)}` : result.summary}
      </p>

      {reasons.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {reasons.map((r) => (
            <li key={r.rule} className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STYLE[r.verdict].dot}`} aria-hidden="true" />
              <span>
                <span className="font-medium">{r.label}</span>
                {r.name && <span className="text-stone-500 dark:text-stone-400"> · {r.name}</span>}
                <span className="text-stone-500 dark:text-stone-400"> · {reasonDistance(r)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.fineNote && <p className="mt-4 text-sm font-semibold">{result.fineNote}</p>}

      <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
        {result.disclaimer}{' '}
        <a href={result.source} target="_blank" rel="noopener noreferrer" className="underline">
          NEA rules
        </a>
        {result.accuracyM > 0 && <> · GPS ±{Math.round(result.accuracyM)} m</>}
      </p>
    </section>
  )
}
