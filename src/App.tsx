import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, CloudRain, Compass, Map, Moon, Play, RotateCcw, Settings2, Sun, Volume2, VolumeX, X } from 'lucide-react'
import Reader from './game/Reader'
import { PROFILE, ZONES, type ZoneId } from './game/data'
import { clearControls, controls, useGameStore } from './game/store'
import { audioSystem } from './game/audio'

const GameCanvas = lazy(() => import('./game/GameCanvas'))
const roadMapPath = 'M-4 25 H-32 Q-39 25 -39 17 V4 L-36 -7 V-17 Q-36 -24 -29 -24 L-20 -25 H33 Q39 -25 39 -17 V-5 Q39 3 36 8 L39 18 Q39 25 31 25 H-4 Z'

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="error-screen"><span className="brand-mark">a.</span><h1>The world needs a restart.</h1><p>Your browser could not start the 3D experience. Try reloading with hardware acceleration enabled.</p><button className="primary-button" onClick={() => window.location.reload()}>Reload world</button><a href={PROFILE.resume} download>Download Ajay's résumé <ArrowUpRight size={16} /></a><a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a></div> : this.props.children }
}

function GameControls() {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea, [contenteditable="true"]')) return
      const s = useGameStore.getState()
      if (event.code === 'Escape') { event.preventDefault(); if (s.activeZone) s.closeZone(); else if (s.phase === 'playing') s.pause(); else if (s.phase === 'paused') s.resume() }
      if (event.code === 'KeyE' && s.phase === 'playing') { if (s.activeZone) s.closeZone(); else if (s.nearbyZone) { s.openZone(s.nearbyZone); audioSystem.interact() } }
    }
    const blur = () => { clearControls(); if (useGameStore.getState().phase === 'playing') useGameStore.getState().pause() }
    window.addEventListener('keydown', keydown)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('blur', blur) }
  }, [])
  return null
}

function Loader() {
  return <div className="loading-screen" role="status" aria-live="polite"><span className="brand-mark">a.</span><span className="eyebrow">A LITTLE WORLD IS COMING TO LIFE</span><h1>Every journey starts<br />somewhere.</h1><div className="loading-track"><i /></div><span className="loading-note">Preparing the town, type, and vehicle physics…</span></div>
}

function StartScreen() {
  const phase = useGameStore((s) => s.phase)
  if (phase === 'loading') return <Loader />
  return null
}

function MiniMap({ expanded = false, onSelect }: { expanded?: boolean; onSelect?: (id: ZoneId) => void }) {
  const position = useGameStore((s) => s.position)
  const heading = useGameStore((s) => s.heading)
  const visited = useGameStore((s) => s.visited)
  const target = useGameStore((s) => s.travelTarget)
  return <svg viewBox="-63 -52 126 104" className={expanded ? 'town-map large' : 'town-map'} role="img" aria-label="Town map showing your vehicle and six portfolio destinations">
    <rect x="-62" y="-51" width="124" height="102" rx="22" fill="#d9dfc6" />
    <path d="M-8 -50 Q-16 -32 0 -20 T-3 15" fill="none" stroke="#9ec6bf" strokeWidth="11" />
    <path d={roadMapPath} fill="none" stroke="#f7f0db" strokeWidth="7" />
    <path d={roadMapPath} fill="none" stroke="#d7c5a4" strokeWidth=".6" strokeDasharray="2 2" />
    <g aria-label="Scenic bridge between Skills and Projects">
      <path d="M-5 -29 L5 -29 M-5 -21 L5 -21" fill="none" stroke="#334c43" strokeWidth="1.4" />
      <text x="0" y="-32" fontSize="3" fill="#334c43" textAnchor="middle">BRIDGE</text>
    </g>
    {ZONES.map((z, i) => <g key={z.id} onClick={() => onSelect?.(z.id)} style={{ cursor: expanded ? 'pointer' : undefined }}>
      <circle cx={z.position[0]} cy={z.position[2]} r={target === z.id ? 6 : 4.5} fill={z.accent} stroke={target === z.id ? '#fff' : '#fff8'} strokeWidth={target === z.id ? 1.5 : .6} />
      <text x={z.position[0]} y={z.position[2] + 1.4} fontSize="4.3" fill="#fff" fontFamily="Arial" textAnchor="middle">{visited.includes(z.id) ? '✓' : i + 1}</text>
    </g>)}
    <g transform={`translate(${position[0]} ${position[2]}) rotate(${-heading * 180 / Math.PI})`}><circle r="4" fill="#fff" /><path d="M0 -3.1 L2.2 2.5 L0 1.5 L-2.2 2.5Z" fill="#334c43" /></g>
    <text x="52" y="-39" fontSize="4.5" fill="#63776a" textAnchor="middle">N</text>
  </svg>
}

function TouchControls() {
  const bind = (key: keyof typeof controls) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); controls[key] = true },
    onPointerUp: () => { controls[key] = false }, onPointerCancel: () => { controls[key] = false }, onLostPointerCapture: () => { controls[key] = false },
  })
  return <div className="touch-controls"><div className="steering-pad"><button aria-label="Steer left" {...bind('left')}><ArrowLeft /></button><button aria-label="Steer right" {...bind('right')}><ArrowRight /></button></div><div className="pedal-pad"><button className="brake-pedal" aria-label="Brake" {...bind('brake')}>STOP</button><button aria-label="Reverse" {...bind('reverse')}><ArrowDown /></button><button className="gas-pedal" aria-label="Accelerate" {...bind('forward')}><ArrowUp /></button></div></div>
}

function Menu({ map, close }: { map: boolean; close: () => void }) {
  const quality = useGameStore((s) => s.quality)
  const camera = useGameStore((s) => s.camera)
  const sound = useGameStore((s) => s.sound)
  const lighting = useGameStore((s) => s.lighting)
  const weather = useGameStore((s) => s.weather)
  const volume = useGameStore((s) => s.volume)
  const visited = useGameStore((s) => s.visited)
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => { const previous = document.activeElement as HTMLElement; dialog.current?.focus(); return () => previous?.focus() }, [])
  const select = (id: ZoneId) => { useGameStore.getState().navigate(id); close() }
  const trap = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); close() }
    if (event.key !== 'Tab') return
    const nodes = dialog.current?.querySelectorAll<HTMLElement>('button, a[href], input, select')
    if (!nodes?.length) return
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault() }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault() }
  }
  return <div className="menu-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close() }}><div ref={dialog} tabIndex={-1} onKeyDown={trap} className={`menu-card ${map ? 'map-menu' : ''}`} role="dialog" aria-modal="true" aria-labelledby="menu-title">
    <div className="menu-heading"><div><span className="eyebrow">TAKE YOUR TIME. LOOK AROUND.</span><h2 id="menu-title">{map ? 'Your next stop.' : 'A little pit stop.'}</h2></div><button className="icon-button" aria-label="Close menu" onClick={close}><X size={20} /></button></div>
    {map ? <><MiniMap expanded onSelect={select} /><div className="destination-list">{ZONES.map((z, i) => <button key={z.id} onClick={() => select(z.id)}><span className="destination-number" style={{ background: z.accent }}>{visited.includes(z.id) ? <Check size={13} /> : `0${i + 1}`}</span><span><strong>{z.name}</strong><small>{z.shortName}</small></span><ArrowUpRight size={17} /></button>)}</div><p className="menu-note">Choose a destination to mark it on your map, then drive over to explore.</p></> : <>
      <button className="primary-button" onClick={close}><Play size={17} /> Continue exploring</button>
      <div className="setting-row"><label htmlFor="quality">Visual quality</label><select id="quality" value={quality} onChange={(e) => useGameStore.getState().setQuality(e.target.value as typeof quality)}><option value="auto">Adaptive</option><option value="high">High</option><option value="low">Performance</option></select></div>
      <div className="setting-row"><label htmlFor="camera">Camera</label><select id="camera" value={camera} onChange={(e) => useGameStore.getState().setCamera(e.target.value as typeof camera)}><option value="follow">Follow vehicle</option><option value="orbit">Keep my angle</option></select></div>
      <div className="setting-row"><label htmlFor="lighting"><span>{lighting === 'night' ? <Moon size={15} /> : <Sun size={15} />} Lighting</span></label><select id="lighting" value={lighting} onChange={(e) => useGameStore.getState().setLighting(e.target.value as typeof lighting)}><option value="day">Day</option><option value="night">Night</option></select></div>
      <div className="setting-row"><label htmlFor="weather"><span><CloudRain size={15} /> Weather</span></label><select id="weather" value={weather} onChange={(e) => useGameStore.getState().setWeather(e.target.value as typeof weather)}><option value="clear">Clear</option><option value="rain">Rainy season</option></select></div>
      <div className="setting-row"><span>Original soundscape</span><button className="small-button" aria-pressed={sound} onClick={() => { void audioSystem.start(); useGameStore.getState().setSound(!sound) }}>{sound ? 'On' : 'Off'} {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}</button></div>
      <div className="setting-row"><label htmlFor="volume">Volume</label><input id="volume" aria-label="Sound volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => useGameStore.getState().setVolume(Number(e.target.value))} /></div>
      <div className="control-legend"><span><kbd>WASD</kbd> / arrows · Drive</span><span><kbd>Space</kbd> Brake</span><span><kbd>E</kbd> Explore</span><span><kbd>Shift</kbd> Boost</span><span><kbd>R</kbd> Reset car</span><span>Drag · Camera / Scroll · Zoom</span></div>
      <div className="menu-footer"><button className="text-button" onClick={() => { useGameStore.getState().restart(); close() }}><RotateCcw size={15} /> Reset vehicle</button><a href={PROFILE.resume} download>Résumé <ArrowUpRight size={15} /></a></div>
    </>}
  </div></div>
}

function SettingsPanel({ close }: { close: () => void }) {
  const quality = useGameStore((s) => s.quality)
  const camera = useGameStore((s) => s.camera)
  const sound = useGameStore((s) => s.sound)
  const lighting = useGameStore((s) => s.lighting)
  const weather = useGameStore((s) => s.weather)
  const volume = useGameStore((s) => s.volume)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => { panel.current?.focus() }, [])
  return <aside ref={panel} tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }} className="settings-popover" role="dialog" aria-modal="false" aria-labelledby="settings-title">
    <div className="menu-heading"><div><span className="eyebrow">MAKE THE WORLD YOURS</span><h2 id="settings-title">Settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={close}><X size={19} /></button></div>
    <div className="setting-row"><label htmlFor="quality">Visual quality</label><select id="quality" value={quality} onChange={(e) => useGameStore.getState().setQuality(e.target.value as typeof quality)}><option value="auto">Adaptive</option><option value="high">High</option><option value="low">Performance</option></select></div>
    <div className="setting-row"><label htmlFor="camera">Camera</label><select id="camera" value={camera} onChange={(e) => useGameStore.getState().setCamera(e.target.value as typeof camera)}><option value="follow">Follow vehicle</option><option value="orbit">Keep my angle</option></select></div>
    <div className="setting-row"><label htmlFor="lighting"><span>{lighting === 'night' ? <Moon size={15} /> : <Sun size={15} />} Lighting</span></label><select id="lighting" value={lighting} onChange={(e) => useGameStore.getState().setLighting(e.target.value as typeof lighting)}><option value="day">Day</option><option value="night">Night</option></select></div>
    <div className="setting-row"><label htmlFor="weather"><span><CloudRain size={15} /> Weather</span></label><select id="weather" value={weather} onChange={(e) => useGameStore.getState().setWeather(e.target.value as typeof weather)}><option value="clear">Clear</option><option value="rain">Rainy season</option></select></div>
    <div className="setting-row"><span>Original soundscape</span><button className="small-button" aria-pressed={sound} onClick={() => { void audioSystem.start(); useGameStore.getState().setSound(!sound) }}>{sound ? 'On' : 'Off'} {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}</button></div>
    <div className="setting-row"><label htmlFor="volume">Volume</label><input id="volume" aria-label="Sound volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => useGameStore.getState().setVolume(Number(e.target.value))} /></div>
    <div className="control-legend"><span><kbd>WASD</kbd> / arrows · Drive</span><span><kbd>Space</kbd> Brake</span><span><kbd>E</kbd> Explore</span><span><kbd>Shift</kbd> Boost</span><span><kbd>R</kbd> Reset car</span><span>Drag · Camera / Scroll · Zoom</span></div>
    <div className="menu-footer"><button className="text-button" onClick={() => { useGameStore.getState().restart(); close() }}><RotateCcw size={15} /> Reset vehicle</button><button className="text-button" onClick={close}><Play size={15} /> Resume driving</button></div>
  </aside>
}

function HUD() {
  const phase = useGameStore((s) => s.phase)
  const activeZone = useGameStore((s) => s.activeZone)
  const nearby = useGameStore((s) => s.nearbyZone)
  const target = useGameStore((s) => s.travelTarget)
  const visited = useGameStore((s) => s.visited)
  const speed = useGameStore((s) => s.speed)
  const sound = useGameStore((s) => s.sound)
  const volume = useGameStore((s) => s.volume)
  const position = useGameStore((s) => s.position)
  const [map, setMap] = useState(false)
  const [settings, setSettings] = useState(false)
  const [reading, setReading] = useState(false)
  useEffect(() => { setReading(false) }, [activeZone])
  useEffect(() => { audioSystem.setEnabled(sound); audioSystem.setVolume(volume) }, [sound, volume])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code !== 'KeyM' || (e.target instanceof HTMLElement && e.target.matches('input,select,textarea'))) return; const s = useGameStore.getState(); if (s.phase === 'playing') { setSettings(false); setMap(true); s.pause() } else if (s.phase === 'paused') { setSettings(false); setMap(false); s.resume() } }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [])
  const nearZone = ZONES.find((z) => z.id === nearby)
  const targetZone = ZONES.find((z) => z.id === target)
  const distance = targetZone ? Math.round(Math.hypot(position[0] - targetZone.marker[0], position[2] - targetZone.marker[2])) : 0
  const close = () => { setMap(false); setSettings(false); useGameStore.getState().resume() }
  return <>
    <header className="game-header"><a className="wordmark" href="#" onClick={(e) => e.preventDefault()} aria-label="Ajay Vemala portfolio"><span className="brand-mark">a.</span><span>AJAY VEMALA<small>DEVELOPER & EXPLORER</small></span></a><div className="header-actions">{phase !== 'loading' && phase !== 'arrival' && <><button className="icon-button" aria-label="Open world map" onClick={() => { setSettings(false); setMap(true); useGameStore.getState().pause() }}><Map size={19} /></button><button className="icon-button" aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={() => { void audioSystem.start(); useGameStore.getState().setSound(!sound) }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-button" aria-label={settings && phase === 'paused' ? 'Close settings' : 'Open settings'} aria-expanded={settings && phase === 'paused'} onClick={() => { if (settings && phase === 'paused') close(); else { setMap(false); setSettings(true); useGameStore.getState().pause() } }}><Settings2 size={18} /></button></>}</div></header>
    {phase === 'playing' && !activeZone && <>
      <div className="journey-badge"><Compass size={15} /><span>{visited.length} OF 6 PLACES DISCOVERED</span><div className="journey-dots">{ZONES.map((z) => <i key={z.id} className={visited.includes(z.id) ? 'seen' : ''} />)}</div></div>
      <div className="map-widget"><button aria-label="Enlarge world map" onClick={() => { setSettings(false); setMap(true); useGameStore.getState().pause() }}><MiniMap /></button><div className="map-caption"><span><i />{targetZone ? targetZone.shortName : 'MAKE YOUR OWN WAY'}</span>{targetZone && <strong>{distance} m</strong>}</div></div>
      <div className="speed-widget"><strong>{speed.toString().padStart(2, '0')}</strong><span>KM/H</span><div className="speed-line"><i style={{ width: `${Math.min(speed / 65 * 100, 100)}%` }} /></div></div>
      {nearZone && <button className="interact-prompt" onClick={() => { useGameStore.getState().openZone(nearZone.id); audioSystem.interact() }}><kbd>E</kbd><span><small>YOU'VE ARRIVED AT</small><strong>{nearZone.name}</strong></span><ArrowUpRight size={21} /></button>}
      <div className="drive-hint"><span><kbd>WASD</kbd> Drive</span><span><kbd>Space</kbd> Brake</span><span>Drag to look around</span></div>
      <TouchControls />
    </>}
    {phase === 'playing' && activeZone && <div className="exhibit-toolbar"><button className="small-button" onClick={() => useGameStore.getState().closeZone()}><ArrowLeft size={16} /> Back to exploring <kbd>Esc</kbd></button>{activeZone === 'projects' && <div><button className="small-button" aria-label="Previous project" onClick={() => window.dispatchEvent(new CustomEvent('portfolio-project-step', { detail: -1 }))}><ArrowLeft size={17} /></button><button className="small-button" aria-label="Next project" onClick={() => window.dispatchEvent(new CustomEvent('portfolio-project-step', { detail: 1 }))}><ArrowRight size={17} /></button></div>}{activeZone === 'contact' && <div className="accessible-contact"><a href={`mailto:${PROFILE.email}`}>Email</a><a href={PROFILE.linkedin} target="_blank" rel="noreferrer">LinkedIn</a><a href={PROFILE.resume} download>Résumé</a></div>}</div>}
    {phase === 'playing' && activeZone && <button className="small-button reading-toggle" onClick={() => setReading(true)}>Read exhibit text</button>}
    {reading && activeZone && <Reader zone={activeZone} close={() => setReading(false)} />}
    {phase === 'paused' && map && <Menu map close={close} />}
    {phase === 'paused' && settings && <SettingsPanel close={close} />}
  </>
}

export default function App() {
  const quality = useGameStore((s) => s.quality)
  const [adaptiveLow, setAdaptiveLow] = useState(() => window.matchMedia('(max-width: 800px), (pointer: coarse)').matches)
  const lowQuality = quality === 'low' || (quality === 'auto' && adaptiveLow)
  return <main className="game-shell"><WorldBoundary><Suspense fallback={null}><GameCanvas lowQuality={lowQuality} onDecline={() => setAdaptiveLow(true)} /></Suspense></WorldBoundary><GameControls /><HUD /><StartScreen /><noscript>This interactive portfolio requires JavaScript. Contact Ajay at {PROFILE.email}.</noscript></main>
}
