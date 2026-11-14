import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { pripraviAnalitiko } from './analitika'
import { jezik, naloziSlovar } from './besede'
import './index.css'

document.documentElement.lang = jezik
pripraviAnalitiko()
// Slovar drugega jezika je svoj kos: pred prvim izrisom, da stran ne utripne v slovenščini.
void naloziSlovar().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  ),
)
