import { createRoot } from 'react-dom/client'
import './styles/hexagon.scss'
import './styles/index.css'
import App from './App.tsx'
import { UserProvider } from './contexts/UserContext.tsx'

createRoot(document.getElementById('root')!).render(
    <UserProvider>
      <App />
    </UserProvider>,
)
