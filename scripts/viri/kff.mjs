// Vir: Kazahstan — kffleague.kz (uradna stran lig KFF: Premier liga, Prva liga,
// Druga liga, ženske, pokal). Glej CLAUDE.md (Kazahstan).
//
// Stran je Next.js, a strežnik izriše vse, kar potrebujemo: v vsaki strani je
// drevo React Server Components (`self.__next_f.push`), v katerem so podatki
// strani kot JSON (`RoutePrefetchProvider`, ključi `matches:<id>:ru:detail`,
// `…:lineup`, `…:events`). Beremo ta JSON, ne izrisanega HTML.
// **robots.txt prepoveduje /api/ in /_next/ — tja ne hodimo nikoli** (strani
// tekmovanj z izbirnikom sezone si podatke naložijo prek /api/; strežnik izriše
// le privzeto sezono Premier lige, zato seznama tekem lige ni na nobeni strani).
//
// SEZONA je koledarsko leto (marec–november): 2026 = "2026"
// (`competitions.sezona_koledarska`, kot Estonija in Latvija).
//
// ŠIFRA LIGE je `<turnir>/<leto>/<sezona>[/<klub>][@<od>-<do>]`:
// - `<turnir>`: `1l` (Prva liga, /ru/first-league) ali `2l` (Druga liga,
//   /ru/second-league),
// - `<leto>`: koledarsko leto sezone,
// - `<sezona>`: id sezone KFF (`season_id` v podatkih tekme; 2026: 1l = 204,
//   2l = 203; 2025: 1l = 85),
// - `<klub>`: id kluba KFF, kadar ima sezona več skupin v istem `season_id`
//   (Druga liga: konferenci Jugo-zahod in Severo-vzhod). Liga je skupina tega
//   kluba = povezana komponenta tekem rednega dela ("Тур N"),
// - `@<od>-<do>`: razpon id-jev tekem za arhiv. Zemljevid strani
//   (sitemap.xml) našteje le tekme tekoče sezone (in lansko Premier ligo);
//   arhiv se prečeše po id-jih.
// Brez razpona so kandidati vse tekme iz sitemap.xml z datumom (lastmod) v
// letu sezone in tekme s strani lige (krog, ki teče).
//
// TEKMA `/ru/matches/<id>`:
// - `detail`: datum, ura (Almaty, UTC+5 brez poletnega časa → ljubljanska),
//   krog (`tour`), sezona, faza (`stage_name` "Тур N"; finale Druge lige je
//   druga faza — ni del lige), status (`finished`, `upcoming` …), izid,
//   `is_technical` (kontumacija), domači in gostje (id kluba KFF in ime).
// - `lineup`: začetniki (`starters`) in klop (`substitutes`) obeh ekip, vsak s
//   stalno šifro osebe (`player_id` → `reg_st`), dresom, POZICIJO (GK, DEF,
//   MID, FWD) in kapetanom.
// - `events`: časovnica z minuto in polčasom: goal, penalty (gol z 11 m),
//   own_goal, yellow_card, red_card, second_yellow, missed_penalty,
//   substitution (`player` ven, `player2` noter). Pri golu je `player2` vratar,
//   ki ga je prejel (2025) — ne beremo. Asistenca je, a je ne uvažamo.
//   Igralec dogodka je včasih brez šifre in s kazaškim zapisom imena
//   ("Нұрлыбек Қашқанқұл" proti "Кашканкул Нурлыбек" v postavi) — iščemo ga
//   po ekipi in dresu.
//
// PREDPOMNILNIK (`scripts/.predpomnilnik/kff`): iz vsake strani shranimo le
// izvleček (JSON, nekaj kB namesto 0,7 MB). Tekma tuje sezone se ne bere
// nikoli več (sezona tekme se ne spremeni); tekma lige po pravilih v
// `najvecStarost`. Stran brez podatkov tekme (napaka, vzdrževanje) ne gre v
// predpomnilnik.
//
// Pogoji: noga strani "При использовании материалов обязательна ссылка на
// официальный сайт" — navedba vira (povezava) je obvezna: `vir_ime` in
// `vir_url` v nogi. Beremo odkrito (User-Agent SLFF, 3,5 s med zahtevki).
// **Ob 401, 403, 429 ali izzivu se uvoz ustavi (`KffZavrnitev`, izhod 4) —
// ne obhajamo.** Datuma rojstva, fotografij in sodnikov ne beremo.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'

const OSNOVNI = 'https://kffleague.kz'
const UA = 'SLFF fantasy (https://slff.eu)'
const PREMOR_MS = 3500
let MAPA = 'scripts/.predpomnilnik/kff'
const DOLZINA_TEKME = 90
const URA = 3600000
const DAN = 24 * URA
const TURNIRJI = { '1l': 'first-league', '2l': 'second-league' }

// --- šifra in naslovi -------------------------------------------------------------

/** "2l/2026/203/5065" → { turnir, leto, sezona, klub, od, do }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(1l|2l)\/(\d{4})\/(\d+)(?:\/(\d+))?(?:@(\d+)-(\d+))?$/)
  if (!m) throw new Error(`kff: šifra lige je "<1l|2l>/<leto>/<sezona>[/<klub>][@<od>-<do>]" (npr. 1l/2026/204, 2l/2026/203/5065), ne "${koda}"`)
  return {
    turnir: m[1],
    leto: m[2],
    sezona: Number(m[3]),
    klub: m[4] ? Number(m[4]) : null,
    od: m[5] ? Number(m[5]) : null,
    do: m[6] ? Number(m[6]) : null,
  }
}

export const naslovLige = (koda) => `${OSNOVNI}/ru/${TURNIRJI[razbijKodo(koda).turnir]}`
export const naslovTekme = (id) => `${OSNOVNI}/ru/matches/${String(id).replace(/^kz/, '')}`
export const NASLOV_ZEMLJEVIDA = `${OSNOVNI}/sitemap.xml`
// Šifra zapisnika v bazi je `kz<id>`: id tekme KFF (1–2000) se prekriva s
// šiframi drugih virov, `matches.zapisnik_id` pa je enoličen čez vse vire.
export const sifraZapisnika = (id) => `kz${String(id).replace(/^kz/, '')}`

// --- zavrnitev ----------------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class KffZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'KffZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required|Access denied)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha|challenge-platform\/h\//i.test(String(html ?? ''))

/**
 * `fetch` za `prenesiSPonovitvami`: 401, 403, 429 in izziv vržejo zavrnitev
 * TAKOJ (brez ponovitve — 429 bi prenos sicer ponovil), na vsaki poti branja.
 */
export async function kffFetch(url, moznosti = {}) {
  const o = await fetch(url, moznosti)
  if (jeZavrnitev(o.status)) {
    await o.body?.cancel().catch(() => {})
    throw new KffZavrnitev(`kff: ${url} → HTTP ${o.status} — uvoz ustavljen, ne obhajamo`, o.status)
  }
  const telo = await o.text()
  if (jeIzziv(telo)) throw new KffZavrnitev(`kff: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return new Response(telo, { status: o.status, statusText: o.statusText, headers: o.headers })
}

// --- podatki strani (RSC) ---------------------------------------------------------

/**
 * Vrstice drevesa RSC: Map id → besedilo vrstice. Vrstica je `<id>:<JSON>\n`
 * ali `<id>:T<dolžina>,<besedilo>` — besedilo (CSS, JSON-LD) ima dolžino v
 * bajtih UTF-8 in za njim NI nove vrstice, zato ga ne smemo deliti po "\n".
 */
export function rscVrstice(html) {
  let vse = ''
  for (const m of String(html ?? '').matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      vse += JSON.parse(`"${m[1]}"`)
    } catch {
      // okrnjen kos — vrstica, ki ga potrebuje, se ne bo razčlenila
    }
  }
  const b = Buffer.from(vse, 'utf8')
  const out = new Map()
  let i = 0
  while (i < b.length) {
    while (b[i] === 0x0a) i++
    const dvopicje = b.indexOf(0x3a, i)
    if (dvopicje < 0) break
    const id = b.toString('utf8', i, dvopicje)
    const j = dvopicje + 1
    if (b[j] === 0x54) {
      const vejica = b.indexOf(0x2c, j)
      const n = parseInt(b.toString('utf8', j + 1, vejica), 16)
      if (vejica > 0 && Number.isFinite(n)) {
        out.set(id, b.toString('utf8', vejica + 1, vejica + 1 + n))
        i = vejica + 1 + n
        continue
      }
    }
    const nl = b.indexOf(0x0a, j)
    const konec = nl < 0 ? b.length : nl
    out.set(id, b.toString('utf8', j, konec))
    i = konec + 1
  }
  return out
}

/** Podatki, ki jih strežnik priloži strani (`RoutePrefetchProvider` → value): { ključ: vrednost }. */
export function podatkiStrani(html) {
  const out = {}
  for (const v of rscVrstice(html).values()) {
    if (!v.startsWith('[') || !v.slice(0, 400).includes('"value":{')) continue
    try {
      const j = JSON.parse(v)
      const vrednost = j?.[3]?.value
      if (vrednost && typeof vrednost === 'object') Object.assign(out, vrednost)
    } catch {
      // vrstica ni JSON (besedilo, CSS)
    }
  }
  return out
}

// "$undefined" je v RSC manjkajoča vrednost.
const u = (x) => (x === '$undefined' || x === undefined ? null : x)
const besedilo = (s) => razpakiraj(String(u(s) ?? '')).replace(/\s+/g, ' ').trim()

function igralecPostave(p) {
  return {
    id: u(p.player_id),
    ime: besedilo(p.first_name),
    priimek: besedilo(p.last_name),
    st: typeof p.number === 'number' ? p.number : /^\d+$/.test(String(u(p.number) ?? '')) ? Number(p.number) : null,
    poz: u(p.position),
    kapetan: !!p.is_captain,
  }
}

function ekipaPostave(t) {
  if (!t || !Array.isArray(t.starters)) return null
  return {
    id: u(t.team_id),
    ime: besedilo(t.team_name),
    zacetniki: t.starters.map(igralecPostave),
    klop: (Array.isArray(t.substitutes) ? t.substitutes : []).map(igralecPostave),
  }
}

/**
 * Izvleček tekme iz strani (gre v predpomnilnik): null, če stran nima
 * podatkov tekme (napaka, vzdrževanje, neznan id).
 */
export function izvlecek(html) {
  const p = podatkiStrani(html)
  const kljuc = Object.keys(p).find((k) => /^matches:\d+:ru:detail$/.test(k))
  const d = kljuc && p[kljuc]
  if (!d || typeof d.id !== 'number' || !d.home_team || !d.away_team) return null
  const id = d.id
  const lu = p[`matches:${id}:ru:lineup`]
  const ev = p[`matches:${id}:ru:events`]
  const izid = typeof d.home_score === 'number' && typeof d.away_score === 'number' ? { domaci: d.home_score, gostje: d.away_score } : null
  let postavi = null
  const lh = ekipaPostave(lu?.lineups?.home_team)
  const la = ekipaPostave(lu?.lineups?.away_team)
  if (lh || la) {
    // Postavi po id-ju kluba, ne po mestu (če bi bili kdaj zamenjani).
    const zaKlub = (klubId, privzeta) => [lh, la].find((x) => x && x.id === klubId) ?? privzeta
    postavi = [zaKlub(d.home_team.id, lh), zaKlub(d.away_team.id, la)]
  }
  return {
    id,
    datum: u(d.date),
    ura: u(d.time),
    krog: typeof d.tour === 'number' ? d.tour : null,
    sezonaId: u(d.season_id),
    sezonaIme: besedilo(d.season_name),
    faza: besedilo(d.stage_name),
    fazaId: u(d.stage_id),
    status: u(d.status),
    tehnicna: !!d.is_technical,
    imaPostavo: !!d.has_lineup,
    domaci: { id: d.home_team.id, ime: besedilo(d.home_team.name) },
    gostje: { id: d.away_team.id, ime: besedilo(d.away_team.name) },
    izid,
    postavi,
    dogodki: Array.isArray(ev?.events)
      ? ev.events.map((e) => ({
          polcas: u(e.half),
          minuta: u(e.minute),
          vrsta: u(e.event_type),
          klub: u(e.team_id),
          igralec: { id: u(e.player_id), ime: besedilo(e.player_name), st: u(e.player_number) },
          igralec2: { id: u(e.player2_id), ime: besedilo(e.player2_name), st: u(e.player2_number) },
        }))
      : null,
  }
}

/** Stran lige: { sezona, tekme: [id] } iz gradnika krogov (`home-widget:<turnir>::ru`). */
export function tekmeStraniLige(html) {
  const p = podatkiStrani(html)
  const w = Object.entries(p).find(([k]) => /^home-widget:/.test(k))?.[1]
  if (!w) return null
  const ids = new Set()
  for (const kljuc of ['groups', 'finished_groups', 'upcoming_groups'])
    for (const g of Array.isArray(w[kljuc]) ? w[kljuc] : []) for (const t of g.games ?? []) if (typeof t.id === 'number') ids.add(t.id)
  return { sezona: u(w.season_id), tekme: [...ids] }
}

/** Zemljevid strani: [{ id, datum }] tekem (`/matches/<id>`, lastmod = dan tekme). */
export function tekmeZemljevida(xml) {
  const out = []
  for (const m of String(xml ?? '').matchAll(/<loc>https:\/\/kffleague\.kz\/matches\/(\d+)<\/loc>[\s\S]*?(?:<lastmod>([^<]*)<\/lastmod>|<\/url>)/g))
    out.push({ id: Number(m[1]), datum: m[2] ? m[2].slice(0, 10) : null })
  return out
}

// --- čas ---------------------------------------------------------------------------

/**
 * Datum in ura po almatyjskem času (UTC+5, Kazahstan od 1. 3. 2024 brez
 * poletnega časa) → ljubljanski { datum, ura }.
 */
export function vLjubljanskiCas(datum, ura) {
  const d = String(datum ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const m = String(ura ?? '').match(/^(\d{1,2}):(\d{2})/)
  if (!d) return { datum: null, ura: null }
  if (!m) return { datum: d[0], ura: null }
  const t = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(m[1]) - 5, Number(m[2])))
  const deli = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(t)
      .map((x) => [x.type, x.value]),
  )
  return { datum: `${deli.year}-${deli.month}-${deli.day}`, ura: `${deli.hour}:${deli.minute}` }
}

/** Minuta dogodka: 1. polčas največ 45 (sodniški podaljšek), sicer največ 90. */
export function minuta(polcas, m) {
  if (typeof m !== 'number') return null
  return Math.min(m, polcas === 1 ? 45 : DOLZINA_TEKME)
}

// --- liga: kandidati, sezona, skupina ------------------------------------------------

// Faze zunaj rednega dela: finale Druge lige, pokalni krogi, dodatne tekme.
// Redni del je "Тур N" (2026), "Лига A/B" (skupini 2025) ali prazno (2025).
const IZLOCENE_FAZE = /финал|1\/\d|матч за|плей|стыков|переходн|суперкубок/i
const jeRedniDel = (t) => !IZLOCENE_FAZE.test(t.faza ?? '')

/**
 * Tekme skupine (konference) kluba: povezana komponenta grafa tekem rednega
 * dela, v kateri je `klub`. Brez kluba vse tekme rednega dela.
 */
export function tekmeSkupine(tekme, klub) {
  const redne = tekme.filter(jeRedniDel)
  if (klub == null) return redne
  const oce = new Map()
  const koren = (x) => {
    while (oce.has(x) && oce.get(x) !== x) x = oce.get(x)
    return x
  }
  for (const t of redne) {
    for (const k of [t.domaci.id, t.gostje.id]) if (!oce.has(k)) oce.set(k, k)
    const a = koren(t.domaci.id)
    const b = koren(t.gostje.id)
    if (a !== b) oce.set(a, b)
  }
  if (!oce.has(klub)) return []
  const moj = koren(klub)
  return redne.filter((t) => koren(t.domaci.id) === moj)
}

/** Skupine (konference) sezone: [{ klubi: [{ id, ime }], tekem }]. */
export function skupineSezone(tekme) {
  const redne = tekme.filter(jeRedniDel)
  const ostale = new Set(redne.flatMap((t) => [t.domaci.id, t.gostje.id]))
  const out = []
  for (const klub of [...ostale]) {
    if (!ostale.has(klub)) continue
    const moje = tekmeSkupine(redne, klub)
    const klubi = new Map()
    for (const t of moje) for (const s of [t.domaci, t.gostje]) klubi.set(s.id, s.ime)
    for (const k of klubi.keys()) ostale.delete(k)
    out.push({ klubi: [...klubi].map(([id, ime]) => ({ id, ime })), tekem: moje.length })
  }
  return out
}

// --- predpomnilnik ----------------------------------------------------------------

/** Mapa predpomnilnika (za preizkus; uvoz ima privzeto). */
export const nastaviMapo = (p) => { MAPA = p }
const pot = (ime) => `${MAPA}/${ime}`
const imeIzvlecka = (id) => `tekma-${id}.json`

function izPredpomnilnika(ime) {
  const p = pot(ime)
  if (!existsSync(p)) return null
  try {
    return { vsebina: readFileSync(p, 'utf8'), starost: Date.now() - statSync(p).mtimeMs }
  } catch {
    return null
  }
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/**
 * Kako star sme biti izvleček tekme LIGE (ms). Odigrana tekma s postavama se
 * ne bere znova (razen prve 3 dni ob uvozu zapisnikov — popravki); odigrana
 * brez postave (zapisnik še ni vnesen) vsako uro do 45 dni; neodigrana na
 * vrsti (±14 dni) vsako uro, sicer dnevno.
 */
export function najvecStarost(t, danes = Date.now(), svezi = false) {
  if (!t || t.ni) return 7 * DAN
  const star = starostDni(t.datum, danes)
  if (t.izid || t.status === 'finished') {
    if (t.tehnicna) return star <= 14 ? DAN : Infinity
    // Polna: obe postavi in vsaj toliko golov v časovnici, kolikor jih pove izid
    // (časovnico zveza vnaša sproti, postavo pred tekmo).
    const golov = (t.dogodki ?? []).filter((d) => /^(goal|penalty|own_goal)$/.test(d.vrsta)).length
    const polna = t.postavi?.[0]?.zacetniki?.length && t.postavi?.[1]?.zacetniki?.length && Array.isArray(t.dogodki) &&
      (!t.izid || golov >= t.izid.domaci + t.izid.gostje)
    if (!polna) return star <= 45 ? URA : Infinity
    if (svezi && star <= 3) return -1
    return Infinity
  }
  if (!t.datum) return DAN
  if (star >= -14 && star <= 14) return URA
  return DAN
}

/** Ali se stran sme shraniti (uvozne skripte): izvlečki tekem gredo ločeno, napake nikamor. */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  if (/^tekma-/.test(datoteka)) return false
  if (/sitemap/.test(datoteka)) return /<urlset/.test(String(besedilo ?? ''))
  return tekmeStraniLige(besedilo) != null
}

/**
 * Prenos s preverbo zavrnitve. `prenesi` je funkcija uvoza (predpomnilnik in
 * ponovitve) ali preizkusa; vedno sveže, predpomnilnik vodi vir sam.
 */
async function prenesiStran(prenesi, url, ime) {
  let html
  try {
    html = await prenesi(url, ime, true)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new KffZavrnitev(`kff: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new KffZavrnitev(`kff: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

/** Stran "ne obstaja" (Next.js `notFound()` s statusom 200). */
export const jeMehki404 = (html) => /NEXT_HTTP_ERROR_FALLBACK;404/.test(String(html ?? ''))

// Tekme, prebrane sveže v tem zagonu (drugič jih ne beremo).
const prebrane = new Set()
export const prebranaVTemZagonu = (id) => prebrane.has(Number(id))

/** Prebere tekmo (sveže) in shrani izvleček; neobstoječa tekma (404) → { id, ni: true }. */
export async function preberiTekmo(prenesi, id) {
  prebrane.add(Number(id))
  let html
  try {
    html = await prenesiStran(prenesi, naslovTekme(id), `tekma-${id}.html`)
  } catch (e) {
    if (e.status === 404) {
      const ni = { id, ni: true }
      mkdirSync(MAPA, { recursive: true })
      writeFileSync(pot(imeIzvlecka(id)), JSON.stringify(ni))
      return ni
    }
    throw e
  }
  const t = izvlecek(html)
  // Neznan id: Next.js vrne stran "ne obstaja" s statusom 200 (mehki 404).
  if (!t && jeMehki404(html)) {
    const ni = { id: Number(id), ni: true }
    mkdirSync(MAPA, { recursive: true })
    writeFileSync(pot(imeIzvlecka(id)), JSON.stringify(ni))
    return ni
  }
  if (!t) throw new Error(`kff: ${naslovTekme(id)} nima podatkov tekme (${String(html).length} B) — stran ni shranjena`)
  if (t.id !== Number(id)) throw new Error(`kff: ${naslovTekme(id)} vrne tekmo ${t.id} — stran ni shranjena`)
  mkdirSync(MAPA, { recursive: true })
  writeFileSync(pot(imeIzvlecka(id)), JSON.stringify(t))
  return t
}

/** Stran z omejeno starostjo v lastnem predpomnilniku (zemljevid, stran lige). */
async function stranZRokom(prenesi, url, ime, rok, veljavna) {
  const c = izPredpomnilnika(ime)
  if (c && c.starost <= rok && veljavna(c.vsebina)) return c.vsebina
  const html = await prenesiStran(prenesi, url, ime)
  if (!veljavna(html)) throw new Error(`kff: ${url} ni prava stran (${String(html).length} B) — ni shranjena`)
  mkdirSync(MAPA, { recursive: true })
  writeFileSync(pot(ime), html)
  return html
}

/** Id-ji tekem, ki jih je treba pogledati za ligo. */
async function kandidati(koda, prenesi) {
  const k = razbijKodo(koda)
  if (k.od != null) {
    const out = []
    for (let id = k.od; id <= k.do; id++) out.push(id)
    return out
  }
  const xml = await stranZRokom(prenesi, NASLOV_ZEMLJEVIDA, 'sitemap.xml', 12 * URA, (s) => /<urlset/.test(s))
  const ids = new Set(tekmeZemljevida(xml).filter((t) => t.datum?.startsWith(k.leto)).map((t) => t.id))
  // Krog, ki teče: tekme, ki jih zemljevid še nima.
  const liga = await stranZRokom(prenesi, naslovLige(koda), `liga-${k.turnir}.html`, 10 * 60000, (s) => tekmeStraniLige(s) != null)
  const w = tekmeStraniLige(liga)
  if (w?.sezona === k.sezona) for (const id of w.tekme) ids.add(id)
  return [...ids].sort((a, b) => a - b)
}

/**
 * Tekme lige (izvlečki): vse tekme sezone `<sezona>`, rednega dela, skupine
 * kluba. `svezi`: odigrane zadnjih 3 dni beri znova (uvoz zapisnikov).
 */
export async function preberiLigo(koda, prenesi, { danes = Date.now(), svezi = false, log = () => {} } = {}) {
  const k = razbijKodo(koda)
  const tekme = []
  let prebranih = 0
  for (const id of await kandidati(koda, prenesi)) {
    const c = izPredpomnilnika(imeIzvlecka(id))
    let t = null
    if (c) {
      try {
        t = JSON.parse(c.vsebina)
      } catch {
        t = null
      }
    }
    // Sezona tekme se ne spremeni: tuje tekme ne beremo znova.
    const tuja = t && !t.ni && t.sezonaId !== k.sezona
    if (!t || (!tuja && c.starost > najvecStarost(t, danes, svezi))) {
      t = await preberiTekmo(prenesi, id)
      prebranih++
      if (prebranih % 50 === 0) log(`  kff: prebranih ${prebranih} tekem`)
    }
    if (!t.ni && t.sezonaId === k.sezona) tekme.push(t)
  }
  const izpuscene = tekme.filter((t) => !jeRedniDel(t))
  if (izpuscene.length) log(`  kff: ${izpuscene.length} tekem zunaj rednega dela izpuščenih (${[...new Set(izpuscene.map((t) => t.faza))].join(', ')})`)
  return tekmeSkupine(tekme, k.klub)
}

// --- razpored -----------------------------------------------------------------------

/** Odigrana: izid in status `finished` ali kontumacija. */
const odigrana = (t) => !!t.izid && (t.status === 'finished' || t.tehnicna)

/** Razpored v obliko uvoza razporeda. */
export function razporedTekem(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    // Odpovedana tekma (klub je izstopil: ҚАРШЫҒА 2026) ne bo odigrana.
    if (!t.krog || t.status === 'cancelled') continue
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    const { datum, ura } = vLjubljanskiCas(t.datum, t.ura)
    const kontumacija = t.tehnicna && !!t.izid
    krogi.get(t.krog).tekme.push({
      domaci: imeKluba(t.domaci),
      gostje: imeKluba(t.gostje),
      datum,
      ura,
      odigrana: odigrana(t),
      kontumacija,
      ...(kontumacija ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik -----------------------------------------------------------------------

// Ime kluba po id-ju KFF, kadar ga stran piše na dva načina (prazno: ni treba).
const IME_KLUBA = {}
const imeKluba = (s) => IME_KLUBA[s.id] ?? s.ime

const POZICIJE = new Set(['GK', 'DEF', 'MID', 'FWD'])
const ZNANE = new Set(['goal', 'penalty', 'own_goal', 'yellow_card', 'red_card', 'second_yellow', 'missed_penalty', 'substitution'])

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma ni odigrana, je
 * kontumacija ali kateri ekipi manjka postava (zapisnik še ni vnesen).
 */
export function vZapisnik(t, { url = null } = {}) {
  if (!t || t.ni || !odigrana(t) || t.tehnicna) return null
  if (!t.postavi?.[0]?.zacetniki?.length || !t.postavi?.[1]?.zacetniki?.length || !Array.isArray(t.dogodki)) return null
  const opozorila = []
  const ekipe = t.postavi.map((e, idx) => {
    const igralec = (p, zacetnik) => ({
      st: p.st,
      ime: [p.priimek, p.ime].filter(Boolean).join(' '),
      regSt: p.id ?? null,
      vratar: p.poz === 'GK',
      kapetan: p.kapetan,
      zacetnik,
      pozicija: POZICIJE.has(p.poz) ? p.poz : null,
    })
    return {
      ime: imeKluba(idx === 0 ? t.domaci : t.gostje),
      postava: e.zacetniki.map((p) => igralec(p, true)),
      rezerve: e.klop.map((p) => igralec(p, false)),
    }
  })
  const strani = [t.domaci.id, t.gostje.id]

  /** Igralec dogodka: ekipa po klubu, igralec po šifri, sicer po dresu. */
  const kdo = (klub, x) => {
    const idx = strani.indexOf(klub)
    if (idx < 0 || !x || (x.id == null && x.st == null)) return null
    const vsi = [...ekipe[idx].postava, ...ekipe[idx].rezerve]
    const i = (x.id != null && vsi.find((p) => p.regSt === x.id)) || (x.st != null && vsi.find((p) => p.st === Number(x.st))) || null
    return i ? { ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt } : null
  }

  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  for (const d of t.dogodki) {
    const m = minuta(d.polcas, d.minuta)
    if (!ZNANE.has(d.vrsta)) {
      opozorila.push(`neznan dogodek "${d.vrsta}" v ${d.minuta}. minuti`)
      continue
    }
    if (m == null) opozorila.push(`dogodek "${d.vrsta}" brez minute`)
    if (d.vrsta === 'substitution') {
      const ven = kdo(d.klub, d.igralec)
      const noter = kdo(d.klub, d.igralec2)
      if (!ven || !noter) opozorila.push(`menjava v ${d.minuta}. minuti: ${!ven ? `igralca ${d.igralec.ime} (${d.igralec.st}) ` : ''}${!noter ? `igralca ${d.igralec2.ime} (${d.igralec2.st}) ` : ''}ni v postavi`)
      if (!ven && !noter) continue
      const brez = { st: null, ime: null, regSt: null }
      const del = (x) => (x ? { st: x.st, ime: x.ime, regSt: x.regSt } : brez)
      menjave.push({ ekipaIdx: (ven ?? noter).ekipaIdx, minuta: m, noter: del(noter), ven: del(ven) })
      continue
    }
    const p = kdo(d.klub, d.igralec)
    // Karton brez igralca in dresa: osebje (trener) — ne šteje.
    if (!p && /card|yellow/.test(d.vrsta) && d.igralec.id == null && d.igralec.st == null) continue
    if (!p) {
      opozorila.push(`dogodek "${d.vrsta}" v ${d.minuta}. minuti: igralca ${d.igralec.ime} (${d.igralec.st}) ni v postavi`)
      continue
    }
    const z = { ...p, minuta: m }
    if (d.vrsta === 'goal') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
    else if (d.vrsta === 'penalty') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
    else if (d.vrsta === 'own_goal') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
    else if (d.vrsta === 'missed_penalty') zgresene.push(z)
    else if (d.vrsta === 'yellow_card') rumeni.push(z)
    else if (d.vrsta === 'red_card' || d.vrsta === 'second_yellow') {
      if (!rdeci.some((r) => r.ekipaIdx === z.ekipaIdx && r.regSt === z.regSt && r.st === z.st)) rdeci.push(z)
    }
  }

  const rezultat = t.izid
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  for (const e of ekipe) {
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev (GK) v postavi je ${vratarjev}`)
    const sifre = new Map()
    for (const i of [...e.postava, ...e.rezerve]) if (i.regSt != null) sifre.set(i.regSt, (sifre.get(i.regSt) ?? 0) + 1)
    for (const [s, n] of sifre) if (n > 1) opozorila.push(`${e.ime}: igralec ${s} je v zapisniku ${n}-krat`)
  }

  const { datum } = vLjubljanskiCas(t.datum, t.ura)
  return {
    zapisnikId: sifraZapisnika(t.id),
    url: url ?? naslovTekme(t.id),
    sezona: t.datum ? t.datum.slice(0, 4) : null,
    krog: t.krog,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava, rezerve: ekipe[0].rezerve },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava, rezerve: ekipe[1].rezerve },
    rezultat,
    // Polčasa stran ne pove posebej (le stanje ob golih).
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Nastopi po šifri osebe (kot oefb, jalgpall) in še zgrešene 11-metrovke. */
export const nastopi = (z) =>
  nastopiPoSifri(z).map((n) => ({
    ...n,
    zgreseneEnajstmetrovke: z.zgresene.filter((k) => k.ekipaIdx === n.ekipaIdx && k.regSt === n.regSt).length,
  }))

// --- klubi --------------------------------------------------------------------------

// Ključ kluba: male črke s kazaškimi črkami (ә, ғ, қ, ң, ө, ұ, ү, һ, і) in
// ё → е ("Шахтёр" = "Шахтер"). Rezervne ekipe ("Туран М", "Кайсар М") so
// svoj klub — oznaka "М" ostane v ključu.
export const kljucKlubaKz = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

const OBLIKE_KZ = new Set(['фк', 'fc', 'фc', 'пфк', 'ск'])

/**
 * Kratko ime: brez oblike kluba ("ФК Тараз" → "Тараз"), velike črke z
 * veliko začetnico ("ХРОМТАУ" → "Хромтау", "АНСАТ" ostane, ker je kratica
 * ne vemo — le besede, daljše od petih črk). Oznaka rezervne ekipe "М" ostane.
 */
export function kratkoImeKz(polno) {
  const besede = razpakiraj(polno).trim().split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_KZ.has(b.toLowerCase()))
  const lepo = (b) => (b.length > 5 && b === b.toLocaleUpperCase('ru') && /\p{Lu}/u.test(b) ? b[0] + b.slice(1).toLocaleLowerCase('ru') : b)
  return (ostale.length ? ostale : besede).slice(0, 4).map(lepo).join(' ')
}

// --- vir ----------------------------------------------------------------------------

const vir = {
  ime: 'kff',
  polnoIme: 'Kazakhstan Football Federation (kffleague.kz)',
  drzava: 'KZ',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  fetch: kffFetch,
  imaRegistracije: false,

  // Uvoz razporeda to stran prenese pred `razporedVseStrani` (krog, ki teče).
  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new KffZavrnitev(`kff: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedTekem(await preberiLigo(koda, prenesi, { log: console.log }))
  },

  async zapisniki(koda, prenesi) {
    const { leto } = razbijKodo(koda)
    const out = []
    for (let t of await preberiLigo(koda, prenesi, { svezi: true, log: console.log })) {
      if (!odigrana(t) || t.tehnicna) continue
      let z = vZapisnik(t)
      // Nepopoln izvleček (zapisnik še ni bil vnesen): še enkrat sveže (zapisnikSvez).
      if (!z && !prebranaVTemZagonu(t.id)) {
        t = await preberiTekmo(prenesi, t.id)
        z = vZapisnik(t)
      }
      if (!z) continue
      z.sezona = leto
      out.push({ id: z.zapisnikId, z, url: z.url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaKz,
  kratkoIme: kratkoImeKz,
  poenostavi: kljucKlubaKz,
}

export default vir
