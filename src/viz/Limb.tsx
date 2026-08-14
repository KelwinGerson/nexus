import type { LineVisual } from '../domain'
import { LineMesh, useLineAttribs } from './LineMesh'
import type { BranchSpec } from './tree'

type LimbProps = {
  spec: BranchSpec
  visual?: LineVisual
  radius: number
  onToggle?: (id: string) => void
  onHover?: (name: string | null) => void
}

export function Limb({ spec, visual, radius, onToggle, onHover }: LimbProps) {
  const tubular = spec.kind === 'trunk' ? 220 : spec.kind === 'twig' ? 90 : 160
  const radial = spec.kind === 'twig' || spec.kind === 'root' ? 16 : 32
  const attribs = useLineAttribs(spec.curve, tubular, radial)
  const lineId = spec.lineId ?? visual?.id

  return (
    <LineMesh
      attribs={attribs}
      radius={radius}
      purity={visual?.purity ?? 1}
      sacred={spec.kind === 'branch' || spec.kind === 'twig' ? (visual?.sacred ?? 0) : 0}
      kind={spec.kind}
      captura={visual?.polarity === 'captura'}
      onToggle={lineId ? () => onToggle?.(lineId) : undefined}
      onHover={(over) => onHover?.(over ? spec.name : null)}
    />
  )
}
