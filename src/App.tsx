import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grove } from './viz/Grove'

export default function App() {
  const [fedToday, setFedToday] = useState(false)
  const [hasParasite, setHasParasite] = useState(false)
  const [sacred, setSacred] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === '1') setFedToday((v) => !v)
      if (e.key === '2') setHasParasite((v) => !v)
      if (e.key === '3') setSacred((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="stage">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.05, 0)
        }}
      >
        <Grove
          fedToday={fedToday}
          hasParasite={hasParasite}
          sacred={sacred}
          onToggleVote={() => setFedToday((v) => !v)}
        />
      </Canvas>

      <div className="chrome">
        <p className="wordmark">Nexus</p>
        <ul className="hints">
          <li className={fedToday ? 'on' : undefined}>
            <kbd>1</kbd> voto do dia
          </li>
          <li className={hasParasite ? 'on' : undefined}>
            <kbd>2</kbd> parasita
          </li>
          <li className={sacred ? 'on' : undefined}>
            <kbd>3</kbd> sagrado
          </li>
        </ul>
      </div>
    </div>
  )
}
