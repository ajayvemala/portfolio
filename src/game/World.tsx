import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { ZONES } from './data'
import NaturalTrees from './NaturalTrees'
import Fountain from './Fountain'
import { useGameStore } from './store'
import { roadCurve, roadRibbon, distanceToRoad, ROAD_HALF_WIDTH } from './route'
import Architecture from './Architecture'
import { surfaces, waterMaterial } from './materials'

// All scenery is made from original procedural geometry. Repeated small details
// share geometry/materials and use instancing to keep the island inexpensive.
const C = {
  grass: '#aebc8f', grassDark: '#8fa378', sand: '#eadbc3', cream: '#f4ead7',
  stone: '#c8bda9', road: '#646d67', paint: '#e5e2cb', wood: '#957454',
  roof: '#bf7058', roofLight: '#d88d6f', glass: '#79a9aa', ink: '#31464b',
  leaf: '#6d916d', leafLight: '#94ab73', leafDark: '#4f7867', water: '#73b6b4',
}
const mats = {
  cream: surfaces.plaster,
  stone: surfaces.paving,
  wood: surfaces.wood,
  roof: surfaces.roof,
  ink: new THREE.MeshStandardMaterial({ color: C.ink, roughness: .7 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#76929c', metalness: .3, roughness: .12, clearcoat: 1, envMapIntensity: 1.2 }),
  glow: new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffca76', emissiveIntensity: .55, roughness: .55 }),
}
type V3 = [number, number, number]
type BoxItem = { p: V3; s: V3; r?: V3 }
const dummy = new THREE.Object3D()
const hillside = new THREE.SphereGeometry(1, 40, 28)
const hillPositions = hillside.getAttribute('position')
for (let i = 0; i < hillPositions.count; i++) {
  const x = hillPositions.getX(i), y = hillPositions.getY(i), z = hillPositions.getZ(i)
  const broadErosion = Math.sin(x * 4.2 + z * 2.7) * Math.sin(z * 3.6 - y * 2.5)
  const fineErosion = Math.sin(x * 10.5 + z * 8.2) * Math.cos(z * 9.1 - y * 7.4)
  const erosion = 1 + .055 * broadErosion + .018 * fineErosion
  hillPositions.setXYZ(i, x * erosion, y * erosion, z * erosion)
}
hillside.computeVertexNormals()

function Boxes({ items, color, material, shadows = true }: { items: BoxItem[]; color?: string; material?: THREE.Material; shadows?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    items.forEach(({ p, s, r }, index) => {
      dummy.position.set(...p); dummy.scale.set(...s); dummy.rotation.set(...(r || [0, 0, 0])); dummy.updateMatrix()
      ref.current!.setMatrixAt(index, dummy.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={shadows} receiveShadow material={material}>
    <boxGeometry />{!material && <meshStandardMaterial color={color} roughness={.88} />}
  </instancedMesh>
}

function Box({ p = [0, 0, 0], s, material = mats.cream, color, r }: { p?: V3; s: V3; material?: THREE.Material; color?: string; r?: V3 }) {
  return <mesh position={p} rotation={r} castShadow receiveShadow material={color ? undefined : material}>
    <boxGeometry args={s} />{color && <meshStandardMaterial color={color} roughness={.87} />}
  </mesh>
}

function Roof({ width, depth, height = 1.6, position = [0, 0, 0] }: { width: number; depth: number; height?: number; position?: V3 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, 0); shape.lineTo(0, height); shape.lineTo(width / 2, 0); shape.closePath()
    const roof = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
    roof.translate(0, 0, -depth / 2)
    return roof
  }, [width, depth, height])
  return <mesh geometry={geometry} position={position} castShadow receiveShadow material={mats.roof} />
}

function Label({ children, position = [0, 4.8, 4.6], size = .43, color = C.ink }: { children: string; position?: V3; size?: number; color?: string }) {
  return <Text font="/fonts/space-grotesk.woff" position={position} fontSize={size} letterSpacing={.08} anchorX="center" anchorY="middle" color={color}>{children}</Text>
}

function Planter({ position, width = 1.3 }: { position: V3; width?: number }) {
  return <group position={position}>
    <RoundedBox args={[width, .65, .85]} radius={.1} smoothness={2} position={[0, .33, 0]} material={mats.cream} castShadow receiveShadow />
    <mesh position={[0, .9, 0]} castShadow><icosahedronGeometry args={[width * .48, 0]} /><meshStandardMaterial color={C.leaf} roughness={1} /></mesh>
  </group>
}

function RealisticTable({ position, width, depth, height, topColor }: {
  position: V3; width: number; depth: number; height: number; topColor?: string
}) {
  const leg = .13
  const insetX = width / 2 - leg * .8
  const insetZ = depth / 2 - leg * .8
  return <group position={position}>
    <RoundedBox args={[width, .14, depth]} radius={.055} smoothness={3} position={[0, height, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={topColor || '#8c6548'} roughness={.72} />
    </RoundedBox>
    <Boxes items={[
      { p: [-insetX, height / 2, -insetZ], s: [leg, height, leg] },
      { p: [insetX, height / 2, -insetZ], s: [leg, height, leg] },
      { p: [-insetX, height / 2, insetZ], s: [leg, height, leg] },
      { p: [insetX, height / 2, insetZ], s: [leg, height, leg] },
      { p: [0, height - .19, -insetZ], s: [width - leg * 1.5, .12, .1] },
      { p: [0, height - .19, insetZ], s: [width - leg * 1.5, .12, .1] },
      { p: [-insetX, height - .19, 0], s: [.1, .12, depth - leg * 1.5] },
      { p: [insetX, height - .19, 0], s: [.1, .12, depth - leg * 1.5] },
    ]} material={mats.wood} />
  </group>
}

function Studio() {
  const fins = Array.from({ length: 8 }, (_, i) => ({ p: [-3.5 + i, 2.3, 3.55] as V3, s: [.11, 3.4, .32] as V3 }))
  return <group>
    <Box p={[0, .19, .25]} s={[11, .38, 9.2]} material={mats.stone} />
    <Box p={[0, 2.1, -.15]} s={[8.5, 3.8, 6.6]} />
    <Box p={[0, 2.25, 3.2]} s={[7.9, 3.15, .12]} material={mats.glass} />
    <Box p={[4.26, 2.25, 0]} s={[.12, 3.15, 5.8]} material={mats.glass} />
    <Box p={[0, 4.13, .4]} s={[10.4, .3, 8.4]} material={mats.wood} />
    <Box p={[0, 4.36, .4]} s={[10.6, .17, 8.6]} />
    <Boxes items={fins} material={mats.wood} />
    <Box p={[0, 4.65, 4.1]} s={[6.7, .85, .16]} />
    <Label position={[0, 4.65, 4.2]}>AJAY'S STUDIO</Label>
    <Box p={[0, .12, 5.6]} s={[5.4, .24, 2]} material={mats.stone} />
    <Planter position={[-4.7, .38, 3.8]} /><Planter position={[4.7, .38, 3.8]} />
    <RealisticTable position={[-2, 0, 1.2]} width={2.5} depth={1.2} height={1.4} />
    <Box p={[-2, 2, 1]} s={[1.1, .8, .1]} material={mats.ink} />
    <Box p={[-2, 2, 1.07]} s={[.95, .65, .02]} color="#acd6d1" />
    <Box p={[2.8, 1.25, 1]} s={[1.4, 1, 1.3]} color="#cb8b66" />
    <Box p={[2.8, 1.8, .4]} s={[1.4, 1, .3]} color="#cb8b66" />
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4.3, 2.3, 3.4]} position={[0, 2.3, 0]} /></RigidBody>
  </group>
}

function JourneyHouse() {
  const columns: BoxItem[] = [-3.8, -1.3, 1.3, 3.8].map((x) => ({ p: [x, 1.9, 3.8], s: [.28, 3.5, .28] }))
  const windows: BoxItem[] = [-2.7, 0, 2.7].flatMap((x) => [{ p: [x, 2.1, 2.81] as V3, s: [1.25, 1.9, .08] as V3 }])
  return <group>
    <Box p={[0, .2, .5]} s={[9.5, .4, 9]} material={mats.stone} />
    <Box p={[0, 2.15, -.3]} s={[8, 4, 6.2]} />
    <Boxes items={windows} material={mats.glass} />
    <Boxes items={columns} material={mats.wood} />
    <Roof width={9.2} depth={8.4} position={[0, 4.2, .5]} />
    <Box p={[0, 6.2, -1.5]} s={[2.8, 5.8, 2.8]} />
    <Box p={[0, 8.9, -1.5]} s={[3.15, .25, 3.15]} material={mats.wood} />
    <mesh position={[0, 10, -1.5]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[2.4, 2, 4]} /><meshStandardMaterial color={C.roof} roughness={.9} /></mesh>
    <mesh position={[0, 7.5, -.07]}><circleGeometry args={[.88, 32]} /><meshStandardMaterial color={C.cream} /></mesh>
    <mesh position={[0, 7.5, -.04]}><ringGeometry args={[.8, .9, 32]} /><meshStandardMaterial color={C.ink} /></mesh>
    <Box p={[0, 7.74, 0]} s={[.07, .5, .04]} material={mats.ink} />
    <Box p={[.21, 7.5, .01]} s={[.48, .07, .04]} material={mats.ink} r={[0, 0, -.2]} />
    <Box p={[0, 3.65, 4.05]} s={[6.8, .74, .15]} />
    <Label position={[0, 3.65, 4.15]} size={.4}>JOURNEY HOUSE</Label>
    <Planter position={[-4, .4, 3.4]} /><Planter position={[4, .4, 3.4]} />
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4.1, 2.3, 3.2]} position={[0, 2.3, -.3]} /></RigidBody>
  </group>
}

function TechnologyGarden() {
  const sculpture = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (sculpture.current) sculpture.current.rotation.y += dt * .18 })
  return <group>
    <mesh position={[0, .12, 0]} receiveShadow><cylinderGeometry args={[6.4, 6.5, .24, 48]} /><primitive object={surfaces.stone} attach="material" /></mesh>
    <mesh position={[0, .45, -.8]} castShadow receiveShadow><cylinderGeometry args={[1.65, 1.85, .7, 32]} /><meshStandardMaterial color={C.cream} roughness={.8} /></mesh>
    <group position={[0, 3, -.8]} ref={sculpture}>
      {[0, Math.PI / 3, Math.PI * 2 / 3].map((a) => <mesh key={a} rotation={[a, .15, 0]} castShadow><torusGeometry args={[2.2, .075, 6, 48]} /><meshStandardMaterial color="#538b86" metalness={.35} roughness={.3} /></mesh>)}
      <mesh><icosahedronGeometry args={[.48, 1]} /><meshStandardMaterial color="#d8e7cb" emissive="#5b9e96" emissiveIntensity={.4} metalness={.25} roughness={.4} /></mesh>
    </group>
    <Box p={[0, 5.65, -2.5]} s={[10, .23, 3.5]} color="#6e9a8e" />
    <Boxes items={[-4.5, 4.5].map((x) => ({ p: [x, 2.8, -3.4], s: [.22, 5.6, .22] }))} material={mats.wood} />
    {[-3.6, 0, 3.6].map((x, i) => <group key={x} position={[x, 0, 3.5]}>
      <RealisticTable position={[0, 0, 0]} width={2.4} depth={1.2} height={1.35} topColor={['#79a9a0', '#cea887', '#8b9db5'][i]} />
      <Label position={[0, 1.08, .56]} size={.23}>{['FRONTEND', 'MOBILE', 'BACKEND'][i]}</Label>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.2, .7, .6]} position={[0, .7, 0]} /></RigidBody>
    </group>)}
    <Label position={[0, 5.45, 4.4]} size={.4}>TECHNOLOGY GARDEN</Label>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.6, 2, 1.6]} position={[0, 2, -.8]} /></RigidBody>
  </group>
}

function ProjectGallery() {
  const displayColumns: BoxItem[] = [-5.9, 0, 5.9].flatMap((x) => [-2.6, 3.3].map((z) => ({ p: [x, 2.35, z] as V3, s: [.22, 4.5, .22] as V3 })))
  return <group>
    <Box p={[0, .2, .6]} s={[13.5, .4, 9.2]} material={mats.stone} />
    <Boxes items={displayColumns} material={mats.wood} />
    <Roof width={13.8} depth={8.6} height={1.3} position={[0, 4.55, .4]} />
    <Box p={[0, 4.4, 4.8]} s={[8, .9, .18]} />
    <Label position={[0, 4.4, 4.91]} size={.43}>PROJECT PAVILION</Label>
    {[-4.6, -2.3, 0, 2.3, 4.6].map((x, i) => <group key={x} position={[x, 0, .6]}>
      <Box p={[0, 1.15, 0]} s={[1.9, 1.9, 2.3]} />
      <RoundedBox args={[1.95, 1.5, .15]} radius={.09} smoothness={2} position={[0, 2.7, .7]} material={mats.ink} castShadow />
      <Box p={[0, 2.7, .79]} s={[1.65, 1.24, .02]} color={['#b3c4b3', '#cfb7af', '#aabdc8', '#cdbd99', '#b8b0c5'][i]} />
      <Box p={[-.5, 2.7, .81]} s={[.3, .88, .025]} color="#f3ebd9" />
      <Boxes items={[0, 1, 2].map((n) => ({ p: [.15, 2.98 - n * .28, .82], s: [.66, .13, .025] }))} color="#f3ebd9" shadows={false} />
      <Label position={[0, 1.4, 1.16]} size={.25}>{['HRMS', 'MATRIMONY', 'SCHOOL', 'COMMERCE', 'BUSINESS'][i]}</Label>
      <Label position={[0, .77, 1.17]} size={.38} color="#8b8d82">{`0${i + 1}`}</Label>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1, 1.9, 1.2]} position={[0, 1.9, 0]} /></RigidBody>
    </group>)}
    <Planter position={[-6.1, .4, 4]} /><Planter position={[6.1, .4, 4]} />
  </group>
}

function CloudStation() {
  const lights = useRef<THREE.Mesh>(null)
  const network = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (lights.current) (lights.current.material as THREE.MeshStandardMaterial).emissiveIntensity = .6 + Math.sin(clock.elapsedTime * 1.8) * .3
    if (network.current) network.current.rotation.y = Math.sin(clock.elapsedTime * .24) * .13
  })
  const rackPanels = [-2.7, 0, 2.7].flatMap((x) => Array.from({ length: 5 }, (_, i) => ({ p: [x, 1.1 + i * .48, 2.56] as V3, s: [1.45, .32, .035] as V3 })))
  return <group>
    <Box p={[0, .22, .3]} s={[10.5, .44, 8.6]} material={mats.stone} />
    <Box p={[0, 2.1, -2.6]} s={[9, 3.9, .4]} />
    <Boxes items={[-4.4, 4.4].map((x) => ({ p: [x, 2.4, 2.8], s: [.24, 4.4, .24] }))} material={mats.wood} />
    <Box p={[0, 4.3, .3]} s={[10.5, .25, 7.7]} color="#7b9695" />
    <Box p={[0, 4.52, .3]} s={[10.8, .17, 7.9]} />
    <Boxes items={[-2.7, 0, 2.7].map((x) => ({ p: [x, 2.1, 1.6], s: [1.8, 3.5, 1.8] }))} material={mats.ink} />
    <Boxes items={rackPanels} color="#536f75" />
    <Boxes items={rackPanels.map(({ p }) => ({ p: [p[0] + .52, p[1], 2.59], s: [.12, .1, .03] }))} color="#a7dbc2" shadows={false} />
    <mesh ref={lights} position={[0, 4.07, 3.3]}><boxGeometry args={[8.2, .045, .045]} /><meshStandardMaterial color="#c9f1de" emissive="#6ad6b7" emissiveIntensity={.8} /></mesh>
    <group position={[0, 6.2, -.8]} ref={network}>
      {[-1, 0, 1].map((x) => <mesh key={x} position={[x * 1.1, x === 0 ? .4 : 0, 0]} castShadow><icosahedronGeometry args={[1.1, 1]} /><meshStandardMaterial color="#f0f3df" roughness={.8} /></mesh>)}
      <mesh position={[0, -.28, 0]}><boxGeometry args={[3.3, .75, 1.3]} /><meshStandardMaterial color="#f0f3df" roughness={.8} /></mesh>
    </group>
    <Label position={[0, 4.9, 4.4]} size={.43}>CLOUD STATION</Label>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4.5, 2.4, 2.8]} position={[0, 2.4, 0]} /></RigidBody>
  </group>
}

function HelloHouse() {
  const windowBars: BoxItem[] = [-2.4, 2.4].flatMap((x) => [{ p: [x, 2.25, 3.07] as V3, s: [1.7, .08, .08] as V3 }, { p: [x, 2.25, 3.07] as V3, s: [.08, 1.65, .08] as V3 }])
  return <group>
    <Box p={[0, .18, .2]} s={[10, .36, 8.5]} material={mats.stone} />
    <Box p={[0, 2.1, -.1]} s={[8, 3.8, 6.3]} material={surfaces.brick} />
    <Roof width={9.5} depth={8.2} height={2} position={[0, 4, .1]} />
    <Box p={[-2.6, 5.2, -1.4]} s={[.9, 2.3, 1]} material={surfaces.brick} />
    <Box p={[0, 1.7, 3.1]} s={[1.45, 2.9, .12]} color="#668d87" />
    <mesh position={[.43, 1.65, 3.2]}><sphereGeometry args={[.085, 8, 8]} /><meshStandardMaterial color="#dcc086" metalness={.6} roughness={.4} /></mesh>
    <Boxes items={[-2.4, 2.4].map((x) => ({ p: [x, 2.25, 3.06], s: [1.7, 1.65, .05] }))} material={mats.glow} />
    <Boxes items={windowBars} material={mats.wood} />
    <Box p={[0, 3.58, 3.2]} s={[4.3, .75, .2]} />
    <Label position={[0, 3.58, 3.31]} size={.4}>HELLO HOUSE</Label>
    <Box p={[0, .15, 5]} s={[3.2, .3, 2]} material={mats.stone} />
    <group position={[3.7, 0, 4.8]}>
      <Box p={[0, .8, 0]} s={[.15, 1.6, .15]} material={mats.wood} />
      <RoundedBox args={[1.15, .85, .85]} radius={.19} smoothness={3} position={[0, 1.65, 0]} castShadow><meshStandardMaterial color="#b76c59" roughness={.75} /></RoundedBox>
      <Box p={[0, 1.76, .44]} s={[.65, .08, .02]} material={mats.ink} />
      <Label position={[0, 1.43, .44]} size={.13} color="#fff0d7">MAIL</Label>
    </group>
    <Planter position={[-3.4, .36, 3.4]} width={1.8} />
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4.1, 2.3, 3.2]} position={[0, 2.3, -.1]} /></RigidBody>
  </group>
}

function roundedShape(width: number, height: number, r: number) {
  const s = new THREE.Shape(); const x = -width / 2; const y = -height / 2
  s.moveTo(x + r, y); s.lineTo(x + width - r, y); s.quadraticCurveTo(x + width, y, x + width, y + r)
  s.lineTo(x + width, y + height - r); s.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  s.lineTo(x + r, y + height); s.quadraticCurveTo(x, y + height, x, y + height - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); s.closePath(); return s
}

function RoadNetwork() {
  const surfacesGeometry = useMemo(() => ({
    shoulder: roadRibbon(-3.6, 3.6, .015),
    road: roadRibbon(-ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, .035),
    left: roadRibbon(-2.64, -2.56, .058),
    right: roadRibbon(2.56, 2.64, .058),
  }), [])
  const dashes = useMemo(() => {
    const count = Math.floor(roadCurve.getLength() / 4)
    return Array.from({ length: count }, (_, i): BoxItem => {
      const p = roadCurve.getPointAt(i / count), t = roadCurve.getTangentAt(i / count)
      return { p: [p.x, .055, p.z], s: [.11, .015, 1.65], r: [0, Math.atan2(t.x, t.z), 0] }
    })
  }, [])
  return <group>
    <mesh geometry={surfacesGeometry.shoulder} receiveShadow material={surfaces.paving} />
    <mesh geometry={surfacesGeometry.road} receiveShadow material={surfaces.asphalt} />
    {[surfacesGeometry.left, surfacesGeometry.right].map((geometry, i) => <mesh key={i} geometry={geometry}><meshStandardMaterial color="#deded5" /></mesh>)}
    <Boxes items={dashes} color={C.paint} shadows={false} />
    <RoadDetails />
    {ZONES.map((zone) => <group key={zone.id} position={zone.position} rotation={[0, zone.yaw, 0]}>
      <Box p={[0, .025, 7]} s={[4.2, .04, 6]} material={surfaces.paving} />
      <Boxes items={[-1.6, -.8, 0, .8, 1.6].map((x) => ({ p: [x, .052, 8.9], s: [.42, .015, 1.7] }))} color="#eee6d2" shadows={false} />
    </group>)}
  </group>
}

function RoadDetails() {
  const kerbs = useMemo(() => {
    const result: BoxItem[] = []
    const count = Math.ceil(roadCurve.getLength() / .9)
    for (let i = 0; i < count; i++) {
      const point = roadCurve.getPointAt(i / count), tangent = roadCurve.getTangentAt(i / count)
      for (const side of [-1, 1]) {
        const x = point.x - tangent.z * side * 3.35, z = point.z + tangent.x * side * 3.35
        if (ZONES.some(zone => Math.hypot(x - zone.marker[0], z - zone.marker[2]) < 4.8)) continue
        if (Math.abs(x) < 11.3 && Math.abs(z + 25) < 5) continue
        result.push({ p: [x, .105, z], s: [.2, .18, .8], r: [0, Math.atan2(tangent.x, tangent.z), 0] })
      }
    }
    return result
  }, [])
  return <Boxes items={kerbs} material={surfaces.paving} />
}

function Bridge() {
  const deck = 1.4
  const rampAngle = Math.atan2(deck - .035, 6)
  const rampLength = Math.hypot(6, deck - .035)
  const rampY = (deck + .035) / 2 - .08 * Math.cos(rampAngle)
  const arch = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, deck + .35, 0), new THREE.Vector3(-3.5, deck + 2.6, 0),
    new THREE.Vector3(0, deck + 3.4, 0), new THREE.Vector3(3.5, deck + 2.6, 0),
    new THREE.Vector3(5, deck + .35, 0),
  ]), 48, .16, 8, false), [])
  return <group position={[0, 0, -25]}>
    {/* Lower the stone deck so its top cannot overlap the asphalt surface. */}
    <Box p={[0, deck - .21, 0]} s={[10, .3, 7.4]} material={mats.stone} />
    <Box p={[0, deck - .025, 0]} s={[10, .05, 6.4]} material={surfaces.asphalt} />
    {[-1, 1].map(side => <group key={side}>
      <Box p={[side * 8, rampY, 0]} s={[rampLength, .16, 7.4]} r={[0, 0, -side * rampAngle]} material={surfaces.asphalt} />
      <Box p={[side * 4.4, .55, 0]} s={[.65, 1.1, 7.4]} material={mats.stone} />
      <mesh geometry={arch} position={[0, 0, side * 3.5]} material={mats.ink} castShadow />
      <Boxes items={[-4.7, -3.5, -2, 0, 2, 3.5, 4.7].map(x => ({
        p: [x, deck + .65, side * 3.5], s: [.14, 1.3, .14],
      }))} material={mats.cream} />
      <Boxes items={[.45, 1.25].map(y => ({ p: [0, deck + y, side * 3.5], s: [10.2, .14, .14] }))} material={mats.wood} />
      <Boxes items={[-3.5, -2, 0, 2, 3.5].map(x => {
        const height = 2.05 - .055 * x * x
        return { p: [x, deck + 1.25 + height / 2, side * 3.5], s: [.055, height, .055] }
      })} material={mats.ink} />
      <Box p={[0, deck + .008, side * 2.6]} s={[10, .012, .09]} color={C.paint} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[rampLength / 2, .08, 3.7]} position={[side * 8, rampY, 0]} rotation={[0, 0, -side * rampAngle]} friction={1} />
        <CuboidCollider args={[5.1, .7, .16]} position={[0, deck + .65, side * 3.5]} />
      </RigidBody>
    </group>)}
    <Boxes items={[-2.35, 0, 2.35].map(z => ({ p: [0, .94, z], s: [10.4, .3, .28] }))} material={mats.ink} />
    <Boxes items={[-3.7, 3.7].map(x => ({ p: [x, 1.04, 0], s: [.32, .24, 6.4] }))} material={mats.ink} />
    <Boxes items={[-4, 0, 4].map(x => ({ p: [x, deck + .008, 0], s: [1.7, .012, .12] }))} color={C.paint} shadows={false} />
    <group position={[-11.5, 0, -4.5]}>
      <Box p={[0, 1, 0]} s={[.14, 2, .14]} material={mats.wood} />
      <Box p={[0, 2, 0]} s={[3.2, .65, .16]} material={mats.ink} />
      <Label position={[0, 2, .09]} size={.22} color={C.cream}>SCENIC BRIDGE</Label>
    </group>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[5, .15, 3.7]} position={[0, deck - .15, 0]} friction={1} />
    </RigidBody>
  </group>
}

function seeded(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

function Trees({ lowQuality }: { lowQuality: boolean }) {
  const activeZone = useGameStore(state => state.activeZone)
  const trees = useMemo(() => {
    const result: { p: V3; s: number; type: number }[] = []
    for (let i = 0; i < (lowQuality ? 92 : 154); i++) {
      const x = (seeded(i * 3) - .5) * 126; const z = (seeded(i * 3 + 1) - .5) * 104
      const onRoad = distanceToRoad(x, z) < 3.6 + (.8 + seeded(i + 900) * .85) * 3.7
      const nearBuilding = ZONES.some((zone) => Math.abs(x - zone.position[0]) < 9.5 && Math.abs(z - zone.position[2]) < 9.5)
      const creek = Math.abs(x) < 8 && z < -10
      const central = x * x / 14 ** 2 + z * z / 11 ** 2 < 1
      if (onRoad || nearBuilding || creek || central) continue
      result.push({ p: [x, 0, z], s: .8 + seeded(i + 900) * .85, type: i % 3 })
    }
    // Deliberately frame the entry and curve with a few composition anchors.
    result.push({ p: [-13, 0, 13], s: 1.35, type: 1 }, { p: [-30, 0, 10], s: 1.4, type: 0 }, { p: [30, 0, 36], s: 1.3, type: 0 })
    return result.filter(({ p: [x, , z], s }) => {
      const canopy = s * 3.7
      if (distanceToRoad(x, z) < 3.6 + canopy) return false
      if (ZONES.some(zone => Math.hypot(x - zone.marker[0], z - zone.marker[2]) < 5 + canopy)) return false
      const zone = ZONES.find(zone => zone.id === activeZone)
      if (!zone) return true
      const dx = x - zone.position[0], dz = z - zone.position[2]
      const lateral = dx * Math.cos(zone.yaw) - dz * Math.sin(zone.yaw)
      const forward = dx * Math.sin(zone.yaw) + dz * Math.cos(zone.yaw)
      // Clear the whole viewing corridor, including the wider mobile camera distance.
      return !(Math.abs(lateral) < 8 + canopy && forward > 5 - canopy)
    })
  }, [lowQuality, activeZone])
  return <NaturalTrees trees={trees} lowQuality={lowQuality} />
}

function Bench({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <Boxes items={[-.3, 0, .3].map((z) => ({ p: [0, .65, z], s: [2.4, .12, .23] }))} material={mats.wood} />
    <Boxes items={[-.85, .85].map((x) => ({ p: [x, .32, 0], s: [.12, .64, .8] }))} material={mats.ink} />
    <Box p={[0, 1.18, -.4]} s={[2.4, .6, .13]} material={mats.wood} />
  </group>
}

function Lamp({ position }: { position: V3 }) {
  return <group position={position}>
    <mesh position={[0, 1.9, 0]} castShadow material={mats.ink}><cylinderGeometry args={[.07, .11, 3.8, 8]} /></mesh>
    <Box p={[0, 4, 0]} s={[.5, .7, .5]} material={mats.glow} />
    <Box p={[0, 4.4, 0]} s={[.72, .11, .72]} material={mats.ink} />
    <Box p={[0, 3.64, 0]} s={[.63, .11, .63]} material={mats.ink} />
  </group>
}

function VillageFurniture() {
  const fences: BoxItem[] = []
  for (const x of [-57, 57]) {
    for (let z = -39; z < 39; z += 4) fences.push({ p: [x, .6, z], s: [.18, 1.2, .18] })
    fences.push({ p: [x, .6, -1], s: [.12, .14, 78] }, { p: [x, .95, -1], s: [.12, .14, 78] })
  }
  return <group>
    <Boxes items={fences} material={mats.wood} />
    {[[-29, 0, 29], [29, 0, 29], [-29, 0, -29], [29, 0, -29], [-40, 0, 9], [40, 0, -10]].filter(p => distanceToRoad(p[0], p[2]) > 4).map((p, i) => <Lamp key={i} position={p as V3} />)}
    <Bench position={[-8, 0, 7]} rotation={-.45} /><Bench position={[8, 0, 7]} rotation={.45} />
    <Bench position={[18, 0, -15]} rotation={Math.PI} /><Bench position={[-29, 0, -15]} rotation={Math.PI / 2} />
    <group position={[-8.5, 0, 31]}>
      <Box p={[0, 1.4, 0]} s={[.18, 2.8, .18]} material={mats.wood} />
      <Box p={[0, 2.5, 0]} s={[2.8, .65, .16]} color="#e6d3ac" />
      <Label position={[0, 2.5, .09]} size={.22}>THE SCENIC ROUTE</Label>
    </group>
  </group>
}

function creekRibbon(widthScale: number, height: number) {
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 0, -57), new THREE.Vector3(-.5, 0, -49),
    new THREE.Vector3(1.1, 0, -41), new THREE.Vector3(.7, 0, -33),
    new THREE.Vector3(-1, 0, -25), new THREE.Vector3(.2, 0, -18),
    new THREE.Vector3(0, 0, -10),
  ], false, 'centripetal')
  const count = 180, positions: number[] = [], indices: number[] = []
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const point = path.getPointAt(t), tangent = path.getTangentAt(t)
    const mouth = Math.exp(-(((t - .91) / .17) ** 2))
    const halfWidth = (2.15 + .38 * Math.sin(t * Math.PI * 5) + 1.2 * mouth) * widthScale
    for (const side of [-1, 1]) positions.push(
      point.x - tangent.z * halfWidth * side, height, point.z + tangent.x * halfWidth * side,
    )
    if (i < count) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function WaterAndGarden({ lowQuality }: { lowQuality: boolean }) {
  const water = useRef<THREE.Mesh>(null)
  const ripples = useRef<THREE.Group>(null)
  const creekRipples = useRef<THREE.Mesh[]>([])
  const creek = useMemo(() => creekRibbon(1, .075), [])
  const creekBank = useMemo(() => creekRibbon(1.32, .025), [])
  const creekSurface = useMemo(() => {
    const material = waterMaterial.clone()
    material.color.set('#81bcb7')
    material.roughness = .2
    material.normalScale.set(.24, .24)
    return material
  }, [])
  useEffect(() => () => { creek.dispose(); creekBank.dispose(); creekSurface.dispose() }, [creek, creekBank, creekSurface])
  useFrame(({ clock }) => {
    if (waterMaterial.normalMap) { waterMaterial.normalMap.offset.x = clock.elapsedTime * .006; waterMaterial.normalMap.offset.y = clock.elapsedTime * .003 }
    if (creekSurface.normalMap) { creekSurface.normalMap.offset.x = clock.elapsedTime * .018; creekSurface.normalMap.offset.y = clock.elapsedTime * .035 }
    if (water.current) water.current.position.y = -.78 + Math.sin(clock.elapsedTime * .32) * .035
    if (ripples.current) { ripples.current.position.x = Math.sin(clock.elapsedTime * .3) * .3; ripples.current.position.z = Math.cos(clock.elapsedTime * .22) * .2 }
    creekRipples.current.forEach((ring, i) => {
      if (!ring) return
      const phase = (clock.elapsedTime * .32 + i * .23) % 1
      ring.scale.setScalar(.45 + phase * 1.2)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * .14
    })
  })
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.78, 0]} ref={water}><planeGeometry args={[420, 420]} /><primitive object={waterMaterial} attach="material" /></mesh>
    <mesh geometry={creekBank} receiveShadow><meshStandardMaterial color="#c0b797" roughness={.95} /></mesh>
    <mesh geometry={creek} receiveShadow material={creekSurface} />
    {/* A shaded cascade feeds the creek at the island's upstream edge. */}
    <group position={[0, 0, -54.6]}>
      <mesh position={[0, 1.13, -.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.65, 40]} />
        <meshPhysicalMaterial color="#4b8883" roughness={.19} metalness={.1} clearcoat={1} />
      </mesh>
      <mesh position={[0, 1.12, -.48]}>
        <planeGeometry args={[4.5, 2.15, lowQuality ? 1 : 12, lowQuality ? 1 : 8]} />
        <meshPhysicalMaterial color="#a9ded8" emissive="#276664" emissiveIntensity={.12} roughness={.16} metalness={.08} transparent opacity={.77} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, .09, .18]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.9, 40]} />
        <meshBasicMaterial color="#def4e8" transparent opacity={.23} depthWrite={false} />
      </mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 2.5, .9, -.42]} rotation={[0, 0, side * -.08]} scale={[.9, 1.35, .8]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#718071" roughness={.94} />
      </mesh>)}
    </group>
    <mesh position={[0, .075, -13]} rotation={[-Math.PI / 2, 0, 0]} material={creekSurface}><circleGeometry args={[6, 64]} /></mesh>
    <group ref={ripples}>
      {Array.from({ length: lowQuality ? 14 : 28 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, .05]} position={[(seeded(i) - .5) * 160, -.69, 57 + seeded(i + 23) * 40]}><planeGeometry args={[2 + seeded(i) * 5, .065]} /><meshBasicMaterial color="#d2e3cc" transparent opacity={.3} /></mesh>)}
    </group>
    {[-46, -37, -28, -19, -13].map((z, i) => <mesh key={z} ref={node => { if (node) creekRipples.current[i] = node }} rotation={[-Math.PI / 2, 0, .1]} position={[Math.sin(i * 2) * .7, .086, z]}>
      <ringGeometry args={[.55, .59, 40]} /><meshBasicMaterial color="#e1f0df" transparent opacity={.12} depthWrite={false} />
    </mesh>)}
    <mesh position={[0, .025, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[9.8, 64]} /><meshStandardMaterial color="#c7c19d" roughness={1} /></mesh>
    <Fountain lowQuality={lowQuality} />
  </group>
}

function Perimeter({ lowQuality }: { lowQuality: boolean }) {
  const peaks = useMemo(() => Array.from({ length: lowQuality ? 12 : 20 }, (_, i) => {
    const a = Math.PI * .05 + i / (lowQuality ? 12 : 20) * Math.PI * .95
    return { p: [Math.cos(a) * 122, 0, -Math.sin(a) * 90 - 24] as V3, height: 14 + seeded(i + 402) * 23, radius: 14 + seeded(i + 55) * 15 }
  }), [lowQuality])
  const rocks = useRef<THREE.InstancedMesh>(null)
  const count = lowQuality ? 45 : 80
  useLayoutEffect(() => {
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2; const x = Math.cos(a) * (65 + seeded(i) * 2); const z = Math.sin(a) * (55 + seeded(i + 1) * 2)
      dummy.position.set(x, -.3, z); dummy.rotation.set(seeded(i) * 4, seeded(i + 1) * 6, 0); dummy.scale.set(1 + seeded(i + 4) * 1.4, .6 + seeded(i) * 1.3, 1.5); dummy.updateMatrix(); rocks.current!.setMatrixAt(i, dummy.matrix)
    }
    rocks.current!.instanceMatrix.needsUpdate = true; rocks.current!.computeBoundingSphere()
  }, [count])
  return <group>
    {peaks.map(({ p, height, radius }, i) => <group key={i} position={p}>
      <mesh geometry={hillside} position={[0, -4, 0]} scale={[radius, height * .75, radius * .85]} rotation={[0, i * .7, 0]} receiveShadow material={surfaces.grass} />
      <mesh geometry={hillside} position={[radius * .45, -6, 0]} scale={[radius * .75, height * .55, radius]} receiveShadow material={surfaces.stone} />
    </group>)}
    <instancedMesh ref={rocks} args={[undefined, undefined, count]} castShadow receiveShadow><icosahedronGeometry args={[1, 2]} /><primitive object={surfaces.stone} attach="material" /></instancedMesh>
  </group>
}

function Atmosphere({ lowQuality }: { lowQuality: boolean }) {
  const clouds = useRef<THREE.Group>(null)
  const particles = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const n = lowQuality ? 30 : 70; const result = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { result[i * 3] = (seeded(i + 207) - .5) * 70; result[i * 3 + 1] = 1 + seeded(i + 608) * 8; result[i * 3 + 2] = (seeded(i + 809) - .5) * 60 }
    return result
  }, [lowQuality])
  useFrame(({ clock }, dt) => {
    if (clouds.current) clouds.current.position.x = Math.sin(clock.elapsedTime * .014) * 18
    if (particles.current) { particles.current.rotation.y += dt * .009; particles.current.position.y = Math.sin(clock.elapsedTime * .5) * .3 }
  })
  return <group>
    <group ref={clouds}>
      {[[0, 30, -58], [-48, 28, -40], [48, 33, -62], [70, 35, 16]].map((p, i) => <group key={i} position={p as V3} scale={1.4}>
        {[-2.8, 0, 2.8].map((x, j) => <mesh key={x} position={[x, j === 1 ? 1 : 0, 0]} scale={[1.8, 1, 1.1]}><sphereGeometry args={[2.3, 16, 12]} /><meshStandardMaterial color="#f4efdd" roughness={1} transparent opacity={.85} depthWrite={false} /></mesh>)}
      </group>)}
    </group>
    <points ref={particles}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#f5e8b5" size={.075} transparent opacity={.65} sizeAttenuation depthWrite={false} /></points>
  </group>
}

const landmarks = { about: Studio, experience: JourneyHouse, skills: TechnologyGarden, projects: ProjectGallery, cloud: CloudStation, contact: HelloHouse }

export default function World({ lowQuality }: { lowQuality: boolean }) {
  const island = useMemo(() => {
    const shape = roundedShape(134, 114, 19)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: true, bevelSize: .6, bevelThickness: .6, bevelSegments: 2, steps: 1, curveSegments: 20 })
    return geo
  }, [])
  return <group>
    <mesh geometry={island} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.65, 0]} receiveShadow><primitive object={surfaces.stone} attach="material" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.015, 0]} receiveShadow><shapeGeometry args={[roundedShape(130, 110, 18), 32]} /><primitive object={surfaces.grass} attach="material" /></mesh>
    <RigidBody type="fixed" colliders={false}>
      {/* Open channel below the creek so cars can enter the water. */}
      <CuboidCollider args={[66, .5, 32.5]} position={[0, -.5, 23.5]} friction={1} />
      <CuboidCollider args={[30.5, .5, 23]} position={[-35.5, -.5, -32.5]} friction={1} />
      <CuboidCollider args={[30.5, .5, 23]} position={[35.5, -.5, -32.5]} friction={1} />
      <CuboidCollider args={[66, .5, 1]} position={[0, -.5, -56]} friction={1} />
      <CuboidCollider args={[.5, 2, 57]} position={[-65, 1, 0]} /><CuboidCollider args={[.5, 2, 57]} position={[65, 1, 0]} />
      <CuboidCollider args={[66, 2, .5]} position={[0, 1, -55]} /><CuboidCollider args={[66, 2, .5]} position={[0, 1, 55]} />
    </RigidBody>
    <RoadNetwork /><WaterAndGarden lowQuality={lowQuality} /><Bridge />
    {ZONES.map((zone) => { const Landmark = landmarks[zone.id]; return <group key={zone.id} position={zone.position} rotation={[0, zone.yaw, 0]}><Landmark /><Architecture id={zone.id} /></group> })}
    <Trees lowQuality={lowQuality} /><VillageFurniture /><Perimeter lowQuality={lowQuality} /><Atmosphere lowQuality={lowQuality} />
  </group>
}
