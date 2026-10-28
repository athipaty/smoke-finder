import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'

// Privacy notice and terms of use. Kept in English (the version that applies);
// other languages show a short note saying so. Every statement here must match
// what the app and backend actually do: update this page when they change.
const UPDATED = '28 October 2026'

const SECTIONS = [
  {
    title: 'What this app does',
    icon: '🧭',
    body: [
      'Smoke Finder SG helps adults in Singapore follow the smoking rules set by the National Environment Agency (NEA): it tells you whether the place you are standing is a no-smoking place, and shows legal places nearby.',
      'Answers are guidance only, worked out from open map data and NEA information. They can be wrong or out of date. Always follow signs on site and NEA rules. We are not responsible for fines or other consequences of relying on the app.',
      'The app is for people aged 21 and over.',
    ],
  },
  {
    title: 'Your location',
    icon: '📍',
    body: [
      'When you check a spot, open Nearby, add a spot or ask for a walking route, the app sends your location to our server to look up the rules there. We do not keep it, except in the cases below.',
      'If you add a spot, its position is stored and shown to everyone. If you send a problem report and tick "Include my location", that location is stored with the report. If you turn on rule-change alerts, the positions of your saved spots are stored until you turn alerts off.',
      'If you search for a place, the words you type are sent to our server and passed on to OneMap to find it. We do not keep them.',
      'Your location is sent inside the request, not in the web address, so it is not written to our hosting provider’s request logs. Those logs (kept for a short time by Render) contain technical details such as the time, the page asked for and the network (IP) address.',
    ],
  },
  {
    title: 'The random ID on your phone',
    icon: '🎲',
    body: [
      'The app creates a random ID and keeps it on your phone. It is not linked to your name, number or account. Our server stores only a scrambled (hashed) form of it.',
      'We use it to count one vote per phone on each spot, to limit how many spots and reports one phone can send, and to count how many people use the app each day and week. For usage counts we keep the first and last day the app was opened and up to 60 recent days; this is deleted after 12 months without use.',
    ],
  },
  {
    title: 'Spots, votes and photos you add',
    icon: '📸',
    body: [
      'Spots you add, their features and their photos (including photos you add to an existing spot) are public. Photos are resized, their hidden location data (EXIF) is removed, and faces our system can detect are blurred before they are stored. It can miss some faces (for example, turned sideways or very small), so please do not include people or private property.',
      'Your votes ("Still here", "Gone", "Not allowed here", photo reports, and your answers when you fix a spot\u2019s details) are stored with the hashed ID so each phone counts once. Spots may be hidden automatically after reports, or removed by our moderators.',
    ],
  },
  {
    title: '"I’m here now"',
    icon: '👥',
    body: [
      'If you tap "I’m here now" on a spot, we store which spot, the time and the hashed ID, so others can see how many people were there in the last hour. You can be checked in at one spot at a time; it is deleted automatically after 90 minutes, or when you tap "I’ve left". At a spot added by app users, it also counts as your "Still here" vote. Your own position is not sent or stored for this.',
    ],
  },
  {
    title: 'Problem reports',
    icon: '🛠️',
    body: [
      'Reports you send are read by our moderators and deleted automatically after 180 days. When a report arrives, or a spot is added, moderators get a phone notification through ntfy.sh with the type of report and the start of its text (never a location).',
    ],
  },
  {
    title: 'Error reports',
    icon: '🐞',
    body: [
      'If the app hits an error, it sends our server the error message, technical details of where in the app it happened, the page (for example "/map"), the app version and your browser type (for example "Chrome Android"). No location, ID or personal details. Error reports are deleted 30 days after the error was last seen.',
    ],
  },
  {
    title: 'Things kept only on your phone',
    icon: '📱',
    body: [
      'Your saved spots, language, your answer to the age question and similar settings stay in your browser on your phone. So does your last Nearby list (up to 7 days old), and the map data around the last 5 places you checked (up to 30 days old), so the app works when you have no signal. Clearing the browser data for this site removes them.',
    ],
  },
  {
    title: 'Rule-change alerts',
    icon: '🔔',
    body: [
      'Alerts are off unless you turn them on. When on, your browser gives us a push address, and the notification is delivered by your browser maker\'s push service (for example Google, Apple, Microsoft or Mozilla). Turning alerts off deletes the push address and your saved spots from our server.',
    ],
  },
  {
    title: 'Other services we use',
    icon: '🔗',
    body: [
      'Maps and walking routes: OneMap by the Singapore Land Authority (they receive the map area being shown and, for routes, the start and end points). Rules data: NEA open data and OpenStreetMap contributors. Weather: NEA via data.gov.sg (no personal data is sent). Walking directions open Google Maps when you tap them. The app is hosted on Vercel, the server on Render, data in MongoDB Atlas, and photos in Backblaze B2.',
    ],
  },
  {
    title: 'Using the app fairly',
    icon: '🤝',
    body: [
      'Do not add false spots, spam, offensive content or photos of people. We may hide or remove content and limit use to keep the app accurate and safe.',
    ],
  },
  {
    title: 'Questions and requests',
    icon: '✉️',
    body: [
      'To ask about your data, or to ask us to remove a spot or photo you added, use "Report a problem" in the app (Rules tab). Because we do not know who you are, we may need the spot or report details to find it.',
    ],
  },
]

// The short version, at the top. Each line must stay true to the sections below.
const SUMMARY = [
  ['📍', 'Your location is used to answer you and is not kept, unless you add a spot, choose to include it in a report, or turn on alerts for your saved spots.'],
  ['🙈', 'No accounts, names or phone numbers. A random ID on your phone, stored only in scrambled form, counts votes once per phone.'],
  ['📱', 'Saved spots, settings and offline map data stay on your phone. Clearing the browser data for this site removes them.'],
  ['✉️', 'Questions, or want something you added removed? Use "Report a problem" in the Rules tab.'],
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

      <section className="mt-5 rounded-2xl bg-stone-900 p-4 text-white dark:bg-stone-800" lang="en">
        <h2 className="font-semibold">In short</h2>
        <ul className="mt-3 space-y-2.5">
          {SUMMARY.map(([icon, text]) => (
            <li key={text} className="flex gap-3 text-sm leading-relaxed text-stone-100">
              <span aria-hidden="true">{icon}</span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900" lang="en">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-base dark:bg-stone-800" aria-hidden="true">
              {s.icon}
            </span>
            {s.title}
          </h2>
          {s.body.map((p) => (
            <p key={p.slice(0, 40)} className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  )
}
