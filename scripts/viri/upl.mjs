// Vir: Українська Прем'єр-Ліга (УПЛ) — upl.ua.
//
// UPL vodi najvišjo ligo (16 klubov, 30 krogov). Glej docs/viri/ukrajina.md (Ukrajina —
// vir upl). Perša in Druga liga sta pri `pfl-ua` (pfl.ua).
//
// ŠIFRA LIGE je id prvenstva ene sezone (`432` = 2026/27, `428` = 2025/26;
// izbirnik sezon je na strani prvenstva). Ob novi sezoni se popravi le id.
//
// RAZPORED `/ua/tournaments/championship/<id>/calendar`: vsi krogi
// ("1 -й тур") na eni strani, pod krogom datumi ("31.07.2026", kijevski čas)
// in tekme: domači, celica izida in gostje (le imena, brez šifer klubov).
// Celica je povezava `/ua/report/view/<id>` z izidom ("2 : 0") pri odigrani,
// z uro ("13:00") pri razpisani, ali le "-" (krog še ni razpisan, ni
// povezave). Tekma, prestavljena v drug mesec, ostane v svojem krogu z novim
// datumom.
//
// ZAPISNIK `/ua/report/view/<id>` ("Рапорт арбітра"): glava (tekmovanje,
// "1-й тур", datum in ura po kijevsko "03.08.2026. Понеділок, 18:00", klubi s
// `/clubs/view/<id>`, izid), dva bloka `team-players` (domači, gostje) z
// "Стартовий склад", "Запасні" in "Тренер" (ne beremo); igralec ima dres in
// povezavo `/ua/people/view/<id>` (stalna šifra osebe → `regSt`), "(К)"
// kapetan. Dogodki so časovnica `event type-<vrsta>` z minuto ("32'",
// "90+2'" → 90) in imenom igralca (ne šifro); stran domačih je
// `justify-content: flex-end`, gostje imajo prazno levo celico. Vrste:
// `score-1` gol, `score-3` gol z 11 m, `score-2` avtogol (pri ekipi strelca,
// šteje nasprotniku), `score-4` zgrešena 11 m, `card-0` rumeni, `card-2`
// drugi rumeni (prvi je svoj dogodek → 1 rumeni + rdeči), `card-1` rdeči,
// `change` menjava "ven<br>noter". Vratar: postavitev (`#field` domači,
// `#field2` gostje, `chip id="player_<id>"` s `top:`) — vratar je edini
// začetnik ob golovi črti, pri domačih zgoraj, pri gostih spodaj (kot pfl-ua).
// Tehnični poraz (KDK) je opomba `public-description` nad časovnico; tak
// zapisnik nima postav in je kontumacija (`kontumacije`). Karton po koncu
// tekme ima minuto "FT" → 90.
//
// robots.txt: "User-agent: * / Disallow:" (vse dovoljeno). Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki), zapisnikov, starejših od tedna, ne
// beremo znova. Ob izzivu, CAPTCHI, prijavi, 401, 403 ali 429 se uvoz ustavi
// (`UplZavrnitev`, izhod 4) — ne obhajaj. Obrazec za novice v nogi strani
// (`<div class="captcha">`) ni izziv.
import { razpakiraj } from '../klubi.mjs'
import { casIz, minuta as minutaPfl, kljucKlubaUa, kratkoImeUa, nastopi as nastopiPfl } from './pfl-ua.mjs'

const OSNOVNI = 'https://upl.ua'
// Stran tekme z izidom brez postav do toliko dni po tekmi preberemo znova svežo.
const PONOVNO_DNI = 45
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi ---------------------------------------------------------------

/** "432" → 432 (id prvenstva ene sezone). */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)$/)
  if (!m) throw new Error(`upl: šifra lige je id prvenstva (npr. 432), ne "${koda}"`)
  return Number(m[1])
}

export const naslovKoledarja = (koda) => `${OSNOVNI}/ua/tournaments/championship/${razberiKodo(koda)}/calendar`
export const naslovTekme = (id) => `${OSNOVNI}/ua/report/view/${String(id).replace(/^upl/, '')}`
// Šifra zapisnika v bazi je `upl<id>`: id tekme UPL (15xxx) se prekriva s
// šiframi drugih virov (pfl.ua 16xxx, stari CMS), `matches.zapisnik_id` pa je
// enoličen čez vse vire.
export const sifraZapisnika = (id) => `upl${String(id).replace(/^upl/, '')}`
const imeKoledarja = (koda) => `upl-koledar-${razberiKodo(koda)}.html`
const imeTekme = (id) => `upl-tekma-${String(id).replace(/^upl/, '')}.html`

// --- pomožno ---------------------------------------------------------------------------

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
// `<br>` (dva igralca menjave) ostane nova vrstica; `razpakiraj` sicer stisne presledke.
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<br\s*\/?>/g, '\u0001').replace(/<[^>]+>/g, ' ').replace(/&#0?39;/g, "'"))
    .replace(/ ?\u0001 ?/g, '\n')
    .trim()

/** "31.07.2026" → "2026-07-31". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\b/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

/** "32'" → 32, "90+2'" → 90; "FT" ali "ПМ" (karton po koncu tekme) → 90. */
export const minuta = (s) => (/^\s*FT\b/i.test(String(s ?? '')) ? 90 : minutaPfl(s))

/** Ime igralca brez oznake kapetana, za ujemanje z dogodki. */
const golo = (ime) => String(ime ?? '').replace(/\((?:К|K)\)/g, '').replace(/\s+/g, ' ').trim()
const kljucImena = (ime) => golo(ime).toLocaleLowerCase('uk').replace(/['’ʼ`.]/g, '').replace(/[^\p{L}0-9]+/gu, ' ').trim()

/** Izziv (Cloudflare, CAPTCHA) ali prijava. Obrazec za novice (`class="captcha"`) to ni. */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|h-captcha|hcaptcha\.com|name="LoginForm\[/i.test(String(html ?? ''))

/** Zavrnitev (401, 403, 429), izziv ali prijava: uvoz se ustavi in ne vzame shranjene strani. */
export class UplZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'UplZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

// Refusals must reach the provider before the shared downloader can retry 429.
export async function uplFetch(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'manual' })
  if ([401, 403, 429].includes(response.status) || (response.status >= 300 && response.status < 400)) {
    try { await response.body?.cancel() } catch {}
    throw new UplZavrnitev(`upl: ${url} → HTTP ${response.status} — uvoz ustavljen, ne obhajamo`, response.status)
  }
  return response
}

/** Prava stran koledarja ali zapisnika; vse drugo (napaka, ostanek, izziv) ne gre v predpomnilnik. */
export const jeStranKoledarja = (html) => /class="tour-title"/.test(html ?? '') && !jeIzziv(html)
export const jeStranTekme = (html) => /class="match-main-info"/.test(html ?? '') && !jeIzziv(html)

// Isto ime, drug klub: imena UPL so kratka in brez kraja. Ključ kluba je
// skupen z virom pfl-ua (država UA), zato ime, ki ga PFL nosi za drug klub,
// tu dobi kraj. Pregled 15. 10. 2026 (UPL 2025/26 in 2026/27 proti Perši in
// Drugi ligi 2025/26 in 2026/27) trka ni našel — glej docs/viri/ukrajina.md. Ob novi
// sezoni preveri znova.
const IME_KLUBA = new Map([])
export const imeKluba = (ime) => {
  const i = razpakiraj(ime).replace(/\s+/g, ' ').trim()
  return IME_KLUBA.get(i) ?? i
}

// --- razpored ------------------------------------------------------------------------

const izid = (d, g) => (Number.isInteger(d) && Number.isInteger(g) ? { domaci: d, gostje: g } : null)

/**
 * Celica izida koledarja: { id, izid, ura, kontumacija }. "2 : 0" odigrana,
 * "13:00" razpisana, "+ : -" / "- : +" tehnični poraz brez tekme (3:0 / 0:3),
 * "-" brez povezave ni razpisana.
 */
export function celicaIzida(html) {
  const id = Number(String(html ?? '').match(/\/report\/view\/(\d+)/)?.[1]) || null
  const t = besedilo(html)
  let m
  // Ura je brez presledkov ("13:00"), izid s presledki ("2 : 0").
  if ((m = t.match(/^(\d{1,2}):(\d{2})$/))) return { id, izid: null, ura: `${m[1].padStart(2, '0')}:${m[2]}`, kontumacija: false }
  if ((m = t.match(/^(\d+)\s*:\s*(\d+)(?:\s*\(?(?:тп|т\.п\.|тех\S*)\)?)?$/i)))
    return { id, izid: izid(Number(m[1]), Number(m[2])), ura: null, kontumacija: /т\.?п|тех/i.test(t) }
  if ((m = t.match(/^([+-])\s*:\s*([+-])$/))) {
    const d = m[1] === '+' ? 3 : 0
    const g = m[2] === '+' ? 3 : 0
    return { id, izid: d === g ? null : izid(d, g), ura: null, kontumacija: true }
  }
  return { id, izid: null, ura: null, kontumacija: false }
}

/**
 * Koledar `/ua/tournaments/championship/<id>/calendar`: { turnir, sezona,
 * tekme: [{ krog, id, datum, ura, domaci, gostje, izid, kontumacija }] }.
 * Datum in ura sta ljubljanska. Sezona je iz izbirnika, a le, če je izbran
 * iskani id — neznan id stran tiho zamenja s tekočim prvenstvom.
 */
export function tekmeKoledarja(html, turnir) {
  const s = cisto(html)
  const izbran = s.match(/<option value="(\d+)" selected>([^<]*)</)
  const sezonaIme = izbran && Number(izbran[1]) === Number(turnir) ? besedilo(izbran[2]) : null
  const sezona = sezonaIme?.match(/^(\d{4})\s*\/\s*(\d{2})$/) ? sezonaIme.replace(/\s+/g, '') : null
  const tekme = []
  for (const del of s.split('<div class="tour-title">').slice(1)) {
    const krog = Number(del.match(/^\s*(\d+)/)?.[1])
    if (!krog) continue
    let datum = null
    for (const m of del.matchAll(/<div class="tour-date">([^<]*)<\/div>|<div class="tour-match">([\s\S]*?)<div class="team second-team">([\s\S]*?)<\/div>\s*<\/div>/g)) {
      if (m[1] != null) {
        datum = datumIz(m[1])
        continue
      }
      const domaci = besedilo(m[2].match(/<div class="team first-team">([\s\S]*?)<div class="resualt">/)?.[1])
      const celica = celicaIzida(m[2].match(/<div class="resualt">([\s\S]*?)<\/div>/)?.[1])
      const gostje = besedilo(m[3])
      if (!domaci || !gostje) continue
      tekme.push({
        krog,
        id: celica.id,
        ...casIz(datum, celica.ura),
        domaci: imeKluba(domaci),
        gostje: imeKluba(gostje),
        izid: celica.izid,
        kontumacija: celica.kontumacija,
      })
    }
  }
  return { turnir: Number(turnir), sezona, tekme }
}

/** Razpored v obliko uvoza razporeda. Kontumacijo brez znaka v koledarju najde `kontumacije`. */
export function razporedIzTekem(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      // Izid brez datuma ni odigrana tekma, najverjetneje prekinjena (Оболонь :
      // Кривбас, 8. krog 2026/27: 1:0, dogodki do 43', brez datuma in postav).
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: !!t.kontumacija, odigrana: !!t.izid && (!!t.datum || !!t.kontumacija),
      uplId: t.id, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------------

const DOGODKI = {
  'score-1': 'gol',
  'score-2': 'avtogol',
  'score-3': 'enajstmetrovka',
  'score-4': 'zgresena',
  'card-0': 'rumeni',
  'card-1': 'rdeci',
  'card-2': 'drugiRumeni',
  'change': 'menjava',
}

/** Glava strani tekme: { tekmovanje, krog, domaci, gostje, domaciId, gostjeId, izid, datum, ura }. */
export function glavaStrani(html) {
  const s = cisto(html)
  const naslov = besedilo(s.match(/<div class="match-header">([\s\S]*?)<\/div>/)?.[1]).replace(/^Назад\s*/, '').replace(/\s*PDF$/, '')
  const glava = s.match(/<div class="match-main-info">([\s\S]*?)<div class="content-part">/)?.[1]
  if (!glava) return null
  const cas = besedilo(glava.match(/<div class="time">([\s\S]*?)<\/div>/)?.[1])
  const ura = cas.match(/(\d{1,2}:\d{2})\s*$/)?.[1] ?? null
  const klubi = [...glava.matchAll(/<a href="\/(?:ua\/)?clubs\/view\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ id: Number(m[1]), ime: imeKluba(besedilo(m[2])) }))
  const st = besedilo(glava.match(/<div class="resualt">([\s\S]*?)<\/div>/)?.[1]).match(/^(\d+)\s*:\s*(\d+)$/)
  return {
    tekmovanje: naslov.split(/\.\s+/)[0] || null,
    krog: Number(naslov.match(/(\d+)\s*-?\s*й тур/)?.[1]) || null,
    domaci: klubi[0]?.ime ?? null,
    domaciId: klubi[0]?.id ?? null,
    gostje: klubi[1]?.ime ?? null,
    gostjeId: klubi[1]?.id ?? null,
    izid: st ? izid(Number(st[1]), Number(st[2])) : null,
    // Opomba nad časovnico: "* Згідно з рішенням КДК УАФ … зараховано технічну поразку з рахунком 0:3".
    opomba: besedilo(s.match(/<div class="public-description[^"]*">([\s\S]*?)<\/div>/)?.[1]) || null,
    tehnicnaPoraza: /технічн\S* поразк/i.test(besedilo(s.match(/<div class="public-description[^"]*">([\s\S]*?)<\/div>/)?.[1])),
    ...casIz(datumIz(cas), ura),
  }
}

/** Postavi: [[igralci domačih], [igralci gostov]] (začetniki in klop, brez trenerja). */
export function postaviStrani(html) {
  const s = cisto(html)
  const ekipe = s.split('<div class="team-players">').slice(1, 3).map((blok) => {
    const igralci = []
    let zacetnik = null
    for (const m of blok.matchAll(/<div class="list-title">([\s\S]*?)<\/div>|<a href="\/(?:ua\/)?people\/view\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      if (m[1] != null) {
        const naslov = besedilo(m[1])
        zacetnik = /Стартов/i.test(naslov) ? true : /Запасн/i.test(naslov) ? false : null
        continue
      }
      if (zacetnik == null) continue
      const ime = besedilo(m[3].match(/<div class="player-name">([\s\S]*?)<\/div>/)?.[1])
      if (!ime) continue
      const st = besedilo(m[3].match(/<div class="num">([^<]*)<\/div>/)?.[1])
      igralci.push({
        st: /^\d+$/.test(st) ? Number(st) : null,
        ime: golo(ime),
        regSt: Number(m[2]),
        zacetnik,
        kapetan: /\((?:К|K)\)/.test(ime),
      })
    }
    return igralci
  })
  while (ekipe.length < 2) ekipe.push([])
  return ekipe
}

/** Dogodki časovnice: [{ vrsta, ekipaIdx, minuta, imena: [...] }] (menjava: [ven, noter]). */
export function dogodkiStrani(html) {
  const s = cisto(html)
  const out = []
  for (const m of s.matchAll(/<div class="event type-([a-z0-9-]+)">\s*<div class="player( clear)?"([^>]*)>([\s\S]*?)<div class="point">([\s\S]*?)<\/div>\s*<div class="player( clear)?"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)) {
    // Domači imajo ime v levi celici (desno poravnano), gostje v desni.
    const ekipaIdx = m[2] ? 1 : 0
    const celica = ekipaIdx === 0 ? m[4] : m[7]
    // Pri gostih izraz celico odreže pred zaključnim `</div>` imena.
    const imena = besedilo(celica.match(/<div class="players">([\s\S]*?)(?:<\/div>|$)/)?.[1]).split('\n').map(golo).filter(Boolean)
    out.push({ vrsta: DOGODKI[m[1]] ?? `?${m[1]}`, ekipaIdx, minuta: minuta(besedilo(m[5])), imena })
  }
  return out
}

/**
 * Vratar iz postavitve: `#field` ima začetnike domačih (vratar zgoraj, najmanjši
 * `top`), `#field2` začetnike gostov (vratar spodaj, največji `top`). Vratar je
 * edini začetnik na skrajni vrstici; brez postavitve ali ob dvoumni vrstici ga ni.
 */
export function vratarjiIzSheme(html, ekipe) {
  const s = cisto(html)
  const i = s.indexOf('id="field"')
  const j = s.indexOf('id="field2"')
  if (i < 0 || j < 0) return new Set()
  const out = new Set()
  for (const [idx, del] of [s.slice(i, j), s.slice(j)].entries()) {
    const top = new Map()
    for (const m of del.matchAll(/<div class="chip"\s+id="player_(\d+)"\s+style="[^"]*?top:\s*([\d.]+)%/g)) top.set(Number(m[1]), Number(m[2]))
    const t = ekipe[idx].filter((x) => x.zacetnik && top.has(x.regSt)).map((x) => ({ id: x.regSt, top: top.get(x.regSt) }))
    if (t.length < 7) continue
    const skrajni = idx === 0 ? Math.min(...t.map((x) => x.top)) : Math.max(...t.map((x) => x.top))
    const na = t.filter((x) => Math.abs(x.top - skrajni) < 0.5)
    if (na.length === 1) out.add(na[0].id)
  }
  return out
}

/** Igralec ekipe po imenu iz časovnice: natanko, nato brez ločil; dvoumno ali neznano → null. */
function poImenu(igralci, ime) {
  const natanko = igralci.filter((x) => x.ime === ime)
  if (natanko.length === 1) return natanko[0]
  const k = kljucImena(ime)
  const podobni = igralci.filter((x) => kljucImena(x.ime) === k)
  return podobni.length === 1 ? podobni[0] : null
}

/**
 * Zapisnik v obliko drugih virov. Null, če tekma nima izida ali kateri od ekip
 * manjka postava (neodigrana tekma, kontumacija, zapisnik še ni vnesen).
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
  for (const igralci of ekipe) for (const i of igralci) i.preklopi = []

  for (const d of dogodkiStrani(html)) {
    const igralci = ekipe[d.ekipaIdx]
    if (d.minuta == null) opozorila.push(`${imeni[d.ekipaIdx]}: dogodek "${d.vrsta}" brez minute (${d.imena.join(', ')})`)
    if (d.vrsta === 'menjava') {
      const [imeVen, imeNoter] = d.imena
      const ven = poImenu(igralci, imeVen)
      const noter = poImenu(igralci, imeNoter)
      if (!ven || !noter) opozorila.push(`${imeni[d.ekipaIdx]}: menjave ${d.minuta}' (${d.imena.join(' → ')}) ni mogoče povezati s postavo`)
      if (d.minuta != null) {
        ven?.preklopi.push(d.minuta)
        noter?.preklopi.push(d.minuta)
      }
      menjave.push({ ekipaIdx: d.ekipaIdx, minuta: d.minuta, noter: { st: noter?.st ?? null, ime: noter?.ime ?? imeNoter ?? null }, ven: { st: ven?.st ?? null, ime: ven?.ime ?? imeVen ?? null } })
      continue
    }
    const i = poImenu(igralci, d.imena[0])
    if (!i) {
      // Karton trenerju ali osebju ne šteje; gol brez igralca je napaka vira.
      if (/gol|avtogol|enajstmetrovka|zgresena/.test(d.vrsta)) opozorila.push(`${imeni[d.ekipaIdx]}: dogodek "${d.vrsta}" ${d.minuta}' — "${d.imena[0]}" ni v postavi`)
      if (d.vrsta.startsWith('?')) opozorila.push(`${imeni[d.ekipaIdx]}: neznan dogodek "${d.vrsta.slice(1)}"`)
      continue
    }
    const z = { ekipaIdx: d.ekipaIdx, st: i.st, ime: i.ime, regSt: i.regSt, minuta: d.minuta }
    if (d.vrsta === 'gol') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
    else if (d.vrsta === 'enajstmetrovka') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
    else if (d.vrsta === 'avtogol') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
    else if (d.vrsta === 'zgresena') zgresene.push(z)
    else if (d.vrsta === 'rumeni') {
      // Drugi rumeni je svoj dogodek (`card-2`), prvi ostane rumeni.
      if (!rumeni.some((r) => r.ekipaIdx === d.ekipaIdx && r.regSt === i.regSt)) rumeni.push(z)
    } else if (d.vrsta === 'rdeci' || d.vrsta === 'drugiRumeni') {
      if (!rdeci.some((r) => r.ekipaIdx === d.ekipaIdx && r.regSt === i.regSt)) rdeci.push(z)
    } else opozorila.push(`${imeni[d.ekipaIdx]}: neznan dogodek "${d.vrsta.slice(1)}" pri ${i.ime}`)
  }

  ekipe.forEach((igralci, ekipaIdx) => {
    for (const i of igralci) {
      i.preklopi.sort((a, b) => a - b)
      i.vratar = vratarji.has(i.regSt)
    }
    const postava = igralci.filter((x) => x.zacetnik)
    if (postava.length !== 11) opozorila.push(`${imeni[ekipaIdx]}: v postavi je ${postava.length} igralcev namesto 11`)
    if (!postava.some((x) => x.vratar)) opozorila.push(`${imeni[ekipaIdx]}: vratarja iz postavitve ni`)
    const sifre = new Map()
    for (const x of igralci) sifre.set(x.regSt, (sifre.get(x.regSt) ?? 0) + 1)
    for (const [k, n] of sifre) if (n > 1) opozorila.push(`${imeni[ekipaIdx]}: igralec ${k} je v zapisniku ${n}-krat`)
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  // Tehnični poraz (KDK): uradni izid ostane za tekmo, lestvico in zmago,
  // prejeti goli in čista mreža igralcev so z igrišča (kot pfl-ua).
  const izidIgrisca = g.tehnicnaPoraza ? { domaci: zaEkipo(0), gostje: zaEkipo(1) } : undefined
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

// --- branje ------------------------------------------------------------------------------

/** Nastopi kot pri pfl-ua: po šifri osebe, z zgrešenimi 11-metrovkami. */
export const nastopi = nastopiPfl

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const jeTriNic = (i) => (i?.domaci === 3 && i?.gostje === 0) || (i?.domaci === 0 && i?.gostje === 3)

/** Prenos, ki se ob izzivu, prijavi ali zavrnitvi ustavi (vse poti branja vira gredo skozenj). */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev || [401, 403, 429].includes(e.status)) throw new UplZavrnitev(`upl: ${url} → HTTP ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status ?? null)
    throw e
  }
  if (jeIzziv(html)) throw new UplZavrnitev(`upl: ${url} vrne izziv (CAPTCHA ali prijava) — uvoz ustavljen, ne obhajamo`)
  return html
}

/** Koledar prvenstva; koledar brez tekem ali brez sezone (neznan id) ustavi uvoz. */
export async function koledar(koda, prenesi) {
  const turnir = razberiKodo(koda)
  const html = await beri(prenesi, naslovKoledarja(koda), imeKoledarja(koda), true)
  const k = tekmeKoledarja(html, turnir)
  if (!k.tekme.length || !k.sezona) throw new Error(`upl: koledar prvenstva ${turnir} je brez tekem ali sezone (neznan id?) — uvoz ustavljen`)
  return k
}

const vir = {
  ime: 'upl',
  fetch: uplFetch,
  polnoIme: "Українська Прем'єр-Ліга (upl.ua)",
  drzava: 'UA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda: naslovKoledarja,
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new UplZavrnitev(`upl: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // Napaka strežnika, prazen odgovor ali izziv z 200 ne sme v predpomnilnik
  // (sicer bi ga uvoz bral naprej): le prava stran koledarja ali tekme.
  zaPredpomnilnik: (html, datoteka) =>
    String(datoteka ?? '').startsWith('upl-koledar-') ? jeStranKoledarja(html) : String(datoteka ?? '').startsWith('upl-tekma-') ? jeStranTekme(html) : !jeIzziv(html),

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem((await koledar(koda, prenesi)).tekme)
  },

  async zapisniki(koda, prenesi) {
    const k = await koledar(koda, prenesi)
    const out = []
    for (const t of k.tekme.filter((x) => x.izid && x.id && !x.kontumacija)) {
      const url = naslovTekme(t.id)
      // Zapisnik zadnjega tedna se lahko še popravlja; starejšega ne beremo znova.
      const starost = starostDni(t.datum)
      const sveze = starost <= 7
      let z = vZapisnik(await beri(prenesi, url, imeTekme(t.id), sveze), { id: t.id, url })
      // Nepopoln zapisnik iz predpomnilnika (shranjen, preden so bile postave
      // vnesene) bi obtičal: do 45 dni ga preberemo še enkrat svežega.
      if (!z && !sveze && starost <= PONOVNO_DNI) z = vZapisnik(await beri(prenesi, url, imeTekme(t.id), true), { id: t.id, url })
      if (!z) {
        // 3:0 brez postav je kontumacija (`kontumacije`), ostalo javimo.
        if (!jeTriNic(t.izid)) console.warn(`upl: ${t.id} ima izid, zapisnik brez postav — preskočen`)
        continue
      }
      // Klubi, krog in sezona s koledarja, da se tekma ujame z vrstico razporeda.
      if (kljucKlubaUa(z.domaci.ime) !== kljucKlubaUa(t.domaci) || kljucKlubaUa(z.gostje.ime) !== kljucKlubaUa(t.gostje))
        z.opozorila.push(`klubi zapisnika ${z.domaci.ime} : ${z.gostje.ime} niso klubi koledarja ${t.domaci} : ${t.gostje}`)
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
   * Kontumacije (tudi tekme kluba, ki je izstopil): 3:0 ali 0:3, katere
   * zapisnik nima postav — takoj, če ima opombo o tehničnem porazu (Олександрія
   * : Оболонь 0:3, 17. krog 2025/26), sicer po tednu dni. Koledar s "+ : -" jo
   * označi že sam.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        if (t.kontumacija || !t.uplId || !t.datum || t.datum > danes || !jeTriNic(t.izid)) continue
        const html = await beri(prenesiKrog, naslovTekme(t.uplId), imeTekme(t.uplId), t.datum)
        const g = glavaStrani(html)
        if (!vZapisnik(html) && g?.izid && (g.tehnicnaPoraza || t.datum <= teden)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
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
