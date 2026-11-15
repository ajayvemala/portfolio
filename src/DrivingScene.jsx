import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'

const stops = [
  { id: 'upanaya', x: -16, color: 0xb79b64 },
  { id: 'kalyana', x: -8, color: 0x8e9f91 },
  { id: 'sms', x: 0, color: 0x9aa9a9 },
  { id: 'samskruti', x: 8, color: 0xb98a70 },
  { id: 'kanchi', x: 16, color: 0xa17d62 },
]

function material(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 })
}

function box(parent, size, color, position, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, options.roughness))
  mesh.position.set(...position)
  mesh.castShadow = options.shadow !== false
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function buildCar(scene) {
  const car = new THREE.Group()
  const body = box(car, [1.45, 0.43, 2.55], 0x243d3d, [0, 0.57, 0])
  body.material.roughness = 0.34
  box(car, [1.24, 0.36, 1.2], 0x354e4c, [0, 0.94, -0.18], { roughness: 0.28 })
  box(car, [1.08, 0.23, 1.08], 0xbed0c8, [0, 0.99, -0.19], { roughness: 0.23, shadow: false }).material.transparent = true
  box(car, [1.14, 0.08, 0.74], 0xc9a867, [0, 0.82, -0.88], { roughness: 0.45 })
  for (const x of [-0.76, 0.76]) {
    for (const z of [-0.83, 0.82]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), material(0x222727, 0.95))
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, 0.33, z)
      wheel.castShadow = true
      car.add(wheel)
    }
  }
  for (const x of [-0.48, 0.48]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.09, 0.06), material(0xf2dfad, 0.24))
    headlight.position.set(x, 0.61, -1.29)
    car.add(headlight)
  }
  car.position.set(23, 0, 1.6)
  car.rotation.y = Math.PI / 2
  scene.add(car)
  return car
}

function addStop(scene, project, stop, onSelect) {
  const group = new THREE.Group()
  group.position.set(stop.x, 0, -7)
  scene.add(group)

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 2.5), material(0xf0ede4))
  base.position.y = 0.14
  base.receiveShadow = true
  group.add(base)

  const building = new THREE.Group()
  const width = project.id === 'sms' ? 1.5 : 1.8
  const height = project.id === 'kanchi' ? 1.6 : 1.9
  box(building, [width, height, 1.45], 0xe8e5dc, [0, height / 2 + 0.26, 0])
  box(building, [width + 0.16, 0.16, 1.62], stop.color, [0, height + 0.34, 0])
  box(building, [0.66, 0.9, 0.09], 0x99aca1, [0, 0.71, 0.77], { shadow: false })
  const windowMaterial = material(0xc1cbc3, 0.35)
  for (const x of [-width * 0.3, width * 0.3]) {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.47, 0.05), windowMaterial)
    windowMesh.position.set(x, 1.52, 0.76)
    building.add(windowMesh)
  }
  group.add(building)

  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = 'world-stop'
  marker.setAttribute('aria-label', `Open ${project.title} project details`)
  marker.innerHTML = `<span class="world-stop-index">${project.number}</span><span class="world-stop-name"></span><span class="world-stop-arrow">â†—</span>`
  marker.querySelector('.world-stop-name').textContent = project.title
  marker.addEventListener('click', () => onSelect(project))
  const label = new CSS2DObject(marker)
  label.position.set(0, height + 1.04, 0)
  group.add(label)

  return { project, position: new THREE.Vector3(stop.x, 0, -4), group }
}

export default function DrivingScene({ projects, onSelect, onNearby, controls, paused }) {
  const hostRef = useRef(null)
  const callbacks = useRef({ onSelect, onNearby, paused })
  const [failed, setFailed] = useState(false)
  callbacks.current = { onSelect, onNearby, paused }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    let renderer
    let labelRenderer
    let frame = 0
    let lastTime = 0
    let lastNearby = null
    let speed = 0
    let heading = Math.PI / 2
    const keys = new Set()
    const wheels = []
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdbe0d8)
    scene.fog = new THREE.Fog(0xdbe0d8, 32, 88)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150)
    camera.position.set(34, 15, 16)

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.6))
      renderer.shadowMap.enabled = window.innerWidth > 700
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      renderer.domElement.className = 'driving-canvas'
      host.appendChild(renderer.domElement)

      labelRenderer = new CSS2DRenderer()
      labelRenderer.domElement.className = 'label-layer'
      host.appendChild(labelRenderer.domElement)
    } catch {
      setFailed(true)
      return undefined
    }

    scene.add(new THREE.HemisphereLight(0xf5f1e7, 0x788279, 2.05))
    const sunlight = new THREE.DirectionalLight(0xfff2d8, 2.7)
    sunlight.position.set(-10, 22, 11)
    sunlight.castShadow = renderer.shadowMap.enabled
    sunlight.shadow.mapSize.set(1024, 1024)
    sunlight.shadow.camera.left = -35
    sunlight.shadow.camera.right = 35
    sunlight.shadow.camera.top = 25
    sunlight.shadow.camera.bottom = -25
    scene.add(sunlight)

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(76, 44), material(0x9eab98))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.08
    ground.receiveShadow = true
    scene.add(ground)

    // A clean boulevard and short pull-ins make each project stop easy to find.
    box(scene, [58, 0.08, 6], 0x555e5c, [0, 0.02, 0], { roughness: 0.96, shadow: false })
    box(scene, [58, 0.11, 0.34], 0xb5b4a4, [0, 0.02, 3.25], { shadow: false })
    box(scene, [58, 0.11, 0.34], 0xb5b4a4, [0, 0.02, -3.25], { shadow: false })
    for (const x of [-16, -8, 0, 8, 16]) {
      box(scene, [1.8, 0.06, 6], 0x555e5c, [x, 0.06, -4.5], { roughness: 0.96, shadow: false })
      box(scene, [0.82, 0.018, 0.12], 0xded7c5, [x, 0.08, 0], { shadow: false })
    }
    for (let x = -26; x <= 26; x += 4) {
      box(scene, [1.45, 0.018, 0.1], 0xe7ddc6, [x, 0.08, 0], { shadow: false })
    }

    const treeMat = material(0x4e6557)
    for (const x of [-26, -22, -18, -13, -3, 5, 12, 21, 26]) {
      for (const z of [-10, 9]) {
        const tree = new THREE.Group()
        tree.position.set(x, 0, z)
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.05, 6), material(0x796b54))
        trunk.position.y = 0.52
        tree.add(trunk)
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.76, 0), treeMat)
        crown.position.y = 1.42
        crown.castShadow = renderer.shadowMap.enabled
        tree.add(crown)
        scene.add(tree)
      }
    }

    const stopObjects = projects.map((project, i) => addStop(scene, project, stops[i], (item) => callbacks.current.onSelect(item)))
    const car = buildCar(scene)
    car.traverse((child) => { if (child.isMesh && child.geometry.type === 'CylinderGeometry') wheels.push(child) })

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      camera.aspect = width / height
      camera.fov = width < 700 ? 49 : 42
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      labelRenderer.setSize(width, height)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const handleKeyDown = (event) => {
      if (callbacks.current.paused || event.target.closest?.('button, a, input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault()
      keys.add(key)
      if (key === 'enter' || key === ' ') {
        const nearest = stopObjects.map((stop) => ({ ...stop, distance: stop.position.distanceTo(car.position) })).sort((a, b) => a.distance - b.distance)[0]
        if (nearest?.distance < 6.5) callbacks.current.onSelect(nearest.project)
      }
      if (key === 'r') {
        car.position.set(23, 0, 1.6)
        heading = Math.PI / 2
        speed = 0
      }
    }
    const handleKeyUp = (event) => keys.delete(event.key.toLowerCase())
    const clearKeys = () => keys.clear()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearKeys)

    const cameraTarget = new THREE.Vector3()
    const cameraPosition = new THREE.Vector3()
    const forward = new THREE.Vector3()
    const animate = (time) => {
      frame = requestAnimationFrame(animate)
      const dt = Math.min((time - (lastTime || time)) / 1000, 0.04)
      lastTime = time
      if (!callbacks.current.paused) {
        const forwardDown = keys.has('w') || keys.has('arrowup') || controls.current.forward
        const reverseDown = keys.has('s') || keys.has('arrowdown') || controls.current.reverse
        const steerLeft = keys.has('a') || keys.has('arrowleft') || controls.current.left
        const steerRight = keys.has('d') || keys.has('arrowright') || controls.current.right
        const boost = keys.has('shift')
        const maxSpeed = boost ? 9 : 6
        if (forwardDown) speed = Math.min(maxSpeed, speed + dt * 5.4)
        else if (reverseDown) speed = Math.max(-2.8, speed - dt * 3.8)
        else speed *= Math.pow(0.055, dt)
        const steering = Number(steerRight) - Number(steerLeft)
        if (Math.abs(speed) > 0.12) heading += steering * dt * 1.45 * Math.sign(speed)
        car.position.x -= Math.sin(heading) * speed * dt
        car.position.z -= Math.cos(heading) * speed * dt
        car.position.x = THREE.MathUtils.clamp(car.position.x, -28, 28)
        car.position.z = THREE.MathUtils.clamp(car.position.z, -13, 12)
        car.rotation.y = heading
        wheels.forEach((wheel) => { wheel.rotation.x += speed * dt * 1.9 })

        const nearest = stopObjects.map((stop) => ({ ...stop, distance: stop.position.distanceTo(car.position) })).sort((a, b) => a.distance - b.distance)[0]
        const nearbyId = nearest?.distance < 7.5 ? nearest.project.id : null
        if (nearbyId !== lastNearby) {
          lastNearby = nearbyId
          callbacks.current.onNearby(nearbyId ? nearest.project : null)
        }
      }

      forward.set(-Math.sin(heading), 0, -Math.cos(heading))
      cameraPosition.set(car.position.x - forward.x * 10, 8.4, car.position.z - forward.z * 10 + 2.5)
      camera.position.lerp(cameraPosition, 1 - Math.exp(-3.5 * dt))
      cameraTarget.set(car.position.x + forward.x * 5, 0.7, car.position.z + forward.z * 5)
      camera.lookAt(cameraTarget)
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearKeys)
      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose())
          else object.material.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
      labelRenderer.domElement.remove()
    }
  }, [projects, controls])

  return (
    <>
      <div className="driving-scene" ref={hostRef} aria-label="Interactive 3D portfolio world" />
      {failed && <div className="scene-fallback">3D preview isnâ€™t available in this browser. You can still explore Ajayâ€™s projects below.</div>}
    </>
  )
}
