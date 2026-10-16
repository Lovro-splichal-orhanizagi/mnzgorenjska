// Vir: Професіональна футбольна ліга України (PFL) — pfl.ua.
//
// PFL vodi Peršo ligo (raven 2) in Drugo ligo A in B (raven 3). Glej docs/viri/ukrajina.md
// (Ukrajina — vir pfl-ua). Nižjih lig (amaterji AAFU, oblastne zveze) na
// pfl.ua ni.
//
// ŠIFRA LIGE je `<liga>/<turnir>`: `<liga>` je oznaka javnega koledarja JSON
// (`1`, `2a`, `2b`; ob delitvi Perše lige `1a`, `1b`), `<turnir>` id
// tekmovanja ene sezone (`2a/1354` = Druga liga A 2026/27). Vsaka sezona ima
// svoj id (izbirnik sezon na `/calendar/<turnir>`); ob novi sezoni se popravi
// le `<turnir>`.
//
// RAZPORED tekoče sezone je javni JSON `/calendar-json/<liga>` (stran `/custom/6`:
// "Авторизація та API-ключ не потрібні"): tours[].matches[] z matchId, datumom,
// uro (kijevski čas; null, dokler ni objavljena), klubi s teamId in izidom
// (`score.finished`). Če JSON kaže drug turnir (arhiv, nova sezona), beremo
// HTML koledar `/calendar/<turnir>` (zavihki `id="tourN"`, datum "02.08.26",
// ura ali "не визнач.", izid "2 : 3" ali "– : –").
//
// ZAPISNIK `/game/index/<id>`: glava (tekmovanje, "1-й тур", izid v `#m<id>`,
// datum "02.08.26" in ura po kijevsko), zavihek "Склади" z obema postavama
// (`squad-title` loči domače in goste): vrstica `bg-white` = začetnik,
// `bg-dark-subtle` = klop; dres, priimek in ime s povezavo `/player/view/<id>`
// (stalna šifra osebe → `regSt`), "(K)" kapetan. Dogodki pri igralcu z minuto
// ("58'", "90+3'" → 90): `icon-ball` gol, `icon-ball-plus` gol z 11 m,
// `icon-autogoal` avtogol (pri strelcu v njegovi ekipi), `icon-ball-miss`
// zgrešena 11 m, `icon-yellow` rumeni, `icon-cards` drugi rumeni (rdeči),
// `icon-red` rdeči; menjava je povezava z `icon-up` (vstop) ali `icon-down`
// (izstop) in minuto — leteče menjave so mogoče. Vratarja zapisnik ne označi;
// zavihek "Схема" ima postavitev začetnikov obeh ekip, vsaka na svojem
// igrišču (`chip` s `top:`): vratar je edini začetnik ob golovi črti — pri
// domačih zgoraj, pri gostih spodaj (namig, kot mlsz). Tehnični poraz (KDK)
// je opomba `bg-warning-subtle` nad zapisnikom: izid je za zeleno mizo,
// dogodki in postave so z igrišča.
//
// robots.txt: "User-agent: * / Allow: /". Beremo odkrito (User-Agent SLFF,
// 3 s med zahtevki), zapisnikov, starejših od tedna, ne beremo znova. Ob
// izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vLjubljanskiCas } from './frf.mjs'
import { nastopi as nastopiHlf } from './hlf.mjs'

const OSNOVNI = 'https://pfl.ua'
const DOLZINA_TEKME = 90
// Stran tekme z izidom brez postav (klub postav še ni vnesel, delna stran) do
// toliko dni po tekmi preberemo znova svežo, starejšo pustimo (kontumacija).
const PONOVNO_DNI = 45
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi ---------------------------------------------------------------

/** "2a/1354" → { liga: '2a', turnir: 1354 }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(1|1a|1b|2|2a|2b)\/(\d+)$/)
  if (!m) throw new Error(`pfl-ua: šifra lige je "<liga>/<turnir>" (npr. 2a/1354), ne "${koda}"`)
  return { liga: m[1], turnir: Number(m[2]) }
}

export const naslovJson = (koda) => `${OSNOVNI}/calendar-json/${razberiKodo(koda).liga}`
export const naslovKoledarja = (koda) => `${OSNOVNI}/calendar/${razberiKodo(koda).turnir}`
export const naslovTekme = (id) => `${OSNOVNI}/game/index/${String(id).replace(/^ua/, '')}`
// Šifra zapisnika v bazi je `ua<id>`: id tekme PFL (16xxx) se prekriva s
// šiframi drugih virov, `matches.zapisnik_id` pa je enoličen čez vse vire.
export const sifraZapisnika = (id) => `ua${String(id).replace(/^ua/, '')}`
const imeJson = (koda) => `koledar-${razberiKodo(koda).liga}.json`
const imeKoledarja = (koda) => `koledar-${razberiKodo(koda).turnir}.html`
const imeTekme = (id) => `tekma-${String(id).replace(/^ua/, '')}.html`

// --- pomožno ---------------------------------------------------------------------------

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&#0?39;/g, "'"))
    .replace(/\s+/g, ' ')
    .trim()

/** "58'" → 58, "90+3'" → 90, "45+1" → 45; "ПМ'" (після матчу, karton po koncu) → 90. */
export function minuta(s) {
  if (/^\s*ПМ/.test(String(s ?? ''))) return DOLZINA_TEKME
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "02.08.26" ali "02.08.2026" → "2026-08-02". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\b/)
  if (!m) return null
  const leto = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${leto}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** Kijevski čas (EET/EEST, isti kot bukareški) → ljubljanski { datum, ura }; brez ure ura null. */
export function casIz(datum, ura) {
  const u = String(ura ?? '').match(/^\s*(\d{1,2}):(\d{2})\s*$/)
  return u ? vLjubljanskiCas(datum, `${u[1].padStart(2, '0')}:${u[2]}`) : { datum, ura: null }
}

/** "2026/27 Друга ліга А" → "2026/27". */
export const sezonaIz = (s) => {
  const m = String(s ?? '').match(/(\d{4})\s*\/\s*(\d{2})(?!\d)/)
  return m ? `${m[1]}/${m[2]}` : null
}

/** Izziv (Cloudflare, CAPTCHA). */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? ''))

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class PflZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'PflZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

// Isto ime, drug klub: "Нива" je v Perši ligi Ternopil, v Drugi ligi A Vinnica.
// Ime po šifri kluba PFL (teamId). Šifra kluba ni nujno stalna: Vinnica je
// 2025/26 igrala kot 1177 (domače tekme na "НТБ Нива"), 2026/27 kot 1175.
// Ob novi ligi ali sezoni preveri trke znova.
const IME_KLUBA = new Map([
  [1170, 'Нива (Тернопіль)'],
  [1175, 'Нива (Вінниця)'],
  [1177, 'Нива (Вінниця)'],
])
export const imeKluba = (id, ime) => IME_KLUBA.get(Number(id)) ?? String(ime ?? '').trim()

// --- razpored ------------------------------------------------------------------------

const izid = (d, g) => (Number.isInteger(d) && Number.isInteger(g) ? { domaci: d, gostje: g } : null)

/**
 * Koledar JSON: { liga, turnir, sezona, tekme: [{ krog, id, datum, ura, domaci,
 * domaciId, gostje, gostjeId, izid }] }. Datum in ura sta ljubljanska.
 */
export function tekmeJson(besedilo) {
  let d
  try {
    d = JSON.parse(besedilo)
  } catch {
    throw new Error(`pfl-ua: koledar ni JSON (${String(besedilo).slice(0, 60)}…) — uvoz ustavljen`)
  }
  const tekme = []
  for (const t of d.tours ?? []) {
    for (const m of t.matches ?? []) {
      const s = m.score ?? {}
      tekme.push({
        krog: Number(t.tour),
        id: Number(m.matchId),
        ...casIz(m.date ?? null, m.time ?? null),
        domaci: imeKluba(m.home?.teamId, m.home?.name),
        domaciId: Number(m.home?.teamId) || null,
        gostje: imeKluba(m.away?.teamId, m.away?.name),
        gostjeId: Number(m.away?.teamId) || null,
        izid: s.finished ? izid(s.home, s.away) : null,
      })
    }
  }
  return { liga: d.league ?? null, turnir: Number(d.tournamentId) || null, sezona: sezonaIz(d.season), tekme }
}

/** HTML koledar `/calendar/<turnir>`: { turnir, sezona, tekme } (oblika kot `tekmeJson`). */
export function tekmeKoledarja(html, turnir) {
  const s = cisto(html)
  const sezona = sezonaIz(besedilo(s.match(new RegExp(`<option value="${turnir}"[^>]*>([^<]*)<`))?.[1]))
  const konec = s.indexOf('id="ex1-tabs-2"')
  const telo = konec > 0 ? s.slice(0, konec) : s
  const tekme = []
  for (const del of telo.split(/<div id="tour(?=\d+")/).slice(1)) {
    const krog = Number(del.match(/^(\d+)"/)?.[1])
    for (const v of del.split('<div class="row bg-white rounded-3 flex-row').slice(1)) {
      const id = Number(v.match(/href="\/game\/index\/(\d+)"/)?.[1])
      const klubi = [...v.matchAll(/<a href="\/team\/view\/(\d+)"[\s\S]*?<div class="d-none d-lg-inline-flex ?">([^<]*)<\/div>/g)]
      if (!id || !krog || klubi.length < 2) continue
      const celice = [...v.matchAll(/<div class="text-nowrap[^"]*">\s*([^<]*?)\s*<\/div>/g)].map((x) => x[1])
      const datum = datumIz(celice[0])
      const st = besedilo(v.match(/href="\/game\/index\/\d+"[^>]*>\s*<span[^>]*>([^<]*)<\/span>/)?.[1]).match(/^(\d+)\s*:\s*(\d+)$/)
      tekme.push({
        krog,
        id,
        ...casIz(datum, celice[1]),
        domaci: imeKluba(klubi[0][1], razpakiraj(klubi[0][2])),
        domaciId: Number(klubi[0][1]),
        gostje: imeKluba(klubi[1][1], razpakiraj(klubi[1][2])),
        gostjeId: Number(klubi[1][1]),
        izid: st ? izid(Number(st[1]), Number(st[2])) : null,
      })
    }
  }
  return { turnir: Number(turnir), sezona, tekme }
}

/** Razpored v obliko uvoza razporeda. Kontumacijo najde `kontumacije` (zapisnik brez postav). */
export function razporedIzTekem(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      pflId: t.id, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------------

const DOGODKI = {
  'ball': 'gol',
  'ball-plus': 'enajstmetrovka',
  'autogoal': 'avtogol',
  'ball-miss': 'zgresena',
  'yellow': 'rumeni',
  'cards': 'drugiRumeni',
  'red': 'rdeci',
}

/** Glava strani tekme: { tekmovanje, krog, domaci, gostje, domaciId, gostjeId, izid, datum, ura }. */
export function glavaStrani(html) {
  const s = cisto(html)
  const i = s.indexOf('<div class="site-index"')
  const j = s.indexOf('icon-viewers', i)
  const g = i >= 0 ? s.slice(i, j > i ? j : undefined) : ''
  if (!g) return null
  const p = [...(g.match(/<div class="row align-items-center g-0 text-center fs-5">([\s\S]*?)<\/div>/)?.[1] ?? '').matchAll(/<p>([^<]*)<\/p>/g)].map((m) => besedilo(m[1]))
  const klubi = []
  for (const m of g.matchAll(/<a href="\/team\/view\/(\d+)">\s*([^<\s][^<]*?)\s*<\/a>/g)) if (!klubi.some((k) => k.id === m[1])) klubi.push({ id: m[1], ime: razpakiraj(m[2]).trim() })
  const st = besedilo(g.match(/<div [^>]*id="m\d+"[^>]*>\s*<span[^>]*>([^<]*)<\/span>/)?.[1]).match(/^(\d+)\s*:\s*(\d+)$/)
  const datum = datumIz(besedilo(g.match(/icon-data"><\/span>([\s\S]*?)<\/div>/)?.[1]))
  const ura = besedilo(g.match(/icon-clock"><\/span>([\s\S]*?)<\/div>/)?.[1])
  // Opomba nad zapisnikom ("… зараховано технічну поразку 0:3 …").
  const opomba = besedilo(s.match(/<div class="bg-warning-subtle[^"]*">([\s\S]*?)<\/div>\s*<\/div>/)?.[1]) || null
  return {
    opomba,
    tehnicnaPoraza: /технічн\S* поразк/i.test(opomba ?? ''),
    tekmovanje: p[0] ?? null,
    krog: Number(p.find((x) => /тур/.test(x))?.match(/(\d+)/)?.[1]) || null,
    domaci: klubi[0] ? imeKluba(klubi[0].id, klubi[0].ime) : null,
    domaciId: Number(klubi[0]?.id) || null,
    gostje: klubi[1] ? imeKluba(klubi[1].id, klubi[1].ime) : null,
    gostjeId: Number(klubi[1]?.id) || null,
    izid: st ? izid(Number(st[1]), Number(st[2])) : null,
    ...casIz(datum, ura),
  }
}

/** Igralec ene vrstice zavihka "Склади". */
function igralecVrstice(vrstica, zacetnik) {
  const regSt = Number(vrstica.match(/href="\/player\/view\/(\d+)"/)?.[1]) || null
  const deli = [...vrstica.matchAll(/<a href="\/player\/view\/\d+"\s*>([\s\S]*?)<\/a>/g)].map((m) => besedilo(m[1]))
  const ime = deli.filter(Boolean).join(' ')
  if (!ime) return null
  const st = besedilo(vrstica.match(/<div class="col-2 col-sm-1">([^<]*)<\/div>/)?.[1])
  const dogodki = []
  // Ikona (z notranjimi `path` deli) in takoj za njo minuta.
  const ikona = String.raw`<span class="icon-([a-z-]+)">(?:\s*<span class="path\d+">[^<]*<\/span>)*\s*<\/span>\s*<span>([^<]*)<\/span>`
  for (const m of vrstica.matchAll(new RegExp(ikona, 'g'))) {
    if (m[1] === 'up' || m[1] === 'down') continue
    dogodki.push({ vrsta: DOGODKI[m[1]] ?? `?${m[1]}`, minuta: minuta(m[2]) })
  }
  // Menjave: povezava z ikono gor (vstop) ali dol (izstop) in minuto.
  const menjave = [...vrstica.matchAll(new RegExp(String.raw`game-squad-substitution"[^>]*aria-label="([^"]*)"[^>]*>` + ikona, 'g'))].filter((m) => m[2] === 'up' || m[2] === 'down').map((m) => ({
    smer: m[2],
    minuta: minuta(besedilo(m[3])),
    opis: besedilo(m[1]),
  }))
  return {
    st: /^\d+$/.test(st) ? Number(st) : null,
    ime,
    regSt,
    zacetnik,
    kapetan: /\((?:K|К)\)/.test(vrstica),
    dogodki,
    menjave,
  }
}

/** Postavi: [[igralci domačih], [igralci gostov]] (začetniki in klop). */
export function postaviStrani(html) {
  const s = cisto(html)
  const i = s.indexOf('id="ex1-tabs-1"')
  const j = s.indexOf('id="ex1-tabs-2"')
  if (i < 0) return [[], []]
  const zavihek = s.slice(i, j > i ? j : undefined)
  const ekipe = zavihek.split('squad-title').slice(1, 3).map((del) => {
    const igralci = []
    for (const v of del.split(/<div class="row p-2 g-0 align-items-center m[se]-md-1 rounded-3 my-1 /).slice(1)) {
      const razred = v.match(/^([a-z-]+)/)?.[1]
      if (razred !== 'bg-white' && razred !== 'bg-dark-subtle') continue
      if (!/\/player\/view\//.test(v)) continue
      const x = igralecVrstice(v, razred === 'bg-white')
      if (x) igralci.push(x)
    }
    return igralci
  })
  while (ekipe.length < 2) ekipe.push([])
  return ekipe
}

/**
 * Vratar iz zavihka "Схема": šifre igralcev ob golovi črti obeh ekip. Ekipa
 * stoji na eni polovici igrišča; vratar je edini začetnik na skrajni vrstici
 * (najmanjši `top` domačih, največji gostov). Brez postavitve ali ob dvoumni
 * vrstici ga ni.
 */
export function vratarjiIzSheme(html, ekipe) {
  const s = cisto(html)
  const i = s.indexOf('id="ex1-tabs-2"')
  if (i < 0) return new Set()
  const top = new Map()
  for (const m of s.slice(i).matchAll(/<div class="chip"\s+id="player_(\d+)"\s+style="[^"]*?top:\s*([\d.]+)%/g)) top.set(Number(m[1]), Number(m[2]))
  const out = new Set()
  for (const [idx, igralci] of ekipe.entries()) {
    const t = igralci.filter((x) => x.zacetnik && top.has(x.regSt)).map((x) => ({ id: x.regSt, top: top.get(x.regSt) }))
    if (t.length < 7) continue
    // Vsaka ekipa ima svoje igrišče: domači vratar je zgoraj, gostujoči spodaj.
    const skrajni = idx === 0 ? Math.min(...t.map((x) => x.top)) : Math.max(...t.map((x) => x.top))
    const na = t.filter((x) => Math.abs(x.top - skrajni) < 0.5)
    if (na.length === 1) out.add(na[0].id)
  }
  return out
}

/**
 * Zapisnik v obliko drugih virov. Null, če tekma nima izida ali kateri od ekip
 * manjka postava (neodigrana tekma, kontumacija).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const g = glavaStrani(html)
  if (!g?.izid) return null
  const ekipe = postaviStrani(html)
  if (!ekipe[0].some((x) => x.zacetnik) || !ekipe[1].some((x) => x.zacetnik)) return null
  const vratarji = vratarjiIzSheme(html, ekipe)
  const imeni = [g.domaci, g.gostje]
  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []

  ekipe.forEach((igralci, ekipaIdx) => {
    const izstopi = []
    for (const i of igralci) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime, regSt: i.regSt }
      const drugi = i.dogodki.some((d) => d.vrsta === 'drugiRumeni')
      let rumenih = 0
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'gol') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'enajstmetrovka') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (d.vrsta === 'avtogol') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'zgresena') zgresene.push(z)
        else if (d.vrsta === 'rumeni') {
          // Drugi rumeni: ostane 1 rumeni + 1 rdeči, kot pri drugih virih.
          if (!(drugi && rumenih >= 1)) rumeni.push(z)
          rumenih++
        } else if (d.vrsta === 'rdeci' || d.vrsta === 'drugiRumeni') {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.regSt === i.regSt && r.ime === i.ime)) rdeci.push(z)
        } else opozorila.push(`${imeni[ekipaIdx]}: neznan dogodek "${d.vrsta.slice(1)}" pri ${i.ime}`)
        if (d.minuta == null) opozorila.push(`${imeni[ekipaIdx]}: dogodek "${d.vrsta}" pri ${i.ime} brez minute`)
      }
      for (const m of i.menjave) {
        if (m.minuta == null) opozorila.push(`${imeni[ekipaIdx]}: menjava pri ${i.ime} brez minute`)
        else if (m.smer === 'down') izstopi.push({ st: i.st, ime: i.ime, minuta: m.minuta })
      }
      i.preklopi = i.menjave.filter((m) => m.minuta != null).map((m) => m.minuta).sort((a, b) => a - b)
      i.vratar = vratarji.has(i.regSt)
    }
    // Menjave: opis povezave je "46': <ven>, <noter>"; par je izstop ob isti
    // minuti z imenom iz opisa (ob več menjavah v isti minuti), sicer prvi ob njej.
    for (const i of igralci) {
      for (const m of i.menjave.filter((x) => x.smer === 'up' && x.minuta != null)) {
        const imeVen = m.opis.match(/^[^:]*:\s*(.+?),\s*(.+)$/)?.[1]?.trim()
        let j = izstopi.findIndex((x) => x.minuta === m.minuta && x.ime === imeVen)
        if (j < 0) j = izstopi.findIndex((x) => x.minuta === m.minuta)
        const ven = j >= 0 ? izstopi.splice(j, 1)[0] : { st: null, ime: null }
        menjave.push({ ekipaIdx, minuta: m.minuta, noter: { st: i.st, ime: i.ime }, ven: { st: ven.st, ime: ven.ime } })
      }
    }
    for (const x of izstopi) menjave.push({ ekipaIdx, minuta: x.minuta, noter: { st: null, ime: null }, ven: { st: x.st, ime: x.ime } })

    const postava = igralci.filter((x) => x.zacetnik)
    if (postava.length !== 11) opozorila.push(`${imeni[ekipaIdx]}: v postavi je ${postava.length} igralcev namesto 11`)
    if (!postava.some((x) => x.vratar)) opozorila.push(`${imeni[ekipaIdx]}: vratarja iz postavitve ni`)
    const sifre = new Map()
    for (const x of igralci) sifre.set(x.regSt, (sifre.get(x.regSt) ?? 0) + 1)
    for (const [k, n] of sifre) if (n > 1) opozorila.push(`${imeni[ekipaIdx]}: igralec ${k} je v zapisniku ${n}-krat`)
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  // Pri tehničnem porazu ostane `rezultat` uradni izid (tekma, lestvica, zmaga),
  // prejeti goli in čista mreža igralcev pa so z igrišča (`nastopi`).
  const izidIgrisca = g.tehnicnaPoraza ? { domaci: zaEkipo(0), gostje: zaEkipo(1) } : undefined
  // Tehnični poraz: izid je za zeleno mizo (3:0), goli in nastopi z igrišča.
  if (g.tehnicnaPoraza) opozorila.push(`tehnični poraz (KDK): izid ${g.izid.domaci}:${g.izid.gostje} je za zeleno mizo, goli z igrišča ${zaEkipo(0)}:${zaEkipo(1)}`)
  else if (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje)
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)

  const vObliko = (i) => ({
    st: i.st,
    ime: i.ime,
    regSt: i.regSt,
    zacetnik: i.zacetnik,
    kapetan: i.kapetan,
    vratar: i.vratar,
    pozicija: i.vratar ? 'GK' : null,
    preklopi: i.preklopi,
  })
  const sestava = ekipe.map((igralci, idx) => ({
    ime: imeni[idx],
    postava: igralci.filter((x) => x.zacetnik).map(vObliko),
    rezerve: igralci.filter((x) => !x.zacetnik).map(vObliko),
  }))

  return {
    zapisnikId: id,
    url,
    sezona: null, // da koledar (zapisnik pove le datum)
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    liga: g.tekmovanje,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: g.izid,
    ...(izidIgrisca ? { tehnicnaPoraza: true, izidIgrisca } : {}),
    // Polčasa stran ne pove.
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

// --- klubi ---------------------------------------------------------------------------------

// Latinične črke, ki jih vir piše sredi cirilične besede ("Гірник-Cpорт" z
// latiničnim C, 2025/26): v ključu postanejo cirilične.
const LAT_CIR = { a: 'а', c: 'с', e: 'е', i: 'і', o: 'о', p: 'р', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', h: 'н', b: 'в' }

/** Ključ kluba: male črke z ukrajinskimi znaki (і, ї, є, ґ), apostrof odpade. */
export const kljucKlubaUa = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('uk')
    .replace(/['’ʼ`]/g, '')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()
    .split(' ')
    .map((b) => (/\p{Script=Cyrillic}/u.test(b) ? b.replace(/[aceiopxykmthb]/g, (c) => LAT_CIR[c]) : b))
    .join(' ')

/** Kratko ime: PFL piše klube že kratko ("Самбір-Нива-2", "Нива (Вінниця)"). */
export const kratkoImeUa = (polno) => razpakiraj(polno).replace(/\s+/g, ' ').trim()

// --- branje ------------------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const jeTriNic = (i) => (i?.domaci === 3 && i?.gostje === 0) || (i?.domaci === 0 && i?.gostje === 3)

/**
 * Nastopi kot pri hlf (po šifri osebe) in še: zgrešene 11-metrovke (hlf jih
 * nima) ter pri tehničnem porazu prejeti goli in čista mreža z igrišča, ne iz
 * uradnega izida za zeleno mizo.
 */
export const nastopi = (z) =>
  nastopiHlf(z).map((n) => {
    const out = {
      ...n,
      zgreseneEnajstmetrovke: (z.zgresene ?? []).filter((k) => k.ekipaIdx === n.ekipaIdx && (n.regSt != null ? k.regSt === n.regSt : k.ime === n.ime)).length,
    }
    if (z.izidIgrisca) {
      out.prejetiGoli = n.ekipaIdx === 0 ? z.izidIgrisca.gostje : z.izidIgrisca.domaci
      out.cleanSheet = out.prejetiGoli === 0
    }
    return out
  })

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev || e.status === 403 || e.status === 429) throw new PflZavrnitev(`pfl-ua: ${url} → HTTP ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status ?? null)
    throw e
  }
  if (jeIzziv(html)) throw new PflZavrnitev(`pfl-ua: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

/**
 * Tekme lige: JSON koledar, če kaže iskani turnir (tekoča sezona), sicer HTML
 * koledar turnirja (arhiv). Koledar brez tekem ali brez sezone ustavi uvoz.
 */
export async function koledar(koda, prenesi) {
  const { turnir } = razberiKodo(koda)
  let k = null
  try {
    const j = tekmeJson(await beri(prenesi, naslovJson(koda), imeJson(koda), true))
    if (j.turnir === turnir) k = j
  } catch (e) {
    if (e.zavrnitev) throw e
    console.warn(`pfl-ua: koledar JSON ni uporaben (${e.message}) — berem HTML koledar`)
  }
  k ??= tekmeKoledarja(await beri(prenesi, naslovKoledarja(koda), imeKoledarja(koda), true), turnir)
  if (!k.tekme.length || !k.sezona) throw new Error(`pfl-ua: koledar turnirja ${turnir} je brez tekem ali sezone — uvoz ustavljen`)
  return k
}

const vir = {
  ime: 'pfl-ua',
  polnoIme: 'Професіональна футбольна ліга України (pfl.ua)',
  drzava: 'UA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda: naslovJson,
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new PflZavrnitev(`pfl-ua: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem((await koledar(koda, prenesi)).tekme)
  },

  async zapisniki(koda, prenesi) {
    const k = await koledar(koda, prenesi)
    const out = []
    for (const t of k.tekme.filter((x) => x.izid)) {
      const url = naslovTekme(t.id)
      // Zapisnik zadnjega tedna se lahko še popravlja; starejšega ne beremo znova.
      const starost = starostDni(t.datum)
      let z = vZapisnik(await beri(prenesi, url, imeTekme(t.id), starost <= 7), { id: t.id, url })
      // Stran iz predpomnilnika brez postav (shranjena, ko je bil izid že
      // objavljen, postave pa še ne) bi obtičala: do 45 dni jo preberemo svežo.
      if (!z && starost > 7 && starost <= PONOVNO_DNI) z = vZapisnik(await beri(prenesi, url, imeTekme(t.id), true), { id: t.id, url })
      if (!z) {
        // 3:0 brez postav je kontumacija (`kontumacije`), ostalo javimo.
        if (!jeTriNic(t.izid)) console.warn(`pfl-ua: ${t.id} ima izid, zapisnik brez postav — preskočen`)
        continue
      }
      // Klubi, krog in sezona s koledarja, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = k.sezona
      z.datum = t.datum ?? z.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid koledarja ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
   * zapisnik nima postav. Bere le take tekme (v isti predpomnilnik).
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.pflId || !t.datum || t.datum > teden) continue
        if (!jeTriNic(i)) continue
        const html = await prenesiKrog(naslovTekme(t.pflId), imeTekme(t.pflId), t.datum)
        if (jeIzziv(html)) throw new PflZavrnitev(`pfl-ua: ${naslovTekme(t.pflId)} vrne izziv (CAPTCHA)`)
        if (!vZapisnik(html) && glavaStrani(html)?.izid) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaUa,
  kratkoIme: kratkoImeUa,
  poenostavi: kljucKlubaUa,
}

export default vir
