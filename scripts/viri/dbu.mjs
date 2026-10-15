// Vir: Dansk Boldspil-Union — dbu.dk/resultater (Danska).
//
// Strani "Stillinger og resultater" izriše strežnik (ASP.NET/Umbraco) — beremo
// HTML. **Pisno dovoljenje DBU za zajem: pridobil Lovro, oktober 2026 (kopija še
// ni v arhivu info@).** Dovoljenje odpravi omejitev pogojev uporabe (A.5.1), ne
// pokriva pa tehnične zaščite: ob Cloudflarovem izzivu, CAPTCHI ali 401/403/429
// se uvoz ustavi (`DbuZavrnitev`, izhod 4) — ne obhajaj. robots.txt dovoli
// `/resultater/pulje|kamp|Raekke`, prepove `/resultater/kampsoegAdvanceret/`,
// `/turneringer_og_resultater/resultatsoegning/` in `/umbraco/` (izvoz v Excel
// ne beremo). Glej CLAUDE.md (Danska — vir dbu).
//
// ŠIFRA LIGE je id pulje (`508656`) ali več pulj ene sezone, ločenih s `+`
// (`474114+498951+498952` = 2. division 2025/26: osnovni del, nato skupini za
// napredovanje in obstanek). Vsaka pulja je svoja stran
// `/resultater/pulje/<id>/kampprogram` z VSEMI tekmami (številka tekme, datum
// "31-07 2026", ura — **kopenhagenski čas = ljubljanski**, domači, gostje,
// izid, povezava `/resultater/kamp/<številka>_<pulja>/kampinfo`).
//
// KROGOV vir NE objavi. Izpeljemo jih iz datumov (`dodeliKroge`): tekme
// razdelimo po sklopih dni (Pet–Pon vikend, Tor–Čet sredi tedna), sklop, v
// katerem klub nastopi dvakrat, razcepimo; največjih R sklopov (R = tekem /
// tekem na krog) so krogi po datumu, ostale (prestavljene) tekme gredo v krog,
// v katerem obeh klubov ni, najbližji po datumu. Ker program nosi ves razpored
// sezone, so številke stalne, dokler se prihodnji krogi ne prestavljajo
// množično. Pri več puljah se krogi poznejše pulje zamaknejo za zadnji krog
// pulje, s katero si deli klube (skupini za napredovanje in obstanek sta
// vzporedni in si delita številke).
//
// STRAN TEKME: "Holdopstillinger" — za vsako ekipo tabela začetnikov (dres in
// "Ime Priimek"), tabela "Reserver" (klop) in "Officials" (osebje — ne beremo
// imen v podatke, le za prepoznavo kartonov osebja). Vratar NI označen; dres 1
// med začetniki je namig (GK, kot `oefb` "T"). Dogodki ("Kampfakta") imajo
// minuto ("'80"; podaljšek je absolutna minuta "'93" → 90) in ikono:
// goal (drugo ime je podaja — ne uvažamo), penaltyGoal (11 m), goalOwn
// (prikazan pri ekipi, ki ji gol šteje; strelec je iz nasprotne ekipe),
// penaltyMiss, yellow, yellowred (drugi rumeni; vir ga zapiše kot yellow +
// yellowred ob isti minuti → 1 rumeni + 1 rdeči), red, subHome/subAway (prvi
// noter, drugi ven — minute so točne). Šifer igralcev ni: identiteta je
// ime + klub (kot fsb, lff), ime "Priimek Ime" (priimek je zadnja beseda).
//
// Sodnikov, osebja, igrišča in telefonov ne hranimo. Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki). V predpomnilnik gre le cela stran
// (`zaPredpomnilnik`): program pulje in stran tekme z obema postavama, z
// dogodki in z goli = izid. Nepopolna stran se bere znova (`zapisnikSvez`).
import { razpakiraj } from '../klubi.mjs'
import { sezonaIz } from '../razpored.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

export const OSNOVNI = 'https://www.dbu.dk'
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
// Zapisnik se dopolnjuje (dogodki pridejo za postavami): tako dolgo je tekma,
// katere goli se ne ujemajo z izidom, nepopolna (brez `imported_at`).
const DNI_DOPOLNJEVANJA = 7
const DAN = 86400000
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi -----------------------------------------------------------

/** "508656" ali "474114+498951+498952" → { pulje: ['474114', …] }. */
export function razbijKodo(koda) {
  const s = String(koda ?? '').trim()
  if (!/^\d{3,9}(\+\d{3,9})*$/.test(s))
    throw new Error(`dbu: šifra lige je id pulje ali več id-jev s "+" (npr. 508656 ali 474114+498951+498952), ne "${koda}"`)
  const pulje = s.split('+')
  if (new Set(pulje).size !== pulje.length) throw new Error(`dbu: pulja v šifri "${koda}" je dvakrat`)
  return { pulje }
}

export const naslovPulje = (pulja) => `${OSNOVNI}/resultater/pulje/${pulja}/kampprogram`
export const naslovKampa = (pulja, kamp) => `${OSNOVNI}/resultater/kamp/${String(kamp).replace(/^dk/, '')}_${pulja}/kampinfo`
export const imePulje = (pulja) => `pulje-${pulja}.html`
export const imeKampa = (pulja, kamp) => `kamp-${String(kamp).replace(/^dk/, '')}_${pulja}.html`
// Šifra zapisnika v bazi je `dk<številka tekme>`: številke DBU so v prostoru
// drugih virov (oefb, mlsz, MNZ), `matches.zapisnik_id` pa je enoličen.
export const sifraZapisnika = (kamp) => `dk${String(kamp).replace(/^dk/, '')}`

// --- prenos in zavrnitve --------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi (izhod 4) in ne vzame shranjene strani. */
export class DbuZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'DbuZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
/**
 * Izziv: Cloudflare, CAPTCHA. Navadna stran naloži skript
 * `google.com/recaptcha/api.js` in ima obrazec za prijavo (Log ind) — to ni izziv.
 */
export const jeIzziv = (besedilo) =>
  /<title>\s*(Just a moment|Attention Required|Access denied)|cf_chl_opt|cf-turnstile|challenge-platform\/h\/|class="g-recaptcha"|class="h-captcha"|captcha-delivery/i.test(String(besedilo ?? ''))

/**
 * `fetch` vira (`prenos.mjs` ga dobi kot `vir.fetch`): 401, 403 in 429 vrže
 * `DbuZavrnitev` že tu — brez ponovitve (prenos 429 sicer ponovi) in mimo
 * shranjenega razporeda (uvoz razporeda pri 401 vzame shranjeno stran).
 */
export async function dbuFetch(url, moznosti = {}) {
  const odgovor = await fetch(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new DbuZavrnitev(`dbu: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

export const jeProgram = (html) => /class="[^"]*match-program--table/.test(String(html ?? ''))
export const jeStranKampa = (html) => /Kampnummer/.test(String(html ?? '')) && /class="sr-match-score/.test(String(html ?? ''))

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new DbuZavrnitev(`dbu: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new DbuZavrnitev(`dbu: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

// --- pomožno ------------------------------------------------------------------------

export const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/** "'80" → 80, "'93" → 90 (podaljšek je absolutna minuta), "" → null. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "fre. 31-07 2026" ali "31-07-2026" → "2026-07-31". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})-(\d{1,2})[\s-]+(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

/** "19:00" → "19:00"; drugo → null. Kopenhagen ima isti pas kot Ljubljana. */
export const uraIz = (s) => {
  const m = String(s ?? '').match(/(\d{1,2})[:.](\d{2})/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

function najpogostejsi(xs) {
  const c = new Map()
  for (const x of xs) if (x) c.set(x, (c.get(x) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null
}

// --- klubi ---------------------------------------------------------------------------

export const imeKluba = (ime) => besedilo(ime)

/**
 * Ključ kluba: male črke, æ, ø, å ostanejo, ločila proč ("B.93" = "b93").
 * Številka druge ekipe ostane ("Brøndby IF 2" ≠ "Brøndby IF") — rezervne ekipe
 * so svoj klub.
 */
export const kljucKlubaDk = (ime) =>
  imeKluba(ime)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/&/g, ' og ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const OBLIKE = new Set(['fc', 'f.c.', 'if', 'i.f.', 'bk', 'b.k.', 'boldklub', 'boldklubben'])
/** Kratko ime: brez "FC", "IF", "BK", če ostane vsaj ena beseda ("FC Roskilde" → "Roskilde"). */
export function kratkoImeDk(polno) {
  const ime = imeKluba(polno)
  const besede = ime.split(' ').filter((b) => b && !OBLIKE.has(b.toLowerCase()))
  return besede.length && besede.some((b) => /\p{L}/u.test(b)) ? besede.join(' ') : ime
}

// --- program pulje -------------------------------------------------------------------

/**
 * Druga ekipa kluba z istim imenom kot prva. DBU v programu obe ekipi piše
 * enako ("Holstebro B" v 3. division in v Danmarksserien 2026/27 — isti klub 255
 * v logotipu, ekipi 6038 in 6068); brez tega bi bili v bazi en klub. Ključ je
 * id ekipe (`/resultater/hold/<id>_<pulja>`), ki je last SEZONE: ob novi
 * sezoni preveri trke znova (CLAUDE.md, Danska) in dopiši nove id-je.
 */
export const IME_EKIPE = {
  6068: 'Holstebro B 2', // Herre-DS 2026/27, pulja 4 (prva ekipa je v 3. division)
  268450: 'Næstved 2', // Herre-DS 2025/26, pulja 1 "Næstved I.F." (prva ekipa 109644 je v 2. division)
}

/** Ime pulje iz glave strani ("CampoBet 2. Division - Grundspil 2026/27"). */
export const imePuljeStrani = (html) => besedilo(String(html ?? '').match(/<div class="sr--header">\s*<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '') || null

/**
 * Tekme pulje s programa: [{ kamp, pulja, datum, ura, domaci, gostje,
 * domaciId, gostjeId, izid, povezava }], urejene po datumu in številki.
 */
export function tekmePulje(html, pulja) {
  const s = String(html ?? '')
  const i = s.search(/class="[^"]*match-program--table/)
  if (i < 0) return []
  const tabela = s.slice(i, s.indexOf('</table>', i))
  const out = []
  for (const [, tr] of tabela.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celice = [...tr.matchAll(/<td class="([^"]*)">([\s\S]*?)<\/td>/g)].filter((x) => /hide-on-mobile/.test(x[1]))
    if (celice.length < 6) continue
    const kamp = besedilo(celice[1][2])
    if (!/^\d+$/.test(kamp)) continue
    const hold = [...tr.matchAll(/href="\/resultater\/hold\/(\d+)_\d+">([\s\S]*?)<\/a>/g)].map((m) => ({ id: m[1], ime: IME_EKIPE[m[1]] ?? imeKluba(m[2]) }))
    const r = tr.match(/class="home-score">([\s\S]*?)<\/div>[\s\S]*?class="away-score">([\s\S]*?)<\/div>/)
    const d = besedilo(r?.[1])
    const g = besedilo(r?.[2])
    const izid = /^\d+$/.test(d) && /^\d+$/.test(g) ? { domaci: Number(d), gostje: Number(g) } : null
    const povezava = tr.match(/\/resultater\/kamp\/(\d+)_(\d+)\/kampinfo/)
    out.push({
      kamp: Number(kamp),
      pulja: String(povezava?.[2] ?? pulja),
      datum: datumIz(besedilo(celice[2][2])),
      ura: uraIz(besedilo(celice[3][2])),
      domaci: hold[0]?.ime ?? null,
      gostje: hold[1]?.ime ?? null,
      domaciId: hold[0]?.id ?? null,
      gostjeId: hold[1]?.id ?? null,
      izid,
      povezava: !!povezava,
    })
  }
  return out.sort((a, b) => (a.datum ?? '9') < (b.datum ?? '9') ? -1 : (a.datum ?? '9') > (b.datum ?? '9') ? 1 : a.kamp - b.kamp)
}

// --- krogi -------------------------------------------------------------------------------

/** Ključ "tedna tekem": Pet–Pon (vikend, datum sobote) in Tor–Čet (sredi tedna, datum srede). */
export function sklopDneva(datum) {
  if (!datum) return null
  const d = new Date(`${datum}T00:00:00Z`)
  const zamik = { 5: 1, 6: 0, 0: -1, 1: -2, 2: 1, 3: 0, 4: -1 }[d.getUTCDay()]
  d.setUTCDate(d.getUTCDate() + zamik)
  return d.toISOString().slice(0, 10)
}

const dniMed = (a, b) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAN

/**
 * Krogi ene pulje iz datumov: [{ stevilka, datum, tekme }], opozorila.
 *
 * 1. Tekme (z datumom) po sklopih dni; v sklopu, kjer bi klub nastopil
 *    dvakrat, tekma odpre nov podsklop (dva kroga v istem vikendu, npr.
 *    velika noč: četrtek in ponedeljek).
 * 2. Krogov je R = vseh tekem / tekem na krog (⌊klubov / 2⌋). Krogi so R
 *    največjih podsklopov z vsaj polovico tekem kroga, po datumu.
 * 3. Ostale tekme (prestavljene) gredo v krog, v katerem obeh klubov ni in ni
 *    poln, najbližji po datumu (ob enakem raje prejšnji); sicer v krog brez
 *    obeh klubov; sicer najbližji (opozorilo: klub ima v krogu dve tekmi).
 */
export function dodeliKroge(tekme) {
  const vse = tekme.filter((t) => t.domaci && t.gostje)
  const xs = vse.filter((t) => t.datum).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.kamp - b.kamp))
  const klubi = new Set(vse.flatMap((t) => [t.domaci, t.gostje]))
  const naKrog = Math.max(1, Math.floor(klubi.size / 2))
  const R = Math.round(vse.length / naKrog)
  const podsklopi = []
  const poSklopu = new Map()
  for (const t of xs) {
    const sk = sklopDneva(t.datum)
    if (!poSklopu.has(sk)) poSklopu.set(sk, [])
    const moji = poSklopu.get(sk)
    // Tekma gre v ZADNJI podsklop (tekme so po datumu): velikonočni četrtek in
    // ponedeljek sta dva kroga, sobotna tekma med njima ostane sama in se
    // pozneje doda krogu, v katerem obeh klubov ni.
    let p = moji.at(-1)
    if (p && (p.klubi.has(t.domaci) || p.klubi.has(t.gostje))) p = null
    if (!p) {
      p = { sklop: sk, tekme: [], klubi: new Set() }
      moji.push(p)
      podsklopi.push(p)
    }
    p.tekme.push(t)
    p.klubi.add(t.domaci)
    p.klubi.add(t.gostje)
  }
  const prviDatum = (p) => p.tekme[0].datum
  const kandidati = podsklopi
    .filter((p) => p.tekme.length >= Math.ceil(naKrog / 2))
    .sort((a, b) => b.tekme.length - a.tekme.length || (prviDatum(a) < prviDatum(b) ? -1 : 1))
    .slice(0, R)
  const izbrani = new Set(kandidati)
  const krogi = [...kandidati]
    .sort((a, b) => (najpogostejsi(a.tekme.map((t) => t.datum)) < najpogostejsi(b.tekme.map((t) => t.datum)) ? -1 : 1))
    .map((p, i) => ({ stevilka: i + 1, datum: najpogostejsi(p.tekme.map((t) => t.datum)), tekme: [...p.tekme], klubi: new Set(p.klubi) }))
  const ostale = podsklopi.filter((p) => !izbrani.has(p)).flatMap((p) => p.tekme)
  const opozorila = []
  const prost = (k, t) => !k.klubi.has(t.domaci) && !k.klubi.has(t.gostje)
  const najblizji = (ks, t) =>
    [...ks].sort((a, b) => dniMed(a.datum, t.datum) - dniMed(b.datum, t.datum) || a.stevilka - b.stevilka)[0] ?? null
  for (const t of ostale) {
    let k = najblizji(krogi.filter((x) => prost(x, t) && x.tekme.length < naKrog), t) ?? najblizji(krogi.filter((x) => prost(x, t)), t)
    if (!k) {
      k = najblizji(krogi, t)
      if (!k) continue
      opozorila.push(`${t.domaci} : ${t.gostje} (${t.datum}) — klub ima v ${k.stevilka}. krogu dve tekmi`)
    }
    k.tekme.push(t)
    k.klubi.add(t.domaci)
    k.klubi.add(t.gostje)
  }
  return {
    krogi: krogi.map(({ stevilka, datum, tekme: ts }) => ({ stevilka, datum, tekme: ts.sort((a, b) => a.kamp - b.kamp) })),
    opozorila,
  }
}

/**
 * Krogi več pulj (`+`): pulja se zamakne za zadnji krog prejšnjih pulj, s
 * katerimi si deli klube; vzporedni pulji (brez skupnega kluba) si delita
 * številke. Vrne { krogi, opozorila, krogTekme: Map(kamp → krog) }.
 */
export function kroziPulj(pulje) {
  const faze = []
  const opozorila = []
  for (const { pulja, tekme } of pulje) {
    const { krogi, opozorila: o } = dodeliKroge(tekme)
    opozorila.push(...o.map((x) => `pulja ${pulja}: ${x}`))
    const klubi = new Set(tekme.flatMap((t) => [t.domaci, t.gostje]).filter(Boolean))
    const zamik = Math.max(0, ...faze.filter((f) => [...f.klubi].some((k) => klubi.has(k))).map((f) => f.zamik + f.krogi.length))
    faze.push({ pulja, krogi, klubi, zamik })
  }
  const poStevilki = new Map()
  for (const f of faze)
    for (const k of f.krogi) {
      const n = k.stevilka + f.zamik
      if (!poStevilki.has(n)) poStevilki.set(n, { stevilka: n, tekme: [] })
      poStevilki.get(n).tekme.push(...k.tekme)
    }
  const krogi = [...poStevilki.values()].sort((a, b) => a.stevilka - b.stevilka)
  const krogTekme = new Map()
  for (const k of krogi) for (const t of k.tekme) krogTekme.set(t.kamp, k.stevilka)
  return { krogi, opozorila, krogTekme }
}

// --- stran tekme -------------------------------------------------------------------------

/** "Oscar Hjorth Reenberg" → "Reenberg Oscar Hjorth" (priimek je zadnja beseda). */
export function imeIgralca(s) {
  const besede = besedilo(s).split(' ').filter(Boolean)
  return besede.length > 1 ? `${besede.at(-1)} ${besede.slice(0, -1).join(' ')}` : besede.join(' ')
}

/** Ključ imena za ujemanje dogodka s postavo: male črke, en presledek. */
const kljucImena = (s) => besedilo(s).normalize('NFC').toLowerCase()

/** Glava: { domaci, gostje, izid, status, datum, ura, kamp }. */
export function glavaKampa(html) {
  const s = String(html ?? '')
  const imeni = [...s.matchAll(/<div class="teamname"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => imeKluba(m[1]))
  const sc = s.match(/class="sr-match-score[^"]*">\s*<div class="home">([\s\S]*?)<\/div>[\s\S]*?<div class="away">([\s\S]*?)<\/div>/)
  const d = besedilo(sc?.[1])
  const g = besedilo(sc?.[2])
  const tidspunkt = besedilo(s.match(/Tidspunkt\s*<\/[^>]+>([\s\S]{0,400}?)<\/(?:div|td|dd)>/)?.[1] ?? '')
  return {
    domaci: imeni[0] ?? null,
    gostje: imeni[1] ?? null,
    izid: /^\d+$/.test(d) && /^\d+$/.test(g) ? { domaci: Number(d), gostje: Number(g) } : null,
    status: besedilo(s.match(/live-score--status">\s*<span>([\s\S]*?)<\/span>/)?.[1] ?? '') || null,
    datum: datumIz(tidspunkt),
    ura: uraIz(tidspunkt.replace(/^[^K]*/, '')),
    kamp: Number(besedilo(s.match(/Kampnummer\s*<\/[^>]+>([\s\S]{0,200}?)<\/(?:div|td|dd)>/)?.[1] ?? '')) || null,
  }
}

/**
 * Postavi: [{ postava, rezerve, osebje }, …] (domači, gostje). Začetniki so v
 * prvi tabeli igralcev, klop v tabeli "Reserver"; "Officials" so osebje
 * (le imena, za prepoznavo kartonov osebja).
 */
export function postaviKampa(html) {
  const s = String(html ?? '')
  const out = []
  for (const stran of ['home', 'away']) {
    const i = s.indexOf(`sr--match--team-card_${stran}`)
    if (i < 0) {
      out.push({ postava: [], rezerve: [], osebje: [] })
      continue
    }
    let konec = stran === 'home' ? s.indexOf('sr--match--team-card_away', i) : -1
    if (konec < 0) konec = s.indexOf('</section>', i)
    const del = s.slice(i, konec > i ? konec : undefined)
    const e = { postava: [], rezerve: [], osebje: [] }
    let prva = true
    for (const [, tabela] of del.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)) {
      const glava = besedilo(tabela.match(/<th\b[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? '')
      if (/official-tr/.test(tabela) || glava === 'Officials') {
        for (const [, ime] of tabela.matchAll(/<span class="p-name">([\s\S]*?)<\/span>/g)) if (besedilo(ime)) e.osebje.push(besedilo(ime))
        continue
      }
      const igralci = []
      for (const [, vrstica] of tabela.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
        if (!/shirt-number/.test(vrstica)) continue
        const st = besedilo(vrstica.match(/<td class="shirt-number">([\s\S]*?)<\/td>/)?.[1] ?? '')
        const imeCelica = [...vrstica.matchAll(/<td(?: class="(?!shirt-number)[^"]*")?>([\s\S]*?)<\/td>/g)].map((m) => besedilo(m[1])).find(Boolean)
        if (!imeCelica) continue
        igralci.push({ st: /^\d+$/.test(st) ? Number(st) : null, surovo: imeCelica })
      }
      if (glava === 'Reserver') e.rezerve.push(...igralci)
      else if (prva) {
        e.postava.push(...igralci)
        prva = false
      }
    }
    out.push(e)
  }
  return out
}

/**
 * Dogodki: [{ stran: 'home'|'away', ikona, minuta, igralec, igralec2 }]
 * ("neutral" — začetek, konec — izpustimo). Null, če strani "Kampfakta" ni.
 */
export function dogodkiKampa(html) {
  const s = String(html ?? '')
  const i = s.indexOf('sr--match--live-score--eventlist')
  if (i < 0) return null
  const konec = s.indexOf('Holdopstillinger', i)
  const del = s.slice(i, konec > i ? konec : undefined)
  const out = []
  for (const kos of del.split('<div class="sr--match--live-score--event">').slice(1)) {
    const stran = kos.match(/sr--match--live-score--event--(home|away|neutral)"/)?.[1]
    if (!stran || stran === 'neutral') continue
    const ikona = kos.match(/icon_sr_([A-Za-z0-9_]+)\.svg/)?.[1] ?? 'neznano'
    const igralec2 = besedilo(kos.match(/event--player2">([\s\S]*?)<\/div>/)?.[1] ?? '') || null
    const telo = kos.match(/event--player">([\s\S]*)$/)?.[1] ?? ''
    const igralec = besedilo(telo.replace(/<div class="sr--match--live-score--event--player2">[\s\S]*?<\/div>/, '')) || null
    out.push({ stran, ikona, minuta: minuta(besedilo(kos.match(/event--minute">([\s\S]*?)<\/div>/)?.[1] ?? '')), igralec, igralec2 })
  }
  // Stran našteje dogodke od zadnjega proti prvemu; vrnemo jih po vrsti tekme
  // (ob isti minuti v vrstnem redu vnosa), da se ponovni vstop prebere prav.
  return out.reverse().map((d, n) => ({ d, n })).sort((a, b) => (a.d.minuta ?? 0) - (b.d.minuta ?? 0) || a.n - b.n).map((x) => x.d)
}

/** "Ukendt spiller" — DBU imena ne objavi (persondata na breddekampe). */
export const jeSkrit = (ime) => /^\s*ukendt\s+spiller\s*$/i.test(besedilo(ime))
const SKRIT = Object.freeze({ skrit: true })

const VRSTE = new Set(['goal', 'penaltyGoal', 'goalOwn', 'penaltyMiss', 'yellow', 'yellowred', 'red', 'subHome', 'subAway'])

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma ali nima izida.
 * `tekma` je vrstica s programa pulje (datum, ura, imeni klubov, izid).
 */
export function vZapisnik(html, { tekma = null, danes = Date.now() } = {}) {
  if (!jeStranKampa(html)) return null
  const g = glavaKampa(html)
  const rezultat = g.izid ?? tekma?.izid ?? null
  if (!rezultat) return null
  const imeni = [tekma?.domaci ?? g.domaci, tekma?.gostje ?? g.gostje]
  const ekipe = postaviKampa(html)
  const dogodki = dogodkiKampa(html)
  const opozorila = []
  // Nižje lige: ekipa je lahko vpisana kot en seznam (14 igralcev, brez
  // "Reserver"). Če je brez igralcev, ki vstopijo z menjavo, natanko 11, so to
  // začetniki; sicer delitve ne poznamo in ekipa nima postave.
  const brezDelitve = ekipe.map((e, idx) => {
    if (e.rezerve.length || e.postava.length <= 11) return false
    const vstopi = new Set((dogodki ?? []).filter((d) => d.ikona === (idx === 0 ? 'subHome' : 'subAway') && d.igralec).map((d) => kljucImena(d.igralec)))
    const klop = e.postava.filter((x) => vstopi.has(kljucImena(x.surovo)))
    if (e.postava.length - klop.length === 11) {
      opozorila.push(`${imeni[idx]}: ${e.postava.length} igralcev brez delitve na začetnike in klop — začetniki izpeljani iz menjav`)
      e.rezerve = klop
      e.postava = e.postava.filter((x) => !klop.includes(x))
      return false
    }
    return true
  })
  const znana = ekipe.map((e, idx) => !brezDelitve[idx] && e.postava.length >= NAJMANJ_ZACETNIKOV)
  ekipe.forEach((e, idx) => {
    if (!znana[idx])
      opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${brezDelitve[idx] ? `${e.postava.length} igralcev brez delitve na začetnike in klop` : e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'}`)
  })

  const igralci = ekipe.map((e) => [
    ...e.postava.map((x, n) => ({ ...x, zacetnik: true, red: n })),
    ...e.rezerve.map((x, n) => ({ ...x, zacetnik: false, red: 100 + n })),
  ].map((x) => ({ ...x, ime: imeIgralca(x.surovo), kljuc: kljucImena(x.surovo), skrit: jeSkrit(x.surovo) })))
  const osebje = ekipe.map((e) => new Set(e.osebje.map(kljucImena)))
  // "Ukendt spiller": igralec, katerega imena DBU ne objavi (persondata). Mesto
  // v postavi ostane (11 začetnikov), nastopa ne dobi — identitete ni.
  igralci.forEach((xs, idx) => {
    const n = xs.filter((i) => i.skrit).length
    if (n && znana[idx]) opozorila.push(`${imeni[idx]}: ${n} igralcev brez imena (Ukendt spiller) — brez nastopa`)
  })

  /** Igralec iz dogodka v ekipi idx: po celem imenu, sicer po priimku, če je en sam. */
  const najdi = (idx, ime) => {
    if (!ime) return null
    if (jeSkrit(ime)) return SKRIT
    const k = kljucImena(ime)
    const xs = igralci[idx].filter((i) => i.kljuc === k)
    if (xs.length > 1) opozorila.push(`${imeni[idx]}: "${ime}" ustreza ${xs.length} igralcem — dogodek prvemu`)
    if (xs.length) return xs[0]
    const priimek = k.split(' ').at(-1)
    const po = igralci[idx].filter((i) => i.kljuc.split(' ').at(-1) === priimek)
    return po.length === 1 ? po[0] : null
  }
  const kdo = (idx, i, m) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: null, minuta: m })

  const preklopi = new Map()
  const dodajPreklop = (i, m) => preklopi.set(i, [...(preklopi.get(i) ?? []), m])
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const zgresene = []
  const drugiRumeni = []
  if (!dogodki) {
    if (znana[0] || znana[1]) opozorila.push('stran nima dogodkov (Kampfakta) — menjav in strelcev ni')
  }
  for (const d of dogodki ?? []) {
    const idxStrani = d.stran === 'home' ? 0 : 1
    if (!VRSTE.has(d.ikona)) {
      opozorila.push(`neznan dogodek "${d.ikona}" (${d.igralec ?? '?'}, ${d.minuta}.)`)
      continue
    }
    if (d.ikona === 'subHome' || d.ikona === 'subAway') {
      const idx = d.ikona === 'subHome' ? 0 : 1
      let noter = najdi(idx, d.igralec)
      let ven = najdi(idx, d.igralec2)
      // Navadno je prvi, ki vstopi, drugi izstopi; vnašalec ju včasih zamenja
      // (KFUM Roskilde, DS 2026/27). Odloči stanje na igrišču: kdor je na
      // igrišču, izstopi.
      const stanje = (i) => (i && i !== SKRIT ? ((preklopi.get(i)?.length ?? 0) % 2 === (i.zacetnik ? 0 : 1)) : null)
      if ((stanje(noter) === true && stanje(ven) !== true) || (stanje(ven) === false && stanje(noter) !== false)) [noter, ven] = [ven, noter]
      if (znana[idx] && (!noter || !ven)) opozorila.push(`${imeni[idx]}: menjava ${d.igralec ?? '?'} za ${d.igralec2 ?? '?'} (${d.minuta}.) — igralca ni v postavi`)
      if (d.minuta == null) {
        opozorila.push(`${imeni[idx]}: menjava ${d.igralec ?? '?'} za ${d.igralec2 ?? '?'} brez minute`)
        continue
      }
      // Napaka vira: "noter" je igralec, ki je že na igrišču (začetnik brez izstopa).
      const naIgriscu = (i) => (preklopi.get(i)?.length ?? 0) % 2 === (i.zacetnik ? 0 : 1)
      const pravi = (i) => (i && i !== SKRIT ? i : null)
      // Napaka vira: oba sta na igrišču ali oba na klopi. Preklopimo le tistega,
      // za katerega menjava drži (vstop z klopi oz. izstop z igrišča).
      const noterNaIgriscu = pravi(noter) && naIgriscu(noter)
      const venNaKlopi = pravi(ven) && !naIgriscu(ven)
      if (noterNaIgriscu) opozorila.push(`${imeni[idx]}: menjava v ${d.minuta}. minuti — ${noter.ime} vstopi, a je že na igrišču`)
      if (venNaKlopi && !noterNaIgriscu) opozorila.push(`${imeni[idx]}: menjava v ${d.minuta}. minuti — ${ven.ime} izstopi, a je na klopi`)
      if (pravi(noter) && !noterNaIgriscu) dodajPreklop(noter, d.minuta)
      if (pravi(ven) && !venNaKlopi) dodajPreklop(ven, d.minuta)
      menjave.push({ ekipaIdx: idx, minuta: d.minuta, noter: { st: pravi(noter)?.st ?? null, ime: pravi(noter)?.ime ?? null }, ven: { st: pravi(ven)?.st ?? null, ime: pravi(ven)?.ime ?? null } })
      continue
    }
    if (d.ikona === 'goal' || d.ikona === 'penaltyGoal' || d.ikona === 'goalOwn') {
      const avtogol = d.ikona === 'goalOwn'
      // Avtogol je prikazan pri ekipi, ki ji šteje; strelec je iz nasprotne.
      const idx = avtogol ? 1 - idxStrani : idxStrani
      const i = najdi(idx, d.igralec)
      if (!i || i === SKRIT) {
        if (!i && znana[idx]) opozorila.push(`gol v ${d.minuta}. minuti (${d.igralec ?? '?'}, ${imeni[idx]}): strelca ni v postavi`)
        goli.push({ ekipaIdx: idx, st: null, ime: null, regSt: null, minuta: d.minuta, avtogol, enajstmetrovka: d.ikona === 'penaltyGoal' })
        continue
      }
      goli.push({ ...kdo(idx, i, d.minuta), avtogol, enajstmetrovka: d.ikona === 'penaltyGoal' })
      continue
    }
    const i = najdi(idxStrani, d.igralec)
    if (i === SKRIT) continue
    if (d.ikona === 'penaltyMiss') {
      if (i) zgresene.push({ ...kdo(idxStrani, i, d.minuta), enajstmetrovka: true })
      continue
    }
    if (!i) {
      // Karton osebja (trener, vodja ekipe) ne šteje; karton neznanega imena je opozorilo.
      if (!osebje[idxStrani].has(kljucImena(d.igralec)) && znana[idxStrani])
        opozorila.push(`${imeni[idxStrani]}: karton (${d.ikona}) v ${d.minuta}. minuti — "${d.igralec ?? '?'}" ni v postavi`)
      continue
    }
    if (d.ikona === 'yellow') rumeni.push({ ...kdo(idxStrani, i, d.minuta), _i: i })
    else {
      if (d.ikona === 'yellowred') drugiRumeni.push({ i, idx: idxStrani, minuta: d.minuta })
      if (!rdeci.some((r) => r._i === i)) rdeci.push({ ...kdo(idxStrani, i, d.minuta), _i: i })
    }
  }
  // Drugi rumeni: vir ga zapiše kot yellow + yellowred ob isti minuti (prvi
  // rumeni je lahko tudi prej). Kot pri drugih virih: natanko 1 rumeni + 1 rdeči.
  for (const { i, idx, minuta: m } of drugiRumeni) {
    const moji = rumeni.filter((r) => r._i === i)
    if (!moji.length) rumeni.push({ ...kdo(idx, i, m), _i: i })
    else for (const r of moji.slice(1)) rumeni.splice(rumeni.indexOf(r), 1)
  }
  const brez = (xs) => xs.map(({ _i, ...x }) => x)

  const sestava = ekipe.map((e, idx) => {
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const imena = igralci[idx].filter((i) => !i.skrit).map((i) => i.ime)
    for (const ime of new Set(imena.filter((x, k) => imena.indexOf(x) !== k))) opozorila.push(`${imeni[idx]}: dva igralca z imenom "${ime}" — dogodke loči le dres`)
    const vObliko = (i) => {
      const vratar = i.zacetnik && i.st === 1
      return {
        st: i.st,
        ime: i.ime,
        regSt: null,
        zacetnik: i.zacetnik,
        kapetan: false,
        vratar,
        pozicija: vratar ? 'GK' : null,
        preklopi: [...(preklopi.get(i) ?? [])].sort((a, b) => a - b),
      }
    }
    return {
      ime: imeni[idx],
      postava: igralci[idx].filter((i) => i.zacetnik && !i.skrit).map(vObliko),
      rezerve: igralci[idx].filter((i) => !i.zacetnik && !i.skrit).map(vObliko),
    }
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  let dopolnjuje = false
  if (znana[0] && znana[1] && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)) {
    const neujemanje = `goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`
    const datum = tekma?.datum ?? g.datum
    dopolnjuje = !(starostDni(datum, danes) > DNI_DOPOLNJEVANJA)
    opozorila.push(dopolnjuje ? `${NEPOPOLN}: ${neujemanje} — zapisnik se še dopolnjuje` : neujemanje)
  }
  if (tekma?.izid && g.izid && (tekma.izid.domaci !== g.izid.domaci || tekma.izid.gostje !== g.izid.gostje))
    opozorila.push(`izid tekme ${g.izid.domaci}:${g.izid.gostje} ni izid programa ${tekma.izid.domaci}:${tekma.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const prazen = !ekipe[0].postava.length && !ekipe[1].postava.length
  const datum = tekma?.datum ?? g.datum
  return {
    zapisnikId: tekma ? sifraZapisnika(tekma.kamp) : g.kamp ? sifraZapisnika(g.kamp) : null,
    url: null,
    sezona: datum ? sezonaIz(datum) : null,
    krog: null,
    datum,
    ura: tekma?.ura ?? g.ura ?? null,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas: null,
    goli,
    zgresene,
    rumeni: brez(rumeni),
    rdeci: brez(rdeci),
    menjave,
    imaDogodke: !!dogodki,
    nepopoln: !znana[0] || !znana[1] || dopolnjuje,
    prazen,
    // Kontumacija: 3:0 ali 0:3 brez obeh postav in brez golov.
    kontumacija: prazen && !goli.length && ((rezultat.domaci === 3 && rezultat.gostje === 0) || (rezultat.domaci === 0 && rezultat.gostje === 3)),
    opozorila,
  }
}

/**
 * V predpomnilnik gre le cela stran: program pulje; stran tekme z obema
 * postavama, z dogodki in z goli = izid. Napaka, izziv, nepopolna stran in
 * stran brez dogodkov se berejo znova.
 */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  const s = String(besedilo ?? '')
  if (jeIzziv(s)) return false
  if (/^(pulje-|razpored-)/.test(datoteka)) return jeProgram(s)
  if (/^kamp-/.test(datoteka)) {
    const z = vZapisnik(s, { danes: 0 })
    return !!z && !z.nepopoln && z.imaDogodke
  }
  return jeProgram(s)
}

// --- branje ------------------------------------------------------------------------------

/** Programi vseh pulj šifre (vedno sveži); pulja brez tekem ustavi uvoz. */
async function preberiPulje(koda, prenesi) {
  const out = []
  for (const pulja of razbijKodo(koda).pulje) {
    const url = naslovPulje(pulja)
    const html = await beri(prenesi, url, imePulje(pulja), true)
    if (!jeProgram(html)) throw new Error(`dbu: ${url} ni program pulje (${html.length} B) — uvoz ustavljen`)
    const tekme = tekmePulje(html, pulja)
    if (!tekme.length) throw new Error(`dbu: ${url} — pulja nima tekem — uvoz ustavljen`)
    out.push({ pulja, ime: imePuljeStrani(html), tekme })
  }
  return out
}

/** Razpored iz pulj: [{ stevilka, tekme: [...] }]. Kontumacije označi `vir.kontumacije`. */
export function razporedIzPulj(pulje, { danes = Date.now() } = {}) {
  const { krogi, opozorila } = kroziPulj(pulje)
  for (const o of opozorila) console.warn(`dbu: ${o}`)
  return krogi.map((k) => ({
    stevilka: k.stevilka,
    tekme: k.tekme.map((t) => ({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      // Tekma z izidom je odigrana; minula brez izida (prestavljena) ni.
      odigrana: !!t.izid,
      kontumacija: false,
      sifra: t.kamp,
      pulja: t.pulja,
      izid: t.izid,
      starost: starostDni(t.datum, danes),
    })),
  }))
}

/** Sezona šifre: najpogostejša sezona datumov tekem ("2026/27"). */
export const sezonaPulj = (pulje) => najpogostejsi(pulje.flatMap((p) => p.tekme.map((t) => (t.datum ? sezonaIz(t.datum) : null))))

/** Stran tekme; iz predpomnilnika nepopolna ali neprebrana se prebere še enkrat sveža (`zapisnikSvez`). */
async function preberiKamp(prenesi, t, danes) {
  const url = naslovKampa(t.pulja, t.kamp)
  const ime = imeKampa(t.pulja, t.kamp)
  const sveze = starostDni(t.datum, danes) <= 3
  let html = await beri(prenesi, url, ime, sveze)
  let z = jeStranKampa(html) ? vZapisnik(html, { tekma: t, danes }) : null
  if (!sveze && (!z || z.nepopoln || !z.imaDogodke)) {
    html = await beri(prenesi, url, ime, true)
    z = jeStranKampa(html) ? vZapisnik(html, { tekma: t, danes }) : null
  }
  return { url, html, z }
}

const vir = {
  ime: 'dbu',
  polnoIme: 'Dansk Boldspil-Union (dbu.dk)',
  drzava: 'DK',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: dbuFetch,

  naslovRazporeda: (koda) => naslovPulje(razbijKodo(koda).pulje[0]),
  naslovZapisnika: (koda, id, pulja = razbijKodo(koda).pulje[0]) => naslovKampa(pulja, id),
  sifraZapisnika,
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new DbuZavrnitev(`dbu: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  /** Razpored: krogi iz datumov (glej `dodeliKroge`). */
  async razporedVseStrani(koda, prenesi) {
    return razporedIzPulj(await preberiPulje(koda, prenesi))
  },

  /**
   * Zapisniki odigranih tekem. Stran tekme prve 3 dni beremo svežo (popravki),
   * pozneje iz predpomnilnika — vanj gre le cela stran (`zaPredpomnilnik`).
   * Izid 3:0 / 0:3 brez postav, starejši od tedna dni, je kontumacija (brez zapisnika).
   */
  async zapisniki(koda, prenesi, danes = Date.now()) {
    const pulje = await preberiPulje(koda, prenesi)
    const sezona = sezonaPulj(pulje)
    const { krogTekme } = kroziPulj(pulje)
    const out = []
    for (const p of pulje) {
      for (const t of p.tekme) {
        if (!t.izid || !krogTekme.has(t.kamp)) continue
        let prebrano
        try {
          prebrano = await preberiKamp(prenesi, t, danes)
        } catch (e) {
          if (e.zavrnitev) throw e
          if (e.status === 404) {
            console.warn(`dbu: ${naslovKampa(t.pulja, t.kamp)} → 404 — tekma preskočena`)
            continue
          }
          throw e
        }
        const { url, html, z } = prebrano
        if (!jeStranKampa(html)) throw new Error(`dbu: ${url} ni stran tekme (${html.length} B) — uvoz ustavljen`)
        if (!z) continue
        if (z.kontumacija && starostDni(t.datum, danes) > 7) continue
        z.sezona = sezona
        z.krog = krogTekme.get(t.kamp)
        z.url = url
        out.push({ id: z.zapisnikId, z, url })
      }
    }
    return out
  },

  /**
   * Kontumacije: izid 3:0 ali 0:3, starejši od tedna dni, katerega stran tekme
   * nima postav ne golov. Bere le take tekme.
   */
  async kontumacije(koda, prenesiKrog, krogi, danesIso) {
    const danes = Date.parse(`${danesIso}T12:00:00Z`)
    const out = []
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.sifra || !t.pulja || starostDni(t.datum, danes) <= 7) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const url = naslovKampa(t.pulja, t.sifra)
        const html = await prenesiKrog(url, imeKampa(t.pulja, t.sifra), t.datum)
        if (jeIzziv(html)) throw new DbuZavrnitev(`dbu: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
        if (vZapisnik(html, { tekma: { ...t, kamp: t.sifra } })?.kontumacija) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaDk,
  kratkoIme: kratkoImeDk,
  poenostavi: kljucKlubaDk,
}

export default vir
