import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { surfaces, waterMaterial } from './materials'

const WATER_LEVEL = .67
const GRAVITY = 9.8

function FountainFlowers() {
  const stems = useRef<THREE.InstancedMesh>(null)
  const leaves = useRef<THREE.InstancedMesh>(null)
  const petals = useRef<THREE.InstancedMesh>(null)
  const centers = useRef<THREE.InstancedMesh>(null)
  const plants = useMemo(() => Array.from({ length: 72 }, (_, i) => {
    const ring = i % 2
    const count = 36
    const angle = Math.floor(i / 2) / count * Math.PI * 2 + ring * .075
    const radius = 5.55 + ring * 2.05 + Math.sin(i * 8.13) * .16
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius,
      height: .48 + (Math.sin(i * 4.7) + 1) * .13, angle, tint: i % 4 }
  }), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const petalColors = useMemo(() => ['#f4e6c9', '#f0c7bd', '#e9d996', '#fff3df'].map((color) => new THREE.Color(color)), [])

  useLayoutEffect(() => {
    plants.forEach((plant, i) => {
      const h = plant.height
      dummy.position.set(plant.x, h / 2, plant.z)
      dummy.rotation.set(0, plant.angle, 0)
      dummy.scale.set(.72, h, .72)
      dummy.updateMatrix()
      stems.current!.setMatrixAt(i, dummy.matrix)

      for (let leaf = 0; leaf < 3; leaf++) {
        const a = plant.angle + leaf * Math.PI * 2 / 3 + .4
        dummy.position.set(plant.x + Math.cos(a) * .16, h * (.28 + leaf * .17), plant.z + Math.sin(a) * .16)
        dummy.rotation.set(-.32, -a, Math.cos(a) * .3)
        dummy.scale.set(.2, .035, .075)
        dummy.updateMatrix()
        leaves.current!.setMatrixAt(i * 3 + leaf, dummy.matrix)
      }

      const flowerY = h + .015
      for (let petal = 0; petal < 6; petal++) {
        const a = petal / 6 * Math.PI * 2 + plant.angle
        dummy.position.set(plant.x + Math.cos(a) * .105, flowerY, plant.z + Math.sin(a) * .105)
        dummy.rotation.set(0, -a, 0)
        dummy.scale.set(.13, .035, .065)
        dummy.updateMatrix()
        petals.current!.setMatrixAt(i * 6 + petal, dummy.matrix)
        petals.current!.setColorAt(i * 6 + petal, petalColors[plant.tint])
      }
      dummy.position.set(plant.x, flowerY + .025, plant.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(.075)
      dummy.updateMatrix()
      centers.current!.setMatrixAt(i, dummy.matrix)
    })
    stems.current!.instanceMatrix.needsUpdate = true
    leaves.current!.instanceMatrix.needsUpdate = true
    petals.current!.instanceMatrix.needsUpdate = true
    petals.current!.instanceColor!.needsUpdate = true
    centers.current!.instanceMatrix.needsUpdate = true
  }, [plants, dummy, petalColors])

  return <group>
    <mesh position={[0, .045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <ringGeometry args={[5.05, 9.1, 96]} />
      <meshStandardMaterial color="#806d4e" roughness={1} />
    </mesh>
    <instancedMesh ref={stems} args={[undefined, undefined, plants.length]} castShadow>
      <cylinderGeometry args={[.025, .04, 1, 6]} /><meshStandardMaterial color="#537648" roughness={.9} />
    </instancedMesh>
    <instancedMesh ref={leaves} args={[undefined, undefined, plants.length * 3]} castShadow>
      <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#668c51" roughness={.9} />
    </instancedMesh>
    <instancedMesh ref={petals} args={[undefined, undefined, plants.length * 6]} castShadow>
      <sphereGeometry args={[1, 10, 7]} /><meshStandardMaterial color="#fff1dc" roughness={.68} />
    </instancedMesh>
    <instancedMesh ref={centers} args={[undefined, undefined, plants.length]}>
      <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#d8a747" roughness={.65} />
    </instancedMesh>
  </group>
}

const VISITORS = [
  { radius: 9.25, offset: .15, pace: .105, shirt: '#527982', trousers: '#39464b', skin: '#c98f6d', hair: '#362d28' },
  { radius: 9.55, offset: 1.9, pace: .082, shirt: '#bd7352', trousers: '#4b5260', skin: '#e1b28e', hair: '#49332c' },
  { radius: 9.3, offset: 3.7, pace: .113, shirt: '#75895e', trousers: '#55483e', skin: '#9b684c', hair: '#211f1d' },
  { radius: 9.55, offset: 5.35, pace: .091, shirt: '#77698a', trousers: '#3e4947', skin: '#d5a27f', hair: '#574538' },
]

function WalkingVisitor({ visitor, index }: { visitor: typeof VISITORS[number]; index: number }) {
  const root = useRef<THREE.Group>(null)
  const legs = useRef<(THREE.Group | null)[]>([])
  const knees = useRef<(THREE.Group | null)[]>([])
  const arms = useRef<(THREE.Group | null)[]>([])
  const elbows = useRef<(THREE.Group | null)[]>([])
  const head = useRef<THREE.Group>(null)
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: visitor.skin, roughness: .88 }), [visitor.skin])
  const shirt = useMemo(() => new THREE.MeshStandardMaterial({ color: visitor.shirt, roughness: .84 }), [visitor.shirt])
  const trousers = useMemo(() => new THREE.MeshStandardMaterial({ color: visitor.trousers, roughness: .9 }), [visitor.trousers])
  const hair = useMemo(() => new THREE.MeshStandardMaterial({ color: visitor.hair, roughness: .96 }), [visitor.hair])
  const shoe = useMemo(() => new THREE.MeshStandardMaterial({ color: '#353a39', roughness: .85 }), [])
  const faceDetail = useMemo(() => new THREE.MeshStandardMaterial({ color: '#322d29', roughness: .9 }), [])
  useEffect(() => () => { skin.dispose(); shirt.dispose(); trousers.dispose(); hair.dispose(); shoe.dispose(); faceDetail.dispose() }, [skin, shirt, trousers, hair, shoe, faceDetail])
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    const angle = visitor.offset + time * visitor.pace
    const stride = time * 3.8 + index * 1.7
    if (root.current) {
      root.current.position.set(Math.cos(angle) * visitor.radius, Math.abs(Math.sin(stride)) * .035, Math.sin(angle) * visitor.radius)
      root.current.rotation.y = -angle
    }
    legs.current.forEach((leg, side) => { if (leg) leg.rotation.x = Math.sin(stride + side * Math.PI) * .38 })
    knees.current.forEach((knee, side) => { if (knee) knee.rotation.x = Math.max(0, Math.sin(stride + side * Math.PI)) * .36 })
    arms.current.forEach((arm, side) => { if (arm) arm.rotation.x = Math.sin(stride + (side ? 0 : Math.PI)) * .3 - .08 })
    elbows.current.forEach((elbow, side) => { if (elbow) elbow.rotation.x = -.14 + Math.max(0, Math.sin(stride + side * Math.PI)) * .18 })
    if (head.current) { head.current.rotation.x = Math.sin(stride * .5) * .025; head.current.rotation.z = Math.sin(stride * .7) * .018 }
  })
  return <group ref={root}>
    {/* Head, neck, and readable features that move subtly with each step. */}
    <group ref={head} position={[0, 1.73, 0]}>
      <mesh castShadow material={skin}><sphereGeometry args={[.205, 18, 14]} /></mesh>
      <mesh position={[0, .18, -.018]} scale={[.21, .075, .215]} castShadow material={hair}><sphereGeometry args={[1, 16, 10]} /></mesh>
      <mesh position={[0, -.02, .2]} scale={[.035, .045, .055]} material={skin}><sphereGeometry args={[1, 8, 6]} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * .073, .035, .184]} material={faceDetail}><sphereGeometry args={[.021, 8, 6]} /></mesh>
        <mesh position={[side * .073, .035, .203]} material={skin}><sphereGeometry args={[.009, 6, 5]} /></mesh>
        <mesh position={[side * .072, .071, .182]} material={hair}><boxGeometry args={[.046, .012, .025]} /></mesh>
        <mesh position={[side * .2, -.01, 0]} material={skin}><sphereGeometry args={[.045, 8, 6]} /></mesh>
      </group>)}
      <mesh position={[0, -.05, -.145]} scale={[.18, .18, .09]} castShadow material={hair}><sphereGeometry args={[1, 12, 9]} /></mesh>
    </group>
    <mesh position={[0, 1.55, 0]} castShadow material={skin}><cylinderGeometry args={[.075, .085, .16, 10]} /></mesh>
    {/* A shoulder-shaped shirt, waist, and articulated trousers. */}
    <mesh position={[0, 1.18, 0]} castShadow material={shirt}><cylinderGeometry args={[.16, .215, .58, 14]} /></mesh>
    <mesh position={[0, 1.43, .13]} material={shirt}><boxGeometry args={[.25, .055, .035]} /></mesh>
    <mesh position={[.12, 1.28, .176]} material={faceDetail}><boxGeometry args={[.07, .1, .012]} /></mesh>
    <mesh position={[0, .79, 0]} castShadow material={trousers}><cylinderGeometry args={[.18, .17, .2, 10]} /></mesh>
    {[-1, 1].map((side, i) => <group key={side}>
      <group ref={node => { legs.current[i] = node }} position={[side * .105, .72, 0]}>
        <mesh position={[0, -.2, 0]} castShadow material={trousers}><capsuleGeometry args={[.085, .34, 4, 9]} /></mesh>
        <group ref={node => { knees.current[i] = node }} position={[0, -.3, 0]}>
          <mesh position={[0, -.19, 0]} castShadow material={trousers}><capsuleGeometry args={[.07, .32, 4, 9]} /></mesh>
          <mesh position={[0, -.375, .045]} castShadow material={shoe}><boxGeometry args={[.14, .09, .24]} /></mesh>
        </group>
      </group>
      <group ref={node => { arms.current[i] = node }} position={[side * .235, 1.42, 0]}>
        <mesh position={[0, -.18, 0]} castShadow material={shirt}><capsuleGeometry args={[.068, .28, 4, 9]} /></mesh>
        <group ref={node => { elbows.current[i] = node }} position={[0, -.36, 0]}>
          <mesh position={[0, -.16, 0]} castShadow material={shirt}><capsuleGeometry args={[.055, .25, 4, 9]} /></mesh>
          <mesh position={[0, -.32, .015]} castShadow material={skin}><sphereGeometry args={[.065, 8, 7]} /></mesh>
        </group>
      </group>
    </group>)}
  </group>
}

function FountainVisitors() {
  return <group>
    {VISITORS.map((visitor, index) => <WalkingVisitor key={index} visitor={visitor} index={index} />)}
  </group>
}

/** Continuous streams and travelling droplets share the same ballistic paths. */
export default function Fountain({ lowQuality }: { lowQuality: boolean }) {
  const drops = useRef<THREE.InstancedMesh>(null)
  const splash = useRef<THREE.InstancedMesh>(null)
  const rings = useRef<THREE.Mesh[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const perJet = lowQuality ? 22 : 42
  const jets = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const central = i >= 8
    const angle = (i % 8) / (central ? 4 : 8) * Math.PI * 2
    const start = central ? .08 : .32, height = central ? 2 : 1.78
    const upward = central ? 8 : 5.2
    const duration = (upward + Math.sqrt(upward ** 2 + 2 * GRAVITY * (height - WATER_LEVEL))) / GRAVITY
    const reach = central ? 1.05 : 2.85
    const outward = (reach - start) / duration
    const point = (t: number) => new THREE.Vector3(
      Math.cos(angle) * (start + outward * t),
      height + upward * t - GRAVITY * t * t / 2,
      Math.sin(angle) * (start + outward * t),
    )
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, n) => point(duration * n / 40)))
    return { angle, duration, outward, upward, point, impact: point(duration),
      geometry: new THREE.TubeGeometry(curve, 48, central ? .038 : .028, 6, false) }
  }), [])
  const basinWater = useMemo(() => {
    const material = waterMaterial.clone()
    material.color.set('#4eabb4')
    material.roughness = .13
    material.normalMap = waterMaterial.normalMap!.clone()
    material.normalMap.repeat.set(3, 3)
    material.normalScale.set(.18, .18)
    return material
  }, [])
  useEffect(() => () => {
    jets.forEach(jet => jet.geometry.dispose())
    basinWater.normalMap?.dispose()
    basinWater.dispose()
  }, [jets, basinWater])
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    basinWater.normalMap!.offset.set(time * .045, -time * .03)
    let index = 0, splashIndex = 0
    jets.forEach((jet, j) => {
      for (let n = 0; n < perJet; n++) {
        const age = (time + n / perJet * jet.duration + j * .17) % jet.duration
        dummy.position.copy(jet.point(age))
        const spread = .018 + age / jet.duration * .05
        dummy.position.x += Math.sin(n * 7.1 + time * 5) * spread
        dummy.position.z += Math.cos(n * 4.7 + time * 6) * spread
        const velocity = new THREE.Vector3(Math.cos(jet.angle) * jet.outward, jet.upward - GRAVITY * age, Math.sin(jet.angle) * jet.outward)
        dummy.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, velocity.normalize())
        const size = .025 + .016 * (1 + Math.sin(n * 8.7)) / 2
        dummy.scale.set(size, size * 2.5, size)
        dummy.updateMatrix()
        drops.current!.setMatrixAt(index++, dummy.matrix)
      }
      for (let n = 0; n < 6; n++) {
        const age = (time * 1.7 + n / 6 + j * .13) % 1
        const angle = n * 2.399 + j
        dummy.position.copy(jet.impact)
        dummy.position.x += Math.cos(angle) * age * .55
        dummy.position.z += Math.sin(angle) * age * .55
        dummy.position.y = WATER_LEVEL + .04 + Math.sin(age * Math.PI) * .35
        dummy.scale.setScalar(.035 * (1 - age) + .008)
        dummy.updateMatrix()
        splash.current!.setMatrixAt(splashIndex++, dummy.matrix)
      }
      for (let n = 0; n < 2; n++) {
        const ring = rings.current[j * 2 + n]
        if (!ring) continue
        const phase = (time * .75 + n * .5 + j * .17) % 1
        ring.scale.setScalar(.15 + phase * .65)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * .42
      }
    })
    drops.current!.instanceMatrix.needsUpdate = true
    splash.current!.instanceMatrix.needsUpdate = true
  })
  return <group position={[0, 0, 1]} name="central-water-fountain">
    <FountainFlowers />
    <FountainVisitors />
    <mesh position={[0, .16, 0]} receiveShadow castShadow material={surfaces.stone}><cylinderGeometry args={[4.35, 4.55, .32, 64]} /></mesh>
    <mesh position={[0, .39, 0]} receiveShadow><cylinderGeometry args={[3.85, 3.85, .14, 64]} /><meshStandardMaterial color="#638e91" roughness={.4} /></mesh>
    <mesh position={[0, .64, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow material={surfaces.paving}><torusGeometry args={[4, .28, 12, 80]} /></mesh>
    <mesh position={[0, WATER_LEVEL, 0]} rotation={[-Math.PI / 2, 0, 0]} material={basinWater}><circleGeometry args={[3.86, 64]} /></mesh>
    <mesh position={[0, .85, 0]} castShadow receiveShadow material={surfaces.stone}><cylinderGeometry args={[.42, .75, 1.1, 32]} /></mesh>
    <mesh position={[0, 1.48, 0]} castShadow><cylinderGeometry args={[.66, .42, .22, 32]} /><meshStandardMaterial color="#e2d8c2" roughness={.4} /></mesh>
    <mesh position={[0, 1.73, 0]} castShadow><cylinderGeometry args={[.36, .52, .32, 32]} /><meshStandardMaterial color="#8a978c" metalness={.65} roughness={.28} /></mesh>
    <mesh position={[0, 1.94, 0]}><cylinderGeometry args={[.14, .19, .18, 16]} /><meshStandardMaterial color="#465958" metalness={.8} roughness={.2} /></mesh>
    {jets.map((jet, i) => <group key={i}>
      <mesh geometry={jet.geometry}><meshPhysicalMaterial color="#b7eff5" transparent opacity={.55} roughness={.08} metalness={.08} clearcoat={1} depthWrite={false} /></mesh>
      {[0, 1].map(n => <mesh key={n} ref={mesh => { if (mesh) rings.current[i * 2 + n] = mesh }} position={[jet.impact.x, WATER_LEVEL + .012 + n * .002, jet.impact.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.89, 1, 32]} /><meshBasicMaterial color="#e4ffff" transparent opacity={.35} depthWrite={false} />
      </mesh>)}
    </group>)}
    <instancedMesh ref={drops} args={[undefined, undefined, jets.length * perJet]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} /><meshPhysicalMaterial color="#d5f9ff" roughness={.08} metalness={.08} clearcoat={1} transparent opacity={.8} />
    </instancedMesh>
    <instancedMesh ref={splash} args={[undefined, undefined, jets.length * 6]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 4]} /><meshBasicMaterial color="#e0ffff" transparent opacity={.7} depthWrite={false} />
    </instancedMesh>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4.25, .5, 4.25]} position={[0, .5, 0]} /></RigidBody>
  </group>
}
