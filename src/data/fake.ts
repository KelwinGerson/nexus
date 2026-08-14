import { addDays, type Line, type Vote } from '../domain'

function stamp(lineId: string, date: string): Vote {
  return {
    id: `${lineId}-${date}`,
    lineId,
    date,
    recordedAt: `${date}T21:00:00.000Z`,
  }
}

function votesFromOffsets(lineId: string, today: string, offsets: number[]): Vote[] {
  return offsets.map((offset) => stamp(lineId, addDays(today, -offset)))
}

export function fakeCatalog(today: string): { lines: Line[]; votes: Vote[] } {
  const created = addDays(today, -80)

  const lines: Line[] = [
    {
      id: 'corpo',
      name: 'Corpo',
      kind: 'principal',
      polarity: 'cultivar',
      createdAt: created,
      sacredAt: addDays(today, -4),
      note: 'Denso, já sagrado. 10 dos últimos 14.',
    },
    {
      id: 'escrita',
      name: 'Escrita',
      kind: 'principal',
      polarity: 'cultivar',
      createdAt: created,
      note: 'Meio caminho. 6 dos últimos 14. Sem voto hoje.',
    },
    {
      id: 'noite',
      name: 'Noite',
      kind: 'principal',
      polarity: 'captura',
      createdAt: created,
      note: 'Grossa e suja. Parasita Tela se alimenta junto.',
    },
    {
      id: 'silencio',
      name: 'Silêncio',
      kind: 'principal',
      polarity: 'cultivar',
      createdAt: created,
      note: 'Abandonada. Só história antiga.',
    },
    {
      id: 'casa',
      name: 'Casa',
      kind: 'principal',
      polarity: 'cultivar',
      createdAt: addDays(today, -12),
      note: 'Linha nova. Poucos dias.',
    },
    {
      id: 'tela',
      name: 'Tela',
      kind: 'parasita',
      hostId: 'noite',
      createdAt: addDays(today, -40),
      note: 'Mais um episódio. Enrolada em Noite.',
    },
  ]

  const votes: Vote[] = [
    ...votesFromOffsets('corpo', today, [0, 1, 2, 3, 4, 6, 7, 8, 10, 11, 16, 18, 21, 23, 27, 30, 34, 38, 42]),
    ...votesFromOffsets('escrita', today, [1, 2, 4, 7, 9, 12, 18, 22, 29, 36]),
    ...votesFromOffsets('noite', today, [0, 1, 2, 3, 5, 6, 8, 9, 11, 17, 20, 24, 28]),
    ...votesFromOffsets('tela', today, [0, 1, 3, 5, 6, 9, 11, 17, 20]),
    ...votesFromOffsets('silencio', today, [28, 31, 35, 39, 44, 48, 52, 60]),
    ...votesFromOffsets('casa', today, [0, 3]),
  ]

  return { lines, votes }
}
