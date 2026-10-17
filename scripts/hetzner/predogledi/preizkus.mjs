// Preizkus strežnika slik za predogled brez omrežja in baze: lažen PostgREST,
// prave pisave in slike iz public/. `npm run preizkus-predogledov`.
//
//   VZORCI=<mapa> node scripts/hetzner/predogledi/preizkus.mjs   # zapiše še vse slike za ogled
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadImage } from '@napi-rs/canvas'
import { kljucRisbe, obdelovalec, razcleni } from './streznik.mjs'
import { naloziPisave, odseki } from './risbe.mjs'

const TU = fileURLToPath(new URL('.', import.meta.url))
const JAVNO = join(TU, '../../../public')

// Pisave: vse družine morajo biti ob strežniku (kontejner nima sistemskih).
const pisave = naloziPisave(join(TU, 'pisave'))
for (const d of ['Inter', 'Barlow Condensed', 'Fira Sans Extra Condensed', 'Noto Sans Armenian', 'Noto Sans Georgian']) assert.ok(pisave.has(d), `manjka pisava ${d}`)
// Odseki: armenske črke v Noto, števke ob njih v Inter; cirilica v ozki vlogi v Firi.
assert.deepEqual(odseki('Արարատ 2', false).map((o) => o.druzina), ['Noto Sans Armenian', 'Inter'])
assert.deepEqual(odseki('АСАНИ 7', true).map((o) => o.druzina), ['Fira Sans Extra Condensed'])
assert.deepEqual(odseki('Şenol Güneş', true).map((o) => o.druzina), ['Barlow Condensed'])

// Veljavne poti; vse drugo 404 brez branja baze.
assert.deepEqual(razcleni('/predogled/player/7.jpg'), { vrsta: 'player', id: 7 })
assert.deepEqual(razcleni('/predogled/invite/AB23CD.jpg'), { vrsta: 'invite', id: 'AB23CD' })
for (const slaba of [
  '/predogled/player/abc.jpg', '/predogled/player/0.jpg', '/predogled/player/007.jpg', '/predogled/player/1234567890123.jpg',
  '/predogled/player/7.png', '/predogled/player/7', '/predogled/team/7.jpg', '/predogled/player/7.jpg/x', '/predogled/../og/slff-og.png',
  '/predogled/invite/ab23cd.jpg', '/predogled/invite/AB23C.jpg', '/predogled/invite/AB23CO.jpg', '/predogled/invite/AB23C1.jpg', '/predogled/league/sk-za-1.jpg',
]) assert.equal(razcleni(slaba), null, slaba)

// Ključ risbe sledi podatkom in jeziku.
const k1 = kljucRisbe('player', 7, 'sl', { tocke: 21 }, { grb: null })
assert.equal(k1, kljucRisbe('player', 7, 'sl', { tocke: 21 }, { grb: null }))
assert.notEqual(k1, kljucRisbe('player', 7, 'sl', { tocke: 22 }, { grb: null }))
assert.notEqual(k1, kljucRisbe('player', 7, 'hr', { tocke: 21 }, { grb: null }))
assert.match(k1, /^player-7-[0-9a-f]{16}$/)

// --- lažna baza ------------------------------------------------------------------
const BESEDE = {
  sl: {
    'skupno.besede': {
      tocke: { one: 'točka', two: 'točki', few: 'točke', other: 'točk' },
      tekme: { one: 'tekma', two: 'tekmi', few: 'tekme', other: 'tekem' },
      goli: { one: 'gol', two: 'gola', few: 'goli', other: 'golov' },
      ekipe: { one: 'ekipa', two: 'ekipi', few: 'ekipe', other: 'ekip' },
    },
    'skupno.pozicija': { GK: 'Vratar', DEF: 'Branilec', MID: 'Vezist', FWD: 'Napadalec' },
    'tekme.tabela.naslov': 'Lestvica',
    'lestvice.lestvica.naslov': 'Fantasy lestvica',
  },
  hy: { 'skupno.pozicija': { FWD: 'Հարձակվող' }, 'tekme.tabela.naslov': 'Աղյուսակ' },
  el: { 'skupno.pozicija': { MID: 'Μέσος' } },
}
const LIGE = [
  { id: 1, slug: 'clani', name: '1. GNL — člani', active: true, country_code: 'SI', country_name: 'Slovenija', federation_short: 'MNZ Gorenjska' },
  { id: 2, slug: 'mladinci', name: 'Mladinci', active: true, country_code: 'SI', country_name: 'Slovenija' },
  { id: 3, slug: 'am-1', name: 'Առաջին խումբ', active: true, country_code: 'AM', country_name: 'Հայաստան' },
  { id: 4, slug: 'gr-a1', name: 'Α1 Ερασιτεχνική Κατηγορία Αθηνών', active: true, country_code: 'GR', country_name: 'Ελλάδα' },
  { id: 5, slug: 'tr-bal', name: 'Bölgesel Amatör Lig — 3. Grup', active: true, country_code: 'TR', country_name: 'Türkiye' },
]
let tockeIgralca = 21
const PODATKI = {
  competitions_view: () => LIGE,
  'player_overview?id=eq.7': () => [{ id: 7, full_name: 'Novak Janez', first_name: 'Janez', last_name: 'Novak', position: 'FWD', shirt_number: 9, value: 6.5, team_id: 3, team_name: 'Šenčur', team_short: 'ŠEN', team_logo: '/grbi/sencur.jpg', competition_id: 1 }],
  'player_overview?id=eq.8': () => [{ id: 8, full_name: 'Tshipamba-Mulowayi Isaac Raphaël Tshima Omombo', position: 'MID', shirt_number: null, value: 4.5, team_id: 9, team_name: 'ND Polzela - Združena Savinjska', team_short: null, team_logo: null, competition_id: 1 }],
  'player_overview?id=eq.9': () => [{ id: 9, full_name: 'Հովհաննիսյան Արամ', position: 'FWD', shirt_number: 10, value: 5, team_id: 30, team_name: 'Արարատ-Արմենիա 2', team_short: null, team_logo: null, competition_id: 3 }],
  'player_overview?id=eq.10': () => [{ id: 10, full_name: 'Παπαδόπουλος Γιώργος', position: 'MID', shirt_number: 8, value: 5.5, team_id: 40, team_name: 'Α.Ο. Καλλιθέας', team_short: 'ΚΑΛ', team_logo: null, competition_id: 4 }],
  'player_overview?id=eq.11': () => [{ id: 11, full_name: 'Güneş Şenol', position: 'GK', shirt_number: 1, value: 5, team_id: 50, team_name: 'Iğdır Gençlikspor', team_short: null, team_logo: null, competition_id: 5 }],
  'player_overview?id=eq.16': () => [{ id: 16, full_name: 'კვარაცხელია ხვიჩა', position: 'FWD', shirt_number: 77, value: 7, team_id: 60, team_name: 'დინამო თბილისი 2', team_short: null, team_logo: null, competition_id: 1 }],
  'player_overview?id=eq.12': () => [{ id: 12, full_name: 'Mladi Jure', position: 'FWD', team_id: 3, team_name: 'Šenčur', competition_id: 2 }],
  'player_overview?id=eq.13': () => [{ id: 13, full_name: '#a1b2c3', position: 'FWD', team_id: 3, team_name: 'Šenčur', competition_id: 1 }],
  'player_overview?id=eq.99': () => [],
  sezone: () => [{ season: '2026/27' }],
  'player_season_standings?id=eq.': () => [{ points: tockeIgralca, matches: 5, goals: 3, assists: 2, minutes: 410, value: 6.5 }],
  'teams?id=eq.3': () => [{ id: 3, name: 'Šenčur', short_name: 'ŠEN', logo_url: '/grbi/sencur.jpg' }],
  'teams?id=eq.9': () => [{ id: 9, name: 'Kety Emmi&Impol Bistrica ob Sotli in Slovenske Konjice', short_name: null, logo_url: null }],
  'competition_teams?team_id=eq.3': () => [{ competition_id: 1 }, { competition_id: 2 }],
  'competition_teams?team_id=eq.9': () => [{ competition_id: 1 }],
  'player_season_standings?team_id=eq.3': (pot) =>
    pot.includes('competition_id=eq.1')
      ? [{ id: 7, full_name: 'Novak Janez', points: 21 }, { id: 13, full_name: '#a1b2c3', points: 20 }, { id: 14, full_name: 'Kranjc Luka', points: 12 }, { id: 15, full_name: 'Zupan Bor', points: 0 }]
      : [{ id: 12, full_name: 'Mladi Jure', points: 9 }],
  'player_season_standings?team_id=eq.9': () => [],
  'match_assist_status?match_id=eq.5': () => [{ match_id: 5, played_on: '2026-09-13', round_number: 4, home_name: 'Šenčur', home_short: 'ŠEN', home_logo: '/grbi/sencur.jpg', away_name: 'Kety Emmi&Impol Bistrica ob Sotli', away_short: null, away_logo: null, home_goals: 3, away_goals: 2, home_team_id: 3, away_team_id: 9, competition_id: 1 }],
  'goals?match_id=eq.5': () => [
    { minute: 12, team_id: 3, scorer: { full_name: 'Novak Janez' } },
    { minute: 45, team_id: 3, scorer: { full_name: 'Novak Janez' } },
    { minute: 50, team_id: 3, scorer: { full_name: '#a1b2c3' } },
    { minute: 61, team_id: 9, scorer: { full_name: 'Tshipamba-Mulowayi Isaac' } },
    { minute: 88, team_id: 9, scorer: null },
  ],
  'rpc/lestvica_lige': (pot, telo) =>
    telo.p_competition_id === 3
      ? [{ mesto: 1, team_id: 30, ime: 'Արարատ-Արմենիա 2', kratko: null, grb: null, tocke: 24, sezona: '2026/27' }, { mesto: 2, team_id: 31, ime: 'Շիրակ', kratko: null, grb: null, tocke: 18, sezona: '2026/27' }]
      : telo.p_competition_id === 5
        ? []
        : [
            { mesto: 1, team_id: 3, ime: 'Šenčur', kratko: 'ŠEN', grb: '/grbi/sencur.jpg', tocke: 13, sezona: '2026/27' },
            { mesto: 2, team_id: 9, ime: 'Kety Emmi&Impol Bistrica ob Sotli in Slovenske Konjice', kratko: null, grb: null, tocke: 12, sezona: '2026/27' },
            { mesto: 3, team_id: 6, ime: 'Bled', kratko: 'BLE', grb: null, tocke: 9, sezona: '2026/27' },
            { mesto: 4, team_id: 7, ime: 'Naklo', kratko: null, grb: null, tocke: 7, sezona: '2026/27' },
            { mesto: 5, team_id: 8, ime: 'Triglav Kranj', kratko: null, grb: null, tocke: 4, sezona: '2026/27' },
            { mesto: 6, team_id: 10, ime: 'Velesovo', kratko: null, grb: null, tocke: 1, sezona: '2026/27' },
          ],
  'rpc/mini_liga_glava': (pot, telo) =>
    telo.p_liga === 21 ? [{ id: 21, name: 'Liga gostilne Pri Jožovcu in prijateljev', javna: true, competition_id: 1, ekip: 7 }] : telo.p_liga === 22 ? [{ id: 22, name: 'Zasebna', javna: false, competition_id: 1, ekip: 2 }] : [],
  'rpc/lestvica_javne_mini_lige': (pot, telo) =>
    telo.p_liga === 21
      ? [
          { fantasy_team_id: 1, team_name: 'FC Luka', total_points: 40 },
          { fantasy_team_id: 2, team_name: 'Real Madrid ob Savi in Sori, ekipa za vse čase', total_points: 44 },
          { fantasy_team_id: 3, team_name: 'Žiga & Co', total_points: 40 },
        ]
      : [],
  'rpc/mini_liga_po_kodi': (pot, telo) => (telo.p_koda === 'AB23CD' ? [{ id: 22, name: 'Sodelavci iz skladišča', owner_name: 'Luka', ekip: 4 }] : []),
}
let klicev = 0
let pokvarjena = false
const rest = async (pot, telo) => {
  klicev++
  if (pokvarjena) throw new Error('PostgREST dol')
  const k = Object.keys(PODATKI)
    .sort((a, b) => b.length - a.length)
    .find((k) => pot === k || pot.startsWith(k + '&') || pot.startsWith(k + '?') || (k.endsWith('.') && pot.startsWith(k)))
  if (!k) throw new Error(`neznana poizvedba ${pot}`)
  return PODATKI[k](pot, telo)
}

// --- obdelovalec ------------------------------------------------------------------
const koren = mkdtempSync(join(tmpdir(), 'slff-predogledi-'))
for (const m of ['og', 'logo', 'foto']) cpSync(join(JAVNO, m), join(koren, m), { recursive: true })
mkdirSync(join(koren, 'grbi'))
cpSync(join(JAVNO, 'grbi', 'sencur.jpg'), join(koren, 'grbi', 'sencur.jpg'))
writeFileSync(join(koren, 'html-besede.json'), JSON.stringify(BESEDE))
const mapa = join(koren, 'predpomnilnik')
const zahtevaj = async (o, url, method = 'GET') => {
  let status, glave, telo
  await o({ url, method }, { writeHead: (s, g) => ((status = s), (glave = g)), end: (b) => (telo = b) })
  return { status, glave, telo }
}
const vzorci = process.env.VZORCI
if (vzorci) mkdirSync(vzorci, { recursive: true })
const o = obdelovalec({ rest, koren, mapa, pospravljaj: 1 })

// Vsaka vrsta: JPEG 1200 × 630, drugič z diska brez baze in risanja.
const POTI = {
  'igralec': '/predogled/player/7.jpg?v=abc',
  'igralec-dolg-brez-grba': '/predogled/player/8.jpg',
  'igralec-armensko': '/predogled/player/9.jpg',
  'igralec-grsko': '/predogled/player/10.jpg',
  'igralec-tursko': '/predogled/player/11.jpg',
  'igralec-gruzinsko': '/predogled/player/16.jpg',
  'klub': '/predogled/club/3.jpg',
  'klub-dolg-brez-grba': '/predogled/club/9.jpg',
  'tekma': '/predogled/match/5.jpg',
  'liga': '/predogled/league/1.jpg',
  'liga-armensko': '/predogled/league/3.jpg',
  'liga-brez-lestvice': '/predogled/league/5.jpg',
  'mini-liga': '/predogled/mini/21.jpg',
  'povabilo': '/predogled/invite/AB23CD.jpg',
}
for (const [ime, pot] of Object.entries(POTI)) {
  const r = await zahtevaj(o, pot)
  assert.equal(r.status, 200, ime)
  assert.equal(r.glave['Content-Type'], 'image/jpeg', ime)
  assert.equal(r.glave['X-Slff-Predogled'], 'nova', ime)
  assert.equal(r.glave['Cache-Control'], 'public, max-age=3600, s-maxage=21600')
  assert.ok(r.telo.length < 300_000, `${ime}: ${r.telo.length} B (WhatsApp vzame do 300 kB)`)
  const s = await loadImage(r.telo)
  assert.deepEqual([s.width, s.height], [1200, 630], ime)
  if (vzorci) writeFileSync(join(vzorci, `${ime}.jpg`), r.telo)
  const prej = klicev
  const znova = await zahtevaj(o, pot.replace(/\?.*/, '') + '?v=drugo')
  assert.equal(znova.glave['X-Slff-Predogled'], 'disk', `${ime}: drugič z diska`)
  assert.equal(klicev, prej, `${ime}: podatki iz pomnilnika`)
  assert.ok(znova.telo.equals(r.telo))
}
// HEAD brez telesa.
assert.equal((await zahtevaj(o, POTI.igralec, 'HEAD')).telo, undefined)

// Česar ne smemo ali ne moremo pokazati: privzeta slika (PNG) s 200.
for (const [ime, pot] of [
  ['mladinska liga', '/predogled/player/12.jpg'],
  ['anonimiziran', '/predogled/player/13.jpg'],
  ['neznan igralec', '/predogled/player/99.jpg'],
  ['zasebna mini liga', '/predogled/mini/22.jpg'],
  ['neznana koda', '/predogled/invite/ZZ23CD.jpg'],
  ['neaktivna ali neznana liga', '/predogled/league/77.jpg'],
]) {
  const r = await zahtevaj(o, pot)
  assert.equal(r.status, 200, ime)
  assert.equal(r.glave['Content-Type'], 'image/png', ime)
  assert.equal(r.glave['X-Slff-Predogled'], 'privzeta', ime)
  assert.equal(r.telo[1], 0x50, `${ime}: PNG`)
}

// Neveljavna pot: 404 in brez branja baze.
{
  const prej = klicev
  for (const pot of ['/predogled/player/abc.jpg', '/predogled/invite/abc.jpg', '/predogled/player/7.jpg/../../x', '/og/slff-og.png']) assert.equal((await zahtevaj(o, pot)).status, 404, pot)
  assert.equal((await zahtevaj(o, '/predogled/player/7.jpg', 'POST')).status, 404)
  assert.equal(klicev, prej, 'neveljavna pot ne bere baze')
}

// Novi podatki = nova datoteka; stara različica iste entitete gre z diska.
{
  const sveza = obdelovalec({ rest, koren, mapa, zivljenje: 0 })
  const datoteke = () => readdirSync(mapa).filter((d) => d.startsWith('player-7-'))
  assert.equal(datoteke().length, 1)
  const prej = datoteke()[0]
  tockeIgralca = 25
  const r = await zahtevaj(sveza, POTI.igralec)
  assert.equal(r.glave['X-Slff-Predogled'], 'nova', 'nove točke, nova risba')
  assert.equal(datoteke().length, 1, 'stara različica pobrisana')
  assert.notEqual(datoteke()[0], prej)
  tockeIgralca = 21
}

// PostgREST dol ali počasen: privzeta slika, kratko predpomnjenje, napaka se ne hrani.
{
  const sveza = obdelovalec({ rest, koren, mapa: join(koren, 'pp2') })
  pokvarjena = true
  const r = await zahtevaj(sveza, '/predogled/club/3.jpg')
  assert.equal(r.status, 200)
  assert.equal(r.glave['X-Slff-Predogled'], 'privzeta')
  assert.equal(r.glave['Cache-Control'], 'public, max-age=60')
  pokvarjena = false
  assert.equal((await zahtevaj(sveza, '/predogled/club/3.jpg')).glave['X-Slff-Predogled'], 'nova', 'po napaki znova iz baze')
  const zivo = setInterval(() => {}, 1000)
  const pocasna = obdelovalec({ koren, mapa: join(koren, 'pp3'), rok: 50, rest: (p, b, signal) => new Promise((_, ne) => signal.addEventListener('abort', () => ne(signal.reason))) })
  const p = await zahtevaj(pocasna, '/predogled/match/5.jpg')
  clearInterval(zivo)
  assert.equal(p.status, 200)
  assert.equal(p.glave['X-Slff-Predogled'], 'privzeta')
}

// Polna vrsta risanja: odvečni dobijo privzeto sliko takoj.
{
  const ozka = obdelovalec({ rest, koren, mapa: join(koren, 'pp4'), hkrati: 1, vrsta: 0 })
  const r = await Promise.all(['/predogled/player/8.jpg', '/predogled/player/9.jpg', '/predogled/player/10.jpg'].map((p) => zahtevaj(ozka, p)))
  const viri = r.map((x) => x.glave['X-Slff-Predogled']).sort()
  assert.ok(viri.includes('nova') && viri.includes('privzeta'), viri.join(','))
  assert.ok(r.every((x) => x.status === 200))
}

// Omejen disk: največ `najvec` datotek, najdlje nebrane gredo.
{
  const m = join(koren, 'pp5')
  const majhna = obdelovalec({ rest, koren, mapa: m, najvec: 3, pospravljaj: 1 })
  for (const p of ['/predogled/player/7.jpg', '/predogled/player/8.jpg', '/predogled/club/3.jpg', '/predogled/match/5.jpg', '/predogled/league/1.jpg']) await zahtevaj(majhna, p)
  const ostale = readdirSync(m).filter((d) => d.endsWith('.jpg'))
  assert.equal(ostale.length, 3, ostale.join(','))
  assert.ok(!ostale.some((d) => d.startsWith('player-7-')), 'najstarejša gre prva')
}

// Privzete slike ni (pokvarjena objava): 503, da Caddy vzame rezervo.
{
  const brez = mkdtempSync(join(tmpdir(), 'slff-predogledi-brez-'))
  const r = await zahtevaj(obdelovalec({ rest, koren: brez, mapa: join(brez, 'pp') }), '/predogled/player/99.jpg')
  assert.equal(r.status, 503)
  rmSync(brez, { recursive: true })
}

assert.ok(existsSync(mapa))
rmSync(koren, { recursive: true })
console.log(`preizkus strežnika slik: vse v redu${vzorci ? ` (vzorci v ${vzorci})` : ''}`)
