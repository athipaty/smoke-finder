import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'

// Privacy notice and terms of use. Kept in English (the version that applies);
// other languages show a short note saying so. Every statement here must match
// what the app and backend actually do: update this page when they change.
const UPDATED = '28 October 2026'

const SECTIONS = [
  {
    title: 'What this app does',
    body: [
      'Smoke Finder SG helps adults in Singapore follow the smoking rules set by the National Environment Agency (NEA): it tells you whether the place you are standing is a no-smoking place, and shows legal places nearby.',
      'Answers are guidance only, worked out from open map data and NEA information. They can be wrong or out of date. Always follow signs on site and NEA rules. We are not responsible for fines or other consequences of relying on the app.',
      'The app is for people aged 21 and over.',
    ],
  },
  {
    title: 'Your location',
    body: [
      'When you check a spot, open Nearby, add a spot or ask for a walking route, the app sends your location to our server to look up the rules there. We do not keep it, except in the cases below.',
      'If you add a spot, its position is stored and shown to everyone. If you send a problem report and tick "Include my location", that location is stored with the report. If you turn on rule-change alerts, the positions of your saved spots are stored until you turn alerts off.',
      'Your location is sent inside the request, not in the web address, so it is not written to our hosting provider’s request logs. Those logs (kept for a short time by Render) contain technical details such as the time, the page asked for and the network (IP) address.',
    ],
  },
  {
    title: 'The random ID on your phone',
    body: [
      'The app creates a random ID and keeps it on your phone. It is not linked to your name, number or account. Our server stores only a scrambled (hashed) form of it.',
      'We use it to count one vote per phone on each spot, to limit how many spots and reports one phone can send, and to count how many people use the app each day and week. For usage counts we keep the first and last day the app was opened and up to 60 recent days; this is deleted after 12 months without use.',
    ],
  },
  {
    title: 'Spots, votes and photos you add',
    body: [
      'Spots you add, their features and their photos are public. Photos are resized and their hidden location data (EXIF) is removed before they are stored. Please do not include people or private property.',
      'Your votes ("Still here", "Gone", "Not allowed here", photo reports) are stored with the hashed ID so each phone counts once. Spots may be hidden automatically after reports, or removed by our moderators.',
    ],
  },
  {
    title: 'Problem reports',
    body: [
      'Reports you send are read by our moderators and deleted automatically after 180 days. When a report arrives, or a spot is added, moderators get a phone notification through ntfy.sh with the type of report and the start of its text (never a location).',
    ],
  },
  {
    title: 'Things kept only on your phone',
    body: [
      'Your saved spots, language, your answer to the age question and similar settings stay in your browser on your phone. So does your last Nearby list (up to 7 days old), so it can be shown when you have no signal. Clearing the browser data for this site removes them.',
    ],
  },
  {
    title: 'Rule-change alerts',
    body: [
      'Alerts are off unless you turn them on. When on, your browser gives us a push address, and the notification is delivered by your browser maker\'s push service (for example Google, Apple, Microsoft or Mozilla). Turning alerts off deletes the push address and your saved spots from our server.',
    ],
  },
  {
    title: 'Other services we use',
    body: [
      'Maps and walking routes: OneMap by the Singapore Land Authority (they receive the map area being shown and, for routes, the start and end points). Rules data: NEA open data and OpenStreetMap contributors. Weather: NEA via data.gov.sg (no personal data is sent). Walking directions open Google Maps when you tap them. The app is hosted on Vercel, the server on Render, data in MongoDB Atlas, and photos in Backblaze B2.',
    ],
  },
  {
    title: 'Using the app fairly',
    body: [
      'Do not add false spots, spam, offensive content or photos of people. We may hide or remove content and limit use to keep the app accurate and safe.',
    ],
  },
  {
    title: 'Questions and requests',
    body: [
      'To ask about your data, or to ask us to remove a spot or photo you added, use "Report a problem" in the app (Rules tab). Because we do not know who you are, we may need the spot or report details to find it.',
    ],
  },
]

// The /privacy route.
export default function PrivacyRoute() {
  const navigate = useNavigate()
  return <Privacy onBack={() => navigate(-1)} />
}

// Also shown from the first screen, which is outside the router.
export function Privacy({ onBack }) {
  const { t } = useI18n()
  const note = t('privacy.englishOnly')

  return (
    <main className="px-4 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <button type="button" onClick={onBack} className="text-sm font-medium text-stone-500 dark:text-stone-400">
        {t('common.back')}
      </button>
      <h1 className="mt-2 text-2xl font-bold">{t('privacy.title')}</h1>
      {note && <p className="mt-2 rounded-xl bg-stone-200 px-3 py-2 text-sm dark:bg-stone-800">{note}</p>}
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Last updated {UPDATED}</p>

      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-5" lang="en">
          <h2 className="font-semibold">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p.slice(0, 40)} className="mt-1.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  )
}
