import { useCallback, useMemo, useState } from 'react'
import { fakeCatalog } from '../data/fake'
import {
  deriveGrove,
  groveVisuals,
  markSacred,
  todayISO,
  toggleVote,
  type Line,
  type LineVisual,
  type Vote,
} from '../domain'

export function useGrove(now = new Date()) {
  const today = todayISO(now)
  const seed = useMemo(() => fakeCatalog(today), [today])
  const [lines, setLines] = useState<Line[]>(seed.lines)
  const [votes, setVotes] = useState<Vote[]>(seed.votes)

  const derived = useMemo(() => deriveGrove(lines, votes, today), [lines, votes, today])
  const visuals = useMemo(() => groveVisuals(lines, votes, derived, today), [lines, votes, derived, today])

  const toggle = useCallback(
    (lineId: string) => {
      setVotes((current) => {
        const nextVotes = toggleVote(current, lineId, today)
        setLines((currentLines) => markSacred(currentLines, deriveGrove(currentLines, nextVotes, today), today))
        return nextVotes
      })
    },
    [today],
  )

  return { today, lines, votes, derived, visuals, toggle }
}

export function isFed(visuals: LineVisual[], id: string) {
  const trunk = visuals.find((item) => item.id === id)
  if (trunk) return trunk.fedToday
  return visuals.some((item) => item.parasites.some((parasite) => parasite.id === id && parasite.fedToday))
}
