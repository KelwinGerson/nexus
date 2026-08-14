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
  fed?: boolean
  kind?: BranchKind
  captura?: boolean
  onToggle?: () => void
  onHover?: (over: boolean) => void
}

const KIND = { trunk: 0, branch: 1, twig: 2, root: 3 } as const

const CLEAN = new THREE.Color('#6a5038')
const CAPTURA = new THREE.Color('#3a2e28')
const MUDDY = new THREE.Color('#1e1610')
const SACRED = new THREE.Color('#c9a056')
const WOOD = new THREE.Color('#2a1e16')

export function LineMesh({
  attribs,
  radius,
  purity,
  sacred,
  fed = false,
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
  const fedSpring = useSpring(22, 14, fed ? 1 : 0)

  const taper = {
    trunk: { join: 1.0, tip: 0.22, breath: 0.006 },
    root: { join: 1.18, tip: 0.1, breath: 0.003 },
    branch: { join: 1.1, tip: 0.12, breath: 0.01 },
    twig: { join: 0.9, tip: 0.045, breath: 0.008 },
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
      uFed: { value: fed ? 1 : 0 },
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
    mat.uniforms.uFed.value = fedSpring.step(fed ? 1 : 0, dt)
    mat.uniforms.uIrregular.value = kind === 'branch' || kind === 'twig' ? 1 - purity : 0.18
    mat.uniforms.uTime.value += dt
    mat.uniforms.uJoin.value = taper.join
    mat.uniforms.uTip.value = taper.tip
    mat.uniforms.uKind.value = KIND[kind]
    mat.uniforms.uBreath.value = taper.breath
    if (kind === 'trunk' || kind === 'root') {
      mat.uniforms.uClean.value.copy(WOOD)
      mat.uniforms.uMuddy.value.set('#1a120c')
    } else {
      mat.uniforms.uClean.value.copy(captura ? CAPTURA : CLEAN)
      mat.uniforms.uMuddy.value.copy(MUDDY)
    }
    mat.uniforms.uCameraPos.value.copy(camera.position)
  })

  const live = Boolean(onToggle)

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
        toneMapped={false}
      />
    </mesh>
  )
}

export function useLineAttribs(curve: THREE.CatmullRomCurve3, tubular = 180, radial = 28) {
  return useMemo(() => buildTubeAttribs(curve, tubular, radial), [curve, radial, tubular])
}
