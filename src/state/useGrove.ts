import { useCallback, useEffect, useMemo, useState } from 'react'
import { seedCatalog } from '../data/seed'
import { loadGrove, parseBackup, persistGrove, replaceGrove, serializeBackup } from '../db'
import {
  deriveGrove,
  groveVisuals,
  markSacred,
  sortLines,
  todayISO,
  toggleVote,
  type Line,
  type LineVisual,
  type Vote,
} from '../domain'

export function useGrove(now = new Date()) {
  const today = todayISO(now)
  const [ready, setReady] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [votes, setVotes] = useState<Vote[]>([])

  useEffect(() => {
    let cancelled = false
    void loadGrove(today)
      .then((grove) => {
        if (cancelled) return
        setLines(grove.lines)
        setVotes(grove.votes)
        setReady(true)
      })
      .catch((error) => {
        console.error(error)
        if (cancelled) return
        const seed = seedCatalog(today)
        setLines(seed.lines)
        setVotes(seed.votes)
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [today])

  const derived = useMemo(() => deriveGrove(lines, votes, today), [lines, votes, today])
  const visuals = useMemo(() => groveVisuals(lines, votes, derived, today), [lines, votes, derived, today])

  const toggle = useCallback(
    (lineId: string) => {
      setVotes((current) => {
        const nextVotes = toggleVote(current, lineId, today)
        setLines((currentLines) => {
          const nextLines = markSacred(currentLines, deriveGrove(currentLines, nextVotes, today), today)
          void persistGrove(nextLines, nextVotes).catch((error) => console.error(error))
          return nextLines
        })
        return nextVotes
      })
    },
    [today],
  )

  const exportBackup = useCallback(() => serializeBackup({ lines, votes }), [lines, votes])

  const importBackup = useCallback(async (raw: string) => {
    const grove = parseBackup(raw)
    await replaceGrove(grove.lines, grove.votes)
    setLines(sortLines(grove.lines))
    setVotes(grove.votes)
  }, [])

  return { ready, today, lines, votes, derived, visuals, toggle, exportBackup, importBackup }
}

export function isFed(visuals: LineVisual[], id: string) {
  const trunk = visuals.find((item) => item.id === id)
  if (trunk) return trunk.fedToday
  return visuals.some((item) => item.parasites.some((parasite) => parasite.id === id && parasite.fedToday))
}

export function downloadBackup(json: string, today: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nexus-${today}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function pickBackupFile() {
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('nenhum arquivo'))
        return
      }
      void file.text().then(resolve).catch(reject)
    }
    input.click()
  })
}
