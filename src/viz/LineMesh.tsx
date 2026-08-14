import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { lineFragment, lineVertex } from './shaders'
import { buildTubeAttribs, type TubeAttribs } from './spine'
import type { BranchKind } from './tree'
import { useSpring } from './useSpring'

type LineMeshProps = {
  attribs: TubeAttribs
  radius: number
  purity: number
  sacred: number
  kind?: BranchKind
  captura?: boolean
  onToggle?: () => void
  onHover?: (over: boolean) => void
}

const KIND = { trunk: 0, branch: 1, twig: 2, root: 3 } as const

const CLEAN = new THREE.Color('#9a8166')
const CAPTURA = new THREE.Color('#5e4c40')
const MUDDY = new THREE.Color('#3a2d24')
const SACRED = new THREE.Color('#d7b06a')
const WOOD = new THREE.Color('#4a3a2c')

export function LineMesh({
  attribs,
  radius,
  purity,
  sacred,
  kind = 'branch',
  captura = false,
  onToggle,
  onHover,
}: LineMeshProps) {
  const { camera } = useThree()
  const material = useRef<THREE.ShaderMaterial>(null)
  const radiusSpring = useSpring(36, 11, radius)
  const puritySpring = useSpring(16, 12, purity)
  const sacredSpring = useSpring(12, 12, sacred)

  const taper = {
    trunk: { join: 1.15, tip: 0.42, breath: 0.008 },
    root: { join: 1.05, tip: 0.18, breath: 0.004 },
    branch: { join: kind === 'branch' ? 1.08 : 1.05, tip: 0.14, breath: 0.012 },
    twig: { join: 0.85, tip: 0.08, breath: 0.01 },
  }[kind]

  const uniforms = useMemo(
    () => ({
      uRadius: { value: radius },
      uTime: { value: 0 },
      uIrregular: { value: 0 },
      uJoin: { value: taper.join },
      uTip: { value: taper.tip },
      uKind: { value: KIND[kind] },
      uBreath: { value: taper.breath },
      uPurity: { value: purity },
      uSacred: { value: sacred },
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
    mat.uniforms.uRadius.value = radiusSpring.step(radius, dt)
    mat.uniforms.uPurity.value = puritySpring.step(purity, dt)
    mat.uniforms.uSacred.value = sacredSpring.step(sacred, dt)
    mat.uniforms.uIrregular.value = kind === 'branch' ? 1 - purity : 0.15
    mat.uniforms.uTime.value += dt
    mat.uniforms.uJoin.value = taper.join
    mat.uniforms.uTip.value = taper.tip
    mat.uniforms.uKind.value = KIND[kind]
    mat.uniforms.uBreath.value = taper.breath
    if (kind === 'trunk' || kind === 'root') {
      mat.uniforms.uClean.value.copy(WOOD)
      mat.uniforms.uMuddy.value.set('#241910')
    } else {
      mat.uniforms.uClean.value.copy(captura ? CAPTURA : CLEAN)
      mat.uniforms.uMuddy.value.copy(MUDDY)
    }
    mat.uniforms.uCameraPos.value.copy(camera.position)
  })

  const live = kind === 'branch' || kind === 'twig'

  return (
    <mesh
      geometry={attribs.geometry}
      frustumCulled={false}
      onClick={
        live
          ? (e) => {
              e.stopPropagation()
              onToggle?.()
            }
          : undefined
      }
      onPointerOver={
        live
          ? () => {
              document.body.style.cursor = 'pointer'
              onHover?.(true)
            }
          : undefined
      }
      onPointerOut={
        live
          ? () => {
              document.body.style.cursor = 'auto'
              onHover?.(false)
            }
          : undefined
      }
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

export function useLineAttribs(curve: THREE.CatmullRomCurve3, tubular = 180, radial = 28) {
  return useMemo(() => buildTubeAttribs(curve, tubular, radial), [curve, radial, tubular])
}
