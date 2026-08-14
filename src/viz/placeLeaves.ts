import * as THREE from 'three'
import type { LineVisual } from '../domain'
import type { TreeSkeleton } from './tree'

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

export type CanopyBatch = {
  lineId: string
  count: number
  offset: Float32Array
  out: Float32Array
  up: Float32Array
  phase: Float32Array
  scale: Float32Array
  alive: Float32Array
}

export function buildCanopy(tree: TreeSkeleton, visuals: LineVisual[]): CanopyBatch[] {
  const hosts = [...tree.branches, ...tree.twigs].filter((item) => item.kind !== 'root')
  return visuals
    .map((visual) => {
      const curves = hosts.filter((item) => item.lineId === visual.id)
      if (!curves.length || visual.leafCount < 1) {
        return {
          lineId: visual.id,
          count: 0,
          offset: new Float32Array(0),
          out: new Float32Array(0),
          up: new Float32Array(0),
          phase: new Float32Array(0),
          scale: new Float32Array(0),
          alive: new Float32Array(0),
        }
      }

      const count = visual.leafCount
      const offset = new Float32Array(count * 3)
      const out = new Float32Array(count * 3)
      const up = new Float32Array(count * 3)
      const phase = new Float32Array(count)
      const scale = new Float32Array(count)
      const alive = new Float32Array(count)
      const worldUp = new THREE.Vector3(0, 1, 0)

      for (let i = 0; i < count; i++) {
        const host = curves[i % curves.length]
        const t = 0.28 + hash(visual.seed + i * 1.73) * 0.68
        const origin = host.curve.getPointAt(t)
        const tan = host.curve.getTangentAt(t).normalize()
        const normal = new THREE.Vector3().crossVectors(tan, worldUp)
        if (normal.lengthSq() < 1e-6) normal.set(1, 0, 0)
        normal.normalize()
        const binormal = new THREE.Vector3().crossVectors(tan, normal).normalize()
        const yaw = hash(visual.seed * 3.1 + i * 5.9) * Math.PI * 2
        const radial = normal.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(binormal, Math.sin(yaw))
        const lift = 0.012 + hash(visual.seed + i * 0.4) * 0.03
        const reach = (0.03 + host.radiusScale * 0.05) * (0.7 + hash(i * 2.2) * 0.8)
        const pos = origin.clone().addScaledVector(radial, reach).addScaledVector(worldUp, lift)
        const dir = radial.clone().multiplyScalar(0.7).addScaledVector(worldUp, 0.55).normalize()
        const leafUp = worldUp.clone().addScaledVector(tan, 0.2).normalize()
        const dry = visual.id === 'silencio' ? 0.35 : 1
        offset[i * 3] = pos.x
        offset[i * 3 + 1] = pos.y
        offset[i * 3 + 2] = pos.z
        out[i * 3] = dir.x
        out[i * 3 + 1] = dir.y
        out[i * 3 + 2] = dir.z
        up[i * 3] = leafUp.x
        up[i * 3 + 1] = leafUp.y
        up[i * 3 + 2] = leafUp.z
        phase[i] = hash(visual.seed + i) * Math.PI * 2
        scale[i] = (visual.id === 'casa' ? 0.11 : 0.16) * (0.75 + hash(i * 8.1) * 0.7) * dry
        alive[i] = dry * (0.55 + visual.purity * 0.45)
      }

      return { lineId: visual.id, count, offset, out, up, phase, scale, alive }
    })
    .filter((batch) => batch.count > 0)
}
