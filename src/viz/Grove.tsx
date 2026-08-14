import { useLayoutEffect, useMemo } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { LineMesh, useLineAttribs } from './LineMesh'
import { ParasiteMesh } from './ParasiteMesh'
import { makeSpine } from './spine'

function Aim() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0, 0.05, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

export type GroveState = {
  fedToday: boolean
  hasParasite: boolean
  sacred: boolean
}

type GroveProps = GroveState & {
  onToggleVote: () => void
}

const THIN = 0.034
const THICK = 0.108

export function Grove({ fedToday, hasParasite, sacred, onToggleVote }: GroveProps) {
  const curve = useMemo(() => makeSpine(1.17), [])
  const attribs = useLineAttribs(curve)

  const radius = fedToday ? THICK : THIN
  const purity = hasParasite ? 0.28 : 1
  const sacredAmt = sacred ? 1 : 0

  return (
    <>
      <color attach="background" args={['#0b0907']} />
      <OrthographicCamera makeDefault position={[1.15, 0.18, 5.4]} zoom={172} near={0.1} far={40} />
      <Aim />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.2, 3.4, 2.8]} intensity={0.55} color="#f0e6d2" />

      <group>
        <LineMesh
          attribs={attribs}
          radius={radius}
          purity={purity}
          sacred={sacredAmt}
          onToggle={onToggleVote}
        />
        <ParasiteMesh curve={curve} vigor={hasParasite ? 1 : 0} />
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.82}
          luminanceSmoothing={0.35}
          intensity={sacred ? 0.55 : 0.08}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}
