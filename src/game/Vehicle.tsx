import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import { RoundedBox } from '@react-three/drei'
import type { RapierRigidBody } from '@react-three/rapier'
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { controls, clearControls, useGameStore } from './store'
import { ZONES } from './data'
import { audioSystem } from './audio'

const SPAWN = new THREE.Vector3(-4, 1, 25)
const SPAWN_ROTATION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
const WHEEL_POINTS = [[-.88, .1, -.96], [.88, .1, -.96], [-.88, .1, .96], [.88, .1, .96]] as const
const WHEEL_RADIUS = .4
const REST_LENGTH = .35
const creekCenterline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.2, 0, -57), new THREE.Vector3(-.5, 0, -49),
  new THREE.Vector3(1.1, 0, -41), new THREE.Vector3(.7, 0, -33),
  new THREE.Vector3(-1, 0, -25), new THREE.Vector3(.2, 0, -18), new THREE.Vector3(0, 0, -10),
], false, 'centripetal').getPoints(96)
const KEY_MAP: Record<string, keyof typeof controls> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'reverse', ArrowDown: 'reverse',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'brake', ShiftLeft: 'boost', ShiftRight: 'boost',
}

function Part({ position, size, color, rotation = [0, 0, 0], emissive }: {
  position: [number, number, number]; size: [number, number, number]; color: string
  rotation?: [number, number, number]; emissive?: string
}) {
  const radius = Math.min(.075, size[0] / 3, size[1] / 3, size[2] / 3)
  return <RoundedBox position={position} rotation={rotation} args={size} radius={radius} smoothness={3} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={color === '#c83e37' ? .34 : .72} metalness={color === '#c83e37' ? .38 : .04} emissive={emissive} emissiveIntensity={emissive ? .7 : 0} />
  </RoundedBox>
}

/** Low sports coupe. Every wheel is driven by a Rapier raycast. */
export default function Vehicle({ lowQuality = false }: { lowQuality?: boolean }) {
  const night = useGameStore((state) => state.lighting === 'night')
  const coupeGeometry = useMemo(() => {
    const stations = [
      [-1.7, .48, .32, .12], [-1.48, .68, .36, .17], [-1.08, .82, .4, .2],
      [-.62, .77, .42, .2], [0, .7, .4, .18], [.72, .76, .4, .18],
      [1.18, .82, .37, .17], [1.56, .62, .32, .12],
    ].map(([z, width, center, height]) => new THREE.Vector3(z, width, height))
    const centers = [.32, .36, .4, .42, .4, .4, .37, .32]
    const profile = new THREE.CatmullRomCurve3(stations, false, 'centripetal')
    const longitudinal = 48, radial = 20
    const vertices: number[] = [], indices: number[] = []
    for (let i = 0; i <= longitudinal; i++) {
      const [z, width, height] = profile.getPoint(i / longitudinal).toArray()
      const stationIndex = Math.min(Math.floor(i / longitudinal * (stations.length - 1)), stations.length - 2)
      const mix = i / longitudinal * (stations.length - 1) - stationIndex
      const center = THREE.MathUtils.lerp(centers[stationIndex], centers[stationIndex + 1], mix)
      for (let j = 0; j <= radial; j++) {
        const angle = j / radial * Math.PI * 2
        vertices.push(Math.sin(angle) * width, center + Math.cos(angle) * height, z)
      }
    }
    for (let i = 0; i < longitudinal; i++) for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const body = useRef<RapierRigidBody>(null)
  const controller = useRef<DynamicRayCastVehicleController | null>(null)
  const bodyArt = useRef<THREE.Group>(null)
  const headlightTarget = useMemo(() => new THREE.Object3D(), [])
  const wheelSteering = useRef<(THREE.Group | null)[]>([])
  const wheelSpin = useRef<(THREE.Group | null)[]>([])
  const dustMesh = useRef<THREE.InstancedMesh>(null)
  const { world, rapier } = useRapier()
  const { camera, gl } = useThree()
  const resetNonce = useGameStore((state) => state.resetNonce)
  const motion = useRef({ steering: 0, throttle: 0, speed: 0, lastSpeed: 0, telemetry: 0, dustTimer: 0, dustCursor: 0, lastCollision: 0 })
  const orbit = useRef({ dragging: false, pointer: -1, x: 0, y: 0, yaw: .48, elevation: .56, distance: 18.5, touched: 0 })
  const cameraLook = useRef(new THREE.Vector3(-4, 0, 12))
  const temp = useMemo(() => ({
    position: new THREE.Vector3(), rotation: new THREE.Quaternion(), forward: new THREE.Vector3(),
    target: new THREE.Vector3(), desired: new THREE.Vector3(), offset: new THREE.Vector3(), rayDirection: new THREE.Vector3(),
    dummy: new THREE.Object3D(), dustPosition: new THREE.Vector3(),
  }), [])
  const dust = useMemo(() => Array.from({ length: 24 }, () => ({
    life: 0, position: new THREE.Vector3(), velocity: new THREE.Vector3(), scale: .15,
  })), [])
  const brakeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9d3325', emissive: '#f14527', emissiveIntensity: .28, roughness: .45 }), [])

  useEffect(() => {
    const chassis = body.current
    if (!chassis) return
    const vehicle = world.createVehicleController(chassis)
    vehicle.indexUpAxis = 1
    // Rapier's forward-axis setter is named setIndexForwardAxis in its JS API.
    vehicle.setIndexForwardAxis = 2
    WHEEL_POINTS.forEach(([x, y, z], i) => {
      vehicle.addWheel({ x, y, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST_LENGTH, WHEEL_RADIUS)
      vehicle.setWheelSuspensionStiffness(i, 28)
      vehicle.setWheelSuspensionCompression(i, 4.4)
      vehicle.setWheelSuspensionRelaxation(i, 4.8)
      vehicle.setWheelMaxSuspensionTravel(i, .24)
      vehicle.setWheelMaxSuspensionForce(i, 5000)
      vehicle.setWheelFrictionSlip(i, 4)
      vehicle.setWheelSideFrictionStiffness(i, 1.5)
    })
    controller.current = vehicle
    return () => {
      controller.current = null
      world.removeVehicleController(vehicle)
    }
  }, [world])

  useEffect(() => {
    if (!body.current) return
    clearControls()
    body.current.setTranslation({ x: SPAWN.x, y: resetNonce === 0 ? 18 : SPAWN.y, z: SPAWN.z }, true)
    body.current.setRotation(SPAWN_ROTATION, true)
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    motion.current.steering = 0
    motion.current.throttle = 0
    motion.current.speed = 0
    dust.forEach((particle) => { particle.life = 0 })
    useGameStore.getState().setNearby(null)
    useGameStore.getState().telemetry([-4, 1, 25], 0, Math.PI / 2)
  }, [resetNonce, dust])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const state = useGameStore.getState()
      if (state.phase !== 'playing' || state.activeZone) return
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (KEY_MAP[event.code]) {
        event.preventDefault()
        controls[KEY_MAP[event.code]] = true
      } else if (event.code === 'KeyR' && !event.repeat) {
        event.preventDefault()
        state.restart()
      }
    }
    const keyUp = (event: KeyboardEvent) => { if (KEY_MAP[event.code]) controls[KEY_MAP[event.code]] = false }
    const canvas = gl.domElement
    const down = (event: PointerEvent) => {
      const state = useGameStore.getState()
      if (event.button !== 0 || state.phase !== 'playing' || state.activeZone) return
      orbit.current.dragging = true
      orbit.current.pointer = event.pointerId
      orbit.current.x = event.clientX
      orbit.current.y = event.clientY
    }
    const move = (event: PointerEvent) => {
      const control = orbit.current
      if (!control.dragging || event.pointerId !== control.pointer) return
      control.yaw -= (event.clientX - control.x) * .006
      control.elevation = THREE.MathUtils.clamp(control.elevation + (event.clientY - control.y) * .004, .23, 1.13)
      control.x = event.clientX
      control.y = event.clientY
      control.touched = performance.now()
    }
    const up = () => { orbit.current.dragging = false }
    const wheel = (event: WheelEvent) => {
      const state = useGameStore.getState()
      if (state.phase !== 'playing' || state.activeZone) return
      event.preventDefault()
      orbit.current.distance = THREE.MathUtils.clamp(orbit.current.distance + event.deltaY * .012, 9, 31)
    }
    const blur = () => { clearControls(); up() }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      clearControls()
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useEffect(() => () => { brakeMaterial.dispose() }, [brakeMaterial])

  useBeforePhysicsStep((physicsWorld) => {
    const vehicle = controller.current
    const chassis = body.current
    if (!vehicle || !chassis) return
    const state = useGameStore.getState()
    const dt = Math.min(physicsWorld.timestep, 1 / 30)
    const data = motion.current
    const position = chassis.translation()
    let creekDistanceSq = Infinity
    if (position.z < -9 && position.z > -57.5) {
      for (let i = 0; i < creekCenterline.length; i += 2) {
        const dx = position.x - creekCenterline[i].x, dz = position.z - creekCenterline[i].z
        creekDistanceSq = Math.min(creekDistanceSq, dx * dx + dz * dz)
      }
    }
    const onBridge = Math.abs(position.z + 25) < 4 && Math.abs(position.x) < 5.5 && position.y > .8
    const inCreek = !onBridge && creekDistanceSq < 4.7 * 4.7
    const driving = state.phase === 'playing' && !state.activeZone
    temp.rotation.copy(chassis.rotation())
    temp.forward.set(0, 0, -1).applyQuaternion(temp.rotation)
    const velocity = chassis.linvel()
    const signedSpeed = velocity.x * temp.forward.x + velocity.z * temp.forward.z
    const throttle = driving ? Number(controls.forward) - Number(controls.reverse) : 0
    data.throttle = THREE.MathUtils.damp(data.throttle, throttle, 6, dt)
    const steer = driving ? Number(controls.left) - Number(controls.right) : 0
    const maxSteer = THREE.MathUtils.lerp(.52, .29, Math.min(Math.abs(signedSpeed) / 18, 1))
    data.steering = THREE.MathUtils.damp(data.steering, steer * maxSteer, 7, dt)
    const braking = !driving || controls.brake
    const directionChange = throttle !== 0 && signedSpeed * throttle < -.7
    const topSpeed = throttle < 0 ? 6 : controls.boost ? 19 : 12.5
    const force = braking || directionChange || Math.abs(signedSpeed) > topSpeed ? 0 : -data.throttle * (controls.boost ? 480 : 310)
    for (let i = 0; i < 4; i++) {
      vehicle.setWheelEngineForce(i, inCreek ? 0 : force)
      vehicle.setWheelSteering(i, !inCreek && i < 2 ? data.steering : 0)
      vehicle.setWheelBrake(i, inCreek ? 0 : braking ? 14 : directionChange ? 9 : throttle === 0 ? .35 : 0)
      vehicle.setWheelSuspensionStiffness(i, inCreek ? 0 : 28)
      vehicle.setWheelSideFrictionStiffness(i, controls.brake && driving && i > 1 ? .6 : 1.5)
    }
    vehicle.updateVehicle(dt, rapier.QueryFilterFlags.EXCLUDE_SENSORS)
    if (inCreek) {
      // Allow the player to paddle the submerged coupe back toward either creek bank.
      const current = chassis.linvel()
      const recoveryInput = driving && (controls.forward || controls.reverse)
      const wetThrottle = recoveryInput ? Number(controls.forward) - Number(controls.reverse) : 0
      const depthDrag = controls.brake ? .72 : position.y < -.2 ? .9 : .97
      const push = wetThrottle * (controls.boost ? 9 : 6) * dt
      const verticalSpeed = recoveryInput
        ? position.y < .3 ? Math.max(current.y, 1.05) : Math.min(current.y, 0)
        : Math.max(current.y, -.95)
      chassis.setLinvel({
        x: current.x * depthDrag + temp.forward.x * push,
        y: verticalSpeed,
        z: current.z * depthDrag + temp.forward.z * push,
      }, true)
      if (driving && (controls.left || controls.right)) {
        chassis.applyTorqueImpulse({ x: 0, y: (Number(controls.left) - Number(controls.right)) * dt * 1.8, z: 0 }, true)
      }
      chassis.setGravityScale(recoveryInput ? position.y < .3 ? -.08 : 0 : position.y < -.2 ? .28 : .68, true)
    } else {
      chassis.setGravityScale(1, false)
    }
    if (state.phase === 'arrival' && [0, 1, 2, 3].some((i) => vehicle.wheelIsInContact(i))) {
      state.start()
    }
    if (!driving && !inCreek) {
      // A reading panel and pause menu must never leave the vehicle rolling away.
      const current = chassis.linvel()
      chassis.setLinvel({ x: 0, y: current.y, z: 0 }, false)
      chassis.setAngvel({ x: 0, y: 0, z: 0 }, false)
    }
    data.speed = signedSpeed
    const p = chassis.translation()
    if (p.y < -12 || Math.abs(p.x) > 105 || Math.abs(p.z) > 105) {
      chassis.setTranslation(SPAWN, true)
      chassis.setRotation(SPAWN_ROTATION, true)
      chassis.setLinvel({ x: 0, y: 0, z: 0 }, true)
      chassis.setAngvel({ x: 0, y: 0, z: 0 }, true)
      clearControls()
    }
  })

  useFrame((_, rawDelta) => {
    const chassis = body.current
    const vehicle = controller.current
    if (!chassis || !vehicle) return
    const dt = Math.min(rawDelta, .05)
    const state = useGameStore.getState()
    const data = motion.current
    temp.position.copy(chassis.translation())
    temp.rotation.copy(chassis.rotation())
    temp.forward.set(0, 0, -1).applyQuaternion(temp.rotation)
    const heading = Math.atan2(-temp.forward.x, -temp.forward.z)
    const speed = Math.abs(data.speed)
    const driving = state.phase === 'playing' && !state.activeZone
    for (let i = 0; i < 4; i++) {
      const wheel = wheelSteering.current[i]
      const spin = wheelSpin.current[i]
      if (wheel) {
        wheel.position.y = .1 - (vehicle.wheelSuspensionLength(i) ?? REST_LENGTH)
        wheel.rotation.y = vehicle.wheelSteering(i) ?? 0
      }
      if (spin) spin.rotation.x = -(vehicle.wheelRotation(i) ?? 0)
    }
    if (bodyArt.current) {
      const pitch = driving ? data.throttle * .035 - (controls.brake ? .065 * Math.sign(data.speed) : 0) : 0
      bodyArt.current.rotation.x = THREE.MathUtils.damp(bodyArt.current.rotation.x, pitch, 5, dt)
      bodyArt.current.rotation.z = THREE.MathUtils.damp(bodyArt.current.rotation.z, -data.steering * data.speed * .022, 6, dt)
    }
    brakeMaterial.emissiveIntensity = driving && controls.brake ? 3 : .3
    audioSystem.update(driving ? speed : 0, driving ? Math.abs(data.throttle) : 0, driving && controls.brake)
    data.telemetry += dt
    if (data.telemetry >= .1) {
      data.telemetry = 0
      state.telemetry([temp.position.x, temp.position.y, temp.position.z], Math.round(speed * 3.6), heading)
      const nearby = ZONES.reduce<{ distance: number; id: typeof state.nearbyZone }>((nearest, zone) => {
        const distance = Math.hypot(temp.position.x - zone.marker[0], temp.position.z - zone.marker[2])
        return distance < nearest.distance ? { distance, id: zone.id } : nearest
      }, { distance: 6.5, id: null })
      if (nearby.id !== state.nearbyZone) state.setNearby(nearby.id)
    }

    // Tiny pooled dust meshes avoid creating geometry or React state while driving.
    data.dustTimer += dt
    if (driving && speed > 3 && data.dustTimer > .04 && vehicle.wheelIsInContact(2)) {
      data.dustTimer = 0
      const particle = dust[data.dustCursor++ % dust.length]
      temp.dustPosition.set(data.dustCursor % 2 ? -.88 : .88, -.38, 1.15).applyQuaternion(temp.rotation).add(temp.position)
      particle.position.copy(temp.dustPosition)
      particle.velocity.set((Math.random() - .5) * 1.2, .6 + Math.random() * .45, (Math.random() - .5) * 1.2)
      particle.life = 1
      particle.scale = .16 + Math.random() * .13
    }
    dust.forEach((particle, i) => {
      particle.life = Math.max(0, particle.life - dt * 1.45)
      particle.position.addScaledVector(particle.velocity, dt)
      temp.dummy.position.copy(particle.position)
      temp.dummy.scale.setScalar(particle.life > 0 ? particle.scale * (2 - particle.life) * Math.min(particle.life * 5, 1) : 0)
      temp.dummy.updateMatrix()
      dustMesh.current?.setMatrixAt(i, temp.dummy.matrix)
    })
    if (dustMesh.current) dustMesh.current.instanceMatrix.needsUpdate = true

    const active = ZONES.find((zone) => zone.id === state.activeZone)
    if (active) {
      temp.offset.set(Math.sin(active.yaw), 0, Math.cos(active.yaw))
      temp.target.set(...active.position).addScaledVector(temp.offset, 7)
      temp.target.y = 4
      const perspective = camera as THREE.PerspectiveCamera
      const boardDistance = Math.max(12, 5.9 / Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2)) / perspective.aspect)
      temp.desired.copy(temp.target).addScaledVector(temp.offset, boardDistance)
      temp.desired.y += .8
    } else if (state.phase === 'loading') {
      temp.target.set(-5, 0, 1)
      temp.desired.set(45, 43, 61)
    } else {
      const control = orbit.current
      if (state.camera === 'follow' && !control.dragging && performance.now() - control.touched > 2200) {
        control.yaw = THREE.MathUtils.damp(control.yaw, .48, .8, dt)
        control.elevation = THREE.MathUtils.damp(control.elevation, .56, .8, dt)
      }
      const yaw = heading + control.yaw
      const horizontal = control.distance * Math.cos(control.elevation)
      temp.offset.set(Math.sin(yaw) * horizontal, Math.sin(control.elevation) * control.distance, Math.cos(yaw) * horizontal)
      temp.target.copy(temp.position).addScaledVector(temp.forward, Math.min(speed * .16 + 1, 3))
      temp.target.y += .7
      temp.desired.copy(temp.position).add(temp.offset)
      temp.rayDirection.copy(temp.desired).sub(temp.target)
      const distance = temp.rayDirection.length()
      temp.rayDirection.normalize()
      const hit = world.castRay(new rapier.Ray(temp.target, temp.rayDirection), distance, true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, chassis)
      if (hit && hit.timeOfImpact < distance) {
        temp.desired.copy(temp.target).addScaledVector(temp.rayDirection, Math.max(.85, hit.timeOfImpact - .65))
      }
    }
    const cameraDelta = Math.min(rawDelta, .25)
    camera.position.lerp(temp.desired, 1 - Math.exp(-cameraDelta * (active ? 3.5 : 4)))
    cameraLook.current.lerp(temp.target, 1 - Math.exp(-cameraDelta * 5))
    camera.lookAt(cameraLook.current)
  })

  return <>
    <RigidBody ref={body} name="sports-coupe" position={[-4, 1, 25]} rotation={[0, Math.PI / 2, 0]}
      colliders={false} enabledRotations={[false, true, false]} linearDamping={.12} angularDamping={1.8}
      canSleep={false} ccd onCollisionEnter={() => {
        const now = performance.now()
        if (now - motion.current.lastCollision < 250 || useGameStore.getState().phase !== 'playing') return
        motion.current.lastCollision = now
        audioSystem.collision(Math.min(Math.abs(motion.current.speed) / 12, 1))
      }}>
      <CuboidCollider args={[.82, .2, 1.55]} position={[0, .25, 0]} mass={180} friction={.35} restitution={.08} />
      <CuboidCollider args={[.61, .23, .68]} position={[0, .76, .12]} mass={0} friction={.35} />
      <group ref={bodyArt}>
        <primitive object={headlightTarget} position={[0, .18, -12]} />
        {[-1, 1].map((side) => <spotLight key={`headlamp-${side}`} target={headlightTarget} position={[side * .48, .36, -1.48]} color="#fff2cf" intensity={night ? 48 : 0} angle={.36} penumbra={.72} distance={28} decay={2} />)}
        {/* Smooth, tapered shell forms the hood, fenders and rear deck as one sports-car body. */}
        <mesh geometry={coupeGeometry} castShadow receiveShadow><meshStandardMaterial color="#c83e37" roughness={.3} metalness={.42} /></mesh>
        <Part position={[0, .09, 0]} size={[1.58, .1, 2.82]} color="#283338" />
        <Part position={[0, .15, -1.62]} size={[1.86, .07, .2]} color="#252d31" />
        <Part position={[0, .15, 1.63]} size={[1.78, .08, .16]} color="#252d31" />
        <Part position={[0, .24, -1.667]} size={[.72, .11, .035]} color="#172427" />
        <Part position={[0, .25, -1.69]} size={[.38, .035, .025]} color="#88938d" />

        {/* Cabin glass, sloped front and rear screens, roof and side windows. */}
        <Part position={[0, .75, -.55]} size={[1.22, .48, .055]} color="#8db9c0" rotation={[-.46, 0, 0]} />
        <Part position={[0, .75, .78]} size={[1.18, .43, .05]} color="#8db9c0" rotation={[.5, 0, 0]} />
        <Part position={[0, .97, .12]} size={[1.19, .12, .95]} color="#293338" />
        {[-1, 1].map((side) => <group key={side}>
          <Part position={[side * .655, .76, .06]} size={[.045, .36, .72]} color="#79a9b0" />
          <Part position={[side * .76, .4, .08]} size={[.045, .2, 1.02]} color="#b3312d" />
          <Part position={[side * .79, .59, -.35]} size={[.2, .1, .18]} color="#c83e37" />
          <Part position={[side * .79, .26, -.2]} size={[.08, .035, .16]} color="#e8d8bd" />
          <Part position={[side * .79, .26, .38]} size={[.08, .035, .16]} color="#e8d8bd" />
          <Part position={[side * .82, .49, 1.22]} size={[.08, .1, .18]} color="#333d40" />
          <Part position={[side * .57, .51, -1.31]} size={[.32, .065, .14]} color="#fff0cf" emissive="#fff0cf" />
          <Part position={[side * .57, .47, 1.47]} size={[.34, .075, .045]} color="#e55a43" emissive="#e55a43" />
        </group>)}
        <Part position={[-.17, .61, -.95]} size={[.055, .012, .82]} color="#f5e8d2" />
        <Part position={[.17, .61, -.95]} size={[.055, .012, .82]} color="#f5e8d2" />
        <Part position={[-.17, 1.036, .12]} size={[.06, .012, .78]} color="#f5e8d2" />
        <Part position={[.17, 1.036, .12]} size={[.06, .012, .78]} color="#f5e8d2" />

        {/* Rear wing, seats and cockpit details. */}
        <Part position={[-.48, .68, 1.22]} size={[.055, .34, .06]} color="#252d31" />
        <Part position={[.48, .68, 1.22]} size={[.055, .34, .06]} color="#252d31" />
        <Part position={[0, .86, 1.22]} size={[1.5, .09, .3]} color="#252d31" />
        <Part position={[-.33, .59, .18]} size={[.4, .34, .48]} color="#30383b" />
        <Part position={[.33, .59, .18]} size={[.4, .34, .48]} color="#30383b" />
        <Part position={[0, .52, -.2]} size={[1.1, .08, .22]} color="#242c30" />
        <Part position={[0, .16, 1.46]} size={[.34, .12, .045]} color="#e9d9bd" />
        <mesh position={[0, .36, 1.58]} material={brakeMaterial}><boxGeometry args={[.46, .12, .05]} /></mesh>
      </group>
      {WHEEL_POINTS.map(([x, y, z], index) => <group key={index} ref={(node) => { wheelSteering.current[index] = node }} position={[x, y - REST_LENGTH, z]}>
        <group ref={(node) => { wheelSpin.current[index] = node }}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, .32, 12]} /><meshStandardMaterial color="#273335" roughness={.95} /></mesh>
          {[-1, 1].map((side) => <group key={side} position={[side * .165, 0, 0]}>
            <mesh rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[.31, .07, 4, 12]} /><meshStandardMaterial color="#1e292c" roughness={1} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.235, .235, .02, 10]} /><meshStandardMaterial color="#eadbb8" metalness={.2} roughness={.55} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.095, .095, .04, 6]} /><meshStandardMaterial color="#52605e" /></mesh>
            {[0, Math.PI / 3, Math.PI * 2 / 3].map((angle) => <mesh key={angle} rotation={[angle, 0, 0]}><boxGeometry args={[.027, .36, .035]} /><meshStandardMaterial color="#a99f87" /></mesh>)}
          </group>)}
        </group>
      </group>)}
    </RigidBody>
    <instancedMesh ref={dustMesh} args={[undefined, undefined, dust.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#d3bc91" transparent opacity={.19} depthWrite={false} />
    </instancedMesh>
  </>
}
