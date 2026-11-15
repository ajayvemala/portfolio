import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Tree = { p: [number, number, number]; s: number; type: number }
const random = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v) }

/** Shared geometry keeps individually modelled foliage affordable across the town. */
export default function NaturalTrees({ trees, lowQuality }: { trees: Tree[]; lowQuality: boolean }) {
  const wood = useRef<THREE.InstancedMesh>(null)
  const foliage = useRef<THREE.InstancedMesh>(null)
  const wind = useMemo(() => ({ value: 0 }), [])
  const leavesPerBranch = lowQuality ? 34 : 64
  const branches = 9
  const leafGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    // A pointed leaf with a raised central vein, rather than a flat billboard.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, -.38, .35, 0, -.28, .72, 0, 0, 1, 0,
      .28, .72, 0, .38, .35, 0, 0, .48, .12,
    ], 3))
    geometry.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6])
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const leafMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .88, metalness: 0 })
    material.onBeforeCompile = shader => {
      shader.uniforms.uTreeWind = wind
      shader.vertexShader = 'uniform float uTreeWind;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          float phase = instanceMatrix[3].x * .8 + instanceMatrix[3].z * .6;
          transformed.x += sin(uTreeWind * 1.4 + phase) * .12 * position.y;
          transformed.z += sin(uTreeWind * 2.1 + phase * 1.7) * .07 * position.y;
        #endif
      `)
    }
    material.customProgramCacheKey = () => 'natural-leaf-wind-v1'
    return material
  }, [wind])
  useFrame(({ clock }) => { wind.value = clock.elapsedTime })
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const up = new THREE.Vector3(0, 1, 0)
    const direction = new THREE.Vector3()
    let wi = 0, li = 0
    const segment = (a: THREE.Vector3, b: THREE.Vector3, radius: number, seed: number) => {
      direction.subVectors(b, a)
      dummy.position.copy(a).add(b).multiplyScalar(.5)
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize())
      dummy.scale.set(radius, direction.length(), radius)
      dummy.updateMatrix()
      wood.current!.setMatrixAt(wi, dummy.matrix)
      wood.current!.setColorAt(wi++, new THREE.Color().setHSL(.075, .22, .23 + random(seed) * .08))
    }
    trees.forEach(({ p: [x, y, z], s, type }, index) => {
      const base = index * 1000
      const root = new THREE.Vector3(x, y, z)
      const fork = new THREE.Vector3(x + .12 * s, y + 2.5 * s, z - .08 * s)
      segment(root, fork, .23 * s, base)
      for (let b = 0; b < branches; b++) {
        const seed = base + b * 89
        const angle = b * 2.39996 + random(base) * 6.28
        const radius = (b < 6 ? 1.15 + random(seed) * .55 : .45) * s
        const center = new THREE.Vector3(x + Math.cos(angle) * radius, y + (3.1 + b * .18 + random(seed + 1) * .35) * s, z + Math.sin(angle) * radius)
        const joint = fork.clone().lerp(center, .48)
        joint.y -= .22 * s
        segment(fork, joint, .105 * s, seed + 1)
        segment(joint, center, .058 * s, seed + 2)
        for (let l = 0; l < leavesPerBranch; l++) {
          const n = seed + l * 13.7
          const azimuth = random(n + 1) * Math.PI * 2
          const vertical = random(n + 2) * 2 - 1
          const spread = Math.cbrt(random(n + 3))
          const horizontal = Math.sqrt(1 - vertical * vertical)
          dummy.position.set(center.x + Math.cos(azimuth) * horizontal * spread * 1.05 * s, center.y + vertical * spread * .9 * s, center.z + Math.sin(azimuth) * horizontal * spread * 1.05 * s)
          dummy.rotation.set(random(n + 4) * Math.PI, azimuth, random(n + 5) * 6.28)
          const size = (.42 + random(n + 6) * .35) * s
          dummy.scale.set(size * (type === 0 ? .75 : 1), size, size)
          dummy.updateMatrix()
          foliage.current!.setMatrixAt(li, dummy.matrix)
          foliage.current!.setColorAt(li++, new THREE.Color().setHSL(.23 + type * .025 + random(n + 7) * .035, .3 + random(n + 8) * .2, .24 + random(n + 9) * .19))
        }
      }
    })
    for (const mesh of [wood.current!, foliage.current!]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [trees, leavesPerBranch])
  return <group>
    <instancedMesh ref={wood} args={[undefined, undefined, trees.length * (1 + branches * 2)]} castShadow receiveShadow>
      <cylinderGeometry args={[.65, 1, 1, 9, 3]} /><meshStandardMaterial roughness={1} />
    </instancedMesh>
    <instancedMesh ref={foliage} args={[leafGeometry, leafMaterial, trees.length * branches * leavesPerBranch]} castShadow={!lowQuality} receiveShadow />
  </group>
}
