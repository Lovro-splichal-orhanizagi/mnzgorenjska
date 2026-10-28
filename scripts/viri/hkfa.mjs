// Vir: Hong Kong Football Association — hkfa.com (Hongkong).
//
// HKFA vodi vse lige v svojem sistemu; spletišče je Nuxt 2, ki strani izriše na
// strežniku in podatke strani zapiše v `window.__NUXT__`. Beremo SAMO te
// strežniško izrisane strani z navadnim GET. Seznami in zapisniki se v
// brskalniku sicer osvežujejo prek GraphQL POST z žetonom, ki ga strežnik vpiše
// v stran (`state.token`) — tega NE uporabljamo (ne POST, ne žeton). Stanje
// `__NUXT__` je izraz JavaScripta; ne izvajamo ga, razčleni ga `nuxt.mjs`.
//
// SEZONA je jesen–pomlad, oznaka "2026/27" (HKFA piše "2026-2027").
//
// ŠIFRA LIGE je `<leagueyear_id>/<leto>`: `2047/2026-2027` = 1st Division
// 2026/27. leagueyear_id je id tekmovanja ENE sezone (izbirnik "Competition" na
// /en/competitions/fixtures?year=<leto>); šifre po sezonah so v
// docs/viri/hongkong.md. Delitev sezone (Championship/Challenging Group) je
// svoje tekmovanje z novim leagueyear_id: tekoča šifra ga doda s `+`
// (`2041+<championship>+<challenging>/2026-2027`, kot `oefb`/`gfa`), za arhiv
// pa se ne uvaža (CLAUDE.md, delitev sezone).
//
// NASLOVI (vsi GET, HTML z `__NUXT__`):
// - `/en/competitions/fixtures?competition=<ly>&page=<n>&year=<leto>` — seznam
//   tekem lige po 50 (`listMatchs` po datumih, `listMatchsSize`): match_id,
//   datum in ura (lokalno, Hongkong), `match_round` ("1", "1R" = prestavljena
//   tekma 1. kroga, "1*" v arhivu), `match_status` (0 razpisana, 1 odigrana,
//   3 prestavljena, 4 prekinjena), izid, klub (`Club.club_id`, `TeamName`).
// - `/en/competitions/result/<match_id>/detail` — zapisnik: `HomePlayers` /
//   `GuestPlayers` (začetniki), `HomeSubPlayers` / `GuestSubPlayers` (klop),
//   igralec s stalno šifro `player_id` (→ `reg_st`) in vpisano pozicijo
//   (`G`/`GK` = vratar, pri 2. in 3. diviziji pogosto prazno); dresov ni
//   (`player_jersey` je prazen). `MatchEvents`: `EventType` G, PEN, OG, M.PEN
//   (zgrešena 11-m), YC, 12Y (drugi rumeni), RC, EXC (menjava), `side`
//   (Home/Guest = ekipa igralca; OG šteje nasprotniku), `min` + `minExtra`.
//   Datuma rojstva, slik in uradnih oseb stran ne objavi; sodnikov ne beremo.
//
// ČAS: HKFA piše lokalni čas (Asia/Hong_Kong, UTC+8, brez poletnega časa);
// pretvori se v ljubljanskega (`vLjubljano`), tudi datum. "--:--" = ura ni
// določena.
//
// KROG je TEDEN (pon–ned po hongkonškem datumu), štet od stalnega začetka (teden
// 1. avgusta v prvem letu sezone), kot pri modular11. Uradni krog HKFA ne
// ustreza tednom: HKPL igra 17. krog septembra, prestavljene tekme ("1R")
// pridejo mesece pozneje. Teden da krog z enim rokom.
//
// KLUBI: isti klub ima isti `club_id` čez sezone, ime pa se menja (WSE →
// Harmony, Kwong Wah → P.B Alliance FC) in v angleškem seznamu je pogosto
// kitajsko ("南華"). Ime vzamemo iz `IMENA_KLUBOV` po club_id; neznan klub dobi
// latinično ime s strani in opozorilo.
//
// robots.txt: "User-agent: * / Disallow: / Allow: /" (prazen Disallow) — vse
// dovoljeno. Pogojev uporabe spletišče nima (/en/terms je 404; noga le
// "Copyright … All rights reserved."). Dovoljenja HKFA nimamo. Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki), popolnih zapisnikov ne beremo znova.
// **Ob 401, 403, 429 ali izzivu se uvoz ustavi (`HkfaZavrnitev`, izhod 4) —
// ne obhajaj.**
import { nastopi as nastopiPoSifri } from './oefb.mjs'
import { NEPOPOLN } from './frf.mjs'
import { vLjubljano } from './modular11.mjs'
import { preberiNuxt } from './nuxt.mjs'

export { NEPOPOLN }

const OSNOVNI = 'https://www.hkfa.com'
const DOLZINA_TEKME = 90
const PAS = 'Asia/Hong_Kong'

/**
 * "2047/2026-2027" → { ly: "2047", lyji: ["2047"], leto: "2026-2027", prvoLeto: 2026, sezona: "2026/27" }.
 * Liga, ki se med sezono razdeli (Championship / Challenging Group, vsaka
 * skupina svoj leagueyear_id), našteje id-je s `+`: "2041+2060+2061/2026-2027"
 * → lyji ["2041", "2060", "2061"] (kot `oefb` in `gfa`). Krog je teden, zato se
 * tekme vseh skupin zložijo v iste kroge brez zamika.
 */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+(?:\s*\+\s*\d+)*)\/(\d{4})-(\d{4})$/)
  if (!m || Number(m[3]) !== Number(m[2]) + 1)
    throw new Error(`hkfa: šifra lige je "<leagueyear_id>[+<id skupine>…]/<leto>" (npr. 2047/2026-2027), ne "${koda}"`)
  const lyji = m[1].split('+').map((x) => x.trim())
  if (new Set(lyji).size !== lyji.length) throw new Error(`hkfa: šifra lige "${koda}" našteje isti leagueyear_id dvakrat`)
  return { ly: lyji[0], lyji, leto: `${m[2]}-${m[3]}`, prvoLeto: Number(m[2]), sezona: `${m[2]}/${m[3].slice(2)}` }
}

/** Stran seznama tekem tekmovanja `ly` (privzeto prvega v šifri). */
export const naslovStrani = (koda, stran = 1, ly = razbijKodo(koda).ly) => {
  const { leto } = razbijKodo(koda)
  return `${OSNOVNI}/en/competitions/fixtures?competition=${ly}&page=${stran}&year=${leto}`
}
export const naslovZapisnika = (id) => `${OSNOVNI}/en/competitions/result/${String(id).replace(/^hk/, '')}/detail`
// Šifra zapisnika v bazi je `hk<id>`: match_id HKFA (46xxx–51xxx) je v razponu
// drugih virov, `matches.zapisnik_id` pa je enoličen čez vse.
export const sifraZapisnika = (id) => `hk${String(id).replace(/^hk/, '')}`
const imeStrani = (koda, stran, ly = razbijKodo(koda).ly) => `razpored-${ly}-${razbijKodo(koda).leto}-${stran}.html`
const imeZapisnika = (id) => `tekma-${String(id).replace(/^hk/, '')}.html`

// --- zavrnitev ------------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class HkfaZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'HkfaZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? '').slice(0, 30000))

/** `fetch` vira: 401, 403 in 429 so zavrnitev že tu (prenos jih ne ponavlja). */
export async function hkfaFetch(url, moznosti) {
  const odgovor = await fetch(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new HkfaZavrnitev(`hkfa: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

/** Stran seznama ima `listMatchs`, stran tekme `MatchData` (oboje v `__NUXT__`). */
export const jeStranSeznama = (html) => /window\.__NUXT__/.test(String(html ?? '')) && /"?listMatchsSize"?:/.test(String(html ?? ''))
export const jeStranTekme = (html) => /window\.__NUXT__/.test(String(html ?? '')) && /"?MatchData"?:\{/.test(String(html ?? ''))

// --- čas in krog -----------------------------------------------------------------

/** Ponedeljek tedna (ISO) za datum 'YYYY-MM-DD' (ms UTC). */
function ponedeljek(datum) {
  const t = Date.parse(`${datum}T00:00:00Z`)
  return t - ((new Date(t).getUTCDay() + 6) % 7) * 86400000
}

/** Ponedeljek tedna 1. avgusta v prvem letu sezone: 2026 → 2026-07-27. */
export const zacetekSezone = (prvoLeto) => new Date(ponedeljek(`${prvoLeto}-08-01`)).toISOString().slice(0, 10)

/**
 * Krog tekme: teden (pon–ned, hongkonški datum) od tedna 1. avgusta. Številka
 * je stalna — ne zavisi od drugih tekem (prestavljena tekma ne premakne
 * ostalih). Tekma pred 1. avgustom je krog 1.
 */
export const krogIzDatuma = (datum, prvoLeto) =>
  Math.max(1, Math.floor((ponedeljek(datum) - ponedeljek(zacetekSezone(prvoLeto))) / (7 * 86400000)) + 1)

/** Hongkonški datum in ura → ljubljanska. "--:--" ali prazna ura → ura null. */
export const casLjubljana = (datum, ura) =>
  /^\d{1,2}:\d{2}$/.test(String(ura ?? '').trim()) ? vLjubljano(datum, String(ura).trim(), PAS) : { datum: datum || null, ura: null }

/**
 * Minuta dogodka: "90" + 3 → 90 (podaljšek odrezan); "HT" (menjava ob polčasu)
 * → 45; "AM" / "FT" (karton po tekmi) → 90; prazno ali neznano → null.
 */
export function minuta(min) {
  const s = String(min ?? '').trim().toUpperCase()
  if (s === 'HT') return 45
  if (s === 'AM' || s === 'FT') return DOLZINA_TEKME
  const n = Number(s)
  if (!s || !Number.isFinite(n) || n < 0) return null
  return Math.min(Math.max(n, 1), DOLZINA_TEKME)
}

// --- klubi ---------------------------------------------------------------------

// Ime kluba po `club_id` (zadnje ime, ki ga HKFA uporablja; iz seznamov
// 2025/26 in 2026/27, HKPL in 1.–3. divizija). Isti id = isti klub, tudi ob
// preimenovanju; ob novem klubu dopiši vrstico (neznan dobi ime s strani).
export const IMENA_KLUBOV = {
  2: 'South China', 3: 'BC Rangers', 4: 'Kitchee', 6: 'Sun Hei', 9: 'Citizen',
  10: 'Kuitan', 11: 'Double Flower', 12: 'Eastern', 13: 'Fukien', 15: 'HKFC',
  16: 'Kwai Tsing', 17: 'Tsun Tat', 18: 'Lucky Mile', 19: 'Mutual', 20: 'GFC',
  21: 'Tai Po', 23: 'Fu Moon', 28: 'Wing Yee Property', 29: 'Spark Ornament',
  30: 'Richwell KCDRSC', 32: 'P.B Alliance FC', 36: "St. Joseph's", 37: 'Sky Leader FC',
  38: 'RCFC', 40: 'Tuen Mun F.C.', 42: 'Tung Sing', 43: 'Central & Western',
  44: 'Eastern District', 45: 'Wofoo Kowloon City', 46: 'Kwun Tong',
  47: 'Golik North District', 48: 'Supreme Shatin', 49: 'Sham Shui Po',
  50: 'Kwoon Chung Southern', 51: 'Tsuen Wan', 52: 'Tuen Mun', 53: 'Wan Chai',
  54: 'Wong Tai Sin', 55: 'Yau Tsim Mong', 57: 'Best Union Yuen Long', 80: 'Sai Kung',
  81: 'Islands', 141: 'Ling Yui Orion', 142: 'Leaper FC', 189: 'Bright Cerulean FC',
  215: 'Kowloon Cricket Club', 286: 'Hoi King', 302: 'Harmony', 320: 'Lee Man',
  360: 'Ravia Sport Association', 404: 'Sui Tung', 419: 'Konter', 435: 'ERSA',
  444: 'Chandler Lambert', 461: 'Kong Kit FC', 466: 'UKFA', 469: 'Qi Yi',
  470: 'Soar FC', 476: 'Citylinkers SkyWolf',
}

const jeLatinica = (s) => /[A-Za-z]/.test(s) && !/[㐀-鿿]/.test(s)

/** Ime ekipe: po club_id; sicer latinično ime s strani (kitajsko le, če drugega ni). */
export function imeKluba(ekipa, opozorila = null) {
  const id = Number(ekipa?.Club?.club_id)
  if (IMENA_KLUBOV[id]) return IMENA_KLUBOV[id]
  const ime = String(ekipa?.TeamName ?? '').replace(/\s+/g, ' ').trim()
  opozorila?.push(`klub ${id} (${ime}) ni v IMENA_KLUBOV`)
  return ime
}

export const kljucKlubaHk = (ime) =>
  String(ime ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

const IMENA = new Set(Object.values(IMENA_KLUBOV))

/**
 * Kratko ime: brez "FC" / "F.C." / "Football Club" na koncu ("Leaper FC" →
 * "Leaper") — razen, če bi tako nastalo ime drugega kluba: "Tuen Mun F.C."
 * (3. div., club 40) ostane, ker je "Tuen Mun" (club 52) drug klub.
 */
export function kratkoImeHk(polno) {
  const s = String(polno ?? '').replace(/\s+/g, ' ').trim()
  const krajse = s.replace(/\s+(F\.?\s?C\.?|Football Club)$/i, '').trim()
  return krajse && !IMENA.has(krajse) ? krajse : s
}

// --- igralci ------------------------------------------------------------------

const velikaZacetnica = (b) => b.split('-').map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join('-')
const jeVelika = (b) => /\p{L}/u.test(b) && b === b.toUpperCase() && b.length > 1

/**
 * Ime igralca v obliki "Priimek Ime". HKFA ga piše na štiri načine:
 * "Chan, Yiu Yin", "Cheung,Hoi Leong Harry", "ANNAN Christian Kwesi",
 * "Ng Man Hei" — povsod je priimek spredaj. Vejica odpade, priimek z velikimi
 * črkami dobi veliko začetnico ("SANTOS DA PAIXAO Allan" → "Santos Da Paixao
 * Allan"), ime iz samih velikih črk vse ("CHAN HIM TAI" → "Chan Him Tai").
 */
export function imeIgralca(ime) {
  const besede = String(ime ?? '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  return besede.map((b) => (jeVelika(b) ? velikaZacetnica(b) : b)).join(' ')
}

/** Vpisana pozicija → vratar / pozicija. "G", "GK" = vratar; DF, LB … = DEF. */
export function pozicija(oznaka) {
  const o = String(oznaka ?? '').trim().toUpperCase()
  if (!o) return null
  if (o === 'G' || o === 'GK') return 'GK'
  if (/^(D|DF|DEF|CB|LB|RB|LCB|RCB|LWB|RWB|SW|B)$/.test(o)) return 'DEF'
  if (/^(M|MF|MID|CM|DM|AM|CDM|CAM|LM|RM)$/.test(o)) return 'MID'
  if (/^(F|FW|FWD|ST|CF|LW|RW|SS)$/.test(o)) return 'FWD'
  return null
}

function igralec(p) {
  const id = Number(p?.player_id ?? p?.Player?.player_id)
  const poz = pozicija(p?.Player?.player_position)
  const st = Number(String(p?.player_jersey ?? '').trim())
  return {
    st: Number.isInteger(st) && st > 0 ? st : null,
    ime: imeIgralca(p?.Player?.PlayerName),
    regSt: Number.isInteger(id) && id > 0 ? id : null,
    vratar: poz === 'GK',
    kapetan: !!p?.captain,
    pozicija: poz,
  }
}

const seznam = (x) => (Array.isArray(x) ? x : []).filter((p) => p && typeof p === 'object')

// --- seznam tekem ------------------------------------------------------------------

/** `__NUXT__` strani seznama → { vrstice, skupaj, naStran }. */
export function seznamStrani(html) {
  const n = preberiNuxt(html)
  const f = Object.values(n?.fetch ?? {}).find((x) => x && typeof x === 'object' && 'listMatchs' in x)
  if (!f) return null
  const vrstice = Object.values(f.listMatchs ?? {}).flat().filter((t) => t && typeof t === 'object')
  return { vrstice, skupaj: Number(f.listMatchsSize) || 0, naStran: Number(f.paginLimit) || 50, ly: Number(f.competition) }
}

const ODIGRANA = 1
const PRESTAVLJENA = 3
const PREKINJENA = 4

/**
 * Tekme lige: [{ id, krog, krogUradni, datum, ura, datumLokalno, uraLokalno,
 * domaci, gostje, domaciId, gostjeId, izid, status }]. Prestavljene (3) in
 * prekinjene (4) vrstice izpadejo: prestavljena dobi novo vrstico ("1R") z
 * novim id-jem, ko je znan nov datum.
 */
export function tekmeLige(koda, strani) {
  const { lyji, prvoLeto } = razbijKodo(koda)
  const vse = new Map()
  for (const s of strani) {
    for (const t of s.vrstice) {
      const tly = t.LeagueYear?.leagueyear_id
      if (tly != null && !lyji.includes(String(tly)))
        throw new Error(`hkfa: seznam lige ${lyji.join('+')} vsebuje tekmo ${t.match_id} tekmovanja ${tly} — uvoz ustavljen`)
      vse.set(t.match_id, t)
    }
  }
  const tekme = [...vse.values()]
    .filter((t) => t.match_id && /^\d{4}-\d{2}-\d{2}$/.test(String(t.match_date ?? '')))
    .filter((t) => ![PRESTAVLJENA, PREKINJENA].includes(Number(t.match_status)))
    .map((t) => {
      const odigrana = Number(t.match_status) === ODIGRANA && Number.isInteger(t.home_score) && Number.isInteger(t.guest_score)
      return {
        id: t.match_id,
        krog: krogIzDatuma(t.match_date, prvoLeto),
        krogUradni: String(t.match_round ?? '').trim() || null,
        datumLokalno: t.match_date,
        uraLokalno: /^\d{1,2}:\d{2}$/.test(String(t.match_time ?? '').trim()) ? String(t.match_time).trim() : null,
        ...casLjubljana(t.match_date, t.match_time),
        domaci: imeKluba(t.team_home),
        gostje: imeKluba(t.team_guest),
        domaciId: Number(t.team_home?.Club?.club_id),
        gostjeId: Number(t.team_guest?.Club?.club_id),
        izid: odigrana ? { domaci: t.home_score, gostje: t.guest_score } : null,
        status: Number(t.match_status),
      }
    })
    .sort((a, b) => a.datumLokalno.localeCompare(b.datumLokalno) || String(a.uraLokalno ?? '').localeCompare(String(b.uraLokalno ?? '')) || a.id - b.id)
  // Isti par dvakrat v istem tednu (redko) — poznejša gre v naslednji krog,
  // ker je tekma v bazi enolična po (krog, domači, gostje). Kot modular11.
  const zasedeno = new Set()
  for (const t of tekme) {
    while (zasedeno.has(`${t.krog}:${t.domaciId}:${t.gostjeId}`)) t.krog++
    zasedeno.add(`${t.krog}:${t.domaciId}:${t.gostjeId}`)
  }
  return tekme.sort((a, b) => a.krog - b.krog || String(a.datum).localeCompare(String(b.datum)) || a.id - b.id)
}

/** Razpored v obliko uvoza razporeda. */
export function razcleniRazpored(koda, strani) {
  const krogi = new Map()
  for (const t of tekmeLige(koda, strani)) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      hkId: t.id, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------------

const GOL = new Set(['G', 'PEN'])
const ZNANI = new Set(['G', 'PEN', 'OG', 'M.PEN', 'YC', '12Y', 'RC', 'EXC'])

/**
 * Zapisnik iz `__NUXT__` strani tekme v obliko, ki jo dajo drugi viri.
 * - Tekma ni odigrana (status ≠ 1) ali stran ni stran tekme → null.
 * - Obe postavi prazni → null (kontumacijo označi razpored).
 * - Manj kot 11 začetnikov, goli ≠ izid ali gol brez strelca → `nepopoln`.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const n = preberiNuxt(html)
  const md = n?.data?.[0]?.MatchData
  if (!md || typeof md !== 'object') return null
  if (Number(md.match_status) !== ODIGRANA || !Number.isInteger(md.home_score) || !Number.isInteger(md.guest_score)) return null
  const rezultat = { domaci: md.home_score, gostje: md.guest_score }
  const opozorila = []
  const ekipe = [
    { ime: imeKluba(md.team_home, opozorila), postava: seznam(md.HomePlayers).map(igralec), rezerve: seznam(md.HomeSubPlayers).map(igralec) },
    { ime: imeKluba(md.team_guest, opozorila), postava: seznam(md.GuestPlayers).map(igralec), rezerve: seznam(md.GuestSubPlayers).map(igralec) },
  ]
  const prazna = ekipe.map((e) => !e.postava.length && !e.rezerve.length)
  if (prazna[0] && prazna[1]) return null

  const kje = new Map()
  ekipe.forEach((e, idx) => { for (const i of [...e.postava, ...e.rezerve]) if (i.regSt) kje.set(i.regSt, { idx, i }) })
  const kdo = (p, m) => {
    const k = p && kje.get(Number(p.player_id))
    return k ? { ekipaIdx: k.idx, st: k.i.st, ime: k.i.ime, regSt: k.i.regSt, minuta: m } : null
  }
  const igralecDogodka = (d) => (d.side === 'Home' ? d.teamplayer_home : d.side === 'Guest' ? d.teamplayer_guest : null) ?? d.teamplayer_home ?? d.teamplayer_guest

  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const surove = []
  let brezStrelca = 0
  for (const d of seznam(md.MatchEvents)) {
    const vrsta = String(d.EventType ?? '').trim()
    const m = minuta(d.min)
    const stran = d.side === 'Home' ? 0 : d.side === 'Guest' ? 1 : null
    if (!ZNANI.has(vrsta)) { opozorila.push(`neznan dogodek "${vrsta}" v ${d.min}. minuti`); continue }
    if (m == null) opozorila.push(`dogodek ${vrsta} brez minute`)
    if (vrsta === 'EXC') {
      // `from` (teamplayer_<stran>) gre noter, `to` (teamplayer_<stran>_sub) ven —
      // smer preverimo spodaj po tem, kdo je na igrišču.
      const a = d.EXCPlayer?.from ?? igralecDogodka(d)
      const b = d.EXCPlayer?.to ?? (d.side === 'Home' ? d.teamplayer_home_sub : d.teamplayer_guest_sub)
      surove.push({ a: kdo(a, m), b: kdo(b, m), minuta: m, stran })
      continue
    }
    const s = kdo(igralecDogodka(d), m)
    if (vrsta === 'OG' || GOL.has(vrsta)) {
      const avtogol = vrsta === 'OG'
      if (!s) {
        if (stran == null) { opozorila.push(`gol v ${d.min}. minuti brez ekipe`); continue }
        if (!avtogol) brezStrelca++
        opozorila.push(`${avtogol ? 'avtogol' : 'gol'} v ${d.min}. minuti: strelca ni v postavi`)
        goli.push({ ekipaIdx: stran, st: null, ime: null, regSt: null, minuta: m, avtogol, enajstmetrovka: vrsta === 'PEN' })
        continue
      }
      if (stran != null && s.ekipaIdx !== stran) opozorila.push(`gol v ${d.min}. minuti (${s.ime}): dogodek je pri drugi ekipi kot strelec`)
      goli.push({ ...s, avtogol, enajstmetrovka: vrsta === 'PEN' })
    } else if (vrsta === 'M.PEN') {
      if (s) zgresene.push(s)
    } else if (vrsta === 'YC') {
      if (s) rumeni.push(s)
    } else if (vrsta === 'RC' || vrsta === '12Y') {
      if (s && !rdeci.some((r) => r.ekipaIdx === s.ekipaIdx && r.regSt === s.regSt)) rdeci.push(s)
    }
  }
  // Drugi rumeni: kot pri drugih virih ostane 1 rumeni + 1 rdeči.
  for (const r of rdeci) {
    const jaz = rumeni.filter((y) => y.ekipaIdx === r.ekipaIdx && y.regSt === r.regSt)
    for (const y of jaz.slice(1)) rumeni.splice(rumeni.indexOf(y), 1)
  }

  // Menjave po vrsti minut: kdor je na igrišču, gre ven. HKFA piše vstop kot
  // `from`; obrnjen vnos (oba primera sta v zapisnikih) se tako popravi sam.
  const menjave = []
  const brez = { st: null, ime: null, regSt: null }
  const oseba = (x) => (x ? { st: x.st, ime: x.ime, regSt: x.regSt } : brez)
  const igra = ekipe.map((e) => new Set(e.postava.map((i) => i.regSt)))
  for (const x of surove.sort((p, q) => (p.minuta ?? 999) - (q.minuta ?? 999))) {
    const idx = (x.a ?? x.b)?.ekipaIdx ?? x.stran
    if (idx == null || (!x.a && !x.b)) { opozorila.push(`menjava v ${x.minuta}. minuti: igralcev ni v postavi`); continue }
    let noter = x.a
    let ven = x.b
    if (noter?.regSt && igra[idx].has(noter.regSt) && !(ven?.regSt && igra[idx].has(ven.regSt))) [noter, ven] = [ven, noter]
    if (ven?.regSt && !igra[idx].has(ven.regSt)) opozorila.push(`${ekipe[idx].ime}: menjava v ${x.minuta}. minuti — ${ven.ime} gre ven, a ni na igrišču`)
    if (noter?.regSt && igra[idx].has(noter.regSt)) opozorila.push(`${ekipe[idx].ime}: menjava v ${x.minuta}. minuti — ${noter.ime} gre noter, a je že na igrišču`)
    if (ven?.regSt) igra[idx].delete(ven.regSt)
    if (noter?.regSt) igra[idx].add(noter.regSt)
    menjave.push({ ekipaIdx: idx, minuta: x.minuta, noter: oseba(noter), ven: oseba(ven) })
  }
  // Rezerva, ki zamenja vpisanega vratarja, je vratar (namig kot pri modular11).
  for (const mm of menjave) {
    const ven = mm.ven.regSt && ekipe[mm.ekipaIdx].postava.find((i) => i.regSt === mm.ven.regSt && i.vratar)
    const noter = ven && ekipe[mm.ekipaIdx].rezerve.find((i) => i.regSt === mm.noter.regSt)
    if (noter && !noter.pozicija) { noter.vratar = true; noter.pozicija = 'GK' }
  }

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  const razlogi = []
  ekipe.forEach((e) => { if (e.postava.length !== 11) razlogi.push(`${e.ime} — ${e.postava.length} začetnikov`) })
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    razlogi.push(`goli iz dogodkov ${zaEkipo(0)}:${zaEkipo(1)}, izid ${rezultat.domaci}:${rezultat.gostje}`)
  if (brezStrelca) razlogi.push(`${brezStrelca} golov brez strelca`)
  const nepopoln = razlogi.length > 0
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${razlogi.join('; ')}`)
  for (const e of ekipe) {
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev > 1) opozorila.push(`${e.ime}: vratarjev v postavi je ${vratarjev}`)
    const st = new Map()
    for (const i of [...e.postava, ...e.rezerve]) st.set(i.regSt, (st.get(i.regSt) ?? 0) + 1)
    for (const [r, k] of st) if (k > 1) opozorila.push(`${e.ime}: igralec ${r} je v postavi ${k}-krat`)
    if ([...e.postava, ...e.rezerve].some((i) => !i.regSt)) opozorila.push(`${e.ime}: igralec brez šifre`)
  }

  const { datum, ura } = casLjubljana(md.match_date, md.match_time)
  const prvo = Number(String(md.match_date ?? '').slice(0, 4))
  const mesec = Number(String(md.match_date ?? '').slice(5, 7))
  const zacetek = mesec >= 7 ? prvo : prvo - 1
  const brezKapetana = ({ kapetan: _k, ...i }) => i
  return {
    zapisnikId: id != null ? sifraZapisnika(id) : md.match_id != null ? sifraZapisnika(md.match_id) : null,
    url: url ?? (md.match_id != null ? naslovZapisnika(md.match_id) : null),
    sezona: Number.isInteger(zacetek) && zacetek > 2000 ? `${zacetek}/${String(zacetek + 1).slice(2)}` : null,
    krog: null,
    datum,
    ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(brezKapetana), rezerve: ekipe[0].rezerve.map(brezKapetana) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(brezKapetana), rezerve: ekipe[1].rezerve.map(brezKapetana) },
    rezultat,
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    prazen: false,
    opozorila,
  }
}

/** Je zapisnik treba prebrati znova (nepopoln)? */
export const jeNepopoln = (z) => !z || z.nepopoln

/** Nastopi po šifri osebe (kot oefb), z zgrešenimi 11-metrovkami. */
export const nastopi = (z) =>
  nastopiPoSifri(z).map((x) => ({
    ...x,
    zgreseneEnajstmetrovke: z.zgresene.filter((k) => k.ekipaIdx === x.ekipaIdx && k.regSt === x.regSt).length,
  }))

// --- prenos -------------------------------------------------------------------------

const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new HkfaZavrnitev(`hkfa: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new HkfaZavrnitev(`hkfa: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/**
 * Vse strani seznama lige (vedno sveže; stran brez seznama ustavi uvoz) — za
 * vsak leagueyear_id šifre posebej (osnovni del, nato skupine po delitvi).
 */
async function straniSeznama(koda, prenesi) {
  const strani = []
  for (const ly of razbijKodo(koda).lyji) {
    for (let s = 1; s <= 20; s++) {
      const url = naslovStrani(koda, s, ly)
      const html = await beri(prenesi, url, imeStrani(koda, s, ly), true)
      const st = jeStranSeznama(html) ? seznamStrani(html) : null
      if (!st) throw new Error(`hkfa: ${url} ni stran seznama tekem — uvoz ustavljen`)
      if (String(st.ly) !== ly) throw new Error(`hkfa: ${url} vrne tekmovanje ${st.ly} — uvoz ustavljen`)
      strani.push(st)
      if (!st.vrstice.length || s * st.naStran >= st.skupaj) break
    }
  }
  return strani
}

const vir = {
  ime: 'hkfa',
  polnoIme: 'Hong Kong Football Association (hkfa.com)',
  drzava: 'HK',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,
  fetch: hkfaFetch,

  naslovRazporeda: (koda) => naslovStrani(koda, 1),
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new HkfaZavrnitev(`hkfa: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // Stran napake (404 Nuxt, prazen odgovor) ne gre v predpomnilnik.
  zaPredpomnilnik: (html) => jeStranSeznama(html) || jeStranTekme(html),
  // Krog je teden: prestavljena tekma je v razporedu v drugem krogu, zato uvoz
  // razporeda neuvoženo vrstico, ki je razpored v njenem krogu nima, odstrani.
  razporedCel: true,

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await straniSeznama(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const { sezona } = razbijKodo(koda)
    const out = []
    for (const t of tekmeLige(koda, await straniSeznama(koda, prenesi)).filter((x) => x.izid)) {
      const url = naslovZapisnika(t.id)
      const star = starostDni(t.datumLokalno)
      // Prve 3 dni sveže; nepopoln zapisnik do 45 dni še enkrat sveže.
      let html = await beri(prenesi, url, imeZapisnika(t.id), star <= 3)
      let z = jeStranTekme(html) ? vZapisnik(html, { id: t.id, url }) : null
      if (jeNepopoln(z) && star > 3 && star <= 45) {
        html = await beri(prenesi, url, imeZapisnika(t.id), true)
        z = jeStranTekme(html) ? vZapisnik(html, { id: t.id, url }) : null
      }
      if (!z) continue
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid seznama ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: odigrana tekma z izidom 3:0 ali 0:3, starejša od tedna dni,
   * katere zapisnik nima nobene postave. Stran gre v isti predpomnilnik.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.hkId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovZapisnika(t.hkId), imeZapisnika(t.hkId), t.datum)
        if (jeIzziv(html)) throw new HkfaZavrnitev(`hkfa: ${naslovZapisnika(t.hkId)} vrne izziv (CAPTCHA)`)
        if (!jeStranTekme(html)) continue
        const md = preberiNuxt(html)?.data?.[0]?.MatchData
        if (md && ![md.HomePlayers, md.GuestPlayers, md.HomeSubPlayers, md.GuestSubPlayers].some((x) => seznam(x).length))
          out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaHk,
  kratkoIme: kratkoImeHk,
  poenostavi: kljucKlubaHk,
}

export default vir
