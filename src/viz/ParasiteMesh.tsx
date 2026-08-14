import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildHelixAttribs } from './helix'
import { parasiteFragment, parasiteVertex } from './shaders'
import { useSpring } from './useSpring'

type ParasiteMeshProps = {
  curve: THREE.CatmullRomCurve3
  vigor: number
}

const COLOR = new THREE.Color('#3a2a22')

export function ParasiteMesh({ curve, vigor }: ParasiteMeshProps) {
  const { camera } = useThree()
  const material = useRef<THREE.ShaderMaterial>(null)
  const vigorSpring = useSpring(16, 11)
  const geometry = useMemo(() => buildHelixAttribs(curve, 6.6, 0.09), [curve])

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
    <mesh geometry={geometry} frustumCulled={false}>
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
