import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { downloadBackup, isFed, pickBackupFile, useGrove } from './state/useGrove'
import { Grove } from './viz/Grove'

const KEYS = ['1', '2', '3', '4', '5', '6'] as const

function formatDay(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })
}

export default function App() {
  const { ready, today, visuals, toggle, exportBackup, importBackup } = useGrove()
  const [hover, setHover] = useState<string | null>(null)

  const principals = visuals
  const parasites = visuals.flatMap((item) => item.parasites)
  const roster = [
    ...principals.map((item) => ({ id: item.id, name: item.name, parasite: false })),
    ...parasites.map((item) => ({ id: item.id, name: item.name, parasite: true })),
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
          camera.lookAt(0.4, 0.12, 0)
        }}
      >
        <Suspense fallback={null}>
          <Grove visuals={visuals} onToggle={toggle} onHover={setHover} />
        </Suspense>
      </Canvas>

      <div className="chrome">
        <header className="mast">
          <p className="wordmark">Nexus</p>
          <p className="day">{formatDay(today)}</p>
        </header>

        <ul className="roster">
          {roster.map((item) => {
            const on = isFed(visuals, item.id)
            const hot = hover === item.name
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={[on && 'on', hot && 'hot', item.parasite && 'parasite'].filter(Boolean).join(' ')}
                  onClick={() => toggle(item.id)}
                  onPointerEnter={() => setHover(item.name)}
                  onPointerLeave={() => setHover(null)}
                >
                  <span className="mark" aria-hidden />
                  <span className="name">{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
