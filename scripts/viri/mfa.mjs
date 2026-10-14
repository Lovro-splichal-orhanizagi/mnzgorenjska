// Vir: Malta Football Association — javni JSON API Match Centra
// (api.mfa.com.mt, isti, ki ga bere matchcentre.mfa.com.mt; podatki iz COMET).
//
// Brez ključa in prijave; stran sama pošlje glavo `x-version: 2`, zato jo
// pošljemo tudi mi. robots.txt na www. in matchcentre. vse dovoli, na api.
// ga ni (404). Glej CLAUDE.md (Malta — vir mfa).
//
// ŠIFRA LIGE je `<tip>/<sezona>[/<tekmovanje>[+<tekmovanje>…]]`:
// - `<tip>` je id vrste tekmovanja (competitionTypeId), stalen čez sezone:
//   58539 Premier League, 2601248 Challenge League, 2601267 National League I,
//   6234492 National League II;
// - `<sezona>` je id sezone iz `/competitions/<tip>/seasons` — LETO KONCA
//   sezone: 2027 = 2026/27, 2026 = 2025/26;
// - brez `<tekmovanje>` so liga vsa tekmovanja (faze, skupine), ki jih našteje
//   lestvica sezone (`/standings?season=`): Premier ima Opening Round Phase 1,
//   P2 Top 6 / Bottom 6, Closing Round …, Challenge League Phase 1, Top 8 in
//   Play-Out. Tekme istega tipa, ki jih lestvica ne našteje (dodatne
//   kvalifikacije), izpustimo. `<tekmovanje>` (competitionId) izbere skupine
//   izrecno — nujno, kadar sta v sezoni vzporedni skupini, ki sta za fantasy
//   dve ligi (Amateur League 2023/24: Group A in B).
//
// TEKME: `/competitions/<tip>/pastMatches` in `/upcomingMatches` (?season,
// pageSize, page; stran za koncem je prazna). Vrstica nima ne izida ne kroga.
// Izid da `/matches/<id>/result` (homeScore, awayScore, dogodki), postavi
// `/matches/<id>/lineup`. Polje `isLineupAvailable` na seznamu je napačno
// (false tudi pri polni postavi) — ne beremo ga.
//
// KROG: API ga ne pozna. COMET šifre tekem tekmovanja izda po krogih (krog 1
// = najnižje šifre), zato je krog zaporedje šifer: tekme uredimo po šifri in
// začnemo nov krog, ko bi klub igral drugič ali je krog poln (N/2 tekem).
// Manjkajoča šifra (izbrisana tekma) to ne zmoti. Poznejša faza dobi zamik za
// zadnjim krogom faz, iz katerih so prišli njeni klubi (`krogiSezone`).
//
// POSTAVA: igralec ima `id` (stalna šifra osebe COMET → reg_st), `number`,
// `startingLineup`, `isGoalkeeper`, `isCaptain` in svoje dogodke z minuto:
// GOAL, PENALTY (gol z 11 m), OWN_GOAL (pri strelčevi ekipi, šteje
// nasprotniku), PENALTY_FAILED, YELLOW, SECOND_YELLOW (prvi rumeni je svoj
// dogodek), RED, SUBSTITUTION (`playerId` noter, `playerIdTwo` ven).
// **Menjava je zapisana pri obeh igralcih** — dogodke zato združimo po `id`
// dogodka. Ime je pomešano: "Nathan Steve MANGION" ali "ATTARD Luke"; priimek
// je del z velikimi črkami. Dogodek brez igralca (drugi rumeni trenerju) v
// postavi ni in ne šteje.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'

const API = 'https://api.mfa.com.mt/api'
const OSNOVNI = 'https://matchcentre.mfa.com.mt'
const DOLZINA_TEKME = 90
const NA_STRAN = 50
const UA = 'SLFF fantasy (https://slff.eu)'

/** "6234492/2027[/53110045[+…]]" → { tip, sezona, tekmovanja: [] | null }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)\/(\d{4})(?:\/(\d+(?:\+\d+)*))?$/)
  if (!m) throw new Error(`mfa: šifra lige je "<tip>/<sezona>[/<tekmovanje>[+…]]" (npr. 6234492/2027), ne "${koda}"`)
  return { tip: m[1], sezona: Number(m[2]), tekmovanja: m[3] ? m[3].split('+') : null }
}

/** Id sezone (leto konca) → "2026/27". */
export const sezonaIz = (leto) => (Number.isInteger(Number(leto)) ? `${Number(leto) - 1}/${String(leto).slice(2)}` : null)

export const naslovSeznama = (koda, vrsta, stran) => {
  const { tip, sezona } = razbijKodo(koda)
  return `${API}/competitions/${tip}/${vrsta}?season=${sezona}&pageSize=${NA_STRAN}&page=${stran}`
}
export const naslovLestvice = (koda) => {
  const { tip, sezona } = razbijKodo(koda)
  return `${API}/competitions/${tip}/standings?season=${sezona}`
}
export const naslovIzida =(id) => `${API}/matches/${String(id).replace(/^mt/, '')}/result`
export const naslovPostave = (id) => `${API}/matches/${String(id).replace(/^mt/, '')}/lineup`
// Šifre tekem COMET (~53 milijonov) so v številskem prostoru drugih virov
// COMET (hns, fss, ffm, lff) — `matches.zapisnik_id` je enoličen čez vse.
export const sifraZapisnika = (id) => `mt${String(id).replace(/^mt/, '')}`
const imeSeznama = (koda, vrsta, stran) => `${vrsta}-${String(koda).replace(/[/+]/g, '-')}-${stran}.json`
const imeLestvice = (koda) => `standings-${String(koda).replace(/[/+]/g, '-')}.json`
const imeIzida = (id) => `tekma-${id}-izid.json`
const imePostave = (id) => `tekma-${id}-postava.json`

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class MfaZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'MfaZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 403 || status === 429
// API vrača JSON; HTML (izziv Cloudflare, CAPTCHA, prijava) je zavrnitev.
export const jeIzziv = (besedilo) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(besedilo ?? ''))

/** "64'" → 64, "45+2'" → 45, "90+1'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

// Malta in Ljubljana sta v istem pasu; API piše UTC ("…T15:30:00.0000000Z").
const oblikaDatuma = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
export function lokalniCas(iso) {
  const m = String(iso ?? '').match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/)
  if (!m) return { datum: null, ura: null }
  const d = new Date(`${m[1]}Z`)
  if (Number.isNaN(d.getTime())) return { datum: null, ura: null }
  const [datum, ura] = oblikaDatuma.format(d).split(' ')
  return { datum, ura }
}

const veliko = (b) => /\p{Lu}{2}/u.test(b) && b === b.toLocaleUpperCase('en')
const lepo = (b) => b.toLocaleLowerCase('en').replace(/(^|[\s'’-])(\p{L})/gu, (_, a, c) => a + c.toLocaleUpperCase('en'))

/**
 * Ime → "Priimek Ime". Priimek so besede z velikimi črkami, ne glede na mesto:
 * "Nathan Steve MANGION" → "Mangion Nathan Steve", "ATTARD Luke" → "Attard Luke",
 * "TENORIO VIVEROS Andres" → "Tenorio Viveros Andres".
 */
export function imeIgralca(ime) {
  const besede = String(ime ?? '').trim().split(/\s+/).filter(Boolean)
  const priimek = besede.filter(veliko)
  const ostalo = besede.filter((b) => !veliko(b))
  if (!priimek.length) return besede.join(' ')
  return [lepo(priimek.join(' ')), ...ostalo].join(' ')
}

// --- tekme in krogi ---------------------------------------------------------

/**
 * Krogi iz zaporedja šifer: [{ krog, t }]. Nov krog, ko bi klub igral drugič
 * ali ko je krog poln (pri lihem številu klubov (N−1)/2 tekem).
 *
 * Tekma, ki jo zveza vpiše na novo (prestavljena ali ponovljena), dobi novo,
 * visoko šifro za blokom in bi sama tvorila krog na koncu. Tekmo iz nepolnega
 * kroga zato prestavimo v najzgodnejši prejšnji nepolni krog, v katerem ne igra
 * nobeden od klubov (luknja, ki jo je pustila), in prazne kroge odstranimo.
 */
export function krogiPoSifrah(tekme) {
  const klubi = new Set(tekme.flatMap((t) => [t.homeTeam?.id, t.awayTeam?.id]))
  const naKrog = Math.max(1, Math.floor(klubi.size / 2))
  const po = new Map()
  let krog = 0
  let v = new Set()
  let st = naKrog
  for (const t of [...tekme].sort((a, b) => a.id - b.id)) {
    const h = t.homeTeam?.id
    const g = t.awayTeam?.id
    if (st >= naKrog || v.has(h) || v.has(g)) { krog++; v = new Set(); st = 0; po.set(krog, []) }
    v.add(h); v.add(g); st++
    po.get(krog).push(t)
  }
  const igra = (s, k) => po.get(s).some((t) => t.homeTeam?.id === k || t.awayTeam?.id === k)
  for (const r of [...po.keys()]) {
    const moje = po.get(r)
    if (moje.length >= naKrog) continue
    for (const t of [...moje]) {
      const cilj = [...po.keys()].find((s) => s < r && po.get(s).length < naKrog && !igra(s, t.homeTeam?.id) && !igra(s, t.awayTeam?.id))
      if (cilj == null) continue
      po.get(cilj).push(t)
      moje.splice(moje.indexOf(t), 1)
    }
  }
  const ostali = [...po.keys()].filter((s) => po.get(s).length)
  // Ponovljena tekma (isti par še enkrat, NL II 2025/26: Msida : Dingli 50920555
  // in 51962893) nima prostega mesta in ostane svoj krog na koncu.
  const zadnji = po.get(ostali.at(-1)) ?? []
  if (ostali.length > 1 && zadnji.length < naKrog && zadnji.every((t) => t.id - (po.get(ostali.at(-2)).at(-1)?.id ?? 0) > 100000))
    console.warn(`mfa: tekme ${zadnji.map((t) => t.id).join(', ')} nimajo mesta v krogih bloka (ponovljene?) — svoj krog ${ostali.length}`)
  return ostali.flatMap((s, i) => po.get(s).map((t) => ({ krog: i + 1, t })))
}

/** Tekmovanja (faze, skupine) sezone z lestvice: [{ id, ime, klubov }]. */
export const skupineLestvice = (lestvica) =>
  (lestvica?.phases ?? []).flatMap((p) => p.groups ?? []).map((g) => ({ id: String(g.id), ime: g.competitionName ?? '', klubov: g.data?.length ?? 0 }))

/**
 * Tekme lige iz seznamov (preteklih in prihodnjih), brez podvojenih, le
 * tekmovanja iz `skupine` (šifra ali lestvica). Tekme drugih tekmovanj istega
 * tipa (dodatne kvalifikacije, odločilne tekme) lestvica ne našteje — izpustimo jih.
 */
export function tekmeLige(koda, seznami, skupine) {
  const { tip } = razbijKodo(koda)
  const ids = new Set(skupine.map(String))
  if (!ids.size) throw new Error(`mfa: ${koda} nima tekmovanj na lestvici sezone — uvoz ustavljen`)
  return [...new Map(seznami.flat().filter((t) => t?.id).map((t) => [t.id, t])).values()]
    .filter((t) => String(t.competitionTypeId ?? tip) === tip && ids.has(String(t.competitionId)))
}

/**
 * Krogi sezone z več fazami (Premier: Opening Round Phase 1 → P2 Top 6 in
 * Bottom 6 → Closing Round …): vsako tekmovanje dobi svoje kroge po šifrah,
 * poznejše pa zamik za zadnjim krogom faz, iz katerih so prišli njegovi klubi.
 * Vzporedni skupini (brez skupnega kluba) si delita številke krogov (kot
 * `vrsticeFaz` pri oefb). Vrne [{ krog, t }].
 */
export function krogiSezone(tekme) {
  const poTekmovanju = new Map()
  for (const t of tekme) {
    const k = String(t.competitionId)
    if (!poTekmovanju.has(k)) poTekmovanju.set(k, [])
    poTekmovanju.get(k).push(t)
  }
  const faze = [...poTekmovanju.values()].map((ts) => {
    const krogi = krogiPoSifrah(ts)
    return {
      krogi,
      zacetek: ts.map((t) => String(t.startDate ?? '')).filter(Boolean).sort()[0] ?? '',
      klubi: new Set(ts.flatMap((t) => [t.homeTeam?.id, t.awayTeam?.id])),
      krogov: Math.max(0, ...krogi.map((x) => x.krog)),
      zamik: 0,
    }
  }).sort((a, b) => a.zacetek.localeCompare(b.zacetek))
  const out = []
  faze.forEach((f, i) => {
    for (const p of faze.slice(0, i)) if ([...f.klubi].some((k) => p.klubi.has(k))) f.zamik = Math.max(f.zamik, p.zamik + p.krogov)
    for (const { krog, t } of f.krogi) out.push({ krog: krog + f.zamik, t })
  })
  return out
}

/** Razpored v obliko uvoza razporeda. Odigrana je tekma s stanjem PLAYED. */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const { krog, t } of krogiSezone(tekme)) {
    const { datum, ura } = lokalniCas(t.startDate)
    if (!krogi.has(krog)) krogi.set(krog, { stevilka: krog, tekme: [] })
    krogi.get(krog).tekme.push({
      domaci: t.homeTeam.name,
      gostje: t.awayTeam.name,
      datum,
      ura,
      kontumacija: false,
      odigrana: t.status === 'PLAYED',
      mfaId: t.id,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ---------------------------------------------------------------

const ZNANE = new Set(['GOAL', 'PENALTY', 'OWN_GOAL', 'PENALTY_FAILED', 'YELLOW', 'SECOND_YELLOW', 'RED', 'SUBSTITUTION'])
// Ekipa, ki je vpisala manj kot toliko začetnikov, nima postave (kot frf, fas).
const NAJMANJ_ZACETNIKOV = 7
export const NEPOPOLN = 'zapisnik nepopoln'

/**
 * Zapisnik iz izida (`/result`) in postave (`/lineup`) v obliko drugih virov.
 * Null, če tekma ni odigrana ali nima izida. Ekipa brez postave → `nepopoln`
 * (izid se zapiše, nastopi le znane ekipe); obe prazni pri 3:0 / 0:3 →
 * `kontumacija`.
 */
export function vZapisnik(izid, postava, { id = null, url = null, tekma = null } = {}) {
  if (!izid || izid.status !== 'PLAYED' || izid.homeScore == null || izid.awayScore == null) return null
  const rezultat = { domaci: Number(izid.homeScore), gostje: Number(izid.awayScore) }
  if (!Number.isFinite(rezultat.domaci) || !Number.isFinite(rezultat.gostje)) return null

  const ekipe = ['homeTeam', 'awayTeam'].map((s) => {
    const igralci = (postava?.[s]?.players ?? []).map((p) => ({
      id: p.id,
      regSt: Number.isInteger(Number(p.id)) && p.id != null ? Number(p.id) : null,
      st: /^\d+$/.test(String(p.number ?? '').trim()) ? Number(p.number) : null,
      ime: imeIgralca(p.name),
      vratar: !!p.isGoalkeeper,
      kapetan: !!p.isCaptain,
      zacetnik: !!p.startingLineup,
      pozicija: p.isGoalkeeper ? 'GK' : null,
      dogodki: p.events ?? [],
    }))
    return { ime: tekma?.[s]?.name ?? null, postava: igralci.filter((i) => i.zacetnik), rezerve: igralci.filter((i) => !i.zacetnik) }
  })

  const opozorila = []
  const kje = new Map()
  ekipe.forEach((e, idx) => [...e.postava, ...e.rezerve].forEach((i) => kje.set(i.id, { idx, i })))
  // Menjava je pri obeh igralcih: dogodke beremo enkrat, po id-ju dogodka.
  const dogodki = new Map()
  for (const e of ekipe) for (const i of [...e.postava, ...e.rezerve]) for (const d of i.dogodki) if (!dogodki.has(d.id)) dogodki.set(d.id, d)

  const kdo = (pid) => {
    const n = kje.get(pid)
    return n ? { ekipaIdx: n.idx, st: n.i.st, ime: n.i.ime, regSt: n.i.regSt } : null
  }
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  for (const d of [...dogodki.values()].sort((a, b) => (minuta(a.time) ?? 0) - (minuta(b.time) ?? 0) || a.id - b.id)) {
    const m = minuta(d.time)
    if (!ZNANE.has(d.type)) opozorila.push(`neznan dogodek "${d.type}" (${d.time ?? '?'}) pri ${d.playerName ?? '?'}`)
    if (m == null) opozorila.push(`dogodek "${d.type}" pri ${d.playerName ?? '?'} brez minute`)
    if (d.type === 'SUBSTITUTION') {
      const noter = kdo(d.playerId)
      const ven = kdo(d.playerIdTwo)
      if (!noter && !ven) continue
      menjave.push({
        ekipaIdx: (noter ?? ven).ekipaIdx,
        minuta: m,
        noter: noter ? { st: noter.st, ime: noter.ime, regSt: noter.regSt } : { st: null, ime: null, regSt: null },
        ven: ven ? { st: ven.st, ime: ven.ime, regSt: ven.regSt } : { st: null, ime: null, regSt: null },
      })
      continue
    }
    const k = kdo(d.playerId)
    if (!k) continue // dogodek trenerja ali igralca zunaj postave
    const z = { ...k, minuta: m }
    if (d.type === 'GOAL') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
    else if (d.type === 'PENALTY') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
    else if (d.type === 'OWN_GOAL') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
    else if (d.type === 'PENALTY_FAILED') zgresene.push(z)
    else if (d.type === 'YELLOW') rumeni.push(z)
    else if (d.type === 'RED' || d.type === 'SECOND_YELLOW') {
      if (!rdeci.some((r) => r.ekipaIdx === z.ekipaIdx && r.regSt === z.regSt)) rdeci.push(z)
    }
  }
  // Drugi rumeni: COMET vpiše prvi rumeni in SECOND_YELLOW (kot lff) — 1 rumeni +
  // 1 rdeči. Če bi vpisal še drugi YELLOW, ga odstranimo.
  for (const r of rdeci) {
    const moji = rumeni.filter((x) => x.ekipaIdx === r.ekipaIdx && x.regSt === r.regSt)
    for (const odvec of moji.slice(1)) rumeni.splice(rumeni.indexOf(odvec), 1)
  }

  const brez = ekipe.map((e) => e.postava.length < NAJMANJ_ZACETNIKOV)
  const kontumacija = brez[0] && brez[1] && !goli.length &&
    ((rezultat.domaci === 3 && rezultat.gostje === 0) || (rezultat.domaci === 0 && rezultat.gostje === 3))
  const nepopoln = !kontumacija && (brez[0] || brez[1])
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${ekipe.filter((_, i) => brez[i]).map((e) => e.ime ?? '?').join(', ')} brez postave`)

  ekipe.forEach((e, i) => {
    if (brez[i]) return
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((x) => x.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev v postavi je ${vratarjev}`)
  })
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (!nepopoln && !kontumacija && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje))
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const { datum } = lokalniCas(tekma?.startDate)
  const vObliko = ({ dogodki: _d, id: _i, zacetnik: _z, ...i }) => i
  return {
    zapisnikId: id,
    url,
    sezona: null,
    krog: null,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    // Polčasa API ne pove.
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
    ...(nepopoln ? { nepopoln: true } : {}),
    ...(kontumacija ? { kontumacija: true } : {}),
  }
}

/**
 * Nastopi po šifri igralca (kot oefb): menjave in kartoni po `regSt`, ne po
 * dresu; oefb zgrešenih 11-metrovk nima, mfa jih ima (PENALTY_FAILED).
 */
export const nastopi = (z) =>
  nastopiPoSifri(z).map((n) => ({
    ...n,
    zgreseneEnajstmetrovke: z.zgresene.filter((g) => g.ekipaIdx === n.ekipaIdx && g.regSt === n.regSt).length,
  }))

// --- klubi --------------------------------------------------------------------

// Ključ kluba: male črke, brez narekovajev ("St. George's", "Luqa St. Andrew’s",
// "Vittoriosa Stars D’Orsini"), malteški znaki (ħ, ż, ċ, ġ) ostanejo.
export const kljucKlubaMt = (ime) =>
  String(ime ?? '')
    .toLocaleLowerCase('mt')
    .replace(/['’`´]/g, '')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

const OBLIKE_MT = new Set(['fc', 'f.c.', 'sc', 's.c.'])
/** Kratko ime: brez FC/SC, največ tri besede ("Vittoriosa Stars D’Orsini" ostane). */
export function kratkoImeMt(polno) {
  const besede = String(polno ?? '').trim().split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_MT.has(b.toLowerCase()))
  return (ostale.length ? ostale : besede).slice(0, 3).join(' ')
}

// --- prenos -------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum, zdaj = Date.now()) => (datum ? (zdaj - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** JSON odgovor; zavrnitev (403, 429) ali izziv ustavi uvoz. */
async function beriJson(prenesi, url, ime, sveze) {
  let besedilo
  try {
    besedilo = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new MfaZavrnitev(`mfa: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(besedilo)) throw new MfaZavrnitev(`mfa: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  try {
    return JSON.parse(besedilo)
  } catch {
    throw new Error(`mfa: ${url} ne vrne JSON-a (${String(besedilo).slice(0, 80)}) — uvoz ustavljen`)
  }
}

/**
 * Vse tekme lige: pretekle in prihodnje, po straneh, dokler stran ni krajša.
 * Tekmovanja sezone da šifra ali lestvica (`/standings?season=`).
 */
export async function vseTekme(koda, prenesi, opcije = {}) {
  const { tekmovanja } = razbijKodo(koda)
  const skupine = tekmovanja ?? skupineLestvice(await beriJson(prenesi, naslovLestvice(koda), imeLestvice(koda), true)).map((s) => s.id)
  const seznami = []
  const preteklih = new Map()
  for (const vrsta of ['pastMatches', 'upcomingMatches']) {
    for (let stran = 1; stran <= 40; stran++) {
      const d = await beriJson(prenesi, naslovSeznama(koda, vrsta, stran), imeSeznama(koda, vrsta, stran), true)
      if (!Array.isArray(d)) throw new Error(`mfa: ${vrsta} za ${koda} ni seznam — uvoz ustavljen`)
      seznami.push(d)
      if (vrsta === 'pastMatches') for (const t of d) preteklih.set(String(t.competitionId), (preteklih.get(String(t.competitionId)) ?? 0) + 1)
      if (d.length < NA_STRAN) break
    }
  }
  const tekme = tekmeLige(koda, seznami, skupine)
  return dopolniZacetek(tekme, preteklih, prenesi, { mapa: opcije.mapa })
}

// Seznam preteklih tekem vrne največ 100 zadnjih tekem tekmovanja (tudi s
// `teamId` ali po straneh; NL II 2025/26: 100 od 132). Starejše najdemo po
// šifri: blok tekmovanja je strnjen, zato beremo `/matches/<id>` navzdol od
// najnižje znane šifre, dokler trikrat zapored ne zadenemo tuje ali neobstoječe
// tekme. Odigrana tekma se ne spremeni — preberemo jo enkrat (predpomnilnik
// vira); neobstoječo (404, 400) si zapomnimo kot `{"ni":…}`.
export const OMEJITEV_SEZNAMA = 100
const MAPA = 'scripts/.predpomnilnik/mfa'
const naslovTekme = (id) => `${API}/matches/${id}`
const imeTekme = (id) => `tekma-${id}.json`

async function tekmaPoSifri(prenesi, id, mapa) {
  const pot = mapa ? `${mapa}/${imeTekme(id)}` : null
  if (pot && existsSync(pot)) {
    try { return JSON.parse(readFileSync(pot, 'utf8')) } catch { /* pokvarjen: preberi znova */ }
  }
  let d
  try {
    d = await beriJson(prenesi, naslovTekme(id), imeTekme(id), true)
  } catch (e) {
    if (e.zavrnitev || ![400, 404].includes(e.status)) throw e
    d = { ni: e.status }
  }
  if (pot && (d.ni || d.status === 'PLAYED')) {
    mkdirSync(mapa, { recursive: true })
    writeFileSync(pot, JSON.stringify(d))
  }
  return d
}

/** Doda najstarejše tekme tekmovanj, ki jih je seznam odrezal (glej zgoraj). */
export async function dopolniZacetek(tekme, preteklih, prenesi, { mapa = MAPA } = {}) {
  const out = [...tekme]
  for (const [c, n] of preteklih) {
    if (n < OMEJITEV_SEZNAMA) continue
    const moje = out.filter((t) => String(t.competitionId) === c)
    if (!moje.length) continue
    const nasa = (d) => !d?.ni && String(d?.competitionId) === c && d.homeTeam && d.awayTeam
    let id = Math.min(...moje.map((t) => t.id))
    let zgresenih = 0
    for (let i = 0; zgresenih < 3 && i < 600; i++) {
      id--
      const d = await tekmaPoSifri(prenesi, id, mapa)
      if (nasa(d)) { out.push(d); zgresenih = 0 } else zgresenih++
    }
    // Meja seznama je po datumu, ne po šifri: v krogu na meji manjka še kakšna
    // tekma z višjo šifro (NL II 2025/26: 50920569–71), prestavljena zgodnja
    // tekma na seznamu pa pusti za sabo luknjo celih krogov (NL I 2025/26:
    // 50921341–63 za 50921340, odigrano šele februarja). Luknje do 120 šifer
    // preberemo; večji razmik je nov blok (Premier: krogi 7–11) ali na novo
    // vpisana tekma.
    const ids = out.filter((t) => String(t.competitionId) === c).map((t) => t.id).sort((a, b) => a - b)
    for (let i = 1; i < ids.length; i++) {
      if (ids[i] - ids[i - 1] < 2 || ids[i] - ids[i - 1] > 120) continue
      for (let j = ids[i - 1] + 1; j < ids[i]; j++) {
        const d = await tekmaPoSifri(prenesi, j, mapa)
        if (nasa(d)) out.push(d)
      }
    }
  }
  return out
}

const vir = {
  ime: 'mfa',
  polnoIme: 'Malta Football Association (matchcentre.mfa.com.mt)',
  drzava: 'MT',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA, 'x-version': '2', Accept: 'application/json' },
  premorMs: 3000,
  imaRegistracije: false,

  // Uvoz razporeda prenese to stran pred `razporedVseStrani` (en zahtevek več).
  naslovRazporeda: naslovLestvice,
  naslovZapisnika: (_koda, id) => naslovPostave(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new MfaZavrnitev(`mfa: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(await vseTekme(koda, prenesi))
  },

  async zapisniki(koda, prenesi, { zdaj = Date.now(), mapa } = {}) {
    const { sezona } = razbijKodo(koda)
    const out = []
    for (const { krog, t } of krogiSezone(await vseTekme(koda, prenesi, { mapa }))) {
      if (t.status !== 'PLAYED') continue
      const { datum } = lokalniCas(t.startDate)
      const starost = starostDni(datum, zdaj)
      // Zapisnik zadnjega tedna se lahko še popravlja; starejšega ne beremo
      // znova — razen če je bil ob branju prazen (do 45 dni).
      const beri = async (sveze) => vZapisnik(
        await beriJson(prenesi, naslovIzida(t.id), imeIzida(t.id), sveze),
        await beriJson(prenesi, naslovPostave(t.id), imePostave(t.id), sveze),
        { id: sifraZapisnika(t.id), url: `${OSNOVNI}/match/${t.id}`, tekma: t },
      )
      const sveze = starost <= 7
      let z = await beri(sveze)
      if (!sveze && starost <= 45 && (!z || z.nepopoln)) z = await beri(true)
      if (!z) continue
      // Kontumacija (3:0 brez postav) nima zapisnika.
      if (z.kontumacija) continue
      z.krog = krog
      z.sezona = sezonaIz(sezona)
      z.datum ??= datum
      out.push({ id: z.zapisnikId, z, url: z.url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaMt,
  kratkoIme: kratkoImeMt,
  poenostavi: kljucKlubaMt,
}

export default vir
