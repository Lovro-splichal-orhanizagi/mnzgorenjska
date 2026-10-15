// Vir: Львівська асоціація футболу (ЛАФ) — ffl.org.ua, Ukrajina (Lvivska
// oblast). Glej CLAUDE.md (Ukrajina — vir ffl).
//
// ЛАФ vodi oblastno prvenstvo odraslih: Прем'єр-ліга, Перша, Друга, Третя
// (skupine) in Четверта ліга (skupine). Sezona je jesen–pomlad ("Сезон-2026/2027"
// → "2026/27"), ne koledarska.
//
// ŠIFRA LIGE je id tekmovanja `/cup/<id>` (837 = Прем'єр-ліга 2026/27, 838 =
// Перша, 839 = Друга, 840–842 = Третя, 844–845 = Четверта). Vsaka sezona ima
// svojega; ob novi sezoni se popravi šifra.
//
// RAZPORED je stran tekmovanja: drsnik krogov ("Тур N", `data-slide_id`) s
// tekmami: datum in ura ("11.10.2026 13:00", kijevski čas → ljubljanski −1 h;
// "00:00" = ura ni znana), klub s šifro (`/team/<id>`), izid "3 - 1" ali "-"
// (neodigrana). Stran kaže LE kroge, ki so se že začeli — prihodnjih krogov
// (in njihovih rokov) vir ne objavi vnaprej. Stran tekme NE obstaja: tekma
// nima šifre, zato je šifra zapisnika `ffl<liga>-<krog>-<domači>-<gostje>`
// (šifre klubov).
//
// ZAPISNIKOV ni, postave so v NOVICAH (`/news/<id>`, naslavljanje brez sluga).
// Članek lige na dan ali konec tedna ("Прем'єр-ліга Львівщини-2026/2027: матчі
// 11-го жовтня") ima povezavo na tekmovanje (`/cup/<id>`, pri Третій in
// Четвертій eno na skupino), "ТУР N", dan ("Неділя, 11-те жовтня.") in blok
// na tekmo:
//
//   ФК «Олесько» – ФК «Новий Розділ» 1:3
//   Голи: Підзирайло (25) – Майовецький (7); Музика (45+1; 64).
//   «Олесько»: Савич Назар, …, Абрамчук Тарас (Стегніцький Павло, 68), …
//   Головний тренер: …            (osebja ne beremo)
//   «Новий Розділ»: …
//   Вилучення: Старицький (74, зрив очевидної гольової можливості).
//
// Postava: enajst "Priimek Ime", menjava v oklepaju ("(Ime, 68)", veriga
// "(Грушевський Іван, 46; Наконечний Ігор, 71)"). Klopi (neuporabljenih
// rezerv) vir ne našteje. Goli so po straneh (domači – gostje, ločeni s " – "),
// strelec s priimkom (soimenjak z začetnico "Грабовський М."), minute v
// oklepaju ločene s podpičjem, "з пен." 11 m, "автогол" pri ekipi, ki ji gol
// šteje. RUMENIH KARTONOV vir ne objavi; rdeči ("Вилучення") so.
// Vratar ni označen: prvi začetnik je vratar (namig, kot mlsz).
//
// robots.txt: "User-agent: * / Crawl-delay: 10" — 10 s med zahtevki (več kot
// pri vseh drugih virih). Beremo odkrito (User-Agent SLFF). Ob 401, 403, 429
// ali izzivu se uvoz ustavi (`FflZavrnitev`, izhod 4) — ne obhajaj.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { vLjubljanskiCas } from './frf.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'
import { razpakirajVse, besedilo, minuta, podobnostKluba } from './aft.mjs'

const OSNOVNI = 'https://ffl.org.ua'
const DOLZINA_TEKME = 90
/** robots.txt: Crawl-delay: 10. */
export const PREMOR_MS = 10000
const UA = 'SLFF fantasy (https://slff.eu)'
const MAPA = 'scripts/.predpomnilnik/ffl'
const DAN = 86400000
/** Članek zadnjega tedna se še popravlja: vedno svež. */
const SVEZE_DNI = 7
/** Do te starosti se članek z nepopolnim blokom prebere znova svež. */
const PONOVNO_DNI = 45
/** Seznam novic: sveže strani, dokler ne pridemo do znanih, starejših od toliko dni. */
const SEZNAM_DNI = 14
/** Članek o tekmi pride najkasneje toliko dni po tekmi. */
const PO_TEKMI_DNI = 30

// --- šifre in naslovi -----------------------------------------------------------------

/** "837" → 837 (id tekmovanja). */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)$/)
  if (!m) throw new Error(`ffl: šifra lige je id tekmovanja (npr. 837), ne "${koda}"`)
  return Number(m[1])
}
export const naslovLige = (koda) => `${OSNOVNI}/cup/${razberiKodo(koda)}`
export const naslovNovic = (stran) => `${OSNOVNI}/news?page=${stran}`
export const naslovClanka = (id) => `${OSNOVNI}/news/${id}`
/** Šifra zapisnika: tekma nima svoje, zato liga, krog in šifri klubov. */
export const sifraZapisnika = (liga, krog, domaciId, gostjeId) => `ffl${razberiKodo(liga)}-${krog}-${domaciId}-${gostjeId}`
const imeLige = (koda) => `liga-${razberiKodo(koda)}.html`
const imeNovic = (stran) => `novice-${stran}.html`
const imeClanka = (id) => `clanek-${id}.html`

// --- pomožno --------------------------------------------------------------------------

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
const male = (s) => String(s ?? '').toLocaleLowerCase('uk').replace(/[’ʼ`]/g, "'")

/** Izziv (Cloudflare, CAPTCHA). */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? ''))
const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class FflZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FflZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

/**
 * Prenos za `prenesiSPonovitvami`: 401, 403 in 429 vržejo `FflZavrnitev` takoj
 * (429 se sicer ponavlja kot prehodna napaka — tu se ustavimo, ne silimo).
 */
export async function fflFetch(url, moznosti = {}, fetchFn = fetch) {
  const odgovor = await fetchFn(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel?.().catch(() => {})
    throw new FflZavrnitev(`ffl: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

/**
 * Ali sme stran v predpomnilnik: le prava stran tekmovanja, seznama novic ali
 * članka. Stran napake ali vzdrževanja s statusom 200 bi sicer obveljala za vselej.
 */
export function zaPredpomnilnik(html, datoteka = '') {
  const s = String(html ?? '')
  if (jeIzziv(s)) return false
  const ime = String(datoteka)
  if (ime.startsWith('liga-')) return s.includes('tournament-title-text') && s.includes('data-slide_id')
  if (ime.startsWith('novice-')) return s.includes('news-maine-container')
  if (ime.startsWith('clanek-')) return s.includes('text_block-news')
  return true
}

/** "11.10.2026" → "2026-10-11". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

const MESECI = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
/**
 * "Неділя, 11-те жовтня." ob objavi 2026-10-11 → "2026-10-11" (december ob
 * januarski objavi je lanski). Le vrstica, ki je SAMO dan.
 */
export function datumDneva(s, objava) {
  const m = String(s ?? '').match(/^(?:[А-ЯІЇЄҐа-яіїєґ']+,\s*)?(\d{1,2})(?:-?[а-яіїєґ']{1,3})?\s+([а-яіїєґ]+)\.?$/i)
  const mesec = m ? MESECI.indexOf(m[2].toLowerCase()) + 1 : 0
  if (!m || !mesec || !objava) return null
  let leto = Number(objava.slice(0, 4))
  if (mesec > Number(objava.slice(5, 7)) + 1) leto--
  return `${leto}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** "Сезон-2026/2027" → "2026/27". */
export function sezonaIz(naslov) {
  const m = String(naslov ?? '').match(/(20\d{2})\s*\/\s*(20\d{2})/)
  if (!m || Number(m[2]) !== Number(m[1]) + 1) return null
  return `${m[1]}/${m[2].slice(2)}`
}

const dniMed = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAN)
const premakni = (datum, dni) => new Date(Date.parse(`${datum}T00:00:00Z`) + dni * DAN).toISOString().slice(0, 10)
const starostDni = (datum, zdaj = Date.now()) => (datum ? (zdaj - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

// --- klubi --------------------------------------------------------------------------------

/** Ključ kluba: male črke z ukrajinskimi znaki, apostrof odpade. */
export const kljucKlubaFfl = (ime) =>
  razpakirajVse(ime)
    .toLocaleLowerCase('uk')
    .replace(/['’ʼ`]/g, '')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Pravne oblike pred imenom odpadejo; akademija (АФ) in šola (ДЮСШ) ostaneta,
// ker sta drug klub kot istoimenski profesionalni (ФК «Скала 1911» v PFL).
const OBLIKE = /^(?:ФК|СК|ФСК|СФК|СКК|ЛСК|ФКМ|ГО|ФК\s*ГО)\s+/u
/**
 * Ime kluba z razporeda ali iz članka: 'ФК "Олесько"' → 'Олесько',
 * '"Сокіл" (Золочів)' → 'Сокіл (Золочів)', 'АФ «Скала 1911» (Стрий)' →
 * 'АФ Скала 1911 (Стрий)'. Kraj ostane: "Сокіл" je v ligi dvakrat.
 */
export function imeKluba(polno) {
  return razpakirajVse(polno)
    .replace(/[«»"“”„]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(OBLIKE, '')
    .trim()
}
export const kratkoImeFfl = (polno) => imeKluba(polno)

// --- razpored ------------------------------------------------------------------------------

/**
 * Stran tekmovanja: { naslov, sezona, tekme: [{ krog, datum, ura, domaci,
 * domaciId, gostje, gostjeId, izid }] }. Datum in ura sta ljubljanska.
 */
export function tekmeLige(html) {
  const s = cisto(html)
  const naslov = besedilo(s.match(/tournament-title-text"?>\s*<h1>([\s\S]*?)<\/h1>/)?.[1])
  const sezona = sezonaIz(naslov)
  const tekme = []
  for (const del of s.split(/<div class="slide[^"]*" data-slide_id=\d+>/).slice(1)) {
    const krog = Number(besedilo(del.match(/tournamet-title">([\s\S]*?)<\/div>/)?.[1]).match(/Тур\s*(\d+)/i)?.[1])
    if (!krog) continue
    for (const k of del.split(/time-container">/).slice(1)) {
      const cas = besedilo(k.slice(0, k.indexOf('</div>')))
      const klubi = [...k.matchAll(/<div class=name>\s*<a[^>]*href="\/team\/(\d+)">([\s\S]*?)<\/a>/g)].map((x) => ({ id: Number(x[1]), ime: imeKluba(besedilo(x[2])) }))
      const st = besedilo(k.match(/divider text-center">([\s\S]*?)<\/div>/)?.[1])
      if (klubi.length < 2) continue
      const datum = datumIz(cas)
      const u = cas.match(/(\d{1,2}):(\d{2})/)
      const izid = st.match(/^(\d+)\s*[-:]\s*(\d+)$/)
      tekme.push({
        krog,
        ...(u && `${u[1]}:${u[2]}` !== '00:00' ? vLjubljanskiCas(datum, `${u[1].padStart(2, '0')}:${u[2]}`) : { datum, ura: null }),
        domaci: klubi[0].ime,
        domaciId: klubi[0].id,
        gostje: klubi[1].ime,
        gostjeId: klubi[1].id,
        izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
        oznaka: izid ? null : st || null,
      })
    }
  }
  // Prestavljena tekma, ki stoji v krogu dvakrat: neodigrana vrstica odpade.
  const odigrani = new Set(tekme.filter((t) => t.izid).map((t) => `${t.krog}|${t.domaciId}|${t.gostjeId}`))
  return { naslov, sezona, tekme: tekme.filter((t) => t.izid || !odigrani.has(`${t.krog}|${t.domaciId}|${t.gostjeId}`)) }
}

const idTekme = (koda, t) => sifraZapisnika(koda, t.krog, t.domaciId, t.gostjeId)

const jeTriNic = (i) => (i?.domaci === 3 && i?.gostje === 0) || (i?.domaci === 0 && i?.gostje === 3)
/**
 * Tekma brez borbe: izid 3:0 ali 0:3 brez ure ("00:00"). Odigrana tekma ima
 * uro vedno; Муроване/Ямпіль : Воля (Перша, 13. 9. 2026) ima 3:0 ob 00:00,
 * članek pa "Матч … не відбувся".
 */
export const jeKontumacija = (t) => !!t.izid && jeTriNic(t.izid) && !t.ura

/** Razpored v obliko uvoza razporeda. */
export function razporedIzTekem(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: jeKontumacija(t),
      odigrana: !!t.izid,
      izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- seznam novic -------------------------------------------------------------------------

/** Stran seznama novic: [{ id, url, datum, naslov }]. */
export function noviceStrani(html) {
  const out = []
  for (const m of cisto(html).matchAll(/news-date>([\s\S]*?)<\/div>\s*<div class=news-maine-title>\s*<a href="\/news\/(\d+)">([\s\S]*?)<\/a>/g)) {
    const id = Number(m[2])
    out.push({ id, url: naslovClanka(id), datum: datumIz(besedilo(m[1])), naslov: besedilo(m[3]) })
  }
  return out
}

// Nominativ lige v naslovu tekmovanja in članka ("Прем'єр-ліга Львівщини-…",
// "Третя ліга Львівської області: Група 1"). Pregled (`Огляди матчів 11-го
// туру Прем'єр-ліги`) je v rodilniku in je pripoved brez postav.
const LIGE = [
  ['прем', /прем'?\s*єр-?\s*ліга/],
  ['перша', /перша\s+ліга/],
  ['друга', /друга\s+ліга/],
  ['третя', /третя\s+ліга/],
  ['четверта', /четверта\s+ліга/],
]
/** Raven lige iz naslova tekmovanja ali novice: 'прем', 'перша' … ali null. */
export function ravenIz(naslov) {
  const n = male(naslov)
  return LIGE.find(([, re]) => re.test(n))?.[0] ?? null
}
/** Novica s postavami lige: "<Ліга> Львівщини-<sezona>: …" (ne pregled, ne mladinci). */
export const jeClanekLige = (naslov, raven) =>
  ravenIz(naslov) === raven && /львівщини/i.test(naslov) && !/юніор|ДЮФЛ|U-?\d{2}|жін/i.test(naslov)

// --- članek --------------------------------------------------------------------------------

/** Vrstice besedila članka (odstavki in <br>), s povezavami na tekmovanja. */
export function vrsticeClanka(html) {
  const s = cisto(html)
  const i = s.indexOf('text_block-news')
  if (i < 0) return []
  let telo = s.slice(s.indexOf('>', i) + 1)
  const konec = telo.search(/<div class="col-md-4|Інші новини|<footer/)
  if (konec > 0) telo = telo.slice(0, konec)
  // Povezava na tekmovanje postane svoja vrstica "@cup 838".
  telo = telo.replace(/<a[^>]*href="(?:https?:\/\/(?:www\.)?ffl\.org\.ua)?\/cup\/(\d+)"[^>]*>/g, '</p>@cup $1 ')
  return telo
    .split(/<\/p>|<br\s*\/?>|<\/h\d>|<\/li>|<\/div>|<\/blockquote>/i)
    .map((v) => besedilo(v).replace(/\s*[–—]\s*/g, ' – ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** Datum objave članka ("11.10.2026 19:15" → "2026-10-11"). */
export const datumClanka = (html) => datumIz(String(html ?? '').match(/span-date>([^<]*)</)?.[1])

// Glava bloka: «Дом» (kraj) – «Gost» (kraj) 1:0. Pomišljaj s presledki loči
// ekipi; kraj sam ima pomišljaj brez presledkov (Кам'янка-Бузька).
const GLAVA = /^(.+?) – (.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*\(([^)]*)\))?\.?$/
const jeKlubBesedilo = (s) => /[«»"]/.test(s)

/** Razdeli na ločilih zunaj oklepajev. */
function razdeli(s, locila = ',') {
  const out = []
  let glob = 0
  let cur = ''
  for (const c of String(s ?? '')) {
    if (c === '(') glob++
    if (c === ')') glob = Math.max(0, glob - 1)
    if (locila.includes(c) && glob === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

/** Ime igralca: "Priimek Ime", apostrof poenoten, brez ločil na robovih in "-к". */
export function imeIgralca(s) {
  return String(s ?? '')
    .replace(/[’ʼ`]/g, "'")
    .replace(/\s*-\s*к(?!\p{L})\.?/u, '')
    .replace(/^[^\p{L}]+|[^\p{L}.']+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Postava enega kluba: "Савич Назар, …, Абрамчук Тарас (Стегніцький Павло, 68), …"
 * → { zacetniki: [{ ime, veriga: [{ ime, minuta }] }], opozorila }.
 */
export function razcleniPostavo(niz) {
  const opozorila = []
  const zacetniki = []
  for (const kos of razdeli(String(niz ?? '').replace(/\.$/, ''), ',')) {
    const ime = imeIgralca(kos.replace(/\(.*$/s, ''))
    const oklep = kos.match(/\(([^)]*)\)/)?.[1] ?? ''
    const veriga = []
    // "(Грушевський Іван, 46; Наконечний Ігор, 71)": vsak člen je "ime, minuta".
    for (const clen of oklep.split(';').map((x) => x.trim()).filter(Boolean)) {
      const m = clen.match(/^(.+?)[,\s]+(\d+(?:\s*\+\s*\d+)?)\s*'?$/)
      if (m) veriga.push({ ime: imeIgralca(m[1]), minuta: minuta(m[2]) })
      else {
        veriga.push({ ime: imeIgralca(clen), minuta: null })
        opozorila.push(`menjava brez minute: ${clen}`)
      }
    }
    if (!ime) {
      if (veriga.length && zacetniki.length && !zacetniki.at(-1).veriga.length) {
        zacetniki.at(-1).veriga = veriga
        opozorila.push(`odvečna vejica pred menjavo ${veriga[0].ime}`)
      }
      continue
    }
    zacetniki.push({ ime, veriga })
  }
  return { zacetniki, opozorila }
}

/**
 * Goli ene strani: "Маланяк (10; 44); Хмелинський (33)" →
 * [{ ime, minuta, avtogol, enajstmetrovka }].
 */
export function razcleniGole(niz) {
  const out = []
  for (const kos of razdeli(String(niz ?? '').replace(/\.$/, ''), ';,')) {
    const ime = imeIgralca(kos.replace(/\(.*$/s, ''))
    if (!ime || /^(немає|нема)$/i.test(ime)) continue
    const oklep = kos.match(/\(([^)]*)\)/)?.[1] ?? ''
    const deli = oklep.split(/[;,]/).map((x) => x.trim()).filter(Boolean)
    const oznake = deli.filter((d) => !/^\d/.test(d)).join(' ')
    const minute = deli.filter((d) => /^\d/.test(d))
    if (!minute.length) minute.push(null)
    for (const d of minute) {
      const o = `${d ?? ''} ${oznake}`
      out.push({ ime, minuta: d == null ? null : minuta(d), avtogol: /авто|у\s*свої|а\/г/i.test(o), enajstmetrovka: /пен|11\s*м/i.test(o) })
    }
  }
  return out
}

// Uradna oseba v vrstici kartonov ("Ярош Володимир (адміністратор «Сокола», 90+5)",
// "Пуровець Володимир, керівник СФК «Трускавець» (…)") ne šteje.
const jeUradnaOseba = (s) => /адміністратор|керівник|тренер|президент|начальник|лікар|масажист|представник|офіційн|селекціонер/i.test(s)

/**
 * Izključitve ali zgrešene 11 m ene strani: "Лапшій (90, зrив …); Кравець (82)" →
 * [{ ime, minuta, oznake }]. Vnosi so ločeni s podpičjem (vejica je v opisu).
 */
export function razcleniDogodke(niz) {
  const out = []
  for (const kos of razdeli(String(niz ?? '').replace(/\.$/, ''), ';')) {
    if (jeUradnaOseba(kos)) continue
    const ime = imeIgralca(kos.replace(/\(.*$/s, ''))
    if (!ime) continue
    const oklep = kos.match(/\(([^)]*)\)/)?.[1] ?? ''
    const m = oklep.match(/^\s*(\d+(?:\s*\+\s*\d+)?)/)
    out.push({ ime, minuta: m ? minuta(m[1]) : null, oznake: oklep })
  }
  return out
}

/** Vrstica dogodkov po straneh (" – "): [{ …, stran: 0 | 1 | null }]. */
function poStraneh(niz) {
  const strani = String(niz ?? '').split(/\s+–\s+/)
  if (strani.length < 2) return razcleniDogodke(niz).map((d) => ({ ...d, stran: null }))
  return [0, 1].flatMap((i) => razcleniDogodke(i === 0 ? strani[0] : strani.slice(1).join(' – ')).map((d) => ({ ...d, stran: i })))
}

/** Naslov vrstice dogodkov → vrsta. */
function vrstaVrstice(oznaka) {
  const o = male(oznaka).trim()
  if (/^(голи?|м'?ячі)$/.test(o)) return 'goli'
  if (/^(попередження|попереджені|жовті)/.test(o)) return 'rumeni'
  if (/^(вилучення|вилучений|вилучені|червон)/.test(o)) return 'rdeci'
  if (/^нереалізован\S*\s+пенальті/.test(o)) return 'zgresene'
  return null
}
const jeOsebje = (oznaka) => /тренер|арбітр|спостерігач|делегат|інспектор|начальник|лікар|адміністратор|представник|президент/i.test(oznaka)

/**
 * Bloki tekem v članku: [{ liga, krog, datum, glava: { domaci, gostje, izid,
 * oznaka }, postavi: [{ oznaka, postava }], goli: [domači, gostje], rumeni,
 * rdeci }]. `liga` je zadnja povezava na tekmovanje nad blokom, `krog` zadnji
 * "ТУР N", `datum` zadnji dan.
 */
export function blokiClanka(html, objava = datumClanka(html)) {
  const bloki = []
  let b = null
  let liga = null
  let krog = null
  let datum = null
  for (const v of vrsticeClanka(html)) {
    const cup = v.match(/^@cup (\d+)/)
    if (cup) {
      liga = Number(cup[1])
      krog = null
      b = null
      continue
    }
    const tur = v.match(/^ТУР\s+(\d+)\.?$/i)
    if (tur) {
      krog = Number(tur[1])
      b = null
      continue
    }
    const dan = datumDneva(v, objava)
    if (dan) {
      datum = dan
      b = null
      continue
    }
    const g = v.length <= 200 ? v.match(GLAVA) : null
    if (g && jeKlubBesedilo(g[1]) && jeKlubBesedilo(g[2]) && g[1].length <= 80 && g[2].length <= 80) {
      b = {
        liga,
        krog,
        datum,
        glava: { domaci: g[1].trim(), gostje: g[2].trim(), izid: { domaci: Number(g[3]), gostje: Number(g[4]) }, oznaka: g[5]?.trim() ?? null },
        postavi: [],
        goli: null,
        rumeni: [],
        rdeci: [],
        zgresene: [],
        surovo: [v],
      }
      bloki.push(b)
      continue
    }
    if (!b) continue
    b.surovo.push(v)
    const m = v.match(/^([^:]{1,80}):\s*(.*)$/)
    if (!m) continue
    if (jeOsebje(m[1])) continue
    const vrsta = vrstaVrstice(m[1])
    if (vrsta === 'goli') {
      // Strani loči " – " (domači – gostje). Brez njega je dala gole le ena
      // ekipa: tista, ki ni pri nuli; ob 2:1 brez pomišljaja strani ne vemo.
      const strani = m[2].split(/\s+–\s+/)
      const { domaci: d, gostje: gst } = b.glava.izid
      if (strani.length >= 2) b.goli = [razcleniGole(strani[0]), razcleniGole(strani.slice(1).join(' – '))]
      else if (d === 0) b.goli = [[], razcleniGole(strani[0])]
      else if (gst === 0) b.goli = [razcleniGole(strani[0]), []]
      else b.goli = { neznano: razcleniGole(strani[0]) }
      continue
    }
    if (vrsta) {
      b[vrsta].push(...poStraneh(m[2]))
      continue
    }
    if (jeKlubBesedilo(m[1]) && m[2].split(',').length >= 6) b.postavi.push({ oznaka: m[1].trim(), postava: razcleniPostavo(m[2]) })
  }
  return bloki
}

// --- blok → tekma in zapisnik ------------------------------------------------------------

/** Podobnost kluba iz članka in kluba z razporeda (skupna debla besed, številka natanko). */
const sim = (a, b) => podobnostKluba(imeKluba(a), imeKluba(b))

/**
 * Tekma razporeda za blok: v isti ligi (če članek pove ligo), v istem krogu
 * (če ga pove) ali z datumom največ 3 dni od dneva bloka; klubi se ujemajo po
 * imenu. Dvoumen ali šibek zadetek → null.
 */
export function tekmaZaBlok(blok, tekme, koda, objava = null) {
  if (blok.liga != null && blok.liga !== razberiKodo(koda)) return null
  const kandidati = []
  for (const t of tekme) {
    if (!t.izid) continue
    if (blok.krog != null) {
      if (t.krog !== blok.krog) continue
    } else if (blok.datum && t.datum) {
      if (Math.abs(dniMed(t.datum, blok.datum)) > 3) continue
    } else if (objava && t.datum && (dniMed(objava, t.datum) < -1 || dniMed(objava, t.datum) > PO_TEKMI_DNI)) continue
    const d = sim(blok.glava.domaci, t.domaci)
    const g = sim(blok.glava.gostje, t.gostje)
    if (!d || !g) continue
    kandidati.push({ t, ocena: d + g })
  }
  kandidati.sort((a, b) => b.ocena - a.ocena)
  if (!kandidati.length) return null
  if (kandidati.length > 1 && kandidati[1].ocena === kandidati[0].ocena) return null
  return kandidati[0].t
}

const priimek = (ime) => male(String(ime ?? '').split(' ')[0])
/**
 * Igralec po priimku in začetnicah ("Грабовський М.", "Боднар В.М." —
 * Віталій Михайлович, ne Віталій Григорович) v podanih ekipah:
 * { ekipaIdx, igralec } ali { razlog, kandidati }.
 */
export function najdiIgralca(ime, ekipe, idxi = [0, 1]) {
  const [p, ...ostalo] = String(ime ?? '').split(' ')
  const zacetnice = male(ostalo.join(' ')).split(/[.\s]+/).filter(Boolean)
  const kandidati = []
  for (const ekipaIdx of idxi) {
    for (const i of ekipe[ekipaIdx] ?? []) {
      const [ip, ...iostalo] = i.ime.split(' ')
      if (male(ip) !== male(p)) continue
      // Vsaka začetnica ustreza svoji besedi (ime, očetovo ime); manjkajoča beseda ne izloči.
      const besede = iostalo.map(male)
      if (!zacetnice.every((z, k) => !besede[k] || besede[k].startsWith(z))) continue
      kandidati.push({ ekipaIdx, igralec: i })
    }
  }
  // Isto ime dvakrat v isti ekipi (začetnik in menjava istega imena) je en sam kandidat.
  const edini = new Map(kandidati.map((c) => [`${c.ekipaIdx}|${c.igralec.ime}`, c]))
  if (edini.size === 1) return [...edini.values()][0]
  return { razlog: kandidati.length ? `"${ime}" je v postavah ${edini.size}-krat` : `"${ime}" ni v nobeni postavi`, kandidati }
}

/**
 * Blok članka (ujet s tekmo razporeda) v zapisnik. `tekma` da kluba, krog,
 * datum in izid; postavi sta iz bloka (prva = domači, razen če se ime druge
 * bolj ujema z domačimi).
 */
export function vZapisnik(blok, tekma, { koda, url = null, sezona = null } = {}) {
  if (blok.postavi.length < 2) return null
  const opozorila = []
  let [pd, pg] = blok.postavi
  if (sim(pd.oznaka, tekma.gostje) > sim(pd.oznaka, tekma.domaci) && sim(pg.oznaka, tekma.domaci) > sim(pg.oznaka, tekma.gostje)) [pd, pg] = [pg, pd]
  if (blok.postavi.length > 2) opozorila.push(`blok ima ${blok.postavi.length} postav — vzeti prvi dve`)
  const imeni = [tekma.domaci, tekma.gostje]

  const menjave = []
  const ekipe = [pd, pg].map((p, ekipaIdx) => {
    opozorila.push(...p.postava.opozorila.map((o) => `${imeni[ekipaIdx]}: ${o}`))
    const igralci = []
    for (const z of p.postava.zacetniki) {
      const zac = { st: null, ime: z.ime, regSt: null, zacetnik: true, kapetan: false, vratar: false, noter: null, ven: null, rdec: null }
      igralci.push(zac)
      let prej = zac
      for (const r of z.veriga) {
        const rez = { st: null, ime: r.ime, regSt: null, zacetnik: false, kapetan: false, vratar: false, noter: r.minuta ?? null, ven: null, rdec: null }
        prej.ven = r.minuta ?? prej.ven
        menjave.push({ ekipaIdx, minuta: r.minuta, noter: { st: null, ime: r.ime }, ven: { st: null, ime: prej.ime } })
        igralci.push(rez)
        prej = rez
      }
    }
    // Vratar ni označen: prvi začetnik in rezerva, ki ga zamenja (namig).
    if (igralci[0]) {
      igralci[0].vratar = true
      const zamenjava = menjave.find((m) => m.ekipaIdx === ekipaIdx && m.ven.ime === igralci[0].ime)
      const r = zamenjava && igralci.find((x) => !x.zacetnik && x.ime === zamenjava.noter.ime)
      if (r) r.vratar = true
    }
    return igralci
  })

  const goli = []
  const rdeci = []
  const rumeni = []
  const rezultat = tekma.izid ?? blok.glava.izid
  // Goli brez ločenih strani (2:1 brez " – "): ekipa je tista, v postavi katere je strelec.
  if (blok.goli?.neznano) {
    const strani = [[], []]
    for (const g of blok.goli.neznano) {
      const n = najdiIgralca(g.ime, ekipe)
      if (n.igralec) strani[g.avtogol ? 1 - n.ekipaIdx : n.ekipaIdx].push(g)
      else opozorila.push(`gol: ${n.razlog} (strani golov niso ločene)`)
    }
    blok = { ...blok, goli: strani }
  }
  // Goli: stran pove ekipo, ki ji gol šteje; strelec je v njej, avtogol v nasprotni.
  ;(blok.goli ?? [[], []]).forEach((stran, korist) => {
    for (const g0 of stran) {
      const g = { ...g0 }
      const kje = g.avtogol ? 1 - korist : korist
      let n = najdiIgralca(g.ime, ekipe, [kje])
      // Neoznačen avtogol: strelca ni v ekipi, ki ji gol šteje, je pa v nasprotni.
      if (!n.igralec && !g.avtogol) {
        const nn = najdiIgralca(g.ime, ekipe, [1 - korist])
        if (nn.igralec) {
          n = nn
          g.avtogol = true
          opozorila.push(`gol: ${g.ime} je v nasprotni ekipi — štet kot avtogol`)
        }
      }
      if (!n.igralec) {
        opozorila.push(`gol: ${n.razlog}`)
        continue
      }
      if (g.minuta == null) opozorila.push(`gol: ${n.igralec.ime} brez minute`)
      goli.push({ ekipaIdx: n.ekipaIdx, st: null, ime: n.igralec.ime, minuta: g.minuta, avtogol: g.avtogol, enajstmetrovka: g.enajstmetrovka && !g.avtogol })
    }
  })
  const zgresene = []
  // Izključitve in zgrešene 11 m: stran (" – ") pove ekipo; brez nje iščemo v obeh.
  for (const [seznam, vrsta] of [[blok.rdeci, 'rdeči'], [blok.rumeni, 'rumeni'], [blok.zgresene ?? [], 'zgrešena 11 m']]) {
    for (const d of seznam) {
      let n = najdiIgralca(d.ime, ekipe, d.stran != null ? [d.stran] : [0, 1])
      if (!n.igralec && d.stran != null) n = najdiIgralca(d.ime, ekipe)
      if (!n.igralec) {
        opozorila.push(`${vrsta}: ${n.razlog}`)
        continue
      }
      const z = { ekipaIdx: n.ekipaIdx, st: null, ime: n.igralec.ime, minuta: d.minuta }
      if (vrsta === 'rumeni') rumeni.push(z)
      else if (vrsta === 'zgrešena 11 m') zgresene.push(z)
      else {
        rdeci.push(z)
        // Po koncu tekme ("після завершення матчу") nastopa ne skrajša.
        n.igralec.rdec = /після\s+заверш/i.test(d.oznake) ? DOLZINA_TEKME : (d.minuta ?? DOLZINA_TEKME)
        // Drugi rumeni: 1 rumeni + 1 rdeči, kot pri drugih virih.
        if (/друг\S*\s+попередж/i.test(d.oznake)) rumeni.push(z)
      }
    }
  }

  if (blok.glava.izid.domaci !== rezultat.domaci || blok.glava.izid.gostje !== rezultat.gostje)
    opozorila.push(`izid članka ${blok.glava.izid.domaci}:${blok.glava.izid.gostje} ni izid razporeda ${rezultat.domaci}:${rezultat.gostje}`)
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  ekipe.forEach((igralci, idx) => {
    const n = igralci.filter((x) => x.zacetnik).length
    if (n !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${n} igralcev namesto 11`)
    const imena = new Map()
    for (const x of igralci) imena.set(x.ime, (imena.get(x.ime) ?? 0) + 1)
    for (const [ime, k] of imena) if (k > 1) opozorila.push(`${imeni[idx]}: igralec ${ime} je v zapisniku ${k}-krat`)
  })

  const vObliko = (i) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: idTekme(koda, tekma),
    url,
    sezona,
    krog: tekma.krog,
    datum: tekma.datum ?? blok.datum,
    ura: tekma.ura ?? null,
    domaci: { ime: tekma.domaci, postava: ekipe[0].filter((x) => x.zacetnik).map(vObliko), rezerve: ekipe[0].filter((x) => !x.zacetnik).map(vObliko) },
    gostje: { ime: tekma.gostje, postava: ekipe[1].filter((x) => x.zacetnik).map(vObliko), rezerve: ekipe[1].filter((x) => !x.zacetnik).map(vObliko) },
    rezultat,
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Zapisnik je popoln: 11 + 11 začetnikov in goli = izid. Nepopolnega beremo znova. */
export const jePopoln = (z) =>
  !!z && z.domaci.postava.length === 11 && z.gostje.postava.length === 11 &&
  !z.opozorila.some((o) => /^goli iz dogodkov/.test(o))

// --- prenos ---------------------------------------------------------------------------------

/** Prenos, ki se ob izzivu ali zavrnitvi (401, 403, 429) ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new FflZavrnitev(`ffl: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new FflZavrnitev(`ffl: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

/** Stran tekmovanja (vedno sveža); brez krogov ali sezone ustavi uvoz. */
export async function liga(koda, prenesi) {
  const html = await beri(prenesi, naslovLige(koda), imeLige(koda), true)
  const l = tekmeLige(html)
  if (!l.tekme.length || !l.sezona) throw new Error(`ffl: ${naslovLige(koda)} nima tekem ali sezone — se je stran spremenila? Uvoz ustavljen`)
  l.raven = ravenIz(l.naslov)
  if (!l.raven) throw new Error(`ffl: "${l.naslov}" ni nobena od lig ЛАФ (Прем'єр … Четверта) — uvoz ustavljen`)
  return l
}

const potSeznama = (mapa) => `${mapa}/novice.json`
function preberiSeznam(mapa) {
  try {
    const j = JSON.parse(readFileSync(potSeznama(mapa), 'utf8'))
    return { clanki: new Map(j.clanki.map((c) => [c.id, c])), najstarejsi: j.najstarejsi ?? null }
  } catch {
    return { clanki: new Map(), najstarejsi: null }
  }
}
function zapisiSeznam(s, mapa) {
  mkdirSync(mapa, { recursive: true })
  writeFileSync(potSeznama(mapa), JSON.stringify({ najstarejsi: s.najstarejsi, clanki: [...s.clanki.values()].sort((a, b) => b.id - a.id) }))
}
/** Članek, ki ga ni več (404, 410 …), izpade iz seznama novic. */
function odstraniIzSeznama(id, mapa) {
  const s = preberiSeznam(mapa)
  if (s.clanki.delete(id)) zapisiSeznam(s, mapa)
}
/**
 * Izbrisan članek: 4xx, ki ni zavrnitev (401, 403, 429) in ne 408 (časovna
 * omejitev je začasna). Zavrnitev in 5xx še vedno ustavita uvoz.
 */
const jeIzbrisan = (e) => !e?.zavrnitev && e?.status >= 400 && e.status < 500 && e.status !== 408 && !jeZavrnitev(e.status)

/**
 * Novice od `od` do `do_` (datum objave). Seznam se hrani v predpomnilniku;
 * vsak zagon prebere sveže strani, dokler ne pride do že znanih novic,
 * starejših od dveh tednov, in do `od`, če tako stare novice še ne pozna.
 */
export async function seznamNovic(od, do_, prenesi, { danes = new Date().toISOString().slice(0, 10), najvecStrani = 200, mapa = MAPA } = {}) {
  const s = preberiSeznam(mapa)
  const znaniPrej = new Set(s.clanki.keys())
  const meja = premakni(danes, -SEZNAM_DNI)
  let najstarejsiZdaj = null
  let prekrivanje = false
  for (let stran = 1; stran <= najvecStrani; stran++) {
    const html = await beri(prenesi, naslovNovic(stran), imeNovic(stran), true)
    const novice = noviceStrani(html)
    if (!novice.length) {
      // Prazna stran za zadnjo je konec seznama; stran brez novic na prvi
      // strani pa ni seznam (vzdrževanje, sprememba oblike) — uvoz se ustavi.
      if (stran > 1 && /post-index/.test(html)) break
      throw new Error(`ffl: ${naslovNovic(stran)} ni seznam novic — uvoz ustavljen`)
    }
    for (const n of novice) s.clanki.set(n.id, n)
    const najstarejsa = novice.map((n) => n.datum).filter(Boolean).sort()[0]
    if (najstarejsa) najstarejsiZdaj = najstarejsa
    if (novice.some((n) => znaniPrej.has(n.id))) prekrivanje = true
    const pokrito = prekrivanje && s.najstarejsi && s.najstarejsi <= od
    if (najstarejsa && najstarejsa < meja && (pokrito || najstarejsa < od)) break
    if (najstarejsa && najstarejsa < od) break
  }
  s.najstarejsi = prekrivanje && s.najstarejsi ? [s.najstarejsi, najstarejsiZdaj].filter(Boolean).sort()[0] : najstarejsiZdaj
  zapisiSeznam(s, mapa)
  return [...s.clanki.values()].filter((c) => c.datum && c.datum >= od && c.datum <= do_).sort((a, b) => a.id - b.id)
}

/**
 * Članek: svež, če je mlajši od tedna; sicer iz predpomnilnika, a do 45 dni
 * še enkrat svež, če ima blok tekme, ki ni popoln (postava ni 11, goli niso izid).
 */
async function clanek(c, prenesi, popolnost, zdaj = Date.now()) {
  const starost = starostDni(c.datum, zdaj)
  const sveze = starost <= SVEZE_DNI
  let html = await beri(prenesi, c.url, imeClanka(c.id), sveze)
  if (!sveze && starost <= PONOVNO_DNI && !popolnost(blokiClanka(html, c.datum ?? datumClanka(html))))
    html = await beri(prenesi, c.url, imeClanka(c.id), true)
  return html
}

/**
 * Zapisniki lige: tekme z izidom s strani tekmovanja, postave iz blokov novic
 * lige od prve tekme do mesec po zadnji. Tekma brez bloka se preskoči;
 * tekma brez borbe (glava "тех.", obe postavi prazni) je kontumacija.
 */
export async function zapisnikiLige(koda, prenesi, { danes = new Date().toISOString().slice(0, 10), mapa = MAPA } = {}) {
  const zdaj = Date.parse(`${danes}T12:00:00Z`)
  const l = await liga(koda, prenesi)
  const odigrane = l.tekme.filter((t) => t.izid && t.datum)
  if (!odigrane.length) return { liga: l, zapisniki: [], brez: [], kontumacije: [], clankov: 0 }
  const datumi = odigrane.map((t) => t.datum).sort()
  const od = premakni(datumi[0], -1)
  const do_ = [premakni(datumi.at(-1), PO_TEKMI_DNI), danes].sort()[0]
  const novice = (await seznamNovic(od, do_, prenesi, { danes, mapa })).filter((c) => jeClanekLige(c.naslov, l.raven))
  const najdeni = new Map() // id tekme → { z, url }
  const neujeti = [] // bloki, katerih krog se ne ujema z razporedom
  const popolnost = (bloki) =>
    bloki.every((b) => {
      const t = tekmaZaBlok(b, odigrane, koda)
      return !t || b.postavi.length < 2 || jePopoln(vZapisnik(b, t, { koda }))
    })
  for (const c of novice) {
    let html
    try {
      html = await clanek(c, prenesi, popolnost, zdaj)
    } catch (e) {
      // En izbrisan članek (umaknjena novica) ne ustavi lige: opozorilo,
      // članek izpade iz novice.json in uvoz gre naprej.
      if (!jeIzbrisan(e)) throw e
      console.warn(`ffl: ${c.url} → HTTP ${e.status} — članka ni več, preskočen in odstranjen s seznama novic`)
      odstraniIzSeznama(c.id, mapa)
      continue
    }
    const objava = c.datum ?? datumClanka(html)
    for (const b of blokiClanka(html, objava)) {
      const t = tekmaZaBlok(b, odigrane, koda, objava)
      if (!t) {
        // Napačen "ТУР N" v članku (Друга ліга, 23. 8.: "ТУР 2" za 3. krog):
        // poskusimo po dnevu, a le za tekme brez poročila (spodaj).
        if (b.krog != null && b.postavi.length >= 2) neujeti.push({ b, c, objava })
        continue
      }
      const id = idTekme(koda, t)
      if (b.postavi.length < 2) continue
      const z = vZapisnik(b, t, { koda, url: c.url, sezona: l.sezona })
      const prej = najdeni.get(id)
      // Ista tekma v dveh člankih (popravek): velja popolnejši, ob enakem novejši.
      if (prej && jePopoln(prej.z) && !jePopoln(z)) continue
      najdeni.set(id, { z, url: c.url })
    }
  }
  for (const { b, c, objava } of neujeti) {
    const brezPorocila = odigrane.filter((x) => !najdeni.has(idTekme(koda, x)))
    const t = tekmaZaBlok({ ...b, krog: null }, brezPorocila, koda, objava)
    if (!t) continue
    const z = vZapisnik(b, t, { koda, url: c.url, sezona: l.sezona })
    z.opozorila.push(`krog v članku (${b.krog}) ni krog razporeda (${t.krog}) — ujeto po dnevu in klubih`)
    najdeni.set(idTekme(koda, t), { z, url: c.url })
  }
  const zapisniki = []
  const brez = []
  for (const t of odigrane) {
    const id = idTekme(koda, t)
    const n = najdeni.get(id)
    if (n) zapisniki.push({ id, z: n.z, url: n.url })
    else if (!jeKontumacija(t)) brez.push(t)
  }
  return { liga: l, zapisniki, brez, kontumacije: odigrane.filter(jeKontumacija), clankov: novice.length }
}

const vir = {
  ime: 'ffl',
  polnoIme: 'Львівська асоціація футболу (ffl.org.ua)',
  drzava: 'UA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  fetch: (url, moznosti) => fflFetch(url, moznosti),
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (koda) => naslovLige(koda),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new FflZavrnitev(`ffl: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem((await liga(koda, prenesi)).tekme)
  },

  async zapisniki(koda, prenesi) {
    const { zapisniki, brez } = await zapisnikiLige(koda, prenesi)
    if (brez.length) console.warn(`ffl: ${brez.length} odigranih tekem brez poročila v novicah: ${brez.map((t) => `${t.krog}. ${t.domaci}–${t.gostje}`).join(', ')}`)
    return zapisniki
  },

  nastopi: (z) => nastopiPoImenu(z),
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaFfl,
  kratkoIme: kratkoImeFfl,
  poenostavi: kljucKlubaFfl,
}

export default vir
