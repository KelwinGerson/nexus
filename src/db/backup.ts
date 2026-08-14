import type { Line, LineKind, Polarity, Vote } from '../domain'
import { SCHEMA_VERSION } from './schema'

export type GroveBackup = {
  schemaVersion: number
  exportedAt: string
  lines: Line[]
  votes: Vote[]
}

const KINDS: LineKind[] = ['principal', 'parasita']
const POLARITIES: Polarity[] = ['cultivar', 'captura']

function isLine(value: unknown): value is Line {
  if (!value || typeof value !== 'object') return false
  const item = value as Line
  if (typeof item.id !== 'string' || !item.id) return false
  if (typeof item.name !== 'string' || !item.name) return false
  if (!KINDS.includes(item.kind)) return false
  if (typeof item.createdAt !== 'string') return false
  if (item.polarity && !POLARITIES.includes(item.polarity)) return false
  if (item.hostId !== undefined && typeof item.hostId !== 'string') return false
  if (item.kind === 'parasita' && !item.hostId) return false
  return true
}

function isVote(value: unknown): value is Vote {
  if (!value || typeof value !== 'object') return false
  const item = value as Vote
  return (
    typeof item.id === 'string' &&
    Boolean(item.id) &&
    typeof item.lineId === 'string' &&
    Boolean(item.lineId) &&
    typeof item.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    typeof item.recordedAt === 'string'
  )
}

export function serializeBackup(grove: { lines: Line[]; votes: Vote[] }, now = new Date()): string {
  const payload: GroveBackup = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    lines: grove.lines,
    votes: grove.votes,
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function parseBackup(raw: string): GroveBackup {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('backup ilegível')
  }

  if (!data || typeof data !== 'object') throw new Error('backup vazio')
  const body = data as Partial<GroveBackup>
  if (body.schemaVersion !== SCHEMA_VERSION) throw new Error('backup incompatível')
  if (!Array.isArray(body.lines) || !Array.isArray(body.votes)) throw new Error('backup incompleto')
  if (!body.lines.every(isLine) || !body.votes.every(isVote)) throw new Error('backup inválido')

  const principals = body.lines.filter((line) => line.kind === 'principal')
  if (principals.length < 1 || principals.length > 7) {
    throw new Error('bosque cabe 1–7 linhas')
  }

  const lineIds = new Set(body.lines.map((line) => line.id))
  if (lineIds.size !== body.lines.length) throw new Error('linha duplicada')

  for (const line of body.lines) {
    if (line.kind === 'parasita' && line.hostId && !lineIds.has(line.hostId)) {
      throw new Error(`parasita sem hospedeira: ${line.name}`)
    }
  }

  const seen = new Set<string>()
  for (const vote of body.votes) {
    if (!lineIds.has(vote.lineId)) throw new Error('voto órfão')
    const key = `${vote.lineId}:${vote.date}`
    if (seen.has(key)) throw new Error('voto duplicado')
    seen.add(key)
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: typeof body.exportedAt === 'string' ? body.exportedAt : '',
    lines: body.lines,
    votes: body.votes,
  }
}
