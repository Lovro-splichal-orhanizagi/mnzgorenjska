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
import { Igralec, idIzNaslova } from './src/strani/Igralec'
import { Vrzeli, opisVrzeli } from './src/strani/Vrzeli'
import { Klub, PregledKlubaView, globina } from './src/strani/Klub'
import type { PregledKluba, StatEkipe } from './src/baza'
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
  ['/club', '/club', <Klub />],
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
const idji: [string | undefined, number | null][] = [['123', 123], ['0', null], ['-5', null], ['1.5', null], ['1e3', null], ['abc', null], ['9007199254740993', null], [undefined, null]]
const slabiId = idji.filter(([v, pricakovano]) => idIzNaslova(v) !== pricakovano).map(([v]) => String(v))
preveri('igralec: id iz naslova le varno pozitivno celo število', slabiId.length === 0, slabiId.join(', '))
const v = opisVrzeli({ vrsta: 'odvisnost', skupina: 'FWD', ime: 'Ana Novak', vrednost: 0.45 })
preveri('vrzeli: delež golov v odstotkih', v.includes('Ana Novak') && v.includes('45 %'), v)

const kaderPreizkus = [
  { player_id: 1, ime: 'A', skupina: 'FWD', nastopi: 9, minute: 800, delez_minut: 0.9, zacetki_delez: 1, goli: 5, onoff_ref_90: 0.3, kartoni_90: 0.1, trend_minut: 0, mladi: false },
  { player_id: 2, ime: 'B', skupina: 'FWD', nastopi: 4, minute: 200, delez_minut: 0.2, zacetki_delez: 0.2, goli: 1, onoff_ref_90: 0, kartoni_90: 0, trend_minut: null, mladi: false },
  { player_id: 3, ime: 'C', skupina: 'GK', nastopi: 6, minute: 540, delez_minut: 0.6, zacetki_delez: 0.6, goli: 0, onoff_ref_90: null, kartoni_90: null, trend_minut: null, mladi: true },
] as const
const gl = globina([...kaderPreizkus])
preveri('klub: globina šteje igralce z vsaj 30 % minut in najde nosilca',
  gl.find((x) => x.skupina === 'FWD')?.stalnih === 1 && gl.find((x) => x.skupina === 'FWD')?.nosilec?.ime === 'A'
  && gl.find((x) => x.skupina === 'GK')?.stalnih === 1 && gl.find((x) => x.skupina === 'MID')?.nosilec === null)

const stat = (x: number): StatEkipe => ({
  tekme: 11, tocke: x, za: x, proti: x, ciste: 0.2, tocke_doma: x, tocke_gost: x,
  za_doma: x, proti_doma: x, za_gost: x, proti_gost: x, kartoni: x,
})
const pregled: PregledKluba = {
  team_id: 1, ime: 'Klub', country_id: 1, admin: false,
  glava: { elo: 1508.1, lig: 16, liga: '2. SNL', forma: 'LWWDL', mesto: 9, tekme: 11, tocke: 17, klubov: 16, sezona: '2026/27', elo_lani: null, moc_mesto: 2, competition_id: 17 },
  ekipa: { klub: stat(1.5), liga: stat(1.4) },
  kader: [...kaderPreizkus],
  vrzeli: [],
}
const primeri: [string, PregledKluba, string?][] = [
  ['klub: izris pregleda', pregled, '2. SNL'],
  ['klub: izris igralca z mladinsko vrstico (brez povezave)', { ...pregled, kader: [kaderPreizkus[2]] }, 'U19'],
  ['klub: izris brez glave in ekipe', { ...pregled, glava: null, ekipa: null, kader: [], vrzeli: [] }],
  ['klub: izris brez statistike kluba', { ...pregled, ekipa: { klub: null, liga: stat(1.4) } }],
]
for (const [opis, pr, vsebuje] of primeri) {
  try {
    const html = renderToString(
      <StaticRouter location="/club">
        <PregledKlubaView p={pr} razvrsti="minute" setRazvrsti={() => {}} onIzbira={() => {}} />
      </StaticRouter>,
    )
    preveri(opis, (!vsebuje || html.includes(vsebuje)) && !html.includes('/player/3'))
  } catch (e) {
    preveri(opis, false, String(e))
  }
}

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
