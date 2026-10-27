import { RULES, FINE_NOTE, NEA_SOURCE, DISCLAIMER } from '../../../src/rules.js'

// Same rule texts the checker uses, so the guide and the answers never disagree.
const BANNED = RULES.filter((r) => r.inside === 'red' && r.id !== 'orchard_nsz')
const CHECK_SIGNS = RULES.filter((r) => r.inside === 'amber')
const ORCHARD = RULES.find((r) => r.id === 'orchard_nsz')

// From NEA's "List of Areas where Smoking is Allowed".
const ALLOWED = [
  'Open public spaces, away from the places above',
  'Surface carparks',
  'Uncovered top decks of multi-storey carparks',
  'Uncovered walkways',
  'Open spaces in housing estates and town centres (not void decks)',
  'Approved smoking corners in coffee shops',
  'Smoking rooms in offices, the airport and nightlife outlets',
]

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{title}</h2>
      <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">{children}</div>
    </section>
  )
}

function RuleList({ rules }) {
  return (
    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
      {rules.map((r) => (
        <li key={r.id} className="px-4 py-3">
          <p className="font-medium">{r.label}</p>
          <p className="text-sm text-stone-600 dark:text-stone-300">{r.reason}</p>
        </li>
      ))}
    </ul>
  )
}

export default function Rules() {
  return (
    <main className="px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Where you can't smoke</h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
        In Singapore, smoking is allowed in open public spaces unless the place is on NEA's list. {FINE_NOTE}.
      </p>

      <Section title="Never allowed">
        <RuleList rules={BANNED} />
      </Section>

      <Section title="Orchard Road">
        <div className="px-4 py-3">
          <p className="font-medium">{ORCHARD.label}</p>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            {ORCHARD.reason} Use the Nearby tab to find the designated smoking areas.
          </p>
        </div>
      </Section>

      <Section title="Check the signs">
        <RuleList rules={CHECK_SIGNS} />
      </Section>

      <Section title="Usually allowed">
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {ALLOWED.map((a) => (
            <li key={a} className="px-4 py-3 text-sm">
              {a}
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-6 text-xs text-stone-500 dark:text-stone-400">
        {DISCLAIMER} Source:{' '}
        <a href={NEA_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
          NEA smoking prohibition
        </a>
        . Building owners may set their own rules too.
      </p>
    </main>
  )
}
