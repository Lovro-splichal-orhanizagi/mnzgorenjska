// Vir: pokrajinske amaterske zveze (ASKF) v Turčiji na platformi FYS
// ("Futbol Yönetim Sistemi") — Çanakkale (canakkaleaskf.org) in Aydın
// (aydinaskf.com). Obe spletišči sta isti program ASP.NET WebForms, zato en vir;
// spletišče izbere šifra lige. Glej CLAUDE.md (Turčija — vir askf).
//
// Pokrajinske amaterske lige (Süper Amatör, 1. Amatör, 2. Amatör) niso na
// tff.org (vir `tff` ima le 2. Lig, 3. Lig in PGL); TFF 3. Lig in PGL, ki ju
// spletišči tudi naštejeta, beremo s tff.org, ne tu.
//
// ŠIFRA LIGE je `<zveza>/<sezona>/<liga>[/<skupina>]`, npr.
// `canakkale/2026-2027/samator` ali `aydin/2026-2027/1amator/2`. `<liga>` je
// vrednost izbirnika lig ("S.AMATÖR", "1.AMATÖR") brez ločil in turških črk,
// `<skupina>` naslov gumba skupine ("1", "2"), kadar jih liga ima.
//
// RAZPORED je stran `/fikstur`: izbira sezone in lige je postback ASP.NET
// (`__VIEWSTATE`, ~120 kB), ne naslov. `askfFetch` zato za naslov
// `/fikstur#sezona=…&liga=…[&skupina=…]` sam odpre stran in pošlje enega do
// treh postbackov (vsakič 3 s premora), preveri, da stran res kaže zahtevano
// sezono, ligo in skupino, in vrne le razčlenjene tekme (JSON v komentarju,
// nekaj kB namesto 0,5 MB). Stran nosi več delov lige (play-off final, polfinale,
// redni del); beremo le del z letnim razporedom ("YILLIK FİKSTÜR") — izpadnih
// delov ne uvažamo. Teden je "N. HAFTA", datum in ura sta istanbulska (UTC+3 vse
// leto → ljubljanski). Pod klubom stoji opomba: "Hükmen" (zmaga za zeleno
// mizo), "Ligden Çekildi" (izstopil), "Bu Maça Gitmeyecek/Çıkmayacak" (ne pride)
// — taka tekma je kontumacija.
//
// ZAPISNIK `/macdetay?macID=<id>`: glava (klubi s šifro `kulup`, izid, teden,
// "15 Kasım 2025 Cumartesi - 15:00"), "İLK 11" in "YEDEKLER" obeh ekip (dres in
// igralec s TFF šifro amaterske licence `lisansno` → `reg_st`), "OLAYLAR"
// (dogodki z minuto: "Gol - Ayak/Kafa/Penaltı", "Sarı Kart", "Kırmızı Kart",
// "Çıkan Oyuncu", "Giren Oyuncu"; "DA" = polčas → 45). Ekipo dogodka pove stran
// (`estakimli` domači, `mstakimli` gostje), igralca dres in ime. Vratarja in
// pozicij stran ne pove; vse določi glasovanje. Sodnikov, delegata, zdravnika,
// trenerjev in stadiona ne beremo — `obreziTekmo` jih vrže proč, preden gre
// stran v predpomnilnik.
//
// robots.txt ni (404), pogojev uporabe ni (noga: "Tüm Hakları Saklıdır").
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki), zaključenih zapisnikov ne
// beremo znova. Ob izzivu, CAPTCHI, 401, 403 ali 429 se uvoz ustavi — ne
// obhajaj (`AskfZavrnitev`, izhod 4).
import { existsSync, readFileSync, statSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'
import { sifra } from './zapisniki.mjs'

export { nastopi, NEPOPOLN }

export const ZVEZE = {
  canakkale: { osnovni: 'https://www.canakkaleaskf.org', ime: 'Çanakkale ASKF' },
  aydin: { osnovni: 'https://www.aydinaskf.com', ime: 'Aydın ASKF' },
}
// Mapo predpomnilnika sme smoke preusmeriti v začasno (`SLFF_ASKF_MAPA`).
const mapa = () => process.env.SLFF_ASKF_MAPA || 'scripts/.predpomnilnik/askf'
const DOLZINA_TEKME = 90
const DAN = 86400000
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'
// Nočni uvoz bere vir iz več poslov hkrati; premor znotraj zaporedja postbackov
// se podaljša kot v `prenos.mjs`.
const FAKTOR_PREMORA = Math.max(1, Number(process.env.SLFF_PREMOR_FAKTOR) || 1)
/** Zapisnik zadnjega tedna se še popravlja: vedno sveže. */
export const SVEZE_DNI = 7
/** Do te starosti se nerazčlenjena ali nepopolna stran iz predpomnilnika prebere še enkrat sveže. */
export const PONOVNO_DNI = 45
/** Ekipa z manj začetniki nima postave (vnos se je ustavil ali je ni). */
const NAJMANJ_ZACETNIKOV = 7

// --- šifre in naslovi ---------------------------------------------------------------

/** "S.AMATÖR" → "samator", "1.AMATÖR" → "1amator", "A GRUBU" → "agrubu". */
export const kljucImena = (s) =>
  razpakiraj(String(s ?? ''))
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

/** "aydin/2026-2027/1amator/2" → { zveza, osnovni, sezona: "2026/2027", liga, skupina }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z]+)\/(\d{4})-(\d{4})\/([a-z0-9]+)(?:\/([a-z0-9]+))?$/)
  if (!m || !ZVEZE[m[1]] || Number(m[3]) !== Number(m[2]) + 1)
    throw new Error(`askf: šifra lige je "<zveza>/<leto>-<leto+1>/<liga>[/<skupina>]" (zveze: ${Object.keys(ZVEZE).join(', ')}; npr. canakkale/2026-2027/samator), ne "${koda}"`)
  return { zveza: m[1], osnovni: ZVEZE[m[1]].osnovni, sezona: `${m[2]}/${m[3]}`, liga: m[4], skupina: m[5] ?? null }
}

/** Sezona v bazi: "2025/2026" → "2025/26". */
const sezonaBaze = (sezona) => sezona.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2')

export function naslovLige(koda) {
  const k = razberiKodo(koda)
  return `${k.osnovni}/fikstur#sezona=${k.sezona}&liga=${k.liga}${k.skupina ? `&skupina=${k.skupina}` : ''}`
}
export const naslovTekme = (zveza, id) => `${ZVEZE[zveza].osnovni}/macdetay?macID=${Number(id)}`
// Šifra zapisnika v bazi je `askf-<zveza>-<id>`: macID (~6000–14 000) je
// last spletišča in obe zvezi štejeta v istem razponu; `matches.zapisnik_id`
// pa je enoličen čez vse vire.
export const sifraZapisnika = (zveza, id) => `askf-${zveza}-${Number(String(id).replace(/^askf-[a-z]+-/, ''))}`
const imeFiksture = (koda) => `fikstur-${sifra(koda)}.html`
const imeRazporeda = (koda) => `razpored-${sifra(koda)}.html`
const imeTekme = (zveza, id) => `mac-${zveza}-${id}.html`

// --- pomožno ---------------------------------------------------------------------------

export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;?/g, ' ')).replace(/\s+/g, ' ').trim()

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')

/** "36'" → 36, "90+2'" → 90, "45+1'" → 45, "DA" (devre arası) → 45, "MS" (maç sonu) → 90. */
export function minuta(s) {
  const t = razpakiraj(String(s ?? '')).trim()
  if (/^DA$/i.test(t)) return 45
  if (/^MS$/i.test(t)) return DOLZINA_TEKME
  const m = t.match(/^(\d+)\s*(?:\+\s*\d+)?\s*'?$/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "11.10.2026" → "2026-10-11". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

const MESECI = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık']
/** "15 Kasım 2025 Cumartesi - 15:00" → { datum: "2025-11-15", ura: "15:00" }. */
export function casGlave(s) {
  const t = razpakiraj(String(s ?? '')).toLocaleLowerCase('tr')
  const m = t.match(/(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u)
  const mesec = m ? MESECI.indexOf(m[2]) + 1 : 0
  const u = t.match(/(\d{1,2}):(\d{2})/)
  return {
    datum: m && mesec ? `${m[3]}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null,
    ura: u ? `${u[1].padStart(2, '0')}:${u[2]}` : null,
  }
}

/**
 * Istanbulski čas (UTC+3 vse leto, od 2016) → ljubljanski { datum, ura }:
 * poleti −1 h, pozimi −2 h. Ura "00:00" pomeni, da ure ni (kontumacije).
 */
export function vLjubljanskiCas(datum, ura) {
  const u = String(ura ?? '').match(/(\d{1,2}):(\d{2})/)
  if (!datum || !u || (Number(u[1]) === 0 && u[2] === '00')) return { datum, ura: null }
  const t = new Date(`${datum}T${u[1].padStart(2, '0')}:${u[2]}:00+03:00`)
  const deli = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(t)
      .map((p) => [p.type, p.value]),
  )
  return { datum: `${deli.year}-${deli.month}-${deli.day}`, ura: `${deli.hour}:${deli.minute}` }
}

/** "MUSTAFA DENİZ DAĞ" → "Mustafa Deniz Dağ" (turška pravila za i/İ in ı/I). */
export function lepoIme(s) {
  return String(s ?? '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/(^|[\s'’\-.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'))
    .replace(/\s+/g, ' ')
}

/** "Mustafa Deniz Dağ" → "Dağ Mustafa Deniz" (priimek je zadnja beseda). */
export function vPriimekIme(ime) {
  const deli = String(ime ?? '').trim().split(/\s+/).filter(Boolean)
  return deli.length < 2 ? deli.join(' ') : [deli.at(-1), ...deli.slice(0, -1)].join(' ')
}

/**
 * Izziv (Cloudflare, CAPTCHA). Vse strani naložijo `recaptcha/api.js` (obrazec
 * za stik) — to ni izziv; izziv je gradnik `g-recaptcha` ali stran Cloudflara.
 */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|class="g-recaptcha"|hcaptcha|captcha-delivery/i.test(String(html ?? ''))

export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class AskfZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'AskfZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

// --- razpored (stran /fikstur) -------------------------------------------------------

const odkodiraj = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** Vrednosti obrazca strani: skrita polja in izbrane vrednosti seznamov. */
export function poljaObrazca(html) {
  const polja = new Map()
  for (const m of String(html ?? '').matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const ime = m[0].match(/name="([^"]+)"/)?.[1]
    if (ime) polja.set(odkodiraj(ime), odkodiraj(m[0].match(/value="([^"]*)"/)?.[1] ?? ''))
  }
  for (const m of String(html ?? '').matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const izbrana = m[2].match(/<option[^>]*selected[^>]*value="([^"]*)"/i) ?? m[2].match(/<option[^>]*value="([^"]*)"/i)
    if (izbrana) polja.set(odkodiraj(m[1]), odkodiraj(izbrana[1]))
  }
  return polja
}

/** Telo postbacka: polja strani, cilj dogodka in dodatne vrednosti. */
export function teloPostbacka(html, cilj, dodatno = {}) {
  const polja = poljaObrazca(html)
  polja.set('__EVENTTARGET', cilj)
  polja.set('__EVENTARGUMENT', '')
  for (const [k, v] of Object.entries(dodatno)) polja.set(k, v)
  return [...polja].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

const SEZONA = 'ctl00$ContentPlaceHolder1$lstSezon'

/**
 * Kaj stran kaže: { sezona: "2025/2026", liga: "samator", ligaIme: "S.AMATÖR",
 * meni: [{ kljuc, ime, cilj }], skupine: [{ kljuc, ime, cilj, izbrana }] }.
 * Liga je v naslovu ("S.AMATÖR Fikstürü"), sezona izbrana v izbirniku; meni
 * lig je izbirnik (vrednosti) in gumbi `rptAnaLiglerMenu` (cilji) v istem redu.
 */
export function stanjeStrani(html) {
  const s = String(html ?? '')
  // Glava razporeda "1.AMATÖR 2026/2027 SEZONU" pove ligo in sezono; naslov
  // strani ("S.AMATÖR Fikstürü") po postbacku skupine ostane prazen.
  const glava = besedilo(s.match(/id="ContentPlaceHolder1_lblPuanDurumuHead">([^<]*)</)?.[1]).match(/^(.*?)\s+(\d{4}\/\d{4})\s+SEZONU$/i)
  const naslov = besedilo(s.match(/<title>([\s\S]*?)<\/title>/i)?.[1])
  const ligaIme = glava?.[1]?.trim() || naslov.match(/^(.*?)\s+Fikstürü/i)?.[1]?.trim() || null
  const izbirnik = (ime) => s.match(new RegExp(`<select[^>]*name="ctl00\\$ContentPlaceHolder1\\$${ime}"[^>]*>([\\s\\S]*?)</select>`))?.[1] ?? ''
  const izbrana = odkodiraj(izbirnik('lstSezon').match(/<option[^>]*selected[^>]*value="([^"]*)"/i)?.[1] ?? '') || null
  // Izbirnik in glava se morata ujemati; sicer stran ne kaže, kar mislimo.
  const sezona = glava && izbrana && glava[2] !== izbrana ? null : (glava?.[2] ?? izbrana)
  const vrednosti = [...izbirnik('lstAnaLigler').matchAll(/<option[^>]*value="([^"]*)"/gi)].map((m) => odkodiraj(m[1]))
  const cilji = new Map()
  for (const m of s.matchAll(/__doPostBack\(&#39;(ctl00\$ContentPlaceHolder1\$rptAnaLiglerMenu\$ctl(\d+)\$lbl1DevreSec)&#39;/g)) cilji.set(Number(m[2]), m[1])
  const meni = cilji.size === vrednosti.length && vrednosti.every((_, i) => cilji.has(i))
    ? vrednosti.map((v, i) => ({ kljuc: kljucImena(v), ime: v, cilj: cilji.get(i) }))
    : []
  const skupine = [...s.matchAll(/<div id="ContentPlaceHolder1_rptLigler_rptGruplar_\d+_grupsat_\d+"[^>]*style="([^"]*)"[^>]*>\s*<a [^>]*title="([^"]*)"[^>]*__doPostBack\(&#39;([^&]*)&#39;/g)].map((m) => ({
    kljuc: kljucImena(odkodiraj(m[2])),
    ime: odkodiraj(m[2]),
    cilj: m[3],
    izbrana: /background-color:\s*#cccccc/i.test(m[1]),
  }))
  return { sezona, liga: ligaIme ? kljucImena(ligaIme) : null, ligaIme, meni, skupine }
}

/** Ime dela lige, ki ga ne uvažamo (play-off, finale, pokal). */
const IZPADNI = /PLAY.?OFF|PLAY.?OUT|F[İI]NAL|YARI|ÇEYREK|KUPA|ELEME/i

/**
 * Deli lige na strani: [{ ime, letni, krogi: [{ oznaka, tekme: [...] }] }].
 * Vsak del (`rptLigler_<k>`) ima naslov (h5) in tekme tega tedna; redni del
 * še letni razpored (`rptYillikFikstur_<k>`) s tedni "N. HAFTA".
 */
export function deliStrani(html) {
  const s = cisto(html)
  const naslovi = [...s.matchAll(/<h5 class="section-title border-top">\s*([^<]*?)\s*<\/h5>/g)].map((m) => ({ ime: besedilo(m[1]), od: m.index }))
  const deli = new Map()
  const del = (k) => {
    if (!deli.has(k)) deli.set(k, { k, ime: null, letni: false, krogi: new Map() })
    return deli.get(k)
  }
  // Glava tedna stoji pred vrsticami; tekmo pripišemo zadnji glavi pred njo.
  const glave = [...s.matchAll(/<h6><span[^>]*>([^<]*)<\/span><\/h6>/g)].map((m) => ({ oznaka: besedilo(m[1]), od: m.index }))
  for (const m of s.matchAll(/<li id="ContentPlaceHolder1_rptLigler_(?:rptYillikFikstur_(\d+)_rptfikstur_(\d+)|rptfikstur_(\d+))_musabaka_\d+" class="table-row">([\s\S]*?)<\/li>/g)) {
    const letni = m[1] != null
    const k = Number(letni ? m[1] : m[3])
    const d = del(k)
    if (d.ime == null) d.ime = naslovi.filter((n) => n.od < m.index).at(-1)?.ime ?? null
    if (letni) d.letni = true
    const oznaka = glave.filter((g) => g.od < m.index).at(-1)?.oznaka ?? null
    const kljuc = letni ? `L${m[2]}` : 'T'
    if (!d.krogi.has(kljuc)) d.krogi.set(kljuc, { oznaka, letni, tekme: [] })
    const t = vrsticaTekme(m[4])
    if (t) d.krogi.get(kljuc).tekme.push(t)
  }
  return [...deli.values()].map((d) => ({ ime: d.ime, letni: d.letni, krogi: [...d.krogi.values()].filter((k) => !d.letni || k.letni) }))
}

const OPOMBA_KONTUMACIJE = /h[üu]kmen|çekil|cekil|gitmeyecek|gitmedi|çıkmayacak|cikmayacak|çıkmadı|cikmadi/i

/** Ena vrstica razporeda: { id, datum, ura, domaci, gostje, domaciId, gostjeId, izid, opombe }. */
function vrsticaTekme(r) {
  const celica = (ime) => r.match(new RegExp(`<div\\s+class="fixture-match-${ime}[^"]*">([\\s\\S]*?)</div>`))?.[1] ?? ''
  const klub = (ime) => {
    const c = celica(ime)
    const a = c.match(/kulup=(\d*)"[^>]*>([^<]*)<\/a>/)
    return { id: a && a[1] ? Number(a[1]) : null, ime: besedilo(a?.[2]), opomba: besedilo(c.replace(/<a [\s\S]*?<\/a>/, '')) || null }
  }
  const id = r.match(/macdetay\?macID=(\d+)/)?.[1]
  const d = klub('home')
  const g = klub('away')
  if (!d.ime || !g.ime) return null
  // Izid: "2-1"; podaljšek ali 11 m: "1-4 N.S.:0-0/Uzt.:1-4" (prvi par je končni).
  const izid = besedilo(celica('score')).match(/^(\d+)\s*-\s*(\d+)/)
  return {
    id: id ? Number(id) : null,
    datum: datumIz(besedilo(celica('date'))),
    ura: besedilo(celica('time')).match(/\d{1,2}:\d{2}/)?.[0] ?? null,
    domaci: d.ime,
    gostje: g.ime,
    domaciId: d.id,
    gostjeId: g.id,
    izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
    opombe: [d.opomba, g.opomba].filter(Boolean),
  }
}

/** Razčlenjena stran razporeda: stanje in deli (`fiksturIzStrani` jo bere nazaj). */
export function razcleniFikstur(html) {
  const st = stanjeStrani(html)
  return {
    sezona: st.sezona,
    liga: st.liga,
    ligaIme: st.ligaIme,
    skupina: st.skupine.find((g) => g.izbrana)?.kljuc ?? null,
    skupine: st.skupine.map((g) => g.kljuc),
    deli: deliStrani(html),
  }
}

const OZNAKA_FIKSTURE = '<!-- askf fikstur '
/** Stran za predpomnilnik: razčlenjen razpored kot JSON v komentarju (nekaj kB). */
export const fiksturVStran = (podatki) => `${OZNAKA_FIKSTURE}${JSON.stringify(podatki).replace(/--/g, '-\\u002d')} -->\n`
/** Razpored iz strani: obrezane (JSON) ali cele. */
export function fiksturIzStrani(html) {
  const s = String(html ?? '')
  if (s.startsWith(OZNAKA_FIKSTURE)) return JSON.parse(s.slice(OZNAKA_FIKSTURE.length, s.lastIndexOf(' -->')))
  return razcleniFikstur(s)
}

/**
 * Tekme rednega dela lige: [{ krog, id, datum, ura, domaci, gostje, domaciId,
 * gostjeId, izid, kontumacija }] (datum in ura ljubljanska). Stran druge
 * sezone, lige ali skupine (postback brez učinka) ustavi uvoz.
 */
export function tekmeLige(koda, html) {
  const k = razberiKodo(koda)
  const f = fiksturIzStrani(html)
  const zahtevano = `${k.sezona} ${k.liga}${k.skupina ? ` skupina ${k.skupina}` : ''}`
  const kaze = `${f.sezona} ${f.liga}${f.skupina ? ` skupina ${f.skupina}` : ''}`
  if (f.sezona !== k.sezona || f.liga !== k.liga || (k.skupina && f.skupina !== k.skupina))
    throw new Error(`askf: ${naslovLige(koda)} kaže ${kaze}, ne ${zahtevano} — uvoz ustavljen`)
  if (!k.skupina && f.skupine.length > 1)
    throw new Error(`askf: ${zahtevano} ima skupine (${f.skupine.join(', ')}) — šifra mora povedati skupino`)
  const redni = f.deli.filter((d) => d.letni && !IZPADNI.test(d.ime ?? ''))
  if (redni.length !== 1)
    throw new Error(`askf: ${zahtevano} — rednih delov z letnim razporedom je ${redni.length} (${f.deli.map((d) => d.ime).join(' | ')}), pričakujem 1 — uvoz ustavljen`)
  const out = []
  for (const kr of redni[0].krogi) {
    const n = Number(String(kr.oznaka ?? '').match(/^(\d+)\.\s*HAFTA$/i)?.[1])
    if (!n) throw new Error(`askf: ${zahtevano} — teden "${kr.oznaka}" ni "N. HAFTA" — uvoz ustavljen`)
    for (const t of kr.tekme) {
      const kontumacija = !!t.izid && t.opombe.some((o) => OPOMBA_KONTUMACIJE.test(o))
      out.push({ krog: n, ...t, kontumacija, ...vLjubljanskiCas(t.datum, t.ura) })
    }
  }
  if (!out.length) throw new Error(`askf: ${zahtevano} — razpored brez tekem — se je stran spremenila? Uvoz ustavljen`)
  return out
}

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
      kontumacija: t.kontumacija,
      odigrana: !!t.izid,
      ...(t.kontumacija ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------------

const ZACETEK_GLAVE = 'ContentPlaceHolder1_lblESTakimAdi'
const ozn = (s, id) => {
  const m = String(s).match(new RegExp(`id="ContentPlaceHolder1_${id}"[^>]*>([\\s\\S]*?)</(?:span|a)>`))
  return m ? besedilo(m[1]) : null
}

/** Glava zapisnika: { domaci, gostje, domaciId, gostjeId, izid, datum, ura, liga, skupina, hafta, opombe }. */
export function glavaZapisnika(html) {
  const s = cisto(html)
  const klub = (x) => s.match(new RegExp(`kulup=(\\d+)"\\s+id="ContentPlaceHolder1_lbl${x}TakimAdi"[^>]*>([^<]*)</a>`))
  const d = klub('ES')
  const g = klub('MS')
  if (!d || !g) return null
  const sd = ozn(s, 'lblESSkor')
  const sg = ozn(s, 'lblMSSkor')
  return {
    domaci: besedilo(d[2]),
    gostje: besedilo(g[2]),
    domaciId: Number(d[1]),
    gostjeId: Number(g[1]),
    izid: /^\d+$/.test(sd ?? '') && /^\d+$/.test(sg ?? '') ? { domaci: Number(sd), gostje: Number(sg) } : null,
    ...casGlave(ozn(s, 'lblMacTarih')),
    liga: ozn(s, 'lblLig'),
    skupina: ozn(s, 'lblGrup') || null,
    hafta: Number(ozn(s, 'lblHafta')?.match(/(\d+)\s*\.?\s*HAFTA/i)?.[1]) || null,
    opombe: [ozn(s, 'lblESDurum'), ozn(s, 'lblMSDurum'), ozn(s, 'lblMacDurum'), ozn(s, 'lblMacAciklama')].filter(Boolean),
  }
}

/** Je stran sploh zapisnik tekme (ima glavo z obema kluboma)? */
export const jeStranTekme = (html) => glavaZapisnika(html) != null

/** Blok strani od `<div id="ContentPlaceHolder1_<id>">` do naslednjega panela. */
function panel(s, id) {
  const od = s.indexOf(`id="ContentPlaceHolder1_${id}"`)
  if (od < 0) return ''
  const naslednji = s.slice(od + 10).search(/id="ContentPlaceHolder1_pnl|<div class="mac-detay-esameanahead"|<ul class="rgb-match-timeline"/)
  return naslednji < 0 ? s.slice(od) : s.slice(od, od + 10 + naslednji)
}

/** Igralci panela: [{ st, ime, polnoIme, regSt }]. */
function igralciPanela(blok) {
  const out = []
  for (const m of blok.matchAll(/Musabaka(?:Es|Ms)FormaNo"[^>]*>([^<]*)<\/div>\s*<div class="Musabaka(?:Es|Ms)OyuncuAdi">\s*(?:<a [^>]*lisansno=(\d+)[^>]*>)?([^<]*)/g)) {
    const st = String(m[1]).replace(/\D/g, '')
    const polno = lepoIme(besedilo(m[3]))
    if (!polno) continue
    out.push({ st: st ? Number(st) : null, regSt: m[2] ? Number(m[2]) : null, polnoIme: polno, ime: vPriimekIme(polno) })
  }
  return out
}

/** Dogodek trenerja ali osebja: namesto dresa "TK" (teknik kadro). */
const jeOsebje = (li) => /<span[^>]*>\s*[A-ZÇĞİÖŞÜ]+\s*<\/span>/.test(li.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '')

/** Dogodki igralcev: [{ ekipaIdx, vrsta, opis, st, ime, minuta, minutaBesedilo }]. */
function dogodki(s) {
  const out = []
  for (const m of s.matchAll(/<li id="ContentPlaceHolder1_rptHareketler_(es|ms)takimli_\d+"[^>]*>([\s\S]*?)<\/li>/g)) {
    const b = m[2]
    if (jeOsebje(b)) continue
    const opis = odkodiraj(b.match(/title="([^"]*)"/)?.[1] ?? '').trim()
    const p = b.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? ''
    const st = p.match(/<span[^>]*>\s*(\d*)\s*<\/span>/)?.[1]
    const dakika = besedilo(b.match(/dakika_\d+">([^<]*)</)?.[1])
    out.push({
      ekipaIdx: m[1] === 'es' ? 0 : 1,
      vrsta: vrstaDogodka(opis),
      opis,
      st: st ? Number(st) : null,
      polnoIme: lepoIme(besedilo(p.replace(/<span[\s\S]*?<\/span>/g, ''))),
      minuta: minuta(dakika),
      minutaBesedilo: dakika,
    })
  }
  return out
}

/** "Gol - Ayak" → gol, "Gol - Penaltı" → enajstmetrovka, "Kendi Kalesine" → avtogol … */
export function vrstaDogodka(opis) {
  const o = String(opis ?? '').toLocaleLowerCase('tr')
  if (/kendi|k\.k\./.test(o)) return 'avtogol'
  if (/kaçır|kacir|kaçan|kurtar/.test(o)) return 'zgresena'
  if (/^gol/.test(o)) return /penalt/.test(o) ? 'enajstmetrovka' : 'gol'
  if (/çift sar|cift sar|ikinci sar|2\.\s*sar/.test(o)) return 'drugiRumeni'
  if (/kırmızı|kirmizi/.test(o)) return 'rdeci'
  if (/sarı|sari/.test(o)) return 'rumeni'
  if (/çıkan|cikan/.test(o)) return 'ven'
  if (/giren/.test(o)) return 'noter'
  return null
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma, tekma nima izida
 * ali nobena ekipa nima postave (neodigrana, kontumacija, zapisnik še ni
 * vnesen). Ena ekipa brez postave ali goli, ki se pri tekmi zadnjega tedna ne
 * ujemajo z izidom, je `nepopoln` (izid se zapiše, `imported_at` ne; uvoz jo
 * bere znova).
 */
export function vZapisnik(html, { id = null, url = null, danes = Date.now() } = {}) {
  const g = glavaZapisnika(html)
  if (!g?.izid) return null
  const s = cisto(html)
  const ekipe = [
    { postava: igralciPanela(panel(s, 'pnlEsAsilOyuncular')), rezerve: igralciPanela(panel(s, 'pnlEsYedekOyuncular')) },
    { postava: igralciPanela(panel(s, 'pnlMsAsilOyuncular')), rezerve: igralciPanela(panel(s, 'pnlMsYedekOyuncular')) },
  ]
  const znana = ekipe.map((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
  if (!znana[0] && !znana[1]) return null
  // Kontumacija ("Bu Maça Çıkmadı", "Hükmen"): postavo ima le ekipa, ki je
  // prišla — tekme ni bilo in nihče ne dobi nastopa.
  if ((!znana[0] || !znana[1]) && g.opombe.some((o) => OPOMBA_KONTUMACIJE.test(o))) return null
  const imeni = [g.domaci, g.gostje]
  const opozorila = []
  for (const [idx, e] of ekipe.entries()) {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'}`)
    else if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
  }

  // Igralec dogodka: po imenu v ekipi (soimenjaka loči dres), sicer po dresu.
  const poImenu = (idx, d) => {
    if (!znana[idx]) return null
    const zadetki = [...ekipe[idx].postava, ...ekipe[idx].rezerve].filter((i) => i.polnoIme === d.polnoIme)
    return zadetki.length > 1 ? (zadetki.find((i) => i.st === d.st) ?? null) : (zadetki[0] ?? null)
  }
  const poDresu = (idx, d) => {
    if (!znana[idx] || d.st == null) return null
    const zadetki = [...ekipe[idx].postava, ...ekipe[idx].rezerve].filter((i) => i.st === d.st)
    return zadetki.length === 1 ? zadetki[0] : null
  }
  const vEkipi = (idx, d) => poImenu(idx, d) ?? poDresu(idx, d)
  const kdo = (idx, i, m) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt, minuta: m })

  const preklopi = new Map()
  const dodaj = (i, m) => {
    if (!preklopi.has(i)) preklopi.set(i, [])
    preklopi.get(i).push(m)
  }
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const ven = [[], []]
  const menjave = []
  for (const d of dogodki(s)) {
    const idx = d.ekipaIdx
    if (!d.vrsta) {
      opozorila.push(`${imeni[idx]}: neznan dogodek "${d.opis}" (${d.polnoIme}, ${d.minutaBesedilo})`)
      continue
    }
    if (!znana[idx] && d.vrsta !== 'avtogol') continue
    if (d.minuta == null) opozorila.push(`${imeni[idx]}: dogodek "${d.opis}" (${d.polnoIme}) brez minute ("${d.minutaBesedilo}")`)
    if (d.vrsta === 'gol' || d.vrsta === 'enajstmetrovka' || d.vrsta === 'avtogol') {
      // Avtogol je navadno vpisan pri ekipi, ki ji je štel (strelec je iz
      // druge), včasih pri strelčevi: najprej ime v obeh ekipah, šele nato dres
      // — dres 4 gostov ni domači strelec z dresom 4.
      let ekipaStrelca = idx
      let i = d.vrsta === 'avtogol' ? poImenu(idx, d) : vEkipi(idx, d)
      if (!i && d.vrsta === 'avtogol') {
        i = poImenu(1 - idx, d) ?? poDresu(1 - idx, d)
        ekipaStrelca = 1 - idx
        if (!i) {
          i = poDresu(idx, d)
          ekipaStrelca = idx
        }
      }
      if (!i) {
        opozorila.push(`${imeni[idx]}: gol v ${d.minutaBesedilo} (${d.polnoIme}) — strelca ni v zapisniku`)
        continue
      }
      goli.push({ ...kdo(ekipaStrelca, i, d.minuta), avtogol: d.vrsta === 'avtogol', enajstmetrovka: d.vrsta === 'enajstmetrovka' })
      continue
    }
    const i = vEkipi(idx, d)
    if (!i) {
      // Karton trenerja ali osebja ne šteje; ostalo je opozorilo.
      if (!/rumeni|rdeci|drugiRumeni/.test(d.vrsta)) opozorila.push(`${imeni[idx]}: ${d.opis} ${d.polnoIme} (${d.minutaBesedilo}) — ni v zapisniku`)
      continue
    }
    if (d.vrsta === 'zgresena') zgresene.push(kdo(idx, i, d.minuta))
    else if (d.vrsta === 'rumeni') rumeni.push(kdo(idx, i, d.minuta))
    else if (d.vrsta === 'rdeci' || d.vrsta === 'drugiRumeni') {
      if (!rdeci.some((r) => r.ekipaIdx === idx && r.regSt === i.regSt && r.ime === i.ime)) rdeci.push({ ...kdo(idx, i, d.minuta), drugiRumeni: d.vrsta === 'drugiRumeni' })
    } else if (d.minuta == null) {
      // menjava brez minute: opozorilo zgoraj, preklopa ne vpišemo
    } else if (d.vrsta === 'ven') {
      dodaj(i, d.minuta)
      ven[idx].push({ i, minuta: d.minuta })
    } else if (d.vrsta === 'noter') {
      dodaj(i, d.minuta)
      const j = ven[idx].findIndex((v) => v.minuta === d.minuta)
      const par = j >= 0 ? ven[idx].splice(j, 1)[0].i : null
      menjave.push({ ekipaIdx: idx, minuta: d.minuta, noter: { st: i.st, ime: i.ime }, ven: par ? { st: par.st, ime: par.ime } : { st: null, ime: null } })
    }
  }
  for (const [idx, vs] of ven.entries()) for (const v of vs) menjave.push({ ekipaIdx: idx, minuta: v.minuta, noter: { st: null, ime: null }, ven: { st: v.i.st, ime: v.i.ime } })
  // Drugi rumeni je 1 rumeni + 1 rdeči kot pri drugih virih.
  for (const r of rdeci.filter((x) => x.drugiRumeni)) {
    if (!rumeni.some((y) => y.ekipaIdx === r.ekipaIdx && y.regSt === r.regSt && y.ime === r.ime)) rumeni.push({ ...r, drugiRumeni: undefined })
  }
  for (const r of rdeci) delete r.drugiRumeni
  for (const y of rumeni) delete y.drugiRumeni

  const sestava = ekipe.map((e, idx) => {
    const sifre = new Map()
    for (const i of [...e.postava, ...e.rezerve]) if (i.regSt != null) sifre.set(i.regSt, (sifre.get(i.regSt) ?? 0) + 1)
    for (const [k, n] of sifre) if (n > 1) opozorila.push(`${imeni[idx]}: igralec ${k} je v zapisniku ${n}-krat`)
    if (znana[idx] && [...e.postava, ...e.rezerve].some((i) => i.regSt == null)) opozorila.push(`${imeni[idx]}: igralec brez šifre licence`)
    for (const i of e.rezerve) if ((preklopi.get(i)?.length ?? 0) > 2) opozorila.push(`${imeni[idx]}: ${i.ime} ima ${preklopi.get(i).length} menjav`)
    const vObliko = (zacetnik) => (i) => ({
      st: i.st,
      ime: i.ime,
      regSt: i.regSt,
      zacetnik,
      vratar: false,
      pozicija: null,
      preklopi: [...(preklopi.get(i) ?? [])].sort((a, b) => a - b),
    })
    // Ekipa brez postave nima igralcev: nastopov ne dobi nihče.
    return znana[idx] ? { ime: imeni[idx], postava: e.postava.map(vObliko(true)), rezerve: e.rezerve.map(vObliko(false)) } : { ime: imeni[idx], postava: [], rezerve: [] }
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  const nepopolnaEkipa = !znana[0] || !znana[1]
  let dopolnjuje = false
  if (!nepopolnaEkipa && (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje)) {
    const neujemanje = `goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`
    // Zveza dogodke vnaša po tekmi: tekma zadnjega tedna je morda še nedokončana.
    dopolnjuje = starostDni(g.datum, danes) <= SVEZE_DNI
    opozorila.push(dopolnjuje ? `${NEPOPOLN}: ${neujemanje} — zapisnik se še dopolnjuje` : neujemanje)
  }
  if (g.opombe.length) opozorila.push(`opombe zapisnika: ${g.opombe.join('; ')}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const { datum, ura } = vLjubljanskiCas(g.datum, g.ura)
  return {
    zapisnikId: id,
    url,
    sezona: null, // da šifra lige
    krog: g.hafta,
    datum,
    ura,
    liga: g.liga,
    sifreKlubov: [g.domaciId, g.gostjeId],
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: g.izid,
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
    nepopoln: nepopolnaEkipa || dopolnjuje,
  }
}

/**
 * Stran tekme za predpomnilnik: le glava (klubi, izid, teden, čas), postave,
 * klop in dogodki. Sodnikov, delegata, zdravnika in trenerjev ne hranimo.
 */
export function obreziTekmo(html) {
  const s = cisto(html)
  const deli = []
  const glava = (id) => s.match(new RegExp(`<(a|span)[^>]*id="ContentPlaceHolder1_${id}"[^>]*>[\\s\\S]*?</\\1>`))?.[0] ?? ''
  for (const id of ['lblESTakimAdi', 'lblESSkor', 'lblESDurum', 'lblLig', 'lblGrup', 'lblHafta', 'lblMacDurum', 'lblMacAciklama', 'lblMacTarih', 'lblMSTakimAdi', 'lblMSSkor', 'lblMSDurum'])
    deli.push(glava(id))
  for (const id of ['pnlEsAsilOyuncular', 'pnlMsAsilOyuncular', 'pnlEsYedekOyuncular', 'pnlMsYedekOyuncular']) {
    const p = panel(s, id)
    if (p) deli.push(`<div ${p}</div>`)
  }
  const od = s.indexOf('<ul class="rgb-match-timeline">')
  // Kartoni trenerjev in osebja ("TK" namesto dresa) ne štejejo — z imeni vred proč.
  if (od >= 0)
    deli.push(s.slice(od, s.indexOf('</ul>', od) + 5).replace(/<li id="ContentPlaceHolder1_rptHareketler_[\s\S]*?<\/li>/g, (li) => (jeOsebje(li) ? '' : li)))
  return `<!-- askf tekma (obrezano: brez sodnikov, osebja in stadiona) -->\n${deli.join('\n').replace(/[ \t]*\n[\s]*/g, '\n')}\n`
}

// --- prenos -----------------------------------------------------------------------------

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

/** En zahtevek: zavrnitev in izziv vržeta `AskfZavrnitev`; vrne { status, telo, piskot, odgovor }. */
async function zahtevek(url, { glave, telo = null, piskot = null } = {}) {
  const headers = { 'User-Agent': UA, ...(glave ?? {}) }
  if (piskot) headers.Cookie = piskot
  if (telo != null) headers['Content-Type'] = 'application/x-www-form-urlencoded'
  const odgovor = await fetch(url, { method: telo != null ? 'POST' : 'GET', headers, body: telo ?? undefined, signal: AbortSignal.timeout(90000) })
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new AskfZavrnitev(`askf: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  const besedilo = await odgovor.text()
  if (jeIzziv(besedilo)) throw new AskfZavrnitev(`askf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  const novi = (odgovor.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0])
  return { status: odgovor.status, ok: odgovor.ok, telo: besedilo, piskot: novi.length ? novi.join('; ') : piskot, odgovor }
}

const html = (telo, status = 200) => new Response(telo, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })

/**
 * Stran razporeda z zahtevano sezono, ligo in skupino: GET in do trije
 * postbacki (sezona in liga, liga v meniju nove sezone, skupina), vsakič 3 s
 * premora. Vrne razčlenjene tekme (`fiksturVStran`) ali odgovor z napako.
 */
async function stranFiksture(url, glave) {
  const u = new URL(url)
  const p = new URLSearchParams(u.hash.slice(1))
  const sezona = p.get('sezona')
  const liga = p.get('liga')
  const skupina = p.get('skupina')
  const naslov = `${u.origin}/fikstur`
  let r = await zahtevek(naslov, { glave })
  if (!r.ok) return html(r.telo, r.status)
  const postback = async (cilj, dodatno = {}) => {
    await cakaj(PREMOR_MS * FAKTOR_PREMORA)
    const n = await zahtevek(naslov, { glave, telo: teloPostbacka(r.telo, cilj, { [SEZONA]: sezona, ...dodatno }), piskot: r.piskot })
    return n
  }
  let st = stanjeStrani(r.telo)
  // Meni lig je meni PRIKAZANE sezone: ob menjavi sezone se lahko zamakne, zato
  // ob napačni ligi ponovimo z menijem nove strani.
  for (let poskus = 0; poskus < 2 && (st.sezona !== sezona || st.liga !== liga); poskus++) {
    if (!st.meni.length) throw new Error(`askf: ${naslov} nima menija lig — se je stran spremenila? Uvoz ustavljen`)
    const i = st.meni.findIndex((m) => m.kljuc === liga)
    if (i < 0 && st.sezona === sezona)
      throw new Error(`askf: lige "${liga}" v sezoni ${sezona} ni (${st.meni.map((m) => m.kljuc).join(', ')}) — uvoz ustavljen`)
    r = await postback(st.meni[Math.max(i, 0)].cilj)
    if (!r.ok) return html(r.telo, r.status)
    st = stanjeStrani(r.telo)
  }
  if (skupina) {
    const g = st.skupine.find((x) => x.kljuc === skupina)
    if (g && !g.izbrana) {
      r = await postback(g.cilj)
      if (!r.ok) return html(r.telo, r.status)
    }
  }
  // Ali stran res kaže zahtevano, preveri `tekmeLige`; tu le, da je razpored.
  const podatki = razcleniFikstur(r.telo)
  if (!podatki.sezona || !podatki.deli.length) return html(r.telo, r.status)
  return html(fiksturVStran(podatki))
}

/**
 * `fetch` vira (`prenos.mjs` ga dobi kot `vir.fetch`): naslov `/fikstur#…`
 * sestavi stran razporeda s postbacki, stran tekme obreže. 401, 403, 429 in
 * izziv vržejo `AskfZavrnitev` že tu — brez ponovitve in brez shranjene strani.
 */
export async function askfFetch(url, moznosti = {}) {
  const glave = moznosti.headers ?? {}
  const u = new URL(url)
  if (u.pathname === '/fikstur' && u.hash) return stranFiksture(url, glave)
  const r = await zahtevek(url, { glave })
  if (!r.ok) return html(r.telo, r.status)
  return html(/^\/macdetay$/i.test(u.pathname) && r.telo.includes(ZACETEK_GLAVE) ? obreziTekmo(r.telo) : r.telo, r.status)
}

/**
 * Sme stran v predpomnilnik? Le razčlenjen razpored in stran tekme z glavo;
 * stran vzdrževanja ali napake (200 z obvestilom) ne — sicer bi obveljala.
 */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  const s = String(besedilo ?? '')
  if (/^(fikstur|razpored)-/.test(datoteka)) return s.startsWith(OZNAKA_FIKSTURE)
  if (/^mac-/.test(datoteka)) return s.includes(ZACETEK_GLAVE) && !/Server Error in|Runtime Error|Service Unavailable/i.test(s)
  return true
}

/** Prenos, ki se ob zavrnitvi ali izzivu ustavi (vsaka pot branja gre skozenj). */
async function beri(prenesi, url, datoteka, sveze) {
  let besedilo
  try {
    besedilo = await prenesi(url, datoteka, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new AskfZavrnitev(`askf: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(besedilo)) throw new AskfZavrnitev(`askf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return besedilo
}

/**
 * Razpored lige. Uvoz razporeda stran prenese tik pred tem (`naslovRazporeda`)
 * in jo shrani pod `razpored-<šifra>.html` — ne beremo je dvakrat.
 */
async function razporedLige(koda, prenesi) {
  const pot = `${mapa()}/${imeRazporeda(koda)}`
  if (existsSync(pot) && Date.now() - statSync(pot).mtimeMs <= 15 * 60000) {
    try {
      return tekmeLige(koda, readFileSync(pot, 'utf8'))
    } catch {
      // ni ta liga ali je stran pokvarjena: preberemo sami
    }
  }
  return tekmeLige(koda, await beri(prenesi, naslovLige(koda), imeFiksture(koda), true))
}

/**
 * Zapisnik tekme, kot `zapisnikSvez`: tekma zadnjega tedna sveže; do 45 dni
 * iz predpomnilnika, a če stran nima postav, je nepopolna ali se goli ne
 * ujemajo z izidom, še enkrat sveže. Starejših ne beremo znova.
 */
export async function zapisnikSvez(beriStran, razcleni, datum, danes = Date.now()) {
  const starost = starostDni(datum, danes)
  const sveze = starost <= SVEZE_DNI
  const z = razcleni(await beriStran(sveze))
  const dvom = !z || z.nepopoln || z.opozorila.some((o) => /goli iz dogodkov .* se ne ujemajo/.test(o))
  if (sveze || starost > PONOVNO_DNI || !dvom) return z
  return razcleni(await beriStran(true)) ?? z
}

// --- klubi ---------------------------------------------------------------------------------

/** Ključ kluba: male črke po turško, turške črke ostanejo, ločila proč. */
export const kljucKlubaTr = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

const OBLIKE_TR = new Set(['a.ş.', 'a.ş', 'aş', 'sk', 'fk', 'kulübü', 'kulubu'])
/** Kratko ime: "BİGA ADASPOR" → "Biga Adaspor", "YENİPAZAR G.B." → "Yenipazar G.B."; največ tri besede. */
export function kratkoImeTr(polno) {
  let s = razpakiraj(polno).replace(/\s+/g, ' ').trim()
  s = s.replace(/\s+(SPOR\s+)?(FUTBOL\s+)?(SPOR\s+)?(KULÜBÜ|KULUBU)(?=\s|$).*$/i, '')
  const besede = lepoIme(s).split(' ').filter((b) => b && !OBLIKE_TR.has(b.toLocaleLowerCase('tr')))
  return (besede.length ? besede : lepoIme(polno).split(' ')).slice(0, 3).join(' ')
}

// --- vir -----------------------------------------------------------------------------------

const vir = {
  ime: 'askf',
  fetch: askfFetch,
  polnoIme: 'Amatör Spor Kulüpleri Federasyonu — Çanakkale (canakkaleaskf.org), Aydın (aydinaskf.com)',
  drzava: 'TR',
  osnovniNaslov: ZVEZE.canakkale.osnovni,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (koda, id) => naslovTekme(razberiKodo(koda).zveza, String(id).replace(/^askf-[a-z]+-/, '')),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new AskfZavrnitev(`askf: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem(await razporedLige(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const k = razberiKodo(koda)
    const tekme = await razporedLige(koda, prenesi)
    const out = []
    for (const t of tekme.filter((x) => x.izid && x.id && !x.kontumacija)) {
      const url = naslovTekme(k.zveza, t.id)
      const id = sifraZapisnika(k.zveza, t.id)
      const z = await zapisnikSvez(
        (sveze) => beri(prenesi, url, imeTekme(k.zveza, t.id), sveze),
        (h) => vZapisnik(h, { id, url }),
        t.datum,
      )
      if (!z) continue
      // Ime kluba, krog, datum in sezona z razporeda, da se tekma ujame z vrstico razporeda.
      if (z.krog != null && z.krog !== t.krog) z.opozorila.push(`teden zapisnika ${z.krog} ni teden razporeda ${t.krog}`)
      if (z.sifreKlubov[0] !== t.domaciId || z.sifreKlubov[1] !== t.gostjeId)
        z.opozorila.push(`klubi zapisnika (${z.sifreKlubov.join(', ')}) niso klubi razporeda (${t.domaciId}, ${t.gostjeId})`)
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.datum = t.datum ?? z.datum
      z.ura = t.ura ?? z.ura
      z.sezona = sezonaBaze(k.sezona)
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaTr,
  kratkoIme: kratkoImeTr,
  poenostavi: kljucKlubaTr,
}

export default vir
