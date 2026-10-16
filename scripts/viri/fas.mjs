// Vir: FutbolAsturiano.es — futbolasturiano.es (Asturija, Španija).
//
// Neodvisen digitalni dnevnik asturijskega nogometa (WordPress + SportsPress).
// Ni zveza: tekme vpisuje uredništvo. Postave (začetniki, klop s številkami in
// pozicijami), menjave z minuto, goli in kartoni z minuto so objavljeni za
// Tercera Federación, skupina 2 (Asturija) in Primera AsturFútbol; nižje
// asturijske lige imajo le izide — teh ne beremo. Glej docs/viri/spanija.md
// (vir fas).
//
// ŠIFRA LIGE je `<liga>:<od>-<do>`:
// - `<liga>` je izraz SportsPress `sp_league` (stran `/competicion/<liga>/`,
//   npr. `3-rfef`, `1-asturfutbol`), ki našteje objavljene tekme lige vseh
//   sezon (`<article id="post-<id>" class="… sp_league-<liga> sp_season-2026-2027">`
//   z datumom in uro),
// - `<od>-<do>` je blok šifer objav (post id) tekem ENE sezone. Razpored
//   sezone je SportsPress ustvaril naenkrat: 306 zaporednih šifer pri 18
//   klubih (Tercera G2 2026/27: 14499-14804), 380 pri 20 (Primera AF:
//   15137-15516), po dve in dve (krog n in n+17/n+19).
// Tekme s stanjem "future" (uredništvo je popravilo uro bližnje tekme) stran
// lige in zemljevid strani izpustita; v bloku jih beremo s `/?p=<id>`, ki
// preusmeri na stran tekme. Zato blok, ne seznam.
//
// STRAN TEKME `/evento/<domači>-<gostje>/`:
// - glava: imeni (`sp-team-name`), izid (`sp-team-result`; neodigrana nima
//   števk), "Detalles": Fecha (dd/mm/llll), Hora, Liga ("3ª RFEF"), Temporada
//   ("2026/2027"), Jornada (krog). Madridski čas = ljubljanski, brez pretvorbe.
// - postavi (`fa-conv__team`): vrstica `fa-conv__row` = začetnik,
//   `--entra` = vstopil s klopi, `--convocado` = neuporabljena rezerva.
//   Dres, ime s povezavo `/jugador/<slug>/` (stalna identiteta → `regSt`),
//   pozicija ("Portero" → GK, branilci DEF, vezisti in krila MID, "Delantero"
//   FWD) in ocena (ne beremo).
// - dogodki (`sp-res__section`): GOLES, TARJETAS (rumeni, rdeči) in
//   SUSTITUCIONES (vstop, izstop, minuta), stolpec domačih in gostov, po
//   prikaznem imenu igralca. "Cronología" da stanje po vsakem golu — iz njega
//   avtogol (gol, ki ga stanje pripiše nasprotniku).
// - sodnikov, ocen, igrišča, poročila in fotografij ne beremo.
//
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki), strani v predpomnilniku
// `scripts/.predpomnilnik/fas`; zaprte odigrane tekme ne beremo znova. **Ob
// izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj.**
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'
import { sifra } from './zapisniki.mjs'

export { nastopi, NEPOPOLN }

const OSNOVNI = 'https://www.futbolasturiano.es'
const MAPA = 'scripts/.predpomnilnik/fas'
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
const URA = 3600000
const DAN = 24 * URA
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (slff.eu; splih.94@gmail.com)'

// --- šifre in naslovi ---------------------------------------------------------------

/** "3-rfef:14499-14804" → { liga, od, do }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+):(\d+)-(\d+)$/)
  if (!m || Number(m[3]) < Number(m[2]) || Number(m[3]) - Number(m[2]) > 1000)
    throw new Error(`fas: šifra lige je "<liga>:<od>-<do>" (npr. 3-rfef:14499-14804), ne "${koda}"`)
  return { liga: m[1], od: Number(m[2]), do: Number(m[3]) }
}

export const naslovLige = (koda) => `${OSNOVNI}/competicion/${razberiKodo(koda).liga}/`
export const naslovTekme = (id) => `${OSNOVNI}/?p=${String(id).replace(/^fas/, '')}`
// Šifra zapisnika v bazi je `fas<id>`: id objave WordPress je majhno število,
// ki se prekriva s šiframi drugih virov, `matches.zapisnik_id` pa je enoličen.
export const sifraZapisnika = (id) => `fas${String(id).replace(/^fas/, '')}`
const imeTekme = (id) => `evento-${id}.html`
export const imeSeznama = (koda) => `razpored-${sifra(koda)}.html`

// --- pomožno ---------------------------------------------------------------------------

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8211;/g, '–'))
    .replace(/\s+/g, ' ')
    .trim()

/** "94'" → 90, "45+2'" → 45, "57'" → 57. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "11/10/2026" → "2026-10-11". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}
/** "12:00" → "12:00"; "00:00" (ura ni znana) → null. */
export function uraIz(s) {
  const m = String(s ?? '').match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  const u = `${m[1].padStart(2, '0')}:${m[2]}`
  return u === '00:00' ? null : u
}
/** "2026/2027" → "2026/27". */
export const sezonaIz = (s) => {
  const m = String(s ?? '').match(/(\d{4})\s*\/\s*(?:\d{2})?(\d{2})/)
  return m ? `${m[1]}/${m[2]}` : null
}

/**
 * Stalna šifra igralca iz poti profila `/jugador/<slug>/` (FNV-1a, 50 bitov,
 * zamaknjena nad 2^52). Vir številske šifre ne objavi; zamik loči te šifre od
 * šifer oseb FCF (fcf.cat, do ~10^8), saj sta oba vira v isti državi (ES).
 */
export function sifraIgralca(slug) {
  const s = String(slug ?? '').trim().toLowerCase()
  if (!s) return null
  let h = 0xcbf29ce484222325n
  for (const b of Buffer.from(s, 'utf8')) {
    h ^= BigInt(b)
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return 2 ** 52 + Number(h % 2n ** 50n)
}

/** Pozicija iz opisa: "Portero" → GK, branilci DEF, vezisti in krila MID, "Delantero" FWD. */
export function pozicijaIz(opis) {
  const t = String(opis ?? '').toLowerCase()
  if (/portero/.test(t)) return 'GK'
  if (/defensa|lateral|carrilero|central|líbero|libero/.test(t)) return 'DEF'
  if (/medio|mediapunta|pivote|interior|extremo|volante/.test(t)) return 'MID'
  if (/delantero|punta|ariete/.test(t)) return 'FWD'
  return null
}

/** Izziv (Cloudflare, CAPTCHA). */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? ''))

/** 'tekma' (stran sp_event), 'drugo' (404, druga objava) ali 'neznano' (izziv, prazno). */
export function vrstaStrani(html) {
  const s = String(html ?? '')
  if (/<body[^>]*class="[^"]*single-sp_event/.test(s)) return 'tekma'
  if (/<body[^>]*class="[^"]*(error404|single|archive|home)/.test(s)) return 'drugo'
  return 'neznano'
}

// --- stran lige (seznam) ------------------------------------------------------------------

/**
 * Objavljene tekme na strani lige: [{ id, datum, ura, sezona, liga, naslov }].
 * Datum in ura sta iz `<time datetime>` (madridski čas).
 */
export function tekmeSeznama(html) {
  const out = []
  for (const m of String(html ?? '').matchAll(/<article id="post-(\d+)" class="([^"]*)"([\s\S]*?)<\/article>/g)) {
    const [, id, razredi, telo] = m
    if (!/\btype-sp_event\b/.test(razredi)) continue
    const cas = telo.match(/<time datetime="(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    out.push({
      id: Number(id),
      datum: cas?.[1] ?? null,
      ura: cas && cas[2] !== '00:00' ? cas[2] : null,
      liga: razredi.match(/\bsp_league-(\S+)/)?.[1] ?? null,
      sezona: sezonaIz(razredi.match(/\bsp_season-(\d{4}-\d{4})/)?.[1]?.replace('-', '/')),
      naslov: besedilo(telo.match(/<a class="uk-link-reset" href="[^"]*">([\s\S]*?)<\/a>/)?.[1]),
    })
  }
  return out
}

// --- stran tekme ---------------------------------------------------------------------------

// Tipkarske napake v imenu ekipe (ime objave ekipe SportsPress, enako na vseh
// tekmah ekipe). Ključ je ime s strani, vrednost pravilno ime kluba.
const IME_EKIPE = new Map([['EI San Martín', 'El San Martín']])
const popraviIme = (ime) => (ime ? IME_EKIPE.get(ime) ?? ime : ime)

/** Glava strani tekme: { id, domaci, gostje, izid, datum, ura, liga, sezona, krog }. Null, če ni tekma. */
export function glavaStrani(html) {
  const s = cisto(html)
  if (vrstaStrani(s) !== 'tekma') return null
  const id = Number(s.match(/<body[^>]*\bpostid-(\d+)/)?.[1]) || null
  const logo = s.slice(s.indexOf('sp-event-logos'), s.indexOf('sp-template-event-details') > 0 ? s.indexOf('sp-template-event-details') : undefined)
  const imeni = [...logo.matchAll(/<strong class="sp-team-name">([\s\S]*?)<\/strong>/g)].map((x) => besedilo(x[1]))
  const izidi = [...logo.matchAll(/<strong class="sp-team-result">([\s\S]*?)<\/strong>/g)].map((x) => besedilo(x[1]))
  // "Detalles": stolpci po glavi tabele.
  const det = s.match(/<table class="sp-event-details[\s\S]*?<\/table>/)?.[0] ?? ''
  const glave = [...det.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((x) => besedilo(x[1]))
  const celice = [...det.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => besedilo(x[1]))
  const polje = (ime) => {
    const i = glave.findIndex((g) => g.toLowerCase() === ime.toLowerCase())
    return i >= 0 ? celice[i] ?? null : null
  }
  const izid = izidi.length === 2 && izidi.every((x) => /^\d+$/.test(x)) ? { domaci: Number(izidi[0]), gostje: Number(izidi[1]) } : null
  return {
    id,
    domaci: popraviIme(imeni[0] ?? null),
    gostje: popraviIme(imeni[1] ?? null),
    izid,
    datum: datumIz(polje('Fecha')),
    ura: uraIz(polje('Hora')),
    liga: polje('Liga'),
    sezona: sezonaIz(polje('Temporada')),
    krog: Number(polje('Jornada')) || null,
  }
}

/** Ekipi iz "convocatoria": [[igralci domačih], [igralci gostov]]. */
export function postaviStrani(html) {
  const s = cisto(html)
  const out = []
  for (const del of s.split('<div class="fa-conv__team">').slice(1)) {
    const tabela = del.slice(0, del.indexOf('</table>') + 8)
    const igralci = []
    for (const [, razred, vrstica] of tabela.matchAll(/<tr class="(fa-conv__row[^"]*)">([\s\S]*?)<\/tr>/g)) {
      const celica = (ime) => vrstica.match(new RegExp(`<td class="fa-conv__${ime}">([\\s\\S]*?)</td>`))?.[1] ?? ''
      const st = besedilo(celica('dorsal'))
      const nombre = celica('nombre')
      const ime = besedilo(nombre.replace(/<span class="fa-conv-sub[\s\S]*?<\/span>/g, ''))
      if (!ime) continue
      const slug = nombre.match(/\/jugador\/([^/"]+)\/?"/)?.[1] ?? null
      const pozOpis = besedilo(celica('pos'))
      const poz = pozicijaIz(pozOpis)
      igralci.push({
        st: /^\d+$/.test(st) ? Number(st) : null,
        ime,
        slug,
        regSt: sifraIgralca(slug),
        zacetnik: !/--(entra|convocado)\b/.test(razred),
        vstopil: /--entra\b/.test(razred),
        // Dres partnerja menjave ("▼ 22" pri izstopu, "▲ 18" pri vstopu).
        partner: Number(nombre.match(/fa-conv-sub--(?:in|out)"[^>]*>[^<\d]*(\d+)/)?.[1]) || null,
        pozicijaOpis: pozOpis,
        vratar: poz === 'GK',
        pozicija: poz,
      })
    }
    out.push(igralci)
  }
  return out
}

/**
 * Dogodki iz razdelkov GOLES, TARJETAS, SUSTITUCIONES:
 * { goli: [{ ekipaIdx, ime, minuta, vrsta }], kartoni: [{ ekipaIdx, ime, minuta, vrsta }],
 *   menjave: [{ ekipaIdx, noter, ven, minuta }], stanja: [{ ekipaIdx, ime, minuta, stanje }] }.
 */
export function dogodkiStrani(html) {
  const s = cisto(html)
  const goli = []
  const kartoni = []
  const menjave = []
  const neznani = []
  for (const del of s.split('<div class="sp-res__section">').slice(1)) {
    const naslov = besedilo(del.match(/<div class="sp-res__section-title">([\s\S]*?)<\/div>/)?.[1]).toUpperCase()
    if (!['GOLES', 'TARJETAS', 'SUSTITUCIONES'].includes(naslov)) continue
    for (const [, stran, ul] of del.matchAll(/<ul class="sp-res__col sp-res__col--(home|away)">([\s\S]*?)<\/ul>/g)) {
      const ekipaIdx = stran === 'home' ? 0 : 1
      for (const [, celLi] of ul.matchAll(/<li class="sp-res__item[^"]*">([\s\S]*?)<\/li>/g)) {
        // Oznaka gola ("Penalti", "En propia") je svoj element; ime je brez nje.
        const znacka = celLi.match(/sp-res__gol-badge--([a-z-]+)/)?.[1] ?? null
        const li = celLi.replace(/<span class="sp-res__gol-badge[^"]*">[\s\S]*?<\/span>/g, '')
        const m = minuta(besedilo(li.match(/<span class="sp-res__min">([\s\S]*?)<\/span>/)?.[1]))
        const ikona = li.match(/sp-res__icon--([a-z-]+)/)?.[1] ?? null
        if (naslov === 'SUSTITUCIONES') {
          const noter = besedilo(li.match(/sp-res__name--in">([\s\S]*?)<\/span>/)?.[1]).replace(/^[↑\s]+/, '')
          const ven = besedilo(li.match(/sp-res__name--out">([\s\S]*?)<\/span>/)?.[1]).replace(/^[↓\s]+/, '')
          menjave.push({ ekipaIdx, noter: noter || null, ven: ven || null, minuta: m })
          continue
        }
        const ime = besedilo(li.match(/<span class="sp-res__name">([\s\S]*?)<\/span>/)?.[1])
        if (naslov === 'GOLES') {
          const vrsta = znacka === 'propia' ? 'avtogol' : znacka === 'penalti' ? 'enajstmetrovka' : ikona === 'goal' && !znacka ? 'gol' : null
          if (!vrsta) neznani.push(`gol z ikono "${ikona}"${znacka ? ` in oznako "${znacka}"` : ''} (${ime})`)
          goli.push({ ekipaIdx, ime, minuta: m, vrsta: vrsta ?? 'gol', besedilo: besedilo(li) })
        } else {
          const vrsta = ikona === 'yellow' ? 'rumeni' : ikona === 'red' ? 'rdeci' : /yellow-?red|second|doble/.test(ikona ?? '') ? 'drugiRumeni' : null
          if (!vrsta) neznani.push(`karton z ikono "${ikona}" (${ime})`)
          else kartoni.push({ ekipaIdx, ime, minuta: m, vrsta })
        }
      }
    }
  }
  // Cronología: stanje po golu (avtogol pripiše nasprotniku).
  const stanja = []
  const tl = s.slice(s.indexOf('<div class="sp-tl">'))
  if (s.includes('<div class="sp-tl">')) {
    for (const [, stran, telo] of tl.matchAll(/<div class="sp-tl__event sp-tl__event--(home|away)">([\s\S]*?)<div class="sp-tl__node sp-tl__node--([a-z-]+)">/g)) {
      const st = telo.match(/<span class="sp-tl__marcador">\s*(\d+)\s*-\s*(\d+)\s*<\/span>/)
      if (!st) continue
      stanja.push({
        ekipaIdx: stran === 'home' ? 0 : 1,
        ime: besedilo(telo.match(/<span class="sp-tl__accion">([\s\S]*?)<\/span>/)?.[1]),
        minuta: minuta(besedilo(telo.match(/<span class="sp-tl__min">([\s\S]*?)<\/span>/)?.[1])),
        stanje: [Number(st[1]), Number(st[2])],
      })
    }
  }
  return { goli, kartoni, menjave, stanja, neznani }
}

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma ali tekma nima izida.
 * Ekipa z manj kot 7 začetniki je "nepopolna" (kot frf, fcf): izid se zapiše,
 * tekma se bere znova.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const g = glavaStrani(html)
  if (!g?.izid) return null
  const ekipeIgr = postaviStrani(html)
  while (ekipeIgr.length < 2) ekipeIgr.push([])
  const d = dogodkiStrani(html)
  const imeni = [g.domaci, g.gostje]
  const opozorila = [...d.neznani.map((x) => `neznan dogodek: ${x}`)]
  const ekipe = ekipeIgr.map((xs) => ({ postava: xs.filter((i) => i.zacetnik), rezerve: xs.filter((i) => !i.zacetnik) }))
  const znana = ekipe.map((x) => x.postava.length >= NAJMANJ_ZACETNIKOV)
  ekipe.forEach((x, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${x.postava.length ? `le ${x.postava.length} začetnikov` : 'brez postave'}`)
  })

  // Igralec po prikaznem imenu v ekipi (dogodki nimajo povezave).
  const poImenu = (idx, ime) => {
    const k = String(ime ?? '').toLowerCase()
    const xs = ekipeIgr[idx].filter((i) => i.ime.toLowerCase() === k)
    if (xs.length > 1) opozorila.push(`${imeni[idx]}: ime "${ime}" ima ${xs.length} igralcev — dogodek prvemu`)
    return xs[0] ?? null
  }
  const kdo = (idx, i, m) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt, minuta: m })

  // Menjave → preklopi (minute vstopa in izstopa) pri igralcu.
  const preklopi = new Map()
  const dodaj = (i, m) => {
    if (!preklopi.has(i)) preklopi.set(i, [])
    preklopi.get(i).push(m)
  }
  const menjave = []
  for (const x of d.menjave) {
    const noter = x.noter ? poImenu(x.ekipaIdx, x.noter) : null
    const ven = x.ven ? poImenu(x.ekipaIdx, x.ven) : null
    if (x.noter && !noter) opozorila.push(`${imeni[x.ekipaIdx]}: vstop "${x.noter}" (${x.minuta}.) — igralca ni v postavi`)
    if (x.ven && !ven) opozorila.push(`${imeni[x.ekipaIdx]}: izstop "${x.ven}" (${x.minuta}.) — igralca ni v postavi`)
    if (x.minuta == null) {
      opozorila.push(`${imeni[x.ekipaIdx]}: menjava ${x.noter ?? '?'} za ${x.ven ?? '?'} brez minute`)
      continue
    }
    if (noter) dodaj(noter, x.minuta)
    if (ven) dodaj(ven, x.minuta)
    menjave.push({ ekipaIdx: x.ekipaIdx, minuta: x.minuta, noter: noter ? { st: noter.st, ime: noter.ime } : { st: null, ime: null }, ven: ven ? { st: ven.st, ime: ven.ime } : { st: null, ime: null } })
  }
  // Vstopil (▲) brez vpisane menjave: postava ve za vstop, minute ne.
  ekipeIgr.forEach((xs, idx) => {
    for (const i of xs) if (i.vstopil && !preklopi.has(i)) opozorila.push(`${imeni[idx]}: ${i.ime} je vstopil, menjava brez minute — nastopa ne štejemo`)
  })

  // Goli: stran in stanje po golu.
  const goli = []
  for (const x of d.goli) {
    let idx = x.ekipaIdx
    let i = poImenu(idx, x.ime)
    let avtogol = x.vrsta === 'avtogol'
    // Avtogol brez oznake v stolpcu ekipe, ki ji je štel: strelec je pri
    // nasprotniku. Le ko je postava stolpca znana — pri nepopolni strani
    // (J1: le nekaj imen) bi sicer gol tujega strelca postal avtogol.
    if (!i && znana[idx]) {
      const nasprotnik = poImenu(1 - idx, x.ime)
      if (nasprotnik) {
        i = nasprotnik
        idx = 1 - idx
        avtogol = true
      }
    }
    if (!i) {
      opozorila.push(`gol v ${x.minuta}. minuti (${x.ime}): strelca ni v postavi`)
      continue
    }
    goli.push({ ...kdo(idx, i, x.minuta), avtogol, enajstmetrovka: !avtogol && x.vrsta === 'enajstmetrovka' })
  }

  const rumeni = []
  const rdeci = []
  for (const x of d.kartoni) {
    const i = poImenu(x.ekipaIdx, x.ime)
    if (!i) {
      opozorila.push(`karton v ${x.minuta}. minuti (${x.ime}): igralca ni v postavi`)
      continue
    }
    if (x.vrsta === 'rumeni') rumeni.push(kdo(x.ekipaIdx, i, x.minuta))
    else if (!rdeci.some((r) => r.ekipaIdx === x.ekipaIdx && r.regSt === i.regSt && r.ime === i.ime)) rdeci.push(kdo(x.ekipaIdx, i, x.minuta))
  }
  // Drugi rumeni: stran vpiše oba rumena in rdečega; kot pri drugih virih
  // ostane 1 rumeni + 1 rdeči.
  for (const r of rdeci) {
    const njegovi = rumeni.filter((y) => y.ekipaIdx === r.ekipaIdx && y.regSt === r.regSt && y.ime === r.ime)
    for (const y of njegovi.slice(1)) rumeni.splice(rumeni.indexOf(y), 1)
  }

  const sestava = ekipe.map((x, idx) => {
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (x.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${x.postava.length} igralcev namesto 11`)
    const vratarjev = x.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${imeni[idx]}: vratarjev (Portero) v postavi je ${vratarjev}`)
    const vObliko = (i) => {
      const { slug: _s, vstopil: _v, partner: _p, pozicijaOpis: _o, ...ostalo } = i
      return { ...ostalo, preklopi: [...(preklopi.get(i) ?? [])].sort((a, b) => a - b) }
    }
    return { ime: imeni[idx], postava: x.postava.map(vObliko), rezerve: x.rezerve.map(vObliko) }
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (znana[0] && znana[1] && (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje))
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  return {
    zapisnikId: id,
    url,
    sezona: g.sezona,
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    liga: g.liga,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: g.izid,
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    nepopoln: !znana[0] || !znana[1],
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    // Kontumacija: izid 3:0 ali 0:3 brez obeh postav in brez golov. Prazna
    // stran z drugim izidom ali z goli je tekma, ki ji uredništvo postave ni
    // vpisalo (Primera AF pogosto) — ta je nepopolna, ne kontumacija.
    kontumacija: !ekipe[0].postava.length && !ekipe[1].postava.length && !d.goli.length &&
      ((g.izid.domaci === 3 && g.izid.gostje === 0) || (g.izid.domaci === 0 && g.izid.gostje === 3)),
    opozorila,
  }
}

// --- klubi ---------------------------------------------------------------------------------

/**
 * Ključ kluba: brez diakritike in ločil, z obliko in oznako ekipe vred —
 * "Real Sporting ‘C’", "Sporting Atlético" in "UD Llanera B" so svoji klubi
 * (rezervne ekipe klubov Tercere igrajo v Primeri AF).
 */
export const kljucKlubaFas = (ime) =>
  razpakiraj(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const OBLIKE = new Set(['cd', 'cf', 'ud', 'sd', 'uc', 'ad', 'up', 'cdb', 'scdr', 'scd', 'cn', 'ac', 'rc', 'sc', 'fc', 'ed', 'club', 'c f', 'u c'])
/**
 * Kratko ime: brez oblike društva na začetku ali koncu, oznaka ekipe ostane.
 * "CD Lealtad de Villaviciosa" → "Lealtad de Villaviciosa", "U.C. Ceares" →
 * "Ceares", "L’Entregu C.F." → "L’Entregu", "Real Sporting ‘C’" → "Real Sporting C".
 */
export function kratkoImeFas(polno) {
  const besede = razpakiraj(polno).replace(/[‘’'](\w)[‘’']/g, '$1').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const oblika = (b) => OBLIKE.has(b.toLowerCase().replace(/\./g, ' ').trim()) || OBLIKE.has(b.toLowerCase().replace(/\./g, ''))
  let brez = besede
  while (brez.length > 1 && oblika(brez[0])) brez = brez.slice(1)
  while (brez.length > 1 && oblika(brez.at(-1))) brez = brez.slice(0, -1)
  return brez.slice(0, 5).join(' ')
}

// --- branje ------------------------------------------------------------------------------

const pot = (ime) => `${MAPA}/${ime}`
function izPredpomnilnika(ime) {
  const p = pot(ime)
  if (!existsSync(p)) return null
  return { html: readFileSync(p, 'utf8'), starost: Date.now() - statSync(p).mtimeMs }
}

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class FasZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FasZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

async function prenesiStran(prenesi, url, ime, preveri) {
  let html
  try {
    html = await prenesi(url, ime, true)
  } catch (e) {
    if (e.zavrnitev || e.status === 403 || e.status === 429) throw new FasZavrnitev(`fas: ${url} → ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new FasZavrnitev(`fas: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  preveri?.(html)
  mkdirSync(MAPA, { recursive: true })
  writeFileSync(pot(ime), html)
  return html
}

/** Stran lige; sveža iz zadnjih 15 minut (uvoz razporeda jo prenese tik pred tem). */
async function beriSeznam(koda, prenesi) {
  const c = izPredpomnilnika(imeSeznama(koda))
  if (c && c.starost <= 15 * 60000 && tekmeSeznama(c.html).length) return c.html
  return prenesiStran(prenesi, naslovLige(koda), imeSeznama(koda), (html) => {
    if (!/sp_league-/.test(html)) throw new Error(`fas: ${naslovLige(koda)} ni stran lige (${html.length} B) — uvoz ustavljen`)
  })
}

async function beriTekmo(prenesi, id) {
  return prenesiStran(prenesi, naslovTekme(id), imeTekme(id), (html) => {
    if (vrstaStrani(html) === 'neznano') throw new Error(`fas: ${naslovTekme(id)} ni stran tekme (${html.length} B) — uvoz ustavljen`)
  })
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/** Kako stara sme biti predpomnjena stran tekme (ms) glede na stanje in datum. */
export function najvecStarost(g, html, danes = Date.now(), svezi = false) {
  if (!g) return 7 * DAN // druga objava v bloku
  const star = starostDni(g.datum, danes)
  if (g.izid) {
    if (svezi && star <= 3) return -1 // popravki prvih dni
    const z = vZapisnik(html)
    if (z?.nepopoln && star <= 45) return URA // postave še ni
    return Infinity
  }
  if (!g.datum) return 7 * DAN
  if (star < -1) return 14 * DAN // krog in klubi se ne menjajo; datum da seznam
  if (star <= 14) return URA // na vrsti ali pred kratkim
  return DAN // prestavljena tekma brez novega datuma
}

/**
 * Prebere blok: { tekme: [{ id, html, g }], tujih, ni }. Datum in uro
 * objavljene tekme da sveža stran lige; stran tekme da krog, klube in izid.
 */
export async function preberiBlok(koda, prenesi, { danes = Date.now(), svezi = false } = {}) {
  const { liga, od, do: do_ } = razberiKodo(koda)
  const seznam = new Map(tekmeSeznama(await beriSeznam(koda, prenesi)).map((t) => [t.id, t]))
  const tekme = []
  const ni = []
  const tuje = []
  for (let id = od; id <= do_; id++) {
    const c = izPredpomnilnika(imeTekme(id))
    let g = c ? glavaStrani(c.html) : null
    const s = seznam.get(id)
    // Prestavljena objavljena tekma: nov datum na seznamu → strani ni treba brati.
    const gD = g && s?.datum && !g.izid ? { ...g, datum: s.datum } : g
    let html = c && c.starost <= najvecStarost(gD, c.html, danes, svezi) ? c.html : null
    // Objavljena tekma, ki je po seznamu že bila (izid še ne v predpomnilniku).
    if (html && g && !g.izid && s?.datum && starostDni(s.datum, danes) >= 0 && c.starost > URA) html = null
    html ??= await beriTekmo(prenesi, id)
    g = glavaStrani(html)
    if (!g) { ni.push(id); continue }
    if (s?.datum) { g.datum = s.datum; g.ura = s.ura ?? g.ura }
    if (s && s.liga !== liga) { tuje.push({ id, kaj: `liga ${s.liga}` }); continue }
    tekme.push({ id, html, g })
  }
  // Sezona bloka: najpogostejša (liga, sezona) med stranmi.
  const kljuc = (g) => `${g.liga}|${g.sezona}`
  const stevec = new Map()
  for (const t of tekme) stevec.set(kljuc(t.g), (stevec.get(kljuc(t.g)) ?? 0) + 1)
  const glavna = [...stevec.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  for (const t of tekme.filter((x) => kljuc(x.g) !== glavna)) tuje.push({ id: t.id, kaj: kljuc(t.g) })
  if (tuje.length) console.warn(`fas: v bloku ${koda} so objave drugih lig ali sezon (izpuščene): ${tuje.map((t) => `${t.id} (${t.kaj})`).join(', ')}`)
  const prave = tekme.filter((t) => kljuc(t.g) === glavna && t.g.domaci && t.g.gostje && t.g.krog)
  return { tekme: prave, skupina: glavna, tujih: tuje.length, ni }
}

/** Razpored iz prebranega bloka. */
export function razporedBloka(b, { danes = Date.now() } = {}) {
  const krogi = new Map()
  for (const t of b.tekme) {
    const { g } = t
    if (!krogi.has(g.krog)) krogi.set(g.krog, { stevilka: g.krog, tekme: [] })
    // Kontumacija (3:0 brez postav in golov), starejša od tedna.
    let kontumacija = false
    if (g.izid && starostDni(g.datum, danes) > 7) kontumacija = !!vZapisnik(t.html)?.kontumacija
    krogi.get(g.krog).tekme.push({
      domaci: g.domaci,
      gostje: g.gostje,
      datum: g.datum,
      ura: g.ura,
      odigrana: !!g.izid,
      kontumacija,
      ...(kontumacija ? { izid: g.izid } : {}),
    })
  }
  return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
}

/** Prenos z daljšim rokom (strežnik je občasno počasen): telo v isti omejitvi kot glava. */
export async function fasFetch(url, moznosti = {}) {
  const { signal: _s, ...ostalo } = moznosti
  const signal = AbortSignal.timeout(90000)
  const o = await fetch(url, { ...ostalo, signal })
  const telo = await o.text()
  return new Response(telo, { status: o.status, statusText: o.statusText, headers: o.headers })
}

const vir = {
  ime: 'fas',
  fetch: fasFetch,
  polnoIme: 'FutbolAsturiano.es (futbolasturiano.es)',
  drzava: 'ES',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  // Uvoz razporeda to stran prenese pred `razporedVseStrani` in jo shrani pod
  // `razpored-<šifra>.html` v isto mapo — `beriSeznam` jo vzame od tam.
  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new FasZavrnitev(`fas: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedBloka(await preberiBlok(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const b = await preberiBlok(koda, prenesi, { svezi: true })
    const out = []
    for (const t of b.tekme) {
      if (!t.g.izid) continue
      const url = naslovTekme(t.id)
      const z = vZapisnik(t.html, { id: sifraZapisnika(t.id), url })
      // Kontumacija (3:0 brez postav in golov) nima zapisnika; nepopoln gre skozi.
      if (!z || (z.kontumacija && starostDni(z.datum) > 7)) continue
      z.datum = t.g.datum ?? z.datum
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaFas,
  kratkoIme: kratkoImeFas,
  poenostavi: kljucKlubaFas,
}

export default vir
