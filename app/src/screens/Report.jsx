import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { sendReport } from '../api.js'
import { useI18n } from '../i18n/index.jsx'

const KINDS = ['wrong_answer', 'spot', 'app', 'other']

// "Report a problem". From the Check screen it arrives with the answer and
// position, so "the answer looks wrong" can say where and what was shown.
export default function Report() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const coords = state?.coords ?? null
  const result = state?.result ?? null
  const [kind, setKind] = useState(state?.kind ?? (result ? 'wrong_answer' : 'app'))
  const [message, setMessage] = useState('')
  const [withLocation, setWithLocation] = useState(Boolean(coords))
  const [send, setSend] = useState({ status: 'idle', error: null })

  const needsText = kind !== 'wrong_answer'
  const canSend = send.status !== 'sending' && (!needsText || message.trim())

  const submit = async (e) => {
    e.preventDefault()
    if (!canSend) return
    setSend({ status: 'sending', error: null })
    try {
      await sendReport({
        kind,
        message: message.trim(),
        lang,
        ...(withLocation && coords && { lat: coords.lat, lng: coords.lng }),
        ...(kind === 'wrong_answer' && result && { verdict: result.verdict, rules: result.reasons.map((r) => r.rule) }),
      })
      setSend({ status: 'sent', error: null })
    } catch (err) {
      setSend({ status: 'error', error: err.message })
    }
  }

  if (send.status === 'sent') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-semibold">{t('report.thanks')}</p>
        <Link to="/" className="mt-6 rounded-xl bg-go px-5 py-3 font-semibold text-white dark:bg-go-dark dark:text-stone-950">
          {t('report.backToApp')}
        </Link>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-sm font-medium text-stone-500 dark:text-stone-400">
        {t('common.back')}
      </button>
      <h1 className="mt-2 text-2xl font-bold">{t('report.title')}</h1>

      <form onSubmit={submit} className="flex flex-1 flex-col">
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">{t('report.kind')}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <label
                key={k}
                className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium shadow-sm ${
                  kind === k ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-white dark:bg-stone-900'
                }`}
              >
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                {t(`report.k.${k}`)}
              </label>
            ))}
          </div>
        </fieldset>

        {kind === 'wrong_answer' && result && (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{t('report.answerWas', { verdict: t(`verdict.${result.verdict}`) })}</p>
        )}

        <label className="mt-4 block text-sm">
          <span className="font-semibold">{t('report.message')}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder={t('report.messageHint')}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
          />
        </label>

        {coords && (
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={withLocation} onChange={(e) => setWithLocation(e.target.checked)} className="mt-0.5 h-5 w-5 accent-go" />
            <span>
              <span className="font-medium">{t('report.includeLocation', { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })}</span>
              <span className="block text-stone-500 dark:text-stone-400">{t('report.locationNote')}</span>
            </span>
          </label>
        )}

        {send.error && (
          <p className="mt-3 text-sm text-stop dark:text-stop-dark" role="alert">
            {send.error}
          </p>
        )}

        <div className="mt-auto pb-4 pt-6">
          <button
            type="submit"
            disabled={!canSend}
            className="w-full rounded-xl bg-go py-4 text-lg font-semibold text-white active:opacity-80 disabled:opacity-50 dark:bg-go-dark dark:text-stone-950"
          >
            {send.status === 'sending' ? t('report.sending') : t('report.send')}
          </button>
        </div>
      </form>
    </main>
  )
}
