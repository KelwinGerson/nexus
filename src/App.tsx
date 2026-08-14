import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { downloadBackup, isFed, pickBackupFile, useGrove } from './state/useGrove'
import { Grove } from './viz/Grove'

const KEYS = ['1', '2', '3', '4', '5', '6'] as const

export default function App() {
  const { ready, today, visuals, toggle, exportBackup, importBackup } = useGrove()
  const [hover, setHover] = useState<string | null>(null)

  const principals = visuals
  const parasite = visuals.flatMap((item) => item.parasites)[0]
  const roster = [
    ...principals.map((item) => ({ id: item.id, name: item.name })),
    ...(parasite ? [{ id: parasite.id, name: parasite.name }] : []),
  ]

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'e' || e.key === 'E') {
        downloadBackup(exportBackup(), today)
        return
      }
      if (e.key === 'i' || e.key === 'I') {
        void pickBackupFile()
          .then((raw) => importBackup(raw))
          .catch((error) => console.error(error))
        return
      }
      const index = KEYS.indexOf(e.key as (typeof KEYS)[number])
      if (index < 0) return
      const target = roster[index]
      if (target) toggle(target.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exportBackup, importBackup, ready, roster, today, toggle])

  if (!ready) return <div className="stage" />

  return (
    <div className="stage">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ camera }) => {
          camera.lookAt(0.04, 0.02, 0)
        }}
      >
        <Grove visuals={visuals} onToggle={toggle} onHover={setHover} />
      </Canvas>

      <div className="chrome">
        <p className="wordmark">Nexus</p>
        {hover ? <p className="hover-name">{hover}</p> : null}
        <ul className="hints">
          {roster.map((item, index) => (
            <li key={item.id} className={isFed(visuals, item.id) ? 'on' : undefined}>
              <kbd>{index + 1}</kbd> {item.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
