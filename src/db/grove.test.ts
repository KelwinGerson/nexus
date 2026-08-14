import { afterEach, describe, expect, it } from 'vitest'
import { seedCatalog } from '../data/seed'
import { loadGrove, persistGrove } from './grove'
import { GroveDB } from './schema'

const today = '2026-08-14'
const opened: GroveDB[] = []

function testDb() {
  const database = new GroveDB(`nexus-test-${crypto.randomUUID()}`)
  opened.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(
    opened.splice(0).map(async (database) => {
      database.close()
      await database.delete()
    }),
  )
})

describe('loadGrove', () => {
  it('planta o catálogo só na primeira vez', async () => {
    const database = testDb()
    const first = await loadGrove(today, database)
    const seed = seedCatalog(today)
    expect(first.lines).toHaveLength(seed.lines.length)
    expect(first.votes).toHaveLength(seed.votes.length)

    await persistGrove(
      first.lines,
      first.votes.filter((vote) => vote.lineId !== 'casa'),
      database,
    )

    const second = await loadGrove(today, database)
    expect(second.votes.every((vote) => vote.lineId !== 'casa')).toBe(true)
    expect(second.votes.length).toBeLessThan(first.votes.length)
  })

  it('devolve as linhas na ordem de leitura, não pela chave', async () => {
    const database = testDb()
    await loadGrove(today, database)
    const reloaded = await loadGrove(today, database)
    expect(reloaded.lines.map((line) => line.id)).toEqual([
      'corpo',
      'escrita',
      'noite',
      'silencio',
      'casa',
      'tela',
    ])
  })

  it('guarda o voto depois de um persist', async () => {
    const database = testDb()
    const grove = await loadGrove(today, database)
    const extra = {
      id: 'escrita-manual',
      lineId: 'escrita',
      date: today,
      recordedAt: `${today}T12:00:00.000Z`,
    }
    await persistGrove(grove.lines, [...grove.votes, extra], database)
    const reloaded = await loadGrove(today, database)
    expect(reloaded.votes.some((vote) => vote.id === extra.id)).toBe(true)
  })
})
