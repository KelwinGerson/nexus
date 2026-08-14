import { useMemo } from 'react'
import type { LineVisual } from '../domain'
import { LineMesh, useLineAttribs } from './LineMesh'
import { ParasiteMesh } from './ParasiteMesh'
import { makeSpine } from './spine'

type TrunkProps = {
  visual: LineVisual
  offsetX: number
  onToggle: (id: string) => void
  onHover: (name: string | null) => void
}

export function Trunk({ visual, offsetX, onToggle, onHover }: TrunkProps) {
  const curve = useMemo(() => makeSpine(visual.seed), [visual.seed])
  const attribs = useLineAttribs(curve)

  return (
    <group position={[offsetX, 0, 0]}>
      <LineMesh
        attribs={attribs}
        radius={visual.radius}
        purity={visual.purity}
        sacred={visual.sacred}
        captura={visual.polarity === 'captura'}
        onToggle={() => onToggle(visual.id)}
        onHover={(over) => onHover(over ? visual.name : null)}
      />
      {visual.parasites.map((parasite) => (
        <ParasiteMesh
          key={parasite.id}
          curve={curve}
          vigor={parasite.vigor}
          lift={visual.radius * 1.18 + 0.01}
          onToggle={() => onToggle(parasite.id)}
          onHover={(over) => onHover(over ? parasite.name : null)}
        />
      ))}
    </group>
  )
}
