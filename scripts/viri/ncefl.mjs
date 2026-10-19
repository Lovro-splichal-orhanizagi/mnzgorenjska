// Vir: Northern Counties East Football League (Anglija, step 5–6) —
// www.ncefl.org.uk, lastna stran lige (HTML s strežnika).
//
// STRAN DIVIZIJE `/matches/<divizija>/<leto>/` (`ncelpremierdivision/2026` =
// sezona 2026/27) nosi VSE tekme sezone: odigrane z izidom, polčasom in
// povezavo na zapisnik (`mdteamsheet` → `/matches/day/<LLLL>/<LLLLMMDD>/<id>/`),
// prihodnje z uro ("3:00pm", angleški čas). Tekme so po dnevih (`mddate`),
// **krogov stran ne pozna** — ne na strani divizije ne na zapisniku. Krog je
// zato TEDEN (ponedeljek–nedelja), štet od tedna zadnje julijske sobote
// (`krogIzDatuma`): številka je stalna, ker ne zavisi od drugih tekem, in
// prestavljena tekma gre v teden, v katerem se igra (`krogiPoTednih` v viru:
// uvoz razporeda jo premakne, ne podvoji). Klub ima lahko v tednu dve tekmi
// (torek in sobota) in v kakem tednu nobene.
//
// Posebne vrstice strani divizije:
// - "A-A" je prekinjena tekma. S pripisom "… points awarded …" je odločena
//   za zeleno mizo (kontumacija brez izida), sicer čaka ponovitev (neodigrana).
// - Izid brez zapisnika z razredom `mdnoinfo` in pripisom "unable to field a
//   team - 2-0 win awarded to …" je dodeljena zmaga (kontumacija z izidom).
// - Izstopljen klub ("record expunged following their resignation") s strani
//   izgine skupaj z vsemi tekmami.
//
// ZAPISNIK `/matches/day/…/<id>/`: glava z izidom, polčasom ("HT: 0-1") in
// strelci po imenu z minuto ("Keelan Grist 41, 71", "82pen", "45og" —
// avtogol je pri ekipi, ki ji gol šteje, z imenom nasprotnika); za njo
// "<klub> starting line-up" in "Substitutes" obeh ekip. Vrstica igralca: dres,
// ime ("Ime Priimek"), gol (`Ball20.png` + število), karton (`yellowcard.gif`,
// `yellowredcard.gif` = drugi rumeni, `redcard.gif`) in menjava (`down.gif NN`
// = izstop, `up.gif NN` = vstop). **Minute menjav so točne, kartoni so brez
// minute.** Šifer igralcev ni (identiteta ime + klub kot pri fss/lff), vratar
// ni označen — začetnik z dresom 1 dobi `vratar` kot namig. Ure začetka
// zapisnik nima.
//
// robots.txt vrne 404 (pravil ni), pogojev uporabe stran nima; noga
// "© … Northern Counties East Football League". Lastnik ima za branje
// dovoljenje lige. Beremo odkrito (User-Agent SLFF, 3 s med zahtevki,
// popolnih zapisnikov ne beremo znova). Ob 401/403/429 ali izzivu se uvoz
// ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi } from './fss.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

export const OSNOVNI = 'https://www.ncefl.org.uk'
const UA = 'SLFF fantasy (https://slff.eu)'
export const PREMOR_MS = 3000
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
/** Zapisnik zadnjega tedna se še dopolnjuje: vedno sveže, goli brez izida = nepopoln. */
export const SVEZE_DNI = 7
/** Do te starosti se zapisnik iz predpomnilnika brez postav ali z goli mimo izida prebere znova. */
export const PONOVNO_DNI = 45

// --- šifra lige, naslovi -------------------------------------------------------------

/** `ncelpremierdivision/2026` → { divizija, leto: 2026, sezona: '2026/27' }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9]+)\/(\d{4})$/)
  if (!m) throw new Error(`ncefl: šifra lige je "<divizija>/<leto>" (npr. ncelpremierdivision/2026), ne "${koda}"`)
  const leto = Number(m[2])
  return { divizija: m[1], leto, sezona: `${leto}/${String((leto + 1) % 100).padStart(2, '0')}` }
}

export const potLige = (koda) => {
  const { divizija, leto } = razbijKodo(koda)
  return `/matches/${divizija}/${leto}/`
}
export const naslovLige = (koda) => `${OSNOVNI}${potLige(koda)}`
export const imeLige = (koda) => `liga-${String(koda).replace(/\//g, '-')}.html`
export const imeTekme = (id) => `tekma-${id}.html`
// Šifra zapisnika v bazi je `ncel<id>`: id tekme (~57000) je last strani,
// `matches.zapisnik_id` pa je enoličen čez vse vire.
export const sifraZapisnika = (id) => `ncel${String(id).replace(/^ncel/, '')}`

// --- prenos -----------------------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class NceflZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'NceflZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/**
 * `fetch` za prenos (`vir.fetch`). 401/403/429 vrže `NceflZavrnitev` že tu:
 * brez ponovitve (prenos 429 sicer ponovi) in mimo shranjenega razporeda
 * (uvoz-razporeda.mjs pri 401 vzame shranjeno stran). Oba uvoza tako končata
 * z izhodom 4.
 */
export async function nceflFetch(url, moznosti = {}) {
  const odgovor = await fetch(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new NceflZavrnitev(`ncefl: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

/** Je besedilo stran divizije (z vsaj eno tekmo) ali zapisnik s postavo? */
export const jeStranLige = (html) => /class="headerselect"/.test(html ?? '') && /class="mdborder"/.test(html ?? '')
export const jeZapisnik = (html) => /class="header">Match Details</.test(html ?? '') && /starting line-up/.test(html ?? '')

/**
 * V predpomnilnik gre le prava stran: stran divizije s tekmami ali zapisnik s
 * postavo. Stran vzdrževanja (200) bi sicer obveljala za vselej in zapisnik,
 * shranjen pred vnosom postav, se ne bi nikoli več prebral.
 */
export const zaPredpomnilnik = (html) => jeStranLige(html) || jeZapisnik(html)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
export async function beri(prenesi, url, datoteka, sveze) {
  let html
  try {
    html = await prenesi(url, datoteka, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new NceflZavrnitev(`ncefl: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new NceflZavrnitev(`ncefl: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

// --- pretvorbe --------------------------------------------------------------------------

const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const brezSkript = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')

/** "41", "90+3", "82pen" → 41, 90, 82 (podaljšek se ne šteje). */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** '20261014' → '2026-10-14'. */
const datumIz = (s) => (/^\d{8}$/.test(String(s ?? '')) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null)

const dan = (datum) => Date.parse(`${datum}T00:00:00Z`)
/** Ponedeljek tedna zadnje julijske sobote v letu sezone (začetek 1. kroga). */
export function zacetekSezone(leto) {
  const d = new Date(Date.UTC(leto, 6, 31))
  d.setUTCDate(31 - ((d.getUTCDay() + 1) % 7)) // zadnja sobota julija
  d.setUTCDate(d.getUTCDate() - 5) // njen ponedeljek
  return d.toISOString().slice(0, 10)
}

/**
 * Krog = teden (ponedeljek–nedelja) od tedna zadnje julijske sobote:
 * 2026/27 začne 20. 7. 2026 (sobota 25. 7. = 1. krog, torek 28. 7. = 2. krog).
 * Številka ne zavisi od drugih tekem, zato prestavitev ne preštevilči
 * ostalih krogov. Tekma pred tem tednom (pripravljalni čas) je 1. krog.
 */
export function krogIzDatuma(datum, leto) {
  if (!datum) return null
  return Math.max(1, Math.floor((dan(datum) - dan(zacetekSezone(leto))) / (7 * 86400000)) + 1)
}

/**
 * Angleški čas ("3:00pm", "7:45pm") → ljubljanski (+1 h, poletni čas se
 * menja isti dan). Brez ure null.
 */
export function vLjubljanskiCas(datum, ura) {
  const m = String(ura ?? '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)$/i)
  if (!datum || !m) return { datum: datum ?? null, ura: null }
  let h = Number(m[1]) % 12
  if (m[3].toLowerCase() === 'pm') h += 12
  h += 1
  if (h < 24) return { datum, ura: `${String(h).padStart(2, '0')}:${m[2]}` }
  const x = new Date(`${datum}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + 1)
  return { datum: x.toISOString().slice(0, 10), ura: `${String(h - 24).padStart(2, '0')}:${m[2]}` }
}

const izidIz = (s) => {
  const m = String(s ?? '').trim().match(/^(\d+)\s*-\s*(\d+)$/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

// --- stran divizije ---------------------------------------------------------------------

/**
 * Pot izbrane sezone iz izbirnika (`<option ... SELECTED>`). Vrstni red
 * atributov, narekovaji, `selected="selected"` in absolutni naslov ne smejo
 * vplivati; brez izbrane možnosti vrne null (sezone ne ugibamo).
 */
export function izbranaSezona(s) {
  for (const [, atributi] of String(s ?? '').matchAll(/<option\b([^>]*)>/gi)) {
    if (!/(^|\s)selected(\s|=|\/|$)/i.test(atributi)) continue
    const v = atributi.match(/\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i)
    const vrednost = (v?.[1] ?? v?.[2] ?? v?.[3] ?? '').trim()
    if (!vrednost) continue
    try {
      const u = new URL(vrednost, OSNOVNI)
      return u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`
    } catch {
      return vrednost
    }
  }
  return null
}

const KONTUMACIJA = /awarded|unable to field|walk-?over|w\/o\b|conceded/i

/**
 * Tekme strani divizije (vse, v vrstnem redu strani). Preveri, da je stran
 * res izbrana divizija in sezona (`SELECTED` v izbirniku) — neznana sezona
 * bi lahko pokazala drugo.
 */
export function tekmeLige(koda, html, danes = Date.now()) {
  const s = brezSkript(html)
  const pot = potLige(koda)
  const izbrana = izbranaSezona(s)
  if (izbrana !== pot) {
    throw new Error(
      `ncefl: stran ${pot} kaže sezono ${izbrana ?? '?'} — uvoz ustavljen` +
        (izbrana ? '' : ` (${s.length} B: ${besedilo(s).slice(0, 120)})`),
    )
  }
  if (!/class="mdborder"/.test(s)) throw new Error(`ncefl: stran ${pot} nima tekem (${s.length} B) — uvoz ustavljen`)
  const { leto } = razbijKodo(koda)
  const out = []
  let datum = null
  let prava = true
  for (const kos of s.split(/(?=<td class="mddate">)|(?=<td class="mdcompetition">)|(?=<table class="mdborder">)/)) {
    if (kos.startsWith('<td class="mddate">')) {
      datum = datumIz(kos.match(/\/matches\/day\/\d{4}\/(\d{8})\//)?.[1])
      continue
    }
    if (kos.startsWith('<td class="mdcompetition">')) {
      prava = kos.match(/href="([^"]+)"/)?.[1] === pot
      continue
    }
    if (!kos.startsWith('<table class="mdborder">') || !prava) continue
    const ekipa = (stran) => {
      const m = kos.match(new RegExp(`class="md${stran}team[^"]*"><a class="nomobile" href="/teams/([^"/]+)/">([\\s\\S]*?)<br>`))
      return m ? { ime: besedilo(m[2]), slug: m[1] } : null
    }
    const d = ekipa('home')
    const g = ekipa('away')
    if (!d || !g) continue
    const rez = kos.match(/class="mdscore([^"]*)"><font class="teamfixtures">([^<]*)<\/font>/)
    const oznaka = besedilo(rez?.[2])
    const brezPodatkov = /mdnoinfo/.test(rez?.[1] ?? '')
    const povezava = kos.match(/class="mdteamsheet"><a href="(\/matches\/day\/\d{4}\/(\d{8})\/(\d+)\/)"/)
    const komentar = besedilo(kos.match(/class="mdcomments">([\s\S]*?)<\/td>/)?.[1])
    const izid = izidIz(oznaka)
    const prekinjena = /^A\s*-\s*A$/i.test(oznaka)
    const dTekme = datumIz(povezava?.[2]) ?? datum
    // Dodeljena zmaga: izid brez zapisnika s pripisom "awarded" ali, brez
    // pripisa, izid brez podatkov tekme (`mdnoinfo`: ne gledalcev ne polčasa),
    // starejši od tedna — svež izid je lahko le še nedopolnjen. Prekinjena
    // tekma ("A-A"), ki jo je liga odločila za zeleno mizo ("points awarded").
    const star = dTekme ? (danes - dan(dTekme)) / 86400000 > 7 : false
    const kontumacija = (!povezava && izid && (KONTUMACIJA.test(komentar) || (brezPodatkov && !komentar && star))) ||
      (prekinjena && KONTUMACIJA.test(komentar))
    out.push({
      datum: dTekme,
      krog: krogIzDatuma(dTekme, leto),
      domaci: d.ime,
      gostje: g.ime,
      izid,
      ura: izid || prekinjena ? null : oznaka || null,
      prekinjena,
      kontumacija: !!kontumacija,
      komentar: komentar || null,
      id: povezava?.[3] ?? null,
      pot: povezava?.[1] ?? null,
    })
  }
  return out
}

/** Tekme strani divizije → krogi v obliki uvoza razporeda. */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!t.krog) continue
    const cas = vLjubljanskiCas(t.datum, t.ura)
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: cas.datum,
      ura: cas.ura,
      kontumacija: t.kontumacija,
      // Prekinjena tekma brez odločitve čaka ponovitev: neodigrana.
      odigrana: !!t.izid || t.kontumacija,
      ...(t.kontumacija && t.izid ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ---------------------------------------------------------------------------

const kljucImena = (ime) =>
  razpakiraj(String(ime ?? ''))
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Strelci iz celice glave: "Jamie Austin 10, 58<br>George Doyle 60pen<br>X 45og"
 * → [{ ime, goli: [{ minuta, enajstmetrovka, avtogol }] }]. Ime brez minute
 * ("Patrick Sykes") je en gol brez minute.
 */
export function strelciGlave(celica) {
  const out = []
  for (const font of String(celica ?? '').matchAll(/<font class="goalscorers">([\s\S]*?)<\/font>/g)) {
    for (const vrstica of font[1].split(/<br\s*\/?>/i)) {
      const v = besedilo(vrstica)
      if (!v || /^(Att|HT)\s*:/i.test(v)) continue
      const m = v.match(/^(.*?)\s+((?:\d+(?:\s*\+\s*\d+)?\s*(?:pen|og|p)?\s*,?\s*)+)$/i)
      const ime = (m ? m[1] : v).trim()
      const goli = m
        ? [...m[2].matchAll(/(\d+(?:\s*\+\s*\d+)?)\s*(pen|og|p)?/gi)].map((x) => ({
            minuta: minuta(x[1]),
            enajstmetrovka: /^p/i.test(x[2] ?? ''),
            avtogol: /^og$/i.test(x[2] ?? ''),
          }))
        : [{ minuta: null, enajstmetrovka: false, avtogol: false }]
      out.push({ ime, goli })
    }
  }
  return out
}

/** Vrstice igralcev enega stolpca (ekipe): začetniki do "Substitutes", nato klop. */
function igralciStolpca(stolpec) {
  const out = []
  const neznano = []
  let zacetnik = true
  for (const vr of stolpec.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const celice = [...vr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1])
    if (celice.length === 1 && /Substitutes/i.test(celice[0])) {
      zacetnik = false
      continue
    }
    if (celice.length !== 5) continue
    const ime = besedilo(celice[1])
    if (!ime) continue // prazna vrstica klopi ("&nbsp;")
    const st = /^\d{1,3}$/.test(besedilo(celice[0])) ? Number(besedilo(celice[0])) : null
    const zoge = celice[2].match(/Ball20\.png[^>]*>\s*(\d+)/i)
    const kartoni = [...celice[3].matchAll(/\/images\/([a-z0-9_-]+)\.(?:gif|png)/gi)].map((x) => x[1].toLowerCase())
    for (const k of kartoni) if (!['yellowcard', 'yellowredcard', 'redcard'].includes(k)) neznano.push(`${ime}: neznan karton "${k}"`)
    if (/<img/i.test(celice[2]) && !zoge) neznano.push(`${ime}: neznana ikona v stolpcu golov`)
    const preklopi = [...celice[4].matchAll(/\/images\/(up|down)\.gif"?[^>]*>\s*(\d+(?:\s*\+\s*\d+)?)/gi)].map((x) => ({
      vrsta: x[1].toLowerCase(),
      minuta: minuta(x[2]),
    }))
    out.push({
      st,
      imeVira: ime,
      ime: vPriimekIme(ime),
      zacetnik,
      goliIkon: zoge ? Number(zoge[1]) : 0,
      rumeni: kartoni.filter((k) => k === 'yellowcard' || k === 'yellowredcard').length,
      rdec: kartoni.some((k) => k === 'yellowredcard' || k === 'redcard'),
      noter: preklopi.find((p) => p.vrsta === 'up')?.minuta ?? null,
      ven: preklopi.find((p) => p.vrsta === 'down')?.minuta ?? null,
    })
  }
  return { igralci: out, neznano }
}

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni zapisnik ali nima izida.
 * `danes` odloči, ali se zapisnik še dopolnjuje (goli mimo izida do 7 dni =
 * nepopoln, uvoz ga bere znova).
 */
export function vZapisnik(html, { id = null, url = null, leto = null, danes = Date.now() } = {}) {
  const s = brezSkript(html)
  const a = s.indexOf('class="header">Match Details<')
  if (a < 0) return null
  const glava = s.slice(a, s.indexOf('</table>', a))
  const datum = datumIz(glava.match(/\/matches\/day\/\d{4}\/(\d{8})\//)?.[1])
  const vrsta = glava.match(/<tr valign="top">([\s\S]*?)<\/tr>/)?.[1] ?? ''
  const celice = [...vrsta.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((c) => c[2])
  // Celice: prazna, domači, izid (Att, HT), gostje (zadnja nima </td>).
  const [, celDomaci = '', celIzid = ''] = celice
  const celGostje = vrsta.slice(vrsta.lastIndexOf('<td'))
  const rezultat = izidIz(besedilo(celIzid.match(/<font class="teamfixtures">([^<]*)<\/font>/)?.[1]))
  if (!rezultat) return null
  const ht = celIzid.match(/HT:\s*(\d+)\s*-\s*(\d+)/)
  const imeKluba = (cel) => besedilo(cel.match(/<a class="nomobile[^"]*"[^>]*>([\s\S]*?)<br>/)?.[1])
  const imeni = [imeKluba(celDomaci), imeKluba(celGostje)]
  const strelci = [strelciGlave(celDomaci), strelciGlave(celGostje)]

  // Postavi sta v dveh stolpcih `col-lg-6`; stranski stolpec (`col-lg-4`:
  // izidi dneva, lestvica) ni del zapisnika.
  const b = s.indexOf('</table>', a)
  const konec = s.indexOf('<div class="col-lg-4">', b)
  const telo = s.slice(b, konec >= 0 ? konec : undefined)
  const stolpci = telo.split(/<div class="col-lg-6">/).slice(1)
  const opozorila = []
  const ekipe = [0, 1].map((idx) => {
    const { igralci, neznano } = igralciStolpca(stolpci[idx] ?? '')
    opozorila.push(...neznano.map((x) => `${imeni[idx]}: ${x}`))
    return { igralci, postava: igralci.filter((i) => i.zacetnik), rezerve: igralci.filter((i) => !i.zacetnik) }
  })
  const znana = ekipe.map((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
  ekipe.forEach((e, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'}`)
    else if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
  })

  // Goli: popolna glava po izidu je seznam dogodkov, ikone jo preverijo.
  // Pri nepopolni glavi ikone dopolnijo le enolično določene igralce. Neznan
  // ali dvoumen strelec ostane brez pripisa igralcu.
  const goli = []
  const poImenu = (idx, ime) => ekipe[idx].igralci.filter((i) => kljucImena(i.imeVira) === kljucImena(ime))
  const popolneGlave = strelci.map((ss, idx) => ss.reduce((n, st) => n + st.goli.length, 0) === (idx ? rezultat.gostje : rezultat.domaci))
  let dvoumnoNepopolno = false
  const kdo = (idx, i) => ({ ekipaIdx: idx, st: i?.st ?? null, ime: i?.ime ?? null })
  ;[0, 1].forEach((idx) => {
    const izGlave = new Map() // igralec → goli glave
    const opozorjeneDvoumnosti = new Set()
    const dvoumno = (team, ime) => {
      if (!popolneGlave[idx]) dvoumnoNepopolno = true
      const key = `${team}|${kljucImena(ime)}`
      if (opozorjeneDvoumnosti.has(key)) return
      opozorjeneDvoumnosti.add(key)
      opozorila.push(`${popolneGlave[idx] ? '' : NEPOPOLN + ': '}${imeni[team]}: dvoumen strelec ${ime} v več vrsticah postave — brez pripisa igralcu`)
    }
    const najdi = (team, ime) => {
      const kandidati = poImenu(team, ime)
      if (kandidati.length > 1) dvoumno(team, ime)
      return kandidati.length === 1 ? kandidati[0] : null
    }
    for (const st of strelci[idx]) {
      for (const g of st.goli) {
        if (g.avtogol) {
          // Avtogol: ime je igralec NASPROTNE ekipe, gol šteje tej.
          const i = /^unknown$/i.test(st.ime) ? null : najdi(1 - idx, st.ime)
          if (!i && !/^unknown$/i.test(st.ime) && !poImenu(1 - idx, st.ime).length) opozorila.push(`avtogol: ${st.ime} ni v postavi ${imeni[1 - idx]}`)
          goli.push({ ...kdo(1 - idx, i), minuta: g.minuta, avtogol: true, enajstmetrovka: false })
          continue
        }
        const i = /^unknown$/i.test(st.ime) ? null : najdi(idx, st.ime)
        if (!i) {
          if (!/^unknown$/i.test(st.ime) && !poImenu(idx, st.ime).length) opozorila.push(`strelec ${st.ime} (${imeni[idx]}) ni v postavi`)
          goli.push({ ...kdo(idx, null), minuta: g.minuta, avtogol: false, enajstmetrovka: g.enajstmetrovka })
          continue
        }
        izGlave.set(i, [...(izGlave.get(i) ?? []), g])
      }
    }
    for (const i of ekipe[idx].igralci) {
      const g = izGlave.get(i) ?? []
      if (g.length && i.goliIkon && g.length !== i.goliIkon)
        opozorila.push(`${imeni[idx]}: ${i.imeVira} ima v glavi ${g.length} golov, pri igralcu ${i.goliIkon}`)
      // Popolna glava je seznam dogodkov, ikone pa le navzkrižna preverba.
      // Nepopolna glava ohrani običajno dopolnitev le pri enoličnem igralcu.
      if (!popolneGlave[idx] && i.goliIkon && poImenu(idx, i.imeVira).length > 1) {
        dvoumno(idx, i.imeVira)
        continue
      }
      if (popolneGlave[idx] && i.goliIkon && !g.length)
        opozorila.push(`${imeni[idx]}: ikona gola pri ${i.imeVira} ni dodaten dogodek ob popolni glavi strelcev`)
      const stevilo = g.length || (popolneGlave[idx] ? 0 : i.goliIkon)
      for (let n = 0; n < stevilo; n++)
        goli.push({ ...kdo(idx, i), minuta: g[n]?.minuta ?? null, avtogol: false, enajstmetrovka: !!g[n]?.enajstmetrovka })
    }
  })

  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, idx) => {
    for (const i of e.igralci) {
      for (let n = 0; n < i.rumeni; n++) rumeni.push({ ...kdo(idx, i), minuta: null })
      if (i.rdec) rdeci.push({ ...kdo(idx, i), minuta: null })
    }
    // Menjave v pare po minuti (izstop in vstop ob isti minuti).
    const ven = e.igralci.filter((i) => i.ven != null)
    const noter = e.igralci.filter((i) => i.noter != null)
    const porabljeni = new Set()
    for (const v of ven) {
      const n = noter.find((x) => x.noter === v.ven && !porabljeni.has(x))
      if (n) porabljeni.add(n)
      menjave.push({ ekipaIdx: idx, minuta: v.ven, noter: { st: n?.st ?? null, ime: n?.ime ?? null }, ven: { st: v.st, ime: v.ime } })
    }
    for (const n of noter.filter((x) => !porabljeni.has(x)))
      menjave.push({ ekipaIdx: idx, minuta: n.noter, noter: { st: n.st, ime: n.ime }, ven: { st: null, ime: null } })
    if (znana[idx] && ven.length !== noter.length)
      opozorila.push(`${imeni[idx]}: izstopov ${ven.length}, vstopov ${noter.length}`)
    // Strelec s klopi brez vpisanega vstopa: nastop od gola (sicer ni nastopa in gol ne šteje nikomur).
    for (const i of e.rezerve) {
      if (i.noter != null) continue
      const prvi = goli.filter((g) => g.ekipaIdx === idx && !g.avtogol && g.st === i.st && g.ime === i.ime)
      if (!prvi.length) continue
      i.noter = Math.min(...prvi.map((g) => g.minuta ?? DOLZINA_TEKME))
      opozorila.push(`${imeni[idx]}: strelec s klopi ${i.imeVira} brez vstopa — nastop od ${i.noter}. minute`)
    }
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  let dopolnjuje = false
  if (znana[0] && znana[1] && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)) {
    const neujemanje = `goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`
    dopolnjuje = !((danes - dan(datum)) / 86400000 > SVEZE_DNI)
    opozorila.push(dopolnjuje ? `${NEPOPOLN}: ${neujemanje} — klub zapisnik še dopolnjuje` : neujemanje)
  }
  opozorila.sort((x, y) => Number(y.startsWith(NEPOPOLN)) - Number(x.startsWith(NEPOPOLN)))

  // Kartoni so brez minute: izključeni igra do konca ali do izstopa (minute
  // so zato pri rdečem kartonu precenjene, ekipa ima 990).
  const vObliko = (idx) => (i) => ({
    st: i.st,
    ime: i.ime,
    zacetnik: i.zacetnik,
    noter: i.noter,
    ven: i.ven,
    rdec: i.rdec ? (i.ven ?? DOLZINA_TEKME) : null,
    // Vratar ni označen; začetnik z dresom 1 je namig (glasovanje ga popravi).
    vratar: i.zacetnik && i.st === 1 && znana[idx],
    pozicija: i.zacetnik && i.st === 1 && znana[idx] ? 'GK' : null,
  })
  const sestava = ekipe.map((e, idx) =>
    znana[idx] ? { ime: imeni[idx], postava: e.postava.map(vObliko(idx)), rezerve: e.rezerve.map(vObliko(idx)) } : { ime: imeni[idx], postava: [], rezerve: [] })

  return {
    zapisnikId: id == null ? null : sifraZapisnika(id),
    url,
    sezona: leto ? `${leto}/${String((leto + 1) % 100).padStart(2, '0')}` : null,
    krog: leto ? krogIzDatuma(datum, leto) : null,
    datum,
    ura: null,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas: ht ? { domaci: Number(ht[1]), gostje: Number(ht[2]) } : null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    nepopoln: !znana[0] || !znana[1] || dopolnjuje || dvoumnoNepopolno,
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    opozorila,
  }
}

const zahtevaPonovno = (z) => !z || z.nepopoln || z.opozorila.some((o) => /se ne ujemajo z izidom/.test(o))

/**
 * Zapisnik zadnjega tedna se bere sveže; starejši do `PONOVNO_DNI` iz
 * predpomnilnika, a če nima postav ali se goli ne ujemajo z izidom, še enkrat
 * sveže. Stran, zajeta pred vnosom postav ali golov, tako ne obtiči za vedno
 * (kot `zapisnikSvez` v zapisniki.mjs in comet-auris.mjs).
 */
export async function zapisnikSvez(beriStran, razcleni, datum, danes = Date.now()) {
  const starost = datum ? (danes - dan(datum)) / 86400000 : 0
  const sveze = starost <= SVEZE_DNI
  const z = razcleni(await beriStran(sveze))
  if (sveze || starost > PONOVNO_DNI || !zahtevaPonovno(z)) return z
  return razcleni(await beriStran(true)) ?? z
}

// --- klubi ------------------------------------------------------------------------------

/** Ključ kluba: male črke, "&" = "and", brez ločil ("Dearne & District" = "dearne and district"). */
export const kljucKlubaNcel = (ime) =>
  razpakiraj(String(ime ?? ''))
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const OBLIKE = new Set(['afc', 'fc'])
/** Kratko ime brez "AFC"/"FC" ("Retford FC" → "Retford", "Goole AFC" → "Goole"). */
export function kratkoImeNcel(polno) {
  const cisto = razpakiraj(String(polno ?? '')).trim()
  const besede = cisto.split(/\s+/).filter((b) => b && !OBLIKE.has(b.toLowerCase().replace(/\./g, '')))
  return besede.length ? besede.join(' ') : cisto
}

// --- vir --------------------------------------------------------------------------------

async function stranLige(koda, prenesi) {
  const html = await beri(prenesi, naslovLige(koda), imeLige(koda), true)
  // Preobremenjen strežnik kdaj vrne okrnjeno stran brez izbirnika sezon
  // (nočni uvoz GB, 19. 10. 2026); en ponoven prenos, nato odloči varovalka.
  if (izbranaSezona(brezSkript(html)) !== null) return html
  await new Promise((r) => setTimeout(r, 5000))
  return beri(prenesi, naslovLige(koda), imeLige(koda), true)
}

const vir = {
  ime: 'ncefl',
  polnoIme: 'Northern Counties East Football League (ncefl.org.uk)',
  drzava: 'GB',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: nceflFetch,
  // Krog je teden: prestavljena tekma zamenja krog (uvoz-razporeda.mjs jo
  // premakne, namesto da bi v novem krogu nastala še ena vrstica istega para).
  krogiPoTednih: true,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (koda) => naslovLige(koda),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new NceflZavrnitev(`ncefl: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  /** Razpored: vsi tedni sezone s tekmami (stran divizije vedno sveža). */
  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(tekmeLige(koda, await stranLige(koda, prenesi)))
  },

  /** Zapisniki odigranih tekem s povezavo (brez kontumacij). */
  async zapisniki(koda, prenesi, danes = Date.now()) {
    const { leto, sezona } = razbijKodo(koda)
    const out = []
    for (const t of tekmeLige(koda, await stranLige(koda, prenesi), danes)) {
      if (!t.izid || !t.id || t.kontumacija) continue
      const url = `${OSNOVNI}${t.pot}`
      let z
      try {
        z = await zapisnikSvez(
          (sveze) => beri(prenesi, url, imeTekme(t.id), sveze),
          (html) => vZapisnik(html, { id: t.id, url, leto, danes }),
          t.datum,
          danes,
        )
      } catch (e) {
        // Posamezne strani (še) ni: preskoči. Zavrnitev in drugo ustavi uvoz.
        if (e.status === 404) {
          console.warn(`ncefl: ${url} → 404, preskočeno`)
          continue
        }
        throw e
      }
      if (!z) continue
      // Ime kluba, datum, krog in sezona s strani divizije, da se tekma ujame z razporedom.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.datum ??= t.datum
      if (z.datum !== t.datum) z.opozorila.push(`datum zapisnika ${z.datum} ni datum na strani divizije ${t.datum}`)
      z.datum = t.datum
      z.krog = t.krog
      z.sezona = sezona
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid strani divizije ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaNcel,
  kratkoIme: kratkoImeNcel,
  poenostavi: kljucKlubaNcel,
}

export default vir
