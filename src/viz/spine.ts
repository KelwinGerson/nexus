import * as THREE from 'three'

export type TubeAttribs = {
  geometry: THREE.BufferGeometry
  tubular: number
  radial: number
}

export function makeSpine(seed = 1.0): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const sway = Math.sin(t * Math.PI)
    const x = Math.sin(t * Math.PI * 1.15 + seed) * 0.26 * sway
    const z = Math.cos(t * Math.PI * 0.95 + seed * 1.7) * 0.22 * sway
    const y = t * 3.35 - 1.62
    pts.push(new THREE.Vector3(x, y, z))
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.32)
}

export function buildTubeAttribs(
  curve: THREE.CatmullRomCurve3,
  tubular = 240,
  radial = 40,
): TubeAttribs {
  const segments = tubular - 1
  const frames = curve.computeFrenetFrames(segments, false)
  const count = tubular * radial
  const centers = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const binormals = new Float32Array(count * 3)
  const tangents = new Float32Array(count * 3)
  const ts = new Float32Array(count)
  const angles = new Float32Array(count)
  const positions = new Float32Array(count * 3)
  const indices: number[] = []

  const p = new THREE.Vector3()

  for (let i = 0; i < tubular; i++) {
    const t = i / segments
    curve.getPointAt(t, p)
    const n = frames.normals[i]
    const b = frames.binormals[i]
    const tan = frames.tangents[i]
    for (let j = 0; j < radial; j++) {
      const idx = i * radial + j
      const angle = (j / radial) * Math.PI * 2
      centers[idx * 3] = p.x
      centers[idx * 3 + 1] = p.y
      centers[idx * 3 + 2] = p.z
      normals[idx * 3] = n.x
      normals[idx * 3 + 1] = n.y
      normals[idx * 3 + 2] = n.z
      binormals[idx * 3] = b.x
      binormals[idx * 3 + 1] = b.y
      binormals[idx * 3 + 2] = b.z
      tangents[idx * 3] = tan.x
      tangents[idx * 3 + 1] = tan.y
      tangents[idx * 3 + 2] = tan.z
      ts[idx] = t
      angles[idx] = angle
      positions[idx * 3] = p.x
      positions[idx * 3 + 1] = p.y
      positions[idx * 3 + 2] = p.z
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j
      const b = i * radial + ((j + 1) % radial)
      const c = (i + 1) * radial + j
      const d = (i + 1) * radial + ((j + 1) % radial)
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aCenter', new THREE.BufferAttribute(centers, 3))
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('aBinormal', new THREE.BufferAttribute(binormals, 3))
  geometry.setAttribute('aTangent', new THREE.BufferAttribute(tangents, 3))
  geometry.setAttribute('aT', new THREE.BufferAttribute(ts, 1))
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  return { geometry, tubular, radial }
}

export function sampleFrame(
  curve: THREE.CatmullRomCurve3,
  t: number,
  target: { p: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3 },
) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1)
  curve.getPointAt(clamped, target.p)
  const tangent = curve.getTangentAt(clamped)
  const up = Math.abs(tangent.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  target.n.crossVectors(up, tangent).normalize()
  target.b.crossVectors(tangent, target.n).normalize()
}
