import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { densityOf, deriveGrove, deriveLine, toggleVote } from './formulas'
import type { Line, Vote } from './types'

const today = '2026-08-14'

function line(partial: Partial<Line> & Pick<Line, 'id' | 'name'>): Line {
  return {
    kind: 'principal',
    polarity: 'cultivar',
    createdAt: '2026-05-01',
    ...partial,
  }
}

function votes(lineId: string, offsets: number[]): Vote[] {
  return offsets.map((offset) => ({
    id: `${lineId}-${offset}`,
    lineId,
    date: addDays(today, -offset),
    recordedAt: today,
  }))
}

describe('toggleVote', () => {
  it('insere no máximo um voto por linha e dia', () => {
    const once = toggleVote([], 'corpo', today)
    const twice = toggleVote(once, 'corpo', today)
    expect(once).toHaveLength(1)
    expect(twice).toHaveLength(0)
  })
})

describe('densityOf', () => {
  it('voto de hoje pesa 1; abandono longo adelgaça', () => {
    const fresh = densityOf(votes('a', [0]), today, false)
    const old = densityOf(votes('a', [45]), today, false)
    expect(fresh).toBeCloseTo(1, 5)
    expect(old).toBeCloseTo(0.5, 2)
  })

  it('linha sagrada decai mais devagar', () => {
    const common = densityOf(votes('a', [45]), today, false)
    const sacred = densityOf(votes('a', [45]), today, true)
    expect(sacred).toBeGreaterThan(common)
  })
})

describe('deriveLine', () => {
  it('8 de 14 com pureza alta torna sagrada', () => {
    const corpo = line({ id: 'corpo', name: 'Corpo' })
    const state = deriveLine(corpo, [corpo], votes('corpo', [0, 1, 2, 3, 4, 5, 6, 7]), today)
    expect(state.daysInWindow).toBe(8)
    expect(state.sacred).toBe(true)
    expect(state.fedToday).toBe(true)
  })

  it('sete dias na janela não compra sacralidade', () => {
    const corpo = line({ id: 'corpo', name: 'Corpo' })
    const state = deriveLine(corpo, [corpo], votes('corpo', [0, 1, 2, 3, 4, 5, 6]), today)
    expect(state.sacred).toBe(false)
    expect(state.sacredProgress).toBeGreaterThan(0.8)
  })

  it('parasita reduz a pureza da hospedeira', () => {
    const noite = line({ id: 'noite', name: 'Noite', polarity: 'captura' })
    const tela = line({ id: 'tela', name: 'Tela', kind: 'parasita', hostId: 'noite' })
    const clean = deriveLine(noite, [noite], votes('noite', [0, 1, 2, 3, 4, 5, 6, 7]), today)
    const dirty = deriveLine(
      noite,
      [noite, tela],
      [...votes('noite', [0, 1, 2, 3, 4, 5, 6, 7]), ...votes('tela', [0, 1, 2, 3, 5, 6])],
      today,
    )
    expect(dirty.purity).toBeLessThan(clean.purity)
    expect(dirty.parasiteIds).toEqual(['tela'])
  })

  it('sacredAt permanece mesmo se a janela esvaziar', () => {
    const corpo = line({ id: 'corpo', name: 'Corpo', sacredAt: '2026-07-01' })
    const state = deriveLine(corpo, [corpo], votes('corpo', [40, 48]), today)
    expect(state.sacred).toBe(true)
    expect(state.daysInWindow).toBe(0)
  })
})

describe('deriveGrove', () => {
  it('só deriva linhas principais', () => {
    const corpo = line({ id: 'corpo', name: 'Corpo' })
    const tela = line({ id: 'tela', name: 'Tela', kind: 'parasita', hostId: 'corpo' })
    const grove = deriveGrove([corpo, tela], votes('corpo', [0]), today)
    expect(grove).toHaveLength(1)
    expect(grove[0].lineId).toBe('corpo')
  })
})
