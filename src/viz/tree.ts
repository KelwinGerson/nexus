import * as THREE from 'three'
import type { LineVisual } from '../domain'

export type BranchKind = 'trunk' | 'root' | 'branch' | 'twig'

export type BranchSpec = {
  id: string
  name: string
  kind: BranchKind
  curve: THREE.CatmullRomCurve3
  parentId?: string
  lineId?: string
}

export type TreeSkeleton = {
  trunk: BranchSpec
  roots: BranchSpec[]
  branches: BranchSpec[]
  twigs: BranchSpec[]
}

type Placement = {
  t: number
  aim: THREE.Vector3
  length: number
  droop: number
}

const KNOWN: Record<string, Placement> = {
  silencio: {
    t: 0.32,
    aim: new THREE.Vector3(-1.05, 0.12, 0.28),
    length: 1.78,
    droop: 0.46,
  },
  casa: {
    t: 0.4,
    aim: new THREE.Vector3(0.72, 0.72, 0.38),
    length: 0.8,
    droop: 0.02,
  },
  noite: {
    t: 0.54,
    aim: new THREE.Vector3(1.05, 0.22, -0.38),
    length: 1.62,
    droop: 0.14,
  },
  escrita: {
    t: 0.66,
    aim: new THREE.Vector3(-0.88, 0.5, -0.48),
    length: 1.7,
    droop: 0.02,
  },
  corpo: {
    t: 0.96,
    aim: new THREE.Vector3(0.18, 1.0, -0.06),
    length: 1.28,
    droop: -0.1,
  },
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function fanPlacement(index: number, total: number): Placement {
  const u = total <= 1 ? 0.5 : index / (total - 1)
  const yaw = -2.5 + u * 5
  return {
    t: 0.3 + u * 0.52,
    aim: new THREE.Vector3(Math.cos(yaw), 0.2 + u * 0.55, Math.sin(yaw) * 0.55),
    length: 1.1 + u * 0.45,
    droop: 0.22 - u * 0.25,
  }
}

function trunkCurve() {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.0, -2.18, 0.0),
      new THREE.Vector3(0.07, -1.52, 0.06),
      new THREE.Vector3(-0.09, -0.78, 0.05),
      new THREE.Vector3(0.08, 0.05, -0.05),
      new THREE.Vector3(-0.06, 0.82, 0.06),
      new THREE.Vector3(0.04, 1.42, 0.02),
    ],
    false,
    'catmullrom',
    0.3,
  )
}

function continueTrunk(host: THREE.CatmullRomCurve3, length: number, lean: THREE.Vector3) {
  const tip = host.getPointAt(1)
  const tan = host.getTangentAt(1).normalize()
  const dir = tan.clone().add(lean).normalize()
  return new THREE.CatmullRomCurve3(
    [
      tip.clone().addScaledVector(tan, -0.04),
      tip.clone().addScaledVector(dir, length * 0.28),
      tip.clone().addScaledVector(dir, length * 0.62).add(new THREE.Vector3(0.05, 0.04, -0.03)),
      tip.clone().addScaledVector(dir, length).add(new THREE.Vector3(0.08, 0.02, -0.05)),
    ],
    false,
    'catmullrom',
    0.28,
  )
}

function shoot(
  host: THREE.CatmullRomCurve3,
  place: Placement,
  seed: number,
): THREE.CatmullRomCurve3 {
  const t = THREE.MathUtils.clamp(place.t, 0, 1)
  const origin = host.getPointAt(t)
  const tangent = host.getTangentAt(t).normalize()
  const dir = place.aim.clone().normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const length = place.length
  const pts: THREE.Vector3[] = []

  pts.push(origin.clone().addScaledVector(dir, 0.035).addScaledVector(tangent, 0.01))

  for (let i = 1; i <= 7; i++) {
    const u = i / 7
    const ease = 1 - Math.pow(1 - u, 1.35)
    const wobble = (hash(seed * 9.1 + i * 3.7) - 0.5) * 0.18 * u
    const side = (hash(seed * 4.4 + i) - 0.5) * 0.22 * Math.sin(u * Math.PI)
    const point = origin
      .clone()
      .addScaledVector(dir, length * ease)
      .addScaledVector(up, length * 0.55 * place.aim.y * Math.pow(u, 0.9) - place.droop * length * Math.pow(u, 1.7))
      .add(new THREE.Vector3(wobble, 0, side))
    pts.push(point)
  }

  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.28)
}

function twigShoot(host: THREE.CatmullRomCurve3, attach: number, side: number, seed: number, length: number) {
  const origin = host.getPointAt(attach)
  const tangent = host.getTangentAt(attach).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3().crossVectors(tangent, up)
  if (normal.lengthSq() < 1e-5) normal.set(1, 0, 0)
  normal.normalize()
  const dir = tangent
    .clone()
    .multiplyScalar(0.35)
    .addScaledVector(normal, side)
    .addScaledVector(up, 0.55)
    .normalize()

  return new THREE.CatmullRomCurve3(
    [
      origin.clone().addScaledVector(dir, -0.02),
      origin.clone().addScaledVector(dir, length * 0.4).add(new THREE.Vector3(0, 0.04, (seed % 1) * 0.05)),
      origin.clone().addScaledVector(dir, length).addScaledVector(up, 0.08),
    ],
    false,
    'catmullrom',
    0.32,
  )
}

function rootCurve(index: number) {
  const yaw = -2.4 + index * 2.2
  const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw))
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(dir.x * 0.02, -2.1, dir.z * 0.02),
      new THREE.Vector3(dir.x * 0.28, -2.22, dir.z * 0.26),
      new THREE.Vector3(dir.x * 0.58, -2.3, dir.z * 0.5),
      new THREE.Vector3(dir.x * 0.86, -2.18, dir.z * 0.78),
    ],
    false,
    'catmullrom',
    0.34,
  )
}

export function buildTree(visuals: LineVisual[]): TreeSkeleton {
  const trunkPath = trunkCurve()
  const trunk: BranchSpec = {
    id: 'trunk',
    name: '',
    kind: 'trunk',
    curve: trunkPath,
  }

  const roots = [0, 1, 2].map((index) => ({
    id: `root-${index}`,
    name: '',
    kind: 'root' as const,
    curve: rootCurve(index),
  }))

  const leader =
    visuals.find((item) => item.sacred > 0.7)?.id ??
    [...visuals].sort((a, b) => b.radius - a.radius)[0]?.id

  const branches: BranchSpec[] = visuals.map((visual, index) => {
    const place = KNOWN[visual.id] ?? fanPlacement(index, visuals.length)
    const curve =
      visual.id === leader
        ? continueTrunk(trunkPath, 1.22, new THREE.Vector3(0.12, 0.15, -0.04))
        : shoot(trunkPath, place, visual.seed)
    return {
      id: visual.id,
      name: visual.name,
      kind: 'branch',
      lineId: visual.id,
      curve,
    }
  })

  const twigs: BranchSpec[] = []
  for (const visual of visuals) {
    const host = branches.find((item) => item.id === visual.id)
    if (!host) continue
    const count = visual.id === leader ? 3 : visual.id === 'casa' ? 1 : visual.id === 'silencio' ? 1 : 2
    for (let i = 0; i < count; i++) {
      const attach = 0.5 + i * 0.14
      const side = i % 2 === 0 ? 0.7 : -0.65
      twigs.push({
        id: `${visual.id}-twig-${i}`,
        name: visual.name,
        kind: 'twig',
        parentId: visual.id,
        lineId: visual.id,
        curve: twigShoot(host.curve, attach, side, visual.seed + i, visual.id === leader ? 0.46 : 0.34),
      })
    }
  }

  return { trunk, roots, branches, twigs }
}

export function findBranch(tree: TreeSkeleton, lineId: string) {
  return tree.branches.find((item) => item.lineId === lineId)
}
