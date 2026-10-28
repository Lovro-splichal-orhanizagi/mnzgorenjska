// Vir: Japan Football League (JFL, 日本フットボールリーグ) — 4. raven na Japonskem.
//
// jfl.or.jp je star PHP CMS (`/jfl-pc/view/s.php?a=<stran>&f=<datoteka>`).
// Glej docs/viri/japonska.md (Japonska — vir `jfl`).
//
// ŠIFRA LIGE je `<stran>-<sezona>`: `2591-2026A001` = 28. JFL 2026/27. `f` je
// datoteka sezone (`2026A001_spc.html`), `a` je številka strani CMS, ki jo
// sezona dobi ob objavi (2025: `2375-2025A001`). Stran brez prave `a` vrne
// tekočo sezono, zato vir preveri, da naslov strani nosi leto iz šifre.
//
// RAZPORED je ena stran s 30 krogi (`第N節`), vsaka tekma ena vrstica: datum
// "08月29日(土)" brez leta (ali `未定`), ura (ali `未定`), domači, izid
// "0-0" (neodigrana " - ", odpovedana "&nbsp;-&nbsp;"), gostje, prizorišče,
// povezava na stran tekme in na uradni zapisnik v PDF. Leto pove naslov
// strani: "(2026-2027)" — julij–december je prvo leto, januar–junij drugo;
// "(2025)" — koledarsko leto. Sezona 2026/27 je prva jesensko-pomladna
// (JFL je sledila J.League); 2025 in starejše so koledarske.
//
// ZAPISNIK beremo s strani tekme (HTML, `…&f=2026A0010111_spc.html`), ne iz
// PDF: ista uradna vsebina (izid, polčas, goli z minuto, opomini in
// izključitve z minuto, začetna enajsterica in klop s pozicijo GK/DF/MF/FW in
// dresom, menjave z minuto — ven, nato noter), brez pdftotext. PDF ostane
// povezava (`pdf`) za ročno preverbo. Šifer igralcev ni: identiteta je ime +
// klub (kot fss, ffa). Imena so japonska, kot jih objavi liga (priimek
// naprej); odstranimo le oznako kapetana "(C)" in "(PK)" pri strelcu.
// Avtogol je "オウンゴール" brez dresa pri ekipi, ki ji šteje — strelec ni
// znan, gol ostane brez strelca. Drugi rumeni je zapisan kot dva rumena in
// rdeči "警告2": kot pri drugih virih 1 rumeni + 1 rdeči. Kartoni osebja
// (brez dresa, "試合後") ne štejejo.
//
// Sodnikov, delegata, trenerjev in podatkov o gledalcih ne beremo: `jflFetch`
// jih odreže, še preden gre stran v predpomnilnik.
//
// ČAS: Japonska (Asia/Tokyo, UTC+9, brez poletnega časa) → Ljubljana.
//
// robots.txt na www.jfl.or.jp in data.jfl.or.jp ne obstaja (404); pogoji
// strani (静止画/動画について) omejujejo le slike, posnetke in logotipe.
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki), popolnih zapisnikov ne
// beremo znova. Ob 401, 403, 429 ali izzivu se uvoz ustavi — ne obhajaj.
// GoalNote (regionalne lige) ima `Disallow: /` in ga NE beremo.
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoImenu } from './oefb.mjs'
import { NEPOPOLN } from './frf.mjs'

export { NEPOPOLN }

const OSNOVNI = 'https://www.jfl.or.jp'
const DOLZINA_TEKME = 90
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi -------------------------------------------------------------

/** "2591-2026A001" → { stran: "2591", sezona: "2026A001", leto: 2026 }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)-((\d{4})A\d{3})$/)
  if (!m) throw new Error(`jfl: šifra lige je "<stran>-<sezona>" (npr. 2591-2026A001), ne "${koda}"`)
  return { stran: m[1], sezona: m[2], leto: Number(m[3]) }
}

export const naslovRazporeda = (koda) => {
  const { stran, sezona } = razbijKodo(koda)
  return `${OSNOVNI}/jfl-pc/view/s.php?a=${stran}&f=${sezona}_spc.html`
}
/** Stran tekme iz povezave razporeda (relativne ali polne). */
export const naslovTekme = (povezava) => new URL(razpakiraj(povezava), OSNOVNI).href.replace(/^http:/, 'https:')
// Šifra zapisnika v bazi je `jp<šifra tekme>` (`jp2026A0010111`): enolična čez vse vire.
export const sifraZapisnika = (id) => `jp${String(id).replace(/^jp/, '')}`
/** Uradni zapisnik v PDF: `2026A0010111` → data.jfl.or.jp/jfl-pc/pdf/2026A001/2026A0010111.pdf. */
export const naslovPdf = (id) => {
  const s = String(id).replace(/^jp/, '')
  return `http://data.jfl.or.jp/jfl-pc/pdf/${s.slice(0, 8)}/${s}.pdf`
}
const imeRazporeda = (koda) => `jfl-razpored-${String(koda).replace(/[^\w-]/g, '_')}.html`
const imeTekme = (id) => `jfl-tekma-${String(id).replace(/^jp/, '')}.html`

// --- zavrnitev in prenos -------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi (izhod 4) in ne vzame shranjene strani. */
export class JflZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'JflZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (s) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(s ?? '').slice(0, 20000))

export const jeStranRazporeda = (html) => /class="table-data table-schedule"/.test(String(html ?? ''))
export const jeStranTekme = (html) => /class="score-table"/.test(String(html ?? '')) && /class="score-status"/.test(String(html ?? ''))

// Razdelki strani tekme, ki jih ne beremo in ne shranimo (osebje, sodniki, gledalci).
const ODREZI = ['監督', 'マッチオフィシャル', '試合情報']

/**
 * Stran tekme brez glave CMS, menijev, trenerjev, sodnikov in podatkov o
 * tekmi (gledalci, vreme): ostane le `<div class="detail">` z izidom,
 * dogodki in postavama. To gre v predpomnilnik in vzorce.
 */
export function ocistiTekmo(html) {
  const s = String(html ?? '')
  const od = s.indexOf('<div class="detail">')
  if (od < 0) return s
  let jedro = s.slice(od)
  const konec = jedro.search(/<div class="(?:sidebar|side|footer)|<footer|Copyright/i)
  if (konec > 0) jedro = jedro.slice(0, konec)
  const deli = jedro.split(/(?=<div class="section">)/)
  return deli
    .filter((d) => !ODREZI.some((n) => naslovRazdelka(d).includes(n)))
    .join('')
    // Karton osebja (brez dresa, npr. trenerju "試合後") — ime ni igralec.
    .replace(/<tr>\s*<th>[^<]*<\/th>\s*<th>\s*<\/th>\s*<td>[^<]*<\/td>\s*<tr>\s*<th colspan="2"><\/th>\s*<td>[\s\S]*?<\/td>\s*<\/tr>\s*<\/tr>/g, '')
}

/**
 * `fetch` vira: zavrnitev ustavi uvoz takoj (tudi 429 — ne ponavljamo), izziv
 * prav tako. Stran tekme vrne očiščeno (`ocistiTekmo`).
 */
export async function jflFetch(url, init) {
  const r = await fetch(url, init)
  if (jeZavrnitev(r.status)) {
    await r.body?.cancel().catch(() => {})
    throw new JflZavrnitev(`jfl: ${url} → HTTP ${r.status} — uvoz ustavljen, ne obhajamo`, r.status)
  }
  if (!r.ok) return r
  const besedilo = await r.text()
  if (jeIzziv(besedilo)) throw new JflZavrnitev(`jfl: ${url} vrne izziv — uvoz ustavljen, ne obhajamo`)
  const telo = jeStranTekme(besedilo) ? ocistiTekmo(besedilo) : besedilo
  return new Response(telo, { status: r.status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

// --- čas -------------------------------------------------------------------------------

const ljubljana = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/**
 * Japonski datum in ura (Asia/Tokyo, UTC+9, brez poletnega časa) →
 * ljubljanski { datum, ura }. Brez ure ostane japonski datum (rok kroga
 * izračuna uvoz).
 */
export function vLjubljano(datum, ura) {
  const d = String(datum ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!d) return { datum: null, ura: null }
  const u = String(ura ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!u) return { datum, ura: null }
  const utc = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(u[1]) - 9, Number(u[2]))
  const p = Object.fromEntries(ljubljana.formatToParts(new Date(utc)).map((x) => [x.type, x.value]))
  return { datum: `${p.year}-${p.month}-${p.day}`, ura: `${p.hour}:${p.minute}` }
}

/** "29分" → 29, "90+4分" → 90, "45+2分" → 45, "HT"/"ハーフタイム" → 45, "試合後" → null. */
export function minuta(s) {
  const t = String(s ?? '').normalize('NFKC').trim()
  if (/^(HT|ハーフタイム)/i.test(t)) return 45
  const m = t.match(/^(\d+)(?:\+\d+)?\s*分?$/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** Sezona iz naslova strani: "(2026-2027)" → { prvo: 2026, drugo: 2027 }, "(2025)" → { prvo: 2025, drugo: null }. */
export function letaSezone(html) {
  const naslov = String(html ?? '').match(/<h2 class="title-red-new">([^<]*)</)?.[1] ?? ''
  const m = naslov.normalize('NFKC').match(/\((\d{4})(?:\s*[-–]\s*(\d{4}))?\)/)
  return m ? { prvo: Number(m[1]), drugo: m[2] ? Number(m[2]) : null, naslov: razpakiraj(naslov) } : null
}

/** Oznaka sezone za bazo: jesensko-pomladna "2026/27", koledarska "2025". */
export const oznakaSezone = (leta) => (leta.drugo ? `${leta.prvo}/${String(leta.drugo % 100).padStart(2, '0')}` : String(leta.prvo))

/** "08月29日(土)" + leta sezone → "2026-08-29"; "未定" → null. */
export function datumVrstice(s, leta) {
  const m = String(s ?? '').normalize('NFKC').match(/(\d{1,2})月(\d{1,2})日/)
  if (!m || !leta) return null
  const mesec = Number(m[1])
  const leto = leta.drugo && mesec < 7 ? leta.drugo : leta.prvo
  return `${leto}-${String(mesec).padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

// --- razpored ----------------------------------------------------------------------------

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
const celica = (vrstica, razred) => vrstica.match(new RegExp(`<td class="${razred}">([\\s\\S]*?)</td>`))?.[1] ?? null

/**
 * Tekme razporeda: [{ id, krog, domaci, gostje, datumLokalno, uraLokalno,
 * datum, ura, izid, povezava, pdf, prizorisce }]. `id` je šifra tekme
 * (`2026A0010111`); neodigrana tekma brez povezave ima id iz kroga in vrstnega reda.
 */
export function tekmeRazporeda(koda, html) {
  const { sezona, leto } = razbijKodo(koda)
  const leta = letaSezone(html)
  if (!leta || leta.prvo !== leto) throw new Error(`jfl: razpored ${koda} ima naslov "${leta?.naslov ?? '?'}", ne sezone ${leto} — napačna stran (a=) za sezono, uvoz ustavljen`)
  const out = []
  for (const tabela of String(html ?? '').split('<table class="table-data table-schedule">').slice(1)) {
    const krog = Number(tabela.match(/class="season">\s*第\s*(\d+)\s*節/)?.[1])
    if (!krog) continue
    let zap = 0
    for (const v of tabela.split(/<tr>/).slice(1)) {
      if (!/class="team1"/.test(v)) continue
      zap++
      const domaci = besedilo(celica(v, 'team1'))
      const gostje = besedilo(celica(v, 'team2'))
      const tIzid = besedilo(celica(v, 'score')).normalize('NFKC').match(/^(\d+)\s*-\s*(\d+)$/)
      const povezava = v.match(/<td class="score"><a href="([^"]+)"/)?.[1] ?? null
      const id = povezava?.match(/f=(\d{4}A\d{3}\d+)_spc\.html/)?.[1] ?? `${sezona}${String(krog).padStart(2, '0')}x${zap}`
      const uraT = besedilo(celica(v, 'result-time')).normalize('NFKC')
      const datumLokalno = datumVrstice(besedilo(celica(v, 'result-date')), leta)
      const uraLokalno = /^\d{1,2}:\d{2}$/.test(uraT) ? uraT.padStart(5, '0') : null
      out.push({
        id,
        krog,
        domaci,
        gostje,
        datumLokalno,
        uraLokalno,
        ...vLjubljano(datumLokalno, uraLokalno),
        izid: tIzid ? { domaci: Number(tIzid[1]), gostje: Number(tIzid[2]) } : null,
        povezava,
        pdf: v.match(/href="(https?:\/\/data\.jfl\.or\.jp\/[^"]+\.pdf)"/)?.[1] ?? null,
        prizorisce: besedilo(celica(v, 'place')) || null,
      })
    }
  }
  return { leta, sezona: oznakaSezone(leta), tekme: out }
}

/** Razpored v obliko uvoza razporeda (vse tekme kroga, tudi brez datuma). */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: false,
      odigrana: !!t.izid,
      // Za `kontumacije`: stran tekme.
      jflId: t.id,
      povezava: t.povezava,
      ...(t.izid ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------------------

/** Naslov razdelka (`<h3>得　点</h3>` → "得点"). */
function naslovRazdelka(html) {
  return razpakiraj(String(html ?? '').match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? '').replace(/\s+/g, '')
}

/** Razdelki strani tekme po naslovu: { 得点: [levo, desno], … }. */
export function razdelki(html) {
  const out = {}
  for (const d of String(html ?? '').split(/(?=<div class="section">)/)) {
    const ime = naslovRazdelka(d)
    if (!ime) continue
    const i = d.indexOf('<div class="score-right">')
    out[ime] = i < 0 ? [d, ''] : [d.slice(0, i), d.slice(i)]
  }
  return out
}

/** Ime igralca brez oznak "(C)" in "(PK)". */
const cistoIme = (s) => besedilo(s).replace(/\s*[(（]\s*(C|Ｃ|PK|ＰＫ)\s*[)）]\s*/gi, ' ').replace(/\s+/g, ' ').trim()
const dres = (s) => {
  const t = besedilo(s).normalize('NFKC').trim()
  return /^\d+$/.test(t) ? Number(t) : null
}
const POZICIJA = { GK: 'GK', DF: 'DEF', MF: 'MID', FW: 'FWD' }

/** Igralci tabele postave: [{ st, ime, pozicija, vratar, kapetan }]. */
export function igralciTabele(html) {
  const out = []
  for (const m of String(html ?? '').matchAll(/<tr>\s*<th>\s*(GK|DF|MF|FW)\s*<\/th>\s*<th>([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>/g)) {
    out.push({ st: dres(m[2]), ime: cistoIme(m[3]), pozicija: POZICIJA[m[1]], vratar: m[1] === 'GK', kapetan: /\(\s*C\s*\)|（Ｃ）/.test(m[3]) })
  }
  return out
}

/** Vrstice golov: [{ minuta, st, ime, avtogol, enajstmetrovka }]. */
export function goliTabele(html) {
  const out = []
  for (const m of String(html ?? '').matchAll(/<tr>\s*<th>([^<]*)<\/th>\s*<th>([^<]*)<\/th>\s*<td>([\s\S]*?)<\/td>/g)) {
    const surovo = besedilo(m[3])
    out.push({ minuta: minuta(m[1]), surovaMinuta: besedilo(m[1]), st: dres(m[2]), ime: cistoIme(m[3]), avtogol: /オウンゴール|own\s*goal/i.test(surovo), enajstmetrovka: /\(\s*PK\s*\)|（ＰＫ）/i.test(surovo) })
  }
  return out
}

/** Vrstice kartonov: [{ minuta, st, ime, barva: 'yellow'|'red', razlog }]. */
export function kartoniTabele(html) {
  const out = []
  const re = /<th>([^<]*)<\/th>\s*<th>([^<]*)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<tr>\s*<th colspan="2"><\/th>\s*<td>\s*<span class="card-(yellow|red)">[\s\S]*?<\/span>([\s\S]*?)<\/td>/g
  for (const m of String(html ?? '').matchAll(re)) {
    out.push({ minuta: minuta(m[1]), surovaMinuta: besedilo(m[1]), st: dres(m[2]), ime: cistoIme(m[3]), barva: m[4], razlog: besedilo(m[5]) })
  }
  return out
}

/** Vrstice menjav (ven, nato noter): [{ minuta, ven: { st, ime }, noter: { st, ime } }]. */
export function menjaveTabele(html) {
  const out = []
  const re = /<th>([^<]*)<\/th>\s*<th>([^<]*)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<tr>\s*<th class="change">[\s\S]*?<\/th>\s*<th>([^<]*)<\/th>\s*<td>([\s\S]*?)<\/td>/g
  for (const m of String(html ?? '').matchAll(re)) {
    out.push({ minuta: minuta(m[1]), surovaMinuta: besedilo(m[1]), ven: { st: dres(m[2]), ime: cistoIme(m[3]) }, noter: { st: dres(m[4]), ime: cistoIme(m[5]) } })
  }
  return out
}

/** Glava strani tekme: stanje, ekipi, izid, polčas, japonski datum in ura, krog. */
export function glavaTekme(html) {
  const s = String(html ?? '')
  const deli = [...s.matchAll(/<td class="score-part">([^<]*)<\/td>/g)].map((m) => besedilo(m[1]))
  const fin = [...s.matchAll(/<td rowspan="4" class="score-finish">([^<]*)<\/td>/g)].map((m) => besedilo(m[1]))
  const cas = besedilo(s.match(/<span class="score-date">([\s\S]*?)<\/span>/)?.[1]).normalize('NFKC').match(/(\d{4})年(\d{1,2})月(\d{1,2})日[^\d]*(?:(\d{1,2}):(\d{2}))?/)
  const num = (x) => (/^\d+$/.test(String(x ?? '').trim()) ? Number(x) : null)
  return {
    stanje: besedilo(s.match(/class="score-status">([\s\S]*?)<\/th>/)?.[1]).replace(/[【】]/g, ''),
    domaci: besedilo(s.match(/class="score-team1">([\s\S]*?)<\/th>/)?.[1]),
    gostje: besedilo(s.match(/class="score-team2">([\s\S]*?)<\/th>/)?.[1]),
    izid: num(fin[0]) != null && num(fin[1]) != null ? { domaci: num(fin[0]), gostje: num(fin[1]) } : null,
    polcas: deli[1] === '前半' && num(deli[0]) != null && num(deli[2]) != null ? { domaci: num(deli[0]), gostje: num(deli[2]) } : null,
    datumLokalno: cas ? `${cas[1]}-${cas[2].padStart(2, '0')}-${cas[3].padStart(2, '0')}` : null,
    uraLokalno: cas?.[4] ? `${cas[4].padStart(2, '0')}:${cas[5]}` : null,
    krog: Number(besedilo(s.match(/class="score-season">([\s\S]*?)<\/span>/)?.[1]).normalize('NFKC').match(/第\s*(\d+)\s*節/)?.[1]) || null,
  }
}

/** Odvzeta tekma (没収試合): zapisnika ni, razpored jo označi kot kontumacijo. */
export const jeKontumacija = (html) => /没収/.test(glavaTekme(html).stanje)

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma ni končana
 * (【試合終了】) ali je odvzeta. Zapisnik brez polne postave ali z goli, ki se ne
 * ujemajo z izidom, je `nepopoln: true`.
 */
export function vZapisnik(html, { id = null, url = null, krog = null, sezona = null } = {}) {
  if (!jeStranTekme(html)) return null
  const g = glavaTekme(html)
  if (g.stanje !== '試合終了' || !g.izid || jeKontumacija(html)) return null
  const r = razdelki(html)
  const opozorila = []
  const strani = [0, 1]
  const ekipe = strani.map((i) => ({
    postava: igralciTabele(r['先発選手']?.[i]).map((x) => ({ ...x, zacetnik: true })),
    rezerve: igralciTabele(r['交代選手']?.[i]).map((x) => ({ ...x, zacetnik: false })),
  }))
  const imenaEkip = [g.domaci, g.gostje]

  // Igralec dogodka: po dresu na svoji strani; ime je preverba (zapis istega
  // igralca je na strani en sam, a vnos se lahko zmoti).
  const najdi = (idx, st, ime) => {
    const vsi = [...ekipe[idx].postava, ...ekipe[idx].rezerve]
    const poDresu = st != null ? vsi.filter((x) => x.st === st) : []
    if (poDresu.length === 1) {
      if (ime && poDresu[0].ime !== ime) opozorila.push(`${imenaEkip[idx]}: št. ${st} je v postavi "${poDresu[0].ime}", v dogodku "${ime}"`)
      return poDresu[0]
    }
    const poImenu = ime ? vsi.filter((x) => x.ime === ime) : []
    return poImenu.length === 1 ? poImenu[0] : null
  }

  const goli = []
  let brezStrelca = 0
  for (const idx of strani) {
    for (const x of goliTabele(r['得点']?.[idx])) {
      if (x.avtogol) {
        // Pri ekipi, ki ji gol šteje; strelec (iz druge ekipe) ni zapisan.
        goli.push({ ekipaIdx: 1 - idx, st: null, ime: null, minuta: x.minuta, avtogol: true, enajstmetrovka: false })
        continue
      }
      const i = najdi(idx, x.st, x.ime)
      if (!i) {
        brezStrelca++
        opozorila.push(`${imenaEkip[idx]}: gol v ${x.surovaMinuta} — strelca "${x.ime}" (${x.st ?? '?'}) ni v postavi`)
      }
      goli.push({ ekipaIdx: idx, st: i?.st ?? null, ime: i?.ime ?? null, minuta: x.minuta, avtogol: false, enajstmetrovka: x.enajstmetrovka })
    }
  }

  const rumeni = []
  const rdeci = []
  for (const idx of strani) {
    const kartoni = kartoniTabele(r['警告・退場']?.[idx])
    for (const k of kartoni) {
      const i = najdi(idx, k.st, k.ime)
      if (!i) continue // osebje (brez dresa) ali neznan — ne šteje
      const zapis = { ekipaIdx: idx, st: i.st, ime: i.ime, minuta: k.minuta ?? DOLZINA_TEKME }
      if (k.barva === 'red') {
        if (!rdeci.some((x) => x.ekipaIdx === idx && x.ime === i.ime)) rdeci.push(zapis)
        // Drugi rumeni ("警告2"): drugi opomin je zapisan tudi med rumenimi —
        // kot pri drugih virih ostane 1 rumeni + 1 rdeči.
        if (/警告\s*[2２]/.test(k.razlog)) {
          const moji = rumeni.filter((x) => x.ekipaIdx === idx && x.ime === i.ime)
          for (const y of moji.slice(1)) rumeni.splice(rumeni.indexOf(y), 1)
        }
      } else {
        const rdec = rdeci.find((x) => x.ekipaIdx === idx && x.ime === i.ime)
        // Rumeni, zapisan za rdečim "警告2" (obratni vrstni red), ne šteje drugič.
        if (rdec && rumeni.some((x) => x.ekipaIdx === idx && x.ime === i.ime)) continue
        rumeni.push(zapis)
      }
    }
  }

  const menjave = []
  for (const idx of strani) {
    for (const x of menjaveTabele(r['選手交代']?.[idx])) {
      const ven = najdi(idx, x.ven.st, x.ven.ime)
      const noter = najdi(idx, x.noter.st, x.noter.ime)
      if (!ven || !noter) opozorila.push(`${imenaEkip[idx]}: menjava v ${x.surovaMinuta} — ${!ven ? `"${x.ven.ime}"` : `"${x.noter.ime}"`} ni v postavi`)
      if (x.minuta == null) opozorila.push(`${imenaEkip[idx]}: menjava brez minute ("${x.surovaMinuta}")`)
      const vObliko = (i, y) => (i ? { st: i.st, ime: i.ime, regSt: null } : { st: y.st, ime: y.ime, regSt: null })
      menjave.push({ ekipaIdx: idx, minuta: x.minuta, ven: vObliko(ven, x.ven), noter: vObliko(noter, x.noter) })
    }
  }

  // Popolnost: 11 začetnikov pri obeh, goli = izid, vsi strelci znani.
  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  const razlogi = []
  strani.forEach((idx) => {
    if (ekipe[idx].postava.length !== 11) razlogi.push(`${imenaEkip[idx]} — ${ekipe[idx].postava.length} začetnikov`)
  })
  if (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje) razlogi.push(`goli iz dogodkov ${zaEkipo(0)}:${zaEkipo(1)}, izid ${g.izid.domaci}:${g.izid.gostje}`)
  if (brezStrelca) razlogi.push(`${brezStrelca} golov brez strelca`)
  const nepopoln = razlogi.length > 0
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${razlogi.join('; ')}`)
  strani.forEach((idx) => {
    const vratarjev = ekipe[idx].postava.filter((x) => x.vratar).length
    if (ekipe[idx].postava.length && vratarjev !== 1) opozorila.push(`${imenaEkip[idx]}: vratarjev v postavi je ${vratarjev}`)
  })

  const { datum, ura } = vLjubljano(g.datumLokalno, g.uraLokalno)
  const vObliko = ({ kapetan: _k, zacetnik: _z, ...x }) => x
  return {
    zapisnikId: id,
    url,
    sezona,
    krog: krog ?? g.krog,
    datum,
    ura,
    datumLokalno: g.datumLokalno,
    domaci: { ime: g.domaci, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: g.gostje, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat: { ...g.izid },
    polcas: g.polcas,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    opozorila: [...new Set(opozorila)],
  }
}

/** Nastopi po imenu znotraj ekipe (brez šifer), menjave z minuto (kot oefb). */
export const nastopi = (z) => nastopiPoImenu(z)

// --- klubi ---------------------------------------------------------------------------

/** Ključ kluba: NFKC (polna širina → navadna), male črke, ločila v presledek. */
export const kljucKlubaJp = (ime) =>
  razpakiraj(ime)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Kratko ime: brez "ＦＣ"/"FC" na začetku ali koncu ("Ｈｏｎｄａ ＦＣ" → "Ｈｏｎｄａ"), sicer kot objavljeno. */
export function kratkoImeJp(polno) {
  const ime = razpakiraj(polno)
  const krajse = ime.replace(/^(ＦＣ|FC)\s*/i, '').replace(/\s*(ＦＣ|FC)$/i, '').trim()
  return krajse || ime
}

// --- vir --------------------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Razpored (vedno svež); stran, ki ni razpored, ustavi uvoz. */
async function razpored(koda, prenesi) {
  const url = naslovRazporeda(koda)
  const html = await prenesi(url, imeRazporeda(koda), true)
  if (!jeStranRazporeda(html)) throw new Error(`jfl: ${url} ni stran razporeda — uvoz ustavljen`)
  return tekmeRazporeda(koda, html)
}

async function beri(prenesi, url, ime, sveze) {
  try {
    return await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new JflZavrnitev(`jfl: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
}

const vir = {
  ime: 'jfl',
  polnoIme: 'Japan Football League (jfl.or.jp)',
  drzava: 'JP',
  osnovniNaslov: `${OSNOVNI}/`,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: jflFetch,
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new JflZavrnitev(`jfl: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // V predpomnilnik le razpored in končana tekma (ne napaka strežnika ali tekma v teku).
  zaPredpomnilnik: (html) => jeStranRazporeda(html) || (jeStranTekme(html) && glavaTekme(html).stanje === '試合終了'),

  naslovRazporeda,
  // Stran tekme potrebuje `a=` iz razporeda; iz šifre sama se da sestaviti le
  // uradni zapisnik v PDF (za ročno preverbo, uvoz ga ne bere).
  naslovZapisnika: (_koda, id) => naslovPdf(id),

  /** Razpored: 30 krogov, ljubljanski čas, odigrane z izidom; tekme brez datuma (未定) brez datuma. */
  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored((await razpored(koda, prenesi)).tekme)
  },

  /**
   * Zapisniki odigranih tekem s strani tekme. Prve 3 dni sveže (stran se
   * dopolnjuje), nepopolnega do 45 dni znova; popolnega nikoli.
   */
  async zapisniki(koda, prenesi) {
    const { tekme, sezona } = await razpored(koda, prenesi)
    const out = []
    for (const t of tekme.filter((x) => x.izid && x.povezava)) {
      const url = naslovTekme(t.povezava)
      const star = starostDni(t.datum)
      let html = await beri(prenesi, url, imeTekme(t.id), star <= 3)
      let z = vZapisnik(html, { id: sifraZapisnika(t.id), url, krog: t.krog, sezona })
      if ((!z || z.nepopoln) && star > 3 && star <= 45 && !jeKontumacija(html)) {
        html = await beri(prenesi, url, imeTekme(t.id), true)
        z = vZapisnik(html, { id: sifraZapisnika(t.id), url, krog: t.krog, sezona })
      }
      if (!z) continue
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.datum ??= t.datum
      z.ura ??= t.ura
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid strani tekme ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: odvzeta tekma (没収試合) z izidom 3:0 ali 0:3, starejša od
   * tedna. Razpored je ne loči od izida; bere se stran tekme.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.povezava || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovTekme(t.povezava), imeTekme(t.jflId), t.datum)
        if (jeIzziv(html)) throw new JflZavrnitev(`jfl: ${naslovTekme(t.povezava)} vrne izziv (CAPTCHA)`)
        if (jeStranTekme(html) && jeKontumacija(html)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaJp,
  kratkoIme: kratkoImeJp,
  poenostavi: kljucKlubaJp,
}

export default vir
