// Vir: Асоціація футболу Тернопільщини (AFT) — aft.com.ua, Ukrajina
// (Ternopilska oblast). Glej CLAUDE.md (Ukrajina — vir aft).
//
// AFT vodi oblastno prvenstvo (Вища ліга, Перша ліга). Sezona je KOLEDARSKO
// leto (maj–oktober): "2026", ne "2026/27" (`competitions.sezona_koledarska`).
//
// ŠIFRA LIGE je id turnirja `/tournament/champinship/<id>` (36 = Вища ліга
// 2026, 37 = Перша ліга 2026). Vsaka sezona ima svojega; ob novi sezoni se
// popravi šifra.
//
// RAZPORED je stran turnirja: "Тур N" (`fixtures-tour`) in kartice tekem
// (`fixture-card`) z id tekme (`/match/<id>`), datumom in krajem
// ("11.10.2026, Збараж"), klubi (`fixture-card__team-name`, kraj v `alt`
// grba) in izidom ("1 : 2") ali uro neodigrane ("16:30", kijevski čas →
// ljubljanski −1 h). Izid 3:0/0:3 brez kraja je tekma brez borbe (Нараїв je
// od avgusta 2026 ne igra več) — kontumacija. Prestavljena tekma ostane v
// krogu dvakrat: neodigrana s prvotnim datumom in odigrana z novim; prvo
// izpustimo.
//
// ZAPISNIKOV na strani tekme NI (`/match/<id>` ima le izid, uro in sodnike;
// "Склад команди" je prazen). Postave so v NOVICAH (`/news/<id>-<slug>`,
// ponatis iz časopisa Газета 1): Вища ліга po en članek na tekmo, Перша ліга
// en članek na krog. Blok tekme v članku:
//
//   «Нічлава» (Жилинці–Пилатківці) – «Медобори» (Зелене) – 1:0 (0:0)
//   11 жовтня. Жилинці. Сільський стадіон. …
//   «Нічлава»: Черниш, Хруставка-к, …, Грабчак (Марцінковський, 64), … Заміна: Плекан, …
//   «Медобори»: …
//   Гол: Олег Чемерейко (90+1).
//   Попереджені: Арсен Чубатий (8), …
//
// Postava: enajst priimkov ("-к" = kapetan, "Семенець Т." ali "Д. Марчук" za
// soimenjake), menjava v oklepaju za igralcem ("Грабчак (Марцінковський, 64)"
// — Марцінковський je prišel v 64.; veriga "(Гринь, 60, Дума, 90+4)" — Дума je
// v 90. zamenjal Гриня), za "Заміна:" neuporabljena klop. Goli in kartoni so
// s polnim imenom brez kluba: igralca najdemo po priimku v postavah obeh ekip.
// Vratar je "Воротар" iz bloka "ТАКТИЧНА РОЗСТАНОВКА" (Вища ліга), sicer prvi
// začetnik (namig, kot mlsz). Identiteta je priimek + klub (kot fsb).
//
// ČLANKOV ne moremo nasloviti brez sluga (`/news/1800` vrne 404), zato vir
// prebere seznam novic (`/news?page=N`, 12 na stran, najnovejše prve) in ga
// hrani v `scripts/.predpomnilnik/aft/novice.json`; vsak zagon prebere svežo
// le prve strani do že znanih novic, starejših od dveh tednov.
//
// robots.txt: "User-agent: * / Disallow:" (nič prepovedanega). Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki). Ob 401, 403, 429 ali izzivu se uvoz
// ustavi (`AftZavrnitev`, izhod 4) — ne obhajaj.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { vLjubljanskiCas } from './frf.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'

const OSNOVNI = 'https://aft.com.ua'
const DOLZINA_TEKME = 90
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'
const MAPA = 'scripts/.predpomnilnik/aft'
const DAN = 86400000
/** Članek zadnjega tedna se še popravlja: vedno svež. */
const SVEZE_DNI = 7
/** Do te starosti se članek z nepopolnim zapisnikom prebere znova svež. */
const PONOVNO_DNI = 45
/** Seznam novic: sveže strani, dokler ne pridemo do znanih, starejših od toliko dni. */
const SEZNAM_DNI = 14
/** Članek o tekmi pride najkasneje toliko dni po zadnji tekmi lige. */
const PO_SEZONI_DNI = 30

// --- šifre in naslovi -----------------------------------------------------------------

/** "36" → 36 (id turnirja). */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)$/)
  if (!m) throw new Error(`aft: šifra lige je id turnirja (npr. 36), ne "${koda}"`)
  return Number(m[1])
}
export const naslovLige = (koda) => `${OSNOVNI}/tournament/champinship/${razberiKodo(koda)}`
export const naslovTekme = (id) => `${OSNOVNI}/match/${String(id).replace(/^aft/, '')}`
export const naslovNovic = (stran) => `${OSNOVNI}/news?page=${stran}`
// Šifra zapisnika v bazi je `aft<id tekme>`: id tekme AFT (1xxx–2xxx) se
// prekriva s šiframi drugih virov, `matches.zapisnik_id` pa je enoličen.
export const sifraZapisnika = (id) => `aft${String(id).replace(/^aft/, '')}`
const imeLige = (koda) => `liga-${razberiKodo(koda)}.html`
const imeNovic = (stran) => `novice-${stran}.html`
const imeClanka = (id) => `clanek-${id}.html`

// --- pomožno --------------------------------------------------------------------------

const ENTITETE = {
  amp: '&', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', laquo: '«', raquo: '»',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', bdquo: '„', shy: '',
}
export const razpakirajVse = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITETE[n.toLowerCase()] ?? m)
const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
export const besedilo = (html) =>
  razpakirajVse(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/[\s ]+/g, ' ').trim()

/** Izziv (Cloudflare, CAPTCHA). */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? ''))
const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class AftZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'AftZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

/**
 * Ali sme stran v predpomnilnik: le prava stran turnirja, seznama novic,
 * članka ali tekme. Vzdrževalna stran ali okrnjen odgovor s statusom 200 bi
 * sicer obveljal za vselej.
 */
export function zaPredpomnilnik(html, datoteka = '') {
  const s = String(html ?? '')
  if (jeIzziv(s)) return false
  const ime = String(datoteka)
  if (ime.startsWith('liga-')) return s.includes('fixtures-tour') && s.includes('tournament-header__title')
  if (ime.startsWith('novice-')) return s.includes('news-card-m')
  if (ime.startsWith('clanek-')) return s.includes('news-article__body')
  if (ime.startsWith('tekma-')) return s.includes('Склад команди')
  return true
}

/** "64" → 64, "90+1" → 90 (podaljšek se ne šteje). */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "11.10.2026" → "2026-10-11". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

const MESECI = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
/** "11 жовтня" ob objavi 2026-10-12 → "2026-10-11" (december ob januarski objavi je lanski). */
export function datumIzBesedila(s, objava) {
  const m = String(s ?? '').match(/^\s*(\d{1,2})\s+([а-яіїєґ]+)/i)
  const mesec = m ? MESECI.indexOf(m[2].toLowerCase()) + 1 : 0
  if (!m || !mesec || !objava) return null
  let leto = Number(objava.slice(0, 4))
  if (mesec > Number(objava.slice(5, 7)) + 1) leto--
  return `${leto}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const dniMed = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAN)
const premakni = (datum, dni) => new Date(Date.parse(`${datum}T00:00:00Z`) + dni * DAN).toISOString().slice(0, 10)
const starostDni = (datum, zdaj = Date.now()) => (datum ? (zdaj - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

// --- klubi --------------------------------------------------------------------------------

/** Ključ kluba: male črke z ukrajinskimi znaki, apostrof odpade. */
export const kljucKlubaUa = (ime) =>
  razpakirajVse(ime)
    .toLocaleLowerCase('uk')
    .replace(/['’ʼ`]/g, '')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: stran turnirja piše klube že kratko ("Поділля ВБ", "Борщів-2"). */
export const kratkoImeUa = (polno) => razpakirajVse(polno).replace(/\s+/g, ' ').trim()

// Besede, ki ne ločijo klubov: oblika, "громада" ipd.
const PRAZNE = new Set(['фк', 'фc', 'ск', 'фа', 'тг', 'громада', 'сільська', 'селищна', 'міська', 'с', 'смт', 'м'])
/** Besede imena (in kraja) za primerjavo kluba iz članka s klubom z razporeda. */
export function besedeKluba(s) {
  return kljucKlubaUa(s)
    .split(' ')
    .filter((b) => b && !PRAZNE.has(b))
}
const deblo = (b) => (/^\d+$/.test(b) ? b : b.slice(0, 5))
/**
 * Podobnost kluba iz članka (ime in kraj) in kluba z razporeda: število
 * skupnih debel besed. Številka ("Борщів-2") se mora ujemati natanko, sicer 0.
 */
export function podobnostKluba(clanek, razpored) {
  const a = besedeKluba(clanek)
  const b = besedeKluba(razpored)
  const stA = a.filter((x) => /^\d+$/.test(x)).join(' ')
  const stB = b.filter((x) => /^\d+$/.test(x)).join(' ')
  if (stA !== stB) return 0
  const db = new Set(b.map(deblo))
  return new Set(a.map(deblo).filter((x) => db.has(x))).size
}

// --- razpored ------------------------------------------------------------------------------

/**
 * Stran turnirja: { naslov, sezona, tekme: [{ krog, id, datum, ura, kraj,
 * domaci, domaciKraj, gostje, gostjeKraj, izid }] }. Datum in ura sta
 * ljubljanska.
 */
export function tekmeLige(html) {
  const s = cisto(html)
  const naslov = besedilo(s.match(/tournament-header__title">([\s\S]*?)<\//)?.[1])
  const sezona = naslov.match(/\b(20\d{2})\b/)?.[1] ?? null
  const tekme = []
  for (const del of s.split('<div class="fixtures-tour">').slice(1)) {
    const krog = Number(besedilo(del.match(/fixtures-tour__label">([\s\S]*?)<\/span>/)?.[1]).match(/(\d+)/)?.[1])
    for (const m of del.matchAll(/<a href="https:\/\/aft\.com\.ua\/match\/(\d+)" class="fixture-card">([\s\S]*?)<\/a>/g)) {
      const k = m[2]
      const meta = besedilo(k.match(/fixture-card__meta">([\s\S]*?)<\/div>/)?.[1])
      const [d, ...kraj] = meta.split(',')
      const imena = [...k.matchAll(/fixture-card__team-name">([\s\S]*?)<\/span>/g)].map((x) => besedilo(x[1]))
      const alti = [...k.matchAll(/<img[^>]*alt="([^"]*)"/g)].map((x) => besedilo(x[1]))
      const krajKluba = (alt) => alt.match(/\(([^)]*)\)\s*$/)?.[1]?.trim() ?? null
      const st = besedilo(k.match(/fixture-card__score">([\s\S]*?)<\/span>/)?.[1]).match(/^(\d+)\s*:\s*(\d+)$/)
      const ura = besedilo(k.match(/fixture-card__time">([\s\S]*?)<\/span>/)?.[1]).match(/^(\d{1,2}):(\d{2})$/)
      if (!krog || imena.length < 2) continue
      const datum = datumIz(d)
      tekme.push({
        krog,
        id: Number(m[1]),
        ...(ura ? vLjubljanskiCas(datum, `${ura[1].padStart(2, '0')}:${ura[2]}`) : { datum, ura: null }),
        kraj: kraj.join(',').trim() || null,
        domaci: imena[0],
        domaciKraj: krajKluba(alti[0] ?? ''),
        gostje: imena[1],
        gostjeKraj: krajKluba(alti[1] ?? ''),
        izid: st ? { domaci: Number(st[1]), gostje: Number(st[2]) } : null,
      })
    }
  }
  // Prestavljena tekma: neodigrana vrstica istega para v istem krogu, kadar
  // je ista tekma že odigrana, odpade.
  const odigrani = new Set(tekme.filter((t) => t.izid).map((t) => `${t.krog}|${t.domaci}|${t.gostje}`))
  const ostale = tekme.filter((t) => t.izid || !odigrani.has(`${t.krog}|${t.domaci}|${t.gostje}`))
  return { naslov, sezona, tekme: ostale }
}

const jeTriNic = (i) => (i?.domaci === 3 && i?.gostje === 0) || (i?.domaci === 0 && i?.gostje === 3)
/** Tekma brez borbe: izid 3:0 ali 0:3 brez kraja (klub ni prišel ali je izstopil). */
export const jeKontumacija = (t) => !!t.izid && jeTriNic(t.izid) && !t.kraj

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
      aftId: t.id,
      izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- seznam novic -------------------------------------------------------------------------

/** Stran seznama novic: [{ id, url, datum, naslov }]. */
export function noviceStrani(html) {
  const out = []
  for (const m of cisto(html).matchAll(/<article class="news-card-m">\s*<a href="(https:\/\/aft\.com\.ua\/news\/(\d+)-[^"]*)"([\s\S]*?)<\/article>/g)) {
    const datum = m[3].match(/datetime="(\d{4}-\d{2}-\d{2})"/)?.[1] ?? null
    const naslov = besedilo(m[3].match(/news-card-m__title">([\s\S]*?)<\/h3>/)?.[1])
    out.push({ id: Number(m[2]), url: m[1], datum, naslov })
  }
  return out
}

// --- članek --------------------------------------------------------------------------------

/** Vrstice besedila članka (odstavki), brez slik in oznak. */
export function vrsticeClanka(html) {
  const s = cisto(html)
  const i = s.indexOf('itemprop="articleBody"')
  if (i < 0) return []
  let telo = s.slice(s.indexOf('>', i) + 1)
  const konec = telo.search(/<div class="news-article__(?!body)|Головні новини|<footer/)
  if (konec > 0) telo = telo.slice(0, konec)
  return telo
    .split(/<\/p>|<br\s*\/?>|<\/h\d>|<\/li>|<\/div>/i)
    .map((v) => besedilo(v).replace(/\s*[–—]\s*/g, ' – ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** Datum objave članka ("2026-10-12"). */
export const datumClanka = (html) =>
  String(html ?? '').match(/itemprop="datePublished"[^>]*(?:datetime|content)="(\d{4}-\d{2}-\d{2})/)?.[1] ??
  String(html ?? '').match(/datetime="(\d{4}-\d{2}-\d{2})/)?.[1] ??
  null

// Glava bloka: «Дом» (kraj) – «Gost» (kraj) – 1:0 (0:0). Pomišljaj s presledki
// loči ekipi; kraj sam ima lahko pomišljaj brez presledkov (Жилинці–Пилатківці).
const GLAVA = /^(.+?) – (.+?) – (\d+)\s*:\s*(\d+)(?:\s*\((\d+)\s*:\s*(\d+)\)?)?\.?$/
const jeKlubBesedilo = (s) => /[«»"]|(?<!\p{L})ФК(?!\p{L})/u.test(s)

/** "«Нічлава» (Жилинці–Пилатківці)" → { ime: 'Нічлава', kraj: 'Жилинці–Пилатківці', polno }. */
export function klubIzGlave(s) {
  const t = String(s ?? '').trim()
  const ime = t.match(/«([^»]+)»/)?.[1] ?? t.replace(/\([^)]*\)/g, '').replace(/^ФК\s*/i, '').trim()
  const kraj = t.match(/\(([^)]*)\)\s*$/)?.[1]?.trim() ?? null
  return { ime: ime.trim(), kraj, polno: t }
}

/** Razdeli na vejicah zunaj oklepajev. */
function poVejicah(s) {
  const out = []
  let glob = 0
  let cur = ''
  for (const c of String(s ?? '')) {
    if (c === '(') glob++
    if (c === ')') glob = Math.max(0, glob - 1)
    if (c === ',' && glob === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

/**
 * Ime igralca v postavi: brez "-к" (kapetan), začetnica za priimkom
 * ("Д. Марчук" → "Марчук Д."), en apostrof.
 */
export function imeIgralca(s) {
  let t = String(s ?? '')
    .replace(/[’ʼ`]/g, "'")
    .replace(/^[^\p{L}]+|[^\p{L}.']+$/gu, '')
    .replace(/\s*-\s*к(?!\p{L})\.?/u, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Pika konca seznama ("Беслюбняк.") odpade, pika začetnice ("Семенець Т.") ostane.
  if (/\p{L}{3,}\.$/u.test(t)) t = t.slice(0, -1)
  const m = t.match(/^((?:\p{Lu}[\p{Ll}]{0,5}\.\s*)+)\s*(\S.*)$/u)
  if (m) t = `${m[2]} ${m[1].replace(/\s+/g, '')}`.trim()
  // Začetnica brez pike ("Чубей Я" na koncu seznama) dobi piko.
  if (/\s\p{Lu}\p{Ll}?$/u.test(t)) t += '.'
  return t
}
const jeKapetan = (s) => /-\s*к(?!\p{L})/u.test(String(s ?? ''))

// Pogosta moška imena: "Кладочний Михайло" je soimenjak s polnim imenom, ne
// dva igralca brez vejice.
const IMENA = new Set(
  ('олександр андрій іван сергій михайло дмитро володимир василь юрій тарас роман віталій олег ігор микола петро богдан ' +
    'максим назар назарій ярослав віктор євген павло артем артур владислав денис олексій станіслав степан остап орест ' +
    'валентин вадим антон руслан ростислав святослав тимофій матвій марко ілля микита данило кирило захар ' +
    'мирослав любомир григорій федір йосип анатолій едуард леонід костянтин арсен арсеній пилип ян вячеслав зіновій ' +
    'тимур нестор семен марян ярема устим євгеній валерій геннадій олесь влад').split(/\s+/),
)
/** Dve "polni" besedi brez začetnice in brez imena: manjkajoča vejica ("Чемерейко Слободян"). */
const staDva = (ime) => {
  const b = ime.split(' ')
  return b.length === 2 && b.every((x) => /^\p{Lu}[\p{Ll}'-]{2,}$/u.test(x)) && !b.some((x) => IMENA.has(male(x).replace(/'/g, '')))
}

/**
 * Postava enega kluba: "Черниш, Хруставка-к, …, Грабчак (Марцінковський, 64), …
 * Заміна: Плекан, …" → { zacetniki: [{ ime, kapetan, veriga: [{ ime, minuta }] }], klop: [ime], opozorila }.
 */
export function razcleniPostavo(besedilo_) {
  const opozorila = []
  // "Заміна:" (tudi brez dvopičja) loči začetnike od klopi; pika za oklepajem
  // ("Завальний (Величко, 57). Кузняк") je vejica.
  const [glavni0, klopB = ''] = String(besedilo_ ?? '').split(/\s*Замін[аи]\s*:?\s*/i)
  // Pika ali vprašaj za priimkom ("Чорній. М. Ваврик", "Мостовий? Понєдєльнік")
  // je prav tako vejica; začetnica ("Д. Марчук") in okrajšava ("Волод.") nista.
  const glavni = glavni0.replace(/\)\s*\.\s+(?=\p{Lu})/gu, '), ').replace(/(?<=\p{Lu}[\p{Ll}'’]{5,})[.?]\s+(?=\p{Lu})/gu, ', ')
  const zacetniki = []
  for (const kos of poVejicah(glavni)) {
    const ime0 = kos.replace(/\(.*$/s, '').trim()
    const oklep = kos.match(/\(([^)]*)\)/)?.[1] ?? ''
    const veriga = []
    let zadnji = null
    for (const d of oklep.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (/^\d+(\s*\+\s*\d+)?$/.test(d)) {
        if (zadnji) {
          zadnji.minuta = minuta(d)
          zadnji = null
        }
      } else {
        zadnji = { ime: imeIgralca(d), minuta: null }
        veriga.push(zadnji)
      }
    }
    // Odvečna vejica pred oklepajem ("Заверуха, (Кандибал, 56)"): menjava
    // pripada prejšnjemu igralcu.
    if (!ime0 && veriga.length && zacetniki.length && !zacetniki.at(-1).veriga.length) {
      zacetniki.at(-1).veriga = veriga
      opozorila.push(`odvečna vejica pred menjavo ${veriga[0].ime} — pripisana igralcu ${zacetniki.at(-1).ime}`)
      continue
    }
    if (!ime0) continue
    zacetniki.push({ ime: imeIgralca(ime0), kapetan: jeKapetan(ime0), veriga })
  }
  // Manjkajoča vejica: ob desetih začetnikih razdeli tistega, ki ima dve polni besedi.
  if (zacetniki.length === 10) {
    const i = zacetniki.findIndex((z) => staDva(z.ime))
    if (i >= 0 && zacetniki.filter((z) => staDva(z.ime)).length === 1) {
      const [a, b] = zacetniki[i].ime.split(' ')
      opozorila.push(`manjka vejica med "${a}" in "${b}" — razdeljeno v dva igralca`)
      zacetniki.splice(i, 1, { ime: a, kapetan: false, veriga: [] }, { ime: b, kapetan: zacetniki[i].kapetan, veriga: zacetniki[i].veriga })
    }
  }
  // Klopi ne delimo: dve besedi sta tu pogosto priimek in ime soimenjaka
  // ("Пшивий Володимир"), neuporabljena rezerva pa nastopa nima.
  const klop = poVejicah(klopB.replace(/\.$/, '')).map(imeIgralca).filter(Boolean)
  return { zacetniki, klop, opozorila }
}

const male = (s) => String(s ?? '').toLocaleLowerCase('uk').replace(/ё/g, 'е')

/**
 * Seznam "Олег Чемерейко (90+1), Назар Біняшевський (78, з пен.)" →
 * [{ ime, dogodki: [{ minuta, oznake: 'з пен.' }] }].
 */
export function razcleniDogodke(s) {
  const out = []
  for (const kos of poVejicah(String(s ?? '').replace(/\.$/, ''))) {
    const ime = kos.replace(/\(.*$/s, '').trim()
    const oklep = kos.match(/\(([^)]*)\)/)?.[1] ?? ''
    const dogodki = []
    for (const d of oklep.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (/^\d+(\s*\+\s*\d+)?['’]?$/.test(d)) dogodki.push({ minuta: minuta(d), oznake: '' })
      else if (dogodki.length) dogodki.at(-1).oznake += ` ${d}`
      else dogodki.push({ minuta: minuta(d), oznake: d })
    }
    if (!dogodki.length) dogodki.push({ minuta: null, oznake: '' })
    if (ime && !/^(немає|нема|ні|відсутні)$/i.test(ime)) out.push({ ime, dogodki })
  }
  return out
}

const jeEnajstmetrovka = (o) => /пен|penal|11\s*м/i.test(o)
const jeAvtogol = (o) => /автогол|аутогол|у\s*свої|власні|в\s*свої|(?<!\p{L})а\/г(?!\p{L})/iu.test(o)
const jeDrugiRumeni = (o) => /друг\S*\s*попер|два\s*попер|2\s*ж/i.test(o)

/** Naslov vrstice dogodkov → vrsta. */
function vrstaVrstice(oznaka) {
  const o = male(oznaka)
  if (/^голи?$|^м'?ячі$/.test(o)) return 'goli'
  if (/^попереджен/.test(o)) return 'rumeni'
  if (/^вилучен/.test(o)) return 'rdeci'
  if (/(не\s*реаліз|не\s*забил|незабит).*пенальт|пенальт.*не\s*реаліз/.test(o)) return 'zgresene'
  return null
}

/**
 * Bloki tekem v članku: [{ glava: { domaci, gostje, izid, polcas }, datum,
 * postavi: [{ oznaka, postava }], vrstice: { goli, rumeni, rdeci, zgresene },
 * vratarji: { <oznaka kluba>: polno ime } }].
 */
export function blokiClanka(html, objava = datumClanka(html)) {
  const bloki = []
  let b = null
  let taktika = null // ime kluba v "ТАКТИЧНА РОЗСТАНОВКА"
  for (const v of vrsticeClanka(html)) {
    // Glava je kratka vrstica; pripoved z "– 0:1" v sredini ni glava.
    const g = v.length <= 160 ? v.match(GLAVA) : null
    if (g && g[1].length <= 70 && g[2].length <= 70 && jeKlubBesedilo(g[1]) && jeKlubBesedilo(g[2])) {
      b = {
        glava: {
          domaci: klubIzGlave(g[1]),
          gostje: klubIzGlave(g[2]),
          izid: { domaci: Number(g[3]), gostje: Number(g[4]) },
          polcas: g[5] != null ? { domaci: Number(g[5]), gostje: Number(g[6]) } : null,
        },
        datum: null,
        postavi: [],
        vrstice: { goli: [], rumeni: [], rdeci: [], zgresene: [] },
        vratarji: [],
        taktika: [],
        surovo: [v],
      }
      bloki.push(b)
      taktika = null
      continue
    }
    if (!b) continue
    if (/^ТАКТИЧНА РОЗСТАНОВКА/i.test(v)) {
      taktika = ''
      continue
    }
    if (taktika != null) {
      const t = v.match(/^(.+?)\s*\(\s*\d[\dхx\s]*\)\s*:?$/i)
      if (t && jeKlubBesedilo(t[1])) {
        taktika = t[1]
        continue
      }
      const vr = v.match(/^Воротар\s+–\s+(.+)$/i)
      if (vr && taktika) b.vratarji.push({ oznaka: taktika, ime: vr[1].trim() })
      // Polna imena po mestih ("Піднападники – Максим Цвян та Артур Копит"):
      // ločijo soimenjaka iz različnih klubov pri golih in kartonih.
      const mesto = v.match(/^[^–:]{3,40}\s+–\s+(.+)$/)
      if (mesto && taktika) {
        let t = b.taktika.find((x) => x.oznaka === taktika)
        if (!t) b.taktika.push((t = { oznaka: taktika, imena: [] }))
        t.imena.push(...mesto[1].split(/\s+(?:та|і|й)\s+|,\s*/).map((x) => x.trim()).filter(Boolean))
      }
      continue
    }
    b.surovo.push(v)
    if (!b.datum) {
      const d = datumIzBesedila(v, objava)
      if (d) {
        b.datum = d
        continue
      }
    }
    // "На 63-й хвилині Тарас Гром’як не реалізував пенальті."
    const zg = v.match(/^На\s+(\d+)(?:\s*\+\s*\d+)?-?\S*\s+хвилин\S*\s+(.+?)\s+не\s+реалізува\S*\s+пенальті/i)
    if (zg) {
      b.vrstice.zgresene.push({ ime: zg[2].replace(/\s*\([^)]*\)\s*/g, ' ').trim(), dogodki: [{ minuta: minuta(zg[1]), oznake: '' }] })
      continue
    }
    const m = v.match(/^([^:]{1,80}):\s*(.+)$/)
    if (!m) continue
    const vrsta = vrstaVrstice(m[1])
    if (vrsta) {
      b.vrstice[vrsta].push(...razcleniDogodke(m[2]))
      continue
    }
    if (jeKlubBesedilo(m[1]) && m[2].split(',').length >= 7) b.postavi.push({ oznaka: m[1].trim(), postava: razcleniPostavo(m[2]) })
  }
  return bloki
}

// --- blok → zapisnik ------------------------------------------------------------------

const kljucImena = (polno) => male(String(polno ?? '').replace(/[’ʼ`]/g, "'")).split(/\s+/).filter(Boolean).sort().join(' ')

/**
 * Igralec po polnem imenu iz golov in kartonov: { ekipaIdx, igralec } ali
 * { razlog, kandidati }. Priimek je zadnja beseda ("Олег Чемерейко"), sicer
 * prva ("Данилюк Сергій"). Soimenjaka iz dveh klubov loči taktična
 * razporeditev s polnimi imeni (`polna[ekipaIdx]`).
 */
function najdiIgralca(polno, ekipe, polna = [new Set(), new Set()]) {
  const deli = String(polno ?? '').replace(/[’ʼ`]/g, "'").trim().split(/\s+/).filter(Boolean)
  const poskusi = [{ priimek: deli.at(-1), ime: deli.slice(0, -1)[0] }, { priimek: deli[0], ime: deli[1] }]
  let kandidati = []
  for (const { priimek, ime } of poskusi) {
    const p = male(priimek)
    ekipe.forEach((igralci, ekipaIdx) => {
      for (const i of igralci) {
        const [pr, ...ostalo] = i.ime.split(' ')
        if (male(pr) !== p) continue
        // Začetnica za priimkom ("Семенець Т.", "Пшивий Волод.") mora ustrezati imenu.
        const zac = ostalo.join(' ').replace(/\.$/, '')
        if (zac && ime && !male(ime).startsWith(male(zac))) continue
        kandidati.push({ ekipaIdx, igralec: i })
      }
    })
    if (kandidati.length) break
  }
  if (kandidati.length > 1) {
    const k = kljucImena(polno)
    const vTaktiki = kandidati.filter((c) => polna[c.ekipaIdx]?.has(k))
    if (vTaktiki.length === 1) kandidati = vTaktiki
  }
  if (kandidati.length === 1) return kandidati[0]
  return { razlog: kandidati.length ? `"${polno}" je v postavah ${kandidati.length}-krat` : `"${polno}" ni v nobeni postavi`, kandidati }
}

/**
 * Blok članka (ujet s tekmo razporeda) v zapisnik. `tekma` da kluba, krog,
 * datum in izid; postavi sta iz bloka (prva = domači, razen če se ime druge
 * bolj ujema z domačimi).
 */
export function vZapisnik(blok, tekma, { url = null, sezona = null } = {}) {
  const opozorila = []
  if (blok.postavi.length < 2) return null
  let [pd, pg] = blok.postavi
  const sim = (oznaka, ime, kraj) => podobnostKluba(klubIzGlave(oznaka).ime, `${ime} ${kraj ?? ''}`)
  if (sim(pd.oznaka, tekma.gostje, tekma.gostjeKraj) > sim(pd.oznaka, tekma.domaci, tekma.domaciKraj) &&
      sim(pg.oznaka, tekma.domaci, tekma.domaciKraj) > sim(pg.oznaka, tekma.gostje, tekma.gostjeKraj)) [pd, pg] = [pg, pd]
  if (blok.postavi.length > 2) opozorila.push(`blok ima ${blok.postavi.length} postav — vzeti prvi dve`)
  const imeni = [tekma.domaci, tekma.gostje]

  const menjave = []
  const ekipe = [pd, pg].map((p, ekipaIdx) => {
    opozorila.push(...p.postava.opozorila.map((o) => `${imeni[ekipaIdx]}: ${o}`))
    const igralci = []
    for (const z of p.postava.zacetniki) {
      const zac = { st: null, ime: z.ime, regSt: null, zacetnik: true, kapetan: z.kapetan, vratar: false, noter: null, ven: null, rdec: null }
      igralci.push(zac)
      let prej = zac
      for (const r of z.veriga) {
        if (r.minuta == null) opozorila.push(`${imeni[ekipaIdx]}: menjava ${prej.ime} → ${r.ime} brez minute`)
        const rez = { st: null, ime: r.ime, regSt: null, zacetnik: false, kapetan: false, vratar: false, noter: r.minuta ?? null, ven: null, rdec: null }
        prej.ven = r.minuta ?? prej.ven
        menjave.push({ ekipaIdx, minuta: r.minuta, noter: { st: null, ime: r.ime }, ven: { st: null, ime: prej.ime } })
        igralci.push(rez)
        prej = rez
      }
    }
    for (const ime of p.postava.klop) igralci.push({ st: null, ime, regSt: null, zacetnik: false, kapetan: false, vratar: false, noter: null, ven: null, rdec: null })
    return igralci
  })

  // Taktična razporeditev kluba: najbolj podobna oznaka (z dodatkom,
  // "«Поділля» В.Б."), ob enaki podobnosti po vrstnem redu (domači prvi).
  const zaKlub = (seznam, idx) => {
    const oznaka = (idx === 0 ? pd : pg).oznaka
    const ocene = seznam.map((v, i) => ({ v, i, o: podobnostKluba(v.oznaka, oznaka) }))
    ocene.sort((a, b) => b.o - a.o || Math.abs(a.i - idx) - Math.abs(b.i - idx))
    return ocene[0]?.o > 0 ? ocene[0].v : null
  }
  const polna = [0, 1].map((idx) => new Set((zaKlub(blok.taktika ?? [], idx)?.imena ?? []).map(kljucImena)))

  // Vratar: "Воротар" iz taktične razporeditve, sicer prvi začetnik (namig).
  ekipe.forEach((igralci, idx) => {
    const iz = zaKlub(blok.vratarji, idx)
    let vratar = null
    if (iz) {
      const n = najdiIgralca(iz.ime, [igralci.filter((x) => x.zacetnik)])
      vratar = n.igralec ?? null
      if (!vratar) opozorila.push(`${imeni[idx]}: vratar ${n.razlog}`)
    }
    vratar ??= igralci.find((x) => x.zacetnik) ?? null
    if (vratar) vratar.vratar = true
    // Rezerva, ki zamenja vratarja, je vratar (namig).
    const zamenjava = menjave.find((m) => m.ekipaIdx === idx && m.ven.ime === vratar?.ime)
    if (zamenjava) {
      const r = igralci.find((x) => !x.zacetnik && x.ime === zamenjava.noter.ime)
      if (r) r.vratar = true
    }
  })

  const goli = []
  const rumeni = []
  const rdeci = []
  const zgresene = []
  const dvoumni = [] // goli soimenjakov iz obeh klubov: odloči izid
  const dodaj = (seznam, vrsta) => {
    for (const d of seznam) {
      // Karton trenerja ali predstavnika ("Ігор Бадло (30, тренер)") ne šteje.
      if (d.dogodki.some((e) => /тренер|представник|особа|начальник|лікар|адміністратор|масажист/i.test(e.oznake))) continue
      const n = najdiIgralca(d.ime, ekipe, polna)
      if (!n.igralec && vrsta === 'gol' && new Set(n.kandidati.map((c) => c.ekipaIdx)).size === 2 && n.kandidati.length === 2) {
        dvoumni.push({ d, kandidati: n.kandidati })
        continue
      }
      if (!n.igralec) {
        opozorila.push(`${vrsta}: ${n.razlog}`)
        continue
      }
      for (const e of d.dogodki) {
        const z = { ekipaIdx: n.ekipaIdx, st: null, ime: n.igralec.ime, minuta: e.minuta }
        if (e.minuta == null) opozorila.push(`${vrsta}: ${n.igralec.ime} brez minute`)
        if (vrsta === 'gol') goli.push({ ...z, avtogol: jeAvtogol(e.oznake), enajstmetrovka: jeEnajstmetrovka(e.oznake) })
        else if (vrsta === 'rumeni') rumeni.push(z)
        else if (vrsta === 'zgrešena 11 m') zgresene.push(z)
        else if (vrsta === 'rdeči') {
          rdeci.push(z)
          n.igralec.rdec = e.minuta ?? DOLZINA_TEKME
          // Drugi rumeni: ostane 1 rumeni + 1 rdeči, kot pri drugih virih.
          if (jeDrugiRumeni(e.oznake) && !rumeni.some((r) => r.ekipaIdx === z.ekipaIdx && r.ime === z.ime)) rumeni.push(z)
        }
      }
    }
  }
  dodaj(blok.vrstice.goli, 'gol')
  dodaj(blok.vrstice.rumeni, 'rumeni')
  dodaj(blok.vrstice.rdeci, 'rdeči')
  dodaj(blok.vrstice.zgresene, 'zgrešena 11 m')

  const rezultat = tekma.izid ?? blok.glava.izid
  if (blok.glava.izid.domaci !== rezultat.domaci || blok.glava.izid.gostje !== rezultat.gostje)
    opozorila.push(`izid članka ${blok.glava.izid.domaci}:${blok.glava.izid.gostje} ni izid razporeda ${rezultat.domaci}:${rezultat.gostje}`)
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  // Gol soimenjaka iz obeh klubov ("Сергій Кривий" pri Вікнини in Борщів):
  // klub, pri katerem se goli ujemajo z izidom, če je tak en sam.
  for (const { d, kandidati } of dvoumni) {
    const moznosti = kandidati.filter((c) => {
      const poskus = d.dogodki.map((e) => ({ ekipaIdx: c.ekipaIdx, avtogol: jeAvtogol(e.oznake) }))
      const za = (idx) => zaEkipo(idx) + poskus.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
      return za(0) === rezultat.domaci && za(1) === rezultat.gostje
    })
    if (moznosti.length !== 1) {
      opozorila.push(`gol: "${d.ime}" je v postavah obeh klubov`)
      continue
    }
    const c = moznosti[0]
    for (const e of d.dogodki) goli.push({ ekipaIdx: c.ekipaIdx, st: null, ime: c.igralec.ime, minuta: e.minuta, avtogol: jeAvtogol(e.oznake), enajstmetrovka: jeEnajstmetrovka(e.oznake) })
    opozorila.push(`gol: "${d.ime}" je v postavah obeh klubov — pripisan klubu ${imeni[c.ekipaIdx]} po izidu`)
  }
  // Neoznačen avtogol: ekipa ima v članku natanko toliko golov preveč, kolikor
  // jih nasprotniku manjka, in vsi njeni goli so odveč ("Гол: Богдан Довгий
  // (50)" — vratar gostov pri 1:0 za domače). Takrat so to avtogoli.
  for (const idx of [0, 1]) {
    const izid = [rezultat.domaci, rezultat.gostje]
    const moji = goli.filter((g) => !g.avtogol && g.ekipaIdx === idx)
    const odvec = zaEkipo(idx) - izid[idx]
    if (odvec > 0 && moji.length === odvec && izid[1 - idx] - zaEkipo(1 - idx) === odvec) {
      for (const g of moji) g.avtogol = true
      opozorila.push(`${imeni[idx]}: ${moji.map((g) => g.ime).join(', ')} — gol ni označen kot avtogol, a ga izid zahteva; štet kot avtogol`)
    }
  }
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  ekipe.forEach((igralci, idx) => {
    const n = igralci.filter((x) => x.zacetnik).length
    if (n !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${n} igralcev namesto 11`)
    const imena = new Map()
    for (const x of igralci) imena.set(x.ime, (imena.get(x.ime) ?? 0) + 1)
    for (const [ime, k] of imena) if (k > 1) opozorila.push(`${imeni[idx]}: igralec ${ime} je v zapisniku ${k}-krat`)
  })
  // Polčas: le, če je smiseln (vir ima tipkarske napake, "(0:10)").
  const p = blok.glava.polcas
  const polcas = p && p.domaci <= rezultat.domaci && p.gostje <= rezultat.gostje ? p : null

  const vObliko = (i) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: sifraZapisnika(tekma.id),
    url,
    sezona,
    krog: tekma.krog,
    datum: tekma.datum ?? blok.datum,
    ura: tekma.ura ?? null,
    domaci: { ime: tekma.domaci, postava: ekipe[0].filter((x) => x.zacetnik).map(vObliko), rezerve: ekipe[0].filter((x) => !x.zacetnik).map(vObliko) },
    gostje: { ime: tekma.gostje, postava: ekipe[1].filter((x) => x.zacetnik).map(vObliko), rezerve: ekipe[1].filter((x) => !x.zacetnik).map(vObliko) },
    rezultat,
    polcas,
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

/**
 * Tekma razporeda za blok: odigrana tekma lige, katere klubi se ujemajo s
 * klubi glave (ime in kraj), z datumom največ 3 dni od datuma bloka (brez
 * datuma: do 10 dni pred objavo). Dvoumen ali šibek zadetek → null.
 */
export function tekmaZaBlok(blok, tekme, objava) {
  const kandidati = []
  for (const t of tekme) {
    if (!t.izid || !t.datum) continue
    if (blok.datum ? Math.abs(dniMed(t.datum, blok.datum)) > 3 : objava && (dniMed(objava, t.datum) < -1 || dniMed(objava, t.datum) > 10)) continue
    const d = podobnostKluba(`${blok.glava.domaci.ime} ${blok.glava.domaci.kraj ?? ''}`, `${t.domaci} ${t.domaciKraj ?? ''}`)
    const g = podobnostKluba(`${blok.glava.gostje.ime} ${blok.glava.gostje.kraj ?? ''}`, `${t.gostje} ${t.gostjeKraj ?? ''}`)
    if (!d || !g) continue
    kandidati.push({ t, ocena: d + g, razmik: blok.datum ? Math.abs(dniMed(t.datum, blok.datum)) : 0 })
  }
  kandidati.sort((a, b) => b.ocena - a.ocena || a.razmik - b.razmik)
  if (!kandidati.length) return null
  if (kandidati.length > 1 && kandidati[1].ocena === kandidati[0].ocena && kandidati[1].razmik === kandidati[0].razmik) return null
  return kandidati[0].t
}

/**
 * Ohlapno ujemanje za blok, ki se po datumu ne ujame z nobeno tekmo: datum v
 * članku je napačen ("16 липня" namesto avgusta) ali je bila tekma dokončana
 * pozneje ("у дограванні"). Kandidati so le tekme brez poročila, z istima
 * kluboma (domači ostane domači) in istim izidom, odigrane pred objavo (do
 * pol leta); velja najnovejša, ob enakem ujemanju imen.
 */
export function tekmaZaBlokOhlapno(blok, tekme, objava) {
  const meja = blok.datum && objava ? [blok.datum, objava].sort().at(-1) : (blok.datum ?? objava)
  if (!meja) return null
  const kandidati = []
  for (const t of tekme) {
    if (!t.izid || !t.datum || t.datum > premakni(meja, 1) || dniMed(meja, t.datum) > 180) continue
    if (t.izid.domaci !== blok.glava.izid.domaci || t.izid.gostje !== blok.glava.izid.gostje) continue
    const d = podobnostKluba(`${blok.glava.domaci.ime} ${blok.glava.domaci.kraj ?? ''}`, `${t.domaci} ${t.domaciKraj ?? ''}`)
    const g = podobnostKluba(`${blok.glava.gostje.ime} ${blok.glava.gostje.kraj ?? ''}`, `${t.gostje} ${t.gostjeKraj ?? ''}`)
    if (d && g) kandidati.push({ t, ocena: d + g })
  }
  kandidati.sort((a, b) => b.ocena - a.ocena || b.t.datum.localeCompare(a.t.datum))
  if (!kandidati.length) return null
  if (kandidati.length > 1 && kandidati[1].ocena === kandidati[0].ocena && kandidati[1].t.datum === kandidati[0].t.datum) return null
  return kandidati[0].t
}

// --- prenos ---------------------------------------------------------------------------------

/** Prenos, ki se ob izzivu ali zavrnitvi (401, 403, 429) ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new AftZavrnitev(`aft: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new AftZavrnitev(`aft: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

/** Stran turnirja (vedno sveža); brez krogov ali sezone ustavi uvoz. */
export async function liga(koda, prenesi) {
  const html = await beri(prenesi, naslovLige(koda), imeLige(koda), true)
  const l = tekmeLige(html)
  if (!l.tekme.length || !l.sezona) throw new Error(`aft: ${naslovLige(koda)} nima tekem ali sezone — se je stran spremenila? Uvoz ustavljen`)
  const leta = new Set(l.tekme.map((t) => t.datum?.slice(0, 4)).filter(Boolean))
  if (!leta.has(l.sezona)) throw new Error(`aft: sezona ${l.sezona} iz naslova ni leto tekem (${[...leta].join(', ')}) — uvoz ustavljen`)
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
function zapisiSeznam(s, mapa) {
  mkdirSync(mapa, { recursive: true })
  writeFileSync(potSeznama(mapa), JSON.stringify({ najstarejsi: s.najstarejsi, clanki: [...s.clanki.values()].sort((a, b) => b.id - a.id) }))
}

/**
 * Novice od `od` do `do_` (datum objave). Seznam se hrani v predpomnilniku; vsak
 * zagon prebere sveže strani, dokler ne pride do že znanih novic, starejših od
 * dveh tednov (pozneje objavljen članek s starejšim datumom stoji globlje), in
 * do `od`, če tako stare novice še ne pozna.
 */
export async function seznamNovic(od, do_, prenesi, { danes = new Date().toISOString().slice(0, 10), najvecStrani = 400, mapa = MAPA } = {}) {
  const s = preberiSeznam(mapa)
  const znaniPrej = new Set(s.clanki.keys())
  const meja = premakni(danes, -SEZNAM_DNI)
  let najstarejsiZdaj = null
  let prekrivanje = false
  for (let stran = 1; stran <= najvecStrani; stran++) {
    const html = await beri(prenesi, naslovNovic(stran), imeNovic(stran), true)
    const novice = noviceStrani(html)
    if (!novice.length) {
      // Prazna stran za zadnjo je konec seznama; stran brez mreže novic pa
      // ni seznam (vzdrževanje, sprememba oblike) — uvoz se ustavi.
      if (stran > 1 && /news-index-grid/.test(html)) break
      throw new Error(`aft: ${naslovNovic(stran)} ni seznam novic — uvoz ustavljen`)
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
 * še enkrat svež, če ima blok tekme, ki ni popoln (postava ni 11, goli niso
 * izid). `popolnost(bloki)` pove, ali so bloki članka popolni.
 */
async function clanek(c, prenesi, popolnost, zdaj = Date.now()) {
  const url = c.url
  const starost = starostDni(c.datum, zdaj)
  const sveze = starost <= SVEZE_DNI
  let html = await beri(prenesi, url, imeClanka(c.id), sveze)
  if (!sveze && starost <= PONOVNO_DNI && !popolnost(blokiClanka(html, c.datum ?? datumClanka(html))))
    html = await beri(prenesi, url, imeClanka(c.id), true)
  return html
}

/**
 * Zapisniki lige: tekme z izidom s strani turnirja, postave iz blokov novic
 * od prve tekme do mesec po zadnji. Tekma brez bloka (članka še ni ali ga
 * ne bo) se preskoči; kontumacija nima zapisnika.
 */
export async function zapisnikiLige(koda, prenesi, { danes = new Date().toISOString().slice(0, 10), mapa = MAPA } = {}) {
  const zdaj = Date.parse(`${danes}T12:00:00Z`)
  const l = await liga(koda, prenesi)
  const odigrane = l.tekme.filter((t) => t.izid && t.datum)
  if (!odigrane.length) return { liga: l, zapisniki: [], brez: [] }
  const datumi = odigrane.map((t) => t.datum).sort()
  const od = datumi[0]
  const do_ = [premakni(datumi.at(-1), PO_SEZONI_DNI), danes].sort()[0]
  const novice = await seznamNovic(od, do_, prenesi, { danes, mapa })
  const najdeni = new Map() // id tekme → { z, url, objava }
  const popolnost = (bloki) =>
    bloki.every((b) => {
      const t = tekmaZaBlok(b, odigrane, null)
      return !t || jePopoln(vZapisnik(b, t))
    })
  const neujeti = [] // bloki brez tekme po datumu: { b, c, objava }
  for (const c of novice) {
    let html
    try {
      html = await clanek(c, prenesi, popolnost, zdaj)
    } catch (e) {
      // En izbrisan članek (umaknjena novica, spremenjen slug) ne ustavi
      // lige: opozorilo, članek izpade iz novice.json in uvoz gre naprej.
      if (!jeIzbrisan(e)) throw e
      console.warn(`aft: ${c.url} → HTTP ${e.status} — članka ni več, preskočen in odstranjen s seznama novic`)
      odstraniIzSeznama(c.id, mapa)
      continue
    }
    const objava = c.datum ?? datumClanka(html)
    for (const b of blokiClanka(html, objava)) {
      const t = tekmaZaBlok(b, odigrane, objava)
      if (!t) {
        if (b.postavi.length >= 2) neujeti.push({ b, c, objava })
        continue
      }
      const z = vZapisnik(b, t, { url: c.url, sezona: l.sezona })
      if (!z) continue
      const prej = najdeni.get(t.id)
      // Ista tekma v dveh člankih (napoved, popravek): velja popolnejši, ob
      // enakem novejši.
      if (prej && jePopoln(prej.z) && !jePopoln(z)) continue
      najdeni.set(t.id, { z, url: c.url })
    }
  }
  // Bloki z napačnim datumom ali dokončane tekme: le za tekme brez poročila.
  for (const { b, c, objava } of neujeti) {
    const t = tekmaZaBlokOhlapno(b, odigrane.filter((x) => !najdeni.has(x.id) && !jeKontumacija(x)), objava)
    if (!t) continue
    const z = vZapisnik(b, t, { url: c.url, sezona: l.sezona })
    if (!z) continue
    z.opozorila.push(`datum v članku (${b.datum ?? objava}) ni datum tekme (${t.datum}) — ujeto po klubih in izidu`)
    najdeni.set(t.id, { z, url: c.url })
  }
  const zapisniki = []
  const brez = []
  for (const t of odigrane) {
    const n = najdeni.get(t.id)
    if (!n) {
      if (!jeKontumacija(t)) brez.push(t)
      continue
    }
    zapisniki.push({ id: n.z.zapisnikId, z: n.z, url: n.url })
  }
  return { liga: l, zapisniki, brez }
}

const vir = {
  ime: 'aft',
  polnoIme: 'Асоціація футболу Тернопільщини (aft.com.ua)',
  drzava: 'UA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new AftZavrnitev(`aft: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem((await liga(koda, prenesi)).tekme)
  },

  async zapisniki(koda, prenesi) {
    const { zapisniki, brez } = await zapisnikiLige(koda, prenesi)
    if (brez.length) console.warn(`aft: ${brez.length} odigranih tekem brez poročila v novicah: ${brez.map((t) => `${t.krog}. ${t.domaci}–${t.gostje}`).join(', ')}`)
    return zapisniki
  },

  nastopi: (z) => nastopiPoImenu(z),
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaUa,
  kratkoIme: kratkoImeUa,
  poenostavi: kljucKlubaUa,
}

export default vir
