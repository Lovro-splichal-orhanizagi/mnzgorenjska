import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { jezikSlovarja, naloziSlovar, t } from './i18n'
import { pripraviNativno } from './lib/platforma'
import { pripraviOta } from './lib/ota'
import { pripraviAnalitiko } from './lib/analitika'

pripraviNativno()
pripraviOta()
pripraviAnalitiko()

// Po objavi nove različice starih kosov (strani, slovarji) na strežniku ni
// več: zavihek, odprt pred objavo, ob prvem prehodu dobi 404. Stran se naloži
// znova, a največ enkrat na minuto, da pokvarjen kos ne vrti zanke.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem('slff-ponovno') || 0) < 60_000) return
    sessionStorage.setItem('slff-ponovno', String(Date.now()))
  } catch {
    return
  }
  e.preventDefault()
  location.reload()
})

// Slovar izbranega jezika pride pred prvim izrisom, sicer bi stran za hip
// pokazala slovenščino (slovenski je že v svežnju, zanj ni čakanja).
void naloziSlovar().then(() => {
  // index.html je slovenski (to vidijo iskalniki brez JS in kartice ob
  // deljenju). Drug jezik zamenja le jezik dokumenta in opis; slovenska stran
  // ostane natanko taka, kot je.
  if (jezikSlovarja() !== 'sl') {
    document.documentElement.lang = jezikSlovarja()
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('aplikacija.naslovStrani.opis'))
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', t('aplikacija.naslovStrani.deljenje'))
  }

  const koren = document.getElementById('root')
  if (!koren) throw new Error('Manjka <div id="root"> v index.html')

  ReactDOM.createRoot(koren).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})
