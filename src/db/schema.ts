import Dexie, { type Table } from 'dexie'
import type { Line, Vote } from '../domain'

export const SCHEMA_VERSION = 1

export type GroveMeta = {
  key: string
  schemaVersion: number
  seededAt?: string
}

export class GroveDB extends Dexie {
  lines!: Table<Line, string>
  votes!: Table<Vote, string>
  meta!: Table<GroveMeta, string>

  constructor(name = 'nexus') {
    super(name)
    this.version(SCHEMA_VERSION).stores({
      lines: 'id, kind, hostId',
      votes: 'id, [lineId+date], lineId, date',
      meta: 'key',
    })
  }
}

export const db = new GroveDB()
