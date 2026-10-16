// Vir: Peşəkar Futbol Liqası (PFL, Azerbajdžan) — I Liqa in II Liqa.
//
// pfl.az je stran React; podatke si naloži iz javnega API-ja
// `https://pfl.az/api/v1` brez ključa in prijave (v svežnju ni nobenega
// ključa, gesla ali žetona — le privzeta koda axios). Beremo iste naslove kot
// stran sama, nič drugega. robots.txt (`User-agent: * / Disallow:`) dovoli vse.
//
// ŠIFRA LIGE je `league_id` ene sezone (II Liqa 2026/27 = `55`, I Liqa = `53`;
// 2025/26: `50` in `49`). Seznam sezon in lig: `/seasons?project_id=3` (II Liqa)
// oziroma `project_id=2` (I Liqa). Ob novi sezoni se popravi šifra.
//
// RAZPORED je `/tours/get-games?league_id=<id>&withGames=true` — isti klic kot
// stran "Təqvim": vsi krogi (`tours`, `title` = številka kroga; "p/o" je
// dodatna tekma za obstanek, ni krog lige) z vsemi tekmami (`club_1`, `club_2`,
// izid, `status` 3 = odigrana, 0 = ne, `start_date` "dd/mm/llll hh:mm" po
// bakujskem času, `protocol_src` = zapisnik PDF). Splošni seznam tekem (`/games`)
// filtrov ne upošteva, ta jih: vsak krog nosi `league.id` in vir to preveri.
// Nerazpisana tekma ima `start_date` ob 00:00 in `end_date` (okno kroga) —
// datum brez ure.
//
// ZAPISNIK je PDF (`protocol_src`, besedilo iz Worda, `pdftotext -layout`):
// glava (sodniki, rumeni in rdeči kartoni, goli z minuto, ločeni z "//" na
// domače in goste), nato dva stolpca: začetna enajsterica ("90. Ime Priimek",
// "(k)" = kapetan), pod igralcem, ki je šel ven, vstop "(9. Ime Priimek, 65)",
// nato "Ehtiyat oyunçular:" (klop) in trener. JSON tekme (`/games/show/<id>`)
// menjav nima, minute golov so v njem lahko za eno premaknjene — PDF je
// verodostojen in edini, ki ga beremo. Šifer igralcev v zapisniku ni:
// identiteta je ime + klub (kot fss, ffm). Vratar ni označen; zveza ga našteje
// prvega, zato ima prvi začetnik `vratar` le kot namig (kot ffm).
//
// PDF pretvori `pdftotext` (poppler-utils), v predpomnilnik gre le besedilo
// brez sodnikov in osebja. Uvozna tokova ga namestita le za Azerbajdžan (`az-`).
//
// Čas: Baku je UTC+4 brez poletnega časa; uvoz dobi ljubljanski čas.
//
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki, prebranih zapisnikov ne
// beremo znova). **Ob 401, 403, 429 ali izzivu se uvoz ustavi — ne obhajaj.**
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { razpakiraj } from '../klubi.mjs'
import { nastopi, sezonaIzDatuma } from './fss.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

const API = 'https://pfl.az/api/v1'
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi -------------------------------------------------------------

/** "55" → 55; vse drugo ustavi uvoz. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)$/)
  if (!m) throw new Error(`pfl-az: šifra lige je league_id sezone (npr. 55), ne "${koda}"`)
  return Number(m[1])
}
export const naslovKrogov = (koda, stran = 1) =>
  `${API}/tours/get-games?league_id=${razbijKodo(koda)}&withGames=true${stran > 1 ? `&page=${stran}` : ''}`
export const naslovTekme = (id) => `${API}/games/show/${String(id).replace(/^az/, '')}?withActions=true`
// Šifra zapisnika v bazi je `az<id>`: `matches.zapisnik_id` je enoličen čez vse
// vire, id tekme PFL (~7000) pa je v številskem prostoru drugih virov.
export const sifraZapisnika = (id) => `az${String(id).replace(/^az/, '')}`
const imeKrogov = (koda, stran) => `pfl-az-krogi-${razbijKodo(koda)}-${stran}.json`
// Ime datoteke nosi ime PDF: popravljen zapisnik zveza naloži kot novo datoteko.
const imeProtokola = (id, url) => `pfl-az-${id}-${String(url).split('/').pop().replace(/[^\w.-]/g, '_')}.txt`

// --- zavrnitev in prenos PDF ------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi (izhod 4) in ne vzame shranjene strani. */
export class PflZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'PflZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (s) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(s ?? '').slice(0, 20000))

/**
 * Besedilo zapisnika brez imen sodnikov, delegata, uradnih oseb in trenerjev
 * (v predpomnilnik in vzorce gre le to). Oznaka ostane, ime gre proč.
 */
export function ocistiProtokol(besedilo) {
  const OSEBJE = /^([^:]*(?:hakim|nümayəndə|məşqçi|inspektor|Rəsmi şəxs)[^:]*:)/iu
  let brisi = false
  const out = []
  for (const v of String(besedilo ?? '').replace(/\r/g, '').split('\n')) {
    const m = v.match(OSEBJE)
    if (m) {
      out.push(`${m[1]} —`)
      brisi = true
      continue
    }
    // Nadaljevanje očiščene vrstice (prelom) gre proč do naslednje oznake ali ekipe.
    if (brisi && !/^[\p{Lu}][\p{L}\- ]{1,45}:/u.test(v) && !v.startsWith(LOCILO) && !jeVrsticaIgralca(v) && v.trim()) continue
    brisi = false
    out.push(v)
  }
  return out.join('\n')
}

const LOCILO = '@@ '

/**
 * Besede PDF z mesti (`pdftotext -bbox`) → besedilo: glava (polna širina), nato
 * stolpec domačih in stolpec gostov, vsak za vrstico `@@ <ime ekipe>`.
 * Stolpca loči lega besed, ne presledki: Word zapisnik postavi s tabulatorji in
 * `-layout` stolpca premakne (pregled 2026/27: meja od 28. do 50. znaka).
 */
export function bboxVBesedilo(html) {
  const besede = []
  let stran = -1
  let sirina = 612
  for (const m of String(html ?? '').matchAll(/<page width="([\d.]+)"|<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)"[^>]*>([^<]*)<\/word>/g)) {
    if (m[1]) {
      stran++
      sirina = Number(m[1])
      continue
    }
    const t = razpakiraj(m[5].replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
    if (t) besede.push({ stran: Math.max(stran, 0), x: Number(m[2]), y: Number(m[3]), x2: Number(m[4]), t })
  }
  besede.sort((a, b) => a.stran - b.stran || a.y - b.y || a.x - b.x)
  // Vrstice: besede iste strani z (skoraj) isto višino.
  const vrstice = []
  for (const b of besede) {
    const v = vrstice.at(-1)
    if (v && v.stran === b.stran && Math.abs(v.y - b.y) < 3) v.besede.push(b)
    else vrstice.push({ stran: b.stran, y: b.y, besede: [b] })
  }
  // Kosi vrstice: besede z razmikom pod 12 pt so isti kos (stolpec).
  for (const v of vrstice) {
    v.besede.sort((a, b) => a.x - b.x)
    v.kosi = []
    for (const b of v.besede) {
      const k = v.kosi.at(-1)
      if (k && b.x - k.x2 < 12) {
        k.t += ` ${b.t}`
        k.x2 = b.x2
      } else v.kosi.push({ x: b.x, x2: b.x2, t: b.t })
    }
  }
  // Prva vrstica s postavo ("90. Ime", "(9. Ime, 65)"); nad njo imeni ekip
  // (v narekovajih ali brez: "MOİK"), nad njima glava.
  const i = vrstice.findIndex((v) => v.kosi.some((k) => jeVrsticaIgralca(k.t)))
  const vVrstico = (v) => v.kosi.map((k) => k.t).join(' ')
  if (i < 0) return vrstice.map(vVrstico).join('\n')
  let g = i
  while (g > 0 && i - g < 3 && vrstice[g - 1].kosi.length <= 2 && vrstice[g - 1].kosi.every((k) => jeImeEkipe(k.t) || !/[:;,\d]/.test(k.t))) g--
  // Meja stolpcev: sredina med levim robom postave in začetkom desnega stolpca.
  const xs = vrstice.slice(i).flatMap((v) => v.kosi.filter((k) => jeVrsticaIgralca(k.t)).map((k) => k.x))
  const levo = Math.min(...xs)
  const desno = xs.filter((x) => x > levo + 80)
  const meja = desno.length ? (levo + Math.min(...desno)) / 2 : sirina / 2
  const stolpca = [[], []]
  const imena = [[], []]
  for (const [n, v] of vrstice.slice(g).entries()) {
    const vrsta = [[], []]
    for (const k of v.kosi) vrsta[k.x >= meja ? 1 : 0].push(k.t)
    for (const s of [0, 1]) if (vrsta[s].length) (n < i - g ? imena : stolpca)[s].push(vrsta[s].join(' '))
  }
  return [
    ...vrstice.slice(0, g).map(vVrstico),
    `${LOCILO}${imena[0].join(' ')}`,
    ...stolpca[0],
    `${LOCILO}${imena[1].join(' ')}`,
    ...stolpca[1],
  ].join('\n') + '\n'
}

function jeVrsticaIgralca(t) {
  return /^\(?\s*\d{1,3}\s*\.\s*\p{L}/u.test(String(t).trim())
}

const execFileP = promisify(execFile)

/** PDF → besedilo (`pdftotext -bbox`, poppler-utils, nato `bboxVBesedilo`). */
export async function pdfVBesedilo(buf) {
  const mapa = await mkdtemp(join(tmpdir(), 'pfl-az-'))
  try {
    const pot = join(mapa, 'zapisnik.pdf')
    await writeFile(pot, buf)
    const { stdout } = await execFileP('pdftotext', ['-bbox', '-enc', 'UTF-8', pot, '-'], { maxBuffer: 16 << 20 })
    return bboxVBesedilo(stdout)
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error('pfl-az: pdftotext ni nameščen (poppler-utils) — uvoz Azerbajdžana ga potrebuje')
    throw e
  } finally {
    await rm(mapa, { recursive: true, force: true })
  }
}

/**
 * `fetch` vira: zavrnitev ustavi uvoz takoj (tudi 429 — ne ponavljamo), PDF
 * vrne kot očiščeno besedilo. Odgovor, ki ni PDF (stran z napako), ali JSON,
 * ki to ni, je napaka in ne gre v predpomnilnik.
 */
export async function pflFetch(url, init) {
  const r = await fetch(url, init)
  if (jeZavrnitev(r.status)) {
    await r.body?.cancel().catch(() => {})
    throw new PflZavrnitev(`pfl-az: ${url} → HTTP ${r.status} — uvoz ustavljen, ne obhajamo`, r.status)
  }
  if (!r.ok) return r
  const buf = Buffer.from(await r.arrayBuffer())
  if (/\.pdf(\?|$)/i.test(url)) {
    if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
      if (jeIzziv(buf.toString('utf8'))) throw new PflZavrnitev(`pfl-az: ${url} vrne izziv — uvoz ustavljen, ne obhajamo`)
      throw new Error(`pfl-az: ${url} ni PDF (${buf.length} B)`)
    }
    return new Response(ocistiProtokol(await pdfVBesedilo(buf)), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  const besedilo = buf.toString('utf8')
  if (jeIzziv(besedilo)) throw new PflZavrnitev(`pfl-az: ${url} vrne izziv — uvoz ustavljen, ne obhajamo`)
  try {
    JSON.parse(besedilo)
  } catch {
    throw new Error(`pfl-az: ${url} ni vrnil JSON (${buf.length} B)`)
  }
  return new Response(besedilo, { status: r.status, headers: { 'content-type': 'application/json' } })
}

// --- čas ---------------------------------------------------------------------------

const ljubljana = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/**
 * "01/09/2026 17:00" (Baku, UTC+4, brez poletnega časa) → ljubljanski
 * { datum, ura }. 00:00 pomeni, da ura še ni znana (nerazpisana tekma): datum
 * ostane bakujski, ure ni.
 */
export function casTekme(s) {
  const m = String(s ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (!m) return { datum: null, ura: null }
  const datum = `${m[3]}-${m[2]}-${m[1]}`
  if (m[4] == null || (Number(m[4]) === 0 && m[5] === '00')) return { datum, ura: null }
  const utc = Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]) - 4, Number(m[5]))
  const d = Object.fromEntries(ljubljana.formatToParts(new Date(utc)).map((p) => [p.type, p.value]))
  return { datum: `${d.year}-${d.month}-${d.day}`, ura: `${d.hour}:${d.minute}` }
}

/** "65" → 65, "45+2" → 45, "90+4" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

// --- razpored ----------------------------------------------------------------------

const presledki = (s) => razpakiraj(String(s ?? '')).replace(/\s+/g, ' ').trim()

/** Odgovor API-ja kot JSON; drugo ustavi uvoz. */
function json(besedilo, url) {
  let d
  try {
    d = JSON.parse(besedilo)
  } catch {
    throw new Error(`pfl-az: ${url} ni vrnil JSON — uvoz ustavljen`)
  }
  return d
}

/**
 * Tekme odgovora krogov: [{ id, krog, domaci, gostje, datum, ura, status, izid, protokol }].
 * Vsak krog mora nositi iskano ligo — sicer API filtra ni upošteval.
 */
export function tekmeKrogov(koda, odgovor) {
  const liga = razbijKodo(koda)
  const out = []
  for (const t of odgovor?.data ?? []) {
    if (t?.league?.id != null && Number(t.league.id) !== liga)
      throw new Error(`pfl-az: krog ${t.title} je iz lige ${t.league.id}, ne ${liga} — filter ni upoštevan, uvoz ustavljen`)
    const krog = /^\d+$/.test(String(t?.title ?? '').trim()) ? Number(t.title) : null
    for (const g of t?.games ?? []) {
      const cas = casTekme(g.start_date)
      const izid = Number.isInteger(g.club_score_1) && Number.isInteger(g.club_score_2) ? { domaci: g.club_score_1, gostje: g.club_score_2 } : null
      out.push({
        id: g.id,
        krog,
        oznakaKroga: presledki(t.title),
        domaci: presledki(g.club_1?.title),
        gostje: presledki(g.club_2?.title),
        datum: cas.datum,
        ura: cas.ura,
        status: g.status,
        izid,
        protokol: g.protocol_src || null,
      })
    }
  }
  return out
}

/** Vse tekme lige z vseh strani odgovora (stran ima 40 krogov). */
export async function vseTekme(koda, prenesi) {
  const out = []
  for (let stran = 1, zadnja = 1; stran <= zadnja; stran++) {
    const url = naslovKrogov(koda, stran)
    const d = json(await prenesi(url, imeKrogov(koda, stran), true), url)
    if (!Array.isArray(d?.data)) throw new Error(`pfl-az: ${url} nima seznama krogov — uvoz ustavljen`)
    zadnja = Math.min(Number(d.last_page) || 1, 20)
    out.push(...tekmeKrogov(koda, d))
  }
  return out
}

/** Odigrana tekma: status 3 z izidom. */
export const jeOdigrana = (t) => t.status === 3 && !!t.izid

/** Razpored: krogi lige (brez "p/o") v ljubljanskem času, odigrane tekme z izidom. */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!t.krog) continue
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: false,
      odigrana: jeOdigrana(t),
      // Za `kontumacije`: tekma in njen zapisnik.
      pflId: t.id,
      protokol: t.protokol,
      ...(jeOdigrana(t) ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].filter((k) => k.tekme.length).sort((a, b) => a.stevilka - b.stevilka)
}

const MESECI_AZ = { yan: 1, fev: 2, mar: 3, apr: 4, may: 5, iyun: 6, iyul: 7, avq: 8, sen: 9, okt: 10, noy: 11, dek: 12 }

/** Datum v prvi vrstici protokola ("1 sentyabr 2026. Saat 17:00. …") → 'YYYY-MM-DD' ali null. */
export function datumProtokola(besedilo) {
  const m = String(besedilo ?? '').match(/^\s*(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u)
  if (!m) return null
  const mesec = m[2].toLocaleLowerCase('az')
  const st = MESECI_AZ[mesec.slice(0, 4)] ?? MESECI_AZ[mesec.slice(0, 3)]
  return st ? `${m[3]}-${String(st).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

/**
 * Je protokol res te tekme? Ujemanje imena ene od ekip (prva beseda ključa)
 * zadošča — datum v protokolu zna biti napačen (2025/26: Səbail : Şəfa ima 6. 2.
 * za 12. 2.). Neujemanje ne odloča, ker protokol piše uradno ali staro ime
 * ("Sheki City" za Şəki, "Quba" za Hypers); takrat datum ±1 dan.
 */
export function protokolTekme(besedilo, tekma) {
  const prva = (ime) => kljucKlubaAz(ime).split(' ')[0] ?? ''
  const imena = razdeliProtokol(besedilo)?.imena ?? []
  const primerjava = imena.map((ime, i) => (prva(ime) ? prva(ime) === prva(i ? tekma?.gostje : tekma?.domaci) : null)).filter((x) => x !== null)
  if (primerjava.some(Boolean)) return true
  const d = datumProtokola(besedilo)
  if (!d || !tekma?.datum) return true
  return Math.abs(Date.parse(`${d}T00:00:00Z`) - Date.parse(`${tekma.datum}T00:00:00Z`)) <= 86400000
}

/**
 * Kontumacija ("texniki məğlubiyyət") iz opombe protokola: "Qeyd: AFFA İntizam
 * Komitəsinin qərarına əsasən “Şəmkir” komandasına 0:3 hesablı texniki
 * məğlubiyyət verilib." → izid z vidika domačih ali null. Kaznovano ekipo
 * poišče po imenu (prva beseda ključa); brez nje izida ne ugibamo.
 */
export function tehnicniPoraz(besedilo, tekma) {
  const s = presledki(String(besedilo ?? '').split('\n').filter((v) => !v.startsWith(LOCILO)).join(' '))
  if (!/texniki\s+məğlubiyyət/i.test(s)) return null
  const m = s.match(/[“"„«]?([^“"„«”»]+?)[”"»]?\s+komandas\p{L}*\s+(\d+)\s*:\s*(\d+)/u)
  if (!m) return { izid: null }
  const kazen = kljucKlubaAz(m[1]).split(' ')[0]
  const prva = (ime) => kljucKlubaAz(ime).split(' ')[0]
  const [a, b] = [Number(m[2]), Number(m[3])]
  if (kazen && prva(tekma.domaci) === kazen && prva(tekma.gostje) !== kazen) return { izid: { domaci: a, gostje: b } }
  if (kazen && prva(tekma.gostje) === kazen && prva(tekma.domaci) !== kazen) return { izid: { domaci: b, gostje: a } }
  return { izid: null }
}

// --- zapisnik (besedilo PDF) ------------------------------------------------------

function jeImeEkipe(t) {
  return /^[“"„«]/.test(String(t).trim())
}

/** Glava in dva stolpca (domači, gostje) iz besedila `bboxVBesedilo`. */
export function razdeliProtokol(besedilo) {
  const vrstice = String(besedilo ?? '').replace(/\r/g, '').split('\n')
  const meje = vrstice.flatMap((v, i) => (v.startsWith(LOCILO) ? [i] : []))
  if (meje.length !== 2) return null
  return {
    glava: vrstice.slice(0, meje[0]),
    // Ime ekipe: del v narekovajih, sicer cela vrstica ("MOİK").
    imena: meje.map((i) => {
      const v = vrstice[i].slice(LOCILO.length)
      return (v.match(/[“"„«]([^”"»]+)/)?.[1] ?? v).trim()
    }),
    stolpca: [vrstice.slice(meje[0] + 1, meje[1]), vrstice.slice(meje[1] + 1)].map((s) => s.filter((v) => v.trim())),
  }
}

/** Polja glave: { 'Qollar': '…', 'Sarı vərəqələr': '…' } (vrstice zlepljene). */
export function poljaGlave(glava) {
  const polja = new Map()
  let zadnje = null
  for (const v of glava) {
    const t = v.trim()
    if (!t) continue
    const m = t.match(/^([\p{Lu}][\p{L}\- ]{1,45}):\s*(.*)$/u)
    if (m) {
      zadnje = m[1].trim()
      polja.set(zadnje, m[2])
    } else if (zadnje) polja.set(zadnje, `${polja.get(zadnje)} ${t}`)
  }
  return polja
}

const poljeGlave = (polja, re) => [...polja.entries()].filter(([k]) => re.test(k)).map(([, v]) => v).join(' ; ')

/**
 * Minute enega vnosa: "14", "45+3", "38 (p.)", "oyundan sonra" (karton po
 * tekmi → 90) ali le "(p.)" brez minute (napaka zapisnika: dogodek šteje,
 * minute ne vemo).
 */
function minuteVnosa(s) {
  const out = []
  for (const x of String(s).matchAll(/(\d{1,3})\s*(?:\+\s*\d+)?\s*(?:\(([^)]*)\))?|(oyundan sonra)\s*(?:\(([^)]*)\))?|\(([^)]*)\)/g)) {
    if (x[1]) out.push({ minuta: minuta(x[1]), oznaka: (x[2] ?? '').trim() })
    else if (x[3]) out.push({ minuta: DOLZINA_TEKME, oznaka: (x[4] ?? '').trim(), poTekmi: true })
    else out.push({ minuta: null, oznaka: (x[5] ?? '').trim() })
  }
  return out
}

/**
 * Seznam dogodkov ("Ime Priimek, 14, 67 (p.); Drugi, 38 // Gost, 70") →
 * [{ stran: 0|1|null, ime, minute: [{ minuta, oznaka }] }]. Brez "//" je stran
 * neznana (ime se poišče v obeh ekipah).
 */
export function dogodkiPolja(besedilo) {
  const s = presledki(besedilo)
  if (!s || /^[-—–]$/.test(s) || /^yoxdur\.?$/i.test(s)) return []
  const deli = s.split('//')
  const out = []
  deli.forEach((del, idx) => {
    const stran = deli.length === 2 ? idx : null
    // ";" loči igralce; vejica pred minuto loči ime od minut.
    for (const vnos of del.split(';')) {
      const v = vnos.trim().replace(/\.$/, '')
      if (!v) continue
      // "Dileyn Açimi, 16; 75": minute istega igralca, ločene s podpičjem.
      const prejsnji = out.at(-1)
      const m = /^\d/.test(v) && prejsnji?.stran === stran ? [null, prejsnji.ime, v] : v.match(/^([^,(]+?)\s*(?:\(([^)]*)\))?\s*,\s*(.*)$/)
      if (m && m[0] === null) {
        out.pop()
        out.push({ ...prejsnji, minute: [...prejsnji.minute, ...minuteVnosa(v)] })
        continue
      }
      if (!m) {
        out.push({ stran, ime: v, minute: [], napaka: true })
        continue
      }
      // "Famil Camalov (p.), 41": oznaka pred minuto velja za vse minute brez svoje.
      const minute = minuteVnosa(m[3]).map((x) => (m[2] && !x.oznaka ? { ...x, oznaka: m[2].trim() } : x))
      if (!minute.length) minute.push({ minuta: null, oznaka: (m[2] ?? '').trim() })
      out.push({ stran, ime: presledki(m[1]), minute })
    }
  })
  return out
}

// Pika za dresom in vejica pred minuto znata biti tipkarsko napačni ("7 Ime", "(11. Ime. 85)").
const IGRALEC = /^(\d{1,3})\s*(?:\.\s*|\s+)(\p{L}.*?)$/u
const VSTOP = /^\(\s*(\d{1,3})\s*\.?\s*(.+?)\s*[,.]\s*(\d{1,3})(?:\s*\+\s*\d+)?\s*\)?$/

/**
 * En stolpec: začetniki (z verigo vstopov pod vsakim), klop. Ime brez oznak
 * "(k)"; "Ime Priimek" → "Priimek Ime".
 */
export function ekipaStolpca(vrstice) {
  // Vstop, ki se prelomi v dve vrstici ("(32. Elməddin" / "Hüseynzadə, 57)"), zlepi.
  const zlepljene = []
  // Vrstica, ki je sama igralec ali vstop, se ne lepi (zaklepaj zna manjkati:
  // "(31. Kristian Kamta, 72").
  for (const v of vrstice) {
    const zadnja = zlepljene.at(-1)
    if (zadnja && zadnja.startsWith('(') && !zadnja.includes(')') && !/,\s*\d{1,3}(\s*\+\s*\d+)?\s*$/.test(zadnja) && !jeVrsticaIgralca(v))
      zlepljene[zlepljene.length - 1] = `${zadnja} ${v.trim()}`
    else zlepljene.push(v)
  }
  const postava = []
  const rezerve = []
  const neznane = []
  let stanje = 'postava'
  for (const v of zlepljene) {
    const t = v.trim()
    if (jeImeEkipe(t)) continue
    // Ime ekipe brez narekovajev ("MOİK"), ki je zdrsnilo v stolpec pred postavo.
    if (!postava.length && stanje === 'postava' && !/\d/.test(t)) continue
    if (/^Ehtiyat/i.test(t)) {
      stanje = 'klop'
      continue
    }
    if (/məşqçi|hakim|nümayəndə/i.test(t)) {
      stanje = 'konec'
      continue
    }
    if (stanje === 'konec') continue
    const vstop = t.match(VSTOP)
    if (vstop && stanje === 'postava') {
      const kdo = postava.at(-1)
      if (!kdo) {
        neznane.push(t)
        continue
      }
      kdo.vstopi.push({ st: Number(vstop[1]), polno: presledki(vstop[2]), minuta: minuta(vstop[3]) })
      continue
    }
    const ig = t.match(IGRALEC)
    if (ig) {
      const kapetan = /\(\s*k\s*\)/i.test(ig[2])
      const polno = presledki(ig[2].replace(/\(\s*k\s*\)/gi, ''))
      const i = { st: Number(ig[1]), polno, kapetan, vstopi: [] }
      if (stanje === 'postava') postava.push(i)
      else rezerve.push(i)
      continue
    }
    neznane.push(t)
  }
  return { postava, rezerve, neznane }
}

/** "Ime Priimek" → "Priimek Ime" (priimek je zadnja beseda). */
export function vPriimekIme(polno) {
  const deli = presledki(polno).split(' ').filter(Boolean)
  return deli.length < 2 ? deli.join(' ') : [deli.at(-1), ...deli.slice(0, -1)].join(' ')
}

const kljucImena = (s) => presledki(s).toLocaleLowerCase('az').replace(/[^\p{L}]+/gu, '')

/** Levenshteinova razdalja (kratki nizi). */
export function razdalja(a, b) {
  let prej = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const zdaj = [i]
    for (let j = 1; j <= b.length; j++) zdaj[j] = Math.min(prej[j] + 1, zdaj[j - 1] + 1, prej[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prej = zdaj
  }
  return prej[b.length]
}

/**
 * Zapisnik v obliko drugih virov. `tekma` je vrstica razporeda (tekmeKrogov).
 * Brez berljivih postav je zapisnik nepopoln: izid ostane, nastopov ni.
 */
export function vZapisnik(besedilo, tekma) {
  if (!tekma?.izid) return null
  // Kontumacija neodigrane tekme: postavi v protokolu nista igrali (označi jo
  // razpored). Odigrana tekma (status 3) z naknadnim tehničnim porazom (2025/26
  // Kür-Araz : Araz Saatlı, 3:0, poraz 0:3 obema) se uvozi, kot je bila odigrana.
  if (tekma.status !== 3 && tehnicniPoraz(besedilo, tekma)) return null
  const opozorila = []
  // Zveza je kdaj pripela protokol druge tekme (2025/26: 6648 ima PDF tekme 6672).
  if (!protokolTekme(besedilo, tekma)) {
    opozorila.push(`protokol je z dne ${datumProtokola(besedilo)}, tekma ${tekma.datum} — ne beremo ga`)
    besedilo = ''
  }
  const deli = razdeliProtokol(besedilo)
  const imenaEkip = [tekma.domaci, tekma.gostje]
  const surovi = deli ? deli.stolpca.map(ekipaStolpca) : [{ postava: [], rezerve: [], neznane: [] }, { postava: [], rezerve: [], neznane: [] }]
  const znana = surovi.map((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
  surovi.forEach((e, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imenaEkip[idx]} — ${e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave v protokolu'}`)
    for (const n of e.neznane.slice(0, 3)) opozorila.push(`${imenaEkip[idx]}: neznana vrstica protokola "${n.slice(0, 60)}"`)
  })

  // Igralci z minutami vstopa in izstopa (veriga: vsak vstop zamenja prejšnjega).
  const ekipe = surovi.map((e, idx) => {
    const postava = []
    const rezerve = []
    for (const [n, z] of e.postava.entries()) {
      const zacetnik = { st: z.st, ime: vPriimekIme(z.polno), polno: z.polno, kapetan: z.kapetan, vratar: n === 0, zacetnik: true, noter: null, ven: null, rdec: null }
      postava.push(zacetnik)
      let prejsnji = zacetnik
      for (const v of z.vstopi) {
        prejsnji.ven = v.minuta
        const r = { st: v.st, ime: vPriimekIme(v.polno), polno: v.polno, kapetan: false, vratar: false, zacetnik: false, noter: v.minuta, ven: null, rdec: null }
        rezerve.push(r)
        prejsnji = r
      }
    }
    for (const z of e.rezerve) {
      if (rezerve.some((r) => r.st === z.st && kljucImena(r.polno) === kljucImena(z.polno))) continue
      rezerve.push({ st: z.st, ime: vPriimekIme(z.polno), polno: z.polno, kapetan: z.kapetan, vratar: false, zacetnik: false, noter: null, ven: null, rdec: null })
    }
    if (znana[idx] && postava.length !== 11) opozorila.push(`${imenaEkip[idx]}: v postavi je ${postava.length} igralcev namesto 11`)
    return { postava, rezerve }
  })

  /**
   * Igralec po imenu: najprej na navedeni strani, nato v obeh ekipah. Tipkarska
   * napaka glave ("İsamyılov" za "İsmayılov") se ujame po razdalji ≤ 2, če je
   * zadetek en sam.
   */
  const najdi = (ime, stran) => {
    const k = kljucImena(ime)
    const vsi = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve]
    const strani = stran == null ? [0, 1] : [stran, 1 - stran]
    for (const idx of strani) {
      const zadetki = vsi(idx).filter((i) => kljucImena(i.polno) === k)
      if (zadetki.length === 1) return { idx, i: zadetki[0] }
    }
    if (k.length < 8) return null
    for (const idx of strani) {
      const blizu = vsi(idx).filter((i) => razdalja(kljucImena(i.polno), k) <= 2)
      if (blizu.length === 1) {
        opozorila.push(`ime "${ime}" iz glave je v postavi "${blizu[0].polno}"`)
        return { idx, i: blizu[0] }
      }
    }
    return null
  }

  const polja = deli ? poljaGlave(deli.glava) : new Map()
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const brezIgralca = (vrsta, d, idx) => opozorila.push(`${vrsta}: "${d.ime}" ni v postavi ${idx == null ? 'nobene ekipe' : imenaEkip[idx]}`)

  for (const d of dogodkiPolja(poljeGlave(polja, /^Qol(lar)?$/i))) {
    const n = najdi(d.ime, d.stran)
    for (const mm of d.minute) {
      const avtogol = /ö\.?\s*q\.?|avto/i.test(mm.oznaka)
      // Avtogol je zapisan pri ekipi, ki ji šteje; strelec je iz druge ekipe.
      const kdo = avtogol ? najdi(d.ime, d.stran == null ? null : 1 - d.stran) : n
      const ekipaIdx = kdo ? kdo.idx : avtogol && d.stran != null ? 1 - d.stran : d.stran
      if (ekipaIdx == null) {
        brezIgralca('gol', d, null)
        continue
      }
      if (!kdo) brezIgralca('gol', d, ekipaIdx)
      goli.push({ ekipaIdx, st: kdo?.i.st ?? null, ime: kdo?.i.ime ?? null, minuta: mm.minuta, avtogol, enajstmetrovka: /^p\.?$/i.test(mm.oznaka) })
    }
  }
  for (const d of dogodkiPolja(poljeGlave(polja, /penalti/i))) {
    const n = najdi(d.ime, d.stran)
    if (!n) brezIgralca('zgrešena 11 m', d, d.stran)
    else for (const mm of d.minute) zgresene.push({ ekipaIdx: n.idx, st: n.i.st, ime: n.i.ime, minuta: mm.minuta })
  }
  const rdeciIgr = new Map()
  for (const d of dogodkiPolja(poljeGlave(polja, /^Qırmızı vərəqə/i))) {
    const n = najdi(d.ime, d.stran)
    if (!n) {
      brezIgralca('rdeči karton', d, d.stran)
      continue
    }
    const m = d.minute[0]?.minuta ?? DOLZINA_TEKME
    if (n.i.rdec == null || m < n.i.rdec) n.i.rdec = m
    rdeciIgr.set(n.i, m)
  }
  for (const [i, m] of rdeciIgr) {
    const idx = ekipe[0].postava.includes(i) || ekipe[0].rezerve.includes(i) ? 0 : 1
    rdeci.push({ ekipaIdx: idx, st: i.st, ime: i.ime, minuta: m })
  }
  for (const d of dogodkiPolja(poljeGlave(polja, /^Sarı vərəqə/i))) {
    const n = najdi(d.ime, d.stran)
    if (!n) {
      brezIgralca('rumeni karton', d, d.stran)
      continue
    }
    // Drugi rumeni (zapisan tudi kot rdeči) je izključitev: 1 rumeni + 1 rdeči.
    let minute = d.minute.length ? d.minute : [{ minuta: DOLZINA_TEKME }]
    if (minute.length >= 2 && rdeciIgr.has(n.i)) minute = minute.slice(0, 1)
    for (const mm of minute) rumeni.push({ ekipaIdx: n.idx, st: n.i.st, ime: n.i.ime, minuta: mm.minuta })
  }

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (znana[0] && znana[1] && (zaEkipo(0) !== tekma.izid.domaci || zaEkipo(1) !== tekma.izid.gostje))
    opozorila.push(`goli iz protokola (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${tekma.izid.domaci}:${tekma.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const vObliko = ({ polno: _p, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  const sestava = ekipe.map((e, idx) =>
    // Ekipa brez znane postave nima nastopov (ne vemo, kdo je igral). Izid ostane.
    znana[idx] ? { ime: imenaEkip[idx], postava: e.postava.map(vObliko), rezerve: e.rezerve.map(vObliko) } : { ime: imenaEkip[idx], postava: [], rezerve: [] },
  )
  const sZnano = (seznam) => seznam.filter((x) => znana[x.ekipaIdx])
  return {
    zapisnikId: sifraZapisnika(tekma.id),
    url: tekma.protokol,
    sezona: sezonaIzDatuma(tekma.datum),
    krog: tekma.krog,
    datum: tekma.datum,
    ura: tekma.ura,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: { ...tekma.izid },
    polcas: null,
    goli: sZnano(goli),
    zgresene: sZnano(zgresene),
    rumeni: sZnano(rumeni),
    rdeci: sZnano(rdeci),
    menjave: [],
    nepopoln: !znana[0] || !znana[1],
    prazen: !surovi[0].postava.length && !surovi[1].postava.length,
    opozorila: [...new Set(opozorila)],
  }
}

/** Zapisnik z obema postavama (≥ 7 začetnikov) — takega ne beremo znova. */
export const popolnZapisnik = (besedilo) => {
  const d = razdeliProtokol(besedilo)
  return !!d && d.stolpca.every((s) => ekipaStolpca(s).postava.length >= NAJMANJ_ZACETNIKOV)
}

// --- klubi --------------------------------------------------------------------------

/** Ključ kluba: male črke z azerbajdžanskimi znaki (ə, ı, ş, ç, ğ, ö, ü), ločila v presledek. */
export const kljucKlubaAz = (ime) =>
  presledki(ime)
    .toLocaleLowerCase('az')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: PFL ime že je kratko ("Qaradağ L.", "Kür-Araz"); brez "FK" na začetku. */
export function kratkoImeAz(polno) {
  const besede = presledki(polno).split(' ')
  return (besede.length > 1 && /^(fk|fc|pfk)$/i.test(besede[0]) ? besede.slice(1) : besede).join(' ')
}

// --- vir ----------------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const vir = {
  ime: 'pfl-az',
  polnoIme: 'Peşəkar Futbol Liqası (pfl.az)',
  drzava: 'AZ',
  osnovniNaslov: 'https://pfl.az/',
  glave: { 'User-Agent': UA, Accept: 'application/json, application/pdf' },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: pflFetch,
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new PflZavrnitev(`pfl-az: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // Shrani le prave odgovore: krogi so JSON s seznamom, protokol ima postavo ali vsaj glavo.
  zaPredpomnilnik: (besedilo, datoteka) =>
    /\.json$/.test(datoteka) ? /^\s*\{/.test(besedilo) && /"data"\s*:\s*\[/.test(besedilo) : !jeIzziv(besedilo) && String(besedilo).trim().length > 0,

  naslovRazporeda: (koda) => naslovKrogov(koda),
  naslovZapisnika: (_koda, id) => naslovTekme(id),

  /** Razpored: krogi lige (brez "p/o"), ljubljanski čas, odigrane z izidom. */
  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(await vseTekme(koda, prenesi))
  },

  /**
   * Zapisniki odigranih tekem. Brez PDF ali z neberljivim je zapisnik nepopoln
   * (izid ostane, nastopov ni); nepopoln se 45 dni bere znova, popoln nikoli.
   */
  async zapisniki(koda, prenesi) {
    const out = []
    for (const t of (await vseTekme(koda, prenesi)).filter((x) => x.krog && jeOdigrana(x))) {
      let besedilo = ''
      if (t.protokol) {
        const ime = imeProtokola(t.id, t.protokol)
        try {
          besedilo = await prenesi(t.protokol, ime)
          if (!popolnZapisnik(besedilo) && starostDni(t.datum) <= 45) besedilo = await prenesi(t.protokol, ime, true)
        } catch (e) {
          if (e.zavrnitev || jeZavrnitev(e.status)) throw e.zavrnitev ? e : new PflZavrnitev(`pfl-az: ${t.protokol} → HTTP ${e.status}`, e.status)
          console.log(`  pfl-az: protokol tekme ${t.id} ni berljiv (${e.message}) — tekma nepopolna`)
          besedilo = ''
        }
      }
      const z = vZapisnik(besedilo, t)
      if (!z) continue
      out.push({ id: z.zapisnikId, z, url: t.protokol ?? naslovTekme(t.id) })
    }
    return out
  },

  /**
   * Kontumacije: PFL tekmo, ki jo disciplinska komisija registrira s 3:0
   * ("texniki məğlubiyyət"), pusti v razporedu kot neodigrano (status 0, izid
   * 0:0) s protokolom, v katerem je opomba. Bere le protokole minulih
   * neodigranih tekem; izid vpiše v vrstico razporeda.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    for (const k of krogi) {
      for (const t of k.tekme) {
        if (!t.protokol || !t.datum || t.datum >= danes) continue
        if (t.odigrana) continue
        const besedilo = await prenesiKrog(t.protokol, imeProtokola(t.pflId, t.protokol), t.datum)
        if (!protokolTekme(besedilo, t)) continue
        const p = tehnicniPoraz(besedilo, t)
        if (!p) continue
        if (p.izid) t.izid = p.izid
        out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaAz,
  kratkoIme: kratkoImeAz,
  poenostavi: kljucKlubaAz,
}

export default vir
