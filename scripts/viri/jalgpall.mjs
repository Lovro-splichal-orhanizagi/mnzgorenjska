// Vir: Eesti Jalgpalli Liit — jalgpall.ee (võistlused).
//
// EJL vodi vse lige odraslih (Premium liiga do IV liige) v istem sistemu in
// jih objavi na jalgpall.ee. HTML iz strežnika, brez izziva.
//
// SEZONA je koledarsko leto (marec–november): 2026 = "2026", ne "2026/27"
// (`competitions.sezona_koledarska`).
//
// ŠIFRA LIGE je `<liga>/<leto>` (`52/2026` = Premium liiga 2026). Id lige je
// stalen čez sezone, sezona je parameter (`?season=`); arhiv je ista liga z
// drugim letom (`52/2025`). Spodnje lige so bile 2025 preurejene in imajo nove
// id-je (II liiga 536, II liiga B 537/538, III liiga 548–550) z le dvema
// sezonama.
//
// RAZPORED `/voistlused/<liga>/liigad/calendar?season=<leto>`: vsi krogi
// ("N. voor") z vsemi tekmami na eni strani. Tekma: datum in ura
// ("28.02.2025 19:00", lahko prazno), domači in gostje (`/team/<id>`), izid s
// povezavo na zapisnik (`/voistlused/protocol/<id>`). Izid brez zapisnika je
// tekma, katere zapisnik še ni vnesen; "-" je neodigrana. Kontumacija je izid
// z "+" in "-" ("+ : -", "- : +"; "- : -" obe ekipi, npr. klub je izstopil;
// "4 : -" tekma, razveljavljena za eno ekipo).
//
// ZAPISNIK `/voistlused/protocol/<id>`:
// - "Põhikoosseis" (začetniki) in "Vahetusmängijad" (klop): `ul.left` domači,
//   `ul.right` gostje; igralec ima dres (`span.count` "26."), stalno šifro osebe
//   (`/voistlused/player/<id>/team/<klub>` → `reg_st`), "(VV)" = vratar,
//   "(K)" = kapetan.
// - Postavitev (`lineup-layout`, dva `soccer-field`) da POZICIJO vsakega
//   začetnika ("Väravavaht", "Parem keskkaitsja", "Ründav keskpoolkaitsja" …).
//   Nižje lige (IV liiga) je nimajo — takrat je znan le vratar.
// - "Mängu sündmused" je časovnica z minuto: gol (`football`, `penalty
//   football` = 11 m, `goal red football` = avtogol, `football var` = gol,
//   ki ga je razveljavil VAR), zgrešena/ubranjena 11-metrovka (`penalty red`,
//   `saved-penalty`), karton (`card yellow`, `card red`), menjava (`switch`:
//   prvi igralec noter, drugi ven). Pri golu je stanje po golu ("2 - 0"), iz
//   katerega preberemo, kateri ekipi je štel — tako je avtogol razpoznaven ne
//   glede na oznako. Asistenca je pri golu v oklepaju; je ne uvažamo (asistence
//   določi glasovanje).
//
// robots.txt splošnim robotom dovoli vse razen /otsing, /errors/ in
// /ejl/staadionid/…, s `Crawl-Delay: 5`. Fragmentov `ajax.php` ne beremo
// (zveza jih je enemu robotu zaprla kot "podatkovni tok"). Beremo odkrito
// (User-Agent SLFF, 5 s med zahtevki), zapisnikov, starejših od tedna, ne
// beremo znova. Ob izzivu ali CAPTCHI se uvoz ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { vLjubljanskiCas } from './frf.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'

const OSNOVNI = 'https://jalgpall.ee'
const DOLZINA_TEKME = 90

/** "52/2026" → { liga: "52", leto: "2026" }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)\/(\d{4})$/)
  if (!m) throw new Error(`jalgpall: šifra lige je "<id lige>/<leto>" (npr. 52/2026), ne "${koda}"`)
  return { liga: m[1], leto: m[2] }
}

export const naslovRazporeda = (koda) => {
  const { liga, leto } = razbijKodo(koda)
  return `${OSNOVNI}/voistlused/${liga}/liigad/calendar?season=${leto}`
}
export const naslovZapisnika = (id) => `${OSNOVNI}/voistlused/protocol/${id}`
const imeRazporeda = (koda) => `koledar-${String(koda).replace('/', '-')}.html`
const imeZapisnika = (id) => `protokoll-${id}.html`

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/> </g, '><')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/** "20′" → 20, "45+2′" → 45, "90+4′" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "28.02.2025 19:00" (tallinski čas) → ljubljanski { datum, ura }. */
export function datumUra(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*(?:kell\s*)?(\d{1,2}):(\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  const datum = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return m[4] ? vLjubljanskiCas(datum, `${m[4]}:${m[5]}`) : { datum, ura: null }
}

/**
 * Izid s strani razporeda: { izid, kontumacija }. "3 - 1" → izid; "+ : -" →
 * kontumacija 3:0, "- : +" → 0:3, "4 : -" → 4:0, "- : -" → kontumacija brez
 * izida; "-" (ali prazno) → ni izida.
 */
export function izidRazporeda(s) {
  const t = besedilo(s)
  const m = t.match(/^(\d+)\s*-\s*(\d+)/)
  if (m) return { izid: { domaci: Number(m[1]), gostje: Number(m[2]) }, kontumacija: false }
  const k = t.match(/^([+\-]|\d+)\s*:\s*([+\-]|\d+)$/)
  if (!k) return { izid: null, kontumacija: false }
  const vrednost = (x) => (x === '+' ? 3 : x === '-' ? 0 : Number(x))
  if (k[1] === '-' && k[2] === '-') return { izid: null, kontumacija: true }
  return { izid: { domaci: vrednost(k[1]), gostje: vrednost(k[2]) }, kontumacija: true }
}

/** Izbrana sezona strani (izbirnik "Hooaeg"). */
export const sezonaStrani = (html) => String(html ?? '').match(/<option\s+selected\s+value="(\d{4})"/)?.[1] ?? null

/** Vse tekme s strani razporeda: [{ krog, datum, ura, domaci, gostje, id, izid, kontumacija }]. */
export function vrsticeRazporeda(html) {
  const s = cisto(html)
  const out = []
  for (const del of s.split(/<span class="tag">/).slice(1)) {
    const krog = Number(del.match(/^\s*(\d+)\.\s*voor/)?.[1])
    if (!krog) continue
    for (const e of del.split('class="event-single"').slice(1)) {
      const { datum, ura } = datumUra(e.match(/<p class="title">([^<]*)<\/p>/)?.[1])
      const ekipi = [...e.matchAll(/<div class="team"><p><a href="[^"]*\/team\/\d+">([^<]*)<\/a>/g)].map((m) => razpakiraj(m[1]))
      if (ekipi.length !== 2) continue
      const rez = e.match(/<div class="result">(.*?)<\/div>/)?.[1] ?? ''
      const { izid, kontumacija } = izidRazporeda(rez)
      out.push({
        krog,
        datum,
        ura,
        domaci: ekipi[0],
        gostje: ekipi[1],
        id: rez.match(/\/voistlused\/protocol\/(\d+)/)?.[1] ?? null,
        izid,
        kontumacija,
        odigrana: !!izid || kontumacija,
      })
    }
  }
  return out
}

/** Razpored v obliko uvoza razporeda. */
export function razcleniRazpored(_vrstice, html) {
  const krogi = new Map()
  for (const t of vrsticeRazporeda(html)) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: t.kontumacija,
      odigrana: t.odigrana,
      ...(t.kontumacija && t.izid ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------

/**
 * Pozicija iz postavitve: "Väravavaht" → GK, "…poolkaitsja" → MID,
 * "…kaitsja" → DEF, "…ründaja" → FWD. Vrstni red šteje: "Kaitsev
 * keskpoolkaitsja" je vezist, ne branilec.
 */
export function pozicija(opis) {
  const t = String(opis ?? '').toLowerCase()
  if (/väravavaht/.test(t)) return 'GK'
  if (/poolkaitsja/.test(t)) return 'MID'
  if (/kaitsja/.test(t)) return 'DEF'
  if (/ründaja/.test(t)) return 'FWD'
  return null
}

/** Igralci enega seznama (`ul.left` ali `ul.right`). */
function igralciSeznama(ul) {
  const out = []
  for (const li of String(ul ?? '').split('<li>').slice(1)) {
    const st = li.match(/<span class="count">\s*(\d+)\./)?.[1]
    const p = li.match(/\/voistlused\/player\/(\d+)\/team\/(\d+)">([^<]*)<\/a>/)
    if (!p) continue
    const polno = razpakiraj(p[3])
    out.push({
      st: st != null ? Number(st) : null,
      ime: vPriimekIme(polno),
      polnoIme: polno,
      regSt: Number(p[1]),
      klub: p[2],
      vratar: /\(VV\)/.test(li),
    })
  }
  return out
}

/** Seznam bloka z naslovom `glava` → [domači, gostje]. */
function blok(s, glava) {
  const i = s.indexOf(`<p>${glava}</p>`)
  if (i < 0) return [[], []]
  const konec = s.indexOf('<div class="block', i + 10)
  const del = s.slice(i, konec < 0 ? undefined : konec)
  const levo = del.match(/<ul class="left">(.*?)<\/ul>/)?.[1]
  const desno = del.match(/<ul class="right">(.*?)<\/ul>/)?.[1]
  return [igralciSeznama(levo), igralciSeznama(desno)]
}

/** Pozicije iz postavitve: [Map dres → pozicija (domači), … (gostje)]. */
function pozicije(s) {
  const i = s.indexOf('class="lineup-layout')
  if (i < 0) return [new Map(), new Map()]
  const del = s.slice(i, s.indexOf('<div class="block', i))
  return del.split('class="soccer-field"').slice(1, 3).map((polje) => {
    const m = new Map()
    for (const x of polje.matchAll(/<div class="player[^"]*">\s*(\d+)\s*<div class="tooltip"><p class="name">[^<]*<\/p><p class="position">([^<]*)<\/p>/g))
      m.set(Number(x[1]), pozicija(x[2]))
    return m
  })
}

/** Dogodki časovnice: [{ minuta, vrsta, igralci: [{ regSt, klub }], stanje }]. */
function casovnica(s) {
  const i = s.indexOf('<p>Mängu sündmused</p>')
  if (i < 0) return []
  const del = s.slice(i, s.indexOf('class="soccer-legend"', i))
  return del.split('<li>').slice(1).map((li) => {
    const status = li.match(/<div class="col status"><span class="([^"]*)"\s*>([^<]*)/)
    // Asistenca je v `goal-passer`: ni igralec dogodka.
    const brezPodaje = li.replace(/<small class="goal-passer">.*?<\/small>/g, '')
    const igralci = [...brezPodaje.matchAll(/\/voistlused\/player\/(\d+)\/team\/(\d+)"/g)].map((m) => ({ regSt: Number(m[1]), klub: m[2] }))
    const stanje = status?.[2].match(/(\d+)\s*-\s*(\d+)/)
    return {
      minuta: minuta(li.match(/<div class="order col">([^<]*)/)?.[1]),
      vrsta: status?.[1] ?? '',
      igralci,
      stanje: stanje ? [Number(stanje[1]), Number(stanje[2])] : null,
    }
  })
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida ali
 * kateri od ekip manjka postava (kontumacija, prazen zapisnik).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = cisto(html)
  const glava = s.match(/<div class="spacer multi">(.*?)<\/div>/)?.[1] ?? ''
  const koncni = glava.match(/(\d+)\s*-\s*(\d+)\s*<small>Lõppseis/)
  if (!koncni) return null
  const polcas = glava.match(/(\d+)\s*-\s*(\d+)\s*<small>Vaheajaseis/)
  const rezultat = { domaci: Number(koncni[1]), gostje: Number(koncni[2]) }
  const imena = [...s.matchAll(/<div class="team">(?:<div class="flag">.*?<\/div>)?<p><a href="[^"]*\/team\/\d+">([^<]*)<\/a>/g)].map((m) => razpakiraj(m[1]))
  const [zd, zg] = blok(s, 'Põhikoosseis')
  const [rd, rg] = blok(s, 'Vahetusmängijad')
  if (!zd.length || !zg.length) return null
  const poz = pozicije(s)
  const ekipe = [
    { ime: imena[0] ?? '', postava: zd, rezerve: rd },
    { ime: imena[1] ?? '', postava: zg, rezerve: rg },
  ]
  for (const [idx, e] of ekipe.entries()) {
    for (const i of e.postava) i.pozicija = i.vratar ? 'GK' : (poz[idx].get(i.st) ?? null)
    for (const i of e.rezerve) i.pozicija = i.vratar ? 'GK' : null
  }
  // Igralec dogodka po šifri osebe; ekipa je tista, v čigar seznamu je.
  const kje = new Map()
  for (const [idx, e] of ekipe.entries()) for (const i of [...e.postava, ...e.rezerve]) kje.set(i.regSt, { idx, i })
  const kdo = (x, m) => {
    const k = x && kje.get(x.regSt)
    return k ? { ekipaIdx: k.idx, st: k.i.st, ime: k.i.ime, regSt: k.i.regSt, minuta: m } : null
  }

  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  let stanje = [0, 0]
  for (const d of casovnica(s)) {
    const v = d.vrsta.split(/\s+/)
    const prvi = kdo(d.igralci[0], d.minuta)
    // `football var`: gol, ki ga je VAR razveljavil (brez stanja) — ne šteje.
    if (v.includes('var')) continue
    if (v.includes('football')) {
      // Kateri ekipi je gol štel, pove stanje po golu; strelec iz druge ekipe = avtogol.
      const za = d.stanje ? (d.stanje[0] > stanje[0] ? 0 : d.stanje[1] > stanje[1] ? 1 : null) : null
      if (d.stanje) stanje = d.stanje
      if (!prvi) { opozorila.push(`gol v ${d.minuta}. minuti: strelca ni v postavi`); continue }
      const avtogol = za != null ? za !== prvi.ekipaIdx : /own|oma/.test(d.vrsta)
      goli.push({ ...prvi, avtogol, enajstmetrovka: v.includes('penalty') && !avtogol })
    } else if (v.includes('switch')) {
      const noter = kdo(d.igralci[0], d.minuta)
      const ven = kdo(d.igralci[1], d.minuta)
      if (!noter && !ven) continue
      const ekipaIdx = (noter ?? ven).ekipaIdx
      const brez = { st: null, ime: null, regSt: null }
      menjave.push({
        ekipaIdx,
        minuta: d.minuta,
        noter: noter ? { st: noter.st, ime: noter.ime, regSt: noter.regSt } : brez,
        ven: ven ? { st: ven.st, ime: ven.ime, regSt: ven.regSt } : brez,
      })
    } else if (v.includes('card')) {
      // Karton trenerja: ni v postavi, ne šteje.
      if (!prvi) continue
      if (v.includes('red')) {
        if (!rdeci.some((r) => r.ekipaIdx === prvi.ekipaIdx && r.regSt === prvi.regSt)) rdeci.push(prvi)
      } else rumeni.push(prvi)
    } else if ((v.includes('penalty') && v.includes('red')) || v.includes('saved-penalty')) {
      if (prvi) zgresene.push(prvi)
    } else opozorila.push(`neznan dogodek "${d.vrsta}" v ${d.minuta}. minuti`)
  }

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  for (const e of ekipe) {
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    if (e.postava.filter((i) => i.vratar).length !== 1) opozorila.push(`${e.ime}: vratarjev (VV) v postavi je ${e.postava.filter((i) => i.vratar).length}`)
  }

  const info = s.match(/<div class="info"><ul>(.*?)<\/ul>/)?.[1] ?? ''
  const { datum } = datumUra(info.match(/calendar\?date=[^"]*">([^<]*)<\/a>\s*kell\s*([\d:]+)/)?.slice(1).join(' '))
  const vObliko = ({ polnoIme: _p, klub: _k, ...i }) => i
  return {
    zapisnikId: id,
    url,
    sezona: datum ? datum.slice(0, 4) : null,
    krog: Number(info.match(/(\d+)\.\s*voor/)?.[1]) || null,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: polcas ? { domaci: Number(polcas[1]), gostje: Number(polcas[2]) } : null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/**
 * Grba obeh klubov iz glave zapisnika (`div.flag`, domači levo, gostje desno):
 * { domaci: { src, ime }, gostje: { src, ime } }; klub brez slike je null.
 */
export function grbiZapisnika(html) {
  const s = cisto(html)
  const glava = s.match(/<div class="head"><div class="teams">(.*?)<div class="info">/)?.[1] ?? ''
  const [domaci = null, gostje = null] = glava.split(/<div class="team">/).slice(1).map((t) => {
    const img = t.match(/<div class="flag"><img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/)
    return img ? { src: img[1].replace(/^http:/, 'https:'), ime: razpakiraj(img[2]) } : null
  })
  return { domaci, gostje }
}

/** Nastopi po šifri osebe (kot oefb) in še zgrešene 11-metrovke. */
export const nastopi = (z) =>
  nastopiPoSifri(z).map((n) => ({
    ...n,
    zgreseneEnajstmetrovke: z.zgresene.filter((k) => k.ekipaIdx === n.ekipaIdx && k.regSt === n.regSt).length,
  }))

// --- klubi -------------------------------------------------------------------

// Ključ kluba: male črke z õ, ä, ö, ü, š, ž (slovenski `poenostavi` jih zavrže).
export const kljucKlubaEe = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('et')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Oblike društva in kluba, ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_EE = new Set(['fc', 'fci', 'jk', 'sk', 'fa', 'c.f.', 'cf', 'jalgpalliklubi', 'spordiklubi'])

/**
 * Kratko ime: brez oblike kluba, in brez kraja pred njo ("Tallinna FC Flora"
 * → "Flora", "Tartu JK Tammeka U21" → "Tammeka U21"); "Nõmme Kalju FC" →
 * "Nõmme Kalju", "Paide Linnameeskond" ostane. Največ tri besede.
 */
export function kratkoImeEe(polno) {
  const besede = razpakiraj(polno).split(/\s+/).filter(Boolean)
  const jeOblika = (b) => OBLIKE_EE.has(b.toLowerCase())
  const zKrajem = besede.length > 2 && !jeOblika(besede[0]) && jeOblika(besede[1])
  const ostale = (zKrajem ? besede.slice(1) : besede).filter((b) => !jeOblika(b))
  return ostale.length ? ostale.slice(0, 3).join(' ') : razpakiraj(polno)
}

// --- prenos ------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ustavi (namesto da bi izziv razčlenil kot prazno stran). */
async function beri(prenesi, url, ime, sveze) {
  const html = await prenesi(url, ime, sveze)
  if (jeIzziv(html)) throw new Error(`jalgpall: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

async function razpored(koda, prenesi) {
  const html = await beri(prenesi, naslovRazporeda(koda), imeRazporeda(koda), true)
  // Neznano leto stran tiho zamenja s tekočim — tega ne smemo uvoziti kot arhiv.
  const leto = sezonaStrani(html)
  if (leto !== razbijKodo(koda).leto)
    throw new Error(`jalgpall: ${naslovRazporeda(koda)} kaže sezono ${leto ?? '?'}, ne ${razbijKodo(koda).leto} — uvoz ustavljen`)
  return html
}

const vir = {
  ime: 'jalgpall',
  polnoIme: 'Eesti Jalgpalli Liit (jalgpall.ee)',
  drzava: 'EE',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  // robots.txt: Crawl-Delay 5 za vse robote.
  premorMs: 5000,
  imaRegistracije: false,

  naslovRazporeda,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(null, await razpored(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const { leto } = razbijKodo(koda)
    const out = []
    for (const t of vrsticeRazporeda(await razpored(koda, prenesi)).filter((x) => x.id && x.izid && !x.kontumacija)) {
      const url = naslovZapisnika(t.id)
      // Zapisnik zadnjega tedna se lahko še popravlja; starejšega ne beremo znova.
      const z = vZapisnik(await beri(prenesi, url, imeZapisnika(t.id), starostDni(t.datum) <= 7), { id: t.id, url })
      if (!z) continue
      // Ime kluba, krog in sezona iz razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = leto
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: t.id, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaEe,
  kratkoIme: kratkoImeEe,
  poenostavi: kljucKlubaEe,
}

export default vir
