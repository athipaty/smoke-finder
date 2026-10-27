import { useEffect, useState } from 'react'
import { admin } from '../api.js'

// The spec's success metrics, for moderators. English only, like the rest of /admin.
const TILES = [
  { key: 'weeklyActives', label: 'Weekly active devices', unit: '' },
  { key: 'day7RetentionPct', label: 'Day-7 retention', unit: '%' },
  { key: 'checksPerActivePerWeek', label: 'Checks per active device / week', unit: '' },
  { key: 'spots', label: 'Community spots', unit: '' },
  { key: 'spotsOutsideOrchardPct', label: 'Spots outside Orchard', unit: '%' },
  { key: 'confirmedLast90DaysPct', label: 'Spots confirmed in 90 days', unit: '%' },
  { key: 'reportsPer100Views', label: 'Gone / not-allowed reports per 100 views (7 days)', unit: '' },
]

const shortDay = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function Tile({ label, unit, metric }) {
  const { value, target, lowerIsBetter } = metric
  const known = value !== null && value !== undefined
  const met = known && (lowerIsBetter ? value <= target : value >= target)
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900">
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{known ? `${value.toLocaleString('en-SG')}${unit}` : '–'}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Target {lowerIsBetter ? '≤' : '≥'} {target.toLocaleString('en-SG')}
        {unit}
        {known && (
          <span className={`ml-1 font-medium ${met ? 'text-go dark:text-go-dark' : 'text-maybe dark:text-maybe-dark'}`}>
            {met ? '✓ on target' : '· below target'}
          </span>
        )}
      </p>
    </div>
  )
}

// One series per chart (no second axis): bars with a 2px gap, rounded tops,
// a tooltip per bar, and the max and last values labelled.
function DailyBars({ title, days, field }) {
  const peak = Math.max(...days.map((d) => d[field]))
  const max = Math.max(1, peak) // bar scale; avoids dividing by zero on an empty fortnight
  const last = days.at(-1)
  return (
    <figure className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-stone-500 dark:text-stone-400">
          Today {last[field].toLocaleString('en-SG')} · max {peak.toLocaleString('en-SG')}
        </span>
      </figcaption>
      <div className="mt-3 flex h-28 items-end gap-0.5 border-b border-stone-200 dark:border-stone-700" role="img" aria-label={`${title}, last 14 days`}>
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${shortDay(d.day)}: ${d[field].toLocaleString('en-SG')}`}>
            <div
              className="w-full rounded-t bg-go/80 group-hover:bg-go dark:bg-go-dark/80 dark:group-hover:bg-go-dark"
              style={{ height: `${(d[field] / max) * 100}%`, minHeight: d[field] ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>{shortDay(days[0].day)}</span>
        <span>{shortDay(last.day)}</span>
      </div>
    </figure>
  )
}

export default function MetricsView() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    admin
      .call('/metrics')
      .then((data) => setState({ status: 'done', data, error: null }))
      .catch((err) => setState({ status: 'error', data: null, error: err.message }))
  }, [])

  if (state.status === 'loading') return <p className="mt-4 text-stone-500" role="status">Loading…</p>
  if (state.status === 'error') return <p className="mt-4 text-stop dark:text-stop-dark" role="alert">{state.error}</p>

  const { targets, days, spots, data } = state.data
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <Tile key={tile.key} label={tile.label} unit={tile.unit} metric={targets[tile.key]} />
        ))}
      </div>
      {targets.day7RetentionPct.cohort > 0 && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Day-7 retention is based on {targets.day7RetentionPct.cohort} devices first seen 7–13 days ago.
        </p>
      )}

      <DailyBars title="Active devices per day" days={days} field="actives" />
      <DailyBars title="Checks per day" days={days} field="checks" />

      <details className="rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-stone-900">
        <summary className="cursor-pointer font-medium">Daily numbers (table)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-right tabular-nums">
            <thead className="text-xs text-stone-500 dark:text-stone-400">
              <tr>
                <th className="py-1 text-left font-medium">Day</th>
                <th className="font-medium">Active</th>
                <th className="font-medium">New</th>
                <th className="font-medium">Checks</th>
                <th className="font-medium">Nearby</th>
                <th className="font-medium">Added</th>
                <th className="font-medium">Reports</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="py-1 text-left">{shortDay(d.day)}</td>
                  <td>{d.actives}</td>
                  <td>{d.newDevices}</td>
                  <td>{d.checks}</td>
                  <td>{d.nearby}</td>
                  <td>{d.adds}</td>
                  <td>{d.reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-stone-900">
        <p className="font-medium">Data</p>
        <p className="text-stone-600 dark:text-stone-300">
          {data.zones.toLocaleString('en-SG')} zones · imported {data.importedAt ? new Date(data.importedAt).toLocaleString('en-SG') : '–'}
        </p>
        <p className="text-stone-600 dark:text-stone-300">
          Spots: {spots.visible} visible ({spots.verified} verified) · {spots.hidden} hidden
        </p>
        <p className="text-stone-600 dark:text-stone-300">
          Alerts: {data.alertDevices} devices
          {data.alertsLastRun?.summary?.sent !== undefined &&
            ` · last run ${new Date(data.alertsLastRun.ranAt).toLocaleString('en-SG')}, ${data.alertsLastRun.summary.sent} sent`}
        </p>
      </div>
    </div>
  )
}
