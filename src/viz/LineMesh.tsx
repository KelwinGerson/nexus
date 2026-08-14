import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { lineFragment, lineVertex } from './shaders'
import { buildTubeAttribs, type TubeAttribs } from './spine'
import { useSpring } from './useSpring'

type LineMeshProps = {
  attribs: TubeAttribs
  radius: number
  purity: number
  sacred: number
  onToggle?: () => void
}

const CLEAN = new THREE.Color('#c8b596')
const MUDDY = new THREE.Color('#5a4c3c')
const SACRED = new THREE.Color('#f0d6a4')

export function LineMesh({ attribs, radius, purity, sacred, onToggle }: LineMeshProps) {
  const { camera } = useThree()
  const material = useRef<THREE.ShaderMaterial>(null)
  const radiusSpring = useSpring(42, 10)
  const puritySpring = useSpring(18, 12)
  const sacredSpring = useSpring(14, 12)

  const uniforms = useMemo(
    () => ({
      uRadius: { value: 0.034 },
      uTime: { value: 0 },
      uIrregular: { value: 0 },
      uPurity: { value: 1 },
      uSacred: { value: 0 },
      uClean: { value: CLEAN.clone() },
      uMuddy: { value: MUDDY.clone() },
      uSacredTint: { value: SACRED.clone() },
      uCameraPos: { value: new THREE.Vector3() },
    }),
    [],
  )

  useFrame((_, dt) => {
    const mat = material.current
    if (!mat) return
    const r = radiusSpring.step(radius, dt)
    const p = puritySpring.step(purity, dt)
    const s = sacredSpring.step(sacred, dt)
    mat.uniforms.uRadius.value = r
    mat.uniforms.uPurity.value = p
    mat.uniforms.uSacred.value = s
    mat.uniforms.uIrregular.value = 1 - p
    mat.uniforms.uTime.value += dt
    mat.uniforms.uCameraPos.value.copy(camera.position)
  })

  return (
    <mesh
      geometry={attribs.geometry}
      frustumCulled={false}
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.()
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <shaderMaterial
        ref={material}
        vertexShader={lineVertex}
        fragmentShader={lineFragment}
        uniforms={uniforms}
        toneMapped
      />
    </mesh>
  )
}

export function useLineAttribs(curve: THREE.CatmullRomCurve3) {
  return useMemo(() => buildTubeAttribs(curve), [curve])
}
