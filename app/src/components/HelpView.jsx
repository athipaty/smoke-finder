// Moderator handbook: what each tab does, what each phone alert means and what
// to do about it. English only, like the rest of /admin. Keep it true to what
// the app and backend actually do.
const REPO = 'https://github.com/athipaty/smoke-finder'

const SECTIONS = [
  {
    icon: '📍',
    title: 'Spots tab',
    items: [
      'Needs review: spots with any "Gone", "Not allowed here" or photo report, or hidden ones. Red numbers are problems. Check them first.',
      'A spot is hidden automatically after 3 "Gone" or 3 "Not allowed here" votes. Restore spot brings it back and clears those votes.',
      'Edit changes the name, hours and features. "Verified by moderator" vouches for a spot (it shows "Added by the Smoke Finder team").',
      'Photos: Hide photo keeps the file but stops showing it; Delete photo removes it from storage. 2 photo reports hide a photo automatically.',
      'Purple "Sentosa list" / "NTU list" + "approximate" pins come from those operators’ lists, placed at the nearest landmark. When you are there, add an exact spot at the sign, then delete the approximate one.',
    ],
  },
  {
    icon: '➕',
    title: 'Add spots anywhere (seeding)',
    items: [
      'Tap "Add spots anywhere" at the top. Use Search to jump to any place or MRT exit, move the pin, tick what is there, add a photo if you like.',
      'Your spots have no daily limit, count as verified straight away, and don’t send you alerts. The NEA rules check still blocks pins in no-smoking places.',
    ],
  },
  {
    icon: '📝',
    title: 'Reports and Errors tabs',
    items: [
      'Reports: what users send with "Report a problem". Mark done when handled. Deleted automatically after 180 days.',
      'Errors: problems the app hit on people’s phones, grouped with a count. Mark fixed after a new version is out; it comes back if it happens again. Deleted 30 days after last seen.',
    ],
  },
  {
    icon: '📊',
    title: 'Metrics tab',
    items: [
      'The spec’s targets (weekly users, retention, spots, confirmations) with this week’s values, plus daily numbers for 14 days.',
      'A yellow "Rules data is old/missing" box means the weekly map refresh hasn’t worked for 9+ days (see "Weekly map data" below).',
    ],
  },
  {
    icon: '🔔',
    title: 'Phone alerts (ntfy) and what to do',
    items: [
      'New spot added / photo added (with "N faces blurred"): check it in Spots.',
      'New problem report: read it in Reports.',
      'Monday 9am "last 7 days": the week in numbers. Nothing to do unless something looks odd.',
      '"Map data is N days old": the weekly refresh keeps failing. Open the GitHub runs and run it again (below).',
      '"NEA changed its smoking rules page": compare NEA’s list with the Rules page; ask Claude to update the rules if something changed.',
      '"NTU changed its smoking areas list": compare NTU’s page with data/operator-spots.json; ask Claude to update the list.',
    ],
  },
  {
    icon: '🗺️',
    title: 'Weekly map data',
    items: [
      'Every night GitHub checks whether the map data is 6+ days old and refreshes it (NEA + OpenStreetMap). A failed run is retried the next night and continues where it stopped.',
      'To run it now: GitHub → smoke-finder → Actions → "Refresh data" → Run workflow. It takes about 1–2 hours. Live data only changes if every check passes.',
    ],
    link: { href: `${REPO}/actions/workflows/refresh-data.yml`, label: 'Open the refresh runs on GitHub' },
  },
  {
    icon: '🙂',
    title: 'Photos and faces',
    items: [
      'Every uploaded photo is resized, its location data removed and faces blurred before it is stored. Faces looking sideways are caught too, but a face can still be missed: hide or delete such photos.',
      'If the face finder can’t start, photos are refused (users see "Photos can’t be added right now"). Check it here:',
    ],
    link: { href: 'https://center-kitchen-backend.onrender.com/api/smoke/health/faces', label: 'Face blurring health check ("ok": true = working)' },
  },
  {
    icon: '🌐',
    title: 'Public guide pages',
    items: [
      '25 web pages (5 languages) Google can find: the rules, Orchard Road, Sentosa, parks and NTU. They are rebuilt every time the app is published, so the Orchard list follows NEA.',
      'To help Google find them: add the site in Google Search Console and submit sitemap.xml.',
    ],
    link: { href: '/guide/where-can-i-smoke-in-singapore.html', label: 'Open the guide' },
  },
]

export default function HelpView() {
  return (
    <div className="mt-4 space-y-3">
      {SECTIONS.map((s) => (
        <section key={s.title} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-base dark:bg-stone-800" aria-hidden="true">
              {s.icon}
            </span>
            {s.title}
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {s.items.map((item) => (
              <li key={item.slice(0, 40)}>{item}</li>
            ))}
          </ul>
          {s.link && (
            <a href={s.link.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-go underline dark:text-go-dark">
              {s.link.label}
            </a>
          )}
        </section>
      ))}
    </div>
  )
}
