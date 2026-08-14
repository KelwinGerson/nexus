import { describe, expect, it } from 'vitest'
import { seedCatalog } from '../data/seed'
import { parseBackup, serializeBackup } from './backup'

const today = '2026-08-14'

describe('backup', () => {
  it('ida e volta preserva linhas e votos', () => {
    const grove = seedCatalog(today)
    const raw = serializeBackup(grove, new Date('2026-08-14T12:00:00.000Z'))
    const parsed = parseBackup(raw)
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.lines).toEqual(grove.lines)
    expect(parsed.votes).toEqual(grove.votes)
  })

  it('recusa voto duplicado no mesmo dia', () => {
    const grove = seedCatalog(today)
    const raw = serializeBackup({
      lines: grove.lines,
      votes: [...grove.votes, { ...grove.votes[0], id: 'dup' }],
    })
    expect(() => parseBackup(raw)).toThrow(/duplicado/)
  })

  it('recusa mais de sete principais', () => {
    const grove = seedCatalog(today)
    const extras = Array.from({ length: 3 }, (_, index) => ({
      id: `extra-${index}`,
      name: `Extra ${index}`,
      kind: 'principal' as const,
      polarity: 'cultivar' as const,
      createdAt: today,
    }))
    const raw = serializeBackup({
      lines: [...grove.lines, ...extras],
      votes: grove.votes,
    })
    expect(() => parseBackup(raw)).toThrow(/1–7/)
  })

  it('recusa schema antigo', () => {
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 0, lines: [], votes: [] }))).toThrow(/incompatível/)
  })
})
