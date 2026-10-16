// Vir: Scottish Lowland Football League — slfl.co.uk (Škotska, 5. raven).
//
// Stran lige (WordPress, Scoot Digital) izriše "Match Centre" iz podatkov
// COMET škotske zveze ("All data provided by Comet") na strežniku — beremo HTML.
// **Pisno dovoljenje za zajem: pridobil Lovro, oktober 2026** (pogoji uporabe
// strani avtomatsko branje sicer prepovedujejo). Dovoljenje ne pokriva tehnične
// zaščite: ob CAPTCHI, izzivu, prijavi ali 401/403/429 se uvoz ustavi — ne obhajaj.
// Glej docs/viri/skotska.md (Škotska — vir lowland).
//
// ŠIFRA LIGE je `<tekmovanje>/<sezona>/<comet>` (`slfl/2026-2027/54193157`):
// pot Match Centra (`/match-centre/<tekmovanje>/<sezona>/`) in id skupine COMET
// na tej strani (`data-mc-competition-panel="comp-<id>"`). Ena stran nosi obe
// skupini (Lowland League East in West), vse tekme sezone: "Fixtures"
// (neodigrane, "vs") in "Results" (izid "4 : 0"), po dnevih ("Saturday 17 Oct,
// 2026"), z igriščem, uro ("KO 15:00", škotski čas = Ljubljana − 1 h) in
// povezavo na tekmo `/match-centre/<tekmovanje>/<sezona>/<id>/` (id tekme COMET).
//
// KROGOV vir NE objavi. Izpeljemo jih iz šifer COMET: razpored sezone je bil
// ustvarjen naenkrat, krog za krogom, zato so šifre tekem strnjen blok, urejen
// po krogih (East 54383300–54383536, West 54381817–54382087). Krog je zaporedje
// šifer, v katerem noben klub ne nastopi dvakrat (`krogiIzSifer`). Šifra
// tekme se ob prestavitvi ne spremeni, zato je številka kroga stalna. Tekma, ki
// je odigrana na dan drugega kroga, v katerem oba kluba nista zasedena, gre v
// tisti krog (zamenjava tekem istih klubov); tekma z novo šifro (zveza je
// prestavljeno tekmo izbrisala in vpisala znova) gre v krog, v katerem obeh
// klubov ni. Glej `dodeliKroge`.
//
// STRAN TEKME: postavi "Starting XI" in "Substitutes" (dres, "C. Armour",
// "(c)" kapetan; vratar ni označen, COMET ga našteje prvega — namig), dogodki
// v stolpcu ekipe (`event home` / `event away`) z minuto ("90+1'" → 90):
// goal, penalty (gol z 11 m), own-goal (v stolpcu ekipe strelca, šteje
// nasprotniku), yellow, second-yellow (prvi rumeni je svoj dogodek → 1 rumeni
// + 1 rdeči), red, expulsion in rumeni brez imena (osebje — ne šteje),
// SUBSTITUTION (prvi noter, drugi ven — minute so točne). Dogodki pišejo ime
// "PRIIMEK Ime", postava "I. Priimek": igralca najdemo po priimku in začetnici.
// Šifer igralcev ni: identiteta je ime + klub (kot fsb, ffm), ime je
// "Priimek I." iz postave (ista oblika na vseh tekmah). Datuma stran tekme
// nima — vzamemo ga s strani lige.
//
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki). V predpomnilnik gre le
// cela stran: stran lige z Match Centrom, stran tekme z obema postavama in z
// goli, ki se ujemajo z izidom (`zaPredpomnilnik`) — nepopolna ali
// vzdrževalna stran se bere znova.
import { razpakiraj } from '../klubi.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

const OSNOVNI = 'https://slfl.co.uk'
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
// Zapisnik se dopolnjuje (goli pridejo za postavami): tako dolgo je tekma, katere
// goli se ne ujemajo z izidom, nepopolna (brez `imported_at`, bere se znova).
const DNI_DOPOLNJEVANJA = 7
const DAN = 86400000
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi -----------------------------------------------------------

/** "slfl/2026-2027/54193157" → { tekmovanje, sezonaPot, comet, sezona: '2026/27' }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+)\/(\d{4})-(\d{4})\/(\d+)$/)
  if (!m || Number(m[3]) !== Number(m[2]) + 1)
    throw new Error(`lowland: šifra lige je "<tekmovanje>/<LLLL-LLLL>/<comet>" (npr. slfl/2026-2027/54193157), ne "${koda}"`)
  return { tekmovanje: m[1], sezonaPot: `${m[2]}-${m[3]}`, comet: m[4], sezona: `${m[2]}/${m[3].slice(2)}` }
}

export const naslovLige = (koda) => {
  const k = razbijKodo(koda)
  return `${OSNOVNI}/match-centre/${k.tekmovanje}/${k.sezonaPot}/`
}
export const naslovTekme = (koda, id) => `${naslovLige(koda)}${String(id).replace(/^sc/, '')}/`
// Stran lige je skupna obema skupinama (ime brez šifre COMET), stran tekme nosi
// tekmovanje (Lowland League Cup ima iste šifre tekem v drugi poti).
export const imeLige = (koda) => {
  const k = razbijKodo(koda)
  return `seznam-${k.tekmovanje}-${k.sezonaPot}.html`
}
export const imeTekme = (koda, id) => `tekma-${razbijKodo(koda).tekmovanje}-${String(id).replace(/^sc/, '')}.html`
// Šifra zapisnika v bazi je `sc<id>`: šifre COMET so v istem številskem prostoru
// kot drugi viri COMET (hns, fss, ffm), `matches.zapisnik_id` pa je enoličen.
export const sifraZapisnika = (id) => `sc${String(id).replace(/^sc/, '')}`

// --- prenos in zavrnitve --------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi (izhod 4) in ne vzame shranjene strani. */
export class LowlandZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'LowlandZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
/** Izziv ali zid: Cloudflare, CAPTCHA, prijava v WordPress. */
export const jeIzziv = (besedilo) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha|id="loginform"|wp-login\.php\?redirect_to/i.test(String(besedilo ?? ''))

/**
 * `fetch` vira (`prenos.mjs` ga dobi kot `vir.fetch`): 401, 403 in 429 vrže
 * `LowlandZavrnitev` že tu — brez ponovitve (prenos 429 sicer ponovi) in mimo
 * shranjenega razporeda (uvoz razporeda pri 401 vzame shranjeno stran).
 */
export async function lowlandFetch(url, moznosti = {}) {
  const odgovor = await fetch(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new LowlandZavrnitev(`lowland: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

const jeStranLige = (html) => /id="view__match-centre"/.test(html) && /mc-fixture-list__match/.test(html)
const jeStranTekme = (html) => /id="view__match-single"/.test(html)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new LowlandZavrnitev(`lowland: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new LowlandZavrnitev(`lowland: ${url} vrne izziv ali prijavo — uvoz ustavljen, ne obhajamo`)
  return html
}

// --- pomožno ------------------------------------------------------------------------

export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#039;|&#39;|&#8217;/g, "'"))
    .replace(/\s+/g, ' ')
    .trim()

/** "90+1'" → 90, "45+2'" → 45, "57'" → 57. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

const MESECI = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
/** "Saturday 17 Oct, 2026" → "2026-10-17". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})/)
  const mesec = m ? MESECI[m[2].toLowerCase()] : null
  return mesec ? `${m[3]}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

/** Škotski datum in ura → ljubljanski (+1 h; poletni čas se menja isti dan). "KO TBC" = ura neznana. */
export function vLjubljanskiCas(datum, ura) {
  const m = String(ura ?? '').match(/(\d{1,2}):(\d{2})/)
  if (!datum || !m) return { datum: datum ?? null, ura: null }
  const h = Number(m[1]) + 1
  if (h < 24) return { datum, ura: `${String(h).padStart(2, '0')}:${m[2]}` }
  const x = new Date(`${datum}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + 1)
  return { datum: x.toISOString().slice(0, 10), ura: `00:${m[2]}` }
}

/** "4 : 0" → { domaci: 4, gostje: 0 }; "vs" ali drugo → null. */
export function izidIz(s) {
  const m = String(s ?? '').match(/^\s*(\d+)\s*[:-]\s*(\d+)\s*$/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

// --- klubi ---------------------------------------------------------------------------

/** Ime kluba, kot ga piše stran, brez pripone prve ekipe ("Bonnyrigg Rose Athletic 1st Team"). */
export const imeKluba = (ime) => besedilo(ime).replace(/\s+1st\s+Team$/i, '').trim()

/** Ključ kluba: male črke, "&" = "and", brez ločil ("Bo'ness United" = "boness united"). */
export const kljucKlubaSc = (ime) =>
  imeKluba(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const OBLIKE = new Set(['fc', 'afc', 'f.c.', 'a.f.c.'])
/** Kratko ime: brez "FC"/"AFC" ("Gretna 2008" ostane). */
export function kratkoImeSc(polno) {
  const besede = imeKluba(polno).split(' ').filter((b) => b && !OBLIKE.has(b.toLowerCase()))
  return besede.length ? besede.join(' ') : imeKluba(polno)
}

// --- stran lige ------------------------------------------------------------------------

/**
 * Tekme ene skupine (`comet`) s strani lige: [{ id, datum, ura (ljubljanska),
 * domaci, gostje, izid, igrisce, oznaka }]. Iz plošč "fixtures" in "results".
 */
export function tekmeLige(html, comet) {
  const s = String(html ?? '')
  const out = []
  const videne = new Set()
  for (const plosca of s.split('data-mc-panel="').slice(1)) {
    const vrsta = plosca.slice(0, plosca.indexOf('"'))
    if (vrsta !== 'fixtures' && vrsta !== 'results') continue
    for (const skupina of plosca.split('data-mc-competition-panel="').slice(1)) {
      if (skupina.slice(0, skupina.indexOf('"')) !== `comp-${comet}`) continue
      for (const dan of skupina.split('<span class="heading--date">').slice(1)) {
        const datum = datumIz(dan.slice(0, dan.indexOf('<')))
        for (const [, li] of dan.matchAll(/<li class="mc-fixture-list__match">([\s\S]*?)<\/li>/g)) {
          const id = li.match(/href="[^"]*\/(\d+)\/?"/)?.[1]
          if (!id || videne.has(id)) continue
          videne.add(id)
          const imeni = [...li.matchAll(/<div class="team-name (?:home|away)-team">([\s\S]*?)<\/div>/g)].map((x) => imeKluba(x[1]))
          const izid = izidIz(besedilo(li.match(/<span class="score[^"]*">([\s\S]*?)<\/span>/)?.[1]))
          const sek = `${li.match(/<div class="details--secondary">([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? ''}</div>`
          const vrstice = [...sek.matchAll(/<div>([\s\S]*?)<\/div>/g)].map((x) => besedilo(x[1]))
          const ko = vrstice.find((v) => /^KO\b/i.test(v))
          const cas = vLjubljanskiCas(datum, ko)
          out.push({
            id: Number(id),
            datum,
            ura: cas.ura,
            datumLj: cas.datum,
            domaci: imeni[0] ?? null,
            gostje: imeni[1] ?? null,
            izid,
            plosca: vrsta,
            igrisce: vrstice.find((v) => v !== ko && !/\d{4}-\d{2}$/.test(v)) ?? null,
            oznaka: vrstice.at(-1) ?? null,
          })
        }
      }
    }
  }
  return out.sort((a, b) => a.id - b.id)
}

/** Imena skupin na strani: { '<comet>': 'Lowland League East' }. */
export function skupineLige(html) {
  const out = {}
  for (const [, id, ime] of String(html ?? '').matchAll(/data-mc-competition="comp-(\d+)"[^>]*>([\s\S]*?)<\/button>/g)) out[id] = besedilo(ime)
  return out
}

// --- krogi -------------------------------------------------------------------------------

/** Ključ "tedna tekem": dnevi Tor–Čet (sredi tedna) in Pet–Pon (vikend) so svoj sklop. */
export function sklopDneva(datum) {
  if (!datum) return null
  const d = new Date(`${datum}T00:00:00Z`)
  const dan = d.getUTCDay() // 0 ned … 6 sob
  // Vikend Pet–Pon se zapiše z datumom sobote, sredina tedna Tor–Čet z datumom srede.
  const zamik = { 5: 1, 6: 0, 0: -1, 1: -2, 2: 1, 3: 0, 4: -1 }[dan]
  d.setUTCDate(d.getUTCDate() + zamik)
  return d.toISOString().slice(0, 10)
}

/**
 * Krogi iz šifer COMET: tekme po šifri, nov krog, ko bi klub nastopil drugič
 * ali ko se sklop dni zamenja in ga potrdi tudi naslednja tekma (krog,
 * ki mu manjkajo tekme, se ne zlije z naslednjim). Vrne [[tekma, …], …].
 * Šifre zunaj glavnega bloka (tekma, vpisana pozneje) se ne štejejo — glej `dodeliKroge`.
 */
export function krogiIzSifer(tekme) {
  const xs = [...tekme].sort((a, b) => a.id - b.id)
  if (!xs.length) return { krogi: [], pozne: [] }
  // Glavni blok: največja strnjena skupina šifer z vrzelmi do 20 (izbrisane tekme).
  const bloki = [[xs[0]]]
  for (const t of xs.slice(1)) {
    if (t.id - bloki.at(-1).at(-1).id <= 20) bloki.at(-1).push(t)
    else bloki.push([t])
  }
  const glavni = bloki.reduce((a, b) => (b.length > a.length ? b : a))
  const pozne = xs.filter((t) => !glavni.includes(t))
  const krogi = []
  let krog = []
  let klubi = new Set()
  for (let i = 0; i < glavni.length; i++) {
    const t = glavni[i]
    const ponovi = klubi.has(t.domaci) || klubi.has(t.gostje)
    const sklop = sklopDneva(t.datum)
    const sklopKroga = najpogostejsi(krog.map((x) => sklopDneva(x.datum)))
    const naslednji = glavni[i + 1]
    // Sklop kroga mora držati vsaj dve tekmi: posamezna prestavljena tekma
    // (prva v bloku) krogu ne določi dneva.
    const nov = krog.filter((x) => sklopDneva(x.datum) === sklopKroga).length >= 2 && sklop !== sklopKroga &&
      naslednji && sklopDneva(naslednji.datum) === sklop && !krog.some((x) => sklopDneva(x.datum) === sklop)
    if (krog.length && (ponovi || nov)) {
      krogi.push(krog)
      krog = []
      klubi = new Set()
    }
    krog.push(t)
    klubi.add(t.domaci)
    klubi.add(t.gostje)
  }
  if (krog.length) krogi.push(krog)
  return { krogi, pozne }
}

function najpogostejsi(xs) {
  const c = new Map()
  for (const x of xs) if (x) c.set(x, (c.get(x) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null
}

/**
 * Tekme po krogih: [{ stevilka, sklop, tekme: [...] }].
 *
 * 1. Krog je blok šifer (`krogiIzSifer`), njegov sklop dni je najpogostejši
 *    sklop njegovih tekem (ob prestavitvi celega kroga se premakne z njim).
 * 2. Tekma, odigrana v sklopu svojega kroga, ostane v njem.
 * 3. Ostale (prestavljene in pozneje vpisane), po datumu in šifri — glej
 *    korake a)–d) spodaj. Odigrana tekma ostane v istem krogu, ker so krogi in
 *    tekme pred njo že odigrani; spremembe razporeda premikajo le prihodnje.
 * Rok kroga je najzgodnejša tekma v njem, zato tekma, prestavljena več krogov
 * nazaj (prej), ne sme ostati v svojem krogu (b).
 */
export function dodeliKroge(tekme) {
  const { krogi: bloki, pozne } = krogiIzSifer(tekme.filter((t) => t.datum && t.domaci && t.gostje))
  const krogi = bloki.map((b, i) => ({ stevilka: i + 1, sklop: najpogostejsi(b.map((t) => sklopDneva(t.datum))), svoje: b, tekme: [], klubi: new Set() }))
  const dodaj = (k, t) => {
    k.tekme.push(t)
    k.klubi.add(t.domaci)
    k.klubi.add(t.gostje)
  }
  const prost = (k, t) => !k.klubi.has(t.domaci) && !k.klubi.has(t.gostje)
  const ostale = []
  for (const k of krogi) for (const t of k.svoje) {
    if (sklopDneva(t.datum) === k.sklop) dodaj(k, t)
    else ostale.push({ t, svoj: k })
  }
  for (const t of pozne) ostale.push({ t, svoj: null })
  ostale.sort((a, b) => (a.t.datum < b.t.datum ? -1 : a.t.datum > b.t.datum ? 1 : a.t.id - b.t.id))
  const opozorila = []
  // Krog, ki "teče" na dan tekme: zadnji krog s sklopom do tega dne.
  const trenutni = (sklop) =>
    krogi.filter((x) => x.sklop <= sklop).sort((a, b) => (a.sklop < b.sklop ? -1 : a.sklop > b.sklop ? 1 : a.stevilka - b.stevilka)).at(-1) ?? null
  for (const { t, svoj } of ostale) {
    const sklop = sklopDneva(t.datum)
    const zdaj = trenutni(sklop)
    // a) Krog na dan tekme, v katerem oba kluba nista zasedena (zamenjava tekem).
    let k = krogi.find((x) => x.sklop === sklop && prost(x, t))
    if (!k && svoj) {
      // b) Tekma, prestavljena prej, kot je na vrsti krog PRED njenim: v krog, ki
      //    na njen dan teče (klub ima tam lahko dve tekmi) — sicer bi imel njen
      //    krog rok pred krogi, ki so še pred njim.
      if (sklop < svoj.sklop && zdaj && zdaj.stevilka < svoj.stevilka - 1) k = zdaj
      // c) Sicer ostane v svojem krogu (kot prestavljena tekma pri MNZ).
      else if (prost(svoj, t)) k = svoj
      else k = zdaj ?? svoj
    }
    if (!k && !svoj) {
      // d) Pozneje vpisana tekma: zadnji krog do njenega dne, v katerem nobeden
      //    od klubov ne igra (prvotni krog izbrisane tekme), sicer krog, ki teče.
      k = krogi.filter((x) => x.sklop <= sklop && prost(x, t)).at(-1) ?? zdaj ?? krogi.find((x) => prost(x, t)) ?? krogi[0]
    }
    if (!prost(k, t)) opozorila.push(`${t.domaci} : ${t.gostje} (${t.datum}) — klub ima v ${k.stevilka}. krogu dve tekmi`)
    dodaj(k, t)
  }
  return {
    krogi: krogi.map(({ stevilka, sklop, tekme: ts }) => ({ stevilka, sklop, tekme: ts.sort((a, b) => a.id - b.id) })),
    opozorila,
  }
}

// --- stran tekme -------------------------------------------------------------------------

/** "C. Armour" → "Armour C."; "s. cameron" → "Cameron S."; brez začetnice ostane. */
export function imeIgralca(s) {
  let x = besedilo(s).replace(/\s*\((c|gk)\)\s*$/i, '').trim()
  // Ime samo z malimi ali samo z velikimi črkami ("s. cameron", "B. KLIMIONEK") zapišemo kot druga.
  if (x && (x === x.toLowerCase() || x === x.toUpperCase())) x = x.toLowerCase().replace(/(^|[\s'’.-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
  const m = x.match(/^((?:\p{L}{1,2}[.-]?)+\.)\s+(.+)$/u)
  return m ? `${m[2]} ${m[1]}` : x
}

/** Ključ priimka za ujemanje dogodka s postavo: le črke, male, brez diakritike. */
const kljucPriimka = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '')

/** Postava: "I. Priimek" → { priimek, zacetnica }. */
function razstaviPostava(s) {
  const x = besedilo(s).replace(/\s*\((c|gk)\)\s*$/i, '').trim()
  const m = x.match(/^((?:\p{L}{1,2}[.-]?)+\.)\s+(.+)$/u)
  return m ? { priimek: m[2], zacetnica: m[1][0].toLowerCase() } : { priimek: x.split(' ').at(-1), zacetnica: x[0]?.toLowerCase() ?? '' }
}

/**
 * Dogodek: "MCCONNELL Mark James" → [{ priimek: 'MCCONNELL', zacetnica: 'm' }, …]
 * — razčlenitve po verjetnosti. Priimek je pisan z velikimi črkami; kadar je
 * tako pisano vse ime ("LINTON JAMES", "KLIMIONEK BAYLEY"), je priimek prvi
 * del (vrstni red COMET), za rezervo še ostale delitve in zadnja beseda.
 */
export function razstaviDogodek(s) {
  const besede = besedilo(s).split(' ').filter(Boolean)
  if (!besede.length) return []
  const velike = []
  for (const b of besede) {
    if (/\p{L}/u.test(b) && b === b.toUpperCase()) velike.push(b)
    else break
  }
  const out = []
  const dodaj = (priimek, ime) => {
    if (priimek && !out.some((x) => x.priimek === priimek && x.zacetnica === (ime?.[0]?.toLowerCase() ?? ''))) out.push({ priimek, zacetnica: ime?.[0]?.toLowerCase() ?? '' })
  }
  if (velike.length && velike.length < besede.length) dodaj(velike.join(' '), besede[velike.length])
  for (let k = besede.length - 1; k >= 1; k--) dodaj(besede.slice(0, k).join(' '), besede[k])
  // "Ime Priimek" (brez velikih črk): zadnja beseda je priimek.
  dodaj(besede.at(-1), besede.length > 1 ? besede[0] : '')
  return out
}

/** Postavi obeh ekip: [{ postava: [...], rezerve: [...] }, …] (domači, gostje). */
export function postaviStrani(html) {
  const s = String(html ?? '')
  const out = []
  for (const stran of ['home', 'away']) {
    const i = s.indexOf(`<div class="component__team-lineup ${stran}">`)
    if (i < 0) {
      out.push({ postava: [], rezerve: [] })
      continue
    }
    const konec = stran === 'home' ? s.indexOf('<div class="component__team-lineup away">', i) : s.indexOf('report-panel-report', i)
    const del = s.slice(i, konec > i ? konec : undefined)
    const igralci = (kos, zacetnik) =>
      [...kos.matchAll(/<div class="lineup-player">\s*<span class="player-number">([\s\S]*?)<\/span>\s*<span class="player-name">([\s\S]*?)<\/span>/g)]
        .map(([, st, ime]) => ({ st: /^\d+$/.test(besedilo(st)) ? Number(besedilo(st)) : null, surovo: besedilo(ime), zacetnik }))
        .filter((x) => x.surovo)
    const [zac, klop] = del.split(/<span class="lineup-title">\s*Substitutes\s*<\/span>/)
    out.push({ postava: igralci(zac ?? '', true), rezerve: igralci(klop ?? '', false) })
  }
  return out.map((e) =>
    ({
      postava: e.postava.map((x, n) => ({ ...x, ime: imeIgralca(x.surovo), kapetan: /\(c\)\s*$/i.test(x.surovo), vratar: n === 0, ...razstaviPostava(x.surovo) })),
      rezerve: e.rezerve.map((x) => ({ ...x, ime: imeIgralca(x.surovo), kapetan: /\(c\)\s*$/i.test(x.surovo), vratar: false, ...razstaviPostava(x.surovo) })),
    }))
}

/** Dogodki: [{ ekipaIdx, vrsta, minuta, igralci: ['PRIIMEK Ime', …] }]. */
export function dogodkiStrani(html) {
  const s = String(html ?? '')
  const i = s.indexOf('component__mc-match-report')
  if (i < 0) return []
  const out = []
  for (const [, stran, telo, cas] of s.slice(i).matchAll(/<div class="event (home|away)">([\s\S]*?)<div class="event--time">([\s\S]*?)<\/div>/g)) {
    out.push({
      ekipaIdx: stran === 'home' ? 0 : 1,
      vrsta: telo.match(/class="event--details ?([a-z-]*)"/)?.[1] || 'neznano',
      minuta: minuta(besedilo(cas)),
      igralci: [...telo.matchAll(/<span class="event--player small">([\s\S]*?)<\/span>/g)].map((x) => besedilo(x[1])),
    })
  }
  return out
}

/** Glava: { domaci, gostje, izid }. */
export function glavaStrani(html) {
  const s = String(html ?? '')
  const imeni = [...s.matchAll(/<div class="team-name (?:home|away)-team">([\s\S]*?)<\/div>/g)].map((x) => imeKluba(x[1]))
  return { domaci: imeni[0] ?? null, gostje: imeni[1] ?? null, izid: izidIz(besedilo(s.match(/<span class="score">([\s\S]*?)<\/span>/)?.[1])) }
}

const VRSTE = new Set(['goal', 'penalty', 'own-goal', 'penalty-failed', 'yellow', 'second-yellow', 'red', 'expulsion', 'substitution'])

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma ali nima izida.
 * `tekma` je vrstica s strani lige (datum, ura, imeni klubov, izid) — stran
 * tekme datuma nima.
 */
export function vZapisnik(html, { tekma = null, danes = Date.now() } = {}) {
  if (!jeStranTekme(html)) return null
  const g = glavaStrani(html)
  const rezultat = g.izid ?? tekma?.izid ?? null
  if (!rezultat) return null
  const imeni = [tekma?.domaci ?? g.domaci, tekma?.gostje ?? g.gostje]
  const ekipe = postaviStrani(html)
  const opozorila = []
  const znana = ekipe.map((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
  ekipe.forEach((e, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'}`)
  })
  const vsi = ekipe.map((e) => [...e.postava, ...e.rezerve])

  /** Igralec iz dogodka v ekipi idx (po priimku, nato začetnici). */
  const najdi = (idx, ime) => {
    const razlicice = razstaviDogodek(ime)
    // Najprej natančen priimek po vseh razčlenitvah, šele nato delni.
    for (const natancno of [true, false]) {
      for (const d of razlicice) {
        const k = kljucPriimka(d.priimek)
        if (!k) continue
        let xs = vsi[idx].filter((i) => {
          const p = kljucPriimka(i.priimek)
          return natancno ? p === k : p && p.length >= 4 && k.length >= 4 && (p.endsWith(k) || k.endsWith(p))
        })
        if (!xs.length) continue
        if (xs.length > 1) {
          const z = xs.filter((i) => i.zacetnica === d.zacetnica)
          if (z.length) xs = z
          if (xs.length > 1) opozorila.push(`${imeni[idx]}: "${ime}" ustreza ${xs.length} igralcem — dogodek prvemu`)
        } else if (!natancno && xs[0].zacetnica !== d.zacetnica) continue
        return xs[0]
      }
    }
    return null
  }
  const kdo = (idx, i, m) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: null, minuta: m })

  const preklopi = new Map()
  const dodajPreklop = (i, m) => preklopi.set(i, [...(preklopi.get(i) ?? []), m])
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const zgresene = []
  for (const d of dogodkiStrani(html)) {
    if (!VRSTE.has(d.vrsta)) {
      opozorila.push(`neznan dogodek "${d.vrsta}" (${d.igralci.join(', ')}, ${d.minuta}.)`)
      continue
    }
    if (d.vrsta === 'substitution') {
      const [noterIme, venIme] = d.igralci
      const noter = noterIme ? najdi(d.ekipaIdx, noterIme) : null
      const ven = venIme ? najdi(d.ekipaIdx, venIme) : null
      if (!noter || !ven) opozorila.push(`${imeni[d.ekipaIdx]}: menjava ${noterIme ?? '?'} za ${venIme ?? '?'} (${d.minuta}.) — igralca ni v postavi`)
      if (d.minuta == null) {
        opozorila.push(`${imeni[d.ekipaIdx]}: menjava ${noterIme ?? '?'} za ${venIme ?? '?'} brez minute`)
        continue
      }
      if (noter) dodajPreklop(noter, d.minuta)
      if (ven) dodajPreklop(ven, d.minuta)
      menjave.push({ ekipaIdx: d.ekipaIdx, minuta: d.minuta, noter: { st: noter?.st ?? null, ime: noter?.ime ?? null }, ven: { st: ven?.st ?? null, ime: ven?.ime ?? null } })
      continue
    }
    const ime = d.igralci[0] ?? ''
    // Karton osebja (trener, vodja ekipe) je brez imena igralca — ne šteje.
    if (!ime) {
      if (!['yellow', 'red', 'second-yellow', 'expulsion'].includes(d.vrsta)) opozorila.push(`${imeni[d.ekipaIdx]}: ${d.vrsta} v ${d.minuta}. minuti brez igralca`)
      continue
    }
    const i = najdi(d.ekipaIdx, ime)
    if (d.vrsta === 'goal' || d.vrsta === 'penalty' || d.vrsta === 'own-goal') {
      const avtogol = d.vrsta === 'own-goal'
      if (!i) {
        opozorila.push(`gol v ${d.minuta}. minuti (${ime}, ${imeni[d.ekipaIdx]}): strelca ni v postavi`)
        // Gol šteje (izid), strelec ostane neznan.
        goli.push({ ekipaIdx: d.ekipaIdx, st: null, ime: null, regSt: null, minuta: d.minuta, avtogol, enajstmetrovka: d.vrsta === 'penalty' })
        continue
      }
      goli.push({ ...kdo(d.ekipaIdx, i, d.minuta), avtogol, enajstmetrovka: d.vrsta === 'penalty' })
      continue
    }
    if (d.vrsta === 'penalty-failed') {
      // Zgrešena 11-metrovka: zapišemo, točk ne prinese ne odvzame (kot pri drugih virih COMET).
      if (i) zgresene.push({ ...kdo(d.ekipaIdx, i, d.minuta), enajstmetrovka: true })
      continue
    }
    if (!i) {
      // Karton z imenom, ki ga v postavi ni: najverjetneje osebje.
      opozorila.push(`${imeni[d.ekipaIdx]}: karton (${d.vrsta}) v ${d.minuta}. minuti — "${ime}" ni v postavi`)
      continue
    }
    if (d.vrsta === 'yellow') rumeni.push(kdo(d.ekipaIdx, i, d.minuta))
    else if (!rdeci.some((r) => r.ekipaIdx === d.ekipaIdx && r.ime === i.ime && r.st === i.st)) rdeci.push(kdo(d.ekipaIdx, i, d.minuta))
  }

  const sestava = ekipe.map((e, idx) => {
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
    // Identiteta je ime + klub: dva "Smith J." v isti ekipi loči le dres, dogodki gredo prvemu.
    const imena = [...e.postava, ...e.rezerve].map((i) => i.ime)
    for (const ime of new Set(imena.filter((x, k) => imena.indexOf(x) !== k))) opozorila.push(`${imeni[idx]}: dva igralca z imenom "${ime}" — dogodke loči le dres`)
    const vObliko = (i) => ({
      st: i.st,
      ime: i.ime,
      regSt: null,
      zacetnik: i.zacetnik,
      kapetan: i.kapetan,
      vratar: i.vratar,
      pozicija: i.vratar ? 'GK' : null,
      preklopi: [...(preklopi.get(i) ?? [])].sort((a, b) => a - b),
    })
    return { ime: imeni[idx], postava: e.postava.map(vObliko), rezerve: e.rezerve.map(vObliko) }
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  let dopolnjuje = false
  if (znana[0] && znana[1] && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)) {
    const neujemanje = `goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`
    const starost = tekma?.datum ? (danes - Date.parse(`${tekma.datum}T00:00:00Z`)) / DAN : 0
    dopolnjuje = !(starost > DNI_DOPOLNJEVANJA)
    opozorila.push(dopolnjuje ? `${NEPOPOLN}: ${neujemanje} — zapisnik se še dopolnjuje` : neujemanje)
  }
  if (tekma?.izid && g.izid && (tekma.izid.domaci !== g.izid.domaci || tekma.izid.gostje !== g.izid.gostje))
    opozorila.push(`izid tekme ${g.izid.domaci}:${g.izid.gostje} ni izid seznama ${tekma.izid.domaci}:${tekma.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const prazen = !ekipe[0].postava.length && !ekipe[1].postava.length
  return {
    zapisnikId: tekma ? sifraZapisnika(tekma.id) : null,
    url: null,
    sezona: null,
    krog: null,
    datum: tekma?.datumLj ?? tekma?.datum ?? null,
    ura: tekma?.ura ?? null,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    nepopoln: !znana[0] || !znana[1] || dopolnjuje,
    prazen,
    // Kontumacija: 3:0 ali 0:3 brez obeh postav in brez dogodkov.
    kontumacija: prazen && !goli.length && ((rezultat.domaci === 3 && rezultat.gostje === 0) || (rezultat.domaci === 0 && rezultat.gostje === 3)),
    opozorila,
  }
}

/**
 * V predpomnilnik gre le cela stran: stran lige z Match Centrom; stran tekme
 * z obema postavama (vsaj 7 začetnikov) in z goli, ki se ujemajo z izidom.
 * Vzdrževalna stran, izziv in zapisnik, ki se še dopolnjuje, se berejo znova.
 */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  const s = String(besedilo ?? '')
  if (jeIzziv(s)) return false
  if (/^seznam-/.test(datoteka)) return jeStranLige(s)
  if (/^tekma-/.test(datoteka)) {
    const z = vZapisnik(s, { danes: 0 })
    return !!z && !z.nepopoln
  }
  return jeStranLige(s) || jeStranTekme(s)
}

// --- branje ------------------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/** Stran lige (vedno sveža) in tekme skupine; prazna skupina ali tuja stran ustavi uvoz. */
async function preberiLigo(koda, prenesi) {
  const { comet, sezonaPot } = razbijKodo(koda)
  const url = naslovLige(koda)
  const html = await beri(prenesi, url, imeLige(koda), true)
  if (!jeStranLige(html)) throw new Error(`lowland: ${url} ni stran Match Centra (${html.length} B) — uvoz ustavljen`)
  const sezonaStrani = html.match(/<main[^>]*data-season="(\d{4}-\d{4})"/)?.[1]
  if (sezonaStrani && sezonaStrani !== sezonaPot) throw new Error(`lowland: ${url} kaže sezono ${sezonaStrani}, ne ${sezonaPot} — uvoz ustavljen`)
  const vse = tekmeLige(html, comet)
  // Vsaka tekma nosi oznako tekmovanja ("Lowland League East 2026-27"). Tekma
  // z drugo oznako (pokal, druga sezona) v ligo ne sodi.
  const oznaka = najpogostejsi(vse.map((t) => t.oznaka))
  const tuje = vse.filter((t) => t.oznaka !== oznaka)
  if (tuje.length) console.warn(`lowland: ${koda} — izpuščene tekme z drugo oznako: ${tuje.map((t) => `${t.id} (${t.oznaka})`).join(', ')}`)
  const tekme = vse.filter((t) => t.oznaka === oznaka)
  if (oznaka && !oznaka.endsWith(`${sezonaPot.slice(0, 4)}-${sezonaPot.slice(7)}`))
    throw new Error(`lowland: ${url} — oznaka tekem "${oznaka}" ni sezone ${sezonaPot} — uvoz ustavljen`)
  if (!tekme.length) throw new Error(`lowland: na ${url} ni skupine comp-${comet} (${Object.entries(skupineLige(html)).map(([k, v]) => `${k} ${v}`).join(', ')}) — uvoz ustavljen`)
  return { tekme, ime: skupineLige(html)[comet] ?? null }
}

/** Razpored (kroge) iz tekem skupine. Kontumacije označi `vir.kontumacije`. */
export function razporedIzTekem(tekme, { danes = Date.now() } = {}) {
  const { krogi, opozorila } = dodeliKroge(tekme)
  for (const o of opozorila) console.warn(`lowland: ${o}`)
  return krogi.map((k) => ({
    stevilka: k.stevilka,
    tekme: k.tekme.map((t) => ({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datumLj,
      ura: t.ura,
      // Tekma z izidom je odigrana; minula brez izida (preložena) ni.
      odigrana: !!t.izid,
      kontumacija: false,
      sifra: t.id,
      izid: t.izid,
      starost: starostDni(t.datum, danes),
    })),
  }))
}

const vir = {
  ime: 'lowland',
  polnoIme: 'Scottish Lowland Football League (slfl.co.uk)',
  drzava: 'GB',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: lowlandFetch,

  naslovRazporeda: naslovLige,
  naslovZapisnika: naslovTekme,
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new LowlandZavrnitev(`lowland: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  /** Razpored: krogi iz šifer COMET (glej `dodeliKroge`). */
  async razporedVseStrani(koda, prenesi) {
    const { tekme } = await preberiLigo(koda, prenesi)
    return razporedIzTekem(tekme)
  },

  /**
   * Zapisniki odigranih tekem. Stran tekme prvih 3 dni beremo svežo (popravki),
   * pozneje iz predpomnilnika — vanj gre le cela stran (`zaPredpomnilnik`).
   * Izid 3:0 / 0:3 brez postav, starejši od tedna dni, je kontumacija (brez zapisnika).
   */
  async zapisniki(koda, prenesi, danes = Date.now()) {
    const { sezona } = razbijKodo(koda)
    const { tekme } = await preberiLigo(koda, prenesi)
    const { krogi } = dodeliKroge(tekme)
    const krogTekme = new Map()
    for (const k of krogi) for (const t of k.tekme) krogTekme.set(t.id, k.stevilka)
    const out = []
    for (const t of tekme) {
      if (!t.izid || !krogTekme.has(t.id)) continue
      const url = naslovTekme(koda, t.id)
      let html
      try {
        html = await beri(prenesi, url, imeTekme(koda, t.id), starostDni(t.datum, danes) <= 3)
      } catch (e) {
        if (e.zavrnitev) throw e
        if (e.status === 404) {
          console.warn(`lowland: ${url} → 404 — tekma preskočena`)
          continue
        }
        throw e
      }
      if (!jeStranTekme(html)) throw new Error(`lowland: ${url} ni stran tekme (${html.length} B) — uvoz ustavljen`)
      const z = vZapisnik(html, { tekma: t, danes })
      if (!z) continue
      if (z.kontumacija && starostDni(t.datum, danes) > 7) continue
      z.sezona = sezona
      z.krog = krogTekme.get(t.id)
      z.url = url
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: izid 3:0 ali 0:3, starejši od tedna dni, katerega stran tekme
   * nima postav ne dogodkov. Bere le take tekme (v isti predpomnilnik).
   */
  async kontumacije(koda, prenesiKrog, krogi, danesIso) {
    const danes = Date.parse(`${danesIso}T12:00:00Z`)
    const out = []
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.sifra || starostDni(t.datum, danes) <= 7) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovTekme(koda, t.sifra), imeTekme(koda, t.sifra), t.datum)
        if (jeIzziv(html)) throw new LowlandZavrnitev(`lowland: ${naslovTekme(koda, t.sifra)} vrne izziv (CAPTCHA)`)
        if (vZapisnik(html, { tekma: { ...t, id: t.sifra, datum: t.datum } })?.kontumacija) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaSc,
  kratkoIme: kratkoImeSc,
  poenostavi: kljucKlubaSc,
}

export default vir
