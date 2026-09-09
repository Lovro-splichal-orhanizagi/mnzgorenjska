// Preveri, da se vse strani izrišejo brez napake, in da točkovanje
// natanko sledi pravilom lige. Brez brskalnika in brez baze.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AuthProvider } from '../src/lib/useAuth'
import { TekmovanjeProvider, uskladiTekmovanje } from '../src/lib/tekmovanje'
import Navbar from '../src/components/Navbar'
import RokKroga from '../src/components/RokKroga'
import Domov from '../src/pages/Domov'
import Igralci from '../src/pages/Igralci'
import Lestvica from '../src/pages/Lestvica'
import Rezultati from '../src/pages/Rezultati'
import Tekma from '../src/pages/Tekma'
import Prijava from '../src/pages/Prijava'
import MojaEkipa from '../src/pages/MojaEkipa'
import Glasovanje from '../src/pages/Glasovanje'
import Pozicije from '../src/pages/Pozicije'
import Odsotnosti from '../src/pages/Odsotnosti'
import Administracija from '../src/pages/Administracija'
import {
  preveriEkipo,
  lahkoZacne,
  zakajNeGre,
  VELIKOST_EKIPE,
  PRORACUN,
  POZICIJE,
  KAPETAN_MNOZITELJ,
} from '../src/lib/pravila'
import { tockeZaNastop } from '../src/lib/tockovanje'
import { sestejOdKroga } from '../src/lib/lestvica'
import { parsirajZapisnik, nastopi } from './zapisnik.mjs'
import { poZvezah, ustreza } from '../src/components/IzbirnikLige'
import { virPodatkov } from '../src/components/VirPodatkov'
import { viraZa, znaniViri } from './viri/index.mjs'
import { readFileSync } from 'node:fs'

let napak = 0
const preveri = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
  if (!cond) napak++
}

// --- izris strani ----------------------------------------------------------
const strani = [
  ['Navbar', Navbar, '/'],
  ['Domov', Domov, '/'],
  ['Moja ekipa', MojaEkipa, '/moja-ekipa'],
  ['Odsotnosti', Odsotnosti, '/odsotnosti'],
  ['Asistence', Glasovanje, '/glasovanje'],
  ['Pozicije', Pozicije, '/pozicije'],
  ['Igralci', Igralci, '/igralci'],
  ['Lestvica', Lestvica, '/lestvica'],
  ['Rezultati', Rezultati, '/rezultati'],
  ['Tekma', Tekma, '/tekma/1'],
  ['Prijava', Prijava, '/prijava'],
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
  'clean sheet vratarja = 4',
  t({ cleanSheet: true }, 'GK') === 2 + 4,
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

// sestavljen primer: branilec, 90 min, gol, clean sheet, rumeni karton
preveri(
  'sestavljen primer: 2+6+4-1 = 11',
  t({ goli: 1, cleanSheet: true, rumeni: 1 }, 'DEF') === 11,
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
    preveri('zapisnik Kranj: datum', z.datum === '2026-09-05', String(z.datum))
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
    // Ljubljana pise letnico s stirimi stevkami — "Sezona 2026/2027",
    // "05.09.2026" — in v meniju nasteje vse sezone od 2006/07 naprej. Stara
    // izraza sta zajela prvo vrstico z letnico kjerkoli na strani in ji
    // odgrizla zadnji dve stevki: sezona "2026/20", datum "2020-09-05".
    // Cel arhiv se je uvozil v izmisljeno sezono z desetletje starimi datumi.
    preveri('zapisnik LJ: sezona ni iz menija', z.sezona === '2026/27', String(z.sezona))
    preveri('zapisnik LJ: datum s stirimestno letnico', z.datum === '2026-09-05', String(z.datum))
    const n = nastopi(z)
    preveri('zapisnik LJ: nastopi za obe ekipi', (n?.length ?? 0) >= 22, String(n?.length))
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
  preveri('vir: zveza brez naslova se navede brez povezave',
    virPodatkov(lige[0])?.url === null && virPodatkov(lige[0])?.ime === 'MNZ Gorenjska',
    JSON.stringify(virPodatkov(lige[0])))
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

  // MNZ Ljubljana zapisnikov o registracijah ne objavlja; uvoz naj to pove,
  // namesto da porocca "0 zapisnikov", kar je videti kot okvara.
  preveri('viri: mnzlj nima registracij', lj.imaRegistracije === false, String(lj.imaRegistracije))
  preveri('viri: mnzg ima registracije', gor.imaRegistracije !== false, String(gor.imaRegistracije))

  let padlo = false
  try { viraZa({ source: 'ni-tak-vir', slug: 'x' }) } catch { padlo = true }
  preveri('viri: neznan vir pade takoj', padlo)
}

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
