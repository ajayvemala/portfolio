import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Billboard, RoundedBox, Text, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { gsap } from 'gsap'
import * as THREE from 'three'
import {
  CERTIFICATIONS, EDUCATION, EXPERIENCE, LANGUAGES, PROFILE, PROJECTS, SKILL_GROUPS, ZONES,
  type ZoneId,
} from './data'
import { useGameStore } from './store'

const INK = '#283833'
const MUTED = '#647069'
const PAPER = '#fff9ed'
const BODY_FONT = '/fonts/dm-sans.woff'
const HEADING_FONT = '/fonts/space-grotesk.woff'
type Position = [number, number, number]
type Zone = (typeof ZONES)[number]

function Copy({ children, position, width = 9.1, size = 0.24, color = INK, heading = false, align = 'left' }: {
  children: string
  position: Position
  width?: number
  size?: number
  color?: string
  heading?: boolean
  align?: 'left' | 'center' | 'right'
}) {
  return (
    <Text
      position={position} font={heading ? HEADING_FONT : BODY_FONT} fontSize={size}
      maxWidth={width} color={color} lineHeight={1.36} anchorX={align} anchorY="top"
      textAlign={align} overflowWrap="break-word" outlineWidth={0}
    >{children}</Text>
  )
}

function Button3D({ children, position, width = 2.5, height = 0.58, color = '#edf0e6', textColor = INK, onClick, size = 0.19 }: {
  children: string
  position: Position
  width?: number
  height?: number
  color?: string
  textColor?: string
  onClick: () => void
  size?: number
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const stop = (event: ThreeEvent<PointerEvent>) => event.stopPropagation()
  return (
    <group position={position} onPointerOver={(event) => { stop(event); setHovered(true) }} onPointerOut={() => setHovered(false)} onClick={(event) => { event.stopPropagation(); onClick() }}>
      <RoundedBox args={[width, height, 0.08]} radius={0.13} smoothness={3}>
        <meshBasicMaterial color={hovered ? '#dfb975' : color} />
      </RoundedBox>
      <Text font={HEADING_FONT} fontSize={size} color={textColor} maxWidth={width - 0.2} anchorX="center" anchorY="middle" position={[0, 0, 0.06]}>{children}</Text>
    </group>
  )
}

function Rule({ y, width = 9.25, x = 0 }: { y: number; width?: number; x?: number }) {
  return <mesh position={[x, y, 0.16]}><planeGeometry args={[width, 0.013]} /><meshBasicMaterial color="#dce1d5" /></mesh>
}

function Marker({ zone, nearby, target, visited }: { zone: Zone; nearby: boolean; target: boolean; visited: boolean }) {
  const crystal = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  useFrame(({ clock }) => {
    if (crystal.current) {
      crystal.current.position.y = 1.25 + Math.sin(clock.elapsedTime * 1.7 + zone.position[0]) * 0.1
      crystal.current.rotation.y = clock.elapsedTime * 0.55
    }
    if (ring.current && (nearby || target)) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.3) * 0.045
      ring.current.scale.setScalar(pulse)
    }
  })
  const open = () => {
    if (useGameStore.getState().phase === 'playing') useGameStore.getState().openZone(zone.id)
  }
  return (
    <group position={zone.marker} onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }} onPointerOut={() => setHovered(false)} onClick={(event) => { event.stopPropagation(); open() }}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
        <torusGeometry args={[1.45, nearby || target ? 0.075 : 0.045, 5, 32]} />
        <meshBasicMaterial color={nearby || target || hovered ? '#fff3b0' : zone.accent} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.55, 0.68, 0.18, 8]} />
        <meshStandardMaterial color="#f5ecd7" roughness={0.85} />
      </mesh>
      <mesh ref={crystal} position={[0, 1.25, 0]}>
        <octahedronGeometry args={[nearby || hovered ? 0.39 : 0.3, 0]} />
        <meshStandardMaterial color={zone.accent} roughness={0.4} metalness={0.1} emissive={zone.accent} emissiveIntensity={nearby ? 0.3 : 0.05} />
      </mesh>
      <Billboard position={[0, 2.35, 0]}>
        <RoundedBox args={[3.6, nearby ? 0.88 : 0.62, 0.065]} radius={0.15} smoothness={3}>
          <meshBasicMaterial color={nearby || hovered ? '#253e36' : '#344c42'} />
        </RoundedBox>
        <Text font={HEADING_FONT} color={PAPER} fontSize={0.2} anchorX="center" anchorY="middle" position={[0, nearby ? 0.13 : 0, 0.05]}>{`${visited ? '• ' : ''}${zone.shortName}`}</Text>
        {nearby && <Text font={BODY_FONT} color="#f4ca83" fontSize={0.135} anchorX="center" anchorY="middle" position={[0, -0.2, 0.05]}>E / TAP TO EXPLORE</Text>}
      </Billboard>
    </group>
  )
}

function AboutPanel() {
  return (
    <>
      <Copy position={[-4.65, 1.38, 0.18]} width={5.55} size={0.255}>{PROFILE.intro}</Copy>
      <mesh position={[1.42, -0.05, 0.17]}><planeGeometry args={[0.013, 3]} /><meshBasicMaterial color="#dce1d5" /></mesh>
      <Copy position={[1.8, 1.4, 0.18]} width={2.8} size={0.17} color={MUTED}>BASED IN</Copy>
      <Copy position={[1.8, 1.04, 0.18]} width={2.8} size={0.29} heading>{'Hyderabad,\nTelangana, India'}</Copy>
      <Copy position={[1.8, 0.03, 0.18]} width={2.8} size={0.17} color={MUTED}>I BUILD WITH</Copy>
      <Copy position={[1.8, -0.33, 0.18]} width={2.8} size={0.26}>{'MERN stack\nReact Native CLI\nMicrosoft Azure'}</Copy>
      <Copy position={[1.8, -1.57, 0.18]} width={2.8} size={0.16} color={MUTED}>{LANGUAGES.join(' / ')}</Copy>
      <Rule y={-1.98} />
      <Copy position={[-4.65, -2.18, 0.18]} width={9.1} size={0.18} heading>{`${EDUCATION.degree}  /  ${EDUCATION.period}`}</Copy>
      <Copy position={[-4.65, -2.55, 0.18]} width={9.1} size={0.18} color={MUTED}>{EDUCATION.school}</Copy>
    </>
  )
}

function ExperiencePanel() {
  return (
    <>
      {EXPERIENCE.map((job, index) => {
        const y = 1.42 - index * 1.85
        const summary = index === 0
          ? 'Building web and mobile applications, reusable UI, REST API integrations, and HRMS features. Deploying on Azure VMs with Ubuntu, Nginx, PM2, domains, SSL, monitoring, and troubleshooting.'
          : 'Built React Native screens for Upanaya and Kalyana Prapthirasthu, and responsive React interfaces for SMS, Samskruti, and Sri Kanchi Banarasi Silks. Integrated REST APIs and collaborated using Git and GitHub.'
        return (
          <group key={job.period}>
            <mesh position={[-4.53, y - 0.11, 0.19]}><circleGeometry args={[0.08, 12]} /><meshBasicMaterial color="#b88236" /></mesh>
            <Copy position={[-4.3, y, 0.18]} width={2.1} size={0.18} heading color="#8c642d">{job.period}</Copy>
            <Copy position={[-4.3, y - 0.4, 0.18]} width={2.1} size={0.2}>{job.company}</Copy>
            <Copy position={[-1.95, y, 0.18]} width={6.4} size={0.25} heading>{job.role}</Copy>
            <Copy position={[-1.95, y - 0.65, 0.18]} width={6.4} size={0.19} color={MUTED}>{summary}</Copy>
          </group>
        )
      })}
      <Rule y={-2.25} />
      <Copy position={[-4.65, -2.43, 0.18]} width={9.25} size={0.17} color={MUTED}>{`Also completed: ${CERTIFICATIONS[1]}`}</Copy>
    </>
  )
}

function SkillsPanel() {
  return (
    <>
      {SKILL_GROUPS.map((group, index) => {
        const x = -4.65 + (index % 3) * 3.2
        const y = 1.42 - Math.floor(index / 3) * 2.05
        return <group key={group.title}>
          <mesh position={[x + 0.05, y - 0.12, 0.19]}><circleGeometry args={[0.055, 10]} /><meshBasicMaterial color="#438b7f" /></mesh>
          <Copy position={[x + 0.22, y, 0.18]} width={2.6} size={0.235} heading>{group.title}</Copy>
          <Copy position={[x, y - 0.43, 0.18]} width={2.85} size={0.205} color={MUTED}>{group.items.join(' · ')}</Copy>
        </group>
      })}
    </>
  )
}

function ProjectsPanel({ index, onStep }: { index: number; onStep: (direction: number) => void }) {
  const project = PROJECTS[index]
  return (
    <>
      <Copy position={[-4.65, 1.4, 0.18]} width={9.3} size={0.18} color="#596899">{project.subtitle.toUpperCase()}</Copy>
      <Copy position={[-4.65, 0.94, 0.18]} width={8.9} size={0.25}>{project.description}</Copy>
      <Copy position={[-4.65, -0.2, 0.18]} width={9.3} size={0.15} color={MUTED}>MY CONTRIBUTION</Copy>
      <Copy position={[-4.65, -0.56, 0.18]} width={9.1} size={0.23}>{project.contribution}</Copy>
      <Rule y={-1.75} />
      <Copy position={[-4.65, -1.96, 0.18]} width={9.2} size={0.18} color="#596899">{project.stack.join('  /  ')}</Copy>
      <Button3D position={[-3.52, -2.58, 0.22]} width={2.25} onClick={() => onStep(-1)}>← Previous</Button3D>
      <Copy position={[0, -2.45, 0.18]} width={3} size={0.17} color={MUTED} align="center">{`${String(index + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}   PROJECTS`}</Copy>
      <Button3D position={[3.52, -2.58, 0.22]} width={2.25} color="#7787ba" textColor="#ffffff" onClick={() => onStep(1)}>Next project →</Button3D>
    </>
  )
}

function NetworkPulse() {
  const light = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (light.current) light.current.position.x = -3.8 + ((clock.elapsedTime * 1.8) % 7.6)
  })
  return <mesh ref={light} position={[-3.8, 0.2, 0.35]}><sphereGeometry args={[0.055, 8, 6]} /><meshBasicMaterial color="#de9d3d" toneMapped={false} /></mesh>
}

function CloudPanel() {
  const nodes = ['Browser', 'Nginx\nHTTPS', 'React /\nREST API', 'PM2 /\nNode.js', 'MongoDB /\nPostgreSQL']
  return (
    <>
      <Copy position={[-4.65, 1.4, 0.18]} width={9.3} size={0.23}>From application code to a running service on Azure Virtual Machines.</Copy>
      <mesh position={[0, 0.2, 0.23]}><planeGeometry args={[7.6, 0.025]} /><meshBasicMaterial color="#7aaeba" /></mesh>
      {nodes.map((node, index) => <group key={node} position={[-3.8 + index * 1.9, 0.2, 0.24]}>
        <RoundedBox args={[1.63, 0.95, 0.09]} radius={0.14} smoothness={3}><meshBasicMaterial color={index % 2 ? '#e4efe9' : '#edf0e7'} /></RoundedBox>
        <Text font={HEADING_FONT} position={[0, 0, 0.07]} color={INK} fontSize={0.18} maxWidth={1.43} lineHeight={1.35} textAlign="center" anchorX="center" anchorY="middle">{node}</Text>
        <mesh position={[-0.57, 0.34, 0.07]}><circleGeometry args={[0.025, 8]} /><meshBasicMaterial color="#579d79" toneMapped={false} /></mesh>
      </group>)}
      <NetworkPulse />
      <Copy position={[-4.65, -0.65, 0.18]} width={9.2} size={0.16} color={MUTED}>A SIMPLIFIED VIEW OF THE TOOLS I WORK WITH</Copy>
      <Rule y={-1.08} />
      <Copy position={[-4.65, -1.31, 0.18]} width={4.25} size={0.22} heading>DEPLOY & CONFIGURE</Copy>
      <Copy position={[-4.65, -1.71, 0.18]} width={4.25} size={0.205} color={MUTED}>Azure VMs, Ubuntu Linux, SSH, Nginx reverse proxy, PM2, domains, DNS, and SSL / HTTPS.</Copy>
      <Copy position={[0.35, -1.31, 0.18]} width={4.25} size={0.22} heading>KEEP IT RUNNING</Copy>
      <Copy position={[0.35, -1.71, 0.18]} width={4.25} size={0.205} color={MUTED}>Basic server monitoring, log management, troubleshooting, and deployment maintenance.</Copy>
    </>
  )
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function downloadResume() {
  const anchor = document.createElement('a')
  anchor.href = PROFILE.resume
  anchor.download = 'Ajay-Vemala-Resume.pdf'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function ContactPanel() {
  return (
    <>
      <Copy position={[-4.65, 1.4, 0.18]} width={9.2} size={0.27}>Have a product, a problem, or an idea worth exploring? Let's talk.</Copy>
      <Copy position={[-4.65, 0.46, 0.18]} width={9.2} size={0.42} heading>{PROFILE.email}</Copy>
      <Copy position={[-4.65, -0.21, 0.18]} width={9.2} size={0.22} color={MUTED}>{`${PROFILE.phone}   /   ${PROFILE.location}`}</Copy>
      <Rule y={-0.85} />
      <Button3D position={[-3.15, -1.46, 0.22]} width={3} color="#d98d85" textColor="#ffffff" onClick={() => { window.location.href = `mailto:${PROFILE.email}` }}>Write an email ↗</Button3D>
      {PROFILE.linkedin && <Button3D position={[0.12, -1.46, 0.22]} width={2.85} onClick={() => openExternal(PROFILE.linkedin!)}>LinkedIn ↗</Button3D>}
      <Button3D position={[3.4, -1.46, 0.22]} width={2.5} onClick={downloadResume}>Resume ↓</Button3D>
      <Button3D position={[-3.15, -2.25, 0.22]} width={3} onClick={() => { window.location.href = `tel:${PROFILE.phone.replace(/\s/g, '')}` }}>Call Ajay ↗</Button3D>
      <Copy position={[-1.3, -2.14, 0.18]} width={5.9} size={0.16} color={MUTED}>Open to a thoughtful conversation about web, mobile, and product development.</Copy>
    </>
  )
}

function ExhibitBoard({ zone }: { zone: Zone }) {
  const group = useRef<THREE.Group>(null)
  const [projectIndex, setProjectIndex] = useState(0)
  const step = (direction: number) => setProjectIndex((current) => (current + direction + PROJECTS.length) % PROJECTS.length)
  useLayoutEffect(() => {
    if (!group.current) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animation = gsap.fromTo(group.current.scale, { x: 0.93, y: 0.93, z: 0.93 }, { x: 1, y: 1, z: 1, duration: reducedMotion ? 0 : 0.7, ease: 'power3.out' })
    return () => { animation.kill() }
  }, [])
  useEffect(() => {
    if (zone.id !== 'projects') return
    const onKey = (event: KeyboardEvent) => {
      if (useGameStore.getState().phase !== 'playing' || (event.target instanceof HTMLElement && event.target.matches('input, textarea, select'))) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1) }
    }
    const onStep = (event: Event) => { step((event as CustomEvent<number>).detail < 0 ? -1 : 1) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('portfolio-project-step', onStep)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('portfolio-project-step', onStep) }
  }, [zone.id])
  const heading: Record<ZoneId, string> = {
    about: `Hi, I'm ${PROFILE.name}.`, experience: 'Learning through building.', skills: 'The tools behind the work.',
    projects: PROJECTS[projectIndex].title, cloud: 'Built. Deployed. Maintained.', contact: 'Good things start with hello.',
  }
  const x = zone.position[0] + Math.sin(zone.yaw) * 7
  const z = zone.position[2] + Math.cos(zone.yaw) * 7
  return (
    <group position={[x, 4, z]} rotation={[0, zone.yaw, 0]} ref={group}>
      <RoundedBox args={[10.65, 6.4, 0.24]} radius={0.23} smoothness={4} castShadow receiveShadow><meshStandardMaterial color={PAPER} roughness={0.9} /></RoundedBox>
      <mesh position={[-5.12, 0, 0.13]}><planeGeometry args={[0.07, 5.45]} /><meshBasicMaterial color={zone.accent} /></mesh>
      <Copy position={[-4.65, 2.83, 0.18]} size={0.15} color={zone.accent} heading>{zone.eyebrow}</Copy>
      <Copy position={[-4.65, 2.34, 0.18]} width={8.5} size={0.43} heading>{heading[zone.id]}</Copy>
      <Button3D position={[4.6, 2.65, 0.23]} width={0.55} height={0.5} onClick={() => useGameStore.getState().closeZone()} size={0.26}>×</Button3D>
      <Rule y={1.72} />
      {zone.id === 'about' && <AboutPanel />}
      {zone.id === 'experience' && <ExperiencePanel />}
      {zone.id === 'skills' && <SkillsPanel />}
      {zone.id === 'projects' && <ProjectsPanel index={projectIndex} onStep={step} />}
      {zone.id === 'cloud' && <CloudPanel />}
      {zone.id === 'contact' && <ContactPanel />}
    </group>
  )
}

export default function Exhibits() {
  const activeZone = useGameStore((state) => state.activeZone)
  const nearbyZone = useGameStore((state) => state.nearbyZone)
  const target = useGameStore((state) => state.travelTarget)
  const visited = useGameStore((state) => state.visited)
  const phase = useGameStore((state) => state.phase)
  const zone = ZONES.find((item) => item.id === activeZone)
  return (
    <>
      {phase === 'playing' && !activeZone && ZONES.map((item) => <Marker key={item.id} zone={item} nearby={nearbyZone === item.id} target={target === item.id} visited={visited.includes(item.id)} />)}
      {zone && <ExhibitBoard key={zone.id} zone={zone} />}
    </>
  )
}
