// Vir: Хмельницька обласна асоціація футболу (ХОАФ) — hoff.km.ua.
//
// Chempionat Hmeljnicke oblasti (ЧХО): Vyshcha liga (6 klubov) in Persha liga
// (5 klubov), raven 5 in 6 v Ukrajini. Glej docs/viri/ukrajina.md (vir hoff-km).
// Sezona je KOLEDARSKO leto (maj–oktober), oznaka "2026".
//
// ŠIFRA LIGE je slug strani lige (`chho-2026-vyshha-liga`, arhiv `chho-2025`);
// leto v slugu je sezona. Stran je WordPress: razpored je ročno vnesena tabela
// v vsebini strani ("Тур | Дата | № гри | Господарі | Гості | Рахунок",
// stolpci se med sezonami premešajo — beremo jih po glavi), brez ure in brez
// povezav na tekme. Tehnični izid je označen z zvezdico in opombo pod tabelo
// ("* Матч №9 – неявка гостей… техічна перемога господарів", "КДК анулював
// результат") ali "3:0 (+:-)"; prekinjena tekma ("**: матч призупинено …,
// догравання 17.10.26") še ni odigrana.
//
// ZAPISNIK je ena objava na tekmo ("ЧЕМПІОНАТ ОБЛАСТІ: A – B", 2025 "ЧХО-2025.
// 14 ТУР. A – B"). Objave preberemo prek javnega REST WordPressa (robots.txt
// ga dovoli): seznam VSEH objav leta (le id, datum, naslov; ~3 strani po 100),
// nato vsebino objav tekem po 100 naenkrat — štirje do pet zahtevkov na ligo
// namesto enega na tekmo. Oznake in kategorije niso popolne: `sezon-2026`,
// `chempionat-oblasti` in kategorija "ОБЛАСНІ ТУРНІРИ" vsaka zgreši nekaj
// tekem (Нива : Олімп, 7. tur 2026, je le v "Новини"), zato filtriramo po naslovu.
// Objavo tekmi razporeda pripišemo po paru klubov (naslov) in krogu ("Матч 15
// туру", "14 ТУР"; ob neskladju najbližji datum).
//
// Besedilo objave: glava z izidom in polčasom ("4:1 (3:0)"), postavi
// ("“Колос”: Бушняк, Червінський, …, Музичук (Панфілов, 78)."): enajst
// začetnikov, "– к" kapetan, v oklepaju rezerva, ki je prišla, in minuta;
// veriga "(Чабак, 20 (Омельчук, 64))" ali "(Гацький, 46, Чуб, 57)" pomeni, da je
// tudi rezerva šla ven. Neuporabljene klopi ni. "Голи:" domači – gostje z
// minutami ("58-пен.", "75 – пен.", "90+2"), "На 58 хв. … не реалізував
// пенальті", "Попередження:" (rumeni), "Вилучення:" (rdeči; "друге
// попередження" = drugi rumeni, "по завершенню гри" = po tekmi → 90).
// Imena so ročno vnesena: strelca in kartone pripišemo ekipi po postavi, ne
// po strani pomišljaja (Vyshnivchyk 2:0 Podillia, 10. 10. 2026: domači strelec
// za pomišljajem). Vratarja zapisnik ne označi; prvi začetnik (in kdor ga
// zamenja) je vratar le kot namig (kot mlsz, ffm).
//
// Sodnikov, opazovalcev in fotografij ne beremo. Beremo odkrito (User-Agent
// SLFF, 3 s med zahtevki). Ob 401, 403, 429, izzivu ali CAPTCHI se uvoz ustavi
// (`HoffZavrnitev`, izhod 4) — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vLjubljanskiCas, NEPOPOLN } from './frf.mjs'
import { nastopi as nastopiHlf } from './hlf.mjs'

const OSNOVNI = 'https://hoff.km.ua'
const DOLZINA_TEKME = 90
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'
// Zapisnik zadnjega tedna se še popravlja (nepopoln ostane brez `imported_at`).
const SVEZE_DNI = 7
// Do te starosti seznam objav beremo svežega, če kateri tekmi z izidom manjka
// objava ali se goli ne ujemajo z izidom; starejši arhiv je dokončen.
export const PONOVNO_DNI = 45
// Postava z manj začetniki ni postava (objava brez postav, le izid).
const NAJMANJ_ZACETNIKOV = 7

// --- šifre in naslovi ---------------------------------------------------------------

/** "chho-2026-vyshha-liga" → { slug, leto: 2026 }. */
export function razberiKodo(koda) {
  const slug = String(koda ?? '').trim()
  const leto = Number(slug.match(/(?:^|-)(20\d{2})(?:-|$)/)?.[1])
  if (!/^[a-z0-9-]+$/.test(slug) || !leto) throw new Error(`hoff-km: šifra lige je slug strani z letom (npr. chho-2026-vyshha-liga), ne "${koda}"`)
  return { slug, leto }
}

export const naslovLige = (koda) => `${OSNOVNI}/${razberiKodo(koda).slug}/`
const polja = (vsebina) => `_fields=id,date,link,title${vsebina ? ',content' : ''}`
/** Seznam vseh objav leta (le id, datum, naslov), stran `stran`. */
export const naslovSeznama = (leto, stran) =>
  `${OSNOVNI}/wp-json/wp/v2/posts?after=${leto}-01-01T00:00:00&before=${leto + 1}-01-01T00:00:00` +
  `&per_page=100&page=${stran}&orderby=date&order=asc&${polja(false)}`
/** Vsebina izbranih objav (največ 100). */
export const naslovVsebine = (idji) => `${OSNOVNI}/wp-json/wp/v2/posts?include=${idji.join(',')}&per_page=100&orderby=include&${polja(true)}`
export const naslovObjave = (id) => `${OSNOVNI}/?p=${String(id).replace(/^hk/, '')}`
// Šifra zapisnika v bazi je `hk<id objave>`: id objave WordPressa (3xxxx) je v
// številskem prostoru drugih virov, `matches.zapisnik_id` pa je enoličen.
export const sifraZapisnika = (id) => `hk${String(id).replace(/^hk/, '')}`
const imeLige = (koda) => `liga-${razberiKodo(koda).slug}.html`
const imeSeznama = (leto, stran) => `seznam-${leto}-${stran}.json`
const imeVsebine = (leto, i) => `vsebina-${leto}-${i}.json`

// --- zavrnitev -------------------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class HoffZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'HoffZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
// Izziv: Cloudflare ali stran s CAPTCHO, ki ni navadna stran (članek) ali JSON
// — obrazec za komentarje z reCAPTCHO na navadni strani ni izziv.
export const jeIzziv = (besedilo) => {
  const s = String(besedilo ?? '')
  if (/<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile/i.test(s)) return true
  return /captcha/i.test(s) && !/article-post-content/.test(s) && !/^\s*[[{]/.test(s)
}

/**
 * `fetch` vira (`vir.fetch` → `prenesiSPonovitvami`): 401, 403 in 429 vržejo
 * zavrnitev takoj, preden bi prenos 429 ponovil ali uvoz razporeda vzel
 * shranjeno stran.
 */
export async function hoffFetch(url, moznosti = {}) {
  const odgovor = await fetch(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new HoffZavrnitev(`hoff-km: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let besedilo
  try {
    besedilo = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new HoffZavrnitev(`hoff-km: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(besedilo)) throw new HoffZavrnitev(`hoff-km: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return besedilo
}

/** Stran lige ima razpored (tabelo s "Господарі"). */
const jeStranLige = (html) => /article-post-content/.test(html) && /Господар/.test(html) && /<table/i.test(html)

/** JSON seznam objav (vsaka z id in naslovom; pri vsebini še `content`). */
function jeSeznam(besedilo, vsebina) {
  try {
    const d = JSON.parse(besedilo)
    return Array.isArray(d) && d.every((p) => Number.isInteger(p?.id) && p.title && (!vsebina || typeof p.content?.rendered === 'string'))
  } catch {
    return false
  }
}

/**
 * V predpomnilnik gre le prava stran lige ali prav seznam objav. Stran
 * vzdrževanja (200 s HTML), napaka WordPressa ali odrezan JSON bi sicer
 * obveljala namesto razporeda ali zapisnikov.
 */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  if (jeIzziv(besedilo)) return false
  if (/^seznam-/.test(datoteka)) return jeSeznam(besedilo, false)
  if (/^vsebina-/.test(datoteka)) return jeSeznam(besedilo, true)
  if (/^liga-|^razpored-/.test(datoteka)) return jeStranLige(besedilo)
  return true
}

// --- pomožno ---------------------------------------------------------------------------

/** Besedilo HTML: oznake proč, entitete razpakirane, apostrofi poenoteni (’). */
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/['ʼ`]/g, '’')
    .replace(/\s+/g, ' ')
    .trim()

/** "58", "90+2", "45+1" → 58, 90, 45; nad 90 → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "09.05.26" ali "31.05.2026" → "2026-05-09". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})\b/)
  if (!m) return null
  const leto = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${leto}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** Kijevski čas (EET/EEST, isti kot bukareški) → ljubljanski; brez ure ura null. */
export function casIz(datum, ura) {
  const u = String(ura ?? '').match(/(\d{1,2})[:.](\d{2})/)
  return u ? vLjubljanskiCas(datum, `${u[1].padStart(2, '0')}:${u[2]}`) : { datum, ura: null }
}

const izid = (d, g) => (Number.isInteger(d) && Number.isInteger(g) ? { domaci: d, gostje: g } : null)
const dni = (a, b) => (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000

// --- klubi ---------------------------------------------------------------------------------

const male = (s) => besedilo(s).toLocaleLowerCase('uk').replace(/[’"“”«»„]/g, '')

/** Natančno ime v abecedi vira: male črke z ukrajinskimi znaki, brez ločil in apostrofa. */
export const poenostaviUa = (ime) =>
  male(ime)
    .replace(/[^\p{L}0-9-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Isti klub pod dvema imenoma (le videni): "Колос" (2025) je "Колос Полонне"
// (2026); "ДЮСШ-2" se je po 1. krogu 2025 preimenoval v "ДЮСШ-2 Імпульс"
// (opomba pod razporedom 2025).
const IME_KLUBA = new Map([
  ['колос', 'Колос Полонне'],
  ['дюсш-2', 'ДЮСШ-2 Імпульс'],
])
/** Ime kluba s strani lige; vzdevek → stalno ime. */
export const imeKluba = (ime) => IME_KLUBA.get(poenostaviUa(ime)) ?? besedilo(ime)

/** Ključ kluba: natančno ime brez "ФК" spredaj (vzdevki v `imeKluba`). */
export const kljucKlubaUa = (ime) => poenostaviUa(imeKluba(ime)).replace(/^фк\s+/, '')

/** Kratko ime: brez "ФК" spredaj ("ФК Вишнівчик" → "Вишнівчик"). */
export const kratkoImeUa = (polno) => besedilo(imeKluba(polno)).replace(/^ФК\s+/i, '')

/**
 * Ohlapen ključ za pripis objave tekmi: prva beseda imena brez "ФК" in
 * narekovajev ("ФК “Заслав’я” Віньківці" → "заславя", "ЄВА АГРО" → "єва").
 */
export const kljucObjave = (ime) => poenostaviUa(ime).replace(/^фк\s+/, '').split(' ')[0] ?? ''

// --- razpored (stran lige) --------------------------------------------------------------

/** Vsebina strani: med `article-post-content` in koncem članka. */
function vsebinaStrani(html) {
  const s = String(html ?? '')
  const i = s.indexOf('article-post-content')
  if (i < 0) return ''
  const j = s.indexOf('</article>', i)
  return s.slice(i, j > i ? j : undefined)
}

/** Stolpec po glavi tabele. */
function stolpec(glava) {
  const g = male(glava)
  if (/^тур/.test(g)) return 'krog'
  if (/^дата/.test(g)) return 'datum'
  if (/^№/.test(g)) return 'st'
  if (/^господар/.test(g)) return 'domaci'
  if (/^гост/.test(g)) return 'gostje'
  if (/^рахун/.test(g)) return 'izid'
  if (/^час/.test(g)) return 'ura'
  return null
}

/** "6:0" | "0:3*" | "3:0 (+:-)" | "0:0**" | "2 :2" | "" → { izid, zvezdice, plusMinus }. */
export function izidCelice(s) {
  const t = besedilo(s)
  const m = t.match(/^(\d+)\s*:\s*(\d+)\s*(\*+)?\s*(\(\s*[+-]\s*:\s*[+-]\s*\))?/)
  if (!m) return { izid: null, zvezdice: null, plusMinus: false }
  return { izid: izid(Number(m[1]), Number(m[2])), zvezdice: m[3] ?? null, plusMinus: !!m[4] }
}

// Opombe pod razporedom: tehnični izid (KDK, neigra, "технічний результат") ali
// tekma, ki se še ni končala (prekinjena zaradi letalskega alarma, prestavljena).
const NI_ODIGRANA = /призупин|догра|перенес|не\s+відбу/i
const TEHNICNI = /технічн|техічн|КДК|неявк|анулюв|присуд/i

/**
 * Razpored strani lige: { ime, leto, tekme: [{ krog, st, datum, ura, domaci,
 * gostje, izid, tehnicni, opomba }] }. Krog brez številke vzame prejšnjega.
 */
export function tekmeLige(html, koda = null) {
  const v = vsebinaStrani(html)
  const ime = besedilo(String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1])
  const leto = Number(ime.match(/(20\d{2})/)?.[1]) || null
  if (koda && leto && leto !== razberiKodo(koda).leto)
    throw new Error(`hoff-km: stran ${koda} je sezona ${leto}, ne ${razberiKodo(koda).leto} — uvoz ustavljen`)
  // Opombe: "* Матч №9 – …" velja za tekmo 9, "** …" za vse z dvema zvezdicama.
  const opombe = []
  for (const m of v.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = besedilo(m[1])
    const z = t.match(/^(\*+)\s*(.*)$/)
    if (z) opombe.push({ zvezdice: z[1], st: Number(z[2].match(/Матч\s*№\s*(\d+)/i)?.[1]) || null, besedilo: z[2] })
  }
  const tekme = []
  for (const tabela of v.matchAll(/<table[\s\S]*?<\/table>/g)) {
    let stolpci = null
    let krog = null
    for (const vr of tabela[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const celice = [...vr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => besedilo(c[1]))
      if (!stolpci) {
        const s = celice.map(stolpec)
        if (s.includes('domaci') && s.includes('gostje')) stolpci = s
        continue
      }
      const po = Object.fromEntries(stolpci.map((s, i) => [s, celice[i] ?? '']).filter(([s]) => s))
      if (!po.domaci || !po.gostje || !/\p{L}/u.test(po.domaci)) continue
      const k = Number(String(po.krog ?? '').match(/(\d+)/)?.[1])
      if (k) krog = k
      const datum = datumIz(po.datum)
      const { izid: iz, zvezdice, plusMinus } = izidCelice(po.izid)
      const st = Number(String(po.st ?? '').match(/(\d+)/)?.[1]) || null
      const opomba = zvezdice
        ? (opombe.find((o) => o.zvezdice === zvezdice && o.st === st) ?? opombe.find((o) => o.zvezdice === zvezdice && !o.st))?.besedilo ?? null
        : null
      const niOdigrana = !!opomba && NI_ODIGRANA.test(opomba)
      tekme.push({
        krog,
        st,
        ...casIz(datum, po.ura ?? po.datum?.replace(/^\S+\s*/, '')),
        domaci: imeKluba(po.domaci),
        gostje: imeKluba(po.gostje),
        izid: niOdigrana ? null : iz,
        tehnicni: !niOdigrana && !!iz && (plusMinus || (!!zvezdice && (!opomba || TEHNICNI.test(opomba)))),
        opomba,
      })
    }
  }
  return { ime, leto, tekme }
}

// --- objave (zapisniki) ------------------------------------------------------------------

/** Odstavki vsebine objave kot vrstice besedila (`<br>` = nova vrstica). */
export function vrsticeObjave(html) {
  const out = []
  for (const m of String(html ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    // Oznake proč brez presledka: "1</strong><strong>0:1" je izid 10:1, ne "1 0:1".
    for (const v of m[1].split(/<br\s*\/?>/i)) {
      const t = besedilo(v.replace(/<[^>]+>/g, ''))
      if (t) out.push(t)
    }
  }
  return out
}

/** Naslov objave → [domači, gostje] ("ЧЕМПІОНАТ ОБЛАСТІ: A – B", "ЧХО-2025. 14 ТУР. A – B"). */
export function kluboviNaslova(naslov) {
  const t = besedilo(naslov).replace(/^.*(?::|ТУР\.)\s*/i, '')
  const d = t.split(/\s+[–—-]\s+/)
  return d.length === 2 ? d.map((x) => x.trim()) : null
}

/** Krog iz naslova ali prve vrstice ("Матч 15 туру", "14 ТУР", "7 тур"). */
export function krogObjave(naslov, vrstice) {
  const iz = (s) => Number(String(s ?? '').match(/(?:Матч\s+)?(\d+)\s*(?:-?й\s*)?тур/i)?.[1]) || null
  return { naslov: iz(besedilo(naslov).replace(/^ЧХО-\d{4}\.?\s*/i, '')), telo: iz(vrstice.slice(0, 3).join(' ')) }
}

/** Razdeli besedilo na vrhnji ravni (zunaj oklepajev) pri pomišljaju s presledki. */
function stranPomisljaja(s) {
  const deli = ['']
  let globina = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(') globina++
    else if (c === ')') globina = Math.max(0, globina - 1)
    if (globina === 0 && /[–—-]/.test(c) && s[i - 1] === ' ' && s[i + 1] === ' ') {
      deli.push('')
      continue
    }
    deli[deli.length - 1] += c
  }
  return deli.map((x) => x.trim().replace(/^[,.;\s]+|[,.;\s]+$/g, ''))
}

/** Ime igralca brez oznake kapetana in ločil. */
const cistoIme = (s) =>
  besedilo(s)
    .replace(/\s*[–—-]\s*к(?!\p{L})\.?/iu, '')
    .replace(/\(к\)/i, '')
    .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, '')
    .replace(/\s+/g, ' ')

/**
 * Postava ene ekipe iz vrstice ("Слободян, Антонюк – к (Пудло, 45), …").
 * Vrne { igralci: [{ ime, kapetan, zacetnik, preklopi, zamenjal }], opozorila }.
 * V oklepaju so rezerve z minuto vstopa; zaporedje imen in minut je veriga:
 * "(Чабак, 20 (Омельчук, 64))" in "(Гацький, 46, Чуб, 57)" — druga rezerva
 * zamenja prvo. Ime v oklepaju brez minute za sabo (neuravnotežen oklepaj,
 * "Чуб (Діденко (46), Пожидаєв (…)") je nov začetnik.
 */
export function postavaIzVrstice(s) {
  // Konec stavka (pika za besedo, ne za začetnico "Бойко З.") po vsaj enajstih
  // začetnikih je konec postave; za njim je ostanek ročnega vnosa (Олімп :
  // Єва Агро, 6. 9. 2026: "… Омельчук. (Муляр, 63), Гудзь, …").
  for (const m of String(s ?? '').matchAll(/\p{L}{3}\.(?=\s|$)/gu)) {
    const konec = m.index + m[0].length
    const ostanek = String(s).slice(konec)
    if (!/\p{L}/u.test(ostanek)) break
    const pred = postavaIzVrstice(String(s).slice(0, konec))
    if (pred.igralci.filter((x) => x.zacetnik).length >= 11) {
      pred.opozorila.push(`postava: za koncem stavka je še "${ostanek.trim().slice(0, 40)}…" — izpuščeno`)
      return pred
    }
  }
  const opozorila = []
  const zetoni = []
  for (const m of String(s ?? '').matchAll(/\(|\)|,|;|\d+(?:\s*\+\s*\d+)?|[^(),;\d]+/g)) {
    const t = m[0].trim()
    if (!t) continue
    if (t === '(' || t === ')' || t === ',' || t === ';') zetoni.push({ v: t })
    else if (/^\d/.test(t)) zetoni.push({ v: 'min', min: minuta(t) })
    else {
      const ime = cistoIme(t)
      if (ime && /\p{L}{2}/u.test(ime)) zetoni.push({ v: 'ime', ime, kapetan: /[–—-]\s*к(?!\p{L})|\(к\)/iu.test(t) })
    }
  }
  const igralci = []
  let globina = 0
  let zadnji = null // kdo je na igrišču na tem mestu (za verigo menjav)
  for (let i = 0; i < zetoni.length; i++) {
    const z = zetoni[i]
    if (z.v === '(') globina++
    if (z.v === ')') { globina = Math.max(0, globina - 1); continue }
    // Oklepaj takoj za vejico: rezerva prejšnjega začetnika ("Закорчменний,
    // (Бондаренко Максим, 79)"), če ta še ni bil zamenjan; sicer manjka
    // začetnik ("Самсонюк (Пахно, 85),  (Муляр, 90+3)") in rezerva ne sme
    // zamenjati igralca prejšnjega mesta.
    if (z.v === '(' && globina === 1 && [',', ';'].includes(zetoni[i - 1]?.v) && !(zadnji?.zacetnik && !zadnji.preklopi.length)) zadnji = null
    if (z.v !== 'ime') continue
    // Naslednji pomenljiv žeton (vejice in oklepaji ne štejejo).
    let j = i + 1
    while (j < zetoni.length && [',', '(', ';'].includes(zetoni[j].v)) j++
    const minZa = zetoni[j]?.v === 'min' ? zetoni[j].min : null
    if (globina > 0 && minZa != null) {
      if (zadnji) zadnji.preklopi.push(minZa)
      else opozorila.push(`postava: rezerva "${z.ime}" (${minZa}) brez igralca, ki ga je zamenjala`)
      const rez = { ime: z.ime, kapetan: z.kapetan, zacetnik: false, preklopi: [minZa], zamenjal: zadnji }
      igralci.push(rez)
      zadnji = rez
      // Minuto porabimo, oklepaje med imenom in minuto prav tako.
      for (let k = i + 1; k <= j; k++) if (zetoni[k].v === '(') globina++
      i = j
      continue
    }
    // "(Григор’єв)": rezerva brez minute vstopa. Nastopa ne moremo izračunati —
    // ostane na klopi (brez nastopa), zamenjani igralec pa na igrišču.
    if (globina > 0 && zetoni[i + 1]?.v === ')') {
      opozorila.push(`postava: menjava "${z.ime}" brez minute — rezerva brez nastopa`)
      igralci.push({ ime: z.ime, kapetan: z.kapetan, zacetnik: false, preklopi: [], zamenjal: null })
      continue
    }
    if (globina > 0) {
      opozorila.push(`postava: "${z.ime}" v oklepaju brez minute — štejem ga kot začetnika`)
      globina = 0
    }
    const zac = { ime: z.ime, kapetan: z.kapetan, zacetnik: true, preklopi: [], zamenjal: null }
    igralci.push(zac)
    zadnji = zac
  }
  return { igralci, opozorila }
}

const besedeImena = (ime) => male(ime).replace(/[-.]/g, ' ').split(/\s+/).filter(Boolean)
// Ruske črke in zamenljive samoglasnike poenotimo le za ohlapno primerjavo
// (dogodek "Шаврын", postava "Шаврін").
const ohlapno = (b) => b.replace(/[ыиіїй]/g, 'и').replace(/[эєеё]/g, 'е').replace(/[ъь’]/g, '')

/**
 * Igralec ekipe po imenu iz dogodka: natančno ime, sicer priimek (prva beseda)
 * in, če ga dogodek ima, začetek imena. Dvoumno ali neznano → null.
 */
export function najdiIgralca(ime, igralci) {
  const b = besedeImena(ime)
  // "Іван Козар" (ime pred priimkom): poskusimo še obrnjeno.
  return poImenu(b, igralci) ?? (b.length === 2 ? poImenu([b[1], b[0]], igralci) : null)
}

function poImenu(b, igralci) {
  if (!b.length) return null
  const natancno = igralci.filter((x) => besedeImena(x.ime).join(' ') === b.join(' '))
  if (natancno.length === 1) return natancno[0]
  const poPriimku = igralci.filter((x) => besedeImena(x.ime)[0] === b[0])
  if (b.length === 1) return poPriimku.length === 1 ? poPriimku[0] : null
  const zImenom = poPriimku.filter((x) => {
    const ib = besedeImena(x.ime)
    return ib.length === 1 || ib[1].startsWith(b[1]) || b[1].startsWith(ib[1])
  })
  if (zImenom.length === 1) return zImenom[0]
  // Edini s tem priimkom, a z drugim imenom: zatipkano ime ("Олександр"/"Олексій").
  if (poPriimku.length === 1) return poPriimku[0]
  if (poPriimku.length) return null
  // Zatipkan priimek (ruska črka): ohlapno, a le enoličen zadetek.
  const ohl = igralci.filter((x) => ohlapno(besedeImena(x.ime)[0]) === ohlapno(b[0]))
  return ohl.length === 1 ? ohl[0] : null
}

// Avtogol: "а/г", "аг", "автогол", "у свої ворота".
const AVTOGOL = /автогол|у\s+свої|(^|[^\p{L}])а\s*\/?\s*г([^\p{L}]|$)/iu

/** Postavka "Олійник Владислав (18, 32)" → { ime, oklepaj }. */
function postavke(s) {
  const out = []
  for (const m of String(s ?? '').matchAll(/([^,()]*?\p{L}[^,()]*?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gu)) {
    const ime = cistoIme(m[1].replace(/^\s*(?:та|і)\s+/, ''))
    if (ime) out.push({ ime, oklepaj: m[2] })
  }
  return out
}

/**
 * Objava → zapisnik (brez imen klubov, kroga in sezone — te da razpored).
 * Null, če objava nima obeh postav. `imeni` = [domači, gostje] z razporeda.
 */
export function vZapisnik(objava, { imeni = null, datum = null, danes = Date.now() } = {}) {
  const vrstice = vrsticeObjave(objava?.content?.rendered)
  const opozorila = []
  // Glava: "“A” Mesto – “B” Mesto 4:1 (3:0)".
  const glava = vrstice.slice(0, 4).find((v) => /\s[–—-]\s/.test(v) && /\d+\s*:\s*\d+/.test(v)) ?? ''
  const g = glava.match(/(\d+)\s*:\s*(\d+)(?:\s*\(\s*(\d+)\s*:\s*(\d+)\s*\))?/)
  const izidGlave = g ? izid(Number(g[1]), Number(g[2])) : null
  const polcas = g?.[3] != null ? izid(Number(g[3]), Number(g[4])) : null

  // Postavi: vrstica "<ekipa>: ime, ime, …" z vsaj šestimi vejicami.
  const KLJUCNE = /^(Гол|Попередж|Вилучен|Арбіт|Асистен|Спостер|Інспект|Делегат|Відео|Чемпіонат|На\s+\d|Тренер|Головний)/i
  const postave = []
  for (const v of vrstice) {
    const i = v.indexOf(':')
    if (i < 1 || i > 60 || KLJUCNE.test(v)) continue
    const ostanek = v.slice(i + 1)
    if ((ostanek.match(/,/g) ?? []).length < 6) continue
    postave.push({ oznaka: v.slice(0, i), ...postavaIzVrstice(ostanek) })
  }
  if (postave.length < 2) return null
  // Postavo pripišemo klubu po oznaki ("“Оболонь-Чемерівці”"), sicer po vrstnem redu.
  let [dom, gos] = postave.slice(0, 2)
  if (imeni) {
    const k = imeni.map(kljucObjave)
    const ko = postave.slice(0, 2).map((p) => kljucObjave(p.oznaka))
    if (ko[0] === k[1] && ko[1] === k[0]) [dom, gos] = [gos, dom]
    else if (!(ko[0] === k[0] && ko[1] === k[1])) opozorila.push(`postavi "${dom.oznaka}" / "${gos.oznaka}" se ne ujemata z imenoma klubov — vzeti po vrstnem redu`)
  }
  const ekipe = [dom, gos]
  for (const [idx, e] of ekipe.entries()) {
    for (const o of e.opozorila) opozorila.push(`${imeni?.[idx] ?? e.oznaka}: ${o}`)
    e.igralci.forEach((x) => (x.ekipaIdx = idx))
  }
  if (ekipe.some((e) => e.igralci.filter((x) => x.zacetnik).length < NAJMANJ_ZACETNIKOV)) return null

  // Isto ime dvakrat v ekipi (Єва Агро: "Шуляк" začetnik in rezerva) je napaka
  // vnosa: drugi vnos izpustimo, sicer bi isti igralec dobil dva nastopa.
  for (const [idx, e] of ekipe.entries()) {
    const videni = new Map()
    e.igralci = e.igralci.filter((x) => {
      const k = besedeImena(x.ime).join(' ')
      if (!videni.has(k)) { videni.set(k, x); return true }
      opozorila.push(`${imeni?.[idx] ?? e.oznaka}: ${x.ime} je v postavi dvakrat — drugi vnos izpuščen`)
      // Rezerva, ki je ni: kdor jo je "zamenjal", ostane na igrišču.
      if (x.zamenjal) x.zamenjal.preklopi = x.zamenjal.preklopi.filter((m) => m !== x.preklopi[0])
      return false
    })
  }
  const vsi = ekipe.flatMap((e) => e.igralci)
  const vEkipi = (ime, strani) => {
    const zadetki = [0, 1].map((idx) => najdiIgralca(ime, ekipe[idx].igralci))
    if (zadetki[0] && !zadetki[1]) return zadetki[0]
    if (zadetki[1] && !zadetki[0]) return zadetki[1]
    // V obeh ekipah (isti priimek): odloči stran pomišljaja.
    if (zadetki[0] && zadetki[1] && strani != null) return zadetki[strani]
    return null
  }

  // Goli: "Голи: A (18, 32), B (44) – C (61)."; ekipo pove postava, stran
  // pomišljaja le, kadar je ime v obeh ali v nobeni.
  const goli = []
  for (const v of vrstice.filter((x) => /^Голи?\s*:/i.test(x))) {
    const strani = stranPomisljaja(v.replace(/^Голи?\s*:\s*/i, ''))
    strani.slice(0, 2).forEach((del, stran) => {
      const dveStrani = strani.length > 1
      const vrsta = postavke(del).map((p) => {
        // Avtogol pri minuti ("6 – а/г", "75–а/г") ali pri edini minuti ("(34, автогол)").
        const deli = p.oklepaj.split(/,/).map((x) => x.trim())
        const minute = deli.filter((x) => /\d/.test(x))
        const vseAg = AVTOGOL.test(p.oklepaj) && minute.length === 1
        const zadetki = minute.map((m) => ({ m, avtogol: vseAg || AVTOGOL.test(m) }))
        const igralec = vEkipi(p.ime, dveStrani ? stran : null)
        const steje = (x) => (igralec ? (x.avtogol ? 1 - igralec.ekipaIdx : igralec.ekipaIdx) : null)
        return { p, zadetki, igralec, steje }
      })
      // Brez pomišljaja so goli ene ekipe (npr. 7:0): neznan strelec gre k
      // ekipi znanih strelcev, če so vsi iz ene.
      const znane = new Set(vrsta.flatMap((x) => x.zadetki.map(x.steje)).filter((x) => x != null))
      const privzeta = dveStrani ? stran : znane.size === 1 ? [...znane][0] : null
      for (const { p, zadetki, igralec, steje } of vrsta) {
        // Ekipa, ki ji gol šteje: igralčeva (pri avtogolu nasprotna); brez
        // igralca stran pomišljaja ali ekipa ostalih strelcev, sicer domači.
        if (igralec && dveStrani && zadetki.some((x) => steje(x) !== stran))
          opozorila.push(`strelec ${p.ime} je zapisan na strani druge ekipe — gol pripisan njegovi ekipi`)
        if (!igralec) opozorila.push(`strelec ${p.ime} ni v postavi — gol brez strelca${privzeta == null ? ', pripisan domačim' : ''}`)
        for (const x of zadetki) {
          const zanje = privzeta ?? 0
          const ekipaIdx = igralec ? igralec.ekipaIdx : x.avtogol ? 1 - zanje : zanje
          goli.push({ ekipaIdx, igralec, imeDogodka: p.ime, minuta: minuta(x.m), avtogol: x.avtogol, enajstmetrovka: !x.avtogol && /пен/i.test(x.m) })
        }
      }
    })
  }

  // Zgrešene 11-metrovke: "На 58 хв. Тринадцятко Олег не реалізував пенальті",
  // "На 45 хв. A (“Клуб”) та на 76 хв. B (“Клуб”) – не реалізували пенальті".
  const zgresene = []
  for (const v of vrstice.filter((x) => /не\s+реаліз/i.test(x))) {
    for (const m of v.matchAll(/(\d+(?:\s*\+\s*\d+)?)\s*хв\.?\s*([^(–—]+?)\s*(?=\(|[–—]|\sта\s|\sне\s)/gi)) {
      const igralec = vEkipi(m[2], null)
      if (igralec) zgresene.push({ igralec, imeDogodka: besedilo(m[2]), minuta: minuta(m[1]) })
      else opozorila.push(`zgrešena 11 m: ${besedilo(m[2])} ni v postavi`)
    }
  }

  // Kartoni: "Попередження: A (61), B (75) – C (50)." in "Вилучення: A (80 – …)".
  const rumeni = []
  const rdeci = []
  for (const v of vrstice.filter((x) => /^(Попередж|Вилучен)\S*\s*:/i.test(x))) {
    const rdec = /^Вилучен/i.test(v)
    const strani = stranPomisljaja(v.replace(/^\S+\s*:\s*/, ''))
    strani.slice(0, 2).forEach((del, stran) => {
      for (const p of postavke(del)) {
        // Karton trenerja ali predstavnika ("тренер Пташник В.П") ne šteje.
        if (/^(тренер|головний|представник|лікар|адміністратор)/i.test(p.ime)) continue
        const igralec = vEkipi(p.ime, strani.length > 1 ? stran : null)
        if (!igralec) { opozorila.push(`${rdec ? 'rdeči' : 'rumeni'} karton: ${p.ime} ni v postavi (ali je dvoumen)`); continue }
        // "по завершенню гри" (po tekmi) ali brez minute → 90.
        const min = /по\s+завершен|після/i.test(p.oklepaj) ? DOLZINA_TEKME : (minuta(p.oklepaj) ?? DOLZINA_TEKME)
        if (rdec) {
          if (!rdeci.some((r) => r.igralec === igralec)) rdeci.push({ igralec, minuta: min, drugiRumeni: /друг\S*\s+(попередж|жовт)/i.test(p.oklepaj) })
        } else rumeni.push({ igralec, minuta: min })
      }
    })
  }
  // Drugi rumeni: 1 rumeni + 1 rdeči, kot pri drugih virih.
  for (const r of rdeci.filter((x) => x.drugiRumeni)) {
    const moji = rumeni.filter((x) => x.igralec === r.igralec)
    for (const x of moji.slice(1)) rumeni.splice(rumeni.indexOf(x), 1)
    if (!moji.length) rumeni.push({ igralec: r.igralec, minuta: r.minuta })
  }

  // Menjave (pari): rezerva in kdor ji je prepustil mesto.
  const menjave = vsi.filter((x) => !x.zacetnik && x.preklopi.length).map((x) => ({ igralec: x, ven: x.zamenjal, minuta: x.preklopi[0] }))

  // Vratar (namig): prvi začetnik in kdor ga je zamenjal (veriga).
  for (const e of ekipe) {
    let v = e.igralci.find((x) => x.zacetnik)
    while (v) {
      v.vratar = true
      v = e.igralci.find((x) => x.zamenjal === v)
    }
  }

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  const goliIzid = izid(zaEkipo(0), zaEkipo(1))
  let nepopoln = false
  for (const [idx, e] of ekipe.entries()) {
    const n = e.igralci.filter((x) => x.zacetnik).length
    if (n !== 11) opozorila.push(`${imeni?.[idx] ?? e.oznaka}: v postavi je ${n} igralcev namesto 11`)
  }
  if (izidGlave && (goliIzid.domaci !== izidGlave.domaci || goliIzid.gostje !== izidGlave.gostje)) {
    const neujemanje = `goli iz objave (${goliIzid.domaci}:${goliIzid.gostje}) se ne ujemajo z izidom ${izidGlave.domaci}:${izidGlave.gostje}`
    // Objava zadnjega tedna se še popravlja: nepopolna (brez `imported_at`), nočni uvoz jo bere znova.
    nepopoln = datum != null && (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 <= SVEZE_DNI
    opozorila.push(nepopoln ? `${NEPOPOLN}: ${neujemanje} — objava se še dopolnjuje` : neujemanje)
  }
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  return { ekipe, goli, zgresene, rumeni, rdeci, menjave, izidGlave, polcas, opozorila, nepopoln }
}

/**
 * Stalna imena v sezoni. Objave pišejo večinoma le priimek, ime le ob
 * soimenjaku ali pri strelcu ("Олійник" v postavi, "Олійник Владислав" pri
 * golu), kdaj pa ista oseba nastopi kot "Матанчук", "Матанчук Денис" in
 * "Матанчук Д.". Uvoz igralca najde po polnem imenu, nočni uvoz pa znova uvozi
 * le zadnjih 21 dni — ime, ki bi se spremenilo z novejšo objavo, bi enega
 * igralca razdelilo na dva (zdruzi-duplikate različnih imen ne združi).
 *
 * Zato gremo skozi objave po vrsti (datum, id) in vsaki osebi kluba damo ime,
 * kot ga je postava napisala ob njenem PRVEM nastopu; poznejša oblika
 * (golo ime, ime, začetnica) se pripiše obstoječi osebi le na podlagi
 * prejšnjih objav in iste objave. Nova objava tako ne spremeni nobenega
 * imena, ki je že bilo — vsak zagon da za staro tekmo isto ime. Imena iz
 * golov in postav ("Денис") se le naučimo, da poznejše oblike najdejo osebo.
 * Dvoumno (dva Бойка, golo "Бойко") ostane, kot je napisano.
 *
 * `razclenjene`: [{ r, klubi: [ključ domačih, ključ gostov], datum, id }].
 */
export function poenotiImena(razclenjene) {
  const jeZacetnica = (i) => i.length <= 2
  const kljucBesed = (b) => b.map(ohlapno)
  // ključ kluba → priimek (ohlapno) → [{ ime, kljuc, imena: Set, zacetnice: Set }]
  const osebe = new Map()
  const zaPriimek = (klub, priimek) => {
    if (!osebe.has(klub)) osebe.set(klub, new Map())
    const m = osebe.get(klub)
    if (!m.has(priimek)) m.set(priimek, [])
    return m.get(priimek)
  }
  const nauci = (o, b) => {
    if (b.length !== 2) return
    if (jeZacetnica(b[1])) o.zacetnice.add(b[1][0])
    else o.imena.add(b[1])
  }
  // Polna imena najprej, nato začetnice, nato gola imena: "Матанчук Андрій"
  // zasede svojo osebo, preden golo "Матанчук" izbira med ostalimi.
  const vrsta = (b) => (b.length === 1 ? 2 : b.length === 2 && jeZacetnica(b[1]) ? 1 : 0)
  const red = [...razclenjene].sort((a, b) => String(a.datum ?? '').localeCompare(String(b.datum ?? '')) || (Number(a.id) || 0) - (Number(b.id) || 0))
  for (const { r, klubi } of red) {
    const osebaIgralca = new Map()
    r.ekipe.forEach((e, idx) => {
      const zasedene = new Set()
      const igralci = e.igralci.map((x) => ({ x, b: kljucBesed(besedeImena(x.ime)) })).filter((y) => y.b.length)
      for (const { x, b } of igralci.sort((p, q) => vrsta(p.b) - vrsta(q.b))) {
        const vse = zaPriimek(klubi[idx], b[0])
        const prosti = vse.filter((o) => !zasedene.has(o))
        const brezImena = prosti.filter((o) => !o.imena.size && !o.zacetnice.size)
        let o = prosti.filter((y) => y.kljuc === b.join(' '))
        o = o.length === 1 ? o[0] : null
        if (!o && b.length === 2 && !jeZacetnica(b[1])) {
          const zImenom = prosti.filter((y) => y.imena.has(b[1]))
          const brezDrugega = prosti.filter((y) => !y.imena.size && [...y.zacetnice].every((z) => b[1].startsWith(z)))
          o = zImenom.length === 1 ? zImenom[0] : !zImenom.length && brezDrugega.length === 1 ? brezDrugega[0] : null
        } else if (!o && b.length === 2) {
          const sZacetnico = prosti.filter((y) => y.zacetnice.has(b[1][0]) || [...y.imena].some((i) => i.startsWith(b[1][0])))
          o = sZacetnico.length === 1 ? sZacetnico[0] : !sZacetnico.length && brezImena.length === 1 ? brezImena[0] : null
        } else if (!o && b.length === 1) {
          // Golo ime: edina prosta oseba s tem priimkom, sicer edina, ki jo
          // postava piše golo.
          const gole = prosti.filter((y) => y.kljuc === b[0])
          o = prosti.length === 1 ? prosti[0] : gole.length === 1 ? gole[0] : null
        }
        if (!o) {
          o = { ime: x.ime, kljuc: b.join(' '), imena: new Set(), zacetnice: new Set() }
          vse.push(o)
        }
        nauci(o, b)
        zasedene.add(o)
        osebaIgralca.set(x, o)
        x.ime = o.ime
      }
    })
    // Ime strelca ali zgrešene 11 m ("Матанчук Денис") pove ime osebe za naprej.
    for (const g of [...r.goli, ...r.zgresene]) {
      const o = g.igralec && g.imeDogodka ? osebaIgralca.get(g.igralec) : null
      const b = kljucBesed(besedeImena(String(g.imeDogodka ?? '').replace(/\s*[–—-]\s*к$/i, '')))
      if (o && b[0] === kljucBesed(besedeImena(o.ime))[0]) nauci(o, b)
    }
  }
}

// --- pripis objav tekmam --------------------------------------------------------------------

/**
 * Objave tekem lige: { tekma (iz razporeda), objava }. Objava pripada tekmi,
 * če se par klubov iz naslova (ali glave) ujema; med več takimi odloči krog
 * v naslovu ali besedilu, nato najbližji datum objave (objava je na dan tekme
 * ali kasneje). Vsaka objava gre le eni tekmi.
 */
export function pripisiObjave(tekme, objave) {
  const kandidati = objave.map((o) => {
    const vr = vrsticeObjave(o.content?.rendered)
    const pari = []
    const n = kluboviNaslova(o.title?.rendered)
    if (n) pari.push(n.map(kljucObjave))
    const glava = vr.slice(0, 4).find((v) => /\s[–—-]\s/.test(v) && /\d+\s*:\s*\d+/.test(v))
    if (glava) {
      const d = glava.replace(/\s*\d+\s*:\s*\d+[\s\S]*$/, '').split(/\s+[–—-]\s+/)
      if (d.length === 2) pari.push(d.map(kljucObjave))
    }
    return { o, pari, krog: krogObjave(o.title?.rendered, vr), datum: String(o.date ?? '').slice(0, 10) }
  })
  const porabljene = new Set()
  const out = new Map()
  const zaTekmo = (t) => {
    const k = [kljucObjave(t.domaci), kljucObjave(t.gostje)]
    const ujema = (c, obrnjen) => c.pari.some((p) => (obrnjen ? p[0] === k[1] && p[1] === k[0] : p[0] === k[0] && p[1] === k[1]))
    let c = kandidati.filter((x) => !porabljene.has(x.o.id) && ujema(x, false))
    if (!c.length) c = kandidati.filter((x) => !porabljene.has(x.o.id) && ujema(x, true))
    // Objava pred tekmo (več kot dan) ni njen zapisnik.
    if (t.datum) c = c.filter((x) => !x.datum || dni(x.datum, t.datum) >= -1)
    const poKrogu = c.filter((x) => x.krog.naslov === t.krog || x.krog.telo === t.krog)
    const izbor = (poKrogu.length ? poKrogu : c.filter((x) => !t.datum || dni(x.datum, t.datum) <= 14))
      .sort((a, b) => Math.abs(dni(a.datum, t.datum ?? a.datum)) - Math.abs(dni(b.datum, t.datum ?? b.datum)))[0]
    return izbor ?? null
  }
  // Najprej tekme z jasnim krogom, da napačno oštevilčena objava ne vzame tuje.
  for (const t of [...tekme].sort((a, b) => String(a.datum).localeCompare(String(b.datum)))) {
    if (!t.izid) continue
    const izbor = zaTekmo(t)
    if (izbor) {
      porabljene.add(izbor.o.id)
      out.set(t, izbor.o)
    }
  }
  return out
}

// --- branje -----------------------------------------------------------------------------------

/** Stran lige (vedno sveža: razpored je živ dokument). */
async function stranLige(koda, prenesi) {
  const html = await beri(prenesi, naslovLige(koda), imeLige(koda), true)
  if (!jeStranLige(html)) throw new Error(`hoff-km: ${naslovLige(koda)} nima razporeda (tabele) — uvoz ustavljen`)
  const r = tekmeLige(html, koda)
  if (!r.tekme.length) throw new Error(`hoff-km: razpored ${koda} je brez tekem — uvoz ustavljen`)
  return r
}

// Objava tekme ЧХО: "Чемпіонат Хмельницької області – 2026." (ne veterani, ne mladi).
const jeObjavaTekme = (o, leto) => {
  const t = besedilo(o.title?.rendered)
  return /^(ЧЕМПІОНАТ ОБЛАСТІ\s*:|ЧХО\s*[–-]?\s*\d{4})/i.test(t) && !/ВЕТЕРАН|40\+|U-?\d|ДЮФЛ|ЖІН/i.test(t) && (!/\d{4}/.test(t) || t.includes(String(leto)))
}

/** Objave tekem leta (seznam vseh objav, filter po naslovu, nato vsebina po 100). */
export async function objaveLeta(leto, prenesi, sveze) {
  const seznam = []
  for (let stran = 1; stran <= 20; stran++) {
    let s
    try {
      s = await beri(prenesi, naslovSeznama(leto, stran), imeSeznama(leto, stran), sveze)
    } catch (e) {
      // Stran za koncem: WordPress vrne 400 (rest_post_invalid_page_number).
      if (stran > 1 && e.status === 400) break
      throw e
    }
    if (!jeSeznam(s, false)) throw new Error(`hoff-km: seznam objav ${leto} (stran ${stran}) ni JSON — uvoz ustavljen`)
    const d = JSON.parse(s)
    seznam.push(...d)
    if (d.length < 100) break
  }
  const tekme = seznam.filter((o) => jeObjavaTekme(o, leto)).sort((a, b) => a.id - b.id)
  const out = []
  for (let i = 0; i < tekme.length; i += 100) {
    const ids = tekme.slice(i, i + 100).map((o) => o.id)
    const s = await beri(prenesi, naslovVsebine(ids), imeVsebine(leto, i / 100), sveze)
    if (!jeSeznam(s, true)) throw new Error(`hoff-km: vsebina objav ${leto} ni JSON — uvoz ustavljen`)
    out.push(...JSON.parse(s))
  }
  return out.filter((o) => /Арбіт|Гол|“[^”]+”\s*:/.test(o.content?.rendered ?? ''))
}

/** Sezona v oznaki uvoza (koledarska): "2026". */
const sezonaLeta = (leto) => String(leto)

/**
 * Tekme lige z objavami: [{ tekma, objava, r }] (r = razčlenjena objava ali
 * null). `sveze` za seznam objav: tekoče leto vedno, arhiv iz predpomnilnika,
 * a če kateri tekmi do 45 dni manjka objava ali je nepopolna, še enkrat svež.
 */
export async function tekmeZObjavami(koda, prenesi, { danes = Date.now() } = {}) {
  const liga = await stranLige(koda, prenesi)
  const { leto } = razberiKodo(koda)
  const letos = new Date(danes).getUTCFullYear()
  const zadnja = liga.tekme.filter((t) => t.izid && t.datum).map((t) => t.datum).sort().at(-1)
  const ziva = (t) => t.izid && t.datum && (danes - Date.parse(`${t.datum}T00:00:00Z`)) / 86400000 <= PONOVNO_DNI
  let sveze = leto >= letos
  const sestavi = async (sv) => {
    const objave = await objaveLeta(leto, prenesi, sv)
    const pari = pripisiObjave(liga.tekme, objave)
    return liga.tekme.map((t) => {
      const o = pari.get(t) ?? null
      const r = o ? vZapisnik(o, { imeni: [t.domaci, t.gostje], datum: t.datum, danes }) : null
      return { tekma: t, objava: o, r }
    })
  }
  let vse = await sestavi(sveze)
  if (!sveze && zadnja && vse.some((x) => ziva(x.tekma) && !x.tekma.tehnicni && (!x.r || x.r.nepopoln))) vse = await sestavi((sveze = true))
  poenotiImena(vse.filter((x) => x.r).map((x) => ({
    r: x.r,
    klubi: [kljucKlubaUa(x.tekma.domaci), kljucKlubaUa(x.tekma.gostje)],
    datum: String(x.objava.date ?? ''),
    id: x.objava.id,
  })))
  return { liga, vse }
}

/** Tehnični izid brez objave s postavami, starejši od tedna: kontumacija. */
const jeKontumacija = (x, danes) => !!x.tekma.tehnicni && !x.r && !!x.tekma.datum && (danes - Date.parse(`${x.tekma.datum}T00:00:00Z`)) / 86400000 > SVEZE_DNI

/** Razčlenjena objava → zapisnik v obliki drugih virov. */
export function zapisnikTekme({ tekma: t, objava: o, r }, sezona) {
  const ime = (x) => x?.ime ?? null
  const vObliko = (x) => ({
    st: null,
    ime: x.ime,
    regSt: null,
    zacetnik: x.zacetnik,
    kapetan: !!x.kapetan,
    vratar: !!x.vratar,
    pozicija: x.vratar ? 'GK' : null,
    preklopi: [...x.preklopi].sort((a, b) => a - b),
  })
  const sestava = r.ekipe.map((e, idx) => ({
    ime: idx === 0 ? t.domaci : t.gostje,
    postava: e.igralci.filter((x) => x.zacetnik).map(vObliko),
    rezerve: e.igralci.filter((x) => !x.zacetnik).map(vObliko),
  }))
  const kdo = (x) => ({ ekipaIdx: x.ekipaIdx, st: null, ime: x.ime, regSt: null })
  const opozorila = [...r.opozorila]
  // Uradni izid je izid razporeda (tehnični izid KDK velja za tekmo in
  // lestvico); prejeti goli in čista mreža igralcev so z igrišča.
  const igrisce = r.izidGlave ?? izid(
    r.goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === 0).length,
    r.goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === 1).length,
  )
  const tehnicnaPoraza = !!t.tehnicni && (igrisce.domaci !== t.izid.domaci || igrisce.gostje !== t.izid.gostje)
  if (tehnicnaPoraza) opozorila.push(`tehnični izid: ${t.izid.domaci}:${t.izid.gostje} za zeleno mizo, na igrišču ${igrisce.domaci}:${igrisce.gostje}`)
  else if (r.izidGlave && (r.izidGlave.domaci !== t.izid.domaci || r.izidGlave.gostje !== t.izid.gostje))
    opozorila.push(`izid objave ${r.izidGlave.domaci}:${r.izidGlave.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
  const id = sifraZapisnika(o.id)
  return {
    zapisnikId: id,
    url: o.link ?? naslovObjave(o.id),
    sezona,
    krog: t.krog,
    datum: t.datum,
    ura: t.ura,
    liga: null,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: t.izid,
    ...(tehnicnaPoraza ? { tehnicnaPoraza: true, izidIgrisca: igrisce } : {}),
    polcas: r.polcas,
    goli: r.goli.map((g) => ({
      ...(g.igralec ? kdo(g.igralec) : { ekipaIdx: g.ekipaIdx, st: null, ime: null, regSt: null }),
      minuta: g.minuta,
      avtogol: g.avtogol,
      enajstmetrovka: g.enajstmetrovka,
    })),
    zgresene: r.zgresene.map((x) => ({ ...kdo(x.igralec), minuta: x.minuta })),
    rumeni: r.rumeni.map((x) => ({ ...kdo(x.igralec), minuta: x.minuta })),
    rdeci: r.rdeci.map((x) => ({ ...kdo(x.igralec), minuta: x.minuta })),
    menjave: r.menjave.map((m) => ({ ekipaIdx: m.igralec.ekipaIdx, minuta: m.minuta, noter: { st: null, ime: ime(m.igralec) }, ven: { st: null, ime: ime(m.ven) } })),
    opozorila,
    ...(r.nepopoln ? { nepopoln: true } : {}),
  }
}

/**
 * Nastopi kot pri hlf (po imenu, šifer ni) in še: zgrešene 11-metrovke ter
 * pri tehničnem izidu prejeti goli in čista mreža z igrišča, ne iz uradnega
 * izida za zeleno mizo.
 */
export const nastopi = (z) =>
  nastopiHlf(z).map((n) => {
    const out = {
      ...n,
      zgreseneEnajstmetrovke: (z.zgresene ?? []).filter((k) => k.ekipaIdx === n.ekipaIdx && k.ime === n.ime).length,
    }
    if (z.izidIgrisca) {
      out.prejetiGoli = n.ekipaIdx === 0 ? z.izidIgrisca.gostje : z.izidIgrisca.domaci
      out.cleanSheet = out.prejetiGoli === 0
    }
    return out
  })

/** Razpored v obliko uvoza razporeda. */
export function razporedIzTekem(vse, danes = Date.now()) {
  const krogi = new Map()
  for (const x of vse) {
    const t = x.tekma
    if (!t.krog) continue
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: jeKontumacija(x, danes),
      odigrana: !!t.izid,
      izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

const vir = {
  ime: 'hoff-km',
  polnoIme: 'Хмельницька обласна асоціація футболу (hoff.km.ua)',
  drzava: 'UA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: hoffFetch,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovObjave(id),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new HoffZavrnitev(`hoff-km: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    const { vse } = await tekmeZObjavami(koda, prenesi)
    return razporedIzTekem(vse)
  },

  async zapisniki(koda, prenesi) {
    const danes = Date.now()
    const { liga, vse } = await tekmeZObjavami(koda, prenesi, { danes })
    const sezona = sezonaLeta(liga.leto ?? razberiKodo(koda).leto)
    const out = []
    for (const x of vse) {
      if (!x.tekma.izid) continue
      if (!x.r) {
        if (!jeKontumacija(x, danes) && !x.tekma.tehnicni)
          console.warn(`hoff-km: ${x.tekma.domaci} : ${x.tekma.gostje} (${x.tekma.krog}. тур) ima izid, objave s postavama ni — preskočena`)
        continue
      }
      const z = zapisnikTekme(x, sezona)
      out.push({ id: z.zapisnikId, z, url: z.url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaUa,
  kratkoIme: kratkoImeUa,
  poenostavi: poenostaviUa,
}

export default vir
