// Smoke za scout.slff.eu: izris vseh strani brez brskalnika in baze, slovar
// (isti {parametri} v sl in en, brez negativnih oznak), utemeljitev in vrzeli.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SejaProvider } from './src/seja'
import { Okvir } from './src/Okvir'
import { Prijava } from './src/strani/Prijava'
import { Racun } from './src/strani/Racun'
import { Iskanje, utemeljitev } from './src/strani/Iskanje'
import { Igralec } from './src/strani/Igralec'
import { Vrzeli, opisVrzeli } from './src/strani/Vrzeli'
import { Opazovani } from './src/strani/Opazovani'
import { Pogoji } from './src/strani/Pogoji'
import { EN, SL, type Kljuc } from './src/besede'

let napak = 0
const preveri = (opis: string, ok: boolean, dodatno = '') => {
  if (!ok) napak++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${opis}${ok || !dodatno ? '' : ` (${dodatno})`}`)
}

const strani: [string, string, ReactNode][] = [
  ['/login', '/login', <Prijava />],
  ['/account', '/account', <Racun />],
  ['/', '/', <Iskanje />],
  ['/player/123', '/player/:id', <Igralec />],
  ['/gaps', '/gaps', <Vrzeli />],
  ['/watchlist', '/watchlist', <Opazovani />],
  ['/terms', '/terms', <Pogoji />],
]
for (const [pot, vzorec, stran] of strani) {
  try {
    const html = renderToString(
      <StaticRouter location={pot}>
        <SejaProvider>
          <Okvir>
            <Routes>
              <Route path={vzorec} element={stran} />
            </Routes>
          </Okvir>
        </SejaProvider>
      </StaticRouter>,
    )
    preveri(`izris ${pot}`, html.includes(SL['app.ime']))
  } catch (e) {
    preveri(`izris ${pot}`, false, String(e))
  }
}

const kljuci = Object.keys(SL) as Kljuc[]
const parametri = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const razlicni = kljuci.filter((k) => parametri(SL[k]) !== parametri(EN[k]))
preveri('besede: en ima iste {parametre} kot sl', razlicni.length === 0, razlicni.join(', '))
const prazni = kljuci.filter((k) => !SL[k].trim() || !EN[k].trim())
preveri('besede: brez praznih nizov', prazni.length === 0, prazni.join(', '))
const NEGATIVNO = /\b(slab|šibk|povprečn)|\b(weak|poor|bad|below average)\b/i
const negativni = kljuci.filter((k) => NEGATIVNO.test(SL[k]) || NEGATIVNO.test(EN[k]))
preveri('besede: brez negativnih oznak (spec 2)', negativni.length === 0, negativni.join(', '))

const u = utemeljitev({ percentil: 87.4, skupina: 'MID', minute: 900, delez_minut: 0.81, goli_90_pri_nas: 0.41 })
preveri('iskanje: utemeljitev s percentilom, deležem in projekcijo', u.includes('87.') && u.includes('81 %') && u.includes('0,41'), u)
const v = opisVrzeli({ vrsta: 'odvisnost', skupina: 'FWD', ime: 'Ana Novak', vrednost: 0.45 })
preveri('vrzeli: delež golov v odstotkih', v.includes('Ana Novak') && v.includes('45 %'), v)

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
