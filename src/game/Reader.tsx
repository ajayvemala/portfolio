import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { CERTIFICATIONS, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILL_GROUPS, ZONES, type ZoneId } from './data'

/** An optional accessibility view of the same content displayed in the world. */
export default function Reader({ zone, close }: { zone: ZoneId; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    ref.current?.focus()
    return () => previous?.focus()
  }, [])
  return <div className="menu-backdrop"><div ref={ref} tabIndex={-1} className="menu-card reader-card" role="dialog" aria-modal="true" aria-labelledby="reader-title" onKeyDown={e => {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    if (e.key === 'Tab') {
      const nodes = ref.current?.querySelectorAll<HTMLElement>('button,a[href]')
      if (!nodes?.length) return
      if (e.shiftKey && (document.activeElement === nodes[0] || document.activeElement === ref.current)) { e.preventDefault(); nodes[nodes.length - 1].focus() }
      else if (!e.shiftKey && document.activeElement === nodes[nodes.length - 1]) { e.preventDefault(); nodes[0].focus() }
    }
  }}>
    <div className="menu-heading"><div><span className="eyebrow">ACCESSIBLE READING VIEW</span><h2 id="reader-title">{ZONES.find(z => z.id === zone)?.shortName}</h2></div><button className="icon-button" aria-label="Close reading view" onClick={close}><X size={20} /></button></div>
    {zone === 'about' && <><h3>{PROFILE.name}</h3><p>{PROFILE.role}</p><p>{PROFILE.intro}</p><p>{PROFILE.location}</p><h3>Education</h3><p>{EDUCATION.degree}<br />{EDUCATION.school}<br />{EDUCATION.period}</p></>}
    {zone === 'experience' && <>{EXPERIENCE.map(e => <section key={e.period}><small>{e.period}</small><h3>{e.role}</h3><strong>{e.company}</strong><p>{e.description}</p></section>)}<h3>Certifications</h3><ul>{CERTIFICATIONS.map(c => <li key={c}>{c}</li>)}</ul></>}
    {zone === 'skills' && SKILL_GROUPS.map(g => <section key={g.title}><h3>{g.title}</h3><p>{g.items.join(' · ')}</p></section>)}
    {(zone === 'projects' || zone === 'cloud') && PROJECTS.filter(p => zone === 'projects' || p.id === 'azure-hosting').map(p => <section key={p.id}><h3>{p.title}</h3><small>{p.subtitle}</small><p>{p.description}</p><p>{p.contribution}</p><p className="reader-stack">{p.stack.join(' · ')}</p></section>)}
    {zone === 'contact' && <><h3>Let's build something useful.</h3><p>{PROFILE.location}</p><p><a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a></p><p><a href={`tel:${PROFILE.phone.replace(/\s/g, '')}`}>{PROFILE.phone}</a></p><p><a href={PROFILE.linkedin} target="_blank" rel="noreferrer">Connect on LinkedIn ↗</a></p><p><a href={PROFILE.resume} download>Download résumé ↗</a></p></>}
  </div></div>
}
