import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const storedTheme = localStorage.getItem('theme')
if (storedTheme === 'light') document.documentElement.classList.remove('dark')
else document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(
  <App />,
)
