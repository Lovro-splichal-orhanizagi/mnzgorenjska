// Vir: Knattspyrnusamband Íslands — ksi.is (mót, leikskýrslur).
//
// KSÍ vodi vsa islandska tekmovanja v COMET (comet.ksi.is, za prijavo) in jih
// objavi na ksi.is (Astro, HTML iz strežnika). robots.txt: "Allow: /" za vse.
// Glej CLAUDE.md (Islandija — vir `ksi`).
//
// SEZONA je koledarsko leto (april–oktober): 2026 = "2026", ne "2026/27"
// (`competitions.sezona_koledarska`). Vir jo vzame iz izbirnika sezone na
// strani tekmovanja ("2026 - 2. deild karla 2026").
//
// ŠIFRA LIGE je id tekmovanja (`/oll-mot/mot?id=<id>`), vsaka sezona ima
// svojega (2. deild 2026 = 7025548, 2025 = 190365). Ob novi sezoni se šifra
// popravi. Liga z več fazami (Besta deild: osnovni del 22 krogov, nato
// "Efri hluti" in "Neðri hluti" po 5 krogov) našteje tekmovanja s `+`:
// `7025510+7025527+7025532`; kroge poznejše faze zamakne za zadnji krog
// faze, iz katere so prišli njeni klubi (kot `oefb`). Izpadni deli (Umspil,
// "5. deild - Úrslit") nimajo krogov in se ne pripnejo.
//
// RAZPORED: stran kroga `?id=<id>&banner-tab=matches-and-results&toggle=rounds
// &round=<n>` (izbirnik "Umferð N" pove, koliko krogov je, in kateri je
// izbran). Tekma: dan brez letnice ("Lau 12. september 14:00", **islandski
// čas = UTC** → ljubljanski +2 poleti, +1 pozimi), igrišče, klub s šifro
// (`/oll-mot/mot/lid?id=<lid>`), izid "2 - 1" ali "-" in povezava
// `/leikir-og-urslit/felagslid/leikur?id=<id>`.
//
// ZAPISNIK `…/leikur?id=<id>&banner-tab=report` ("Leikskýrsla"): glava
// (tekmovanje / "16. umferð", "Fim 27. ágúst 2026 18:00", izid `<h1>`,
// strelci v dveh stolpcih — levo goli domačih, desno gostov, "(sjálfsmark)"
// je avtogol igralca nasprotne ekipe), nato "Byrjunarlið" (začetniki) in
// "Varamenn" (klop) v ploščah `data-panel="home"` / `"away"`, vsak igralec s
// povezavo `/leikmenn/leikmadur?id=<id>` (stalna šifra osebe → `reg_st`),
// dresom, imenom z "(M)" = vratar (markmaður) in "(F)" = kapetan (fyrirliði)
// ter ikonami z minuto: žoga (gol), rumeni (`bg-[#FAC83C]`), rdeči, zelena
// puščica (vstop), rdeča puščica (izstop). "Liðstjórn" (vodstvo) in
// "Dómarar" (sodniki) ne beremo.
//
// Beremo odkrito (User-Agent SLFF, 3 s med zahtevki, zapisnikov, starejših od
// tedna, ne beremo znova). Ob izzivu, CAPTCHI, 401, 403 ali 429 se uvoz
// ustavi (`KsiZavrnitev`, izhod 4) — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'

const OSNOVNI = 'https://www.ksi.is'
const DOLZINA_TEKME = 90

/** "7025510+7025527" → ['7025510', '7025527']. */
export function razbijKodo(koda) {
  const s = String(koda ?? '').trim()
  if (!/^\d+(\+\d+)*$/.test(s)) throw new Error(`ksi: šifra lige je id tekmovanja "<id>[+<id>…]" (npr. 7025548), ne "${koda}"`)
  return s.split('+')
}

export const naslovKroga = (id, krog = null) =>
  `${OSNOVNI}/oll-mot/mot?id=${id}&banner-tab=matches-and-results&toggle=rounds${krog ? `&round=${krog}` : ''}`
export const naslovLige = (koda) => naslovKroga(razbijKodo(koda)[0])
// Šifra zapisnika v bazi je `is<id>`: id tekme COMET je enoličen le znotraj
// ene zveze (lff, fss imajo svoj COMET), `matches.zapisnik_id` pa čez vse vire.
export const sifraZapisnika = (id) => `is${String(id).replace(/^is/, '')}`
export const naslovZapisnika = (id) => `${OSNOVNI}/leikir-og-urslit/felagslid/leikur?id=${String(id).replace(/^is/, '')}&banner-tab=report`
const imeKroga = (id, krog) => `mot-${id}-k${krog ?? 0}.html`
const imeZapisnika = (id) => `leikur-${String(id).replace(/^is/, '')}.html`

const cisto = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class KsiZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'KsiZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/**
 * Sme stran v predpomnilnik? Le prava stran tekmovanja (izbirnik sezone) ali
 * tekme (glava `match-banner` s klubom in zavihek "Leikskýrsla"). Stran napake
 * ali vzdrževanja s statusom 200 ne sme obveljati — uvoz je ne shrani in
 * shranjene ne bere. Strani napake ksi.is (500 "Bilun í kerfinu okkar", 404
 * "Síða finnst ekki!") nosijo zavihke tekme z `banner-tab=report"`, glave
 * tekme pa ne.
 */
export const zaPredpomnilnik = (html) => {
  const s = String(html ?? '')
  return /<option value="\d+" selected>/.test(s) ||
    (/class="match-banner/.test(s) && /\/oll-mot\/mot\/lid\?id=\d+/.test(s) && /banner-tab=report"/.test(s))
}

/** "64´" → 64, "45+2´" → 45, "90+4´" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

const MESECI = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember']

/**
 * Islandski čas (UTC, brez poletnega časa) → ljubljanski: { datum, ura }.
 * "2026-08-27", "18:00" → 20:00 (poletni čas), "2026-11-07", "14:00" → 15:00.
 */
export function vLjubljanskiCas(datum, ura) {
  const u = String(ura ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!datum || !u) return { datum: datum ?? null, ura: null }
  const t = new Date(`${datum}T${u[1].padStart(2, '0')}:${u[2]}:00Z`)
  const deli = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(t).map((p) => [p.type, p.value]),
  )
  return { datum: `${deli.year}-${deli.month}-${deli.day}`, ura: `${deli.hour}:${deli.minute}` }
}

/**
 * "Lau 12. september  14:00" (+ leto sezone) ali "Fim 27. ágúst 2026 18:00"
 * → ljubljanski { datum, ura }. Brez ure ("00:00" ni znak brez ure, ampak
 * polnoč — na ksi.is tekme brez ure nismo videli) ostane le datum.
 */
export function datumUra(niz, leto = null) {
  const m = String(niz ?? '').match(/(\d{1,2})\.\s*([a-záéíóúýþæðö]+)\s*(\d{4})?\s*(?:(\d{1,2}):(\d{2}))?/i)
  if (!m) return { datum: null, ura: null }
  const i = MESECI.indexOf(m[2].toLowerCase())
  const y = m[3] ?? leto
  if (i < 0 || !/^\d{4}$/.test(String(y ?? ''))) return { datum: null, ura: null }
  const datum = `${y}-${String(i + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return m[4] ? vLjubljanskiCas(datum, `${m[4]}:${m[5]}`) : { datum, ura: null }
}

// --- stran tekmovanja ----------------------------------------------------------

/** Izbrana sezona in ime: { id, leto, ime } iz izbirnika "Veldu" ("2026 - 2. deild karla 2026"). */
export function izbranoTekmovanje(html) {
  const m = String(html ?? '').match(/<option value="(\d+)" selected>\s*(\d{4})\s*-\s*([^<]*?)\s*</)
  return m ? { id: m[1], leto: m[2], ime: razpakiraj(m[3]) } : null
}

/** Številke krogov iz izbirnika "Umferð N" in izbrani krog. */
export function krogiStrani(html) {
  const s = String(html ?? '')
  const vsi = [...new Set([...s.matchAll(/toggle=rounds&amp;round=(\d+)"/g)].map((m) => Number(m[1])))].sort((a, b) => a - b)
  const izbran = Number(s.match(/link-dropdown-trigger[^>]*>\s*<span[^>]*>\s*Umferð\s+(\d+)\s*<\/span>/)?.[1]) || null
  return { vsi, izbran }
}

/** Tekme ene strani kroga: [{ id, datum, ura, domaci, gostje, domaciId, gostjeId, izid, igrisce }]. */
export function tekmeStrani(html, leto) {
  const s = cisto(html)
  const out = []
  const kosi = s.split(/<div class="grid grid-cols-\[70%_auto\][^"]*">/).slice(1)
  for (const k of kosi) {
    const id = k.match(/\/leikir-og-urslit\/felagslid\/leikur\?id=(\d+)/)?.[1]
    const klubi = [...k.matchAll(/<a href="\/oll-mot\/mot\/lid\?id=(\d+)&amp;competitionId=\d+" class="flex flex-col[^"]*">([\s\S]*?)<\/a>/g)].map((m) => ({
      id: m[1],
      ime: imeKluba(besedilo(m[2].match(/<span class="body-4[^"]*">([\s\S]*?)<\/span>/)?.[1])),
    }))
    if (!id || klubi.length !== 2) continue
    const izidNiz = besedilo(k.match(/<span class="body-4 whitespace-nowrap">([\s\S]*?)<\/span>/)?.[1])
    const iz = izidNiz.match(/^(\d+)\s*-\s*(\d+)$/)
    const dan = besedilo(k.match(/<span class="body-5">([^<]*\d{1,2}:\d{2}[^<]*|[^<]*\d+\.\s*[a-záéíóúýþæðö]+[^<]*)<\/span>/i)?.[1])
    const { datum, ura } = datumUra(dan, leto)
    out.push({
      id,
      datum,
      ura,
      domaci: klubi[0].ime,
      gostje: klubi[1].ime,
      domaciId: klubi[0].id,
      gostjeId: klubi[1].id,
      izid: iz ? { domaci: Number(iz[1]), gostje: Number(iz[2]) } : null,
      izidNiz,
    })
  }
  return out
}

/**
 * Ime kluba brez pripone kategorije: arhiv 2025 piše nekatere ekipe kot
 * "KFA Fullorðnir Karlar" (odrasli moški), 2026 le "KFA" — isti klub.
 */
export const imeKluba = (ime) => String(ime ?? '').replace(/\s+Fullorðnir(\s+Karlar)?\s*$/i, '').trim()

/** Ključ šifre igralca iz povezave, za vzorce in preverbe. */
const dres = (s) => (/^\d+$/.test(String(s ?? '').trim()) ? Number(String(s).trim()) : null)

/**
 * Vse tekme ene faze (tekmovanja): prebere prvo stran kroga (izbirnik) in
 * nato vsak krog. `beriStran(url, ime, krog)` vrne HTML. Izbrana sezona mora
 * biti iskana: neznan id stran tiho zamenja z drugim tekmovanjem.
 */
export async function tekmeFaze(id, beriStran) {
  const prva = await beriStran(naslovKroga(id), imeKroga(id, 0), null)
  const izbrano = izbranoTekmovanje(prva)
  if (!izbrano || izbrano.id !== String(id))
    throw new Error(`ksi: ${naslovKroga(id)} kaže tekmovanje ${izbrano?.id ?? '?'}, ne ${id} — uvoz ustavljen`)
  const { vsi, izbran } = krogiStrani(prva)
  const out = []
  for (const krog of vsi) {
    const html = krog === izbran ? prva : await beriStran(naslovKroga(id, krog), imeKroga(id, krog), krog)
    const k = krogiStrani(html)
    if (k.izbran !== krog) throw new Error(`ksi: ${naslovKroga(id, krog)} kaže krog ${k.izbran ?? '?'}, ne ${krog} — uvoz ustavljen`)
    const tu = izbranoTekmovanje(html)
    if (tu?.id !== String(id))
      throw new Error(`ksi: ${naslovKroga(id, krog)} kaže tekmovanje ${tu?.id ?? '?'}, ne ${id} — uvoz ustavljen`)
    for (const t of tekmeStrani(html, izbrano.leto)) out.push({ ...t, krog, tekmovanje: String(id) })
  }
  return { leto: izbrano.leto, ime: izbrano.ime, tekme: out }
}

/**
 * Faze lige v eno zaporedje krogov. Krogi poznejše faze se zamaknejo za zadnji
 * krog faze, iz katere so prišli njeni klubi (Besta deild: osnovni del 1–22,
 * Efri in Neðri hluti oba 23–27). Poznejša faza sme imeti le klube prejšnjih
 * faz: faza brez skupnega kluba (napačna šifra) bi dobila kroge 1..N in se
 * pomešala z osnovnim delom, mešana (5. deild Úrslit: klubi skupin A in B,
 * Umspil s klubom druge lige) pa bi v ligo pripeljala tuje igralce — ustavi.
 * Faza še brez tekem (objavljena pozneje) ne doda ničesar.
 */
export function zdruziFaze(faze) {
  const zamiki = []
  const out = []
  const prejsnji = new Set()
  faze.forEach((f, i) => {
    const klubi = new Set(f.tekme.flatMap((t) => [t.domaciId, t.gostjeId]))
    if (i > 0 && klubi.size) {
      const tuji = [...klubi].filter((k) => !prejsnji.has(k))
      if (tuji.length === klubi.size)
        throw new Error(`ksi: faza ${i + 1} nima nobenega kluba iz prejšnjih faz — preveri šifro lige; uvoz ustavljen`)
      if (tuji.length)
        throw new Error(`ksi: faza ${i + 1} ima klub ${tuji.join(', ')}, ki ga prejšnje faze nimajo (mešana faza?) — uvoz ustavljen`)
    }
    for (const k of klubi) prejsnji.add(k)
    let zamik = 0
    for (let j = 0; j < i; j++) {
      const skupni = faze[j].tekme.some((t) => klubi.has(t.domaciId) || klubi.has(t.gostjeId))
      if (skupni) zamik = Math.max(zamik, zamiki[j] + Math.max(0, ...faze[j].tekme.map((t) => t.krog)))
    }
    zamiki.push(zamik)
    for (const t of f.tekme) out.push({ ...t, krog: t.krog + zamik, faza: i })
  })
  const leta = new Set(faze.map((f) => f.leto))
  if (leta.size > 1) throw new Error(`ksi: faze lige so iz različnih sezon (${[...leta].join(', ')}) — uvoz ustavljen`)
  return { leto: faze[0]?.leto ?? null, tekme: out }
}

/** Razpored v obliko uvoza razporeda. Kontumacijo najde `kontumacije` (zapisnik brez postav). */
export function vKroge(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      // Za `kontumacije` in preverbe: id tekme, izid, šifri klubov.
      ksiId: t.id, izid: t.izid, izidNiz: t.izidNiz, domaciId: t.domaciId, gostjeId: t.gostjeId,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------

/** Vrsta ikone ob igralcu. */
function vrstaIkone(ik) {
  if (/stroke="#1A7941"/i.test(ik)) return 'noter'
  if (/stroke="#DD3636"/i.test(ik)) return 'ven'
  const bg = ik.match(/bg-\[#([0-9A-Fa-f]{6})\]/)?.[1]?.toUpperCase()
  if (bg === 'FAC83C') return 'rumeni'
  if (bg === 'DD3636') return 'rdeci'
  if (bg) return `barva-${bg}`
  if (/<svg[\s\S]*?M6\.58 14\.66/.test(ik)) return 'gol'
  if (/<svg/.test(ik)) return 'svg'
  return 'prazno'
}

/** Igralci ene plošče (začetniki ali klop ene ekipe). */
function igralciPlosce(del, zacetnik) {
  const out = []
  for (const m of del.matchAll(/<a href="\/leikmenn\/leikmadur\?id=(\d+)"[\s\S]*?<\/a>/g)) {
    const a = m[0]
    const st = dres(a.match(/<span class="body-5[^"]*w-\[20rem\][^"]*">([^<]*)<\/span>/)?.[1])
    const polno = besedilo(a.match(/<span class="body-4 l:inline[^"]*">([\s\S]*?)<\/span>/)?.[1])
    const ime = polno.replace(/\((?:M|F)\)/g, '').replace(/\s+/g, ' ').trim()
    const ikone = a.split(/aspect-square rounded-full/).slice(1).map((ik) => ({
      vrsta: vrstaIkone(ik.split(/<\/div>\s*<\/div>/)[0] + '</div>'),
      minuta: minuta(ik.match(/body-6">\s*([^<]*?)\s*<\/div>/)?.[1]),
    }))
    out.push({
      st,
      ime: vPriimekIme(ime),
      polnoIme: ime,
      regSt: Number(m[1]),
      vratar: /\(M\)/.test(polno),
      kapetan: /\(F\)/.test(polno),
      zacetnik,
      ikone,
    })
  }
  return out
}

/** Postavi: [{ postava, rezerve }, { postava, rezerve }] ali null. */
function postavi(s) {
  const z = s.search(/>\s*Byrjunarlið\s*<\/span>/)
  const v = s.search(/>\s*Varamenn\s*<\/span>/)
  if (z < 0) return null
  const konec = s.search(/>\s*Liðstjórn\s*<\/span>/)
  const ekipe = [{ postava: [], rezerve: [] }, { postava: [], rezerve: [] }]
  const odseki = [
    [z, v > z ? v : konec > z ? konec : s.length, true],
    ...(v > z ? [[v, konec > v ? konec : s.length, false]] : []),
  ]
  for (const [od, do_, zacetnik] of odseki) {
    const del = s.slice(od, do_)
    // Plošče si sledijo: glava (home, away), nato igralci domačih, nato gostov.
    const kosi = del.split(/data-panel="(home|away)"/)
    for (let i = 1; i < kosi.length; i += 2) {
      const idx = kosi[i] === 'home' ? 0 : 1
      ekipe[idx][zacetnik ? 'postava' : 'rezerve'].push(...igralciPlosce(kosi[i + 1], zacetnik))
    }
  }
  return ekipe
}

/** Strelci iz glave: [[{ ime, minuta, avtogol, enajstmetrovka }…] domači, […] gostje]. */
function strelciGlave(s) {
  const i = s.indexOf('grid grid-cols-[1fr_auto_1fr] gap-[18rem]')
  if (i < 0) return [[], []]
  const del = s.slice(i, s.indexOf('banner-tabs', i))
  const levo = del.match(/<div class="flex flex-col items-end">([\s\S]*?)<\/div>\s*<\/div>\s*<svg/)?.[1] ?? del.split('flex flex-col items-start')[0]
  const desno = del.split('flex flex-col items-start')[1] ?? ''
  // Igralec z več goli ima eno vrstico: "10´, 45´ (vítaspyrna)".
  const beri = (html) =>
    [...String(html).matchAll(/<span>([^<]*)<\/span>\s*<span class="text-navy-secondary-text[^"]*">([^<]*)<\/span>/g)].flatMap((m) =>
      razpakiraj(m[2]).split(',').map((kos) => {
        const opomba = kos.replace(/\s+/g, ' ').trim()
        return {
          ime: besedilo(m[1]),
          minuta: minuta(opomba),
          avtogol: /sjálfsmark/i.test(opomba),
          enajstmetrovka: /víti|vítaspyrn/i.test(opomba),
          opomba,
        }
      }),
    )
  return [beri(levo), beri(desno)]
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida ali
 * kateri od ekip manjka postava (neodigrana tekma, kontumacija).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = cisto(html)
  const iz = besedilo(s.match(/<h1 class="headline-1[^"]*">([\s\S]*?)<\/h1>/)?.[1]).match(/^(\d+)\s*-\s*(\d+)$/)
  if (!iz) return null
  const rezultat = { domaci: Number(iz[1]), gostje: Number(iz[2]) }
  const p = postavi(s)
  if (!p || !p[0].postava.length || !p[1].postava.length) return null
  const imena = [...s.matchAll(/<a class="flex flex-col items-center gap-\[12rem\] group" href="\/oll-mot\/mot\/lid\?id=\d+[^"]*">[\s\S]*?<span class="body-4[^"]*">([\s\S]*?)<\/span>/g)].map((m) => besedilo(m[1]))
  const ekipe = p.map((e, idx) => ({ ime: imena[idx] ?? '', ...e }))

  const opozorila = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  const kdo = (ekipaIdx, i, m) => ({ ekipaIdx, st: i.st, ime: i.ime, regSt: i.regSt, minuta: m })
  for (const [ekipaIdx, e] of ekipe.entries()) {
    for (const i of [...e.postava, ...e.rezerve]) {
      for (const d of i.ikone) {
        if (d.minuta == null) opozorila.push(`${e.ime}: dogodek "${d.vrsta}" pri ${i.ime} brez minute`)
        if (d.vrsta === 'rumeni') {
          // Drugi rumeni (dva rumena in rdeči): ostaneta prvi rumeni in rdeči, kot pri drugih virih.
          const vsiRumeni = i.ikone.filter((x) => x.vrsta === 'rumeni')
          if (vsiRumeni.length >= 2 && d === vsiRumeni.at(-1) && i.ikone.some((x) => x.vrsta === 'rdeci')) continue
          rumeni.push(kdo(ekipaIdx, i, d.minuta))
        } else if (d.vrsta === 'rdeci') {
          // "0´" je rdeči po končani tekmi (ali brez minute): igralcu minut ne skrajša.
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.regSt === i.regSt))
            rdeci.push(kdo(ekipaIdx, i, d.minuta === 0 ? DOLZINA_TEKME : d.minuta))
        } else if (d.vrsta === 'noter' || d.vrsta === 'ven') {
          const x = { st: i.st, ime: i.ime, regSt: i.regSt }
          const brez = { st: null, ime: null, regSt: null }
          menjave.push({ ekipaIdx, minuta: d.minuta, noter: d.vrsta === 'noter' ? x : brez, ven: d.vrsta === 'ven' ? x : brez })
        } else if (d.vrsta === 'gol' || d.vrsta === 'prazno') {
          // Gol in avtogol beremo iz glave (ta pove tudi vrsto); prazna ikona je avtogol.
        } else opozorila.push(`${e.ime}: neznana ikona "${d.vrsta}" pri ${i.ime} (${d.minuta}.)`)
      }
    }
  }

  // Goli iz glave: stolpec je ekipa, ki ji gol šteje; avtogol je dal igralec nasprotne.
  const strelci = strelciGlave(s)
  for (const [za, seznam] of strelci.entries()) {
    for (const g of seznam) {
      const ekipaIdx = g.avtogol ? 1 - za : za
      const najdi = (idx) => [...ekipe[idx].postava, ...ekipe[idx].rezerve].filter((i) => i.polnoIme === g.ime)
      let kandidati = najdi(ekipaIdx)
      let idx = ekipaIdx
      if (!kandidati.length && najdi(1 - ekipaIdx).length) {
        idx = 1 - ekipaIdx
        kandidati = najdi(idx)
        opozorila.push(`gol ${g.ime} (${g.minuta}.): strelec je v drugi ekipi — avtogol brez oznake?`)
      }
      if (kandidati.length !== 1) {
        opozorila.push(`gol ${g.ime} (${g.minuta}.): strelca ${kandidati.length ? 'ni mogoče ločiti' : 'ni v postavi'}`)
        if (!kandidati.length) continue
      }
      const avtogol = idx !== za
      goli.push({ ...kdo(idx, kandidati[0], g.minuta), avtogol, enajstmetrovka: g.enajstmetrovka && !avtogol })
      if (g.opomba && !/^\d+(\+\d+)?´?\s*(\((sjálfsmark|víti|vítaspyrna)\))?$/i.test(g.opomba.replace(/\s+/g, ' ')))
        opozorila.push(`gol ${g.ime}: neznana oznaka "${g.opomba}"`)
    }
  }

  // Preverba: žoga v postavi je navaden gol ali 11 m, prazna ikona avtogol.
  for (const [ekipaIdx, e] of ekipe.entries()) {
    for (const i of [...e.postava, ...e.rezerve]) {
      const zoge = i.ikone.filter((d) => d.vrsta === 'gol' || d.vrsta === 'prazno').length
      const vGlavi = goli.filter((g) => g.ekipaIdx === ekipaIdx && g.regSt === i.regSt).length
      if (zoge !== vGlavi) opozorila.push(`${e.ime}: ${i.ime} ima ${zoge} ikon gola, glava pa ${vGlavi} golov`)
    }
  }

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  for (const e of ekipe) {
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev (M) v postavi je ${vratarjev}`)
    const sifre = new Map()
    for (const i of [...e.postava, ...e.rezerve]) sifre.set(i.regSt, (sifre.get(i.regSt) ?? 0) + 1)
    for (const [r, n] of sifre) if (n > 1) opozorila.push(`${e.ime}: igralec ${r} je v zapisniku ${n}-krat`)
  }

  const glava = s.match(/<span[^>]*>([^<]*)\/\s*(\d+)\.\s*umferð\s*<\/span>/)
  // Tekmovanje tekme: edina povezava `/oll-mot/mot?id=<id>"` na strani je v glavi.
  const tekmovanje = s.match(/href="\/oll-mot\/mot\?id=(\d+)"/)?.[1] ?? null
  const { datum, ura } = datumUra(besedilo(s.match(/<span class="body-5">([^<]*\d+\.\s*[^<\d]+\d{4}\s+\d{1,2}:\d{2}\s*)<\/span>/)?.[1]))
  const vObliko = ({ ikone: _i, polnoIme: _p, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    tekmovanje,
    sezona: datum ? datum.slice(0, 4) : null,
    krog: glava ? Number(glava[2]) : null,
    datum,
    ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    // Polčasa stran ne pove.
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Nastopi po šifri osebe (kot oefb, jalgpall): začetnik od 0, rezerva od vstopa. */
export const nastopi = (z) => nastopiPoSifri(z)

// --- klubi ---------------------------------------------------------------------

// Ključ kluba: male črke z islandskimi znaki (á, é, í, ó, ú, ý, þ, æ, ð, ö);
// "Dalvík/Reynir" → "dalvík reynir", "Víkingur Ó." → "víkingur ó".
export const kljucKlubaIs = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('is')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: ksi.is piše že kratko ("Þróttur V.", "KFA"); največ tri besede. */
export const kratkoImeIs = (polno) => razpakiraj(polno).trim().split(/\s+/).slice(0, 3).join(' ')

// --- prenos --------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
export const starostDni = (datum, zdaj = Date.now()) => (datum ? (zdaj - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)
/** Zapisnik zadnjega tedna se še popravlja: vedno sveže. */
export const SVEZE_DNI = 7
/** Do te starosti se nerazčlenjena ali nepopolna stran iz predpomnilnika prebere še enkrat. */
export const PONOVNO_DNI = 45
const golovSeNeUjema = (z) => z.opozorila.some((o) => /^goli iz dogodkov .* se ne ujemajo/.test(o))

/**
 * Zapisnik, ki ne obtiči prazen (kot `zapisnikSvez` v `zapisniki.mjs`):
 * tekma zadnjega tedna se bere sveže; starejša do `PONOVNO_DNI` iz
 * predpomnilnika, a če se ne razčleni ali goli niso izid, še enkrat sveže.
 */
export async function zapisnikSvez(beriStran, razcleni, datum, zdaj = Date.now()) {
  const starost = starostDni(datum, zdaj)
  const sveze = starost <= SVEZE_DNI
  const z = razcleni(await beriStran(sveze))
  if (sveze || starost > PONOVNO_DNI || (z && !golovSeNeUjema(z))) return z
  return razcleni(await beriStran(true)) ?? z
}

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new KsiZavrnitev(`ksi: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new KsiZavrnitev(`ksi: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/**
 * Vse tekme lige (vseh faz). `sveze(krog, html)`: strani kroga uvoza
 * zapisnikov beremo iz predpomnilnika, kadar je krog končan (vse tekme z
 * izidom in starejše od tedna); sicer sveže. Uvoz razporeda bere vedno sveže.
 */
async function tekmeLige(koda, prenesi, { izPredpomnilnika = false } = {}) {
  const faze = []
  for (const id of razbijKodo(koda)) {
    faze.push(await tekmeFaze(id, async (url, ime, krog) => {
      if (!izPredpomnilnika || krog == null) return beri(prenesi, url, ime, true)
      const html = await beri(prenesi, url, ime, false)
      const t = tekmeStrani(html, izbranoTekmovanje(html)?.leto)
      const koncan = t.length && t.every((x) => x.izid && starostDni(x.datum) > SVEZE_DNI) && krogiStrani(html).izbran === krog
      return koncan ? html : beri(prenesi, url, ime, true)
    }))
  }
  return zdruziFaze(faze)
}

const vir = {
  ime: 'ksi',
  polnoIme: 'Knattspyrnusamband Íslands (ksi.is)',
  drzava: 'IS',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new KsiZavrnitev(`ksi: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return vKroge((await tekmeLige(koda, prenesi)).tekme)
  },

  async zapisniki(koda, prenesi) {
    const { leto, tekme } = await tekmeLige(koda, prenesi, { izPredpomnilnika: true })
    const out = []
    const odigrane = tekme.filter((x) => x.izid)
    const padli = []
    for (const t of odigrane) {
      const url = naslovZapisnika(t.id)
      let z
      try {
        z = await zapisnikSvez(
          (sveze) => beri(prenesi, url, imeZapisnika(t.id), sveze),
          (html) => vZapisnik(html, { id: t.id, url }),
          t.datum,
        )
      } catch (e) {
        // Posamezna stran tekme lahko vztrajno vrača 500 (Haukar : Kári 2026,
        // zavihek Leikskýrsla; prenos jo je že ponovil). Tekmo izpustimo z
        // opozorilom — a če jih pade veliko, je to sprememba vira: ustavi.
        if (e.zavrnitev || !(e.status >= 500 || e.status === 404)) throw e
        padli.push(`${t.domaci} : ${t.gostje} (${t.id}, HTTP ${e.status})`)
        if (padli.length > Math.max(5, odigrane.length / 5))
          throw new Error(`ksi: ${padli.length} od ${odigrane.length} zapisnikov ni dosegljivih (${padli.slice(0, 3).join('; ')}) — uvoz ustavljen`)
        console.log(`  ksi: zapisnik ${url} → HTTP ${e.status} — tekmo izpustim`)
        continue
      }
      if (!z) continue
      // Zapisnik mora biti iz tekmovanja (faze), katerega razpored ga našteje.
      if (z.tekmovanje && z.tekmovanje !== t.tekmovanje)
        throw new Error(`ksi: zapisnik ${url} je iz tekmovanja ${z.tekmovanje}, ne ${t.tekmovanje} — uvoz ustavljen`)
      // Ime kluba, krog in sezona z razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = leto ?? z.sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
   * zapisnik nima postav. Bere le take tekme; zapisnik gre v isti
   * predpomnilnik kot pri uvozu zapisnikov.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.ksiId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const url = naslovZapisnika(t.ksiId)
        let html
        try {
          html = await beri(prenesiKrog, url, imeZapisnika(t.ksiId), t.datum)
        } catch (e) {
          // Zavrnitev in izziv ustavita; vztrajna 500 ene tekme (kot pri uvozu
          // zapisnikov) ne sme odnesti kontumacij vse lige.
          if (e.zavrnitev || !(e.status >= 500 || e.status === 404)) throw e
          console.log(`  ksi: zapisnik ${url} → HTTP ${e.status} — kontumacije te tekme ne preverim`)
          continue
        }
        if (!vZapisnik(html) && zaPredpomnilnik(html)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaIs,
  kratkoIme: kratkoImeIs,
  poenostavi: kljucKlubaIs,
}

export default vir
