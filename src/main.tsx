import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './styles/globals.css'
import { devInitLayoutObserver, devInitMutationObserver } from './lib/devlog'

const root = document.getElementById('root')!

devInitLayoutObserver()
devInitMutationObserver(root)

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
