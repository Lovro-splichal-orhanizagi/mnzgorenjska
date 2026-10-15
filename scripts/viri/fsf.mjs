// Vir: Fótbóltssamband Føroya — fsf.fo (Ferski otoki).
//
// FSF vodi vsa tekmovanja v COMET. Stran tekmovanj in stran tekme
// (`/kappingar/dystur/?matchID=<id>`) sta lupini Vue, ki si podatke naložita
// iz JAVNEGA posrednika strani `/wp-json/comet-api/v2/…` — brez ključa,
// prijave ali piškotka (preverjeno 15. 10. 2026: competition-controller.js in
// dystur-controller.js kličeta navaden GET s parametrom). Beremo iste naslove,
// kot jih stran zahteva sama, nič drugega. Ključev iz JS ne uporabljamo.
//
// SEZONA je koledarsko leto (april–oktober): oznaka "2026"
// (`competitions.sezona_koledarska`).
//
// ŠIFRA LIGE je id tekmovanja COMET (`6654857` = Betri deildin 2026). Vsaka
// sezona ima svojega; id-ji so v `data-competition-config` strani lige
// (`/kappingar-og-urslit/menn/<liga>-menn/`). Vir mora za id poznati RAVEN
// in LETO (tabela `SEZONE` spodaj), ker 1. in 2. deild igrajo večinoma druge
// ekipe klubov iz višjih lig, COMET pa jim da isto ime in isti id kluba
// ("B36" v 1. deild je B36 II). **Ob novi sezoni dopiši vrstico v `SEZONE`**
// in popravi šifro lige; neznan id ustavi uvoz.
//
// DRUGE EKIPE: ime ekipe v ligi ravni r dobi pripono po tem, v koliko višjih
// ligah ISTE sezone nastopa isti klub (id COMET): 1 → " II", 2 → " III".
// Tako je "NSÍ" v 2. deild 2026 "NSÍ III" (NSÍ igra v Betri in 1. deild),
// "TB" v 1. deild 2026 pa prva ekipa (TB je izpadel). Razpored višjih lig
// iste sezone vir prebere sam (en zahtevek na ligo).
//
// NASLOVI (vsi JSON):
// - `/matches?competitionId=<id>` — vse tekme sezone: id, domači in gostje
//   (`id` kluba, `name`), `homeTeamResult.current`, `liveStatus` (PLAYED,
//   SCHEDULED …), `dateTimeUTC` (ms), `roundOrder`.
// - `/match/lineup?matchId=<id>` — `home.players` / `away.players`:
//   `starting`, `shirtNumber`, `position` ("G" = vratar), `captain`,
//   `personId` (stalna šifra osebe → `reg_st`), `name` ("PRIIMEK Ime").
//   Uradnih oseb (`officials`) ne beremo.
// - `/match/events?matchId=<id>` — dogodki s `minuteFull` (od začetka tekme;
//   `minute` je minuta polčasa), `player` (pri menjavi vstop) in `player2`
//   (izstop), `homeTeam` (ekipa dogodka). Vrsta je `eventType.fcdName`.
//
// robots.txt (Yoast): "User-agent: * / Disallow:" — vse dovoljeno. Pogojev
// uporabe za podatke ni (le pogoji vstopnic). Dovoljenja FSF še nimamo. Beremo
// odkrito (User-Agent SLFF, 3 s med zahtevki), zapisnikov, starejših od
// tedna, ne beremo znova (do 45 dni še enkrat, če je zapisnik nepopoln).
// **Ob 401, 403, 429 ali izzivu se uvoz ustavi (`FsfZavrnitev`, izhod 4) —
// ne obhajaj.** Napačna stran (HTML namesto JSON) ne gre v predpomnilnik.
import { NEPOPOLN } from './frf.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'

const OSNOVNI = 'https://www.fsf.fo'
const API = `${OSNOVNI}/wp-json/comet-api/v2`
const DOLZINA_TEKME = 90

// Id-ji tekmovanj po sezonah in ravneh (Betri deildin, 1. deild, 2. deild),
// iz `data-competition-config` strani lig na fsf.fo. 3. deild ni vpisana
// (zapisniki večinoma prazni, glej CLAUDE.md).
export const SEZONE = {
  2026: [6654857, 6654881, 6651271],
  2025: [6095440, 6095452, 6095465],
  2024: [5415898, 5420267, 5420269],
  2023: [4704632, 4704644, 4695395],
}
export const IMENA_RAVNI = ['Betri deildin', '1. deild', '2. deild']

/** "6654857" → { id: 6654857, leto: "2026", raven: 1, visje: [] }. */
export function razbijKodo(koda) {
  const s = String(koda ?? '').trim()
  if (!/^\d+$/.test(s)) throw new Error(`fsf: šifra lige je id tekmovanja COMET (npr. 6654857), ne "${koda}"`)
  const id = Number(s)
  for (const [leto, ids] of Object.entries(SEZONE)) {
    const i = ids.indexOf(id)
    if (i >= 0) return { id, leto, raven: i + 1, visje: ids.slice(0, i) }
  }
  throw new Error(`fsf: tekmovanja ${id} ni v tabeli SEZONE (scripts/viri/fsf.mjs) — dopiši sezono, sicer imena drugih ekip ("B36 II") niso znana`)
}

export const naslovTekem = (id) => `${API}/matches?competitionId=${id}`
export const naslovPostave = (id) => `${API}/match/lineup?matchId=${String(id).replace(/^fo/, '')}`
export const naslovDogodkov = (id) => `${API}/match/events?matchId=${String(id).replace(/^fo/, '')}`
// Stran tekme za ljudi (vir v nogi, povezava na zapisnik).
export const naslovZapisnika = (id) => `${OSNOVNI}/kappingar/dystur/?matchID=${String(id).replace(/^fo/, '')}`
// Šifra zapisnika v bazi je `fo<id>`: id tekme COMET je enoličen le znotraj
// ene zveze, `matches.zapisnik_id` pa čez vse vire.
export const sifraZapisnika = (id) => `fo${String(id).replace(/^fo/, '')}`
const imeTekem = (id) => `tekme-${id}.json`
const imePostave = (id) => `postava-${id}.json`
const imeDogodkov = (id) => `dogodki-${id}.json`

// --- zavrnitev in predpomnilnik -------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class FsfZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FsfZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (besedilo) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(besedilo ?? '').slice(0, 20000))

/**
 * `fetch` vira: 401, 403 in 429 so zavrnitev že tu — prenos jih tako ne
 * ponavlja (429 bi sicer čakal na Retry-After) in uvoz razporeda ne vzame
 * shranjene strani.
 */
export async function fsfFetch(url, moznosti) {
  const odgovor = await fetch(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new FsfZavrnitev(`fsf: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  return odgovor
}

/** JSON ali null (HTML, napaka WordPressa, prazno). */
export function json(besedilo) {
  const s = String(besedilo ?? '').trim()
  if (!/^[[{]/.test(s)) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

/**
 * V predpomnilnik gre le prava stran: seznam tekem (tabela), postava
 * (`home`/`away`) ali dogodki (tabela). Napaka WordPressa (`{code, message}`)
 * ali HTML ne — sicer bi jo uvoz bral naprej.
 */
export function zaPredpomnilnik(besedilo, datoteka = '') {
  const j = json(besedilo)
  if (j == null) return false
  if (/^postava-/.test(datoteka)) return typeof j === 'object' && !Array.isArray(j) && 'home' in j && 'away' in j
  return Array.isArray(j)
}

async function beri(prenesi, url, ime, sveze) {
  let besedilo
  try {
    besedilo = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new FsfZavrnitev(`fsf: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(besedilo)) throw new FsfZavrnitev(`fsf: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  const j = json(besedilo)
  if (j == null || !zaPredpomnilnik(besedilo, ime)) throw new Error(`fsf: ${url} ni vrnil pričakovanega JSON (${String(besedilo ?? '').slice(0, 80)})`)
  return j
}

// --- čas -------------------------------------------------------------------------

const deli = (ms, tz) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  )
  return { datum: `${p.year}-${p.month}-${p.day}`, ura: `${p.hour}:${p.minute}` }
}

/**
 * `dateTimeUTC` (ms) → ljubljanski { datum, ura }. Ferski čas je WET/WEST,
 * ljubljanski eno uro več. Polnoč na Ferskih otokih pomeni, da ura še ni
 * določena (razpored 1. in 2. deild): datum je ferski, ura null.
 */
export function datumUra(ms) {
  if (!Number.isFinite(Number(ms))) return { datum: null, ura: null }
  const fo = deli(Number(ms), 'Atlantic/Faroe')
  if (fo.ura === '00:00') return { datum: fo.datum, ura: null }
  return deli(Number(ms), 'Europe/Ljubljana')
}

/** Minuta dogodka od začetka tekme, podaljšek odrezan na 90. */
export function minuta(d) {
  // Karton po tekmi (`AFTER_THE_MATCH`) nima minute: šteje, minut ne skrajša.
  if (d?.matchPhase?.fcdName === 'AFTER_THE_MATCH' && d?.minuteFull == null && d?.minute == null) return DOLZINA_TEKME
  const m = d?.minuteFull ?? d?.minute
  return m == null || !Number.isFinite(Number(m)) ? null : Math.min(Math.max(Number(m), 0), DOLZINA_TEKME)
}

// --- imena -----------------------------------------------------------------------

// Ferski predlogi sredi priimka ostanejo mali ("DAM Á LAKJUNI" → "Dam á Lakjuni");
// na začetku imena "Priimek Ime" dobijo veliko začetnico ("Á Tjaldrafløtti Kim").
const PREDLOGI = new Set(['á', 'í', 'við', 'av', 'úr', 'undir', 'uppi', 'yviri', 'til', 'van', 'von', 'de', 'la'])
const velikaZacetnica = (b) => b.split('-').map((x) => x.charAt(0).toLocaleUpperCase('fo') + x.slice(1).toLocaleLowerCase('fo')).join('-')

/**
 * "PRIIMEK Ime" (COMET) → "Priimek Ime": priimek so začetne besede z
 * velikimi črkami ("Á TJALDRAFLØTTI Kim" → "Á Tjaldrafløtti Kim",
 * "HANSEN Bárður Jógvansson" → "Hansen Bárður Jógvansson").
 */
export function imeIgralca(ime) {
  // "DAHL - OLSEN Ari" → "Dahl-Olsen Ari"
  const besede = String(ime ?? '').trim().replace(/\s*-\s*/g, '-').split(/\s+/).filter(Boolean)
  const jeVelika = (b) => /\p{L}/u.test(b) && b === b.toLocaleUpperCase('fo')
  let n = 0
  while (n < besede.length && jeVelika(besede[n])) n++
  if (n === 0 || n === besede.length) return besede.map(velikaZacetnica).join(' ')
  const priimek = besede.slice(0, n).map((b, i) => (i > 0 && i < n - 1 && PREDLOGI.has(b.toLocaleLowerCase('fo')) ? b.toLocaleLowerCase('fo') : velikaZacetnica(b)))
  return [...priimek, ...besede.slice(n)].join(' ')
}

// Ključ kluba: male črke s ferskimi znaki (á, í, ð, ó, ú, ý, æ, ø).
export const kljucKlubaFo = (ime) =>
  String(ime ?? '')
    .toLocaleLowerCase('fo')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Imena klubov na fsf.fo so že kratka ("B36", "EB/Streymur", "Skála ÍF").
export const kratkoImeFo = (polno) => String(polno ?? '').trim()

const PRIPONE = ['', ' II', ' III', ' IV']

/**
 * Ime ekipe v ligi: ime kluba s pripono druge ekipe. `visjeIds` so množice id-jev
 * klubov višjih lig iste sezone.
 */
export function imeEkipe(klub, visjeIds = []) {
  const n = visjeIds.filter((s) => s.has(Number(klub.id))).length
  return `${String(klub.name ?? '').trim()}${PRIPONE[n] ?? ` (${n + 1})`}`
}

// --- razpored ---------------------------------------------------------------------

const izidTekme = (t) => {
  const d = t.homeTeamResult?.current
  const g = t.awayTeamResult?.current
  return Number.isInteger(d) && Number.isInteger(g) ? { domaci: d, gostje: g } : null
}

/** Odigrana: PLAYED z izidom. SCHEDULED z izidom 0:0 (pripravljen prenos v živo) ni odigrana. */
export const jeOdigrana = (t) => t.liveStatus === 'PLAYED' && !!izidTekme(t)

/** Tekme s seznama: [{ id, krog, datum, ura, domaci, gostje, domaciId, gostjeId, izid, status }]. */
export function tekmeSeznama(seznam, visjeIds = []) {
  if (!Array.isArray(seznam)) throw new Error('fsf: seznam tekem ni tabela — uvoz ustavljen')
  return seznam
    .map((t) => ({
      id: t.id,
      krog: Number(t.roundOrder ?? t.round) || null,
      ...datumUra(t.dateTimeUTC),
      domaci: imeEkipe(t.homeTeam, visjeIds),
      gostje: imeEkipe(t.awayTeam, visjeIds),
      domaciId: t.homeTeam?.id,
      gostjeId: t.awayTeam?.id,
      izid: jeOdigrana(t) ? izidTekme(t) : null,
      status: t.liveStatus,
    }))
    .filter((t) => t.krog && t.id)
    .sort((a, b) => a.krog - b.krog || String(a.datum).localeCompare(String(b.datum)) || a.id - b.id)
}

/** Razpored v obliko uvoza razporeda. Kontumacije najde `kontumacije` (prazni postavi). */
export function razcleniRazpored(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      fsfId: t.id, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------------

const POZICIJE = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }

/**
 * Pozicija iz postavitve ("LCB" → DEF, "CAM" → MID, "CF" → FWD). Velja le, če
 * je ekipa vnesla postavitev (`formation`); brez nje COMET vsem začetnikom
 * pripiše "LB" in oznaka ne pomeni nič.
 */
export function pozicijaPostavitve(oznaka) {
  const o = String(oznaka ?? '').trim().toUpperCase()
  if (!o) return null
  if (o === 'GK') return 'GK'
  if (/^(L|R|LC|RC|C)?(B|WB)$|^SW$/.test(o)) return 'DEF'
  if (/M$/.test(o)) return 'MID'
  if (/^(CF|ST|SS|LW|RW|LF|RF|F)$/.test(o)) return 'FWD'
  return null
}
// Vrste dogodkov, ki jih poznamo (`eventType.fcdName`). Ostale so opozorilo.
const OKVIR = new Set(['START', 'END', 'FULL_TIME', 'HALF_TIME', 'MATCH_END'])

/** Igralci ene ekipe postave: { postava, rezerve }. */
function igralciEkipe(e) {
  const postavitev = !!e?.formation
  const igralci = (e?.players ?? []).map((p) => ({
    st: Number.isInteger(p.shirtNumber) ? p.shirtNumber : null,
    ime: imeIgralca(p.name),
    regSt: Number(p.personId) || null,
    vratar: p.position === 'G',
    kapetan: !!p.captain,
    pozicija: POZICIJE[p.position] ?? (postavitev && p.starting ? pozicijaPostavitve(p.formationPositionDisplayName) : null),
    zacetnik: !!p.starting,
    _red: p.orderNumber ?? 0,
  }))
  const urejeni = (z) => igralci.filter((i) => i.zacetnik === z).sort((a, b) => a._red - b._red).map(({ _red, zacetnik: _z, ...i }) => i)
  return { postava: urejeni(true), rezerve: urejeni(false) }
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri.
 * - Obe postavi prazni → null (neodigrana ali kontumacija; kontumacijo označi razpored).
 * - Ena postava prazna ali z manj kot 7 začetniki → `nepopoln` (izid in nastopi znane
 *   ekipe se zapišejo, tekma čaka na dopolnitev; arhiva nepopolnih ne uvažamo).
 *
 * @param {object} tekma vrstica seznama tekem (`/matches`)
 * @param {object} postava `/match/lineup`
 * @param {object[]} dogodki `/match/events`
 * @param {{ imeDomacih?: string, imeGostov?: string }} [imena] imeni s pripono druge ekipe
 */
export function vZapisnik(tekma, postava, dogodki, { imeDomacih = null, imeGostov = null } = {}) {
  const rezultat = izidTekme(tekma ?? {})
  if (!rezultat || !postava || typeof postava !== 'object') return null
  const ekipe = [
    { ime: imeDomacih ?? String(tekma.homeTeam?.name ?? '').trim(), ...igralciEkipe(postava.home) },
    { ime: imeGostov ?? String(tekma.awayTeam?.name ?? '').trim(), ...igralciEkipe(postava.away) },
  ]
  const prazna = ekipe.map((e) => !e.postava.length && !e.rezerve.length)
  if (prazna[0] && prazna[1]) return null
  const znana = ekipe.map((e) => e.postava.length >= 7)
  const nepopoln = !znana[0] || !znana[1]

  // Igralec po šifri osebe; ekipa je tista, v čigar postavi je.
  const kje = new Map()
  ekipe.forEach((e, idx) => { for (const i of [...e.postava, ...e.rezerve]) if (i.regSt) kje.set(i.regSt, { idx, i }) })
  const kdo = (p, m) => {
    const k = p && kje.get(Number(p.personId))
    return k ? { ekipaIdx: k.idx, st: k.i.st, ime: k.i.ime, regSt: k.i.regSt, minuta: m } : null
  }

  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  for (const d of Array.isArray(dogodki) ? dogodki : []) {
    const vrsta = String(d?.eventType?.fcdName ?? '')
    if (OKVIR.has(vrsta)) continue
    // Karton ali izključitev uradne osebe (trener s klopi) ne šteje.
    if (d.teamOfficial && !d.player) continue
    const m = minuta(d)
    const ekipaDogodka = d.homeTeam === true ? 0 : d.homeTeam === false ? 1 : null
    const prvi = kdo(d.player, m)
    if (m == null) opozorila.push(`dogodek ${vrsta} brez minute`)
    if (vrsta === 'GOAL' || vrsta === 'PENALTY' || vrsta === 'OWN_GOAL') {
      if (!prvi) { opozorila.push(`gol v ${m}. minuti: strelca ni v postavi`); continue }
      const avtogol = vrsta === 'OWN_GOAL'
      // `homeTeam` pri avtogolu: ekipa, ki ji gol šteje, ali ekipa strelca — preverimo.
      if (ekipaDogodka != null && !avtogol && ekipaDogodka !== prvi.ekipaIdx)
        opozorila.push(`gol v ${m}. minuti (${prvi.ime}): dogodek je pri drugi ekipi kot strelec`)
      goli.push({ ...prvi, avtogol, enajstmetrovka: vrsta === 'PENALTY' })
    } else if (vrsta === 'SUBSTITUTION') {
      const noter = kdo(d.player, m)
      const ven = kdo(d.player2, m)
      if (!noter && !ven) { opozorila.push(`menjava v ${m}. minuti: igralcev ni v postavi`); continue }
      const brez = { st: null, ime: null, regSt: null }
      const oseba = (x) => (x ? { st: x.st, ime: x.ime, regSt: x.regSt } : brez)
      menjave.push({ ekipaIdx: (noter ?? ven).ekipaIdx, minuta: m, noter: oseba(noter), ven: oseba(ven) })
    } else if (vrsta === 'YELLOW') {
      if (prvi) rumeni.push(prvi) // karton uradne osebe (ni v postavi) ne šteje
    } else if (vrsta === 'RED' || vrsta === 'SECOND_YELLOW' || vrsta === 'YELLOW_RED' || vrsta === 'EXPULSION') {
      // EXPULSION brez igralca je izključitev uradne osebe s klopi — ne šteje.
      if (prvi && !rdeci.some((r) => r.ekipaIdx === prvi.ekipaIdx && r.regSt === prvi.regSt)) rdeci.push(prvi)
    } else if (/^PENALTY_(MISS|MISSED|SAVED|FAILED)/.test(vrsta)) {
      if (prvi) zgresene.push(prvi)
    } else opozorila.push(`neznan dogodek "${vrsta}" v ${m}. minuti`)
  }
  // Drugi rumeni: COMET vpiše prvi rumeni in še enega ob izključitvi — kot pri
  // drugih virih ostane 1 rumeni + 1 rdeči.
  for (const r of rdeci) {
    const jaz = rumeni.filter((y) => y.ekipaIdx === r.ekipaIdx && y.regSt === r.regSt)
    if (jaz.length > 1) rumeni.splice(rumeni.lastIndexOf(jaz.at(-1)), 1)
  }

  if (nepopoln) {
    ekipe.forEach((e, i) => {
      if (!znana[i]) opozorila.unshift(`${NEPOPOLN}: ${e.ime} — ${e.postava.length ? `le ${e.postava.length} začetnikov` : 'brez postave'}`)
    })
  } else {
    const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
    if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
      opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
    for (const e of ekipe) {
      if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
      const vratarjev = e.postava.filter((i) => i.vratar).length
      if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev (G) v postavi je ${vratarjev}`)
    }
  }
  for (const e of ekipe) {
    const st = new Map()
    for (const i of [...e.postava, ...e.rezerve]) st.set(i.regSt, (st.get(i.regSt) ?? 0) + 1)
    for (const [r, n] of st) if (n > 1) opozorila.push(`${e.ime}: igralec ${r} je v postavi ${n}-krat`)
    if ([...e.postava, ...e.rezerve].some((i) => !i.regSt)) opozorila.push(`${e.ime}: igralec brez šifre osebe`)
  }

  const { datum, ura } = datumUra(tekma.dateTimeUTC)
  const polcas = Number.isInteger(tekma.homeTeamResult?.half) && Number.isInteger(tekma.awayTeamResult?.half)
    ? { domaci: tekma.homeTeamResult.half, gostje: tekma.awayTeamResult.half } : null
  return {
    zapisnikId: tekma.id != null ? sifraZapisnika(tekma.id) : null,
    url: tekma.id != null ? naslovZapisnika(tekma.id) : null,
    sezona: datum ? datum.slice(0, 4) : null,
    krog: Number(tekma.roundOrder ?? tekma.round) || null,
    datum,
    ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava, rezerve: ekipe[0].rezerve },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava, rezerve: ekipe[1].rezerve },
    rezultat,
    polcas,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    nepopoln,
    prazen: prazna[0] && prazna[1],
    opozorila,
  }
}

/** Je zapisnik treba prebrati znova (nepopoln ali goli ≠ izid)? */
export const jeNepopoln = (z) => !z || z.nepopoln || z.opozorila.some((o) => /^goli iz dogodkov/.test(o))

/** Nastopi po šifri osebe (kot oefb), z zgrešenimi 11-metrovkami. */
export const nastopi = (z) =>
  nastopiPoSifri(z).map((n) => ({
    ...n,
    zgreseneEnajstmetrovke: z.zgresene.filter((k) => k.ekipaIdx === n.ekipaIdx && k.regSt === n.regSt).length,
  }))

// --- prenos -------------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/**
 * Množice id-jev klubov višjih lig iste sezone. Prazen seznam (sezona še ni
 * razpisana) ali seznam drugega tekmovanja (napačen id v `SEZONE`) ustavi
 * uvoz: brez njega bi druge ekipe tiho izgubile pripono ("B36 II" → "B36") in
 * se zlile s prvo ekipo v isti klub.
 */
async function visjeLige(koda, prenesi, sveze) {
  const out = []
  for (const id of razbijKodo(koda).visje) {
    const seznam = await beri(prenesi, naslovTekem(id), imeTekem(id), sveze)
    const ids = new Set(seznam.flatMap((t) => [Number(t.homeTeam?.id), Number(t.awayTeam?.id)]).filter((x) => Number.isFinite(x) && x > 0))
    if (!ids.size) throw new Error(`fsf: višja liga ${id} (SEZONE) nima tekem — pripon drugih ekip ("B36 II") ni mogoče določiti, uvoz ustavljen`)
    if (!seznam.every((t) => t.competition?.id == null || t.competition.id === id))
      throw new Error(`fsf: seznam višje lige ${id} vsebuje tekme drugega tekmovanja — preveri SEZONE, uvoz ustavljen`)
    out.push(ids)
  }
  return out
}

async function tekmeLige(koda, prenesi, { visjeSveze = true } = {}) {
  const { id } = razbijKodo(koda)
  const seznam = await beri(prenesi, naslovTekem(id), imeTekem(id), true)
  const ime = seznam.find((t) => t.competition?.id === id)?.competition?.name
  if (seznam.length && !seznam.every((t) => t.competition?.id == null || t.competition.id === id))
    throw new Error(`fsf: seznam tekem ${id} vsebuje tekme drugega tekmovanja — uvoz ustavljen`)
  return { seznam, ime, tekme: tekmeSeznama(seznam, await visjeLige(koda, prenesi, visjeSveze)) }
}

/** Postava in dogodki tekme; `sveze` prebere oboje znova. */
async function preberiTekmo(prenesi, id, sveze) {
  const postava = await beri(prenesi, naslovPostave(id), imePostave(id), sveze)
  const dogodki = await beri(prenesi, naslovDogodkov(id), imeDogodkov(id), sveze)
  return { postava, dogodki }
}

const vir = {
  ime: 'fsf',
  polnoIme: 'Fótbóltssamband Føroya (fsf.fo)',
  drzava: 'FO',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)', Accept: 'application/json' },
  premorMs: 3000,
  imaRegistracije: false,
  fetch: fsfFetch,

  naslovRazporeda: (koda) => naslovTekem(razbijKodo(koda).id),
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new FsfZavrnitev(`fsf: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored((await tekmeLige(koda, prenesi)).tekme)
  },

  async zapisniki(koda, prenesi) {
    const { leto } = razbijKodo(koda)
    const { tekme, seznam } = await tekmeLige(koda, prenesi, { visjeSveze: false })
    const poId = new Map(seznam.map((t) => [t.id, t]))
    const out = []
    for (const t of tekme.filter((x) => x.izid)) {
      const star = starostDni(t.datum)
      // Zadnji teden sveže; do 45 dni še enkrat sveže, če je zapisnik iz
      // predpomnilnika nepopoln (klub ga dopolni nekaj dni po tekmi).
      let sveze = star <= 7
      let { postava, dogodki } = await preberiTekmo(prenesi, t.id, sveze)
      const imena = { imeDomacih: t.domaci, imeGostov: t.gostje }
      let z = vZapisnik(poId.get(t.id), postava, dogodki, imena)
      if (!sveze && star <= 45 && jeNepopoln(z)) {
        ;({ postava, dogodki } = await preberiTekmo(prenesi, t.id, true))
        z = vZapisnik(poId.get(t.id), postava, dogodki, imena)
      }
      if (!z) continue
      z.sezona = leto
      z.datum ??= t.datum
      out.push({ id: z.zapisnikId, z, url: z.url })
    }
    return out
  },

  /**
   * Kontumacije: odigrana tekma z izidom 3:0 ali 0:3, starejša od tedna dni,
   * katere postava je prazna pri obeh ekipah. Postava gre v isti predpomnilnik
   * kot pri uvozu zapisnikov.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.fsfId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const p = await beri(prenesiKrog, naslovPostave(t.fsfId), imePostave(t.fsfId), t.datum)
        if (!(p.home?.players ?? []).length && !(p.away?.players ?? []).length) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaFo,
  kratkoIme: kratkoImeFo,
  poenostavi: kljucKlubaFo,
}

export default vir
