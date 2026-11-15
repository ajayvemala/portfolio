import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Bloom, EffectComposer, N8AO } from '@react-three/postprocessing'
import World from './World'
import Vehicle from './Vehicle'
import Exhibits from './Exhibits'
import EnvironmentLighting from './EnvironmentLighting'
import Rain from './Rain'
import { roadCurve } from './route'
import { surfaces } from './materials'
import { useGameStore } from './store'

function Ready() {
  useEffect(() => { useGameStore.getState().ready() }, [])
  return null
}

function Scene({ lowQuality }: { lowQuality: boolean }) {
  const phase = useGameStore((state) => state.phase)
  const active = useGameStore((state) => state.activeZone)
  const night = useGameStore((state) => state.lighting === 'night')
  const rain = useGameStore((state) => state.weather === 'rain')
  useEffect(() => {
    surfaces.asphalt.roughness = rain ? .38 : .95
    surfaces.asphalt.metalness = rain ? .16 : 0
    surfaces.asphalt.needsUpdate = true
  }, [rain])
  return <>
    <color attach="background" args={[night ? '#111b29' : rain ? '#a5b5b8' : '#c5d6df']} />
    <fog attach="fog" args={[night ? '#182536' : rain ? '#a5b5b8' : '#c5d6df', rain ? 38 : 100, rain ? 175 : 260]} />
    <EnvironmentLighting />
    <ambientLight intensity={night ? .03 : rain ? .43 : .3} color={night ? '#9cbbe0' : '#ffffff'} />
    <hemisphereLight args={night ? ['#667b9b', '#252c39', .08] : ['#dceaf4', '#6c7356', rain ? .7 : 1.15]} />
    <directionalLight position={night ? [25, 32, -30] : [-35, 65, 28]} intensity={night ? .08 : rain ? 1.15 : 2.4} color={night ? '#9ab7df' : '#fff4e4'} castShadow={!lowQuality}
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-far={180} shadow-bias={-.00025} shadow-normalBias={.08} />
    <StreetLights night={night} lowQuality={lowQuality} />
    {rain && <Rain lowQuality={lowQuality} />}
    <Suspense fallback={null}>
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} paused={(phase !== 'playing' && phase !== 'arrival') || Boolean(active)} colliders={false}>
        <World lowQuality={lowQuality} />
        <Vehicle lowQuality={lowQuality} />
        <Exhibits />
        <Ready />
      </Physics>
    </Suspense>
    {!lowQuality && <EffectComposer multisampling={0}><N8AO aoRadius={1.3} intensity={1.1} halfRes /><Bloom mipmapBlur luminanceThreshold={1.4} intensity={.22} /></EffectComposer>}
    <AdaptiveDpr pixelated />
  </>
}

function StreetLights({ night, lowQuality }: { night: boolean; lowQuality: boolean }) {
  const lamps = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const t = i / 18
    const point = roadCurve.getPointAt(t)
    const tangent = roadCurve.getTangentAt(t)
    const side = i % 2 ? 1 : -1
    return { x: point.x + tangent.z * side * 4.3, z: point.z - tangent.x * side * 4.3, yaw: Math.atan2(tangent.x, tangent.z), side }
  }), [])
  return <group>
    {lamps.map((lamp, i) => <group key={i} position={[lamp.x, 0, lamp.z]} rotation={[0, lamp.yaw, 0]}>
      <mesh position={[0, 2.25, 0]} castShadow><cylinderGeometry args={[.055, .09, 4.5, 8]} /><meshStandardMaterial color="#48554e" roughness={.72} /></mesh>
      <mesh position={[-lamp.side * .42, 4.38, 0]} rotation={[0, 0, lamp.side * .12]}><boxGeometry args={[.9, .075, .11]} /><meshStandardMaterial color="#48554e" /></mesh>
      <mesh position={[-lamp.side * .78, 4.32, 0]}><boxGeometry args={[.38, .1, .28]} /><meshStandardMaterial color={night ? '#ffe1a2' : '#777c70'} emissive={night ? '#ffb54a' : '#000000'} emissiveIntensity={night ? 2.8 : 0} /></mesh>
      {night && i % (lowQuality ? 4 : 2) === 0 && <pointLight position={[-lamp.side * .78, 4.15, 0]} color="#ffd18b" intensity={34} distance={15} decay={2} />}
    </group>)}
  </group>
}

export default function GameCanvas({ lowQuality, onDecline }: { lowQuality: boolean; onDecline: () => void }) {
  return <Canvas shadows={!lowQuality} dpr={lowQuality ? [1, 1.25] : [1, 1.75]} camera={{ position: [45, 43, 61], fov: 45, near: .1, far: 300 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
    <PerformanceMonitor onDecline={onDecline} flipflops={2} onFallback={onDecline}><Scene lowQuality={lowQuality} /></PerformanceMonitor>
  </Canvas>
}
