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
  const tubular = spec.kind === 'trunk' ? 280 : spec.kind === 'twig' ? 56 : spec.kind === 'root' ? 88 : 140
  const radial = spec.kind === 'twig' ? 8 : spec.kind === 'root' ? 12 : spec.kind === 'trunk' ? 40 : 22
  const attribs = useLineAttribs(spec.curve, tubular, radial)
  const lineId = spec.lineId ?? visual?.id
  const sacred =
    spec.kind === 'root' ? 0 : spec.kind === 'trunk' ? (visual?.sacred ?? 0) * 0.85 : (visual?.sacred ?? 0)

  return (
    <LineMesh
      attribs={attribs}
      radius={radius}
      purity={visual?.purity ?? 1}
      sacred={sacred}
      kind={spec.kind}
      captura={visual?.polarity === 'captura'}
      onToggle={lineId && onToggle ? () => onToggle(lineId) : undefined}
      onHover={(over) => onHover?.(over ? spec.name : null)}
    />
  )
}
