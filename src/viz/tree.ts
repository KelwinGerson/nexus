import * as THREE from 'three'
import type { LineVisual } from '../domain'

export type BranchKind = 'trunk' | 'root' | 'branch' | 'twig'

export type BranchRole = 'primary' | 'secondary' | 'crown'

export type BranchSpec = {
  id: string
  name: string
  kind: BranchKind
  curve: THREE.CatmullRomCurve3
  parentId?: string
  lineId?: string
  role?: BranchRole
  radiusScale: number
}

export type TreeSkeleton = {
  trunk: BranchSpec
  roots: BranchSpec[]
  branches: BranchSpec[]
  twigs: BranchSpec[]
  leaderId?: string
}

type Placement = {
  t: number
  aim: THREE.Vector3
  length: number
  droop: number
  forks: number
  twigs: number
}

const KNOWN: Record<string, Placement> = {
  silencio: {
    t: 0.27,
    aim: new THREE.Vector3(-0.96, 0.04, 0.32),
    length: 2.05,
    droop: 0.56,
    forks: 1,
    twigs: 1,
  },
  casa: {
    t: 0.34,
    aim: new THREE.Vector3(0.82, 0.38, 0.42),
    length: 0.86,
    droop: -0.1,
    forks: 1,
    twigs: 1,
  },
  noite: {
    t: 0.48,
    aim: new THREE.Vector3(0.94, 0.16, -0.26),
    length: 1.96,
    droop: 0.18,
    forks: 3,
    twigs: 2,
  },
  escrita: {
    t: 0.61,
    aim: new THREE.Vector3(-0.8, 0.5, -0.44),
    length: 1.82,
    droop: 0.02,
    forks: 3,
    twigs: 2,
  },
}

const CROWN: Placement[] = [
  {
    t: 0.76,
    aim: new THREE.Vector3(-0.58, 0.78, 0.36),
    length: 1.18,
    droop: -0.14,
    forks: 2,
    twigs: 2,
  },
  {
    t: 0.84,
    aim: new THREE.Vector3(0.64, 0.74, -0.3),
    length: 1.08,
    droop: -0.12,
    forks: 2,
    twigs: 2,
  },
  {
    t: 0.9,
    aim: new THREE.Vector3(0.12, 0.84, 0.58),
    length: 0.92,
    droop: -0.16,
    forks: 1,
    twigs: 2,
  },
  {
    t: 0.8,
    aim: new THREE.Vector3(-0.22, 0.7, -0.68),
    length: 0.98,
    droop: -0.08,
    forks: 2,
    twigs: 2,
  },
]

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function fanPlacement(index: number, total: number): Placement {
  const u = total <= 1 ? 0.5 : index / (total - 1)
  const yaw = -2.4 + u * 4.8
  return {
    t: 0.28 + u * 0.42,
    aim: new THREE.Vector3(Math.cos(yaw), 0.18 + u * 0.5, Math.sin(yaw) * 0.62),
    length: 1.15 + u * 0.4,
    droop: 0.2 - u * 0.22,
    forks: 2,
    twigs: 2,
  }
}

function trunkCurve() {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.0, -2.72, 0.0),
      new THREE.Vector3(0.04, -2.28, 0.04),
      new THREE.Vector3(0.1, -2.08, 0.08),
      new THREE.Vector3(0.16, -1.62, 0.11),
      new THREE.Vector3(-0.05, -0.96, 0.07),
      new THREE.Vector3(0.11, -0.24, -0.06),
      new THREE.Vector3(-0.07, 0.5, 0.05),
      new THREE.Vector3(0.08, 1.16, -0.04),
      new THREE.Vector3(-0.04, 1.78, 0.06),
      new THREE.Vector3(0.05, 2.18, -0.03),
      new THREE.Vector3(0.02, 2.46, 0.04),
    ],
    false,
    'catmullrom',
    0.24,
  )
}

function curveFrom(
  origin: THREE.Vector3,
  aim: THREE.Vector3,
  length: number,
  droop: number,
  seed: number,
  bury: number,
  samples = 8,
) {
  const emerge = aim.clone().normalize()
  const start = origin.clone().addScaledVector(emerge, -bury)
  const up = new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(emerge, up)
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
  side.normalize()
  const lift = new THREE.Vector3().crossVectors(side, emerge).normalize()

  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= samples; i++) {
    const u = i / samples
    const along = length * (1 - Math.pow(1 - u, 1.22))
    const arch = Math.sin(u * Math.PI) * length * 0.07
    const gravity = -droop * length * Math.pow(u, 1.8)
    const wobble = (hash(seed * 7.13 + i * 2.17) - 0.5) * 0.13 * u * length
    const sway = (hash(seed * 3.91 + i * 5.03) - 0.5) * 0.11 * Math.sin(u * Math.PI) * length
    pts.push(
      start
        .clone()
        .addScaledVector(emerge, along)
        .addScaledVector(up, gravity)
        .addScaledVector(lift, arch)
        .addScaledVector(side, wobble + sway),
    )
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.22)
}

function shoot(host: THREE.CatmullRomCurve3, place: Placement, seed: number, bury: number) {
  const t = THREE.MathUtils.clamp(place.t, 0.02, 0.98)
  const origin = host.getPointAt(t)
  const tangent = host.getTangentAt(t).normalize()
  const aim = place.aim.clone().normalize().lerp(tangent, 0.1).normalize()
  return curveFrom(origin, aim, place.length, place.droop, seed, bury + 0.02)
}

function forkFrom(
  host: THREE.CatmullRomCurve3,
  attach: number,
  yaw: number,
  pitch: number,
  length: number,
  droop: number,
  seed: number,
) {
  const t = THREE.MathUtils.clamp(attach, 0.08, 0.94)
  const origin = host.getPointAt(t)
  const tan = host.getTangentAt(t).normalize()
  const up = Math.abs(tan.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3().crossVectors(up, tan).normalize()
  const binormal = new THREE.Vector3().crossVectors(tan, normal).normalize()
  const radial = normal.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(binormal, Math.sin(yaw))
  const aim = tan
    .clone()
    .multiplyScalar(Math.cos(pitch))
    .addScaledVector(radial, Math.sin(pitch))
    .add(new THREE.Vector3(0, 0.18, 0))
    .normalize()
  return curveFrom(origin, aim, length, droop, seed, 0.028, 6)
}

function twigFrom(host: THREE.CatmullRomCurve3, attach: number, side: number, seed: number, length: number) {
  const t = THREE.MathUtils.clamp(attach, 0.12, 0.96)
  const origin = host.getPointAt(t)
  const tan = host.getTangentAt(t).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3().crossVectors(tan, up)
  if (normal.lengthSq() < 1e-6) normal.set(1, 0, 0)
  normal.normalize()
  const aim = tan
    .clone()
    .multiplyScalar(0.42)
    .addScaledVector(normal, side)
    .addScaledVector(up, 0.48 + hash(seed) * 0.2)
    .normalize()
  return curveFrom(origin, aim, length, 0.04, seed, 0.016, 4)
}

function rootCurve(index: number, total: number) {
  const yaw = -Math.PI * 0.12 + (index / total) * Math.PI * 1.9 + (index % 2) * 0.18
  const reach = 0.78 + (index % 3) * 0.2
  const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw))
  const dip = index % 2 === 0 ? 0.06 : 0.02
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(dir.x * 0.08, -1.86, dir.z * 0.08),
      new THREE.Vector3(dir.x * reach * 0.32, -2.04, dir.z * reach * 0.3),
      new THREE.Vector3(dir.x * reach * 0.68, -2.11 - dip * 0.3, dir.z * reach * 0.66),
      new THREE.Vector3(dir.x * reach * 1.08, -2.13, dir.z * reach * 1.04),
      new THREE.Vector3(dir.x * reach * 1.38, -2.22, dir.z * reach * 1.34),
    ],
    false,
    'catmullrom',
    0.3,
  )
}

function ramify(
  visual: LineVisual,
  host: THREE.CatmullRomCurve3,
  place: Placement,
  role: BranchRole,
  radiusScale: number,
  into: { branches: BranchSpec[]; twigs: BranchSpec[] },
) {
  const primary = shoot(host, place, visual.seed, role === 'crown' ? 0.05 : 0.09)
  const id = role === 'crown' ? `${visual.id}-crown-${place.t.toFixed(2)}` : visual.id
  into.branches.push({
    id,
    name: visual.name,
    kind: 'branch',
    lineId: visual.id,
    role,
    radiusScale,
    curve: primary,
  })

  for (let i = 0; i < place.forks; i++) {
    const attach = 0.36 + i * 0.2 + hash(visual.seed + i * 1.7) * 0.06
    const yaw = (i % 2 === 0 ? 1 : -1) * (0.85 + hash(visual.seed * 2.2 + i) * 0.55)
    const pitch = 0.48 + hash(visual.seed * 1.4 + i * 3.1) * 0.28
    const length = place.length * (0.4 - i * 0.055)
    const droop = place.droop * 0.65 + (visual.id === 'silencio' ? 0.22 : 0)
    const child = forkFrom(primary, attach, yaw, pitch, length, droop, visual.seed + i + 2)
    const childId = `${id}-fork-${i}`
    into.branches.push({
      id: childId,
      name: visual.name,
      kind: 'branch',
      parentId: id,
      lineId: visual.id,
      role: 'secondary',
      radiusScale: radiusScale * 0.46,
      curve: child,
    })

    for (let k = 0; k < place.twigs; k++) {
      const twigAttach = 0.46 + k * 0.22
      const side = k % 2 === 0 ? 0.72 : -0.68
      into.twigs.push({
        id: `${childId}-twig-${k}`,
        name: visual.name,
        kind: 'twig',
        parentId: childId,
        lineId: visual.id,
        radiusScale: radiusScale * 0.2,
        curve: twigFrom(child, twigAttach, side, visual.seed + i * 5 + k, length * 0.38),
      })
    }
  }

  const tipTwigs = visual.id === 'silencio' ? 1 : 2
  for (let i = 0; i < tipTwigs; i++) {
    into.twigs.push({
      id: `${id}-tip-${i}`,
      name: visual.name,
      kind: 'twig',
      parentId: id,
      lineId: visual.id,
      radiusScale: radiusScale * 0.18,
      curve: twigFrom(primary, 0.72 + i * 0.12, i % 2 === 0 ? 0.62 : -0.58, visual.seed + 9 + i, place.length * 0.22),
    })
  }
}

export function buildTree(visuals: LineVisual[]): TreeSkeleton {
  const trunkPath = trunkCurve()
  const leader =
    visuals.find((item) => item.sacred > 0.7) ??
    [...visuals].sort((a, b) => b.radius - a.radius)[0]

  const trunk: BranchSpec = {
    id: 'trunk',
    name: leader?.name ?? '',
    kind: 'trunk',
    lineId: leader?.id,
    radiusScale: 1,
    curve: trunkPath,
  }

  const roots = [0, 1, 2, 3, 4, 5].map((index) => ({
    id: `root-${index}`,
    name: '',
    kind: 'root' as const,
    radiusScale: 0.4 + (index % 3) * 0.1,
    curve: rootCurve(index, 6),
  }))

  const branches: BranchSpec[] = []
  const twigs: BranchSpec[] = []

  visuals.forEach((visual, index) => {
    if (visual.id === leader?.id) return
    const place = KNOWN[visual.id] ?? fanPlacement(index, visuals.length)
    ramify(visual, trunkPath, place, 'primary', 1, { branches, twigs })
  })

  if (leader) {
    for (const place of CROWN) {
      ramify(leader, trunkPath, place, 'crown', 0.58, { branches, twigs })
    }
    for (let i = 0; i < 2; i++) {
      const attach = 0.52 + i * 0.08
      const side = i % 2 === 0 ? 0.48 : -0.44
      twigs.push({
        id: `trunk-sprig-${i}`,
        name: leader.name,
        kind: 'twig',
        parentId: 'trunk',
        lineId: leader.id,
        radiusScale: 0.12,
        curve: twigFrom(trunkPath, attach, side, leader.seed + 20 + i, 0.22 + i * 0.03),
      })
    }
  }

  return { trunk, roots, branches, twigs, leaderId: leader?.id }
}

export function findBranch(tree: TreeSkeleton, lineId: string) {
  return (
    tree.branches.find((item) => item.lineId === lineId && item.role === 'primary') ??
    tree.branches.find((item) => item.lineId === lineId)
  )
}
