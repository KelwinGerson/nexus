import { seedCatalog } from '../data/seed'
import { sortLines, type Line, type Vote } from '../domain'
import { db, SCHEMA_VERSION, type GroveDB } from './schema'

export async function replaceGrove(lines: Line[], votes: Vote[], database: GroveDB = db) {
  await database.transaction('rw', database.lines, database.votes, async () => {
    await database.lines.clear()
    await database.votes.clear()
    if (lines.length) await database.lines.bulkPut(lines)
    if (votes.length) await database.votes.bulkPut(votes)
  })
}

export async function loadGrove(today: string, database: GroveDB = db) {
  const count = await database.lines.count()
  if (count === 0) {
    const seed = seedCatalog(today)
    await replaceGrove(seed.lines, seed.votes, database)
    await database.meta.put({ key: 'grove', schemaVersion: SCHEMA_VERSION, seededAt: today })
    return { lines: sortLines(seed.lines), votes: seed.votes }
  }

  const [lines, votes] = await Promise.all([database.lines.toArray(), database.votes.toArray()])
  return { lines: sortLines(lines), votes }
}

export async function persistGrove(lines: Line[], votes: Vote[], database: GroveDB = db) {
  await replaceGrove(lines, votes, database)
}
