// Adds operators' designated smoking areas (data/operator-spots.json) to the
// community spots in MongoDB, as approximate, moderator-verified spots.
// Spots already there (same source and name) are left alone, so a moderator's
// edits or exact pin stay. Spots in the database but no longer in the file are
// listed for a moderator to check, never deleted here.
//
//   MONGO_URI=... npm run import:operators      (or put MONGO_URI in smoke-finder/.env)
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGO_URI
if (!uri) {
  console.error('Set MONGO_URI (e.g. in smoke-finder/.env) first.')
  process.exit(1)
}

const lists = JSON.parse(await readFile(join(import.meta.dirname, '..', 'data', 'operator-spots.json'), 'utf8'))
const client = new MongoClient(uri)
await client.connect()
const spots = client.db().collection('smokespots')

for (const [source, list] of Object.entries(lists)) {
  if (source.startsWith('_')) continue
  let added = 0
  for (const s of list.spots) {
    if (s.name.length > 60) throw new Error(`${source}: name over 60 characters: ${s.name}`)
    if (await spots.findOne({ source, name: s.name }, { projection: { _id: 1 } })) continue
    const now = new Date()
    await spots.insertOne({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      location: { type: 'Point', coordinates: [s.lng, s.lat] },
      sheltered: false,
      hasAshtray: false,
      hasSeating: false,
      hours: null,
      photoUrl: null,
      photoKey: null,
      photoHidden: false,
      photoAdminHidden: false,
      verdictAtAdd: 'amber',
      createdBy: `${source}-list`,
      source,
      approximate: true,
      addedByModerator: true,
      votes: [],
      featureVotes: [],
      hereCount: 0,
      goneCount: 0,
      notAllowedCount: 0,
      badPhotoCount: 0,
      status: 'verified',
      lastConfirmedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    added++
    console.log(`  added: ${s.name}`)
  }
  const names = new Set(list.spots.map((s) => s.name))
  const gone = await spots.find({ source, name: { $nin: [...names] } }, { projection: { name: 1 } }).toArray()
  console.log(`${source} (${list.operator}): ${list.spots.length} in the list, ${added} added`)
  for (const g of gone) console.log(`  not in the list any more (check in Moderation): ${g.name}`)
}
await client.close()
