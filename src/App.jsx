import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown, ArrowUp, ArrowUpRight, Cloud, Code2, Database, Globe2, Menu,
  RotateCcw, X,
} from 'lucide-react'
import DrivingScene from './DrivingScene.jsx'

const navItems = [
  ['about', 'About'],
  ['experience', 'Experience'],
  ['work', 'Selected work'],
  ['stack', 'Stack'],
]

const projects = [
  {
    id: 'upanaya', number: '01', category: 'Web + mobile', type: 'HUMAN RESOURCES',
    title: 'Upanaya', descriptor: 'HRMS application',
    description: 'Employee management and HR workflows across web and mobile interfaces.',
    contribution: 'Contributed reusable UI, responsive screens, navigation, and API integration for employee management workflows.',
    stack: ['React Native CLI', 'React.js', 'REST APIs'], visual: 'hrms',
  },
  {
    id: 'kalyana', number: '02', category: 'Mobile', type: 'MATRIMONY',
    title: 'Kalyana Prapthirasthu', descriptor: 'Matrimony application',
    description: 'A cross-platform matchmaking app with responsive interfaces and API integration.',
    contribution: 'Developed mobile interfaces and reusable components, and worked on navigation, responsive UI, and backend API integration.',
    stack: ['React Native CLI'], visual: 'matrimony',
  },
  {
    id: 'sms', number: '03', category: 'Web', type: 'EDUCATION',
    title: 'SMS', descriptor: 'School Management System',
    description: 'Responsive dashboards, forms, and tables for school management workflows.',
    contribution: 'Built responsive interfaces and integrated frontend components with backend REST APIs.',
    stack: ['React.js', 'Node.js', 'Express.js'], visual: 'school',
  },
  {
    id: 'samskruti', number: '04', category: 'Web', type: 'E-COMMERCE',
    title: 'Samskruti', descriptor: 'E-commerce application',
    description: 'A responsive commerce experience with product components and API-driven functionality.',
    contribution: 'Developed responsive e-commerce interfaces and reusable product components.',
    stack: ['React.js', 'Node.js'], visual: 'commerce',
  },
  {
    id: 'kanchi', number: '05', category: 'Web', type: 'BUSINESS WEBSITE',
    title: 'Sri Kanchi Banarasi Silks', descriptor: 'Business website',
    description: 'A responsive business website designed to work across device sizes.',
    contribution: 'Worked on responsive, user-friendly interfaces and reusable React components.',
    stack: ['React.js'], visual: 'silks',
  },
]

const skillGroups = [
  { number: '01', title: 'Frontend & mobile', icon: Code2, items: ['React.js', 'React Native CLI', 'JavaScript ES6+', 'HTML5', 'CSS3', 'JSX'] },
  { number: '02', title: 'Backend & data', icon: Database, items: ['Node.js', 'Express.js', 'REST APIs', 'Axios', 'MongoDB', 'PostgreSQL'] },
  { number: '03', title: 'Cloud & delivery', icon: Cloud, items: ['Microsoft Azure', 'Azure Virtual Machines', 'Ubuntu Linux', 'Nginx', 'PM2', 'SSL / HTTPS'] },
  { number: '04', title: 'Everyday tools', icon: Globe2, items: ['Git', 'GitHub', 'VS Code', 'Postman', 'SSH'] },
]

function Eyebrow({ children, className = '' }) {
  return <span className={`eyebrow ${className}`}>{children}</span>
}

function SectionLabel({ number, children, note }) {
  return (
    <div className="section-label flex items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
      <Eyebrow>{number} / {children}</Eyebrow>
      {note && <span className="mono hidden text-right text-[9px] text-[var(--muted)] sm:block">{note}</span>}
    </div>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id))
    }, { rootMargin: '-35% 0px -58% 0px' })
    navItems.forEach(([id]) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
      observer.disconnect()
    }
  }, [])

  const close = () => setOpen(false)
  return (
    <>
      <header className={`site-header fixed inset-x-0 top-0 z-50 flex h-[76px] items-center justify-between px-6 transition-all duration-300 md:px-[7vw] ${scrolled ? 'is-scrolled' : ''}`}>
        <a href="#home" className="wordmark flex items-center gap-3" onClick={close} aria-label="Ajay Vemala home">
          <span className="wordmark-mark">A<span>.</span></span><span className="wordmark-name">AJAY VEMALA</span>
        </a>
        <nav aria-label="Main navigation" className={`${open ? 'nav-open' : ''} nav-panel fixed inset-0 flex flex-col items-start justify-center gap-7 px-[12vw] md:static md:flex-row md:items-center md:gap-9 md:p-0`}>
          {navItems.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={close} aria-current={active === id ? 'location' : undefined} className="nav-link">{label}</a>
          ))}
          <a href="mailto:ajayvemala@gmail.com" className="nav-contact" onClick={close}>Letâ€™s talk <ArrowUpRight size={15} /></a>
        </nav>
        <button type="button" className="menu-button relative z-[60] grid size-11 place-items-center rounded-full md:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>
      <ScrollProgress />
    </>
  )
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight
      setProgress(range > 0 ? window.scrollY / range * 100 : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])
  return <div className="scroll-progress fixed left-0 top-0 z-[70] h-0.5" style={{ width: `${progress}%` }} aria-hidden="true" />
}

function Hero() {
  const [activeProject, setActiveProject] = useState(null)
  const [nearby, setNearby] = useState(null)
  const controls = useRef({ forward: false, reverse: false, left: false, right: false })
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && setActiveProject(null)
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])
  return (
    <section id="home" className="world-hero relative h-[100svh] min-h-[680px] overflow-hidden">
      <DrivingScene projects={projects} controls={controls} paused={Boolean(activeProject)} onSelect={setActiveProject} onNearby={setNearby} />
      <div className="world-vignette absolute inset-0" aria-hidden="true" />
      <div className="world-hud section-shell absolute inset-x-0 bottom-[16%] z-10 flex flex-col items-start md:bottom-[15%]">
        <Eyebrow className="mb-5 text-white/70"><span className="status-dot" /> FULL STACK & MOBILE DEVELOPER · HYDERABAD</Eyebrow>
        <h1 className="world-title font-display text-[clamp(3.8rem,10vw,8rem)] font-medium leading-[.88] tracking-[-.085em]">Ajay<br /><span>Vemala<span className="text-[var(--gold)]">.</span></span></h1>
        <p className="mt-6 max-w-[430px] text-sm leading-6 text-white/75">MERN stack and React Native developer building thoughtful web and mobile products, from responsive interfaces to Azure deployments.</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4"><a className="button button-light" href="#work">Explore my work <ArrowDown size={15} /></a><a className="text-link" href="/assets/ajay-vemala-resume.pdf" download>Download résumé <ArrowUpRight size={14} /></a></div>
      </div>
      <div className="world-instructions absolute right-[7vw] top-[112px] z-10 hidden md:block"><Eyebrow className="text-white/55">A PORTFOLIO YOU CAN DRIVE</Eyebrow><p className="mt-3 text-xs text-white/75"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to drive</p><p className="mt-2 text-xs text-white/55"><kbd>Shift</kbd> boost · <kbd>Enter</kbd> inspect · <kbd>R</kbd> reset</p></div>
      <div className="world-status absolute bottom-7 left-[7vw] z-10 hidden md:block"><Eyebrow className="text-white/50">CURRENT ROLE · AUG 2026 — PRESENT</Eyebrow><p className="mt-2 text-xs text-white/85">MERN Stack & Mobile Application Developer · Luvetha Tech</p></div>
      {nearby && !activeProject && <button className="nearby-prompt absolute bottom-[104px] left-1/2 z-20 -translate-x-1/2" onClick={() => setActiveProject(nearby)}><span className="status-dot" /> Press Enter to explore <strong>{nearby.title}</strong></button>}
      <TouchControls controls={controls} />
      {activeProject && <div className="project-dialog-backdrop absolute inset-0 z-[80] grid place-items-center p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProject(null) }}><section role="dialog" aria-modal="true" aria-labelledby="world-project-title" className="project-dialog relative w-full max-w-xl p-7 md:p-10"><button type="button" onClick={() => setActiveProject(null)} className="project-dialog-close absolute right-5 top-5 grid size-10 place-items-center rounded-full" aria-label="Close project details"><X size={18} /></button><Eyebrow>{activeProject.number} / {activeProject.type}</Eyebrow><h2 id="world-project-title" className="mt-5 max-w-[80%] font-display text-3xl font-medium tracking-[-.06em] md:text-4xl">{activeProject.title}</h2><p className="mt-2 font-serif text-xl italic text-black/55">{activeProject.descriptor}</p><p className="mt-7 text-sm leading-7 text-black/65">{activeProject.description}</p><div className="mt-6 border-l border-[var(--gold-dark)] pl-4"><Eyebrow>MY CONTRIBUTION</Eyebrow><p className="mt-2 text-xs leading-6 text-black/60">{activeProject.contribution}</p></div><div className="mt-6 flex flex-wrap gap-2">{activeProject.stack.map((item) => <span className="small-chip" key={item}>{item}</span>)}</div><a href="#work" onClick={() => setActiveProject(null)} className="mt-8 inline-flex items-center gap-2 text-xs">See selected work <ArrowUpRight size={14} /></a></section></div>}
    </section>
  )
}

function TouchControls({ controls }) {
  const bind = (key) => ({ onPointerDown: (event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); controls.current[key] = true }, onPointerUp: () => { controls.current[key] = false }, onPointerCancel: () => { controls.current[key] = false } })
  return <div className="world-mobile-controls absolute bottom-5 right-5 z-20 md:hidden" aria-label="Driving controls"><div className="mobile-steering"><button aria-label="Steer left" {...bind('left')}>L</button><button aria-label="Steer right" {...bind('right')}>R</button></div><div className="mobile-pedals"><button aria-label="Reverse" {...bind('reverse')}>-</button><button aria-label="Accelerate" {...bind('forward')}>GO</button></div></div>
}
function About() {
  return (
    <section className="about-section bg-[var(--paper)] text-[var(--ink)]">
      <div id="about" className="about section-shell py-24 md:py-32">
        <SectionLabel number="01" note="BUILD Â· SHIP Â· IMPROVE">A LITTLE ABOUT ME</SectionLabel>
        <div className="grid gap-9 pt-14 md:grid-cols-[1.2fr_.8fr] md:items-center md:gap-[9vw] md:pt-24">
          <h2 data-reveal className="reveal section-title text-[clamp(3rem,7vw,5.6rem)] leading-[.98] tracking-[-.075em]">I like being close to the <em>whole product.</em></h2>
          <div data-reveal className="reveal max-w-[430px] text-[13px] leading-7 text-black/60 md:text-sm">
            <p>From responsive screens and reusable components to REST APIs, data, and deployment â€” I enjoy joining the dots that make an application useful.</p>
            <p className="mt-4">At Luvetha Tech Solutions, Iâ€™ve contributed to HRMS, school management, and e-commerce products across web and mobile. I bring a practical, hands-on approach to building and supporting software that people rely on.</p>
            <a href="#experience" className="about-link mt-7 inline-flex items-center gap-2 border-b border-black/25 pb-2 text-xs">A closer look at my journey <ArrowDown size={14} /></a>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-6 border-t border-black/15 pt-6 sm:grid-cols-4 sm:gap-4 md:mt-24">
          <Stat number="02" label={<>ROLES AT<br />LUVETHA TECH</>} />
          <Stat number="05" label={<>FEATURED<br />PROJECTS</>} />
          <Stat number="MERN" label={<>FULL STACK<br />DEVELOPMENT</>} />
          <p className="self-center font-serif text-sm italic leading-5 text-black/55 sm:justify-self-end">Web products. Mobile experiences.<br />Real-world delivery.</p>
        </div>
      </div>
    </section>
  )
}

function Stat({ number, suffix, label }) {
  return <div className="flex items-center gap-3"><span className={`font-display font-medium tracking-[-.08em] ${number.length > 2 ? 'text-2xl sm:text-3xl' : 'text-4xl'}`}>{number}<span className="text-[var(--gold-dark)]">{suffix}</span></span><span className="mono text-[8px] leading-[1.65] tracking-[.06em] text-black/50">{label}</span></div>
}

function Experience() {
  const items = [
    {
      date: 'AUG 2026 â€” PRESENT', type: 'FULL TIME', role: 'MERN Stack & Mobile Application Developer',
      company: 'Luvetha Tech Solutions',
      summary: 'Building and maintaining full stack web applications and cross-platform mobile experiences. Contributing to HR workflows, API integrations, Azure deployments, and the server setup behind live applications.',
      skills: ['React.js', 'Node.js', 'React Native', 'Azure'],
    },
    {
      date: 'FEB 2026 â€” JUL 2026', type: 'INTERNSHIP', role: 'MERN Stack & Mobile Application Developer',
      company: 'Luvetha Tech Solutions',
      summary: 'Developed React Native screens and reusable components; contributed to Upanaya and Kalyana Prapthirasthu, and built responsive web interfaces for school management and e-commerce products.',
      skills: ['React Native CLI', 'React.js', 'REST APIs'],
    },
    {
      date: 'EARLIER EXPERIENCE', type: '', role: 'Frontend Developer Internship',
      company: 'AYSQO Technologies Pvt. Ltd.', summary: 'Frontend development using React.js.', skills: ['React.js'],
    },
  ]
  return (
    <section id="experience" className="section-shell py-24 md:py-32">
      <SectionLabel number="02" note="HYDERABAD, INDIA">THE JOURNEY</SectionLabel>
      <div className="grid gap-12 pt-14 md:grid-cols-[.75fr_1fr] md:gap-[10vw] md:pt-24">
        <div className="md:sticky md:top-32 md:h-fit"><h2 className="section-title text-[clamp(3.2rem,6vw,5rem)] leading-[.98] tracking-[-.075em]">Learning by<br /><em>making.</em></h2><p className="mt-5 max-w-[250px] text-[13px] leading-6 text-black/55">Growing from mobile interfaces to full product delivery.</p></div>
        <div className="timeline relative border-l border-white/15 pl-7 sm:pl-10">
          {items.map((item, index) => <article data-reveal className="reveal timeline-entry relative pb-12 last:pb-0" key={item.date}>
            <span className="timeline-pin" />
            <div className="flex items-center justify-between gap-3"><Eyebrow>{item.date}</Eyebrow>{item.type && <span className={`timeline-tag ${index ? 'muted' : ''}`}>{item.type}</span>}</div>
            <h3 className="mt-5 max-w-[490px] font-display text-[22px] font-medium leading-tight tracking-[-.045em] sm:text-[26px]">{item.role}</h3>
            <p className="mt-2 text-xs text-black/75">{item.company}</p>
            <p className="mt-4 max-w-[550px] text-xs leading-6 text-black/55">{item.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">{item.skills.map((skill) => <span className="small-chip" key={skill}>{skill}</span>)}</div>
          </article>)}
          <div className="timeline-education relative mt-10 border-t border-white/10 pt-7">
            <Eyebrow>EDUCATION Â· 2019 â€” 2022</Eyebrow>
            <h3 className="mt-4 font-display text-lg font-medium">Bachelor of Science in Computer Science</h3>
            <p className="mt-2 text-xs text-black/55">Indian School of Business Management and Administration</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProjectArtwork({ variant }) {
  return (
    <div className={`project-art art-${variant}`} aria-hidden="true">
      <span className="project-art-index">{variant === 'hrms' ? 'U' : variant === 'matrimony' ? 'K' : variant === 'school' ? 'S' : variant === 'commerce' ? 'S' : 'SK'}</span>
      <span className="project-art-type">{variant === 'hrms' ? 'PEOPLE OPERATIONS' : variant === 'matrimony' ? 'MOBILE EXPERIENCE' : variant === 'school' ? 'EDUCATION SYSTEMS' : variant === 'commerce' ? 'COMMERCE' : 'CRAFT & RETAIL'}</span>
    </div>
  )
}

function Projects() {
  const filters = ['All', 'Web', 'Mobile', 'Web + mobile']
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const filteredProjects = projects.filter((project) => filter === 'All' || project.category.toLowerCase() === filter.toLowerCase())
  return (
    <section id="work" className="work-section bg-[#191a17] py-24 md:py-32">
      <div className="section-shell">
        <SectionLabel number="03" note="PRODUCTS Iâ€™VE HELPED BUILD">SELECTED WORK</SectionLabel>
      <div data-reveal className="reveal mt-14 flex flex-col justify-between gap-7 md:mt-20 md:flex-row md:items-end">
          <h2 className="section-title text-[clamp(3rem,6vw,5rem)] leading-[.98] tracking-[-.075em]">Useful things,<br /><em>made together.</em></h2>
          <p className="max-w-[290px] text-xs leading-6 text-black/55">Projects shaped around real workflows â€” from HR and school operations to mobile and commerce.</p>
        </div>
        <div className="mt-9 flex flex-wrap gap-2" role="group" aria-label="Filter projects">
          {filters.map((item) => <button type="button" key={item} onClick={() => { setFilter(item); setExpanded(null) }} className={`filter-chip ${filter === item ? 'selected' : ''}`} aria-pressed={filter === item}>{item}</button>)}
        </div>
        <div className="project-grid mt-6 grid grid-cols-1 gap-x-6 gap-y-11 md:grid-cols-2">
          {filteredProjects.map((project) => <ProjectCard project={project} key={project.id} expanded={expanded === project.id} onToggle={() => setExpanded(expanded === project.id ? null : project.id)} />)}
        </div>
        <p className="mt-9 text-center font-mono text-[8px] leading-5 tracking-[.06em] text-black/45">CONTRIBUTIONS SHOWN REFLECT MY ROLE WITHIN COLLABORATIVE PROJECT TEAMS.</p>
      </div>
    </section>
  )
}

function ProjectCard({ project, expanded, onToggle }) {
  return (
    <article data-reveal className="reveal project-card group min-w-0">
      <ProjectArtwork variant={project.visual} />
      <div className="flex items-start justify-between gap-4 py-5">
        <div>
          <Eyebrow>{project.number} / {project.type}</Eyebrow>
          <h3 className="mt-2 font-display text-xl font-medium tracking-[-.04em] transition-colors group-hover:text-[var(--gold-dark)]">{project.title} <span className="font-serif text-lg font-normal text-black/55">â€” {project.descriptor}</span></h3>
          <p className="mt-2 max-w-[460px] text-[11px] leading-5 text-black/55">{project.description}</p>
        </div>
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} details for ${project.title}`} className={`project-expand mt-5 grid size-9 shrink-0 place-items-center rounded-full transition-transform ${expanded ? 'rotate-45' : ''}`}><ArrowUpRight size={17} /></button>
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-2 border-t border-black/15 pt-3 font-mono text-[7px] tracking-[.08em] text-black/50"><span>MY CONTRIBUTION</span><span>{project.stack.join(' Â· ').toUpperCase()}</span></div>
      {expanded && <div className="project-details mt-4 grid gap-4 border-l border-[var(--gold-dark)] pl-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><Eyebrow>MY ROLE</Eyebrow><p className="mt-2 max-w-[500px] text-xs leading-6 text-black/65">{project.contribution}</p></div><div className="flex flex-wrap gap-2 sm:max-w-[200px] sm:justify-end">{project.stack.map((item) => <span className="small-chip" key={item}>{item}</span>)}</div></div>}
    </article>
  )
}

function Stack() {
  return (
    <section id="stack" className="section-shell py-24 md:py-32">
      <SectionLabel number="04" note="PRACTICAL, HANDS ON">TOOLS OF THE TRADE</SectionLabel>
      <div className="grid gap-12 pt-14 md:grid-cols-[.8fr_1fr] md:gap-[10vw] md:pt-24">
        <div><h2 className="section-title text-[clamp(3rem,6vw,5rem)] leading-[.98] tracking-[-.075em]">The stack<br />behind the <em>work.</em></h2><p className="mt-5 text-xs text-black/55">Tools I use to build, connect, and keep products running.</p><div className="mt-12 flex items-center gap-2 text-[var(--gold-dark)]"><span className="font-display text-2xl font-semibold tracking-[-.08em]">AV</span><i className="h-px w-10 bg-black/20" /><i className="h-px w-10 bg-black/20" /><i className="h-px w-6 bg-[var(--gold-dark)]" /></div></div>
        <div className="divide-y divide-black/15 border-y border-black/15">
          {skillGroups.map(({ number, title, icon: Icon, items }) => <div className="grid grid-cols-[28px_1fr] gap-3 py-6" key={number}>
            <span className="mono pt-1 text-[9px] text-[var(--gold)]">{number}</span>
            <div><h3 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.12em] text-black/70"><Icon size={13} strokeWidth={1.5} />{title}</h3><div className="mt-4 flex flex-wrap gap-2">{items.map((item) => <span className="skill-chip" key={item}>{item}</span>)}</div></div>
          </div>)}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="contact-section relative overflow-hidden bg-[#ddd4bd] text-[#20241c]">
      <div className="section-shell relative z-10 pt-20 md:pt-28">
        <SectionLabel number="05" note="HYDERABAD Â· INDIA">GET IN TOUCH</SectionLabel>
        <div className="pt-24 md:pt-32">
          <Eyebrow className="text-black/50">HAVE A GOOD ONE IN MIND?</Eyebrow>
          <h2 className="contact-title mt-5 text-[clamp(5rem,13vw,10.5rem)] font-medium leading-[.82] tracking-[-.1em]">Letâ€™s make<br />it <em>work.</em></h2>
          <a href="mailto:ajayvemala@gmail.com" className="contact-email mt-8 inline-flex items-center gap-3 border-b border-white/35 pb-2 text-sm">ajayvemala@gmail.com <ArrowUpRight size={16} /></a>
        </div>
        <div className="mt-12 flex max-w-[730px] flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <a href="mailto:ajayvemala@gmail.com" className="button button-light magnetic">Start a conversation <ArrowUpRight size={15} /></a>
          <div className="max-w-[280px] text-[11px] leading-5 text-white/65"><p>Have a product, a problem, or an idea worth exploring? Iâ€™m always up for a thoughtful conversation.</p><a href="tel:+919177611848" className="mt-2 inline-block border-b border-white/30 pb-0.5 font-mono text-[10px]">+91 91776 11848</a></div>
        </div>
        <footer className="mt-20 grid grid-cols-2 items-center gap-5 border-t border-black/25 py-6 sm:mt-28 sm:grid-cols-4">
          <a href="#home" className="wordmark flex items-center gap-2"><span className="wordmark-mark">A<span>.</span></span><span className="wordmark-name">AJAY VEMALA</span></a>
          <span className="mono justify-self-end text-right text-[7px] tracking-[.08em] text-white/50 sm:justify-self-start">BUILT WITH CURIOSITY Â· HYDERABAD, INDIA</span>
          <a href="#home" className="mono text-[8px] tracking-[.08em] text-white/70">BACK TO TOP â†‘</a>
          <span className="mono justify-self-end text-[8px] text-white/55">Â© 2026</span>
        </footer>
      </div>
    </section>
  )
}

export default function App() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        currentObserver.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' })
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Stack />
        <Contact />
      </main>
      <BackToTop />
    </>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 680)
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])
  return visible ? <a className="back-to-top fixed bottom-5 right-5 z-30 grid size-11 place-items-center rounded-full" href="#home" aria-label="Back to top"><ArrowUp size={17} /></a> : null
}
