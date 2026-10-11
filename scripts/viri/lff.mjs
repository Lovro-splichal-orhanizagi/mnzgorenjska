// Vir: Latvijas Futbola federācija — lff.lv (sacensības, vīrieši).
//
// LFF vodi lige odraslih (Virslīga, 1. līga, 2. līga, 3. līga) v COMET in jih
// objavi na lff.lv. HTML iz strežnika, brez izziva. Glej CLAUDE.md (Latvija).
//
// SEZONA je koledarsko leto (marec–november): 2026 = "2026", ne "2026/27"
// (`competitions.sezona_koledarska`). Vir jo vzame iz datumov razporeda.
//
// ŠIFRA LIGE je `<sekcija>/<p>[/<tekmovanje>]`:
// - `<sekcija>` je pot pod /sacensibas/viriesi/ (virsliga, lvbet-liga,
//   otra-liga, tresa-liga),
// - `<p>` je parameter `?p=` izbirnika "Izvēlies līgu" — pri Virslīgi in
//   1. ligi LETO (`virsliga/2026`), pri 3. ligi id tekmovanja COMET
//   (`tresa-liga/23836115` = Centra zona 2026), pri 2. ligi leto ali id strani,
//   ki ima več skupin,
// - `<tekmovanje>` (id COMET) izbere skupino, kadar ima stran več blokov
//   "Visas spēles" (2. liga: A in B grupa in finale, `otra-liga/2026/23536781`).
// Vsaka sezona ima svoje id-je; ob novi sezoni se popravi šifra.
//
// STRAN LIGE `/sacensibas/viriesi/<sekcija>/?p=<p>`: zavihek "Visas spēles"
// (`data-genid="stats_competition_<id>_…_style2"`) ima vse kroge ("N. kārta")
// in vse tekme: `data-id` (id tekme COMET), datum (h5 dan, h6 mesec "okt",
// h7 ura v riškem času, h8 leto), domači in gostje, izid (`res1`, `res2`;
// "-" = neodigrana) in povezava `/speles/<slug>-<id>/`. Zavihek "Nākamās spēles"
// (`style1`) je le izsek prihodnjih — ga ne beremo.
//
// ZAPISNIK `/speles/<slug>-<id>/`, zavihek "Spēles protokols" (`table.teams`):
// vrstica `tr.firstteam` (začetnika obeh ekip) in `tr.bench` (klop) ima pet
// celic: dres domačih, igralec domačih, prazno, dres gostov, igralec gostov.
// Igralec je "Ime Priimek", "(G)" = vratar, "(C)" = kapetan; pri nekaterih je
// povezava `/speletaji/<slug>-<id>/` (profil reprezentanta) — večina je nima,
// zato je identiteta ime + klub kot pri fss. Dogodki igralca (`ul.events li`)
// z minuto ("64'", "90'+1'"): goal, penalty (gol z 11 m), own_goal,
// penalty_failed, yellow, second_yellow, red, substitutionIn, substitutionOut
// (razredi iz CSS strani).
//
// robots.txt zapre le MJ12bot. Noga: "Autortiesības 2026 © Atsauce uz LFF.lv
// obligāta" (navedba vira je obvezna). Beremo odkrito (User-Agent SLFF, 3 s med
// zahtevki), zapisnikov, starejših od tedna, ne beremo znova. Ob izzivu,
// CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { vLjubljanskiCas } from './frf.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'

const OSNOVNI = 'https://lff.lv'
const DOLZINA_TEKME = 90

/** "tresa-liga/23836115" → { sekcija, p, tekmovanje }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+)\/(\d+)(?:\/(\d+))?$/)
  if (!m) throw new Error(`lff: šifra lige je "<sekcija>/<p>[/<tekmovanje>]" (npr. virsliga/2026, tresa-liga/23836115), ne "${koda}"`)
  return { sekcija: m[1], p: m[2], tekmovanje: m[3] ?? null }
}

export const naslovLige = (koda) => {
  const { sekcija, p } = razbijKodo(koda)
  return `${OSNOVNI}/sacensibas/viriesi/${sekcija}/?p=${p}`
}
// Šifra zapisnika v bazi je `lv<id>`: id tekme COMET je enoličen le znotraj
// ene zveze (fss in fsb imata svoj COMET), `matches.zapisnik_id` pa čez vse vire.
export const sifraZapisnika = (id) => `lv${String(id).replace(/^lv/, '')}`
// Stran tekme najde id na koncu poti; slug je okras (`/speles/x-<id>/` deluje),
// a beremo pot z razporeda, kadar jo imamo.
export const naslovZapisnika = (id, pot = null) =>
  pot ? `${OSNOVNI}${pot}` : `${OSNOVNI}/speles/spele-${String(id).replace(/^lv/, '')}/`
const imeLige = (koda) => `liga-${String(koda).replace(/\//g, '-')}.html`
const imeZapisnika = (id) => `spele-${id}.html`

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class LffZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'LffZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/** "64'" → 64, "45'+2'" → 45, "90'+1'" → 90; "PP" (puslaika pārtraukums, polčas) → 45. */
export function minuta(s) {
  if (/^\s*PP\s*$/i.test(String(s ?? ''))) return 45
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

const MESECI = ['jan', 'feb', 'mar', 'apr', 'mai', 'jūn', 'jūl', 'aug', 'sep', 'okt', 'nov', 'dec']

/** Dan, mesec ("okt", "jūn"), leto in ura (riški čas) → ljubljanski { datum, ura }. */
export function datumUra(dan, mesec, leto, ura = null) {
  const i = MESECI.indexOf(String(mesec ?? '').trim().toLowerCase().slice(0, 3))
  if (i < 0 || !/^\d{1,2}$/.test(String(dan ?? '').trim()) || !/^\d{4}$/.test(String(leto ?? '').trim())) return { datum: null, ura: null }
  const datum = `${String(leto).trim()}-${String(i + 1).padStart(2, '0')}-${String(dan).trim().padStart(2, '0')}`
  const u = String(ura ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  return u ? vLjubljanskiCas(datum, `${u[1].padStart(2, '0')}:${u[2]}`) : { datum, ura: null }
}

// --- stran lige ----------------------------------------------------------------

/**
 * Bloki "Visas spēles" na strani: [{ tekmovanje, zavihek, html }]. `zavihek` je
 * ime zavihka ("Visas spēles A grupa", "Finālturnīrs").
 */
export function blokiStrani(html) {
  const s = cisto(html)
  const zavihki = new Map([...s.matchAll(/data-content="(tabContent_[\d_]+)"[^>]*><span>([^<]*)<\/span>/g)].map((m) => [m[1], razpakiraj(m[2]).trim()]))
  const out = []
  const re = /data-genid="stats_competition_(\d+)_[^"]*_style2[^"]*"/g
  let m
  while ((m = re.exec(s))) {
    const konec = s.indexOf('<div id="tabContent', m.index)
    const zavihek = [...s.slice(0, m.index).matchAll(/<div id="(tabContent_[\d_]+)"/g)].at(-1)?.[1]
    out.push({ tekmovanje: m[1], zavihek: zavihki.get(zavihek) ?? '', html: s.slice(m.index, konec < 0 ? undefined : konec) })
  }
  return out
}

/** Naslov strani ("Dali Dali 3. līga Centra zona"). */
export const imeStrani = (html) => besedilo(String(html ?? '').match(/<h1 class="[^"]*">([\s\S]*?)<\/h1>/)?.[1] ?? '')

/** Izbirnik "Izvēlies līgu": [{ p, ime }] (privzeta stran nima `p`). */
export const izbirnikStrani = (html) =>
  [...String(html ?? '').matchAll(/<option value="\/sacensibas\/viriesi\/[^/"]+\/(?:\?p=(\d+))?">([^<]*)</g)].map((m) => ({ p: m[1] ?? null, ime: razpakiraj(m[2]) }))

/** Tekme enega bloka: [{ krog, id, pot, datum, ura, domaci, gostje, izid }]. */
export function tekmeBloka(blok) {
  const out = []
  for (const del of String(blok).split('<div class="tr th1">').slice(1)) {
    const krog = Number(besedilo(del.match(/<span class="h3">([^<]*)<\/span>/)?.[1]).match(/^(\d+)\.\s*kārta/)?.[1])
    if (!krog) continue
    for (const t of del.split(/<div class="tr match[^"]*" data-id="/).slice(1)) {
      const id = t.match(/^(\d+)/)?.[1]
      const imena = [...t.matchAll(/<div class="title"><span[^>]*><a href="\/klubi\/[^"]*">([^<]*)<\/a>/g)].map((x) => razpakiraj(x[1]).trim())
      if (!id || imena.length !== 2) continue
      const r1 = t.match(/<span class="res1">([^<]*)<\/span>/)?.[1].trim()
      const r2 = t.match(/<span class="res2">([^<]*)<\/span>/)?.[1].trim()
      const { datum, ura } = datumUra(
        t.match(/<h5>([^<]*)<\/h5>/)?.[1],
        t.match(/<h6>([^<]*)<\/h6>/)?.[1],
        t.match(/<div class="h8">([^<]*)<\/div>/)?.[1],
        t.match(/<div class="h7">([^<]*)<\/div>/)?.[1],
      )
      out.push({
        krog,
        id,
        pot: t.match(/href="(\/speles\/[^"]+)"/)?.[1] ?? null,
        datum,
        ura,
        domaci: imena[0],
        gostje: imena[1],
        izid: /^\d+$/.test(r1 ?? '') && /^\d+$/.test(r2 ?? '') ? { domaci: Number(r1), gostje: Number(r2) } : null,
      })
    }
  }
  return out
}

/** Leto lige: najpogostejše leto datumov (koledarska sezona). */
export function letoTekem(tekme) {
  const st = new Map()
  for (const t of tekme) if (t.datum) st.set(t.datum.slice(0, 4), (st.get(t.datum.slice(0, 4)) ?? 0) + 1)
  return [...st.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/**
 * Blok lige iz šifre: izrecno `<tekmovanje>`, sicer blok z id-jem `<p>` (3. liga),
 * sicer edini blok. Več blokov brez izbire ali napačno leto ustavi uvoz —
 * neznan `p` stran tiho zamenja s tekočo.
 */
export function tekmeLige(koda, html) {
  const { p, tekmovanje } = razbijKodo(koda)
  const bloki = blokiStrani(html)
  const iskani = tekmovanje ?? (bloki.some((b) => b.tekmovanje === p) ? p : null)
  let blok
  if (iskani) {
    blok = bloki.find((b) => b.tekmovanje === iskani)
    if (!blok) throw new Error(`lff: ${naslovLige(koda)} nima tekmovanja ${iskani} (ima ${bloki.map((b) => b.tekmovanje).join(', ') || 'nič'}) — uvoz ustavljen`)
  } else if (bloki.length === 1) blok = bloki[0]
  else throw new Error(`lff: ${naslovLige(koda)} ima ${bloki.length} skupin (${bloki.map((b) => b.tekmovanje).join(', ')}) — šifra mora navesti tekmovanje`)
  const tekme = tekmeBloka(blok.html)
  if (/^\d{4}$/.test(p)) {
    const leto = letoTekem(tekme)
    if (leto !== p) throw new Error(`lff: ${naslovLige(koda)} kaže sezono ${leto ?? '?'}, ne ${p} — uvoz ustavljen`)
  }
  return tekme
}

/**
 * Razpored v obliko uvoza razporeda. Odigrana je tekma z izidom. Kontumacije
 * razpored ne loči od izida — najde jo `kontumacije` (prazen zapisnik).
 */
export function razcleniRazpored(koda, html) {
  const krogi = new Map()
  for (const t of tekmeLige(koda, html)) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      // Za `kontumacije`: tekmo z izidom 3:0 / 0:3 je treba pogledati v zapisniku.
      lffId: t.id, pot: t.pot, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------

const ZNANE = new Set(['goal', 'penalty', 'own_goal', 'penalty_failed', 'yellow', 'second_yellow', 'red', 'substitutionIn', 'substitutionOut'])

/** Igralec ene celice protokola ali null (prazna celica). */
function igralecCelice(celica, st, zacetnik) {
  const brezDogodkov = String(celica).replace(/<ul class="events">[\s\S]*?<\/ul>/, '')
  const t = besedilo(brezDogodkov)
  if (!t) return null
  const ime = t.replace(/\((?:C|G)\)/g, '').replace(/\s+/g, ' ').trim()
  if (!ime) return null
  const dogodki = [...String(celica).matchAll(/<li class="([A-Za-z_]+)"><div class="icon"><\/div>([^<]*)<\/li>/g)].map((m) => ({ vrsta: m[1], minuta: minuta(m[2]) }))
  const prvi = (v) => dogodki.find((d) => d.vrsta === v)?.minuta ?? null
  return {
    st: /^\d+$/.test(String(st).trim()) ? Number(String(st).trim()) : null,
    ime: vPriimekIme(ime),
    polnoIme: ime,
    vratar: /\(G\)/.test(t),
    kapetan: /\(C\)/.test(t),
    zacetnik,
    noter: prvi('substitutionIn'),
    ven: prvi('substitutionOut'),
    rdec: dogodki.find((d) => d.vrsta === 'red' || d.vrsta === 'second_yellow')?.minuta ?? null,
    dogodki,
  }
}

/** Protokol: [[začetniki domačih, klop], [začetniki gostov, klop]]. */
function protokol(s) {
  const i = s.indexOf('<table class="teams">')
  if (i < 0) return null
  const tabela = s.slice(i, s.indexOf('</table>', i))
  const ekipe = [{ postava: [], rezerve: [] }, { postava: [], rezerve: [] }]
  for (const [, vrsta, vrstica] of tabela.matchAll(/<tr class="(firstteam|bench)[^"]*">([\s\S]*?)<\/tr>/g)) {
    const c = [...vrstica.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    if (c.length < 5) continue
    const zacetnik = vrsta === 'firstteam'
    for (const [idx, st, celica] of [[0, c[0], c[1]], [1, c[3], c[4]]]) {
      const i = igralecCelice(celica, st, zacetnik)
      if (i) ekipe[idx][zacetnik ? 'postava' : 'rezerve'].push(i)
    }
  }
  return ekipe
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida ali
 * kateri od ekip manjka postava (neodigrana tekma, kontumacija).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = cisto(html)
  const izid = [...s.matchAll(/<div class="result"><div class="res">\s*(\d+)\s*<\/div>/g)].map((m) => Number(m[1]))
  if (izid.length < 2) return null
  const rezultat = { domaci: izid[0], gostje: izid[1] }
  const imena = [
    besedilo(s.match(/<div class="club1"><a [^>]*><span>([^<]*)<\/span>/)?.[1]),
    besedilo(s.match(/<div class="club2"><a [^>]*>(?:<div class="logo">[\s\S]*?<\/div>)?<span>([^<]*)<\/span>/)?.[1]),
  ]
  const p = protokol(s)
  if (!p || !p[0].postava.length || !p[1].postava.length) return null
  const ekipe = p.map((e, idx) => ({ ime: imena[idx], ...e }))

  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    const izstopi = []
    for (const i of [...e.postava, ...e.rezerve]) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      // Drugi rumeni: COMET vpiše prvi rumeni in second_yellow; če je vpisan še
      // drugi rumeni, ga odstranimo — kot pri drugih virih 1 rumeni + 1 rdeči.
      const drugi = i.dogodki.some((d) => d.vrsta === 'second_yellow')
      let rumenih = 0
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'goal') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penalty') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (d.vrsta === 'own_goal') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'penalty_failed') zgresene.push(z)
        else if (d.vrsta === 'yellow') {
          if (!(drugi && rumenih >= 1)) rumeni.push(z)
          rumenih++
        } else if (d.vrsta === 'red' || d.vrsta === 'second_yellow') {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.st === i.st && r.ime === i.ime)) rdeci.push(z)
        } else if (d.vrsta === 'substitutionOut') izstopi.push({ st: i.st, ime: i.ime, minuta: d.minuta })
        if (!ZNANE.has(d.vrsta)) opozorila.push(`${e.ime}: neznan dogodek "${d.vrsta}" pri ${i.ime}`)
        if (d.minuta == null) opozorila.push(`${e.ime}: dogodek "${d.vrsta}" pri ${i.ime} brez minute`)
      }
    }
    // Menjave: vstop rezerve in izstop ob isti minuti tvorita par.
    for (const i of [...e.rezerve, ...e.postava].filter((x) => x.noter != null)) {
      const j = izstopi.findIndex((x) => x.minuta === i.noter)
      const ven = j >= 0 ? izstopi.splice(j, 1)[0] : { st: null, ime: null }
      menjave.push({ ekipaIdx, minuta: i.noter, noter: { st: i.st, ime: i.ime }, ven: { st: ven.st, ime: ven.ime } })
    }
    for (const x of izstopi) menjave.push({ ekipaIdx, minuta: x.minuta, noter: { st: null, ime: null }, ven: { st: x.st, ime: x.ime } })
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev (G) v postavi je ${vratarjev}`)
    const imena = new Map()
    for (const i of [...e.postava, ...e.rezerve]) imena.set(`${i.st}|${i.ime}`, (imena.get(`${i.st}|${i.ime}`) ?? 0) + 1)
    for (const [k, n] of imena) if (n > 1) opozorila.push(`${e.ime}: igralec ${k.split('|')[1]} je v zapisniku ${n}-krat`)
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const glava = s.match(/<li class="date"><b>([^<]*)<\/b>\s*(\d{4})\s*(?:<b>([^<]*)<\/b>)?/)
  const [dan, mesec] = String(glava?.[1] ?? '').trim().split(/\s+/)
  const { datum } = datumUra(dan, mesec, glava?.[2], glava?.[3])
  const krog = Number(s.match(/<li class="competition"><span>(?:(?!<\/span>).)*<\/span><span>\s*(\d+)\.\s*kārta/)?.[1]) || null

  const vObliko = ({ dogodki: _d, polnoIme: _p, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: datum ? datum.slice(0, 4) : null,
    krog,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    // Polčasa stran ne pove (druga vrstica glave ponovi končni izid).
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Nastopi po imenu in dresu (kot fss): začetnik od 0, rezerva od vstopa. */
export const nastopi = (z) => nastopiPoImenu(z)

// --- klubi ---------------------------------------------------------------------

// Ključ kluba: male črke z latvijskimi znaki (ā, č, ē, ģ, ī, ķ, ļ, ņ, š, ū, ž).
export const kljucKlubaLv = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('lv')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Oblike društva, ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_LV = new Set(['fk', 'fc', 'sk', 'fs', 'afa'])

/**
 * Kratko ime: brez oblike kluba ("FK Staiceles Bebri" → "Staiceles Bebri",
 * "FS Jelgava" → "Jelgava"); "RFS Academy" in "BFC Daugavpils" ostaneta.
 * Največ tri besede.
 */
export function kratkoImeLv(polno) {
  const besede = razpakiraj(polno).trim().split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_LV.has(b.toLowerCase()))
  return ostale.length ? ostale.slice(0, 3).join(' ') : razpakiraj(polno).trim()
}

// --- prenos --------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new LffZavrnitev(`lff: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new LffZavrnitev(`lff: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

const vir = {
  ime: 'lff',
  polnoIme: 'Latvijas Futbola federācija (lff.lv)',
  drzava: 'LV',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (slff.eu; splih.94@gmail.com)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new LffZavrnitev(`lff: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
  },

  async zapisniki(koda, prenesi) {
    const tekme = tekmeLige(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
    const leto = letoTekem(tekme)
    const out = []
    for (const t of tekme.filter((x) => x.izid)) {
      const url = naslovZapisnika(t.id, t.pot)
      // Zapisnik zadnjega tedna se lahko še popravlja; starejšega ne beremo znova.
      const z = vZapisnik(await beri(prenesi, url, imeZapisnika(t.id), starostDni(t.datum) <= 7), { id: t.id, url })
      if (!z) continue
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
   * zapisnik nima postav (Rietumu zona 2026: FK Namejs trikrat). Bere le take
   * tekme; zapisnik gre v isti predpomnilnik kot pri uvozu zapisnikov.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.lffId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovZapisnika(t.lffId, t.pot), imeZapisnika(t.lffId), t.datum)
        if (jeIzziv(html)) throw new LffZavrnitev(`lff: ${naslovZapisnika(t.lffId, t.pot)} vrne izziv (CAPTCHA)`)
        if (!vZapisnik(html) && /<div class="res">\s*\d+\s*<\/div>/.test(html)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaLv,
  kratkoIme: kratkoImeLv,
  poenostavi: kljucKlubaLv,
}

export default vir
