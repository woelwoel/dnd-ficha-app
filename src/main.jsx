import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Tema v2 GLOBAL: tokens + ponte precisam estar no bundle inicial (não no
// chunk lazy da ficha), senão login/lista não recebem o tema antes de abrir
// uma ficha. Ver src/theme/.
import './theme/tokens.css'
import './theme/legacy-bridge.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
