// Vir: hailafotbal.ro — uradna javna platforma rezultatov FRF (Romunija).
//
// Od sezone 2026/27 zveze vnašajo DIGITALNE zapisnike: postava in klop s
// številkami dresov, registrirana pozicija igralca ("Portar" = vratar),
// kapetan, strelci z minuto (11 m, avtogol, 90+1'), kartoni, menjave z
// minuto, polčas; vsak igralec ima stalni FRF `playerId` (UUID). Pokritost je
// po županijah različna — glej CLAUDE.md, "Romunija — vir hlf".
//
// DOSTOP. Stran je Angularjeva aplikacija; podatke (JSON) si naloži sama z
// `api.datalake.frf.ro/HaiLaFotbal/…` po tem, ko si priskrbi žeton.
// **Javni JS vsebuje vgrajeno uporabniško ime in geslo za ta API — teh NE
// beremo, ne uporabljamo in API-ja NE kličemo sami.** Beremo kot navaden
// obiskovalec: stran odpremo v pravem brskalniku (Playwright, chromium brez
// glave) in poberemo JSON, ki ga stran SAMA zahteva (`page.on('response')`).
// Med stranmi se premikamo kot človek: izbirnik kroga ("Etapă") in klik na
// tekmo, nazaj z gumbom nazaj — ena polna naložitev na ligo (stran ob vsaki
// naloži ~6 MB filtrov). Slike, pisave, mediji in tuji gostitelji (analitika)
// so blokirani. Odgovorov za žeton (`/Auth/…`) ne beremo. **Ob izzivu,
// CAPTCHI, 401/403/429 ali prijavi se uvoz ustavi — ne obhajaj.**
//
// Vljudnost: odkrit User-Agent (pripona `SLFF fantasy (slff.eu;
// splih.94@gmail.com)`, drugega naslova ne), ≥ 2 s med nalaganji (premik
// kroga, klik na tekmo), popolnih zapisnikov ne beremo znova
// (predpomnilnik `scripts/.predpomnilnik/hlf/`).
//
// ŠIFRA LIGE je pot strani brez kroga, kot v naslovu
// `https://hailafotbal.ro/rezultate/<šifra>/etapa-<N>[/<domači>-<gostje>]`:
//   judetean/<județ>/fotbal/<sezona>/<tekmovanje>/<faza>/<skupina>
//   national/fotbal/<sezona>/<tekmovanje>/<faza>/<skupina>
// npr. `judetean/cluj/fotbal/2026-2027/liga-4-cluj/sezon-regular/grupa-a`,
// `national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1`.
// Sezona je del šifre (arhiv je druga šifra). Seznam izpiše
// `scripts/hailafotbal-lige.mjs`.
//
// PODATKI (odgovori, ki jih stran zahteva sama)
// - GetCompetitionStageSeriesTourRounds {OrganizationId}: vsi krogi zveze
//   (seriesId, orderdisplay = številka kroga, startDate).
// - GetMatches {SeasonId, CompetitionId, StageId, SeriesId, TourRoundId}: tekme
//   kroga (matchId, startDate = bukareški čas, izid, polčas, klub id+ime) in
//   VSI dogodki kroga: goals (sysGoalTypeId 1 gol, 2 enajstmetrovka, 3
//   avtogol), yellowCards, redCards, replacements (+ medicalReplacements),
//   minute + minuteExtra.
// - GetMatchSheets {MatchId}: zapisnik — homeClub/awayClub, `players`
//   (začetniki), `reserves` (+ `reservesExtra`) s shirtNo, isTeamCaptainYn,
//   playerPosition. Datumov rojstva ne beremo; fotografij ne hranimo.
//
// NEPOPOLNI ZAPISNIKI ("nu există o versiune salvată a foii de joc"): izid je,
// postave ni. Kot pri frf: uvoz zapiše izid, `imported_at` ostane prazen
// (`nepopoln`, opozorilo `NEPOPOLN`), nočni uvoz tekmo bere znova 45 dni.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { minuteIzPreklopov } from './facr.mjs'
import { NEPOPOLN, kljucKlubaRo, kratkoImeRo, vLjubljanskiCas, vejica } from './frf.mjs'
import { sifra } from './zapisniki.mjs'

export { NEPOPOLN }

export const OSNOVNI = 'https://hailafotbal.ro'
const API = 'api.datalake.frf.ro'
const DOLZINA_TEKME = 90
/** Najmanj začetnikov, da ekipa šteje za ekipo z znano postavo (pravila igre). */
const NAJMANJ_ZACETNIKOV = 7
export const PREMOR_MS = 2000
// Dogovorjeno besedilo: kdo bere in kako nas dobijo. Drugega naslova ne.
export const PRIPONA_UA = 'SLFF fantasy (slff.eu; splih.94@gmail.com)'
const PREDPOMNILNIK = 'scripts/.predpomnilnik/hlf'

// --- šifra in naslovi -------------------------------------------------------

/** Šifra → deli. Vrže napako, če ni oblike iz glave datoteke. */
export function razbijKodo(koda) {
  const pot = String(koda ?? '').trim().replace(/^\/+|\/+$/g, '').replace(/^rezultate\//, '')
  let m = pot.match(/^judetean\/([a-z-]+)\/fotbal\/(\d{4}-\d{4})\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/)
  if (m) return { pot, raven: 'judetean', judet: m[1], sezona: m[2], tekmovanje: m[3], faza: m[4], skupina: m[5] }
  m = pot.match(/^national\/fotbal\/(\d{4}-\d{4})\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/)
  if (m) return { pot, raven: 'national', judet: null, sezona: m[1], tekmovanje: m[2], faza: m[3], skupina: m[4] }
  throw new Error(
    `hlf: šifra lige je "judetean/<judet>/fotbal/<sezona>/<tekmovanje>/<faza>/<skupina>" ali "national/fotbal/…", ne "${koda}"`,
  )
}
export const naslovLige = (koda) => `${OSNOVNI}/rezultate/${razbijKodo(koda).pot}`
export const naslovKroga = (koda, krog) => `${naslovLige(koda)}/etapa-${krog}`

/** Slug kot ga gradi stran: "Victoria Viişoara" → "victoria-viisoara". */
export const slug = (s) =>
  razpakiraj(String(s ?? ''))
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** "2026-2027" → "2026/27". */
export const sezonaIzKode = (koda) => {
  const s = razbijKodo(koda).sezona
  return `${s.slice(0, 4)}/${s.slice(7, 9)}`
}

// --- imena ------------------------------------------------------------------

const presledki = (s) => vejica(razpakiraj(String(s ?? ''))).replace(/\s+/g, ' ').trim()

/** Ime igralca "Priimek Ime" (kot frf), ş ţ → ș ț, "Ana - Maria" → "Ana-Maria". */
export const imeIgralca = (p) => presledki(`${p?.lastName ?? ''} ${p?.firstName ?? ''}`).replace(/\s*-\s*/g, '-')

// Isto ime, drug klub: ime kluba je enolično v državi, AJF pa so ločene
// piramide. Trk se doda sem (`<judet>|<ime>` → "Ime (Županija)").
const IME_V_ZUPANIJI = {}
export function imeKluba(ime, judet) {
  const cisto = presledki(ime)
  return IME_V_ZUPANIJI[`${judet}|${cisto}`] ?? cisto
}

/**
 * `reg_st` je v bazi bigint, FRF pa ima UUID. Vzamemo prvih 13 šestnajstiških
 * števk (52 bitov — natančno v JS Number); trk je pri 10⁵ igralcih ~10⁻⁶ in
 * indeks je še po tekmovanju. Vir sam povezuje dogodke s postavo po celem UUID.
 */
export function regIzUuid(uuid) {
  const hex = String(uuid ?? '').replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(hex) || /^0+$/.test(hex)) return null
  return parseInt(hex.slice(0, 13), 16)
}

// --- čas --------------------------------------------------------------------

/** "2026-10-10T10:30:00" (Bukarešta) → { datum, ura } v ljubljanskem času; 00:00 = ura neznana. */
export function casTekme(startDate) {
  const m = String(startDate ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!m) return { datum: null, ura: null }
  if (m[2] === '00' && m[3] === '00') return { datum: m[1], ura: null }
  return vLjubljanskiCas(m[1], `${m[2]}:${m[3]}`)
}

/** Minuta dogodka: podaljšek se ne šteje (90+3 → 90, 45+2 → 45). */
export const minutaDogodka = (d) => (d?.minute == null ? null : Math.min(Number(d.minute), DOLZINA_TEKME))

const danesBukarest = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10)
const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

// --- odgovori strani ----------------------------------------------------------

/** Krogi serije iz GetCompetitionStageSeriesTourRounds: [{ stevilka, id, zacetek }]. */
export function kroziSerije(odgovor, seriesId) {
  const vrstice = odgovor?.responseData ?? []
  const out = new Map()
  for (const r of vrstice) {
    if (r.seriesId !== seriesId) continue
    const stevilka = Number(r.orderdisplay ?? r.orderNo)
    if (!out.has(stevilka)) out.set(stevilka, { stevilka, id: r.tourRoundId, zacetek: String(r.startDate ?? '').slice(0, 10) || null })
  }
  return [...out.values()].sort((a, b) => a.stevilka - b.stevilka)
}

/** Tekme kroga iz GetMatches (krog): ploščat seznam v vrstnem redu strani. */
export const tekmeKroga = (krog) => (krog?.responseData?.matches ?? []).flatMap((d) => d.list ?? [])

const izid = (t) =>
  t?.homeGoals == null || t?.awayGoals == null ? null : { domaci: Number(t.homeGoals), gostje: Number(t.awayGoals) }

/** Igralci enega razdelka zapisnika. */
function igralciRazdelka(razdelek, zacetnik) {
  return (razdelek?.players ?? [])
    .map((x) => x?.player)
    .filter((p) => p && (p.lastName || p.firstName))
    .map((p) => ({
      st: p.shirtNo == null ? null : Number(p.shirtNo),
      ime: imeIgralca(p),
      uuid: p.playerId ?? null,
      regSt: regIzUuid(p.playerId),
      zacetnik,
      kapetan: Boolean(p.isTeamCaptainYn),
      // Registrirana pozicija; "Portar" je oznaka vratarja (kot (V) pri MNZ).
      vratar: /^portar/i.test(String(p.playerPosition ?? '').trim()),
      pozicija: /^portar/i.test(String(p.playerPosition ?? '').trim()) ? 'GK' : null,
    }))
}

/** Ekipa iz zapisnika: { postava, rezerve }; brez zapisnika prazna. */
export function ekipaZapisnika(klub) {
  return {
    postava: igralciRazdelka(klub?.players, true),
    rezerve: [...igralciRazdelka(klub?.reserves, false), ...igralciRazdelka(klub?.reservesExtra, false)],
  }
}

/** Ali odgovor GetMatchSheets nosi postavo (vsaj enega igralca). */
export const imaZapisnik = (list) =>
  !!list && ['homeClub', 'awayClub'].some((k) => (list[k]?.players?.players ?? []).length || (list[k]?.reserves?.players ?? []).length)

/** Ali je zapisnik popoln (obe ekipi ≥ 7 začetnikov) — takega ne beremo znova. */
export const popolnZapisnik = (list) =>
  !!list && ['homeClub', 'awayClub'].every((k) => (list[k]?.players?.players ?? []).length >= NAJMANJ_ZACETNIKOV)

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. `tekma` je vrstica iz GetMatches
 * kroga, `krog` ves odgovor kroga (dogodki), `list` odgovor GetMatchSheets ali
 * null. Null, če tekma nima izida.
 */
export function vZapisnik(tekma, krog, list, { judet = null, stevilka = null } = {}) {
  const rezultat = izid(tekma)
  if (!rezultat) return null
  const r = krog?.responseData ?? {}
  const id = tekma.matchId
  const klubi = [tekma.homeClub?.clubId, tekma.awayClub?.clubId]
  const imeni = [imeKluba(tekma.homeClub?.name, judet), imeKluba(tekma.awayClub?.name, judet)]
  const opozorila = []
  if (list && list.matchId && list.matchId !== id) throw new Error(`hlf: zapisnik ${list.matchId} ni zapisnik tekme ${id}`)

  const ekipe = [ekipaZapisnika(list?.homeClub), ekipaZapisnika(list?.awayClub)]
  const znana = ekipe.map((e) => e.postava.length >= NAJMANJ_ZACETNIKOV)
  const nepopoln = !znana[0] || !znana[1]
  ekipe.forEach((e, idx) => {
    if (znana[idx]) return
    const kaj = !list ? 'zapisnika ni (ni shranjene različice)' : e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'
    opozorila.push(`${NEPOPOLN}: ${imeni[idx]} — ${kaj}`)
  })

  // Igralec po UUID v ekipi; dogodek brez igralca v postavi ostane brez nastopa.
  const poUuid = ekipe.map((e) => new Map([...e.postava, ...e.rezerve].filter((i) => i.uuid).map((i) => [i.uuid, i])))
  const ekipaIdx = (clubId) => klubi.indexOf(clubId)
  const kdo = (d, idx) => {
    const i = poUuid[idx]?.get(d.playerId)
    return { ekipaIdx: idx, st: i?.st ?? (d.shirtNo == null ? null : Number(d.shirtNo)), ime: i?.ime ?? presledki(d.player), regSt: i?.regSt ?? regIzUuid(d.playerId), uuid: d.playerId }
  }
  const dogodki = (seznam) =>
    (seznam ?? []).filter((d) => d.matchId === id).map((d) => {
      const idx = ekipaIdx(d.clubId)
      if (idx < 0) opozorila.push(`dogodek kluba ${d.clubId} (${presledki(d.player)}) ni ne domači ne gost`)
      return { d, idx }
    }).filter((x) => x.idx >= 0)

  const goli = []
  for (const { d, idx } of dogodki(r.goals)) {
    const tip = Number(d.sysGoalTypeId)
    if (![1, 2, 3].includes(tip)) opozorila.push(`neznana vrsta gola ${d.sysGoalTypeId} (${presledki(d.player)})`)
    goli.push({ ...kdo(d, idx), minuta: minutaDogodka(d), avtogol: tip === 3, enajstmetrovka: tip === 2 })
  }
  const rumeni = dogodki(r.yellowCards).map(({ d, idx }) => ({ ...kdo(d, idx), minuta: minutaDogodka(d) }))
  const rdeci = []
  for (const { d, idx } of dogodki(r.redCards)) {
    const k = kdo(d, idx)
    if (!rdeci.some((x) => x.ekipaIdx === idx && x.uuid === k.uuid)) rdeci.push({ ...k, minuta: minutaDogodka(d) })
  }
  const menjave = []
  for (const { d, idx } of [...dogodki(r.replacements), ...dogodki(r.medicalReplacements)]) {
    const noter = kdo({ playerId: d.playerInId, player: d.playerIn, shirtNo: d.shirtNoIn }, idx)
    const ven = kdo({ playerId: d.playerOutId, player: d.playerOut, shirtNo: d.shirtNoOut }, idx)
    menjave.push({ ekipaIdx: idx, minuta: minutaDogodka(d), noter, ven })
  }

  const sestava = ekipe.map((e, idx) => {
    // Ekipa brez znane postave nima nastopov (ne vemo, kdo je igral). Izid ostane.
    if (!znana[idx]) return { ime: imeni[idx], postava: [], rezerve: [] }
    const vsi = [...e.postava, ...e.rezerve]
    if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const uuidji = vsi.map((i) => i.uuid).filter(Boolean)
    if (new Set(uuidji).size !== uuidji.length) opozorila.push(`${imeni[idx]}: isti igralec dvakrat v zapisniku`)
    const brez = vsi.filter((i) => i.regSt == null)
    if (brez.length) opozorila.push(`${imeni[idx]}: ${brez.length} igralcev brez šifre (${brez.map((i) => i.ime).join(', ')})`)
    for (const m of menjave.filter((x) => x.ekipaIdx === idx)) {
      if (!poUuid[idx].has(m.noter.uuid)) opozorila.push(`${imeni[idx]}: vstopil ${m.noter.ime} ni v zapisniku`)
      if (!poUuid[idx].has(m.ven.uuid)) opozorila.push(`${imeni[idx]}: izstopil ${m.ven.ime} ni v zapisniku`)
    }
    // Preklopi (vstopi in izstopi) po igralcu — za leteče menjave.
    const preklopi = (i) =>
      menjave.filter((m) => m.ekipaIdx === idx && (m.noter.uuid === i.uuid || m.ven.uuid === i.uuid)).map((m) => m.minuta).filter((x) => x != null)
    // Menjave se morajo izmenjevati (začetnik ven-noter-ven, rezerva noter-ven …);
    // zapisnik ima včasih menjave v 0. minuti, ki se ne izidejo — minute so tam približne.
    for (const i of vsi) {
      const zaporedje = menjave
        .filter((m) => m.ekipaIdx === idx && (m.noter.uuid === i.uuid || m.ven.uuid === i.uuid))
        .sort((a, b) => (a.minuta ?? 0) - (b.minuta ?? 0))
        .map((m) => (m.noter.uuid === i.uuid ? 'noter' : 'ven'))
      if (zaporedje.some((v, j) => v !== ((j % 2 === 0) === i.zacetnik ? 'ven' : 'noter')))
        opozorila.push(`${imeni[idx]}: menjave igralca ${i.ime} se ne izidejo (${zaporedje.join(', ')}) — minute so približne`)
    }
    const vObliko = ({ uuid, ...i }) => ({ ...i, preklopi: preklopi({ uuid }) })
    return { ime: imeni[idx], postava: e.postava.map(vObliko), rezerve: e.rezerve.map(vObliko) }
  })

  // Goli iz dogodkov proti izidu (avtogol šteje nasprotniku).
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  opozorila.sort((a, b) => Number(b.startsWith(NEPOPOLN)) - Number(a.startsWith(NEPOPOLN)))
  const cas = casTekme(tekma.startDate)
  const brezUuid = (x) => {
    const { uuid, ...ostalo } = x
    return ostalo
  }
  return {
    zapisnikId: id,
    url: null,
    sezona: null,
    krog: stevilka ?? tekma.tourRoundOrderDisplay ?? null,
    datum: cas.datum,
    ura: cas.ura,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat,
    polcas:
      tekma.homeGoalsHalfTime == null || tekma.awayGoalsHalfTime == null
        ? null
        : { domaci: Number(tekma.homeGoalsHalfTime), gostje: Number(tekma.awayGoalsHalfTime) },
    goli: goli.map(brezUuid),
    zgresene: [],
    rumeni: rumeni.map(brezUuid),
    rdeci: rdeci.map(brezUuid),
    menjave: menjave.map((m) => ({ ...m, noter: brezUuid(m.noter), ven: brezUuid(m.ven) })),
    nepopoln,
    prazen: !imaZapisnik(list),
    opozorila,
  }
}

/**
 * Nastopi po šifri igralca. Začetnik od 0 do izstopa (ali rdečega kartona),
 * rezerva od vstopa; leteče menjave sešteje `minuteIzPreklopov`. Rezerva brez
 * vstopa ni nastopila — razen strelca brez vpisanega vstopa (od minute gola).
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
        if (!goliIgralca.length) continue
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
        st: i.st ?? null,
        ime: i.ime,
        regSt: i.regSt ?? null,
        pozicija: i.pozicija ?? null,
        vratar: !!i.vratar,
        kapetan: !!i.kapetan,
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

/** Kontumacija: 3:0 ali 0:3 brez zapisnika, starejša od tedna dni. */
export const jeKontumacija = (tekma, list, danes = Date.now()) => {
  const r = izid(tekma)
  if (!r || imaZapisnik(list)) return false
  const tri = (r.domaci === 3 && r.gostje === 0) || (r.domaci === 0 && r.gostje === 3)
  return tri && starostDni(casTekme(tekma.startDate).datum, danes) > 7
}

/**
 * Razpored iz odgovorov krogov: [{ stevilka, tekme: [...] }]. Krog brez
 * datuma (nerazpisan) izpustimo; pride z naslednjim uvozom.
 */
export function razporedIzKrogov(krogi, { judet = null, listi = new Map(), danes = danesBukarest() } = {}) {
  const out = []
  for (const { stevilka, odgovor } of krogi) {
    const tekme = tekmeKroga(odgovor).map((t) => {
      const cas = casTekme(t.startDate)
      const kontumacija = jeKontumacija(t, listi.get(t.matchId) ?? null, Date.parse(`${danes}T00:00:00Z`)) && listi.has(t.matchId)
      return {
        domaci: imeKluba(t.homeClub?.name, judet),
        gostje: imeKluba(t.awayClub?.name, judet),
        datum: cas.datum,
        ura: cas.ura,
        kontumacija,
        odigrana: !!izid(t),
        ...(kontumacija ? { izid: izid(t) } : {}),
      }
    })
    if (tekme.some((t) => t.datum)) out.push({ stevilka, tekme })
  }
  return out.sort((a, b) => a.stevilka - b.stevilka)
}

// --- brskalnik ----------------------------------------------------------------

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

/** Besedilo za primerjavo imen: brez diakritike, presledkov in velikih črk. */
const poenoti = (s) => slug(s).replace(/-/g, '')

/** Izziv ali prijava namesto strani. Ne obhajamo. */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/**
 * Seja v brskalniku za eno ligo. Stran odpre enkrat, nato kot obiskovalec
 * menja krog in klikne tekme. Zbira odgovore, ki jih stran sama zahteva.
 */
export class Seja {
  constructor(koda, { log = (v) => console.log(v), premorMs = PREMOR_MS } = {}) {
    this.koda = koda
    this.deli = razbijKodo(koda)
    this.log = log
    this.premorMs = premorMs
    this.odgovori = []
    this.zadnji = 0
    this.napaka = null
  }

  async vljudno() {
    const c = this.zadnji + this.premorMs - Date.now()
    if (c > 0) await cakaj(c)
    this.zadnji = Date.now()
  }

  async odpri(krog = 1) {
    let chromium
    try {
      ;({ chromium } = await import('playwright'))
    } catch {
      throw new Error('hlf: manjka playwright — npm ci in `npx playwright install chromium --only-shell`')
    }
    this.brskalnik = await chromium.launch({ headless: true })
    // Navaden Chromov niz (brez "HeadlessChrome") in naša pripona: kdo bere.
    const ua = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.brskalnik.version()} Safari/537.36 ${PRIPONA_UA}`
    this.kontekst = await this.brskalnik.newContext({ userAgent: ua, locale: 'ro-RO', timezoneId: 'Europe/Bucharest' })
    this.stran = await this.kontekst.newPage()
    await this.stran.route('**/*', (r) => {
      const req = r.request()
      const host = new URL(req.url()).host
      if (['image', 'font', 'media'].includes(req.resourceType())) return r.abort()
      if (!/(^|\.)hailafotbal\.ro$|(^|\.)frf\.ro$/.test(host)) return r.abort()
      return r.continue()
    })
    this.stran.on('response', async (res) => {
      const url = res.url()
      if (!url.includes(API)) return
      const ime = url.split('?')[0].split('/').pop()
      // Žetona ne beremo (ne odgovora ne zahteve).
      if (/\/Auth\//i.test(url) || /token|login/i.test(ime)) return
      if ([401, 403, 429].includes(res.status())) {
        this.napaka = new Error(`hlf: ${ime} -> HTTP ${res.status()} — uvoz ustavljen, ne obhajamo`)
        return
      }
      let telo = null
      try {
        telo = await res.json()
      } catch {}
      let zahteva = null
      try {
        zahteva = JSON.parse(res.request().postData() ?? 'null')
      } catch {}
      this.odgovori.push({ ime, zahteva, telo, status: res.status() })
    })
    await this.vljudno()
    const url = naslovKroga(this.koda, krog)
    this.log(`  hlf: odpiram ${url}`)
    let odg
    try {
      odg = await this.stran.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    } catch (e) {
      // Stran se včasih ne odzove v minuti; enkrat poskusimo znova.
      this.log(`  hlf: ${e.message.split('\n')[0]} — poskusim znova čez 15 s`)
      await cakaj(15000)
      odg = await this.stran.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    }
    if (odg && [401, 403, 429].includes(odg.status())) throw new Error(`hlf: ${url} -> HTTP ${odg.status()} — uvoz ustavljen`)
    await this.cakajNa((o) => o.ime === 'GetMatches' && o.zahteva?.TourRoundId, 45000)
    await this.preveriStran()
    // Stran lahko naloži kroge več lig zveze; prava je tista, katere tekme so
    // na karticah strani.
    await this.stran.locator('.match-container').first().waitFor({ timeout: 15000 }).catch(() => {})
    const besedila = (await this.stran.locator('.match-container .match-details.isnotmobile').allInnerTexts().catch(() => [])).map(poenoti)
    const naStrani = (o) =>
      tekmeKroga(o.telo).every((t) => besedila.some((b) => b.includes(poenoti(t.homeClub?.name)) && b.includes(poenoti(t.awayClub?.name))))
    const kandidati = this.odgovori.filter((o) => o.ime === 'GetMatches' && o.zahteva?.TourRoundId && o.telo?.responseData)
    const k = (besedila.length ? kandidati.filter(naStrani).at(-1) : null) ?? kandidati.at(-1)
    if (!k) throw new Error(`hlf: ${url} ni naložila tekem kroga`)
    if (besedila.length && !naStrani(k)) throw new Error(`hlf: tekme v odgovoru se ne ujemajo s karticami na ${url}`)
    this.ids = { SeasonId: k.zahteva.SeasonId, CompetitionId: k.zahteva.CompetitionId, StageId: k.zahteva.StageId, SeriesId: k.zahteva.SeriesId }
    // Stran ob neznani poti pokaže privzeto ligo — preveri, da smo na pravi.
    const pot = decodeURI(new URL(this.stran.url()).pathname)
    if (!pot.startsWith(`/rezultate/${this.deli.pot}/`)) throw new Error(`hlf: stran je odprla ${pot}, ne lige ${this.deli.pot} — je šifra prava?`)
    // Krogi pridejo za vso zvezo; stran jih lahko naloži za več zvez (SuperLiga je LPF,
    // ne FRF) — vzamemo odgovor, ki ima krog te serije.
    const imaSerijo = (o) =>
      o.ime === 'GetCompetitionStageSeriesTourRounds' && (o.telo?.responseData ?? []).some((r) => r.seriesId === this.ids.SeriesId)
    const kr = await this.cakajNa(imaSerijo, 30000)
    this.krogi = kroziSerije(kr?.telo, this.ids.SeriesId)
    if (!this.krogi.length) throw new Error(`hlf: liga ${this.koda} nima krogov`)
    this.trenutni = krog
    return this
  }

  zadnjiOdgovor(pogoj) {
    for (let i = this.odgovori.length - 1; i >= 0; i--) if (pogoj(this.odgovori[i])) return this.odgovori[i]
    return null
  }

  async cakajNa(pogoj, ms = 20000) {
    const konec = Date.now() + ms
    while (Date.now() < konec) {
      if (this.napaka) throw this.napaka
      const o = this.zadnjiOdgovor(pogoj)
      if (o) return o
      await cakaj(150)
    }
    await this.preveriStran()
    return null
  }

  async preveriStran() {
    if (this.napaka) throw this.napaka
    const html = await this.stran.content().catch(() => '')
    if (jeIzziv(html)) throw new Error('hlf: stran vrne izziv ali CAPTCHO — uvoz ustavljen, ne obhajamo ga')
    if (/\/login|\/prijava|autentificare/i.test(this.stran.url())) throw new Error('hlf: stran zahteva prijavo — uvoz ustavljen')
  }

  /** Odgovor GetMatches za krog; izbere ga v izbirniku "Etapă", če še ni na strani. */
  async krog(stevilka) {
    const k = this.krogi.find((x) => x.stevilka === stevilka)
    if (!k) throw new Error(`hlf: krog ${stevilka} ni v ligi ${this.koda}`)
    // TourRoundId je skupen vsem ligam zveze (krog N), zato še SeriesId — sicer
    // vzamemo krog druge lige iste županije (Cluj L5 Gherla, 10. 10. 2026).
    const jeTa = (o) =>
      o.ime === 'GetMatches' && o.zahteva?.TourRoundId === k.id && o.zahteva?.SeriesId === this.ids.SeriesId && o.telo?.responseData
    const ze = this.zadnjiOdgovor(jeTa)
    if (ze && this.trenutni === stevilka) return ze.telo
    const pred = this.odgovori.length
    const novi = (x) => this.odgovori.indexOf(x) >= pred && jeTa(x)
    await this.vljudno()
    let o = null
    try {
      // Kot obiskovalec: izbirnik "Etapă" in možnost "Etapa N".
      await this.stran.keyboard.press('Escape').catch(() => {})
      const izbirnik = this.stran.getByRole('combobox', { name: /Etap|Round/i })
      await izbirnik.click({ timeout: 10000 }).catch(() => izbirnik.click({ force: true, timeout: 5000 }))
      const moznost = this.stran.getByRole('option').filter({ hasText: new RegExp(`(^|\\s)${stevilka}\\s*$`) })
      await moznost.first().click({ timeout: 10000 })
      o = await this.cakajNa(novi, 30000)
    } catch (e) {
      if (/HTTP|izziv|prijavo/.test(e.message)) throw e
      if (process.env.HLF_SLIKA) await this.stran.screenshot({ path: process.env.HLF_SLIKA, fullPage: true }).catch(() => {})
    }
    if (!o) {
      // Izbirnik se ni odzval: krog odpremo z njegovim naslovom (polno nalaganje).
      this.log(`  hlf: izbirnik kroga ${stevilka} se ni odzval — odpiram stran kroga`)
      await this.vljudno()
      await this.stran.goto(naslovKroga(this.koda, stevilka), { waitUntil: 'domcontentloaded', timeout: 90000 })
      o = await this.cakajNa(novi, 45000)
      await this.preveriStran()
    }
    if (!o) throw new Error(`hlf: krog ${stevilka} se ni naložil`)
    // Odgovor pride pred karticami: stran še nekaj časa kaže prejšnji krog.
    // Počakamo, da so na karticah tekme odgovora, sicer krog odpremo z naslovom.
    if (!(await this.karticeKazejo(o.telo, 15000))) {
      this.log(`  hlf: kartice kroga ${stevilka} se niso osvežile — odpiram stran kroga`)
      await this.vljudno()
      await this.stran.goto(naslovKroga(this.koda, stevilka), { waitUntil: 'domcontentloaded', timeout: 90000 })
      await this.preveriStran()
      if (!(await this.karticeKazejo(o.telo, 30000))) throw new Error(`hlf: kartice kroga ${stevilka} se ne ujemajo z odgovorom`)
    }
    this.trenutni = stevilka
    return o.telo
  }

  /** Ali kartice na strani kažejo natanko tekme odgovora kroga (čaka do `ms`). */
  async karticeKazejo(odgovor, ms) {
    const tekme = tekmeKroga(odgovor)
    const konec = Date.now() + ms
    while (Date.now() < konec) {
      const besedila = (await this.stran.locator('.match-container .match-details.isnotmobile').allInnerTexts().catch(() => [])).map(poenoti)
      if (
        besedila.length === tekme.length &&
        tekme.every((t) => besedila.some((b) => b.includes(poenoti(t.homeClub?.name)) && b.includes(poenoti(t.awayClub?.name))))
      )
        return true
      await cakaj(300)
    }
    return false
  }

  /**
   * Zapisnik tekme: klik na kartico tekme v krogu, odgovor GetMatchSheets,
   * nazaj z gumbom strani. Null, če ga stran ne naloži (ni shranjene različice).
   */
  async zapisnik(stevilka, tekma) {
    const krog = await this.krog(stevilka)
    const tekme = tekmeKroga(krog)
    const idx = tekme.findIndex((t) => t.matchId === tekma.matchId)
    if (idx < 0) throw new Error(`hlf: tekme ${tekma.matchId} ni v krogu ${stevilka}`)
    const kartice = this.stran.locator('.match-container .match-details.isnotmobile')
    await kartice.first().waitFor({ timeout: 15000 }).catch(async (e) => {
      if (process.env.HLF_SLIKA) await this.stran.screenshot({ path: process.env.HLF_SLIKA, fullPage: true })
      throw new Error(`hlf: krog ${stevilka} brez kartic tekem (${this.stran.url()}): ${e.message}`)
    })
    const n = await kartice.count()
    if (n !== tekme.length) throw new Error(`hlf: krog ${stevilka} ima na strani ${n} tekem, v odgovoru ${tekme.length}`)
    // Kartico poiščemo po imenih obeh klubov, ne po mestu: stran jih lahko
    // razvrsti drugače kot odgovor.
    const besedila = (await kartice.allInnerTexts()).map(poenoti)
    const ime = (k) => poenoti(k?.name)
    let mesto = besedila.findIndex((b) => b.includes(ime(tekma.homeClub)) && b.includes(ime(tekma.awayClub)))
    if (mesto < 0) mesto = besedila[idx]?.includes(ime(tekma.homeClub)) ? idx : -1
    if (mesto < 0) throw new Error(`hlf: kartice tekme ${tekma.homeClub?.name} - ${tekma.awayClub?.name} ni v krogu ${stevilka}`)
    const pred = this.odgovori.length
    await this.vljudno()
    await kartice.nth(mesto).click()
    const o = await this.cakajNa((x) => this.odgovori.indexOf(x) >= pred && x.ime === 'GetMatchSheets', 12000)
    // Nazaj na krog z gumbom strani "← Înapoi" (zgodovina brskalnika se pri
    // menjavi kroga ne ujema s krogi). Brez gumba krog izberemo znova.
    const nazaj = this.stran.locator('a.back')
    try {
      await nazaj.first().waitFor({ timeout: 10000 })
      await nazaj.first().click()
      if (!(await this.karticeKazejo(krog, 15000))) this.trenutni = null
    } catch {
      this.trenutni = null
    }
    if (!o) return null
    if (o.zahteva?.MatchId && o.zahteva.MatchId !== tekma.matchId)
      throw new Error(`hlf: klik na tekmo ${tekma.matchId} je odprl ${o.zahteva.MatchId}`)
    return o.status === 200 && o.telo && typeof o.telo === 'object' ? o.telo : null
  }

  async zapri() {
    await this.brskalnik?.close().catch(() => {})
  }
}

// --- predpomnilnik --------------------------------------------------------------

const potDatoteke = (ime) => `${PREDPOMNILNIK}/${ime}`
function beriJson(ime) {
  try {
    return existsSync(potDatoteke(ime)) ? JSON.parse(readFileSync(potDatoteke(ime), 'utf8')) : null
  } catch {
    return null
  }
}
function pisiJson(ime, vsebina) {
  mkdirSync(PREDPOMNILNIK, { recursive: true })
  writeFileSync(potDatoteke(ime), JSON.stringify(vsebina))
}
// Hranimo le, kar uvoz rabi: brez fotografij, logotipov in sodnikov (osebni
// podatki, ki jih ne potrebujemo).
export const brezSlik = (o) =>
  JSON.parse(JSON.stringify(o, (k, v) => (/^(photo|photoIn|photoOut|logo|logoPath|delegates|staff|extraStaff)$/i.test(k) ? undefined : v)))
const imeKroga = (koda, n) => `krog-${sifra(koda)}-${n}.json`
const imeLista = (id) => `list-${id}.json`

/** Je krog zaključen: vse tekme imajo izid in zadnja je starejša od tedna dni. */
const krogZakljucen = (odgovor, danes) => {
  const t = tekmeKroga(odgovor)
  return t.length > 0 && t.every((x) => izid(x)) && t.every((x) => starostDni(casTekme(x.startDate).datum, danes) > 7)
}

/**
 * Odgovori vseh krogov lige (krog po krog v seji). Zaključen krog iz
 * predpomnilnika ne beremo znova; prihodnje kroge beremo le do `doDatuma`.
 */
async function vsiKrogi(seja, { danes = Date.now(), samoOdigrani = false } = {}) {
  const out = []
  const danesIso = new Date(danes).toISOString().slice(0, 10)
  for (const k of seja.krogi) {
    if (samoOdigrani && k.zacetek && k.zacetek > danesIso) continue
    const ime = imeKroga(seja.koda, k.stevilka)
    let odgovor = beriJson(ime)
    if (!odgovor || !krogZakljucen(odgovor, danes)) {
      odgovor = brezSlik(await seja.krog(k.stevilka))
      pisiJson(ime, odgovor)
    }
    out.push({ stevilka: k.stevilka, odgovor })
  }
  return out
}

/** Ali tekmo že predpomnjenega lista smemo vzeti iz predpomnilnika. */
const listVeljaven = (list, datum, danes) => popolnZapisnik(list) && starostDni(datum, danes) > 3

async function zSejo(koda, delo) {
  const seja = new Seja(koda)
  try {
    await seja.odpri()
    return await delo(seja)
  } finally {
    await seja.zapri()
  }
}

// --- vir -------------------------------------------------------------------------

const vir = {
  ime: 'hlf',
  polnoIme: 'Federația Română de Fotbal (hailafotbal.ro)',
  drzava: 'RO',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': `Mozilla/5.0 ${PRIPONA_UA}` },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  // Uvoz razporeda najprej sam prenese ta naslov (lupina strani, brez
  // podatkov); razpored nato bere `razporedVseStrani` v brskalniku.
  naslovRazporeda: (koda) => naslovKroga(koda, 1),
  naslovZapisnika: (koda) => naslovKroga(koda, 1),
  naslovLestvice: (koda) => naslovKroga(koda, 1),

  /** Razpored: vsi krogi serije s tekmami, urami (ljubljanski čas) in kontumacijami. */
  async razporedVseStrani(koda, _prenesi, { danes = danesBukarest() } = {}) {
    const { judet } = razbijKodo(koda)
    return zSejo(koda, async (seja) => {
      const krogi = await vsiKrogi(seja, { danes: Date.parse(`${danes}T12:00:00Z`) })
      // Kontumacija: 3:0 brez zapisnika, starejša od tedna dni (in ne več kot 90).
      const listi = new Map()
      for (const { stevilka, odgovor } of krogi)
        for (const t of tekmeKroga(odgovor)) {
          const r = izid(t)
          const star = starostDni(casTekme(t.startDate).datum, Date.parse(`${danes}T00:00:00Z`))
          if (!r || Math.min(r.domaci, r.gostje) !== 0 || Math.max(r.domaci, r.gostje) !== 3 || star <= 7 || star > 90) continue
          const shranjen = beriJson(imeLista(t.matchId))
          listi.set(t.matchId, shranjen ?? (await seja.zapisnik(stevilka, t)))
        }
      return razporedIzKrogov(krogi, { judet, listi, danes })
    })
  },

  /** Zapisniki vseh odigranih tekem. */
  async zapisniki(koda) {
    const { judet } = razbijKodo(koda)
    const sezona = sezonaIzKode(koda)
    const danes = Date.now()
    return zSejo(koda, async (seja) => {
      const out = []
      for (const { stevilka, odgovor } of await vsiKrogi(seja, { danes, samoOdigrani: true })) {
        for (const t of tekmeKroga(odgovor)) {
          if (!izid(t)) continue
          const datum = casTekme(t.startDate).datum
          const star = starostDni(datum, danes)
          let list = beriJson(imeLista(t.matchId))
          // Popoln in star list ostane; nepopolnega beremo znova 45 dni.
          if (!listVeljaven(list, datum, danes) && (!list || star <= 45)) {
            const svez = await seja.zapisnik(stevilka, t)
            if (svez && imaZapisnik(svez)) {
              list = brezSlik(svez)
              pisiJson(imeLista(t.matchId), list)
            } else list = list ?? null
          }
          // Kontumacija nima zapisnika (razpored jo označi).
          if (jeKontumacija(t, list, danes)) continue
          const z = vZapisnik(t, odgovor, list, { judet, stevilka })
          if (!z) continue
          z.sezona = sezona
          z.url = `${naslovKroga(koda, stevilka)}/${slug(t.homeClub?.name)}-${slug(t.awayClub?.name)}`
          out.push({ id: t.matchId, z, url: z.url })
        }
      }
      return out
    })
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaRo,
  kratkoIme: kratkoImeRo,
  poenostavi: kljucKlubaRo,
}

export default vir
