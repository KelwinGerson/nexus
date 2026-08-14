import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LineVisual } from '../domain'
import { buildCanopy } from './placeLeaves'
import { leafFragment, leafVertex } from './shaders'
import type { TreeSkeleton } from './tree'
import { useSpring } from './useSpring'

const GLOW = new THREE.Color('#d4b56a')
const CULTIVAR = new THREE.Color('#3f6a32')
const CAPTURA = new THREE.Color('#3a3420')
const DRY = new THREE.Color('#6a5340')

function LeafBatch({
  batch,
  visual,
}: {
  batch: ReturnType<typeof buildCanopy>[number]
  visual: LineVisual
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const wet = useSpring(18, 12, visual.leafWet)
  const glow = useSpring(14, 12, visual.leafGlow)
  const color = visual.id === 'silencio' ? DRY : visual.polarity === 'captura' ? CAPTURA : CULTIVAR

  const geometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1, 1, 2)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.setAttribute('position', base.getAttribute('position'))
    geo.setAttribute('uv', base.getAttribute('uv'))
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(batch.offset, 3))
    geo.setAttribute('aOut', new THREE.InstancedBufferAttribute(batch.out, 3))
    geo.setAttribute('aUp', new THREE.InstancedBufferAttribute(batch.up, 3))
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(batch.phase, 1))
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(batch.scale, 1))
    geo.setAttribute('aAlive', new THREE.InstancedBufferAttribute(batch.alive, 1))
    geo.instanceCount = batch.count
    base.dispose()
    return geo
  }, [batch])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWet: { value: visual.leafWet },
      uGlow: { value: visual.leafGlow },
      uColor: { value: color.clone() },
      uGlowTint: { value: GLOW.clone() },
    }),
    [],
  )

  useFrame((_, dt) => {
    const mat = material.current
    if (!mat) return
    mat.uniforms.uTime.value += dt
    mat.uniforms.uWet.value = wet.step(visual.leafWet, dt)
    mat.uniforms.uGlow.value = glow.step(visual.leafGlow, dt)
    mat.uniforms.uColor.value.copy(color)
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={leafVertex}
        fragmentShader={leafFragment}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

type CanopyProps = {
  tree: TreeSkeleton
  visuals: LineVisual[]
}

export function Canopy({ tree, visuals }: CanopyProps) {
  const layout = visuals.map((item) => `${item.id}:${item.leafCount}`).join('|')
  const batches = useMemo(() => buildCanopy(tree, visuals), [layout, tree, visuals])
  const byId = useMemo(() => new Map(visuals.map((item) => [item.id, item])), [visuals])

  return (
    <>
      {batches.map((batch) => {
        const visual = byId.get(batch.lineId)
        if (!visual) return null
        return <LeafBatch key={batch.lineId} batch={batch} visual={visual} />
      })}
    </>
  )
}
