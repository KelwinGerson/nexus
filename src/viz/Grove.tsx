import { useLayoutEffect, useMemo } from 'react'
import { ContactShadows, PerspectiveCamera, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { LineVisual } from '../domain'
import { Canopy } from './Canopy'
import { Limb } from './Limb'
import { ParasiteMesh } from './ParasiteMesh'
import { groundFragment, groundVertex } from './shaders'
import { buildTree, findBranch } from './tree'

function Aim() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0.4, 0.12, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function Ground() {
  const map = useTexture('/tex/ground-color.jpg')
  useLayoutEffect(() => {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.colorSpace = THREE.SRGBColorSpace
  }, [map])
  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uHasMap: { value: 1 },
    }),
    [map],
  )
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0.1, -2.16, 0]}>
      <circleGeometry args={[3.6, 80]} />
      <shaderMaterial
        vertexShader={groundVertex}
        fragmentShader={groundFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
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
  const bloom = visuals.some((item) => item.sacred > 0.7) ? 0.34 : 0.06

  return (
    <>
      <color attach="background" args={['#0c0a08']} />
      <fog attach="fog" args={['#0c0a08', 14, 28]} />
      <PerspectiveCamera makeDefault position={[4.05, 0.18, 9.8]} fov={27} near={0.1} far={60} />
      <Aim />
      <hemisphereLight args={['#5a4c3a', '#0c0907', 0.38]} />
      <directionalLight position={[4.4, 6.6, 3.0]} intensity={1.15} color="#f6e2b8" />
      <directionalLight position={[-3.4, 2.2, -3.0]} intensity={0.28} color="#7a8898" />

      <Ground />
      <ContactShadows
        position={[0.15, -2.145, 0]}
        scale={9}
        opacity={0.48}
        blur={2.4}
        far={4.5}
        color="#050302"
      />

      <Limb spec={tree.trunk} visual={leader} radius={trunkRadius} onToggle={onToggle} onHover={onHover} />
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
      <Canopy tree={tree} visuals={visuals} />
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

      <EffectComposer enableNormalPass={false} multisampling={4}>
        <N8AO aoRadius={0.55} intensity={2.1} quality="medium" halfRes />
        <Bloom luminanceThreshold={0.84} luminanceSmoothing={0.42} intensity={bloom} mipmapBlur />
        <Vignette eskil={false} offset={0.28} darkness={0.18} />
      </EffectComposer>
    </>
  )
}
