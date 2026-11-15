import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useGameStore } from './store'

export default function EnvironmentLighting() {
  const { gl, scene } = useThree()
  const night = useGameStore((state) => state.lighting === 'night')
  useEffect(() => {
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, .04)
    const previous = scene.environment
    scene.environment = target.texture
    room.dispose(); generator.dispose()
    return () => { scene.environment = previous; target.dispose() }
  }, [gl, scene])
  useEffect(() => { scene.environmentIntensity = night ? .2 : .4 }, [night, scene])
  return <Sky distance={450000} sunPosition={night ? [25, -8, -30] : [-35, 65, 28]} inclination={night ? .02 : .5} azimuth={.25} turbidity={night ? 1.5 : 3.5} rayleigh={night ? .25 : 1.4} mieCoefficient={night ? .001 : .004} mieDirectionalG={.82} />
}
