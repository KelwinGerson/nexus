import {
  HALF_LIFE_COMMON,
  HALF_LIFE_SACRED,
  SACRED_DAYS,
  SACRED_PURITY,
  WINDOW_DAYS,
  type DerivedLineState,
  type Line,
  type Vote,
} from './types'
import { daysBetween } from './dates'

const LN2 = Math.log(2)

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function lambda(sacred: boolean) {
  return LN2 / (sacred ? HALF_LIFE_SACRED : HALF_LIFE_COMMON)
}

export function densityOf(votes: Vote[], today: string, sacred: boolean) {
  const decay = lambda(sacred)
  return votes.reduce((sum, vote) => {
    const age = daysBetween(vote.date, today)
    if (age < 0) return sum
    return sum + Math.exp(-decay * age)
  }, 0)
}

export function votesOn(votes: Vote[], lineId: string) {
  return votes.filter((vote) => vote.lineId === lineId)
}

export function deriveLine(
  line: Line,
  lines: Line[],
  votes: Vote[],
  today: string,
): DerivedLineState {
  const mine = votesOn(votes, line.id)
  const parasites = lines.filter((item) => item.kind === 'parasita' && item.hostId === line.id)
  const alreadySacred = Boolean(line.sacredAt)
  const density = densityOf(mine, today, alreadySacred)

  const parasiteDensity = parasites.reduce((sum, parasite) => {
    return sum + densityOf(votesOn(votes, parasite.id), today, false)
  }, 0)

  const purity = 1 - clamp(parasiteDensity / Math.max(density, 0.001), 0, 0.75)

  const inWindow = new Set(
    mine
      .map((vote) => daysBetween(vote.date, today))
      .filter((age) => age >= 0 && age < WINDOW_DAYS)
      .map((age) => age),
  )
  const daysInWindow = inWindow.size
  const newlySacred = daysInWindow >= SACRED_DAYS && purity >= SACRED_PURITY
  const sacred = alreadySacred || newlySacred
  const sacredProgress = clamp(daysInWindow / SACRED_DAYS, 0, 1) * clamp(purity / SACRED_PURITY, 0, 1)

  return {
    lineId: line.id,
    density,
    purity,
    fedToday: mine.some((vote) => vote.date === today),
    daysInWindow,
    sacred,
    sacredProgress,
    parasiteIds: parasites.map((item) => item.id),
  }
}

export function deriveGrove(lines: Line[], votes: Vote[], today: string): DerivedLineState[] {
  return lines.filter((line) => line.kind === 'principal').map((line) => deriveLine(line, lines, votes, today))
}

export function markSacred(lines: Line[], derived: DerivedLineState[], today: string): Line[] {
  return lines.map((line) => {
    const state = derived.find((item) => item.lineId === line.id)
    if (!state?.sacred || line.sacredAt) return line
    return { ...line, sacredAt: today }
  })
}

export function toggleVote(votes: Vote[], lineId: string, date: string, now = new Date()): Vote[] {
  const existing = votes.find((vote) => vote.lineId === lineId && vote.date === date)
  if (existing) return votes.filter((vote) => vote !== existing)
  return [
    ...votes,
    {
      id: crypto.randomUUID(),
      lineId,
      date,
      recordedAt: now.toISOString(),
    },
  ]
}

export function seedFromId(id: string) {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295 * 6 + 0.4
}

export function radiusFromDensity(density: number) {
  return 0.024 + 0.09 * (1 - Math.exp(-density / 6))
}

export function vigorFromDensity(density: number) {
  return clamp(1 - Math.exp(-density / 3.2), 0, 1)
}

export function leafCountFromDensity(density: number, sacred = false) {
  const cap = sacred ? 190 : 140
  return Math.round(cap * (1 - Math.exp(-density / 5.5)))
}
