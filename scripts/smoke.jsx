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
import { poZvezah, ustreza, pokaziZvezo } from '../src/components/IzbirnikLige'
import { virPodatkov, imeZveze } from '../src/components/VirPodatkov'
import { viraZa, znaniViri } from './viri/index.mjs'
import { caka, brezAsistencePotrjeno, PRAG_ASISTENCE_PRIVZETO } from '../src/components/GolZaGlasovanje'
import { adaptivniPrag } from '../src/pages/Pozicije'
import { razcleniRazpored, datum, sezonaIz } from './razpored.mjs'
import { vseVrstice } from './strani.mjs'
import { premakniProti, NAJVECJI_TEDENSKI_PREMIK } from './premik-cene.mjs'
import { oceniPripravljenost, najcenejsiKader } from '../src/lib/pripravljenost'
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
  preveri('premik: premik sidra ohrani odmik 3.0 tudi pri decimalni ceni',
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
  const obicajni = ovrednoti([], { neuspesen: 1 })
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
  const zacetne = ovrednoti([], { zgodovina })
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
    readFileSync(new URL(`../scripts/vzorci/${ime}`, import.meta.url), 'utf8').split(/\r?\n/)

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
  }

  {
    const k = razcleniRazpored(vrstice('razpored-celje-1902.txt'))
    preveri('razpored Celje: 18 krogov', k.length === 18, String(k.length))
    preveri('razpored Celje: 10 klubov', klubi(k).size === 10, String(klubi(k).size))
    preveri('razpored Celje: vsak krog 5 tekem',
      k.every((r) => r.tekme.length === 5), k.map((r) => r.tekme.length).join(','))
  }

  preveri('razpored: datum z dvomestno letnico', datum('29.08.26') === '2026-08-29', datum('29.08.26'))
  preveri('razpored: datum s stirimestno letnico', datum('29.08.2026') === '2026-08-29', datum('29.08.2026'))
  preveri('razpored: sezona iz avgusta', sezonaIz('2026-08-29') === '2026/27', sezonaIz('2026-08-29'))
  preveri('razpored: sezona iz marca', sezonaIz('2027-03-13') === '2026/27', sezonaIz('2027-03-13'))
}

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
