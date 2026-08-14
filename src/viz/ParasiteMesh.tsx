import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildHelixAttribs } from './helix'
import { parasiteFragment, parasiteVertex } from './shaders'
import { useSpring } from './useSpring'

type ParasiteMeshProps = {
  curve: THREE.CatmullRomCurve3
  vigor: number
  lift?: number
  onToggle?: () => void
  onHover?: (over: boolean) => void
}

const COLOR = new THREE.Color('#3a2a22')

export function ParasiteMesh({
  curve,
  vigor,
  lift = 0.09,
  onToggle,
  onHover,
}: ParasiteMeshProps) {
  const { camera } = useThree()
  const material = useRef<THREE.ShaderMaterial>(null)
  const vigorSpring = useSpring(16, 11)
  const geometry = useMemo(() => buildHelixAttribs(curve, 4.4, lift), [curve, lift])

  const uniforms = useMemo(
    () => ({
      uRadius: { value: 0.027 },
      uTime: { value: 0 },
      uVigor: { value: 0 },
      uColor: { value: COLOR.clone() },
      uCameraPos: { value: new THREE.Vector3() },
    }),
    [],
  )

  useFrame((_, dt) => {
    const mat = material.current
    if (!mat) return
    mat.uniforms.uVigor.value = vigorSpring.step(vigor, dt)
    mat.uniforms.uTime.value += dt
    mat.uniforms.uCameraPos.value.copy(camera.position)
  })

  return (
    <mesh
      geometry={geometry}
      frustumCulled={false}
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        onHover?.(true)
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
        onHover?.(false)
      }}
    >
      <shaderMaterial
        ref={material}
        vertexShader={parasiteVertex}
        fragmentShader={parasiteFragment}
        uniforms={uniforms}
        toneMapped
      />
    </mesh>
  )
}
