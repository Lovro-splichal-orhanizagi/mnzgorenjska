// Vir: Warmińsko-Mazurski ZPN (wmzpn.pl) — uradni zapisniki PZPN Extranet.
//
// Zveza na svoji strani (WordPress, vtičnik `wmzpn-tables`) pokaže tekmovanja
// iz Extraneta PZPN: stran skupine `/?page_id=1625&leagueN=…&play=…&season=…`
// ima ves razpored (`div.print-timetable`, tabele "Kolejka N", vrstica
// `tr[data-match-id]` z datumom, domačimi, izidom, polčasom v namigu in gosti).
// Klik na izid odpre okno, ki ga stran naloži z
// `POST /wp-admin/admin-ajax.php` (`action=match_history&matchid=<uuid>`) —
// isti klic delamo tudi mi, kot obiskovalec. Odgovor je delček HTML:
// glava (klubi, izid, polčas), "Kolejka", "Sezon: 2026/2027 - Jesienna",
// "Status meczu", postavi ("Drużyna" = začetniki, "Rezerwa" = klop) z dresom
// in stalno šifro osebe PZPN (`/rozgrywki/zawodnik/<uuid>` → `reg_st` kot pri
// pzpn in hlf), nato "Przebieg spotkania" z dogodki (`data-minute`): gol
// (`span.goal`), gol z 11 m (`span.penalty-kick`, "Gol z karnego"), avtogol
// (`span.own-goal`, "Gol samobójczy", pri ekipi strelca), rumeni (`#FFD700`),
// rdeči (`#DF0021`), vstop (zelena puščica `#28A745`) in izstop (rdeča
// `#DC3545`). Vratarja, kapetana in pozicij zapisnik NE pove (le "(Junior)").
// Neodigrana tekma vrne "Brak danych na temat tego spotkania.".
//
// ŠIFRA LIGE je `<leagueN>/<play>/<season>` (trije UUID iz naslova strani
// skupine). Vsaka sezona ima svoj `play` in `season`; arhiv je v CLAUDE.md.
//
// Šifre tekem in oseb so iste kot v Extranetu (in pri viru pzpn), zato je
// zapisnik_id kar UUID tekme.
//
// robots.txt ni (404), pogojev uporabe nismo našli. Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki), popolnih zapisnikov ne beremo znova.
// **Ob 403, 429 ali izzivu (CAPTCHA) se uvoz ustavi — ne obhajaj.**
import { razpakiraj } from '../klubi.mjs'
import { nastopi, regIzUuid } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { kljucKlubaPl, kratkoImePl, sezonaIzDatuma } from './pzpn.mjs'

export { nastopi, NEPOPOLN }

const OSNOVNI = 'https://wmzpn.pl'
const AJAX = `${OSNOVNI}/wp-admin/admin-ajax.php`
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** `<leagueN>/<play>/<season>` → { liga, play, sezona }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().toLowerCase().match(new RegExp(`^(${UUID})/(${UUID})/(${UUID})$`))
  if (!m) throw new Error(`wmzpn: šifra lige je "<leagueN>/<play>/<season>" (trije UUID z naslova strani skupine), ne "${koda}"`)
  return { liga: m[1], play: m[2], sezona: m[3] }
}

export const naslovLige = (koda) => {
  const { liga, play, sezona } = razbijKodo(koda)
  return `${OSNOVNI}/?page_id=1625&leagueN=${liga}&play=${play}&season=${sezona}`
}

// Zapisnik bere stran s POST; naslov nosi parametra, `vir.fetch` iz njega
// sestavi isti POST, kot ga pošlje okno na strani.
export const naslovZapisnika = (_koda, id) => `${AJAX}?action=match_history&matchid=${id}`
const imeLige = (koda) => `liga-${razbijKodo(koda).play}.html`
const imeZapisnika = (id) => `zapisnik-${id}.html`

const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()
const brezSlogov = (html) => String(html ?? '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')

// --- zavrnitev ---------------------------------------------------------------------

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class WmzpnZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'WmzpnZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/**
 * `fetch` vira: naslov zapisnika (`admin-ajax.php?action=match_history&…`)
 * pošlje kot POST obrazca, vse ostalo kot navaden GET.
 */
export function wmzpnFetch(url, init = {}, fetchFn = fetch) {
  const u = new URL(url)
  if (u.pathname.endsWith('/admin-ajax.php') && u.searchParams.get('action') === 'match_history') {
    const telo = new URLSearchParams({ action: 'match_history', matchid: u.searchParams.get('matchid') ?? '' })
    return fetchFn(`${u.origin}${u.pathname}`, {
      ...init,
      method: 'POST',
      headers: {
        ...(init.headers ?? {}),
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: telo.toString(),
    })
  }
  return fetchFn(url, init)
}

// --- pretvorbe ----------------------------------------------------------------------

/** "22'" → 22, "45' +2'" → 45, "90' +3'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "2:8" → { domaci: 2, gostje: 8 }; "-:-" → null. */
export function izid(s) {
  const m = String(s ?? '').match(/^\s*\(?\s*(\d+)\s*:\s*(\d+)\s*\)?\s*$/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

/** "2026-07-31 19:45:00" (Varšava = Ljubljana) → { datum, ura }; 00:00 = ura neznana. */
export function casTekme(s) {
  const m = String(s ?? '').match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  return { datum: m[1], ura: !m[2] || m[2] === '00:00' ? null : m[2] }
}

/** "2026/2027 - Jesienna" → "2026/27". */
export function sezonaZapisnika(s) {
  const m = String(s ?? '').match(/(\d{4})\s*\/\s*(\d{2})(\d{2})?/)
  if (!m) return null
  return `${m[1]}/${m[3] ?? m[2]}`
}

/** "Kacper Babkowski (Junior)" → "Babkowski Kacper" (priimek je zadnja beseda, kot pri pzpn). */
export const imeIgralca = (s) => vPriimekIme(besedilo(s).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim())

/** Prost krog ("pauzuje") ni tekma. */
const jePauza = (domaci, gostje) => /pauzuj/i.test(`${domaci} ${gostje}`)

// --- stran skupine (razpored) --------------------------------------------------------

/** Ime skupine z glave strani ("Klasa A Grupa 2"). */
export const imeStrani = (html) => besedilo(String(html ?? '').match(/<h2 style="margin: 0;">([^<]*)<\/h2>/)?.[1] ?? '')

/**
 * Vse tekme skupine iz razporeda (`div.print-timetable`):
 * [{ krog, id, datum, ura, domaci, gostje, izid, polcas, odigrana, walkower }].
 * Blok "POPRZEDNIA / AKTUALNA KOLEJKA" in tabela križanja stojita pred njim in
 * ju ne beremo.
 */
export function tekmeStrani(html) {
  const s = String(html ?? '')
  const i = s.indexOf('class="print-timetable"')
  if (i < 0) return []
  const out = []
  for (const tabela of s.slice(i).split('<table').slice(1)) {
    const krog = Number(tabela.match(/<thead>[\s\S]*?Kolejka\s+(\d+)/i)?.[1])
    if (!krog) continue
    for (const v of tabela.split('<tr data-match-id="').slice(1)) {
      const id = v.match(new RegExp(`^(${UUID})"`))?.[1]
      const domaci = besedilo(v.match(/class="schedule-team schedule-home">([\s\S]*?)<\/td>/)?.[1])
      const gostje = besedilo(v.match(/class="schedule-team schedule-away">([\s\S]*?)<\/td>/)?.[1])
      if (!id || !domaci || !gostje || jePauza(domaci, gostje)) continue
      const rez = v.match(/class="align-center schedule-result"[\s\S]*?<a class="tooltip"[^>]*>\s*([^<]*?)\s*<span class="tooltiptext">([\s\S]*?)<\/span>/)
      const namig = besedilo(rez?.[2])
      const r = izid(rez?.[1])
      const { datum, ura } = casTekme(v.match(/schedule-datetime">([^<]*)/)?.[1])
      out.push({
        krog,
        id,
        datum,
        ura,
        domaci,
        gostje,
        izid: r,
        polcas: izid(namig.match(/Do przerwy:\s*(\(\s*\d+\s*:\s*\d+\s*\))/)?.[1]),
        odigrana: !!r,
        walkower: /walk/i.test(namig),
      })
    }
  }
  return out
}

/** Razpored v obliko uvoza razporeda: krogi s tekmami, ki imajo datum. */
export function razcleniRazpored(html) {
  const krogi = new Map()
  for (const t of tekmeStrani(html)) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: t.walkower,
      odigrana: t.odigrana,
      ...(t.walkower && t.izid ? { izid: t.izid } : {}),
      // Za `kontumacije`: 3:0 / 0:3 brez postav je treba pogledati v zapisniku.
      wmzpnId: t.id,
      rezultat: t.izid,
    })
  }
  return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ---------------------------------------------------------------------------

/** "Brak danych na temat tego spotkania." — tekme ni (še) v Extranetu. */
export const brezPodatkov = (html) => /Brak danych na temat tego spotkania/i.test(String(html ?? ''))

/**
 * Postavi iz delčka: [{ postava, rezerve }, { postava, rezerve }]. Ekipa se
 * začne z naslovom "Drużyna", klop z "Rezerwa"; osebje nima dresa in odpade.
 */
function postavi(s) {
  const konec = (() => {
    const k = [s.indexOf("class='events'"), s.indexOf('Przebieg spotkania'), s.indexOf('Sędziowie')].filter((x) => x >= 0)
    return k.length ? Math.min(...k) : s.length
  })()
  const del = s.slice(0, konec)
  const ekipe = []
  let ekipa = null
  let klop = false
  // Kosi od enega `<div class='team-…` do naslednjega: naslov ekipe, naslov
  // klopi, vrstica igralca ali osebja (osebje nima `team-number`).
  for (const kos of del.split("<div class='team-").slice(1)) {
    if (/^section-header'>\s*Drużyna/.test(kos)) {
      ekipa = { postava: [], rezerve: [] }
      ekipe.push(ekipa)
      klop = false
      continue
    }
    if (/^section-sub'>\s*Rezerwa/.test(kos)) {
      klop = true
      continue
    }
    if (!ekipa || !/^line'>/.test(kos) || !kos.includes('team-number')) continue
    const vrstica = kos.slice(0, kos.lastIndexOf('</a>') < 0 ? undefined : kos.lastIndexOf('</a>'))
    const uuid = vrstica.match(new RegExp(`/rozgrywki/zawodnik/(${UUID})`))?.[1] ?? null
    const st = vrstica.match(/<span>\s*(\d+)\s*<\/span>\s*<\/span>/)?.[1]
    const surovo = vrstica.slice(vrstica.lastIndexOf('<a '))
    const ime = imeIgralca(surovo)
    if (!ime) continue
    ekipa[klop ? 'rezerve' : 'postava'].push({
      st: st == null ? null : Number(st),
      ime,
      uuid,
      regSt: regIzUuid(uuid),
      zacetnik: !klop,
      kapetan: false,
      vratar: false,
      pozicija: null,
    })
  }
  return ekipe
}

/** Vrsta dogodka iz okvirja dogodka. */
export function vrstaDogodka(okvir) {
  const s = String(okvir)
  if (/class="own-goal/.test(s)) return 'avtogol'
  if (/class="penalty-kick/.test(s)) return 'enajstmetrovka'
  if (/class="goal"/.test(s)) return 'gol'
  if (/yellow-card|#FFD700/i.test(s)) return 'rumeni'
  if (/red-card|#DF0021/i.test(s)) return 'rdeci'
  if (/#28A745/i.test(s)) return 'noter'
  if (/#DC3545/i.test(s)) return 'ven'
  return null
}

/** Dogodki iz "Przebieg spotkania": [{ stran: 0|1, minuta, uuid, ime, vrsta, surovo }]. */
function dogodki(s) {
  const i = s.indexOf('Przebieg spotkania')
  if (i < 0) return []
  const del = s.slice(i, (() => { const k = s.indexOf('Sędziowie', i); return k < 0 ? undefined : k })())
  const out = []
  for (const kos of del.split("<div class='event ").slice(1)) {
    const stran = /^left/.test(kos) ? 0 : /^right/.test(kos) ? 1 : null
    const zacetek = kos.indexOf("<div class='box'>")
    const okvir = zacetek < 0 ? '' : kos.slice(zacetek, Math.max(zacetek, kos.indexOf('</a>', zacetek)) + 4)
    const uuid = okvir.match(new RegExp(`/rozgrywki/zawodnik/(${UUID})`))?.[1] ?? null
    const ime = imeIgralca(okvir.replace(/<span class="tooltiptext">[\s\S]*?<\/span>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/⚽/g, ''))
    out.push({ stran, minuta: minuta(kos.match(/data-minute="([^"]*)"/)?.[1]), uuid, ime, vrsta: vrstaDogodka(okvir), surovo: besedilo(okvir).slice(0, 60) })
  }
  return out
}

/**
 * Zapisnik v obliko drugih virov. `tekma` je vrstica razporeda (datum, ura,
 * krog, imena klubov, izid). Null, če tekme ni ("Brak danych") ali je brez izida.
 */
export function vZapisnik(html, tekma = {}) {
  if (brezPodatkov(html)) return null
  const s = brezSlogov(html)
  const glava = s.match(/<div class='team-container-score'>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1] ?? ''
  const rezultat = izid(besedilo(glava.match(/<h2>([\s\S]*?)<\/h2>/)?.[1])) ?? tekma.izid ?? null
  if (!rezultat) return null
  const polcas = izid(besedilo(glava.match(/<h3>([\s\S]*?)<\/h3>/)?.[1])) ?? tekma.polcas ?? null
  const klubi = [...s.matchAll(/<h2>\s*<a href='[^']*\/rozgrywki\/druzyna\/[^']*'[^>]*>([\s\S]*?)<\/a>/g)].map((m) => besedilo(m[1]))
  const imeni = [tekma.domaci ?? klubi[0] ?? null, tekma.gostje ?? klubi[1] ?? null]
  const info = (oznaka) => besedilo(s.match(new RegExp(`<strong>\\s*${oznaka}:?\\s*</strong>:?([\\s\\S]*?)</p>`))?.[1])

  const p = postavi(s)
  const ekipe = [p[0] ?? { postava: [], rezerve: [] }, p[1] ?? { postava: [], rezerve: [] }]
  const znana = ekipe.map((x) => x.postava.length >= NAJMANJ_ZACETNIKOV)
  const opozorila = []
  ekipe.forEach((x, idx) => {
    if (znana[idx]) return
    opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${x.postava.length ? `le ${x.postava.length} začetnikov` : 'brez postave'}`)
  })

  // Igralec po šifri osebe; dogodek brez znanega igralca pripišemo strani.
  const poUuid = new Map()
  ekipe.forEach((x, idx) => { for (const i of [...x.postava, ...x.rezerve]) if (i.uuid) poUuid.set(i.uuid, { idx, i, preklopi: [] }) })
  const goli = []
  const rumeni = []
  const rdeci = []
  for (const d of dogodki(s)) {
    const najden = d.uuid ? poUuid.get(d.uuid) : null
    const ekipaIdx = najden?.idx ?? d.stran
    if (ekipaIdx == null) { opozorila.push(`dogodek brez ekipe: ${d.surovo}`); continue }
    if (!najden && d.vrsta) opozorila.push(`${imeni[ekipaIdx]}: ${d.ime || '?'} (${d.vrsta}) ni v postavi`)
    const kdo = { ekipaIdx, st: najden?.i.st ?? null, ime: najden?.i.ime ?? d.ime, regSt: najden?.i.regSt ?? regIzUuid(d.uuid) }
    if (d.minuta == null) opozorila.push(`${imeni[ekipaIdx]}: dogodek ${d.vrsta ?? '?'} pri ${kdo.ime} brez minute`)
    if (d.vrsta === 'gol' || d.vrsta === 'enajstmetrovka' || d.vrsta === 'avtogol')
      goli.push({ ...kdo, minuta: d.minuta, avtogol: d.vrsta === 'avtogol', enajstmetrovka: d.vrsta === 'enajstmetrovka' })
    else if (d.vrsta === 'rumeni') rumeni.push({ ...kdo, minuta: d.minuta })
    else if (d.vrsta === 'rdeci') {
      if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.regSt === kdo.regSt && r.ime === kdo.ime)) rdeci.push({ ...kdo, minuta: d.minuta })
    } else if (d.vrsta === 'noter' || d.vrsta === 'ven') {
      if (najden && d.minuta != null) najden.preklopi.push(d.minuta)
    } else opozorila.push(`${imeni[ekipaIdx]}: neznan dogodek pri ${kdo.ime} ("${d.surovo}")`)
  }

  const brezMenjav = [false, false]
  const sestava = ekipe.map((x, idx) => {
    // Ekipa brez znane postave nima nastopov (ne vemo, kdo je igral). Izid ostane.
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (x.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${x.postava.length} igralcev namesto 11`)
    const vObliko = ({ uuid, ...i }) => ({ ...i, preklopi: (poUuid.get(uuid)?.preklopi ?? []).sort((a, b) => a - b) })
    const postava = x.postava.map(vObliko)
    const rezerve = x.rezerve.map(vObliko)
    // Nižje lige menjav kdaj ne vpišejo: začetniki imajo takrat po 90 minut.
    brezMenjav[idx] = ![...postava, ...rezerve].some((i) => i.preklopi.length)
    return { ime: imeni[idx], postava, rezerve }
  })

  // Goli iz zapisnika proti izidu (avtogol šteje nasprotniku).
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (znana[0] && znana[1] && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje))
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  return {
    zapisnikId: tekma.id ?? null,
    url: null,
    sezona: sezonaZapisnika(info('Sezon')) ?? sezonaIzDatuma(tekma.datum),
    krog: Number(info('Kolejka')) || tekma.krog || null,
    datum: tekma.datum ?? null,
    ura: tekma.ura ?? null,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave: [],
    brezMenjav,
    status: info('Status meczu') || null,
    nepopoln: !znana[0] || !znana[1],
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    opozorila,
  }
}

/** Walkower: zapisnik ima "Status meczu: Walkover" (razpored le izid brez polčasa). */
export const jeWalkower = (z) => /walk/i.test(String(z?.status ?? ''))

/** Popoln zapisnik (obe ekipi ≥ 7 začetnikov) — takega ne beremo znova. */
export const popolnZapisnik = (html) => {
  if (brezPodatkov(html)) return false
  const p = postavi(brezSlogov(html))
  return p.length >= 2 && p.every((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
}

// --- prenos -------------------------------------------------------------------------------

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new WmzpnZavrnitev(`wmzpn: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new WmzpnZavrnitev(`wmzpn: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/** Stran skupine; brez razporeda (napačna šifra, sprememba strani) ustavi uvoz. */
async function straneSkupine(koda, prenesi) {
  const html = await beri(prenesi, naslovLige(koda), imeLige(koda), true)
  const tekme = tekmeStrani(html)
  if (!tekme.length) throw new Error(`wmzpn: ${naslovLige(koda)} nima razporeda ("Kolejka") — napačna šifra ali se je stran spremenila`)
  return tekme
}

/** Dni od datuma tekme; brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const vir = {
  ime: 'wmzpn',
  polnoIme: 'Warmińsko-Mazurski ZPN (wmzpn.pl, zapisniki PZPN Extranet)',
  drzava: 'PL',
  osnovniNaslov: `${OSNOVNI}/?page_id=1625`,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: (url, init) => wmzpnFetch(url, init),

  naslovRazporeda: naslovLige,
  naslovZapisnika,
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new WmzpnZavrnitev(`wmzpn: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  /** Razpored: krogi s tekmami (varšavski = ljubljanski čas), izidi. */
  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(await beri(prenesi, naslovLige(koda), imeLige(koda), true))
  },

  /** Zapisniki odigranih tekem. Popoln se ne bere znova, nepopoln 45 dni. */
  async zapisniki(koda, prenesi) {
    const out = []
    for (const t of await straneSkupine(koda, prenesi)) {
      if (!t.odigrana || t.walkower) continue
      const url = naslovZapisnika(koda, t.id)
      let html = await beri(prenesi, url, imeZapisnika(t.id), starostDni(t.datum) <= 3)
      if (!popolnZapisnik(html) && starostDni(t.datum) <= 45) html = await beri(prenesi, url, imeZapisnika(t.id), true)
      const z = vZapisnik(html, t)
      if (!z) continue
      // Walkower ("Status meczu: Walkover", 3:0 brez postav) ni tekma z
      // nastopi — označi ga razpored (`kontumacije`).
      if (jeWalkower(z) || (z.prazen && t.izid && t.izid.domaci + t.izid.gostje === 3 && Math.abs(t.izid.domaci - t.izid.gostje) === 3)) continue
      if (t.izid && (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje))
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      z.url = naslovLige(koda)
      out.push({ id: t.id, z, url: z.url })
    }
    return out
  },

  /**
   * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
   * zapisnik nima postav ali podatkov. Walkower, ki ga razpored označi sam,
   * označi že `razcleniRazpored`.
   */
  async kontumacije(koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const r = t.rezultat
        if (!r || t.kontumacija || !t.wmzpnId || !t.datum || t.datum > teden) continue
        if (!((r.domaci === 3 && r.gostje === 0) || (r.domaci === 0 && r.gostje === 3))) continue
        const html = await prenesiKrog(naslovZapisnika(koda, t.wmzpnId), imeZapisnika(t.wmzpnId), t.datum)
        if (jeIzziv(html)) throw new WmzpnZavrnitev(`wmzpn: ${naslovZapisnika(koda, t.wmzpnId)} vrne izziv (CAPTCHA)`)
        const z = vZapisnik(html, { izid: r })
        if (brezPodatkov(html) || !z || z.prazen || jeWalkower(z)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  // Ključ kluba brez diakritike (ł → l), kratko ime brez oblike društva — kot pzpn.
  kljucKluba: (ime) => kljucKlubaPl(ime),
  kratkoIme: (ime) => kratkoImePl(ime),
  poenostavi: (ime) => kljucKlubaPl(ime),
}

export default vir
