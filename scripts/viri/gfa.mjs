// Vir: Gibraltar Football Association — gibraltarfa.com (Gibraltar).
//
// Stran izriše strežnik (HTML, brez JSON-a). Glej docs/viri/gibraltar.md.
//
// SEZONA je avgust–maj: oznaka "2026/27" (iz datuma tekme, kot pri drugih
// evropskih virih).
//
// ŠIFRA LIGE je pot tekmovanja na strani (`gibraltar-football-league-26-27-
// 3395567`): slug + id. Stran brez pravega sluga vrne 404 (preverjeno 28. 10.
// 2026), zato hranimo celo pot. Vsaka sezona ima svoje tekmovanje. GFL se po
// 22. krogu razdeli na Championship in Challenge Group, ki sta SVOJI
// tekmovanji z novima id-jema; šifra lahko zato našteje več faz s `+`
// (`<osnovna>+<championship>+<challenge>`, kot pri oefb). Kroge poznejših faz
// zamaknemo za zadnji krog osnovne faze — obe skupini sta tako krog 23 …
//
// NASLOVI:
// - `/competitions/<pot>/matches` — vsi krogi ("Matchday 1 of 22"). Odigrana
//   tekma ima izid ("2 - 1") in povezavo na zapisnik, NIMA pa datuma.
//   Neodigrana ima datum in uro ("30/10/2026 - 21:00"), povezavo pa šele, ko
//   jo zveza vnese. Datum odigrane tekme preberemo z zapisnika (iz
//   predpomnilnika, če ga že imamo).
// - `/competitions/<pot>/match-report/<slug>-<id>` — zapisnik. Slug strežnik
//   prezre (velja tudi `m-<id>`), pot tekmovanja pa mora biti prava. V glavi
//   datum ("25th October 2026, 4:30 PM", lokalni čas), izid, ime kluba s
//   povezavo `/teams/<slug>-<id>` in strelci pod klubom, ki mu gol šteje
//   ("PEREZ SANCHEZ Carlos (5 min.)", "(pen.)", avtogol "(o.g.)" z belo
//   ikono). Spodaj "Lineup" (11) in "Substitutes": dres, PRIIMEK s povezavo
//   `/player/<ime-priimek>-<id>` (id je stalen čez sezone in tekmovanja →
//   `reg_st`), "(GK)", pri igralcu, ki je šel ven, "(⇄ PRIIMEK Ime - 123')",
//   in ikone: žogica (gol), rdeča žogica (avtogol), rumeni in rdeči karton.
//   Igralec brez profila nima povezave, le besedilo "Ime PRIIMEK" — šifre
//   nima in uvoz ga veže po imenu (ko dobi profil, ga posvoji po šifri).
//
// KARTONI SO BREZ MINUTE. Ikona pri igralcu pove le, da ga je dobil (glava jih
// ne našteva). Odbitek dobi, izključeni pa v nastopih igra do konca tekme
// oziroma do menjave, ker minute izključitve ni.
//
// MINUTE DRUGEGA POLČASA SO ZAMAKNJENE ZA +45: drugi polčas teče od 91 do 135
// ("135 +4" je 90+4), prvi od 1 do 45 ("45 +6"). Preverjeno na 26 zapisnikih
// GFL, rezervne in Intermediate lige 2025/26–2026/27: nobena minuta ni med 46
// in 90, največja je 135. `minutaVira` zato odšteje 45 vsemu nad 90; minuto
// med 46 in 90 pusti in javi opozorilo.
//
// ČAS: Gibraltar (Europe/Gibraltar) ima isti pas in poletni čas kot Ljubljana,
// zato se ura ne pretvarja.
//
// robots.txt: "User-agent: * / Disallow:" — vse dovoljeno. Pogojev uporabe ni
// (le politika zasebnosti). Beremo odkrito (User-Agent SLFF, 3 s med
// zahtevki), popolnih zapisnikov ne beremo znova. **Ob 401, 403, 429 ali
// izzivu se uvoz ustavi (`GfaZavrnitev`, izhod 4) — ne obhajaj.** Strani
// igralcev (datum rojstva, slike) ne beremo.
import { existsSync, readFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'
import { NEPOPOLN } from './frf.mjs'

export { NEPOPOLN }

const OSNOVNI = 'https://www.gibraltarfa.com'
const DOLZINA_TEKME = 90
const MAPA = 'scripts/.predpomnilnik/gfa'

// --- šifra in naslovi ---------------------------------------------------------

/** "a-3395567+b-3500000" → [{ pot, id }, …] (prva je osnovna faza). */
export function razbijKodo(koda) {
  const deli = String(koda ?? '').trim().split('+').map((x) => x.trim())
  const faze = deli.map((pot) => {
    const m = pot.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)$/)
    return m ? { pot, id: m[2] } : null
  })
  if (!deli.length || faze.some((f) => !f))
    throw new Error(`gfa: šifra lige je pot tekmovanja "<slug>-<id>" (npr. gibraltar-football-league-26-27-3395567), ne "${koda}"`)
  return faze
}

export const naslovTekem = (pot) => `${OSNOVNI}/competitions/${pot}/matches`
export const naslovZapisnika = (pot, id) => `${OSNOVNI}/competitions/${pot}/match-report/m-${String(id).replace(/^gi/, '')}`
// Šifra zapisnika v bazi je `gi<id>`: id-ji tekem (COMET, 3xxxxxx) so v
// razponu drugih virov, `matches.zapisnik_id` pa je enoličen čez vse.
export const sifraZapisnika = (id) => `gi${String(id).replace(/^gi/, '')}`
const imeTekem = (pot) => `tekme-${pot}.html`
export const imeZapisnika = (id) => `tekma-${String(id).replace(/^gi/, '')}.html`

// --- zavrnitev ------------------------------------------------------------------

export class GfaZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'GfaZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/** Seznam tekem je prava stran, če ima koledar tekmovanja s krogi. */
export const jeStranTekem = (html) => /competition-calendar/.test(String(html ?? '')) && /Matchday\s+\d+\s+of\s+\d+/.test(String(html ?? ''))
/** Zapisnik je prava stran, če ima glavo z uro tekme in razdelek igralcev. */
export const jeStranZapisnika = (html) => /id="match-results"/.test(String(html ?? '')) && /Clock Icon/.test(String(html ?? ''))
/** Zapisnik z izidom in postavama (prej ga zveza še ni izpolnila). */
export const jeCelZapisnik = (html) => {
  if (!jeStranZapisnika(html)) return false
  const izid = [...String(html).matchAll(/<div class="score">\s*<h1>\s*(\d+)\s*<\/h1>/g)]
  return izid.length === 2 && /<h3 class="title">Lineup<\/h3>[\s\S]*?class="player/.test(html)
}

// --- čas -------------------------------------------------------------------------

const MESECI = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 }
const dve = (n) => String(n).padStart(2, '0')

/** "25th October 2026, 4:30 PM" → { datum: "2026-10-25", ura: "16:30" }. */
export function casZapisnika(s) {
  const m = String(s ?? '').match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})(?:,\s*(\d{1,2}):(\d{2})\s*([AP]M))?/i)
  const mesec = m && MESECI[m[2].toLowerCase()]
  if (!mesec) return { datum: null, ura: null }
  const datum = `${m[3]}-${dve(mesec)}-${dve(m[1])}`
  if (!m[4]) return { datum, ura: null }
  let h = Number(m[4]) % 12
  if (m[6].toUpperCase() === 'PM') h += 12
  return { datum, ura: `${dve(h)}:${m[5]}` }
}

/** "30/10/2026 - 21:00" → { datum: "2026-10-30", ura: "21:00" }. */
export function casRazporeda(s) {
  const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/)
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

/**
 * Minuta, kot jo piše vir → minuta tekme. Drugi polčas je pri viru zamaknjen
 * za 45 (91–135), podaljšek je ločen ("135 +4"). Vrne { minuta, sumljiva }:
 * 46–90 v viru ne bi smelo nastopiti in ostane, kot je, a z opozorilom.
 */
export function minutaVira(min, _dodatek = 0) {
  const n = Number(min)
  if (!Number.isFinite(n) || n <= 0) return { minuta: null, sumljiva: false }
  if (n <= 45) return { minuta: n, sumljiva: false }
  if (n <= 90) return { minuta: n, sumljiva: true }
  if (n <= 135) return { minuta: n - 45, sumljiva: false }
  return { minuta: DOLZINA_TEKME, sumljiva: true }
}

// --- razpored --------------------------------------------------------------------

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

/**
 * Tekme ene strani `/matches`: [{ krog, krogov, domaci, gostje, izid, datum,
 * ura, id, url }]. Odigrana tekma ima izid in id, neodigrana datum (id šele,
 * ko zveza vnese povezavo).
 */
export function vrsticeTekem(html) {
  const s = String(html ?? '')
  const zac = s.indexOf('competition-calendar')
  if (zac < 0) return []
  const kon = s.indexOf('</section>', zac)
  const telo = s.slice(zac, kon < 0 ? undefined : kon)
  const out = []
  // Krog je naslov "Matchday N of M"; tekme do naslednjega naslova so njegove.
  const naslovi = [...telo.matchAll(/<h4 class="title"><strong>\s*Matchday\s+(\d+)\s+of\s+(\d+)\s*<\/strong>/g)]
  naslovi.forEach((n, i) => {
    const kos = telo.slice(n.index, naslovi[i + 1]?.index ?? telo.length)
    for (const t of kos.split('<div class="match">').slice(1)) {
      const ekipe = [...t.matchAll(/<div class="team">\s*<p>([\s\S]*?)<\/p>/g)].map((x) => besedilo(x[1]))
      if (ekipe.length !== 2 || !ekipe[0] || !ekipe[1]) continue
      const info = besedilo(t.match(/<div class="information">([\s\S]*?)<\/div>/)?.[1])
      const izid = info.match(/^(\d+)\s*-\s*(\d+)$/)
      const href = t.match(/href="([^"]*\/match-report\/[^"]*-(\d+))"/)
      const { datum, ura } = izid ? { datum: null, ura: null } : casRazporeda(info)
      out.push({
        krog: Number(n[1]),
        krogov: Number(n[2]),
        domaci: ekipe[0],
        gostje: ekipe[1],
        izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
        datum,
        ura,
        id: href?.[2] ?? null,
        url: href?.[1] ?? null,
      })
    }
  })
  return out
}

/**
 * Tekme vseh faz z zamaknjenimi krogi. `strani` je seznam HTML strani
 * `/matches`, po vrsti faz v šifri. Poznejša faza se začne za zadnjim krogom
 * osnovne (Championship in Challenge Group sta obe krog 23 …).
 */
export function tekmeFaz(koda, strani) {
  const faze = razbijKodo(koda)
  const out = []
  let zamik = 0
  strani.forEach((html, i) => {
    const vrstice = vrsticeTekem(html)
    for (const v of vrstice) out.push({ ...v, krog: v.krog + zamik, pot: faze[i].pot })
    if (i === 0) zamik = Math.max(0, ...vrstice.map((v) => v.krogov || v.krog))
  })
  return out
}

/** Razpored v obliko uvoza razporeda (datumi odigranih morajo že biti vpisani). */
export function razcleniTekme(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      izid: t.izid, gfaId: t.id,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ---------------------------------------------------------------------

const norm = (s) =>
  razpakiraj(String(s ?? ''))
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const besede = (s) => norm(s).split(' ').filter(Boolean)
const veliko = (w) => w.charAt(0).toLocaleUpperCase('en') + w.slice(1)
const naslov = (s) => razpakiraj(String(s ?? '')).toLocaleLowerCase('en').split(/(\s+|-)/).map((x) => (/^\s+$|^-$/.test(x) ? x : veliko(x))).join('')

/**
 * Ime igralca: "Priimek Ime" (kot drugi viri). Priimek je besedilo povezave
 * (VELIKE ČRKE, z naglasi), ime je preostanek sluga povezave brez priimka.
 * "SOLER ORTUÑO" + "manuel-soler-ortuno" → "Soler Ortuño Manuel".
 */
export function imeIgralca(priimek, slug) {
  const pr = besede(priimek)
  const ostanek = [...besede(String(slug ?? '').replace(/-/g, ' '))]
  for (const w of pr) {
    const i = ostanek.indexOf(w)
    if (i >= 0) ostanek.splice(i, 1)
  }
  return [naslov(priimek), ostanek.map(veliko).join(' ')].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Igralec brez profila (ni povezave): besedilo "Jair BRYSON", "Pedro IVO
 * REZENDE DOS SANTOS" — priimek so besede z velikimi črkami na koncu.
 */
export function brezProfila(besedilo) {
  const w = razpakiraj(String(besedilo ?? '')).replace(/\(GK\)|\(C\)/g, ' ').trim().split(/\s+/).filter(Boolean)
  let i = w.length
  while (i > 0 && /\p{L}/u.test(w[i - 1]) && w[i - 1] === w[i - 1].toLocaleUpperCase('en')) i--
  if (i === w.length || i === 0) return { priimek: w.join(' '), ime: w.join(' ') }
  return { priimek: w.slice(i).join(' '), ime: w.slice(0, i).join(' ') }
}

/** Igralci enega stolpca (lineup ali substitutes). */
function igralciBloka(html, zacetnik) {
  return String(html ?? '').split(/<div class="player\b/).slice(1).map((b) => {
    const p = b.match(/<p>([\s\S]*?)(?:<br>|<\/p>)/)?.[1] ?? ''
    const a = p.match(/<a href="[^"]*\/player\/([a-z0-9-]+?)-(\d+)"\s*>([^<]*)<\/a>/)
    // Igralec brez profila na strani (nov, neregistriran pri COMET?) nima
    // povezave — ime je v besedilu, šifre ni (uvoz ga veže po imenu).
    const golo = a ? null : brezProfila(p.replace(/<[^>]+>/g, ' '))
    if (!a && !golo.priimek) return null
    const st = b.match(/<h5 class="number">\s*(\d+)\s*<\/h5>/)?.[1]
    const menjave = [...b.matchAll(/fa-exchange-alt"><\/i>\s*([^<]*?)\s*-\s*(\d+)(?:\s*\+\s*(\d+))?\s*(?:&#0?39;|')/g)]
      .map((m) => ({ noter: razpakiraj(m[1]).trim(), min: m[2], dodatek: m[3] ?? 0 }))
    const priimek = a ? razpakiraj(a[3]).trim() : golo.priimek
    const slug = a ? a[1] : besede(`${golo.ime} ${golo.priimek}`).join('-')
    return {
      st: st ? Number(st) : null,
      ime: a ? imeIgralca(priimek, slug) : [naslov(golo.priimek), golo.ime].filter(Boolean).join(' '),
      regSt: a ? Number(a[2]) : null,
      vratar: /\(GK\)/.test(p),
      zacetnik,
      priimek,
      slug,
      zogice: (b.match(/ball-black\.png/g) ?? []).length,
      avtogoli: (b.match(/ball-red\.png/g) ?? []).length,
      // Karton je ikona pri igralcu, BREZ minute.
      rumenih: (b.match(/yellow-card\.png/g) ?? []).length,
      rdecih: (b.match(/red-card\.png/g) ?? []).length,
      menjave,
    }
  }).filter(Boolean)
}

/**
 * Igralec ekipe po imenu iz glave ali menjave ("PEREZ SANCHEZ Carlos",
 * "DE HARO Evan"). Najprej vse besede (priimek + ime iz sluga), nato priimek
 * z začetkom imena, nato edini s tem priimkom.
 */
export function najdiIgralca(igralci, ime) {
  const w = besede(ime)
  if (!w.length) return null
  const kljuc = [...w].sort().join(' ')
  const poVseh = igralci.filter((i) => [...besede(i.slug.replace(/-/g, ' '))].sort().join(' ') === kljuc)
  if (poVseh.length === 1) return poVseh[0]
  const sPriimkom = igralci.filter((i) => {
    const p = besede(i.priimek)
    return p.length && p.every((x, k) => w[k] === x)
  })
  if (sPriimkom.length === 1) return sPriimkom[0]
  const ostanek = (i) => w.slice(besede(i.priimek).length)
  const sImenom = sPriimkom.filter((i) => ostanek(i).every((x) => besede(i.slug.replace(/-/g, ' ')).includes(x)))
  if (sImenom.length === 1) return sImenom[0]
  // Tipkarska napaka v profilu ("Rosruiguez Macias" proti "RODRIGUEZ MACIAS
  // Yoel-David"): edini z vsaj dvema skupnima besedama in največ skupnimi.
  if (sPriimkom.length) return null
  const skupnih = (i) => besede(i.slug.replace(/-/g, ' ')).filter((x) => w.includes(x)).length
  const naj = Math.max(0, ...igralci.map(skupnih))
  const kandidati = igralci.filter((i) => skupnih(i) === naj)
  return naj >= 2 && kandidati.length === 1 ? kandidati[0] : null
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če stran ni zapisnik ali
 * tekma še nima izida. Zapisnik brez polne postave ali z goli, ki se ne
 * ujemajo z izidom, je `nepopoln: true` (glej docs/viri/gibraltar.md).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = String(html ?? '')
  if (!jeStranZapisnika(s)) return null
  const glava = s.slice(s.indexOf('id="match-results"'))
  const izid = [...glava.matchAll(/<div class="score">\s*<h1>\s*([^<]*?)\s*<\/h1>/g)].map((m) => m[1])
  if (izid.length < 2 || !/^\d+$/.test(izid[0]) || !/^\d+$/.test(izid[1])) return null
  const rezultat = { domaci: Number(izid[0]), gostje: Number(izid[1]) }
  const { datum, ura } = casZapisnika(glava.match(/Clock Icon">\s*([^<]*?)\s*<\/h4>/)?.[1])

  // Glava: dva bloka "team-goals" (domači, gostje) z imenom kluba in strelci.
  const bloki = glava.split('<div class="team-goals">').slice(1, 3)
  const klubi = bloki.map((b) => {
    const a = b.match(/<h3>\s*<a href="[^"]*\/teams\/([a-z0-9-]+?)-(\d+)"\s*>([^<]*)<\/a>/)
    const strelci = [...b.matchAll(/<p>\s*<i class="fa fa-futbol([^"]*)"><\/i>\s*([\s\S]*?)<\/p>/g)].map((m) => {
      const t = razpakiraj(m[2].replace(/<[^>]+>/g, ' '))
      const mm = t.match(/^(.*?)\s*\((\d+)(?:\s*\+\s*(\d+))?\s*min\.?\)/)
      return {
        ime: mm ? mm[1].trim() : t,
        min: mm?.[2] ?? null,
        dodatek: mm?.[3] ?? 0,
        enajstmetrovka: /\(pen\.?\)/i.test(t),
        avtogol: /\(o\.?\s*g\.?\)/i.test(t) || /text-white/.test(m[1]),
      }
    })
    return { ime: razpakiraj(a?.[3] ?? '').trim(), klubId: a?.[2] ?? null, strelci }
  })

  const igralciDel = s.slice(s.indexOf('id="match-players"'))
  const stolpci = s.includes('id="match-players"') ? igralciDel.split('<div class="col-12 col-lg-6">').slice(1, 3) : []
  const ekipe = [0, 1].map((idx) => {
    const st = stolpci[idx] ?? ''
    const [postavaHtml, rezerveHtml = ''] = st.split(/<h3 class="title[^"]*">\s*Substitutes\s*<\/h3>/)
    return {
      ime: klubi[idx]?.ime ?? '',
      postava: igralciBloka(postavaHtml, true),
      rezerve: igralciBloka(rezerveHtml, false),
    }
  })

  const opozorila = []
  const sumljiva = new Set()
  const min = (m, d, kaj) => {
    const r = minutaVira(m, d)
    if (r.sumljiva) sumljiva.add(`${kaj} ${m}'`)
    return r.minuta
  }
  const vsi = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve]
  const oseba = (idx, i, minuta) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt, minuta })

  // Goli: pod klubom, ki mu gol šteje. Avtogol je strelec NASPROTNE ekipe;
  // ekipaIdx je ekipa strelca (kot pri drugih virih), avtogol: true.
  const goli = []
  let brezStrelca = 0
  klubi.forEach((k, zaIdx) => {
    for (const g of k?.strelci ?? []) {
      const strelcevIdx = g.avtogol ? 1 - zaIdx : zaIdx
      const minuta = min(g.min, g.dodatek, 'gol')
      const i = najdiIgralca(vsi(strelcevIdx), g.ime)
      if (i) { goli.push({ ...oseba(strelcevIdx, i, minuta), avtogol: g.avtogol, enajstmetrovka: g.enajstmetrovka && !g.avtogol }); continue }
      if (!g.avtogol) brezStrelca++
      opozorila.push(`${g.avtogol ? 'avtogol' : 'gol'} v ${g.min}. minuti: strelca "${g.ime}" ni v postavi`)
      goli.push({ ekipaIdx: strelcevIdx, st: null, ime: null, regSt: null, minuta, avtogol: g.avtogol, enajstmetrovka: false })
    }
  })

  // Menjave: pri igralcu, ki gre ven, je ime tistega, ki pride noter.
  const menjave = []
  ekipe.forEach((e, idx) => {
    for (const ven of vsi(idx)) {
      for (const m of ven.menjave) {
        const noter = najdiIgralca(e.rezerve, m.noter)
        const minuta = min(m.min, m.dodatek, 'menjava')
        if (!noter) opozorila.push(`${e.ime}: menjava v ${m.min}. minuti — "${m.noter}" ni med rezervami`)
        const brez = { st: null, ime: null, regSt: null }
        menjave.push({
          ekipaIdx: idx,
          minuta,
          noter: noter ? { st: noter.st, ime: noter.ime, regSt: noter.regSt } : brez,
          ven: { st: ven.st, ime: ven.ime, regSt: ven.regSt },
        })
      }
    }
  })
  menjave.sort((a, b) => a.ekipaIdx - b.ekipaIdx || (a.minuta ?? 999) - (b.minuta ?? 999))
  // Identiteta igralca: šifra, igralec brez profila pa ime.
  const kdo = (i) => (i?.regSt != null ? `r${i.regSt}` : i?.ime ? `i${i.ime}` : null)
  // Menjave po vrsti: kdor gre ven, mora biti na igrišču, kdor pride, ne.
  ekipe.forEach((e, idx) => {
    const igra = new Set(e.postava.map(kdo))
    for (const x of menjave.filter((y) => y.ekipaIdx === idx && y.minuta != null)) {
      if (!igra.has(kdo(x.ven))) opozorila.push(`${e.ime}: menjava v ${x.minuta}. minuti — ${x.ven.ime} gre ven, a ni na igrišču`)
      if (kdo(x.noter) && igra.has(kdo(x.noter))) opozorila.push(`${e.ime}: menjava v ${x.minuta}. minuti — ${x.noter.ime} pride, a je že na igrišču`)
      igra.delete(kdo(x.ven))
      if (kdo(x.noter)) igra.add(kdo(x.noter))
    }
  })
  // Rezerva, ki zamenja začetnega vratarja, je vratar.
  for (const m of menjave) {
    const venVratar = ekipe[m.ekipaIdx].postava.find((i) => kdo(i) === kdo(m.ven) && i.vratar)
    const noter = venVratar && ekipe[m.ekipaIdx].rezerve.find((i) => kdo(i) === kdo(m.noter))
    if (noter) noter.vratar = true
  }
  // Žogice pri igralcu (črna = gol, rdeča = avtogol) morajo pritrditi glavi.
  ekipe.forEach((e, idx) => {
    for (const i of vsi(idx)) {
      const g = goli.filter((x) => x.ekipaIdx === idx && kdo(x) === kdo(i))
      if (g.filter((x) => !x.avtogol).length !== i.zogice || g.filter((x) => x.avtogol).length !== i.avtogoli)
        opozorila.push(`${e.ime}: ${i.ime} ima v postavi ${i.zogice} golov in ${i.avtogoli} avtogolov, v glavi ${g.filter((x) => !x.avtogol).length} in ${g.filter((x) => x.avtogol).length}`)
    }
  })
  // Kartoni: ikona pri igralcu, brez minute. Rumeni + rdeči (drugi rumeni ali
  // rumeni in nato rdeči) je 1 rumeni + 1 rdeči, kot pri drugih virih.
  // Izključeni brez minute igra v nastopih do konca ali do menjave.
  const rumeni = []
  const rdeci = []
  ekipe.forEach((e, idx) => {
    for (const i of vsi(idx)) {
      if (i.rumenih) rumeni.push(oseba(idx, i, null))
      if (i.rdecih) rdeci.push(oseba(idx, i, null))
      if (i.rumenih > 1 && !i.rdecih) opozorila.push(`${e.ime}: ${i.ime} ima ${i.rumenih} rumena kartona brez rdečega`)
    }
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  const razlogi = []
  ekipe.forEach((e) => {
    if (e.postava.length !== 11) razlogi.push(`${e.ime} — ${e.postava.length} začetnikov`)
  })
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    razlogi.push(`goli iz glave ${zaEkipo(0)}:${zaEkipo(1)}, izid ${rezultat.domaci}:${rezultat.gostje}`)
  if (brezStrelca) razlogi.push(`${brezStrelca} golov brez strelca v postavi`)
  const nepopoln = razlogi.length > 0
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${razlogi.join('; ')}`)
  if (sumljiva.size) opozorila.push(`minute izven razpona vira (46–90 ali nad 135): ${[...sumljiva].join(', ')}`)
  ekipe.forEach((e, idx) => {
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (e.postava.length && vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev v postavi je ${vratarjev}`)
    if (e.postava.length && e.rezerve.length && !menjave.some((x) => x.ekipaIdx === idx))
      opozorila.push(`${e.ime}: brez menjav (${e.rezerve.length} rezerv)`)
  })

  const vObliko = ({ st, ime, regSt, vratar }) => ({ st, ime, regSt, vratar, pozicija: vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(datum),
    krog: null,
    datum,
    ura,
    domaci: { ime: ekipe[0].ime, klubId: klubi[0]?.klubId ?? null, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, klubId: klubi[1]?.klubId ?? null, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    opozorila,
  }
}

/** Nastopi po šifri osebe (kot oefb in modular11). */
export const nastopi = (z) => nastopiPoSifri(z)

// --- klubi ------------------------------------------------------------------------

// Vzdevki: levo ključ, kot ga piše vir, desno ključ, pod katerim klub že
// poznamo. Dodaj le videne. Zapisnik piše sponzorsko ime ("FCB Magpies"),
// razpored pa ne — uvoz vzame ime iz razporeda.
// - Mons Calpe SC (2025/26) je od 2026/27 "Mons Calpe FC" (rezervna ekipa še
//   "Mons Calpe Sports Club Reserves"); COMET mu je dal nov id ekipe.
// - Intermediate League 2025/26 je predhodnica Reserve League 2026/27; tri
//   ekipe so se tam že imenovale "Intermediate", ostale "Reserves".
const ISTI_KLUB_GI = {
  'mons calpe sc': 'mons calpe fc',
  'lynx fc intermediate': 'lynx fc reserves',
  'europa point fc intermediate': 'europa point fc reserves',
}

export const kljucKlubaGi = (ime) => {
  const k = norm(ime)
  return ISTI_KLUB_GI[k] ?? k
}

const OBLIKE_GI = new Set(['fc', 'afc', 'cf', 'sc'])

/**
 * Kratko ime: brez "FC"/"Sports Club", največ tri besede; rezervna ekipa
 * obdrži oznako ("Lincoln Red Imps Res."), da je ne zamenjamo s prvo.
 * "St Joseph's FC" → "St Joseph's", "College 1975 FC" → "College 1975".
 */
export function kratkoImeGi(polno) {
  const vse = razpakiraj(polno).trim().split(/\s+/).filter(Boolean)
  const rezerve = /^reserves?$/i.test(vse.at(-1) ?? '')
  let b = rezerve ? vse.slice(0, -1) : vse
  b = b.filter((x) => !OBLIKE_GI.has(x.toLowerCase().replace(/\./g, '')))
  if (/^sports$/i.test(b.at(-2) ?? '') && /^club$/i.test(b.at(-1) ?? '')) b = b.slice(0, -2)
  if (!b.length) b = vse
  return rezerve ? `${b.slice(0, 3).join(' ')} Res.` : b.slice(0, 3).join(' ')
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
    if (jeZavrnitev(e.status)) throw new GfaZavrnitev(`gfa: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new GfaZavrnitev(`gfa: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/** Strani `/matches` vseh faz (vedno sveže; napačna stran ustavi uvoz). */
async function straniTekem(koda, prenesi) {
  const strani = []
  for (const { pot } of razbijKodo(koda)) {
    const html = await beri(prenesi, naslovTekem(pot), imeTekem(pot), true)
    if (!jeStranTekem(html)) throw new Error(`gfa: ${naslovTekem(pot)} ni seznam tekem — uvoz ustavljen`)
    strani.push(html)
  }
  return strani
}

/** Zapisnik iz predpomnilnika (le cel), sicer null. */
const shranjen = (id, mapa = MAPA) => {
  const p = `${mapa}/${imeZapisnika(id)}`
  if (!existsSync(p)) return null
  const html = readFileSync(p, 'utf8')
  return jeCelZapisnik(html) ? html : null
}

/**
 * Seznam tekem nima datuma odigranih tekem: preberemo ga z zapisnika —
 * iz predpomnilnika (isti, kot ga polni uvoz zapisnikov), sicer z vira.
 * Odigrana tekma brez zapisnika ostane brez datuma.
 */
export async function dopolniDatume(tekme, prenesi, { mapa = MAPA } = {}) {
  for (const t of tekme) {
    if (t.datum || !t.izid || !t.id) continue
    let html = shranjen(t.id, mapa)
    if (!html) html = await beri(prenesi, naslovZapisnika(t.pot, t.id), imeZapisnika(t.id), true)
    const { datum, ura } = casZapisnika(String(html ?? '').match(/Clock Icon">\s*([^<]*?)\s*<\/h4>/)?.[1])
    t.datum = datum
    t.ura = ura
  }
  return tekme
}

const vir = {
  ime: 'gfa',
  polnoIme: 'Gibraltar Football Association (gibraltarfa.com)',
  drzava: 'GI',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: (koda) => naslovTekem(razbijKodo(koda)[0].pot),
  naslovZapisnika: (koda, id) => naslovZapisnika(razbijKodo(koda)[0].pot, id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new GfaZavrnitev(`gfa: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // V predpomnilnik gre seznam tekem in CEL zapisnik — prazen (tekma še ni
  // vnesena) se prebere znova.
  zaPredpomnilnik: (html) => jeStranTekem(html) || jeCelZapisnik(html),
  razporedBrezUvodnegaPrenosa: true,

  async razporedVseStrani(koda, prenesi) {
    const tekme = tekmeFaz(koda, await straniTekem(koda, prenesi))
    return razcleniTekme(await dopolniDatume(tekme, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const out = []
    for (const t of tekmeFaz(koda, await straniTekem(koda, prenesi)).filter((x) => x.izid && x.id)) {
      const url = naslovZapisnika(t.pot, t.id)
      const ime = imeZapisnika(t.id)
      let html = await beri(prenesi, url, ime, false)
      let z = vZapisnik(html, { id: t.id, url })
      // Nepopoln zapisnik do 45 dni po tekmi beremo znova sveže (prazen ne
      // gre v predpomnilnik, zato je bil pravkar prebran z vira).
      if (z?.nepopoln && starostDni(z.datum) <= 45) {
        html = await beri(prenesi, url, ime, true)
        z = vZapisnik(html, { id: t.id, url })
      }
      if (!z) continue
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid seznama ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaGi,
  kratkoIme: kratkoImeGi,
  poenostavi: kljucKlubaGi,
}

export default vir
