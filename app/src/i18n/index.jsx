import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { RULES_BY_ID } from '../../../src/rules.js'
import { load, save } from '../storage.js'
import en from './en.js'
import zh from './zh.js'
import ms from './ms.js'
import ta from './ta.js'
import th from './th.js'

export const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'zh', name: '中文' },
  { id: 'ms', name: 'Bahasa Melayu' },
  { id: 'ta', name: 'தமிழ்' },
  { id: 'th', name: 'ไทย' },
]
const DICTS = { en, zh, ms, ta, th }
const KEY = 'sf.lang'

function initialLang() {
  const saved = load(KEY)
  if (saved && DICTS[saved]) return saved
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return DICTS[browser] ? browser : 'en'
}

// "{m} m away" + { m: 12 } -> "12 m away"
const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : text)

// For code outside components (api.js): uses the language currently shown.
export function translate(key, vars) {
  const dict = DICTS[document.documentElement.lang] ?? en
  return fill(dict[key] ?? en[key] ?? key, vars)
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  const setLang = useCallback((next) => {
    setLangState(next)
    save(KEY, next)
    document.documentElement.lang = next
  }, [])

  const value = useMemo(() => {
    document.documentElement.lang = lang
    const dict = DICTS[lang]
    // Missing keys fall back to English, then to `fallback`.
    const t = (key, vars, fallback) => fill(dict[key] ?? en[key] ?? fallback ?? key, vars)
    // Rule texts: English lives in the engine's rules.js; other languages here.
    const ruleLabel = (id) => t(`rule.${id}.label`, null, RULES_BY_ID[id]?.label ?? id)
    const ruleReason = (id) => t(`rule.${id}.reason`, null, RULES_BY_ID[id]?.reason ?? '')
    return { lang, setLang, t, ruleLabel, ruleReason }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

export function LanguagePicker({ className = '' }) {
  const { lang, setLang, t } = useI18n()
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="text-stone-500 dark:text-stone-400">{t('common.language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-lg border border-stone-300 bg-white px-2 py-1 dark:border-stone-700 dark:bg-stone-900"
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  )
}
