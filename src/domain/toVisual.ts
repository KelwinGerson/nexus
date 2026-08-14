import { densityOf, radiusFromDensity, seedFromId, vigorFromDensity, votesOn } from './formulas'
import type { DerivedLineState, Line, LineVisual, Polarity, Vote } from './types'

export function toVisual(
  line: Line,
  state: DerivedLineState,
  lines: Line[],
  votes: Vote[],
  today: string,
): LineVisual {
  const polarity: Polarity = line.polarity ?? 'cultivar'
  const parasites = lines
    .filter((item) => item.kind === 'parasita' && item.hostId === line.id)
    .map((parasite) => {
      const mine = votesOn(votes, parasite.id)
      return {
        id: parasite.id,
        name: parasite.name,
        vigor: vigorFromDensity(densityOf(mine, today, false)),
        fedToday: mine.some((vote) => vote.date === today),
      }
    })

  return {
    id: line.id,
    name: line.name,
    seed: seedFromId(line.id),
    radius: radiusFromDensity(state.density),
    purity: state.purity,
    sacred: state.sacred ? 1 : state.sacredProgress * 0.28,
    polarity,
    fedToday: state.fedToday,
    parasites,
  }
}

export function groveVisuals(
  lines: Line[],
  votes: Vote[],
  derived: DerivedLineState[],
  today: string,
): LineVisual[] {
  return lines
    .filter((line) => line.kind === 'principal')
    .map((line) => {
      const state = derived.find((item) => item.lineId === line.id)
      if (!state) {
        throw new Error(`missing derived state for ${line.id}`)
      }
      return toVisual(line, state, lines, votes, today)
    })
}
