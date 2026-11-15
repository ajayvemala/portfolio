import { createRoot } from 'react-dom/client'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/space-grotesk/latin-500.css'
import App from './App.tsx'
import './game.css'

createRoot(document.getElementById('root')!).render(<App />)
