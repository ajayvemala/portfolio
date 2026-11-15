import { create } from 'zustand'
import type { Vec3, ZoneId } from './data'

export type Phase = 'loading' | 'arrival' | 'playing' | 'paused'
export const controls = { forward: false, reverse: false, left: false, right: false, brake: false, boost: false }
export function clearControls() { Object.keys(controls).forEach((key) => { controls[key as keyof typeof controls] = false }) }

interface GameState {
  phase: Phase
  activeZone: ZoneId | null
  nearbyZone: ZoneId | null
  visited: ZoneId[]
  quality: 'auto' | 'high' | 'low'
  camera: 'follow' | 'orbit'
  sound: boolean
  lighting: 'day' | 'night'
  weather: 'clear' | 'rain'
  volume: number
  speed: number
  position: Vec3
  heading: number
  resetNonce: number
  travelTarget: ZoneId | null
  ready: () => void
  start: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  openZone: (id: ZoneId) => void
  closeZone: () => void
  setNearby: (id: ZoneId | null) => void
  telemetry: (position: Vec3, speed: number, heading: number) => void
  setQuality: (quality: GameState['quality']) => void
  setCamera: (camera: GameState['camera']) => void
  setSound: (sound: boolean) => void
  setLighting: (lighting: GameState['lighting']) => void
  setWeather: (weather: GameState['weather']) => void
  setVolume: (volume: number) => void
  navigate: (id: ZoneId | null) => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'loading', activeZone: null, nearbyZone: null, visited: [], quality: 'auto',
  camera: 'follow', sound: true, lighting: 'day', weather: 'clear', volume: 0.4, speed: 0, position: [-4, 1, 25],
  heading: Math.PI / 2, resetNonce: 0, travelTarget: 'about',
  ready: () => set((s) => s.phase === 'loading' ? { phase: 'arrival' } : {}),
  start: () => { clearControls(); set({ phase: 'playing' }) },
  pause: () => { clearControls(); set({ phase: 'paused' }) },
  resume: () => { clearControls(); set({ phase: 'playing' }) },
  restart: () => { clearControls(); set((s) => ({ phase: 'playing', activeZone: null, nearbyZone: null, resetNonce: s.resetNonce + 1, speed: 0 })) },
  openZone: (id) => { clearControls(); set((s) => ({ activeZone: id, travelTarget: null, visited: s.visited.includes(id) ? s.visited : [...s.visited, id] })) },
  closeZone: () => { clearControls(); set({ activeZone: null }) },
  setNearby: (nearbyZone) => set((s) => {
    if (nearbyZone && nearbyZone !== s.nearbyZone && s.phase === 'playing' && !s.activeZone) {
      clearControls()
      return {
        nearbyZone,
        activeZone: nearbyZone,
        travelTarget: null,
        visited: s.visited.includes(nearbyZone) ? s.visited : [...s.visited, nearbyZone],
      }
    }
    return { nearbyZone }
  }),
  telemetry: (position, speed, heading) => set({ position, speed, heading }),
  setQuality: (quality) => set({ quality }),
  setCamera: (camera) => set({ camera }),
  setSound: (sound) => set({ sound }),
  setLighting: (lighting) => set({ lighting }),
  setWeather: (weather) => set({ weather }),
  setVolume: (volume) => set({ volume }),
  navigate: (travelTarget) => set({ travelTarget }),
}))
