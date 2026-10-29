import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { pripraviAnalitiko } from './analitika'
import { jezik } from './besede'
import './index.css'

document.documentElement.lang = jezik
pripraviAnalitiko()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
