import type { Line } from './types'

export function sortLines(lines: Line[]) {
  return [...lines].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'principal' ? -1 : 1
    const byCreated = a.createdAt.localeCompare(b.createdAt)
    if (byCreated) return byCreated
    return a.name.localeCompare(b.name, 'pt')
  })
}
