import { useLayoutEffect } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { LineVisual } from '../domain'
import { Trunk } from './Trunk'

function Aim() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0, 0.08, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

type GroveProps = {
  visuals: LineVisual[]
  onToggle: (id: string) => void
  onHover: (name: string | null) => void
}

const SPACING = 0.82

export function Grove({ visuals, onToggle, onHover }: GroveProps) {
  const bloom = visuals.some((item) => item.sacred > 0.7) ? 0.42 : 0.07
  const mid = (visuals.length - 1) / 2

  return (
    <>
      <color attach="background" args={['#0b0907']} />
      <OrthographicCamera makeDefault position={[0.35, 0.22, 8.2]} zoom={92} near={0.1} far={50} />
      <Aim />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.4, 3.6, 3.2]} intensity={0.55} color="#f0e6d2" />

      <group>
        {visuals.map((visual, index) => (
          <Trunk
            key={visual.id}
            visual={visual}
            offsetX={(index - mid) * SPACING}
            onToggle={onToggle}
            onHover={onHover}
          />
        ))}
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.82} luminanceSmoothing={0.35} intensity={bloom} mipmapBlur />
      </EffectComposer>
    </>
  )
}
