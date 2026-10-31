// Vir: Nogometni savez Federacije BiH — nsfbih.ba (Bosna in Hercegovina).
//
// NS FBiH vodi WWIN Prvo ligo FBiH (2. raven BiH) in Drugo ligo FBiH v štirih
// skupinah (Jug, Sjever, Centar, Zapad; 3. raven). Podatki so iz COMET
// (šifre tekem 54xxxxxx so šifre COMET), stran jih izriše kot navaden HTML
// iz strežnika. Kantonalnih lig (4. raven in nižje) na strani ni. fsrs.org
// (Republika Srpska) NI ta vir in ga ne beremo. Glej docs/viri/bih.md (Bosna in
// Hercegovina — vir nsfbih).
//
// ŠIFRA LIGE je `<slug>/<sezona>`, npr. `druga-liga-fbih-jug/2026-27`:
// - `<slug>` je pot strani lige `/takmicenja/<slug>` (wwin-prva-liga-fbih,
//   druga-liga-fbih-jug, -sjever, -centar, -zapad). Slug je ISTI vsako sezono:
//   stran kaže le tekočo sezono, izbirnika sezon in arhiva ni.
// - `<sezona>` je sezona, ki jo stran mora kazati. Ob novi sezoni stran tiho
//   preide na novo — vir se tedaj ustavi, dokler se šifra ne popravi (sicer
//   bi nova sezona pristala v vrstici stare).
//
// STRAN LIGE: zavihek "Raspored i rezultati" (`id="t3"`) ima vse objavljene
// kroge ("N. kolo") z vsemi tekmami: datum in ura ("02.09.2026. 16:30h",
// sarajevski čas = ljubljanski), igrišče, domači in gostje (`<b>IME</b>` s
// krajem v `<small>`), izid ("<b>7:0</b>", neodigrana "-") in povezava
// "Detaljnije" `/takmicenja/<slug>/<id>`. Izid z zvezdico ("3:0 *", na
// zapisniku "*(p.f.)") je registriran za zeleno mizo — KONTUMACIJA, tudi če je
// bila tekma odigrana (Bratstvo : Posušje 14. 8. 2026, na igrišču 3:1). Druga
// liga objavi le jesenski del (15–16 krogov), pomlad pride pozneje.
//
// ZAPISNIK `/takmicenja/<slug>/<id>`: glava (imeni klubov `<h5>`, izid `<h3>`,
// za njim polčas), vrstica "<tekmovanje> 26/27<br>N. kolo" in "datum uraH,
// igrišče"; nato "Startna postava" in "Rezervni igrači", vsak z dvema
// tabelama (domači: dogodki | ime | dres; gostje: dres | ime | dogodki).
// Dogodki so ikone z minuto ("62'", "90+4'" → 90), NE v časovnem vrstnem redu:
// - `event-icon-goal` gol; pred minuto "(P)" = 11 m, "(AG)" = avtogol (pri
//   igralcu, ki ga je dal, v NJEGOVI ekipi — šteje nasprotniku),
// - `event-icon-card bg-warning` rumeni, `bg-danger` rdeči (drugi rumeni je
//   rumeni + rdeči, ostane 1 rumeni + 1 rdeči kot pri drugih virih),
// - `icon-right text-danger` izstop, `icon-right text-success` vstop —
//   minute so točne, menjavo sestavimo iz para ob isti minuti.
// Vratarja in kapetana stran NE označi. COMET vratarja našteje PRVEGA (ostali
// so urejeni po dresu): prvi začetnik ima `vratar` le kot namig (kot ffm,
// fssid, mlsz). Šifer igralcev ni — identiteta je ime + klub. Ime je
// "Priimek Ime", kot ga piše COMET.
//
// robots.txt je "User-agent: *" brez Disallow (in brez Crawl-delay). Beremo
// odkrito: User-Agent SLFF, 3 s med zahtevki, popolnih zapisnikov ne beremo
// znova. Ob 403, 429, izzivu ali CAPTCHI se uvoz ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { sifra } from './zapisniki.mjs'
import { datumUra, minuta, nastopi, sezonaIzDatuma, zdruziDvojneGole } from './fss.mjs'

const OSNOVNI = 'https://www.nsfbih.ba'

export { minuta, nastopi, sezonaIzDatuma }

/** "druga-liga-fbih-jug/2026-27" → { slug, sezona: "2026/27" }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+)\/(\d{4})-(\d{2})$/)
  if (!m || (Number(m[2]) + 1) % 100 !== Number(m[3]))
    throw new Error(`nsfbih: šifra lige je "<slug>/<sezona>" (npr. druga-liga-fbih-jug/2026-27), ne "${koda}"`)
  return { slug: m[1], sezona: `${m[2]}/${m[3]}` }
}

export const naslovLige = (koda) => `${OSNOVNI}/takmicenja/${razberiKodo(koda).slug}`
// Šifra zapisnika v bazi je `ba<id>`: šifre COMET so enolične le znotraj ene
// zveze, `matches.zapisnik_id` pa je enoličen čez vse vire. Naslov predpono odreže.
export const sifraZapisnika = (id) => `ba${String(id).replace(/^ba/, '')}`
export const naslovTekme = (slug, id) => `${OSNOVNI}/takmicenja/${slug}/${String(id).replace(/^ba/, '')}`
const imeLige = (koda) => `nsfbih-liga-${sifra(koda)}.html`
const imeTekme = (id) => `nsfbih-tekma-${String(id).replace(/^ba/, '')}.html`

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const brezSkript = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')

// --- zavrnitev -----------------------------------------------------------------

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class NsfbihZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'NsfbihZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
// Stran izziva, ne obrazec z reCAPTCHA (kontaktni obrazec kluba ni izziv).
export const jeIzziv = (html) =>
  /<title>[^<]*(Just a moment|Attention Required|captcha)|cf_chl_opt|cf-turnstile|challenge-platform/i.test(String(html ?? ''))

// --- klubi ---------------------------------------------------------------------

/** Ime kluba, kot ga piše zveza ("NK TROGLAV 1918"), brez odvečnih presledkov. */
export const imeKluba = (ime) => razpakiraj(ime).replace(/\s+/g, ' ').trim()

/**
 * Ključ kluba: male črke s č, ć, đ, š, ž, ločila v presledek. Oblika (NK, FK,
 * HNK …) OSTANE: "FK VITEZ" in "NK VITEZ", "FK RUDAR" in "NK RUDAR", "NK
 * SLOGA" in "HNK SLOGA" so različni klubi.
 */
export const kljucKlubaBa = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('hr')
    .replace(/[^\p{L}0-9()]+/gu, ' ')
    .trim()

/** Kratko ime je polno ime: brez oblike bi se klubi zgoraj zlili. */
export const kratkoImeBa = (polno) => imeKluba(polno)

// --- strani klubov (pošta klubom, vrsta-poste-klubom.mjs) -----------------------

/** Seznam klubov lige `/klubovi/<slug>` (isti slug kot `/takmicenja/<slug>`). */
export const naslovKlubov = (koda) => `${OSNOVNI}/klubovi/${razberiKodo(koda).slug}`
export const naslovKlubaBa = (koda, id) => `${naslovKlubov(koda)}/${id}`

/** Klubi s seznama: [{ id, ime }] (ime kot na strani lige, "FK RADNIK (H)"). */
export function klubiLige(html) {
  const out = new Map()
  // Do naslednje kartice: kartica brez naslova ne sme vzeti imena naslednjega kluba.
  for (const m of String(html ?? '').matchAll(/<a href="\/klubovi\/[a-z0-9-]+\/(\d+)">(?:(?!<a href="\/klubovi\/)[\s\S])*?<div class="title">([^<]*)<\/div>/g))
    if (!out.has(m[1])) out.set(m[1], { id: m[1], ime: imeKluba(m[2]) })
  return [...out.values()]
}

/**
 * Naslov iz vrstice "E-mail" tabele kluba (ne naslov zveze v nogi) ali null.
 * `undefined`, če to ni stran kluba (ni vrstice "Naziv kluba").
 */
export function emailKluba(html) {
  const h = String(html ?? '')
  if (!/<td[^>]*>\s*Naziv kluba\s*<\/td>/.test(h)) return undefined
  const celica = h.match(/<td[^>]*>\s*E-mail\s*<\/td>\s*<td>([\s\S]*?)<\/td>/)?.[1] ?? ''
  const email = besedilo(celica).match(/[^\s<>"':]+@[^\s<>"']+\.[a-z]{2,}/i)?.[0].toLowerCase() ?? null
  return email && /@(nsfbih|nfsbih)\.ba$/.test(email) ? null : email // naslov zveze ni naslov kluba
}

// --- stran lige ----------------------------------------------------------------

/** Je stran res stran lige (zavihek razporeda s krogi)? */
export const jeStranLige = (html) => /id="t3"/.test(String(html ?? '')) && /\d+\.\s*kolo/.test(String(html ?? ''))

/** Izid "7:0", "3:0 *" (zelena miza) ali "-" → { izid, zelenaMiza }. */
export function izidIz(s) {
  const t = besedilo(s)
  const m = t.match(/^(\d+)\s*:\s*(\d+)\s*(\*)?/)
  return m ? { izid: { domaci: Number(m[1]), gostje: Number(m[2]) }, zelenaMiza: !!m[3] } : { izid: null, zelenaMiza: false }
}

/**
 * Vse tekme z zavihka "Raspored i rezultati": [{ krog, id, datum, ura,
 * domaci, gostje, izid, zelenaMiza }].
 */
export function tekmeStrani(html) {
  const s = brezSkript(html)
  const i = s.indexOf('id="t3"')
  if (i < 0) return []
  const konec = s.indexOf('id="t4"', i)
  const zavihek = s.slice(i, konec < 0 ? undefined : konec)
  const out = []
  for (const del of zavihek.split(/<th colspan="\d+"[^>]*>/).slice(1)) {
    const krog = Number(del.match(/^\s*(\d+)\.\s*kolo/)?.[1])
    if (!krog) continue
    for (const [, vrstica] of del.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const c = [...vrstica.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
      if (c.length < 8) continue
      const id = c[7].match(/\/takmicenja\/[^/"]+\/(\d+)"/)?.[1]
      const domaci = imeKluba(c[1].match(/<b>([^<]*)<\/b>/)?.[1] ?? '')
      const gostje = imeKluba(c[5].match(/<b>([^<]*)<\/b>/)?.[1] ?? '')
      if (!id || !domaci || !gostje) continue
      const { datum, ura } = datumUra(besedilo(c[0]))
      out.push({ krog, id, datum, ura, domaci, gostje, ...izidIz(c[3]) })
    }
  }
  return out
}

/** Sezona strani: najpogostejša sezona datumov tekem. */
export function sezonaTekem(tekme) {
  const st = new Map()
  for (const t of tekme) {
    const s = sezonaIzDatuma(t.datum)
    if (s) st.set(s, (st.get(s) ?? 0) + 1)
  }
  return [...st.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** Tekme lige iz šifre; stran druge sezone ali brez krogov ustavi uvoz. */
export function tekmeLige(koda, html) {
  const { sezona } = razberiKodo(koda)
  if (!jeStranLige(html)) throw new Error(`nsfbih: ${naslovLige(koda)} ni stran lige (${String(html ?? '').length} B) — uvoz ustavljen`)
  const tekme = tekmeStrani(html)
  const kaze = sezonaTekem(tekme)
  if (kaze !== sezona)
    throw new Error(`nsfbih: ${naslovLige(koda)} kaže sezono ${kaze ?? '?'}, ne ${sezona} — popravi source_league_code; uvoz ustavljen`)
  return tekme
}

/** Kontumacija: izid za zeleno mizo ("*"). */
export const jeKontumacija = (t) => !!t.izid && t.zelenaMiza

/**
 * Razpored v obliko uvoza razporeda: vse tekme, tudi neodigrane. Tekma z
 * izidom je odigrana; zelena miza je kontumacija z registriranim izidom.
 */
export function razcleniRazpored(koda, html) {
  const krogi = new Map()
  for (const t of tekmeLige(koda, html)) {
    const kontumacija = jeKontumacija(t)
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija,
      odigrana: !!t.izid,
      ...(kontumacija ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------

// Ikona in besedilo za njo do naslednje oznake: "(P) 66'", "(AG) 25'", "90+4'".
// Minuta včasih manjka (rumeni brez minute, Bratstvo 54189129) — karton
// ostane, z opozorilom.
const DOGODEK = /<(?:i|div) class="event-icon ([^"]*)"><\/(?:i|div)>([^<]*)/g

/** Vrsta dogodka iz razredov ikone. */
function vrstaDogodka(razredi, oznaka) {
  if (/event-icon-goal/.test(razredi)) return oznaka === 'AG' ? 'avtogol' : oznaka === 'P' ? 'enajstmetrovka' : 'gol'
  if (/event-icon-card/.test(razredi)) return /bg-danger/.test(razredi) ? 'rdeci' : /bg-warning/.test(razredi) ? 'rumeni' : `karton ${razredi}`
  if (/icon-right/.test(razredi)) return /text-success/.test(razredi) ? 'noter' : /text-danger/.test(razredi) ? 'ven' : `menjava ${razredi}`
  return razredi
}
const ZNANE = new Set(['gol', 'enajstmetrovka', 'avtogol', 'rumeni', 'rdeci', 'noter', 'ven'])

/** Igralci ene notranje tabele (ena ekipa, en razdelek). */
function igralciTabele(tabela, zacetnik) {
  const out = []
  for (const [, vrstica] of String(tabela).matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const c = [...vrstica.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((m) => ({ atr: m[1], html: m[2] }))
    const dres = c.find((x) => /width="70"/.test(x.atr))
    const dogodkiCelica = c.find((x) => /table-events/.test(x.html))
    const imeCelica = c.find((x) => x !== dres && x !== dogodkiCelica)
    const ime = besedilo(imeCelica?.html)
    if (!ime) continue
    const dogodki = [...String(dogodkiCelica?.html ?? '').matchAll(DOGODEK)].map(([, razredi, za]) => ({
      vrsta: vrstaDogodka(razredi, String(za).match(/\((P|AG)\)/)?.[1]),
      minuta: /\d/.test(za) ? minuta(String(za).replace(/\((P|AG)\)/, '')) : null,
    }))
    // Dvojni vstop: rezerva "vstopi" dvakrat (Kobilica 56' in 79', Bratstvo
    // 54189113), ob 79' pa vstopi še drug brez para — poznejši vstop je v
    // resnici izstop. Leteče menjave na tej ravni niso dovoljene.
    const vstopi = dogodki.filter((d) => d.vrsta === 'noter' && d.minuta != null).sort((x, y) => x.minuta - y.minuta)
    for (const d of vstopi.slice(1)) {
      d.vrsta = 'ven'
      d.dvojniVstop = true
    }
    const prvi = (v) => dogodki.find((d) => d.vrsta === v)?.minuta ?? null
    out.push({
      st: /^\d+$/.test(besedilo(dres?.html)) ? Number(besedilo(dres?.html)) : null,
      ime,
      zacetnik,
      noter: prvi('noter'),
      ven: prvi('ven'),
      rdec: prvi('rdeci'),
      dogodki,
    })
  }
  return out
}

/** Dve notranji tabeli razdelka: [domači, gostje]. */
const tabeliRazdelka = (razdelek) =>
  [...String(razdelek).matchAll(/<table class="table">([\s\S]*?)<\/table>/g)].map((m) => m[1]).slice(0, 2)

/** Glava strani tekme: imena, izid, polčas, zelena miza, tekmovanje, sezona, krog, datum, ura. */
export function glavaTekme(html) {
  const s = brezSkript(html)
  const imena = [...s.matchAll(/<h5 class="mb-0">([^<]*)<\/h5>/g)].map((m) => imeKluba(m[1]))
  const rez = s.match(/<h3 class="mb-1">([^<]*)<\/h3>\s*([^<]*)</)
  const { izid, zelenaMiza } = izidIz(rez?.[1] ?? '')
  const p = String(rez?.[2] ?? '').trim().match(/^(\d+)\s*:\s*(\d+)/)
  const naslov = s.match(/<p><b>([\s\S]*?)<br>\s*(\d+)\.\s*kolo<\/b><br><br>([^<]*)<\/p>/)
  const { datum, ura } = datumUra(naslov?.[3] ?? '')
  const sez = String(naslov?.[1] ?? '').match(/(\d{2})\/(\d{2})\s*$/)
  return {
    domaci: imena[0] ?? null,
    gostje: imena[1] ?? null,
    izid,
    zelenaMiza,
    polcas: p ? { domaci: Number(p[1]), gostje: Number(p[2]) } : null,
    tekmovanje: naslov ? besedilo(naslov[1]) : null,
    sezona: sez ? `20${sez[1]}/${sez[2]}` : null,
    krog: naslov ? Number(naslov[2]) : null,
    datum,
    ura,
  }
}

/** Je stran tekme (glava z obema kluboma in krogom)? Stran z napako ali vzdrževanjem ni. */
export const jeStranTekme = (html) => {
  const g = glavaTekme(html)
  return !!(g.domaci && g.gostje && g.krog)
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida, je
 * izid za zeleno mizo (kontumacija) ali kateri od ekip manjka postava
 * (zapisnik še ni vnesen).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = brezSkript(html)
  const g = glavaTekme(s)
  if (!g.izid || g.zelenaMiza) return null
  const a = s.indexOf('Startna postava')
  const b = s.indexOf('Rezervni igrači', a)
  if (a < 0 || b < 0) return null
  const [zd = '', zg = ''] = tabeliRazdelka(s.slice(a, b))
  const [rd = '', rg = ''] = tabeliRazdelka(s.slice(b))
  const ekipe = [
    { ime: g.domaci ?? '', postava: igralciTabele(zd, true), rezerve: igralciTabele(rd, false) },
    { ime: g.gostje ?? '', postava: igralciTabele(zg, true), rezerve: igralciTabele(rg, false) },
  ]
  if (ekipe.some((e) => !e.postava.length)) return null

  const rezultat = g.izid
  const opozorila = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    const izstopi = []
    for (const [n, i] of [...e.postava, ...e.rezerve].entries()) {
      // COMET vratarja našteje prvega (namig, kot ffm, fssid in mlsz).
      i.vratar = n === 0 && i.zacetnik
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'gol') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'enajstmetrovka') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (d.vrsta === 'avtogol') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'rumeni') rumeni.push(z)
        else if (d.vrsta === 'rdeci') {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.st === i.st && r.ime === i.ime)) rdeci.push(z)
        } else if (d.vrsta === 'ven') izstopi.push({ st: i.st, ime: i.ime, minuta: d.minuta })
        if (!ZNANE.has(d.vrsta)) opozorila.push(`${e.ime}: neznan dogodek "${d.vrsta}" pri ${i.ime}`)
        if (d.minuta == null) opozorila.push(`${e.ime}: dogodek "${d.vrsta}" pri ${i.ime} brez minute`)
        if (d.dvojniVstop) opozorila.push(`${e.ime}: ${i.ime} dvakrat vstopi — vstop v ${d.minuta}. minuti je izstop`)
      }
    }
    // Menjave: vstop in izstop ob isti minuti tvorita par (kot lff).
    for (const i of [...e.rezerve, ...e.postava].filter((x) => x.noter != null)) {
      const j = izstopi.findIndex((x) => x.minuta === i.noter)
      const ven = j >= 0 ? izstopi.splice(j, 1)[0] : { st: null, ime: null }
      menjave.push({ ekipaIdx, minuta: i.noter, noter: { st: i.st, ime: i.ime }, ven: { st: ven.st, ime: ven.ime } })
    }
    for (const x of izstopi) menjave.push({ ekipaIdx, minuta: x.minuta, noter: { st: null, ime: null }, ven: { st: x.st, ime: x.ime } })
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const imena = new Map()
    for (const i of [...e.postava, ...e.rezerve]) imena.set(`${i.st}|${i.ime}`, (imena.get(`${i.st}|${i.ime}`) ?? 0) + 1)
    for (const [k, n] of imena) if (n > 1) opozorila.push(`${e.ime}: igralec ${k.split('|')[1]} je v zapisniku ${n}-krat`)
  })

  zdruziDvojneGole(goli, rezultat, ekipe, opozorila)
  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  const sezonaDatuma = sezonaIzDatuma(g.datum)
  if (g.sezona && sezonaDatuma && g.sezona !== sezonaDatuma)
    opozorila.push(`sezona v naslovu ${g.sezona} ni sezona datuma ${sezonaDatuma}`)

  const vObliko = ({ dogodki: _d, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: g.sezona ?? sezonaDatuma,
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: g.polcas,
    goli,
    // Zgrešenih 11 m stran ne objavlja.
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

// --- prenos ----------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new NsfbihZavrnitev(`nsfbih: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new NsfbihZavrnitev(`nsfbih: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/** Stran tekme; napaka ali vzdrževanje (ni glave tekme) se prebere še enkrat sveže. */
async function stranTekme(prenesi, url, ime, sveze) {
  const html = await beri(prenesi, url, ime, sveze)
  return !jeStranTekme(html) && !sveze ? beri(prenesi, url, ime, true) : html
}

const vir = {
  ime: 'nsfbih',
  polnoIme: 'Nogometni savez Federacije BiH (nsfbih.ba)',
  drzava: 'BA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (koda, id) => naslovTekme(razberiKodo(koda).slug, id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new NsfbihZavrnitev(`nsfbih: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // V predpomnilnik gre le prava stran (liga ali tekma), nikoli stran z
  // napako ali vzdrževanjem, ki bi jo strežnik vrnil s 200.
  zaPredpomnilnik: (html, datoteka = '') =>
    /^nsfbih-tekma-/.test(datoteka) ? jeStranTekme(html) : /^nsfbih-liga-/.test(datoteka) ? jeStranLige(html) : jeStranLige(html) || jeStranTekme(html),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
  },

  async zapisniki(koda, prenesi) {
    const { slug, sezona } = razberiKodo(koda)
    const tekme = tekmeLige(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
    const out = []
    for (const t of tekme.filter((x) => x.izid && !jeKontumacija(x))) {
      const url = naslovTekme(slug, t.id)
      const id = sifraZapisnika(t.id)
      const star = starostDni(t.datum)
      // Zapisnik zadnjih dni se lahko še popravlja; brez postav ga 45 dni beremo znova.
      const sveze = star <= 3
      let z = vZapisnik(await stranTekme(prenesi, url, imeTekme(t.id), sveze), { id, url })
      if (!z && !sveze && star <= 45) z = vZapisnik(await beri(prenesi, url, imeTekme(t.id), true), { id, url })
      if (!z) continue
      // Ime kluba in krog s strani lige, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid na strani lige ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaBa,
  kratkoIme: kratkoImeBa,
  poenostavi: kljucKlubaBa,
}

export default vir
