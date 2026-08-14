import { useLayoutEffect, useMemo } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { LineVisual } from '../domain'
import { Limb } from './Limb'
import { ParasiteMesh } from './ParasiteMesh'
import { buildTree, findBranch } from './tree'

function Aim() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0.0, -0.25, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

type GroveProps = {
  visuals: LineVisual[]
  onToggle: (id: string) => void
  onHover: (name: string | null) => void
}

export function Grove({ visuals, onToggle, onHover }: GroveProps) {
  const layoutKey = visuals.map((item) => item.id).join('|')
  const tree = useMemo(() => buildTree(visuals), [layoutKey, visuals])
  const byId = useMemo(() => new Map(visuals.map((item) => [item.id, item])), [visuals])
  const trunkRadius = 0.052 + visuals.reduce((sum, item) => sum + item.radius, 0) * 0.18
  const bloom = visuals.some((item) => item.sacred > 0.7) ? 0.28 : 0.05

  return (
    <>
      <color attach="background" args={['#0a0806']} />
      <fog attach="fog" args={['#0a0806', 6.5, 16]} />
      <PerspectiveCamera makeDefault position={[4.8, 0.55, 12.4]} fov={26} near={0.1} far={60} />
      <Aim />
      <hemisphereLight args={['#3a342c', '#100c09', 0.55]} />
      <directionalLight position={[3.8, 5.4, 2.6]} intensity={1.05} color="#f3e6c8" />
      <directionalLight position={[-2.8, 1.4, -2.2]} intensity={0.22} color="#7d8896" />

      <mesh rotation-x={-Math.PI / 2} position={[0, -2.2, 0]}>
        <circleGeometry args={[2.1, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} />
      </mesh>

      <Limb spec={tree.trunk} radius={trunkRadius} />
      {tree.roots.map((root) => (
        <Limb key={root.id} spec={root} radius={trunkRadius * 0.42} />
      ))}
      {tree.branches.map((branch) => {
        const visual = byId.get(branch.id)
        if (!visual) return null
        return (
          <Limb
            key={branch.id}
            spec={branch}
            visual={visual}
            radius={visual.radius * 0.92}
            onToggle={onToggle}
            onHover={onHover}
          />
        )
      })}
      {tree.twigs.map((twig) => {
        const visual = twig.lineId ? byId.get(twig.lineId) : undefined
        if (!visual) return null
        return (
          <Limb
            key={twig.id}
            spec={twig}
            visual={visual}
            radius={visual.radius * 0.34}
            onToggle={onToggle}
            onHover={onHover}
          />
        )
      })}
      {visuals.map((visual) =>
        visual.parasites.map((parasite) => {
          const host = findBranch(tree, visual.id)
          if (!host) return null
          return (
            <ParasiteMesh
              key={parasite.id}
              curve={host.curve}
              vigor={parasite.vigor}
              lift={visual.radius * 1.05 + 0.012}
              onToggle={() => onToggle(parasite.id)}
              onHover={(over) => onHover(over ? parasite.name : null)}
            />
          )
        }),
      )}

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.88} luminanceSmoothing={0.4} intensity={bloom} mipmapBlur />
      </EffectComposer>
    </>
  )
}
