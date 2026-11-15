import * as THREE from 'three'

// One clean perimeter route drives the road surface, markings, map and scenery clearance.
// Broad turns keep the route easy to follow while passing every destination.
const anchors = [
  [-4, 25], [-22, 25], [-32, 25], [-39, 17], [-39, 4],
  [-36, -7], [-36, -17], [-29, -24], [-20, -25], [0, -25],
  [22, -25], [33, -25], [39, -17], [39, -5], [36, 8],
  [39, 18], [31, 25], [20, 25], [0, 25],
]
export const roadCurve = new THREE.CatmullRomCurve3(
  anchors.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal',
)
roadCurve.arcLengthDivisions = 2400
export const ROAD_HALF_WIDTH = 2.9
export const roadPoints = roadCurve.getSpacedPoints(720)
export const roadMapPath = roadPoints.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.z.toFixed(2)}`).join(' ') + ' Z'

export function distanceToRoad(x: number, z: number) {
  let distance = Infinity
  for (const p of roadPoints) distance = Math.min(distance, Math.hypot(p.x - x, p.z - z))
  return distance
}

export function roadRibbon(inner: number, outer: number, height: number) {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = []
  roadPoints.forEach((point, i) => {
    const tangent = roadCurve.getTangentAt(i / (roadPoints.length - 1))
    for (const offset of [inner, outer]) {
      positions.push(point.x - tangent.z * offset, height, point.z + tangent.x * offset)
      uvs.push(i / 12, offset)
    }
    if (i < roadPoints.length - 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
