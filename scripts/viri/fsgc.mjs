// Vir: Federazione Sammarinese Giuoco Calcio — fsgc.sm (San Marino).
//
// Stran izriše strežnik (HTML, CMS Studio99, brez JSON-a). Glej
// docs/viri/sanmarino.md.
//
// SEZONA je avgust–maj: oznaka "2026/27" (iz datuma tekme).
//
// ŠIFRA LIGE je `<slug>-<id prvenstva>/<id sezone>`: Campionato Sammarinese
// 2026/27 = `campionato-sammarinese-1/48`, 2025/26 = `…-1/19`, 2024/25 =
// `…-1/1`. Id sezone je vrednost `season_id` v izbirniku sezon na strani
// prvenstva. Neznan `season_id` stran tiho zamenja s tekočo sezono, zato
// preverimo, da je izbrana (`bg-primary`) prav zahtevana sezona.
//
// NASLOVI:
// - `/it/campionato/<slug>/<id>?season_id=<s>` — vsi krogi ("Giornata N",
//   harmonika `gamesAccordion`): datum in ura ("28/08/2026 21:15", "TBD" pred
//   objavo), domači in gostje s povezavo `/it/squadra/<slug>/<id>`, izid
//   ("5 - 0" ali "-") s povezavo na tekmo `/it/partita/<slug>/<id>`. Tekma
//   ima povezavo tudi pred začetkom. Končnica (Playoff) je ločen zavihek in je
//   ne beremo.
// - `/it/partita/<slug>/<id>` — stran tekme. Slug strežnik prezre (velja tudi
//   `m`). Glava: stanje ("Concluso"), izid "1:0", tekmovanje, datum, "Orario
//   20:45". Zavihek "Dettagli" je časovnica dogodkov (minuta v sredini, levo
//   domači, desno gostje): Gol, Gol (Rig.), Autogol, Rigore Sbagliato, Assist,
//   Ammonizione, Espulsione, menjava Entra/Esce. "Formazioni": Titolari (11)
//   in Panchina s številko dresa, povezavo `/it/giocatore/<slug>/<id>` (id je
//   stalen → `reg_st`) in vlogo (Portiere, Difensore, Centrocampista,
//   Attaccante). "Statistiche": vsote dogodkov po ekipah (preverimo z njimi).
//
// AVTOGOL je v stolpcu ekipe, ki ji gol šteje (strelec je nasprotnik),
// "Statistiche" ga šteje tej ekipi. Drugi rumeni: vir zapiše "Ammonizione"
// ob prvem in "Espulsione" ob drugem kartonu — to je 1 rumeni + 1 rdeči kot
// pri drugih virih. Karton trenerju (`/it/allenatore/`) ni igralčev.
//
// ČAS: San Marino (Europe/San_Marino) ima isti pas kot Ljubljana.
//
// robots.txt: "User-agent: * / Disallow: /admin" — strani tekem in prvenstev
// so dovoljene. Pogojev uporabe ni (le politika zasebnosti in piškotkov).
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki), popolnih zapisnikov ne
// beremo znova. **Ob 401, 403, 429 ali izzivu se uvoz ustavi
// (`FsgcZavrnitev`, izhod 4) — ne obhajaj.** Strani igralcev ne beremo.
import { existsSync, readFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'
import { NEPOPOLN } from './frf.mjs'

export { NEPOPOLN }

const OSNOVNI = 'https://www.fsgc.sm'
const DOLZINA_TEKME = 90
const MAPA = 'scripts/.predpomnilnik/fsgc'

// --- šifra in naslovi ---------------------------------------------------------

/** "campionato-sammarinese-1/48" → { slug, id: "1", sezona: "48" }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)\/(\d+)$/)
  if (!m) throw new Error(`fsgc: šifra lige je "<slug>-<id>/<season_id>" (npr. campionato-sammarinese-1/48), ne "${koda}"`)
  return { slug: m[1], id: m[2], sezona: m[3] }
}

export const naslovRazporeda = (koda) => {
  const { slug, id, sezona } = razbijKodo(koda)
  return `${OSNOVNI}/it/campionato/${slug}/${id}?season_id=${sezona}`
}
const golId = (id) => String(id).replace(/^sm/, '')
export const naslovZapisnika = (id) => `${OSNOVNI}/it/partita/m/${golId(id)}`
// Šifra zapisnika v bazi je `sm<id>`: id-ji tekem FSGC (1800 …) so v razponu
// drugih virov, `matches.zapisnik_id` pa je enoličen čez vse.
export const sifraZapisnika = (id) => `sm${golId(id)}`
const imeRazporeda = (koda) => `razpored-${razbijKodo(koda).id}-${razbijKodo(koda).sezona}.html`
export const imeZapisnika = (id) => `tekma-${golId(id)}.html`

// --- zavrnitev ------------------------------------------------------------------

export class FsgcZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FsgcZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
// Stran ima v prevodih niz "recaptcha_error", zato gola beseda "captcha" ni
// izziv — iščemo Cloudflarov izziv in gradnike CAPTCHA.
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|challenge-platform\/h\/|cf-turnstile|class="g-recaptcha|class="h-captcha/i.test(String(html ?? ''))

/** Stran prvenstva je prava, če ima harmoniko krogov. */
export const jeStranRazporeda = (html) => /id="gamesAccordion"/.test(String(html ?? '')) && /Giornata\s+\d+/.test(String(html ?? ''))
/** Stran tekme je prava, če ima glavo z izidom (neodigrana nima zavihkov). */
export const jeStranZapisnika = (html) => /class="page-banner/.test(String(html ?? '')) && /<h1 class="text-fsgc/.test(String(html ?? ''))
/** Odigrana tekma z izidom in obema postavama. */
export const jeCelZapisnik = (html) => {
  if (!jeStranZapisnika(html)) return false
  const g = glavaTekme(html)
  if (!g.koncana || !g.izid) return false
  const p = postavi(html)
  return p[0].postava.length > 0 && p[1].postava.length > 0
}

// --- čas -------------------------------------------------------------------------

const dve = (n) => String(n).padStart(2, '0')

/** "28/08/2026 21:15" → { datum: "2026-08-28", ura: "21:15" }; "TBD" → nič. */
export function casVira(s) {
  const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(?:Orario\s+)?(\d{1,2}):(\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  return { datum: `${m[3]}-${dve(m[2])}-${dve(m[1])}`, ura: m[4] ? `${dve(m[4])}:${m[5]}` : null }
}

/** Sezona avgust–maj iz datuma: 2026-10-25 → "2026/27", 2027-03-14 → "2026/27". */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const zacetek = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${zacetek}/${dve((zacetek + 1) % 100)}`
}

/** "79'" → 79, "90' + 2'" → 90 (podaljšek se ne šteje), "45' + 1'" → 45. */
export function minutaVira(s) {
  const m = razpakiraj(String(s ?? '')).match(/(\d+)\s*'?\s*(?:\+\s*(\d+))?/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n)) return null
  return Math.min(Math.max(n, 1), DOLZINA_TEKME)
}

// --- razpored --------------------------------------------------------------------

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/** Id sezone, ki je na strani prvenstva izbrana (gumb `bg-primary`). */
export function izbranaSezona(html) {
  const m = String(html ?? '').match(/class="[^"]*\bbg-primary"\s+href="[^"]*[?&]season_id=(\d+)"/)
  return m?.[1] ?? null
}

/**
 * Tekme strani prvenstva: [{ krog, domaci, gostje, domaciId, gostjeId, izid,
 * datum, ura, id, url }]. Tekma ima povezavo (id) tudi pred začetkom; izid
 * je null, dokler ni odigrana.
 */
export function vrsticeRazporeda(html) {
  const s = String(html ?? '')
  const zac = s.indexOf('id="gamesAccordion"')
  if (zac < 0) return []
  // Harmonika krogov se konča pred naslednjim zavihkom (lestvica, končnica …).
  const kon = s.indexOf('class="tab-pane', zac)
  const telo = s.slice(zac, kon < 0 ? undefined : kon)
  const out = []
  const naslovi = [...telo.matchAll(/<span class="fw-bold">\s*Giornata\s+(\d+)\s*<\/span>/g)]
  naslovi.forEach((n, i) => {
    const kos = telo.slice(n.index, naslovi[i + 1]?.index ?? telo.length)
    for (const v of kos.match(/<tr class="[^"]*text-center align-middle text-nowrap">[\s\S]*?<\/tr>/g) ?? []) {
      const celice = [...v.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1])
      if (celice.length < 4) continue
      const ekipa = (c) => {
        const a = c.match(/href="[^"]*\/squadra\/[^"/]+\/(\d+)"[^>]*>([\s\S]*?)<\/a>/)
        return a ? { ime: besedilo(a[2]), id: a[1] } : null
      }
      const d = ekipa(celice[1])
      const g = ekipa(celice[3])
      if (!d || !g) continue
      const tekma = celice[2].match(/href="([^"]*\/partita\/[^"/]+\/(\d+))"/)
      const izid = besedilo(celice[2]).match(/^(\d+)\s*-\s*(\d+)$/)
      const { datum, ura } = casVira(besedilo(celice[0]))
      out.push({
        krog: Number(n[1]),
        domaci: d.ime,
        gostje: g.ime,
        domaciId: d.id,
        gostjeId: g.id,
        izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
        datum,
        ura,
        id: tekma?.[2] ?? null,
        url: tekma?.[1] ?? null,
      })
    }
  })
  return out
}

/** Razpored v obliko uvoza razporeda. */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      izid: t.izid, fsgcId: t.id,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ---------------------------------------------------------------------

const norm = (s) =>
  razpakiraj(String(s ?? ''))
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const besede = (s) => norm(s).split(' ').filter(Boolean)
const veliko = (w) => w.charAt(0).toLocaleUpperCase('it') + w.slice(1)

/**
 * Ime igralca "Priimek Ime" (kot drugi viri). Prikaz je "M. De Angelis"
 * (začetnica imena + priimek z naglasi), slug povezave "de-angelis-mirco":
 * priimek vzamemo iz prikaza, ime je preostanek sluga.
 * "M. De Angelis" + "de-angelis-mirco" → "De Angelis Mirco".
 */
export function imeIgralca(prikaz, slug) {
  const p = razpakiraj(String(prikaz ?? '')).replace(/\s+/g, ' ').trim()
  const m = p.match(/^(\p{Lu}[\p{L}'’]*\.(?:\s*\p{Lu}[\p{L}'’]*\.)*)\s+(.+)$/u)
  const priimek = m ? m[2] : p
  const ostanek = besede(String(slug ?? '').replace(/-/g, ' '))
  for (const w of besede(priimek)) {
    const i = ostanek.indexOf(w)
    if (i >= 0) ostanek.splice(i, 1)
  }
  // Ime iz sluga le, če se ujema z začetnico prikaza; sicer ostane prikaz.
  const zacetnica = m ? norm(m[1]).charAt(0) : null
  const ime = ostanek.map(veliko).join(' ')
  if (!ime || (zacetnica && norm(ime).charAt(0) !== zacetnica)) return p
  return `${priimek} ${ime}`
}

const VLOGE = { portiere: 'GK', difensore: 'DEF', centrocampista: 'MID', attaccante: 'FWD' }

/** Glava tekme: stanje, izid, tekmovanje, datum, ura, kluba. */
export function glavaTekme(html) {
  const s = String(html ?? '')
  const zac = s.indexOf('id="main-container"')
  const g = s.slice(zac < 0 ? 0 : zac, s.indexOf('id="pills-tab"'))
  const stanje = besedilo(g.match(/<small class="text-[a-z-]+ mb-0 text-uppercase">([^<]*)<\/small>/)?.[1])
  const izid = besedilo(g.match(/<h1 class="text-fsgc[^"]*">([\s\S]*?)<\/h1>/)?.[1]).match(/^(\d+)\s*:\s*(\d+)$/)
  const klubi = [...g.matchAll(/href="[^"]*\/squadra\/[^"/]+\/(\d+)"[^>]*>\s*<h3[^>]*>([^<]*)<\/h3>/g)].map((m) => ({ id: m[1], ime: besedilo(m[2]) }))
  const tekmovanje = besedilo(g.match(/<small class="text-tertiary text-uppercase[^"]*">([^<]*)<\/small>/)?.[1])
  const podatki = [...g.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => besedilo(m[1]))
  const { datum } = casVira(podatki.find((x) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(x)))
  const ura = podatki.find((x) => /^Orario\s+\d{1,2}:\d{2}$/.test(x))?.match(/(\d{1,2}):(\d{2})/)
  const krog = s.match(/<h1 class="page-banner[^"]*">[^<]*?(\d+)°\s*Giornata/)?.[1]
  return {
    stanje,
    koncana: /^concluso$/i.test(stanje),
    izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
    klubi,
    tekmovanje,
    datum,
    ura: ura ? `${dve(ura[1])}:${ura[2]}` : null,
    krog: krog ? Number(krog) : null,
  }
}

/** Igralec iz celice postave (povezava, vloga, kapetan). */
function igralecCelice(celica, st, zacetnik) {
  const a = celica.match(/href="[^"]*\/giocatore\/([^"/]+)\/(\d+)"[^>]*>([^<]*)<\/a>/)
  if (!a) {
    const golo = besedilo(celica.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, ' '))
    if (!golo) return null
    return { st, ime: golo, regSt: null, slug: null, prikaz: golo, vratar: false, pozicija: null, zacetnik }
  }
  const vloga = besedilo(celica.match(/fw-italic[^"]*">([^<]*)</)?.[1]).toLowerCase()
  const pozicija = VLOGE[vloga] ?? null
  return {
    st,
    ime: imeIgralca(a[3], a[1]),
    regSt: Number(a[2]),
    slug: a[1],
    prikaz: razpakiraj(a[3]).trim(),
    vratar: pozicija === 'GK',
    pozicija,
    zacetnik,
  }
}

/** Postavi obeh ekip iz zavihka "Formazioni": [{ postava, rezerve }, …]. */
export function postavi(html) {
  const s = String(html ?? '')
  const zac = s.indexOf('id="pills-rosters"')
  const kon = s.indexOf('id="pills-stats"', zac)
  const ekipe = [{ postava: [], rezerve: [] }, { postava: [], rezerve: [] }]
  if (zac < 0) return ekipe
  const del = s.slice(zac, kon < 0 ? undefined : kon)
  const iT = del.search(/>\s*Titolari\s*</)
  const iP = del.search(/>\s*Panchina\s*</)
  if (iT < 0) return ekipe
  const bloki = [[del.slice(iT, iP < 0 ? undefined : iP), true], [iP < 0 ? '' : del.slice(iP), false]]
  for (const [blok, zacetnik] of bloki) {
    for (const v of blok.match(/<tr\b[^>]*>(?:(?!<\/tr>)[\s\S])*?<\/tr>/g) ?? []) {
      const celice = [...v.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1])
      if (celice.length !== 4) continue
      const st = (c) => {
        const t = besedilo(c)
        return /^\d+$/.test(t) ? Number(t) : null
      }
      const d = igralecCelice(celice[1], st(celice[0]), zacetnik)
      const g = igralecCelice(celice[2], st(celice[3]), zacetnik)
      if (d) ekipe[0][zacetnik ? 'postava' : 'rezerve'].push(d)
      if (g) ekipe[1][zacetnik ? 'postava' : 'rezerve'].push(g)
    }
  }
  return ekipe
}

const VRSTE = {
  gol: 'gol', 'gol (rig.)': 'enajstmetrovka', autogol: 'avtogol', 'rigore sbagliato': 'zgresena',
  assist: 'asistenca', ammonizione: 'rumeni', espulsione: 'rdeci', entra: 'noter', esce: 'ven',
}

/**
 * Dogodki časovnice "Dettagli": [{ ekipaIdx, minuta, vrsta, regSt, prikaz }].
 * Menjava je { vrsta: 'menjava', noter, ven }.
 */
export function dogodki(html) {
  const s = String(html ?? '')
  const zac = s.indexOf('id="pills-details"')
  const kon = s.indexOf('id="pills-rosters"', zac)
  if (zac < 0) return { dogodki: [], neznani: [] }
  const del = s.slice(zac, kon < 0 ? undefined : kon)
  const out = []
  const neznani = []
  for (const v of del.match(/<tr class="border border-1">[\s\S]*?<\/tr>/g) ?? []) {
    const celice = [...v.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1])
    if (celice.length !== 3) continue
    const minuta = minutaVira(besedilo(celice[1]))
    for (const [ekipaIdx, c] of [[0, celice[0]], [1, celice[2]]]) {
      let menjava = null
      for (const m of c.matchAll(/<span[^>]*>\s*([^<]+?)\s*<\/span>(?:&nbsp;?|\s|<i\b[^>]*><\/i>|<br\s*\/?>)*(?:<a href="[^"]*\/(giocatore|allenatore)\/[^"/]+\/(\d+)"[^>]*>([^<]*)<\/a>)?/g)) {
        const vrsta = VRSTE[besedilo(m[1]).toLowerCase()]
        if (!vrsta) { neznani.push(besedilo(m[1])); continue }
        // Karton trenerju (`/allenatore/`) ni igralčev: šteje le v vsoti.
        const kdo = { regSt: m[2] === 'giocatore' ? Number(m[3]) : null, prikaz: razpakiraj(m[4] ?? '').trim(), osebje: m[2] === 'allenatore' }
        if (vrsta === 'noter') { menjava = { ekipaIdx, minuta, vrsta: 'menjava', noter: kdo, ven: null }; out.push(menjava); continue }
        if (vrsta === 'ven') {
          if (menjava && !menjava.ven) menjava.ven = kdo
          else out.push({ ekipaIdx, minuta, vrsta: 'menjava', noter: null, ven: kdo })
          continue
        }
        out.push({ ekipaIdx, minuta, vrsta, ...kdo })
      }
    }
  }
  return { dogodki: out, neznani }
}

/** Vsote zavihka "Statistiche": { 'gol': [3, 0], 'autogol': [1, 0], … }. */
export function statistike(html) {
  const s = String(html ?? '')
  const zac = s.indexOf('id="pills-stats"')
  if (zac < 0) return {}
  const out = {}
  for (const v of s.slice(zac).match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const celice = [...v.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => besedilo(x[1]))
    if (celice.length !== 3 || !/^\d+$/.test(celice[0]) || !/^\d+$/.test(celice[2])) continue
    out[celice[1].toLowerCase()] = [Number(celice[0]), Number(celice[2])]
  }
  return out
}

/**
 * Stran tekme v obliko, ki jo dajo drugi viri. Null, če stran ni tekma ali še
 * ni končana. Zapisnik brez 11 začetnikov, z goli, ki se ne ujemajo z izidom,
 * ali z menjavo igralca, ki ni na igrišču, je `nepopoln: true`.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = String(html ?? '')
  if (!jeStranZapisnika(s)) return null
  const glava = glavaTekme(s)
  if (!glava.koncana || !glava.izid) return null
  const rezultat = glava.izid
  const ekipe = postavi(s)
  const { dogodki: dog, neznani } = dogodki(s)
  const stat = statistike(s)
  const opozorila = []
  if (neznani.length) opozorila.push(`neznani dogodki: ${[...new Set(neznani)].join(', ')}`)
  const ime = (idx) => glava.klubi[idx]?.ime ?? (idx ? 'gostje' : 'domači')
  const vsi = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve]
  const najdi = (idx, k) => (k?.regSt != null ? vsi(idx).find((i) => i.regSt === k.regSt) ?? null : null)
  const oseba = (idx, i, minuta) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt, minuta })
  const razlogi = []

  // Goli. Gol in enajstmetrovka sta v stolpcu strelčeve ekipe, avtogol v
  // stolpcu ekipe, ki ji šteje (strelec je iz nasprotne). ekipaIdx je ekipa
  // strelca (kot pri drugih virih), avtogol: true.
  const goli = []
  const zgresene = []
  let brezStrelca = 0
  for (const d of dog) {
    if (!['gol', 'enajstmetrovka', 'avtogol', 'zgresena'].includes(d.vrsta)) continue
    const strelcevIdx = d.vrsta === 'avtogol' ? 1 - d.ekipaIdx : d.ekipaIdx
    let i = najdi(strelcevIdx, d)
    // Avtogol, vpisan v stolpec strelčeve ekipe: igralca najdemo pri njej.
    if (!i && d.vrsta === 'avtogol' && najdi(d.ekipaIdx, d)) {
      opozorila.push(`avtogol v ${d.minuta}. minuti: ${d.prikaz} je v stolpcu svoje ekipe`)
      razlogi.push(`avtogol ${d.prikaz} v stolpcu napačne ekipe`)
      i = najdi(d.ekipaIdx, d)
    }
    if (d.vrsta === 'zgresena') {
      if (i) zgresene.push(oseba(strelcevIdx, i, d.minuta))
      else opozorila.push(`zgrešena enajstmetrovka v ${d.minuta}. minuti: ${d.prikaz} ni v postavi`)
      continue
    }
    const avtogol = d.vrsta === 'avtogol'
    if (i) { goli.push({ ...oseba(strelcevIdx, i, d.minuta), avtogol, enajstmetrovka: d.vrsta === 'enajstmetrovka' }); continue }
    if (!avtogol) brezStrelca++
    opozorila.push(`${avtogol ? 'avtogol' : 'gol'} v ${d.minuta}. minuti: strelca "${d.prikaz}" ni v postavi`)
    goli.push({ ekipaIdx: strelcevIdx, st: null, ime: null, regSt: null, minuta: d.minuta, avtogol, enajstmetrovka: false })
  }

  // Menjave.
  const menjave = []
  const videne = new Set()
  for (const d of dog.filter((x) => x.vrsta === 'menjava')) {
    // Vir včasih isto menjavo vpiše dvakrat ob isti minuti: druga je odveč.
    const kljuc = `${d.ekipaIdx}:${d.minuta}:${d.noter?.regSt}:${d.ven?.regSt}`
    if (videne.has(kljuc)) { opozorila.push(`${ime(d.ekipaIdx)}: menjava v ${d.minuta}. minuti je vpisana dvakrat`); continue }
    videne.add(kljuc)
    const noter = najdi(d.ekipaIdx, d.noter)
    const ven = najdi(d.ekipaIdx, d.ven)
    // Kdor gre ven, mora biti v postavi ekipe, sicer bi jih na igrišču
    // ostalo dvanajst. Vir pa včasih isti "Entra" vpiše obema ekipama (igralec
    // nasprotnika): takrat ven gre znani igralec, kdo je prišel, ne vemo
    // (kot gfa: le opozorilo, rezerva brez minut).
    if (!ven) {
      opozorila.push(`${ime(d.ekipaIdx)}: menjava v ${d.minuta}. minuti — ${d.ven?.prikaz ?? '?'} (ven) ni v postavi`)
      razlogi.push('menjava z igralcem, ki ga ni v postavi')
      continue
    }
    if (!noter) opozorila.push(`${ime(d.ekipaIdx)}: menjava v ${d.minuta}. minuti — ${d.noter?.prikaz ?? '?'} (noter) ni med rezervami`)
    menjave.push({
      ekipaIdx: d.ekipaIdx,
      minuta: d.minuta,
      noter: noter ? { st: noter.st, ime: noter.ime, regSt: noter.regSt } : { st: null, ime: null, regSt: null },
      ven: { st: ven.st, ime: ven.ime, regSt: ven.regSt },
    })
  }
  menjave.sort((a, b) => a.ekipaIdx - b.ekipaIdx || (a.minuta ?? 999) - (b.minuta ?? 999))
  // Menjave po vrsti: kdor gre ven, mora biti na igrišču, kdor pride, ne.
  // Vir ima redke napake vnosa (isti igralec gre dvakrat ven) — takrat minut
  // ne ugibamo: zapisnik je nepopoln.
  ekipe.forEach((e, idx) => {
    const igra = new Set(e.postava.map((i) => i.regSt))
    for (const x of menjave.filter((y) => y.ekipaIdx === idx)) {
      if (!igra.has(x.ven.regSt)) {
        opozorila.push(`${ime(idx)}: menjava v ${x.minuta}. minuti — ${x.ven.ime} gre ven, a ni na igrišču`)
        razlogi.push(`${ime(idx)}: ${x.ven.ime} gre ven, a ni na igrišču`)
      }
      if (x.noter.regSt != null && igra.has(x.noter.regSt)) {
        opozorila.push(`${ime(idx)}: menjava v ${x.minuta}. minuti — ${x.noter.ime} pride, a je že na igrišču`)
        razlogi.push(`${ime(idx)}: ${x.noter.ime} pride, a je že na igrišču`)
      }
      igra.delete(x.ven.regSt)
      if (x.noter.regSt != null) igra.add(x.noter.regSt)
    }
  })
  // Rezerva, ki zamenja začetnega vratarja, je na tej tekmi vratar.
  for (const m of menjave) {
    const venVratar = ekipe[m.ekipaIdx].postava.find((i) => i.regSt === m.ven.regSt && i.vratar)
    const noter = venVratar && ekipe[m.ekipaIdx].rezerve.find((i) => i.regSt === m.noter.regSt)
    if (noter) noter.vratar = true
  }

  // Kartoni z minuto. Rumeni + rdeči istega igralca (drugi rumeni) je
  // 1 rumeni + 1 rdeči; dva rumena brez rdečega sta napaka vira.
  const rumeni = []
  const rdeci = []
  for (const d of dog.filter((x) => (x.vrsta === 'rumeni' || x.vrsta === 'rdeci') && !x.osebje)) {
    const i = najdi(d.ekipaIdx, d)
    if (!i) { opozorila.push(`${ime(d.ekipaIdx)}: karton v ${d.minuta}. minuti — ${d.prikaz} ni v postavi`); continue }
    const seznam = d.vrsta === 'rumeni' ? rumeni : rdeci
    if (seznam.some((k) => k.ekipaIdx === d.ekipaIdx && k.regSt === i.regSt)) {
      opozorila.push(`${ime(d.ekipaIdx)}: ${i.ime} ima dva ${d.vrsta === 'rumeni' ? 'rumena' : 'rdeča'} kartona`)
      continue
    }
    seznam.push(oseba(d.ekipaIdx, i, d.minuta))
  }

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  ekipe.forEach((e, idx) => {
    if (e.postava.length !== 11) razlogi.push(`${ime(idx)} — ${e.postava.length} začetnikov`)
    if (e.postava.some((i) => i.regSt == null) || e.rezerve.some((i) => i.regSt == null))
      razlogi.push(`${ime(idx)} — igralec brez šifre`)
  })
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    razlogi.push(`goli iz dogodkov ${zaEkipo(0)}:${zaEkipo(1)}, izid ${rezultat.domaci}:${rezultat.gostje}`)
  if (brezStrelca) razlogi.push(`${brezStrelca} golov brez strelca v postavi`)
  // Vsote zavihka "Statistiche" (le opozorilo: vir jih izračuna iz istih dogodkov).
  const vsota = (kljuc, f) => {
    const v = stat[kljuc]
    if (!v) return
    for (const idx of [0, 1]) if (v[idx] !== f(idx)) opozorila.push(`Statistiche "${kljuc}" ${ime(idx)}: ${v[idx]}, iz dogodkov ${f(idx)}`)
  }
  vsota('ammonizione', (idx) => dog.filter((x) => x.vrsta === 'rumeni' && x.ekipaIdx === idx).length)
  vsota('espulsione', (idx) => dog.filter((x) => x.vrsta === 'rdeci' && x.ekipaIdx === idx).length)
  vsota('sostituzione', (idx) => dog.filter((x) => x.vrsta === 'menjava' && x.ekipaIdx === idx).length)

  const nepopoln = razlogi.length > 0
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${[...new Set(razlogi)].join('; ')}`)
  ekipe.forEach((e, idx) => {
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (e.postava.length && vratarjev !== 1) opozorila.push(`${ime(idx)}: vratarjev v postavi je ${vratarjev}`)
  })

  const vObliko = ({ st, ime, regSt, vratar, pozicija }) => ({ st, ime, regSt, vratar, pozicija })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(glava.datum),
    krog: glava.krog,
    datum: glava.datum,
    ura: glava.ura,
    tekmovanje: glava.tekmovanje,
    domaci: { ime: ime(0), klubId: glava.klubi[0]?.id ?? null, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ime(1), klubId: glava.klubi[1]?.id ?? null, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    opozorila,
  }
}

/** Nastopi po šifri osebe (kot oefb), z zgrešenimi enajstmetrovkami. */
export const nastopi = (z) =>
  nastopiPoSifri(z).map((n) => ({
    ...n,
    zgreseneEnajstmetrovke: (z.zgresene ?? []).filter((x) => x.ekipaIdx === n.ekipaIdx && x.regSt != null && x.regSt === n.regSt).length,
  }))

// --- klubi ------------------------------------------------------------------------

// Vzdevki: levo ključ, kot ga piše vir, desno ključ, pod katerim klub že
// poznamo. Dodaj le videne (2024/25–2026/27 so imena v razporedu ista).
const ISTI_KLUB_SM = {}

export const kljucKlubaSm = (ime) => {
  const k = norm(ime)
  return ISTI_KLUB_SM[k] ?? k
}

/** Kratko ime: imena so že kratka ("Juvenes Dogana", "San Marino Academy"). */
export function kratkoImeSm(polno) {
  const vse = razpakiraj(polno).trim().split(/\s+/).filter(Boolean)
  if (vse.join(' ') === 'San Marino Academy') return 'SM Academy'
  return vse.slice(0, 3).join(' ')
}

// --- prenos -----------------------------------------------------------------------

const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new FsgcZavrnitev(`fsgc: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new FsgcZavrnitev(`fsgc: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/** Stran prvenstva (vedno sveža; napačna stran ali sezona ustavi uvoz). */
async function stranRazporeda(koda, prenesi) {
  const url = naslovRazporeda(koda)
  const html = await beri(prenesi, url, imeRazporeda(koda), true)
  if (!jeStranRazporeda(html)) throw new Error(`fsgc: ${url} ni stran prvenstva s krogi — uvoz ustavljen`)
  const izbrana = izbranaSezona(html)
  if (izbrana !== razbijKodo(koda).sezona)
    throw new Error(`fsgc: ${url} kaže sezono ${izbrana ?? '?'}, ne ${razbijKodo(koda).sezona} — uvoz ustavljen`)
  return html
}

/** Zapisnik iz predpomnilnika (le cel), sicer null. */
export const shranjen = (id, mapa = MAPA) => {
  const p = `${mapa}/${imeZapisnika(id)}`
  if (!existsSync(p)) return null
  const html = readFileSync(p, 'utf8')
  return jeCelZapisnik(html) ? html : null
}

const vir = {
  ime: 'fsgc',
  polnoIme: 'Federazione Sammarinese Giuoco Calcio (fsgc.sm)',
  drzava: 'SM',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new FsgcZavrnitev(`fsgc: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // V predpomnilnik gre stran prvenstva in CELA odigrana tekma — neodigrana
  // ali nepopolna se prebere znova.
  zaPredpomnilnik: (html) => jeStranRazporeda(html) || jeCelZapisnik(html),
  razporedBrezUvodnegaPrenosa: true,

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(vrsticeRazporeda(await stranRazporeda(koda, prenesi)))
  },

  async zapisniki(koda, prenesi) {
    const out = []
    for (const t of vrsticeRazporeda(await stranRazporeda(koda, prenesi)).filter((x) => x.izid && x.id)) {
      const url = naslovZapisnika(t.id)
      const ime = imeZapisnika(t.id)
      let html = await beri(prenesi, url, ime, false)
      let z = vZapisnik(html, { id: t.id, url })
      // Nepopoln zapisnik do 45 dni po tekmi beremo znova sveže.
      if (z?.nepopoln && starostDni(z.datum) <= 45) {
        html = await beri(prenesi, url, ime, true)
        z = vZapisnik(html, { id: t.id, url })
      }
      if (!z) continue
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.datum ??= t.datum
      z.sezona ??= sezonaIzDatuma(t.datum)
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid tekme ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaSm,
  kratkoIme: kratkoImeSm,
  poenostavi: kljucKlubaSm,
}

export default vir
