import * as THREE from 'three'
import { sampleFrame } from './spine'

export function buildHelixAttribs(
  curve: THREE.CatmullRomCurve3,
  wraps = 4.4,
  lift = 0.1,
  tubular = 320,
  radial = 16,
) {
  const count = tubular * radial
  const centers = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const binormals = new Float32Array(count * 3)
  const ts = new Float32Array(count)
  const angles = new Float32Array(count)
  const positions = new Float32Array(count * 3)
  const indices: number[] = []

  const frame = {
    p: new THREE.Vector3(),
    n: new THREE.Vector3(),
    b: new THREE.Vector3(),
  }
  const center = new THREE.Vector3()
  const radialDir = new THREE.Vector3()
  const helixN = new THREE.Vector3()
  const helixB = new THREE.Vector3()
  const tangent = new THREE.Vector3()

  for (let i = 0; i < tubular; i++) {
    const t = i / (tubular - 1)
    sampleFrame(curve, t, frame)
    const phase = t * wraps * Math.PI * 2
    const wobble = Math.sin(t * 17.3) * 0.16 + Math.sin(t * 9.1 + 1.2) * 0.1
    radialDir.copy(frame.n).multiplyScalar(Math.cos(phase)).addScaledVector(frame.b, Math.sin(phase))
    center.copy(frame.p).addScaledVector(radialDir, lift * (1 + wobble))

    curve.getTangentAt(t, tangent)
    helixN.copy(radialDir).normalize()
    helixB.crossVectors(tangent, helixN).normalize()

    for (let j = 0; j < radial; j++) {
      const idx = i * radial + j
      const angle = (j / radial) * Math.PI * 2
      centers[idx * 3] = center.x
      centers[idx * 3 + 1] = center.y
      centers[idx * 3 + 2] = center.z
      normals[idx * 3] = helixN.x
      normals[idx * 3 + 1] = helixN.y
      normals[idx * 3 + 2] = helixN.z
      binormals[idx * 3] = helixB.x
      binormals[idx * 3 + 1] = helixB.y
      binormals[idx * 3 + 2] = helixB.z
      ts[idx] = t
      angles[idx] = angle
      positions[idx * 3] = center.x
      positions[idx * 3 + 1] = center.y
      positions[idx * 3 + 2] = center.z
    }
  }

  for (let i = 0; i < tubular - 1; i++) {
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
  geometry.setAttribute('aT', new THREE.BufferAttribute(ts, 1))
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}
