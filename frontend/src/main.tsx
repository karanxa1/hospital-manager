import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.documentElement
const storedTheme = localStorage.getItem('theme')
const theme = storedTheme === 'light' ? 'light' : 'dark'
root.classList.toggle('dark', theme === 'dark')
root.style.colorScheme = theme

createRoot(document.getElementById('root')!).render(
  <App />,
)
