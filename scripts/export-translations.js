// Writes translations-review.csv: every app text in all languages side by
// side, for native speakers to review. Opens in Excel / Google Sheets
// (UTF-8 with BOM, so Chinese, Tamil and Thai display correctly).
//
//   npm run export:translations
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RULES } from '../src/rules.js'

const APP = join(import.meta.dirname, '..', 'app', 'src', 'i18n')
const OUT = join(import.meta.dirname, '..', 'translations-review.csv')
const LANGS = [
  ['en', 'English'],
  ['zh', '中文 (Chinese)'],
  ['ms', 'Bahasa Melayu (Malay)'],
  ['ta', 'தமிழ் (Tamil)'],
  ['th', 'ไทย (Thai)'],
]

// Where each group of texts appears, to give reviewers context.
const WHERE = {
  common: 'Shared', tab: 'Bottom tabs', geo: 'Location messages', onb: 'First screen (age check)', check: 'Check screen',
  verdict: 'Check answer', summary: 'Check answer', reason: 'Check answer', fine: 'Check answer', disclaimer: 'Check answer',
  neaRules: 'Check answer', gps: 'Check answer', near: 'Nearby screen', spot: 'Nearby list', status: 'Nearby list',
  feature: 'Spot features', kind: 'Spot details', detail: 'Spot details', vote: 'Spot details (votes)', since: 'Dates',
  add: 'Add a spot', rules: 'Rules screen', rule: 'Rules screen and Check answer (legal text)', notify: 'Push notification',
  alerts: 'Alerts card', changi: 'Changi Airport card', report: 'Report a problem',
  privacy: 'Privacy & terms page', about: 'Rules screen (About the data)', install: 'Add to home screen card (Check screen)', shareApp: 'Rules screen (share button)', busy: 'Spot screen and Nearby list (busy now)', search: 'Nearby screen (search a place)',
}

const dicts = Object.fromEntries(await Promise.all(LANGS.map(async ([id]) => [id, (await import(`../app/src/i18n/${id}.js`)).default])))
// English rule texts live in src/rules.js, not in en.js.
for (const r of RULES.filter((r) => !r.avoid)) {
  dicts.en[`rule.${r.id}.label`] = r.label
  dicts.en[`rule.${r.id}.reason`] = r.reason
}

const keys = Object.keys(dicts.en).filter((k) => dicts.en[k])
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const rows = [
  ['Key', 'Where it appears', ...LANGS.map(([, name]) => name), 'Reviewer notes'],
  ...keys.map((k) => [k, WHERE[k.split('.')[0]] ?? '', ...LANGS.map(([id]) => dicts[id][k] ?? '(missing)'), '']),
]
await writeFile(OUT, '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n')
console.log(`Wrote ${keys.length} texts x ${LANGS.length} languages to translations-review.csv`)
