// Vir: portal županijskih zvez Romunije — www.frf-ajf.ro.
//
// En portal za vseh 41 županijskih zvez (AJF, Asociația Județeană de Fotbal)
// in Bukarešto: Liga a IV-a in nižje. Strani izriše strežnik (HTML), spredaj
// je Cloudflare brez izziva, robots.txt je prazen. **Pogoji portala
// prepovedujejo reprodukcijo brez pisnega dovoljenja** — prošnja je poslana,
// lige so do odgovora NEAKTIVNE. Če nas prosijo, naj nehamo, nehamo.
//
// ŠIFRA LIGE je `<judet>/<slug>-<id>` (npr. `timis/liga-a-iv-a-16445`), kot v
// naslovu `/<judet>/competitii-fotbal/<slug>-<id>`. Vsaka sezona ima svoj id
// (2026/27 ~16xxx–17xxx, 2025/26 ~15xxx), tudi arhiv. Seznam tekmovanj
// županije je na `/<judet>/competitii-fotbal/<leto začetka>` (2026, arhiv
// 2025) — izpiše ga `scripts/romunske-lige.mjs`.
//
// STRANI
// - Program (`…/<slug>-<id>/program`): ena stran z VSEMI tekmami sezone —
//   "Domači - Gostje", krog, datum (ISO; prazen ali 1970-01-01, dokler zveza
//   kroga ne razpiše), izid ("2-1", neodigrana "-") in povezava na tekmo
//   `/<judet>/meciuri/<domači>-<gostje>-<id>.html`. Ure tu ni.
// - Krog (`…/meciuri/etapa-<N>`): datum z uro ("Sambata, 10 Octombrie 2026,
//   11:00", bukareški čas). Beremo ga le za prihajajoči krog (rok kroga).
// - Lestvica (`…/clasament`): # Echipa M V E I GM GP P.
//
// ZAPISNIK (stran tekme)
// - Glava: imeni ekip (h1), izid "<h2>2 - 1</h2>", "Pauza: 0-0", datum z uro,
//   v drobtinah "Etapa 7". Ekipa: `<h3 class="tbk__title ">Ime</h3>`, pod njo
//   `<h4>Titulari</h4>` (začetniki) in `<h4>Rezerve</h4>` (klop). Za obema
//   ekipama je razdelek "În aceeași etapă" (druge tekme kroga) — tam nehamo.
// - Igralec: `<h5 class="product_title entry-title"><a href="…/jucatori/
//   <slug>-<id>.html">Priimek Ime</a></h5>`; id → `reg_st`. Pod imenom sta
//   "Carnet" (številka izkaznice) in datum rojstva — **ne beremo ju in ju ne
//   hranimo** (najmanj podatkov, glej anonimizacija). Dresov, vratarja in
//   pozicij zapisnik NIMA: pozicije (tudi GK) določi glasovanje skupnosti.
// - Dogodki so ikone `images/<vrsta>` z minuto ("46'", "92'" → 90):
//   goal.png (gol; pripona "(a)" = avtogol, stoji pri strelcu v NJEGOVI ekipi;
//   "(p)" = 11 m), yellow_card.png, redCard.png (izključitev; title pove, ali
//   je drugi rumeni), outHome.gif / inHome.gif (izstop pri začetniku, vstop
//   pri rezervi — minute so točne; tudi outAway/inAway).
//
// NEPOPOLNI ZAPISNIKI. Zapisnik vnaša klub in županije so različno vestne:
// obe postavi, ena, nobena — ali le igralci z dogodki (Prahova, Ialomița: pod
// "Titulari" so samo strelci in kartonirani, klopi ni). Ekipa ima znano
// postavo, če ima vsaj 7 začetnikov in ni "le dogodkov". Tekma, pri kateri
// ena ekipa nima znane postave, je `nepopoln`: uvoz zapiše izid in nastope
// znane ekipe, `imported_at` pa pusti prazen — nočni uvoz jo bere znova, dokler
// je klub ne dopolni, preveri-podatke jo javi (`zapisnik-nepopoln`). V arhivu
// nepopolnih tekem ne uvažamo (dopolnil jih ne bo nihče). Kontumacija: 3:0
// brez obeh postav, starejša od tedna dni (kot hns, mlsz).
//
// Beremo odkrito in počasi (User-Agent z imenom in naslovom, 1,6 s med
// zahtevki, popolnih zapisnikov ne beremo znova). **Če se pojavi izziv,
// CAPTCHA ali 403, ustavi — ne obhajaj.**
import { razpakiraj } from '../klubi.mjs'
import { minuteIzPreklopov } from './facr.mjs'
import { sifra } from './zapisniki.mjs'

const OSNOVNI = 'https://www.frf-ajf.ro'

// Dostop: Cloudflare pred frf-ajf.ro vrne 403 omrežjem ameriških podatkovnih
// centrov (GitHubovi tekači, 10. 10. 2026), z našega strežnika v EU in z
// istim odkritim User-Agentom pa 200 — zemljepisna omejitev, ne izziv.
// Zahtevki zato tečejo prek istega posrednika kot FAČR (`FACR_PROXY`,
// scripts/hetzner/facr-posrednik.sh, ki dovoli tudi www.frf-ajf.ro). Izziva
// ali CAPTCHE ne obhajamo: `jeIzziv` ustavi uvoz.
let posrednik
async function frfFetch(url, init = {}) {
  if (posrednik === undefined) {
    const naslov = process.env.FACR_PROXY
    posrednik = naslov ? new (await import('undici')).ProxyAgent(naslov) : null
  }
  if (!posrednik) return fetch(url, init)
  const { fetch: f } = await import('undici')
  return f(url, { ...init, dispatcher: posrednik })
}
const DOLZINA_TEKME = 90
/** Začetek opozorila nepopolne tekme; preveri-podatke ga išče v `import_warnings`. */
export const NEPOPOLN = 'zapisnik nepopoln'
/** Najmanj začetnikov, da ekipa šteje za ekipo z znano postavo (pravila igre). */
const NAJMANJ_ZACETNIKOV = 7

// --- šifra in naslovi -------------------------------------------------------

/** `timis/liga-a-iv-a-16445` → { judet, tekmovanje, id }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().replace(/^\/+|\/+$/g, '').match(/^([a-z-]+)\/([a-z0-9-]+-(\d+))$/)
  if (!m) throw new Error(`frf: šifra lige je "<judet>/<slug>-<id>" (npr. timis/liga-a-iv-a-16445), ne "${koda}"`)
  return { judet: m[1], tekmovanje: m[2], id: Number(m[3]) }
}
const osnova = (koda) => {
  const { judet, tekmovanje } = razbijKodo(koda)
  return `${OSNOVNI}/${judet}/competitii-fotbal/${tekmovanje}`
}
export const naslovPrograma = (koda) => `${osnova(koda)}/program`
export const naslovLestvice = (koda) => `${osnova(koda)}/clasament`
export const naslovKroga = (koda, krog) => `${osnova(koda)}/meciuri/etapa-${krog}`
export const naslovLige = osnova
const imeStrani = (koda, vrsta) => `${vrsta}-${sifra(koda)}.html`
const imeTekme = (id) => `meci-${id}.html`

// --- besedilo in imena -------------------------------------------------------

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

/** ş ţ s cedilo → ș ț z vejico (romunski pravopis; vir piše oboje). */
export const vejica = (s) =>
  String(s ?? '').replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț')

/** Ime igralca: "Bucur Vladut - Stefan" → "Bucur Vladut-Stefan", ş → ș. */
export const lepoIme = (ime) => vejica(razpakiraj(ime)).replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim()

/** Ime kluba: kot ga piše vir, s ș ț z vejico. */
const cistoIme = (ime) => vejica(razpakiraj(ime)).replace(/\s+/g, ' ').trim()

// Isto ime, drug klub. Ime kluba je enolično v državi, AJF pa so ločene
// zveze: "AS Viitorul" je lahko v petih županijah pet klubov. Klub, katerega
// ime se pojavi v dveh županijah, dobi oznako županije — ključ je
// `<judet>|<ime>`. Pregled 10. 10. 2026 (12 vpisanih lig, sezoni 2026/27 in
// 2025/26) ni našel nobenega trka; ob novi ligi poženi
// `node scripts/romunske-lige.mjs --trki` in nov trk dodaj sem.
const IME_V_ZUPANIJI = {}

/** Ime kluba, kot ga vidi uvoz (s ș ț in morebitno oznako županije). */
export function imeKluba(ime, judet) {
  const cisto = cistoIme(ime)
  return IME_V_ZUPANIJI[`${judet}|${cisto}`] ?? cisto
}

// Ključ kluba: male črke brez diakritike (vir isti klub piše enkrat s ș,
// drugič z ş ali brez: "Malaesti", "Mălăeşti").
export const kljucKlubaRo = (ime) =>
  razpakiraj(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Oblike društva, ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_RO = new Set(['as', 'acs', 'afc', 'cs', 'csc', 'csm', 'cso', 'csu', 'css', 'fc', 'sc', 'scm', 'acsm', 'fcm',
  'cf', 'asc', 'acf', 'afk', 'ac', 'sa', 'srl', 'club', 'sportiv', 'asociatia', 'asociația', 'municipal', 'orășenesc',
  'comunal', 'clubul', 'fotbal'])

/** Kratko ime: brez oblike društva in letnice, največ tri besede ("CS Sânandrei Timiș" → "Sânandrei Timiș"). */
export function kratkoImeRo(polno) {
  const besede = cistoIme(polno)
    .split(/\s+/)
    .filter((b) => b && !/^\d{4}$/.test(b) && !OBLIKE_RO.has(b.toLocaleLowerCase('ro').replace(/[.]/g, '')))
  if (!besede.length) return cistoIme(polno)
  return besede.slice(0, 3).join(' ')
}

// --- datumi -----------------------------------------------------------------

const MESECI = {
  ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
  iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12,
}

/** "Sambata, 3  Octombrie 2026" → "2026-10-03". */
export function datumRo(s) {
  const m = String(s ?? '').match(/(\d{1,2})\s+([A-Za-zăâîșțĂÂÎȘȚ]+)\s+(\d{4})/)
  const mesec = m && MESECI[m[2].toLowerCase()]
  if (!mesec) return null
  return `${m[3]}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/**
 * Bukareška ura v ljubljansko: Romunija je vse leto uro pred nami (EET/EEST,
 * premik ure isti dan). "11:00" 3. 10. → { datum: "2026-10-03", ura: "10:00" }.
 */
export function vLjubljanskiCas(datum, ura) {
  const m = String(ura ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!datum || !m) return { datum, ura: null }
  const h = Number(m[1]) - 1
  if (h >= 0) return { datum, ura: `${String(h).padStart(2, '0')}:${m[2]}` }
  const d = new Date(`${datum}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return { datum: d.toISOString().slice(0, 10), ura: `23:${m[2]}` }
}

/** "75'" → 75, "92'" → 90 (sodniški podaljšek se ne šteje). */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** Sezona iz datuma tekme: od julija naprej je nova ("2026-10-03" → "2026/27"). */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String((leto + 1) % 100).padStart(2, '0')}`
}

const starostDni = (datum, danes = Date.now()) =>
  datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0

// --- izziv -----------------------------------------------------------------

/**
 * Cloudflarov izziv ("Just a moment…", CAPTCHA) namesto strani. Navadne strani
 * nosijo Cloudflarov skript `/cdn-cgi/challenge-platform/scripts/jsd/` — to
 * NI izziv. Ob izzivu uvoz ustavimo; ne obhajamo ga.
 */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? ''))

/** Prenos, ki se ob izzivu ustavi (namesto da bi izziv razčlenil kot prazno stran). */
async function beri(prenesi, url, ime, sveze) {
  const html = await prenesi(url, ime, sveze)
  if (jeIzziv(html)) throw new Error(`frf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

// --- program (razpored in izidi) --------------------------------------------

const izid = (s) => {
  const m = String(s ?? '').trim().match(/^(\d+)\s*-\s*(\d+)$/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

/** Je stran res program tekmovanja (ne napaka ali prazna predloga s statusom 200)? */
export const jeProgram = (html) => /Program competi/.test(String(html ?? '')) && /<td>Etapa<\/td>/.test(String(html ?? ''))

/** Sezona iz naslova strani ("Liga a IV-a, sezon 2026/2027" → "2026/27"). */
export function sezonaStrani(html) {
  const m = String(html ?? '').match(/class="page-title[^"]*">[^<]*sezon\s+(\d{4})\s*\/\s*(\d{4})/)
  return m ? `${m[1]}/${m[2].slice(2)}` : null
}

/**
 * Tekme s strani programa: [{ krog, datum, domaci, gostje, izid, id, url }].
 * Imeni sta ločeni z " - ". Če je v vrstici več takih ločil (klub z
 * vezajem in presledki), odloči seznam znanih imen (`imena`, npr. z
 * lestvice); brez njega vrstica ustavi uvoz — tekme ne ugibamo.
 */
export function tekmePrograma(html, judet, imena = null) {
  const s = String(html ?? '')
  const i = s.indexOf('Program competi', s.indexOf('tab-content'))
  if (i < 0) return []
  const tabela = s.slice(i, s.indexOf('</table>', i))
  const znana = imena ? new Set([...imena].map(kljucKlubaRo)) : null
  const out = []
  for (const m of tabela.matchAll(/<tr[^>]*>\s*<td><b>([\s\S]*?)<\/b><\/td>\s*<td>(\d+)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([\s\S]*?)<\/td>/g)) {
    const par = besedilo(m[1])
    const deli = par.split(' - ')
    let domaci
    let gostje
    if (deli.length === 2) [domaci, gostje] = deli
    else {
      const moznosti = []
      for (let k = 1; k < deli.length; k++) {
        const a = deli.slice(0, k).join(' - ')
        const b = deli.slice(k).join(' - ')
        if (znana?.has(kljucKlubaRo(a)) && znana.has(kljucKlubaRo(b))) moznosti.push([a, b])
      }
      if (moznosti.length !== 1) throw new Error(`frf: tekme "${par}" ne znam razdeliti na domače in goste`)
      ;[domaci, gostje] = moznosti[0]
    }
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(m[3].trim()) && !m[3].startsWith('1970') ? m[3].trim() : null
    const url = m[5].match(/href=['"]([^'"]*\/meciuri\/[^'"]*-(\d+)\.html)['"]/)
    out.push({
      krog: Number(m[2]),
      datum,
      domaci: imeKluba(domaci, judet),
      gostje: imeKluba(gostje, judet),
      izid: izid(m[4]),
      id: url?.[2] ?? null,
      url: url?.[1] ?? null,
    })
  }
  return out
}

/** Imena klubov z lestvice (za vrstice programa z več " - "). */
export function imenaLestvice(html) {
  const s = String(html ?? '')
  return [...s.matchAll(/<td class="matchTeamList"><a href="[^"]*\/echipe\/[^"]*">([^<]*)<\/a>/g)].map((m) => cistoIme(m[1]))
}

/** Ure tekem s strani kroga: Map(id tekme → { datum, ura }) v bukareškem času. */
export function ureKroga(html) {
  const out = new Map()
  for (const blok of String(html ?? '').split('panel-calendar-match').slice(1)) {
    const cas = besedilo(blok.match(/matchCompetitionList">([^<]*)</)?.[1])
    const id = blok.match(/\/meciuri\/[^"']*-(\d+)\.html/)?.[1]
    if (!id) continue
    const ura = cas.match(/,\s*(\d{1,2}:\d{2})\s*$/)?.[1] ?? null
    out.set(id, { datum: datumRo(cas), ura: ura ? ura.padStart(5, '0') : null })
  }
  return out
}

// --- zapisnik ---------------------------------------------------------------

/** Dogodki v stolpcu igralca: [{ vrsta, minuta, pripona, naslov }]. */
export function dogodkiIgralca(stolpec) {
  return [...String(stolpec ?? '').matchAll(/images\/([A-Za-z_]+)\.(?:png|gif|jpe?g)"([^>]*)\/?>\s*([^<]*)/g)].map(([, vrsta, atributi, za]) => {
    const t = besedilo(za)
    return {
      vrsta,
      minuta: minuta(t),
      pripona: t.match(/\(([^)]*)\)/)?.[1]?.toLowerCase() ?? null,
      naslov: razpakiraj(atributi.match(/title="([^"]*)"/)?.[1] ?? ''),
    }
  })
}

const VRSTE = new Set(['goal', 'yellow_card', 'redCard', 'red_card', 'outHome', 'inHome', 'outAway', 'inAway'])
const jeVstop = (v) => v === 'inHome' || v === 'inAway'
const jeIzstop = (v) => v === 'outHome' || v === 'outAway'

/** Igralci enega razdelka (Titulari ali Rezerve). */
function igralciRazdelka(html, zacetnik) {
  const out = []
  const vrstice = String(html).split(/<div class="row\s*">/).slice(1)
  for (const v of vrstice) {
    const a = v.match(/<h5 class="product_title entry-title">\s*<a href="([^"]*)">([\s\S]*?)<\/a>/)
    if (!a) continue
    const ime = lepoIme(besedilo(a[2]))
    if (!ime) continue
    const regSt = a[1].match(/\/jucatori\/[^"]*-(\d+)\.html/)?.[1] ?? null
    const stolpec = v.match(/<div class="col-xs-2 col-sm-3">([\s\S]*?)<\/div>/)?.[1] ?? ''
    out.push({ st: null, ime, regSt: regSt ? Number(regSt) : null, zacetnik, vratar: false, pozicija: null, dogodki: dogodkiIgralca(stolpec) })
  }
  return out
}

/** Razdelki ekip: [{ ime, postava, rezerve, leDogodki }] do "În aceeași etapă". */
function ekipeStrani(s) {
  const out = []
  for (const del of s.split(/<h3 class="tbk__title\s*">/).slice(1)) {
    const ime = cistoIme(besedilo(del.slice(0, del.indexOf('</h3>'))))
    if (/aceea[sș]i etap/i.test(ime)) break
    const razdelki = del.split(/<h4>/).slice(1)
    let postava = []
    let rezerve = []
    let klop = false
    for (const r of razdelki) {
      const naslov = besedilo(r.slice(0, r.indexOf('</h4>'))).toLowerCase()
      if (naslov.startsWith('titular')) postava = postava.concat(igralciRazdelka(r, true))
      else if (naslov.startsWith('rezerv')) {
        klop = true
        rezerve = rezerve.concat(igralciRazdelka(r, false))
      }
    }
    // "Le dogodki" (Prahova, Ialomița): brez klopi in vsak našteti ima dogodek.
    const leDogodki = !klop && postava.length > 0 && postava.every((i) => i.dogodki.length > 0)
    out.push({ ime, postava, rezerve, leDogodki })
  }
  return out
}

/** Ali ekipa ima postavo, iz katere se da šteti minute. */
const znanaPostava = (e) => !!e && !e.leDogodki && e.postava.length >= NAJMANJ_ZACETNIKOV

/** Kontumacija: 3:0 ali 0:3 in nobena ekipa nima nikogar v zapisniku. */
export function jeKontumacija(z) {
  if (!z?.rezultat) return false
  const { domaci, gostje } = z.rezultat
  const tri = (domaci === 3 && gostje === 0) || (domaci === 0 && gostje === 3)
  return tri && !z.domaci.postava.length && !z.gostje.postava.length && !z.domaci.rezerve.length && !z.gostje.rezerve.length
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida (ni
 * odigrana) ali stran ni stran tekme. Tekma z izidom in brez (polne) postave
 * ene ali obeh ekip je `nepopoln: true` — glej glavo datoteke.
 */
export function vZapisnik(html, { id = null, url = null, judet = null } = {}) {
  let s = String(html ?? '').replace(/<script[\s\S]*?<\/script>/g, '')
  const glava = s.match(/<div class="lt match-details">([\s\S]*?)<\/section>/)?.[1]
  if (!glava) return null
  const imeni = [...glava.matchAll(/<h1>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h1>/g)].map((m) => cistoIme(besedilo(m[1])))
  const rezultat = izid(besedilo(glava.match(/<h2>([\s\S]*?)<\/h2>/)?.[1]))
  if (imeni.length !== 2 || !rezultat) return null
  const p = glava.match(/Pauza:\s*(\d+)\s*-\s*(\d+)/)
  const casVrstica = glava.match(/glyphicon-calendar"[^>]*><\/span>([^<]*)</)?.[1]
  const datum = datumRo(casVrstica)
  const ura = glava.match(/glyphicon-time"[^>]*><\/span>\s*(\d{1,2}:\d{2})/)?.[1] ?? null
  const krog = Number(s.match(/\/meciuri\/etapa-\d+">Etapa (\d+)</)?.[1]) || null

  const opozorila = []
  const najdene = ekipeStrani(s)
  // Razdelek ekipe po imenu (ekipe brez igralcev razdelka sploh nimajo).
  const k = kljucKlubaRo
  const ekipe = imeni.map((ime) => najdene.find((e) => k(e.ime) === k(ime)) ?? { ime, postava: [], rezerve: [], leDogodki: false })
  if (najdene.some((e) => !imeni.some((ime) => k(ime) === k(e.ime))))
    opozorila.push(`razdelek ekipe "${najdene.find((e) => !imeni.some((ime) => k(ime) === k(e.ime))).ime}" ni ne domači ne gost`)

  const znana = ekipe.map(znanaPostava)
  const nepopoln = !znana[0] || !znana[1]
  ekipe.forEach((e, idx) => {
    if (znana[idx]) return
    const kaj = e.leDogodki ? 'le igralci z dogodki' : e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'
    opozorila.push(`${NEPOPOLN}: ${e.ime} — ${kaj}`)
  })

  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const sestava = ekipe.map((e, ekipaIdx) => {
    // Ekipa brez znane postave nima nastopov — tudi strelci "le dogodkov" ne,
    // ker ne vemo, koliko so igrali. Izid ostane.
    if (!znana[ekipaIdx]) return { ime: e.ime, postava: [], rezerve: [] }
    for (const i of [...e.postava, ...e.rezerve]) {
      const kdo = { ekipaIdx, st: null, ime: i.ime, regSt: i.regSt }
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'goal') {
          const avtogol = d.pripona === 'a'
          const enajstmetrovka = d.pripona === 'p' || d.pripona === 'pen' || /penalt/i.test(d.naslov)
          goli.push({ ...z, avtogol, enajstmetrovka })
          if (d.pripona && !['a', 'p', 'pen'].includes(d.pripona)) opozorila.push(`${e.ime}: neznana pripona gola "(${d.pripona})" pri ${i.ime}`)
        } else if (d.vrsta === 'yellow_card') rumeni.push(z)
        else if (d.vrsta === 'redCard' || d.vrsta === 'red_card') {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.regSt === i.regSt && r.ime === i.ime)) rdeci.push(z)
        } else if (jeIzstop(d.vrsta)) menjave.push({ ekipaIdx, minuta: d.minuta, noter: { st: null, ime: null }, ven: kdo })
        else if (jeVstop(d.vrsta)) menjave.push({ ekipaIdx, minuta: d.minuta, noter: kdo, ven: { st: null, ime: null } })
        if (!VRSTE.has(d.vrsta)) opozorila.push(`${e.ime}: neznana ikona "${d.vrsta}" pri ${i.ime}`)
      }
    }
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const sifre = [...e.postava, ...e.rezerve].map((i) => i.regSt).filter((x) => x != null)
    if (new Set(sifre).size !== sifre.length) opozorila.push(`${e.ime}: isti igralec dvakrat v zapisniku`)
    const brez = [...e.postava, ...e.rezerve].filter((i) => i.regSt == null)
    if (brez.length) opozorila.push(`${e.ime}: ${brez.length} igralcev brez šifre (${brez.map((i) => i.ime).join(', ')})`)
    const vObliko = ({ dogodki, ...i }) => ({ ...i, preklopi: dogodki.filter((d) => jeVstop(d.vrsta) || jeIzstop(d.vrsta)).map((d) => d.minuta).filter((x) => x != null) })
    return { ime: e.ime, postava: e.postava.map(vObliko), rezerve: e.rezerve.map(vObliko) }
  })

  // Goli iz dogodkov proti izidu — le za ekipe z znano postavo (avtogol
  // nasprotnika šteje k izidu ekipe, a stoji pri nasprotniku).
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (!nepopoln && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje))
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  // Nepopolna tekma: opozorilo o nepopolnosti je prvo (preveri-podatke ga išče).
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))
  const cas = vLjubljanskiCas(datum, ura)
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(datum),
    krog,
    datum,
    ura: cas.ura,
    domaci: { ...sestava[0], ime: imeKluba(sestava[0].ime, judet) },
    gostje: { ...sestava[1], ime: imeKluba(sestava[1].ime, judet) },
    rezultat,
    polcas: p ? { domaci: Number(p[1]), gostje: Number(p[2]) } : null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    // Za kontumacijo: ali je zapisnik povsem prazen (glej `jeKontumacija`).
    prazen: ekipe.every((e) => !e.postava.length && !e.rezerve.length),
    opozorila,
  }
}

/**
 * Nastopi po šifri igralca. Začetnik od 0 do izstopa (ali rdečega kartona),
 * rezerva od vstopa; leteče menjave (ven in nazaj) sešteje
 * `minuteIzPreklopov`. Rezerva brez vstopa ni nastopila — razen strelca, ki
 * mu zapisnik vstopa ne vpiše: dobi nastop od minute prvega gola (opozorilo).
 */
export function nastopi(z) {
  const out = []
  for (const [ekipaIdx, e] of [z.domaci, z.gostje].entries()) {
    const prejeti = ekipaIdx === 0 ? z.rezultat.gostje : z.rezultat.domaci
    const isti = (i, x) => (i.regSt != null ? x.regSt === i.regSt : x.ime === i.ime)
    const moji = (seznam, i) => seznam.filter((x) => x.ekipaIdx === ekipaIdx && isti(i, x))
    for (const i of [...e.postava, ...e.rezerve]) {
      const zacetnik = !!i.zacetnik
      let preklopi = [...(i.preklopi ?? [])]
      const goliIgralca = moji(z.goli, i)
      if (!zacetnik && !preklopi.length) {
        if (!goliIgralca.length) continue // rezerva, ki ni vstopila
        const od = Math.min(...goliIgralca.map((g) => g.minuta ?? 0))
        preklopi = [od]
        z.opozorila?.push(`strelec ${i.ime} je na klopi, vstopa zapisnik nima — vstop postavljen na ${od}. minuto`)
      }
      const rdec = moji(z.rdeci, i)[0]
      const konec = rdec?.minuta ?? DOLZINA_TEKME
      const { minute, prvic } = minuteIzPreklopov(zacetnik, preklopi, konec)
      const igra = preklopi.length % 2 === (zacetnik ? 0 : 1)
      out.push({
        ekipaIdx,
        ekipa: e.ime,
        st: null,
        ime: i.ime,
        regSt: i.regSt ?? null,
        pozicija: null,
        vratar: false,
        zacetnik,
        minutaOd: prvic ?? 0,
        minutaDo: igra ? konec : Math.min([...preklopi].sort((a, b) => a - b).at(-1), konec),
        minute,
        goli: goliIgralca.filter((g) => !g.avtogol).length,
        goliIzEnajstmetrovke: goliIgralca.filter((g) => !g.avtogol && g.enajstmetrovka).length,
        avtogoli: goliIgralca.filter((g) => g.avtogol).length,
        zgreseneEnajstmetrovke: 0,
        rumeni: moji(z.rumeni, i).length,
        rdeci: rdec ? 1 : 0,
        prejetiGoli: prejeti,
        cleanSheet: prejeti === 0,
      })
    }
  }
  return out
}

// --- prenos -----------------------------------------------------------------

/** Program lige, vedno svež (živ dokument); preveri, da je res program. */
async function program(koda, prenesi) {
  const html = await beri(prenesi, naslovPrograma(koda), imeStrani(koda, 'program'), true)
  if (!jeProgram(html))
    throw new Error(`frf: ${naslovPrograma(koda)} ni program tekmovanja (${String(html ?? '').length} B) — uvoz ustavljen`)
  return html
}

/** Tekme programa; pri dvoumnem imenu ("A - B - C") pomaga lestvica. */
async function tekmeLige(koda, prenesi) {
  const { judet } = razbijKodo(koda)
  const html = await program(koda, prenesi)
  try {
    return tekmePrograma(html, judet)
  } catch {
    const lestvica = await beri(prenesi, naslovLestvice(koda), imeStrani(koda, 'clasament'), true)
    return tekmePrograma(html, judet, imenaLestvice(lestvica))
  }
}

const danesBukarest = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10)

const vir = {
  ime: 'frf',
  polnoIme: 'Asociațiile Județene de Fotbal (frf-ajf.ro)',
  drzava: 'RO',
  osnovniNaslov: OSNOVNI,
  // Dogovorjeno besedilo: kdo bere in kako nas dobijo. Drugega naslova ne.
  glave: { 'User-Agent': 'SLFF fantasy (slff.eu; splih.94@gmail.com)' },
  fetch: frfFetch,
  premorMs: 1600,
  imaRegistracije: false,

  naslovRazporeda: naslovPrograma,
  // Naslov tekme nosi imeni klubov (`/meciuri/<domači>-<gostje>-<id>.html`);
  // iz same šifre ga ne sestavimo, zato vodi na program.
  naslovZapisnika: (koda) => naslovPrograma(koda),

  /**
   * Razpored s programa: krogi z vsaj eno razpisano tekmo (datum). Ura je le
   * na strani kroga; preberemo jo za prvi prihajajoči krog (rok). Kontumacija:
   * 3:0 brez obeh postav, starejša od tedna dni (stran tekme, kot hns).
   */
  async razporedVseStrani(koda, prenesi, { danes = danesBukarest() } = {}) {
    const { judet } = razbijKodo(koda)
    const tekme = await tekmeLige(koda, prenesi)
    const ure = new Map()
    const prihajajoci = tekme.filter((t) => t.datum && t.datum >= danes && !t.izid).map((t) => t.krog)
    if (prihajajoci.length) {
      const krog = Math.min(...prihajajoci)
      for (const [id, c] of ureKroga(await beri(prenesi, naslovKroga(koda, krog), imeStrani(koda, `etapa-${krog}`)))) ure.set(id, c)
    }
    const krogi = new Map()
    for (const t of tekme) {
      if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
      const c = ure.get(t.id)
      const cas = vLjubljanskiCas(t.datum, c?.datum === t.datum ? c.ura : null)
      let kontumacija = false
      const star = starostDni(t.datum, Date.parse(`${danes}T00:00:00Z`))
      if (t.izid && t.url && Math.min(t.izid.domaci, t.izid.gostje) === 0 && Math.max(t.izid.domaci, t.izid.gostje) === 3 && star > 7 && star <= 90) {
        const z = vZapisnik(await beri(prenesi, t.url, imeTekme(t.id)), { id: t.id, url: t.url, judet })
        kontumacija = !!z && z.prazen && jeKontumacija(z)
      }
      krogi.get(t.krog).tekme.push({
        domaci: t.domaci, gostje: t.gostje, datum: cas.datum, ura: cas.ura, kontumacija, odigrana: !!t.izid,
        ...(kontumacija ? { izid: t.izid } : {}),
      })
    }
    // Krog brez datuma zveza še ni razpisala; pride z naslednjim uvozom.
    return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
  },

  async zapisniki(koda, prenesi) {
    const { judet } = razbijKodo(koda)
    const out = []
    for (const t of (await tekmeLige(koda, prenesi)).filter((x) => x.izid && x.url)) {
      const ime = imeTekme(t.id)
      const star = starostDni(t.datum)
      // Prve dni po tekmi zveza zapisnik še dopolnjuje: beri ga sveže.
      let z = vZapisnik(await beri(prenesi, t.url, ime, star <= 3), { id: t.id, url: t.url, judet })
      // Nepopolnega (klub postave še ni vnesel) beremo znova 45 dni; starejši
      // ostane, kakršen je, in ga ne beremo več (kot hns).
      if ((!z || z.nepopoln) && star > 3 && star <= 45) z = vZapisnik(await beri(prenesi, t.url, ime, true), { id: t.id, url: t.url, judet })
      if (!z) continue
      // Kontumacija nima zapisnika (razpored jo označi).
      if (z.prazen && jeKontumacija(z) && star > 7) continue
      // Ime kluba, krog in datum s programa, da se tekma ujame z razporedom.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog ??= t.krog
      if (z.krog !== t.krog) z.opozorila.push(`krog zapisnika ${z.krog} ni krog programa ${t.krog}`)
      z.krog = t.krog
      z.datum ??= t.datum
      z.sezona ??= sezonaIzDatuma(t.datum)
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid programa ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: t.id, z, url: t.url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaRo,
  kratkoIme: kratkoImeRo,
  poenostavi: kljucKlubaRo,
}

export default vir
