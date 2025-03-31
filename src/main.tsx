import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './hexagon.scss'
import App from './App.tsx'
import { UserProvider } from './contexts/UserContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>,
)
