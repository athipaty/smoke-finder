import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const lists = JSON.parse(await readFile(join(import.meta.dirname, '..', 'data', 'operator-spots.json'), 'utf8'))

test('operator smoking-area lists: short names, positions in Singapore, a source each', () => {
  for (const [source, list] of Object.entries(lists)) {
    if (source.startsWith('_')) continue
    assert.match(list.source, /^https:\/\//, `${source} source link`)
    assert.ok(list.spots.length > 0, `${source} has spots`)
    const names = new Set()
    for (const s of list.spots) {
      assert.ok(s.name.length <= 60, `${source}: name too long: ${s.name}`)
      assert.ok(!names.has(s.name), `${source}: duplicate name: ${s.name}`)
      names.add(s.name)
      assert.ok(s.lat > 1.15 && s.lat < 1.48 && s.lng > 103.59 && s.lng < 104.1, `${source}: outside Singapore: ${s.name}`)
      assert.ok(s.official && s.landmark, `${source}: official wording and landmark: ${s.name}`)
    }
  }
})
