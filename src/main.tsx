import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { jezik, t } from './i18n'
import { pripraviNativno } from './lib/platforma'

pripraviNativno()

// index.html je slovenski (to vidijo iskalniki brez JS in kartice ob
// deljenju). Drug jezik zamenja le jezik dokumenta in opis; slovenska stran
// ostane natanko taka, kot je.
if (jezik() !== 'sl') {
  document.documentElement.lang = jezik()
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
