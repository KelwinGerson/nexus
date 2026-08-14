import { useRef } from 'react'

type Spring = {
  value: number
  velocity: number
}

export function useSpring(stiffness = 38, damping = 11, initial = 0) {
  const spring = useRef<Spring>({ value: initial, velocity: 0 })

  const step = (target: number, dt: number) => {
    const s = spring.current
    const clamped = Math.min(dt, 1 / 20)
    const accel = (target - s.value) * stiffness - s.velocity * damping
    s.velocity += accel * clamped
    s.value += s.velocity * clamped
    return s.value
  }

  const set = (value: number) => {
    spring.current.value = value
    spring.current.velocity = 0
  }

  return { step, set, ref: spring }
}
