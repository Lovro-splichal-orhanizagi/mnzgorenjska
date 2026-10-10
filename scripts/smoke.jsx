// Preveri, da se vse strani izrišejo brez napake, in da točkovanje
// natanko sledi pravilom lige. Brez brskalnika in brez baze.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AuthProvider } from '../src/lib/useAuth'
import { TekmovanjeProvider, uskladiTekmovanje, jeIzrecnaIzbira, brezZveze } from '../src/lib/tekmovanje'
import Navbar from '../src/components/Navbar'
import RokKroga from '../src/components/RokKroga'
import Domov from '../src/pages/Domov'
import Igralci from '../src/pages/Igralci'
import Lestvica from '../src/pages/Lestvica'
import Rezultati from '../src/pages/Rezultati'
import Tabela from '../src/pages/Tabela'
import Tekma from '../src/pages/Tekma'
import Prijava from '../src/pages/Prijava'
import MojaEkipa from '../src/pages/MojaEkipa'
import Glasovanje from '../src/pages/Glasovanje'
import Pozicije from '../src/pages/Pozicije'
import Odsotnosti from '../src/pages/Odsotnosti'
import Slovenija from '../src/pages/Slovenija'
import MiniLige from '../src/pages/MiniLige'
import VstopVMiniLigo from '../src/pages/VstopVMiniLigo'
import Ekipa from '../src/pages/Ekipa'
import Klub from '../src/pages/Klub'
import InfoIgralca from '../src/components/InfoIgralca'
import ZivostSkupnosti from '../src/components/admin/Zivost'
import Administracija from '../src/pages/Administracija'
import {
  preveriEkipo,
  lahkoUrejasPripomocek,
  lahkoZacne,
  zakajNeGre,
  VELIKOST_EKIPE,
  PRORACUN,
  POZICIJE,
  KAPETAN_MNOZITELJ,
  MAX_IZ_KLUBA,
  STEVILO_PRVIH,
} from '../src/lib/pravila'
import { tockeZaNastop } from '../src/lib/tockovanje'
import { sestejOdKroga } from '../src/lib/lestvica'
import { zdruziNavijace } from '../src/lib/navijaci'
import { TabelaNavijacev, KlubMedNavijaci, IzbiraKluba } from '../src/components/NavijaciKlubov'
import { krogKoncan, mestoVLigi, igralciPregleda, postaviPregled, oznakaPremika, imeDatotekePregleda, KVADRAT, SIRINA_P, VISINA_P, ROB_P } from '../src/lib/tedenskiPregled'
import { parsirajZapisnik, nastopi, dodajStrelceSKlopi } from './zapisnik.mjs'
import { poZvezah, ustreza, pokaziZvezo } from '../src/components/IzbirnikLige'
import { virPodatkov, imeZveze } from '../src/components/VirPodatkov'
import { sestaviVabilo, vabiloMailto } from '../src/lib/vabilo'
import { viraZa, znaniViri } from './viri/index.mjs'
import { caka, brezAsistencePotrjeno, PRAG_ASISTENCE_PRIVZETO } from '../src/components/GolZaGlasovanje'
import { adaptivniPrag } from '../src/pages/Pozicije'
import { razcleniRazpored, datum, sezonaIz, oznakaBrezIzida } from './razpored.mjs'
import { vseVrstice } from './strani.mjs'
import { premakniProti, NAJVECJI_TEDENSKI_PREMIK } from './premik-cene.mjs'
import { oceniPripravljenost, najcenejsiKader } from '../src/lib/pripravljenost'
import { serijaCen, premik, crta, zadnjiPremiki } from '../src/lib/gibanjeCene'
import { dopolniKader, predlagajKader } from '../src/lib/predlogKadra'
import { velikostImena, velikostEkipe, imeZaPlakat, najboljsiTrije, navijacev, stavekNavijacev, skrajsajIme, prilagodiVelikost, ligaVTozilniku, velikostLige, imeDatoteke } from '../src/lib/plakat'
import { readFileSync } from 'node:fs'
import { xmlEscape, urlset, sitemapIndex, nasloviLige, datotekeLige } from './sitemap.mjs'
import { imeStrani } from '../src/lib/obiski'
import { zDrzavo } from '../src/lib/naslov'
import { zDrzavo as zDrzavoStreznika } from './hetzner/html/streznik.mjs'
import { drzavaVstopa } from '../src/lib/drzavaUgib'
import VstopDrzave from '../src/components/VstopDrzave'
import { prezgodnjiKljuci, naloziSlovar } from '../src/i18n/jedro.ts'
// Vsa aplikacija (tudi strani, ki jih smoke ne izriše), da se izvede vrh vseh modulov.
import '../src/App'

let napak = 0
const preveri = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
  if (!cond) napak++
}

// Slovar drugega jezika pride šele pred izrisom (main.tsx). Niz, preveden na
// vrhu modula (konstanta), bi zato v hrvaščini ali angleščini ostal slovenski.
preveri('prevodi: noben t() na vrhu modula', prezgodnjiKljuci().length === 0, prezgodnjiKljuci().join(', '))
await naloziSlovar()

// --- izris strani ----------------------------------------------------------
const strani = [
  ['Navbar', Navbar, '/'],
  ['Domov', Domov, '/'],
  ['Moja ekipa', MojaEkipa, '/my-team'],
  ['Odsotnosti', Odsotnosti, '/absences'],
  ['Asistence', Glasovanje, '/assists'],
  ['Pozicije', Pozicije, '/positions'],
  ['Igralci', Igralci, '/players'],
  ['Lestvica', Lestvica, '/standings'],
  ['Slovenija', Slovenija, '/national'],
  ['Mini lige', MiniLige, '/mini-leagues'],
  ['Vstop v mini ligo', VstopVMiniLigo, '/l/ABCDEF'],
  ['Tuja ekipa', Ekipa, '/team/1'],
  ['Klub', Klub, '/club/24'],
  [
    'Info o igralcu',
    () => (
      <InfoIgralca
        igralecId={1}
        tekmovanjeId={1}
        ime="Testni Igralec"
        klub="Testni klub"
        naZapri={() => {}}
      />
    ),
    '/my-team',
  ],
  ['Zivost skupnosti', ZivostSkupnosti, '/admin'],
  ['Rezultati', Rezultati, '/results'],
  ['Lestvica lige', Tabela, '/table'],
  ['Tekma', Tekma, '/match/1'],
  ['Prijava', Prijava, '/login'],
  ['Administracija', Administracija, '/admin'],
]

for (const [ime, Komponenta, pot] of strani) {
  try {
    const html = renderToString(
      <StaticRouter location={pot}>
        <AuthProvider>
          <TekmovanjeProvider>
            <Komponenta />
          </TekmovanjeProvider>
        </AuthProvider>
      </StaticRouter>,
    )
    preveri(`izris: ${ime}`, Boolean(html && html.length))
  } catch (e) {
    preveri(`izris: ${ime}`, false, e.message)
  }
}

// Pas z rokom brez podatkov namenoma ne izrise nicesar (rok se ni znan), zato
// zanj ne moremo zahtevati HTML — preverimo le, da izris ne vrze napake.
try {
  renderToString(
    <StaticRouter location="/">
      <AuthProvider>
        <TekmovanjeProvider>
          <RokKroga />
        </TekmovanjeProvider>
      </AuthProvider>
    </StaticRouter>,
  )
  preveri('izris: pas z rokom kroga', true)
} catch (e) {
  preveri('izris: pas z rokom kroga', false, e.message)
}

// --- zemljevid strani (scripts/sitemap.mjs) --------------------------------
{
  preveri('sitemap: posebni znaki so ubežani',
    xmlEscape(`a&b<c>"d'`) === 'a&amp;b&lt;c&gt;&quot;d&apos;')
  const xml = urlset([{ loc: 'https://slff.eu/x?a=1&b=<2>' }, { loc: 'https://slff.eu/y', lastmod: '2026-10-03' }])
  // Brez razčlenjevalnika: vsak & je začetek entitete, < in > sta le v oznakah.
  const besedilo = xml.replace(/<[^<>]*>/g, '')
  preveri('sitemap: urlset je dobro oblikovan',
    xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      && xml.trimEnd().endsWith('</urlset>')
      && !/[<>]/.test(besedilo) && !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(besedilo)
      && (xml.match(/<url>/g) ?? []).length === 2 && xml.includes('<lastmod>2026-10-03</lastmod>'))
  preveri('sitemap: kazalo', sitemapIndex([{ loc: 'https://slff.eu/sitemap-a.xml' }]).includes(
    '<sitemap><loc>https://slff.eu/sitemap-a.xml</loc></sitemap>'))
  const n = nasloviLige('clani', {
    klubi: [9, 10],
    igralci: [5],
    tekme: [
      { id: 1, played_on: '2026-09-01', home_team_id: 9, away_team_id: 11 },
      { id: 2, played_on: '2026-09-08', home_team_id: 11, away_team_id: 10 },
    ],
  })
  const po = Object.fromEntries(n.map((x) => [x.loc, x.lastmod ?? null]))
  preveri('sitemap: privzeta liga brez ?t=, klubi, igralci in tekme',
    n.length === 5 + 2 + 1 + 2 && po['https://slff.eu/table'] === '2026-09-08' && 'https://slff.eu/' in po
      && po['https://slff.eu/club/9'] === '2026-09-01' && po['https://slff.eu/club/10'] === '2026-09-08'
      && 'https://slff.eu/player/5' in po && po['https://slff.eu/match/1'] === '2026-09-01')
  preveri('sitemap: druga liga z ?t=', nasloviLige('sk-za-1', { klubi: [9], igralci: [], tekme: [] })
    .map((x) => x.loc).includes('https://slff.eu/club/9?t=sk-za-1'))
  const d = datotekeLige('x', Array.from({ length: 5 }, (_, i) => ({ loc: String(i) })), 2)
  preveri('sitemap: liga nad mejo se razdeli', d.map((k) => `${k.ime}:${k.naslovi.length}`).join(' ')
    === 'sitemap-x.xml:2 sitemap-x-2.xml:2 sitemap-x-3.xml:1')
  preveri('obisk: /table se šteje kot tabela', imeStrani('/table') === 'tabela')
}

// --- vstopna stran države in ime lige z državo -----------------------------
{
  const primeri = [
    { name: 'Bundesliga', country_name: 'Österreich' },
    { name: 'Slovenija open', country_name: 'Slovenija' },
    { name: '1. GNL', country_name: 'Slovenija' },
    { name: 'Liga', country_name: null },
  ]
  preveri('naslov: zDrzavo v vmesniku in strežniku HTML enako',
    primeri.every((l) => zDrzavo(l) === zDrzavoStreznika(l)) && zDrzavo(primeri[0]) === 'Bundesliga (Österreich)'
      && zDrzavo(primeri[1]) === 'Slovenija open', primeri.map((l) => zDrzavo(l)).join(' | '))
  preveri('vstop: /at in /si/ sta vstopni strani, /xx in /at/1 ne',
    drzavaVstopa('/at') === 'AT' && drzavaVstopa('/si/') === 'SI' && drzavaVstopa('/xx') === null && drzavaVstopa('/at/1') === null)
  try {
    renderToString(
      <StaticRouter location="/at">
        <AuthProvider>
          <TekmovanjeProvider>
            <VstopDrzave drzava="AT" />
          </TekmovanjeProvider>
        </AuthProvider>
      </StaticRouter>,
    )
    preveri('izris: vstopna stran države', true)
  } catch (e) {
    preveri('izris: vstopna stran države', false, e.message)
  }
}

// --- preklop med ligama ----------------------------------------------------
// Naslov (`?t=mladinci`) in izbrana liga se poravnavata v obe smeri. Ključno
// je, da klik na "Člani" — ki parameter odstrani — ne obvelja za spremembo
// naslova od zunaj, sicer se preklop takoj povozi nazaj na mladince.
{
  const u = (vNaslovu, zadnjiVNaslovu, slug, potSeJeSpremenila = false) =>
    uskladiTekmovanje({ vNaslovu, zadnjiVNaslovu, slug, potSeJeSpremenila })

  preveri(
    'preklop na mladince zapiše ?t=mladinci',
    JSON.stringify(u(null, null, 'mladinci')) ===
      JSON.stringify({ dejanje: 'zapisi-naslov', param: 'mladinci' }),
  )
  preveri(
    'preklop nazaj na člane odstrani parameter',
    JSON.stringify(u('mladinci', 'mladinci', 'clani')) ===
      JSON.stringify({ dejanje: 'zapisi-naslov', param: null }),
  )
  preveri(
    'deljena povezava prevzame ligo iz naslova',
    JSON.stringify(u('mladinci', null, 'clani')) ===
      JSON.stringify({ dejanje: 'prevzemi-naslov', slug: 'mladinci' }),
  )
  preveri(
    'gumb nazaj na naslov brez parametra vrne člane',
    JSON.stringify(u(null, 'mladinci', 'mladinci')) ===
      JSON.stringify({ dejanje: 'prevzemi-naslov', slug: 'clani' }),
  )
  preveri(
    'ko sta naslov in izbira usklajena, se nič ne zgodi',
    u('mladinci', 'mladinci', 'mladinci').dejanje === 'nic' &&
      u(null, null, 'clani').dejanje === 'nic',
  )
  // Ključno: povezave v meniju parametra ne prenašajo naprej. Klik na
  // "Igralci" ne sme vreči nazaj na člane.
  preveri(
    'navigacija ohrani izbrano ligo',
    JSON.stringify(u(null, 'mladinci', 'mladinci', true)) ===
      JSON.stringify({ dejanje: 'zapisi-naslov', param: 'mladinci' }),
  )
  preveri(
    'navigacija znotraj članov ne dela ničesar',
    u(null, null, 'clani', true).dejanje === 'nic',
  )
  preveri(
    'deljena povezava do druge lige velja tudi ob menjavi poti',
    JSON.stringify(u('mladinci', null, 'clani', true)) ===
      JSON.stringify({ dejanje: 'prevzemi-naslov', slug: 'mladinci' }),
  )
}

// --- točkovanje ------------------------------------------------------------
const nastop = (o = {}) => ({
  minute: 90,
  goli: 0,
  asistence: 0,
  cleanSheet: false,
  prejetiGoli: 0,
  obranjeneEnajstmetrovke: 0,
  zgreseneEnajstmetrovke: 0,
  avtogoli: 0,
  rumeni: 0,
  rdeci: 0,
  ...o,
})

const t = (o, poz) => tockeZaNastop(nastop(o), poz).skupaj

console.log('')
preveri('ni nastopa = 0 točk', t({ minute: 0 }, 'MID') === 0)
preveri('nastop do 60 minut = 1', t({ minute: 59 }, 'MID') === 1)
preveri('nastop 60 minut = 2', t({ minute: 60 }, 'MID') === 2)
preveri('nastop 90 minut = 2', t({ minute: 90 }, 'MID') === 2)

preveri('gol vratarja = 10', t({ goli: 1 }, 'GK') === 2 + 10)
preveri('gol branilca = 6', t({ goli: 1 }, 'DEF') === 2 + 6)
preveri('gol vezista = 5', t({ goli: 1 }, 'MID') === 2 + 5)
preveri('gol napadalca = 4', t({ goli: 1 }, 'FWD') === 2 + 4)
preveri('dva gola vezista = 10', t({ goli: 2 }, 'MID') === 2 + 10)
preveri('asistenca = 3', t({ asistence: 1 }, 'FWD') === 2 + 3)

preveri(
  'clean sheet vratarja = 5',
  t({ cleanSheet: true }, 'GK') === 2 + 5,
)
preveri(
  'clean sheet vratarja v krogu s pravili 1 = 4',
  t({ cleanSheet: true, pravila: 1 }, 'GK') === 2 + 4,
)
preveri(
  'clean sheet branilca = 4',
  t({ cleanSheet: true }, 'DEF') === 2 + 4,
)
preveri('clean sheet vezista = 1', t({ cleanSheet: true }, 'MID') === 2 + 1)
preveri('clean sheet napadalca = 0', t({ cleanSheet: true }, 'FWD') === 2)
preveri(
  'clean sheet pod 60 minut se ne šteje',
  t({ minute: 45, cleanSheet: true }, 'DEF') === 1,
)

preveri('zmaga vratarja = 2', t({ zmaga: true }, 'GK') === 2 + 2)
preveri('zmaga branilca = 2', t({ zmaga: true }, 'DEF') === 2 + 2)
preveri('zmaga vezista = 0', t({ zmaga: true }, 'MID') === 2)
preveri('zmaga napadalca = 0', t({ zmaga: true }, 'FWD') === 2)
preveri('zmaga pod 60 minut se ne šteje', t({ minute: 45, zmaga: true }, 'GK') === 1)
preveri('zmaga v krogu s pravili 1 = 0', t({ zmaga: true, pravila: 1 }, 'DEF') === 2)
preveri(
  'vratar, zmaga 1:0 = 2+5+2 = 9',
  t({ cleanSheet: true, zmaga: true }, 'GK') === 9,
)
preveri(
  'vratar, zmaga 4:2 = 2-1+2 = 3',
  t({ prejetiGoli: 2, zmaga: true }, 'GK') === 3,
)

preveri(
  '2 prejeta gola = -1 (vratar)',
  t({ prejetiGoli: 2 }, 'GK') === 2 - 1,
)
preveri(
  '3 prejeti goli = -1 (branilec)',
  t({ prejetiGoli: 3 }, 'DEF') === 2 - 1,
)
preveri(
  '4 prejeti goli = -2 (vratar)',
  t({ prejetiGoli: 4 }, 'GK') === 2 - 2,
)
preveri(
  'prejeti goli ne kaznujejo vezista',
  t({ prejetiGoli: 4 }, 'MID') === 2,
)

preveri(
  'obranjena enajstmetrovka = 5',
  t({ obranjeneEnajstmetrovke: 1 }, 'GK') === 2 + 5,
)
preveri(
  'zgrešena enajstmetrovka = -2',
  t({ zgreseneEnajstmetrovke: 1 }, 'FWD') === 2 - 2,
)
preveri('avtogol = -2', t({ avtogoli: 1 }, 'DEF') === 2 - 2)
preveri('rumeni karton = -1', t({ rumeni: 1 }, 'MID') === 2 - 1)
preveri('rdeči karton = -3', t({ rdeci: 1 }, 'MID') === 2 - 3)

// sestavljen primer: branilec, 90 min, gol, clean sheet, zmaga, rumeni karton
preveri(
  'sestavljen primer: 2+6+4+2-1 = 13',
  t({ goli: 1, cleanSheet: true, zmaga: true, rumeni: 1 }, 'DEF') === 13,
)

// --- pravila ekipe ---------------------------------------------------------
console.log('')
const igralec = (id, position, team_id, is_starter, value = 5) => ({
  id,
  position,
  team_id,
  is_starter,
  value,
})

const veljavna = [
  igralec(1, 'GK', 1, true),
  ...[2, 3, 4, 5].map((i) => igralec(i, 'DEF', i, true)),
  ...[6, 7, 8, 9].map((i) => igralec(i, 'MID', i, true)),
  ...[10, 11].map((i) => igralec(i, 'FWD', i, true)),
  igralec(12, 'GK', 6, false),
  igralec(13, 'DEF', 7, false),
  igralec(14, 'MID', 8, false),
  igralec(15, 'FWD', 2, false),
].map((i) => ({
  ...i,
  is_captain: i.id === 10,
  is_vice: i.id === 11,
}))

preveri(
  'veljavna ekipa nima napak',
  preveriEkipo(veljavna, 100).length === 0,
  preveriEkipo(veljavna, 100).join(' | '),
)
preveri('velikost ekipe je 15', VELIKOST_EKIPE === 15)
preveri('privzet proračun je 100', PRORACUN === 100)
preveri(
  'premajhna ekipa je zavrnjena',
  preveriEkipo(veljavna.slice(0, 10), 100).length > 0,
)
preveri(
  '2 vratarja v prvi postavi sta zavrnjena',
  preveriEkipo(
    veljavna.map((i) => (i.id === 12 ? { ...i, is_starter: true } : i)),
    100,
  ).length > 0,
)
preveri(
  '4 igralci iz istega kluba so zavrnjeni',
  preveriEkipo(veljavna.map((i) => ({ ...i, team_id: 1 })), 100).some((n) =>
    n.includes('istega kluba'),
  ),
)
preveri(
  'presežen proračun je zavrnjen',
  preveriEkipo(veljavna, 50).some((n) => n.includes('proračun')),
)
preveri(
  'igralec brez pozicije sproži opozorilo',
  preveriEkipo(
    veljavna.map((i) => (i.id === 5 ? { ...i, position: null } : i)),
    100,
  ).some((n) => n.includes('pozicije')),
)

// Že kupljen kader za 90 je danes vreden 105, v blagajni pa ostane 10.
// Podražitev ni nov nakup; pri prestopu se porabi le dejanski denar.
{
  const podrazeni = veljavna.map((i) => ({ ...i, buy_value: 6, value: 7 }))
  const brezPrestopa = preveriEkipo(podrazeni, 100, 10)
  preveri('proračun: podražitev kupljenega kadra ne sproži opozorila',
    brezPrestopa.length === 0, brezPrestopa.join(' | '))

  const poPrestopu = (cena) => podrazeni.map((i) => i.id === 15
    ? { ...i, id: 99, buy_value: cena, value: cena }
    : i)
  // Prodaja za 7 in nakup za 18 ob začetnih 10 pustita primanjkljaj 1.
  const predrag = preveriEkipo(poPrestopu(18), 100, -1)
  preveri('proračun: resnično predrag prestop pokaže dejanski primanjkljaj',
    predrag.length === 1 && predrag[0].includes('proračun za 1,0 M€'), predrag.join(' | '))

  // Nakup za 17 je mogoč: ob prodaji se realizira tudi dobiček 1.
  const prodajniDobicek = preveriEkipo(poPrestopu(17), 100, 0)
  preveri('proračun: prodajni dobiček lahko financira prestop do zadnjega centa',
    prodajniDobicek.length === 0, prodajniDobicek.join(' | '))

  const naMeji = preveriEkipo(podrazeni, 100, 0.3 - 0.1 - 0.2)
  preveri('proračun: decimalno zaokroževanje ne ustvari primanjkljaja',
    naMeji.length === 0, naMeji.join(' | '))

  const manjkaKapetan = preveriEkipo(
    podrazeni.map((i) => ({ ...i, is_captain: false })), 100, 10)
  preveri('proračun: dovolj denarja ne preskoči preverjanja postave',
    manjkaKapetan.some((n) => n.includes('kapetana')) &&
      !manjkaKapetan.some((n) => n.includes('proračun')), manjkaKapetan.join(' | '))
}

// Pripomoček lahko vložimo ali prekličemo samo pred rokom nezaklenjenega
// kroga iste lige. Ista odločitev velja za oba gumba in seznam krogov.
{
  const zdaj = Date.parse('2026-09-13T12:00:00Z')
  const prihodnji = { competition_id: 1, deadline_at: '2026-09-14T12:00:00Z', lineups_locked_at: null }
  for (const [opis, krog, dovoljeno] of [
    ['prihodnji krog iste lige', prihodnji, true],
    ['pretekli krog', { ...prihodnji, deadline_at: '2024-09-14T12:00:00Z' }, false],
    ['natanko ob roku', { ...prihodnji, deadline_at: '2026-09-13T12:00:00Z' }, false],
    ['krog brez roka', { ...prihodnji, deadline_at: null }, false],
    ['neveljaven rok', { ...prihodnji, deadline_at: 'neznano' }, false],
    ['že zaklenjen krog', { ...prihodnji, lineups_locked_at: '2026-09-12T12:00:00Z' }, false],
    ['krog druge lige', { ...prihodnji, competition_id: 2 }, false],
    ['manjkajoč krog', undefined, false],
  ]) {
    preveri(`pripomočki: ${opis}`, lahkoUrejasPripomocek(krog, 1, zdaj) === dovoljeno)
  }
}

// --- kvote kadra, trak in menjave -----------------------------------------
preveri(
  'kvota kadra je 2-5-5-3',
  POZICIJE.GK.kader === 2 &&
    POZICIJE.DEF.kader === 5 &&
    POZICIJE.MID.kader === 5 &&
    POZICIJE.FWD.kader === 3,
)
preveri(
  'kader s 4 branilci je zavrnjen',
  preveriEkipo(
    veljavna.map((i) => (i.id === 13 ? { ...i, position: 'MID' } : i)),
    100,
  ).some((n) => n.includes('v kadru')),
)
preveri('kapetan prinese trojne točke', KAPETAN_MNOZITELJ === 3)
preveri(
  'ekipa brez kapetana je zavrnjena',
  preveriEkipo(
    veljavna.map((i) => ({ ...i, is_captain: false })),
    100,
  ).some((n) => n.includes('kapetana')),
)
preveri(
  'dva kapetana sta zavrnjena',
  preveriEkipo(
    veljavna.map((i) => (i.id === 11 ? { ...i, is_captain: true } : i)),
    100,
  ).some((n) => n.includes('Kapetan')),
)

const prviIzVeljavne = veljavna.filter((i) => i.is_starter)
preveri(
  'šesti branilec ne more v postavo',
  lahkoZacne('DEF', prviIzVeljavne) === false,
)
preveri(
  'drugi vratar ne more v postavo',
  lahkoZacne('GK', prviIzVeljavne) === false,
)
preveri(
  'v postavo z desetimi gre še napadalec',
  lahkoZacne('FWD', prviIzVeljavne.slice(0, 10)) === true,
)
preveri(
  'zadnje mesto v postavi pripada manjkajočemu vratarju',
  lahkoZacne(
    'MID',
    prviIzVeljavne.filter((i) => i.position !== 'GK').slice(0, 10),
  ) === false,
)

preveri(
  'igralec šestega kluba se doda',
  zakajNeGre(
    { id: 99, position: 'FWD', team_id: 42, value: 5 },
    veljavna.slice(0, 14),
    50,
  ) === null,
)
preveri(
  'četrti igralec istega kluba je zavrnjen',
  (zakajNeGre(
    { id: 99, position: 'FWD', team_id: 1, value: 5 },
    veljavna.slice(0, 14).map((i) => ({ ...i, team_id: 1 })),
    50,
  ) ?? '').includes('kluba'),
)
preveri(
  'presežena kvota pozicije je zavrnjena',
  (zakajNeGre({ id: 99, position: 'GK', team_id: 42, value: 5 }, veljavna.slice(0, 14), 50) ??
    '').includes('kadru'),
)

// --- lestvica "od N. kroga naprej" -----------------------------------------
// Kazen za prestope je v `points` ZE odsteta (glej fantasy_round_points).
// Stran jo je odstevala se enkrat: ekipa Gospodini je imela v 2. krogu 13
// tock in 20 kazni -> points = -7, stran pa je kazala -7 - 20 = -27.
{
  const vrstice = [
    { round_id: 1, fantasy_team_id: 201, team_name: 'Gospodini', points: 14 },
    { round_id: 2, fantasy_team_id: 201, team_name: 'Gospodini', points: -7, penalty: 20 },
  ]
  const vsi = new Set([1, 2])
  const samoDrugi = new Set([2])

  const skupno = sestejOdKroga(vrstice, vsi)
  preveri('lestvica: sestevek obeh krogov je 7', skupno[0].points === 7, String(skupno[0].points))

  const odDrugega = sestejOdKroga(vrstice, samoDrugi)
  preveri('lestvica: od 2. kroga je -7, ne -27', odDrugega[0].points === -7, String(odDrugega[0].points))

  preveri('lestvica: steje kroge', odDrugega[0].krogov === 1, String(odDrugega[0].krogov))

  const prazno = sestejOdKroga(vrstice, new Set())
  preveri('lestvica: brez krogov je prazna', prazno.length === 0)

  const vec = sestejOdKroga(
    [
      { round_id: 1, fantasy_team_id: 1, team_name: 'A', points: 5 },
      { round_id: 1, fantasy_team_id: 2, team_name: 'B', points: 9 },
    ],
    new Set([1]),
  )
  preveri('lestvica: razvrsti padajoce', vec[0].team_name === 'B', vec.map((x) => x.team_name).join(','))
}

// --- razclenjevanje zapisnikov ---------------------------------------------
// Vzorca sta pravi strani obeh zvez (scripts/vzorci/). MNZ Ljubljana ima v
// tabeli postav dodaten stolpec "Leto rojstva", ki ga Kranj nima — brez
// naslavljanja stolpcev po glavi razclenjevalnik prebere glavo kot ime kluba
// in se ustavi po prvem igralcu.
{
  const vzorec = (ime) =>
    readFileSync(new URL(`../scripts/vzorci/${ime}`, import.meta.url), 'utf8')

  // Kranj — referenca, ki NE sme razpasti
  {
    const z = parsirajZapisnik(vzorec('zapisnik-kranj-1601.html'), { zapisnikId: '158062' })
    preveri('zapisnik Kranj: domaci klub', z.domaci?.ime === 'Zarica Kranj', z.domaci?.ime)
    preveri('zapisnik Kranj: gostje klub', z.gostje?.ime === 'Britof', z.gostje?.ime)
    preveri('zapisnik Kranj: 11 v postavi doma', z.domaci?.postava?.length === 11, String(z.domaci?.postava?.length))
    preveri('zapisnik Kranj: 11 v postavi v gosteh', z.gostje?.postava?.length === 11, String(z.gostje?.postava?.length))
    preveri('zapisnik Kranj: brez opozoril o postavi',
      !(z.opozorila ?? []).some((o) => o.includes('namesto 11')),
      (z.opozorila ?? []).join(' | ').slice(0, 60))
    preveri('zapisnik Kranj: sezona', z.sezona === '2026/27', String(z.sezona))
    // Kranj vrstice "Datum:" nima — datum ostane iz naslova kroga.
    preveri('zapisnik Kranj: datum iz naslova kroga', z.datum === '2026-09-05', String(z.datum))
  }

  // Ljubljana — nov vir
  {
    const z = parsirajZapisnik(vzorec('zapisnik-ljubljana-2003.html'), { zapisnikId: '157904' })
    preveri('zapisnik LJ: domaci klub', z.domaci?.ime === 'Ljubljana', z.domaci?.ime)
    preveri('zapisnik LJ: gostje klub', z.gostje?.ime === 'Dragomer', z.gostje?.ime)
    preveri('zapisnik LJ: 11 v postavi doma', z.domaci?.postava?.length === 11, String(z.domaci?.postava?.length))
    preveri('zapisnik LJ: 11 v postavi v gosteh', z.gostje?.postava?.length === 11, String(z.gostje?.postava?.length))
    preveri('zapisnik LJ: vratar oznacen',
      z.domaci?.postava?.some((i) => i.vratar), String(z.domaci?.postava?.filter((i) => i.vratar).length))
    preveri('zapisnik LJ: kapetan oznacen',
      z.domaci?.postava?.some((i) => i.kapetan), String(z.domaci?.postava?.filter((i) => i.kapetan).length))
    preveri('zapisnik LJ: letnica NI del imena',
      !z.domaci?.postava?.some((i) => /\d{4}/.test(i.ime ?? '')),
      (z.domaci?.postava ?? []).map((i) => i.ime).slice(0, 2).join(', '))
    preveri('zapisnik LJ: brez opozoril o postavi',
      !(z.opozorila ?? []).some((o) => o.includes('namesto 11')),
      (z.opozorila ?? []).join(' | ').slice(0, 70))
    // MENJAVE: Kranj napise minuto ENKRAT ("46'", noter, ven), Ljubljana pa
    // pred VSAKIM igralcem ("62'", noter, "62'", ven). Star razclenjevalnik je
    // ob vsaki vrstici z minuto zavrgel cakajocega igralca, zato pri Ljubljani
    // ni sestavil nobene menjave: vseh 11 zacetnikov je dobilo 90 minut,
    // menjava pa sploh ni imela nastopa. Brez opozorila in brez izjeme —
    // `nastopi` jih je vrnil natanko 22, kar je bilo videti pravilno.
    preveri('zapisnik LJ: menjave prebrane', (z.menjave?.length ?? 0) === 6, String(z.menjave?.length))
    preveri('zapisnik LJ: prva menjava v 62. minuti',
      z.menjave?.[0]?.minuta === 62, String(z.menjave?.[0]?.minuta))
    preveri('zapisnik LJ: menjava ima noter in ven',
      Boolean(z.menjave?.[0]?.noter?.ime && z.menjave?.[0]?.ven?.ime),
      JSON.stringify(z.menjave?.[0]))
    {
      const n = nastopi(z)
      const manj = (n ?? []).filter((x) => (x.minutes ?? 0) < 90).length
      preveri('zapisnik LJ: nekdo je igral manj kot 90 minut', manj > 0, String(manj))
      preveri('zapisnik LJ: nastopov je vec kot 22 (klop steje)',
        (n?.length ?? 0) > 22, String(n?.length))
    }

    // Razdelek se konca pri naslovu z veliko zacetnico: Kranj "REZULTATI",
    // Ljubljana "REZULTATI TEKEM". Ob primerjavi z enakostjo je blok MENJAVE
    // tekel se 77 vrstic cez konec zapisnika, v seznam rezultatov druge lige.
    preveri('zapisnik LJ: menjave se koncajo pred rezultati',
      (z.menjave ?? []).every((m) => m.minuta <= 120),
      (z.menjave ?? []).map((m) => m.minuta).join(','))

    // Ljubljana pise letnico s stirimi stevkami — "Sezona 2026/2027",
    // "05.09.2026" — in v meniju nasteje vse sezone od 2006/07 naprej. Stara
    // izraza sta zajela prvo vrstico z letnico kjerkoli na strani in ji
    // odgrizla zadnji dve stevki: sezona "2026/20", datum "2020-09-05".
    // Cel arhiv se je uvozil v izmisljeno sezono z desetletje starimi datumi.
    preveri('zapisnik LJ: sezona ni iz menija', z.sezona === '2026/27', String(z.sezona))
    // Ljubljanski zapisnik ima svojo vrstico "Datum: 04.09.26 - 19.30" — tekma
    // se je igrala v petek, naslov kroga pa nosi soboto. Igra tega ne pokvari
    // (krog dolocuje `z.krog`), na strani Rezultati pa bi pisal napacen dan.
    preveri('zapisnik LJ: datum je datum TEKME, ne kroga', z.datum === '2026-09-04', String(z.datum))
    const n = nastopi(z)
    preveri('zapisnik LJ: nastopi za obe ekipi', (n?.length ?? 0) >= 22, String(n?.length))
  }

  // Celje — tretja zveza na istem CMS-u. Sezono pise z DVEMA stevkama
  // ("Medobcinska clanska liga - Golgeter 26/27"), zato je star izraz, ki je
  // zahteval stiri, segel nazaj v meni in nasel 2007/08. Cel arhiv bi pristal
  // v sezoni izpred dvajsetih let.
  {
    const z = parsirajZapisnik(vzorec('zapisnik-celje-1902.html'), { zapisnikId: '158079' })
    preveri('zapisnik Celje: sezona iz dvomestne letnice', z.sezona === '2026/27', String(z.sezona))
    preveri('zapisnik Celje: datum', z.datum === '2026-09-05', String(z.datum))
    preveri('zapisnik Celje: krog', z.krog === 2, String(z.krog))
    preveri('zapisnik Celje: 11 v postavi doma', z.domaci?.postava?.length === 11, String(z.domaci?.postava?.length))
    preveri('zapisnik Celje: menjave prebrane', (z.menjave?.length ?? 0) === 10, String(z.menjave?.length))
    preveri('zapisnik Celje: brez opozoril', (z.opozorila ?? []).length === 0,
      (z.opozorila ?? []).join(' | ').slice(0, 60))
    preveri('zapisnik Celje: klop steje', (nastopi(z)?.length ?? 0) > 22, String(nastopi(z)?.length))
  }
}

// --- izbirnik lige ---------------------------------------------------------
{
  const liga = (slug, name, fed, fedShort, sort) => ({
    id: 1, slug, name, short_name: name, prvi_fantasy_krog: 1,
    federation_code: fed, federation_name: fed ? 'MNZ ' + fedShort : null,
    federation_short: fedShort, federation_sort: sort,
    country_code: 'SI', country_name: 'Slovenija',
  })
  const lige = [
    liga('clani', '1. GNL — člani', 'mnzg', 'Gorenjska', 1),
    liga('mladinci', 'GNL — mladinci', 'mnzg', 'Gorenjska', 1),
    liga('lj-1', '1. liga Ljubljana', 'mnzlj', 'Ljubljana', 2),
    liga('brez', 'Liga brez zveze', null, null, null),
  ]

  const sk = poZvezah(lige)
  preveri('izbirnik: tri skupine', sk.length === 3, String(sk.length))
  preveri('izbirnik: Gorenjska prva', sk[0].naslov === 'Gorenjska', sk[0].naslov)
  preveri('izbirnik: Gorenjska ima dve ligi', sk[0].lige.length === 2, String(sk[0].lige.length))
  preveri('izbirnik: Ljubljana druga', sk[1].naslov === 'Ljubljana', sk[1].naslov)
  preveri('izbirnik: liga brez zveze gre na konec', sk[2].kljuc === '—', sk[2].kljuc)

  // Ime zveze na gumbu pove nekaj sele, ko so zveze vec kot ena. Pri eni je
  // odvec in vrstica v meniju je ozka: z dodano "Gorenjska" je znacka zlezla
  // cez logotip.
  preveri('izbirnik: pri eni zvezi je ne pisemo', !pokaziZvezo(lige.slice(0, 2)))
  preveri('izbirnik: pri dveh zvezah jo pisemo', pokaziZvezo(lige.slice(0, 3)))
  preveri('izbirnik: liga brez zveze steje kot svoja skupina',
    pokaziZvezo([lige[0], lige[3]]))

  preveri('izbirnik: iskanje po imenu lige', ustreza(lige[2], 'ljublj'), 'lj-1')
  preveri('izbirnik: iskanje po zvezi', ustreza(lige[0], 'gorenjska'), 'clani')
  preveri('izbirnik: iskanje brez sumnikov', ustreza(lige[0], 'clani') || ustreza(lige[0], 'GNL'), 'GNL')
  preveri('izbirnik: prazno iskanje najde vse', lige.every((l) => ustreza(l, '')))
  preveri('izbirnik: nesmisel ne najde nic', !lige.some((l) => ustreza(l, 'xyzzy')))

  // Noga navaja vir podatkov. Dokler je bila ena zveza, je bil zapisan v kodi;
  // ob ljubljanski ligi bi trdil, da so podatki iz Kranja, kar ni res.
  const vir = virPodatkov({ ...lige[2], federation_url: 'https://www.mnzljubljana-zveza.si/' })
  preveri('vir: ime po zvezi tekmovanja', vir?.ime === 'MNZ Ljubljana', String(vir?.ime))
  preveri('vir: povezava po zvezi tekmovanja',
    vir?.url === 'https://www.mnzljubljana-zveza.si/', String(vir?.url))
  preveri('vir: brez zveze ni trditve o viru', virPodatkov(lige[3]) === null)
  preveri('vir: brez izbranega tekmovanja ni trditve', virPodatkov(null) === null)
  // Ime zveze se pojavi tudi sredi stavka ("Statistika iz uradnih zapisnikov
  // MNZ Gorenjska."). Kadar zveze ne poznamo, mora stavek ostati smiseln —
  // zato imeZveze vrne splosen izraz, ne prazne vrzeli.
  preveri('vir: ime zveze za sredi stavka',
    imeZveze({ ...lige[2], federation_name: 'MNZ Ljubljana' }) === 'MNZ Ljubljana')
  preveri('vir: brez zveze splosen izraz', imeZveze(lige[3]) === 'zveze', imeZveze(lige[3]))
  preveri('vir: brez tekmovanja splosen izraz', imeZveze(null) === 'zveze', imeZveze(null))

  preveri('vir: zveza brez naslova se navede brez povezave',
    virPodatkov(lige[0])?.url === null && virPodatkov(lige[0])?.ime === 'MNZ Gorenjska',
    JSON.stringify(virPodatkov(lige[0])))

  // 3. SNL vodi NZS, zapisnike pa objavi Ptuj oziroma Nova Gorica. Ce bi noga
  // vzela zvezo, bi trdila, da so zapisniki na nzs.si — tam jih ni.
  const snl3 = {
    ...lige[2],
    federation_code: 'nzs', federation_name: 'Nogometna zveza Slovenije',
    federation_url: 'https://www.nzs.si/',
    vir_ime: 'MNZ Ptuj', vir_url: 'https://www.mnzveza-ptuj.si/',
  }
  preveri('vir: objavitelj povozi zvezo',
    virPodatkov(snl3)?.ime === 'MNZ Ptuj' &&
    virPodatkov(snl3)?.url === 'https://www.mnzveza-ptuj.si/',
    JSON.stringify(virPodatkov(snl3)))
  preveri('vir: objavitelj velja tudi sredi stavka',
    imeZveze(snl3) === 'MNZ Ptuj', imeZveze(snl3))
  preveri('vir: prazen vir_ime pusti zvezo pri miru',
    virPodatkov({ ...snl3, vir_ime: null, vir_url: null })?.ime === 'Nogometna zveza Slovenije')
}

// --- lepljiva izbira lige ---------------------------------------------------
// Izbrano ligo shranimo SAMO, kadar jo je nekdo res izbral. Doslej se je
// zapisala ob vsakem nalaganju strani, tudi ce je obiskovalec le pristal na
// privzeti ligi. Zaslon "Katero ligo spremljas?" pa to isto kljuc bere kot
// dokaz, da je bil ze vprasan — zato je po enem samem ponovnem nalaganju
// izginil za vedno in obiskovalec je tiho koncal na Gorenjski, torej natanko
// tam, kamor ga zaslon ne bi smel spustiti.
{
  preveri('izbira: parameter v naslovu je izrecen',
    jeIzrecnaIzbira({ vNaslovu: 'mladinci', shranjeno: null }))
  preveri('izbira: shranjena liga iz prejsnjega obiska je izrecna',
    jeIzrecnaIzbira({ vNaslovu: null, shranjeno: 'clani' }))
  preveri('izbira: gol obisk brez obojega ni izrecen',
    !jeIzrecnaIzbira({ vNaslovu: null, shranjeno: null }))
  preveri('izbira: prazen parameter ne steje',
    !jeIzrecnaIzbira({ vNaslovu: '', shranjeno: '' }))
}

// --- pragovi po ligi -------------------------------------------------------
// Prag pripada tekmovanju (migracija 20260909090000). Streznik ga je upostevni
// ze prej, vmesnik pa je kazal stevilo iz kode — ob prvem povozu bi stran
// trdila "1 / 3 — se 2 do odlocitve", asistenca pa bi se potrdila ze pri dveh.
{
  const gol = { id: 1, is_penalty: false, is_own_goal: false, assist_player_id: null,
    assist_none_confirmed_at: null }
  const dvaGlasovaZaNikogar = [{ player_id: null, votes: 2 }]

  preveri('prag: pri privzetih treh dva glasova ne odlocita',
    !brezAsistencePotrjeno(gol, dvaGlasovaZaNikogar))
  preveri('prag: liga s pragom 2 odloci ze pri dveh',
    brezAsistencePotrjeno(gol, dvaGlasovaZaNikogar, 2))
  preveri('prag: gol s pragom 2 ne caka vec',
    !caka(gol, dvaGlasovaZaNikogar, 2))
  preveri('prag: gol s privzetim pragom se caka',
    caka(gol, dvaGlasovaZaNikogar))
  preveri('prag: privzetek je enak strezniskemu', PRAG_ASISTENCE_PRIVZETO === 3,
    String(PRAG_ASISTENCE_PRIVZETO))

  // Adaptivni prag za pozicije mora slediti isti logiki kot `adaptivni_prag`
  // v migraciji, le da pragova zdaj prideta od klicatelja.
  preveri('prag: mocan prior zniza prag za 3', adaptivniPrag(0.8, 5, 2) === 2, String(adaptivniPrag(0.8, 5, 2)))
  preveri('prag: srednji prior zniza za 2', adaptivniPrag(0.55, 5, 2) === 3, String(adaptivniPrag(0.55, 5, 2)))
  preveri('prag: sibek prior ne zniza', adaptivniPrag(0.1, 5, 2) === 5, String(adaptivniPrag(0.1, 5, 2)))
  preveri('prag: nikoli pod spodnjo mejo', adaptivniPrag(0.9, 3, 2) === 2, String(adaptivniPrag(0.9, 3, 2)))
  preveri('prag: liga s pragom 3 se zniza na 2', adaptivniPrag(0.8, 3, 2) === 2, String(adaptivniPrag(0.8, 3, 2)))
}

// --- vmesnik prezivi neuveljavljeno migracijo -------------------------------
// Koda gre na Vercel, migracijo pa mora nekdo pognati proti Supabase. Ce se
// vrstni red obrne, PostgREST zavrne poizvedbo z neznanimi stolpci in vmesnik
// ostane BREZ LIG — nobena stran nima kaj pokazati. Zato zna brati tudi staro
// shemo.
{
  const staraVrstica = {
    id: 1, slug: 'clani', name: '1. GNL — clani', short_name: 'Clani',
    prvi_fantasy_krog: 1, country_code: 'SI', country_name: 'Slovenija',
  }
  const t = brezZveze(staraVrstica)
  preveri('stara shema: liga se prebere', t.slug === 'clani', t.slug)
  preveri('stara shema: polja zveze so prazna, ne manjkajoca',
    t.federation_code === null && t.federation_url === null && t.federation_sort === null,
    JSON.stringify([t.federation_code, t.federation_url, t.federation_sort]))
  preveri('stara shema: izbirnik jo uvrsti v skupino brez zveze',
    poZvezah([t])[0].kljuc === '—', poZvezah([t])[0].kljuc)
  preveri('stara shema: noga ne trdi vira', virPodatkov(t) === null)

  // Ce stolpci ZE obstajajo, jih ne smemo povoziti s praznimi.
  const nova = brezZveze({ ...staraVrstica, federation_code: 'mnzg', federation_name: 'MNZ Gorenjska' })
  preveri('nova shema: zveza se ohrani', nova.federation_code === 'mnzg', String(nova.federation_code))
}

// --- branje cez mejo tisoc vrstic ------------------------------------------
// PostgREST vrne najvec 1000 vrstic in tega ne pove — odgovor je videti
// obicajen, le krajsi. Z vsako novo ligo se meja tiho prekoraci.
{
  const lazniOdgovor = (skupaj) => async (od, do_) => ({
    data: Array.from({ length: Math.max(0, Math.min(do_, skupaj - 1) - od + 1) },
      (_, i) => ({ id: od + i })),
    error: null,
  })

  const malo = await vseVrstice(lazniOdgovor(42))
  preveri('strani: manj kot ena stran', malo.length === 42, String(malo.length))

  const cez = await vseVrstice(lazniOdgovor(2449))
  preveri('strani: cez mejo prebere vse', cez.length === 2449, String(cez.length))
  preveri('strani: vrstice se ne podvojijo',
    new Set(cez.map((v) => v.id)).size === 2449, String(new Set(cez.map((v) => v.id)).size))

  const natanko = await vseVrstice(lazniOdgovor(2000))
  preveri('strani: natanko dve strani', natanko.length === 2000, String(natanko.length))

  const prazno = await vseVrstice(lazniOdgovor(0))
  preveri('strani: nic vrstic', prazno.length === 0, String(prazno.length))

  let padlo = false
  try {
    await vseVrstice(async () => ({ data: null, error: { message: 'baza je padla' } }))
  } catch (e) { padlo = e.message === 'baza je padla' }
  preveri('strani: napaka se ne poje tiho', padlo)
}

// --- prevrednotenje ne sme skakati ------------------------------------------
// Borza premakne ceno najvec za 0.3 na krog in nikoli vec kot 3.0 od
// `value_start`. Prevrednotenje pa jo izracuna na novo — brez omejitve bi
// igralca s 4.5 cez noc prestavilo na 9.0, uporabnik pa ga ima v ekipi po
// stari ceni in proracun je vezan na ceno ob nakupu.
{
  preveri('premik: majhna razlika gre do cilja', premakniProti(5.0, 5.5) === 5.5,
    String(premakniProti(5.0, 5.5)))
  preveri('premik: velik skok navzgor je omejen', premakniProti(4.5, 9.0) === 5.5,
    String(premakniProti(4.5, 9.0)))
  preveri('premik: velik skok navzdol je omejen', premakniProti(9.0, 4.5) === 8.0,
    String(premakniProti(9.0, 4.5)))
  preveri('premik: brez razlike ostane isto', premakniProti(6.0, 6.0) === 6.0)
  preveri('premik: zaokrozi na 0.5', premakniProti(5.0, 5.3) === 5.5,
    String(premakniProti(5.0, 5.3)))
  preveri('premik: meja se da nastaviti', premakniProti(4.0, 12.0, 0.5) === 4.5,
    String(premakniProti(4.0, 12.0, 0.5)))
  preveri('premik: privzeta meja je 1.0', NAJVECJI_TEDENSKI_PREMIK === 1.0)

  // Po dovolj tednih mora cena cilj vseeno doseci — omejitev upocasni, ne ustavi.
  let c = 4.5
  for (let i = 0; i < 10; i++) c = premakniProti(c, 9.0)
  preveri('premik: po desetih tednih doseze cilj', c === 9.0, String(c))

  preveri('premik: zaokroževanje ne preseže meje navzgor',
    premakniProti(4.3, 9, 1) === 5.0, String(premakniProti(4.3, 9, 1)))
  preveri('premik: zaokroževanje ne preseže meje navzdol',
    premakniProti(8.7, 4, 1) === 8.0, String(premakniProti(8.7, 4, 1)))
  preveri('premik: tudi bližnji cilj ostane znotraj meje',
    premakniProti(4.3, 4.4, 0.1) === 4.3)
  preveri('premik: premajhna meja ne premakne cene v napačno smer',
    premakniProti(4.3, 9, 0.1) === 4.3 && premakniProti(8.7, 4, 0.1) === 8.7)
  preveri('premik: meja pod pol koraka ohrani ceno na mreži',
    premakniProti(4.5, 9, 0.3) === 4.5)
  preveri('premik: enaka decimalna cena ne potrebuje zaokroževanja',
    premakniProti(4.3, 4.3, 1) === 4.3)
  for (const cilj of [4, 4.3, 9])
    preveri(`premik: meja 0 ohrani 4.3 pri cilju ${cilj}`,
      premakniProti(4.3, cilj, 0) === 4.3, String(premakniProti(4.3, cilj, 0)))

  const primeri = []
  for (const trenutna of [4, 4.3, 4.5, 5.2, 8.7, 12])
    for (const ciljna of [4, 4.3, 4.4, 5.3, 9, 12])
      for (const najvec of [0, 0.1, 0.2, 0.3, 0.5, 1, 1.25])
        primeri.push({ trenutna, ciljna, najvec, nova: premakniProti(trenutna, ciljna, najvec) })
  preveri('premik: dejanski premik vedno spoštuje mejo',
    primeri.every((p) => Math.abs(p.nova - p.trenutna) <= p.najvec))
  preveri('premik: vsaka spremenjena cena je na mreži 0.5',
    primeri.every((p) => p.nova === p.trenutna || Number.isInteger(p.nova * 2)))
  preveri('premik: cena se nikoli ne premakne stran od cilja',
    primeri.every((p) => p.nova === p.trenutna ||
      Math.sign(p.nova - p.trenutna) === Math.sign(p.ciljna - p.trenutna)))

  // Ločen proces preveri prave argumente, izhodno kodo in poslane popravke;
  // nadomestimo le omrežje, da smoke nikoli ne piše v pravo bazo.
  const { spawnSync } = await import('node:child_process')
  const ovrednoti = (zastavice, moznosti = {}) => {
    const zagon = spawnSync(process.execPath, ['--input-type=module', '-e', `
      const zastavice = ${JSON.stringify(zastavice)}
      const moznosti = ${JSON.stringify(moznosti)}
      process.argv = ['node', 'scripts/ovrednoti-igralce.mjs', ...zastavice]
      const igralci = [
        { id: 1, full_name: 'Prvi igralec', position: 'MID', value: 4.5, value_start: null,
          value_locked: false, nzs_top_league: null, nzs_top_league_minutes: null },
        { id: 2, full_name: 'Drugi igralec', position: 'MID', value: 4.5, value_start: null,
          value_locked: false, nzs_top_league: null, nzs_top_league_minutes: null },
      ].map((p) => ({ ...p, ...(moznosti.igralci?.[p.id] ?? {}) }))
      const statistika = igralci.map((p) => ({ player_id: p.id, season: '2026/27',
        minutes: 900, goals: p.id, points: 20, matches: 10, clean_sheets: 0,
        yellow_cards: 0, red_cards: 0 }))
      const zapisi = []
      const zahteve = []
      process.on('exit', () => console.log('REZULTAT_PREMIKA:' + JSON.stringify({ igralci, zapisi, zahteve })))
      globalThis.fetch = async (vhod, moznostiZahteve) => {
        const zahteva = new Request(vhod, moznostiZahteve)
        const url = new URL(zahteva.url)
        const tabela = url.pathname.split('/').pop()
        zahteve.push({ tabela, metoda: zahteva.method })
        const odgovor = (data, status = 200) => new Response(JSON.stringify(data), {
          status, headers: { 'Content-Type': 'application/json' },
        })
        if (zahteva.method === 'GET') {
          if (tabela === 'competitions') return odgovor({ id: 1, name: 'Preizkusna liga', slug: 'clani' })
          if (tabela === 'players') return odgovor(igralci)
          if (tabela === 'player_season_stats') return odgovor(statistika)
          if (tabela === 'player_overview') return odgovor([])
          if (tabela === 'price_changes') {
            if (moznosti.napakaZgodovine) return odgovor({ message: 'Zgodovina ni dosegljiva' }, 500)
            const od = Number(url.searchParams.get('offset') ?? 0)
            const koliko = Number(url.searchParams.get('limit') ?? 1000)
            return odgovor((moznosti.zgodovina ?? []).slice(od, od + koliko))
          }
        }
        if (zahteva.method === 'PATCH' && tabela === 'players') {
          const id = Number(url.searchParams.get('id')?.replace('eq.', ''))
          const popravek = await zahteva.json()
          zapisi.push({ id, popravek })
          if (id === moznosti.neuspesen) return odgovor({ message: 'Zapis ni uspel' }, 400)
          Object.assign(igralci.find((p) => p.id === id), popravek)
          return new Response(null, { status: 204 })
        }
        throw new Error('Nepričakovana zahteva: ' + zahteva.method + ' ' + url)
      }
      await import(${JSON.stringify(new URL('./ovrednoti-igralce.mjs', import.meta.url).href)})
    `], {
      encoding: 'utf8', timeout: 10000,
      env: { PATH: process.env.PATH, SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'preizkusni-kljuc' },
    })
    const vrstica = zagon.stdout?.split('\n').find((v) => v.startsWith('REZULTAT_PREMIKA:'))
    return { ...zagon, ...(vrstica ? JSON.parse(vrstica.slice('REZULTAT_PREMIKA:'.length)) : {}) }
  }

  const zapis = ovrednoti(['--tedensko', '--pisi'])
  preveri('premik: tedenski zapis uspe', zapis.status === 0, zapis.stderr)
  preveri('premik: novo sidro dobi končno omejeno ceno',
    zapis.igralci?.[1].value === 5.5 && zapis.igralci?.[1].value_start === 5.5,
    JSON.stringify(zapis.igralci?.[1]))
  const decimalna = ovrednoti(['--tedensko', '--pisi'], {
    igralci: { 2: { value: 4.3, value_start: 7.3 } },
  })
  preveri('premik: premik sidra ohrani razliko do cene tudi pri decimalni ceni',
    decimalna.igralci?.[1].value === 5 && decimalna.igralci?.[1].value_start === 8,
    JSON.stringify(decimalna.igralci?.[1]))
  const odmik = ovrednoti(['--tedensko', '--pisi'], {
    igralci: { 2: { value: 4.3, value_start: 4.5 } },
  })
  preveri('premik: sidra ne zaokroži na račun obstoječega odmika',
    odmik.igralci?.[1].value === 5 && odmik.igralci?.[1].value_start === 5.2,
    JSON.stringify(odmik.igralci?.[1]))
  const nic = ovrednoti(['--tedensko', '--pisi', '--najvec', '0'], {
    igralci: { 2: { value: 4.3, value_start: 4.3 } },
  })
  preveri('premik: tedenska meja 0 ne pošlje nobenega zapisa',
    nic.status === 0 && nic.zapisi?.length === 0, nic.stderr)

  for (const meja of ['NaN', 'abc', '-1', 'Infinity', '-Infinity', '1e309', '', ' ']) {
    const neveljavna = ovrednoti(['--tedensko', '--pisi', '--najvec', meja])
    preveri(`premik: neveljavna meja ${meja} ustavi zagon pred dostopom do baze`,
      neveljavna.status === 1 && neveljavna.stderr.includes('--najvec') &&
      neveljavna.zahteve?.length === 0, neveljavna.stderr.trim())
  }
  const brezMeje = ovrednoti(['--tedensko', '--pisi', '--najvec'])
  preveri('premik: manjkajoča vrednost meje ustavi zagon pred dostopom do baze',
    brezMeje.status === 1 && brezMeje.stderr.includes('--najvec') && brezMeje.zahteve?.length === 0)
  const predlog = ovrednoti(['--tedensko'])
  preveri('premik: tedenski predogled ne piše v bazo',
    predlog.status === 0 && predlog.zahteve?.every((z) => z.metoda === 'GET'), predlog.stderr)
  preveri('premik: predogled pokaže ceno in navodilo za zapis',
    predlog.stdout.includes('4.5 → 5.5') &&
    predlog.stdout.includes('To je le predlog. Za zapis v bazo dodaj --pisi'))
  preveri('premik: porazdelitev predloga kaže omejene cene',
    predlog.stdout.includes('\n  5.5  ') && !predlog.stdout.includes('\n  12.0  '))
  const delni = ovrednoti(['--tedensko', '--pisi'], { neuspesen: 1 })
  preveri('premik: delni neuspeh ne ustavi preostalih zapisov',
    delni.igralci?.[0].value === 4.5 && delni.igralci?.[1].value === 5.5)
  preveri('premik: delni neuspeh javi neuspešen izhod in oba števca',
    delni.status === 1 && delni.stderr.includes('Neuspešnih: 1, uspešnih: 1'), delni.stderr.trim())
  const obicajni = ovrednoti(['--pisi'], { neuspesen: 1 })
  preveri('premik: tudi običajno vrednotenje javi delni neuspeh',
    obicajni.status === 1 && obicajni.stderr.includes('Neuspešnih: 1, uspešnih: 1'), obicajni.stderr.trim())

  const zgodovina = [
    { id: 1, player_id: 2, round_id: 10, old_value: 4.5, new_value: 4.4, form: 1,
      changed_at: '2026-09-01T00:00:00Z' },
    { id: 2, player_id: 2, round_id: 11, old_value: 4.4, new_value: 4.3, form: 1,
      changed_at: '2026-09-08T00:00:00Z' },
  ]
  for (const zastavice of [['--tedensko'], ['--tedensko', '--pisi']]) {
    const borza = ovrednoti(zastavice, {
      zgodovina, igralci: { 2: { value: 4.3, value_start: 4.5 } },
    })
    preveri(`premik: ${zastavice.join(' ')} prepusti ceno in sidro borzi`,
      borza.status === 0 && borza.igralci?.[1].value === 4.3 &&
      borza.igralci?.[1].value_start === 4.5 && !borza.zapisi?.some((z) => z.id === 2), borza.stderr)
    preveri(`premik: ${zastavice.join(' ')} jasno izpiše preskok zaradi borze`,
      borza.stdout.includes('Preskočenih (cene upravlja borza): 1'))
  }
  const velikoZgodovine = ovrednoti(['--tedensko', '--pisi'], {
    zgodovina: [...Array.from({ length: 1000 }, (_, i) => ({ ...zgodovina[0], id: i + 1, player_id: 1 })),
      { ...zgodovina[1], id: 1001 }],
  })
  preveri('premik: borzna zgodovina ščiti tudi igralce po prvi strani',
    velikoZgodovine.status === 0 && velikoZgodovine.zapisi?.length === 0, velikoZgodovine.stderr)
  const brezZgodovine = ovrednoti(['--tedensko', '--pisi'], { napakaZgodovine: true })
  preveri('premik: neuspešno branje zgodovine prepreči vse zapise',
    brezZgodovine.status === 1 && brezZgodovine.zapisi?.length === 0 &&
    brezZgodovine.stderr.includes('Zgodovina ni dosegljiva'), brezZgodovine.stderr.trim())
  const primerjava = ovrednoti(['--tedensko', '--pisi'], {
    zgodovina: [{ ...zgodovina[0], player_id: 1 }],
  })
  preveri('premik: borzni igralec ostane v percentilni primerjavi lige',
    primerjava.status === 0 && primerjava.zapisi?.length === 1 &&
    primerjava.zapisi[0].id === 2 && primerjava.igralci?.[1].value === 5.5 &&
    primerjava.igralci?.[1].value_start === 5.5)
  const zacetne = ovrednoti(['--pisi'], { zgodovina })
  preveri('premik: običajno začetno vrednotenje ohrani dosedanje pisanje',
    zacetne.status === 0 && zacetne.igralci?.[1].value === 12 &&
    zacetne.igralci?.[1].value_start === 12 &&
    zacetne.zahteve?.every((z) => z.tabela !== 'price_changes'))
}

// --- pripravljenost lige na vklop -------------------------------------------
// Liga, v kateri stane vsak igralec 4.5, nima igre: 15 x 4.5 = 67.5 pri
// proracunu 100 in vsaka ekipa je enaka. Zato vklop stoji za temi preverbami.
{
  let id = 0
  const skupina = (team_id, position, cene) => cene.map((value) => ({
    id: ++id, team_id, position, value,
  }))
  // Poceni vratarja zasedeta klub, iz katerega nujno potrebujemo branilce.
  // Veljaven minimum je 2 × 5 + 3 × 4 + 2 × 4 + 5 × 5 + 3 × 6 = 73.
  const igralci = [
    ...skupina(1, 'GK', [4, 4]), ...skupina(1, 'DEF', [4, 4, 4]),
    ...skupina(2, 'GK', [5, 5]), ...skupina(2, 'MID', [5]),
    ...skupina(3, 'DEF', [4, 4]), ...skupina(3, 'MID', [5]),
    ...skupina(4, 'MID', [5, 5, 5]), ...skupina(5, 'FWD', [6, 6, 6]),
  ]
  const vsiBranilciIzEnega = igralci.map((i) => ({
    ...i, team_id: i.position === 'DEF' ? 1 : i.team_id,
  }))
  const najcenejsi = najcenejsiKader
  preveri('kader: veljaven kader stane 73 kljub pohlepni slepi ulici', najcenejsi(igralci) === 73)
  preveri('kader: vrstni red vhodnih igralcev ne vpliva na minimum',
    najcenejsi([...igralci].reverse()) === 73)
  preveri('kader: vseh pet branilcev iz enega kluba ni izvedljivo',
    najcenejsi(vsiBranilciIzEnega) === null)
  preveri('kader: prazen seznam ni izvedljiv', najcenejsi([]) === null)
  preveri('kader: minimum se izračuna tudi nad proračunom',
    najcenejsi(igralci.map((i) => ({ ...i, value: 7 }))) === 105)
  const meja = igralci.map((i, n) => ({ ...i, value: n === 15 ? 7.6 : 6.6 }))
  preveri('kader: decimalne cene in kader točno za 100', najcenejsi(meja) === 100)
  preveri('kader: podvojena vrstica ne ustvari dodatnega igralca',
    najcenejsi([...igralci.filter((i) => i.position !== 'GK'), igralci[5], igralci[5]]) === null)

  // Izčrpna izbira podmnožic je neodvisna kontrola minimuma pri prepletenih klubih.
  const izcrpno = (vsi) => {
    let minimum = Infinity
    const izberi = (od, kader) => {
      if (kader.length === 15) {
        const poPoziciji = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
        const poKlubu = new Map()
        for (const i of kader) {
          poPoziciji[i.position]++
          poKlubu.set(i.team_id, (poKlubu.get(i.team_id) ?? 0) + 1)
        }
        if (poPoziciji.GK === 2 && poPoziciji.DEF === 5 && poPoziciji.MID === 5 &&
            poPoziciji.FWD === 3 && [...poKlubu.values()].every((n) => n <= 3))
          minimum = Math.min(minimum, kader.reduce((vsota, i) => vsota + Math.round(i.value * 100), 0))
        return
      }
      for (let i = od; i <= vsi.length - (15 - kader.length); i++)
        izberi(i + 1, [...kader, vsi[i]])
    }
    izberi(0, [])
    return Number.isFinite(minimum) ? minimum / 100 : null
  }
  for (let primer = 0; primer < 6; primer++) {
    const kandidati = [...igralci, ...skupina(6, 'DEF', [4.2]), ...skupina(6, 'MID', [4.8])]
      .map((i, n) => ({ ...i, value: 4 + ((n * 7 + primer * 3) % 30) / 10 }))
    preveri(`kader: minimum se ujema z izčrpnim iskanjem (${primer + 1})`,
      najcenejsi(kandidati) === izcrpno(kandidati))
  }
  const zdrava = {
    aktivnih: 400, privzetih: 200, klubov: 12, najvisjaCena: 12,
    poPozicijah: { GK: 30, DEF: 120, MID: 130, FWD: 70 },
    nastopovSKlopi: 1200, golovBrezNastopa: 0, krogovTekoce: 22,
    igralci,
  }
  const o = oceniPripravljenost(zdrava)
  preveri('pripravljenost: zdrava liga je pripravljena', o.pripravljena,
    o.tezave.map((t) => t.kaj).join('; '))

  preveri('pripravljenost: pet branilcev iz enega kluba ustavi vklop',
    !oceniPripravljenost({ ...zdrava, igralci: vsiBranilciIzEnega }).pripravljena)
  preveri('pripravljenost: najcenejši kader nad proračunom ustavi vklop',
    !oceniPripravljenost({ ...zdrava, igralci: igralci.map((i) => ({ ...i, value: 7 })) }).pripravljena)
  preveri('pripravljenost: brez podatkov za kader ni dovoljenja za vklop',
    !oceniPripravljenost({ ...zdrava, igralci: undefined }).pripravljena)
  preveri('pripravljenost: kader točno na proračunu dovoljuje vklop',
    oceniPripravljenost({ ...zdrava, igralci: meja }).pripravljena)

  const vsiPrivzeti = oceniPripravljenost({ ...zdrava, privzetih: 380, najvisjaCena: 4.5 })
  preveri('pripravljenost: cenik brez razlik ustavi vklop', !vsiPrivzeti.pripravljena)
  preveri('pripravljenost: pove, da so cene privzete',
    vsiPrivzeti.tezave.some((t) => t.kljuc === 'cene'),
    vsiPrivzeti.tezave.map((t) => t.kljuc).join(','))

  // Menjave: ce jih razclenjevalnik ne prebere, ima vsak 90 minut in nihce ne
  // pride s klopi. To je bilo pri MNZ Ljubljana in ni javilo nicesar.
  const brezKlopi = oceniPripravljenost({ ...zdrava, nastopovSKlopi: 0 })
  preveri('pripravljenost: nic nastopov s klopi ustavi vklop', !brezKlopi.pripravljena)
  preveri('pripravljenost: pove, da menjave niso prebrane',
    brezKlopi.tezave.some((t) => t.kljuc === 'menjave'))

  const goliBrez = oceniPripravljenost({ ...zdrava, golovBrezNastopa: 12 })
  preveri('pripravljenost: gol brez nastopa strelca ustavi vklop', !goliBrez.pripravljena)

  // Povzetki so za prikaz; o izvedljivosti odločajo dejanski kandidati.
  preveri('pripravljenost: izvedljiv kader ni odvisen od ločenih števcev',
    oceniPripravljenost({ ...zdrava, klubov: 0, poPozicijah: {} }).pripravljena)
  const malo = oceniPripravljenost({ ...zdrava,
    igralci: igralci.map((i) => ({ ...i, team_id: i.team_id % 3 })),
  })
  preveri('pripravljenost: premalo klubov za kader', !malo.pripravljena,
    malo.tezave.map((t) => t.kljuc).join(','))

  const brezVratarjev = oceniPripravljenost({ ...zdrava,
    igralci: igralci.filter((i) => i.position !== 'GK'),
  })
  preveri('pripravljenost: premalo vratarjev', !brezVratarjev.pripravljena)

  const brezKrogov = oceniPripravljenost({ ...zdrava, krogovTekoce: 0 })
  preveri('pripravljenost: brez krogov tekoce sezone', !brezKrogov.pripravljena)

  preveri('pripravljenost: vsaka tezava ima razlago',
    vsiPrivzeti.tezave.every((t) => t.kaj && t.zakaj))

  // Pravi CLI mora prenesti tudi seznam igralcev iz RPC; sicer ustavi vsak uvoz.
  // Nadomestimo le omrežje, da smoke ne more doseči niti lokalne niti produkcijske baze.
  const { spawnSync } = await import('node:child_process')
  const cli = (skripta, kandidati, moznosti = {}) => spawnSync(process.execPath, ['--input-type=module', '-e', `
    const igralci = ${JSON.stringify(kandidati)}
    const moznosti = ${JSON.stringify(moznosti)}
    const liga = { id: 1, name: 'Preizkusna liga', slug: 'preizkus' }
    process.argv = ['node', ${JSON.stringify(skripta)}, '--tekmovanje', liga.slug]
    globalThis.fetch = async (vhod, nastavitve) => {
      const zahteva = new Request(vhod, nastavitve)
      const url = new URL(zahteva.url)
      const tabela = url.pathname.split('/').pop()
      const odgovor = (data, status = 200) => new Response(JSON.stringify(data), {
        status, headers: { 'Content-Type': 'application/json' },
      })
      if (tabela === 'competitions')
        return odgovor(url.searchParams.has('slug') ? liga : [liga])
      if (tabela === 'preveri_podatke') return odgovor([])
      // Zamujene tekme: privzeto jih ni. Preverba mora znati lociti "ni
      // zamud" od "poizvedba je padla", zato tu vrnemo prazen seznam in ne
      // napake — zamude imajo svojo trditev nize.
      if (tabela === 'matches')
        return odgovor(moznosti.zamude ?? [])
      // Vratarji z goli tekoče sezone (preveri-podatke): privzeto jih ni.
      if (tabela === 'player_season_standings') return odgovor(moznosti.strelci ?? [])
      if (tabela === 'player_overview') return odgovor([])
      if (tabela === 'players') {
        const od = Number(url.searchParams.get('offset') ?? 0)
        const koliko = Number(url.searchParams.get('limit') ?? 1000)
        return odgovor(igralci.slice(od, od + koliko))
      }
      if (tabela === 'stanje_lige') {
        if (moznosti.napaka) return odgovor({ message: 'Stanje ni dosegljivo' }, 500)
        if (moznosti.prazno) return odgovor(null)
        return odgovor({
          aktivnih: igralci.length,
          privzetih: igralci.filter((i) => i.value === 4.5).length,
          klubov: new Set(igralci.map((i) => i.team_id)).size,
          najvisja_cena: Math.max(...igralci.map((i) => i.value)),
          po_pozicijah: Object.fromEntries(['GK', 'DEF', 'MID', 'FWD'].map((p) =>
            [p, igralci.filter((i) => i.position === p).length])),
          nastopov_s_klopi: 10, golov_brez_nastopa: 0, krogov_tekoce: 1,
          ...(moznosti.brezIgralcev ? {} : { igralci }),
        })
      }
      throw new Error('Nepričakovana zahteva: ' + zahteva.method + ' ' + url)
    }
    await import(${JSON.stringify(new URL('./', import.meta.url).href)} + ${JSON.stringify(skripta)})
  `], {
    encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'preizkusni-kljuc' },
  })
  const vrhCenika = skupina(6, 'GK', [12])
  for (const skripta of ['preveri-podatke.mjs', 'pripravljenost-lige.mjs']) {
    for (const [ime, kandidati, status] of [
      ['pohlepna slepa ulica', igralci, 0],
      ['kader točno za 100', meja, 0],
      ['prepletene neizvedljive kvote', vsiBranilciIzEnega, 1],
      ['kader nad proračunom', igralci.map((i) => ({ ...i, value: 7 })), 1],
    ]) {
      const izid = cli(skripta, [...kandidati, ...vrhCenika])
      preveri(`${skripta}: ${ime}`, izid.status === status, izid.stderr || izid.stdout.trim())
    }
  }
  // Tekma, ki bi morala biti ze uvozena, je tezava — uvoz je lahko padel,
  // podatki v bazi pa so videti brezhibni. Prav to je dva dni ostalo neopazeno.
  {
    const zamuda = [{
      id: 1818, played_on: '2026-09-11', imported_at: null,
      rounds: { competition_id: 1, competitions: { slug: 'preizkus', active: true } },
    }]
    const izid = cli('preveri-podatke.mjs', [...igralci, ...vrhCenika], { zamude: zamuda })
    preveri('preverba javi tekmo, ki bi ze morala biti uvozena',
      izid.status === 1 && izid.stdout.includes('se ni uvozena'),
      izid.stdout.trim().split('\n').slice(-1)[0])
  }
  // Vratar z goli je skoraj gotovo igralec iz polja (Labaška: 49 golov kot GK).
  {
    const strelci = [{ id: 22641, full_name: 'Labaška Martin', goals: 49, competition_id: 1 }]
    const izid = cli('preveri-podatke.mjs', [...igralci, ...vrhCenika], { strelci })
    preveri('preverba javi vratarja z goli',
      izid.status === 1 && izid.stdout.includes('vratar-strelec') && izid.stdout.includes('Labaška'),
      izid.stdout.trim().split('\n').slice(-1)[0])
  }
  // Igralec iz polja v vratih (Debeljak): uvoz ga ne prekrsti, preverba javi.
  {
    const zamude = [{
      id: 2001, played_on: new Date().toISOString().slice(0, 10), imported_at: '2026-10-01',
      import_warnings: ['v vratih, a vodimo ga v polju: Debeljak Matic (MID)'],
      rounds: { competition_id: 1, competitions: { slug: 'preizkus', active: true } },
    }]
    const izid = cli('preveri-podatke.mjs', [...igralci, ...vrhCenika], { zamude })
    preveri('preverba javi igralca iz polja v vratih',
      izid.status === 1 && izid.stdout.includes('v-vratih-iz-polja') && izid.stdout.includes('Debeljak Matic (MID)'),
      izid.stdout.trim().split('\n').slice(-1)[0])
  }

  for (const moznosti of [{ napaka: true }, { prazno: true }, { brezIgralcev: true }]) {
    const izid = cli('pripravljenost-lige.mjs', [...igralci, ...vrhCenika], moznosti)
    preveri(`pripravljenost CLI: manjkajoče stanje ne dovoli vklopa (${Object.keys(moznosti)[0]})`,
      izid.status === 1 && !izid.stdout.includes('Liga je pripravljena na vklop'), izid.stderr.trim())
    if (moznosti.prazno)
      preveri('pripravljenost CLI: prazen odgovor ima razumljivo napako',
        izid.stderr.includes('Stanja lige ni mogoče prebrati'))
  }
}

// Uspešen prazen izid SQL ne sme prikriti neuspešnega branja lig.
{
  const { spawnSync } = await import('node:child_process')
  const zagon = spawnSync(process.execPath, ['--input-type=module', '-e', `
    globalThis.fetch = async (vhod, moznosti) => {
      const zahteva = new Request(vhod, moznosti)
      const pot = new URL(zahteva.url).pathname
      if (pot.endsWith('/rpc/preveri_podatke'))
        return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
      if (pot.endsWith('/competitions'))
        return new Response(JSON.stringify({ message: 'Branje lig ni uspelo' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        })
      throw new Error('Nepričakovana zahteva: ' + pot)
    }
    await import(${JSON.stringify(new URL('./preveri-podatke.mjs', import.meta.url).href)})
  `], {
    encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'preizkusni-kljuc' },
  })
  preveri('podatki: napaka branja lig konča nadzor z napako',
    zagon.status === 1 && zagon.stderr.includes('Branje lig ni uspelo'), zagon.stderr.trim())
  preveri('podatki: napaka branja lig nikoli ne izpiše uspeha', !zagon.stdout.includes('Vse v redu'))
}

// --- vabilo prijatelju ------------------------------------------------------
// Besedilo je bilo zapisano v kodi in je nastevalo trinajst gorenjskih klubov.
// Pri eni ligi je bilo to najboljse mozno vabilo; pri devetih zvezah bi igralec
// iz Ptuja vabil s klubi, ki jih ni nikoli videl.
{
  const liga = { id: 1, slug: 'pt-super', name: 'Super liga — Ptuj', short_name: 'PT 1.',
    prvi_fantasy_krog: 1, federation_code: 'mnzpt', federation_name: 'MNZ Ptuj',
    federation_short: 'Ptuj', federation_url: null, federation_sort: 4,
    country_code: 'SI', country_name: 'Slovenija' }

  const v = sestaviVabilo(liga, ['Bukovci', 'Dornava', 'Apace'])
  preveri('vabilo: zadeva imenuje pravo ligo', v.zadeva.includes('Super liga — Ptuj'), v.zadeva)
  preveri('vabilo: brez sklanjanja imena lige', !/za Super liga\b/.test(v.besedilo), v.besedilo.slice(0, 70))
  preveri('vabilo: ne podvoji predloga', !v.besedilo.includes('igralcev iz naših'), v.besedilo.slice(60, 130))
  preveri('vabilo: nasteje prave klube', v.besedilo.includes('Bukovci, Dornava, Apace'))
  preveri('vabilo: ne omenja Gorenjske', !/Gorenjsk|GNL/.test(v.besedilo))
  preveri('vabilo: doda zvezo, ce je ni v imenu', v.besedilo.includes('(MNZ Ptuj)'))

  // Brez klubov mora ostati smiseln stavek, ne pa "iz nasih klubov ()".
  const brez = sestaviVabilo(liga, [])
  preveri('vabilo: brez klubov ni praznega oklepaja', !brez.besedilo.includes('()'), brez.besedilo.slice(0, 90))
  preveri('vabilo: brez lige se vedno povabi', sestaviVabilo(null).besedilo.includes('Registriraj se'))

  // Ce je zveza ze v imenu lige, je ne podvajamo.
  const gnl = sestaviVabilo({ ...liga, name: 'MNZ Ptuj liga', federation_name: 'MNZ Ptuj' }, [])
  preveri('vabilo: zveze ne podvoji', !gnl.besedilo.includes('MNZ Ptuj (MNZ Ptuj)'))

  preveri('vabilo: mailto zakodira zadevo in telo',
    vabiloMailto(v).startsWith('mailto:?subject=') && vabiloMailto(v).includes('&body='))
}

// --- viri ------------------------------------------------------------------
{
  preveri('viri: poznamo mnzg in mnzlj',
    znaniViri().includes('mnzg') && znaniViri().includes('mnzlj'), znaniViri().join(', '))

  const lj = viraZa({ source: 'mnzlj', slug: 'lj-1-liga' })
  preveri('viri: mnzlj se predstavi', lj.ime === 'mnzlj' && lj.drzava === 'SI', lj.ime)

  // Naslovi so preverjeni proti zivemu spletiscu (vsi 200), zato jih tu
  // pribijemo — tiho spremenjen naslov bi sicer padel sele med uvozom.
  preveri('viri: mnzlj razpored',
    lj.naslovRazporeda(2003) ===
      'https://www.mnzljubljana-zveza.si/index.cfm?akc=tekmovanja&liga=2003&prikazi=razpored',
    lj.naslovRazporeda(2003))
  preveri('viri: mnzlj zapisnik',
    lj.naslovZapisnika(2003, 12345) ===
      'https://www.mnzljubljana-zveza.si/index.cfm?akc=zapisnik&liga=2003&zapisnik=12345',
    lj.naslovZapisnika(2003, 12345))
  preveri('viri: mnzlj delegiranje',
    lj.naslovDelegiranja(2003, 3).startsWith(
      'https://www.mnzljubljana-zveza.si/print.cfm?prikazi=delegiranje&liga=2003&krog=3'),
    lj.naslovDelegiranja(2003, 3))

  // Ljubljanski klub ne sme skozi gorenjski slovar vzdevkov: to sta dva vira
  // in dva niza klubov, ki se lahko imenujeta enako.
  const gor = viraZa({ source: 'mnzg' })
  preveri('viri: mnzg zdruzi znani vzdevek',
    gor.kljucKluba('Preddvor SP Avto') === 'eltron preddvor', gor.kljucKluba('Preddvor SP Avto'))
  preveri('viri: mnzlj gorenjskih vzdevkov ne uporablja',
    lj.kljucKluba('Preddvor SP Avto') === 'preddvor sp avto', lj.kljucKluba('Preddvor SP Avto'))
  preveri('viri: mnzlj poenostavi enako', lj.kljucKluba('NK Ivančna Gorica') === 'nk ivančna gorica',
    lj.kljucKluba('NK Ivančna Gorica'))

  // Ljubljanski klubi so med sezono dobili sponzorja oz. predpono. Brez teh
  // treh vzdevkov je vsak nastopal kot dva kluba: "Ljubljana" 12 tekem in
  // "Ljubljana Arol" 12 v ISTI sezoni, "Vir" 13 in "SD Vir" 7. To razklane
  // igralce, statistiko in pravilo o najvec treh igralcih iz kluba.
  for (const [pisano, isti] of [
    ['Ljubljana Arol', 'ljubljana'],
    ['ŠD Vir', 'vir'],
    ['NK IAK Kresnice', 'kresnice'],
  ]) {
    preveri(`viri: mnzlj zdruzi "${pisano}"`, lj.kljucKluba(pisano) === isti, lj.kljucKluba(pisano))
  }
  preveri('viri: mnzlj pusti neznan klub pri miru',
    lj.kljucKluba('Kočevje') === 'kočevje', lj.kljucKluba('Kočevje'))

  // MNZ Ljubljana zapisnikov o registracijah ne objavlja; uvoz naj to pove,
  // namesto da porocca "0 zapisnikov", kar je videti kot okvara.
  preveri('viri: mnzlj nima registracij', lj.imaRegistracije === false, String(lj.imaRegistracije))
  preveri('viri: mnzg ima registracije', gor.imaRegistracije !== false, String(gor.imaRegistracije))

  // Celje — tretja zveza na istem CMS-u.
  const ce = viraZa({ source: 'mnzce', slug: 'ce-clani' })
  preveri('viri: poznamo tudi mnzce', znaniViri().includes('mnzce'), znaniViri().join(', '))
  preveri('viri: mnzce zapisnik',
    ce.naslovZapisnika(1902, 158079) ===
      'https://www.mnzcelje.com/index.cfm?akc=zapisnik&liga=1902&zapisnik=158079',
    ce.naslovZapisnika(1902, 158079))
  preveri('viri: mnzce razpored',
    ce.naslovRazporeda(1902) ===
      'https://www.mnzcelje.com/index.cfm?akc=tekmovanja&liga=1902&prikazi=razpored',
    ce.naslovRazporeda(1902))
  preveri('viri: mnzce nima registracij', ce.imaRegistracije === false)
  preveri('viri: mnzce ne uporablja tujih vzdevkov',
    ce.kljucKluba('Preddvor SP Avto') === 'preddvor sp avto', ce.kljucKluba('Preddvor SP Avto'))

  let padlo = false
  try { viraZa({ source: 'ni-tak-vir', slug: 'x' }) } catch { padlo = true }
  preveri('viri: neznan vir pade takoj', padlo)
}

// --- razpored --------------------------------------------------------------
// Pod razporedom stran nadaljuje z rezultati — najprej te lige, nato DRUGE.
// Kranj naslovi blok "REZULTATI", Ljubljana "REZULTATI TEKEM"; primerjava z
// enakostjo je zato Ljubljani spustila skozi cel blok 2. lige in v 1. ligo
// pripeljala Kamnik, Termit Moravce, SD Vir in se pet tujih klubov.
{
  const vrstice = (ime) =>
    readFileSync(new URL(`../scripts/vzorci/${ime}`, import.meta.url), 'utf8').split('\n')

  const klubi = (krogi) =>
    new Set(krogi.flatMap((k) => k.tekme.flatMap((t) => [t.domaci, t.gostje])))

  {
    const k = razcleniRazpored(vrstice('razpored-ljubljana-2003.txt'))
    preveri('razpored LJ: 22 krogov', k.length === 22, String(k.length))
    preveri('razpored LJ: 12 klubov', klubi(k).size === 12, [...klubi(k)].length + ': ' + [...klubi(k)].join(', ').slice(0, 60))
    preveri('razpored LJ: brez klubov 2. lige',
      !['Kamnik', 'Termit Moravče', 'ŠD Vir', 'Črnuče'].some((c) => klubi(k).has(c)),
      [...klubi(k)].join(', ').slice(0, 70))
    preveri('razpored LJ: vsak krog ima 6 tekem',
      k.every((r) => r.tekme.length === 6), k.map((r) => r.tekme.length).join(','))
    // Tekma ima lahko svoj datum, drugacen od naslova kroga ("1. krog 29.08.26").
    preveri('razpored LJ: krog 1 se igra konec avgusta',
      k[0].tekme[0].datum === '2026-08-30', String(k[0].tekme[0].datum))
  }

  {
    const k = razcleniRazpored(vrstice('razpored-kranj-1601.txt'))
    preveri('razpored Kranj: 26 krogov', k.length === 26, String(k.length))
    // Kranj ima 13 klubov, zato je v vsakem krogu en prost.
    preveri('razpored Kranj: 13 klubov', klubi(k).size === 13, String(klubi(k).size))
    preveri('razpored Kranj: vsak krog ima 6 tekem',
      k.every((r) => r.tekme.length === 6), k.map((r) => r.tekme.length).join(','))
    // Vzorec ima izide le pri 1. krogu; izidi pod blokom REZULTATI ne štejejo.
    preveri('razpored Kranj: odigranih je 6 tekem 1. kroga',
      k.flatMap((r) => r.tekme).filter((t) => t.odigrana).length === 6 &&
        k[0].tekme.every((t) => t.odigrana),
      String(k.flatMap((r) => r.tekme).filter((t) => t.odigrana).length))
  }

  {
    // Kontumacija ima izid brez polčasa; odigrana tekma s polčasom ni.
    const k = razcleniRazpored([
      '5. krog 23.09.26', 'Niko Železniki : Tržič 2012', '3 : 0()',
      'Polet : Topdom Dom Trade Bitnje', '5 : 0(3 : 0)', 'Britof : Sava Kranj',
    ])
    preveri('razpored: kontumacija "3 : 0()" označena, samo ta',
      k[0].tekme.length === 3 && k[0].tekme[0].kontumacija === true &&
        !k[0].tekme[1].kontumacija && !k[0].tekme[2].kontumacija,
      JSON.stringify(k[0].tekme.map((t) => !!t.kontumacija)))
    // Izid pove, ali je tekma pri viru odigrana; tekma brez njega je
    // prestavljena (lahko brez novega datuma) ali še na vrsti.
    preveri('razpored: odigrana = izid pod tekmo',
      k[0].tekme.map((t) => t.odigrana).join(',') === 'true,true,false',
      JSON.stringify(k[0].tekme.map((t) => t.odigrana)))
  }

  {
    // Bled Bohinj : Sava Kranj (mladinci 1603, 6. krog 4. 10. 2026) je
    // prestavljena brez novega datuma: stoji pri starem, izida nima.
    const k = razcleniRazpored([
      '6. krog 04.10.26', '04.10.26', 'Bled Bohinj : Sava Kranj', '04.10.26',
      'Kranj : Šenčur', '2 : 1(1 : 0)', '05.10.26', 'Tržič : Naklo', '3 : 3',
      'Britof : Preddvor', '17:30', 'Žiri : Jesenice', '0 :3(u.d.)',
    ])
    const t = Object.fromEntries(k[0].tekme.map((x) => [x.domaci, x]))
    preveri('razpored: prestavljena brez datuma ni odigrana',
      t['Bled Bohinj'].odigrana === false && t['Bled Bohinj'].datum === '2026-10-04')
    preveri('razpored: izid s polčasom ali brez je odigrana',
      t.Kranj.odigrana === true && t['Tržič'].odigrana === true)
    preveri('razpored: ura "17:30" ni izid', t.Britof.odigrana === false)
    preveri('razpored: kontumacija "(u.d.)" je odigrana', t['Žiri'].odigrana === true && t['Žiri'].kontumacija === true)

    // Oznaka za uvoz: minula brez izida da true, prihodnja false, vir brez
    // podatka null; razpored brez enega samega izida je pokvarjen (null).
    const o = oznakaBrezIzida(k, '2026-10-09')
    preveri('brez izida: minula neodigrana tekma je označena',
      o.brezIzida(t['Bled Bohinj']) === true && o.brezIzida(t.Kranj) === false && !o.pokvarjen)
    preveri('brez izida: prihodnja tekma ni označena',
      o.brezIzida({ datum: '2026-10-20', odigrana: false }) === false)
    const brezPodatka = oznakaBrezIzida([{ tekme: [{ datum: '2026-10-01' }, { datum: '2026-10-02' }] }], '2026-10-09')
    preveri('brez izida: vir brez podatka ne pove nič', brezPodatka.brezIzida({ datum: '2026-10-01' }) === null)
    const nicIzidov = oznakaBrezIzida([{ tekme: ['01', '02', '03'].map((d) => ({ datum: `2026-10-${d}`, odigrana: false })) }], '2026-10-09')
    preveri('brez izida: razpored brez enega izida je pokvarjen in ne označi',
      nicIzidov.pokvarjen && nicIzidov.brezIzida({ datum: '2026-10-01', odigrana: false }) === null)
  }

  {
    const k = razcleniRazpored(vrstice('razpored-celje-1902.txt'))
    preveri('razpored Celje: 18 krogov', k.length === 18, String(k.length))
    preveri('razpored Celje: 10 klubov', klubi(k).size === 10, String(klubi(k).size))
    preveri('razpored Celje: vsak krog 5 tekem',
      k.every((r) => r.tekme.length === 5), k.map((r) => r.tekme.length).join(','))
  }

  {
    // Celje kontumacijo piše "po uradni dolžnosti": "0 :3(u.d.)". Zapisnika
    // obeh tekem sta prazna (brez sodnika in postav) — prava vzorca 2025/26.
    const k = razcleniRazpored(vrstice('razpored-celje-1801.txt'))
    const kont = k.flatMap((r) => r.tekme.filter((t) => t.kontumacija).map((t) => `${r.stevilka}:${t.domaci}:${t.gostje}`))
    preveri('razpored Celje: kontumacija "(u.d.)" označena, samo ti dve',
      kont.length === 2 && kont.includes('1:NK Šmarje pri Jelšah:NK Žalec - Združena Savinjska') &&
        kont.includes('15:NK Šampion:Mons Claudius'), kont.join(' | '))
    preveri('razpored Celje: odigrane tekme niso kontumacije',
      k.flatMap((r) => r.tekme).filter((t) => !t.kontumacija).length > 80)
  }

  preveri('razpored: datum z dvomestno letnico', datum('29.08.26') === '2026-08-29', datum('29.08.26'))
  preveri('razpored: datum s stirimestno letnico', datum('29.08.2026') === '2026-08-29', datum('29.08.2026'))
  preveri('razpored: sezona iz avgusta', sezonaIz('2026-08-29') === '2026/27', sezonaIz('2026-08-29'))
  preveri('razpored: sezona iz marca', sezonaIz('2027-03-13') === '2026/27', sezonaIz('2027-03-13'))
  preveri('razpored: koledarska sezona iz marca', sezonaIz('2027-03-13', true) === '2027', sezonaIz('2027-03-13', true))
}

// Gorica potrebuje svoj parser: goli nimajo številk dresov, menjave pa so
// ločene z oznakama sub-in/sub-out. Preverimo tudi dejanske minute nastopov.
{
  const { parsirajZapisnik: gorica, izlusciPovezaveZapisnikov } =
    await import('./zapisnik-gorica.mjs')
  const html = readFileSync(new URL('./vzorci/zapisnik-gorica-3199.html', import.meta.url), 'utf8')
  const rezultati = readFileSync(new URL('./vzorci/rezultati-gorica-3199.html', import.meta.url), 'utf8')
  const url = 'https://mnzgorica.si/tekmovanja/3199/zapisnik/1/267797'
  const z = gorica(html, { zapisnikId: 267797, url })
  preveri('Gorica: uporaben zapisnik', z !== null)
  if (z) {
    preveri('Gorica: obe ekipi', z.domaci.ime === 'Brda' && z.gostje.ime === 'Komen')
    preveri('Gorica: identiteta zapisnika', z.zapisnikId === 267797 && z.url === url)
    preveri('Gorica: sezona iz datuma tekme', z.sezona === '2026/27', z.sezona)
    preveri('Gorica: prvi krog 6. septembra 2026', z.krog === 1 && z.datum === '2026-09-06')
    for (const [idx, ekipa] of [z.domaci, z.gostje].entries()) {
      preveri(`Gorica: ${ekipa.ime} ima 11 začetnikov in 7 rezerv`,
        ekipa.postava.length === 11 && ekipa.rezerve.length === 7)
      preveri(`Gorica: ${ekipa.ime} ima pravega vratarja in kapetana`,
        ekipa.postava.filter((i) => i.vratar).length === 1 &&
        ekipa.postava.find((i) => i.vratar)?.st === [12, 1][idx] &&
        ekipa.postava.filter((i) => i.kapetan).length === 1 &&
        ekipa.postava.find((i) => i.kapetan)?.st === [22, 9][idx])
      preveri(`Gorica: ${ekipa.ime} ima rezervnega vratarja brez registrskih številk`,
        ekipa.rezerve.find((i) => i.vratar)?.st === [1, 99][idx] &&
        [...ekipa.postava, ...ekipa.rezerve].every((i) =>
          !('regSt' in i) && typeof i.vratar === 'boolean' && typeof i.kapetan === 'boolean'))
    }
    preveri('Gorica: rezultat 3 : 0 in polčas 2 : 0',
      z.rezultat.domaci === 3 && z.rezultat.gostje === 0 &&
      z.polcas?.domaci === 2 && z.polcas?.gostje === 0)
    preveri('Gorica: trije goli se ujemajo z rezultatom in številkami dresov',
      z.goli.length === z.rezultat.domaci + z.rezultat.gostje &&
      JSON.stringify(z.goli.map((g) => [g.ekipaIdx, g.st, g.minuta, g.rezultat])) ===
        JSON.stringify([[0, 7, 19, [1, 0]], [0, 2, 21, [2, 0]], [0, 2, 63, [3, 0]]]) &&
      z.goli.every((g) => g.avtogol === false && g.enajstmetrovka === false))
    preveri('Gorica: vseh osem menjav s pravimi smermi in minutami', z.menjave.length > 0 &&
      JSON.stringify(z.menjave.map((m) => [m.ekipaIdx, m.minuta, m.noter.st, m.ven.st])) ===
        JSON.stringify([[0, 65, 11, 3], [0, 70, 4, 6], [0, 80, 5, 21],
          [1, 46, 16, 8], [1, 54, 10, 15], [1, 67, 7, 17], [1, 75, 19, 6], [1, 75, 18, 20]]))
    const n = nastopi(z)
    preveri('Gorica: osem rezerv dobi nastop', n.filter((i) => !i.zacetnik).length === 8)
    preveri('Gorica: prva menjava razdeli minute 65 + 25',
      n.find((i) => i.ekipaIdx === 0 && i.st === 3)?.minute === 65 &&
      n.find((i) => i.ekipaIdx === 0 && i.st === 11)?.minute === 25)
    preveri('Gorica: Kavčič je opominjan v 36. minuti',
      JSON.stringify(z.rumeni) === JSON.stringify([
        { ekipaIdx: 1, st: 5, ime: 'Kavčič Matevž', minuta: 36 },
      ]) && z.rdeci.length === 0 && z.zgresene.length === 0)
    preveri('Gorica: vzorec je razčlenjen brez opozoril', z.opozorila.length === 0, z.opozorila.join('; '))
  }

  // Mladinske kategorije U13/12 v meniju niso sezone; prednost ima glava tekme.
  for (const [sezona, pricakovana] of [['2025/26', '2025/26'], ['2025/2026', '2025/26'], ['26/27', '2026/27']]) {
    const drugaSezona = html.replace('Primorska članska liga · 1. krog',
      `Primorska članska liga ${sezona} · 1. krog`)
    preveri(`Gorica: normalizirana sezona ${sezona}`, gorica(drugaSezona)?.sezona === pricakovana)
  }
  preveri('Gorica: štirimestna letnica datuma',
    gorica(html.replace('06.09.26 ·', '06.09.2026 ·'))?.datum === '2026-09-06')
  const brezPolcasa = gorica(html.replace(/<span\b[^>]*class="report-score-ht"[^>]*>[\s\S]*?<\/span>/, ''))
  preveri('Gorica: manjkajoč polčas ne zavrže tekme',
    brezPolcasa?.polcas === null && brezPolcasa?.menjave.length === 8)
  const ponovljeneMinute = html.replace(/(<span class="sub-min"[^>]*>[\s\S]*?<\/span>)([\s\S]*?)(<span class="sub-out")/g,
    '$1$2$1$3')
  preveri('Gorica: ponovljena minuta pred izstopom ohrani vseh osem menjav',
    JSON.stringify(gorica(ponovljeneMinute)?.menjave) === JSON.stringify(z?.menjave))
  preveri('Gorica: obvestilo o nedostopnem zapisniku vrne null',
    gorica('<main>Zapisnik za izbrano tekmo ni na voljo</main>') === null)
  preveri('Gorica: prazna stran in rezultati niso zapisnik', gorica('') === null && gorica(rezultati) === null)

  const povezave = izlusciPovezaveZapisnikov(rezultati)
  preveri('Gorica: pet povezav s krogom in ID tekme',
    JSON.stringify(povezave) === JSON.stringify([
      { krog: 1, matchId: 267795 }, { krog: 1, matchId: 267796 },
      { krog: 1, matchId: 267797 }, { krog: 1, matchId: 267798 }, { krog: 1, matchId: 267800 },
    ]))
  preveri('Gorica: absolutni in podvojeni naslovi ne podvojijo tekme',
    izlusciPovezaveZapisnikov(rezultati + `<a href="${url}?x=1&amp;y=2">Zapisnik</a>`).length === 5)
  const vir = viraZa({ source: 'mnzng' })
  preveri('viri: mnzng je registriran', znaniViri().includes('mnzng') && vir.drzava === 'SI')
  preveri('viri: Gorica uporablja svoj parser', vir.parsirajZapisnik(html)?.menjave.length === 8)
  preveri('viri: Gorica gradi naslov s krogom iz povezave',
    vir.naslovZapisnika(3199, povezave[2]?.matchId, povezave[2]?.krog) === url)
  let brezKroga = false
  try { vir.naslovZapisnika(3199, 267797) } catch { brezKroga = true }
  preveri('viri: Gorica ne ugiba manjkajočega kroga', brezKroga)
  // `/results` da SAMO odigrane kroge — ob uvozu 3. SNL Zahod jih je bilo 4
  // od 26 — zato razpored beremo z `/razpored`. Seznam tekem ostane na
  // rezultatih, ker so povezave na zapisnike tam.
  preveri('viri: Gorica loci razpored od rezultatov',
    vir.naslovRazporeda(3199) === 'https://mnzgorica.si/tekmovanja/3199/razpored' &&
    vir.naslovSeznamaTekem(3199) === 'https://mnzgorica.si/tekmovanja/3199/rezultati' &&
    vir.naslovLestvice(3199) === 'https://mnzgorica.si/tekmovanja/3199/lestvica')
  preveri('viri: Gorica ne uporablja gorenjskih vzdevkov',
    vir.kljucKluba('Preddvor SP Avto') === 'preddvor sp avto')
}

// --- zapisniki celotnih krogov ---------------------------------------------
{
  const skupni = await import('./zapisnik-pomurje.mjs')
  const vzorec = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  const primeri = [
    { vir: 'mnzpt', datoteka: 'zapisniki-ptuj-liga3-kolo2.html', tekem: 6,
      domaci: 'Stojnci', gostje: 'Markovci', rezultat: [0, 1], krog: 2,
      datum: '2026-08-30', regSt: 110385, menjav: 5, minuta: 66, ven: 10, noter: 23 },
    { vir: 'mnzms', datoteka: 'zapisniki-ms-liga113-kolo2.html', tekem: 7,
      domaci: 'Mlinopek Križevci', gostje: 'ŠD Bogojina', rezultat: [2, 3], krog: 2,
      datum: '2026-08-30', regSt: 48836, menjav: 7, minuta: 78, ven: 20, noter: 22 },
    { vir: 'mnzle', datoteka: 'zapisniki-lendava-pnl-krog1.html', tekem: 6,
      domaci: 'Bistrica', gostje: 'Črenšovci', rezultat: [1, 3], krog: 1,
      datum: '2026-08-23', regSt: 102430, menjav: 6, minuta: 59, ven: 11, noter: 4 },
  ]
  for (const p of primeri) {
    preveri(`zapisniki ${p.vir}: vir je registriran`, znaniViri().includes(p.vir))
    if (!znaniViri().includes(p.vir)) continue
    const vir = viraZa({ source: p.vir })
    const html = vzorec(p.datoteka)
    const url = `vzorec:${p.datoteka}`
    const vsi = vir.zapisnikiIzKroga(html, { url })
    const ponovljeni = vir.zapisnikiIzKroga(html)
    preveri(`zapisniki ${p.vir}: skupni parser sam prepozna vir`,
      JSON.stringify(skupni.zapisnikiIzKroga(html)) === JSON.stringify(ponovljeni))
    preveri(`zapisniki ${p.vir}: ${p.tekem} tekem`, vsi.length === p.tekem, String(vsi.length))
    const z = vsi.find((t) => t.domaci.ime === p.domaci && t.gostje.ime === p.gostje)
    preveri(`zapisniki ${p.vir}: ${p.domaci} – ${p.gostje}`, Boolean(z))
    if (!z) continue
    preveri(`zapisniki ${p.vir}: 11 začetnikov na obeh straneh`,
      z.domaci.postava.length === 11 && z.gostje.postava.length === 11)
    preveri(`zapisniki ${p.vir}: sezona, krog in datum tekme`,
      z.sezona === '2026/27' && z.krog === p.krog && z.datum === p.datum, z.datum)
    preveri(`zapisniki ${p.vir}: rezultat iz vzorca`,
      z.rezultat.domaci === p.rezultat[0] && z.rezultat.gostje === p.rezultat[1])
    preveri(`zapisniki ${p.vir}: ${p.menjav} menjav`, z.menjave.length === p.menjav,
      String(z.menjave.length))
    preveri(`zapisniki ${p.vir}: pravilna smer in minuta prve menjave`,
      z.menjave[0]?.minuta === p.minuta && z.menjave[0]?.ven.st === p.ven &&
      z.menjave[0]?.noter.st === p.noter, JSON.stringify(z.menjave[0]))
    preveri(`zapisniki ${p.vir}: regSt vratarja`,
      z.domaci.postava[0].regSt === p.regSt && z.domaci.postava[0].vratar)
    preveri(`zapisniki ${p.vir}: kapetana sta označena`,
      [z.domaci, z.gostje].every((e) => e.postava.filter((i) => i.kapetan).length === 1))
    preveri(`zapisniki ${p.vir}: klop dobi dejanske minute`,
      vir.nastopi(z).some((n) => !n.zacetnik && n.minute > 0 && n.minute < 90 && Number.isInteger(n.regSt)))
    preveri(`zapisniki ${p.vir}: enolični in ponovljivi identifikatorji`,
      new Set(vsi.map((t) => t.zapisnikId)).size === p.tekem &&
      vsi.every((t, i) => t.zapisnikId && t.url === url &&
        t.zapisnikId === ponovljeni[i].zapisnikId))
    preveri(`zapisniki ${p.vir}: izbor posamezne tekme po identifikatorju`,
      vir.parsirajZapisnik(html, { zapisnikId: z.zapisnikId, url })?.domaci.ime === p.domaci)
    preveri(`zapisniki ${p.vir}: brez izbire ne ugibamo med tekmami`, vir.parsirajZapisnik(html) === null)
    preveri(`zapisniki ${p.vir}: neznan identifikator ni prva tekma`,
      vir.parsirajZapisnik(html, { zapisnikId: 'ne-obstaja' }) === null)
    for (const t of vsi) {
      const oznaka = `${p.vir} ${t.domaci.ime}`
      const igralci = [t.domaci, t.gostje].flatMap((e) => [...e.postava, ...e.rezerve])
      preveri(`zapisniki ${oznaka}: registracije vseh igralcev`,
        igralci.length >= 22 && igralci.every((i) => Number.isInteger(i.regSt)))
      const dogodki = [...t.goli, ...t.rumeni, ...t.rdeci,
        ...t.menjave.flatMap((m) => [m.noter, m.ven])]
      preveri(`zapisniki ${oznaka}: registracije dogodkov`,
        dogodki.every((i) => Number.isInteger(i.regSt)))
      const zadetki = [0, 0]
      for (const g of t.goli) zadetki[g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx]++
      preveri(`zapisniki ${oznaka}: goli ustrezajo obema ekipama`,
        zadetki[0] === t.rezultat.domaci && zadetki[1] === t.rezultat.gostje)
      preveri(`zapisniki ${oznaka}: tekoči rezultat zadnjega gola`,
        t.goli.length === 0 || JSON.stringify(t.goli.at(-1).rezultat) === JSON.stringify(zadetki))
      preveri(`zapisniki ${oznaka}: brez opozoril`, t.opozorila.length === 0, t.opozorila.join(' | '))
    }

    // Ista menjava lahko minuto izpiše enkrat ali dvakrat; druga vrstica
    // ne sme zavreči čakajočega para niti ob izpraznjeni celici.
    const enkrat = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (vrstica) =>
      /(?:\/in\.gif|ARROW_IN\.svg)/i.test(vrstica)
        ? vrstica.replace(/\d+'(?=\s*<\/td>)/g, '') : vrstica)
    const manjMinut = vir.zapisnikiIzKroga(enkrat).find((t) => t.domaci.ime === p.domaci)
    preveri(`zapisniki ${p.vir}: minuta enkrat na menjavo`,
      JSON.stringify(manjMinut?.menjave) === JSON.stringify(z.menjave))
    for (const sezona of ['2025/2026', '2025/26']) {
      const drugace = html.replace(/2026\/2027|2026\/27|26\/27/g, sezona)
      preveri(`zapisniki ${p.vir}: normalizacija ${sezona}`,
        vir.zapisnikiIzKroga(drugace).every((t) => t.sezona === '2025/26'))
    }
    const brezIzida = html.replace(/\d+\s*:\s*\d+\s*\(\s*\d+\s*:\s*\d+\s*\)/g, '- : - (- : -)')
    preveri(`zapisniki ${p.vir}: neodigrane tekme preskočimo`,
      vir.zapisnikiIzKroga(brezIzida).length === 0 && vir.parsirajZapisnik(brezIzida) === null)
    const izid = `${z.rezultat.domaci} : ${z.rezultat.gostje} (${z.polcas.domaci} : ${z.polcas.gostje})`
    const mesano = html.replaceAll(izid, 'Ni odigrano')
    const ostale = vir.zapisnikiIzKroga(mesano)
    preveri(`zapisniki ${p.vir}: neodigrana tekma ne skrije preostanka kroga`,
      ostale.length === p.tekem - 1 && !ostale.some((t) => t.domaci.ime === p.domaci) &&
      vir.parsirajZapisnik(mesano, { zapisnikId: z.zapisnikId }) === null)
    const drugaMeja = { mnzpt: '<h1>Tekma: Makole', mnzms: '<div id="157698"', mnzle: '<div id="tisk1"' }[p.vir]
    const druga = html.indexOf(drugaMeja)
    const samoPrva = html.slice(0, druga) + html.slice(druga)
      .replace(/\d+\s*:\s*\d+\s*\(\s*\d+\s*:\s*\d+\s*\)/g, 'Ni odigrano')
    preveri(`zapisniki ${p.vir}: edina odigrana tekma ne nadomesti izbrane neodigrane`,
      vir.zapisnikiIzKroga(samoPrva).length === 1 &&
      vir.parsirajZapisnik(samoPrva, { zapisnikId: vsi[1].zapisnikId }) === null &&
      vir.parsirajZapisnik(samoPrva, { zapisnikId: 'ne-obstaja' }) === null)
    const brezReg = html.replace(`>${p.regSt}</td>`, '></td>')
    preveri(`zapisniki ${p.vir}: prazna registracija ostane null`,
      vir.zapisnikiIzKroga(brezReg)[0]?.domaci.postava[0].regSt === null)
    const drugDatum = p.vir === 'mnzle'
      ? html.replaceAll('23. 8. 2026', '23.08.26') : html.replaceAll('30.08.26', '30.08.2026')
    preveri(`zapisniki ${p.vir}: dve in štiri števke letnice pomenijo isti datum`,
      vir.zapisnikiIzKroga(drugDatum)[0]?.datum === p.datum)
    const entitete = vir.zapisnikiIzKroga(html.replaceAll('Nejc', 'Nej&#x63;'))
    preveri(`zapisniki ${p.vir}: številske entitete ne spremenijo imen`,
      JSON.stringify(entitete) === JSON.stringify(ponovljeni))
    preveri(`zapisniki ${p.vir}: navadna stran ni zapisnik`, vir.parsirajZapisnik('<p>Novice</p>') === null)
  }
  if (znaniViri().includes('mnzle')) {
    const tekme = viraZa({ source: 'mnzle' }).zapisnikiIzKroga(vzorec(primeri[2].datoteka))
    const ag = tekme.find((t) => t.domaci.ime === 'Grad')?.goli.find((g) => g.avtogol)
    preveri('zapisniki Lendava: avtogol ostane pri igralcu Hotize',
      ag?.ekipaIdx === 1 && ag.st === 44 && ag.regSt === 92156 && ag.minuta === 83 &&
      JSON.stringify(ag.rezultat) === '[1,1]' && !ag.enajstmetrovka)
  }
  if (znaniViri().includes('mnzpt')) {
    const pt = viraZa({ source: 'mnzpt' })
    const tekme = pt.zapisnikiIzKroga(vzorec(primeri[0].datoteka))
    const penal = tekme.find((t) => t.domaci.ime === 'Makole Bar Miha')?.goli.find((g) => g.enajstmetrovka)
    preveri('zapisniki Ptuj: oznaka 11m ob minuti', penal?.st === 14 && penal.minuta === 53 && penal.regSt === 55647)
    // Ptuj piše "(avtogol) 26'", ne "(AG)"; prej je bil to navaden gol strelca.
    const krog1 = pt.zapisnikiIzKroga(vzorec('zapisniki-ptuj-liga3-kolo1.html'))
    const bukovci = krog1.find((t) => t.domaci.ime === 'Bukovci')
    const agPt = bukovci?.goli.find((g) => g.avtogol)
    const nastopAg = bukovci && pt.nastopi(bukovci).find((n) => n.ekipaIdx === 1 && n.st === 2)
    preveri('zapisniki Ptuj: oznaka (avtogol) ob minuti',
      agPt?.ekipaIdx === 1 && agPt.st === 2 && agPt.regSt === 102370 && agPt.minuta === 26 &&
      nastopAg?.avtogoli === 1 && nastopAg.goli === 0)
    preveri('zapisniki Ptuj: krog z avtogolom brez opozoril',
      krog1.length === 6 && krog1.every((t) => t.opozorila.length === 0),
      krog1.flatMap((t) => t.opozorila).join(' | '))
    const izvirnik = vzorec(primeri[0].datoteka)
    const regPriGolu = izvirnik.replace('>82184</td>', '></td>')
      .replace('<th>Minuta</th>', '<th>Minuta</th><th>Reg. št.</th>')
      .replace("<td align=\"right\">81'</td>", "<td align=\"right\">81'</td><td>82184</td>")
    preveri('zapisniki Ptuj: registracija neposredno ob dogodku',
      pt.zapisnikiIzKroga(regPriGolu)[0]?.goli[0].regSt === 82184)
    const prvi = izvirnik.slice(0, izvirnik.indexOf('<h1>Tekma: Makole'))
    const sam = pt.parsirajZapisnik(prvi, { zapisnikId: 'posamezna', url: 'vzorec:prvi' })
    preveri('zapisniki Ptuj: posamezen zapisnik ohrani podani id in URL',
      sam?.zapisnikId === 'posamezna' && sam.url === 'vzorec:prvi' && sam.domaci.ime === 'Stojnci')
    preveri('zapisniki Ptuj: ključ druge tekme ne preimenuje edine tekme',
      pt.parsirajZapisnik(prvi, { zapisnikId: tekme[1].zapisnikId }) === null)
    const rdec = tekme[0]?.rdeci[0]
    preveri('zapisniki Ptuj: rdeči karton pripada gostu',
      rdec?.ekipaIdx === 1 && rdec.st === 10 && rdec.minuta === 85 && rdec.regSt === 84562)
  }
  if (znaniViri().includes('mnzms')) {
    const ms = viraZa({ source: 'mnzms' })
    const z = ms.parsirajZapisnik(vzorec(primeri[1].datoteka), { zapisnikId: '157718' })
    preveri('zapisniki MS: ohranimo javno šifro tekme', z?.domaci.ime === 'Mlinopek Križevci')
    const html = vzorec(primeri[1].datoteka)
    const prvi = html.slice(html.indexOf('<div id="157718"'), html.indexOf('<div id="157698"'))
    preveri('zapisniki MS: tuja šifra ne preimenuje edine tekme',
      ms.parsirajZapisnik(prvi, { zapisnikId: '157698' }) === null)
    const klop = z && ms.nastopi(z).find((n) => n.ime === 'Obradovič Kleo')
    preveri('zapisniki MS: rezervist lahko tudi izstopi',
      klop?.minutaOd === 26 && klop.minutaDo === 46 && klop.minute === 20 && klop.regSt === 107112)
  }
  for (const [ime, vir] of [['program-ptuj-liga3.html', 'mnzpt'], ['program-ms-liga113.html', 'mnzms']]) {
    if (!znaniViri().includes(vir)) continue
    preveri(`zapisniki ${vir}: program ni zapisnik`,
      viraZa({ source: vir }).zapisnikiIzKroga(vzorec(ime)).length === 0)
  }
}

// --- zapisnik Maribor ------------------------------------------------------
{
  const { parsirajZapisnik: razcleni, izlusciIdjeZapisnikov } =
    await import('./zapisnik-maribor.mjs')
  const { default: mb } = await import('./viri/mnzmb.mjs')
  const html = readFileSync(new URL('./vzorci/zapisnik-maribor-219915.html', import.meta.url), 'utf8')
  const tekme = readFileSync(new URL('./vzorci/tekme-maribor-1clanska.html', import.meta.url), 'utf8')
  const url = 'https://mnzmaribor.si/tekmovanje/1-clanska-liga-26-27/zapisnik/?event=219915'
  const z = razcleni(html, { zapisnikId: '219915', url })

  preveri('zapisnik Maribor: uporaben zapisnik', z !== null)
  if (z) {
    preveri('zapisnik Maribor: obe imeni ekip', z.domaci.ime === 'Peca' && z.gostje.ime === 'Brunšvik')
    preveri('zapisnik Maribor: 11 začetnikov doma', z.domaci.postava.length === 11)
    preveri('zapisnik Maribor: 11 začetnikov v gosteh', z.gostje.postava.length === 11)
    preveri('zapisnik Maribor: šest domačih in pet gostujočih rezerv',
      z.domaci.rezerve.length === 6 && z.gostje.rezerve.length === 5)
    preveri('zapisnik Maribor: sezona, krog in datum tekme',
      z.sezona === '2026/27' && z.krog === 1 && z.datum === '2026-08-29',
      JSON.stringify([z.sezona, z.krog, z.datum]))
    preveri('zapisnik Maribor: ohrani identiteto in pogodbo brez dodatnih polj',
      z.zapisnikId === '219915' && z.url === url &&
      Object.keys(z).sort().join(',') === [
        'zapisnikId', 'url', 'sezona', 'krog', 'datum', 'domaci', 'gostje',
        'rezultat', 'polcas', 'goli', 'zgresene', 'rumeni', 'rdeci', 'menjave', 'opozorila',
      ].sort().join(','))

    const vsi = [z.domaci, z.gostje].flatMap((e) => [...e.postava, ...e.rezerve])
    preveri('zapisnik Maribor: igralci imajo samo številko, ime in zastavici',
      vsi.every((i) => Object.keys(i).sort().join(',') === 'ime,kapetan,st,vratar' &&
        typeof i.vratar === 'boolean' && typeof i.kapetan === 'boolean'))
    preveri('zapisnik Maribor: oba začetna vratarja in obe rezervi',
      JSON.stringify(vsi.filter((i) => i.vratar).map((i) => [i.st, i.ime])) === JSON.stringify([
        [21, 'Vertačnik Alen'], [76, 'Kreuh Aleš'], [12, 'Kolar Luka'], [1, 'Lončarič Tilen'],
      ]))
    // Gostje nimajo oznake K; kapetana ne smemo sklepati iz številke dresa.
    preveri('zapisnik Maribor: oznaka K se ne prilepi imenu in ne ustvari kapetana gostov',
      JSON.stringify(vsi.filter((i) => i.kapetan).map((i) => [i.st, i.ime])) ===
        JSON.stringify([[10, 'Obretan Matic']]) && !z.gostje.postava.some((i) => i.kapetan))

    preveri('zapisnik Maribor: končni rezultat in polčas',
      z.rezultat.domaci === 5 && z.rezultat.gostje === 1 &&
      z.polcas.domaci === 2 && z.polcas.gostje === 0)
    preveri('zapisnik Maribor: vseh šest zadetkov s tekočimi rezultati',
      JSON.stringify(z.goli.map((g) => [g.ekipaIdx, g.st, g.ime, g.minuta, g.rezultat, g.avtogol, g.enajstmetrovka])) ===
      JSON.stringify([
        [1, 4, 'Hedl Nejc', 19, [1, 0], true, false],
        [0, 10, 'Obretan Matic', 44, [2, 0], false, false],
        [0, 15, 'Vrabič Andraž', 68, [3, 0], false, false],
        [0, 11, 'Obretan Nejc', 72, [4, 0], false, false],
        [0, 11, 'Obretan Nejc', 79, [5, 0], false, false],
        [1, 27, 'Pelcl Anej', 89, [5, 1], false, false],
      ]), JSON.stringify(z.goli))
    const zadetki = [0, 0]
    for (const g of z.goli) zadetki[g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx]++
    preveri('zapisnik Maribor: avtogol šteje Peci za rezultat 5:1',
      zadetki[0] === 5 && zadetki[1] === 1)

    // Rajšp je začetnik, Pelcl rezerva: zapis 17 / 27 v isti vrstici kot
    // 54&#8242; dokazuje, da je prva številka VEN, druga pa NOTER.
    preveri('zapisnik Maribor: vseh sedem menjav v pravilni smeri in minuti',
      JSON.stringify(z.menjave.map((m) => [m.ekipaIdx, m.minuta, m.ven.st, m.ven.ime, m.noter.st, m.noter.ime])) ===
      JSON.stringify([
        [1, 54, 17, 'Rajšp Žan', 27, 'Pelcl Anej'],
        [1, 67, 77, 'Kokot Žiga', 5, 'Harih Davorin'],
        [1, 67, 45, 'Zorec David', 16, 'Voglar Aljoša'],
        [0, 80, 8, 'Kert Rok', 6, 'Pumpas Gašper'],
        [0, 80, 88, 'Kotnik Timotej', 7, 'Previšić Aljaž'],
        [0, 85, 79, 'Radivojević Darko', 50, 'Pranjič Kristijan'],
        [0, 85, 4, 'Kert Jaka', 14, 'Butolen Ožbej'],
      ]), JSON.stringify(z.menjave))
    const n = nastopi(z)
    preveri('zapisnik Maribor: klop prinese sedem dodatnih nastopov', n.length === 29)
    preveri('zapisnik Maribor: Rajšp igra 54 minut, Pelcl 36 minut in doseže gol',
      n.find((i) => i.ekipaIdx === 1 && i.st === 17)?.minute === 54 &&
      n.find((i) => i.ekipaIdx === 1 && i.st === 27)?.minute === 36 &&
      n.find((i) => i.ekipaIdx === 1 && i.st === 27)?.goli === 1)
    preveri('zapisnik Maribor: avtogol pripada Hedlu, ne strelcem Pece',
      n.find((i) => i.ekipaIdx === 1 && i.st === 4)?.avtogoli === 1 &&
      n.find((i) => i.ekipaIdx === 1 && i.st === 4)?.goli === 0)
    preveri('zapisnik Maribor: dva rumena kartona',
      JSON.stringify(z.rumeni) === JSON.stringify([
        { ekipaIdx: 1, st: 19, ime: 'Ekart Nejc', minuta: 37 },
        { ekipaIdx: 0, st: 4, ime: 'Kert Jaka', minuta: 50 },
      ]))
    preveri('zapisnik Maribor: brez rdečih, zgrešenih enajstmetrovk in opozoril',
      z.rdeci.length === 0 && z.zgresene.length === 0 && z.opozorila.length === 0,
      z.opozorila.join(' | '))
  }

  preveri('zapisnik Maribor: štirimestna letnica datuma',
    razcleni(html.replace('29.08.26 ob', '29.08.2026 ob'), { url })?.datum === '2026-08-29')
  for (const [zapis, pricakovano] of [['2025/26', '2025/26'], ['2025/2026', '2025/26'], ['26/27', '2026/27']]) {
    const naslov = html.replace('Golgeter Premium liga &#8211; Zapisnik</h1>',
      `Golgeter Premium liga ${zapis} &#8211; Zapisnik</h1>`)
    preveri(`zapisnik Maribor: sezona ${zapis} iz naslova, ne menija`,
      razcleni('<nav>Arhiv 2007/08</nav>' + naslov)?.sezona === pricakovano)
  }
  preveri('zapisnik Maribor: brez podanega URL prebere sezono iz lastnega obrazca',
    razcleni(html)?.sezona === '2026/27')
  preveri('zapisnik Maribor: naslednja sezona pride iz podanega naslova',
    razcleni(html, { url: url.replace('26-27', '27-28') })?.sezona === '2027/28')
  const brezPolcasa = razcleni(html.replace(/<span class="halftime"[^>]*>[\s\S]*?<\/span>/, ''), { url })
  preveri('zapisnik Maribor: manjkajoč polčas ostane neznan in ohrani končni rezultat',
    brezPolcasa?.rezultat.domaci === 5 && brezPolcasa?.rezultat.gostje === 1 &&
    brezPolcasa?.polcas.domaci === null && brezPolcasa?.polcas.gostje === null)
  preveri('zapisnik Maribor: prazna stran in razpored nista zapisnika',
    razcleni('') === null && razcleni(tekme) === null)
  preveri('zapisnik Maribor: neodigrana tekma nima uporabnega zapisnika',
    razcleni(html.replace(/5 : 1\s*<span class="halftime"[^>]*>[\s\S]*?<\/span>/, ''), { url }) === null)

  const ids = izlusciIdjeZapisnikov(tekme)
  preveri('razpored Maribor: vseh 132 tekem brez dvojnikov iz stranskega stolpca',
    ids.length === 132 && new Set(ids).size === 132)
  preveri('razpored Maribor: vsebuje odigrane, prihodnje in prestavljene tekme',
    ['219915', '219927', '220046', '220883', '220884'].every((id) => ids.includes(id)))
  preveri('razpored Maribor: ID-ji so nizi, urejeni številčno',
    ids[0] === '219915' && ids.at(-1) === '220884' &&
    ids.every((id, i) => typeof id === 'string' && (!i || Number(ids[i - 1]) < Number(id))))
  preveri('razpored Maribor: povezave ostanejo uporabne tudi brez data-event_id',
    izlusciIdjeZapisnikov(tekme.replace(/\sdata-event_id="\d+"/g, '')).length === 12)
  preveri('razpored Maribor: prazna stran nima ID-jev', izlusciIdjeZapisnikov('').length === 0)

  preveri('viri: Maribor je registriran', znaniViri().includes('mnzmb'))
  if (znaniViri().includes('mnzmb')) {
    preveri('viri: Maribor uporablja svoj parser in obstoječe nastope',
      viraZa({ source: 'mnzmb' }) === mb && mb.parsirajZapisnik === razcleni && mb.nastopi === nastopi)
  }
  for (const liga of ['1-clanska-liga-26-27', '2-clanska-liga-26-27', '1-clanska-liga-27-28']) {
    preveri(`viri: Maribor sestavi zapisnik za ${liga}`,
      mb.naslovZapisnika?.(liga, '219915') === `https://mnzmaribor.si/tekmovanje/${liga}/zapisnik/?event=219915`)
    preveri(`viri: Maribor sestavi razpored in seznam tekem za ${liga}`,
      mb.naslovRazporeda?.(liga) === `https://mnzmaribor.si/tekmovanje/${liga}/tekme` &&
      mb.naslovSeznamaTekem?.(liga) === `https://mnzmaribor.si/tekmovanje/${liga}/tekme`)
    preveri(`viri: Maribor sestavi lestvico za ${liga}`,
      mb.naslovLestvice?.(liga) === `https://mnzmaribor.si/tekmovanje/${liga}`)
  }
  preveri('viri: Maribor izpostavi enumeracijo zapisnikov', mb.izlusciIdjeZapisnikov(tekme).length === 132)
}

// --- mini lige --------------------------------------------------------------
// Koda potuje po SMS, na glas ali na listku in pride nazaj z malimi crkami,
// presledki ali vezaji. Vse to je ISTA koda; zavrniti jo zaradi oblike pomeni
// izgubiti cloveka na zadnjem koraku pred pridruzitvijo.
{
  const { ocistiKodo, kodaJeVeljavna, zakajNiVeljavna, razvrstiMini, vecLig,
          besediloVabila, ZNAKI_KODE, DOLZINA_KODE } =
    await import('../src/lib/miniLige.ts')

  for (const vnos of ['4ar7vz', '4AR7VZ', ' 4AR7VZ ', '4AR-7VZ', '4ar 7vz']) {
    preveri(`mini: "${vnos}" je koda 4AR7VZ`, ocistiKodo(vnos) === '4AR7VZ', ocistiKodo(vnos))
  }
  preveri('mini: prava koda je veljavna', kodaJeVeljavna(' 4ar7-vz '))
  preveri('mini: prekratka koda ni veljavna', !kodaJeVeljavna('4AR7V'))

  // Nabor brez dvoumnih znakov je obljuba: ce se v kodi znajde 0 ali I, je
  // to skoraj gotovo napaka pri prepisu, in to je treba POVEDATI.
  preveri('mini: nabor nima dvoumnih znakov',
    !/[01OIL]/.test(ZNAKI_KODE) && ZNAKI_KODE.length === 31, ZNAKI_KODE)
  preveri('mini: koda z niclo ni veljavna', !kodaJeVeljavna('4AR7V0'))
  preveri('mini: razlog omeni zamenjavo 0 in O',
    /0 in O/.test(zakajNiVeljavna('4AR7V0') ?? ''), zakajNiVeljavna('4AR7V0'))
  preveri('mini: prekratki kodi pove, koliko znakov manjka',
    /6 znakov/.test(zakajNiVeljavna('4AR') ?? ''), zakajNiVeljavna('4AR'))
  preveri('mini: prazen vnos ima svoj razlog',
    zakajNiVeljavna('') === 'Vpiši kodo mini lige.', zakajNiVeljavna(''))
  preveri('mini: veljavna koda nima razloga', zakajNiVeljavna('4AR7VZ') === null)
  preveri('mini: dolzina kode je 6', DOLZINA_KODE === 6)

  // Lestvica: enak izid = enako mesto.
  const v = (ime, tock, krogov, liga) => ({
    fantasy_team_id: ime.length, team_name: ime, owner_name: 'X',
    total_points: tock, rounds_played: krogov,
    points_per_round: krogov ? tock / krogov : 0,
    competition_short: liga, federation_short: 'Z',
  })
  const l = razvrstiMini([v('Ana', 100, 2, 'Člani'), v('Bor', 120, 2, 'Člani'), v('Cene', 100, 2, 'Člani')])
  preveri('mini: lestvica po tockah navzdol',
    l.map((x) => x.team_name).join(',') === 'Bor,Ana,Cene', l.map((x) => x.team_name).join(','))
  preveri('mini: enak izid si deli mesto',
    l.map((x) => x.mesto).join(',') === '1,2,2', l.map((x) => x.mesto).join(','))

  // Stolpec z ligo ima smisel le, kadar so ekipe iz razlicnih lig.
  preveri('mini: ena liga -> stolpca ne potrebujemo',
    !vecLig([v('A', 1, 1, 'Člani'), v('B', 1, 1, 'Člani')]))
  preveri('mini: vec lig -> stolpec je potreben',
    vecLig([v('A', 1, 1, 'Člani'), v('B', 1, 1, '1. SNL')]))

  const vabilo = besediloVabila('Bratje', '4AR7VZ', 'https://slff.eu')
  preveri('mini: vabilo vsebuje ime, kodo in naslov',
    vabilo.includes('Bratje') && vabilo.includes('4AR7VZ') && vabilo.includes('https://slff.eu'),
    JSON.stringify(vabilo))

  // Povabilo je povezava: klik naredi vse, kode ne tipka nihce.
  const { povezavaVabila, privzetoImeLige, shraniVabilo, preberiVabilo, pozabiVabilo } =
    await import('../src/lib/miniLige.ts')
  preveri('mini: povezava vabila je /l/KODA', povezavaVabila(' 4ar-7vz ', 'https://slff.eu') === 'https://slff.eu/l/4AR7VZ', povezavaVabila(' 4ar-7vz ', 'https://slff.eu'))
  preveri('mini: vabilo je povezava, ne navodilo za tipkanje',
    vabilo.includes('/l/4AR7VZ') && !/Koda:/.test(vabilo), JSON.stringify(vabilo))
  preveri('mini: privzeto ime iz vzdevka', privzetoImeLige('Jernej Kocica') === 'Jernej in prijatelji', privzetoImeLige('Jernej Kocica'))
  preveri('mini: privzeto ime brez vzdevka', privzetoImeLige(null) === 'Moja mini liga')
  preveri('mini: privzeto ime ne preseze 40 znakov', privzetoImeLige('Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').length <= 40)
  // Cakajoce povabilo prezivi prijavo in sestavljanje ekipe. Node nima
  // localStorage; zadostuje najmanjsi mozni nadomestek.
  const shramba = new Map()
  globalThis.localStorage = {
    getItem: (k) => (shramba.has(k) ? shramba.get(k) : null),
    setItem: (k, v) => shramba.set(k, String(v)),
    removeItem: (k) => shramba.delete(k),
  }
  shraniVabilo('4ar7vz')
  preveri('mini: shranjeno povabilo se prebere ocisceno', preberiVabilo() === '4AR7VZ', preberiVabilo())
  pozabiVabilo()
  preveri('mini: pozabljeno povabilo je null', preberiVabilo() === null)
  shraniVabilo('XX')
  preveri('mini: neveljavno povabilo se ne prebere', preberiVabilo() === null)
  pozabiVabilo()
  delete globalThis.localStorage

  // Deljenje: WhatsApp in Viber dobita celo besedilo, pravilno kodirano.
  const { povezaveDeljenja, zgodbeKroga, opisZgodbe, besediloPregleda } = await import('../src/lib/miniLige.ts')
  const deljenje = povezaveDeljenja(vabilo)
  preveri('mini: WhatsApp povezava nosi besedilo vabila',
    deljenje.whatsapp.startsWith('https://wa.me/?text=') &&
      decodeURIComponent(deljenje.whatsapp.split('text=')[1]) === vabilo, deljenje.whatsapp)
  preveri('mini: Viber povezava nosi besedilo vabila',
    deljenje.viber.startsWith('viber://forward?text=') &&
      decodeURIComponent(deljenje.viber.split('text=')[1]) === vabilo, deljenje.viber)
  preveri('mini: presledki in & v besedilu ne zlomijo povezave',
    !/[ &]/.test(povezaveDeljenja('a & b ?c=d').whatsapp.split('text=')[1]))

  // Tedenski pregled: isti primer kot v supabase/tests/varnost.sql.
  const pregled = {
    sezona: '2098/99', krog: 2, krogi: [2, 1], ekip: 2,
    vrstice: [
      { ekipa_id: 1, ekipa: 'Pregled A', lastnik: 'Ana', tocke: 32, mesto: 1, premik: 1 },
      { ekipa_id: 2, ekipa: 'Pregled B', lastnik: 'Bor', tocke: 10, mesto: 2, premik: -1 },
    ],
    kapetan: { ekipa_id: 1, igralec_id: 11, igralec: 'Kapetan Kovač', tocke: 10, skupaj: 30 },
    klop: { ekipa_id: 1, tocke: 7 },
    adut: { ekipa_id: 2, igralec_id: 15, igralec: 'Peti Adut', tocke: 4 },
  }
  const zgodbe = zgodbeKroga(pregled)
  preveri('pregled: vse zgodbe v bralnem vrstnem redu',
    zgodbe.map((z) => z.vrsta).join(',') === 'manager,kapetan,adut,skok,padec,klop,zlica',
    zgodbe.map((z) => z.vrsta).join(','))
  preveri('pregled: manager je A, zlica B',
    zgodbe[0].ekipa === 'Pregled A' && zgodbe.at(-1).ekipa === 'Pregled B' && zgodbe.at(-1).tocke === 10)
  preveri('pregled: kapetan pove tocke z mnoziteljem',
    opisZgodbe(zgodbe[1]).includes('30 točk') && opisZgodbe(zgodbe[1]).includes('Kapetan Kovač'),
    opisZgodbe(zgodbe[1]))
  preveri('pregled: skok ima pravo mnozino',
    opisZgodbe({ vrsta: 'skok', ekipa: 'X', tocke: 0, mest: 2, mesto: 1 }).includes('2 mesti'),
    opisZgodbe({ vrsta: 'skok', ekipa: 'X', tocke: 0, mest: 2, mesto: 1 }))
  const sam = zgodbeKroga({ ...pregled, vrstice: [pregled.vrstice[0]], adut: null })
  preveri('pregled: ena ekipa nima zmagovalca ne zlice',
    sam.map((z) => z.vrsta).join(',') === 'kapetan,klop', sam.map((z) => z.vrsta).join(','))
  const izenaceni = zgodbeKroga({ ...pregled, vrstice: pregled.vrstice.map((v) => ({ ...v, tocke: 5, premik: 0 })) })
  preveri('pregled: pri izenacenju ni lesene zlice ne premikov',
    !izenaceni.some((z) => ['zlica', 'skok', 'padec'].includes(z.vrsta)))
  preveri('pregled: prazen pregled nima zgodb',
    zgodbeKroga({ sezona: null, krog: null, krogi: [] }).length === 0 && zgodbeKroga(null).length === 0)
  const sporocilo = besediloPregleda('Bratje', 2, zgodbe, '4ar7vz', 'https://slff.eu')
  preveri('pregled: sporocilo za skupino ima ligo, krog, zgodbe in povezavo',
    sporocilo.includes('Bratje') && sporocilo.includes('2. krog') && sporocilo.includes('Pregled A') &&
      sporocilo.endsWith('https://slff.eu/l/4AR7VZ'), JSON.stringify(sporocilo))

  const { default: DeliMiniLigo } = await import('../src/components/DeliMiniLigo.tsx')
  const html = renderToString(<DeliMiniLigo ime="Bratje" koda="4AR7VZ" stanje="nova" />)
  preveri('izris: deljenje mini lige ima WhatsApp, Viber in povezavo',
    html.includes('https://wa.me/?text=') && html.includes('viber://forward?text=') && html.includes('/l/4AR7VZ'))
  const { default: TedenskiPregledKartica } = await import('../src/components/TedenskiPregled.tsx')
  try {
    renderToString(
      <StaticRouter location="/mini-leagues">
        <TedenskiPregledKartica ligaId={1} ime="Bratje" koda="4AR7VZ" />
      </StaticRouter>,
    )
    preveri('izris: tedenski pregled', true)
  } catch (e) {
    preveri('izris: tedenski pregled', false, e.message)
  }
}

// --- drzavna lestvica -------------------------------------------------------
// 15 od 17 lig ima po nekaj ekip. Manager v taki ligi nima s cim primerjati
// rezultata, zato liga ostane mrtva, dokler se sama ne napolni. Drzavna
// lestvica mu da nasprotnike takoj — a le, ce je razvrstitev postena.
{
  const { razvrsti, zMesti, povzetek, NAJMANJ_KROGOV_ZA_POVPRECJE } =
    await import('../src/lib/drzavna.ts')

  const v = (id, ime, tock, krogov, liga, zveza) => ({
    fantasy_team_id: id, team_name: ime, owner_name: 'X',
    total_points: tock, rounds_played: krogov,
    points_per_round: krogov ? Math.round((tock / krogov) * 100) / 100 : 0,
    competition_slug: liga, competition_short: liga, federation_short: zveza,
  })

  const vrstice = [
    v(1, 'Dolga sezona', 240, 4, 'clani', 'Gorenjska'),   // 60 na krog
    v(2, 'Ena nedelja', 104, 1, 'snl1', 'NZS'),           // 104 na krog, a en krog
    v(3, 'Solidna', 180, 3, 'lj-1-liga', 'Ljubljana'),    // 60 na krog
    v(4, 'Brez kroga', 0, 0, 'le-mnl', 'Lendava'),
  ]

  const skupno = razvrsti(vrstice, 'skupno')
  preveri('drzavna: skupno razvrsti po tockah',
    skupno.map((x) => x.fantasy_team_id).join(',') === '1,3,2,4',
    skupno.map((x) => x.team_name).join(' > '))

  // Brez praga bi bila na vrhu vedno ekipa z enim odigranim krogom: ena dobra
  // nedelja da 104, cela sezona redko cez 60.
  const povp = razvrsti(vrstice, 'povprecje')
  preveri('drzavna: povprecje izloci ekipe pod pragom krogov',
    !povp.some((x) => Number(x.rounds_played) < NAJMANJ_KROGOV_ZA_POVPRECJE),
    povp.map((x) => `${x.team_name}(${x.rounds_played})`).join(', '))
  preveri('drzavna: ekipa z enim krogom ne vodi lestvice po povprecju',
    povp[0]?.fantasy_team_id !== 2, String(povp[0]?.team_name))

  // Enak izid = enako mesto, kakor v sportu.
  const zIstimi = [
    v(1, 'A', 100, 2, 'x', 'X'), v(2, 'B', 100, 2, 'y', 'Y'), v(3, 'C', 90, 2, 'z', 'Z'),
  ]
  const mesta = zMesti(razvrsti(zIstimi, 'skupno'), 'skupno').map((x) => x.mesto)
  preveri('drzavna: enak izid si deli mesto in naslednje preskoci',
    mesta.join(',') === '1,1,3', mesta.join(','))

  // Vrstni red mora biti stabilen tudi ob popolnoma enakih vrsticah.
  const enake = [v(2, 'Beta', 50, 1, 'x', 'X'), v(1, 'Alfa', 50, 1, 'x', 'X')]
  preveri('drzavna: ob enakem izidu odloci ime, da vrstni red ne skace',
    razvrsti(enake, 'skupno')[0].team_name === 'Alfa',
    razvrsti(enake, 'skupno').map((x) => x.team_name).join(','))

  const p = povzetek(vrstice)
  preveri('drzavna: povzetek presteje lige in zveze',
    p.ekip === 4 && p.lig === 4 && p.zvez === 4, JSON.stringify(p))
  preveri('drzavna: prazna lestvica ne pade',
    razvrsti([], 'povprecje').length === 0 && povzetek([]).lig === 0)
}

// --- ISO teden za tedensko prevrednotenje ------------------------------------
// Prevrednotenje NI idempotentno: vsak zagon priblizna ceno za najvec 1.0 in
// z njo potuje sidro borze. Dvakrat v istem tednu pomeni premik za 2.0, zato
// je bil urnik izklopljen. Kljuc varovala je ISO teden — ne "manj kot sedem
// dni nazaj", ker bi se tako merilo z vsakim zagonom premikalo naprej in bi
// zagoni ob 6., 5. in 4. dnevu ceno premaknili trikrat.
{
  const { isoTeden } = await import('./cas.mjs')
  const t = (d) => isoTeden(new Date(`${d}T12:00:00`))

  // Ponedeljek zacne teden, nedelja ga konca.
  preveri('teden: ponedeljek in nedelja istega tedna sta isti kljuc',
    t('2026-09-14') === t('2026-09-20'), `${t('2026-09-14')} / ${t('2026-09-20')}`)
  preveri('teden: naslednji ponedeljek je ze drug kljuc',
    t('2026-09-20') !== t('2026-09-21'), `${t('2026-09-20')} / ${t('2026-09-21')}`)
  preveri('teden: torkov zagon in sredin popravek sta isti teden',
    t('2026-09-15') === t('2026-09-16'))

  // Prehod cez leto: ISO teden pripada letu s prvim cetrtkom.
  preveri('teden: 1. januar 2027 (petek) pripada se tednu 2026',
    t('2027-01-01') === '2026-W53', t('2027-01-01'))
  preveri('teden: prvi ponedeljek 2027 je 2027-W01',
    t('2027-01-04') === '2027-W01', t('2027-01-04'))
  preveri('teden: 1. januar 2026 (cetrtek) je 2026-W01',
    t('2026-01-01') === '2026-W01', t('2026-01-01'))
  preveri('teden: oblika je LLLL-Wnn',
    /^\d{4}-W\d{2}$/.test(t('2026-09-14')), t('2026-09-14'))
}

// --- prazna stran v predpomnilniku ne sme obviseti --------------------------
// Zapisnik se objavi sele nekaj ur po tekmi, uvoz pa ob koncu tedna tece
// vsako uro. Prvi zagon po tekmi prenese stran BREZ postav; ta prazna stran
// obleži v predpomnilniku, ki se med zagoni obnavlja, in vsak naslednji zagon
// jo prebere od tam. Tekma tako ostane brez statistike za vedno, ceprav je
// zapisnik medtem objavljen. Tako so obviseli stirje krogi 1. SNL.
{
  const { izSeznamaTekem } = await import('./viri/zapisniki.mjs')

  const prazna = '<html>ni postav</html>'
  const polna = '<html>POSTAVI</html>'
  let prenosov = 0, sveze = 0
  const vir = {
    ime: 'preizkus',
    naslovSeznamaTekem: () => 'http://primer/seznam',
    naslovZapisnika: (_k, id) => `http://primer/zapisnik?zapisnik=${id}`,
    // Prvi (predpomnjeni) prenos da prazno stran, svez pa pravo.
    parsirajZapisnik: (html, { zapisnikId }) =>
      html.includes('POSTAVI') ? { zapisnikId, domaci: { ime: 'A' }, gostje: { ime: 'B' } } : null,
  }
  const prenesi = async (_url, _ime, svez = false) => {
    prenosov++
    // Seznam tekem se vedno prenese svez; to ni zapisnik in ga ta preizkus
    // ne sme zamenjati z njim.
    if (_url.includes('seznam')) return 'zapisnik=11 zapisnik=12'
    if (svez) { sveze++; return polna }
    return prazna
  }

  const out = await izSeznamaTekem(vir, '1601', prenesi)
  preveri('predpomnilnik: prazna stran se ponovno prenese sveze',
    out.length === 2, `${out.length} zapisnikov`)
  preveri('predpomnilnik: svez prenos se zgodi le ob prazni strani',
    sveze === 2, `svezih prenosov: ${sveze}`)

  // Ko je stran ze uporabna, drugega prenosa ne sme biti — sicer bi vsak
  // zagon znova prenesel cel arhiv.
  let prenosov2 = 0
  const virPolni = { ...vir }
  const prenesiPolno = async (_url) => {
    prenosov2++
    return _url.includes('seznam') ? 'zapisnik=11' : polna
  }
  const out2 = await izSeznamaTekem(virPolni, '1601', prenesiPolno)
  preveri('predpomnilnik: uporabna stran se ne prenasa dvakrat',
    out2.length === 1 && prenosov2 === 2, `zapisnikov ${out2.length}, prenosov ${prenosov2}`)
}

// --- HTML entitete v imenih klubov ------------------------------------------
// Sest odigranih tekem je ostalo brez statistike, ker je razpored zapisal
// klub kot "Kety Emmi&amp;Impol Bistrica", zapisnik pa kot "Kety Emmi&Impol
// Bistrica". Kljuc se racuna iz poenostavljenega imena, kjer se `&amp;`
// spremeni v BESEDO "amp" in `&#8211;` v "8211" — klub je v bazi dobil tri
// locene zapise, uvoz zapisnika pa tekme ni nasel.
{
  const { poenostavi: p, razpakiraj: r } = await import('./klubi.mjs')

  preveri('entitete: &amp; postane &, ne beseda "amp"',
    r('Kety Emmi&amp;Impol Bistrica') === 'Kety Emmi&Impol Bistrica',
    r('Kety Emmi&amp;Impol Bistrica'))
  preveri('entitete: stevilcna entiteta postane znak',
    r('Rošnja &#8211; Loka') === 'Rošnja – Loka', r('Rošnja &#8211; Loka'))
  preveri('entitete: sestnajstiska entiteta postane znak',
    r('A &#x26; B') === 'A & B', r('A &#x26; B'))

  // Bistvo: obe pisavi istega kluba morata dati ISTI kljuc.
  for (const [a, b] of [
    ['Kety Emmi&amp;Impol Bistrica', 'Kety Emmi&Impol Bistrica'],
    ['Rošnja &#8211; Loka', 'Rošnja – Loka'],
    ['Rogoza &#8211; Miklavž', 'Rogoza – Miklavž'],
  ]) {
    preveri(`entitete: "${a.slice(0, 26)}" in "${b.slice(0, 22)}" sta isti klub`,
      p(a) === p(b), `${p(a)} / ${p(b)}`)
  }

  preveri('entitete: kljuc ne vsebuje vec ostanka entitete',
    !p('Kety Emmi&amp;Impol').includes('amp') && !p('Rošnja &#8211; Loka').includes('8211'),
    `${p('Kety Emmi&amp;Impol')} / ${p('Rošnja &#8211; Loka')}`)

  // Razclenjevalniki razporeda imena zapisejo v bazo, zato morajo entitete
  // razresiti ze tam — ne sele ob racunanju kljuca.
  const { razporedMaribor } = await import('./razporedi.mjs')
  const k = razporedMaribor([
    '1. krog', 'Kraj', '29.08.26', '17.00', 'Rošnja &#8211; Loka', '5 : 1', '(2 : 0)', 'Kety Emmi&amp;Impol',
  ])
  const t = k[0]?.tekme[0]
  preveri('razpored: ime ekipe je zapisano brez entitet',
    t?.domaci === 'Rošnja – Loka' && t?.gostje === 'Kety Emmi&Impol',
    JSON.stringify(t))
}

// --- 3. SNL: en klub cez dva vira -------------------------------------------
// Ligo vodi NZS, tekoco sezono in arhiv pa objavita RAZLICNI zvezi. Klub gre
// zato skozi dva razclenjevalnika; ce ne prideta do istega kljuca, dobi v bazi
// dva zapisa in sezona se razdeli. Pari spodaj so dokazani s stevilom tekem v
// arhivu 2023/24 (26 krogov): 14 + 12 = 26, 19 + 7 = 26.
{
  const vzhodArhiv = viraZa({ source: 'mnzle' })
  const vzhodTekoca = viraZa({ source: 'mnzpt' })
  const zahodArhiv = viraZa({ source: 'mnzlj', slug: 'snl3-zahod' })
  const zahodTekoca = viraZa({ source: 'mnzng' })

  const ujemata = (a, b, x, y) =>
    a.kljucKluba(x) === a.kljucKluba(y) &&
    b.kljucKluba(x) === b.kljucKluba(y) &&
    a.kljucKluba(x) === b.kljucKluba(y)

  for (const [x, y] of [['NK Izola', 'Izola'], ['Brda Dobrovo', 'Brda']]) {
    preveri(`3. SNL Zahod: "${x}" je isti klub kot "${y}"`,
      ujemata(zahodArhiv, zahodTekoca, x, y),
      `${zahodArhiv.kljucKluba(x)} / ${zahodTekoca.kljucKluba(y)}`)
  }
  preveri('3. SNL Zahod: sponzorska predpona ne razkolje kluba',
    ujemata(zahodArhiv, zahodTekoca, '\u0160en\u010dur', 'Eltron \u0160en\u010dur'),
    zahodArhiv.kljucKluba('\u0160en\u010dur'))
  for (const [x, y] of [['NK Ljutomer', 'Ljutomer'], ['ZASE Videm', 'Videm']]) {
    preveri(`3. SNL Vzhod: "${x}" je isti klub kot "${y}"`,
      ujemata(vzhodArhiv, vzhodTekoca, x, y),
      `${vzhodArhiv.kljucKluba(x)} / ${vzhodTekoca.kljucKluba(y)}`)
  }

  // Vzdevki 3. SNL se prilijejo Ljubljani, ne da bi poteptali njene lastne.
  preveri('3. SNL: Ljubljana ohrani svoje vzdevke',
    zahodArhiv.kljucKluba('\u0160D Vir') === 'vir' &&
    zahodArhiv.kljucKluba('Ljubljana Arol') === 'ljubljana')
  // Klub brez para se ne sme tiho preslikati nikamor.
  preveri('3. SNL: neznan klub ostane sam svoj',
    vzhodTekoca.kljucKluba('Odranci') === 'odranci' &&
    zahodTekoca.kljucKluba('TKK Tolmin') === 'tkk tolmin')
}

// --- razpored pri virih, ki niso na starem CMS-u ----------------------------
// Splosni razclenjevalnik zahteva "Domaci : Gostje"; teh pet zvez tako ne
// pise in vsaka po svoje. Ko je uvoz prvic tekel proti produkciji, je zato
// javil "Najdenih krogov: 0" in se ustavil — arhiv je bil ze uvozen, pol ure
// pa porabljeno. Vzorci spodaj so prave strani (scripts/vzorci/).
{
  const { rokKroga } = await import('./razporedi.mjs')
  const beri = (f) => readFileSync(new URL(`./vzorci/${f}`, import.meta.url), 'utf8')

  // klubov: koliko jih liga ima; tekemNaKrog: enako v vsakem prebranem krogu.
  const primeri = [
    { vir: 'mnzpt', vzorec: 'program-ptuj-liga3.html', klubov: 12, tekemNaKrog: 6 },
    { vir: 'mnzms', vzorec: 'program-ms-liga113.html', klubov: 15, tekemNaKrog: 7 },
    { vir: 'mnzng', vzorec: 'razpored-gorica-2785.html', klubov: 14, tekemNaKrog: 7, krogov: 26 },
    { vir: 'mnzle', vzorec: 'razpored-lendava-mnl.html', klubov: 7, tekemNaKrog: 3 },
    { vir: 'mnzmb', vzorec: 'tekme-maribor-1clanska.html', klubov: 12, tekemNaKrog: 6 },
  ]

  for (const p of primeri) {
    if (!znaniViri().includes(p.vir)) continue
    const v = viraZa({ source: p.vir })
    preveri(`razpored ${p.vir}: vir prinese svoj razclenjevalnik`,
      typeof v.razcleniRazpored === 'function')
    if (typeof v.razcleniRazpored !== 'function') continue

    const krogi = v.razcleniRazpored(v.vBesedilo(beri(p.vzorec)))
    preveri(`razpored ${p.vir}: krogi so prebrani`, krogi.length > 0, String(krogi.length))
    if (!krogi.length) continue

    // Vsak krog ima enako tekem — ce bi se v tekme prikradel kraj ali izid,
    // bi se stevilo razslo.
    preveri(`razpored ${p.vir}: vsak krog ima ${p.tekemNaKrog} tekem`,
      krogi.every((k) => k.tekme.length === p.tekemNaKrog),
      [...new Set(krogi.map((k) => k.tekme.length))].join('/'))

    const tekme = krogi.flatMap((k) => k.tekme)
    const klubi = new Set(tekme.flatMap((t) => [t.domaci, t.gostje]))
    preveri(`razpored ${p.vir}: ${p.klubov} klubov in nic vec`,
      klubi.size === p.klubov, String(klubi.size))

    // Klub ne more igrati dvakrat v istem krogu; ce bi se skupine zamaknile,
    // bi se ime ponovilo.
    preveri(`razpored ${p.vir}: klub igra v krogu najvec enkrat`,
      krogi.every((k) => new Set(k.tekme.flatMap((t) => [t.domaci, t.gostje])).size === k.tekme.length * 2))

    preveri(`razpored ${p.vir}: stevilke krogov so zaporedne od 1`,
      krogi.map((k) => k.stevilka).every((n, i) => n === i + 1),
      krogi.map((k) => k.stevilka).join(','))

    preveri(`razpored ${p.vir}: prebrani krogi imajo datum`,
      tekme.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.datum ?? '')))

    if (p.krogov) {
      // Prihodnji krogi ure se nimajo (Gorica napise "TBD", Lendava vrstico
      // izpusti). Ce bi bila ura obvezna, bi se razpored bral le do danes.
      preveri(`razpored ${p.vir}: prebere vseh ${p.krogov} krogov, tudi brez ure`,
        krogi.length === p.krogov, String(krogi.length))
      preveri(`razpored ${p.vir}: tekma brez znane ure ni zavrzena`,
        tekme.some((t) => !t.ura) && tekme.some((t) => t.ura))
    }
  }

  // Rok kroga: pomak pred prvo tekmo, kadar uro poznamo.
  preveri('rok kroga: 6 ur pred tekmo ob 17:30 poleti',
    rokKroga('2026-09-19', '17:30', 6) === '2026-09-19T09:30:00.000Z',
    rokKroga('2026-09-19', '17:30', 6))
  preveri('rok kroga: pozimi velja +01:00',
    rokKroga('2027-02-20', '15:00', 6) === '2027-02-20T08:00:00.000Z',
    rokKroga('2027-02-20', '15:00', 6))

  // Preklop na poletni cas pade SREDI marca in oktobra. Groba delitev po
  // mesecu se tu zmoti za celo uro in menjave bi se zaprle uro prezgodaj.
  // Leta 2027 je zadnja nedelja marca 28., zadnja oktobrska 31.
  const { offsetLjubljana } = await import('./cas.mjs')
  preveri('cas: dan pred preklopom je se zimski',
    offsetLjubljana('2027-03-27') === '+01:00', offsetLjubljana('2027-03-27'))
  preveri('cas: na dan preklopa je ze poletni',
    offsetLjubljana('2027-03-28') === '+02:00', offsetLjubljana('2027-03-28'))
  preveri('cas: dan pred jesenskim preklopom je se poletni',
    offsetLjubljana('2027-10-30') === '+02:00', offsetLjubljana('2027-10-30'))
  preveri('cas: na dan jesenskega preklopa je zimski',
    offsetLjubljana('2027-10-31') === '+01:00', offsetLjubljana('2027-10-31'))
  // Preklop se zgodi ob 02:00 po lokalnem casu, ne ob polnoci, zato je na DAN
  // preklopa odvisen tudi od URE. Nocnih terminov v razporedu ni, a merilo
  // brez ure je bilo vseeno napacno.
  preveri('cas: na dan spomladanskega preklopa je ura pred 02:00 se zimska',
    offsetLjubljana('2027-03-28', '01:30') === '+01:00', offsetLjubljana('2027-03-28','01:30'))
  preveri('cas: na dan jesenskega preklopa je ura pred 03:00 se poletna',
    offsetLjubljana('2027-10-31', '02:30') === '+02:00', offsetLjubljana('2027-10-31','02:30'))
  preveri('cas: popoldne na dan jesenskega preklopa je zimski',
    offsetLjubljana('2027-10-31', '15:00') === '+01:00', offsetLjubljana('2027-10-31','15:00'))

  // Okno razclenjevalnika se ne sme raztezati cez naslov naslednjega kroga:
  // "2. krog" je beseda in bi pri Mariboru postal ime gostujoce ekipe.
  {
    const { razporedMaribor } = await import('./razporedi.mjs')
    const vrstice = [
      '1. krog', 'Kraj A', '29.08.26', '17.00', 'Peca', '5 : 1', '(2 : 0)',
      '2. krog', 'Kraj B', '05.09.26', '17.00', 'Rogoza', '1 : 1', '(0 : 0)', 'Marjeta',
    ]
    const k = razporedMaribor(vrstice)
    const imena = k.flatMap((x) => x.tekme.flatMap((t) => [t.domaci, t.gostje]))
    preveri('razpored: naslov kroga ne postane ime ekipe',
      !imena.some((i) => /krog/i.test(i)), imena.join(' | '))
    preveri('razpored: tekma za naslovom pripada svojemu krogu',
      k.every((x) => x.tekme.every((t) => t.datum)) &&
      (k.find((x) => x.stevilka === 2)?.tekme.length ?? 0) === 1,
      k.map((x) => x.stevilka + ':' + x.tekme.length).join(','))
  }

  preveri('rok kroga: ura se ne zamakne cez marcni preklop',
    rokKroga('2027-03-28', '15:00', 6) === '2027-03-28T07:00:00.000Z',
    rokKroga('2027-03-28', '15:00', 6))
  preveri('rok kroga: mladinski pomak je krajsi',
    rokKroga('2026-09-19', '10:00', 2) === '2026-09-19T06:00:00.000Z',
    rokKroga('2026-09-19', '10:00', 2))
  preveri('rok kroga: brez ure ostane 10:00 na dan tekme',
    rokKroga('2026-09-19', null, 6) === '2026-09-19T10:00:00+02:00',
    rokKroga('2026-09-19', null, 6))
  preveri('rok kroga: krog brez datuma nima roka',
    rokKroga(null, '17:30', 6) === null)
}

// --- zapisnik pripada svoji sifri --------------------------------------------
// Predpomnilnik je zapisnike hranil kot `<id>.html`, brez lige, cetudi naslov
// vsebuje `liga=`. Arhiva 3. SNL Zahod 1703 in 1603 techeta drug za drugim v
// istem zagonu pri istem viru, zato je druga sezona dobila stran prve: postava
// ene tekme, goli druge. Ujela je sele invarianta `gol-brez-nastopa` v
// produkciji — en sam gol od 3953.
//
// Kljuc predpomnilnika je popravljen; to je druga vrsta obrambe. Tiho napacna
// tekma je hujsa od preskocene, zato ob neujemanju vrnemo null.
{
  const { parsirajZapisnik: razcleni } = await import('./zapisnik.mjs')
  const html = readFileSync(new URL('./vzorci/zapisnik-kranj-1601.html', import.meta.url), 'utf8')
  const lastna = html.match(/printz\.cfm\?zapisnik=(\d+)/)?.[1]

  preveri('zapisnik: stran pove svojo sifro', Boolean(lastna), String(lastna))
  if (lastna) {
    preveri('zapisnik: prava sifra se razcleni',
      razcleni(html, { zapisnikId: lastna })?.domaci?.ime !== undefined)
    preveri('zapisnik: tuja sifra ne dobi tuje tekme',
      razcleni(html, { zapisnikId: String(Number(lastna) + 1) }) === null)
    preveri('zapisnik: sifra kot stevilka je ista sifra',
      razcleni(html, { zapisnikId: Number(lastna) }) !== null)
  }
  preveri('zapisnik: brez zahtevane sifre preverbe ni',
    razcleni(html, {}) !== null)
}

// --- zapisnik NZS (1. in 2. SNL) --------------------------------------------
// Dolgo sem trdil, da NZS postav po tekmah ne objavlja. Narobe: stran zanje
// stoji pod stranjo tekme kot `/zapisnik`. Iskal sem besedo "postave", ki je
// na strani ni — zacetna enajsterica nima naslova, klop pise "Rezervni
// igralci". Iz odsotnosti NAPISA sem sklepal na odsotnost PODATKA.
{
  const { parsirajZapisnik: nzsRazcleni } = await import('./zapisnik-nzs.mjs')
  const { nastopi: nzsNastopi } = await import('./zapisnik.mjs')
  const beri = (f) => readFileSync(new URL(`./vzorci/${f}`, import.meta.url), 'utf8')

  const primeri = [
    { f: 'zapisnik-nzs-1snl.html', liga: '1. SNL', domaci: 'Celje', gostje: 'Koper',
      izid: [0, 1], krog: 8, datum: '2026-09-06', klop: [12, 11] },
    { f: 'zapisnik-nzs-2snl.html', liga: '2. SNL', domaci: 'Ilirija 1911', gostje: 'Primorje',
      izid: [0, 0], krog: 5, datum: '2026-09-04', klop: [9, 7] },
  ]

  for (const p of primeri) {
    const z = nzsRazcleni(beri(p.f), { zapisnikId: 'x', url: 'u' })
    preveri(`NZS ${p.liga}: zapisnik je uporaben`, z !== null)
    if (!z) continue

    preveri(`NZS ${p.liga}: obe imeni ekip`,
      z.domaci.ime === p.domaci && z.gostje.ime === p.gostje,
      `${z.domaci.ime} / ${z.gostje.ime}`)
    preveri(`NZS ${p.liga}: izid, krog in datum`,
      z.rezultat.domaci === p.izid[0] && z.rezultat.gostje === p.izid[1] &&
      z.krog === p.krog && z.datum === p.datum,
      `${z.rezultat.domaci}:${z.rezultat.gostje} krog ${z.krog} ${z.datum}`)
    preveri(`NZS ${p.liga}: sezona iz naslova tekmovanja`, z.sezona === '2026/27', z.sezona)

    preveri(`NZS ${p.liga}: po 11 zacetnikov`,
      z.domaci.postava.length === 11 && z.gostje.postava.length === 11,
      `${z.domaci.postava.length}/${z.gostje.postava.length}`)
    preveri(`NZS ${p.liga}: klop je locena od zacetnikov`,
      z.domaci.rezerve.length === p.klop[0] && z.gostje.rezerve.length === p.klop[1],
      `${z.domaci.rezerve.length}/${z.gostje.rezerve.length}`)
    preveri(`NZS ${p.liga}: natanko en vratar in en kapetan na ekipo`,
      [z.domaci, z.gostje].every((e) =>
        e.postava.filter((i) => i.vratar).length === 1 &&
        e.postava.filter((i) => i.kapetan).length === 1))

    // Trenerjev blok nima profilnih povezav; ce bi zdrsnil med igralce, bi
    // se stevilo poveca in "trener" bi dobil nastop.
    preveri(`NZS ${p.liga}: trener ni igralec`,
      [z.domaci, z.gostje].every((e) =>
        [...e.postava, ...e.rezerve].every((i) => i.nzsId != null)))

    // Stalna sifra igralca je razlog, da tu ni ugibanja identitete.
    const sifre = [z.domaci, z.gostje].flatMap((e) => [...e.postava, ...e.rezerve].map((i) => i.nzsId))
    preveri(`NZS ${p.liga}: sifre igralcev so enolicne`,
      new Set(sifre).size === sifre.length, `${new Set(sifre).size}/${sifre.length}`)

    // Goli iz ikon se morajo sesteti v izid — najmocnejsa preverba parserja.
    preveri(`NZS ${p.liga}: goli iz ikon se ujemajo z izidom`,
      z.goli.length === p.izid[0] + p.izid[1], String(z.goli.length))

    // Menjava ima isto ikono pri obeh igralcih; locimo ju po tem, ali je
    // igralec zacetnik. Vsak vstop mora imeti svoj izstop.
    preveri(`NZS ${p.liga}: vsaka menjava ima vstop in izstop`,
      z.menjave.every((m) => m.noter.st != null && m.ven.st != null),
      JSON.stringify(z.menjave.filter((m) => m.ven.st == null)))

    // Skupni `nastopi()` mora delati brez sprememb — to je merilo, da je
    // struktura res enaka kot pri drugih virih.
    const n = nzsNastopi(z)
    preveri(`NZS ${p.liga}: 22 zacetnikov dobi nastop`,
      n.filter((x) => x.zacetnik).length === 22, String(n.filter((x) => x.zacetnik).length))
    preveri(`NZS ${p.liga}: rezerva brez vstopa nima nastopa`,
      n.filter((x) => !x.zacetnik).length === z.menjave.length,
      `${n.filter((x) => !x.zacetnik).length} proti ${z.menjave.length}`)
    preveri(`NZS ${p.liga}: nihce ne igra vec kot 90 minut`,
      n.every((x) => x.minute >= 0 && x.minute <= 90))
    preveri(`NZS ${p.liga}: zacetnik brez menjave igra vseh 90`,
      n.some((x) => x.zacetnik && x.minute === 90))
  }

  // Nepopolni dogodki: stran za starejse sezone ponekod nasteje postavi,
  // dogodkov pa ne. Prej je uvoz tak zapisnik vpisal kot uspesen — 22
  // nastopov, nobene menjave, premalo golov, nobene napake.
  {
    const cel = beri('zapisnik-nzs-1snl.html')
    const brezIkon = cel.replace(/<i class="fa-(?:light|solid) fa-(?:futbol|arrows-repeat|circle yellow|circle red)"[^>]*><\/i>/g, '')
    const z = nzsRazcleni(brezIkon, { zapisnikId: 'x', url: 'u' })
    preveri('NZS: zapisnik brez dogodkov se vseeno razcleni', z !== null)
    preveri('NZS: neskladje med goli in izidom je opozorilo, ne tisina',
      z.opozorila.some((o) => /golov iz ikon/.test(o)), JSON.stringify(z.opozorila))
    preveri('NZS: manjkajoce menjave so opozorilo',
      z.opozorila.some((o) => /menjave/.test(o)), JSON.stringify(z.opozorila))
    preveri('NZS: cel zapisnik nima opozoril',
      nzsRazcleni(cel, { zapisnikId: 'x', url: 'u' }).opozorila.length === 0)
  }

  // Rezervist z golom je gotovo igral, tudi ce ikone menjave ni. Rezervist s
  // KARTONOM pa ne: opomin lahko dobi tudi, kdor sedi na klopi — prvi poskus
  // je tako na igrisce poslal vratarja z rumenim kartonom v 83. minuti.
  {
    const z = nzsRazcleni(beri('zapisnik-nzs-2snl.html'), { zapisnikId: 'x', url: 'u' })
    const n = nzsNastopi(z)
    const naKlopi = [z.domaci, z.gostje].flatMap((e, i) =>
      e.rezerve.map((r) => ({ ...r, ekipaIdx: i })))
    const samoKarton = naKlopi.filter((r) =>
      r.dogodki.length && !r.dogodki.some((d) => d.vrsta === 'menjava' || d.vrsta === 'gol'))
    preveri('NZS: rezervist z zgolj kartonom ne dobi nastopa',
      samoKarton.every((r) => !n.some((x) => x.ekipaIdx === r.ekipaIdx && x.st === r.st)),
      samoKarton.map((r) => r.ime).join(', ') || '(ni takega)')
    preveri('NZS: noben gol ne ostane brez nastopa strelca',
      z.goli.every((g) => n.some((x) => x.ekipaIdx === g.ekipaIdx && x.st === g.st)))
  }

  // Stran brez postav (navadna stran tekme) ne sme dati zapisnika.
  preveri('NZS: stran brez postav ni zapisnik',
    nzsRazcleni('<html><body>ni postav</body></html>', {}) === null)
}

// --- vir NZS: nastevanje tekem in razpored ----------------------------------
// Zadnja uganka pri drzavnih ligah ni bila postava, ampak kako priti do
// SEZNAMA tekem pretekle sezone. Izbirnik sezone je skripten in navaden POST
// vrne tekoco sezono; AJAX odgovor pa pove, kam preusmeri — in to je navaden
// `?season=<id>`. Seznam je ostranjen z Drupalovim VECSTRANSKIM pagerjem,
// zato je vrednost par: `page=0,<n>`, ne `page=<n>`.
{
  const { default: nzs } = await import('./viri/nzs.mjs')
  const { razbijKodo, sifreTekem, razcleniRazporedNzs } = await import('./viri/nzs.mjs')
  const html = readFileSync(new URL('./vzorci/tekme-nzs-1snl-sezona25.html', import.meta.url), 'utf8')

  preveri('NZS vir: registriran', znaniViri().includes('nzs'))
  preveri('NZS vir: tekmovanje ga dobi po source', viraZa({ source: 'nzs' }) === nzs)

  // Sezona je stevilka iz spustnega seznama, ne letnica: 25 = 2022/23.
  preveri('NZS: sifra brez sezone je tekoca',
    razbijKodo('prva-liga-telemach').sezona === null)
  preveri('NZS: sifra s sezono se razbije',
    razbijKodo('prva-liga-telemach:25').pot === 'prva-liga-telemach' &&
    razbijKodo('prva-liga-telemach:25').sezona === '25')

  preveri('NZS: naslov seznama nosi sezono in vecstranski pager',
    nzs.naslovSeznamaTekem('prva-liga-telemach:25') ===
      'https://www.nzs.si/klubi/moski/prva-liga-telemach/tekme?season=25&page=0%2C0',
    nzs.naslovSeznamaTekem('prva-liga-telemach:25'))
  preveri('NZS: tekoca sezona je brez parametra season',
    !nzs.naslovSeznamaTekem('prva-liga-telemach').includes('season='),
    nzs.naslovSeznamaTekem('prva-liga-telemach'))
  preveri('NZS: zapisnik stoji pod stranjo tekme',
    nzs.naslovZapisnika('prva-liga-telemach:25', 'fc-koper-dns-mura-1snl2223-2023-05-20-201500') ===
      'https://www.nzs.si/klubi/moski/prva-liga-telemach/tekme/fc-koper-dns-mura-1snl2223-2023-05-20-201500/zapisnik')

  const sifre = sifreTekem(html)
  preveri('NZS: stran seznama da deset tekem', sifre.length === 10, String(sifre.length))
  preveri('NZS: sifra tekme je njen del poti z datumom',
    sifre.every((x) => /^[a-z0-9-]+-\d{4}-\d{2}-\d{2}-\d{6}$/.test(x)), sifre[0])

  // Krog ima v tabeli svoj stolpec, zato ga ni treba sklepati iz datuma.
  const krogi = razcleniRazporedNzs(html)
  preveri('NZS razpored: krogi imajo stevilko iz stolpca',
    krogi.length > 0 && krogi.every((k) => Number.isInteger(k.stevilka) && k.stevilka > 0),
    krogi.map((k) => k.stevilka).join(','))
  preveri('NZS razpored: vsota tekem je enaka stevilu sifer',
    krogi.reduce((n, k) => n + k.tekme.length, 0) === sifre.length)
  preveri('NZS razpored: tekma ima datum in uro',
    krogi.flatMap((k) => k.tekme).every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.datum) && /^\d{1,2}:\d{2}$/.test(t.ura)))
  // Uvoz poklice `razcleniRazpored(vrstice, html)`. Zveze na starem CMS-u
  // berejo vrstice, NZS pa surov HTML, ker ima krog svoj STOLPEC in se iz
  // golega besedila ne da lociti. Ko je NZS pricakoval drugi argument, ki ga
  // uvoz takrat ni podajal, je uvoz 1. SNL padel z "Cannot read properties of
  // undefined" — sele v produkciji, po tem ko je arhiv ze pretekel.
  preveri('NZS razpored: deluje tako, kot ga poklice uvoz',
    nzs.razcleniRazpored(nzs.vBesedilo(html), html).length > 0)
  for (const ime of ['mnzpt', 'mnzms', 'mnzng', 'mnzle', 'mnzmb', 'nzs']) {
    const v = viraZa({ source: ime })
    preveri(`razpored ${ime}: sprejme (vrstice, html) kot uvoz`,
      typeof v.razcleniRazpored === 'function' && v.razcleniRazpored.length <= 2)
  }

  preveri('NZS razpored: klub igra v krogu najvec enkrat',
    krogi.every((k) => new Set(k.tekme.flatMap((t) => [t.domaci, t.gostje])).size === k.tekme.length * 2))
}

// --- gibanje cene ----------------------------------------------------------
// `price_changes` hrani samo kroge s premikom; vmesni krogi niso neznani,
// ampak mirni. Ce se ne dopolnijo, trije zapisi izgledajo kot tri zaporedne
// spremembe, pa naj bo med njimi pet krogov ali noben.
{
  const serija = serijaCen(4.5, [{ krog: 2, nova: 4.7 }, { krog: 5, nova: 4.6 }], 6)
  preveri(
    'cena: serija ima krog 0 in vse kroge do konca',
    serija.length === 7 && serija[0].krog === 0,
    `${serija.length} tock`,
  )
  preveri(
    'cena: med spremembama ostane nespremenjena',
    serija[3].cena === 4.7 && serija[4].cena === 4.7,
    `${serija[3].cena}, ${serija[4].cena}`,
  )
  preveri(
    'cena: po zadnji spremembi se drzi do konca',
    serija[6].cena === 4.6,
    String(serija[6].cena),
  )
  preveri('cena: premik je razlika od izhodisca', premik(serija) === 0.1 || Math.abs(premik(serija) - 0.1) < 1e-9, String(premik(serija)))

  // Borza lahko stece dlje od zadnjega odigranega kroga; podatek je, ne napaka.
  const dlje = serijaCen(5, [{ krog: 9, nova: 5.3 }], 4)
  preveri('cena: sprememba za krogom konca serijo razsiri', dlje.length === 10, `${dlje.length}`)

  const brez = serijaCen(6, [], 0)
  preveri('cena: brez sprememb ostane ena tocka', brez.length === 1 && brez[0].cena === 6)
  preveri('cena: ena tocka nima crte', crta(brez) === '')

  // Navpicno raztegnemo na razpon serije, sicer se premik 0.3 zlije v ravno crto.
  const pot = crta(serijaCen(4.5, [{ krog: 1, nova: 4.8 }], 1), 100, 20)
  preveri('cena: crta gre od dna do vrha', pot === 'M0.0,20.0 L100.0,0.0', pot)

  const zadnji = zadnjiPremiki([{ krog: 2, nova: 4.7 }, { krog: 5, nova: 4.6 }], 4.5)
  preveri(
    'cena: zadnji premik je prvi na seznamu in ve, od kod je prisel',
    zadnji[0].krog === 5 && zadnji[0].iz === 4.7 && zadnji[0].v === 4.6,
    JSON.stringify(zadnji[0]),
  )
}

// --- predlog kadra ---------------------------------------------------------
// Ekipa v enem kliku mora biti veljavna PO KONSTRUKCIJI: novinec, ki jo dobi,
// ne sme pristati v stanju, zaradi katerega je 27 ekip ostalo brez tock.
{
  // Liga s stirimi klubi in dovolj igralci na vsaki poziciji.
  const liga = []
  let id = 1
  for (let klub = 1; klub <= 8; klub++) {
    for (const [poz, koliko] of [['GK', 3], ['DEF', 6], ['MID', 6], ['FWD', 4]]) {
      for (let n = 0; n < koliko; n++) {
        liga.push({
          id: id++,
          position: poz,
          team_id: klub,
          // Cene od 4.0 do 9.5, da je izbira med drazjimi in cenejsimi prava.
          value: 4 + ((klub + n) % 12) * 0.5,
          points: (klub * 3 + n * 7) % 40,
        })
      }
    }
  }

  const kader = predlagajKader(liga, PRORACUN)
  preveri('predlog: kader nastane', Array.isArray(kader) && kader.length === VELIKOST_EKIPE,
    kader ? String(kader.length) : 'null')

  const poPoz = {}
  for (const k of kader) poPoz[k.position] = (poPoz[k.position] ?? 0) + 1
  preveri('predlog: razmerje pozicij je 2-5-5-3',
    Object.entries(POZICIJE).every(([p, pr]) => poPoz[p] === pr.kader),
    JSON.stringify(poPoz))

  const cena = kader.reduce((v, k) => v + k.value, 0)
  preveri('predlog: kader je v proracunu', cena <= PRORACUN + 1e-9, `${cena.toFixed(1)} M€`)

  const poKlubu = {}
  for (const k of kader) poKlubu[k.team_id] = (poKlubu[k.team_id] ?? 0) + 1
  preveri('predlog: najvec trije iz kluba',
    Math.max(...Object.values(poKlubu)) <= MAX_IZ_KLUBA,
    `najvec ${Math.max(...Object.values(poKlubu))}`)

  const zacetnikov = kader.filter((k) => k.je_zacetnik).length
  preveri('predlog: v postavi je enajst', zacetnikov === STEVILO_PRVIH, String(zacetnikov))

  const vPostavi = {}
  for (const k of kader) if (k.je_zacetnik) vPostavi[k.position] = (vPostavi[k.position] ?? 0) + 1
  preveri('predlog: postava spostuje meje po pozicijah',
    Object.entries(POZICIJE).every(([p, pr]) =>
      (vPostavi[p] ?? 0) >= pr.min && (vPostavi[p] ?? 0) <= pr.max),
    JSON.stringify(vPostavi))

  const kapetanov = kader.filter((k) => k.je_kapetan).length
  const namestnikov = kader.filter((k) => k.je_namestnik).length
  preveri('predlog: natanko en kapetan in en namestnik',
    kapetanov === 1 && namestnikov === 1, `${kapetanov}/${namestnikov}`)
  preveri('predlog: kapetan in namestnik sta v postavi',
    kader.every((k) => (!k.je_kapetan && !k.je_namestnik) || k.je_zacetnik))

  // Smisel gumba je ekipa, ki je vredna igranja — ne najcenejsa mogoca.
  const najcenejsa = 15 * 4
  preveri('predlog: proracun se res porabi', cena > najcenejsa * 1.3,
    `${cena.toFixed(1)} M€ proti ${najcenejsa} M€ najcenejse`)

  // Liga, v kateri veljavnega kadra ni: gumba ne smemo ponuditi.
  const premajhna = liga.filter((i) => i.position === 'GK').slice(0, 2)
  preveri('predlog: v premajhni ligi vrne null', predlagajKader(premajhna, PRORACUN) === null)

  // Skop proracun mora vseeno dati veljaven kader ali null, nikoli pokvarjenega.
  const skop = predlagajKader(liga, 61)
  preveri('predlog: pri skopem proracunu ostane veljaven',
    skop === null || (skop.length === 15 &&
      skop.reduce((v, k) => v + k.value, 0) <= 61 + 1e-9),
    skop ? `${skop.reduce((v, k) => v + k.value, 0).toFixed(1)} M€` : 'null')

  // Gumb uporablja nakljucje: vsak klik drugacen kader, a vsak veljaven.
  let seme = 1
  const nakljucje = () => ((seme = (seme * 16807) % 2147483647) / 2147483647)
  const zrebi = Array.from({ length: 20 }, () => predlagajKader(liga, PRORACUN, nakljucje))
  const napacni = zrebi.filter((k) => {
    if (!k || k.length !== VELIKOST_EKIPE) return true
    const poz = {}
    const klub = {}
    for (const x of k) {
      poz[x.position] = (poz[x.position] ?? 0) + 1
      klub[x.team_id] = (klub[x.team_id] ?? 0) + 1
    }
    return !Object.entries(POZICIJE).every(([p, pr]) => poz[p] === pr.kader) ||
      Math.max(...Object.values(klub)) > MAX_IZ_KLUBA ||
      k.reduce((v, x) => v + x.value, 0) > PRORACUN + 1e-9 ||
      k.filter((x) => x.je_zacetnik).length !== STEVILO_PRVIH ||
      k.filter((x) => x.je_kapetan && x.je_zacetnik).length !== 1 ||
      k.filter((x) => x.je_namestnik && x.je_zacetnik).length !== 1
  })
  preveri('predlog: vsak nakljucni kader je veljaven', napacni.length === 0,
    `${napacni.length} od ${zrebi.length} neveljavnih`)
  const razlicnih = new Set(zrebi.map((k) => k.map((x) => x.id).sort((a, b) => a - b).join(','))).size
  preveri('predlog: nakljucni kadri se razlikujejo', razlicnih >= 15,
    `${razlicnih} razlicnih od ${zrebi.length}`)
  // Nakljucje ne sme dati skopuske ekipe. Na pravi ligi (lj-1-liga, 541
  // igralcev) je meja 60 menjav dala ekipe za 60 M€; ta majhna liga tega ne
  // ponovi, zato je preverba le spodnja varovalka.
  const najmanjPorabe = Math.min(...zrebi.map((k) => k.reduce((v, x) => v + x.value, 0)))
  preveri('predlog: nakljucni kader porabi proracun', najmanjPorabe > PRORACUN * 0.9,
    `najmanj ${najmanjPorabe.toFixed(1)} M€`)

  // Dopolnitev: zacet kader ostane, manjkajoca mesta se zapolnijo.
  const cenaOd = new Map(liga.map((i) => [i.id, Number(i.value)]))
  const zacet = zrebi[0].slice(0, 6).map((x, i) => ({
    ...x, je_zacetnik: i < 4, je_kapetan: i === 0, je_namestnik: false,
  }))
  const denarZacet = PRORACUN - zacet.reduce((v, x) => v + x.value, 0)
  const dopolnjeni = Array.from({ length: 10 }, () => dopolniKader(liga, zacet, denarZacet, nakljucje))
  const slabiDopolnjeni = dopolnjeni.filter((k) => {
    if (!k || k.length !== VELIKOST_EKIPE) return true
    const poz = {}
    const klub = {}
    for (const x of k) {
      poz[x.position] = (poz[x.position] ?? 0) + 1
      klub[x.team_id] = (klub[x.team_id] ?? 0) + 1
    }
    const vPostavi = {}
    for (const x of k) if (x.je_zacetnik) vPostavi[x.position] = (vPostavi[x.position] ?? 0) + 1
    return !Object.entries(POZICIJE).every(([p, pr]) =>
        poz[p] === pr.kader && (vPostavi[p] ?? 0) >= pr.min && (vPostavi[p] ?? 0) <= pr.max) ||
      Math.max(...Object.values(klub)) > MAX_IZ_KLUBA ||
      k.filter((x) => !x.obstojeci).reduce((v, x) => v + x.value, 0) > denarZacet + 1e-9 ||
      k.filter((x) => x.je_zacetnik).length !== STEVILO_PRVIH ||
      k.filter((x) => x.je_kapetan && x.je_zacetnik).length !== 1 ||
      k.filter((x) => x.je_namestnik && x.je_zacetnik).length !== 1
  })
  preveri('dopolni: vsak dopolnjen kader je veljaven', slabiDopolnjeni.length === 0,
    `${slabiDopolnjeni.length} od ${dopolnjeni.length} neveljavnih`)
  preveri('dopolni: izbrani igralci ostanejo, kapetan tudi',
    dopolnjeni.every((k) => k && zacet.every((z) => k.some((x) => x.id === z.id && x.obstojeci)) &&
      k.find((x) => x.je_kapetan)?.id === zacet[0].id))
  preveri('dopolni: cene obstojecih se ne spremenijo',
    dopolnjeni.every((k) => k && k.filter((x) => x.obstojeci).every((x) => x.value === cenaOd.get(x.id))))

  // Poln klub: iz kluba s tremi izbranimi ne sme priti nihce vec.
  const klubPoln = liga.find((i) => liga.filter((j) => j.team_id === i.team_id).length >= 4).team_id
  const trije = liga.filter((i) => i.team_id === klubPoln && i.position !== 'GK').slice(0, 3)
    .map((x) => ({ ...x, je_zacetnik: false, je_kapetan: false, je_namestnik: false }))
  const sTremi = dopolniKader(liga, trije, PRORACUN - trije.reduce((v, x) => v + Number(x.value), 0), nakljucje)
  preveri('dopolni: poln klub ne dobi cetrtega',
    sTremi != null && sTremi.filter((x) => x.team_id === klubPoln).length === 3,
    sTremi ? String(sTremi.filter((x) => x.team_id === klubPoln).length) : 'null')

  preveri('dopolni: brez denarja vrne null', dopolniKader(liga, zacet, 1, nakljucje) === null)
}

// --- NZS: neodigrana tekma ne sme podreti uvoza ----------------------------
// Razpored našteje tudi tekme, ki se še niso odigrale, in NZS za te vrne 404.
// Uvoz je zaradi tega dvakrat padel (15. in 16. septembra) na tekmi, predvideni
// tri dni vnaprej, in cela liga je ostala brez osvežitve.
{
  const nzsVir = (await import('../scripts/viri/nzs.mjs')).default
  const { sifreTekem } = await import('../scripts/viri/nzs.mjs')
  const seznam = readFileSync(
    new URL('./vzorci/tekme-nzs-1snl-sezona25.html', import.meta.url), 'utf8')
  const zapisnik = readFileSync(
    new URL('./vzorci/zapisnik-nzs-1snl.html', import.meta.url), 'utf8')
  const sifre = sifreTekem(seznam)
  const prva = sifre[0]

  const ni = () => {
    const e = new Error('HTTP 404')
    e.status = 404
    return e
  }
  // Seznam tekem prebere prek istega `prenesi`; locimo ga po imenu datoteke
  // (`seznam-…`), zapisnike pa po `zapisnik-…`.
  const jeSeznam = (ime) => String(ime).startsWith('seznam-')

  const mesano = async (url, ime) => {
    if (jeSeznam(ime)) return seznam
    if (String(ime).includes(prva)) return zapisnik
    throw ni()
  }
  const out = await nzsVir.zapisniki('prva-liga-telemach:25', mesano)
  preveri(
    'NZS: neodigrana tekma se preskoci, odigrana se uvozi',
    Array.isArray(out) && out.length === 1 && out[0].id === prva,
    `${out.length} zapisnikov od ${sifre.length} tekem`,
  )

  // Ce 404 vrnejo VSI, to ni normalno stanje, ampak spremenjen naslov — in
  // tiho uvoziti nic je slabse kot pasti.
  const vsi404 = async (url, ime) => {
    if (jeSeznam(ime)) return seznam
    throw ni()
  }
  let pove = false
  try {
    await nzsVir.zapisniki('prva-liga-telemach:25', vsi404)
  } catch (e) {
    pove = /nobeden/.test(String(e.message))
  }
  preveri('NZS: sami 404 so napaka, ne normalno stanje', pove)
}

// --- tedenski pregled ------------------------------------------------------
// Pokoncna slika, a vse bistveno mora ostati v sredinskem kvadratu, ker ga
// predogled v klepetu in objava v viru obrezeta.
{
  // Krog je koncan, ko ima zapisnik vsaka ze odigrana tekma.
  const tekma = (played_on, imported_at, kontumacija = false) => ({ played_on, imported_at, kontumacija })
  preveri('pregled: krog brez zapisnikov ni koncan', !krogKoncan([tekma('2026-09-20', null)], '2026-09-28'))
  preveri('pregled: vsi zapisniki — koncan', krogKoncan([tekma('2026-09-20', 'x'), tekma('2026-09-20', 'x')], '2026-09-28'))
  preveri('pregled: manjkajoc zapisnik zadrzi', !krogKoncan([tekma('2026-09-20', 'x'), tekma('2026-09-20', null)], '2026-09-28'))
  preveri('pregled: kontumacija ne zadrzi', krogKoncan([tekma('2026-09-20', 'x'), tekma('2026-09-20', null, true)], '2026-09-28'))
  preveri('pregled: prelozena tekma v prihodnosti ne zadrzi', krogKoncan([tekma('2026-09-20', 'x'), tekma('2026-09-30', null)], '2026-09-28'))
  preveri('pregled: tekma brez datuma in zapisnika zadrzi', !krogKoncan([tekma('2026-09-20', 'x'), tekma(null, null)], '2026-09-28'))

  // Mesto po krogu in premik: krog 1 (id 11), krog 2 (id 12).
  const krogi = new Map([[11, 1], [12, 2], [13, 3]])
  const vr = [
    { round_id: 11, fantasy_team_id: 1, points: 30 }, { round_id: 11, fantasy_team_id: 2, points: 20 }, { round_id: 11, fantasy_team_id: 3, points: 10 },
    { round_id: 12, fantasy_team_id: 1, points: 0 }, { round_id: 12, fantasy_team_id: 2, points: 5 }, { round_id: 12, fantasy_team_id: 3, points: 40 },
    { round_id: 13, fantasy_team_id: 3, points: 99 }, // prihodnji krog ne sme steti
  ]
  const m3 = mestoVLigi(vr, krogi, 3, 2)
  preveri('pregled: mesto po krogu je skupno, ne kroga', m3.mesto === 1 && m3.odEkip === 3, JSON.stringify(m3))
  preveri('pregled: premik iz 3. na 1. je +2', m3.premik === 2, JSON.stringify(m3))
  const m1 = mestoVLigi(vr, krogi, 1, 2)
  preveri('pregled: padec iz 1. na 2. je -1', m1.mesto === 2 && m1.premik === -1, JSON.stringify(m1))
  preveri('pregled: v prvem krogu ni premika', mestoVLigi(vr, krogi, 1, 1).premik === null)
  const izenaceni = mestoVLigi([{ round_id: 11, fantasy_team_id: 1, points: 10 }, { round_id: 11, fantasy_team_id: 2, points: 10 }], krogi, 2, 1)
  preveri('pregled: izenaceni si delijo mesto', izenaceni.mesto === 1)
  const nova = mestoVLigi([...vr, { round_id: 12, fantasy_team_id: 4, points: 1 }], krogi, 4, 2)
  preveri('pregled: nova ekipa nima premika', nova.premik === null && nova.mesto === 4, JSON.stringify(nova))
  preveri('pregled: oznake premika', oznakaPremika(2).besedilo === '▲ 2' && oznakaPremika(-1).besedilo === '▼ 1' && oznakaPremika(0).besedilo === '=' && oznakaPremika(null) === null)

  // Kapetan in najboljsi.
  const v = (player_id, ime, tocke, mnozitelj, je_kapetan = false, je_namestnik = false) =>
    ({ player_id, ime, klub: 'NK Triglav Kranj', pozicija: 'MID', mnozitelj, je_kapetan, je_namestnik, je_zacetnik: true, tocke })
  const ip = igralciPregleda([v(1, 'Novak Jan', 4, 3, true), v(2, 'Hodžić Harun', 9, 1), v(3, 'Kos Tim', 12, 0)])
  preveri('pregled: kapetan s tockami x3', ip.kapetan.player_id === 1 && ip.kapetan.tocke === 12 && !ip.kapetan.namestnik, JSON.stringify(ip.kapetan))
  preveri('pregled: najboljsi je med tistimi, ki so steli (ne s klopi)', ip.najboljsi.player_id === 2 && ip.najboljsi.ime === 'Harun Hodžić', JSON.stringify(ip.najboljsi))
  const nam = igralciPregleda([v(1, 'Novak Jan', 0, 0, true), v(2, 'Hodžić Harun', 5, 3, false, true)])
  preveri('pregled: namestnik s trakom, ko kapetan ni igral', nam.kapetan.player_id === 2 && nam.kapetan.namestnik && nam.kapetan.tocke === 15)
  const brez = igralciPregleda([v(1, 'Novak Jan', 0, 0, true), v(2, 'Hodžić Harun', 0, 0, false, true)])
  preveri('pregled: brez igre ostane kapetan z nic', brez.kapetan.player_id === 1 && brez.kapetan.tocke === 0 && brez.najboljsi === null)

  // Postavitev: groba meritev (sirina crke ~0,6 pisave), kot pri plakatu.
  const meri = (s, px, teza) => s.length * px * (teza >= 800 ? 0.62 : 0.55)
  const osnova = {
    ekipa: 'Gorenjski Orli', liga: '1. Gorenjska liga — člani', krog: 5, tocke: 64, mesto: 3, odEkip: 118, premik: 2,
    kapetan: { player_id: 1, ime: 'Jan Novak', klub: 'NK Triglav Kranj', grb: null, tocke: 24, mnozitelj: 3, namestnik: false },
    najboljsi: { player_id: 2, ime: 'Harun Hodžić', klub: 'NK Šenčur', grb: null, tocke: 13, mnozitelj: 1, namestnik: false },
  }
  const dolgo = {
    ...osnova,
    ekipa: 'FC Najdaljše ime ekipe v celi Sloveniji United',
    liga: 'Stredoslovenský futbalový zväz — V. liga Sever, skupina A dospelí',
    tocke: 112.5, mesto: 1234, odEkip: 1300, premik: -187,
    kapetan: { ...osnova.kapetan, ime: 'Isaac Raphaël Tshima Omombo Tshipamba-Mulowayi', klub: 'ND Polzela - Združena Savinjska' },
  }
  for (const [ime, p] of [['obicajen', osnova], ['dolga imena', dolgo]]) {
    const el = postaviPregled(p, meri)
    const besedila = el.filter((e) => e.vrsta === 'besedilo')
    const zunajKvadrata = el.filter((e) => !e.samoPokoncno && (e.y < KVADRAT.y + 40 || e.y > KVADRAT.y + KVADRAT.visina - 20))
    preveri(`pregled (${ime}): vse bistveno je v sredinskem kvadratu`, zunajKvadrata.length === 0, zunajKvadrata.map((e) => e.id).join(', '))
    preveri(`pregled (${ime}): nic ne pade s slike`, el.every((e) => e.y > 0 && e.y < VISINA_P))
    const presirok = besedila.filter((e) => {
      const w = meri(e.besedilo, e.px, e.teza)
      const levo = e.poravnava === 'left' ? e.x : e.poravnava === 'right' ? e.x - w : e.x - w / 2
      return levo < ROB_P - 10 || levo + w > SIRINA_P - ROB_P + 10
    })
    preveri(`pregled (${ime}): nobeno besedilo ne sega cez rob`, presirok.length === 0, presirok.map((e) => `${e.id} ${e.besedilo}`).join(' | '))
    const id = (x) => besedila.find((e) => e.id === x)
    preveri(`pregled (${ime}): ekipa, tocke, mesto, kapetan, najboljsi, liga, slff.eu`,
      ['ekipa', 'tocke', 'mesto', 'kapetan.ime', 'najboljsi.ime', 'liga', 'splet', 'nadnaslov'].every((x) => id(x)))
    const imeK = id('kapetan.ime'), tockeK = id('kapetan.tocke')
    preveri(`pregled (${ime}): ime kapetana se ne zaleti v tocke`,
      imeK.x + meri(imeK.besedilo, imeK.px, imeK.teza) < tockeK.x - meri(tockeK.besedilo, tockeK.px, tockeK.teza))
    const mesto = id('mesto'), premik = id('premik')
    preveri(`pregled (${ime}): premik stoji za mestom`, premik && premik.x >= mesto.x + meri(mesto.besedilo, mesto.px, mesto.teza))
    // Vrstice si sledijo od zgoraj navzdol brez prekrivanja osnovnic.
    const po = ['liga', 'nadnaslov', 'ekipa', 'tocke', 'mesto', 'kapetan.ime', 'najboljsi.ime', 'splet'].map((x) => id(x).y)
    preveri(`pregled (${ime}): vrstni red od zgoraj navzdol`, po.every((y, i) => i === 0 || y > po[i - 1]), po.join(' < '))
  }
  const el = postaviPregled(osnova, meri)
  preveri('pregled: kratko ime ekipe je vecje od dolgega',
    el.find((e) => e.id === 'ekipa').px > postaviPregled(dolgo, meri).find((e) => e.id === 'ekipa').px)
  const dolgaVrstici = postaviPregled(dolgo, meri).filter((e) => e.id.startsWith('ekipa')).map((e) => e.besedilo)
  preveri('pregled: dolgo ime ekipe gre v dve vrstici, cele',
    dolgaVrstici.length === 2 && dolgaVrstici.join(' ') === dolgo.ekipa.toUpperCase(), dolgaVrstici.join(' / '))
  preveri('pregled: premik navzgor', el.find((e) => e.id === 'premik').besedilo === '▲ 2')
  const isti = postaviPregled({ ...osnova, najboljsi: { ...osnova.kapetan, tocke: 8 } }, meri)
  preveri('pregled: kapetan, ki je tudi najboljsi, je na sliki enkrat',
    !isti.some((e) => e.id === 'najboljsi.ime') && isti.find((e) => e.id === 'kapetan.oznaka').besedilo.includes('NAJBOLJŠI'))
  const brezMesta = postaviPregled({ ...osnova, mesto: null, premik: null, kapetan: null, najboljsi: null }, meri)
  preveri('pregled: brez mesta in igralcev ostane slika cela', !brezMesta.some((e) => e.id === 'mesto' || e.id === 'kapetan.ime') && brezMesta.some((e) => e.id === 'tocke'))
  preveri('pregled: ime datoteke', imeDatotekePregleda('Šenčurski Orli!', 5) === 'slff-sencurski-orli-5-krog.png', imeDatotekePregleda('Šenčurski Orli!', 5))
}

// --- plakat za objavo ------------------------------------------------------
// Plakat je zgrajen kot program tekme: imena igralcev, ne stevilke.
{
  preveri('plakat: kratko ime kluba je najvecje',
    velikostImena('VIR') > velikostImena('KETY EMMI&IMPOL BISTRICA'),
    `${velikostImena('VIR')} proti ${velikostImena('KETY EMMI&IMPOL BISTRICA')}`)
  preveri('plakat: ime ekipe je manjse od imena kluba, ker nad njim stoji stevilka',
    velikostEkipe('GOSPODINI') < velikostImena('GOSPODINI'))

  preveri('plakat: "Priimek Ime" iz baze postane "Ime Priimek"',
    imeZaPlakat('Hodžić Harun') === 'Harun Hodžić', imeZaPlakat('Hodžić Harun'))
  preveri('plakat: eno samo ime ostane', imeZaPlakat('Ronaldinho') === 'Ronaldinho')

  const trije = najboljsiTrije([
    { full_name: 'Hodžić Harun', points: 36 }, { full_name: 'Hodžić Adis', points: 27 },
    { full_name: 'Kosmač Matija', points: 22 }, { full_name: 'Hudomalj Luka', points: 18 },
    { full_name: 'Nekdo Brez', points: 0 },
  ])
  preveri('plakat: najboljsi trije, po tockah', trije.length === 3 && trije[0].ime === 'Harun Hodžić' && trije[2].tocke === 22,
    JSON.stringify(trije))
  preveri('plakat: igralec z nic tockami ne pride na plakat',
    najboljsiTrije([{ full_name: 'Nekdo', points: 0 }]).length === 0)
  preveri('plakat: kapetan obdrzi oznako',
    najboljsiTrije([{ ime: 'Hodžić Harun', tocke: 12, je_kapetan: true }])[0].kapetan === true)

  preveri('plakat: 1 navijač', navijacev(1) === '1 navijač', navijacev(1))
  preveri('plakat: 2 navijača', navijacev(2) === '2 navijača', navijacev(2))
  preveri('plakat: 3 navijači', navijacev(3) === '3 navijači', navijacev(3))
  preveri('plakat: 5 navijačev', navijacev(5) === '5 navijačev', navijacev(5))
  preveri('plakat: 11 navijačev (ne 11 navijač)', navijacev(11) === '11 navijačev', navijacev(11))
  preveri('plakat: 21 navijačev (sloven. šteje ostanek pri 100)', navijacev(21) === '21 navijačev', navijacev(21))
  preveri('plakat: 101 navijač', navijacev(101) === '101 navijač', navijacev(101))
  preveri('plakat: 102 navijača', navijacev(102) === '102 navijača', navijacev(102))

  preveri('plakat: brez navijacev ni stavka', stavekNavijacev(0) === null)
  preveri('plakat: en navijac "ze ima"', stavekNavijacev(1) === '1 navijač že ima naše igralce v ekipi.', stavekNavijacev(1))
  preveri('plakat: dva navijaca "ze imata"', stavekNavijacev(2).includes('že imata'), stavekNavijacev(2))
  preveri('plakat: trije "ze imajo"', stavekNavijacev(3).includes('že imajo'), stavekNavijacev(3))
  preveri('plakat: enajst "ze ima"', stavekNavijacev(11).includes('že ima naše'), stavekNavijacev(11))

  preveri('plakat: "1. liga MNZ Ljubljana" v tozilniku', ligaVTozilniku('1. liga MNZ Ljubljana') === '1. ligo MNZ Ljubljana', ligaVTozilniku('1. liga MNZ Ljubljana'))
  preveri('plakat: "3. SNL — Zahod" brez besede liga ostane', ligaVTozilniku('3. SNL — Zahod') === '3. SNL — Zahod')
  preveri('plakat: slovaško "IV. liga — SsFZ" v tožilniku', ligaVTozilniku('IV. liga — SsFZ', 'sk') === 'IV. ligu — SsFZ', ligaVTozilniku('IV. liga — SsFZ', 'sk'))
  preveri('plakat: slovaško "I. trieda — Žilina" v tožilniku', ligaVTozilniku('I. trieda — Žilina', 'sk') === 'I. triedu — Žilina', ligaVTozilniku('I. trieda — Žilina', 'sk'))
  preveri('plakat: hrvaško kraj za ligo ostane', ligaVTozilniku('Druga ŽNL Županja — Vukovar', 'hr') === 'Drugu ŽNL Županja — Vukovar', ligaVTozilniku('Druga ŽNL Županja — Vukovar', 'hr'))
  preveri('plakat: hrvaško "Prva zagrebačka liga"', ligaVTozilniku('Prva zagrebačka liga', 'hr') === 'Prvu zagrebačku ligu')
  for (const [iz, v] of [
    ['Treća NL Sjever', 'Treću NL Sjever'],
    ['Prva zagrebačka liga', 'Prvu zagrebačku ligu'],
    ['I. Međimurska nogometna liga', 'I. Međimursku nogometnu ligu'],
    ['Elitna liga — Istra', 'Elitnu ligu — Istra'],
    ['4. NL — NS Rijeka', '4. NL — NS Rijeka'],
  ])
    preveri(`plakat: hrvaško "${iz}" v tožilniku`, ligaVTozilniku(iz, 'hr') === v, ligaVTozilniku(iz, 'hr'))
  for (const [iz, v] of [
    ['I. A třída — Středočeský KFS', 'I. A třídu — Středočeský KFS'],
    ['Krajská soutěž', 'Krajskou soutěž'],
    ['Divize A', 'Divizi A'],
    ['Okresní přebor Kladno', 'Okresní přebor Kladno'],
    ['Pražská liga', 'Pražskou ligu'],
  ])
    preveri(`plakat: češko "${iz}" v tožilniku`, ligaVTozilniku(iz, 'cs') === v, ligaVTozilniku(iz, 'cs'))
  // Madžarščina ne sklanja: ime lige stoji v stavku samostojno (imenovalnik).
  for (const iz of ['Megyei I. osztály — Pest VLSZ', 'Megyei II. osztály', 'NB III Közép'])
    preveri(`plakat: madžarsko "${iz}" ostane v imenovalniku`, ligaVTozilniku(iz, 'hu') === iz, ligaVTozilniku(iz, 'hu'))
  // Nemščina ne sklanja: ime lige stoji za dvopičjem.
  for (const iz of ['Landesliga — Steiermark', '1. Klasse Mitte', 'Gebietsliga West'])
    preveri(`plakat: nemško "${iz}" ostane nespremenjeno`, ligaVTozilniku(iz, 'de') === iz, ligaVTozilniku(iz, 'de'))
  // Srbščina sklanja kot hrvaščina, glava je lahko še "zona".
  for (const [iz, v] of [
    ['Srpska liga Beograd', 'Srpsku ligu Beograd'],
    ['Zona Dunav', 'Zonu Dunav'],
    ['Međuopštinska liga — Kragujevac', 'Međuopštinsku ligu — Kragujevac'],
    ['Okružna liga Pirot', 'Okružnu ligu Pirot'],
    ['PFL Novi Sad', 'PFL Novi Sad'],
  ])
    preveri(`plakat: srbsko "${iz}" v tožilniku`, ligaVTozilniku(iz, 'sr') === v, ligaVTozilniku(iz, 'sr'))
  // Romunščina ne sklanja: ime lige stoji za dvopičjem.
  for (const iz of ['Liga a IV-a Ilfov', 'Liga 3 — Seria 5', 'Liga a V-a București'])
    preveri(`plakat: romunsko "${iz}" ostane nespremenjeno`, ligaVTozilniku(iz, 'ro') === iz, ligaVTozilniku(iz, 'ro'))
  // Estonščina (14 sklonov) ne sklanja: ime lige stoji za dvopičjem.
  for (const iz of ['Esiliiga', 'II liiga Põhi/Lääs', 'Harju maakonna liiga'])
    preveri(`plakat: estonsko "${iz}" ostane nespremenjeno`, ligaVTozilniku(iz, 'et') === iz, ligaVTozilniku(iz, 'et'))

  // "Je live": kratko ime lige ne sme zrasti cez rob, ce gre v dve vrstici.
  preveri('plakat live: kratko ime v eni vrstici je najvecje', velikostLige('3. SNL ZAHOD', 1) === 124)
  preveri('plakat live: isto ime v dveh vrsticah se omeji', velikostLige('3. SNL ZAHOD', 2) <= 104, String(velikostLige('3. SNL ZAHOD', 2)))
  preveri('plakat live: dolgo ime je manjse', velikostLige('POMURSKA NOGOMETNA LIGA', 2) < velikostLige('3. SNL ZAHOD', 1))

  preveri('plakat: ime datoteke je varno',
    imeDatoteke('Kety Emmi&Impol Bistrica') === 'slff-kety-emmi-impol-bistrica.png', imeDatoteke('Kety Emmi&Impol Bistrica'))

  // Predolga imena — vzeta iz baze, ne izmisljena. Merilo: 10 enot na znak.
  const meri = (t) => t.length * 10
  const dolg = imeZaPlakat('Tshipamba-Mulowayi Isaac Raphaël Tshima Omombo') // 46 znakov
  preveri('plakat: kratko ime ostane celo', skrajsajIme('Harun Hodžić', 300, meri) === 'Harun Hodžić')
  preveri('plakat: predolgo ime najprej izgubi srednja imena',
    skrajsajIme(dolg, 260, meri) === 'Isaac Tshipamba-Mulowayi', skrajsajIme(dolg, 260, meri))
  preveri('plakat: se predolgo ime dobi zacetnico, priimek ostane cel',
    skrajsajIme(dolg, 220, meri) === 'I. Tshipamba-Mulowayi', skrajsajIme(dolg, 220, meri))
  preveri('plakat: skrajsano ime ni nikoli sirse od prostora, ce priimek to dopusca',
    meri(skrajsajIme(dolg, 220, meri)) <= 220)
  preveri('plakat: eno samo predolgo ime se ne razbije', skrajsajIme('Ronaldinho', 50, meri) === 'Ronaldinho')

  // Ime kluba se manjsa, dokler ne pride v sirino — po meritvi, ne po znakih.
  const meriPri = (px, t) => t.length * px * 0.6
  const klub = 'ND POLZELA - ZDRUŽENA SAVINJSKA'
  const px = prilagodiVelikost(klub, 78, 40, 912, meriPri)
  preveri('plakat: predolgo ime kluba dobi manjso pisavo', px < 78 && meriPri(px, klub) <= 912, `${px}px`)
  preveri('plakat: kratko ime kluba obdrzi zacetno velikost', prilagodiVelikost('VIR', 210, 40, 912, meriPri) === 210)
  preveri('plakat: pisava ne pade pod najmanjso', prilagodiVelikost('X'.repeat(200), 78, 40, 912, meriPri) === 40)
}

// --- hooki pred zgodnjim return ---------------------------------------------
// React #310 v produkciji: `useEffect` je stal ZA `if (nalaganje) return`,
// zato se je ob prehodu iz nalaganja v prikaz stevilo hookov spremenilo in
// stran Lestvica se je sesula. Izris v smoke tega ne ujame, ker izrise le
// stanje nalaganja. Zato staticno: v nobeni strani noben hook ne sme stati za
// vrstico, ki se zacne z `if (...) return`.
{
  const { readdirSync } = await import('node:fs')
  const mapa = new URL('../src/pages/', import.meta.url)
  let krsitev = []
  for (const dat of readdirSync(mapa).filter((d) => d.endsWith('.tsx'))) {
    const koda = readFileSync(new URL(dat, mapa), 'utf8')
    // Telo glavne komponente: od `export default function` do njenega konca
    // (prva vrstica, ki je natanko `}`). Pomozne komponente nize v datoteki
    // imajo svoje hooke in nas tu ne zanimajo.
    const od = koda.indexOf('export default function')
    if (od < 0) continue
    const vse = koda.slice(od).split('\n')
    const konec = vse.findIndex((v, i) => i > 0 && v === '}')
    const vrstice = konec > 0 ? vse.slice(0, konec) : vse
    let prviReturn = -1
    for (let i = 0; i < vrstice.length; i++) {
      const v = vrstice[i]
      // Zgodnji return na vrhu telesa komponente (dva presledka zamika).
      if (prviReturn < 0 && /^  (if \(.*\) )?return[ (]/.test(v)) prviReturn = i
      if (prviReturn >= 0 && i > prviReturn && /^  (const .* = )?use(State|Effect|Memo|Ref|Callback)\(/.test(v)) {
        krsitev.push(`${dat}:${i + 1} ${v.trim().slice(0, 50)}`)
      }
    }
  }
  preveri('strani: noben hook ne stoji za zgodnjim return', krsitev.length === 0, krsitev.join('; '))
}

// --- prijava, opomniki, kanonicni naslov -------------------------------------
{
  const { varnaPot, napakaPrijave, povezavaNaPrijavo } = await import('../src/lib/prijava')
  const { kanonicni, jeZasebna } = await import('../src/lib/naslov')
  const { default: Opomniki } = await import('../src/pages/Opomniki')
  preveri('prijava: notranja pot je varna', varnaPot('/mini-leagues?vstop=AB') === '/mini-leagues?vstop=AB')
  preveri(
    'prijava: tuja ali relativna pot ni varna',
    [null, '', 'https://zlo.si', '//zlo.si', '/\\zlo.si', 'mini-lige'].every((p) => varnaPot(p) === null),
  )
  preveri('prijava: povezava kodira pot', povezavaNaPrijavo('/positions?t=mladinci') === '/login?nazaj=%2Fpositions%3Ft%3Dmladinci')
  preveri('prijava: napacno geslo po slovensko', napakaPrijave('Invalid login credentials') === 'Napačen e-naslov ali geslo.')
  preveri('prijava: neznana napaka ostane', napakaPrijave('Nekaj cudnega') === 'Nekaj cudnega')
  preveri('naslov: kanonicni obdrzi le ligo', kanonicni('/players', '?t=mladinci&klub=3') === 'https://slff.eu/players?t=mladinci')
  preveri('naslov: kanonicni brez lige', kanonicni('/', '') === 'https://slff.eu/')
  preveri('naslov: kanonicni brez koncne posevnice', kanonicni('/players/', '?t=x') === 'https://slff.eu/players?t=x' && kanonicni('/', '') === 'https://slff.eu/')
  preveri('naslov: zasebne strani noindex', ['/my-team', '/my-team/', '/mini-leagues', '/login', '/account', '/reminders', '/new-password', '/team/5', '/l/AB12', '/admin', '/mini-leagues/3'].every(jeZasebna) && !jeZasebna('/players') && !jeZasebna('/'))
  preveri('naslov: kanonicni strani brez lige nima ?t=', kanonicni('/legal', '?t=mladinci') === 'https://slff.eu/legal')
  const { zLigo } = await import('../src/lib/tekmovanje')
  preveri('povezava: liga v naslovu', zLigo('/player/5', 'sk-za-1trieda') === '/player/5?t=sk-za-1trieda')
  preveri('povezava: liga ob poizvedbi in #', zLigo('/standings?x=1#fans', 'mladinci') === '/standings?x=1&t=mladinci#fans')
  preveri('povezava: obstojeca liga ostane', zLigo('/my-team?t=clani', 'mladinci') === '/my-team?t=clani')
  preveri(
    'povezava: brez lige ostane',
    zLigo('/players', null) === '/players' && zLigo('/login?nazaj=%2F', 'mladinci') === '/login?nazaj=%2F' && zLigo('https://x.si/a', 'mladinci') === 'https://x.si/a',
  )
  try {
    const html = renderToString(
      <StaticRouter location="/reminders">
        <AuthProvider>
          <TekmovanjeProvider>
            <Opomniki />
          </TekmovanjeProvider>
        </AuthProvider>
      </StaticRouter>,
    )
    preveri('izris: Opomniki', Boolean(html && html.length))
  } catch (e) {
    preveri('izris: Opomniki', false, e.message)
  }

  // Strani mobilne aplikacije: izbris računa in povezava iz e-pošte.
  const { default: Racun } = await import('../src/pages/Racun')
  const { default: PotrditevPovezave } = await import('../src/pages/PotrditevPovezave')
  const { izvor, DOMENA } = await import('../src/lib/platforma')
  preveri('aplikacija: povezave brez okna gredo na slff.eu', izvor() === DOMENA && DOMENA === 'https://slff.eu')
  for (const [ime, pot, Stran] of [['Racun', '/account', Racun], ['PotrditevPovezave', '/auth/confirm?type=signup', PotrditevPovezave]]) {
    try {
      const html = renderToString(
        <StaticRouter location={pot}>
          <AuthProvider>
            <TekmovanjeProvider>
              <Stran />
            </TekmovanjeProvider>
          </AuthProvider>
        </StaticRouter>,
      )
      preveri(`izris: ${ime}`, Boolean(html && html.length))
    } catch (e) {
      preveri(`izris: ${ime}`, false, e.message)
    }
  }
}

// --- Moja ekipa: neaktiven igralec in predlog v ligi s petimi klubi --------
// Baza (`roster_je_veljaven`) kader z neaktivnim igralcem zavrne; brez
// opozorila na strani bi ekipa tiho ostala brez tock.
{
  const zNeaktivnim = veljavna.map((i) =>
    i.id === 12 ? { ...i, active: false, full_name: 'Novak Janez' } : i)
  const napake = preveriEkipo(zNeaktivnim, 100)
  preveri('pravila: neaktiven igralec sprozi napako z imenom',
    napake.some((n) => n.includes('Janez Novak ni več v ligi')), napake.join(' | '))
  preveri('pravila: aktivni igralci ne sprozijo napake o ligi',
    !preveriEkipo(veljavna, 100).some((n) => n.includes('ni več v ligi')))
}
{
  // Pet klubov po tri igralce na kader: vsak klub mora dati natanko tri.
  // Najcenejsi vratarji, branilci in vezisti so v klubih 1-2, zato jih
  // pohlepno jemanje po pozicijah vzame prevec iz istih klubov in napadalcev
  // zmanjka.
  const liga = []
  let id = 1
  for (let klub = 1; klub <= 5; klub++) {
    const poceni = klub <= 2
    for (const [poz, koliko] of [['GK', 2], ['DEF', 3], ['MID', 3], ['FWD', klub <= 2 ? 0 : 1]]) {
      for (let n = 0; n < koliko; n++)
        liga.push({ id: id++, position: poz, team_id: klub, value: poceni ? 4 : 5, points: n })
    }
  }
  const kader = predlagajKader(liga, PRORACUN)
  preveri('predlog: pet klubov da veljaven kader', Array.isArray(kader) && kader.length === 15,
    kader ? String(kader.length) : 'null')
  if (kader) {
    const poKlubu = {}
    for (const k of kader) poKlubu[k.team_id] = (poKlubu[k.team_id] ?? 0) + 1
    preveri('predlog: pet klubov — iz vsakega natanko trije',
      Object.values(poKlubu).length === 5 && Object.values(poKlubu).every((n) => n === 3),
      JSON.stringify(poKlubu))
  }
}

// --- prijava: odprta preusmeritev, slovnica tock, neshranjene spremembe ----
{
  const { varnaPot } = await import('../src/lib/prijava')
  for (const p of ['/\t/zlo.si', '/\n/zlo.si', '/\r/zlo.si', '//zlo.si', '/\\zlo.si', '/\u0000x', '/x\u007F'])
    preveri(`prijava: ${JSON.stringify(p)} ni varna`, varnaPot(p) === null, String(varnaPot(p)))
  preveri('prijava: /l/ABC?t=x ostane', varnaPot('/l/ABC?t=x') === '/l/ABC?t=x')
  preveri('prijava: hash ostane', varnaPot('/my-team#status') === '/my-team#status')

  const { mnozina, tockZ, TOCK_RODILNIK, TOCKE_TOZILNIK } = await import('../src/lib/pomozno')
  preveri('slovnica: odbitek 1 tocke', mnozina(1, TOCK_RODILNIK) === '1 točke')
  preveri('slovnica: odbitek 4 tock', mnozina(4, TOCK_RODILNIK) === '4 točk')
  preveri('slovnica: prinesla 1 tocko', mnozina(1, TOCKE_TOZILNIK) === '1 točko')
  preveri('slovnica: prinesla 3 tocke', mnozina(3, TOCKE_TOZILNIK) === '3 točke')
  preveri('slovnica: necelo je tocke', tockZ(2.5) === 'točke' && tockZ('12.5') === 'točke')
  preveri('slovnica: celo po obliki', tockZ(1) === 'točka' && tockZ(5) === 'točk' && tockZ(null) === 'točk')

  const { nastaviNeshranjeno, jeNeshranjeno, potrdiZapustitev } = await import('../src/lib/neshranjeno')
  nastaviNeshranjeno(false)
  preveri('neshranjeno: brez sprememb ni vprasanja', potrdiZapustitev() === true)
  nastaviNeshranjeno(true)
  preveri('neshranjeno: zastavica se nastavi', jeNeshranjeno() === true)
  nastaviNeshranjeno(false)

  const { default: Potrditev } = await import('../src/components/admin/Potrditev')
  try {
    const html = renderToString(
      <Potrditev potrdi={() => {}} preklici={() => {}}>Res?</Potrditev>,
    )
    preveri('izris: Potrditev je alertdialog', html.includes('role="alertdialog"') && html.includes('aria-labelledby'))
  } catch (e) {
    preveri('izris: Potrditev je alertdialog', false, e.message)
  }

  const { obvestilaEkip, naslovNapak, kljucOpozorila } = await import('../src/lib/stanjeEkip')
  const blaj = { player_id: 7, ime: 'Blaj Marcel', vrsta: 'poskodba', opis: 'gleženj', datum: '2026-09-20', v_postavi: true, kapetan: true, namestnik: false }
  const klop = { player_id: 8, ime: 'Novak Luka', vrsta: 'odsotnost', opis: null, datum: '2026-09-21', v_postavi: false, kapetan: false, namestnik: false }
  const ekipe = [
    { competition_id: 1, slug: 'snl3-vzhod', liga: '3. V', team_id: 10, team_name: 'G', veljavna: true, brez_tock: false, razlog: null, krog: 7, rok: null, opozorila: [blaj, klop] },
    { competition_id: 2, slug: 'clani', liga: 'Člani', team_id: 11, team_name: 'G', veljavna: false, brez_tock: true, razlog: 'Kader ima 14 igralcev namesto 15.', krog: 6, rok: null, opozorila: [] },
    { competition_id: 3, slug: 'mladinci', liga: 'Mladinci', team_id: 12, team_name: 'G', veljavna: false, brez_tock: false, razlog: 'Manjka vratar.', krog: 2, rok: null, opozorila: [] },
  ]
  const ob = obvestilaEkip(ekipe)
  preveri('obvestila: neveljavna ekipa je napaka z razlogom',
    ob.napake.length === 1 && ob.napake[0].slug === 'clani' && ob.napake[0].besedilo.includes('6. krogu') && ob.napake[0].podrobnost.includes('14 igralcev'))
  preveri('obvestila: poskodovan kapetan je opozorilo',
    ob.opozorila.some((o) => o.besedilo === 'Kapetan Marcel Blaj je poškodovan.' && o.podrobnost.startsWith('gleženj')), JSON.stringify(ob.opozorila.map((o) => o.besedilo)))
  preveri('obvestila: odsoten na klopi', ob.opozorila.some((o) => o.besedilo === 'Luka Novak na klopi je odsoten.'))
  preveri('obvestila: nepopolna v prvem krogu je le opozorilo',
    ob.opozorila.some((o) => o.slug === 'mladinci' && o.besedilo.startsWith('Ekipa ni popolna')))
  const skrito = obvestilaEkip(ekipe, { skrita: new Set([kljucOpozorila(10, blaj)]) })
  preveri('obvestila: skrito opozorilo izgine', !skrito.opozorila.some((o) => o.besedilo.startsWith('Kapetan')))
  const novo = obvestilaEkip([{ ...ekipe[0], opozorila: [{ ...blaj, datum: '2026-09-22' }] }], { skrita: new Set([kljucOpozorila(10, blaj)]) })
  preveri('obvestila: novo porocilo se spet pokaze', novo.opozorila.length === 1)
  preveri('obvestila: na Moji ekipi se izbrana liga skrije',
    obvestilaEkip(ekipe, { skrijLigo: 'clani' }).napake.length === 0)
  preveri('obvestila: napake ni mogoce skriti',
    obvestilaEkip(ekipe, { skrita: new Set(['napaka:11']) }).napake.length === 1)
  preveri('obvestila: naslov 1', naslovNapak(1) === 'Ena od tvojih ekip ne bo dobila točk')
  preveri('obvestila: naslov 2', naslovNapak(2) === '2 tvoji ekipi ne bosta dobili točk')
  preveri('obvestila: naslov 3', naslovNapak(3) === '3 tvoje ekipe ne bodo dobile točk')
  preveri('obvestila: naslov 5', naslovNapak(5) === '5 tvojih ekip ne bo dobilo točk')

  // --- namigi za prestope in gibanje cen (lib/namigiEkipe) ------------------
  {
    const N = await import('../src/lib/namigiEkipe')
    // Kader 2-5-5-3: klubi 1-5, iz kluba 1 trije (en je vratar 1).
    const poz = ['GK', 'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD']
    const klub = [1, 2, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 3, 4, 5]
    const kader = poz.map((p, i) => ({ id: 100 + i, position: p, team_id: klub[i], team_name: `K${klub[i]}`, value: 5, active: true, is_starter: i !== 1 && i < 12 }))
    const vsiKlubi = new Set([1, 2, 3, 4, 5, 6])
    const brez = { klubiZTekmo: vsiKlubi, odsotni: {} }
    preveri('namigi: poln kader brez tezav nima namigov', N.namigiZaPrestope(kader, [], 0, brez).length === 0)
    preveri('namigi: neaktiven', N.razlogSibkosti({ id: 1, active: false }, brez) === 'neaktiven')
    preveri('namigi: poskodovan', N.razlogSibkosti({ id: 1, team_id: 1 }, { ...brez, odsotni: { 1: 'poskodba' } }) === 'poskodba')
    preveri('namigi: opomba ni odsotnost', N.razlogSibkosti({ id: 1, team_id: 1 }, { ...brez, odsotni: { 1: 'opomba' } }) === null)
    preveri('namigi: klub brez tekme', N.razlogSibkosti({ id: 1, team_id: 9 }, brez) === 'brezTekme')
    preveri('namigi: brez razporeda klub ni razlog', N.razlogSibkosti({ id: 1, team_id: 9 }, { klubiZTekmo: null, odsotni: {} }) === null)

    // Klub 5 v krogu ne igra: trije igralci (DEF, MID, FWD) so sibki.
    const brez5 = { klubiZTekmo: new Set([1, 2, 3, 4, 6]), odsotni: {} }
    const trg = [
      { id: 1, position: 'DEF', team_id: 6, value: 5.5, form: 4, points_per_match: 3, active: true },
      { id: 2, position: 'DEF', team_id: 6, value: 5.6, form: 6, points_per_match: 3, active: true }, // predrag
      { id: 3, position: 'DEF', team_id: 1, value: 4.5, form: 9, points_per_match: 5, active: true }, // klub 1 je poln
      { id: 4, position: 'DEF', team_id: 5, value: 4.5, form: 9, points_per_match: 5, active: true }, // klub brez tekme
      { id: 5, position: 'DEF', team_id: 6, value: 4.5, form: 7, points_per_match: 2, active: false }, // neaktiven
      { id: 6, position: 'DEF', team_id: 6, value: 4.5, form: 8, points_per_match: 2, active: true }, // poskodovan
      { id: 7, position: 'DEF', team_id: 6, value: 4.0, form: 2, points_per_match: 1, active: true },
      { id: 8, position: 'DEF', team_id: 6, value: 4.0, form: 3, points_per_match: 1, active: true },
      { id: 9, position: 'DEF', team_id: 6, value: 4.0, form: 3, points_per_match: 2, active: true },
      { id: 10, position: 'MID', team_id: 6, value: 4.0, form: 10, points_per_match: 9, active: true }, // druga pozicija
      { id: 11, position: 'FWD', team_id: 6, value: 5.0, form: 5, points_per_match: 4, active: true },
    ]
    const moz = { ...brez5, odsotni: { 6: 'poskodba' } }
    // Prodaja branilca za 5.0 + 0.5 v blagajni = 5.5 na voljo.
    const namigi = N.namigiZaPrestope(kader, trg, 0.5, moz)
    const def = namigi.find((m) => m.igralec.id === 106)
    const ids = def?.zamenjave.map((k) => k.id) ?? []
    preveri('namigi: klub brez tekme da tri sibka mesta', namigi.length === 3 && namigi.every((m) => m.razlog === 'brezTekme'), JSON.stringify(namigi.map((m) => m.igralec.id)))
    preveri('namigi: prva postava pred klopjo', namigi[namigi.length - 1].igralec.id === 114)
    preveri('namigi: najvec tri zamenjave, po formi', ids.join(',') === '1,9,8', ids.join(','))
    preveri('namigi: proracun steje prodajo (5.5 = 0.5 + 5.0)', ids.includes(1) && !ids.includes(2))
    preveri('namigi: ne vec kot 3 iz kluba', !ids.includes(3))
    preveri('namigi: kandidat mora imeti tekmo, biti aktiven in zdrav', !ids.includes(4) && !ids.includes(5) && !ids.includes(6))
    preveri('namigi: le ista pozicija', !ids.includes(10))
    // Prodaja igralca iz polnega kluba sprosti mesto za igralca istega kluba.
    const iz1 = N.zamenjaveZa(kader[2], kader, trg, 0, brez)
    preveri('namigi: prodan igralec sprosti mesto v klubu', iz1.some((k) => k.id === 3))
    // Mesto v kadru steje po poziciji nakupa, ne po danasnji.
    preveri('namigi: igralec brez pozicije nima zamenjav', N.zamenjaveZa({ ...kader[2], position: null }, kader, trg, 5, brez).length === 0)
    const fwd = namigi.find((m) => m.igralec.id === 114)
    preveri('namigi: napadalec dobi napadalca', fwd?.zamenjave.length === 1 && fwd.zamenjave[0].id === 11)
    preveri('namigi: brez denarja ni zamenjave', N.zamenjaveZa(kader[6], kader, trg.map((k) => ({ ...k, value: 9 })), 0, brez5).length === 0)

    const g = N.gibanjeCen([
      { player_id: 1, old_value: 5.0, new_value: 5.2, changed_at: '2026-09-20T04:00:00Z' },
      { player_id: 1, old_value: 5.2, new_value: 5.3, changed_at: '2026-09-27T04:00:00Z' },
      { player_id: 2, old_value: 6.0, new_value: 5.9, changed_at: '2026-09-27T04:00:00Z' },
      { player_id: 3, old_value: 4.5, new_value: 4.6, changed_at: '2026-09-20T04:00:00Z' },
      { player_id: 3, old_value: 4.6, new_value: 4.5, changed_at: '2026-09-27T04:00:00Z' },
    ])
    preveri('gibanje: prva stara in zadnja nova cena', g.igralci[0].player_id === 1 && g.igralci[0].iz === 5 && g.igralci[0].v === 5.3 && g.igralci[0].razlikaC === 30)
    preveri('gibanje: gor in nazaj dol ni premik', !g.igralci.some((i) => i.player_id === 3))
    preveri('gibanje: vrednost ekipe v centih', g.skupajC === 20 && N.gibanjeCen([]).skupajC === 0)
    const zdaj = Date.parse('2026-09-28T12:00:00Z')
    preveri('obisk: brez zapisa zadnji teden', N.odKdaj(null, zdaj).od === '2026-09-21T12:00:00.000Z' && !N.odKdaj(null, zdaj).zadnjiObisk)
    preveri('obisk: zadnji obisk', N.odKdaj('2026-09-27T08:00:00.000Z', zdaj).od === '2026-09-27T08:00:00.000Z' && N.odKdaj('2026-09-27T08:00:00.000Z', zdaj).zadnjiObisk)
    preveri('obisk: pokvarjen ali prihodnji zapis', !N.odKdaj('smeti', zdaj).zadnjiObisk && !N.odKdaj('2027-01-01T00:00:00Z', zdaj).zadnjiObisk)
    preveri('obisk: brez localStorage ne pade', N.preberiZadnjiOgled(1) === null && N.namigiSkriti(1, 2) === false)
  }

  const K = await import('../src/lib/karticaIgralca')
  preveri('kartica: dva gola in asistenca', K.dosezkiNastopa({ minute: 90, goli: 2, asistence: 1, cistaMreza: false, obranjene: 0 }, 'FWD').join(', ') === '2 gola, asistenca, 90 min')
  preveri('kartica: en gol je "gol"', K.dosezkiNastopa({ minute: 70, goli: 1, asistence: 0, cistaMreza: false, obranjene: 0 }, 'MID')[0] === 'gol')
  preveri('kartica: vratar brez prejetega gola', K.dosezkiNastopa({ minute: 90, goli: 0, asistence: 0, cistaMreza: true, obranjene: 1 }, 'GK').join(', ') === 'obranjena enajstmetrovka, mreža brez gola, 90 min')
  preveri('kartica: napadalcu mreza ne steje', !K.dosezkiNastopa({ minute: 90, goli: 0, asistence: 0, cistaMreza: true, obranjene: 0 }, 'FWD').includes('mreža brez gola'))
  preveri('kartica: tekma', K.vrsticaTekme('Triglav', 'Bled', 3, 1) === 'Triglav 3 : 1 Bled' && K.vrsticaTekme('A', 'B', null, null) === 'A – B')
  preveri('kartica: 1 tocka / 2 tocki / 5 tock', K.podnapisTock(1, 8) === 'točka v 8. krogu' && K.podnapisTock(2, 8) === 'točki v 8. krogu' && K.podnapisTock(5, null) === 'točk v sezoni')
  preveri('kartica: ekipe', K.stavekEkip(1) === 'V 1 fantasy ekipi' && K.stavekEkip(34) === 'V 34 fantasy ekipah' && K.stavekEkip(0) === null)
  preveri('kartica: dolg priimek se zmanjsa', K.velikostPriimka(600, (px) => px * 20) === 72 && K.velikostPriimka(600, (px) => px * 2) === 210)
  preveri('kartica: ime datoteke', K.imeDatotekeKartice('Žan', 'Bunić', 8) === 'slff-zan-bunic-8-krog.png')
}

// --- država obiskovalca in privzeta liga -----------------------------------
// Slovenski tok se ne sme spremeniti: kdor ligo ima (shranjeno ali `?t=`),
// ostane pri njej; prijavljen dobi ligo svojih ekip; šele nato ugib
// (izbira s povezave → IP → jezik → pas), sicer Gorenjska kot doslej.
{
  const D = await import('../src/lib/drzava.ts')
  const U = await import('../src/lib/drzavaUgib.ts')
  const lige = [
    { id: 1, slug: 'clani', country_code: 'SI' },
    { id: 2, slug: 'lj-1-liga', country_code: 'SI' },
    { id: 3, slug: 'sk-ssfz-4liga', country_code: 'SK' },
    { id: 4, slug: 'sk-za-1trieda', country_code: 'SK' },
  ]
  const brezSk = lige.filter((l) => l.country_code === 'SI')
  preveri('drzava: Slovaska je odprta (SAMO_S_POVEZAVO prazen)', U.SAMO_S_POVEZAVO.length === 0)
  // Vrstni red ugiba.
  preveri('drzava: slovenski brskalnik', D.ugibajDrzavo({ jeziki: ['sl-SI', 'en'], casovniPas: 'Europe/Ljubljana' }) === 'SI')
  preveri('drzava: slovaski brskalnik', D.ugibajDrzavo({ jeziki: ['sk-SK'], casovniPas: 'Europe/Bratislava' }) === 'SK')
  preveri('drzava: anglesko v Bratislavi (pas je zadnji znak)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Bratislava' }) === 'SK')
  preveri('drzava: slovensko v Bratislavi (jezik pred pasom)', D.ugibajDrzavo({ jeziki: ['sl'], casovniPas: 'Europe/Bratislava' }) === 'SI')
  preveri('drzava: nemski/angleski brskalnik v Ljubljani = Slovenija', D.ugibajDrzavo({ jeziki: ['de-DE', 'en'], casovniPas: 'Europe/Ljubljana' }) === 'SI')
  preveri('drzava: neznan obiskovalec', D.ugibajDrzavo({ jeziki: ['de-DE'], casovniPas: 'Europe/Berlin' }) === null)
  preveri('drzava: IP pred jezikom (SI IP, slovaski brskalnik)', D.ugibajDrzavo({ ip: 'SI', jeziki: ['sk'], casovniPas: 'Europe/Bratislava' }) === 'SI')
  preveri('drzava: IP pred jezikom (SK IP, angleski brskalnik)', D.ugibajDrzavo({ ip: 'SK', jeziki: ['en'], casovniPas: 'Europe/Ljubljana' }) === 'SK')
  preveri('drzava: tuj IP (PL) preskoci na jezik', D.ugibajDrzavo({ ip: 'PL', jeziki: ['sk'] }) === 'SK')
  preveri('drzava: tuj IP brez znakov = null (Slovenija)', D.ugibajDrzavo({ ip: 'DE', jeziki: ['de'], casovniPas: 'Europe/Berlin' }) === null)
  preveri('drzava: povezava /sk povozi IP in jezik', D.ugibajDrzavo({ shranjena: 'SK', ip: 'SI', jeziki: ['sl'] }) === 'SK')
  preveri('drzava: izbira Slovenije povozi slovaski IP', D.ugibajDrzavo({ shranjena: 'SI', ip: 'SK', jeziki: ['sk'] }) === 'SI')
  // Zaprta država: seznam je zdaj prazen, a mehanizem mora še delovati.
  U.SAMO_S_POVEZAVO.push('SK')
  preveri('drzava: zaprte Slovaske ne odpre IP', D.ugibajDrzavo({ ip: 'SK', jeziki: ['en'] }) === null)
  preveri('drzava: zaprte Slovaske ne odpre jezik', D.ugibajDrzavo({ jeziki: ['sk-SK'], casovniPas: 'Europe/Bratislava' }) === null)
  preveri('drzava: zaprto Slovasko odpre povezava', D.ugibajDrzavo({ shranjena: 'SK' }) === 'SK')
  U.SAMO_S_POVEZAVO.length = 0

  // Država po IP: nikoli ne vrže in ne čaka predolgo.
  const json = (telo, glave = { 'content-type': 'application/json' }) => async () =>
    new Response(JSON.stringify(telo), { headers: glave })
  preveri('ip: prebere drzavo', (await D.drzavaPoIp({ fetchFn: json({ drzava: 'SK' }) })) === 'SK')
  preveri('ip: brez glave je null', (await D.drzavaPoIp({ fetchFn: json({ drzava: null }) })) === null)
  preveri('ip: neveljavna koda je null', (await D.drzavaPoIp({ fetchFn: json({ drzava: '<script>' }) })) === null)
  preveri('ip: vite dev vrne index.html = null', (await D.drzavaPoIp({ fetchFn: async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }) })) === null)
  preveri('ip: 404 = null', (await D.drzavaPoIp({ fetchFn: async () => new Response('', { status: 404 }) })) === null)
  preveri('ip: omrezna napaka = null', (await D.drzavaPoIp({ fetchFn: async () => { throw new TypeError('Failed to fetch') } })) === null)
  const zacetekIp = Date.now()
  const pocasen = await D.drzavaPoIp({
    casMs: 50,
    fetchFn: (_u, o) =>
      new Promise((r, z) => {
        const u = setTimeout(() => r(new Response('{"drzava":"SK"}', { headers: { 'content-type': 'application/json' } })), 2000)
        o?.signal?.addEventListener('abort', () => {
          clearTimeout(u)
          z(new Error('abort'))
        })
      }),
  })
  preveri('ip: pocasen odgovor po roku = null', pocasen === null && Date.now() - zacetekIp < 500, `${Date.now() - zacetekIp} ms`)

  // Privzeta liga in lige države.
  preveri('privzeta: Slovenija ostane clani', D.privzetaLiga(lige, 'SI') === 'clani')
  preveri('privzeta: neznan ostane clani', D.privzetaLiga(lige, null) === 'clani')
  preveri('privzeta: Slovak dobi svojo ligo', D.privzetaLiga(lige, 'SK') === 'sk-ssfz-4liga')
  preveri('privzeta: Slovaska brez aktivne lige = clani', D.privzetaLiga(brezSk, 'SK') === 'clani')
  const slugi = (r) => r.lige.map((l) => l.slug).join(',')
  preveri('lige: Slovenec ne vidi slovaske', slugi(D.ligeDrzave(lige, 'clani', 'SK')) === 'clani,lj-1-liga')
  preveri('lige: Slovak vidi le svoje', slugi(D.ligeDrzave(lige, 'sk-ssfz-4liga', null)) === 'sk-ssfz-4liga,sk-za-1trieda')
  preveri('lige: dokler liga ni znana, velja ugib', D.ligeDrzave(lige, 'neznana', 'SK').drzava === 'SK')
  preveri('lige: brez ugiba Slovenija', D.ligeDrzave(lige, 'neznana', null).drzava === 'SI')
  preveri('lige: Slovak brez aktivne slovaske lige vidi slovenske', slugi(D.ligeDrzave(brezSk, 'clani', 'SK')) === 'clani,lj-1-liga')

  // Liga ekip prijavljenega uporabnika.
  preveri('ekipe: brez ekip ni lige', D.ligaEkip([], lige) === null)
  preveri('ekipe: Slovenec z ljubljansko ekipo', D.ligaEkip([{ competition_id: 2 }], lige) === 'lj-1-liga')
  preveri('ekipe: vec ekip v Sloveniji kot na Slovaskem', D.ligaEkip([{ competition_id: 3 }, { competition_id: 1 }, { competition_id: 2 }], lige) === 'clani')
  preveri('ekipe: izenacenje dobi drzava prve ekipe', D.ligaEkip([{ competition_id: 4 }, { competition_id: 1 }], lige) === 'sk-za-1trieda')
  preveri('ekipe: ekipa v neaktivni ligi ne steje', D.ligaEkip([{ competition_id: 99 }], lige) === null)

  // Začetna liga: obstoječa liga > ekipe > ugib > clani.
  const zl = (o) => D.zacetnaLiga({ vse: lige, slug: 'clani', izrecno: false, ligaEkip: null, ugib: null, ...o })
  preveri('zacetna: shranjena clani ostane ob slovaskem ugibu', zl({ izrecno: true, ugib: 'SK' }) === null)
  preveri('zacetna: ?t=lj-1-liga ostane ob slovaskem ugibu in ekipi', zl({ slug: 'lj-1-liga', izrecno: true, ugib: 'SK', ligaEkip: 'sk-za-1trieda' }) === null)
  preveri('zacetna: prijavljen Slovenec brez lige, slovaski ugib → njegova liga', zl({ ligaEkip: 'lj-1-liga', ugib: 'SK' }) === 'lj-1-liga')
  preveri('zacetna: prijavljen Slovak brez lige → njegova liga', zl({ ligaEkip: 'sk-za-1trieda' }) === 'sk-za-1trieda')
  preveri('zacetna: nov obiskovalec s slovaskim ugibom', zl({ ugib: 'SK' }) === 'sk-ssfz-4liga')
  preveri('zacetna: nov obiskovalec brez ugiba ostane clani', zl({}) === 'clani')
  preveri('zacetna: nov Slovenec ostane clani', zl({ ugib: 'SI' }) === 'clani')
  preveri('zacetna: neznana liga v naslovu gre po ugibu', zl({ slug: 'sk-stara', izrecno: true, ugib: 'SK' }) === 'sk-ssfz-4liga')
  preveri('zacetna: slovaski ugib brez aktivne lige = clani', D.zacetnaLiga({ vse: brezSk, slug: 'clani', izrecno: false, ligaEkip: null, ugib: 'SK' }) === 'clani')

  // Izbirnik države: le države z ligami; preklop piše le v brskalnik.
  preveri('izbira: drzave z ligami, Slovenija prva', D.drzaveZLigami([...lige].reverse()).join() === 'SI,SK')
  preveri('izbira: ena drzava = brez izbirnika', D.drzaveZLigami(brezSk).join() === 'SI')
  preveri('izbira: zastavici', D.zastava('SI') === '🇸🇮' && D.zastava('SK') === '🇸🇰')
  const shramba = new Map()
  // Node ima svoj localStorage (z opozorilom ob branju) — zamenjamo opis
  // lastnosti in ga na koncu vrnemo, ne da bi ga prebrali.
  const staraShramba = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => shramba.get(k) ?? null,
      setItem: (k, v) => shramba.set(k, String(v)),
      removeItem: (k) => shramba.delete(k),
    },
  })
  shramba.set('slff-tekmovanje', 'lj-1-liga')
  let cilj = null
  D.preklopiDrzavo('SK', lige, { pojdi: (u) => (cilj = u) })
  preveri('izbira: na Slovasko — drzava, liga, jezik, naslov',
    shramba.get('slff-drzava') === 'SK' && shramba.get('slff-tekmovanje') === 'sk-ssfz-4liga' &&
      shramba.get('slff-jezik') === 'sk' && cilj === '/?t=sk-ssfz-4liga', `${[...shramba]} ${cilj}`)
  D.preklopiDrzavo('SI', lige, { pojdi: (u) => (cilj = u) })
  preveri('izbira: nazaj v Slovenijo — clani, slovenscina, /',
    shramba.get('slff-drzava') === 'SI' && shramba.get('slff-tekmovanje') === 'clani' &&
      shramba.get('slff-jezik') === 'sl' && cilj === '/', `${[...shramba]} ${cilj}`)
  D.preklopiDrzavo('SK', lige, { izberiLigo: false, pojdi: (u) => (cilj = u) })
  preveri('izbira: iz okna prvega obiska le drzava, liga ostane neizbrana',
    shramba.get('slff-drzava') === 'SK' && !shramba.has('slff-tekmovanje') && cilj === '/', `${[...shramba]} ${cilj}`)
  // Ugib s shranjeno državo ne sprašuje IP-ja.
  let vprasan = false
  const zIzbiro = await D.ugibajObiskovalca(async () => {
    vprasan = true
    return 'SI'
  })
  preveri('ugib: shranjena drzava ne sprasuje IP', zIzbiro.drzava === 'SK' && zIzbiro.ip === null && !vprasan)
  shramba.clear()
  const drzaveL = D.drzaveZLigami(lige)
  const poSk = await D.ugibajObiskovalca(async () => 'SK')
  preveri('ugib: brez izbire velja IP (SK → Slovaska, ne tujec)', poSk.drzava === 'SK' && poSk.ip === 'SK' && !D.jeTujIp(poSk.ip, drzaveL))
  const poSi = await D.ugibajObiskovalca(async () => 'SI')
  preveri('ugib: SI IP → Slovenija, ne tujec', poSi.drzava === 'SI' && !D.jeTujIp(poSi.ip, drzaveL))
  const brezIp = await D.ugibajObiskovalca(async () => null)
  preveri('ugib: brez IP-ja jezik ali pas tega okolja, brez vprasanja',
    [null, 'SI', 'SK'].includes(brezIp.drzava) && brezIp.ip === null && !D.jeTujIp(brezIp.ip, drzaveL))

  // Tujec: IP iz države brez lig (CZ) → vprašanje po državi in angleščina.
  const poCz = await D.ugibajObiskovalca(async () => 'CZ')
  preveri('tujec: CZ IP je tujec', poCz.ip === 'CZ' && D.jeTujIp(poCz.ip, drzaveL))
  preveri('tujec: SK IP ni tujec, ce ima Slovaska lige', !D.jeTujIp('SK', drzaveL))
  preveri('tujec: SK IP je tujec, ce Slovaska nima lig', D.jeTujIp('SK', D.drzaveZLigami(brezSk)))
  preveri('tujec: brez lig ni vprasanja', !D.jeTujIp('CZ', []))
  preveri('tujec: jezik angleski', D.jezikTujca(['pl-PL', 'sk']) === 'en' && D.jezikTujca(['it-IT']) === 'en' && D.jezikTujca(null) === 'en')
  preveri('tujec: prvi jezik sl/sk ostane', D.jezikTujca(['sl-SI', 'en']) === 'sl' && D.jezikTujca(['sk']) === 'sk')
  preveri('tujec: prvi jezik cs ostane (Češka še brez lig)', D.jezikTujca(['cs-CZ', 'en']) === 'cs' && D.jezikTujca(['en', 'cs']) === 'en')
  preveri('tujec: sl ni prvi jezik = angleski', D.jezikTujca(['en-GB', 'sl']) === 'en')
  // Jezik vmesnika: izbira > tujec > država lige.
  const zj = (o) => D.zeljenJezik({ drzava: 'SI', ...o })
  preveri('jezik: Slovenec slovensko, Slovak slovasko (brez spremembe)', zj({}) === 'sl' && zj({ drzava: 'SK' }) === 'sk' && zj({ drzava: null }) === 'sl')
  preveri('jezik: tujec anglesko v obeh drzavah', zj({ tujec: 'PL', jeziki: ['pl'] }) === 'en' && zj({ drzava: 'SK', tujec: 'PL', jeziki: ['pl'] }) === 'en')
  preveri('jezik: shranjena izbira povozi drzavo', zj({ drzava: 'SK', izbran: 'en' }) === 'en' && zj({ izbran: 'sk' }) === 'sk')
  preveri('jezik: shranjena izbira povozi tujca', zj({ tujec: 'CZ', izbran: 'sl' }) === 'sl')
  // Češka: jezik cs, ugib po brskalniku in pasu, liga cz-… je češka.
  preveri('jezik: Čeh češko', zj({ drzava: 'CZ' }) === 'cs' && zj({ tujec: 'CZ', jeziki: ['cs-CZ'] }) === 'cs')
  preveri('drzava: češki brskalnik', D.ugibajDrzavo({ jeziki: ['cs-CZ'], casovniPas: 'Europe/Prague' }) === 'CZ')
  preveri('drzava: anglesko v Pragi (pas)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Prague' }) === 'CZ')
  preveri('drzava: liga cz-… je češka', D.drzavaLige('cz-praha-prebor') === 'CZ')
  // Madžarska: jezik hu, ugib po brskalniku in pasu, liga hu-… je madžarska.
  preveri('jezik: Madžar madžarsko', zj({ drzava: 'HU' }) === 'hu' && zj({ tujec: 'HU', jeziki: ['hu-HU'] }) === 'hu')
  preveri('tujec: prvi jezik hu ostane', D.jezikTujca(['hu-HU', 'en']) === 'hu' && D.jezikTujca(['en', 'hu']) === 'en')
  preveri('drzava: madžarski brskalnik', D.ugibajDrzavo({ jeziki: ['hu-HU'], casovniPas: 'Europe/Budapest' }) === 'HU')
  preveri('drzava: anglesko v Budimpešti (pas)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Budapest' }) === 'HU')
  preveri('drzava: liga hu-… je madžarska', D.drzavaLige('hu-pest-megye1') === 'HU' && D.JEZIK_DRZAVE.HU === 'hu')
  // Avstrija: jezik de, ugib po brskalniku in pasu, liga at-… je avstrijska.
  preveri('jezik: Avstrijec nemško', zj({ drzava: 'AT' }) === 'de' && zj({ tujec: 'AT', jeziki: ['de-AT'] }) === 'de')
  preveri('tujec: prvi jezik de ostane', D.jezikTujca(['de-AT', 'en']) === 'de' && D.jezikTujca(['en', 'de']) === 'en')
  preveri('drzava: avstrijski brskalnik', D.ugibajDrzavo({ jeziki: ['de-AT'], casovniPas: 'Europe/Vienna' }) === 'AT')
  preveri('drzava: anglesko na Dunaju (pas)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Vienna' }) === 'AT')
  preveri('drzava: nemški brskalnik sam ni Avstrija', D.ugibajDrzavo({ jeziki: ['de-DE'], casovniPas: 'Europe/Berlin' }) === null && D.ugibajDrzavo({ jeziki: ['de'], casovniPas: 'Europe/Vienna' }) === 'AT')
  preveri('drzava: liga at-… je avstrijska', D.drzavaLige('at-stmk-landesliga') === 'AT' && D.JEZIK_DRZAVE.AT === 'de')
  // Srbija: jezik sr, ugib po brskalniku (sr, sr-Latn-RS) in pasu, liga rs-… je srbska.
  preveri('jezik: Srb srbsko', zj({ drzava: 'RS' }) === 'sr' && zj({ tujec: 'RS', jeziki: ['sr-RS'] }) === 'sr')
  preveri('tujec: prvi jezik sr ostane', D.jezikTujca(['sr-Latn-RS', 'en']) === 'sr' && D.jezikTujca(['en', 'sr']) === 'en')
  preveri('drzava: srbski brskalnik', D.ugibajDrzavo({ jeziki: ['sr-Latn-RS'], casovniPas: 'Europe/Belgrade' }) === 'RS')
  preveri('drzava: anglesko v Beogradu (pas)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Belgrade' }) === 'RS')
  preveri('drzava: liga rs-… je srbska', D.drzavaLige('rs-beograd-zona') === 'RS' && D.JEZIK_DRZAVE.RS === 'sr')
  // Romunija: jezik ro, ugib po brskalniku (ro, ro-RO) in pasu, liga ro-… je romunska.
  preveri('jezik: Romun romunsko', zj({ drzava: 'RO' }) === 'ro' && zj({ tujec: 'RO', jeziki: ['ro-RO'] }) === 'ro')
  preveri('tujec: prvi jezik ro ostane', D.jezikTujca(['ro-RO', 'en']) === 'ro' && D.jezikTujca(['en', 'ro']) === 'en')
  preveri('drzava: romunski brskalnik', D.ugibajDrzavo({ jeziki: ['ro-RO'], casovniPas: 'Europe/Bucharest' }) === 'RO')
  preveri('drzava: anglesko v Bukarešti (pas)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Bucharest' }) === 'RO')
  preveri('drzava: liga ro-… je romunska', D.drzavaLige('ro-if-liga4') === 'RO' && D.JEZIK_DRZAVE.RO === 'ro')
  // Estonija: jezik et, ugib po brskalniku (et, et-EE) in pasu, liga ee-… je estonska.
  preveri('jezik: Estonec estonsko', zj({ drzava: 'EE' }) === 'et' && zj({ tujec: 'EE', jeziki: ['et-EE'] }) === 'et')
  preveri('tujec: prvi jezik et ostane', D.jezikTujca(['et-EE', 'en']) === 'et' && D.jezikTujca(['en', 'et']) === 'en')
  preveri('drzava: estonski brskalnik', D.ugibajDrzavo({ jeziki: ['et-EE'], casovniPas: 'Europe/Tallinn' }) === 'EE')
  preveri('drzava: anglesko v Talinu (pas)', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Tallinn' }) === 'EE')
  preveri('drzava: liga ee-… je estonska', D.drzavaLige('ee-esiliiga') === 'EE' && D.JEZIK_DRZAVE.EE === 'et' && drzavaVstopa('/ee') === 'EE')
  shramba.set('slff-tujec', 'CZ')
  // Jezik tujca je odvisen od jezika okolja (Node ima navigator.languages).
  const jezikTujcaTu = D.jezikTujca(globalThis.navigator?.languages)
  preveri('tujec: oznaka v brskalniku', D.tujec() === 'CZ' && D.jezikObiskovalca('SK') === jezikTujcaTu)
  D.preklopiDrzavo('SK', lige, { pojdi: (u) => (cilj = u) })
  preveri('tujec: izbira Slovaske ohrani jezik tujca', shramba.get('slff-jezik') === jezikTujcaTu && cilj === '/?t=sk-ssfz-4liga', `${[...shramba]}`)
  preveri('tujec: shranjena oznaka velja tudi z izbrano ligo', D.tujec() === 'CZ' && D.jezikObiskovalca('SI') === jezikTujcaTu)
  // Odločitev o tujcu pade le na goli naslovnici: s ligo se oznaka ne zapiše.
  shramba.delete('slff-tujec')
  D.zapomniTujca('CZ')
  preveri('tujec: brez gole naslovnice se oznaka ne zapise', D.tujec() === null && D.jezikObiskovalca('SI') === 'sl')
  shramba.delete('slff-tekmovanje')
  D.zapomniTujca('CZ')
  preveri('tujec: na goli naslovnici se oznaka zapise', D.tujec() === 'CZ')
  preveri('tujec: roboti niso tujci',
    D.jeRobot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') &&
      D.jeRobot('facebookexternalhit/1.1') && D.jeRobot('Mozilla/5.0 (compatible; bingbot/2.0)') &&
      !D.jeRobot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36') && !D.jeRobot(null))
  shramba.clear()
  shramba.set('slff-jezik-izbran', 'en')
  D.preklopiDrzavo('SI', lige, { pojdi: (u) => (cilj = u) })
  preveri('jezik: izbrana anglescina ostane ob preklopu drzave', shramba.get('slff-jezik') === 'en' && D.izbranJezik() === 'en')
  shramba.clear()
  if (staraShramba) Object.defineProperty(globalThis, 'localStorage', staraShramba)
  else delete globalThis.localStorage
}

// --- prevodi: vsak prevod ima iste {parametre} in <oznake> kot izvirnik ------
// Brez tega bi popravek slovenskega niza (nov parameter) v slovaščini tiho
// pustil "{n}" na zaslonu ali izgubil povezavo.
{
  const { sl } = await import('../src/i18n/sl/index.ts')
  const { sk } = await import('../src/i18n/sk/index.ts')
  const { en } = await import('../src/i18n/en/index.ts')
  const { hr } = await import('../src/i18n/hr/index.ts')
  const { cs } = await import('../src/i18n/cs/index.ts')
  const { hu } = await import('../src/i18n/hu/index.ts')
  const { de } = await import('../src/i18n/de/index.ts')
  const { sr } = await import('../src/i18n/sr/index.ts')
  const { ro } = await import('../src/i18n/ro/index.ts')
  const { et } = await import('../src/i18n/et/index.ts')
  const listi = (d, pot = '') =>
    Object.entries(d).flatMap(([k, v]) =>
      typeof v === 'string' || (v && typeof v === 'object' && 'other' in v) ? [[pot + k, v]] : listi(v, `${pot}${k}.`),
    )
  const najdi = (d, kljuc) => kljuc.split('.').reduce((v, del) => (v && typeof v === 'object' ? v[del] : undefined), d)
  const znaki = (v) => {
    const besedila = typeof v === 'string' ? [v] : Object.values(v)
    return besedila.map((b) => [...b.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[0]).sort().join(' '))
  }
  for (const [ime, slovar] of [['sk', sk], ['en', en], ['hr', hr], ['cs', cs], ['hu', hu], ['de', de], ['sr', sr], ['ro', ro], ['et', et]]) {
    const napake = []
    let manjka = 0
    for (const [kljuc, izvirnik] of listi(sl)) {
      const prevod = najdi(slovar, kljuc)
      if (prevod === undefined) { manjka++; continue }
      const iz = new Set(znaki(izvirnik)), pr = new Set(znaki(prevod))
      // Množinske oblike smejo {n} izpustiti le, kjer ga izvirnik izpusti v vseh.
      const vsi = [...pr].every((z) => iz.has(z)) && [...iz].every((z) => pr.has(z) || typeof izvirnik !== 'string')
      if (!vsi) napake.push(kljuc)
    }
    preveri(`prevodi ${ime}: vsi nizi prevedeni`, manjka === 0, `manjka ${manjka}`)
    preveri(`prevodi ${ime}: parametri in oznake kot v izvirniku`, napake.length === 0, napake.slice(0, 5).join(', '))
  }
  // Angleške množine: le one/other (Intl.PluralRules('en')), vsaka z obema.
  const slabeMnozine = listi(en).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => k !== 'one' && k !== 'other') || !('one' in v)),
  )
  preveri('prevodi en: mnozine le one/other', slabeMnozine.length === 0, slabeMnozine.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi en: cena v evrih', en.skupno.cena === '€{v}M')
  // Češke množine: vse štiri oblike Intl.PluralRules('cs') (one/few/many/other),
  // "many" za necela števila ("2,5 bodu").
  const kategorijeCs = new Intl.PluralRules('cs').resolvedOptions().pluralCategories
  const slabeCs = listi(cs).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => !kategorijeCs.includes(k)) || kategorijeCs.some((k) => !(k in v))),
  )
  preveri('prevodi cs: mnozine one/few/many/other', slabeCs.length === 0, slabeCs.slice(0, 5).map(([k]) => k).join(', '))
  // Češki nizi so brez pomišljajev (—, –); naslov strani "SLFF - Sunday League" je izjema le po obliki.
  const crticeCs = listi(cs).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[—–]/.test(b)))
  preveri('prevodi cs: brez pomisljajev', crticeCs.length === 0, crticeCs.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi cs: drzava Česko v vseh jezikih',
    [sl, sk, en, hr, cs].every((d) => d.aplikacija.izbiraDrzave.imena.CZ === 'Česko'))
  preveri('prevodi cs: tocke v mnozini', cs.skupno.besede.tocke.few === 'body' && cs.skupno.besede.tocke.other === 'bodů')
  // Madžarske množine: Intl.PluralRules('hu') pozna le one/other.
  const kategorijeHu = new Intl.PluralRules('hu').resolvedOptions().pluralCategories
  const slabeHu = listi(hu).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => !kategorijeHu.includes(k)) || kategorijeHu.some((k) => !(k in v))),
  )
  preveri('prevodi hu: mnozine one/other', slabeHu.length === 0, slabeHu.slice(0, 5).map(([k]) => k).join(', '))
  const crticeHu = listi(hu).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[—–]/.test(b)))
  preveri('prevodi hu: brez pomisljajev', crticeHu.length === 0, crticeHu.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi hu: drzava Magyarország v vseh jezikih',
    [sl, sk, en, hr, cs, hu].every((d) => d.aplikacija.izbiraDrzave.imena.HU === 'Magyarország'))
  preveri('prevodi hu: tocke za stevilom v ednini', hu.skupno.besede.tocke.one === 'pont' && hu.skupno.besede.tocke.other === 'pont')
  preveri('prevodi hu: liga na plakatu v imenovalniku', /: \{liga\}/.test(hu.lestvice.plakat.jeOdprta), hu.lestvice.plakat.jeOdprta)
  // Nemške množine: Intl.PluralRules('de') pozna le one/other.
  const kategorijeDe = new Intl.PluralRules('de').resolvedOptions().pluralCategories
  const slabeDe = listi(de).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => !kategorijeDe.includes(k)) || kategorijeDe.some((k) => !(k in v))),
  )
  preveri('prevodi de: mnozine one/other', slabeDe.length === 0, slabeDe.slice(0, 5).map(([k]) => k).join(', '))
  const crticeDe = listi(de).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[—–]/.test(b)))
  preveri('prevodi de: brez pomisljajev', crticeDe.length === 0, crticeDe.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi de: drzava Österreich v vseh jezikih',
    [sl, sk, en, hr, cs, hu, de].every((d) => d.aplikacija.izbiraDrzave.imena.AT === 'Österreich'))
  preveri('prevodi de: tocke', de.skupno.besede.tocke.one === 'Punkt' && de.skupno.besede.tocke.other === 'Punkte')
  preveri('prevodi de: liga na plakatu za dvopičjem', /: \{liga\}/.test(de.lestvice.plakat.jeOdprta), de.lestvice.plakat.jeOdprta)
  // Srbske množine: Intl.PluralRules('sr') pozna one/few/other kot hrvaščina.
  const kategorijeSr = new Intl.PluralRules('sr-Latn-RS').resolvedOptions().pluralCategories
  const slabeSr = listi(sr).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => !kategorijeSr.includes(k)) || kategorijeSr.some((k) => !(k in v))),
  )
  preveri('prevodi sr: mnozine one/few/other', slabeSr.length === 0, slabeSr.slice(0, 5).map(([k]) => k).join(', '))
  const crticeSr = listi(sr).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[—–]/.test(b)))
  preveri('prevodi sr: brez pomisljajev', crticeSr.length === 0, crticeSr.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi sr: drzava Srbija v vseh jezikih',
    [sl, sk, en, hr, cs, hu, de, sr].every((d) => d.aplikacija.izbiraDrzave.imena.RS === 'Srbija'))
  preveri('prevodi sr: tocke v mnozini', sr.skupno.besede.tocke.few === 'boda' && sr.skupno.besede.tocke.other === 'bodova')
  // Ekavica in srbski izrazi, ne hrvaški (mjesto, momčad, vratar, ljestvica, nogomet …).
  const hrvaskoSr = listi(sr).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v))
    .some((b) => /mjest|momčad|vratar|ljestvic|nogomet|tjed|sljede|uvijek|prije\b|vrijem|\btko\b|poveznic/i.test(b)))
  preveri('prevodi sr: ekavica, brez hrvaških izrazov', hrvaskoSr.length === 0, hrvaskoSr.slice(0, 5).map(([k]) => k).join(', '))
  // Romunske množine: Intl.PluralRules('ro') pozna one/few/other; "other"
  // (20 in več) dobi "de" ("20 de puncte").
  const kategorijeRo = new Intl.PluralRules('ro-RO').resolvedOptions().pluralCategories
  const slabeRo = listi(ro).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => !kategorijeRo.includes(k)) || kategorijeRo.some((k) => !(k in v))),
  )
  preveri('prevodi ro: mnozine one/few/other', slabeRo.length === 0, slabeRo.slice(0, 5).map(([k]) => k).join(', '))
  const crticeRo = listi(ro).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[—–]/.test(b)))
  preveri('prevodi ro: brez pomisljajev', crticeRo.length === 0, crticeRo.slice(0, 5).map(([k]) => k).join(', '))
  // Romunščina piše ș in ț z vejico spodaj, ne s cedilo (ş, ţ).
  const cedilaRo = listi(ro).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[şţŞŢ]/.test(b)))
  preveri('prevodi ro: ș in ț z vejico, ne s cedilo', cedilaRo.length === 0, cedilaRo.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi ro: drzava România v vseh jezikih',
    [sl, sk, en, hr, cs, hu, de, sr, ro].every((d) => d.aplikacija.izbiraDrzave.imena.RO === 'România'))
  preveri('prevodi ro: tocke v mnozini',
    ro.skupno.besede.tocke.one === 'punct' && ro.skupno.besede.tocke.few === 'puncte' && ro.skupno.besede.tocke.other === 'de puncte')
  preveri('prevodi ro: liga na plakatu za dvopičjem', /: \{liga\}/.test(ro.lestvice.plakat.jeOdprta), ro.lestvice.plakat.jeOdprta)
  // Estonske množine: Intl.PluralRules('et') pozna le one/other; za številom
  // je samostalnik v delilniku ednine ("3 punkti").
  const kategorijeEt = new Intl.PluralRules('et-EE').resolvedOptions().pluralCategories
  const slabeEt = listi(et).filter(
    ([, v]) => typeof v === 'object' && (Object.keys(v).some((k) => !kategorijeEt.includes(k)) || kategorijeEt.some((k) => !(k in v))),
  )
  preveri('prevodi et: mnozine one/other', slabeEt.length === 0, slabeEt.slice(0, 5).map(([k]) => k).join(', '))
  const crticeEt = listi(et).filter(([, v]) => (typeof v === 'string' ? [v] : Object.values(v)).some((b) => /[—–]/.test(b)))
  preveri('prevodi et: brez pomisljajev', crticeEt.length === 0, crticeEt.slice(0, 5).map(([k]) => k).join(', '))
  preveri('prevodi et: drzava Eesti v vseh jezikih',
    [sl, sk, en, hr, cs, hu, de, sr, ro, et].every((d) => d.aplikacija.izbiraDrzave.imena.EE === 'Eesti'))
  preveri('prevodi et: tocke', et.skupno.besede.tocke.one === 'punkt' && et.skupno.besede.tocke.other === 'punkti')
  preveri('prevodi et: liga na plakatu za dvopičjem', /: \{liga\}/.test(et.lestvice.plakat.jeOdprta), et.lestvice.plakat.jeOdprta)
}

// --- vir sportnet (Slovaška) -----------------------------------------------
{
  const S = await import('./viri/sportnet.mjs')
  preveri('sportnet: sezona', S.sezonaIz('2026/2027') === '2026/27')
  preveri('sportnet: ime v "Priimek Ime"', S.vPriimekIme('Matúš Ráček') === 'Ráček Matúš')
  // Isti klub pod polno in skrajšano pravno obliko (Nižná, Čadca 2026); B-ekipa ostane svoja.
  preveri('sportnet: "Futbalový klub X" je "FK X"', S.kljucKlubaSk('Futbalový klub Nižná') === S.kljucKlubaSk('FK Nižná'))
  preveri('sportnet: "Telovýchovná jednota X" je "TJ X"', S.kljucKlubaSk('Telovýchovná jednota Lovča') === S.kljucKlubaSk('TJ Lovča'))
  preveri('sportnet: B-ekipa ni isti klub', S.kljucKlubaSk('TJ Sokol Medzibrod B') !== S.kljucKlubaSk('TJ Sokol Medzibrod'))
  preveri('sportnet: slovaski cas', S.lokalniCas('2026-09-19T13:00:00.000Z').datum === '2026-09-19' && S.lokalniCas('2026-09-19T13:00:00.000Z').ura === '15:00')
  const tekma = JSON.parse(readFileSync(new URL('./vzorci/sportnet-tekma.json', import.meta.url), 'utf8'))
  const z = S.vZapisnik(tekma)
  const n = S.nastopi(z)
  preveri('sportnet: zapisnik', z && z.krog === 7 && z.rezultat.domaci === 1 && z.rezultat.gostje === 0 && !z.opozorila.length)
  preveri('sportnet: vsak nastop ima ISSF in pozicijo', n.length > 22 && n.every((x) => x.regSt && x.pozicija))
  preveri('sportnet: strelec', n.some((x) => x.ime === 'Šemik Tomáš' && x.goli === 1))
  {
    // Status tekme: odstop moštva in kontumacija sta tekmi brez igre.
    const tekma = (id, krog, dom, gos, status, extra = {}) => ({
      _id: id, round: { name: String(krog) }, startDate: '2026-08-08T13:00:00.000Z', closed: true,
      __issfMatchStatus: status,
      teams: [{ name: dom, additionalProperties: { homeaway: 'home' } }, { name: gos, additionalProperties: { homeaway: 'away' } }],
      ...extra,
    })
    const stran = JSON.stringify({ matches: [
      tekma('a', 1, 'A', 'B', 'ODOHRATY'),
      tekma('b', 1, 'C', 'D', 'ODSTUPENE_DRUZSTVO'),
      tekma('c', 2, 'A', 'C', 'KONTUMOVANY'),
      tekma('d', 2, 'B', 'D', 'ODOHRATY', { contumation: { isContumated: true } }),
    ], nextOffset: null })
    const k = await S.default.razporedVseStrani('X/1', async () => stran)
    const t = Object.fromEntries(k.flatMap((r) => r.tekme).map((x) => [`${x.domaci}${x.gostje}`, x]))
    preveri('sportnet: odigrana ni kontumacija', !t.AB.kontumacija && !t.AB.odstop)
    preveri('sportnet: odstop moštva = kontumacija z odstopom', t.CD.kontumacija && t.CD.odstop)
    preveri('sportnet: KONTUMOVANY in contumation sta kontumaciji', t.AC.kontumacija && !t.AC.odstop && t.BD.kontumacija)
    preveri('sportnet: zaključene tekme so odigrane', [t.AB, t.CD, t.AC, t.BD].every((x) => x.odigrana === true))
    // Prosiek : Východná (sk-lm-8liga, 4. 10. 2026): nezaključena, le razpisana.
    const neodigrane = JSON.stringify({ matches: [
      tekma('e', 3, 'A', 'D', 'VYGENEROVANY', { closed: false }),
      tekma('f', 3, 'B', 'C', 'PRERUSENY', { closed: false }),
    ], nextOffset: null })
    const k2 = await S.default.razporedVseStrani('X/1', async () => neodigrane)
    const t2 = Object.fromEntries(k2.flatMap((r) => r.tekme).map((x) => [`${x.domaci}${x.gostje}`, x]))
    preveri('sportnet: razpisana nezaključena tekma ni odigrana', t2.AD.odigrana === false)
    preveri('sportnet: drugo stanje nezaključene šteje kot odigrano', t2.BC.odigrana === true)
  }
}

// --- vir hns (Hrvaška, Semafor) ---------------------------------------------
{
  const H = await import('./viri/hns.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('hns: minuta s podaljškom', H.minuta("45+2'") === 45 && H.minuta("90+3'") === 90 && H.minuta("67'") === 67)
  preveri('hns: datum in ura', H.datumUra('03.10.2026. 15:00').datum === '2026-10-03' && H.datumUra('03.10.2026. 15:00').ura === '15:00')
  preveri('hns: sezona iz datuma', H.sezonaIzDatuma('2026-10-03') === '2026/27' && H.sezonaIzDatuma('2027-05-01') === '2026/27')
  // ć in đ ostaneta v ključu (slovenski `poenostavi` ju zavrže).
  preveri('hns: ključ kluba s ć/đ', H.kljucKlubaHr('NK Međimurje') !== H.kljucKlubaHr('NK Meimurje'))
  preveri('hns: kratko ime', H.kratkoImeHr('NK Zelengaj 1948') === 'Zelengaj' && H.kratkoImeHr('NK Polet (SK)') === 'Polet SK')

  const v = H.vrsticeRazporeda(beri('hns-natjecanje.html'))
  preveri('hns: razpored', v.length === 16 && v.filter((x) => x.izid).length === 8)
  preveri('hns: neodigrana tekma brez izida', v.some((x) => x.krog === 15 && !x.izid && x.datum === '2026-11-28' && x.ura === '13:30'))
  {
    // Razpored pove, katera tekma ima izid; 3:0 bere še stran tekme (kontumacija).
    const stran = beri('hns-natjecanje.html')
    const k = await H.default.razporedVseStrani('1', async (url) => (url.includes('/natjecanja/') ? stran : beri('hns-tekma-11m.html')))
    const tekme = k.flatMap((r) => r.tekme)
    preveri('hns: razpored — odigrana natanko pri tekmah z izidom',
      tekme.length === 16 && tekme.filter((t) => t.odigrana === true).length === 8 && tekme.filter((t) => t.odigrana === false).length === 8,
      tekme.map((t) => t.odigrana).join(','))
  }

  const z = H.vZapisnik(beri('hns-tekma-11m.html'), { id: 'a' })
  const n = H.nastopi(z)
  preveri('hns: zapisnik', z && z.krog === 1 && z.rezultat.domaci === 5 && z.rezultat.gostje === 1 && !z.opozorila.length)
  preveri('hns: gol z 11 m', z.goli.filter((g) => g.enajstmetrovka).length === 2)
  preveri('hns: vsak nastop ima šifro osebe', n.length >= 22 && n.every((x) => x.regSt))
  preveri('hns: en vratar na ekipo v postavi', [0, 1].every((e) => n.filter((x) => x.ekipaIdx === e && x.zacetnik && x.vratar).length === 1))
  // Brez trenerja: tudi on je vrstica `match_lineup`, a s povezavo /treneri/.
  preveri('hns: minute ekipe ~ 11 × 90', [0, 1].every((e) => {
    const m = n.filter((x) => x.ekipaIdx === e).reduce((s, x) => s + x.minute, 0)
    return m >= 900 && m <= 990
  }))
  const r = H.vZapisnik(beri('hns-tekma-rdeci.html'), { id: 'b' })
  preveri('hns: rdeči karton', H.nastopi(r).some((x) => x.ime === 'Banović Davor' && x.rdeci === 1))

  // Kontumacija (Mladost Molve : Prugovac, 3:0): postava le domačih, zapisnika ni.
  const k = beri('hns-tekma-kontumacija.html')
  preveri('hns: kontumacija prepoznana', H.jeKontumacija(k, { domaci: 3, gostje: 0 }) && !H.vZapisnik(k))
  preveri('hns: odigrana tekma ni kontumacija', !H.jeKontumacija(beri('hns-tekma-11m.html'), { domaci: 3, gostje: 0 }))
  // Kontumacija brez obeh postav (Sunjski : Posavina, 3:0, hr-sm-2-znl 27. 9. 2026).
  const bp = beri('hns-tekma-kontumacija-brez-postav.html')
  preveri('hns: kontumacija brez postav', H.brezPostav(bp, { domaci: 3, gostje: 0 }) && !H.jeKontumacija(bp, { domaci: 3, gostje: 0 }) && !H.vZapisnik(bp))
  preveri('hns: tekma s postavami ni brez postav', !H.brezPostav(beri('hns-tekma-11m.html'), { domaci: 3, gostje: 0 }) && !H.brezPostav(k, { domaci: 3, gostje: 0 }))
  preveri('hns: brez postav le pri 3:0', !H.brezPostav(bp, { domaci: 2, gostje: 0 }))
  // Ekipa s šestimi igralci (Suhopolje : Crnac, 3:0, Premijer ŽNL Virovitica
  // 9. 5. 2026): obe postavi, nobenega dogodka — tekma ni bila odigrana.
  const pm = beri('hns-tekma-kontumacija-premalo.html')
  preveri('hns: kontumacija s premalo igralci', H.jeKontumacija(pm, { domaci: 3, gostje: 0 }) && H.vZapisnik(pm) === null)
  preveri('hns: premalo igralcev le pri 3:0', !H.jeKontumacija(pm, { domaci: 2, gostje: 0 }))

  // ŽNS Zagreb menjav ne vpisuje: strelca s klopi (Hrvatski Leskovac : Croatia 98, 8:0)
  // dobita nastop IN gol; prej je bil gol v tabeli goals, točk zanj pa ni bilo.
  const s8 = H.vZapisnik(beri('hns-tekma-strelec-s-klopi.html'), { id: 's' })
  const n8 = H.nastopi(s8)
  const opoz = dodajStrelceSKlopi(s8, n8)
  const goliNastopi = n8.filter((x) => x.ekipaIdx === 0).reduce((v, x) => v + x.goli, 0)
  preveri('hns: strelci s klopi dobijo gol', s8.menjave.length === 0 && opoz.length >= 1 && goliNastopi === 8)

  // Grbi (scripts/grbi-hns.mjs): domači je `club1`, gostje `club2` v glavi;
  // fotografije igralcev pod istim images_comet se ne štejejo.
  const C = 'https://hns.family/files/images_comet'
  const gk = H.grbiTekme(k)
  preveri('hns grbi: domači in gostje po mestu v glavi',
    gk.domaci?.src === `${C}/Club/_resized/919_-1510902320_80_80_wg.jpg` && gk.domaci.ime === 'NK Mladost Molve' &&
    gk.gostje?.src === `${C}/45/0/_resized/450b28f38d266dfd86d9853b860ab699ccb5d44b_80_80_wg.png` && gk.gostje.ime === 'NK Prugovac')
  const g11 = H.grbiTekme(beri('hns-tekma-11m.html'))
  preveri('hns grbi: druga tekma (Tomislav : Borac)',
    g11.domaci?.src.includes('86809c461377478e9d0e9cbe577bf2f2364c0d33') && g11.domaci.ime === 'NK Tomislav (DA)' &&
    g11.gostje?.src.includes('eb5726f9d3dc1bac8a63a68da49babc8e65bf192') && g11.gostje.ime === 'NK Borac (KV)')
  const vzorci = ['hns-tekma-11m.html', 'hns-tekma-rdeci.html', 'hns-tekma-kontumacija.html', 'hns-tekma-strelec-s-klopi.html']
    .map((f) => H.grbiTekme(beri(f)))
  preveri('hns grbi: vsak vzorec ima dva različna grba, nobeden ni nadomestni', vzorci.every((g) =>
    g.domaci && g.gostje && g.domaci.src !== g.gostje.src && !H.jeNadomestniGrb(g.domaci.src) && !H.jeNadomestniGrb(g.gostje.src)))
  // Mesto odloča, ne alt: zamenjan alt ne zamenja strani.
  const zamenjan = k.replace('alt="NK Mladost Molve"', 'alt="NK Prugovac"')
  preveri('hns grbi: alt ne odloča o strani', H.grbiTekme(zamenjan).domaci?.src.includes('/Club/_resized/919_'))
  // Klub brez grba: Semafor da `logo nologo` brez slike (NK Miholjac, 10/2026).
  const brezGrba = k.replace(/<li class="club2"><div class="logo"><img [^>]*><\/div>/, '<li class="club2"><div class="logo nologo"></div>')
  const gb = H.grbiTekme(brezGrba)
  preveri('hns grbi: "nologo" ni grb, domači ostane', brezGrba !== k && gb.gostje === null && gb.domaci?.src.includes('/Club/_resized/919_'))
  preveri('hns grbi: stran brez glave nima grbov',!H.grbiTekme('<html><img src="x"></html>').domaci)
  preveri('hns grbi: izvirnik namesto 80 px',
    H.izvirnikGrba(`${C}/Club/_resized/919_-1510902320_80_80_wg.jpg`) === `${C}/Club/919_-1510902320.jpg` &&
    H.izvirnikGrba(`${C}/45/0/_resized/450b28f38d266dfd86d9853b860ab699ccb5d44b_80_80_wg.png`) === `${C}/45/0/450b28f38d266dfd86d9853b860ab699ccb5d44b.png` &&
    H.izvirnikGrba('https://semafor.hns.family/static/images/logo01.png') === null)
  preveri('hns grbi: nadomestne slike',
    H.jeNadomestniGrb('') && H.jeNadomestniGrb('/static/images/logo01.png') &&
    H.jeNadomestniGrb('https://semafor.hns.family/static/images/footer/hns.png') &&
    H.jeNadomestniGrb(`${C}/default_club_80_80_wg.png`) &&
    !H.jeNadomestniGrb(`${C}/Club/_resized/614_f89f00a7-787b-41af-bf50-b7637da55a3d_80_80_wg.png`))
  const deljeni = H.deljeniGrbi([
    { klub: 1, kljuc: 'a' }, { klub: 2, kljuc: 'a' }, { klub: 3, kljuc: 'b' }, { klub: 3, kljuc: 'b' },
  ])
  preveri('hns grbi: ista slika pri dveh klubih je nadomestna, pri istem klubu ne', deljeni.has('a') && !deljeni.has('b'))
}

// --- vir facr (Češka, IS FAČR) ----------------------------------------------
{
  const F = await import('./viri/facr.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('facr: datum in ura', F.datumUra('22.08.2026 10:00').datum === '2026-08-22' && F.datumUra('2.8.2026 9:30').ura === '09:30')
  preveri('facr: ročník je leto začetka sezone', F.sezonaIzRocnika('2026') === '2026/27' && F.sezonaIzRocnika('2024') === '2024/25')
  preveri('facr: šifra lige je UUID', (() => { try { F.razbijKodo('2026211A1A'); return false } catch { return true } })() &&
    F.razbijKodo('CBF505A1-6540-4545-BC28-39CDE178C18A').id === 'cbf505a1-6540-4545-bc28-39cde178c18a')
  preveri('facr: kratko ime', F.kratkoImeCz('TJ Sokol Ostředek') === 'Ostředek' && F.kratkoImeCz('SK POLABAN Nymburk') === 'Polaban Nymburk')
  // Leteče menjave: začetnik ven v 30., nazaj v 60. = 60 minut; rezerva noter 20., ven 50. = 30.
  preveri('facr: minute iz letečih menjav',
    F.minuteIzPreklopov(true, [30, 60]).minute === 60 && F.minuteIzPreklopov(false, [20, 50]).minute === 30 &&
    F.minuteIzPreklopov(true, []).minute === 90 && F.minuteIzPreklopov(false, [46]).minute === 44)

  // Okresní přebor Benešov (8. liga), Ostředek : Popovice 0:2, 3. kolo 2026/27.
  const z = F.vZapisnik(beri('cz-is-zapis-2026211A1A0303.html'), { id: 'a' })
  const n = F.nastopi(z)
  preveri('facr: zapisnik okresní přebor', z && z.sezona === '2026/27' && z.krog === 3 && z.datum === '2026-08-22' &&
    z.rezultat.domaci === 0 && z.rezultat.gostje === 2 && !z.opozorila.length)
  preveri('facr: postave po 11, klop posebej', z.domaci.postava.length === 11 && z.gostje.postava.length === 11 &&
    z.domaci.rezerve.length === 3 && z.gostje.rezerve.length === 6)
  preveri('facr: gol z 11 m', z.goli.length === 2 && z.goli.filter((g) => g.enajstmetrovka).length === 1 && z.goli.every((g) => g.ekipaIdx === 1))
  preveri('facr: vsak nastop ima šifro FAČR', n.length === 28 && n.every((x) => x.regSt))
  preveri('facr: šifra z vodilno ničlo', n.some((x) => x.ime === 'Procházka David' && x.regSt === 4090478))
  preveri('facr: en vratar na ekipo v postavi', [0, 1].every((e) => n.filter((x) => x.ekipaIdx === e && x.zacetnik && x.vratar).length === 1))
  preveri('facr: kapetan brez oznake v imenu', n.some((x) => x.ime === 'Horák Jakub') && !n.some((x) => /\(K\)|\(EU\)/.test(x.ime)))
  // Menjave se berejo: s klopi jih je 6, neuporabljene rezerve (Blažka, Šrejma, Kaucký Jan) ne nastopijo.
  preveri('facr: nastopi s klopi', n.filter((x) => !x.zacetnik).length === 6 && !n.some((x) => x.ime === 'Blažka Martin'))
  preveri('facr: minute ekipe ~ 11 × 90', [0, 1].every((e) => {
    const m = n.filter((x) => x.ekipaIdx === e).reduce((s, x) => s + x.minute, 0)
    return m >= 900 && m <= 990
  }))
  preveri('facr: menjava v 46.', n.some((x) => x.ime === 'Procházka David' && x.minute === 46) && n.some((x) => x.ime === 'Nepraš Zdeněk' && x.minute === 44))
  preveri('facr: rumeni karton', z.rumeni.length === 1 && z.rumeni[0].ime === 'Schärfer David' && z.rumeni[0].minuta === 24)

  // 1. A třída Královéhradecký kraj, Kostelec : Broumov 9:0, rdeči v 17.
  const r = F.vZapisnik(beri('cz-is-zapis-2024520A2A2602.html'), { id: 'b' })
  const nr = F.nastopi(r)
  preveri('facr: 9:0 z rdečim', r.sezona === '2024/25' && r.krog === 26 && r.goli.length === 9 && !r.opozorila.length)
  preveri('facr: rdeči skrajša nastop', nr.some((x) => x.ime === 'Pokorný Jiří' && x.rdeci === 1 && x.minute === 17))

  // Razpored (dorost, 2025): krogi po datumu, ne po številki; neodigrana brez izida.
  const v = F.vrsticeRazporeda(beri('cz-is-soutez-2025003C2D.html'))
  preveri('facr: razpored', v.length === 120 && v.every((t) => t.id && t.krog && t.domaci && t.gostje) && v.filter((t) => t.izid).length === 47)
  preveri('facr: neodigrana tekma brez izida', v.some((t) => t.krog === 2 && !t.izid && t.datum === '2025-11-16' && t.ura === '11:15'))
  preveri('facr: ime brez mesta na lestvici', !v.some((t) => /\(\d+\)/.test(t.domaci + t.gostje)))
  // CAPTCHA (security-valid.aspx) ustavi uvoz in se ne ponavlja (8. 10. 2026).
  {
    const pravi = globalThis.fetch
    let klicev = 0
    globalThis.fetch = async (u) => {
      klicev++
      return String(u).includes('zapas=')
        ? new Response('', { status: 302, headers: { location: 'https://is.fotbal.cz/public/security-valid.aspx?ret=x' } })
        : new Response('', { status: 200, headers: { 'set-cookie': 'ASP.NET_SessionId=x; path=/' } })
    }
    let ustavljen = false
    try { await F.facrFetch('https://is.fotbal.cz/public/zapasy/zapis-o-utkani-report.aspx?zapas=a') } catch (e) { ustavljen = e instanceof F.FacrPreverba }
    globalThis.fetch = pravi
    preveri('facr: CAPTCHA ustavi uvoz brez ponavljanja', ustavljen && klicev <= 2)
  }
}

// --- vir mlsz (Madžarska, MLSZ adatbank) ---------------------------------------
{
  const M = await import('./viri/mlsz.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('mlsz: vir je vpisan', viri.mlsz === M.default && M.default.drzava === 'HU' && M.default.imaRegistracije === false)
  preveri('mlsz: datum in ura (krog in zapisnik)',
    M.datumUra('2026. 10. 03. <span> 15:00</span>').datum === '2026-10-03' && M.datumUra('2026. 10. 03. <span> 15:00</span>').ura === '15:00' &&
    M.datumUra('2025.10.04 - 15:00').datum === '2025-10-04' && M.datumUra('2025.10.04 - 15:00').ura === '15:00')
  preveri('mlsz: minuta s podaljškom', M.minuta('75&apos;') === 75 && M.minuta("93'") === 90)
  preveri('mlsz: sezona iz šifre in datuma', M.sezonaIzKode('67/20/33915') === '2026/27' && M.sezonaIzKode('65/20/31672') === '2025/26' &&
    M.sezonaIzKode('63/5/1') === '2024/25' && M.sezonaIzDatuma('2027-05-01') === '2026/27')
  preveri('mlsz: šifra lige', M.razbijKodo('67/20/33915').verseny === 33915 && M.razbijKodo(' 65/5/31000 ').sz === 5 &&
    (() => { try { M.razbijKodo('33915'); return false } catch { return true } })())
  preveri('mlsz: naslovi', M.default.naslovRazporeda('67/20/33915') === 'https://adatbank.mlsz.hu/league/67/20/33915/1.html' &&
    M.naslovTekme('65/20/31672', 7, '2090962') === 'https://adatbank.mlsz.hu/match/65/20/31672/7/2090962.html')
  preveri('mlsz: ime igralca', M.lepoIme('GERENCSÉR  DÁNIEL') === 'Gerencsér Dániel' && M.lepoIme('SZABÓ-NAGY ŐRS') === 'Szabó-Nagy Őrs')
  preveri('mlsz: kratko ime', M.kratkoImeHu('CSESZTREGI KSE') === 'Csesztregi' && M.kratkoImeHu(' OWI ZALA Bt. LETENYE SE') === 'Letenye' &&
    M.kratkoImeHu('ZNET TELEKOM BECSEHELY SE') === 'Becsehely' && M.kratkoImeHu('ZTE FC II.') === 'ZTE II.' &&
    M.kratkoImeHu('Tarr Andráshida SC') === 'Tarr Andráshida' && M.kratkoImeHu('MAGNETIC ANDRÁSHIDA TE') === 'Magnetic Andráshida' &&
    M.kratkoImeHu('swisspor LENTI TE ') === 'Swisspor Lenti' && M.kratkoImeHu('ZVFC') === 'ZVFC' && M.kratkoImeHu('Semjénháza Se') === 'Semjénháza')
  preveri('mlsz: ključ kluba (velikost črk, naglasi, vzdevek)',
    M.kljucKlubaHu('KISKANIZSAI SÁSKÁK') === M.kljucKlubaHu('Kiskanizsai Sáskák') && M.kljucKlubaHu('Hévíz SK') !== M.kljucKlubaHu('Heviz SK') &&
    M.kljucKlubaHu('ZVFC') === M.kljucKlubaHu('Zalaszentgróti VFC'))

  // Stran kroga: Zala I 2025/26, 7. krog — pod razporedom kroga je še razpored
  // ene ekipe čez vso sezono (tudi 2090965 iz 7. kroga, ki se ne sme podvojiti).
  const k7 = beri('hu-adatbank-krog-65-20-31672-7.html')
  const v = M.vrsticeKroga(k7, 7)
  preveri('mlsz: stran kroga — le ta krog', v.length === 7 && v.every((t) => t.krog === 7 && t.id && t.izid) &&
    new Set(v.map((t) => t.id)).size === 7 && v.some((t) => t.id === '2090962' && t.izid.domaci === 3 && t.izid.gostje === 4))
  preveri('mlsz: stran kroga — datum, ura, prestavljena tekma', v.some((t) => t.id === '2090962' && t.datum === '2025-10-04' && t.ura === '15:00') &&
    v.some((t) => t.id === '2090965' && t.datum === '2025-10-24'))
  preveri('mlsz: krogi in sezona iz izbirnikov', M.krogiStrani(k7).length === 26 && M.krogiStrani(k7).at(-1) === 26 && M.sezonaStrani(k7) === '2025/26')
  const k3 = M.vrsticeKroga(beri('hu-adatbank-krog-67-20-33918-7.html'), 7)
  preveri('mlsz: prost krog (szabadnap) ni tekma', k3.length === 5 && !k3.some((t) => /szabadnap/i.test(t.domaci + t.gostje)))
  const k8 = M.vrsticeKroga(beri('hu-adatbank-krog-67-20-33915-8.html'), 8)
  preveri('mlsz: neodigrane tekme brez izida', k8.length === 6 && k8.every((t) => !t.izid && t.id) &&
    k8.some((t) => t.datum === '2026-10-11' && t.ura === '15:00' && t.domaci === 'Semjénháza Se'))

  // Zapisnik: Csesztreg : Zalakomár 3:4 (1:1) — 11 m, avtogol, rdeči rezervi, karton trenerja.
  const z = M.vZapisnik(beri('hu-adatbank-tekma-65-20-31672-2090962.html'), { id: '2090962' })
  const n = M.nastopi(z)
  const kdo = (ime) => n.find((x) => x.ime === ime)
  preveri('mlsz: zapisnik', z && z.sezona === '2025/26' && z.krog === 7 && z.datum === '2025-10-04' && z.domaci.ime === 'CSESZTREGI KSE' &&
    z.rezultat.domaci === 3 && z.rezultat.gostje === 4 && z.polcas.domaci === 1 && !z.opozorila.length)
  preveri('mlsz: postave po 11, klop posebej', z.domaci.postava.length === 11 && z.gostje.postava.length === 11 &&
    z.domaci.rezerve.length === 1 && z.gostje.rezerve.length === 3)
  const zaEkipo = (idx) => z.goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  preveri('mlsz: goli z 11 m in avtogolom = izid', z.goli.length === 7 && zaEkipo(0) === 3 && zaEkipo(1) === 4 &&
    z.goli.some((g) => g.ime === 'Neubauer Kevin' && g.enajstmetrovka && g.ekipaIdx === 1 && g.minuta === 25) &&
    z.goli.some((g) => g.ime === 'Szabó Kornél' && g.avtogol && g.ekipaIdx === 0))
  preveri('mlsz: nastopi z goli', kdo('Kovács Erik').goli === 2 && kdo('Neubauer Kevin').goliIzEnajstmetrovke === 1 &&
    kdo('Szabó Kornél').avtogoli === 1 && kdo('Szabó Kornél').goli === 0)
  preveri('mlsz: kartoni brez trenerja', z.rumeni.length === 3 && z.rdeci.length === 1 && !z.rumeni.some((k) => /Bazsika/i.test(k.ime)) &&
    kdo('Biharvári Roland').rumeni === 1)
  preveri('mlsz: rdeči rezervi skrajša nastop', kdo('Kocsis Márk').rdeci === 1 && kdo('Kocsis Márk').minutaOd === 46 && kdo('Kocsis Márk').minute === 40)
  preveri('mlsz: menjave v parih', z.menjave.length === 4 &&
    z.menjave.some((m) => m.minuta === 60 && m.ven.ime === 'Madarász Zoltán' && m.noter.ime === 'Tinó Ronald János' && m.noter.st === 12))
  preveri('mlsz: minute menjav', kdo('Madarász Zoltán').minute === 60 && kdo('Tinó Ronald János').minute === 30 && kdo('Tinó Ronald János').goli === 1 &&
    kdo('Őr Gergő').minute === 46 && n.filter((x) => !x.zacetnik).length === 4)
  preveri('mlsz: minute ekipe ~ 11 × 90', [0, 1].every((e) => {
    const m = n.filter((x) => x.ekipaIdx === e).reduce((s, x) => s + x.minute, 0)
    return m >= 900 && m <= 990
  }))
  preveri('mlsz: vsak nastop ima šifro igralca', n.length === 26 && n.every((x) => Number.isInteger(x.regSt)) && kdo('Kovács Erik').regSt === 525643)
  preveri('mlsz: namig za vratarja je prvi začetnik', [0, 1].every((e) => n.filter((x) => x.ekipaIdx === e && x.zacetnik && x.vratar).length === 1) &&
    kdo('Szmolicza Levente').vratar && kdo('Szmolicza Levente').pozicija === 'GK' && kdo('Lucz Boldizsár Károly').vratar &&
    n.filter((x) => !x.vratar).every((x) => x.pozicija === null))

  // Rezerva noter v 12. in ven v 87. (Horváth János, Lenti : Zalakomár 1:3).
  const z5 = M.vZapisnik(beri('hu-adatbank-tekma-65-20-31672-2090950.html'), { id: '2090950' })
  const hj = M.nastopi(z5).find((x) => x.ime === 'Horváth János')
  preveri('mlsz: rezerva noter in ven', hj && !hj.zacetnik && hj.minutaOd === 12 && hj.minutaDo === 87 && hj.minute === 75 && hj.goli === 2)

  // Kontumacija: ZTE FC II. : Zalakomár 3:0 (0:0), obe postavi prazni.
  const kz = beri('hu-adatbank-tekma-kontumacija-65-20-31672-2091004.html')
  preveri('mlsz: kontumacija prepoznana', M.jeKontumacija(kz) && M.brezPostav(kz) && M.vZapisnik(kz) === null)
  preveri('mlsz: odigrana tekma ni kontumacija', !M.jeKontumacija(beri('hu-adatbank-tekma-65-20-31672-2090962.html'), { domaci: 3, gostje: 0 }) &&
    !M.jeKontumacija(kz, { domaci: 2, gostje: 0 }))

  // Sestavljen zapisnik: menjava vratarja (prvi začetnik ven, rezerva noter je
  // nov vratar), leteča menjava (ven v 30., nazaj v 60.), rdeči trenerju.
  const ev = (vrsta, m) => `<span style="background-image: url(https://ada1bank.mlsz.hu/meccs-center/img/timeline/event_${vrsta}.png)">${m}&apos;</span>`
  const vrstica = (id, st, ime, par = null, dog = '') =>
    `<tr class="template-tr-selectable"><td class="match_players_num"><a href="https://adatbank.mlsz.hu/player/${id}.html" title="${ime}"><span class="playerNum">${st}</span></a>` +
    (par ? `<a href='https://adatbank.mlsz.hu/player/${par[0]}.html' class='match_players_changeup' title='${par[2]}'><span class='playerNum'>${par[1]}</span></a>` : '') +
    `</td><td class="match_players_name"><a href="https://adatbank.mlsz.hu/player/${id}.html" title="${ime}">${ime}</a></td><td class="match_players_cards">${dog}</td></tr>`
  const ekipa = (stran, ime, zacetni, klop) =>
    `<div id="${stran}_team"><h2 class="pointer">${ime}</h2><table>${zacetni.join('')}</table><table class="replacement">` +
    `<tr><td colspan="3" class="match_table_subhead">CSERÉK</td></tr>${klop.join('')}</table><table class="replacement coach">` +
    `<tr><td class="match_table_subhead" colspan="2">VEZETŐEDZŐ</td></tr><tr><td class="match_table_coach">EDZŐ</td><td class="match_players_cards">${ev('redcard', 50)}</td></tr></table></div>`
  const polje = (od) => Array.from({ length: 10 }, (_, i) => vrstica(od + i, i + 2, `IGRALEC ${od + i}`))
  const sestavljen =
    `<option selected value=67>2026/2027</option><p class="match_data_date">2026.10.03 - 15:00</p><h1 id="headerText">X 8. forduló</h1>` +
    `<div class="match-result"><span>0 - 0</span><p>(0 - 0)</p></div>` +
    ekipa('left', 'A SE', [vrstica(1, 1, 'KAPUS ELSŐ', [9, 12, 'KAPUS MÁSIK'], ev('swap', 70)), ...polje(100).map((r, i) => (i === 0 ? r.replace('</td></tr>', `${ev('swap', 60)}${ev('swap', 30)}</td></tr>`) : r))],
      [vrstica(9, 12, 'KAPUS MÁSIK', [1, 1, 'KAPUS ELSŐ'], ev('swap', 70)), vrstica(8, 13, 'NEM JÁTSZOTT')]) +
    ekipa('right', 'B FC', [vrstica(2, 1, 'MÁSIK KAPUS'), ...polje(200)], []) +
    '<div class="team_tabella"></div>'
  const zs = M.vZapisnik(sestavljen, { id: 's' })
  const ns = M.nastopi(zs)
  const s = (ime) => ns.find((x) => x.ime === ime)
  preveri('mlsz: menjava vratarja — nov vratar je namig', s('Kapus Első').vratar && s('Kapus Első').minute === 70 && s('Kapus Másik').vratar &&
    s('Kapus Másik').minute === 20 && !s('Igralec 101').vratar && !ns.some((x) => x.ime === 'Nem Játszott'))
  preveri('mlsz: leteča menjava (ven in nazaj)', s('Igralec 100').minute === 60 && s('Igralec 100').zacetnik && s('Igralec 100').minutaDo === 90)
  // Domači: 9 × 90 + 70 + 20 (vratarja) + 60 (leteča menjava, med 30. in 60. nihče).
  const minuteEkipe = (e) => ns.filter((x) => x.ekipaIdx === e).reduce((a, x) => a + x.minute, 0)
  preveri('mlsz: sestavljen zapisnik brez kartonov trenerja', zs.sezona === '2026/27' && zs.krog === 8 && zs.rdeci.length === 0 &&
    minuteEkipe(0) === 960 && minuteEkipe(1) === 990)

  // ada1bank ob preobremenitvi vrne 43 bajtov ("Too many connections") namesto
  // strani kroga (arhiv 63/1/29300 je tako tiho dal 0 zapisnikov). Ostanek se
  // prebere znova po umiku, vztrajen ostanek ustavi uvoz.
  const pravaStran = beri('hu-adatbank-krog-67-20-33915-8.html')
  const ostanek = 'SQLSTATE[08004] [1040] Too many connections'
  preveri('mlsz: ostanek ni stran kroga', M.jeStranKroga(pravaStran) && !M.jeStranKroga(ostanek) && M.UMIK_MS.length >= 2)
  let klicev = 0
  const dvakratOstanek = async () => (++klicev <= 2 ? ostanek : pravaStran)
  const stran = await M.stranKroga('67/20/33915', 8, dvakratOstanek, false, [0, 0, 0])
  preveri('mlsz: ostanek se po umiku prebere znova', klicev === 3 && M.jeStranKroga(stran))
  let napaka = null
  try {
    await M.stranKroga('63/1/29300', 1, async () => ostanek, false, [0, 0])
  } catch (e) {
    napaka = e
  }
  preveri('mlsz: vztrajen ostanek ustavi uvoz (ne 0 zapisnikov)', /ni stran kroga.*Too many connections/.test(napaka?.message ?? ''))
}

// --- anonimizacija (GDPR) ---------------------------------------------------------
// Uvoz najde anonimiziranega igralca po zgoščenem imenu ali šifri; vrednosti
// so iste kot v supabase/tests/varnost.sql (SQL anonimizacijski_kljuc). Če se
// razideta, uvoz ustvari dvojnika s pravim imenom.
{
  const { imeHash, regHash } = await import('./anonimizacija.mjs')
  preveri('anonimizacija: uvoz zgosti ime in sifro enako kot baza',
    imeHash(7, 'Test Šime') === '558e773d490d37ef3d185b90d5f8e2017391b71b5e5c14d74888dc3e874f514c' &&
    regHash(7, 913040) === '0977c5f2629986f97d714990a002b776017db2c12c201af132af556ae48780d7')
}

// --- vir fss (Srbija, državni ligi FSS; vratar s prvaliga.rs) ------------------
{
  const F = await import('./viri/fss.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('fss: vir je vpisan', viri.fss === F.default && F.default.drzava === 'RS' && F.default.imaRegistracije === false &&
    F.default.premorMs >= 2000 && F.default.glave['User-Agent'] === 'SLFF fantasy (https://slff.eu)')
  preveri('fss: naslovi (latinica)', F.default.naslovRazporeda('mozzart-bet-prva-liga-srbije-26-27') === 'https://fss.rs/takmicenje/mozzart-bet-prva-liga-srbije-26-27/?script=lat' &&
    F.default.naslovZapisnika('x', '75808250') === 'https://fss.rs/izvestaj-sa-utakmice/75808250/?script=lat' &&
    F.naslovVratarjev('75808250') === 'https://www.prvaliga.rs/arhiva/izvestaj-utakmice/75808250/')
  preveri('fss: datum z in brez pike, minuta', F.datumUra('14.08.2026. 20:00').datum === '2026-08-14' && F.datumUra('01.08.2026 20:00').ura === '20:00' &&
    F.minuta("90+3'") === 90 && F.minuta("77'") === 77)
  preveri('fss: državni klub z imenom beograjskega dobi kraj', F.imeKluba('MLADOST') === 'MLADOST (Lučani)' && F.imeKluba('NAPREDAK') === 'NAPREDAK (Kruševac)' &&
    F.imeKluba('RADNIČKI 1923') === 'RADNIČKI 1923' && F.imeKluba('TELEOPTIK') === 'TELEOPTIK')

  const stran = beri('rs-fss-liga-prva-2026-27.html')
  const t = F.tekmeStrani(stran)
  const poKrogu = new Map()
  for (const x of t) poKrogu.set(x.krog, (poKrogu.get(x.krog) ?? 0) + 1)
  // Prva harmonika ponovi tekoči krog: brati se sme le enkrat (30 krogov po 8).
  preveri('fss: stran lige — 30 krogov po 8, tekoči krog ni podvojen', poKrogu.size === 30 && [...poKrogu.values()].every((n) => n === 8) &&
    new Set(t.flatMap((x) => [x.domaci, x.gostje])).size === 16)
  const n3 = t.find((x) => x.id === '75808250')
  preveri('fss: tekma s strani lige (izid, polčas, kraj)', n3?.krog === 3 && n3.datum === '2026-08-14' && n3.ura === '20:00' &&
    n3.domaci === 'NAPREDAK (Kruševac)' && n3.izid?.domaci === 2 && n3.izid?.gostje === 1 && n3.polcas?.gostje === 1)
  const razpored = F.razcleniRazpored([], stran)
  preveri('fss: razpored — odigrane le z izidom, brez kontumacij', razpored.length === 30 &&
    razpored.flatMap((k) => k.tekme).filter((x) => x.odigrana).length === 96 && !razpored.flatMap((k) => k.tekme).some((x) => x.kontumacija))

  const vr = F.dresiVratarjev(beri('rs-fss-vratarji-75576384.html'))
  preveri('fss: vratarji s prvaliga.rs, tudi kapetan-vratar "(C) (G)"', vr && [...vr[0]].sort().join() === '1,12' && [...vr[1]].sort().join() === '1,89')
  const z = F.vZapisnik(beri('rs-fss-izvestaj-75576384-kapetan-vratar.html'), { id: '75576384', vratarji: vr })
  const n = F.nastopi(z)
  const minute = (i) => n.filter((x) => x.ekipaIdx === i).reduce((a, x) => a + x.minute, 0)
  preveri('fss: zapisnik — postavi, klop, goli = izid, minute 990, brez opozoril', z.domaci.postava.length === 11 && z.gostje.postava.length === 11 &&
    z.rezultat.domaci === 2 && z.rezultat.gostje === 1 && z.goli.length === 3 && minute(0) === 990 && minute(1) === 990 && z.opozorila.length === 0)
  preveri('fss: vratar začetne postave pri obeh', n.filter((x) => x.vratar && x.zacetnik).map((x) => x.st).join() === '12,89')
  const zamenjan = n.find((x) => x.zacetnik && x.minute < 90)
  preveri('fss: začetnik z izstopom ima minute do izstopa', !!zamenjan && n.some((x) => !x.zacetnik && x.ekipaIdx === zamenjan.ekipaIdx && x.minutaOd === zamenjan.minutaDo))

  const z2 = F.vZapisnik(beri('rs-fss-izvestaj-60996193-drugi-rumeni.html'), { vratarji: F.dresiVratarjev(beri('rs-fss-vratarji-60996193.html')) })
  const n2 = F.nastopi(z2)
  const gajic = n2.find((x) => x.ime === 'Gajić Uroš')
  preveri('fss: drugi rumeni je izključitev (minute do nje)', z2.rdeci.length === 1 && gajic?.rdeci === 1 && gajic.minute === 50 && z2.opozorila.length === 0)
  preveri('fss: prazna predloga je null', F.vZapisnik('<html><div class="fss-rez__title"></div></html>') === null && F.tekmeStrani('<html></html>').length === 0)
}

// --- vir frf (Romunija, portal županijskih zvez frf-ajf.ro) --------------------
{
  const F = await import('./viri/frf.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('frf: vir je vpisan', viri.frf === F.default && F.default.drzava === 'RO' && F.default.imaRegistracije === false &&
    F.default.premorMs >= 1500 && F.default.glave['User-Agent'] === 'SLFF fantasy (slff.eu; splih.94@gmail.com)')
  preveri('frf: šifra in naslovi', F.razbijKodo('timis/liga-a-iv-a-16445').judet === 'timis' && F.razbijKodo('timis/liga-a-iv-a-16445').id === 16445 &&
    F.default.naslovRazporeda('timis/liga-a-iv-a-16445') === 'https://www.frf-ajf.ro/timis/competitii-fotbal/liga-a-iv-a-16445/program' &&
    F.naslovKroga('timis/liga-a-iv-a-16445', 8) === 'https://www.frf-ajf.ro/timis/competitii-fotbal/liga-a-iv-a-16445/meciuri/etapa-8')
  let slabaSifra = null
  try { F.razbijKodo('16445') } catch (e) { slabaSifra = e.message }
  preveri('frf: šifra brez županije ustavi uvoz', /judet/.test(slabaSifra ?? ''))
  preveri('frf: datum, ura (Bukarešta → Ljubljana), minuta', F.datumRo('Sambata, 3  Octombrie 2026') === '2026-10-03' &&
    F.vLjubljanskiCas('2026-10-03', '11:00').ura === '10:00' && F.vLjubljanskiCas('2026-10-03', '00:30').datum === '2026-10-02' &&
    F.minuta("92'") === 90 && F.minuta("46'") === 46)
  preveri('frf: ș ț z vejico, ime igralca, ključ kluba brez diakritike', F.lepoIme('Bucur Vladut - Stefan') === 'Bucur Vladut-Stefan' &&
    F.imeKluba('Flacăra Mălăeşti', 'prahova') === 'Flacăra Mălăești' && F.kljucKlubaRo('CS Sânandrei Timiș') === F.kljucKlubaRo('CS Sanandrei Timis') &&
    F.kratkoImeRo('CS Sânandrei Timiș') === 'Sânandrei Timiș')
  preveri('frf: navadna stran ni izziv, izziv je', !F.jeIzziv(beri('ro-frf-meci-timis-polni.html')) &&
    F.jeIzziv('<html><head><title>Just a moment...</title></head></html>'))

  // Program: vse tekme sezone na eni strani.
  const program = beri('ro-frf-program-timis-16445.html')
  const tekme = F.tekmePrograma(program, 'timis')
  preveri('frf: program — 240 tekem, 30 krogov, 16 klubov, sezona', tekme.length === 240 && new Set(tekme.map((t) => t.krog)).size === 30 &&
    new Set(tekme.flatMap((t) => [t.domaci, t.gostje])).size === 16 && F.sezonaStrani(program) === '2026/27')
  const t1 = tekme.find((t) => t.id === '1227012')
  preveri('frf: program — tekma z izidom, neodigrana brez datuma (1970-01-01)', t1?.krog === 1 && t1.datum === '2026-08-22' &&
    t1.domaci === 'CS Sânandrei Timiș' && t1.izid?.domaci === 2 && t1.izid?.gostje === 1 &&
    tekme.filter((t) => t.krog === 30).every((t) => t.datum === null && t.izid === null))
  let dvoumno = null
  const zLocilom = program.replace('<b>CS Sânandrei Timiș - CS Avântul Periam</b>', '<b>CS Sânandrei - Timiș - CS Avântul Periam</b>')
  try { F.tekmePrograma(zLocilom, 'timis') } catch (e) { dvoumno = e.message }
  preveri('frf: dvoumno "A - B - C" ustavi, lestvica ga razreši', /ne znam razdeliti/.test(dvoumno ?? '') &&
    F.tekmePrograma(zLocilom, 'timis', ['CS Sânandrei - Timiș', 'CS Avântul Periam'])[0].domaci === 'CS Sânandrei - Timiș' &&
    F.imenaLestvice(beri('ro-frf-clasament-timis.html')).length === 16)
  const ure = F.ureKroga(beri('ro-frf-etapa-timis-8.html'))
  preveri('frf: ure s strani kroga', ure.size === 8 && ure.get('1227068')?.ura === '16:00' && ure.get('1227070')?.datum === '2026-10-10')

  // Razpored: program + stran prihajajočega kroga + stran 3:0 (kontumacija).
  const strani = new Map([
    ['program', program], ['etapa-8', beri('ro-frf-etapa-timis-8.html')],
    ['1227015', beri('ro-frf-meci-1227015-kontumacija.html')],
  ])
  const prenesi = async (url) => {
    for (const [k, v] of strani) if (url.includes(k)) return v
    return beri('ro-frf-meci-1227058-prazen.html')
  }
  const krogi = await F.default.razporedVseStrani('timis/liga-a-iv-a-16445', prenesi, { danes: '2026-10-10' })
  const vse = krogi.flatMap((k) => k.tekme)
  const k8 = krogi.find((k) => k.stevilka === 8)
  preveri('frf: razpored — le razpisani krogi, ura v ljubljanskem času, kontumacija 3:0 brez postav', krogi.length === 8 &&
    k8?.tekme.find((t) => t.domaci === 'CSC Belinț')?.ura === '10:00' &&
    vse.filter((t) => t.kontumacija).length === 1 && vse.find((t) => t.kontumacija)?.izid?.domaci === 3 &&
    vse.filter((t) => t.odigrana).length === 62)

  // Poln zapisnik: Sânandrei : Recaș 2:1 (Timiș IV, 7. krog), avtogol, menjave.
  const z = F.vZapisnik(beri('ro-frf-meci-timis-polni.html'), { id: '1227060', judet: 'timis' })
  const n = F.nastopi(z)
  const minute = (i) => n.filter((x) => x.ekipaIdx === i).reduce((a, x) => a + x.minute, 0)
  preveri('frf: zapisnik — glava, krog, izid, polčas, datum, ura', z.domaci.ime === 'CS Sânandrei Timiș' && z.gostje.ime === 'AS Recaș' &&
    z.krog === 7 && z.rezultat.domaci === 2 && z.rezultat.gostje === 1 && z.polcas.domaci === 0 && z.datum === '2026-10-03' &&
    z.ura === '10:00' && z.sezona === '2026/27' && !z.nepopoln && z.opozorila.length === 0)
  preveri('frf: postave in klop, šifra igralca, brez dresa in vratarja', z.domaci.postava.length === 11 && z.domaci.rezerve.length === 7 &&
    z.gostje.postava.length === 11 && z.gostje.rezerve.length === 8 && n.every((x) => x.regSt != null && x.st === null && !x.vratar))
  preveri('frf: goli = izid, avtogol pri strelčevi ekipi šteje nasprotniku', z.goli.length === 3 &&
    z.goli.some((g) => g.avtogol && g.ime === 'Firan Andrei' && g.ekipaIdx === 1 && g.minuta === 72) &&
    n.find((x) => x.ime === 'Firan Andrei')?.avtogoli === 1 && n.find((x) => x.ime === 'Boghian Adrian')?.goli === 1)
  preveri('frf: menjave z minutami (gostje v zrcalni postavitvi), 990 minut na ekipo', minute(0) === 990 && minute(1) === 990 &&
    n.find((x) => x.ime === 'Badauta Alexandru Catalin')?.minute === 46 && n.find((x) => x.ime === 'Szalkai Robert')?.minutaOd === 46 &&
    n.find((x) => x.ime === 'Bejerea Misi')?.minute === 75 && n.find((x) => x.ime === 'Ozsvath Laurentiu Robert')?.rumeni === 1 &&
    !n.some((x) => x.ime === 'Radac Andrei'))
  preveri('frf: zapisnik ne nosi datuma rojstva ne izkaznice', !JSON.stringify(z).match(/Carnet|\d{2}-\d{2}-(19|20)\d{2}/))

  // Nepopolni: prazen (4:1 brez postav), le dogodki (Prahova), kontumacija.
  const p = F.vZapisnik(beri('ro-frf-meci-1227058-prazen.html'), { judet: 'timis' })
  preveri('frf: prazen zapisnik — izid je, nepopoln, brez nastopov', p.nepopoln && p.prazen && p.rezultat.domaci === 4 &&
    F.nastopi(p).length === 0 && p.opozorila[0].startsWith(F.NEPOPOLN) && !F.jeKontumacija(p))
  const d = F.vZapisnik(beri('ro-frf-meci-prahova-le-dogodki.html'), { judet: 'prahova' })
  preveri('frf: "le dogodki" (strelci brez postave) ni postava', d.nepopoln && !d.prazen && F.nastopi(d).length === 0 && d.goli.length === 0 &&
    d.opozorila.every((o) => /le igralci z dogodki/.test(o)))
  const k = F.vZapisnik(beri('ro-frf-meci-1227015-kontumacija.html'), { judet: 'timis' })
  preveri('frf: 3:0 brez postav je kontumacija', F.jeKontumacija(k) && k.prazen)
  // Ena ekipa s postavo, druga brez: nastopi le znane ekipe, tekma nepopolna.
  const html = beri('ro-frf-meci-timis-polni.html')
  const brezGostov = html.slice(0, html.indexOf('<h3 class="tbk__title ">AS Recaș')) + html.slice(html.indexOf('<h3 class="tbk__title ">În aceea'))
  const e = F.vZapisnik(brezGostov, { judet: 'timis' })
  preveri('frf: ena postava — nastopi domačih, gostje brez, nepopolna', e.nepopoln && !e.prazen &&
    F.nastopi(e).every((x) => x.ekipaIdx === 0) && F.nastopi(e).length === 14 && e.opozorila[0] === `${F.NEPOPOLN}: AS Recaș — brez postave`)
  preveri('frf: stran brez glave tekme ni zapisnik', F.vZapisnik(beri('ro-frf-clasament-timis.html')) === null)

  // zapisniki(): krog in imena s programa, kontumacija izpuščena.
  const zs = await F.default.zapisniki('timis/liga-a-iv-a-16445', async (url) => {
    if (url.endsWith('/program')) return program.replace(/<tr class="blueColored2?"><td><b>(?![^<]*(?:CS Sânandrei Timiș - AS Recaș|CSM Lugoj - CSO Deta|CSC Săcălaz - CSU))[\s\S]*?<\/tr>/g, '')
    if (url.includes('1227015')) return beri('ro-frf-meci-1227015-kontumacija.html')
    if (url.includes('1227058')) return beri('ro-frf-meci-1227058-prazen.html')
    return beri('ro-frf-meci-timis-polni.html')
  })
  preveri('frf: zapisniki() — poln, prazen nepopoln, kontumacija izpuščena', zs.length === 2 &&
    zs.some((x) => x.id === '1227060' && x.z.krog === 7 && !x.z.nepopoln) && zs.some((x) => x.id === '1227058' && x.z.nepopoln && x.z.krog === 6))
}

// --- vir hlf (Romunija, uradna platforma FRF hailafotbal.ro) ----------------------
{
  const H = await import('./viri/hlf.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const json = (ime) => JSON.parse(readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8'))
  const koda = 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1'
  preveri('hlf: vir je vpisan', viri.hlf === H.default && H.default.drzava === 'RO' && H.default.imaRegistracije === false &&
    H.PREMOR_MS >= 2000 && H.PRIPONA_UA === 'SLFF fantasy (slff.eu; splih.94@gmail.com)')
  preveri('hlf: šifra, sezona, naslov kroga', H.razbijKodo(koda).raven === 'national' && H.sezonaIzKode(koda) === '2026/27' &&
    H.razbijKodo('judetean/cluj/fotbal/2026-2027/liga-4-cluj/sezon-regular/grupa-a').judet === 'cluj' &&
    H.naslovKroga(koda, 3) === `https://hailafotbal.ro/rezultate/${koda}/etapa-3`)
  let slabaSifra = null
  try { H.razbijKodo('cluj/liga-4') } catch (e) { slabaSifra = e.message }
  preveri('hlf: napačna šifra ustavi uvoz', /judetean/.test(slabaSifra ?? ''))
  preveri('hlf: slug, UUID → reg_st, čas (Bukarešta → Ljubljana), minuta', H.slug('Victoria Viişoara') === 'victoria-viisoara' &&
    H.regIzUuid('dfc7539c-6eb3-4d25-a205-ac2e6d4ef55d') === parseInt('dfc7539c6eb34', 16) && H.regIzUuid('00000000-0000-0000-0000-000000000000') === null &&
    H.casTekme('2026-09-12T17:00:00').ura === '16:00' && H.casTekme('2026-09-12T00:00:00').ura === null &&
    H.minutaDogodka({ minute: 90, minuteExtra: 4 }) === 90)
  preveri('hlf: izziv ustavi, navadna stran ne', H.jeIzziv('<title>Just a moment...</title>') && !H.jeIzziv('<html><title>Hai la fotbal</title></html>'))

  const krog = json('ro-hlf-krog-liga3-s1-3.json')
  const list = json('ro-hlf-list-dfc7539c.json')
  const t = H.tekmeKroga(krog)[0]
  const z = H.vZapisnik(t, krog, list, { stevilka: 3 })
  const n = H.nastopi(z)
  const minute = (i) => n.filter((x) => x.ekipaIdx === i).reduce((a, x) => a + x.minute, 0)
  preveri('hlf: zapisnik — 11 + 11, izid, polčas, ura, brez opozoril', z.domaci.postava.length === 11 && z.gostje.postava.length === 11 &&
    z.rezultat.domaci === 2 && z.rezultat.gostje === 2 && z.polcas?.gostje === 1 && z.datum === '2026-09-12' && z.ura === '16:00' &&
    !z.nepopoln && z.opozorila.length === 0)
  preveri('hlf: avtogol in enajstmetrovka', z.goli.length === 4 && z.goli.filter((g) => g.avtogol).length === 1 && z.goli.filter((g) => g.enajstmetrovka).length === 1)
  preveri('hlf: vratar ("Portar") in kapetan pri obeh, vsi s šifro', n.filter((x) => x.vratar && x.zacetnik).length === 2 &&
    n.filter((x) => x.kapetan).length === 2 && n.every((x) => x.regSt != null))
  preveri('hlf: minute — 990 in 970 (rdeči v 70.)', minute(0) === 990 && minute(1) === 970 && z.rdeci.length === 1 && z.rdeci[0].minuta === 70)
  const brez = H.vZapisnik(t, krog, null, { stevilka: 3 })
  preveri('hlf: brez zapisnika — izid ostane, nepopoln, brez nastopov', brez.nepopoln && brez.prazen && H.nastopi(brez).length === 0 &&
    brez.opozorila[0].startsWith(H.NEPOPOLN))
  preveri('hlf: v predpomnilnik gredo brez fotografij in osebja', !JSON.stringify(H.brezSlik({ a: { photo: 'x', staff: [1], b: 1 } })).includes('photo'))
}

// --- vir jalgpall (Estonija, jalgpall.ee) -----------------------------------------
{
  const J = await import('./viri/jalgpall.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('jalgpall: vir je vpisan, Crawl-Delay 5 s', viri.jalgpall === J.default && J.default.drzava === 'EE' &&
    J.default.imaRegistracije === false && J.default.premorMs >= 5000 && J.default.glave['User-Agent'] === 'SLFF fantasy (https://slff.eu)')
  preveri('jalgpall: šifra in naslovi', J.razbijKodo('52/2026').liga === '52' && J.razbijKodo('52/2026').leto === '2026' &&
    J.default.naslovRazporeda('536/2025') === 'https://jalgpall.ee/voistlused/536/liigad/calendar?season=2025' &&
    J.default.naslovZapisnika('52/2026', '141546') === 'https://jalgpall.ee/voistlused/protocol/141546')
  let slabaSifra = null
  try { J.razbijKodo('52') } catch (e) { slabaSifra = e.message }
  preveri('jalgpall: šifra brez leta ustavi uvoz', /<id lige>\/<leto>/.test(slabaSifra ?? ''))
  preveri('jalgpall: minuta, datum (Tallinn → Ljubljana), pozicija', J.minuta('45+2′') === 45 && J.minuta('90+4′') === 90 &&
    J.datumUra('28.02.2025 19:00').ura === '18:00' && J.datumUra('01.03.2025 00:30').datum === '2025-02-28' &&
    J.pozicija('Väravavaht') === 'GK' && J.pozicija('Kaitsev keskpoolkaitsja') === 'MID' && J.pozicija('Parem keskkaitsja') === 'DEF' &&
    J.pozicija('Tipuründaja') === 'FWD' && J.pozicija('Vasak ründav poolkaitsja') === 'MID')
  preveri('jalgpall: izid in kontumacija', J.izidRazporeda('2 - 1').izid?.gostje === 1 && !J.izidRazporeda('2 - 1').kontumacija &&
    J.izidRazporeda('+ : -').izid?.domaci === 3 && J.izidRazporeda('- : +').izid?.gostje === 3 &&
    J.izidRazporeda('- : -').kontumacija && J.izidRazporeda('- : -').izid === null && J.izidRazporeda(' - ').izid === null)
  preveri('jalgpall: ključ in kratko ime kluba', J.kljucKlubaEe('Nõmme Kalju FC') === 'nõmme kalju fc' &&
    J.kratkoImeEe('Tallinna FC Flora U21') === 'Flora U21' && J.kratkoImeEe('Nõmme Kalju FC') === 'Nõmme Kalju' &&
    J.kratkoImeEe('Paide Linnameeskond') === 'Paide Linnameeskond' && J.kratkoImeEe('JK Tallinna Kalev III') === 'Tallinna Kalev III')
  preveri('jalgpall: navadna stran ni izziv, izziv je', !J.jeIzziv(beri('ee-jalgpall-protokoll-141546.html')) && J.jeIzziv('<title>Just a moment...</title>'))

  const koledar = beri('ee-jalgpall-koledar-53-2026.html')
  const v = J.vrsticeRazporeda(koledar)
  preveri('jalgpall: razpored — Esiliiga 2026: 36 krogov, 180 tekem, 10 klubov, 160 zapisnikov', J.sezonaStrani(koledar) === '2026' &&
    v.length === 180 && new Set(v.map((t) => t.krog)).size === 36 && new Set(v.flatMap((t) => [t.domaci, t.gostje])).size === 10 &&
    v.filter((t) => t.id).length === 160)
  const kont = v.filter((t) => t.kontumacija)
  preveri('jalgpall: razpored — kontumacije izstopa kluba (+ : -, 4 : -), tudi brez datuma', kont.length === 9 &&
    kont.every((t) => /Maardu/.test(t.domaci + t.gostje)) && kont.find((t) => t.krog === 28)?.izid?.domaci === 4 &&
    kont.find((t) => t.krog === 29)?.izid?.gostje === 3 && kont.filter((t) => !t.datum).length === 5)
  const krogi = J.razcleniRazpored(null, koledar)
  preveri('jalgpall: razpored — ura v ljubljanskem času, neodigrana', krogi.length === 36 && krogi[0].tekme[0].ura === '18:00' &&
    krogi.at(-1).tekme.at(-1).odigrana === false && krogi.at(-1).tekme.at(-1).datum === '2026-11-08')

  const z = J.vZapisnik(beri('ee-jalgpall-protokoll-141546.html'), { id: '141546' })
  const n = J.nastopi(z)
  const minute = (nn, i) => nn.filter((x) => x.ekipaIdx === i).reduce((a, x) => a + x.minute, 0)
  preveri('jalgpall: zapisnik — glava, krog, izid, polčas, 11 + 11, klop, brez opozoril', z.domaci.ime === 'Tartu JK Tammeka' &&
    z.gostje.ime === 'FC Nõmme United' && z.krog === 30 && z.datum === '2026-10-10' && z.sezona === '2026' &&
    z.rezultat.domaci === 4 && z.polcas?.domaci === 2 && z.domaci.postava.length === 11 && z.gostje.postava.length === 11 &&
    z.domaci.rezerve.length === 8 && z.opozorila.length === 0)
  preveri('jalgpall: goli = izid, 11-metrovka, asistenca ni strelec', z.goli.length === 4 && z.goli.filter((g) => g.enajstmetrovka).length === 1 &&
    z.goli[0].regSt === 32740 && z.goli.every((g) => g.ekipaIdx === 0 && !g.avtogol))
  preveri('jalgpall: pozicije vseh začetnikov, vratar (VV), šifre', [...z.domaci.postava, ...z.gostje.postava].every((i) => i.pozicija) &&
    z.domaci.postava.find((i) => i.vratar)?.pozicija === 'GK' && z.domaci.postava.find((i) => i.st === 7)?.pozicija === 'MID' &&
    z.gostje.postava.find((i) => i.st === 20)?.pozicija === 'FWD' && n.every((x) => x.regSt))
  preveri('jalgpall: menjave in kartoni, 990 minut na ekipo, ime Priimek Ime', z.menjave.length === 10 && z.rumeni.length === 5 &&
    minute(n, 0) === 990 && minute(n, 1) === 990 && n.length === 32 && z.domaci.postava[0].ime === 'Lapa Kristen')
  preveri('jalgpall: grba iz glave zapisnika', J.grbiZapisnika(beri('ee-jalgpall-protokoll-141546.html')).gostje?.src ===
    'https://jalgpall.ee/images/logos/5C7E20E45CE3FC3318DB9A2BF36EACA6')

  const iv = J.vZapisnik(beri('ee-jalgpall-protokoll-136427.html'))
  preveri('jalgpall: IV liiga brez postavitve — pozicija le vratarjema', iv.domaci.postava.length === 11 &&
    [...iv.domaci.postava, ...iv.gostje.postava].filter((i) => i.pozicija).map((i) => i.pozicija).join() === 'GK,GK' &&
    iv.goli.length === 5 && iv.opozorila.length === 0)
  const zg = J.vZapisnik(beri('ee-jalgpall-protokoll-136363.html'))
  preveri('jalgpall: zgrešena 11-metrovka', zg.zgresene.length === 1 && J.nastopi(zg).filter((x) => x.zgreseneEnajstmetrovke).length === 1 &&
    zg.goli.length === 1 && zg.opozorila.length === 0)
  const av = J.vZapisnik(beri('ee-jalgpall-protokoll-127489.html'))
  preveri('jalgpall: avtogol (po stanju) šteje nasprotniku, je pri strelčevi ekipi', av.goli.filter((g) => g.avtogol).length === 1 &&
    av.goli.find((g) => g.avtogol)?.ekipaIdx === 1 && J.nastopi(av).find((x) => x.avtogoli)?.ekipaIdx === 1 && av.opozorila.length === 0)
  const rk = J.vZapisnik(beri('ee-jalgpall-protokoll-127732.html'))
  preveri('jalgpall: rdeči karton (68.) — minute do izključitve', rk.rdeci.length === 1 && rk.rdeci[0].minuta === 68 &&
    minute(J.nastopi(rk), 0) === 968 && rk.opozorila.length === 0)
  const vr = J.vZapisnik(beri('ee-jalgpall-protokoll-127641.html'))
  preveri('jalgpall: gol, ki ga je razveljavil VAR, ne šteje', vr.goli.length === 5 && vr.opozorila.length === 0)
  preveri('jalgpall: prazen zapisnik (kontumacija) je null', J.vZapisnik(beri('ee-jalgpall-protokoll-142294-prazen.html')) === null)

  // zapisniki(): kontumacije in tekme brez zapisnika izpuščene, napačna sezona ustavi.
  const zs = await J.default.zapisniki('53/2026', async (url) =>
    url.includes('calendar') ? koledar : beri('ee-jalgpall-protokoll-141546.html'))
  const prva = zs.find((x) => x.id === '136135')
  preveri('jalgpall: zapisniki() — brez kontumacij, ime, krog in sezona iz razporeda', zs.length === 151 &&
    !zs.some((x) => x.id === '141699') && prva?.z.domaci.ime === 'Tartu JK Welco' && prva.z.krog === 1 && prva.z.sezona === '2026')
  let napacnaSezona = null
  try { await J.default.zapisniki('53/2025', async () => koledar) } catch (e) { napacnaSezona = e.message }
  preveri('jalgpall: stran z drugo sezono ustavi uvoz', /kaže sezono 2026, ne 2025/.test(napacnaSezona ?? ''))
}

// --- vir fsb (Srbija, Fudbalski savez Beograda) ---------------------------------
{
  const F = await import('./viri/fsb.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const { dodajStrelceSKlopi } = await import('./zapisnik.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  const danes = Date.parse('2026-10-09T12:00:00Z')
  preveri('fsb: vir je vpisan', viri.fsb === F.default && F.default.drzava === 'RS' && F.default.imaRegistracije === false &&
    F.default.premorMs >= 2000 && F.default.glave['User-Agent'] === 'SLFF fantasy (https://slff.eu)')
  preveri('fsb: naslovi', F.default.naslovRazporeda('srpska-liga-beograd') === 'https://www.fsb.org.rs/takmicenje/srpska-liga-beograd/' &&
    F.default.naslovZapisnika('srpska-liga-beograd', '76027989') === 'https://www.fsb.org.rs/izvestaj/?pid=76027989')
  preveri('fsb: minuta s podaljškom', F.minuta("45+1'") === 45 && F.minuta("90+6'") === 90 && F.minuta("66'") === 66)
  preveri('fsb: datum brez letnice v sezoni', F.datumVSezoni('23.08', '2026/27') === '2026-08-23' && F.datumVSezoni('01.05', '2025/26') === '2026-05-01')
  preveri('fsb: ime igralca (prečrkovanje Lj, Nj)', F.lepoIme('GRUJIĆ VelJko') === 'Grujić Veljko' && F.lepoIme('BELIĆ NemanJa') === 'Belić Nemanja' &&
    F.lepoIme('PERIŠIĆ Nikola') === 'Perišić Nikola' && F.lepoIme('LJUBIĆ Marko') === 'Ljubić Marko')
  preveri('fsb: ključ in kratko ime kluba', F.kljucKlubaRs('GSP POLET DORĆOL') === F.kljucKlubaRs('GSP Polet Dorćol') &&
    F.kljucKlubaRs('Radnički') !== F.kljucKlubaRs('Radnicki') && F.kratkoImeRs('OFK BALKAN MIRIJEVO') === 'BALKAN MIRIJEVO' &&
    F.kratkoImeRs('FK T6 NIKA') === 'T6 NIKA' && F.kratkoImeRs('BASK') === 'BASK')
  preveri('fsb: isto ime, drug klub (po ligi)', F.imeKluba('BORAC', 'zonska-liga-beograd') === 'BORAC (Ostružnica)' &&
    F.imeKluba('BORAC', 'prva-beogradska-liga-grupa-b') === 'BORAC' &&
    F.kljucKlubaRs(F.imeKluba('OMLADINAC', 'zonska-liga-beograd')) !== F.kljucKlubaRs(F.imeKluba('OMLADINAC', 'prva-beogradska-liga-grupa-c-2')))
  preveri('fsb: nižje lige — kraj ima klub nižje lige, isti v vseh treh sezonah',
    F.imeKluba('SLOGA', 'opstinska-liga-obrenovac') === 'SLOGA (Ratari)' &&
    F.imeKluba('SLOGA', 'opstinska-liga-obrenovac-2024-2025') === 'SLOGA (Ratari)' &&
    F.imeKluba('HAJDUK', 'medjuopstinska-liga-grupa-b') === 'HAJDUK' &&
    F.imeKluba('HAJDUK', 'medjuopstinska-liga-grupa-c') === 'HAJDUK (Kamendol)' &&
    F.imeKluba('Budućnost', 'srpska-liga-beograd') === 'Budućnost')

  // Stran lige 2026/27 med 8. krogom: harmonika pokaže le 2 odigrani tekmi
  // kroga, "Aktuelno kolo" vseh 7.
  const tekoca = beri('rs-fsb-liga-srpska-2026-27-kolo8.html')
  const k = F.razcleniRazpored([], tekoca, { danes })
  const vse = k.flatMap((x) => x.tekme)
  preveri('fsb: sezona in krogi', F.sezonaStrani(tekoca) === '2026/27' && F.kodaStrani(tekoca) === 'srpska-liga-beograd' &&
    k.length === 26 && vse.length === 182 && k.every((x) => x.tekme.length === 7))
  preveri('fsb: tekoči krog cel (Aktuelno kolo)', k[7].stevilka === 8 && k[7].tekme.filter((t) => t.odigrana).length === 2 &&
    k[7].tekme.some((t) => t.domaci === 'GSP POLET DORĆOL' && t.gostje === 'BRODARAC' && t.datum === '2026-10-10' && t.ura === '11:00' && !t.odigrana))
  preveri('fsb: odigrane, zakazane, datumi čez novo leto', vse.filter((t) => t.odigrana).length === 51 && !vse.some((t) => t.kontumacija) &&
    vse[0].datum === '2026-08-23' && vse.at(-1).datum.startsWith('2027-05'))
  const { tekme: tk } = F.tekmeStrani(tekoca)
  preveri('fsb: stran lige — izid in zapisnik', tk.some((t) => t.krog === 1 && t.domaci === 'FK T6 NIKA' && t.gostje === 'BASK' && t.pid === '76027989' &&
    t.izid.domaci === 1 && t.izid.gostje === 2 && t.status === 'Odigrana'))

  // Arhiv 2025/26: kontumacija BASK : Zvezdara ("---"), izid 0:3 z lestvice.
  const arhiv = beri('rs-fsb-liga-srpska-2025-26.html')
  const ka = F.razcleniRazpored([], arhiv, { danes }).flatMap((x) => x.tekme)
  const kont = ka.filter((t) => t.kontumacija)
  preveri('fsb: arhiv — vse odigrane, ena kontumacija z izidom z lestvice', F.sezonaStrani(arhiv) === '2025/26' && ka.length === 182 &&
    ka.every((t) => t.odigrana) && kont.length === 1 && kont[0].domaci === 'BASK' && kont[0].gostje === 'ZVEZDARA' &&
    kont[0].izid.domaci === 0 && kont[0].izid.gostje === 3)
  preveri('fsb: odbitek točk na lestvici ni del imena', F.goliLestvice(arhiv).get('bask')?.dani === 27)
  preveri('fsb: sveža odigrana brez izida ni kontumacija',
    !F.razcleniRazpored([], arhiv, { danes: Date.parse('2026-05-03') }).flatMap((x) => x.tekme).some((t) => t.kontumacija))
  let dvaKluba = ''
  try { F.razcleniRazpored([], beri('rs-fsb-liga-sopot-2025-26-dva-kluba.html'), { danes }) } catch (e) { dvaKluba = e.message }
  preveri('fsb: dva kluba z istim imenom ustavita uvoz', /MLADOST.*dvakrat/.test(dvaKluba))
  preveri('fsb: prazna stran ni razpored', F.razcleniRazpored([], beri('rs-fsb-izvestaj-neveljaven.html')).length === 0)

  // Zapisnik: FK T6 NIKA : BASK 1:2 (0:1).
  const z = F.vZapisnik(beri('rs-fsb-izvestaj-76027989.html'), { id: '76027989' })
  const n = F.nastopi(z)
  preveri('fsb: zapisnik', z && z.datum === '2026-08-23' && z.sezona === '2026/27' && z.domaci.ime === 'FK T6 NIKA' &&
    z.rezultat.domaci === 1 && z.rezultat.gostje === 2 && z.polcas.gostje === 1 && !z.opozorila.length)
  preveri('fsb: postave, vratar iz bg-info', z.domaci.postava.length === 11 && z.gostje.postava.length === 11 && z.domaci.rezerve.length === 7 &&
    [0, 1].every((e) => n.filter((x) => x.ekipaIdx === e && x.zacetnik && x.vratar).length === 1) &&
    n.filter((x) => x.vratar).every((x) => x.pozicija === 'GK') && n.filter((x) => !x.vratar).every((x) => x.pozicija === null && x.regSt === null))
  preveri('fsb: minute — začetnik 90, rezerva 90 − vstop', n.filter((x) => x.zacetnik).every((x) => x.minute === 90) &&
    n.filter((x) => !x.zacetnik).every((x) => x.minute === 90 - x.minutaOd) && n.filter((x) => !x.zacetnik).length === 9 &&
    n.some((x) => x.ime === 'Stojanović Nemanja' && x.minutaOd === 62 && x.minute === 28))

  // 11 m, drugi rumeni rezervi, direkten rdeči neuporabljeni rezervi.
  const zk = F.vZapisnik(beri('rs-fsb-izvestaj-61488962-kartoni.html'))
  const nk = F.nastopi(zk)
  const kdo = (ime) => nk.find((x) => x.ime === ime)
  preveri('fsb: 11 m', kdo('Ivanović Aleksa').goliIzEnajstmetrovke === 1 && kdo('Ivanović Aleksa').goli === 1 && kdo('Bradić Jovan').goli === 2 &&
    zk.goli.length === 4 && !zk.opozorila.length)
  preveri('fsb: drugi rumeni skrajša nastop rezerve', kdo('Ocokoljić Viktor').minutaOd === 23 && kdo('Ocokoljić Viktor').minutaDo === 84 &&
    kdo('Ocokoljić Viktor').minute === 61 && kdo('Ocokoljić Viktor').rumeni === 1 && kdo('Ocokoljić Viktor').rdeci === 1)
  preveri('fsb: rdeči neuporabljeni rezervi ni nastop', zk.rdeci.length === 2 && !kdo('Baletić Igor') && kdo('Minić Filip').rumeni === 1)
  preveri('fsb: rezervni vratar brez vstopa ni nastop', !nk.some((x) => !x.zacetnik && x.vratar))
  const ena = F.vZapisnik(`<div class="row mb-10 DESKTOP"><div><div>A</div><div>1</div><div>0</div><div>B</div></div></div>` +
    '<span class="fw-6">Status</span> <span class="badge bg-success">Odigrana</span><span class="fw-6">Datum i vreme:</span> <span>05.10.2026  15:00</span>' +
    ['Home team', 'Away team'].map((o, e) => `<!-- ${o} --><h4>${e ? 'B' : 'A'}</h4><table class="table zapisnik">` +
      Array.from({ length: 11 }, (_, i) => `<tr><td><span class="badge ${i ? 'bg-primary' : 'bg-info'}">${i + 1}</span></td><td>IGRAČ${e} Broj${i}</td>` +
        `<td class="gol">${!e && i === 9 ? '<img src="/wp-content/icons/gol-01.svg">50\'' : ''}</td><td class="zuti-karton"></td>` +
        `<td class="crveni-karton">${!e && i === 5 ? '<img src="/wp-content/icons/crveni-01.svg">30\'' : ''}</td><td class="izmena"></td></tr>`).join('') +
      '</table><h6>Rezervni igrači</h6><table class="table zapisnik">' +
      `<tr><td><span class="badge bg-primary">14</span></td><td>REZERVA${e} Prva</td><td class="gol"></td><td class="zuti-karton"></td><td class="crveni-karton"></td><td class="izmena"><img src="/wp-content/icons/izmena-01.svg">60'</td></tr>` +
      `</table><!-- End ${o} -->`).join(''))
  const ne = F.nastopi(ena)
  preveri('fsb: rdeči začetniku skrajša nastop, gol rezerve', ena && ne.find((x) => x.ime === 'Igrač0 Broj5').minute === 30 &&
    ne.find((x) => x.ime === 'Rezerva1 Prva').minute === 30 && ne.filter((x) => x.zacetnik).length === 22 && !ena.opozorila.length)

  // Avtogol stoji pri strelcu v njegovi ekipi.
  const za = F.vZapisnik(beri('rs-fsb-izvestaj-61572220-avtogol.html'))
  const zaEkipo = (idx) => za.goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  preveri('fsb: avtogol', za.goli.some((g) => g.avtogol && g.ime === 'Stolić Petar' && g.ekipaIdx === 1 && g.minuta === 50) &&
    zaEkipo(0) === 5 && zaEkipo(1) === 2 && F.nastopi(za).find((x) => x.ime === 'Stolić Petar').avtogoli === 1 && !za.opozorila.length)

  // Soimenjaka v isti postavi: dva "PERIŠIĆ Nikola", dres 5 in 8.
  const zs = F.vZapisnik(beri('rs-fsb-izvestaj-76029017-soimenjaka.html'))
  const per = F.nastopi(zs).filter((x) => x.ime === 'Perišić Nikola')
  preveri('fsb: soimenjaka ločita dresa', per.length === 2 && per.some((x) => x.st === 5 && x.zacetnik && x.minute === 90) &&
    per.some((x) => x.st === 8 && !x.zacetnik && x.minutaOd === 65))
  preveri('fsb: strelec s klopi brez vstopa dobi nastop', (() => {
    const kopija = JSON.parse(JSON.stringify(zk))
    const r = kopija.domaci.rezerve.find((x) => x.izmena == null && !x.vratar)
    kopija.goli.push({ ekipaIdx: 0, st: r.st, ime: r.ime, minuta: 88, avtogol: false, enajstmetrovka: false })
    const nn = F.nastopi(kopija)
    dodajStrelceSKlopi(kopija, nn)
    return nn.some((x) => x.ime === r.ime && x.goli === 1)
  })())

  preveri('fsb: tekma v živo (U toku) ni zapisnik', F.statusZapisnika(beri('rs-fsb-izvestaj-76030197-u-toku.html')) === 'U toku' &&
    F.vZapisnik(beri('rs-fsb-izvestaj-76030197-u-toku.html')) === null)
  preveri('fsb: neveljaven pid (200, prazna predloga) ni zapisnik', F.vZapisnik(beri('rs-fsb-izvestaj-neveljaven.html')) === null)
  preveri('fsb: kontumacija (ena postava, brez izida) ni zapisnik', F.vZapisnik(beri('rs-fsb-izvestaj-62408513-kontumacija.html')) === null &&
    F.vZapisnik(beri('rs-fsb-izvestaj-61489070-brez-izida.html')) === null)

  // zapisniki(): le odigrane z izidom, krog in klub s strani lige, U toku ne.
  const strani = new Map([
    ['https://www.fsb.org.rs/takmicenje/srpska-liga-beograd/', tekoca],
    ['https://www.fsb.org.rs/izvestaj/?pid=76027989', beri('rs-fsb-izvestaj-76027989.html')],
  ])
  const prebrane = []
  const prenesi = async (url, ime, sveze) => { prebrane.push({ url, ime, sveze }); return strani.get(url) ?? beri('rs-fsb-izvestaj-neveljaven.html') }
  const zs1 = await F.default.zapisniki('srpska-liga-beograd', prenesi)
  preveri('fsb: zapisniki() — krog in klub s strani lige', zs1.length === 1 && zs1[0].id === '76027989' && zs1[0].z.krog === 1 &&
    zs1[0].z.domaci.ime === 'FK T6 NIKA' && zs1[0].z.gostje.ime === 'BASK' && zs1[0].z.sezona === '2026/27' &&
    prebrane[0].sveze === true && new Set(prebrane.filter((p) => /pid=/.test(p.url)).map((p) => p.url)).size === 51 &&
    prebrane.every((p) => !p.ime.includes('/')) && prebrane.some((p) => p.ime === 'izvestaj-srpska-liga-beograd-76027989.html'))
  let niLiga = ''
  try { await F.default.zapisniki('x', async () => beri('rs-fsb-izvestaj-neveljaven.html')) } catch (e) { niLiga = e.message }
  preveri('fsb: stran, ki ni stran lige, ustavi uvoz', /ni stran lige/.test(niLiga))
}

// --- vir oefb (Avstrija, oefb.at) ------------------------------------------------
{
  const O = await import('./viri/oefb.mjs')
  const { default: viri } = await import('./viri/index.mjs')
  const beri = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
  preveri('oefb: vir je vpisan', viri.oefb === O.default && O.default.drzava === 'AT' && O.default.premorMs >= 1500)
  preveri('oefb: minuta', O.minuta('67') === 67 && O.minuta('HZ') === 45 && O.minuta('45+2') === 45 && O.minuta('90+5') === 90 &&
    O.minuta('93') === 90 && O.minuta('SE') === 90 && O.minuta(null) === null)
  preveri('oefb: izid', O.izid('2:0 (1:0)').rezultat.domaci === 2 && O.izid('2:0 (1:0)').polcas.domaci === 1 && O.izid('-:- (-:-)') === null)
  preveri('oefb: datum po dunajskem času', O.datumUra(1791122400000).datum === '2026-10-04' && O.datumUra(1791122400000).ura === '16:00' &&
    O.datumUra(1786125600000).ura === '20:00' && O.sezonaIzDatuma('2027-05-01') === '2026/27')
  preveri('oefb: šifra lige in naslovi', O.razbijKodo(' 226828 ').id === '226828' &&
    (() => { try { O.razbijKodo('67/20/1'); return false } catch { return true } })() &&
    O.default.naslovRazporeda('226828') === 'https://www.oefb.at/bewerbe/Bewerb/Spielplan/226828/' &&
    O.default.naslovZapisnika('226828', '3844106') === 'https://www.oefb.at/bewerbe/Spiel/Spielbericht/3844106/')
  preveri('oefb: ime igralca "Priimek Ime"', O.priimekIme('Julian Di Ronza', 'Di Ronza') === 'Di Ronza Julian' && O.priimekIme('Elias Pitterka', 'Pitterka') === 'Pitterka Elias' &&
    O.priimekIme('Pele', 'Pele') === 'Pele')
  preveri('oefb: ključ in kratko ime kluba', O.kljucKlubaAt('Dellach / Gail') === O.kljucKlubaAt('Dellach/Gail') &&
    O.kljucKlubaAt('SV Straßwalchen') !== O.kljucKlubaAt('SV Strasswalchen') && O.kljucKlubaAt('Völkermarkt') === 'völkermarkt' &&
    O.kratkoImeAt('SV Straßwalchen') === 'Straßwalchen' && O.kratkoImeAt('USV 1960 Berndorf') === 'Berndorf' && O.kratkoImeAt('Dellach / Gail') === 'Dellach / Gail' &&
    O.kratkoImeAt('SV') === 'SV')
  // Trk imen dveh dežel: "Rust" (Bgld.) in "Rust" (NÖ) loči šifra društva; koroški klub ostane, kot je.
  preveri('oefb: isto ime, drugo društvo', O.imeEkipe('Rust', 'https://vereine.oefb.at/RustSv/Mannschaften/Saison-2026-27/KM/Kader/') === 'Rust (NÖ)' &&
    O.imeEkipe('Rust', 'https://vereine.oefb.at/SCFreistadtRust/Mannschaften/Saison-2026-27/KM/Kader/') === 'Rust (Bgld.)' &&
    O.imeEkipe('Gmünd', 'https://vereine.oefb.at/AskoeGmuend/Mannschaften/Saison-2026-27/KM/Kader/') === 'Gmünd' &&
    O.imeEkipe('Dellach / Gail', null) === 'Dellach / Gail' &&
    O.kljucKlubaAt(O.imeEkipe('Berg', 'https://vereine.oefb.at/SportfreundeBerg/x/')) !== O.kljucKlubaAt('Berg'))

  // Razpored: Salzburger Liga 2026/27 po 10. krogu. Thalgau : Straßwalchen (4. krog)
  // je "Neuaustragung" — ponovitev je Straßwalchen : Thalgau 5:0, 8. 9.
  const v = O.vrsticeRazporeda(beri('at-oefb-spielplan-231808.html'))
  preveri('oefb: razpored — vse tekme, brez razveljavljene', v.length === 240 && v.filter((t) => t.izid).length === 80 &&
    new Set(v.map((t) => t.id)).size === 240 && !v.some((t) => t.krog === 4 && t.domaci === 'UFV Thalgau' && t.gostje === 'SV Straßwalchen') &&
    v.some((t) => t.krog === 4 && t.domaci === 'SV Straßwalchen' && t.datum === '2026-09-08' && t.izid?.domaci === 5))
  preveri('oefb: razpored — neodigrane brez izida, krogi 1–30', v.filter((t) => !t.izid).every((t) => t.id && t.datum) &&
    Math.min(...v.map((t) => t.krog)) === 1 && Math.max(...v.map((t) => t.krog)) === 30 &&
    v.some((t) => t.id === '4114979' && t.krog === 11 && !t.izid && t.domaci === 'SV Straßwalchen'))
  // Grbi (scripts/grbi-oefb.mjs): id grba iz razporeda, en na klub.
  const grbiV = new Map(v.flatMap((t) => [[t.domaci, t.grbDomaci], [t.gostje, t.grbGostje]]))
  preveri('oefb grbi: id grba iz razporeda', grbiV.size === 16 && new Set(grbiV.values()).size === 16 &&
    [...grbiV.values()].every((g) => /^[0-9a-f]{20}$/.test(g)) &&
    O.naslovGrba('cf368b4fbac63edc9495') === 'https://www.oefb.at/oefb2/images/1278650591628556536_cf368b4fbac63edc9495-1,0-256x256-256x256.png')

  // Kontumacija: Gebietsliga Süd 2025/26 — dve tekmi "strafverifiziert" brez zapisnika.
  const vs = O.vrsticeRazporeda(beri('at-oefb-spielplan-226276.html'))
  const krogiS = await O.default.razporedVseStrani('226276', async (_u, ime) => (ime.startsWith('spielplan') ? beri('at-oefb-spielplan-226276.html') : ''))
  const tekmeS = krogiS.flatMap((k) => k.tekme)
  const kontS = tekmeS.filter((t) => t.kontumacija)
  preveri('oefb: kontumacija iz razporeda', vs.length === 182 && tekmeS.length === 182 && krogiS.length === 26 && kontS.length === 2 &&
    kontS.every((t) => t.gostje === 'Raiffeisen Pertlstein / Fehring II' && t.izid.domaci === 3 && t.odigrana) &&
    vs.filter((t) => t.kontumacija).every((t) => t.id === null) && tekmeS.every((t) => t.odigrana))

  // Več faz: Bundesliga 2025/26 = Grunddurchgang (22 krogov) + Meister- in
  // Qualifikationsgruppe (po 10). Vzporedni skupini si delita kroge 23–32.
  preveri('oefb: šifra več faz', O.razbijKodo('227113+231372+231373').idji.length === 3 && O.razbijKodo('227113+231372').id === '227113' &&
    O.default.naslovRazporeda('227113+231372') === O.default.naslovRazporeda('227113') &&
    (() => { try { O.razbijKodo('227113+'); return false } catch { return true } })() &&
    O.naslovPodatkov('gruppen/x;jahr=2027').includes('1469066385635312874_gruppen_x_jahr_2027?proxyUrl=http%3A%2F%2Fportale-datenservice'))
  const enaFaza = O.vrsticeFaz([beri('at-oefb-spielplan-231808.html')])
  preveri('oefb: ena faza ostane, kot je', JSON.stringify(enaFaza) === JSON.stringify(v))
  const bl = (id) => beri(`at-oefb-spielplan-${id}.html`)
  const faze = O.vrsticeFaz([bl(227113), bl(231372), bl(231373)])
  const naKrog = (k) => faze.filter((t) => t.krog === k)
  preveri('oefb: faze — krogi 1–32 po 6 tekem', faze.length === 192 && new Set(faze.map((t) => t.krog)).size === 32 &&
    Math.max(...faze.map((t) => t.krog)) === 32 && [1, 22, 23, 32].every((k) => naKrog(k).length === 6) &&
    naKrog(23).every((t) => t.datum >= '2026-03-13') && naKrog(22).every((t) => t.datum < '2026-03-13'))
  preveri('oefb: faza brez skupnega kluba pade', (() => {
    try { O.vrsticeFaz([bl(231808), bl(231372)]); return false } catch (e) { return /nobenega kluba/.test(e.message) } })())
  const krogiBl = await O.default.razporedVseStrani('227113+231372+231373', async (_u, ime) =>
    (ime.startsWith('spielplan') ? bl(ime.match(/\d+/)[0]) : ''))
  preveri('oefb: faze — en krog za obe skupini', krogiBl.length === 32 && krogiBl.at(-1).stevilka === 32 &&
    krogiBl.find((k) => k.stevilka === 23).tekme.length === 6)

  // Zapisnik s skupinami: KAC 1909 : ATSV Wolfsberg 0:3 (Kärntner Liga 2025/26, 1. krog) — 11 m, karton trenerja.
  const z = O.vZapisnik(beri('at-oefb-spiel-3844106.html'), { id: '3844106' })
  const n = O.nastopi(z)
  const kdo = (ime, nn = n) => nn.find((x) => x.ime === ime)
  preveri('oefb: zapisnik', z && z.sezona === '2025/26' && z.krog === 1 && z.datum === '2025-08-01' && z.domaci.ime === 'KAC 1909' &&
    z.rezultat.gostje === 3 && z.polcas.gostje === 0 && !z.opozorila.length && z.domaci.postava.length === 11 && z.gostje.rezerve.length === 5)
  preveri('oefb: pozicije iz skupin', kdo('Magnes Florian').pozicija === 'GK' && kdo('Magnes Florian').vratar && kdo('Wallner Manuel').pozicija === 'DEF' &&
    kdo('Legner Patrick').pozicija === 'MID' && kdo('Topcagic Mihret').pozicija === 'FWD' && n.filter((x) => x.vratar).length === 2)
  preveri('oefb: 11 m in strelci', kdo('Alegöz Berat').goliIzEnajstmetrovke === 1 && kdo('Ejoor John').goli === 1 && kdo('Radl Raphael Dennis').goli === 1)
  preveri('oefb: menjave in minute', kdo('Zuschlag Paul').minute === 59 && kdo('Trimi Patrick').minutaOd === 59 && kdo('Trimi Patrick').minute === 31 &&
    !kdo('Trimi Patrick').zacetnik && n.filter((x) => !x.zacetnik).length === 6 && !kdo('Niederdorfer Marcel Alexander') &&
    [0, 1].every((e) => n.filter((x) => x.ekipaIdx === e).reduce((s, x) => s + x.minute, 0) === 990))
  preveri('oefb: karton trenerja ne šteje', z.rumeni.length === 4 && !z.rumeni.some((k) => /Perz/.test(k.ime ?? '')))
  preveri('oefb: šifra igralca', n.every((x) => Number.isInteger(x.regSt)) && kdo('Magnes Florian').regSt === 752388)

  // Brez skupin, vratar z dresom "T": Lanzendorf : Stixneusiedl 1:5 (2. Klasse Ost, NÖ) — rdeči.
  const z8 = O.vZapisnik(beri('at-oefb-spiel-4109260.html'))
  const n8 = O.nastopi(z8)
  preveri('oefb: vratar "T" je namig, ostali brez pozicije', kdo('Aklanoglu Oktay', n8).vratar && kdo('Aklanoglu Oktay', n8).pozicija === 'GK' &&
    kdo('Aklanoglu Oktay', n8).st === null && kdo('Hartl Fabian', n8).vratar && n8.filter((x) => x.vratar).length === 2 &&
    n8.filter((x) => !x.vratar).every((x) => x.pozicija === null) && !z8.opozorila.length)
  preveri('oefb: menjava ob polčasu in rdeči', kdo('Fidan Eyyub', n8).minutaOd === 45 && kdo('Fidan Eyyub', n8).minute === 45 &&
    kdo('Bauer Niklas', n8).rdeci === 1 && kdo('Bauer Niklas', n8).minute === 89 && kdo('Pajducak Dominik', n8).goli === 3)

  // Avtogol (Ebner, Ferlach : Wolfsberg 1:3) šteje nasprotniku; rumeno-rdeči (Revelant, Matrei : Dellach 3:0).
  const za = O.vZapisnik(beri('at-oefb-spiel-3843953.html'))
  const na = O.nastopi(za)
  preveri('oefb: avtogol', !za.opozorila.length && kdo('Ebner Stefan', na).avtogoli === 1 && kdo('Ebner Stefan', na).goli === 0 &&
    kdo('Stoni Marcel Maximilian', na).goli === 2 && kdo('Stoni Marcel Maximilian', na).goliIzEnajstmetrovke === 1)
  const zr = O.vZapisnik(beri('at-oefb-spiel-3844002.html'))
  const nr = O.nastopi(zr)
  preveri('oefb: rumeno-rdeči skrajša nastop', kdo('Revelant Fabio', nr).rumeni === 1 && kdo('Revelant Fabio', nr).rdeci === 1 &&
    kdo('Revelant Fabio', nr).minute === 85 && !zr.opozorila.length && nr.filter((x) => x.ekipaIdx === 0).every((x) => x.pozicija === null))

  // Sestavljen: vratar brez dresa ("T") zamenjan z "ET", leteča menjava, kontumacija.
  const igr = (st, ime, id) => ({ rueckennummer: st, name: ime, nachname: ime.split(' ').at(-1), url: `https://www.oefb.at/Profile/Spieler/${id}?x` })
  const polje = (od) => Array.from({ length: 10 }, (_, i) => igr(String(i + 2), `Igralec N${od + i}`, od + i))
  const dog = (type, team, min, id, id2 = null) => ({ type, team, minuteString: min, url: `https://www.oefb.at/Profile/Spieler/${id}?x`,
    urlSecondary: id2 ? `https://www.oefb.at/Profile/Spieler/${id2}?x` : null, eigentor: false, hinweis: null })
  const stran = (heim, gast, ergebnis, gameData) =>
    `SG.container.appPreloads['1']=[${JSON.stringify({ spielUid: '9', datum: 1791122400000, ergebnis, runde: '10. Runde', heimMannschaft: 'A', gastMannschaft: 'B', ergebnisZusatz: null })}];\n` +
    `SG.container.appPreloads['2']=[${JSON.stringify({ heimAufstellung: heim, gastAufstellung: gast, gameData })}];\n`
  const ekipa = (ime, zac, klop) => ({ vereinName: ime, tor: [], abwehr: [], mittelfeld: [], sturm: [], weitere: zac, ersatz: klop })
  const html = stran(ekipa('A', [igr('T', 'Prvi Vratar', 1), ...polje(100)], [igr('ET', 'Drugi Vratar', 2), igr('14', 'Ni Igral', 3)]),
    ekipa('B', [igr('1', 'Tretji Vratar', 4), ...polje(200)], []),
    '1:0 (0:0)', [dog('playerchange', 'a', '70', 2, 1), dog('playerchange', 'a', '30', 999, 100), dog('playerchange', 'a', '60', 100, 998),
      { ...dog('goal', 'a', '80', 101), spielstand: '1:0' }])
  const zs = O.vZapisnik(html)
  const ns = O.nastopi(zs)
  const s = (ime) => ns.find((x) => x.ime === ime)
  preveri('oefb: sestavljen — zamenjava vratarja brez dresa', s('Vratar Prvi').minute === 70 && s('Vratar Prvi').vratar && s('Vratar Drugi').vratar &&
    s('Vratar Drugi').minute === 20 && s('Vratar Drugi').minutaOd === 70 && !s('Igral Ni') && zs.krog === 10 &&
    zs.opozorila.join('|') === 'menjava v 30. minuti: vstopnega igralca ni v postavi|menjava v 60. minuti: izstopnega igralca ni v postavi')
  preveri('oefb: sestavljen — leteča menjava', s('N100 Igralec').minute === 60 && s('N100 Igralec').minutaDo === 90 &&
    ns.filter((x) => x.ekipaIdx === 0).reduce((a, x) => a + x.minute, 0) === 960)
  const kont = stran(ekipa('A', [igr('1', 'Prvi Vratar', 1), ...polje(100)], []), ekipa('B', [], []), '3:0 (0:0)', [])
  preveri('oefb: kontumacija (ena postava prazna)', O.jeKontumacija(kont) && O.vZapisnik(kont) === null && !O.jeKontumacija(html) &&
    !O.jeKontumacija(beri('at-oefb-spiel-3844106.html')) && !O.jeKontumacija(beri('at-oefb-spiel-3844002.html')))
}

// --- navijači klubov ----------------------------------------------------------
// Vrstica `navijaci_klubov` je en navijač; klub brez navijačev ima eno vrstico
// brez ekipe. Mesto ima le klub z vsaj `min_navijacev`.
{
  const klub = (team_id, ime, navijacev, sezona, krog, mesto) => ({
    team_id, klub: ime, klub_kratko: null, grb: null, navijacev,
    povprecje_sezona: sezona, povprecje_krog: krog, mesto, min_navijacev: 3,
    round_number: 5, season: '2026/27',
  })
  const navijac = (k, id, ime, sezona, krog) => ({
    ...k, fantasy_team_id: id, ekipa: ime, lastnik: `Lastnik ${id}`, tocke_sezona: sezona, tocke_krog: krog,
  })
  const rence = klub(1, 'ND Renče', 3, '40.0', '8.0', 1)
  const leskovec = klub(2, 'ŠD Leskovec', 4, '35.5', '9.5', 2)
  const bled = klub(3, 'Bled', 2, '60.0', '10.0', null)
  const trzic = klub(4, 'Tržič', 0, null, null, null)
  const vrstice = [
    navijac(rence, 11, 'Renški orli', '30', '6'),
    navijac(rence, 12, 'Soška fronta', '50', '10'),
    navijac(rence, 13, 'Vipavski veter', '40.00', '8'),
    navijac(leskovec, 21, 'Krški levi', 30, 9),
    navijac(leskovec, 22, 'Posavje', 41, 10),
    navijac(leskovec, 23, 'Leskovec A', 35, 9),
    navijac(leskovec, 24, 'Leskovec B', 36, 10),
    navijac(bled, 31, 'Jezero', 70, 12),
    navijac(bled, 32, 'Otok', 50, 8),
    { ...trzic, fantasy_team_id: null, ekipa: null, lastnik: null, tocke_sezona: null, tocke_krog: null },
  ]
  const n = zdruziNavijace(vrstice)
  preveri('navijaci: uvrsceni po mestu', n.uvrsceni.map((k) => k.team_id).join() === '1,2')
  preveri('navijaci: premalo navijacev brez mesta', n.premalo.map((k) => k.team_id).join() === '3')
  preveri('navijaci: klub brez navijacev posebej', n.brez.map((k) => k.klub).join() === 'Tržič')
  preveri('navijaci: navijaci po tockah sezone', n.uvrsceni[0].navijaci.map((x) => x.fantasy_team_id).join() === '12,13,11')
  preveri('navijaci: stevila iz niza', n.uvrsceni[0].povprecje_sezona === 40 && n.uvrsceni[0].navijaci[1].tocke_sezona === 40)
  preveri('navijaci: prag in krog', n.min === 3 && n.krog === 5)
  const prazno = zdruziNavijace([])
  preveri('navijaci: prazna liga', prazno.uvrsceni.length === 0 && prazno.min === 3 && prazno.krog === null)

  const izris = (el) =>
    renderToString(<StaticRouter location="/standings">{el}</StaticRouter>)
  try {
    const html = izris(<TabelaNavijacev podatki={n} mojKlub={2} />)
    preveri(
      'izris: navijaci klubov',
      html.includes('ND Renče') && html.includes('Soška fronta') && html.includes('Premalo navijačev') &&
        html.includes('Tržič') && html.includes('tvoj klub') && html.includes('/team/12'),
    )
    const nic = izris(<TabelaNavijacev podatki={prazno} />)
    preveri('izris: navijaci klubov brez izbire', nic.includes('Bodi prvi'))
  } catch (e) {
    preveri('izris: navijaci klubov', false, e.message)
  }
  try {
    const uvrscen = izris(<KlubMedNavijaci podatki={n} klubId={2} klubIme="ŠD Leskovec" ligaSlug="clani" />)
    preveri('izris: navijaci kluba z mestom', uvrscen.includes('2. mesto') && uvrscen.includes('od 2 klubov') && uvrscen.includes('#fans'))
    const premalo = izris(<KlubMedNavijaci podatki={n} klubId={3} klubIme="Bled" ligaSlug="clani" mojKlub={null} onNavijam={() => {}} />)
    preveri('izris: navijaci kluba premalo', premalo.includes('manjka še 1 navijač') && premalo.includes('Navijam za Bled'))
    const brez = izris(<KlubMedNavijaci podatki={n} klubId={4} klubIme="Tržič" ligaSlug={null} />)
    preveri('izris: navijaci kluba brez', brez.includes('še nima navijačev'))
    const izbira = izris(<IzbiraKluba klubi={[{ team_id: 1, klub: 'ND Renče' }]} onIzberi={() => {}} />)
    preveri('izris: izbira kluba', izbira.includes('Za kateri klub navijaš?') && !izbira.includes('/positions') && !izbira.includes('glas'))
  } catch (e) {
    preveri('izris: navijaci kluba', false, e.message)
  }
}

// --- e-pošta opomnikov v jeziku lige -----------------------------------------
// Funkcija `posli-opomnik` izbere jezik po državi lige. Preverimo obe
// različici, povezave na pravo ligo in odjavo ter to, da v slovaškem mailu ni
// ostalo slovenskih besed (tudi razlog iz baze, ki je slovenski).
{
  const E = await import('../supabase/functions/posli-opomnik/sporocila.ts')
  const { JEZIK_DRZAVE } = await import('../src/lib/drzavaUgib.ts')
  preveri(
    'e-pošta: jezik države kot v vmesniku',
    Object.entries(E.JEZIK_DRZAVE).every(([d, j]) => JEZIK_DRZAVE[d] === j) &&
      Object.keys(JEZIK_DRZAVE).every((d) => d in E.JEZIK_DRZAVE),
  )
  const si = { slug: 'clani', oznaka: 'Člani', ime: '1. Gorenjska liga', drzava: 'SI' }
  const sk = { slug: 'sk-ssfz-4liga', oznaka: 'IV. liga', ime: 'IV. liga SsFZ', drzava: 'SK' }
  const slovensko = /Živjo|ekip[aeo]|krog|točk|Popravi|opomnik/
  const rok = '2026-10-03T08:00:00Z' // sobota 10:00 po obeh pasovih

  const oSl = E.sestaviOpomnik(si, { display_name: 'Janez Novak', brez_ekipe: true })
  const oSk = E.sestaviOpomnik(sk, { display_name: 'Ján Kováč', brez_ekipe: false })
  preveri('e-pošta: opomnik sl', oSl.naslov.includes('še nimaš ekipe') && oSl.html.includes('Živjo, Janez!'))
  preveri('e-pošta: opomnik sk', oSk.naslov.includes('dokonči tím') && oSk.html.includes('Ahoj, Ján!') && !slovensko.test(oSk.naslov + oSk.html), oSk.naslov)
  preveri(
    'e-pošta: povezave na ligo in odjava',
    oSk.html.includes('https://slff.eu/my-team?t=sk-ssfz-4liga') &&
      oSk.odjava === 'https://slff.eu/reminders?t=sk-ssfz-4liga' &&
      oSk.html.includes(oSk.odjava) &&
      oSl.html.includes('https://slff.eu/my-team?t=clani') && oSl.odjava === 'https://slff.eu/reminders?t=clani',
  )
  preveri('e-pošta: odjava v jeziku lige', oSk.html.includes('Nechcem už dostávať pripomienky') && oSl.html.includes('Ne želim več opomnikov'))

  const razlog = 'Iz kluba Šenčur imas 4 igralce, dovoljeni so 3. To se zgodi tudi brez tvoje spremembe — ce igralec med sezono prestopi v klub, iz katerega jih ze imas.'
  const zSl = E.sestaviOpozorilo(si, { display_name: null, team_name: 'Nedeljski <junaki>', round_number: 5, deadline_at: rok, razlog })
  const zSk = E.sestaviOpozorilo(sk, { display_name: null, team_name: 'Nedeľní hrdinovia', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo sl', zSl.naslov.includes('5. krog ne bo zaklenila') && zSl.html.includes('Iz kluba Šenčur') && zSl.html.includes('sobota') && zSl.html.includes('10:00'), zSl.naslov)
  preveri('e-pošta: opozorilo sl ubeži HTML', zSl.html.includes('Nedeljski &lt;junaki&gt;'))
  preveri(
    'e-pošta: opozorilo sk (rok po bratislavsko, razlog preveden)',
    zSk.naslov.includes('5. kolo') && zSk.html.includes('sobota') && zSk.html.includes('10:00') &&
      zSk.html.includes('Z klubu Šenčur máš 4 hráčov') && !slovensko.test(zSk.naslov + zSk.html),
    zSk.naslov,
  )
  preveri('e-pošta: rok v časovnem pasu lige', E.izpisRoka(rok, sk).includes('10:00') && E.izpisRoka(rok, si).includes('10:00'))

  const razlogi = [
    'Ekipa je prazna — kadra ni.',
    'V kadru je 3 igralcev namesto 15.',
    'V kadru je 14 igralcev namesto 15.',
    'V kadru ni vec aktivnih igralcev: Novak Janez, Kos Miha. Klub letos ne igra ali je igralec odsel.',
    'Pri 1 igralcih ni znana pozicija.',
    'Pri 2 igralcih ni znana pozicija.',
    'Kader mora imeti 2 vratarja, 5 branilcev, 5 vezistov in 3 napadalce; ima 2-4-6-3.',
    'V postavi je 10 igralcev namesto 11.',
    'Ekipa nima natanko enega kapetana.',
    'Ekipa nima natanko enega namestnika kapetana.',
  ]
  const prevodi = razlogi.map((r) => E.prevediRazlog(r, 'sk'))
  const splosen = E.prevediRazlog('Neznan razlog.', 'sk')
  preveri(
    'e-pošta: vsi razlogi prevedeni v slovaščino',
    prevodi.every((p) => p !== splosen && !/igralc|kader |ekip/i.test(p)),
    prevodi.find((p) => p === splosen || /igralc|kader |ekip/i.test(p)),
  )
  preveri('e-pošta: množina razloga', prevodi[1] === 'V kádri sú 3 hráči namiesto 15.' && prevodi[2] === 'V kádri je 14 hráčov namiesto 15.')
  // Angleški vmesnik bere iste razloge (pošta ostaja sl/sk).
  const angl = razlogi.map((r) => E.prevediRazlog(r, 'en'))
  const splosenEn = E.prevediRazlog('Neznan razlog.', 'en')
  preveri(
    'vmesnik: vsi razlogi prevedeni v anglescino',
    angl.every((p) => p !== splosenEn && !/igralc|kader |ekip|hráč/i.test(p)),
    angl.find((p) => p === splosenEn || /igralc|kader |ekip|hráč/i.test(p)),
  )
  const bSl = E.sestaviOpomnikBrezLige(null, { display_name: 'Janez Novak' })
  const bSk = E.sestaviOpomnikBrezLige('sk', { display_name: 'Ján' })
  preveri('e-pošta: brez lige sl ne imenuje lige in vodi na sestavo ekipe',
    bSl.naslov.includes('izberi svojo ligo') && !/GNL|1\. SNL — |\?t=/.test(bSl.naslov) &&
      bSl.html.includes('href="https://slff.eu/my-team?sestavi=1"') && !bSl.html.includes('?t=') && bSl.html.includes('Živjo, Janez!'))
  preveri('e-pošta: brez lige sk v slovaščini na sestavo ekipe',
    bSk.naslov.includes('vyber si ligu') && bSk.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      !slovensko.test(bSk.html) && bSk.html.includes('Ahoj, Ján!'))
  preveri('e-pošta: brez lige ima odjavo', bSl.odjava === 'https://slff.eu/reminders' && bSk.html.includes('/reminders'))
  preveri('e-pošta: sl razlog nespremenjen', E.prevediRazlog(razlogi[0], 'sl') === razlogi[0])
  const pushSl = E.sestaviPushOpomnik(si, rok)
  const pushSk = E.sestaviPushOpomnik(sk, rok)
  preveri('push: opomnik brez ekipe v jeziku lige',
    pushSl.naslov.includes('še nimaš ekipe') && pushSk.naslov.includes('ešte nemáš tím') &&
      !slovensko.test(pushSk.besedilo) && /\d/.test(pushSl.besedilo))

  const pSk = E.sestaviPoznavalca(sk, { display_name: 'Ján', obseg: 'liga', klub: null })
  const pSl = E.sestaviPoznavalca(si, { display_name: 'Janez', obseg: 'klub', klub: 'Šenčur' })
  preveri('e-pošta: poznavalec sk', pSk.html.includes('znalcom ligy IV. liga SsFZ') && pSk.html.includes('/assists?t=sk-ssfz-4liga') && !slovensko.test(pSk.html) && !pSk.odjava)
  preveri('e-pošta: poznavalec sl', pSl.html.includes('poznavalec kluba Šenčur') && pSl.html.includes('/positions?t=clani'))

  // Hrvaška: isti maili v hrvaščini, rok po zagrebško, razlog preveden.
  // ("Popravi" je tudi hrvaška beseda, zato svoj vzorec slovenščine.)
  const hrL = { slug: 'hr-mz-1mnl', oznaka: '1. MNL', ime: '1. MNL Međimurje', drzava: 'HR' }
  const slovenskoHr = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestav/
  const pomisljaj = /—/
  const oHr = E.sestaviOpomnik(hrL, { display_name: 'Ivan Horvat', brez_ekipe: true })
  const oHr2 = E.sestaviOpomnik(hrL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik hr',
    oHr.naslov.includes('još nemaš momčad') && oHr.html.includes('Bok, Ivan!') && oHr2.html.includes('Bok!') &&
      oHr2.naslov.includes('dovrši momčad') && oHr.odjava === 'https://slff.eu/reminders?t=hr-mz-1mnl' &&
      oHr.html.includes('https://slff.eu/my-team?t=hr-mz-1mnl') && oHr.html.includes('Ne želim više primati podsjetnike') &&
      !slovenskoHr.test(oHr.naslov + oHr.html + oHr2.naslov + oHr2.html), oHr.naslov)
  const zHr = E.sestaviOpozorilo(hrL, { display_name: 'Ivan', team_name: 'Nedjeljni junaci', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo hr (rok po zagrebško, razlog preveden)',
    zHr.naslov.includes('5. kolo') && zHr.html.includes('subota') && zHr.html.includes('10:00') &&
      zHr.html.includes('Iz kluba Šenčur imaš 4 igrača') && !slovenskoHr.test(zHr.naslov + zHr.html), zHr.naslov)
  preveri('e-pošta: rok hr v časovnem pasu lige', E.izpisRoka(rok, hrL).includes('10:00'))
  const prevodiHr = razlogi.map((r) => E.prevediRazlog(r, 'hr'))
  const splosenHr = E.prevediRazlog('Neznan razlog.', 'hr')
  preveri(
    'e-pošta: vsi razlogi prevedeni v hrvaščino',
    prevodiHr.every((p) => p !== splosenHr && !slovenskoHr.test(p) && !pomisljaj.test(p)),
    prevodiHr.find((p) => p === splosenHr || slovenskoHr.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: množina razloga hr',
    prevodiHr[1] === 'U sastavu su 3 igrača umjesto 15.' && prevodiHr[2] === 'U sastavu je 14 igrača umjesto 15.' &&
      E.prevediRazlog('V postavi je 1 igralcev namesto 11.', 'hr') === 'U prvoj postavi je 1 igrač umjesto 11.',
    `${prevodiHr[1]} | ${prevodiHr[2]}`)
  const bHr = E.sestaviOpomnikBrezLige('hr', { display_name: 'Ivan' })
  preveri('e-pošta: brez lige hr v hrvaščini',
    bHr.naslov.includes('odaberi svoju ligu') && bHr.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bHr.html.includes('Bok, Ivan!') && !slovenskoHr.test(bHr.html.replace(/href="[^"]*"/g, '')))
  const pHr = E.sestaviPoznavalca(hrL, { display_name: 'Ivan', obseg: 'klub', klub: 'NK Polet' })
  preveri('e-pošta: poznavalec hr', pHr.html.includes('poznavatelj kluba NK Polet') && pHr.html.includes('/positions?t=hr-mz-1mnl') && !slovenskoHr.test(pHr.html))
  const popHr = E.sestaviPopravekPozicije(hrL, { display_name: 'Ivan', team_name: 'Junaci', igralci: [{ ime: 'Horvat Marko', pozicija: 'MID' }] })
  const izHr = E.sestaviIzstopKluba(hrL, { display_name: 'Ivan', team_name: 'Junaci', igralci: [{ ime: 'Horvat Marko', klub: 'NK Polet' }] })
  preveri('e-pošta: popravek pozicije in izstop kluba hr',
    popHr.html.includes('(sada vezni)') && izHr.naslov.includes('istupio je iz lige') &&
      !slovenskoHr.test(popHr.naslov + popHr.html + izHr.naslov + izHr.html), popHr.naslov)
  // Novo hrvaško besedilo je brez pomišljajev (noga "SLFF — Sunday League" je skupna).
  const brezNoge = (h) => h.replace('SLFF — Sunday League', '')
  preveri('e-pošta: hr brez pomišljajev',
    [oHr, oHr2, zHr, bHr, pHr, popHr, izHr].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))))

  // Češka: isti maili v češčini, rok po praško, razlog preveden.
  const czL = { slug: 'cz-ok-kladno', oznaka: 'OP Kladno', ime: 'Okresní přebor Kladno', drzava: 'CZ' }
  const slovenskoCs = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestavi |Popravi/
  const oCs = E.sestaviOpomnik(czL, { display_name: 'Jan Novák', brez_ekipe: true })
  const oCs2 = E.sestaviOpomnik(czL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik cs',
    oCs.naslov.includes('ještě nemáš tým') && oCs.html.includes('Ahoj, Jan!') && oCs2.html.includes('Ahoj!') &&
      oCs2.naslov.includes('dokonči tým') && oCs.odjava === 'https://slff.eu/reminders?t=cz-ok-kladno' &&
      oCs.html.includes('https://slff.eu/my-team?t=cz-ok-kladno') && oCs.html.includes('Nechci už dostávat připomínky') &&
      !slovenskoCs.test(oCs.naslov + oCs.html + oCs2.naslov + oCs2.html), oCs.naslov)
  const zCs = E.sestaviOpozorilo(czL, { display_name: 'Jan', team_name: 'Nedělní hrdinové', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo cs (rok po praško, razlog preveden)',
    zCs.naslov.includes('5. kolo') && zCs.html.includes('sobota') && zCs.html.includes('10:00') &&
      zCs.html.includes('Z klubu Šenčur máš 4 hráčů') && !slovenskoCs.test(zCs.naslov + zCs.html), zCs.naslov)
  preveri('e-pošta: rok cs v časovnem pasu lige', E.izpisRoka(rok, czL).includes('10:00'))
  const prevodiCs = razlogi.map((r) => E.prevediRazlog(r, 'cs'))
  const splosenCs = E.prevediRazlog('Neznan razlog.', 'cs')
  preveri(
    'e-pošta: vsi razlogi prevedeni v češčino',
    prevodiCs.every((p) => p !== splosenCs && !slovenskoCs.test(p) && !pomisljaj.test(p)),
    prevodiCs.find((p) => p === splosenCs || slovenskoCs.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: množina razloga cs',
    prevodiCs[1] === 'Na soupisce jsou 3 hráči místo 15.' && prevodiCs[2] === 'Na soupisce je 14 hráčů místo 15.' &&
      E.prevediRazlog('V postavi je 1 igralcev namesto 11.', 'cs') === 'V základní sestavě je 1 hráč místo 11.',
    `${prevodiCs[1]} | ${prevodiCs[2]}`)
  const bCs = E.sestaviOpomnikBrezLige('cs', { display_name: 'Jan' })
  preveri('e-pošta: brez lige cs v češčini',
    bCs.naslov.includes('vyber si ligu') && bCs.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bCs.html.includes('Ahoj, Jan!') && !slovenskoCs.test(bCs.html.replace(/href="[^"]*"/g, '')))
  const pCs = E.sestaviPoznavalca(czL, { display_name: 'Jan', obseg: 'klub', klub: 'SK Kladno' })
  preveri('e-pošta: poznavalec cs', pCs.html.includes('znalcem klubu SK Kladno') && pCs.html.includes('/positions?t=cz-ok-kladno') && !slovenskoCs.test(pCs.html))
  const popCs = E.sestaviPopravekPozicije(czL, { display_name: 'Jan', team_name: 'Hrdinové', igralci: [{ ime: 'Novák Petr', pozicija: 'MID' }] })
  const izCs = E.sestaviIzstopKluba(czL, { display_name: 'Jan', team_name: 'Hrdinové', igralci: [{ ime: 'Novák Petr', klub: 'SK Kladno' }] })
  const pushCs = E.sestaviPushOpomnik(czL, rok)
  const tCs = E.sestaviTedenskiPregled(czL, {
    display_name: 'Jan', ekipa: 'Hrdinové', krog: 5, tocke: 2.5, mesto: 3, mesto_prej: 5, ekip: 12,
    povprecje: 30, najvec: 60, kapetan: 'Novák Petr', kapetan_tocke: 4, najboljsi: null, najboljsi_tocke: null,
  })
  preveri('e-pošta: popravek pozicije, izstop, push in tedenski pregled cs',
    popCs.html.includes('(nyní záložník)') && izCs.naslov.includes('odstoupil ze soutěže') &&
      pushCs.naslov.includes('ještě nemáš tým') && tCs.naslov.includes('2,5 bodu') && tCs.html.includes('4 body') &&
      !slovenskoCs.test(popCs.naslov + popCs.html + izCs.naslov + izCs.html + pushCs.besedilo + tCs.naslov + tCs.html), tCs.naslov)
  preveri('e-pošta: cs brez pomišljajev',
    [oCs, oCs2, zCs, bCs, pCs, popCs, izCs, tCs].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))))

  // Madžarska: isti maili v madžarščini, rok po budimpeštansko, razlog preveden.
  const huL = { slug: 'hu-pest-megye1', oznaka: 'Pest I.', ime: 'Megyei I. osztály Pest', drzava: 'HU' }
  const slovenskoHu = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestavi |Popravi|Ahoj|Bok/
  const oHu = E.sestaviOpomnik(huL, { display_name: 'Péter Nagy', brez_ekipe: true })
  const oHu2 = E.sestaviOpomnik(huL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik hu',
    oHu.naslov.includes('még nincs csapatod') && oHu.html.includes('Szia, Péter!') && oHu2.html.includes('Szia!') &&
      oHu2.naslov.includes('fejezd be a csapatodat') && oHu.odjava === 'https://slff.eu/reminders?t=hu-pest-megye1' &&
      oHu.html.includes('https://slff.eu/my-team?t=hu-pest-megye1') && oHu.html.includes('Nem kérek több emlékeztetőt') &&
      !slovenskoHu.test(oHu.naslov + oHu.html + oHu2.naslov + oHu2.html), oHu.naslov)
  const zHu = E.sestaviOpozorilo(huL, { display_name: 'Péter', team_name: 'Vasárnapi hősök', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo hu (rok po budimpeštansko, razlog preveden)',
    zHu.naslov.includes('5. forduló') && zHu.html.includes('szombat') && zHu.html.includes('10:00') &&
      zHu.html.includes('4 játékosod van ugyanabból a klubból (Šenčur)') && !slovenskoHu.test(zHu.naslov + zHu.html), zHu.naslov)
  preveri('e-pošta: rok hu v časovnem pasu lige', E.izpisRoka(rok, huL).includes('10:00'))
  const prevodiHu = razlogi.map((r) => E.prevediRazlog(r, 'hu'))
  const splosenHu = E.prevediRazlog('Neznan razlog.', 'hu')
  preveri(
    'e-pošta: vsi razlogi prevedeni v madžarščino',
    prevodiHu.every((p) => p !== splosenHu && !slovenskoHu.test(p) && !pomisljaj.test(p)),
    prevodiHu.find((p) => p === splosenHu || slovenskoHu.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: razlog hu (samostalnik za številom v ednini)',
    prevodiHu[1] === 'A keretben 3 játékos van 15 helyett.' && prevodiHu[7] === 'A kezdőcsapatban 10 játékos van 11 helyett.',
    `${prevodiHu[1]} | ${prevodiHu[7]}`)
  const bHu = E.sestaviOpomnikBrezLige('hu', { display_name: 'Péter' })
  preveri('e-pošta: brez lige hu v madžarščini',
    bHu.naslov.includes('válaszd ki a bajnokságodat') && bHu.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bHu.html.includes('Szia, Péter!') && !slovenskoHu.test(bHu.html.replace(/href="[^"]*"/g, '')))
  const pHu = E.sestaviPoznavalca(huL, { display_name: 'Péter', obseg: 'klub', klub: 'Bakonyi SE' })
  preveri('e-pošta: poznavalec hu', pHu.html.includes('Bakonyi SE klub szakértője') && pHu.html.includes('/positions?t=hu-pest-megye1') && !slovenskoHu.test(pHu.html))
  const popHu = E.sestaviPopravekPozicije(huL, { display_name: 'Péter', team_name: 'Hősök', igralci: [{ ime: 'Nagy Péter', pozicija: 'MID' }] })
  const izHu = E.sestaviIzstopKluba(huL, { display_name: 'Péter', team_name: 'Hősök', igralci: [{ ime: 'Nagy Péter', klub: 'Bakonyi SE' }] })
  const pushHu = E.sestaviPushOpomnik(huL, rok)
  const tHu = E.sestaviTedenskiPregled(huL, {
    display_name: 'Péter', ekipa: 'Hősök', krog: 5, tocke: 2.5, mesto: 3, mesto_prej: 5, ekip: 12,
    povprecje: 30, najvec: 60, kapetan: 'Nagy Péter', kapetan_tocke: 4, najboljsi: null, najboljsi_tocke: null,
  })
  preveri('e-pošta: popravek pozicije, izstop, push in tedenski pregled hu',
    popHu.html.includes('(mostantól középpályás)') && izHu.naslov.includes('visszalépett a bajnokságból') &&
      pushHu.naslov.includes('még nincs csapatod') && tHu.naslov.includes('2,5 pont') && tHu.html.includes('2,5 pontot') &&
      tHu.html.includes('4 pont') && !slovenskoHu.test(popHu.naslov + popHu.html + izHu.naslov + izHu.html + pushHu.besedilo + tHu.naslov + tHu.html), tHu.naslov)
  preveri('e-pošta: hu brez pomišljajev',
    [oHu, oHu2, zHu, bHu, pHu, popHu, izHu, tHu].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))) &&
      !pomisljaj.test(pushHu.naslov + pushHu.besedilo))
  // Avtentikacijska pošta: madžarska veja predlog in zadev brez slovenščine in pomišljajev.
  const vejeHu = ['confirmation', 'magic_link', 'recovery'].map((ime) => {
    const h = readFileSync(new URL(`../supabase/templates/${ime}.html`, import.meta.url), 'utf8')
    const m = h.match(/"hu" }}([\s\S]*?){{ else/)
    return m ? m[1].replace(/href="[^"]*"/g, '') : null
  })
  const zadeveHu = [...readFileSync(new URL('../scripts/hetzner/docker-compose.slff.yml', import.meta.url), 'utf8')
    .matchAll(/"hu" }}([^{]*){{/g)].map((m) => m[1])
  preveri('e-pošta: avtentikacijske predloge in zadeve hu',
    vejeHu.every((v) => v && !slovenskoHu.test(v) && !pomisljaj.test(v)) && zadeveHu.length === 3 &&
      zadeveHu.every((z) => !slovenskoHu.test(z) && !pomisljaj.test(z)), zadeveHu.join(' | '))

  // Avstrija: isti maili v nemščini, rok po dunajsko, razlog preveden.
  const atL = { slug: 'at-stmk-landesliga', oznaka: 'Stmk. LL', ime: 'Landesliga Steiermark', drzava: 'AT' }
  const slovenskoDe = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestavi |Popravi|Ahoj|Bok|Szia/
  const oDe = E.sestaviOpomnik(atL, { display_name: 'Lukas Gruber', brez_ekipe: true })
  const oDe2 = E.sestaviOpomnik(atL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik de',
    oDe.naslov.includes('noch kein Team') && oDe.html.includes('Servus, Lukas!') && oDe2.html.includes('Servus!') &&
      oDe2.naslov.includes('vervollständige dein Team') && oDe.odjava === 'https://slff.eu/reminders?t=at-stmk-landesliga' &&
      oDe.html.includes('https://slff.eu/my-team?t=at-stmk-landesliga') && oDe.html.includes('Keine Erinnerungen mehr') &&
      !slovenskoDe.test(oDe.naslov + oDe.html + oDe2.naslov + oDe2.html), oDe.naslov)
  const zDe = E.sestaviOpozorilo(atL, { display_name: 'Lukas', team_name: 'Sonntagshelden', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo de (rok po dunajsko, razlog preveden)',
    zDe.naslov.includes('Runde 5') && zDe.html.includes('Samstag') && zDe.html.includes('10:00') &&
      zDe.html.includes('Du hast 4 Spieler aus demselben Klub (Šenčur)') && !slovenskoDe.test(zDe.naslov + zDe.html), zDe.naslov)
  preveri('e-pošta: rok de v časovnem pasu lige', E.izpisRoka(rok, atL).includes('10:00'))
  const prevodiDe = razlogi.map((r) => E.prevediRazlog(r, 'de'))
  const splosenDe = E.prevediRazlog('Neznan razlog.', 'de')
  preveri(
    'e-pošta: vsi razlogi prevedeni v nemščino',
    prevodiDe.every((p) => p !== splosenDe && !slovenskoDe.test(p) && !pomisljaj.test(p)),
    prevodiDe.find((p) => p === splosenDe || slovenskoDe.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: razlog de',
    prevodiDe[1] === 'Im Kader sind 3 Spieler statt 15.' && prevodiDe[7] === 'In der Startelf sind 10 Spieler statt 11.',
    `${prevodiDe[1]} | ${prevodiDe[7]}`)
  const bDe = E.sestaviOpomnikBrezLige('de', { display_name: 'Lukas' })
  preveri('e-pošta: brez lige de v nemščini',
    bDe.naslov.includes('wähl deine Liga') && bDe.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bDe.html.includes('Servus, Lukas!') && !slovenskoDe.test(bDe.html.replace(/href="[^"]*"/g, '')))
  const pDe = E.sestaviPoznavalca(atL, { display_name: 'Lukas', obseg: 'klub', klub: 'SV Gnas' })
  preveri('e-pošta: poznavalec de', pDe.html.includes('Kenner des Klubs SV Gnas') && pDe.html.includes('/positions?t=at-stmk-landesliga') && !slovenskoDe.test(pDe.html))
  const popDe = E.sestaviPopravekPozicije(atL, { display_name: 'Lukas', team_name: 'Helden', igralci: [{ ime: 'Lukas Gruber', pozicija: 'MID' }] })
  const izDe = E.sestaviIzstopKluba(atL, { display_name: 'Lukas', team_name: 'Helden', igralci: [{ ime: 'Lukas Gruber', klub: 'SV Gnas' }] })
  const pushDe = E.sestaviPushOpomnik(atL, rok)
  const tDe = E.sestaviTedenskiPregled(atL, {
    display_name: 'Lukas', ekipa: 'Helden', krog: 5, tocke: 2.5, mesto: 3, mesto_prej: 5, ekip: 12,
    povprecje: 30, najvec: 60, kapetan: 'Lukas Gruber', kapetan_tocke: 1, najboljsi: null, najboljsi_tocke: null,
  })
  preveri('e-pošta: popravek pozicije, izstop, push in tedenski pregled de',
    popDe.html.includes('(jetzt Mittelfeldspieler)') && izDe.naslov.includes('aus der Liga zurückgezogen') &&
      pushDe.naslov.includes('noch kein Team') && tDe.naslov.includes('2,5 Punkte') && tDe.html.includes('1 Punkt.') &&
      !slovenskoDe.test(popDe.naslov + popDe.html + izDe.naslov + izDe.html + pushDe.besedilo + tDe.naslov + tDe.html), tDe.naslov)
  preveri('e-pošta: de brez pomišljajev',
    [oDe, oDe2, zDe, bDe, pDe, popDe, izDe, tDe].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))) &&
      !pomisljaj.test(pushDe.naslov + pushDe.besedilo))
  // Avtentikacijska pošta: nemška veja predlog in zadev brez slovenščine in pomišljajev.
  const vejeDe = ['confirmation', 'magic_link', 'recovery'].map((ime) => {
    const h = readFileSync(new URL(`../supabase/templates/${ime}.html`, import.meta.url), 'utf8')
    const m = h.match(/"de" }}([\s\S]*?){{ else/)
    return m ? m[1].replace(/href="[^"]*"/g, '') : null
  })
  const zadeveDe = [...readFileSync(new URL('../scripts/hetzner/docker-compose.slff.yml', import.meta.url), 'utf8')
    .matchAll(/"de" }}([^{]*){{/g)].map((m) => m[1])
  preveri('e-pošta: avtentikacijske predloge in zadeve de',
    vejeDe.every((v) => v && !slovenskoDe.test(v) && !pomisljaj.test(v)) && zadeveDe.length === 3 &&
      zadeveDe.every((z) => !slovenskoDe.test(z) && !pomisljaj.test(z)), zadeveDe.join(' | '))

  // Srbija: isti maili v srbščini (ekavica, latinica), rok po beograjsko, razlog preveden.
  const rsL = { slug: 'rs-beograd-zona', oznaka: 'BG Zona', ime: 'Zona Beograd', drzava: 'RS' }
  // Slovenščina ali hrvaščina v srbskem mailu ("Popravi" je tudi srbsko, zato ga ni).
  const slovenskoSr = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestavi |Ahoj|Bok|Szia|Servus|momčad|mjest|sljede|prije\b|vratar/
  const oSr = E.sestaviOpomnik(rsL, { display_name: 'Nikola Jovanović', brez_ekipe: true })
  const oSr2 = E.sestaviOpomnik(rsL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik sr',
    oSr.naslov.includes('još nemaš tim') && oSr.html.includes('Zdravo, Nikola!') && oSr2.html.includes('Zdravo!') &&
      oSr2.naslov.includes('dovrši tim') && oSr.odjava === 'https://slff.eu/reminders?t=rs-beograd-zona' &&
      oSr.html.includes('https://slff.eu/my-team?t=rs-beograd-zona') && oSr.html.includes('Ne želim više da primam podsetnike') &&
      !slovenskoSr.test(oSr.naslov + oSr.html + oSr2.naslov + oSr2.html), oSr.naslov)
  const zSr = E.sestaviOpozorilo(rsL, { display_name: 'Nikola', team_name: 'Nedeljni junaci', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo sr (rok po beograjsko, razlog preveden)',
    zSr.naslov.includes('5. kolo') && zSr.html.includes('subota') && zSr.html.includes('10:00') &&
      zSr.html.includes('Iz kluba Šenčur imaš 4 igrača') && !slovenskoSr.test(zSr.naslov + zSr.html), zSr.naslov)
  preveri('e-pošta: rok sr v latinici in časovnem pasu lige', E.izpisRoka(rok, rsL).includes('10:00') && !/[\u0400-\u04FF]/.test(E.izpisRoka(rok, rsL)), E.izpisRoka(rok, rsL))
  const prevodiSr = razlogi.map((r) => E.prevediRazlog(r, 'sr'))
  const splosenSr = E.prevediRazlog('Neznan razlog.', 'sr')
  preveri(
    'e-pošta: vsi razlogi prevedeni v srbščino',
    prevodiSr.every((p) => p !== splosenSr && !slovenskoSr.test(p) && !pomisljaj.test(p)),
    prevodiSr.find((p) => p === splosenSr || slovenskoSr.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: razlog sr (množina kot hrvaška)',
    prevodiSr[1] === 'U sastavu su 3 igrača umesto 15.' && prevodiSr[7] === 'U prvoj postavi je 10 igrača umesto 11.',
    `${prevodiSr[1]} | ${prevodiSr[7]}`)
  const bSr = E.sestaviOpomnikBrezLige('sr', { display_name: 'Nikola' })
  preveri('e-pošta: brez lige sr v srbščini',
    bSr.naslov.includes('izaberi svoju ligu') && bSr.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bSr.html.includes('Zdravo, Nikola!') && !slovenskoSr.test(bSr.html.replace(/href="[^"]*"/g, '')))
  const pSr = E.sestaviPoznavalca(rsL, { display_name: 'Nikola', obseg: 'klub', klub: 'FK Sloga' })
  preveri('e-pošta: poznavalec sr', pSr.html.includes('poznavalac kluba FK Sloga') && pSr.html.includes('/positions?t=rs-beograd-zona') && !slovenskoSr.test(pSr.html))
  const popSr = E.sestaviPopravekPozicije(rsL, { display_name: 'Nikola', team_name: 'Junaci', igralci: [{ ime: 'Nikola Jovanović', pozicija: 'MID' }] })
  const izSr = E.sestaviIzstopKluba(rsL, { display_name: 'Nikola', team_name: 'Junaci', igralci: [{ ime: 'Nikola Jovanović', klub: 'FK Sloga' }] })
  const pushSr = E.sestaviPushOpomnik(rsL, rok)
  const tSr = E.sestaviTedenskiPregled(rsL, {
    display_name: 'Nikola', ekipa: 'Junaci', krog: 5, tocke: 2.5, mesto: 3, mesto_prej: 5, ekip: 12,
    povprecje: 30, najvec: 60, kapetan: 'Nikola Jovanović', kapetan_tocke: 3, najboljsi: null, najboljsi_tocke: null,
  })
  preveri('e-pošta: popravek pozicije, izstop, push in tedenski pregled sr',
    popSr.html.includes('(sada vezni)') && izSr.naslov.includes('istupio je iz lige') &&
      pushSr.naslov.includes('još nemaš tim') && tSr.naslov.includes('2,5 bodova') && tSr.html.includes('3 boda') &&
      !slovenskoSr.test(popSr.naslov + popSr.html + izSr.naslov + izSr.html + pushSr.besedilo + tSr.naslov + tSr.html), tSr.naslov)
  preveri('e-pošta: sr brez pomišljajev',
    [oSr, oSr2, zSr, bSr, pSr, popSr, izSr, tSr].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))) &&
      !pomisljaj.test(pushSr.naslov + pushSr.besedilo))
  // Avtentikacijska pošta: srbska veja predlog in zadev brez slovenščine in pomišljajev.
  const vejeSr = ['confirmation', 'magic_link', 'recovery'].map((ime) => {
    const h = readFileSync(new URL(`../supabase/templates/${ime}.html`, import.meta.url), 'utf8')
    const m = h.match(/"sr" }}([\s\S]*?){{ else/)
    return m ? m[1].replace(/href="[^"]*"/g, '') : null
  })
  const zadeveSr = [...readFileSync(new URL('../scripts/hetzner/docker-compose.slff.yml', import.meta.url), 'utf8')
    .matchAll(/"sr" }}([^{]*){{/g)].map((m) => m[1])
  preveri('e-pošta: avtentikacijske predloge in zadeve sr',
    vejeSr.every((v) => v && !slovenskoSr.test(v) && !pomisljaj.test(v)) && zadeveSr.length === 3 &&
      zadeveSr.every((z) => !slovenskoSr.test(z) && !pomisljaj.test(z)), zadeveSr.join(' | '))

  // Romunija: isti maili v romunščini, rok po bukareško, razlog preveden.
  const roL = { slug: 'ro-if-liga4', oznaka: 'Liga 4 IF', ime: 'Liga a IV-a Ilfov', drzava: 'RO' }
  // Slovenščina, pozdravi drugih jezikov ali ş/ţ s cedilo v romunskem mailu.
  const slovenskoRo = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestavi |Ahoj|Bok|Szia|Servus|Zdravo|[şţŞŢ]/
  const oRo = E.sestaviOpomnik(roL, { display_name: 'Andrei Popescu', brez_ekipe: true })
  const oRo2 = E.sestaviOpomnik(roL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik ro',
    oRo.naslov.includes('încă nu ai echipă') && oRo.html.includes('Salut, Andrei!') && oRo2.html.includes('Salut!') &&
      oRo2.naslov.includes('completează-ți echipa') && oRo.odjava === 'https://slff.eu/reminders?t=ro-if-liga4' &&
      oRo.html.includes('https://slff.eu/my-team?t=ro-if-liga4') && oRo.html.includes('Nu mai vreau mementouri') &&
      !slovenskoRo.test(oRo.naslov + oRo.html + oRo2.naslov + oRo2.html), oRo.naslov)
  const zRo = E.sestaviOpozorilo(roL, { display_name: 'Andrei', team_name: 'Eroii de Duminică', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo ro (rok po bukareško, razlog preveden)',
    zRo.naslov.includes('etapa 5') && zRo.html.includes('sâmbătă') && zRo.html.includes('11:00') &&
      zRo.html.includes('De la clubul Šenčur ai 4 jucători') && !slovenskoRo.test(zRo.naslov + zRo.html), zRo.naslov)
  preveri('e-pošta: rok ro v časovnem pasu lige (ura pred Ljubljano)', E.izpisRoka(rok, roL).includes('11:00'), E.izpisRoka(rok, roL))
  const prevodiRo = razlogi.map((r) => E.prevediRazlog(r, 'ro'))
  const splosenRo = E.prevediRazlog('Neznan razlog.', 'ro')
  preveri(
    'e-pošta: vsi razlogi prevedeni v romunščino',
    prevodiRo.every((p) => p !== splosenRo && !slovenskoRo.test(p) && !pomisljaj.test(p)),
    prevodiRo.find((p) => p === splosenRo || slovenskoRo.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: razlog ro (množina one/few/other)',
    prevodiRo[1] === 'În lot sunt 3 jucători în loc de 15.' && prevodiRo[7] === 'În formația de start sunt 10 jucători în loc de 11.' &&
      E.prevediRazlog('V kadru je 1 igralcev namesto 15.', 'ro') === 'În lot este 1 jucător în loc de 15.' &&
      E.prevediRazlog('V kadru je 20 igralcev namesto 15.', 'ro') === 'În lot sunt 20 de jucători în loc de 15.',
    `${prevodiRo[1]} | ${prevodiRo[7]}`)
  const bRo = E.sestaviOpomnikBrezLige('ro', { display_name: 'Andrei' })
  preveri('e-pošta: brez lige ro v romunščini',
    bRo.naslov.includes('alege-ți liga') && bRo.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bRo.html.includes('Salut, Andrei!') && !slovenskoRo.test(bRo.html.replace(/href="[^"]*"/g, '')))
  const pRo = E.sestaviPoznavalca(roL, { display_name: 'Andrei', obseg: 'klub', klub: 'AS Voința' })
  preveri('e-pošta: poznavalec ro', pRo.html.includes('cunoscător al clubului AS Voința') && pRo.html.includes('/positions?t=ro-if-liga4') && !slovenskoRo.test(pRo.html))
  const popRo = E.sestaviPopravekPozicije(roL, { display_name: 'Andrei', team_name: 'Eroii', igralci: [{ ime: 'Andrei Popescu', pozicija: 'MID' }] })
  const izRo = E.sestaviIzstopKluba(roL, { display_name: 'Andrei', team_name: 'Eroii', igralci: [{ ime: 'Andrei Popescu', klub: 'AS Voința' }] })
  const pushRo = E.sestaviPushOpomnik(roL, rok)
  const tRo = E.sestaviTedenskiPregled(roL, {
    display_name: 'Andrei', ekipa: 'Eroii', krog: 5, tocke: 2.5, mesto: 3, mesto_prej: 5, ekip: 12,
    povprecje: 30, najvec: 60, kapetan: 'Andrei Popescu', kapetan_tocke: 1, najboljsi: 'Vlad Ionescu', najboljsi_tocke: 24,
  })
  preveri('e-pošta: popravek pozicije, izstop, push in tedenski pregled ro',
    popRo.html.includes('(acum mijlocaș)') && izRo.naslov.includes('s-a retras din ligă') &&
      pushRo.naslov.includes('încă nu ai echipă') && tRo.naslov.includes('2,5 puncte') && tRo.html.includes('1 punct') &&
      tRo.html.includes('24 de puncte') &&
      !slovenskoRo.test(popRo.naslov + popRo.html + izRo.naslov + izRo.html + pushRo.besedilo + tRo.naslov + tRo.html), tRo.naslov)
  preveri('e-pošta: ro brez pomišljajev',
    [oRo, oRo2, zRo, bRo, pRo, popRo, izRo, tRo].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))) &&
      !pomisljaj.test(pushRo.naslov + pushRo.besedilo))
  // Avtentikacijska pošta: romunska veja predlog in zadev brez slovenščine in pomišljajev.
  const vejeRo = ['confirmation', 'magic_link', 'recovery'].map((ime) => {
    const h = readFileSync(new URL(`../supabase/templates/${ime}.html`, import.meta.url), 'utf8')
    const m = h.match(/"ro" }}([\s\S]*?){{ else/)
    return m ? m[1].replace(/href="[^"]*"/g, '') : null
  })
  const zadeveRo = [...readFileSync(new URL('../scripts/hetzner/docker-compose.slff.yml', import.meta.url), 'utf8')
    .matchAll(/"ro" }}([^{]*){{/g)].map((m) => m[1])
  preveri('e-pošta: avtentikacijske predloge in zadeve ro',
    vejeRo.every((v) => v && !slovenskoRo.test(v) && !pomisljaj.test(v)) && zadeveRo.length === 3 &&
      zadeveRo.every((z) => !slovenskoRo.test(z) && !pomisljaj.test(z)), zadeveRo.join(' | '))

  // Estonija: isti maili v estonščini, rok po talinsko, razlog preveden.
  const eeL = { slug: 'ee-esiliiga', oznaka: 'Esiliiga', ime: 'Esiliiga', drzava: 'EE' }
  // Slovenščina ali pozdravi drugih jezikov v estonskem mailu.
  const slovenskoEt = /Živjo|ekip[aeo]|krog|točk|opomnik|igralc|kader|namesto|sestavi |Ahoj|Bok|Szia|Servus|Zdravo|Salut/
  const oEt = E.sestaviOpomnik(eeL, { display_name: 'Martin Tamm', brez_ekipe: true })
  const oEt2 = E.sestaviOpomnik(eeL, { display_name: null, brez_ekipe: false })
  preveri('e-pošta: opomnik et',
    oEt.naslov.includes('sul pole veel järgmiseks vooruks meeskonda') && oEt.html.includes('Tere, Martin!') && oEt2.html.includes('Tere!') &&
      oEt2.naslov.includes('täienda oma meeskonda') && oEt.odjava === 'https://slff.eu/reminders?t=ee-esiliiga' &&
      oEt.html.includes('https://slff.eu/my-team?t=ee-esiliiga') && oEt.html.includes('Ma ei soovi enam meeldetuletusi') &&
      !slovenskoEt.test(oEt.naslov + oEt.html + oEt2.naslov + oEt2.html), oEt.naslov)
  const zEt = E.sestaviOpozorilo(eeL, { display_name: 'Martin', team_name: 'Saaremaa Hülged', round_number: 5, deadline_at: rok, razlog })
  preveri('e-pošta: opozorilo et (rok po talinsko, razlog preveden)',
    zEt.naslov.includes('5. voorus') && zEt.html.includes('11:00') &&
      zEt.html.includes('Klubist Šenčur on sul 4 mängijat') && !slovenskoEt.test(zEt.naslov + zEt.html), zEt.naslov)
  preveri('e-pošta: rok et v časovnem pasu lige (ura pred Ljubljano)', E.izpisRoka(rok, eeL).includes('11:00'), E.izpisRoka(rok, eeL))
  const prevodiEt = razlogi.map((r) => E.prevediRazlog(r, 'et'))
  const splosenEt = E.prevediRazlog('Neznan razlog.', 'et')
  preveri(
    'e-pošta: vsi razlogi prevedeni v estonščino',
    prevodiEt.every((p) => p !== splosenEt && !slovenskoEt.test(p) && !pomisljaj.test(p)),
    prevodiEt.find((p) => p === splosenEt || slovenskoEt.test(p) || pomisljaj.test(p)),
  )
  preveri('e-pošta: razlog et (množina one/other)',
    prevodiEt[1] === 'Koosseisus on 3 mängijat 15 asemel.' && prevodiEt[7] === 'Algkoosseisus on 10 mängijat 11 asemel.' &&
      E.prevediRazlog('V kadru je 1 igralcev namesto 15.', 'et') === 'Koosseisus on 1 mängija 15 asemel.',
    `${prevodiEt[1]} | ${prevodiEt[7]}`)
  const bEt = E.sestaviOpomnikBrezLige('et', { display_name: 'Martin' })
  preveri('e-pošta: brez lige et v estonščini',
    bEt.naslov.includes('vali oma liiga') && bEt.html.includes('href="https://slff.eu/my-team?sestavi=1"') &&
      bEt.html.includes('Tere, Martin!') && !slovenskoEt.test(bEt.html.replace(/href="[^"]*"/g, '')))
  const pEt = E.sestaviPoznavalca(eeL, { display_name: 'Martin', obseg: 'klub', klub: 'JK Kalev' })
  preveri('e-pošta: poznavalec et', pEt.html.includes('klubi <strong>JK Kalev</strong> asjatundja') && pEt.html.includes('/positions?t=ee-esiliiga') && !slovenskoEt.test(pEt.html))
  const popEt = E.sestaviPopravekPozicije(eeL, { display_name: 'Martin', team_name: 'Hülged', igralci: [{ ime: 'Martin Tamm', pozicija: 'MID' }] })
  const izEt = E.sestaviIzstopKluba(eeL, { display_name: 'Martin', team_name: 'Hülged', igralci: [{ ime: 'Martin Tamm', klub: 'JK Kalev' }] })
  const pushEt = E.sestaviPushOpomnik(eeL, rok)
  const tEt = E.sestaviTedenskiPregled(eeL, {
    display_name: 'Martin', ekipa: 'Hülged', krog: 5, tocke: 2.5, mesto: 3, mesto_prej: 5, ekip: 12,
    povprecje: 30, najvec: 60, kapetan: 'Martin Tamm', kapetan_tocke: 1, najboljsi: 'Rasmus Saar', najboljsi_tocke: 24,
  })
  preveri('e-pošta: popravek pozicije, izstop, push in tedenski pregled et',
    popEt.html.includes('(nüüd poolkaitsja)') && izEt.naslov.includes('lahkus liigast') &&
      pushEt.naslov.includes('sul pole veel meeskonda') && tEt.naslov.includes('2,5 punkti') && tEt.html.includes('1 punkt.') &&
      tEt.html.includes('24 punkti') &&
      !slovenskoEt.test(popEt.naslov + popEt.html + izEt.naslov + izEt.html + pushEt.besedilo + tEt.naslov + tEt.html), tEt.naslov)
  preveri('e-pošta: et brez pomišljajev',
    [oEt, oEt2, zEt, bEt, pEt, popEt, izEt, tEt].every((m) => !pomisljaj.test(m.naslov + brezNoge(m.html))) &&
      !pomisljaj.test(pushEt.naslov + pushEt.besedilo))
  // Avtentikacijska pošta: estonska veja predlog in zadev brez slovenščine in pomišljajev.
  const vejeEt = ['confirmation', 'magic_link', 'recovery'].map((ime) => {
    const h = readFileSync(new URL(`../supabase/templates/${ime}.html`, import.meta.url), 'utf8')
    const m = h.match(/"et" }}([\s\S]*?){{ else/)
    return m ? m[1].replace(/href="[^"]*"/g, '') : null
  })
  const zadeveEt = [...readFileSync(new URL('../scripts/hetzner/docker-compose.slff.yml', import.meta.url), 'utf8')
    .matchAll(/"et" }}([^{]*){{/g)].map((m) => m[1])
  preveri('e-pošta: avtentikacijske predloge in zadeve et',
    vejeEt.every((v) => v && !slovenskoEt.test(v) && !pomisljaj.test(v)) && zadeveEt.length === 3 &&
      zadeveEt.every((z) => !slovenskoEt.test(z) && !pomisljaj.test(z)), zadeveEt.join(' | '))

  // Tedenski pregled "Tvoj krog".
  const krog = {
    display_name: 'Ana Novak', ekipa: 'Kranjski <orli>', krog: 5, tocke: 48, mesto: 3, mesto_prej: 5, ekip: 24,
    povprecje: 37.4, najvec: 61, kapetan: 'Janez Kos', kapetan_tocke: 12, najboljsi: 'Miha Zupan', najboljsi_tocke: 9,
  }
  const tSi = E.sestaviTedenskiPregled(si, krog)
  preveri('e-pošta: tedenski pregled sl',
    tSi.naslov === 'SLFF Člani — 5. krog: 48 točk, 3. mesto (+2)' && tSi.html.includes('Kranjski &lt;orli&gt;') &&
      tSi.html.includes('(prej 5.)') && tSi.html.includes('Kapetan Janez Kos: 12 točk') &&
      tSi.html.includes('Miha Zupan (9 točk)') && !tSi.html.includes('Največ točk v vsej ligi') &&
      tSi.odjava === 'https://slff.eu/reminders?t=clani', tSi.naslov)
  const tSi1 = E.sestaviTedenskiPregled(si, { ...krog, tocke: 61, mesto: 1, mesto_prej: null, kapetan: 'Miha Zupan', kapetan_tocke: 2 })
  preveri('e-pošta: tedenski pregled sl, prvi v krogu, brez prejšnjega mesta',
    tSi1.naslov.endsWith('61 točk, 1. mesto') && tSi1.html.includes('Največ točk v vsej ligi') &&
      !tSi1.html.includes('prej') && tSi1.html.includes('Kapetan Miha Zupan: 2 točki') && !tSi1.html.includes('Najboljši v ekipi'),
    tSi1.naslov)
  const tSk = E.sestaviTedenskiPregled(sk, { ...krog, tocke: 3, mesto: 7 })
  preveri('e-pošta: tedenski pregled sk',
    tSk.naslov === 'SLFF IV. liga: 5. kolo, 3 body, 7. miesto (-2)' && tSk.html.includes('Ahoj, Ana!') &&
      !slovensko.test(tSk.naslov + tSk.html.replace(/href="[^"]*"/g, '')), tSk.naslov)
  const tHr = E.sestaviTedenskiPregled(hrL, { ...krog, tocke: 22 })
  preveri('e-pošta: tedenski pregled hr',
    tHr.naslov === 'SLFF 1. MNL: 5. kolo, 22 boda, 3. mjesto (+2)' && tHr.html.includes('Bok, Ana!') &&
      !slovenskoHr.test(tHr.naslov + tHr.html.replace(/href="[^"]*"/g, '')) &&
      !pomisljaj.test(tHr.naslov + brezNoge(tHr.html)), tHr.naslov)
}

// --- kontumacije: Ptuj, Murska Sobota, Lendava, Maribor ---------------------
// Vsi vzorci so prave strani s tekmo brez borbe (scripts/vzorci/). Pri vsaki
// zvezi mora biti označena natanko ta tekma in nobena odigrana.
{
  const beri = (f) => readFileSync(new URL(`./vzorci/${f}`, import.meta.url), 'utf8')
  const { kontumacijeIzKroga } = await import('./zapisnik-pomurje.mjs')
  const primeri = [
    ['mnzpt', 'zapisniki-ptuj-mladina2022-kolo12.html', 'Podvinci:Cirkulane-Apače'],
    ['mnzms', 'zapisniki-ms-liga115-sezona2025-kolo20.html', 'Tromejnik:Bakovci'],
    ['mnzle', 'zapisniki-lendava-mnl2425-krog3.html', 'Hotiza:Nafta veterani'],
  ]
  for (const [vir, f, par] of primeri) {
    const k = kontumacijeIzKroga(beri(f), { vir })
    preveri(`kontumacija ${vir}: prazna kartica 3:0 brez sodnika in postav`,
      k.length === 1 && `${k[0].domaci}:${k[0].gostje}` === par, JSON.stringify(k))
    // Ista stran ima tudi odigrane tekme; te ostanejo zapisniki.
    preveri(`kontumacija ${vir}: ni zapisnik, odigrane tekme so`,
      viraZa({ source: vir }).zapisnikiIzKroga(beri(f), { vir }).every((z) => `${z.domaci.ime}:${z.gostje.ime}` !== par))
  }
  for (const [vir, f] of [['mnzpt', 'zapisniki-ptuj-liga3-kolo1.html'], ['mnzpt', 'zapisniki-ptuj-liga3-kolo2.html'],
    ['mnzms', 'zapisniki-ms-liga113-kolo2.html'], ['mnzle', 'zapisniki-lendava-pnl-krog1.html']]) {
    preveri(`kontumacija ${vir}: v odigranem krogu (${f}) je ni`, kontumacijeIzKroga(beri(f), { vir }).length === 0)
  }

  // Uvoz razporeda prebere le kroge, ki so že na vrsti.
  const pt = viraZa({ source: 'mnzpt' })
  const prebrani = []
  const najdene = await pt.kontumacije('2022:71', async (url, ime, zadnji) => {
    prebrani.push({ url, ime, zadnji })
    return beri('zapisniki-ptuj-mladina2022-kolo12.html')
  }, [
    { stevilka: 12, tekme: [{ datum: '2023-05-07' }, { datum: '2023-05-10' }] },
    { stevilka: 13, tekme: [{ datum: '2099-05-14' }] },
  ], '2023-06-01')
  preveri('kontumacija: prihodnji krog se ne bere', prebrani.length === 1 && prebrani[0].url.includes('kolo=12') && prebrani[0].zadnji === '2023-05-10',
    JSON.stringify(prebrani))
  preveri('kontumacija: najdena nosi krog razporeda', najdene.length === 1 && najdene[0].krog === 12, JSON.stringify(najdene))
  preveri('kontumacija: ime v predpomnilniku je isto kot pri uvozu zapisnikov', prebrani[0].ime === 'mnzpt-2022_71-k12.html', prebrani[0].ime)

  // Maribor: izid brez polčasa IN prazen kraj. Tekma brez kraja in ure je
  // besedilnemu razčlenjevalniku izginila iz razporeda, zato beremo HTML.
  const mb = viraZa({ source: 'mnzmb' })
  const kont = (k) => k.flatMap((r) => r.tekme.filter((t) => t.kontumacija).map((t) => `${r.stevilka}:${t.domaci}:${t.gostje}`))
  {
    const h = beri('tekme-maribor-2clanska-2526.html')
    const k = mb.razcleniRazpored(mb.vBesedilo(h), h)
    preveri('kontumacija mnzmb: 2. članska ima dve, tudi brez kraja in ure',
      JSON.stringify(kont(k)) === JSON.stringify(['19:Dravograd:VOP Prepolje', '20:TAB Akumulator:Duplek']), kont(k).join(' | '))
    preveri('razpored mnzmb: HTML prebere vseh 132 tekem (besedilo le 130)',
      k.reduce((n, r) => n + r.tekme.length, 0) === 132 && mb.razcleniRazpored(mb.vBesedilo(h)).reduce((n, r) => n + r.tekme.length, 0) === 130)
  }
  {
    const h = beri('tekme-maribor-u19-2526.html')
    const k = mb.razcleniRazpored(mb.vBesedilo(h), h)
    const vse = kont(k)
    preveri('kontumacija mnzmb: U19 ima tri, tudi s poznano uro',
      vse.length === 3 && vse.includes('15:Kovinar Maribor:Starše – NŠ Dravsko polje') && vse.includes('13:Pobrežje:Miklavž'), vse.join(' | '))
    // Pohorje : Jarenina Pesnica 3 : 0 brez polčasa, a s krajem: odigrana in
    // registrirana za zeleno mizo, zapisnik ima polni postavi.
    preveri('kontumacija mnzmb: zelena miza s krajem ni kontumacija',
      !vse.some((x) => x.includes('Pohorje:Jarenina')))
  }
  {
    const h = beri('tekme-maribor-1clanska.html')
    const zHtml = mb.razcleniRazpored(mb.vBesedilo(h), h)
    const brez = mb.razcleniRazpored(mb.vBesedilo(h))
    preveri('razpored mnzmb: HTML in besedilo se ujemata, kjer kontumacij ni',
      JSON.stringify(zHtml) === JSON.stringify(brez) && kont(zHtml).length === 0)
  }
}

// --- prenos s ponovitvami (scripts/prenos.mjs) -------------------------------
// Brez omrežja: lokalni strežnik, ki najprej odpove, in ponarejen fetch za DNS.
{
  const { prenesiSPonovitvami, jePrehodnaNapaka, retryAfterMs, pozabiPadle } = await import('./prenos.mjs')
  const { createServer } = await import('node:http')
  const hitro = { zamiki: [5, 5, 5], log: () => {} }

  let klicev = 0
  const streznik = createServer((req, res) => {
    klicev++
    if (req.url === '/nihaj' && klicev < 3) { res.writeHead(503); return res.end('pocakaj') }
    if (req.url === '/omejeno' && klicev === 1) { res.writeHead(429, { 'Retry-After': '0' }); return res.end() }
    if (req.url === '/ni') { res.writeHead(404); return res.end('ni') }
    if (req.url === '/pade') { res.writeHead(500); return res.end() }
    if (req.url === '/visi') return // nikoli ne odgovori
    res.writeHead(200); res.end('razpored')
  })
  await new Promise((r) => streznik.listen(0, '127.0.0.1', r))
  const osnova = `http://127.0.0.1:${streznik.address().port}`

  klicev = 0
  let o = await prenesiSPonovitvami(`${osnova}/nihaj`, hitro)
  preveri('prenos: 503 ponovi in uspe', o.ok && (await o.text()) === 'razpored' && klicev === 3, String(klicev))
  klicev = 0
  o = await prenesiSPonovitvami(`${osnova}/omejeno`, hitro)
  preveri('prenos: 429 z Retry-After ponovi', o.ok && klicev === 2, String(klicev))
  klicev = 0
  o = await prenesiSPonovitvami(`${osnova}/ni`, hitro)
  preveri('prenos: 404 se ne ponavlja', o.status === 404 && klicev === 1, String(klicev))
  klicev = 0
  o = await prenesiSPonovitvami(`${osnova}/pade`, hitro)
  preveri('prenos: trajni 500 vrne zadnji odgovor po 4 poskusih', o.status === 500 && klicev === 4, String(klicev))
  klicev = 0
  o = await prenesiSPonovitvami(`${osnova}/pade`, hitro)
  preveri('prenos: padel gostitelj dobi le en poskus', o.status === 500 && klicev === 1, String(klicev))
  klicev = 0
  o = await prenesiSPonovitvami(`${osnova}/ni`, hitro)
  klicev = 0
  await prenesiSPonovitvami(`${osnova}/pade`, hitro)
  preveri('prenos: uspeh gostitelja vrne vse poskuse', klicev === 4, String(klicev))
  pozabiPadle()
  klicev = 0
  const vrstice = []
  let napakaCasa = null
  try {
    await prenesiSPonovitvami(`${osnova}/visi`, { zamiki: [5], casovnaOmejitevMs: 100, log: (v) => vrstice.push(v) })
  } catch (e) { napakaCasa = e }
  preveri('prenos: časovna omejitev se ponovi, nato vrže', napakaCasa?.name === 'TimeoutError' && klicev === 2 && vrstice.length === 1,
    `${napakaCasa?.name} ${klicev} ${vrstice.length}`)
  streznik.closeAllConnections?.()
  await new Promise((r) => streznik.close(r))

  // DNS (EAI_AGAIN), kot je podrl ng-primorska: undici vrže TypeError s kodo v `cause`.
  const dns = () => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('getaddrinfo EAI_AGAIN mnzgorica.si'), { code: 'EAI_AGAIN' }) })
  let poskusi = 0
  const glave = []
  const ponarejen = async (_url, init) => {
    poskusi++
    glave.push(init?.headers?.['User-Agent'])
    if (poskusi < 3) throw dns()
    return new Response('ok')
  }
  const log = []
  o = await prenesiSPonovitvami('https://mnzgorica.si/x', { ...hitro, fetchFn: ponarejen, glave: { 'User-Agent': 'SLFF' }, log: (v) => log.push(v) })
  preveri('prenos: EAI_AGAIN ponovi, glave ostanejo', o.ok && poskusi === 3 && glave.every((g) => g === 'SLFF'), `${poskusi} ${glave}`)
  preveri('prenos: ponovitev javi v eni vrstici', log.length === 2 && log[0].includes('EAI_AGAIN') && log[0].includes('ponovim'), log.join(' | '))
  poskusi = 0
  let vrzena = null
  try { await prenesiSPonovitvami('https://x', { ...hitro, fetchFn: async () => { poskusi++; throw dns() } }) } catch (e) { vrzena = e }
  preveri('prenos: trajna omrežna napaka po 4 poskusih vrže izvirno', vrzena?.cause?.code === 'EAI_AGAIN' && poskusi === 4, String(poskusi))
  pozabiPadle()
  poskusi = 0
  vrzena = null
  try { await prenesiSPonovitvami('https://x', { ...hitro, fetchFn: async () => { poskusi++; throw new TypeError('Invalid URL') } }) } catch (e) { vrzena = e }
  preveri('prenos: programska napaka se ne ponavlja', vrzena && poskusi === 1, String(poskusi))
  preveri('prenos: prepozna UND_ERR in ECONNRESET',
    jePrehodnaNapaka({ cause: { code: 'UND_ERR_SOCKET' } }) && jePrehodnaNapaka({ code: 'ECONNRESET' }) && !jePrehodnaNapaka(new Error('x')))
  preveri('prenos: Retry-After v sekundah in kot datum',
    retryAfterMs('3') === 3000 && retryAfterMs(new Date(10000).toUTCString(), 4000) === 6000 && retryAfterMs(null) === null)

  // Premor vira (Sportnet `premorMs`) velja pred vsakim poskusom.
  poskusi = 0
  const zacetek = Date.now()
  await prenesiSPonovitvami('https://x', { zamiki: [1], premorMs: 60, log: () => {}, fetchFn: async () => (++poskusi < 2 ? new Response('', { status: 502 }) : new Response('ok')) })
  preveri('prenos: premor vira pred vsakim poskusom', Date.now() - zacetek >= 115 && poskusi === 2, `${Date.now() - zacetek} ms`)
}

// Vrsta avstrijskih uvozov: kaj naredi tik.
{
  const { odloci, preberiVrsto } = await import('./vrsta-avstrije.mjs')
  const vrsta = preberiVrsto('at-a 1,2\nat-b 3\nat-c 4+5\nat-d 6\n')
  const z = (slug, conclusion, cas, status = 'completed') => ({ slug, status, conclusion, createdAt: cas, updatedAt: cas })
  const od = '2026-10-10T10:00:00Z'
  const lige = new Map([['at-a', true], ['at-b', false], ['at-c', false], ['at-d', false]])
  let o = odloci({ vrsta, lige, od, zagoni: [] })
  preveri('vrsta: brez zagonov zažene prvo nevklopljeno', o.zazeni?.slug === 'at-b' && o.zazeni.arhiv === '3' && !o.zazeni.ponovitev, JSON.stringify(o.zazeni))
  o = odloci({ vrsta, lige, od, zagoni: [z('at-b', null, '2026-10-10T10:05:00Z', 'in_progress')] })
  preveri('vrsta: med uvozom ne zažene ničesar', o.tece && o.zazeni === null && !o.koncano)
  o = odloci({ vrsta, lige, od, zagoni: [z('at-b', 'failure', '2026-10-10T09:00:00Z')] })
  preveri('vrsta: en padec = ponovitev', o.zazeni?.slug === 'at-b' && o.zazeni.ponovitev, JSON.stringify(o.zazeni))
  o = odloci({ vrsta, lige, od, zagoni: [z('at-b', 'failure', '2026-10-10T09:00:00Z'), z('at-b', 'cancelled', '2026-10-10T10:05:00Z')] })
  preveri('vrsta: dva padca = preskok in enkratna prijava', o.zazeni?.slug === 'at-c' && o.zazeni.arhiv === '4+5' && o.javi.length === 1, JSON.stringify(o))
  o = odloci({ vrsta, lige, od: '2026-10-10T11:00:00Z', zagoni: [z('at-b', 'failure', '2026-10-10T09:00:00Z'), z('at-b', 'failure', '2026-10-10T10:05:00Z')] })
  preveri('vrsta: star preskok se ne javi znova', o.zazeni?.slug === 'at-c' && o.javi.length === 0)
  o = odloci({ vrsta, lige, od, zagoni: [z('at-b', 'failure', '2026-10-10T09:00:00Z'), z('at-b', 'success', '2026-10-10T10:05:00Z')] })
  preveri('vrsta: nov uspeh = vklop, naprej gre naslednja', o.vklopi.join() === 'at-b' && o.novi.join() === 'at-b' && o.zazeni?.slug === 'at-c', JSON.stringify(o))
  o = odloci({ vrsta, lige, od, zagoni: [z('at-b', 'success', '2026-10-10T09:00:00Z')] })
  preveri('vrsta: star uspeh se vklopi tiho (zavrnitev se ne javi znova)', o.vklopi.join() === 'at-b' && o.novi.length === 0 && o.zazeni?.slug === 'at-c')
  const vse = new Map([['at-a', true], ['at-b', true], ['at-c', true], ['at-d', false]])
  const padca = [z('at-d', 'failure', '2026-10-10T08:00:00Z'), z('at-d', 'failure', '2026-10-10T09:00:00Z')]
  o = odloci({ vrsta, lige: vse, od, zagoni: padca })
  preveri('vrsta: vse vklopljene ali preskočene = konec', o.koncano && o.zazeni === null)
  o = odloci({ vrsta, lige, od, zagoni: [z('at-x', null, '2026-10-10T10:05:00Z', 'queued')] })
  preveri('vrsta: čaka tudi na uvoz at- lige zunaj seznama', o.tece && o.zazeni === null)

  {
    const vz = ['at-k1', 'at-k2', 'at-s1', 'at-t1', 'at-bl', 'at-b1'].map((slug, i) => ({ slug, arhiv: String(i + 1) }))
    const nic = new Map(vz.map((l) => [l.slug, false]))
    const zveze = new Map([['at-k1', 'kfv'], ['at-k2', 'kfv'], ['at-s1', 'stfv'], ['at-t1', 'tfv'], ['at-bl', 'oefb'], ['at-b1', 'bfv']])
    const imena = (o) => o.zazeniVse.map((l) => l.slug).join()
    let v = odloci({ vrsta: vz, lige: nic, od, zveze, zagoni: [] })
    preveri('vrsta: privzeto po dva iz dežele', imena(v) === 'at-k1,at-k2,at-s1,at-t1', imena(v))
    v = odloci({ vrsta: vz, lige: nic, od, zveze, zagoni: [z('at-k1', null, '2026-10-10T10:05:00Z', 'in_progress')] })
    preveri('vrsta: tekoči uvoz dežele zasede eno od dveh mest', imena(v) === 'at-k2,at-s1,at-t1', imena(v))
    const sa = [{ slug: 'at-k1', arhiv: '7,8' }, { slug: 'at-k2', arhiv: '9+8' }, { slug: 'at-s1', arhiv: '5' }]
    v = odloci({ vrsta: sa, lige: nic, od, zveze, zagoni: [] })
    preveri('vrsta: skupen arhiv ne teče hkrati', imena(v) === 'at-k1,at-s1', imena(v))
    v = odloci({ vrsta: sa, lige: nic, od, zveze, zagoni: [z('at-k1', null, '2026-10-10T10:05:00Z', 'in_progress')] })
    preveri('vrsta: skupen arhiv čaka na tekoči uvoz', imena(v) === 'at-s1', imena(v))
    v = odloci({ vrsta: vz, lige: nic, od, zveze, zagoni: [], najvec: 3, naZvezo: 1 })
    preveri('vrsta: vzporedno 3 iz različnih dežel', imena(v) === 'at-k1,at-s1,at-t1', imena(v))
    v = odloci({ vrsta: vz, lige: nic, od, zveze, zagoni: [z('at-k1', null, '2026-10-10T10:05:00Z', 'in_progress')], najvec: 3, naZvezo: 1 })
    preveri('vrsta: med uvozom dežele še dva drugih dežel', imena(v) === 'at-s1,at-t1', imena(v))
    const dz = [{ slug: 'at-bl', arhiv: '1' }, ...vz.filter((l) => l.slug !== 'at-bl')]
    v = odloci({ vrsta: dz, lige: nic, od, zveze, zagoni: [] })
    preveri('vrsta: državna liga teče sama', imena(v) === 'at-bl', imena(v))
    v = odloci({ vrsta: dz, lige: nic, od, zveze, zagoni: [z('at-s1', null, '2026-10-10T10:05:00Z', 'in_progress')] })
    preveri('vrsta: državna na vrsti zadrži ostale', imena(v) === '', imena(v))
  }}

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
