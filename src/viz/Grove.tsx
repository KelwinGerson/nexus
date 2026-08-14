import { useLayoutEffect, useMemo } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { LineVisual } from '../domain'
import { Limb } from './Limb'
import { ParasiteMesh } from './ParasiteMesh'
import { groundFragment, groundVertex } from './shaders'
import { buildTree, findBranch } from './tree'

function Aim() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0.04, 0.02, 0)
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
  const leader = tree.leaderId ? byId.get(tree.leaderId) : undefined
  const trunkRadius = 0.06 + visuals.reduce((sum, item) => sum + item.radius, 0) * 0.18
  const bloom = visuals.some((item) => item.sacred > 0.7) ? 0.26 : 0.05

  return (
    <>
      <color attach="background" args={['#0b0907']} />
      <fog attach="fog" args={['#0b0907', 11, 24]} />
      <PerspectiveCamera makeDefault position={[4.05, 0.06, 11.5]} fov={24} near={0.1} far={60} />
      <Aim />
      <hemisphereLight args={['#3a3228', '#0c0907', 0.34]} />
      <directionalLight position={[4.2, 6.4, 3.2]} intensity={0.92} color="#f0dcb4" />
      <directionalLight position={[-3.6, 2.1, -3.2]} intensity={0.28} color="#6a7a8c" />
      <directionalLight position={[-1.2, 0.2, 4.2]} intensity={0.08} color="#c4b090" />

      <mesh rotation-x={-Math.PI / 2} position={[0, -2.16, 0]}>
        <circleGeometry args={[3.1, 64]} />
        <shaderMaterial
          vertexShader={groundVertex}
          fragmentShader={groundFragment}
          transparent
          depthWrite={false}
        />
      </mesh>

      <Limb
        spec={tree.trunk}
        visual={leader}
        radius={trunkRadius}
        onToggle={onToggle}
        onHover={onHover}
      />
      {tree.roots.map((root) => (
        <Limb key={root.id} spec={root} radius={trunkRadius * root.radiusScale} />
      ))}
      {tree.branches.map((branch) => {
        const visual = byId.get(branch.lineId ?? branch.id)
        if (!visual) return null
        return (
          <Limb
            key={branch.id}
            spec={branch}
            visual={visual}
            radius={visual.radius * branch.radiusScale}
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
            radius={visual.radius * twig.radiusScale}
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
              lift={visual.radius * 1.15 + 0.014}
              onToggle={() => onToggle(parasite.id)}
              onHover={(over) => onHover(over ? parasite.name : null)}
            />
          )
        }),
      )}

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.86} luminanceSmoothing={0.42} intensity={bloom} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </>
  )
}
