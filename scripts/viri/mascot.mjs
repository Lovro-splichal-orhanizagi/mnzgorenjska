// Vir: regionalne zveze EPS na platformi Mascot Network Hellas (Mascotnet) —
// Grčija. Glej CLAUDE.md (Grčija — vir mascot).
//
// Mascotnet (mascotnet.com) gosti in vodi spletišča desetih EPS (Ένωση
// Ποδοσφαιρικών Σωματείων), vsako na svoji domeni: Makedonija/Solun (epsm.gr),
// Ahaja, Pela, Drama, Kozani, Krf, Tesprotija, Lezbos, Imatija in
// Preveza-Lefkada (`DOMENE`). Koda je ista (ASP), predloge strani pa se med
// domenami razlikujejo, zato se razčlenjevalnik drži besedila in nekaj stalnih
// razredov (`epsm-…`), ne postavitve.
//
// PISNO DOVOLJENJE: pogoji Mascotneta (mascotnet.com/terms.asp) samodejno
// branje prepovedujejo; SLFF ima pisno dovoljenje upravljavca (pridobil Lovro,
// oktober 2026). Dovoljenje NE pokriva tehnične zaščite: ob 401, 403, 429,
// izzivu ali CAPTCHI se uvoz ustavi (`MascotZavrnitev`, izhod 4) — ne obhajaj.
// Beremo vljudno: User-Agent SLFF, 3 s med zahtevki, zaključenih zapisnikov ne
// beremo znova.
//
// ŠIFRA LIGE je `<domena>:<diorganosi>` (`epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ`),
// `diorganosi` natanko tak, kot ga ima meni domene (`table.asp?diorganosi=…`).
// Arhiva ni (pretekle sezone so pri Ahaji le slike), stran lige vsako sezono
// pokaže tekočo — šifra se ob novi sezoni ne spremeni, če zveza ligo imenuje
// enako. Ker so v šifri grške črke, `sifra()` iz `zapisniki.mjs` ni enolična
// (vse grške črke postanejo `_`): vir zato svojih datotek ne imenuje po njej.
//
// RAZPORED: `table_analytika.asp` (epsm, Krf, Lezbos) ali `table.asp` (ostale)
// — krogi "N<sup>η</sup> ΑΓΩΝΙΣΤΙΚΗ", tekma "Domači - Gostje", izid, pri nekaterih
// datum in ura (atenski čas → ljubljanski −1 h), povezava
// `game.asp?game_number=N&match_date=dd.mm.yyyy`. Številka tekme je enolična
// znotraj domene in sezone (vsaka liga ima svoj tisočak), zato je šifra
// zapisnika `gr-<zveza>-<leto začetka sezone>-<N>`. Tekma brez datuma dobi
// datum s svoje strani (ta obstaja že pred tekmo); kroge brez znanega datuma
// vir oceni (+7 dni, `rounds.datum_ocenjen`) kot fssid.
//
// ZAPISNIK `game.asp`: imeni klubov, izid, strelci po ekipah ("27' ΙΜΕ"),
// datum in ura, za vsako ekipo seznam "NN. ΠΡΙΙΜΕΚ Ι." — pred `<hr>` začetniki,
// za njim klop (Ahaja klopi ne objavi), nato menjave "61' ΙΖSTOP - VSTOP"
// (Ahaja "VSTOP - IZSTOP"; smer vir razbere iz tega, kdo je na igrišču).
// Dres je prava številka (začetnik ima lahko 17, klop 03). Kartonov in
// asistenc stran nima. Prvi začetnik je vratar (namig → GK, kot eps, ffm).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { nastopi, sezonaIzDatuma } from './fss.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi }

const UA = 'SLFF fantasy (https://slff.eu)'
export const PREMOR_MS = 3000
const DOLZINA_TEKME = 90
const URA = 3600000
const DAN = 24 * URA
// Lastni predpomnilnik za strani, ki jih uvoz razporeda sicer bere vedno sveže
// (strani neodigranih tekem za datume). Smoke ga preusmeri v začasno mapo.
const mapa = () => process.env.SLFF_MASCOT_MAPA || 'scripts/.predpomnilnik/mascot'

/**
 * Domene Mascotneta. `zveza` je kratica v šifri zapisnika in slugu lige
 * (`gr-<zveza>-…`) — **nikoli je ne spreminjaj**, sicer se zapisniki podvojijo.
 * `analitika`: razpored je na `table_analytika.asp`, sicer na `table.asp`.
 * `kraj`: pripona pri klubu z istim imenom v drugi zvezi. `menjava`: običajna
 * smer zapisa menjave (privzeto "IZSTOP - VSTOP"; Ahaja "VSTOP - IZSTOP").
 */
export const DOMENE = {
  'epsm.gr': { zveza: 'mak', ime: 'ΕΠΣ Μακεδονίας', kraj: 'Θεσσαλονίκη', analitika: true },
  'epsachaias.gr': { zveza: 'ach', ime: 'ΕΠΣ Αχαΐας', kraj: 'Αχαΐα', analitika: false, menjava: 'noter-ven' },
  'epspellas.gr': { zveza: 'pel', ime: 'ΕΠΣ Πέλλας', kraj: 'Πέλλα', analitika: false },
  'epsdramas.gr': { zveza: 'dra', ime: 'ΕΠΣ Δράμας', kraj: 'Δράμα', analitika: false },
  'epskozanis.gr': { zveza: 'koz', ime: 'ΕΠΣ Κοζάνης', kraj: 'Κοζάνη', analitika: false },
  'epskerkyras.gr': { zveza: 'ker', ime: 'ΕΠΣ Κέρκυρας', kraj: 'Κέρκυρα', analitika: true },
  'epsthesprotias.gr': { zveza: 'thes', ime: 'ΕΠΣ Θεσπρωτίας', kraj: 'Θεσπρωτία', analitika: false },
  'epsl.gr': { zveza: 'les', ime: 'ΕΠΣ Λέσβου', kraj: 'Λέσβος', analitika: true },
  'eps-imathias.gr': { zveza: 'ima', ime: 'ΕΠΣ Ημαθίας', kraj: 'Ημαθία', analitika: false },
  'epsprevezas-lefkadas.gr': { zveza: 'pl', ime: 'ΕΠΣ Πρέβεζας-Λευκάδας', kraj: 'Πρέβεζα', analitika: false },
}

// --- šifre in naslovi ----------------------------------------------------------------

/** "epsm.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ - 1ος ΟΜΙΛΟΣ" → { domena, diorganosi, zveza }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9.-]+\.gr):(.+)$/)
  if (!m) throw new Error(`mascot: šifra lige je "<domena>:<diorganosi>", ne "${koda}"`)
  const d = DOMENE[m[1]]
  if (!d) throw new Error(`mascot: domene ${m[1]} ne poznam (znane: ${Object.keys(DOMENE).join(', ')})`)
  return { domena: m[1], diorganosi: m[2].trim(), zveza: d.zveza }
}

const osnova = (domena) => `https://www.${domena}`
export const naslovLestvice = (koda) => {
  const { domena, diorganosi } = razberiKodo(koda)
  return `${osnova(domena)}/table.asp?diorganosi=${encodeURIComponent(diorganosi)}`
}
export const naslovAnalitike = (koda) => {
  const { domena, diorganosi } = razberiKodo(koda)
  return `${osnova(domena)}/table_analytika.asp?diorganosi=${encodeURIComponent(diorganosi)}`
}
/** Stran, na kateri je ves razpored lige. */
export const naslovRazporeda = (koda) => (DOMENE[razberiKodo(koda).domena].analitika ? naslovAnalitike(koda) : naslovLestvice(koda))

/** Datum ISO → "dd.mm.yyyy" (parameter `match_date`). */
const vGrski = (datum) => (datum ? datum.split('-').reverse().join('.') : '')
export const naslovTekme = (domena, st, datum = null) =>
  `${osnova(domena)}/game.asp?game_number=${st}${datum ? `&match_date=${vGrski(datum)}` : ''}`

/** Šifra zapisnika v bazi: `gr-mak-2026-2018` (zveza, leto začetka sezone, številka tekme). */
export function sifraZapisnika(domena, st, datum) {
  const sezona = sezonaIzDatuma(datum)
  if (!sezona) throw new Error(`mascot: tekma ${st} (${domena}) brez datuma nima šifre`)
  return `gr-${DOMENE[domena].zveza}-${sezona.slice(0, 4)}-${st}`
}

// Imena lastnih datotek: grške črke v šifri niso varne za `sifra()`.
const zgostitev = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 12)
export const imeRazporeda = (koda) => `mascot-razpored-${razberiKodo(koda).zveza}-${zgostitev(koda)}.html`
const imeLestvice = (koda) => `mascot-lestvica-${razberiKodo(koda).zveza}-${zgostitev(koda)}.html`
export const imeTekme = (domena, st) => `mascot-tekma-${DOMENE[domena].zveza}-${st}.html`

// --- pomožno -------------------------------------------------------------------------

const ENTITETE = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', rarr: '→', times: '×' }
export const entitete = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITETE[n.toLowerCase()] ?? m)
const brezSkript = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
/** HTML → besedilo v eni vrstici. */
export const besedilo = (html) => entitete(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
/** HTML → neprazne vrstice (oznaka je meja vrstice). */
const vrstice = (html) =>
  entitete(String(html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((v) => v.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

/** "11.10.2026" → "2026-10-11"; letnica pod 2000 ni datum. */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (!m || Number(m[3]) < 2000) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
const uraIz = (s) => {
  const m = String(s ?? '').match(/^(\d{1,2})[.:](\d{2})$/)
  return m && Number(m[1]) < 24 ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

/**
 * Atenski čas → ljubljanski: vedno ura manj (obe državi menjata poletni čas
 * ob istem trenutku). Ura "00:00" pomeni, da ure ni.
 */
export function vLjubljanskiCas(datum, ura) {
  if (!datum || !ura || ura === '00:00') return { datum, ura: null }
  const t = new Date(`${datum}T${ura}:00Z`).getTime() - URA
  const d = new Date(t).toISOString()
  return { datum: d.slice(0, 10), ura: d.slice(11, 16) }
}

/** "61'" → 61, "95'" → 90, "45+2'" → 45, "ΗΜ." (ημίχρονο, polčas) → 45. */
export function minuta(s) {
  const t = String(s ?? '').trim()
  if (/^ΗΜ/i.test(t)) return 45
  const m = t.match(/^(\d{1,3})/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** Izziv (Cloudflare, CAPTCHA). */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi (izhod 4) in ne vzame shranjene strani. */
export class MascotZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'MascotZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429

/**
 * `fetch` vira (`vir.fetch`, ga kliče `prenos.mjs`): 401/403/429 in izziv vržeta
 * `MascotZavrnitev` že tu — brez ponovitve (prenos bi 429 ponovil) in mimo
 * shranjene strani (uvoz razporeda bi ob napaki vzel predpomnilnik).
 */
export async function mascotFetch(url, moznosti = {}) {
  const odgovor = await fetch(url, { ...moznosti, headers: { 'User-Agent': UA, ...(moznosti.headers ?? {}) } })
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new MascotZavrnitev(`mascot: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  const telo = await odgovor.text()
  if (jeIzziv(telo)) throw new MascotZavrnitev(`mascot: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return new Response(telo, { status: odgovor.status, statusText: odgovor.statusText, headers: odgovor.headers })
}

// --- klubi -----------------------------------------------------------------------------

// Latinične črke, ki jih zveze pišejo namesto grških (ΜΕΤΑΣΟYΜΗ, "ΑΡΗΣ Π ΗΛΙΑ").
const LATINICA = { A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', Y: 'Υ', X: 'Χ' }
const brezNaglasov = (s) => entitete(s).normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()

/**
 * Ključ kluba (in igralca): brez naglasov, ločil in presledkov, latinične
 * dvojnice grških črk poenotene ("Α.Σ. ΝΕΑΠΟΛΗΣ" = "ΑΣ ΝΕΑΠΟΛΗΣ").
 */
export const kljucKlubaGr = (ime) =>
  [...brezNaglasov(ime)]
    .map((c) => LATINICA[c] ?? c)
    .join('')
    .replace(/[^\p{L}0-9]+/gu, '')
    .toLowerCase()

/**
 * Isto ime, drug klub. Zveze so ločene piramide, klub pa je enoličen v
 * državi: klub, katerega ključ ima tudi klub druge zveze (Mascotnet ali vir
 * eps), dobi kraj zveze. `<domena>|<ključ>` → ime. Pregled 15. 10. 2026 (vse
 * vpisane lige obeh virov); ob novi ligi ali sezoni preveri znova
 * (`node scripts/mascot-lige.mjs --trki`).
 */
export const IME_V_ZVEZI = Object.fromEntries(
  [
    // Α.Ε. Αμπελοκήπων je v Solunu (epsm, Α 2. skupina) in v Drami (Β).
    ['epsdramas.gr', 'Α.Ε. ΑΜΠΕΛΟΚΗΠΩΝ', 'Α.Ε. ΑΜΠΕΛΟΚΗΠΩΝ (Δράμα)'],
    ['epsdramas.gr', 'Α.Ε. ΑΜΠΕΛΟΚΗΠΩΝ Β', 'Α.Ε. ΑΜΠΕΛΟΚΗΠΩΝ Β (Δράμα)'],
  ].map(([domena, ime, novo]) => [`${domena}|${kljucKlubaGr(ime)}`, novo]),
)

/** Ime kluba, kot ga piše zveza, ali preimenovano po `IME_V_ZVEZI`. */
export function imeKluba(ime, domena) {
  const cisto = entitete(ime).replace(/\s+/g, ' ').trim()
  return IME_V_ZVEZI[`${domena}|${kljucKlubaGr(cisto)}`] ?? cisto
}

// Oblike društva pred imenom (ΑΟ, ΑΣ, ΓΣ …) in za njim (Α.Ο.), ki jih v kratkem imenu ne potrebujemo.
const OBLIKE = new Set(['ΑΕ', 'ΑΟ', 'ΑΣ', 'ΑΠΣ', 'ΓΣ', 'ΠΑΣ', 'ΑΜΣ', 'ΓΑΣ', 'ΜΓΣ', 'ΠΟ', 'ΑΠΟ', 'ΕΜΑΣ', 'ΜΑΣ', 'ΓΕ'])
const oblika = (beseda) => OBLIKE.has([...brezNaglasov(beseda).replace(/[.\s]/g, '')].map((c) => LATINICA[c] ?? c).join(''))
/** Kratko ime: brez oblike društva spredaj in zadaj ("ΑΟ ΑΧΙΛΛΕΑΣ ΝΥΜΦΩΝ" → "ΑΧΙΛΛΕΑΣ ΝΥΜΦΩΝ"). */
export function kratkoImeGr(polno) {
  let b = entitete(polno).replace(/\s+/g, ' ').trim().split(' ')
  if (b.length > 1 && oblika(b[0])) b = b.slice(1)
  if (b.length > 1 && oblika(b.at(-1))) b = b.slice(0, -1)
  return b.join(' ')
}

// --- stran lige (razpored) ---------------------------------------------------------

/** Imena lige, ki jih stran pove v naslovu (za preverbo, da je stran res ta liga). */
export function naslovStrani(html) {
  const s = brezSkript(html)
  const out = []
  for (const m of s.matchAll(/class="[^"]*(?:owl-slide-title|entry-title)[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/g)) out.push(besedilo(m[1]))
  const i = s.search(/class="site-content|<main/)
  const h3 = i < 0 ? null : s.slice(i).match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
  if (h3) out.push(besedilo(h3[1]))
  return out.filter(Boolean)
}
const istaLiga = (a, b) => kljucKlubaGr(a) === kljucKlubaGr(b)
export const jeStranLige = (html, diorganosi) => naslovStrani(html).some((n) => istaLiga(n, diorganosi))

const OSAMLJEN_POMISLJAJ = /^[-–—]$/
// Oznake tekme brez borbe (άνευ αγώνος, "α.α."), izstopa kluba ali tekme, ki je
// ne bo. Male črke "α.α." brez /i: velike "Α. Α." so začetnice v imenu igrišča
// ("ΓΗΠΕΔΟ Ε.Π.Σ.Α. Α. ΚΑΝΙΣΤΡΑΣ").
const BREZ_BORBE = /(^|[\s(])α\.\s?α\.|[άα]νευ αγ[ώω]ν|ΑΝΕΥ ΑΓΩΝ|ΑΠΟΣΥΡ|ΑΠΕΣΥΡ|ΔΕΝ ΘΑ ΔΙΕΞΑΧΘ|ΜΗ ΠΡΟΣΕΛ|ΜΗ ΠΑΡΟΥΣΙΑ/

/** Ena vrstica razporeda (HTML ene tekme) → tekma ali null. */
export function vrsticaTekme(html) {
  const povezava = String(html).match(/game_number=(\d+)(?:&(?:amp;)?match_date=([^"'&<\s]*))?/)
  let v = vrstice(html)
  const i = v.findIndex((x) => OSAMLJEN_POMISLJAJ.test(x))
  let domaci
  let gostje
  let deli = null
  if (i >= 1 && i + 1 < v.length) {
    domaci = v.slice(0, i).join(' ')
    gostje = v[i + 1]
    v = v.slice(i + 2)
  } else {
    // Lezbos: "Domači - Gostje&nbsp;&nbsp;&nbsp;4 - 2" v eni vrstici; klubi so
    // ločeni z " - ", izid z nbsp. Ime z " - " v sebi razreši `tekmeRazporeda`.
    const s = String(html)
    const n = s.search(/(?:&nbsp;|\u00a0){2,}/)
    if (n < 0) return null
    const imena = entitete(s.slice(s.lastIndexOf('>', n) + 1, n)).replace(/\s+/g, ' ').trim()
    deli = imena.split(/\s+[-–]\s+/)
    if (deli.length < 2) return null
    ;[domaci, gostje] = deli.length === 2 ? deli : [deli[0], deli.slice(1).join(' - ')]
    v = vrstice(s.slice(n))
    if (deli.length === 2) deli = null
  }
  if (!domaci || !gostje || OSAMLJEN_POMISLJAJ.test(gostje) || /^\d+$/.test(gostje)) return null
  let ostalo = v
  let izid = null
  let m = ostalo[0]?.match(/^(\d+)\s*[-–]\s*(\d+)\b\s*(.*)$/)
  if (m) {
    izid = { domaci: Number(m[1]), gostje: Number(m[2]) }
    ostalo = [m[3], ...ostalo.slice(1)].filter(Boolean)
  } else if (/^\d+$/.test(ostalo[0] ?? '') && OSAMLJEN_POMISLJAJ.test(ostalo[1] ?? '') && /^\d+$/.test(ostalo[2] ?? '')) {
    izid = { domaci: Number(ostalo[0]), gostje: Number(ostalo[2]) }
    ostalo = ostalo.slice(3)
  } else if (OSAMLJEN_POMISLJAJ.test(ostalo[0] ?? '')) ostalo = ostalo.slice(1)
  // Datum in ura: "27.09.2026 19.30 - ΓΗΠ:…" ali "11.10.2026" in "16.00" v svojih vrsticah.
  let datum = null
  let ura = null
  for (const [k, x] of ostalo.entries()) {
    const d = datumIz(x)
    if (!d) continue
    datum = d
    ura = uraIz(x.match(/\d{4}\s+(\d{1,2}[.:]\d{2})/)?.[1]) ?? uraIz(ostalo[k + 1])
    break
  }
  const datumPovezave = povezava?.[2] ? datumIz(decodeURIComponent(povezava[2])) : null
  return {
    domaci,
    gostje,
    izid,
    igra: povezava ? Number(povezava[1]) : null,
    datum: datum ?? datumPovezave,
    ura,
    brezBorbe: BREZ_BORBE.test(v.join(' ')),
    opomba: ostalo.filter((x) => !datumIz(x) && !uraIz(x)).join(' ') || null,
    ...(deli ? { deli } : {}),
  }
}

/**
 * Vse tekme razporeda: [{ krog, domaci, gostje, izid, igra, datum, ura (atenska),
 * brezBorbe }]. Krogi so "N<sup>η</sup> ΑΓΩΝΙΣΤΙΚΗ" v delu strani s celim
 * razporedom (pred njim so na `table.asp` zadnji in naslednji krog).
 */
export function tekmeRazporeda(html) {
  const s = brezSkript(html)
  const zacetki = ['schedule-card', 'schedule-container', 'epsm-rounds-board', 'ΑΝΑΛΥΤΙΚΑ ΟΙ ΑΓΩΝΙΣΤΙΚΕΣ', 'ΑΝΑΛΥΤΙΚΟ ΠΡΟΓΡΑΜΜΑ'].map((x) => s.indexOf(x)).filter((x) => x >= 0)
  if (!zacetki.length) return []
  const od = Math.min(...zacetki)
  const konec = s.indexOf('<footer', od)
  const del = s.slice(od, konec < 0 ? undefined : konec)
  const glave = [...del.matchAll(/(\d+)\s*<sup>\s*η\s*<\/sup>\s*ΑΓΩΝΙΣΤΙΚΗ/g)]
  const out = []
  const videni = new Set()
  glave.forEach((g, n) => {
    const krog = Number(g[1])
    if (videni.has(krog)) throw new Error(`mascot: krog ${krog} je v razporedu dvakrat — stran se je spremenila? Uvoz ustavljen`)
    videni.add(krog)
    const blok = del.slice(g.index + g[0].length, glave[n + 1]?.index)
    const klubi = new Set()
    let vrste = blok.split(/(?=<[^>]*class="match-row")|(?=<tr[\s>])/).slice(1)
    // Lezbos: brez vrstic tabele, tekma se konča s "</font><br>".
    if (!vrste.length) vrste = blok.split(/<\/font>\s*<br\s*\/?>/)
    for (const vrsta of vrste) {
      const t = vrsticaTekme(vrsta)
      if (!t) continue
      for (const k of [t.domaci, t.gostje]) {
        // Isti klub dvakrat v krogu: dva kluba z istim imenom ali napaka razčlenitve.
        if (klubi.has(kljucKlubaGr(k))) throw new Error(`mascot: klub "${k}" igra v ${krog}. krogu dvakrat — uvoz ustavljen`)
        klubi.add(kljucKlubaGr(k))
      }
      out.push({ krog, ...t })
    }
  })
  // Ime kluba z " - " v vrstici brez ločila: razdeli tam, kjer sta obe strani
  // klub, ki ga razpored drugje pozna; sicer tam, kjer je vsaj ena (klub z
  // " - " v imenu se morda pojavi le v takih vrsticah).
  const znani = new Set(out.filter((t) => !t.deli).flatMap((t) => [kljucKlubaGr(t.domaci), kljucKlubaGr(t.gostje)]))
  for (const t of out.filter((x) => x.deli)) {
    const vse = t.deli.slice(1).map((_, n) => [t.deli.slice(0, n + 1).join(' - '), t.deli.slice(n + 1).join(' - ')])
    const obe = vse.filter(([d, g]) => znani.has(kljucKlubaGr(d)) && znani.has(kljucKlubaGr(g)))
    const moznosti = obe.length ? obe : vse.filter(([d, g]) => znani.has(kljucKlubaGr(d)) || znani.has(kljucKlubaGr(g)))
    if (moznosti.length !== 1) throw new Error(`mascot: tekme "${t.deli.join(' - ')}" (${t.krog}. krog) ne znam razdeliti na klube — uvoz ustavljen`)
    ;[t.domaci, t.gostje] = moznosti[0]
    delete t.deli
  }
  return out
}

/**
 * Naslednji krog s številkami tekem (`table.asp` predloge epsm: "ΕΠΟΜΕΝΗ
 * ΑΓΩΝΙΣΤΙΚΗ (4η αγωνιστική)", "Domači VS Gostje"): [{ krog, igra, domaci, gostje }].
 */
export function naslednjiKrog(html) {
  const s = brezSkript(html)
  const i = s.indexOf('ΕΠΟΜΕΝΗ ΑΓΩΝΙΣΤΙΚΗ')
  if (i < 0) return []
  const konec = s.slice(i).search(/ΒΑΘΜΟΛΟΓΙΑ|<footer/)
  const del = s.slice(i, konec < 0 ? undefined : i + konec)
  const krog = Number(besedilo(del.slice(0, 300)).match(/\((\d+)\s*η\s+αγωνιστική\)/i)?.[1]) || null
  const out = []
  for (const k of del.split(/(?=<[^>]*game_number=)/).slice(1)) {
    const igra = Number(k.match(/game_number=(\d+)/)?.[1])
    const v = vrstice(k)
    const j = v.findIndex((x) => /^VS$/i.test(x))
    if (!igra || j < 1) continue
    out.push({ krog, igra, domaci: v.slice(0, j).join(' '), gostje: v[j + 1] })
  }
  return out
}

// --- zapisnik --------------------------------------------------------------------------

/** Ime igralca, kot ga piše zveza ("ΧΑΤΖΗΛΙΑΣ Π.", "ΠΑΣΒΑΝΤΙΔΗΣ ΔΗΜΗΤΡΙΟΣ"). */
const imeIgralca = (s) => entitete(s).replace(/\s+/g, ' ').trim()
const besedeImena = (ime) =>
  kljucKlubaGr(ime) && brezNaglasov(ime).split(/\s+/).map((b) => kljucKlubaGr(b)).filter(Boolean)

/**
 * Je ime `a` isti igralec kot `b`? Enako ime, ali je eno začetek drugega po
 * besedah ("ΠΑΣΒΑΝΤΙΔΗΣ" in "ΠΑΣΒΑΝΤΙΔΗΣ ΔΗΜΗΤΡΙΟΣ"; začetnica "Π." ustreza
 * imenu na Π).
 */
export function istoIme(a, b) {
  const x = besedeImena(a)
  const y = besedeImena(b)
  if (!x?.length || !y?.length) return false
  const [k, d] = x.length <= y.length ? [x, y] : [y, x]
  return k.every((w, i) => w === d[i] || (i > 0 && w.length === 1 && d[i].startsWith(w)) || (i > 0 && d[i].length === 1 && w.startsWith(d[i])))
}

/** Igralci seznama "NN. ΙΜΕ<br>…": [{ st, ime }]. */
function igralciSeznama(html) {
  const out = []
  for (const v of vrstice(html)) {
    const m = v.match(/^(\d{1,3})\s*\.\s*(.+)$/)
    if (m) out.push({ st: Number(m[1]), ime: imeIgralca(m[2]) })
  }
  return out
}

/** Menjave "61' ΙΜΕ - ΙΜΕ" (ali "ΗΜ.' …"): [{ minuta, a, b, besedilo }]. */
function menjaveSeznama(html) {
  const out = []
  for (const v of vrstice(html)) {
    const m = v.match(/^(\d{1,3}(?:\s*\+\s*\d+)?|ΗΜ\.?)\s*'?\s*(.*?)\s*[-–](?:\s+(.*))?$/)
    if (m && (m[2] || m[3])) out.push({ minuta: minuta(m[1]), a: imeIgralca(m[2] ?? ''), b: imeIgralca(m[3] ?? ''), besedilo: v })
  }
  return out
}

/** Blok ekipe → { zacetniki, klop, menjave }. Pred `<hr>` začetniki, do slike menjav klop. */
function ekipaBloka(html) {
  const s = String(html)
  const hr = s.search(/<hr/i)
  const slika = s.search(/inout\.png/i)
  const zacetniki = igralciSeznama(hr < 0 ? (slika < 0 ? s : s.slice(0, slika)) : s.slice(0, hr))
  const klop = hr < 0 ? [] : igralciSeznama(slika < 0 ? s.slice(hr) : s.slice(hr, slika))
  const menjave = slika < 0 ? [] : menjaveSeznama(s.slice(slika))
  return { zacetniki, klop, menjave, brezCrte: hr < 0 }
}

/** Glava strani tekme: { domaci, gostje, izid, datum, ura (atenska), strelci: [[…], […]] }. */
export function glavaTekme(html) {
  const s = brezSkript(html)
  const imena = [...s.matchAll(/class="(?:epsm-hero-team-name|epsm-score-team-name)"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => besedilo(m[1]))
  if (imena.length < 2) return null
  let izid = null
  const st = [...s.matchAll(/class="epsm-hero-score-number"[^>]*>\s*(\d+)\s*</g)].map((m) => Number(m[1]))
  if (st.length >= 2) izid = { domaci: st[0], gostje: st[1] }
  const r = besedilo(s.match(/class="epsm-score-result-value"[^>]*>([\s\S]*?)<\/div>/)?.[1]).match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (!izid && r) izid = { domaci: Number(r[1]), gostje: Number(r[2]) }
  const strelci = [...s.matchAll(/class="(?:epsm-hero-scorer-list|epsm-scorers)"[^>]*>([\s\S]*?)<\/div>/g)].map((m) =>
    vrstice(m[1].replace(/<\/span>/g, '<br>'))
      .map((v) => v.match(/^(\d{1,3}(?:\s*\+\s*\d+)?|ΗΜ\.?)\s*'\s*(.+)$/))
      .filter(Boolean)
      .map((x) => ({ minuta: minuta(x[1]), ime: imeIgralca(x[2]) })),
  )
  const h = s.search(/ΗΜΕΡΟΜΗΝΙΑ/)
  const t = h < 0 ? [] : vrstice(s.slice(s.lastIndexOf('<', h)))
  const di = t.findIndex((x) => /^ΗΜΕΡΟΜΗΝΙΑ$/.test(x))
  const ui = t.findIndex((x) => /^ΩΡΑ$/.test(x))
  return {
    domaci: imena[0],
    gostje: imena[1],
    izid,
    datum: di >= 0 ? datumIz(t[di + 1]) : null,
    ura: ui >= 0 ? uraIz(t[ui + 1]) : null,
    strelci: [strelci[0] ?? [], strelci[1] ?? []],
  }
}

/** Je stran tekme (ima glavo z obema kluboma)? */
export const jeStranTekme = (html) => glavaTekme(html) != null

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma, tekma nima izida
 * ali nobena ekipa nima postave (neodigrana tekma, kontumacija). Ekipa brez
 * postave (manj kot 7 začetnikov) naredi tekmo `nepopoln` (kot frf, eps).
 */
export function vZapisnik(html, { id = null, url = null, domena = null } = {}) {
  const g = glavaTekme(html)
  if (!g?.izid) return null
  const s = brezSkript(html)
  const bloki = [...s.matchAll(/class="(?:epsm-roster-box|epsm-player-list)"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => ekipaBloka(m[1]))
  if (bloki.length < 2) return null
  const imeni = [imeKluba(g.domaci, domena), imeKluba(g.gostje, domena)]
  const znana = bloki.map((b) => b.zacetniki.length >= 7)
  if (!znana[0] && !znana[1]) return null
  const opozorila = []
  const nepopoln = !znana[0] || !znana[1]
  bloki.forEach((b, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — v postavi ${b.zacetniki.length} igralcev`)
    else if (b.zacetniki.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${b.zacetniki.length} igralcev namesto 11`)
    if (b.brezCrte) opozorila.push(`${imeni[idx]}: seznam brez ločila začetnikov in klopi`)
  })

  // Igralci ekipe: začetniki, klop in (Ahaja) rezerve, ki jih pozna le menjava.
  const ekipe = bloki.map((b, idx) => ({
    postava: znana[idx] ? b.zacetniki.map((i, n) => ({ ...i, zacetnik: true, vratar: n === 0, noter: null, ven: null, rdec: null })) : [],
    rezerve: znana[idx] ? b.klop.map((i) => ({ ...i, zacetnik: false, vratar: false, noter: null, ven: null, rdec: null })) : [],
  }))
  const vsi = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve]
  // Igralci z ujemajočim imenom; natančno ime ima prednost pred začetkom imena.
  const kandidati = (idx, ime) => {
    if (!ime) return []
    const k = vsi(idx).filter((i) => istoIme(i.ime, ime))
    const natancno = k.filter((i) => kljucKlubaGr(i.ime) === kljucKlubaGr(ime))
    return natancno.length ? natancno : k
  }
  const igral = (i) => i.zacetnik || i.noter != null

  // Menjave: kdo je na igrišču, ta gre ven; v igro gre, kdo še ni igral. Smer
  // zapisa se med domenami (in klubi) razlikuje; kjer veljata obe, odloči
  // običajna smer domene. Napaka vira (oba na klopi, prazno ime) da vstop brez
  // izstopa ali nič — z opozorilom.
  const vrstniRed = DOMENE[domena]?.menjava ?? 'ven-noter'
  const menjave = []
  bloki.forEach((b, idx) => {
    if (!znana[idx]) return
    const naIgriscu = new Set(ekipe[idx].postava)
    const gor = (k) => k.filter((i) => naIgriscu.has(i))
    const prost = (k) => k.filter((i) => !naIgriscu.has(i) && !igral(i))
    for (const m of [...b.menjave].sort((x, y) => (x.minuta ?? 0) - (y.minuta ?? 0))) {
      if (m.minuta == null) { opozorila.push(`${imeni[idx]}: menjava "${m.besedilo}" brez minute`); continue }
      const ka = kandidati(idx, m.a)
      const kb = kandidati(idx, m.b)
      // Možnost: (izstop, vstop ali novo ime brez dresa).
      const moznost = (kVen, kNoter, imeNoter) => {
        const v = gor(kVen)
        const n = prost(kNoter)
        if (v.length !== 1) return null
        if (n.length === 1) return { ven: v[0], noter: n[0], novo: null }
        return !kNoter.length && imeNoter ? { ven: v[0], noter: null, novo: imeNoter } : null
      }
      const ab = moznost(ka, kb, m.b)
      const ba = moznost(kb, ka, m.a)
      let izbira = ab && ba ? (vrstniRed === 'ven-noter' ? ab : ba) : ab ?? ba
      if (!izbira && (!m.a || !m.b)) {
        // Le izstop: drugo ime je prazno (napaka vira) — igralec gre ven, vstopa ne poznamo.
        const v = gor(m.a ? ka : kb)
        if (v.length === 1) {
          v[0].ven = m.minuta
          naIgriscu.delete(v[0])
          menjave.push({ ekipaIdx: idx, minuta: m.minuta, noter: { st: null, ime: null }, ven: { st: v[0].st, ime: v[0].ime } })
          opozorila.push(`${imeni[idx]}: menjava "${m.besedilo}" — vstop ni vpisan; vpisan le izstop ${v[0].ime}`)
          continue
        }
      }
      if (!izbira) {
        // Le vstop: prazno ime ali oba na klopi (napaka vira). Kdo gre v igro, pove smer domene.
        const n = prost(vrstniRed === 'ven-noter' ? kb : ka)
        const drugi = vrstniRed === 'ven-noter' ? m.a : m.b
        if (n.length === 1 && !gor(vrstniRed === 'ven-noter' ? ka : kb).length) {
          izbira = { ven: null, noter: n[0], novo: null }
          opozorila.push(`${imeni[idx]}: menjava "${m.besedilo}" — ${drugi ? `${drugi} ni na igrišču` : 'izstop ni vpisan'}; vpisan le vstop ${n[0].ime}`)
        } else {
          opozorila.push(`${imeni[idx]}: menjava "${m.besedilo}" — ne vem, kdo gre ven`)
          continue
        }
      }
      let { ven, noter, novo } = izbira
      if (!noter) {
        // Rezerva, ki je ni na seznamu (Ahaja klopi ne objavi): ime iz menjave, brez dresa.
        noter = { st: null, ime: novo, zacetnik: false, vratar: false, noter: null, ven: null, rdec: null }
        ekipe[idx].rezerve.push(noter)
      }
      noter.noter = m.minuta
      naIgriscu.add(noter)
      if (ven) {
        ven.ven = m.minuta
        naIgriscu.delete(ven)
      }
      menjave.push({ ekipaIdx: idx, minuta: m.minuta, noter: { st: noter.st, ime: noter.ime }, ven: ven ? { st: ven.st, ime: ven.ime } : { st: null, ime: null } })
    }
    // Isti dres dvakrat v ekipi: dres soimenjakov ne loči več.
    const dresi = vsi(idx).map((i) => i.st).filter((x) => x != null)
    const dvojni = [...new Set(dresi.filter((x, n) => dresi.indexOf(x) !== n))]
    if (dvojni.length) opozorila.push(`${imeni[idx]}: dres ${dvojni.join(', ')} ima več igralcev`)
  })
  // Strelec: med igralci z ujemajočim imenom tisti, ki je igral.
  const najdi = (idx, ime) => {
    const k = kandidati(idx, ime)
    const igrali = k.filter(igral)
    return igrali.length === 1 ? igrali[0] : k.length === 1 ? k[0] : k.length ? 'dvoumno' : null
  }

  // Goli: strelec v svoji ekipi; strelec iz nasprotne ekipe je avtogol.
  const goli = []
  g.strelci.forEach((seznam, idx) => {
    for (const x of seznam) {
      if (!znana[idx] && !znana[1 - idx]) continue
      let i = najdi(idx, x.ime)
      let ekipaIdx = idx
      let avtogol = false
      if (!i || i === 'dvoumno') {
        const d = najdi(1 - idx, x.ime)
        if (d && d !== 'dvoumno') { i = d; ekipaIdx = 1 - idx; avtogol = true }
      }
      if (!i || i === 'dvoumno') {
        if (znana[idx]) opozorila.push(`${imeni[idx]}: gol v ${x.minuta}. minuti (${x.ime}) — strelca ni v zapisniku`)
        continue
      }
      if (avtogol) opozorila.push(`${imeni[idx]}: gol ${x.ime} je pri igralcu nasprotne ekipe — štejem ga kot avtogol`)
      goli.push({ ekipaIdx, st: i.st, ime: i.ime, minuta: x.minuta, avtogol, enajstmetrovka: false })
    }
  })
  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (!nepopoln && (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje))
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const { datum, ura } = vLjubljanskiCas(g.datum, g.ura)
  const vObliko = (i) => ({ st: i.st, ime: i.ime, zacetnik: i.zacetnik, vratar: i.vratar, pozicija: i.vratar ? 'GK' : null, noter: i.noter, ven: i.ven, rdec: null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(g.datum),
    krog: null, // stran ga ne pove; da ga razpored
    datum,
    ura,
    domaci: { ime: imeni[0], postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: imeni[1], postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat: g.izid,
    polcas: null,
    goli,
    zgresene: [],
    rumeni: [],
    rdeci: [],
    menjave,
    opozorila,
    ...(nepopoln ? { nepopoln: true } : {}),
  }
}

/**
 * Rezerve brez dresa (Ahaja: ime le iz menjave, pogosto le priimek) dobijo
 * polno ime, če ima klub v zapisnikih lige natanko enega igralca s tem
 * začetkom imena. Sicer bi bil isti človek v bazi dvakrat ("ΚΕΡΑΜΙΔΑΣ" in
 * "ΚΕΡΑΜΙΔΑΣ ΓΕΩΡΓΙΟΣ").
 */
export function dopolniImena(zapisniki) {
  const polna = new Map() // ključ kluba → Set imen z dresom
  for (const { z } of zapisniki)
    for (const e of [z.domaci, z.gostje]) {
      const k = kljucKlubaGr(e.ime)
      if (!polna.has(k)) polna.set(k, new Set())
      for (const i of [...e.postava, ...e.rezerve]) if (i.st != null) polna.get(k).add(i.ime)
    }
  for (const { z } of zapisniki)
    for (const e of [z.domaci, z.gostje]) {
      const imena = [...(polna.get(kljucKlubaGr(e.ime)) ?? [])]
      for (const i of e.rezerve) {
        if (i.st != null) continue
        const kandidati = imena.filter((x) => istoIme(x, i.ime) && x !== i.ime)
        if (kandidati.length !== 1) continue
        const staro = i.ime
        i.ime = kandidati[0]
        for (const x of [...z.menjave.map((m) => m.noter), ...z.goli]) if (x.st == null && x.ime === staro) x.ime = i.ime
      }
    }
  return zapisniki
}

// --- branje ------------------------------------------------------------------------

const pot = (ime) => `${mapa()}/${ime}`
function izPredpomnilnika(ime) {
  const p = pot(ime)
  if (!existsSync(p)) return null
  return { html: readFileSync(p, 'utf8'), starost: Date.now() - statSync(p).mtimeMs }
}
function vPredpomnilnik(ime, html) {
  mkdirSync(mapa(), { recursive: true })
  writeFileSync(pot(ime), html)
}

/** Prenos prek `prenesi` uvoza; zavrnitev (403, 429, izziv) ustavi uvoz. */
async function beri(prenesi, url, ime, sveze = true) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev || jeZavrnitev(e.status)) throw new MascotZavrnitev(`mascot: ${url} → ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status ?? null)
    throw e
  }
  if (jeIzziv(html)) throw new MascotZavrnitev(`mascot: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

/**
 * Sme stran v predpomnilnik? Le stran lige z razporedom ali stran tekme z
 * glavo — vzdrževalna ali okrnjena stran (200) bi sicer obveljala za vselej
 * (mlsz, 10.–12. 10. 2026). Stran tekme brez postav ali nepopolno pa
 * `zapisniki` 45 dni bere sveže, ne iz predpomnilnika.
 */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  if (jeIzziv(besedilo)) return false
  if (/^mascot-tekma-/.test(datoteka)) return !!glavaTekme(besedilo)
  if (/^mascot-(razpored|lestvica)-/.test(datoteka)) return tekmeRazporeda(besedilo).length > 0 || naslednjiKrog(besedilo).length > 0
  return true
}

/** Razpored lige s strani (ime lige preverjeno). */
async function stranRazporeda(koda, prenesi) {
  const { diorganosi } = razberiKodo(koda)
  const url = naslovRazporeda(koda)
  const html = await beri(prenesi, url, imeRazporeda(koda), true)
  const tekme = tekmeRazporeda(html)
  if (!jeStranLige(html, diorganosi) || !tekme.length)
    throw new Error(`mascot: ${url} ni razpored lige "${diorganosi}" (${String(html ?? '').length} B, ${tekme.length} tekem) — uvoz ustavljen`)
  return tekme
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)
const dodajDni = (datum, n) => new Date(Date.parse(`${datum}T00:00:00Z`) + n * DAN).toISOString().slice(0, 10)
const danVTednu = (datum) => new Date(`${datum}T00:00:00Z`).getUTCDay()
const najpogostejsi = (xs) => {
  const n = new Map()
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? null
}

/** Kako stara sme biti shranjena stran neodigrane tekme (za datum). */
function najvecStarostNeodigrane(datum, danes) {
  if (!datum) return DAN
  const cez = -starostDni(datum, danes)
  if (cez > 2) return 12 * URA
  if (cez > -2) return URA
  return DAN
}

/**
 * Datum in uro neodigranim tekmam brez datuma vzame s strani tekme (ta
 * obstaja pred tekmo). Bere le naslednja dva kroga in le tekme, katerih
 * številko pozna (razpored ali "ΕΠΟΜΕΝΗ ΑΓΩΝΙΣΤΙΚΗ"); strani hrani sam.
 */
async function datumiNeodigranih(koda, tekme, prenesi, danes) {
  const { domena } = razberiKodo(koda)
  const brez = tekme.filter((t) => !t.izid && !t.datum)
  if (!brez.length) return
  const krogi = [...new Set(brez.map((t) => t.krog))].sort((a, b) => a - b).slice(0, 2)
  if (DOMENE[domena].analitika && brez.some((t) => krogi.includes(t.krog) && !t.igra)) {
    const ime = imeLestvice(koda)
    const c = izPredpomnilnika(ime)
    let html = c && c.starost <= 6 * URA ? c.html : null
    if (!html) {
      html = await beri(prenesi, naslovLestvice(koda), ime, true)
      if (zaPredpomnilnik(html, ime)) vPredpomnilnik(ime, html)
    }
    for (const n of naslednjiKrog(html)) {
      const t = brez.find((x) => x.krog === (n.krog ?? x.krog) && kljucKlubaGr(x.domaci) === kljucKlubaGr(n.domaci) && kljucKlubaGr(x.gostje) === kljucKlubaGr(n.gostje))
      if (t && !t.igra) t.igra = n.igra
    }
  }
  for (const t of brez.filter((x) => krogi.includes(x.krog) && x.igra)) {
    const ime = imeTekme(domena, t.igra)
    const c = izPredpomnilnika(ime)
    let html = c?.html
    let g = html ? glavaTekme(html) : null
    if (!g || g.izid || c.starost > najvecStarostNeodigrane(g.datum, danes)) {
      html = await beri(prenesi, naslovTekme(domena, t.igra), ime, true)
      g = glavaTekme(html)
      if (g) vPredpomnilnik(ime, html)
    }
    if (!g || kljucKlubaGr(g.domaci) !== kljucKlubaGr(t.domaci) || kljucKlubaGr(g.gostje) !== kljucKlubaGr(t.gostje)) continue
    t.datum = g.datum
    t.ura = g.ura
  }
}

/**
 * Krogi z datumom: najzgodnejša tekma kroga; krog brez znanega datuma oceni iz
 * prejšnjega znanega iste polovice sezone (+7 dni na krog, na najpogostejši dan
 * in uro) in ga označi `ocenjen`. Krog druge polovice brez datuma izpade.
 */
export function krogiZDatumi(tekme) {
  const st = [...new Set(tekme.map((t) => t.krog))].sort((a, b) => a - b)
  const krogov = st.at(-1) ?? 0
  const krogi = st.map((k) => {
    const t = tekme.filter((x) => x.krog === k)
    const d = t.filter((x) => x.datum).sort((a, b) => (a.datum + (a.ura ?? '')).localeCompare(b.datum + (b.ura ?? '')))
    return { stevilka: k, tekme: t, datum: d[0]?.datum ?? null, ura: d[0]?.ura ?? null, ocenjen: false }
  })
  const znani = krogi.filter((k) => k.datum)
  const dan = najpogostejsi(znani.map((k) => danVTednu(k.datum)))
  const ura = najpogostejsi(znani.map((k) => k.ura).filter(Boolean))
  const polovica = (k) => (k <= krogov / 2 ? 1 : 2)
  let zadnji = null
  for (const k of krogi) {
    if (k.datum) { zadnji = k; continue }
    if (!zadnji || polovica(zadnji.stevilka) !== polovica(k.stevilka)) continue
    let d = dodajDni(zadnji.datum, 7 * (k.stevilka - zadnji.stevilka))
    if (dan != null) d = dodajDni(d, ((dan - danVTednu(d) + 10) % 7) - 3)
    Object.assign(k, { datum: d, ura, ocenjen: true })
  }
  return krogi.filter((k) => k.datum)
}

/** Tekma z izidom brez borbe (α.α., izstop) ali brez strani tekme je kontumacija. */
const jeKontumacija = (t) => !!t.izid && (t.brezBorbe || !t.igra)

/** Razpored v obliko uvoza razporeda (datum in ura ljubljanska). */
export function razporedIzTekem(tekme, domena) {
  return krogiZDatumi(tekme).map((k) => ({
    stevilka: k.stevilka,
    ocenjen: k.ocenjen,
    tekme: k.tekme.map((t) => {
      const { datum, ura } = vLjubljanskiCas(t.datum ?? k.datum, t.datum ? t.ura : k.ura)
      const kontumacija = jeKontumacija(t)
      return {
        domaci: imeKluba(t.domaci, domena),
        gostje: imeKluba(t.gostje, domena),
        datum,
        ura,
        odigrana: !!t.izid,
        kontumacija,
        ...(kontumacija ? { izid: t.izid } : {}),
        ...(t.igra ? { mascotIgra: t.igra } : {}),
        ...(t.izid ? { izidVira: t.izid } : {}),
      }
    }),
  }))
}

/** Vse tekme lige (z datumi neodigranih, kjer jih stran tekme pove). */
export async function tekmeLige(koda, prenesi, { danes = Date.now(), datumi = true } = {}) {
  const tekme = await stranRazporeda(koda, prenesi)
  if (datumi) await datumiNeodigranih(koda, tekme, prenesi, danes)
  return tekme
}

const vir = {
  ime: 'mascot',
  fetch: mascotFetch,
  polnoIme: 'Ενώσεις Ποδοσφαιρικών Σωματείων (Mascot Network Hellas)',
  drzava: 'GR',
  osnovniNaslov: 'https://mascotnet.com',
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  // Uvoz razporeda zapiše `rounds.datum_ocenjen` (krog brez znanega datuma).
  ocenjeniDatumi: true,

  naslovRazporeda,
  naslovZapisnika: (koda, id) => {
    const m = String(id).match(/^gr-[a-z]+-\d{4}-(\d+)$/)
    return naslovTekme(razberiKodo(koda).domena, m ? m[1] : id)
  },
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new MascotZavrnitev(`mascot: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem(await tekmeLige(koda, prenesi), razberiKodo(koda).domena)
  },

  async zapisniki(koda, prenesi, { danes = Date.now() } = {}) {
    const { domena } = razberiKodo(koda)
    const tekme = await tekmeLige(koda, prenesi, { datumi: false })
    const out = []
    for (const t of tekme.filter((x) => x.izid && x.igra && !x.brezBorbe)) {
      const url = naslovTekme(domena, t.igra, t.datum)
      const ime = imeTekme(domena, t.igra)
      const id = sifraZapisnika(domena, t.igra, t.datum)
      // Zapisnik zadnjih treh dni se lahko še popravlja; nepopolnega (ali brez
      // postav) beremo sveže do 45 dni, starejšega popolnega ne beremo znova.
      const star = starostDni(t.datum, danes)
      let html = await beri(prenesi, url, ime, star <= 3)
      let z = vZapisnik(html, { id, url, domena })
      if ((!z || z.nepopoln) && star > 3 && star <= 45) {
        html = await beri(prenesi, url, ime, true)
        z = vZapisnik(html, { id, url, domena })
      }
      if (!z) continue
      const g = glavaTekme(html)
      if (kljucKlubaGr(g.domaci) !== kljucKlubaGr(t.domaci) || kljucKlubaGr(g.gostje) !== kljucKlubaGr(t.gostje))
        z.opozorila.push(`klubi zapisnika (${g.domaci} : ${g.gostje}) niso klubi razporeda (${t.domaci} : ${t.gostje})`)
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      // Ime kluba, krog in datum z razporeda, da se tekma ujame z razporedom.
      z.domaci.ime = imeKluba(t.domaci, domena)
      z.gostje.ime = imeKluba(t.gostje, domena)
      z.krog = t.krog
      if (!z.datum) Object.assign(z, vLjubljanskiCas(t.datum, t.ura))
      z.sezona = sezonaIzDatuma(t.datum) ?? z.sezona
      out.push({ id, z, url })
    }
    return dopolniImena(out)
  },

  /**
   * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
   * stran nima postav. Bere le take tekme (v predpomnilnik uvoza).
   */
  async kontumacije(koda, prenesiKrog, krogi, danes) {
    const { domena } = razberiKodo(koda)
    const out = []
    const teden = dodajDni(danes, -7)
    for (const k of krogi)
      for (const t of k.tekme) {
        const i = t.izidVira
        if (!i || !t.mascotIgra || !t.datum || t.datum > teden || t.kontumacija) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovTekme(domena, t.mascotIgra, t.datum), imeTekme(domena, t.mascotIgra), t.datum)
        if (jeIzziv(html)) throw new MascotZavrnitev(`mascot: ${naslovTekme(domena, t.mascotIgra)} vrne izziv (CAPTCHA)`)
        if (jeStranTekme(html) && !vZapisnik(html, { domena })) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaGr,
  kratkoIme: kratkoImeGr,
  poenostavi: kljucKlubaGr,
}

export default vir
