import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RULES } from '../src/rules.js'
import en from '../app/src/i18n/en.js'
import zh from '../app/src/i18n/zh.js'
import ms from '../app/src/i18n/ms.js'
import ta from '../app/src/i18n/ta.js'
import th from '../app/src/i18n/th.js'

const OTHERS = { zh, ms, ta, th }
// English-only on purpose: an empty string in English, a note elsewhere.
const ENGLISH_ONLY_NOTES = new Set(['privacy.englishOnly', 'rules.translationNote'])
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

test('every English text is translated into Chinese, Malay, Tamil and Thai', () => {
  for (const [lang, dict] of Object.entries(OTHERS)) {
    const missing = Object.keys(en).filter((k) => !(k in dict))
    assert.deepEqual(missing, [], `${lang} is missing: ${missing.join(', ')}`)
  }
})

test('translations use the same {placeholders} as English', () => {
  for (const [lang, dict] of Object.entries(OTHERS)) {
    for (const [key, text] of Object.entries(en)) {
      if (!(key in dict) || ENGLISH_ONLY_NOTES.has(key)) continue
      assert.deepEqual(placeholders(dict[key]), placeholders(text), `${lang} ${key}`)
    }
  }
})

test('every rule that can be shown has a translated label and reason', () => {
  for (const [lang, dict] of Object.entries(OTHERS)) {
    for (const rule of RULES.filter((r) => !r.avoid)) { // "avoid" rules (roads) are never shown
      assert.ok(dict[`rule.${rule.id}.label`], `${lang} rule.${rule.id}.label`)
      assert.ok(dict[`rule.${rule.id}.reason`], `${lang} rule.${rule.id}.reason`)
    }
  }
})
