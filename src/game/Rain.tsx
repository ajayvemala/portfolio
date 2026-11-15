import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './store'

export default function Rain({ lowQuality }: { lowQuality: boolean }) {
  const count = lowQuality ? 640 : 2200
  const drops = useRef<THREE.InstancedMesh>(null)
  const shader = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null)
  const transforms = useMemo(() => {
    let seed = 15237
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    const dummy = new THREE.Object3D()
    return Array.from({ length: count }, () => {
      dummy.position.set((random() - .5) * 60, random() * 22, (random() - .5) * 60)
      dummy.rotation.set(0, 0, -.18)
      dummy.scale.set(.72, 1, .72)
      dummy.updateMatrix()
      return dummy.matrix.clone()
    })
  }, [count])
  const material = useMemo(() => {
  const result = new THREE.MeshBasicMaterial({ color: '#d8efff', transparent: true, opacity: .68, depthWrite: false })
    result.onBeforeCompile = (program) => {
      program.uniforms.uRainTime = { value: 0 }
      program.vertexShader = program.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uRainTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float rainStartY = instanceMatrix[3].y;
            transformed.y += mod(rainStartY - uRainTime * 19.0, 22.0) - rainStartY;
            float rainStartX = instanceMatrix[3].x;
            transformed.x += mod(rainStartX + uRainTime * 1.15 + 30.0, 60.0) - rainStartX;
          #endif`)
      shader.current = program
    }
    result.customProgramCacheKey = () => 'three-dimensional-moving-rain-v1'
    return result
  }, [])
  useLayoutEffect(() => {
    if (!drops.current) return
    transforms.forEach((matrix, index) => drops.current!.setMatrixAt(index, matrix))
    drops.current.instanceMatrix.needsUpdate = true
  }, [transforms])
  useFrame(({ clock }) => {
    const [x, , z] = useGameStore.getState().position
    if (drops.current) drops.current.position.set(x, 0, z)
    if (shader.current) shader.current.uniforms.uRainTime.value = clock.elapsedTime
  })
  return <instancedMesh ref={drops} args={[undefined, undefined, count]} frustumCulled={false}>
    <coneGeometry args={[.024, .3, 5]} />
    <primitive object={material} attach="material" />
  </instancedMesh>
}
