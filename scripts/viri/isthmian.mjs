// Vir: Isthmian League, Northern Premier League in Southern League (Anglija,
// step 3–4) — skupna platforma (Streamline Content), javni JSON.
//
// Vse tri lige tečejo na istem zaledju: stran lige (www.isthmian.co.uk,
// www.thenpl.co.uk, www.southern-football-league.co.uk) bere JSON z
// `api.<domena>/matches` in v glavi pošlje `x-tenant-id` (isthmian | npl | sfl)
// — to stori brskalnik vsakega obiskovalca sam, ključa ali prijave ni.
// Glava, ne gostitelj, izbere ligo: brez nje API vrne 400, z napačno vrne
// prazen seznam. Beremo isto kot stran: API strani lige z njeno glavo.
//
// ŠIFRA LIGE je `<tenant>/<tekmovanje>/<sezona>` (`npl/67d7c7bb74247876e6dae40c/2026-27`):
// tekmovanje (`competition`, 24 hex) je STALNO čez sezone (Premier Division
// ima isti id 2025/26 in 2026/27), sezono izbere obdobje
// `period=Custom&startDate=<L>-07-01&endDate=<L+1>-06-30`. Ob novi sezoni se
// popravi le sezona v šifri. Brez `period=Custom` API datuma prezre in vrne
// obe sezoni skupaj.
//
// SEZNAM `GET /matches?competition=<id>&limit=100&page=<n>&sort=asc&…` vrne
// vse tekme (odigrane in prihodnje) in v vsaki že ves zapisnik: `homeLineup`/
// `awayLineup` (osebe s `personId` UUID, dres, `isCaptain`, `hasStartedMatch`
// = začetnik, `position` — skoraj le "GK"), `homeSubs` (minuta, `personOffId`,
// `personOnId`), `homeGoals` (`goalType` normal | penalty | own-goal; strelec
// "N/A" = neznan), `homeCards` (first_yellow_card, second_yellow_card,
// red_card). Posebne strani zapisnika ni — beremo le seznam (~5 strani na
// ligo in sezono).
//
// KROG je "Match N" (`round.name`): zvezina reža razporeda, v kateri igra vsak
// klub enkrat (11 tekem pri 22 klubih). Tekma, prestavljena naprej ali nazaj,
// ostane v svoji reži — krog ima zato lahko tekmo mesece pred ali za ostalimi.
//
// ČAS: `date` in `time` sta angleški krajevni čas (`dateTime` z "Z" je isti
// čas, napačno označen kot UTC). London + 1 h = Ljubljana (poletni čas se
// menja isti dan).
//
// robots.txt na straneh ni (vrne aplikacijo), na API-ju 400. Pogojev uporabe
// s prepovedjo branja nismo našli; noga "© … All rights reserved". Beremo
// odkrito (User-Agent SLFF, 3 s med zahtevki). Ob 401/403/429 ali izzivu se
// uvoz ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi, regIzUuid } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

/** Lige platforme: glava `x-tenant-id`, API in javna stran. */
export const LIGE = {
  isthmian: { api: 'https://api.isthmian.co.uk', stran: 'https://www.isthmian.co.uk', ime: 'Isthmian League' },
  npl: { api: 'https://api.thenpl.co.uk', stran: 'https://www.thenpl.co.uk', ime: 'Northern Premier League' },
  sfl: { api: 'https://api.southern-football-league.co.uk', stran: 'https://www.southern-football-league.co.uk', ime: 'Southern League' },
}
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
const NA_STRAN = 100
const NAJVEC_STRANI = 20
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

/** `npl/<tekmovanje>/2026-27` → { tenant, tekmovanje, sezona: '2026/27', od, do }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z]+)\/([0-9a-f]{24})\/(\d{4})-(\d{2})$/)
  if (!m || !LIGE[m[1]] || (Number(m[3]) + 1) % 100 !== Number(m[4]))
    throw new Error(`isthmian: šifra lige je "<tenant>/<tekmovanje>/<LLLL-LL>" (tenant: ${Object.keys(LIGE).join(', ')}), ne "${koda}"`)
  const leto = Number(m[3])
  return { tenant: m[1], tekmovanje: m[2], sezona: `${leto}/${m[4]}`, od: `${leto}-07-01`, do: `${leto + 1}-06-30` }
}

export function naslovStrani(koda, stran = 1) {
  const { tenant, tekmovanje, od, do: doo } = razbijKodo(koda)
  return `${LIGE[tenant].api}/matches?competition=${tekmovanje}&limit=${NA_STRAN}&page=${stran}&sort=asc&period=Custom&startDate=${od}&endDate=${doo}`
}
export const imeStrani = (koda, stran = 1) => `seznam-${String(koda).replace(/\//g, '_')}-${stran}.json`
// Šifra zapisnika v bazi je `gb<id>`: id tekme (24 hex) je last platforme,
// `matches.zapisnik_id` pa je enoličen čez vse vire.
export const sifraZapisnika = (id) => `gb${String(id).replace(/^gb/, '')}`
export const naslovTekme = (tenant, id) => `${LIGE[tenant]?.stran ?? LIGE.isthmian.stran}/match/${String(id).replace(/^gb/, '')}`

// --- prenos ---------------------------------------------------------------------

/** Glava `x-tenant-id` po gostitelju API-ja (prenos pozna le naslov). */
export const tenantIzNaslova = (url) => {
  const host = (() => { try { return new URL(url).origin } catch { return '' } })()
  return Object.entries(LIGE).find(([, l]) => l.api === host)?.[0] ?? null
}

/** `fetch` z glavo lige; `prenos.mjs` ga dobi kot `vir.fetch`. */
export function isthmianFetch(url, moznosti = {}) {
  const tenant = tenantIzNaslova(url)
  return fetch(url, { ...moznosti, headers: { ...(moznosti.headers ?? {}), ...(tenant ? { 'x-tenant-id': tenant } : {}) } })
}

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class IsthmianZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'IsthmianZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (besedilo) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(besedilo ?? ''))

/** Odgovor kot JSON; HTML (izziv, aplikacija) ali napaka ustavi uvoz. */
export function json(besedilo, url) {
  if (jeIzziv(besedilo)) throw new IsthmianZavrnitev(`isthmian: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  let d
  try {
    d = JSON.parse(besedilo)
  } catch {
    throw new Error(`isthmian: ${url} ni vrnil JSON — uvoz ustavljen`)
  }
  if (!d || !Array.isArray(d.items) || !d.pagination) throw new Error(`isthmian: ${url} nima seznama tekem (${String(besedilo).slice(0, 120)}) — uvoz ustavljen`)
  return d
}

async function beri(prenesi, url, ime) {
  try {
    return json(await prenesi(url, ime, true), url)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new IsthmianZavrnitev(`isthmian: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
}

/**
 * Vse tekme lige v sezoni (vse strani seznama). Seznam se med sezono spreminja
 * (prestavljene tekme se premaknejo), zato ga beremo vsakič svežega.
 */
export async function vseTekme(koda, prenesi) {
  const out = []
  for (let stran = 1; stran <= NAJVEC_STRANI; stran++) {
    const d = await beri(prenesi, naslovStrani(koda, stran), imeStrani(koda, stran))
    out.push(...d.items)
    if (!d.pagination.hasNextPage || !d.items.length) return out
  }
  throw new Error(`isthmian: ${koda} ima več kot ${NAJVEC_STRANI} strani — uvoz ustavljen`)
}

// --- pretvorbe ------------------------------------------------------------------

const presledki = (s) => razpakiraj(String(s ?? '')).replace(/\s+/g, ' ').trim()

/** Minuta dogodka: podaljšek se ne šteje (94 → 90). */
export const minuta = (m) => (m == null || m === '' || Number.isNaN(Number(m)) ? null : Math.min(Number(m), DOLZINA_TEKME))

/** "Match 11" → 11. */
export const stevilkaKroga = (round) => {
  const m = String(round?.name ?? round?.id ?? '').match(/^\s*Match\s+(\d+)\s*$/i)
  return m ? Number(m[1]) : null
}

/** Londonski datum in ura → ljubljanski (+1 h). "00:00" ali prazno = ura neznana. */
export function vLjubljanskiCas(datum, ura) {
  const d = String(datum ?? '').match(/^\d{4}-\d{2}-\d{2}$/) ? datum : null
  const m = String(ura ?? '').match(/^(\d{1,2}):(\d{2})/)
  if (!d || !m || (m[1] === '00' && m[2] === '00')) return { datum: d, ura: null }
  const h = Number(m[1]) + 1
  if (h < 24) return { datum: d, ura: `${String(h).padStart(2, '0')}:${m[2]}` }
  const x = new Date(`${d}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + 1)
  return { datum: x.toISOString().slice(0, 10), ura: `00:${m[2]}` }
}

/** Sezona iz datuma: od julija naprej "2026/27". */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String(leto + 1).slice(2)}`
}

const izid = (t) => {
  const c = t?.score?.current
  return c && Number.isInteger(c.home) && Number.isInteger(c.away) ? { domaci: c.home, gostje: c.away } : null
}
const polcas = (t) => {
  const c = t?.score?.halfTime
  return c && Number.isInteger(c.home) && Number.isInteger(c.away) ? { domaci: c.home, gostje: c.away } : null
}

export const jeOdigrana = (t) => t?.status === 'FullTime'
export const jePrekinjena = (t) => t?.status === 'Abandoned'
/** Zelena miza (stanja še nismo videli; ime po vzoru drugih platform). */
export const jeDodeljena = (t) => /award|walkover|forfeit/i.test(String(t?.status ?? ''))

const imeEkipe = (t, stran) => presledki(t?.[`${stran}TeamName`] ?? t?.[`${stran}Team`]?.fullName)

// Kratka imena, kot jih da platforma (klub.shortName: "AFC Whyteleafe" → "Whyteleafe").
const KRATKA = new Map()
function zapomniKratko(t) {
  for (const s of ['home', 'away']) {
    const polno = imeEkipe(t, s)
    const kratko = presledki(t?.[`${s}Team`]?.club?.shortName ?? t?.[`${s}Team`]?.shortName)
    if (polno && kratko && !KRATKA.has(kljucKlubaGb(polno))) KRATKA.set(kljucKlubaGb(polno), kratko)
  }
}

/** Začetnikov v postavi ene ekipe. */
const zacetnikov = (t, s) => (t?.[`${s}Lineup`] ?? []).filter((p) => p?.hasStartedMatch).length

/** Ima tekma postavi obeh ekip (vsaj 7 začetnikov)? */
export const popolnZapisnik = (t) => zacetnikov(t, 'home') >= NAJMANJ_ZACETNIKOV && zacetnikov(t, 'away') >= NAJMANJ_ZACETNIKOV

/** Kontumacija: dodeljena ali odigrana 3:0 / 0:3 brez obeh postav, starejša od tedna dni. */
export function jeKontumacija(t, danes = Date.now()) {
  if (jeDodeljena(t)) return true
  const r = izid(t)
  if (!jeOdigrana(t) || !r || zacetnikov(t, 'home') || zacetnikov(t, 'away')) return false
  const tri = (r.domaci === 3 && r.gostje === 0) || (r.domaci === 0 && r.gostje === 3)
  return tri && (danes - Date.parse(`${t.date}T00:00:00Z`)) / 86400000 > 7
}

// --- zapisnik -------------------------------------------------------------------

const brezOsebe = (id) => !id || id === 'N/A'

function ekipa(t, s) {
  const preklopi = new Map()
  for (const m of t?.[`${s}Subs`] ?? []) {
    const min = minuta(m.minute)
    if (min == null) continue
    for (const id of [m.personOffId, m.personOnId]) if (!brezOsebe(id)) preklopi.set(id, [...(preklopi.get(id) ?? []), min])
  }
  const igralci = (t?.[`${s}Lineup`] ?? [])
    .filter((p) => p && !brezOsebe(p.personId) && presledki(p.personName))
    .map((p) => {
      const pozicija = ['GK', 'DEF', 'MID', 'FWD'].includes(p.position) ? p.position : null
      return {
        id: p.personId,
        st: p.number == null || p.number === '' ? null : Number(p.number),
        ime: vPriimekIme(presledki(p.personName)),
        regSt: regIzUuid(p.personId),
        zacetnik: !!p.hasStartedMatch,
        kapetan: !!p.isCaptain,
        vratar: pozicija === 'GK',
        pozicija,
        preklopi: (preklopi.get(p.personId) ?? []).sort((a, b) => a - b),
      }
    })
  return { postava: igralci.filter((i) => i.zacetnik), rezerve: igralci.filter((i) => !i.zacetnik) }
}

/**
 * Zapisnik v obliko drugih virov iz vrstice seznama. Null, če tekma ni
 * odigrana ali nima izida.
 *
 * Avtogol platforma vpiše na dva načina: `own-goal` ali kot `normal` z
 * igralcem NASPROTNE ekipe (obakrat v golih ekipe, ki ji gol šteje). Oboje je
 * avtogol pri ekipi strelca. Strelec "N/A" (neznan) je gol ekipe brez strelca.
 */
export function vZapisnik(t) {
  const rezultat = izid(t)
  if (!jeOdigrana(t) || !rezultat) return null
  zapomniKratko(t)
  const imeni = [imeEkipe(t, 'home'), imeEkipe(t, 'away')]
  const ekipe = [ekipa(t, 'home'), ekipa(t, 'away')]
  const znana = ekipe.map((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
  const opozorila = []
  ekipe.forEach((e, idx) => {
    if (!znana[idx]) opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'}`)
  })
  const osebe = new Map() // personId → { ekipaIdx, igralec }
  ekipe.forEach((e, idx) => { for (const i of [...e.postava, ...e.rezerve]) osebe.set(i.id, { ekipaIdx: idx, i }) })
  const kdo = (id) => {
    const o = osebe.get(id)
    return o ? { ekipaIdx: o.ekipaIdx, st: o.i.st, ime: o.i.ime, regSt: o.i.regSt } : null
  }

  const goli = []
  ;['home', 'away'].forEach((s, idx) => {
    for (const g of t[`${s}Goals`] ?? []) {
      const vrsta = String(g.goalType ?? '')
      if (!['normal', 'penalty', 'own-goal'].includes(vrsta)) opozorila.push(`neznana vrsta gola "${vrsta}" (${g.personName ?? '?'})`)
      const strelec = brezOsebe(g.personId) ? null : kdo(g.personId)
      const avtogol = vrsta === 'own-goal' || (strelec != null && strelec.ekipaIdx !== idx)
      if (!strelec && !brezOsebe(g.personId)) opozorila.push(`strelec ${g.personName} (${imeni[idx]}) ni v postavi`)
      const z = strelec ?? { ekipaIdx: avtogol ? 1 - idx : idx, st: null, ime: null, regSt: null }
      goli.push({ ...z, minuta: minuta(g.minute), avtogol, enajstmetrovka: vrsta === 'penalty' })
    }
  })

  const rumeni = []
  const rdeci = []
  ;['home', 'away'].forEach((s) => {
    for (const k of t[`${s}Cards`] ?? []) {
      // Karton trenerja ali osebja (ni v postavi) ne šteje.
      const z = kdo(k.personId)
      if (!z) continue
      const vrsta = String(k.cardType ?? '')
      if (vrsta === 'first_yellow_card') rumeni.push({ ...z, minuta: minuta(k.minute) })
      // Drugi rumeni: prvi je svoj dogodek → 1 rumeni + 1 rdeči kot pri drugih virih.
      else if (vrsta === 'second_yellow_card' || vrsta === 'red_card') {
        if (!rdeci.some((r) => r.ekipaIdx === z.ekipaIdx && r.regSt === z.regSt)) rdeci.push({ ...z, minuta: minuta(k.minute) })
      } else opozorila.push(`neznan karton "${vrsta}" (${k.personName ?? '?'})`)
    }
  })

  const menjave = []
  ;['home', 'away'].forEach((s, idx) => {
    for (const m of t[`${s}Subs`] ?? []) {
      const noter = kdo(m.personOnId)
      const ven = kdo(m.personOffId)
      if (!noter || !ven) opozorila.push(`${imeni[idx]}: menjava v ${m.minute}. min z igralcem, ki ga ni v postavi`)
      menjave.push({ ekipaIdx: idx, minuta: minuta(m.minute), noter: { st: noter?.st ?? null, ime: noter?.ime ?? null }, ven: { st: ven?.st ?? null, ime: ven?.ime ?? null } })
    }
  })

  const sestava = ekipe.map((e, idx) => {
    // Ekipa brez znane postave nima nastopov (ne vemo, kdo je igral). Izid ostane.
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${imeni[idx]}: vratarjev (GK) v postavi je ${vratarjev}`)
    const vObliko = ({ id: _id, ...i }) => i
    return { ime: imeni[idx], postava: e.postava.map(vObliko), rezerve: e.rezerve.map(vObliko) }
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (znana[0] && znana[1] && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje))
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const cas = vLjubljanskiCas(t.date, t.time)
  return {
    zapisnikId: sifraZapisnika(t.id ?? t._id),
    url: null,
    sezona: sezonaIzDatuma(t.date),
    krog: stevilkaKroga(t.round),
    datum: cas.datum,
    ura: cas.ura,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas: polcas(t),
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    nepopoln: !znana[0] || !znana[1],
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    opozorila,
  }
}

// --- razpored -------------------------------------------------------------------

/**
 * Tekme za razpored: brez prekinjenih (Abandoned), ki imajo v istem krogu
 * ponovitev (isti par) — ta je svoja vrstica. Prekinjena brez ponovitve ostane
 * kot neodigrana, da krog ni okrnjen.
 */
export function tekmeRazporeda(tekme) {
  const kljuc = (t) => `${stevilkaKroga(t.round)}|${imeEkipe(t, 'home')}|${imeEkipe(t, 'away')}`
  const drugih = new Map()
  for (const t of tekme) if (!jePrekinjena(t)) drugih.set(kljuc(t), (drugih.get(kljuc(t)) ?? 0) + 1)
  return tekme.filter((t) => !jePrekinjena(t) || !drugih.get(kljuc(t)))
}

/** Seznam tekem → krogi v obliki uvoza razporeda. */
export function razcleniRazpored(tekme, danes = Date.now()) {
  const krogi = new Map()
  for (const t of tekmeRazporeda(tekme)) {
    const stevilka = stevilkaKroga(t.round)
    if (!stevilka) continue
    zapomniKratko(t)
    const cas = vLjubljanskiCas(t.date, t.time)
    const kontumacija = jeKontumacija(t, danes)
    if (!krogi.has(stevilka)) krogi.set(stevilka, { stevilka, tekme: [] })
    krogi.get(stevilka).tekme.push({
      domaci: imeEkipe(t, 'home'),
      gostje: imeEkipe(t, 'away'),
      datum: cas.datum,
      ura: cas.ura,
      kontumacija,
      odigrana: jeOdigrana(t) || kontumacija,
      ...(kontumacija && izid(t) ? { izid: izid(t) } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- klubi ------------------------------------------------------------------------

/** Ključ kluba: male črke, "&" = "and", brez ločil ("Wingate & Finchley" = "wingate and finchley"). */
export const kljucKlubaGb = (ime) =>
  presledki(ime)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const OBLIKE_GB = new Set(['afc', 'fc', 'f.c.', 'a.f.c.'])
/** Kratko ime: kot ga da platforma, sicer brez "AFC"/"FC" ("Hartpury FC" → "Hartpury"). */
export function kratkoImeGb(polno) {
  const z = KRATKA.get(kljucKlubaGb(polno))
  if (z) return z
  const besede = presledki(polno).split(' ').filter((b) => b && !OBLIKE_GB.has(b.toLowerCase()))
  return besede.length ? besede.join(' ') : presledki(polno)
}

// --- vir ----------------------------------------------------------------------------

const vir = {
  ime: 'isthmian',
  polnoIme: 'Isthmian, Northern Premier in Southern League (api.isthmian.co.uk)',
  drzava: 'GB',
  osnovniNaslov: LIGE.isthmian.stran,
  glave: { 'User-Agent': UA, Accept: 'application/json' },
  premorMs: PREMOR_MS,
  imaRegistracije: false,
  fetch: isthmianFetch,

  naslovRazporeda: (koda) => naslovStrani(koda, 1),
  naslovZapisnika: (koda, id) => naslovTekme(razbijKodo(koda).tenant, id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new IsthmianZavrnitev(`isthmian: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  /** Razpored: vsi krogi ("Match N") s tekmami, odigrane in kontumacije. */
  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(await vseTekme(koda, prenesi))
  },

  /** Zapisniki vseh odigranih tekem sezone — v seznamu so že celi. */
  async zapisniki(koda, prenesi) {
    const { tenant, sezona } = razbijKodo(koda)
    const out = []
    for (const t of await vseTekme(koda, prenesi)) {
      if (!jeOdigrana(t) || jeKontumacija(t)) continue
      const z = vZapisnik(t)
      if (!z) continue
      if (z.sezona !== sezona) z.opozorila.push(`tekma ${z.datum} ni v sezoni ${sezona}`)
      z.sezona = sezona
      z.url = naslovTekme(tenant, t.id ?? t._id)
      out.push({ id: z.zapisnikId, z, url: z.url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaGb,
  kratkoIme: kratkoImeGb,
  poenostavi: kljucKlubaGb,
}

export default vir
