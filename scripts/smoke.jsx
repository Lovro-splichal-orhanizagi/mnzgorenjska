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
import { parsirajZapisnik, nastopi } from './zapisnik.mjs'
import { poZvezah, ustreza, pokaziZvezo } from '../src/components/IzbirnikLige'
import { virPodatkov, imeZveze } from '../src/components/VirPodatkov'
import { sestaviVabilo, vabiloMailto } from '../src/lib/vabilo'
import { viraZa, znaniViri } from './viri/index.mjs'
import { caka, brezAsistencePotrjeno, PRAG_ASISTENCE_PRIVZETO } from '../src/components/GolZaGlasovanje'
import { adaptivniPrag } from '../src/pages/Pozicije'
import { razcleniRazpored, datum, sezonaIz } from './razpored.mjs'
import { vseVrstice } from './strani.mjs'
import { premakniProti, NAJVECJI_TEDENSKI_PREMIK } from './premik-cene.mjs'
import { oceniPripravljenost, najcenejsiKader } from '../src/lib/pripravljenost'
import { serijaCen, premik, crta, zadnjiPremiki } from '../src/lib/gibanjeCene'
import { dopolniKader, predlagajKader } from '../src/lib/predlogKadra'
import { velikostImena, velikostEkipe, imeZaPlakat, najboljsiTrije, navijacev, stavekNavijacev, skrajsajIme, prilagodiVelikost, ligaVTozilniku, velikostLige, imeDatoteke } from '../src/lib/plakat'
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
  ['Slovenija', Slovenija, '/slovenija'],
  ['Mini lige', MiniLige, '/mini-lige'],
  ['Vstop v mini ligo', VstopVMiniLigo, '/l/ABCDEF'],
  ['Tuja ekipa', Ekipa, '/ekipa/1'],
  ['Klub', Klub, '/klub/24'],
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
    '/moja-ekipa',
  ],
  ['Zivost skupnosti', ZivostSkupnosti, '/admin'],
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
  // `/rezultati` da SAMO odigrane kroge — ob uvozu 3. SNL Zahod jih je bilo 4
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
  const { kanonicni } = await import('../src/lib/naslov')
  const { default: Opomniki } = await import('../src/pages/Opomniki')
  preveri('prijava: notranja pot je varna', varnaPot('/mini-lige?vstop=AB') === '/mini-lige?vstop=AB')
  preveri(
    'prijava: tuja ali relativna pot ni varna',
    [null, '', 'https://zlo.si', '//zlo.si', '/\\zlo.si', 'mini-lige'].every((p) => varnaPot(p) === null),
  )
  preveri('prijava: povezava kodira pot', povezavaNaPrijavo('/pozicije?t=mladinci') === '/prijava?nazaj=%2Fpozicije%3Ft%3Dmladinci')
  preveri('prijava: napacno geslo po slovensko', napakaPrijave('Invalid login credentials') === 'Napačen e-naslov ali geslo.')
  preveri('prijava: neznana napaka ostane', napakaPrijave('Nekaj cudnega') === 'Nekaj cudnega')
  preveri('naslov: kanonicni obdrzi le ligo', kanonicni('/igralci', '?t=mladinci&klub=3') === 'https://slff.eu/igralci?t=mladinci')
  preveri('naslov: kanonicni brez lige', kanonicni('/', '') === 'https://slff.eu/')
  try {
    const html = renderToString(
      <StaticRouter location="/opomniki">
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
  preveri('prijava: hash ostane', varnaPot('/moja-ekipa#status') === '/moja-ekipa#status')

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
// Slovenski tok se ne sme spremeniti: kdor ni prepoznan kot Slovak, dobi
// Gorenjsko kot doslej, tudi ko je slovaška liga aktivna.
{
  const D = await import('../src/lib/drzava.ts')
  const lige = [
    { slug: 'clani', country_code: 'SI' },
    { slug: 'lj-1-liga', country_code: 'SI' },
    { slug: 'sk-ssfz-4liga', country_code: 'SK' },
  ]
  const brezSk = lige.filter((l) => l.country_code === 'SI')
  preveri('drzava: slovenski brskalnik', D.ugibajDrzavo({ jeziki: ['sl-SI', 'en'], casovniPas: 'Europe/Ljubljana' }) === 'SI')
  preveri('drzava: slovaski brskalnik', D.ugibajDrzavo({ jeziki: ['sk-SK'], casovniPas: 'Europe/Bratislava' }) === 'SK')
  preveri('drzava: anglesko v Bratislavi', D.ugibajDrzavo({ jeziki: ['en-US'], casovniPas: 'Europe/Bratislava' }) === 'SK')
  preveri('drzava: slovensko v Bratislavi (jezik velja)', D.ugibajDrzavo({ jeziki: ['sl'], casovniPas: 'Europe/Bratislava' }) === 'SI')
  preveri('drzava: neznan obiskovalec', D.ugibajDrzavo({ jeziki: ['de-DE'], casovniPas: 'Europe/Berlin' }) === null)
  preveri('drzava: povezava /sk povozi jezik', D.ugibajDrzavo({ shranjena: 'SK', jeziki: ['sl'] }) === 'SK')
  preveri('privzeta: Slovenija ostane clani', D.privzetaLiga(lige, 'SI') === 'clani')
  preveri('privzeta: neznan ostane clani', D.privzetaLiga(lige, null) === 'clani')
  preveri('privzeta: Slovak dobi svojo ligo', D.privzetaLiga(lige, 'SK') === 'sk-ssfz-4liga')
  preveri('privzeta: Slovaska brez aktivne lige = clani', D.privzetaLiga(brezSk, 'SK') === 'clani')
  const slugi = (r) => r.lige.map((l) => l.slug).join(',')
  preveri('lige: Slovenec ne vidi slovaske', slugi(D.ligeDrzave(lige, 'clani', 'SK')) === 'clani,lj-1-liga')
  preveri('lige: Slovak vidi le svojo', slugi(D.ligeDrzave(lige, 'sk-ssfz-4liga', null)) === 'sk-ssfz-4liga')
  preveri('lige: dokler liga ni znana, velja ugib', D.ligeDrzave(lige, 'neznana', 'SK').drzava === 'SK')
  preveri('lige: brez ugiba Slovenija', D.ligeDrzave(lige, 'neznana', null).drzava === 'SI')
  preveri('lige: Slovak brez aktivne slovaske lige vidi slovenske', slugi(D.ligeDrzave(brezSk, 'clani', 'SK')) === 'clani,lj-1-liga')
}

// --- prevodi: vsak prevod ima iste {parametre} in <oznake> kot izvirnik ------
// Brez tega bi popravek slovenskega niza (nov parameter) v slovaščini tiho
// pustil "{n}" na zaslonu ali izgubil povezavo.
{
  const { sl } = await import('../src/i18n/sl/index.ts')
  const { sk } = await import('../src/i18n/sk/index.ts')
  const listi = (d, pot = '') =>
    Object.entries(d).flatMap(([k, v]) =>
      typeof v === 'string' || (v && typeof v === 'object' && 'other' in v) ? [[pot + k, v]] : listi(v, `${pot}${k}.`),
    )
  const najdi = (d, kljuc) => kljuc.split('.').reduce((v, del) => (v && typeof v === 'object' ? v[del] : undefined), d)
  const znaki = (v) => {
    const besedila = typeof v === 'string' ? [v] : Object.values(v)
    return besedila.map((b) => [...b.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[0]).sort().join(' '))
  }
  const napake = []
  let manjka = 0
  for (const [kljuc, izvirnik] of listi(sl)) {
    const prevod = najdi(sk, kljuc)
    if (prevod === undefined) { manjka++; continue }
    const iz = new Set(znaki(izvirnik)), pr = new Set(znaki(prevod))
    // Množinske oblike smejo {n} izpustiti le, kjer ga izvirnik izpusti v vseh.
    const vsi = [...pr].every((z) => iz.has(z)) && [...iz].every((z) => pr.has(z) || typeof izvirnik !== 'string')
    if (!vsi) napake.push(kljuc)
  }
  preveri('prevodi sk: vsi nizi prevedeni', manjka === 0, `manjka ${manjka}`)
  preveri('prevodi sk: parametri in oznake kot v izvirniku', napake.length === 0, napake.slice(0, 5).join(', '))
}

// --- vir sportnet (Slovaška) -----------------------------------------------
{
  const S = await import('./viri/sportnet.mjs')
  preveri('sportnet: sezona', S.sezonaIz('2026/2027') === '2026/27')
  preveri('sportnet: ime v "Priimek Ime"', S.vPriimekIme('Matúš Ráček') === 'Ráček Matúš')
  preveri('sportnet: slovaski cas', S.lokalniCas('2026-09-19T13:00:00.000Z').datum === '2026-09-19' && S.lokalniCas('2026-09-19T13:00:00.000Z').ura === '15:00')
  const tekma = JSON.parse(readFileSync(new URL('./vzorci/sportnet-tekma.json', import.meta.url), 'utf8'))
  const z = S.vZapisnik(tekma)
  const n = S.nastopi(z)
  preveri('sportnet: zapisnik', z && z.krog === 7 && z.rezultat.domaci === 1 && z.rezultat.gostje === 0 && !z.opozorila.length)
  preveri('sportnet: vsak nastop ima ISSF in pozicijo', n.length > 22 && n.every((x) => x.regSt && x.pozicija))
  preveri('sportnet: strelec', n.some((x) => x.ime === 'Šemik Tomáš' && x.goli === 1))
}

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
