export type ZoneId = 'about' | 'experience' | 'skills' | 'projects' | 'cloud' | 'contact'
export type Vec3 = [number, number, number]

export const ZONES: {
  id: ZoneId
  name: string
  shortName: string
  eyebrow: string
  accent: string
  position: Vec3
  marker: Vec3
  yaw: number
  summary: string
}[] = [
  {
    id: 'about', name: 'The Studio', shortName: 'About', eyebrow: '01 / ABOUT ME',
    accent: '#f28c45', position: [-22, 0, 15], marker: [-22, 0, 25], yaw: 0,
    summary: 'Meet Ajay. Web products, mobile experiences, and the infrastructure behind them.',
  },
  {
    id: 'experience', name: 'Journey House', shortName: 'Experience', eyebrow: '02 / MY JOURNEY',
    accent: '#dba65e', position: [-47, 0, -7], marker: [-36, 0, -7], yaw: Math.PI / 2,
    summary: 'From a development internship to building and supporting full-stack applications.',
  },
  {
    id: 'skills', name: 'Technology Garden', shortName: 'Skills', eyebrow: '03 / MY TOOLKIT',
    accent: '#5daba0', position: [-20, 0, -36], marker: [-20, 0, -25], yaw: 0,
    summary: 'Explore the tools I use for frontend, mobile, backend, databases, and deployment.',
  },
  {
    id: 'projects', name: 'Project Pavilion', shortName: 'Projects', eyebrow: '04 / SELECTED WORK',
    accent: '#7787ba', position: [22, 0, -36], marker: [22, 0, -25], yaw: 0,
    summary: 'Discover my contributions to HR, matrimony, education, commerce, and business products.',
  },
  {
    id: 'cloud', name: 'Cloud Station', shortName: 'Cloud', eyebrow: '05 / DEPLOYMENT',
    accent: '#6fa9be', position: [47, 0, 8], marker: [36, 0, 8], yaw: -Math.PI / 2,
    summary: 'Follow an application through Azure infrastructure, Nginx, PM2, and its database.',
  },
  {
    id: 'contact', name: 'Hello House', shortName: 'Contact', eyebrow: '06 / SAY HELLO',
    accent: '#d98d85', position: [20, 0, 38], marker: [20, 0, 25], yaw: Math.PI,
    summary: 'Start a conversation, connect on LinkedIn, or take a copy of my resume.',
  },
]

// Professional facts and contact links come from ajay_vemala-resume.pdf.
// Do not add inferred project URLs, technologies, dates, or impact metrics.
export const PROFILE: {
  name: string
  role: string
  intro: string
  location: string
  email: string
  phone: string
  resume: string
  linkedin?: string
  github?: string
} = {
  name: 'Ajay Vemala',
  role: 'MERN Stack, React Native & Cloud Deployment Developer',
  intro: 'I build responsive web applications, cross-platform mobile experiences, and database-driven systems. My work connects reusable interfaces and REST APIs with practical deployment on Azure, from HR and school management to commerce and business applications.',
  location: 'Hyderabad, Telangana, India',
  email: 'ajayvemala@gmail.com',
  phone: '+91 91776 11848',
  resume: '/assets/ajay-vemala-resume.pdf',
  linkedin: 'https://linkedin.com/in/ajay-vemala',
}

export type Project = {
  id: string
  title: string
  subtitle: string
  description: string
  contribution: string
  stack: string[]
  url?: string
  screenshots?: string[]
}

export const PROJECTS: Project[] = [
  {
    id: 'upanaya',
    title: 'Upanaya HRMS',
    subtitle: 'Employee management / Web + mobile',
    description: 'An HRMS application with web and mobile interfaces for employee management and HR workflows.',
    contribution: 'Worked on application interfaces, reusable components, responsive screens, navigation, and API integration.',
    stack: ['React Native CLI', 'React.js', 'APIs'],
  },
  {
    id: 'kalyana',
    title: 'Kalyana Prapthirasthu',
    subtitle: 'Matrimony / Mobile application',
    description: 'A matrimony application built with React Native CLI, with responsive mobile interfaces and backend API integration.',
    contribution: 'Developed mobile screens and reusable components, and implemented navigation, responsive UI, and backend API integration.',
    stack: ['React Native CLI'],
  },
  {
    id: 'sms',
    title: 'SMS Management System',
    subtitle: 'School management / Web application',
    description: 'A School Management System with interfaces for dashboards, forms, tables, and application workflows.',
    contribution: 'Developed school management interfaces and connected frontend components to backend REST APIs.',
    stack: ['React.js', 'Node.js', 'Express.js'],
  },
  {
    id: 'samskruti',
    title: 'Samskruti E-commerce',
    subtitle: 'Commerce / Web application',
    description: 'An e-commerce application with responsive interfaces, product components, and API-driven functionality.',
    contribution: 'Developed responsive e-commerce interfaces and product components, and worked on API-driven functionality.',
    stack: ['React.js', 'Node.js'],
  },
  {
    id: 'kanchi',
    title: 'Sri Kanchi Banarasi Silks',
    subtitle: 'Retail / Business website',
    description: 'A business website with responsive, user-friendly interfaces across device sizes.',
    contribution: 'Developed reusable React components and responsive business website layouts for different devices.',
    stack: ['React.js'],
  },
  {
    id: 'azure-hosting',
    title: 'Website Deployment & Hosting',
    subtitle: 'Cloud / Application delivery',
    description: 'Deployment and hosting of multiple web applications on Microsoft Azure Virtual Machines.',
    contribution: 'Configured Ubuntu hosting environments, Nginx reverse proxy, PM2, domains, and SSL. Performed basic server monitoring and deployment troubleshooting.',
    stack: ['Microsoft Azure', 'Ubuntu', 'Nginx', 'PM2'],
  },
]

export const EXPERIENCE: {
  period: string
  role: string
  company: string
  description: string
}[] = [
  {
    period: 'Aug 2026 - Present',
    role: 'MERN Stack & Mobile Application Developer',
    company: 'Luvetha Tech Solutions',
    description: 'Full-time developer building web and mobile applications, reusable UI, and REST API integrations. Worked on HRMS employee, attendance, leave, and payroll-related features. Deployed applications on Azure VMs using Ubuntu, Nginx, PM2, domains, and SSL, with monitoring and troubleshooting.',
  },
  {
    period: 'Feb 2026 - Jul 2026',
    role: 'MERN Stack & Mobile Application Developer Intern',
    company: 'Luvetha Tech Solutions',
    description: 'Built React Native screens and reusable components for Upanaya and Kalyana Prapthirasthu. Developed responsive React interfaces for SMS, Samskruti, and Sri Kanchi Banarasi Silks. Integrated REST APIs and collaborated using Git and GitHub.',
  },
]

export const SKILL_GROUPS: { title: string; items: string[] }[] = [
  { title: 'Frontend', items: ['React.js', 'JavaScript ES6+', 'HTML5', 'CSS3', 'JSX', 'Responsive UI'] },
  { title: 'Mobile', items: ['React Native CLI', 'Mobile App Development', 'Navigation', 'State Management'] },
  { title: 'Backend', items: ['Node.js', 'Express.js', 'REST APIs', 'Axios', 'CRUD Operations'] },
  { title: 'Databases', items: ['MongoDB', 'PostgreSQL'] },
  { title: 'Cloud & hosting', items: ['Microsoft Azure', 'Azure Virtual Machines', 'Ubuntu Linux', 'Nginx', 'PM2', 'SSH', 'DNS', 'SSL / HTTPS'] },
  { title: 'Delivery & tools', items: ['Git', 'GitHub', 'VS Code', 'Postman', 'Server Monitoring', 'Log Management', 'Troubleshooting'] },
]

export const EDUCATION = {
  degree: 'Bachelor of Science in Computer Science',
  school: 'Indian School of Business Management and Administration',
  period: '2019 - 2022',
}

export const CERTIFICATIONS = [
  'MERN Stack & React Native CLI Developer Internship - Luvetha Tech Solutions',
  'Frontend Development Internship (React.js) - AYSQO Technologies Pvt Ltd.',
  'Java Full Stack - 360 Digrii Institute, SR Nagar',
]

export const LANGUAGES = ['English', 'Hindi', 'Telugu']
