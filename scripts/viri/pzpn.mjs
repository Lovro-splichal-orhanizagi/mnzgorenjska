// Vir: PZPN Extranet (Poljska) — uradni zapisniki prek gradnika zveze.
//
// PZPN vodi vsa tekmovanja v Extranetu; zapisnik (protokół) je v njegovem
// skupnem API-ju (`shared-api-ng.laczynaspilka.pl`), ki zahteva ključ.
// Vojvodska zveza ga ima za svoje tekmovanje in ga na svoji strani pokaže z
// gradnikom; gradnik bere JSON prek javnega posrednika zveze
// (`/wp-json/szpn/v1/proxy`), ki ga beremo tudi mi — isto kot obiskovalec.
// **laczynaspilka.pl ne beremo** (podatki so za nevidno reCAPTCHO), ključa
// Shared API nimamo (prošnja PZPN poslana 11. 10. 2026).
//
// Zapisnik je strukturiran: postava in klop z dresom, `isKeeper` (vratar),
// `isCaptain`, stalna šifra osebe (UUID → `reg_st`, kot pri hlf), goli
// (`Normal`, `PenaltyKick`), kartoni (`Yellow`, `SecondYellow`, `Red`) in
// menjave (`In`/`Out`) z minuto. Ura tekme je varšavska = ljubljanska.
//
// ŠIFRA LIGE je `<zveza>/<play_id>` (`swietokrzyski/0e86c2b3-…`); play_id je
// tekmovanje ene sezone, arhiv ima svojega (`plays.json?season_id=…`).
//
// Vljudnost: odkrit User-Agent, 3 s med zahtevki, popolnih zapisnikov ne
// beremo znova. **Ob 401/403/429 ali izzivu se uvoz ustavi — ne obhajaj.**
import { razpakiraj } from '../klubi.mjs'
import { nastopi, regIzUuid } from './hlf.mjs'
import { NEPOPOLN } from './frf.mjs'

export { nastopi, NEPOPOLN }

// Javni posredniki vojvodskih zvez z gradnikom (drugih zaenkrat ne poznamo).
export const POSREDNIKI = {
  swietokrzyski: { api: 'https://szpnkielce.pl/wp-json/szpn/v1/proxy', stran: 'https://szpnkielce.pl/rozgrywki/' },
}
const DOLZINA_TEKME = 90
const NAJMANJ_ZACETNIKOV = 7
export const PREMOR_MS = 3000
const UA = 'Mozilla/5.0 SLFF fantasy (slff.eu; splih.94@gmail.com)'

/** `swietokrzyski/<uuid>` → { zveza, play, api }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z-]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)
  if (!m || !POSREDNIKI[m[1]])
    throw new Error(`pzpn: šifra lige je "<zveza>/<play_id>" (zveze: ${Object.keys(POSREDNIKI).join(', ')}), ne "${koda}"`)
  return { zveza: m[1], play: m[2], api: POSREDNIKI[m[1]].api }
}

const naslovTekem = (koda, vrsta) => {
  const { api, play } = razbijKodo(koda)
  return `${api}/matches.json?play_id=${play}&type=${vrsta}&limit=500&page=1&tz=Europe/Warsaw`
}
export const naslovZapisnika = (koda, id) => `${razbijKodo(koda).api}/pzpn/shared/matches/${id}/events.json`

// --- pretvorbe ------------------------------------------------------------------

const presledki = (s) => razpakiraj(String(s ?? '')).replace(/\s+/g, ' ').trim()

/** "Priimek Ime" kot drugi viri; vir piše ime in priimek ločeno (z odvečnimi presledki). */
export const imeIgralca = (p) => presledki(`${p?.lastname ?? ''} ${p?.firstname ?? ''}`)

/** "82'" → 82, "90' +2'" → 90, "45' +1'" → 45. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "Kolejka 7" → 7. */
export const stevilkaKroga = (oznaka) => {
  const m = String(oznaka ?? '').match(/(\d+)/)
  return m ? Number(m[1]) : null
}

/** "2026-10-04T11:00:00+02:00" (Varšava = Ljubljana) → { datum, ura }; 00:00 = ura neznana. */
export function casTekme(iso) {
  const m = String(iso ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (!m) return { datum: null, ura: null }
  return { datum: m[1], ura: m[2] === '00:00' ? null : m[2] }
}

/** Sezona iz datuma: od julija naprej "2026/27". */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String(leto + 1).slice(2)}`
}

/** "2:8" → { domaci: 2, gostje: 8 }. */
export function izid(s) {
  const m = String(s ?? '').match(/^\s*(\d+)\s*:\s*(\d+)\s*$/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

// Enak objavljeni izid za razpored in zapisnike; 0:0 je veljaven, null ni izid.
const koncniIzid = (tekma) => izid(tekma?.score?.final ?? tekma?.score?.full_time)

/** Prost krog ("pauzuje w tej kolejce") ni tekma. */
export const jePauza = (t) => /pauzuj/i.test(`${t?.host?.name ?? ''} ${t?.guest?.name ?? ''}`)

/** Walkower (kontumacija): vir ga označi v stanju tekme. */
export const jeWalkower = (t) => /walk/i.test(String(t?.state ?? ''))

// --- zapisnik -------------------------------------------------------------------

function ekipa(blok) {
  const igralci = (blok?.squad ?? [])
    .filter((p) => p && (p.lastname || p.firstname))
    .map((p) => ({
      st: p.number == null ? null : Number(p.number),
      ime: imeIgralca(p),
      uuid: p.id ?? null,
      regSt: regIzUuid(p.id),
      zacetnik: String(p.type).toLowerCase() === 'starter',
      kapetan: !!p.isCaptain,
      vratar: !!p.isKeeper,
      pozicija: p.isKeeper ? 'GK' : null,
      goli: p.goals ?? [],
      kartoni: p.cards ?? [],
      menjave: p.substitutions ?? [],
    }))
  return { postava: igralci.filter((i) => i.zacetnik), rezerve: igralci.filter((i) => !i.zacetnik) }
}

/**
 * Zapisnik v obliko drugih virov. `tekma` je vrstica iz matches.json, `odgovor`
 * odgovor events.json. Null, če tekma nima izida.
 */
export function vZapisnik(tekma, odgovor) {
  const rezultat = koncniIzid(tekma)
  if (!rezultat) return null
  const e = odgovor?.events ?? {}
  const imeni = [presledki(tekma.host?.name), presledki(tekma.guest?.name)]
  const ekipe = [ekipa(e.host), ekipa(e.guest)]
  const znana = ekipe.map((x) => x.postava.length >= NAJMANJ_ZACETNIKOV)
  const opozorila = []
  ekipe.forEach((x, idx) => {
    if (znana[idx]) return
    opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${x.postava.length ? `le ${x.postava.length} začetnikov` : 'brez postave'}`)
  })

  const goli = []
  const rumeni = []
  const rdeci = []
  ekipe.forEach((x, idx) => {
    for (const i of [...x.postava, ...x.rezerve]) {
      const kdo = { ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt }
      for (const g of i.goli) {
        const vrsta = String(g.type ?? '')
        if (!/^(normal|penaltykick|owngoal|own)$/i.test(vrsta)) opozorila.push(`neznana vrsta gola "${vrsta}" (${i.ime})`)
        goli.push({ ...kdo, minuta: minuta(g.minute), avtogol: /own/i.test(vrsta), enajstmetrovka: /penalty/i.test(vrsta) })
      }
      for (const k of i.kartoni) {
        const vrsta = String(k.type ?? '')
        if (/^yellow$/i.test(vrsta)) rumeni.push({ ...kdo, minuta: minuta(k.minute) })
        else if (/secondyellow|red/i.test(vrsta)) {
          if (!rdeci.some((r) => r.ekipaIdx === idx && r.regSt === i.regSt && r.ime === i.ime)) rdeci.push({ ...kdo, minuta: minuta(k.minute) })
        } else opozorila.push(`neznan karton "${vrsta}" (${i.ime})`)
      }
    }
  })

  const sestava = ekipe.map((x, idx) => {
    // Ekipa brez znane postave nima nastopov (ne vemo, kdo je igral). Izid ostane.
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    if (x.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${x.postava.length} igralcev namesto 11`)
    const vObliko = ({ uuid, goli: _g, kartoni: _k, menjave, ...i }) => ({
      ...i,
      preklopi: menjave.map((m) => minuta(m.minute)).filter((m) => m != null).sort((a, b) => a - b),
    })
    return { ime: imeni[idx], postava: x.postava.map(vObliko), rezerve: x.rezerve.map(vObliko) }
  })

  // Goli iz zapisnika proti izidu (avtogol šteje nasprotniku).
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (znana[0] && znana[1] && (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje))
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))

  const cas = casTekme(tekma.kickoff_at)
  return {
    zapisnikId: tekma.id,
    url: null,
    sezona: sezonaIzDatuma(cas.datum),
    krog: stevilkaKroga(tekma.round_label),
    datum: cas.datum,
    ura: cas.ura,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas: izid(tekma.score?.half),
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave: [],
    nepopoln: !znana[0] || !znana[1],
    prazen: !ekipe[0].postava.length && !ekipe[1].postava.length,
    opozorila,
  }
}

/** Popoln zapisnik (obe ekipi ≥ 7 začetnikov) — takega ne beremo znova. */
export const popolnZapisnik = (odgovor) =>
  ['host', 'guest'].every((s) => (odgovor?.events?.[s]?.squad ?? []).filter((p) => String(p.type).toLowerCase() === 'starter').length >= NAJMANJ_ZACETNIKOV)

// --- branje ---------------------------------------------------------------------------

/** Odgovor posrednika kot JSON; zavrnitev ali izziv ustavi uvoz. */
function json(besedilo, url) {
  let d
  try {
    d = JSON.parse(besedilo)
  } catch {
    throw new Error(`pzpn: ${url} ni vrnil JSON (izziv ali napaka strani) — uvoz ustavljen, ne obhajamo`)
  }
  if (d && d.success === false) throw new Error(`pzpn: ${url} → ${d.message ?? d.error ?? 'zavrnjeno'} — uvoz ustavljen`)
  return d
}

/** Vse tekme tekmovanja (odigrane in razpisane), brez prostih krogov. */
export async function vseTekme(koda, prenesi) {
  const po = new Map()
  for (const vrsta of ['results', 'schedule']) {
    const url = naslovTekem(koda, vrsta)
    const d = json(await prenesi(url, `pzpn-${razbijKodo(koda).play}-${vrsta}.json`, true), url)
    for (const t of d.data ?? []) if (!jePauza(t)) po.set(t.id, t)
  }
  return [...po.values()]
}

const vir = {
  ime: 'pzpn',
  polnoIme: 'Polski Związek Piłki Nożnej (Extranet, prek zveze)',
  drzava: 'PL',
  osnovniNaslov: 'https://szpnkielce.pl/rozgrywki/',
  glave: { 'User-Agent': UA, Accept: 'application/json' },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda: (koda) => naslovTekem(koda, 'schedule'),
  naslovZapisnika,

  /** Razpored: vsi krogi s tekmami (ljubljanski čas), izidi in walkoverji. */
  async razporedVseStrani(koda, prenesi) {
    const krogi = new Map()
    for (const t of await vseTekme(koda, prenesi)) {
      const stevilka = stevilkaKroga(t.round_label)
      if (!stevilka) continue
      const cas = casTekme(t.kickoff_at)
      const kontumacija = jeWalkower(t)
      if (!krogi.has(stevilka)) krogi.set(stevilka, { stevilka, tekme: [] })
      krogi.get(stevilka).tekme.push({
        domaci: presledki(t.host?.name),
        gostje: presledki(t.guest?.name),
        datum: cas.datum,
        ura: cas.ura,
        kontumacija,
        odigrana: (t.state === 'Rozegrany' && !!koncniIzid(t)) || kontumacija,
        ...(kontumacija && izid(t.score?.final) ? { izid: izid(t.score.final) } : {}),
      })
    }
    return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
  },

  /** Zapisniki vseh odigranih tekem. Popoln zapisnik se ne bere znova, nepopoln 45 dni. */
  async zapisniki(koda, prenesi) {
    const out = []
    for (const t of await vseTekme(koda, prenesi)) {
      if (t.state !== 'Rozegrany' || jeWalkower(t) || !koncniIzid(t)) continue
      const url = naslovZapisnika(koda, t.id)
      const ime = `pzpn-zapisnik-${t.id}.json`
      let odgovor = json(await prenesi(url, ime), url)
      const star = (Date.now() - Date.parse(t.kickoff_at)) / 86400000
      if (!popolnZapisnik(odgovor) && star <= 45) odgovor = json(await prenesi(url, ime, true), url)
      const z = vZapisnik(t, odgovor)
      if (!z) continue
      z.url = POSREDNIKI[razbijKodo(koda).zveza].stran
      out.push({ id: z.zapisnikId, z, url: z.url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  // Ključ kluba brez diakritike (ł → l), kratko ime brez oblike društva.
  kljucKluba: (ime) => kljucKlubaPl(ime),
  kratkoIme: (ime) => kratkoImePl(ime),
  poenostavi: (ime) => kljucKlubaPl(ime),
}

export const kljucKlubaPl = (ime) =>
  presledki(ime)
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Oblike društva na začetku imena ("KS", "GKS", "LZS", "MKS" …) in letnice.
const OBLIKE_PL = new Set(['ks', 'gks', 'lks', 'mks', 'luks', 'lzs', 'glks', 'kkp', 'srkis', 'uks', 'tkkf', 'ts', 'mgks',
  'ogks', 'akp', 'mlks', 'zks', 'kp', 'fc', 'sks', 'aks', 'ws', 'klub', 'sportowy'])
const lepoDel = (b) => (b.length > 3 && b === b.toLocaleUpperCase('pl') ? b[0] + b.slice(1).toLocaleLowerCase('pl') : b)
const lepo = (b) => b.split('-').map(lepoDel).join('-')
/** "KS VICTORIA 2015 Skalbmierz" → "Victoria Skalbmierz". */
export function kratkoImePl(polno) {
  const besede = presledki(polno)
    .split(' ')
    .filter((b) => b && !/^\d{4}$/.test(b) && !OBLIKE_PL.has(b.toLocaleLowerCase('pl').replace(/\./g, '')))
  return besede.length ? besede.slice(0, 3).map(lepo).join(' ') : presledki(polno)
}

export default vir
