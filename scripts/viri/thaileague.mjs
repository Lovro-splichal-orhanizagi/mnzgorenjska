// Vir: Thai League (TL, Tajska) — Thai League 2 in Thai League 3 (šest regij).
//
// thaileague.co.th je stran Angular; podatke si naloži iz javnega API-ja
// `https://competition.tl.prod.c0d1um.io/thaileague/api/` brez ključa, prijave
// ali žetona (v svežnju je le privzeti XSRF piškotek Angularja, ki ga GET ne
// rabi). Beremo iste naslove kot stran sama, nič drugega. robots.txt na API ne
// obstaja (404), na thaileague.co.th SPA vrne kar naslovnico; pogojev uporabe
// spletišče nima (noga: le "Copyright © - Thai League").
//
// ŠIFRA LIGE je `<turnir>/<stopnja>` ene sezone: turnir je id tekmovanja v
// sezoni (`tournament-dropdown-public/?season=<id>`), stopnja je regija ali
// edina skupina (`stage-dropdown-public/?tournament=<id>`). 2026/27: T3 = 228
// (North 1204, Northeast 1205, East 1207, Central 1208, West 1209, South 1210),
// T2 = 226/1203. Ob novi sezoni se popravi šifra (docs/viri/tajska.md).
//
// RAZPORED je `match-day-match-public/?tournament=<t>&stage=<s>` (JSON, 10 na
// stran, `next`): vse tekme stopnje z `match_day_name` (številka kroga;
// prestavljena tekma ima "3 (ตกค้าง)" = 3. krog), `start_date` in `start_time`
// po bangkoškem času (UTC+7, brez poletnega časa), `match_status` 2 = odigrana,
// izid, `is_ca_approve` (zapisnik potrjen) in `is_cancel`. Imena klubov so
// tajska in angleška (`*_name_en`) — beremo angleška.
//
// ZAPISNIK je PDF "Match Report" (`exports-competition-match/?match_id=<id>&
// type=match_summary_public&is_thai_language=false&tournament=<t>` vrne
// `pdf_url`, ki ga strežnik ustvari ob klicu). JSON tekme postav nima. V PDF:
// dva stolpca, začetna enajsterica in "Substitutes" z dresom, pozicijo
// (GK/DF/MF/FW) in angleškim imenom, za igralcem pa njegovi dogodki. **Vrsto
// dogodka pove le IKONA** (slika v PDF), ne besedilo:
//
//   žoga + "39'" (+ "(OG)")  gol (avtogol)        rumen karton + "85'"  opomin
//   rdeča puščica + "61"      izstop (menjava)    modra puščica + "46"  vstop
//
// Besedilo da `pdftotext -bbox` (poppler-utils, kot fmf in pfl-az), ikone pa
// beremo iz samega PDF: tok strani (operatorja `cm` in `Do`) pove, kje je
// narisana katera slika, slika pa je prepoznana po prstnem odtisu svojih pik
// (`IKONE`). Neznana ikona pomeni nepopoln zapisnik, ne ugibanja. V
// predpomnilnik gre le besedilo postav z oznakami ikon (`{G}`, `{Y}` …), brez
// sodnikov, delegatov, trenerjev in vodij ekip.
//
// Šifer igralcev v zapisniku ni: identiteta je ime + klub + dres (kot fss,
// pfl-az). Ime je v zapisniku zapisano z različnimi velikimi črkami ("tanawit
// kamjoi" in "THANAWAT LOEDCHAI" v isti postavi), zato ga zapišemo kot
// "Tanawit Kamjoi" — sicer bi bil isti igralec ob drugačnem zapisu nov zapis.
// Vzdevek v oklepaju ("(THANADOL)") izpustimo.
//
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki, popolnih zapisnikov ne
// beremo znova — vsak klic izvoza ustvari PDF na njihovem strežniku).
// **Ob 401, 403, 429 ali izzivu se uvoz ustavi — ne obhajaj.**
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { inflateSync } from 'node:zlib'
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiFss } from './fss.mjs'
import { NEPOPOLN } from './frf.mjs'
import { vLjubljano } from './modular11.mjs'

export { NEPOPOLN }

const GOSTITELJ = 'https://competition.tl.prod.c0d1um.io'
const API = `${GOSTITELJ}/thaileague/api`
export const PAS = 'Asia/Bangkok'
const DOLZINA_TEKME = 90
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'
export const ZACETEK = '#thaileague-zapisnik 1'

// --- šifre in naslovi ---------------------------------------------------------------

/** "228/1204" → { turnir: "228", stopnja: "1204" }; vse drugo ustavi uvoz. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)\/(\d+)$/)
  if (!m) throw new Error(`thaileague: šifra lige je "<turnir>/<stopnja>" (npr. 228/1204), ne "${koda}"`)
  return { turnir: m[1], stopnja: m[2] }
}

export const naslovTekem = (koda, stran = 1) => {
  const { turnir, stopnja } = razbijKodo(koda)
  return `${API}/match-day-match-public/?tournament=${turnir}&stage=${stopnja}${stran > 1 ? `&page=${stran}` : ''}`
}
const golId = (id) => String(id).replace(/^th/, '')
export const naslovIzvoza = (turnir, id) =>
  `${API}/exports-competition-match/?match_id=${golId(id)}&type=match_summary_public&is_thai_language=false&tournament=${turnir}`
// Šifra zapisnika v bazi je `th<id>`: `matches.zapisnik_id` je enoličen čez vse
// vire, id tekme TL (~38000) pa je v številskem prostoru drugih virov.
export const sifraZapisnika = (id) => `th${golId(id)}`
const imeTekem = (koda, stran) => `th-tekme-${String(koda).replace(/\//g, '-')}-${stran}.json`
const imeZapisnika = (id) => `th-zapisnik-${golId(id)}.txt`

// --- zavrnitev ----------------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi (izhod 4) in ne vzame shranjene strani. */
export class ThaiLeagueZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'ThaiLeagueZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (s) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(s ?? '').slice(0, 20000))

// --- PDF: slike na strani ------------------------------------------------------------

/**
 * Ikone dogodkov po prstnem odtisu pik (sha256 razpakiranih RGB, prvih 16 znakov;
 * `odtisSlike`). Slika je pri vseh zapisnikih ista datoteka, zato je odtis stalen.
 */
export const IKONE = {
  f68b6d04ff25d926: 'G', // žoga (gol; avtogol ima še "(OG)")
  '7517d8e8f0e52a8f': 'Y', // rumen karton
  e418ff4d08ebdeb2: 'R', // rdeč karton (minuta brez opuščaja: "26", "90+3")
  '24bad4c3039b20be': 'OUT', // rdeča puščica navzdol (izstop)
  b59ee37078e291ee: 'IN', // modra puščica navzgor (vstop)
}

/** Odtis slike: sha256 razpakiranih pik (16 znakov). */
export const odtisSlike = (piki) => createHash('sha256').update(piki).digest('hex').slice(0, 16)

/** Predmeti PDF (brez tokov predmetov — cairo jih ne uporablja): id → { slovar, tok }. */
export function predmetiPdf(buf) {
  const s = Buffer.from(buf).toString('latin1')
  const zacetki = [...s.matchAll(/(?:^|[\r\n])(\d+) 0 obj\b/g)].map((m) => ({ id: Number(m[1]), od: m.index + m[0].length }))
  const surovi = new Map()
  for (const [i, z] of zacetki.entries()) surovi.set(z.id, { od: z.od, do: zacetki[i + 1]?.od ?? s.length })
  const out = new Map()
  const telo = (id) => { const r = surovi.get(id); return r ? s.slice(r.od, r.do) : '' }
  for (const [id, r] of surovi) {
    const t = s.slice(r.od, r.do)
    const k = t.search(/\bstream\r?\n/)
    if (k < 0) { out.set(id, { slovar: t.replace(/endobj[\s\S]*$/, ''), tok: null }); continue }
    const slovar = t.slice(0, k)
    const zacetek = r.od + k + t.slice(k).match(/^stream\r?\n/)[0].length
    const dm = slovar.match(/\/Length\s+(\d+)(\s+0\s+R)?/)
    let dolzina = dm ? Number(dm[1]) : NaN
    if (dm?.[2]) dolzina = Number(telo(dolzina).match(/^\s*(\d+)/)?.[1])
    if (!Number.isFinite(dolzina)) { const e = s.indexOf('endstream', zacetek); dolzina = e - zacetek }
    let tok = Buffer.from(s.slice(zacetek, zacetek + dolzina), 'latin1')
    if (/\/Filter\s*\/FlateDecode/.test(slovar)) tok = inflateSync(tok)
    else if (/\/Filter/.test(slovar)) tok = null // drugih filtrov ne potrebujemo
    out.set(id, { slovar, tok })
  }
  return out
}

/** Strani v vrstnem redu drevesa /Pages: [{ id, slovar }]. */
function stranPdf(predmeti) {
  const koren = [...predmeti.entries()].find(([, p]) => /\/Type\s*\/Pages\b/.test(p.slovar) && !/\/Parent\b/.test(p.slovar))
  if (!koren) throw new Error('thaileague: PDF brez drevesa strani')
  const out = []
  const obisci = (id, globina = 0) => {
    const p = predmeti.get(id)
    if (!p || globina > 10) return
    if (/\/Type\s*\/Pages\b/.test(p.slovar)) {
      const kids = p.slovar.match(/\/Kids\s*\[([^\]]*)\]/)?.[1] ?? ''
      for (const m of kids.matchAll(/(\d+)\s+0\s+R/g)) obisci(Number(m[1]), globina + 1)
    } else if (/\/Type\s*\/Page\b/.test(p.slovar)) out.push({ id, slovar: p.slovar })
  }
  obisci(koren[0])
  return out
}

/** Slovar `<< … >>` za ključem (gnezdenje upoštevano) ali posredno (`N 0 R`). */
function slovarKljuca(predmeti, besedilo, kljuc) {
  const i = besedilo.indexOf(`/${kljuc}`)
  if (i < 0) return null
  const ostalo = besedilo.slice(i + kljuc.length + 1)
  const ref = ostalo.match(/^\s*(\d+)\s+0\s+R/)
  if (ref) return predmeti.get(Number(ref[1]))?.slovar ?? null
  const z = ostalo.indexOf('<<')
  if (z < 0) return null
  let g = 0
  for (let j = z; j < ostalo.length - 1; j++) {
    if (ostalo.startsWith('<<', j)) { g++; j++ } else if (ostalo.startsWith('>>', j)) { g--; j++; if (!g) return ostalo.slice(z, j + 1) }
  }
  return null
}

const mnozi = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
]

/** Kje tok strani nariše slike: [{ ime, matrika }] (q/Q, cm, Do; besedila preskoči). */
export function risbeSlik(tok) {
  const s = Buffer.from(tok).toString('latin1')
  const out = []
  const sklad = []
  let ctm = [1, 0, 0, 1, 0, 0]
  let operandi = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '%') { while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++; continue }
    if (c === '(') { // niz z gnezdenimi oklepaji in ubežnimi znaki
      let g = 0
      for (; i < s.length; i++) {
        if (s[i] === '\\') { i++; continue }
        if (s[i] === '(') g++
        else if (s[i] === ')' && --g === 0) { i++; break }
      }
      operandi.push(null)
      continue
    }
    if (c === '<' && s[i + 1] !== '<') { i = s.indexOf('>', i) + 1 || s.length; operandi.push(null); continue }
    if (c === '<' || c === '>' || c === '[' || c === ']' || c === '{' || c === '}') { i += c === '<' || c === '>' ? 2 : 1; continue }
    if (c === '/') {
      const m = s.slice(i).match(/^\/[^\s/<>[\](){}%]*/)[0]
      operandi.push(m.slice(1))
      i += m.length
      continue
    }
    const m = s.slice(i, i + 64).match(/^[+-]?(\d+\.?\d*|\.\d+)/)
    if (m) { operandi.push(Number(m[0])); i += m[0].length; continue }
    const op = s.slice(i, i + 16).match(/^[A-Za-z'"*]+/)?.[0] ?? s[i]
    i += op.length
    if (op === 'q') sklad.push(ctm)
    else if (op === 'Q') ctm = sklad.pop() ?? [1, 0, 0, 1, 0, 0]
    else if (op === 'cm' && operandi.length >= 6 && operandi.slice(-6).every((x) => typeof x === 'number')) ctm = mnozi(operandi.slice(-6), ctm)
    else if (op === 'Do' && typeof operandi.at(-1) === 'string') out.push({ ime: operandi.at(-1), matrika: ctm })
    else if (op === 'BI') { const e = s.indexOf('EI', i); i = e < 0 ? s.length : e + 2 }
    operandi = []
  }
  return out
}

/**
 * Slike na straneh PDF: [{ stran, x, y, x2, y2, sirina, odtis }] v točkah od
 * zgornjega levega roba (kot `pdftotext -bbox`).
 */
export function slikePdf(buf) {
  const predmeti = predmetiPdf(buf)
  const out = []
  for (const [stran, p] of stranPdf(predmeti).entries()) {
    const visina = Number(p.slovar.match(/\/MediaBox\s*\[\s*[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+([\d.-]+)/)?.[1] ?? 842)
    const vsebina = p.slovar.match(/\/Contents\s*(?:\[([^\]]*)\]|(\d+)\s+0\s+R)/)
    const ids = vsebina ? [...(vsebina[1] ?? `${vsebina[2]} 0 R`).matchAll(/(\d+)\s+0\s+R/g)].map((m) => Number(m[1])) : []
    const tok = Buffer.concat(ids.map((id) => predmeti.get(id)?.tok ?? Buffer.alloc(0)).flatMap((b) => [b, Buffer.from('\n')]))
    const viri = slovarKljuca(predmeti, p.slovar, 'Resources') ?? ''
    const xo = slovarKljuca(predmeti, viri, 'XObject') ?? ''
    const imena = new Map([...xo.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+0\s+R/g)].map((m) => [m[1], Number(m[2])]))
    for (const r of risbeSlik(tok)) {
      const slika = predmeti.get(imena.get(r.ime))
      if (!slika || !/\/Subtype\s*\/Image/.test(slika.slovar) || !slika.tok) continue
      const [a, b, c, d, e, f] = r.matrika
      const xs = [e, a + e, c + e, a + c + e]
      const ys = [f, b + f, d + f, b + d + f].map((y) => visina - y)
      out.push({ stran, x: Math.min(...xs), x2: Math.max(...xs), y: Math.min(...ys), y2: Math.max(...ys), odtis: odtisSlike(slika.tok) })
    }
  }
  return out
}

// --- PDF: besedilo postav ----------------------------------------------------------------

const VELIKOST_IKONE = 12 // večje slike so grbi in sponzorji

/** Oznaka ikone: `{G}`, `{Y}` …, neznana `{?<odtis>}`. */
export const oznakaIkone = (odtis) => `{${IKONE[odtis] ?? `?${odtis}`}}`

/** Besede `pdftotext -bbox`: [{ stran, x, y, x2, y2, t }] in širine strani. */
export function besedeBbox(html) {
  const besede = []
  const sirine = []
  let stran = -1
  for (const m of String(html ?? '').matchAll(/<page width="([\d.]+)"|<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"[^>]*>([^<]*)<\/word>/g)) {
    if (m[1]) { stran++; sirine.push(Number(m[1])); continue }
    const t = razpakiraj(m[6].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')).trim()
    if (t) besede.push({ stran: Math.max(stran, 0), x: Number(m[2]), y: Number(m[3]), x2: Number(m[4]), y2: Number(m[5]), t })
  }
  return { besede, sirine }
}

const jeZacetekIgralca = (t) => /^\[\s*\d+\s*\]/.test(t)
const KONEC_STOLPCA = /^(Head Coach|Team Manager|Additional Time|Match Events|Att:|Coach\b|Official)/i

/**
 * Besede in ikone → besedilo zapisnika (predpomnilnik): `ZACETEK`, nato
 * `@@ <domači>` z vrsticami domačih, `@@ <gostje>` z vrsticami gostov. Le
 * postave — sodniki, delegat, trenerji in vodje ekip ne pridejo vanj.
 */
export function vBesedilo(html, slike = []) {
  const { besede, sirine } = besedeBbox(html)
  const vse = [
    ...besede,
    ...slike.filter((s) => s.x2 - s.x <= VELIKOST_IKONE && s.y2 - s.y <= VELIKOST_IKONE)
      .map((s) => ({ stran: s.stran, x: s.x, x2: s.x2, y: s.y, y2: s.y2, t: oznakaIkone(s.odtis) })),
  ].map((b) => ({ ...b, c: (b.y + b.y2) / 2 }))
  vse.sort((a, b) => a.stran - b.stran || a.c - b.c || a.x - b.x)
  const vrstice = []
  for (const b of vse) {
    const v = vrstice.at(-1)
    if (v && v.stran === b.stran && Math.abs(v.c - b.c) < 4) v.besede.push(b)
    else vrstice.push({ stran: b.stran, c: b.c, besede: [b] })
  }
  for (const v of vrstice) {
    v.besede.sort((a, b) => a.x - b.x)
    // "[ 5 ]" je pri pdftotext več besed; zlepimo ga, da je začetek igralca ena beseda.
    v.t = v.besede.map((b) => b.t)
  }
  const prva = vrstice.findIndex((v) => jeZacetekIgralca(v.besede.map((b) => b.t).join(' ')))
  if (prva < 1) return `${ZACETEK}\n`
  // Meja stolpcev: levi rob desnega "[" (gostje), sicer sredina strani.
  const sirina = sirine[vrstice[prva].stran] ?? 595
  // Le "[n] GK|DF|MF|FW" — tudi tabela dogodkov ima "[28]", a sredi strani.
  const desni = vrstice.slice(prva).flatMap((v) => v.besede.filter((b, i) => b.x > sirina * 0.4 &&
    /^\[\s*\d+\s*\]\s+(GK|DF|MF|FW)\b/.test(v.besede.slice(i, i + 5).map((x) => x.t).join(' '))).map((b) => b.x))
  const meja = (desni.length ? Math.min(...desni) : sirina / 2) - 2
  // Vrstica z imeni ekip je prva nad prvim igralcem, ki ni prelom njegovega imena.
  let g = prva - 1
  while (g > 0 && vrstice[g].stran === vrstice[prva].stran && vrstice[prva].c - vrstice[g].c < PRELOM) g--
  // Celice po stolpcih: { stran, c, t }.
  const celice = [[], []]
  for (const v of vrstice.slice(g)) {
    const deli = [[], []]
    for (const b of v.besede) deli[b.x >= meja ? 1 : 0].push(b.t)
    for (const s of [0, 1]) {
      if (!deli[s].length) continue
      celice[s].push({ stran: v.stran, c: v.c, t: deli[s].join(' ').replace(/\[\s*(\d+)\s*\]/, '[$1]').replace(/\s+/g, ' ').trim() })
    }
  }
  const stolpca = celice.map((cs) => {
    // Dolgo ime se prelomi v dve vrstici, dres in pozicija pa stojita na sredini
    // med njima ("[27] FW" ± 6 pt): prelom pripnemo najbližjemu igralcu.
    const sidra = cs.filter((x) => jeZacetekIgralca(x.t))
    const out = []
    const pripeto = new Map(sidra.map((x) => [x, []]))
    let konec = false
    for (const [i, x] of cs.entries()) {
      if (konec) break
      if (KONEC_STOLPCA.test(x.t)) { konec = true; continue }
      if (i === 0 || jeZacetekIgralca(x.t)) { out.push(x); continue }
      const blizu = sidra.filter((a) => a.stran === x.stran && Math.abs(a.c - x.c) < PRELOM).sort((a, b) => Math.abs(a.c - x.c) - Math.abs(b.c - x.c))[0]
      if (blizu) pripeto.get(blizu).push(x)
      else out.push(x)
    }
    return out.map((x) => [x.t, ...(pripeto.get(x) ?? []).sort((a, b) => a.c - b.c).map((p) => p.t)].join(' '))
  })
  return [ZACETEK, `@@ ${stolpca[0][0] ?? ''}`, ...stolpca[0].slice(1), `@@ ${stolpca[1][0] ?? ''}`, ...stolpca[1].slice(1)].join('\n') + '\n'
}
const PRELOM = 9 // pt: prelomljena vrstica imena je ~6 pt od dresa, naslednji igralec ~12 pt

const execFileP = promisify(execFile)

/** PDF → besedilo zapisnika (`pdftotext -bbox` za besede, tok strani za ikone). */
export async function pdfVBesedilo(buf) {
  const mapa = await mkdtemp(join(tmpdir(), 'thaileague-'))
  try {
    const pot = join(mapa, 'zapisnik.pdf')
    await writeFile(pot, buf)
    const { stdout } = await execFileP('pdftotext', ['-bbox', '-enc', 'UTF-8', pot, '-'], { maxBuffer: 16 << 20 })
    return vBesedilo(stdout, slikePdf(buf))
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error('thaileague: pdftotext ni nameščen (poppler-utils) — uvoz Tajske ga potrebuje')
    throw e
  } finally {
    await rm(mapa, { recursive: true, force: true })
  }
}

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * `fetch` vira. Zavrnitev ustavi uvoz takoj (tudi 429 — ne ponavljamo). Naslov
 * izvoza da JSON s `pdf_url`; ta PDF preberemo (po premoru) in vrnemo kot
 * besedilo zapisnika — v predpomnilnik gre besedilo, ne PDF. JSON, ki to ni,
 * je napaka in ne gre v predpomnilnik.
 */
export async function thFetch(url, init = {}, { fetchFn = fetch, pdf = pdfVBesedilo, premorMs = PREMOR_MS } = {}) {
  const preberi = async (u, moznosti) => {
    const r = await fetchFn(u, moznosti)
    if (jeZavrnitev(r.status)) {
      await r.body?.cancel?.().catch(() => {})
      throw new ThaiLeagueZavrnitev(`thaileague: ${u} → HTTP ${r.status} — uvoz ustavljen, ne obhajamo`, r.status)
    }
    return r
  }
  const r = await preberi(url, init)
  if (!r.ok) return r
  const besedilo = await r.text()
  if (jeIzziv(besedilo)) throw new ThaiLeagueZavrnitev(`thaileague: ${url} vrne izziv — uvoz ustavljen, ne obhajamo`)
  let json
  try {
    json = JSON.parse(besedilo)
  } catch {
    throw new Error(`thaileague: ${url} ni vrnil JSON (${besedilo.length} B)`)
  }
  if (!/\/exports-competition-match\//.test(url)) return new Response(besedilo, { status: r.status, headers: { 'content-type': 'application/json' } })
  const pdfUrl = String(json?.pdf_url ?? '')
  if (!pdfUrl.startsWith(`${GOSTITELJ}/media/`)) throw new Error(`thaileague: izvoz ${url} ni vrnil PDF (${besedilo.slice(0, 120)})`)
  if (premorMs) await cakaj(premorMs)
  const p = await preberi(pdfUrl, { headers: init.headers, signal: AbortSignal.timeout(60000) })
  if (!p.ok) throw new Error(`thaileague: ${pdfUrl} → HTTP ${p.status}`)
  const buf = Buffer.from(await p.arrayBuffer())
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    if (jeIzziv(buf.toString('utf8'))) throw new ThaiLeagueZavrnitev(`thaileague: ${pdfUrl} vrne izziv — uvoz ustavljen, ne obhajamo`)
    throw new Error(`thaileague: ${pdfUrl} ni PDF (${buf.length} B)`)
  }
  return new Response(await pdf(buf), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

// --- razpored -----------------------------------------------------------------------

const presledki = (s) => razpakiraj(String(s ?? '')).replace(/\s+/g, ' ').trim()

/** Ime kluba: angleško, sicer tajsko (presledki strnjeni). */
export const imeKluba = (en, th) => presledki(en) || presledki(th)

/** "3" ali "3 (ตกค้าง)" (prestavljena) → 3. */
export const krogTekme = (ime) => {
  const m = String(ime ?? '').trim().match(/^(\d+)/)
  return m ? Number(m[1]) : null
}

/** Sezona "2026/27" iz imena turnirja ("BYD DOLPHIN LEAGUE III 2026/27"), sicer iz datuma (meja 1. julij). */
export function sezonaTekme(t) {
  const m = String(t?.tournament_name_en ?? '').match(/\b(20\d\d)\/(\d\d)\b/)
  if (m) return `${m[1]}/${m[2]}`
  const d = String(t?.start_date ?? '').match(/^(\d{4})-(\d{2})/)
  if (!d) return null
  const z = Number(d[2]) >= 7 ? Number(d[1]) : Number(d[1]) - 1
  return `${z}/${String((z + 1) % 100).padStart(2, '0')}`
}

/** Tekma API → oblika vira: krog, klubi, ljubljanski čas, izid (le odigrana). */
export function tekma(t) {
  const { datum, ura } = vLjubljano(t.start_date, String(t.start_time ?? '').slice(0, 5), PAS)
  const odigrana = t.match_status === 2 && Number.isInteger(t.home_goal_count) && Number.isInteger(t.away_goal_count)
  return {
    id: t.id,
    turnir: String(t.tournament_id),
    stopnja: String(t.stage_id),
    krog: krogTekme(t.match_day_name),
    domaci: imeKluba(t.home_team_name_en, t.home_team_name),
    gostje: imeKluba(t.away_team_name_en, t.away_team_name),
    datumLokalno: t.start_date || null,
    uraLokalno: t.start_time ? String(t.start_time).slice(0, 5) : null,
    datum: datum ?? (t.start_date || null),
    ura,
    sezona: sezonaTekme(t),
    odigrana,
    izid: odigrana ? { domaci: t.home_goal_count, gostje: t.away_goal_count } : null,
    potrjen: !!t.is_ca_approve,
    odpovedana: !!t.is_cancel,
  }
}

/** Vse tekme stopnje (vse strani, vedno sveže); tuja stopnja ali turnir ustavi uvoz. */
export async function vseTekme(koda, prenesi) {
  const { turnir, stopnja } = razbijKodo(koda)
  const out = []
  for (let s = 1; s <= 60; s++) {
    const besedilo = await beri(prenesi, naslovTekem(koda, s), imeTekem(koda, s), true)
    let d
    try { d = JSON.parse(besedilo) } catch { throw new Error(`thaileague: ${naslovTekem(koda, s)} ni JSON — uvoz ustavljen`) }
    if (!Array.isArray(d?.results)) throw new Error(`thaileague: ${naslovTekem(koda, s)} nima seznama tekem — uvoz ustavljen`)
    for (const t of d.results) {
      if (String(t.tournament_id) !== turnir || String(t.stage_id) !== stopnja)
        throw new Error(`thaileague: tekma ${t.id} je iz ${t.tournament_id}/${t.stage_id}, ne ${koda} — uvoz ustavljen`)
      out.push(tekma(t))
    }
    if (!d.next) break
  }
  return out
}

/** Razpored: krogi z vsemi tekmami (tudi brez zapisnika), odpovedane izpuščene. */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (t.krog == null || t.odpovedana) continue
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({ domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: t.odigrana, izid: t.izid })
  }
  for (const k of krogi.values()) k.tekme.sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.ura ?? '').localeCompare(String(b.ura ?? '')))
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik -----------------------------------------------------------------------

const POZICIJE = { GK: 'GK', DF: 'DEF', MF: 'MID', FW: 'FWD' }

/** "tanawit kamjoi" / "THANAWAT LOEDCHAI" → "Tanawit Kamjoi" (tajska pisava ostane). */
export const imeIgralca = (s) =>
  // Zabloden tajski znak ("์NACHANOK") na začetku besede gre proč.
  presledki(String(s ?? '').replace(/(^|\s)\p{M}+/gu, '$1')).toLocaleLowerCase('en').replace(/(^|[\s\-'.(])(\p{Ll})/gu, (_, a, b) => a + b.toLocaleUpperCase('en'))

/** "39'" → 39, "90+4" → 90, "45+2'" → 45 (podaljšek se ne šteje). */
export function minuta(s) {
  const m = String(s ?? '').match(/^(\d{1,3})(?:\+\d{1,2})?'?$/)
  if (!m) return null
  const n = Number(m[1])
  return n > 0 ? Math.min(n, DOLZINA_TEKME) : null
}
const jeMinuta = (s) => /^\d{1,3}(\+\d{1,2})?'?$/.test(String(s ?? ''))

/**
 * Vrstica igralca: "[5] DF Thanadol Dumponngam (THANADOL) {G} 39' (OG)" →
 * { st, pozicija, ime, dogodki: [{ ikona, minuta, surova, opombe }], napake }.
 */
export function vrsticaIgralca(v) {
  const m = String(v).match(/^\[(\d+)\]\s+(GK|DF|MF|FW)\s+(.*)$/)
  if (!m) return null
  const deli = m[3].split(' ')
  const k = deli.findIndex((d) => /^\{.*\}$/.test(d))
  const imeDeli = k < 0 ? deli : deli.slice(0, k)
  const napake = []
  if (imeDeli.some(jeMinuta)) napake.push(`minuta brez ikone pri ${m[3]}`)
  const ime = imeIgralca(imeDeli.join(' ').replace(/\s*\(C\)\s*/gi, ' ').replace(/\s*\([^()]*\)\s*$/, ''))
  const dogodki = []
  for (const d of k < 0 ? [] : deli.slice(k)) {
    const ikona = d.match(/^\{(.*)\}$/)?.[1]
    if (ikona) { dogodki.push({ ikona, minuta: null, surova: null, opombe: [] }); continue }
    const zadnji = dogodki.at(-1)
    if (jeMinuta(d) && zadnji && zadnji.surova == null) { zadnji.surova = d; zadnji.minuta = minuta(d); zadnji.apostrof = d.endsWith("'"); continue }
    if (zadnji) zadnji.opombe.push(d)
    else napake.push(`nerazumljen dogodek "${d}"`)
  }
  for (const d of dogodki) if (d.surova == null) napake.push(`ikona {${d.ikona}} brez minute pri ${ime}`)
  return { st: Number(m[1]), pozicija: POZICIJE[m[2]], ime, dogodki, napake }
}

/** Besedilo zapisnika → [domači, gostje]: { ime, postava, rezerve, napake }. */
export function ekipeZapisnika(besedilo) {
  const s = String(besedilo ?? '')
  if (!s.startsWith(ZACETEK)) return null
  const deli = s.split('\n@@ ').slice(1)
  if (deli.length !== 2) return null
  return deli.map((d) => {
    const [ime, ...vrstice] = d.replace(/\n+$/, '').split('\n')
    const e = { ime: presledki(ime), postava: [], rezerve: [], napake: [] }
    let klop = false
    for (const v of vrstice) {
      if (/^Substitutes\b/i.test(v)) { klop = true; continue }
      const i = vrsticaIgralca(v)
      if (i) { (klop ? e.rezerve : e.postava).push(i); continue }
      // Prelomljena vrstica: dogodki prejšnjega igralca.
      const zadnji = (klop ? e.rezerve : e.postava).at(-1)
      if (zadnji && /^\{/.test(v)) {
        const dodatek = vrsticaIgralca(`[${zadnji.st}] GK x ${v}`)
        if (dodatek) { zadnji.dogodki.push(...dodatek.dogodki); zadnji.napake.push(...dodatek.napake); continue }
      }
      e.napake.push(`nerazumljena vrstica "${v}"`)
    }
    return e
  })
}

/** Zapisnik je v predpomnilniku, če je razčlenjen in popoln (nepopoln se bere znova). */
export function popolnZapisnik(besedilo) {
  const e = ekipeZapisnika(besedilo)
  return !!e && e.every((x) => x.postava.length === 11 && !x.napake.length && [...x.postava, ...x.rezerve].every((i) => !i.napake.length &&
    i.dogodki.every((d) => VRSTE.has(d.ikona))))
}

const VRSTE = new Set(['G', 'Y', 'R', 'YR', 'IN', 'OUT'])

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. `t` je tekma iz razporeda (klubi,
 * krog, izid, čas); PDF da postave in dogodke. Nepopoln (`nepopoln: true`, kot
 * frf): ni 11 začetnikov, goli ≠ izid, neznana ikona, neparna menjava.
 */
export function vZapisnik(besedilo, t) {
  if (!t?.izid) return null
  const ekipe = ekipeZapisnika(besedilo)
  const opozorila = []
  const razlogi = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const strani = [{ ime: t.domaci, postava: [], rezerve: [] }, { ime: t.gostje, postava: [], rezerve: [] }]
  if (!ekipe) razlogi.push('zapisnika ni ali ga ni mogoče prebrati')
  for (const [idx, e] of (ekipe ?? []).entries()) {
    razlogi.push(...e.napake)
    const igralci = [...e.postava.map((i) => ({ ...i, zacetnik: true })), ...e.rezerve.map((i) => ({ ...i, zacetnik: false }))]
    const vstopi = []
    const izstopi = []
    for (const i of igralci) {
      razlogi.push(...i.napake)
      const kdo = { ekipaIdx: idx, st: i.st, ime: i.ime }
      i.noter = null
      i.ven = null
      i.rdec = null
      for (const d of i.dogodki) {
        if (d.minuta == null) continue
        if (!VRSTE.has(d.ikona)) { razlogi.push(`${e.ime}: neznana ikona {${d.ikona}} pri ${i.ime}`); continue }
        if (d.ikona === 'G') {
          const avtogol = d.opombe.some((o) => /^\(OG\)$/i.test(o))
          const enajstmetrovka = d.opombe.some((o) => /^\((P|PEN|PK)\)$/i.test(o))
          for (const o of d.opombe) if (!/^\((OG|P|PEN|PK)\)$/i.test(o)) opozorila.push(`${i.ime}: neznana opomba pri golu "${o}"`)
          goli.push({ ...kdo, minuta: d.minuta, avtogol, enajstmetrovka })
        } else if (d.ikona === 'Y') rumeni.push({ ...kdo, minuta: d.minuta })
        else if (d.ikona === 'R' || d.ikona === 'YR') {
          // Drugi rumeni: kot pri drugih virih 1 rumeni + 1 rdeči.
          if (d.ikona === 'YR' && !rumeni.some((r) => r.ekipaIdx === idx && r.st === i.st)) rumeni.push({ ...kdo, minuta: d.minuta })
          if (!rdeci.some((r) => r.ekipaIdx === idx && r.st === i.st)) rdeci.push({ ...kdo, minuta: d.minuta })
          i.rdec = d.minuta
        } else if (d.ikona === 'IN') {
          if (i.zacetnik || i.noter != null) razlogi.push(`${e.ime}: ${i.ime} vstopi, a je že igral`)
          i.noter = d.minuta
          vstopi.push({ i, surova: d.surova, minuta: d.minuta })
        } else if (d.ikona === 'OUT') {
          i.ven = d.minuta
          izstopi.push({ i, surova: d.surova, minuta: d.minuta })
        }
      }
      if (!i.zacetnik && i.ven != null && i.noter == null) razlogi.push(`${e.ime}: ${i.ime} izstopi, ne da bi vstopil`)
    }
    // Menjave v pare: najprej ista zapisana minuta ("90+4"), nato ista minuta.
    const prosti = [...izstopi]
    const vObliko = (x) => (x ? { st: x.i.st, ime: x.i.ime, regSt: null } : { st: null, ime: null, regSt: null })
    const pari = []
    for (const v of vstopi) {
      let k = prosti.findIndex((x) => x.surova === v.surova)
      if (k < 0) k = prosti.findIndex((x) => x.minuta === v.minuta)
      pari.push({ v, ven: k < 0 ? null : prosti.splice(k, 1)[0] })
    }
    for (const p of pari) menjave.push({ ekipaIdx: idx, minuta: p.v.minuta, noter: vObliko(p.v), ven: vObliko(p.ven) })
    for (const x of prosti) menjave.push({ ekipaIdx: idx, minuta: x.minuta, noter: vObliko(null), ven: vObliko(x) })
    const neparnih = pari.filter((p) => !p.ven).length + prosti.length
    if (neparnih) razlogi.push(`${e.ime}: ${neparnih} menjav brez para (vstop ↔ izstop)`)
    const vObl = (i) => ({ st: i.st, ime: i.ime, regSt: null, pozicija: i.pozicija, vratar: i.pozicija === 'GK' && i.zacetnik, zacetnik: i.zacetnik, noter: i.noter, ven: i.ven, rdec: i.rdec })
    strani[idx].postava = igralci.filter((i) => i.zacetnik).map(vObl)
    strani[idx].rezerve = igralci.filter((i) => !i.zacetnik).map(vObl)
    if (presledki(e.ime).toLowerCase() !== presledki(idx ? t.gostje : t.domaci).toLowerCase())
      opozorila.push(`zapisnik piše ${e.ime}, razpored ${idx ? t.gostje : t.domaci}`)
  }
  // Rezerva, ki zamenja začetnega vratarja, je vratar (namig kot pri modular11).
  for (const mm of menjave) {
    const ven = strani[mm.ekipaIdx].postava.find((i) => i.st === mm.ven.st && i.vratar)
    const noter = ven && strani[mm.ekipaIdx].rezerve.find((i) => i.st === mm.noter.st)
    if (noter && noter.pozicija === 'GK') noter.vratar = true
  }
  const rezultat = { ...t.izid }
  if (ekipe) {
    strani.forEach((e) => {
      if (e.postava.length !== 11) razlogi.push(`${e.ime} — ${e.postava.length} začetnikov`)
      const vratarjev = e.postava.filter((i) => i.vratar).length
      if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev v postavi je ${vratarjev}`)
      if (!menjave.some((x) => x.ekipaIdx === strani.indexOf(e))) opozorila.push(`${e.ime}: brez menjav`)
    })
    const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
    if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
      razlogi.push(`goli iz zapisnika ${zaEkipo(0)}:${zaEkipo(1)}, izid ${rezultat.domaci}:${rezultat.gostje}`)
  }
  const nepopoln = razlogi.length > 0
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${[...new Set(razlogi)].join('; ')}`)
  return {
    zapisnikId: sifraZapisnika(t.id),
    url: naslovIzvoza(t.turnir, t.id),
    sezona: t.sezona,
    krog: t.krog,
    datum: t.datum,
    ura: t.ura,
    datumLokalno: t.datumLokalno,
    pas: PAS,
    domaci: strani[0],
    gostje: strani[1],
    rezultat,
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    opozorila,
  }
}

/** Nastopi po vrsticah igralcev (kot fss), s pozicijo iz zapisnika. */
export function nastopi(z) {
  const poz = new Map([z.domaci, z.gostje].flatMap((e, idx) => [...e.postava, ...e.rezerve].map((i) => [`${idx}|${i.st}|${i.ime}`, i.pozicija])))
  return nastopiFss(z).map((n) => ({ ...n, pozicija: poz.get(`${n.ekipaIdx}|${n.st}|${n.ime}`) ?? n.pozicija }))
}

// --- klubi --------------------------------------------------------------------------

export const kljucKlubaTh = (ime) =>
  razpakiraj(String(ime ?? ''))
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()

const OBLIKE_TH = new Set(['fc', 'f.c.'])

/** Kratko ime: brez "FC", največ tri besede ("CHIANGRAI TSC FC" → "CHIANGRAI TSC"). */
export function kratkoImeTh(polno) {
  const besede = presledki(polno).split(' ').filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_TH.has(b.toLowerCase()))
  return (ostale.length ? ostale : besede).slice(0, 3).join(' ')
}

// --- prenos -------------------------------------------------------------------------

/** Prenos, ki zavrnitve ne skrije. */
async function beri(prenesi, url, ime, sveze) {
  try {
    return await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new ThaiLeagueZavrnitev(`thaileague: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/**
 * Kaj sme v predpomnilnik: seznam tekem (JSON s `results`) in besedilo
 * zapisnika (tudi nepopolno — tega `zapisniki` 45 dni bere znova sveže, potem
 * obvelja, da vsak nočni uvoz ne ustvari novega PDF na strežniku TL).
 */
export function zaPredpomnilnik(besedilo, datoteka) {
  const ime = String(datoteka ?? '')
  if (ime.startsWith('th-zapisnik-')) return String(besedilo ?? '').startsWith(ZACETEK)
  if (ime.startsWith('th-tekme-')) {
    try { return Array.isArray(JSON.parse(besedilo)?.results) } catch { return false }
  }
  return true
}

const vir = {
  ime: 'thaileague',
  polnoIme: 'Thai League (thaileague.co.th)',
  drzava: 'TH',
  osnovniNaslov: 'https://thaileague.co.th',
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: (url, moznosti) => thFetch(url, moznosti),

  naslovRazporeda: (koda) => naslovTekem(koda),
  naslovZapisnika: (koda, id) => naslovIzvoza(razbijKodo(koda).turnir, id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new ThaiLeagueZavrnitev(`thaileague: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  zaPredpomnilnik,
  // Razpored je ostranjen JSON; uvoz razporeda ga dobi prek `razporedVseStrani`.
  razporedBrezUvodnegaPrenosa: true,

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(await vseTekme(koda, prenesi))
  },

  /**
   * Zapisniki odigranih in potrjenih (`is_ca_approve`) tekem. Nepopoln zapisnik
   * se 45 dni po tekmi bere znova; popoln nikoli.
   */
  async zapisniki(koda, prenesi, { preskoci = new Set(), samoZapisnik = null } = {}) {
    const { turnir } = razbijKodo(koda)
    const out = []
    for (const t of (await vseTekme(koda, prenesi)).filter((x) => x.odigrana && x.potrjen && x.krog != null && !x.odpovedana)) {
      const id = sifraZapisnika(t.id)
      if (samoZapisnik && String(samoZapisnik) !== id && String(samoZapisnik) !== String(t.id)) continue
      if (preskoci.has?.(id)) continue
      const url = naslovIzvoza(turnir, t.id)
      let besedilo = ''
      try {
        besedilo = await beri(prenesi, url, imeZapisnika(t.id), false)
        if (!popolnZapisnik(besedilo) && starostDni(t.datum) <= 45) besedilo = await beri(prenesi, url, imeZapisnika(t.id), true)
      } catch (e) {
        if (e.zavrnitev) throw e
        console.log(`  thaileague: zapisnik tekme ${t.id} ni berljiv (${e.message}) — tekma nepopolna`)
      }
      const z = vZapisnik(besedilo, t)
      if (!z) continue
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaTh,
  kratkoIme: kratkoImeTh,
  poenostavi: kljucKlubaTh,
}

export default vir
