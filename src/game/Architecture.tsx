import * as THREE from 'three'
import { surfaces } from './materials'
import type { ZoneId } from './data'

const frame = new THREE.MeshStandardMaterial({ color: '#343c3d', metalness: .65, roughness: .38 })
const glazing = new THREE.MeshPhysicalMaterial({ color: '#7d9da3', metalness: .25, roughness: .12, clearcoat: 1, envMapIntensity: 1.1 })
function Part({ p, s, material = frame }: { p: [number, number, number]; s: [number, number, number]; material?: THREE.Material }) {
  return <mesh position={p} material={material} castShadow receiveShadow><boxGeometry args={s} /></mesh>
}
function Window({ x, z, side = false }: { x: number; z: number; side?: boolean }) {
  return <group position={[x, 2.2, z]} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
    <Part p={[0, 0, 0]} s={[1.65, 1.85, .12]} />
    <Part p={[0, 0, .075]} s={[1.45, 1.65, .035]} material={glazing} />
    <Part p={[0, 0, .11]} s={[.045, 1.7, .035]} /><Part p={[0, .15, .11]} s={[1.5, .045, .035]} />
    <Part p={[0, -.98, .12]} s={[1.95, .13, .4]} material={surfaces.stone} />
    <Part p={[0, 1.03, .06]} s={[1.95, .13, .23]} material={surfaces.plaster} />
  </group>
}

export default function Architecture({ id }: { id: ZoneId }) {
  if (id === 'skills') return null
  const open = id === 'projects' || id === 'cloud'
  const width = id === 'projects' ? 13 : id === 'cloud' ? 9 : id === 'about' ? 8.5 : 8
  const depth = id === 'about' ? 6.6 : 6.2
  return <group>
    {!open && <>
      {[-1.8, .4, 2.3].map(z => <Window key={z} x={width / 2 + .035} z={z - .3} side />)}
      {[-2.5, 0, 2.5].map(x => <group key={x} rotation={[0, Math.PI, 0]}><Window x={x} z={depth / 2 + .32} /></group>)}
      <Part p={[0, .65, depth / 2 + .03]} s={[width + .08, .65, .14]} material={surfaces.brick} />
      <Part p={[width / 2 + .03, .65, -.3]} s={[.14, .65, depth]} material={surfaces.brick} />
      <Part p={[-width / 2 - .03, .65, -.3]} s={[.14, .65, depth]} material={surfaces.brick} />
    </>}
    {[-1, 1].map(side => <group key={side}>
      <Part p={[side * (width / 2 + .5), 4.05, .15]} s={[.16, .14, depth + 1.5]} />
      <Part p={[side * (width / 2 + .4), 2.2, -depth / 2]} s={[.11, 3.75, .11]} />
      <Part p={[side * (width / 2 + .1), .25, -depth / 2]} s={[.65, .12, .25]} />
    </group>)}
    {!open && <group position={[-1.8, 1.15, -depth / 2 - .52]}>
      <Part p={[0, 0, 0]} s={[1.4, .8, .6]} material={surfaces.plaster} />
      {Array.from({ length: 7 }, (_, i) => <Part key={i} p={[0, -.27 + i * .09, -.32]} s={[1.17, .025, .035]} />)}
    </group>}
    {[-1, 1].map(side => <group key={side} position={[side * (width / 2 - .25), 3.1, depth / 2 + .25]}>
      <Part p={[0, 0, 0]} s={[.22, .45, .16]} />
      <mesh position={[0, -.05, .1]}><boxGeometry args={[.14, .28, .035]} /><meshStandardMaterial color="#fff3d8" emissive="#ffce85" emissiveIntensity={.65} /></mesh>
    </group>)}
  </group>
}
