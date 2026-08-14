export type Polarity = 'cultivar' | 'captura'
export type LineKind = 'principal' | 'parasita'

export type Line = {
  id: string
  name: string
  kind: LineKind
  polarity?: Polarity
  hostId?: string
  note?: string
  createdAt: string
  sacredAt?: string
}

export type Vote = {
  id: string
  lineId: string
  date: string
  recordedAt: string
}

export type DerivedLineState = {
  lineId: string
  density: number
  purity: number
  fedToday: boolean
  daysInWindow: number
  sacred: boolean
  sacredProgress: number
  parasiteIds: string[]
}

export type LineVisual = {
  id: string
  name: string
  seed: number
  radius: number
  purity: number
  sacred: number
  polarity: Polarity
  fedToday: boolean
  parasites: Array<{ id: string; name: string; vigor: number; fedToday: boolean }>
}

export const WINDOW_DAYS = 14
export const SACRED_DAYS = 8
export const SACRED_PURITY = 0.65
export const HALF_LIFE_COMMON = 45
export const HALF_LIFE_SACRED = 90
