import * as THREE from 'three'

type Surface = 'asphalt' | 'grass' | 'plaster' | 'brick' | 'paving' | 'roof' | 'wood' | 'stone'
const noise = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v) }
const colors: Record<Surface, number[]> = {
  asphalt: [62, 65, 65], grass: [105, 123, 72], plaster: [213, 207, 192],
  brick: [143, 106, 85], paving: [164, 160, 148], roof: [116, 83, 68],
  wood: [108, 85, 63], stone: [140, 145, 139],
}

function surface(kind: Surface, scale: number, bump: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(512, 512)
  const rgb = colors[kind]
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const n = y * 512 + x
    const grain = (noise(n + 1) - .5) * (kind === 'grass' ? 42 : 24)
    const patch = Math.sin(x * .037) * Math.cos(y * .049) * 4
    const woodgrain = kind === 'wood' ? Math.sin(x * .42 + Math.sin(y * .018) * 2) * 14 : 0
    for (let c = 0; c < 3; c++) pixels.data[n * 4 + c] = rgb[c] + grain + patch + woodgrain
    pixels.data[n * 4 + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  if (kind === 'brick' || kind === 'paving' || kind === 'roof') {
    const h = kind === 'brick' ? 32 : kind === 'roof' ? 64 : 128
    const w = kind === 'brick' ? 96 : 128
    ctx.strokeStyle = kind === 'brick' ? '#b8afa1' : '#514c453e'
    ctx.lineWidth = kind === 'brick' ? 3 : 2
    for (let row = 0; row < 512 / h; row++) {
      const offset = row % 2 ? -w / 2 : 0
      for (let x = offset; x < 512; x += w) {
        ctx.fillStyle = `rgba(${noise(x + row + 5) > .5 ? '255,255,255' : '0,0,0'},${.025 + noise(x * 2 + row + 10) * .07})`
        ctx.fillRect(x + 2, row * h + 2, w - 4, h - 4)
        ctx.strokeRect(x, row * h, w, h)
        if (kind === 'roof') {
          const gradient = ctx.createLinearGradient(x, 0, x + w, 0)
          gradient.addColorStop(0, '#00000033'); gradient.addColorStop(.4, '#ffffff18'); gradient.addColorStop(1, '#00000022')
          ctx.fillStyle = gradient; ctx.fillRect(x, row * h, w, h)
        }
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const height = map.clone(); height.colorSpace = THREE.NoColorSpace
  const material = new THREE.MeshStandardMaterial({ map, bumpMap: height, bumpScale: bump, roughness: kind === 'wood' ? .82 : .95 })
  // Texture scale is measured in world metres, including instanced geometry.
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `
      #include <uv_vertex>
      vec4 surfacePosition = vec4(position, 1.0);
      vec3 surfaceNormal = normal;
      #ifdef USE_INSTANCING
        surfacePosition = instanceMatrix * surfacePosition;
        surfaceNormal = mat3(instanceMatrix) * surfaceNormal;
      #endif
      surfacePosition = modelMatrix * surfacePosition;
      surfaceNormal = abs(normalize(mat3(modelMatrix) * surfaceNormal));
      vec2 surfaceUv = surfaceNormal.y > .65 ? surfacePosition.xz : (surfaceNormal.x > surfaceNormal.z ? surfacePosition.zy : surfacePosition.xy);
      vMapUv = surfaceUv / ${scale.toFixed(2)};
      vBumpMapUv = vMapUv;
    `)
  }
  material.customProgramCacheKey = () => `world-surface-${kind}-${scale}`
  return material
}

export const surfaces = {
  asphalt: surface('asphalt', 3, .035), grass: surface('grass', 3, .09),
  plaster: surface('plaster', 2, .025), brick: surface('brick', 2.4, .045),
  paving: surface('paving', 3, .035), roof: surface('roof', 2.8, .055),
  wood: surface('wood', 1.8, .035), stone: surface('stone', 2, .065),
}

export const waterMaterial = new THREE.MeshPhysicalMaterial({ color: '#477e82', roughness: .24, metalness: .15, clearcoat: 1, clearcoatRoughness: .16 })
const waves = new Uint8Array(128 * 128 * 4)
for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
  const u = x / 128 * Math.PI * 2, v = y / 128 * Math.PI * 2
  const i = (y * 128 + x) * 4
  waves[i] = 128 + Math.sin(u * 3 + v * 2) * 18 + Math.sin(u * 7 - v * 4) * 9 + Math.cos(u + v * 8) * 5
  waves[i + 1] = 128 + Math.cos(v * 3 - u * 2) * 18 + Math.cos(v * 6 + u * 3) * 8 + Math.sin(v + u * 9) * 5
  waves[i + 2] = 245; waves[i + 3] = 255
}
const normal = new THREE.DataTexture(waves, 128, 128)
normal.wrapS = normal.wrapT = THREE.RepeatWrapping
normal.magFilter = normal.minFilter = THREE.LinearFilter
normal.repeat.set(36, 36); normal.needsUpdate = true
waterMaterial.normalMap = normal
waterMaterial.normalScale.set(.2, .2)
