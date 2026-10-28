import {isFcfG1SupplementUnknownResultMarker,isFcfG1SupplementCalendarIdentity} from '../lib/fcf-g1-supplement-installed.mjs'
import {isFcfSixUnknownResultMarker} from '../fcf-six-historical-policy.mjs'
// Vir: Federació Catalana de Futbol — fcf.cat (Katalonija, Španija).
//
// fcf.cat je aplikacija Next.js. Strani tekmovanj (`/ca/competicio?…`),
// klubov in ekip se izrišejo v brskalniku iz `/api/`, ki ga robots.txt
// prepoveduje — **`/api/` ne kličemo nikoli** (tudi `/_next/` ne). Strežnik pa
// izriše ZAPISNIK (`/ca/competicio/acta/<id>`): v strani je drevo React Server
// Components (`self.__next_f.push`), iz katerega beremo glavo, postavi, klop,
// dogodke in gole.
//
// BLOK ŠIFER (kot fssid): skupina ene sezone je strnjen blok šifer zapisnikov,
// urejen po krogih (8 na krog pri 16 klubih). Zapisnik obstaja tudi za
// neodigrano tekmo ("Pendent") — z datumom, uro in krogom, zato je razpored
// kar blok zapisnikov. Med bloki je "Acta no trobada". ŠIFRA LIGE je
// `<od>-<do>` (`4139542-4139779` = Quarta Catalana, grup 1, 2026/27); vsaka
// stran nosi tekmovanje, skupino, krog in sezono — stran druge skupine v
// bloku vir preskoči z opozorilom.
//
// ZAPISNIK
// - Glava: domači, stanje ("Acta Tancada" = zaprt, "Pendent" = neodigrana),
//   izid, "QUARTA CATALANA / GRUP 1 / Jornada 1", "Temporada : 2026 / 27",
//   "Data: 19.09.2026", "Hora: 17.00 H" (madridski = ljubljanski čas).
// - Ekipa (`localNode`, `visitorNode`): "Alineacions" (začetniki) in
//   "Suplents" (klop); igralec je predmet `{ id, nombre, dorsal, titular,
//   capitan, portero }` — `id` je stalna šifra osebe FCF (→ `reg_st`),
//   `nombre` "PRIIMKA, IME" (ali le vzdevek: "AITOR"), `portero` = vratar.
//   Ob igralcu so dogodki z minuto ("35’"): gol (žoga), rumeni karton, rdeči
//   karton, drugi rumeni, vstop (modra puščica) in izstop (rdeča puščica).
// - "Gols": seznam golov z vrsto ("GOL", "GOL PENAL", "GOL EN PRÒPIA") in
//   minuto — iz njega vrsta gola; strelec je po šifri osebe.
// - Sodnikov, osebja ("Equip Tècnic") in igrišča ne beremo.
//
// MENJAVE: v nižjih ligah (Quarta, Tercera) jih klubi pogosto ne vpišejo.
// Takrat ima začetnik 90 minut, rezerva brez vpisanega vstopa pa nastopa
// nima (kot fsb v Srbiji) — strelec s klopi dobi vstop ob golu (opozorilo).
//
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki). Odigranih zapisnikov ne
// beremo znova (razen prve 3 dni in nepopolnih do 45 dni), neodigrane, ko so
// na vrsti, sicer enkrat na teden. **Ob izzivu, CAPTCHI, 403 ali 429 se uvoz
// ustavi — ne obhajaj.**
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { razpakiraj } from '../klubi.mjs'
import { nastopi } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'
import { doplniCalongeMenjavo } from './fcf-calonge-pair.mjs'

export { nastopi, NEPOPOLN }

const OSNOVNI = 'https://www.fcf.cat'
const MAPA = 'scripts/.predpomnilnik/fcf'
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
const URA = 3600000
const DAN = 24 * URA
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (slff.eu; splih.94@gmail.com)'

// --- šifre in naslovi --------------------------------------------------------------

/** "4139542-4139779" → { od, do }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)-(\d+)$/)
  if (!m || Number(m[2]) < Number(m[1]) || Number(m[2]) - Number(m[1]) > 1000)
    throw new Error(`fcf: šifra lige je blok zapisnikov "<od>-<do>" (npr. 4139542-4139779), ne "${koda}"`)
  return { od: Number(m[1]), do: Number(m[2]) }
}

export const naslovZapisnika = (id) => `${OSNOVNI}/ca/competicio/acta/${String(id).replace(/^es/, '')}`
// Šifra zapisnika v bazi je `es<id>`: številke fcf.cat (3,7–4,2 milijona) se
// prekrivajo s šiframi oefb (3,8–4,1 milijona), `matches.zapisnik_id` pa je
// enoličen čez vse vire.
export const sifraZapisnika = (id) => `es${String(id).replace(/^es/, '')}`
const imeStrani = (id) => `acta-${id}.html`

// --- RSC --------------------------------------------------------------------------

/**
 * Tok React Server Components iz strani: vsebina vseh `self.__next_f.push([1, "…"])`.
 */
export function tokRsc(html) {
  let out = ''
  for (const m of String(html ?? '').matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      out += JSON.parse(m[1])
    } catch {}
  }
  return out
}

/**
 * Vrstice toka: Map id → vrednost. Vrstica je `<hex>:<JSON>`, `<hex>:I[…]`
 * (modul), `<hex>:HL[…]` (namig) ali `<hex>:T<dolžina>,<besedilo>` (besedilo z
 * dolžino v bajtih UTF-8, lahko čez več vrstic).
 */
export function vrsticeRsc(tok) {
  const buf = Buffer.from(tok, 'utf8')
  const vrstice = new Map()
  let i = 0
  while (i < buf.length) {
    const dvopicje = buf.indexOf(0x3a, i) // ':'
    if (dvopicje < 0) break
    const id = buf.subarray(i, dvopicje).toString('utf8')
    if (!/^[0-9a-f]+$/.test(id)) {
      // Pokvarjena vrstica: preskoči do nove vrstice.
      const nl = buf.indexOf(0x0a, i)
      if (nl < 0) break
      i = nl + 1
      continue
    }
    if (buf[dvopicje + 1] === 0x54) {
      // 'T<hex dolžina>,<besedilo>'
      const vejica = buf.indexOf(0x2c, dvopicje)
      const n = parseInt(buf.subarray(dvopicje + 2, vejica).toString('utf8'), 16)
      vrstice.set(id, buf.subarray(vejica + 1, vejica + 1 + n).toString('utf8'))
      i = vejica + 1 + n
      continue
    }
    const nl = buf.indexOf(0x0a, dvopicje)
    const kos = buf.subarray(dvopicje + 1, nl < 0 ? buf.length : nl).toString('utf8')
    i = nl < 0 ? buf.length : nl + 1
    if (/^(I|HL|E|W)\[/.test(kos) || /^D/.test(kos)) continue
    try {
      vrstice.set(id, JSON.parse(kos))
    } catch {}
  }
  return vrstice
}

/**
 * Drevo strani: elementi `["$", tip, ključ, props]` postanejo `{ tip, props,
 * otroci }`, sklici `$<id>` in `$L<id>` se razrešijo. Vrne seznam korenov
 * (vrstice, na katere se ne sklicuje nobena druga).
 */
export function drevoRsc(html) {
  const vrstice = vrsticeRsc(tokRsc(html))
  const sklicane = new Set()
  const razreseno = new Map()
  const razresi = (v, globina = 0) => {
    if (globina > 400) return null
    if (typeof v === 'string') {
      if (v === '$undefined') return undefined
      const m = v.match(/^\$(?:L|@)?([0-9a-f]+)$/)
      if (m) {
        sklicane.add(m[1])
        if (razreseno.has(m[1])) return razreseno.get(m[1])
        if (!vrstice.has(m[1])) return null
        razreseno.set(m[1], null) // zaščita pred krogom
        const r = razresi(vrstice.get(m[1]), globina + 1)
        razreseno.set(m[1], r)
        return r
      }
      if (/^\$[0-9a-f]+:/.test(v) || /^\$[SFQWBKnDTPZ]/.test(v)) return null
      if (v.startsWith('$$')) return v.slice(1)
      return v
    }
    if (Array.isArray(v)) {
      if (v[0] === '$' && typeof v[1] === 'string' && v.length === 4) {
        const props = {}
        for (const [k, x] of Object.entries(v[3] ?? {})) if (k !== 'children') props[k] = razresi(x, globina + 1)
        const otroci = razresi(v[3]?.children, globina + 1)
        return { tip: v[1], props, otroci: ravno(otroci) }
      }
      return v.map((x) => razresi(x, globina + 1))
    }
    if (v && typeof v === 'object') {
      const o = {}
      for (const [k, x] of Object.entries(v)) o[k] = razresi(x, globina + 1)
      return o
    }
    return v
  }
  const vsi = new Map()
  for (const id of vrstice.keys()) vsi.set(id, razresi(`$${id}`))
  return [...vsi.entries()].filter(([id]) => !sklicane.has(id) || id === '0').map(([, v]) => v)
}

/**
 * Otroci v ravnem seznamu. Prazno mesto (false, null) ostane kot null, ker je
 * pri dogodkih igralca MESTO v seznamu pomen (gol, rumeni, rdeči, vstop, izstop).
 */
function ravno(x) {
  if (x == null || x === false || x === true) return [null]
  if (Array.isArray(x)) return x.flatMap(ravno)
  return [x]
}

export const jeElement = (x) => x && typeof x === 'object' && typeof x.tip === 'string' && Array.isArray(x.otroci)

/** Vsi elementi pod `koren` (tudi v props, npr. `localNode`), v vrstnem redu. */
export function* elementi(koren) {
  const sklad = [koren]
  while (sklad.length) {
    const x = sklad.pop()
    if (x == null || typeof x !== 'object') continue
    if (Array.isArray(x)) {
      for (let i = x.length - 1; i >= 0; i--) sklad.push(x[i])
      continue
    }
    if (jeElement(x)) {
      yield x
      const notri = [...Object.values(x.props ?? {}).filter((v) => v && typeof v === 'object'), ...x.otroci]
      for (let i = notri.length - 1; i >= 0; i--) sklad.push(notri[i])
      continue
    }
    const vr = Object.values(x)
    for (let i = vr.length - 1; i >= 0; i--) sklad.push(vr[i])
  }
}

/** Besedilo elementa (vsi nizi pod njim, brez props). */
export function besedilo(x) {
  if (x == null || x === false) return ''
  if (typeof x === 'string' || typeof x === 'number') return String(x)
  if (Array.isArray(x)) return x.map(besedilo).join('')
  if (jeElement(x)) return x.otroci.map(besedilo).join('')
  return ''
}

const razred = (x) => String(x?.props?.className ?? '')

const prvi = (koreni, pogoj) => {
  for (const e of elementi(koreni)) if (pogoj(e)) return e
  return null
}

// --- glava zapisnika -----------------------------------------------------------

const presledki = (s) => razpakiraj(String(s ?? '')).replace(/\s+/g, ' ').trim()

/** "19.09.2026" → "2026-09-19". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}
/** "17.00" → "17:00"; "00.00" (ni ure) → null. Madridski čas = ljubljanski. */
export function uraIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})[.:](\d{2})/)
  if (!m) return null
  const u = `${m[1].padStart(2, '0')}:${m[2]}`
  return u === '00:00' ? null : u
}
/** "2026 / 27" → "2026/27". */
export const sezonaIz = (s) => {
  const m = String(s ?? '').match(/(\d{4})\s*\/\s*(\d{2})/)
  return m ? `${m[1]}/${m[2]}` : null
}

/** 'ni' ("Acta no trobada"), 'zapisnik' (stran tekme) ali 'neznano' (izziv, druga stran). */
export function vrstaStrani(html) {
  const s = String(html ?? '')
  if (/<title>\s*Acta no trobada/i.test(s)) return 'ni'
  if (/<title>\s*Acta:/i.test(s) && s.includes('self.__next_f')) return 'zapisnik'
  return 'neznano'
}

export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? '').slice(0, 20000))

/**
 * Glava zapisnika: { domaci, gostje, oznaka, zaprt, izid, tekmovanje,
 * skupina, krog, sezona, datum, ura }.
 */
export function glavaZapisnika(koreni) {
  const ovoj = prvi(koreni, (e) => e.props?.title === 'Acta del partit')
  // Pas nad drobtinami: trije stolpci — domači, sredina (oznaka, izid), gostje.
  const stolpci = ovoj
    ? [...elementi(ovoj)].find((e) => e.tip === 'div' && e.otroci.filter(jeElement).length === 3 &&
        /^\s*\S/.test(besedilo(e.otroci.filter(jeElement)[1])) && /-/.test(besedilo(e.otroci.filter(jeElement)[1])))
    : null
  let domaci = null
  let gostje = null
  let oznaka = null
  let izid = null
  if (stolpci) {
    const [d, sredina, g] = stolpci.otroci.filter(jeElement)
    domaci = presledki(besedilo(d))
    gostje = presledki(besedilo(g))
    const deli = sredina.otroci.filter(jeElement)
    oznaka = presledki(besedilo(deli[0]))
    const m = presledki(besedilo(deli[1])).match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) izid = { domaci: Number(m[1]), gostje: Number(m[2]) }
  }
  // Drobtine: "COMPETICIÓ / QUARTA CATALANA / GRUP 1 / Jornada 1".
  const drobtine = prvi(koreni, (e) => e.tip === 'div' && e.otroci.some((o) => jeElement(o) && besedilo(o) === 'COMPETICIÓ'))
  const kosi = drobtine ? drobtine.otroci.filter(jeElement).map((o) => presledki(besedilo(o))).filter((x) => x && x !== '/') : []
  const krog = Number(kosi.find((k) => /^Jornada/i.test(k))?.match(/(\d+)/)?.[1]) || null
  const podatek = (ime) => {
    const e = prvi(koreni, (x) => x.tip === 'span' && x.otroci[0] === ime)
    return e ? presledki(e.otroci.slice(1).map(besedilo).join('')).replace(/^:\s*/, '') : null
  }
  return {
    domaci,
    gostje,
    oznaka,
    zaprt: /tancada/i.test(oznaka ?? ''),
    izid,
    tekmovanje: kosi[1] ?? null,
    skupina: kosi[2] ?? null,
    krog,
    sezona: sezonaIz(podatek('Temporada')),
    datum: datumIz(podatek('Data')),
    ura: uraIz(podatek('Hora')),
  }
}

// --- ekipi in dogodki --------------------------------------------------------------

const MALE = new Set(['de', 'del', 'la', 'las', 'los', 'i', 'y', 'da', 'dos', 'van', 'von', 'el', 'al', 'ben', 'bin'])
const lepoBesede = (del) =>
  del
    .split(/\s+/)
    .filter(Boolean)
    .map((b, i) => {
      const male = b.toLocaleLowerCase('es')
      if (i > 0 && MALE.has(male)) return male
      return male.replace(/(^|[-'’])(\p{L})/gu, (_, a, c) => a + c.toLocaleUpperCase('es'))
    })
    .join(' ')
/** "CASTAÑO MARIN, IKER" → "Castaño Marin Iker" (priimki, nato ime); "AITOR" → "Aitor". */
export function imeIgralca(nombre) {
  const [priimek, ime] = presledki(nombre).split(/\s*,\s*/, 2)
  return [lepoBesede(priimek ?? ''), ime ? lepoBesede(ime) : ''].filter(Boolean).join(' ')
}

/** "35’" → 35, "90+3’" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

const barve = (x) => {
  const out = []
  for (const e of elementi(x)) {
    const c = razred(e).match(/bg-\[#([0-9A-Fa-f]{6})\]/)
    if (c) out.push(c[1].toUpperCase())
    for (const k of ['fill', 'stroke']) if (/^#[0-9A-Fa-f]{6}$/.test(String(e.props?.[k] ?? ''))) out.push(String(e.props[k]).slice(1).toUpperCase())
  }
  return out
}
const RUMENA = 'FFEB3B'
const jeRdeca = (c) => {
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return r > 180 && g < 90 && b < 90
}

/**
 * Vrsta dogodka po ikoni. Vrstica dogodka ima stalna mesta: minuta, gol,
 * rumeni, rdeči/drugi rumeni, vstop (modra puščica), izstop (rdeča puščica).
 * Odloči barva, mesto je rezerva.
 */
export function vrstaIkone(x, mesto) {
  const b = barve(x)
  // Žoga (krogi): zelene pike gol, rdeče pike avtogol (Quarta grup 1, 4139572).
  if ([...elementi(x)].some((e) => e.tip === 'circle')) return b.some(jeRdeca) && !b.includes('00FF73') ? 'avtogol' : 'gol'
  if (b.includes('00FF73')) return 'gol'
  if (b.includes('0068A9')) return 'noter'
  const svg = [...elementi(x)].some((e) => e.tip === 'svg')
  const rdec = b.some(jeRdeca)
  const rumen = b.includes(RUMENA)
  if (svg && rdec && !rumen && mesto === 5) return 'ven'
  if (rumen && rdec) return 'drugiRumeni'
  if (rdec) return mesto === 5 ? 'ven' : 'rdeci'
  if (rumen) return mesto === 3 ? 'drugiRumeni' : 'rumeni'
  return ['?', 'gol', 'rumeni', 'rdeci', 'noter', 'ven'][mesto] ?? '?'
}

const vrsticaDogodkov = (e) => e.otroci.find((o) => jeElement(o) && razred(o).includes('shrink-0 ml-2'))

/** Igralci ene ekipe (`localNode` ali `visitorNode`) z dogodki. */
export function igralciEkipe(vozel) {
  const igralci = []
  let sekcija = ''
  for (const e of elementi(vozel)) {
    if (e.tip === 'h3') sekcija = presledki(besedilo(e))
    if (!/^(Alineacions|Suplents)$/i.test(sekcija)) continue
    const vrstica = vrsticaDogodkov(e)
    if (!vrstica) continue
    const p = [...elementi(e)].find((x) => x.props?.player)?.props.player
    if (!p) continue
    const dogodki = []
    for (const o of vrstica.otroci) {
      if (!jeElement(o)) continue
      const m = minuta(besedilo(o.otroci[0]))
      o.otroci.slice(1).forEach((ik, i) => {
        if (ik) dogodki.push({ vrsta: vrstaIkone(ik, i + 1), minuta: m })
      })
    }
    igralci.push({
      st: /^\d+$/.test(String(p.dorsal ?? '')) ? Number(p.dorsal) : null,
      ime: imeIgralca(p.nombre),
      regSt: /^\d+$/.test(String(p.id ?? '')) ? Number(p.id) : null,
      zacetnik: String(p.titular) === '1' && /^Alineacions$/i.test(sekcija),
      kapetan: String(p.capitan) === '1',
      vratar: String(p.portero) === '1',
      pozicija: String(p.portero) === '1' ? 'GK' : null,
      dogodki,
    })
  }
  return igralci
}

/** Vrsta je samostojna oznaka ob igralcu: ["GOL…", " (", klub, ")"]. */
function vrstaGola(vrstica, igralec) {
  const vsebina = prvi(vrstica, (e) => e.otroci.includes(igralec))
  const oznaka = vsebina?.otroci.find((e) => e?.tip === 'span' &&
    e.otroci[1] === ' (' && e.otroci[3] === ')')
  // Beri samo oznako, nikoli imena igralca, kluba ali besedila legende.
  const tip = presledki(oznaka?.otroci[0]).toUpperCase()
  return /^GOL EN PR[ÒO]PIA$/.test(tip) ? 'avtogol' : tip === 'GOL PENAL' ? 'enajstmetrovka' : 'gol'
}

/** Goli iz razdelka "Gols": [{ regSt, ime, minuta, stanje: [d, g], vrsta }]. */
export function goliZapisnika(koreni) {
  const razdelek = prvi(koreni, (e) => e.tip === 'div' && e.otroci.some((o) => jeElement(o) && o.otroci.some((h) => h?.tip === 'h3' && besedilo(h) === 'Gols')))
  if (!razdelek) return []
  const out = []
  const vzeti = new Set()
  for (const e of elementi(razdelek)) {
    if (vzeti.has(e) || e.tip !== 'div') continue
    const igralci = [...elementi(e)].filter((x) => x.props?.player)
    if (igralci.length !== 1) continue
    const t = presledki(besedilo(e))
    const stanje = t.match(/^(\d+)\s*-\s*(\d+)/)
    if (!stanje) continue
    for (const x of elementi(e)) vzeti.add(x)
    const p = igralci[0].props.player
    out.push({
      regSt: /^\d+$/.test(String(p.id ?? '')) ? Number(p.id) : null,
      ime: imeIgralca(p.nombre),
      minuta: minuta(t.match(/\((\d+)(?:\s*\+\s*\d+)?\s*'\)/)?.[1]),
      stanje: [Number(stanje[1]), Number(stanje[2])],
      vrsta: vrstaGola(e, igralci[0]),
    })
  }
  return out
}

// --- zapisnik ---------------------------------------------------------------------

/** Glava strani brez razčlenitve ekip (za razpored). Null, če stran ni zapisnik. */
export function glavaStrani(html) {
  if (vrstaStrani(html) !== 'zapisnik') return null
  return glavaZapisnika(drevoRsc(html))
}

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni zapisnik ali tekma nima
 * izida (neodigrana).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  if (vrstaStrani(html) !== 'zapisnik') return null
  const koreni = drevoRsc(html)
  const g = glavaZapisnika(koreni)
  if (!g.izid) return null
  const vozel = prvi(koreni, (e) => e.props && 'localNode' in e.props && 'visitorNode' in e.props)
  const ekipeIgr = [igralciEkipe(vozel?.props.localNode), igralciEkipe(vozel?.props.visitorNode)]
  const imeni = [g.domaci, g.gostje]
  const opozorila = []
  const ekipe = ekipeIgr.map((xs) => ({ postava: xs.filter((i) => i.zacetnik), rezerve: xs.filter((i) => !i.zacetnik) }))
  const znana = ekipe.map((x) => x.postava.length >= NAJMANJ_ZACETNIKOV)
  ekipe.forEach((x, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${x.postava.length ? `le ${x.postava.length} začetnikov` : 'brez postave'}`)
  })

  const kje = new Map()
  ekipeIgr.forEach((xs, idx) => xs.forEach((i) => i.regSt != null && kje.set(i.regSt, { idx, i })))
  const kdo = (idx, i, m) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt, minuta: m })

  // Goli iz razdelka "Gols"; stanje po golu pove, kateri ekipi je štel.
  const goli = []
  let prej = [0, 0]
  for (const x of goliZapisnika(koreni)) {
    const za = x.stanje[0] > prej[0] && x.stanje[1] === prej[1] ? 0 : x.stanje[1] > prej[1] && x.stanje[0] === prej[0] ? 1 : null
    prej = x.stanje
    const k = kje.get(x.regSt)
    if (!k) { opozorila.push(`gol v ${x.minuta}. minuti (${x.ime}): strelca ni v postavi`); continue }
    let avtogol = x.vrsta === 'avtogol'
    // Avtogol brez oznake: stanje ga pripiše nasprotniku strelca.
    if (!avtogol && za != null && za !== k.idx) {
      avtogol = true
      opozorila.push(`gol v ${x.minuta}. minuti (${x.ime}): stanje ${x.stanje.join(':')} ga pripiše nasprotniku — štet kot avtogol`)
    } else if (avtogol && za != null && za !== 1 - k.idx)
      opozorila.push(`avtogol v ${x.minuta}. minuti (${x.ime}): stanje ${x.stanje.join(':')} ga pripiše strelčevi ekipi`)
    goli.push({ ...kdo(k.idx, k.i, x.minuta), rezultat: [...x.stanje], avtogol, enajstmetrovka: !avtogol && x.vrsta === 'enajstmetrovka' })
  }

  const rumeni = []
  const rdeci = []
  ekipeIgr.forEach((xs, idx) => {
    for (const i of xs) {
      for (const d of i.dogodki) {
        if (d.vrsta === 'rumeni') rumeni.push(kdo(idx, i, d.minuta))
        else if (d.vrsta === 'rdeci' || d.vrsta === 'drugiRumeni') {
          // Drugi rumeni kot pri drugih virih: prvi rumeni + rdeči.
          if (d.vrsta === 'drugiRumeni' && !i.dogodki.some((x) => x.vrsta === 'rumeni')) rumeni.push(kdo(idx, i, d.minuta))
          if (!rdeci.some((r) => r.ekipaIdx === idx && r.regSt === i.regSt)) rdeci.push(kdo(idx, i, d.minuta))
        } else if (d.vrsta === '?') opozorila.push(`neznan dogodek pri ${i.ime} (${d.minuta}.)`)
      }
    }
  })
  // Žoge pri igralcih (gol, avtogol) proti razdelku "Gols": le preverba.
  const zogice = ekipeIgr.flat().reduce((n, i) => n + i.dogodki.filter((d) => d.vrsta === 'gol' || d.vrsta === 'avtogol').length, 0)
  if (zogice !== goli.length) opozorila.push(`golov pri igralcih ${zogice}, v razdelku Gols ${goli.length}`)

  const sestava = ekipe.map((x, idx) => {
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (x.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${x.postava.length} igralcev namesto 11`)
    const vObliko = ({ dogodki, ...i }) => ({
      ...i,
      preklopi: dogodki.filter((d) => d.vrsta === 'noter' || d.vrsta === 'ven').map((d) => d.minuta).filter((m) => m != null).sort((a, b) => a - b),
    })
    return { ime: imeni[idx], postava: x.postava.map(vObliko), rezerve: x.rezerve.map(vObliko) }
  })
  // Ekipa z vsaj eno rezervo brez vpisanih menjav: začetniki 90, klop brez nastopa.
  const brezMenjav = sestava.map((e) => e.postava.length > 0 && e.rezerve.length > 0 && ![...e.postava, ...e.rezerve].some((i) => i.preklopi.length))

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (znana[0] && znana[1] && (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje))
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const zapisnik = {
    zapisnikId: id,
    url,
    sezona: g.sezona,
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    tekmovanje: g.tekmovanje,
    skupina: g.skupina,
    zaprt: g.zaprt,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: g.izid,
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave: [],
    brezMenjav,
    nepopoln: !znana[0] || !znana[1],
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    opozorila,
  }
  const sourcePath = vrsticeRsc(tokRsc(html)).get('0')?.c
  return doplniCalongeMenjavo(zapisnik, {
    sourcePath,
    sourceSha256: sourcePath?.at(-1) === '4116202' || id === 'es4116202' || url === naslovZapisnika('4116202')
      ? createHash('sha256').update(html).digest('hex') : null,
  })
}

// --- klubi -------------------------------------------------------------------------

/**
 * Ključ kluba: brez diakritike in ločil, z obliko vred ("ROSES, A.E." in
 * "BASE ROSES, C.F." sta dva kluba).
 */
export const poenostaviKlubEs = (ime) =>
  presledki(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Same five acta IDs, 80 registration-linked appearances and the full G13
// calendar establish this exact identity. Reserve/legal forms stay distinct.
export const kljucKlubaEs = (ime) => {
  const key = poenostaviKlubEs(ime)
  return key === 'vilanova atletic' ? 'futbol club atletic vng pasifae' : key
}

const OBLIKE_ES = new Set(['futbol', 'fútbol', 'ae', 'cf', 'ce', 'ue', 'ud', 'fc', 'cd', 'club', 'ef', 'ad', 'cef', 'aec', 'sd', 'cfs', 'fs', 'uec', 'ue', 'ac', 'ufb', 'uff', 'cfb', 'cfu', 'ec'])
/**
 * Kratko ime: del pred vejico, brez oblike društva na začetku ali koncu, v
 * malih črkah z veliko začetnico. "ROSES, A.E." → "Roses", "GARRIGUELLA,C.E."
 * → "Garriguella", "SANT LLORENÇ DE LA MUGA, F.C." → "Sant Llorenç de la Muga".
 */
export function kratkoImeEs(polno) {
  const jedro = presledki(polno).split(/\s*,\s*/)[0]
  const besede = jedro.split(' ').filter(Boolean)
  const oblika = (b) => OBLIKE_ES.has(b.toLowerCase().replace(/\./g, ''))
  let brez = besede
  while (brez.length > 1 && oblika(brez[0])) brez = brez.slice(1)
  while (brez.length > 1 && oblika(brez.at(-1))) brez = brez.slice(0, -1)
  return lepoBesede(brez.slice(0, 5).join(' '))
}

// --- blok in branje --------------------------------------------------------------------

const pot = (ime) => `${MAPA}/${ime}`
function izPredpomnilnika(ime) {
  const p = pot(ime)
  if (!existsSync(p)) return null
  return { html: readFileSync(p, 'utf8'), starost: Date.now() - statSync(p).mtimeMs }
}

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class FcfZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FcfZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

/** Iz predpomnilnika, če ni starejši od `najvec` ms; sicer prenese (in zapiše). */
async function beri(prenesi, id, najvec, preveri = null) {
  const ime = imeStrani(id)
  const c = izPredpomnilnika(ime)
  if (!preveri && c && c.starost <= najvec) return c.html
  // Običajna klicatelja prenosa pišeta že pred vrnitvijo iz prenesi. Pri
  // ciljni obnovi zato najprej pišeta v začasno datoteko, brez stare rezerve.
  const imePrenosa = preveri ? `.paired-${id}-${randomUUID()}.html` : ime
  if (preveri && existsSync(pot(imePrenosa))) throw napakaKoledarja('začasna datoteka že obstaja')
  let html
  try {
    html = await prenesi(naslovZapisnika(id), imePrenosa, true)
    if (jeIzziv(html)) throw new FcfZavrnitev(`fcf: ${naslovZapisnika(id)} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
    if (vrstaStrani(html) === 'neznano') throw new Error(`fcf: ${naslovZapisnika(id)} ni zapisnik (${html.length} B) — uvoz ustavljen`)
    preveri?.(html)
    // Ciljni odgovor ostane v pomnilniku do preverbe CELOTNEGA koledarja.
    if (!preveri) {
      mkdirSync(MAPA, { recursive: true })
      writeFileSync(pot(ime), html)
    }
  } catch (e) {
    if (e.zavrnitev || e.status === 403 || e.status === 429) throw new FcfZavrnitev(`fcf: ${naslovZapisnika(id)} → ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  } finally {
    if (preveri) rmSync(pot(imePrenosa), { force: true })
  }
  return html
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/** Kako star sme biti predpomnjen zapisnik (ms) glede na stanje in datum. */
export function najvecStarost(g, danes = Date.now(), svezi = false) {
  if (!g) return 7 * DAN // "Acta no trobada": enkrat na teden
  const star = starostDni(g.datum, danes)
  if (g.izid) {
    if (svezi && star <= 3) return -1 // popravki prvih dni
    if (!g.zaprt && star <= 45) return URA // zapisnik še ni zaprt
    return Infinity
  }
  if (!g.datum) return 7 * DAN
  if (star < -1) return 7 * DAN // še ni na vrsti
  if (star <= 14) return URA // na vrsti ali pred kratkim
  return DAN // prestavljena tekma brez novega datuma
}

const klubPara = (g) => [poenostaviKlubEs(g.domaci), poenostaviKlubEs(g.gostje)]
const kljucSkupine = (g) => `${g.tekmovanje}|${g.skupina}|${g.sezona}`
const napakaKoledarja = (razlog) => new Error(`fcf: neskladen koledar — ${razlog}; uvoz ustavljen`)

/** Pure source context shared by the audit and existing selected-report reader. */
function singleReportSourceContext(koda, { id, tekmovanje: c, sezona, danes = Date.now() } = {}) {
  const fail = reason => { throw new Error(`fcf: posamezni zapisnik — ${reason}; uvoz ustavljen`) }
  const group = /^es-ct-(elit|primera|segona|tercera|quarta)(?:-g([1-9]\d*))?$/.exec(c?.slug ?? '')
  if (c?.source !== 'fcf' || c.sezona_koledarska !== false || !group ||
      (group[1] === 'elit' ? Boolean(group[2]) : !group[2])) fail('neveljavno registrirano tekmovanje')
  if (typeof koda !== 'string' || koda !== c.source_league_code || !/^[1-9]\d*-[1-9]\d*$/.test(koda))
    fail('zahtevan je točen registrirani blok tekoče lige')
  const { od, do: do_ } = razberiKodo(koda)
  if (![od, do_].every(Number.isSafeInteger) || koda !== `${od}-${do_}`) fail('neveljaven blok')
  if (typeof id !== 'string' || !/^es[1-9]\d*$/.test(id)) fail('zahtevana je ena točna šifra esID')
  const numericId = Number(id.slice(2))
  if (!Number.isSafeInteger(numericId) || id !== `es${numericId}` || numericId < od || numericId > do_)
    fail('šifra je zunaj registriranega bloka')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit',
  }).formatToParts(danes).map(p => [p.type, p.value]))
  const year = Number(parts.year) - (Number(parts.month) < 7 ? 1 : 0)
  if (sezona !== `${year}/${String(year + 1).slice(-2)}`) fail('neveljavna tekoča sezona')
  const expectedCompetition = group[1] === 'elit' ? 'LLIGA ELIT' : `${group[1].toUpperCase()} CATALANA`
  const expectedGroup = `GRUP ${group[2] ?? '1'}`
  const url = naslovZapisnika(numericId)
  const validate = html => {
    if (jeIzziv(html)) throw new FcfZavrnitev(`fcf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
    const route = vrsticeRsc(tokRsc(html)).get('0')?.c
    const g = glavaStrani(html)
    if (!Array.isArray(route) || JSON.stringify(route) !== JSON.stringify(['', 'ca', 'competicio', 'acta', String(numericId)]) ||
        !g || g.sezona !== sezona || g.tekmovanje !== expectedCompetition ||
        g.skupina !== expectedGroup || !g.domaci || !g.gostje ||
        /^undefined$/i.test(g.domaci) || /^undefined$/i.test(g.gostje) ||
        !Number.isInteger(g.krog) || g.krog < 1) fail('stran ne pripada zahtevani šifri/skupini/sezoni')
    const clubs = identitetaPara(html)
    if (clubs[0] === clubs[1]) fail('neveljavna identiteta klubov')
    return g
  }
  return { id, numericId, url, validate }
}

/** Pure version of the exact existing single-report identity validation. */
export function validateFcfSingleReportSource(html, koda, options = {}) {
  return singleReportSourceContext(koda, options).validate(html)
}

/** Validate synchronously before importer writes; returned reader touches only this acta. */
export function posamezniZapisnik(koda, options = {}) {
  const { danes = Date.now() } = options
  const { id, numericId, url, validate } = singleReportSourceContext(koda, { ...options, danes })
  return async prenesi => {
    const cached = izPredpomnilnika(imeStrani(numericId))
    const header = cached ? glavaStrani(cached.html) : null
    const useCache = cached && cached.starost <= najvecStarost(header, danes, true)
    const html = useCache ? cached.html : await beri(prenesi, numericId, -1, validate)
    validate(html)
    // Preserve the ordinary parser's exact source corrections and drift guards.
    const z = vZapisnik(html, { id, url })
    if (!useCache) writeFileSync(pot(imeStrani(numericId)), html)
    if (!z || (z.prazen && starostDni(z.datum, danes) > 7)) return []
    return [{ id: z.zapisnikId, z, url, rawSha256: createHash('sha256').update(html).digest('hex') }]
  }
}

/** Natančni imeni in uradni povezavi na straneh glave, brez vzdevkov klubov. */
function identitetaPara(html) {
  const ovoj = prvi(drevoRsc(html), (e) => e.props?.title === 'Acta del partit')
  const stolpci = ovoj && [...elementi(ovoj)].find((e) => e.tip === 'div' &&
    e.otroci.filter(jeElement).length === 3 && /-/.test(besedilo(e.otroci.filter(jeElement)[1])))
  if (!stolpci) throw napakaKoledarja('manjka glava para')
  const deli = stolpci.otroci.filter(jeElement)
  return [deli[0], deli[2]].map((stran) => {
    const ime = poenostaviKlubEs(besedilo(stran))
    const povezave = new Set([...elementi(stran)].map((e) => e.props?.href)
      .filter((href) => /^\/ca\/clubs\/[1-9][0-9]*\/categories\/[1-9][0-9]*$/.test(href ?? '')))
    if (!ime || povezave.size !== 1) throw napakaKoledarja('nejasna uradna identiteta kluba')
    return `${ime}|${[...povezave][0]}`
  })
}

/** Obnova velja samo za en podvojen neodigran povratni par v polnem bloku. */
async function obnoviPar(prave, glavna, ponovnoUporabljeni, prenesi) {
  if (prave.length !== 240 || new Set(prave.flatMap((t) => klubPara(t.g))).size !== 16) return
  const pari = new Map()
  for (const t of prave) {
    const key = klubPara(t.g).sort().join('|')
    if (!pari.has(key)) pari.set(key, [])
    pari.get(key).push(t)
  }
  const sporni = [...pari.values()].filter((ts) => ts.length === 2 &&
    ts[0].g.krog === ts[1].g.krog && !ts[0].g.izid && !ts[1].g.izid &&
    klubPara(ts[0].g)[0] === klubPara(ts[1].g)[1] && klubPara(ts[0].g)[1] === klubPara(ts[1].g)[0])
  if (!sporni.length) return
  if (sporni.length !== 1) throw napakaKoledarja('več spornih povratnih parov')
  const par = sporni[0]
  const kluba = klubPara(par[0].g).sort().join('|')
  const klubi = new Set(prave.flatMap((t) => klubPara(t.g)))
  // To preverjanje uporabimo pred branjem IN po njem: vseh 240 smeri mora
  // biti enoličnih, brez samotekem in izvensezonskih krogov.
  const krogi = () => {
    const smeri = new Set(), out = new Map()
    for (const t of prave) {
      const [d, g] = klubPara(t.g), k = t.g.krog
      if (d === g || !klubi.has(d) || !klubi.has(g) || !Number.isInteger(k) || k < 1 || k > 30)
        throw napakaKoledarja('neveljaven klub ali krog')
      smeri.add(`${d}|${g}`)
      if (!out.has(k)) out.set(k, [])
      out.get(k).push(t)
    }
    if (smeri.size !== 240 || out.size !== 30) throw napakaKoledarja('nepopolne ali podvojene smeri/krogi')
    return out
  }
  let luknji = 0
  for (const ts of krogi().values()) {
    const ostale = ts.filter((t) => !par.includes(t))
    const udelezeni = new Set(ostale.flatMap((t) => klubPara(t.g)))
    if (udelezeni.size !== ostale.length * 2) throw napakaKoledarja('dodatna ponovitev kluba v krogu')
    if (ostale.length === 7 && [...klubi].filter((k) => !udelezeni.has(k)).sort().join('|') === kluba) luknji++
    else if (ostale.length !== 8) throw napakaKoledarja('dodatno neskladje kroga')
  }
  if (luknji !== 2) throw napakaKoledarja('par ni edino neskladje dveh krogov')
  const zaBranje = par.filter((t) => ponovnoUporabljeni.has(t.id))
  if (!zaBranje.length) throw napakaKoledarja('oba sporna zapisnika sta že sveže prebrana')
  // Največ dve zaporedni logični branji; obstoječi transport ohrani svoje
  // premore, ponovitve in meje izvornih zahtevkov. Ni rekurzivne obnove.
  for (const t of zaBranje) {
    const identiteta = identitetaPara(t.html).sort().join(';')
    const html = await beri(prenesi, t.id, -1, (s) => {
      const route = vrsticeRsc(tokRsc(s)).get('0')?.c
      const g = glavaStrani(s)
      if (!Array.isArray(route) || route.length !== 5 || route.join('/') !== `/ca/competicio/acta/${t.id}` ||
        !g || kljucSkupine(g) !== glavna || klubPara(g).sort().join('|') !== kluba ||
        identitetaPara(s).sort().join(';') !== identiteta)
        throw napakaKoledarja(`osveženi zapisnik ${t.id} ne pripada istemu paru/skupini/sezoni`)
    })
    t.html = html
    t.g = glavaStrani(html)
  }
  if (par[0].g.krog === par[1].g.krog || klubPara(par[0].g)[0] !== klubPara(par[1].g)[1] ||
    klubPara(par[0].g)[1] !== klubPara(par[1].g)[0]) throw napakaKoledarja('povratni par ostaja neskladen')
  for (const ts of krogi().values()) {
    if (ts.length !== 8 || new Set(ts.flatMap((t) => klubPara(t.g))).size !== 16)
      throw napakaKoledarja('po obnovi vsak krog potrebuje osem disjunktnih tekem')
  }
  // Noben zavrnjen par ne sme z delnim zapisom izbrisati svojega sprožilca.
  for (const t of zaBranje) writeFileSync(pot(imeStrani(t.id)), t.html)
}

/**
 * Prebere blok zapisnikov: { tekme: [{ id, html, g }], tujih, ni }.
 * Tekma druge skupine (ali sezone) v bloku se izpusti z opozorilom.
 * Vezane zgodovinske tekme ohranijo samo glavo (html:null) za celoten koledar;
 * njihovih surovih strani in individualnih podatkov ne beremo.
 */
export async function preberiBlok(koda, prenesi, { danes = Date.now(), svezi = false, preskoci = new Set(), historicalFixtures = [] } = {}) {
  const { od, do: do_ } = razberiKodo(koda)
  const historical=new Map()
  for(const t of historicalFixtures) {
    const id=t?.id,g=t?.g,m=t?.historicalMarker,f=m?.fixture
    if(!Number.isSafeInteger(id)||id<od||id>do_||historical.has(id)||!preskoci.has(sifraZapisnika(id))||m?.sourceMatchId!==String(id)||m?.reportId!==sifraZapisnika(id)
      ||f?.sourceMatchId!==String(id)||g?.krog!==f?.sourceRound||g?.datum!==f?.playedOn||g?.sezona!==f?.season
      ||!g?.domaci||!g?.gostje||!g?.tekmovanje||!g?.skupina||(isFcfG1SupplementUnknownResultMarker(m)&&!isFcfG1SupplementCalendarIdentity({marker:m,g,code:koda}))||((isFcfSixUnknownResultMarker(m)||isFcfG1SupplementUnknownResultMarker(m))?g.izid!==null:!g?.izid||g.izid.domaci!==f?.observedHomeScore||g.izid.gostje!==f?.observedAwayScore))
      throw napakaKoledarja('neveljavna vezana zgodovinska identiteta tekme')
    historical.set(id,{id,g:{...g},historicalMarker:m,html:null})
  }
  for(const reportId of preskoci) {
    const match=/^es([1-9]\d*)$/.exec(String(reportId)),id=match?Number(match[1]):null
    if(id>=od&&id<=do_&&!historical.has(id))throw napakaKoledarja('preskok zapisnika zahteva vezano identiteto za celoten koledar')
  }
  const strani = []
  const ponovnoUporabljeni = new Set()
  for (let id = od; id <= do_; id++) {
    if (historical.has(id)) { strani.push(historical.get(id)); continue }
    const c = izPredpomnilnika(imeStrani(id))
    const g = c ? glavaStrani(c.html) : null
    const uporabi = c && c.starost <= najvecStarost(g, danes, svezi)
    if (uporabi) ponovnoUporabljeni.add(id)
    const html = uporabi ? c.html : await beri(prenesi, id, -1)
    strani.push({ id, html })
  }
  const tekme = []
  const ni = []
  for (const s of strani) {
    const g = s.g ?? glavaStrani(s.html)
    if (!g) { ni.push(s.id); continue }
    tekme.push({ ...s, g })
  }
  // Skupina bloka: najpogostejša (tekmovanje, skupina, sezona).
  const kljuc = kljucSkupine
  const stevec = new Map()
  for (const t of tekme) stevec.set(kljuc(t.g), (stevec.get(kljuc(t.g)) ?? 0) + 1)
  const glavna = [...stevec.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const tuje = tekme.filter((t) => kljuc(t.g) !== glavna)
  if (tuje.length) console.warn(`fcf: v bloku ${koda} so tekme drugih skupin (izpuščene): ${tuje.map((t) => `${t.id} (${kljuc(t.g)})`).join(', ')}`)
  // Prost krog: "vs undefined" (liho število klubov) ni tekma.
  const prave = tekme.filter((t) => kljuc(t.g) === glavna && t.g.domaci && t.g.gostje && !/^undefined$/i.test(t.g.gostje) && !/^undefined$/i.test(t.g.domaci))
  await obnoviPar(prave, glavna, ponovnoUporabljeni, prenesi)
  return { tekme: prave, skupina: glavna, tujih: tuje.length, ni }
}

/** Razpored iz prebranega bloka. */
export function razporedBloka(b, { danes = Date.now() } = {}) {
  const krogi = new Map()
  for (const t of b.tekme) {
    const { g } = t
    if (!g.krog) continue
    if (!krogi.has(g.krog)) krogi.set(g.krog, { stevilka: g.krog, tekme: [] })
    // Izid brez postav obeh ekip, starejši od tedna, je kontumacija.
    let kontumacija = false
    if (!t.historicalMarker && g.izid && starostDni(g.datum, danes) > 7) {
      const z = vZapisnik(t.html)
      kontumacija = !!z?.prazen
    }
    krogi.get(g.krog).tekme.push({
      domaci: g.domaci,
      gostje: g.gostje,
      datum: g.datum,
      ura: g.ura,
      odigrana: !!g.izid,
      kontumacija,
      ...(kontumacija || t.historicalMarker ? { izid: g.izid } : {}),
      ...(t.historicalMarker ? {historicalMarker:t.historicalMarker} : {}),
    })
  }
  return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
}

/**
 * Prenos za `prenesiSPonovitvami`: stran je velika (~0,4 MB) in strežnik jo
 * pošilja počasi, zato telo preberemo v isti časovni omejitvi (90 s) kot
 * glavo. Počasno telo je tako prehodna napaka (TimeoutError → ponovitev), ne
 * padec uvoza med branjem `text()`.
 */
export async function fcfFetch(url, moznosti = {}) {
  // Beremo ob klicu: uvoz modula (tudi za neodvisni audit) ne preverja okolja.
  const faktor = process.env.SLFF_PREMOR_FAKTOR === undefined ? 1 : Number(process.env.SLFF_PREMOR_FAKTOR)
  const premor = Math.ceil(15000 * faktor)
  if (!Number.isFinite(faktor) || faktor < 1 || premor > 2147483647)
    throw new Error('fcf: neveljaven SLFF_PREMOR_FAKTOR (končen >= 1, premor <= 2147483647 ms)')

  // Preverimo izvirni niz, ne normaliziranega URL (vrata, presledki, ../ …).
  const zapisnik = typeof url === 'string' && /^https:\/\/www\.fcf\.cat\/ca\/competicio\/acta\/[1-9][0-9]*$/.test(url) && !/\s/.test(url)
  const { signal: _s, ...ostalo } = moznosti
  for (let poskus = 0; poskus < 2; poskus++) {
    const signal = AbortSignal.timeout(90000)
    const o = await fetch(url, { ...ostalo, signal })
    if (o.status === 403 || o.status === 429) {
      // Zavrnitev ima prednost tudi pred visečim ali pokvarjenim preklicem.
      try { void o.body?.cancel().catch(() => {}) } catch { /* Najboljši trud. */ }
      throw new FcfZavrnitev(`fcf: ${url} → ${o.status} — uvoz ustavljen, ne obhajamo`, o.status)
    }
    const telo = await o.text()
    if (zapisnik && o.status === 200 && telo.length === 0 && (poskus === 1 || !o.redirected)) {
      if (poskus === 1) throw new Error(`fcf: ${url} → prazno telo HTTP 200 tudi po ponovitvi — uvoz ustavljen`)
      await new Promise((r) => setTimeout(r, premor))
      continue
    }
    return new Response(telo, { status: o.status, statusText: o.statusText, headers: o.headers })
  }
}

const vir = {
  ime: 'fcf',
  fetch: fcfFetch,
  polnoIme: 'Federació Catalana de Futbol (fcf.cat)',
  drzava: 'ES',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  // Uvoz razporeda to stran prenese pred `razporedVseStrani`: prvi zapisnik bloka.
  naslovRazporeda: (koda) => naslovZapisnika(razberiKodo(koda).od),
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new FcfZavrnitev(`fcf: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razporedBloka(await preberiBlok(koda, prenesi))
  },

  async zapisniki(koda, prenesi, { preskoci = new Set(), historicalFixtures = [] } = {}) {
    const b = await preberiBlok(koda, prenesi, { svezi: true, preskoci, historicalFixtures })
    const out = []
    for (const t of b.tekme) {
      if (t.historicalMarker) continue // Calendar identity is retained; individual observations remain unavailable.
      if (!t.g.izid) continue
      const url = naslovZapisnika(t.id)
      const z = vZapisnik(t.html, { id: sifraZapisnika(t.id), url })
      // Kontumacija (izid brez obeh postav) nima zapisnika; nepopoln gre skozi.
      if (!z || (z.prazen && starostDni(z.datum) > 7)) continue
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  posamezniZapisnik,

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaEs,
  kratkoIme: kratkoImeEs,
  poenostavi: poenostaviKlubEs,
}

export default vir
