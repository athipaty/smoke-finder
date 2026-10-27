import { useState } from 'react'

const POINTS = [
  { title: 'Can I smoke here?', body: 'One tap tells you if the spot you are standing on is allowed under NEA rules.' },
  { title: 'Nearest legal spot', body: 'If not, see the closest places where it is, with walking time.' },
  { title: 'Your location stays private', body: 'Location is only used while the app is open, to check your spot. It is never stored.' },
]

export default function Onboarding({ onConfirm }) {
  const [underAge, setUnderAge] = useState(false)

  if (underAge) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">This app is for adults 21 and over</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-300">
          Smoking under 21 is illegal in Singapore. If you'd like help to quit, the{' '}
          <a href="https://www.healthhub.sg/programmes/iquit" target="_blank" rel="noopener noreferrer" className="underline">
            I Quit programme
          </a>{' '}
          is free.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(3rem+env(safe-area-inset-top))]">
      <img src="/icon.svg" alt="" className="h-16 w-16 rounded-2xl" />
      <h1 className="mt-6 text-3xl font-bold">Smoke Finder SG</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-300">Follow Singapore's smoking rules without guessing.</p>

      <ul className="mt-8 space-y-5">
        {POINTS.map((p) => (
          <li key={p.title}>
            <p className="font-semibold">{p.title}</p>
            <p className="text-sm text-stone-600 dark:text-stone-300">{p.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-stone-500 dark:text-stone-400">
        Answers are guidance only. Always follow signs on site and NEA rules.
      </p>

      <div className="mt-auto space-y-3 pt-8">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-go py-4 text-lg font-semibold text-white active:opacity-80 dark:bg-go-dark dark:text-stone-950"
        >
          I'm 21 or older
        </button>
        <button
          type="button"
          onClick={() => setUnderAge(true)}
          className="w-full rounded-xl py-3 text-stone-600 active:opacity-70 dark:text-stone-300"
        >
          I'm under 21
        </button>
      </div>
    </main>
  )
}
