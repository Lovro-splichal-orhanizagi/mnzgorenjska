// Vir: Modular11 — javni razpored in zapisniki USL League Two (ZDA).
//
// USL League Two (amaterska 4. raven v ZDA, maj–avgust) vodi tekme v sistemu
// Modular11; uslleaguetwo.com ga vgradi (iframe modular11.com/league-schedule/
// league-two). Prvi vir zunaj Evrope. Glej CLAUDE.md (ZDA — vir `modular11`).
//
// SEZONA je koledarsko leto: 2026 = "2026" (`competitions.sezona_koledarska`).
//
// ŠIFRA LIGE je `<turnir>/<divizija>/<leto>` (`24/52/2026` = Southwest 2026).
// Turnir 24 je League Two, divizija je id iz izbirnika "Division" (Southwest 52,
// Northeast 41 …), leto omeji razpon datumov. Ob novi sezoni se popravi le leto
// (glej CLAUDE.md, kako preveriti, da so id-ji divizij ostali isti).
//
// RAZPORED je navaden GET `/public_schedule/league/get_matches?tournament=24&
// start_date=<leto>-01-01 00:00:00&end_date=<leto>-12-31 23:59:59&match_type=2&
// groups=<divizija>&open_page=<n>` (HTML, 25 tekem na stran, "N page out of M").
// Vrstica tekme: id, lokalni datum in ura ("06/01/26 07:00pm"), prizorišče s
// koordinatami, divizija (`js-match-group`), del (`js-match-bracket`: "League"
// ali "Playoffs" — končnice ne beremo), klub z id-jem ekipe
// (`/league-schedule/teams/<id>`), izid ("2 : 1"). Krogov ni (`js-match-round`
// je vedno 1): krog je TEDEN (pon–ned po lokalnem datumu), štet od STALNEGA
// začetka (teden 1. maja v letu šifre, `krogIzDatuma`) — ne od prve tekme, sicer
// bi prestavljena prva tekma premaknila številke vseh krogov.
//
// ZAPISNIK `/match_details/<id>/2` izriše strežnik; v skripti strani so JSON
// predmeti `'match'` (glava: čas, prizorišče s časovnim pasom `timezone_name`,
// formaciji `match_scheme_*`, dolžini polčasov), `'details'` (goli z minuto in
// `ownGoal`, opomini, izključitve, menjave z minuto, `detail_basic` s polčasi)
// in `'members'` (igralci z dresom, stalno šifro `UID` → `reg_st` in mestom
// `position`: 1–11 začetniki po formaciji, 0 klop). Asistenco pri golu prezremo
// (asistence določi glasovanje). **Datuma rojstva, letnika, šole, slike,
// osebja in sodnikov ne beremo** — `members` vsebuje vse to, vzamemo le
// polja, naštetih v `igralec()`.
//
// ČAS: Modular11 piše lokalni čas prizorišča. Zapisnik pove pas
// (`field.timezone_name`); razpored ne, zato velja pas domačega kluba
// (`PAS_KLUBA`, iz zapisnikov 2026) ali privzeti pas divizije (`PAS_DIVIZIJE`).
// Vse se pretvori v ljubljanski čas (`vLjubljano`), tudi datum.
//
// robots.txt modular11.com ne obstaja (404), uslleaguetwo.com ne zapira
// /league-schedule. Beremo odkrito (User-Agent SLFF, 3 s med zahtevki),
// popolnih zapisnikov ne beremo znova. Ob 401, 403, 429 ali izzivu se uvoz
// ustavi — ne obhajaj. Ključa Google Maps iz njihovega JS ne uporabljamo.
import { razpakiraj } from '../klubi.mjs'
import { nastopi as nastopiPoSifri } from './oefb.mjs'
import { NEPOPOLN } from './frf.mjs'

export { NEPOPOLN }

const OSNOVNI = 'https://www.modular11.com'
const DOLZINA_TEKME = 90
const LJUBLJANA = 'Europe/Ljubljana'

/** "24/52/2026" → { turnir: "24", divizija: "52", leto: "2026" }. */
export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)\/(\d+)\/(\d{4})$/)
  if (!m) throw new Error(`modular11: šifra lige je "<turnir>/<divizija>/<leto>" (npr. 24/52/2026), ne "${koda}"`)
  return { turnir: m[1], divizija: m[2], leto: m[3] }
}

/** Stran razporeda (od 1). */
export function naslovStrani(koda, stran = 1) {
  const { turnir, divizija, leto } = razbijKodo(koda)
  return `${OSNOVNI}/public_schedule/league/get_matches?tournament=${turnir}` +
    `&start_date=${leto}-01-01%2000:00:00&end_date=${leto}-12-31%2023:59:59&match_type=2` +
    `&groups=${divizija}&open_page=${stran}`
}
// Šifra zapisnika v bazi je `us<id>`: id tekem Modular11 (116xxx–118xxx) je v
// razponu drugih virov (oefb, MNZ), `matches.zapisnik_id` pa je enoličen čez vse.
export const sifraZapisnika = (id) => `us${String(id).replace(/^us/, '')}`
export const naslovZapisnika = (id) => `${OSNOVNI}/match_details/${String(id).replace(/^us/, '')}/2`
const imeStrani = (koda, stran) => `razpored-${String(koda).replace(/\//g, '-')}-${stran}.html`
const imeZapisnika = (id) => `tekma-${String(id).replace(/^us/, '')}.html`

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class Modular11Zavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'Modular11Zavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/**
 * Stran razporeda je prava, če ima tabelo tekem ali obvestilo, da tekem ni
 * ("No matches you are looking for." — divizija brez tekem v letu, npr. 2027
 * pred objavo). "Date is invalid." in prazen odgovor nista.
 */
export const jeStranRazporeda = (html) => /container-table-matches|block-without-matches/.test(String(html ?? ''))
/** Stran tekme je prava, če ima JSON zapisnika. */
export const jeStranTekme = (html) => /new matchTimeLine\(\{/.test(String(html ?? '')) && /'members'\s*:/.test(String(html ?? ''))

// --- čas -----------------------------------------------------------------------

/** Zamik pasu (ms) ob danem trenutku. */
function zamik(pas, t) {
  const d = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: pas, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(t)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  )
  return Date.UTC(d.year, d.month - 1, d.day, d.hour % 24, d.minute, d.second) - t
}

/**
 * Lokalni datum in ura v pasu `pas` → ljubljanski { datum, ura }. Upošteva
 * poletni čas obeh krajev (Arizona ga nima): 19:00 v Phoenixu 1. 6. 2026 je
 * 2. 6. ob 04:00 v Ljubljani, 19:00 v New Yorku je 01:00.
 */
export function vLjubljano(datum, ura, pas) {
  const d = String(datum ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const u = String(ura ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!d || !u || !pas) return { datum: d ? datum : null, ura: null }
  const lokalno = Date.UTC(+d[1], +d[2] - 1, +d[3], +u[1], +u[2])
  let t = lokalno - zamik(pas, lokalno)
  t = lokalno - zamik(pas, t)
  const lj = new Date(t + zamik(LJUBLJANA, t)).toISOString()
  return { datum: lj.slice(0, 10), ura: lj.slice(11, 16) }
}

/** "06/01/26 07:00pm" → { datum: "2026-06-01", ura: "19:00" } (lokalno). */
export function lokalniCas(s) {
  const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})\s*([ap]m))?/i)
  if (!m) return { datum: null, ura: null }
  const leto = m[3].length === 2 ? `20${m[3]}` : m[3]
  const datum = `${leto}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  if (!m[4]) return { datum, ura: null }
  let h = Number(m[4]) % 12
  if (m[6].toLowerCase() === 'pm') h += 12
  return { datum, ura: `${String(h).padStart(2, '0')}:${m[5]}` }
}

/** Ponedeljek tedna (ISO) za datum 'YYYY-MM-DD'. */
function ponedeljek(datum) {
  const t = Date.parse(`${datum}T00:00:00Z`)
  const dan = (new Date(t).getUTCDay() + 6) % 7
  return t - dan * 86400000
}

/** Krog = teden (pon–ned) od tedna datuma `prvi`: 1, 2, … (prazen teden preskoči številko). */
export const krogTedna = (datum, prvi) => Math.floor((ponedeljek(datum) - ponedeljek(prvi)) / (7 * 86400000)) + 1

/** Ponedeljek tedna 1. maja v letu sezone (začetek 1. kroga): 2026 → 2026-04-27. */
export const zacetekSezone = (leto) => new Date(ponedeljek(`${leto}-05-01`)).toISOString().slice(0, 10)

/**
 * Krog tekme: teden (pon–ned, lokalni datum) od tedna 1. maja v letu sezone.
 * Številka je STALNA — ne zavisi od drugih tekem. Prej je bil krog štet od
 * prve tekme divizije: prestavljena (ali naknadno dodana) prva tekma bi
 * premaknila vse številke in uvoz razporeda bi tekme že zaklenjenih krogov
 * (posnetki postav, roki) vpisal v druge kroge. Divizija, ki začne pozneje
 * (Southwest 2026: 16. 5.), ima prvi krog 3. Tekma pred 1. majem je krog 1.
 */
export const krogIzDatuma = (datum, leto) => Math.max(1, krogTedna(datum, zacetekSezone(leto)))

// --- časovni pasovi -----------------------------------------------------------

// Privzeti pas divizije (večina prizorišč). Divizija čez dva pasova ima izjeme
// v `PAS_KLUBA`. Neznana divizija → brez ure (rok ob 10:00 na dan tekme).
export const PAS_DIVIZIJE = {
  41: 'America/New_York', // Northeast
  45: 'America/New_York', // Southeast
  51: 'America/Chicago', // Heartland
  52: 'America/Los_Angeles', // Southwest
  57: 'America/Los_Angeles', // Northwest
  68: 'America/New_York', // Mid-Atlantic
  158: 'America/New_York', // Chesapeake
  160: 'America/Detroit', // Great Lakes
  161: 'America/Chicago', // Lone Star
  162: 'America/New_York', // Metropolitan
  163: 'America/Denver', // Mountain
  164: 'America/Los_Angeles', // Nor Cal
  165: 'America/New_York', // South Atlantic
  166: 'America/Chicago', // South Central
  167: 'America/New_York', // South Florida
  168: 'America/New_York', // Valley
  169: 'America/Chicago', // Mid South
  188: 'America/New_York', // Great Forest
  206: 'America/Chicago', // Great Plains
  273: 'America/Chicago', // Ranger
}

// Pas domačega prizorišča po id-ju ekipe (`/league-schedule/teams/<id>`), kjer
// se razlikuje od pasu divizije — iz `field.timezone_name` zapisnikov 2026.
export const PAS_KLUBA = {
  2114: 'America/New_York', // Swarm FC (South Central)
  2147: 'America/Phoenix', // FC Tucson (Southwest)
  4916: 'America/New_York', // Apotheos FC (South Central)
  4917: 'America/New_York', // Columbus United (South Central)
  4921: 'America/Phoenix', // Stars FC (Southwest)
}

export const pasTekme = (divizija, domaciId) =>
  PAS_KLUBA[String(domaciId)] ?? PAS_DIVIZIJE[String(divizija)] ?? null

// --- razpored ------------------------------------------------------------------

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;?/g, ' ')).replace(/\s+/g, ' ').trim()

/** Število strani razporeda ("1 page out of 3"); stran brez tekem → 0. */
export const steviloStrani = (html) => {
  if (!/table-content-row/.test(String(html ?? ''))) return 0
  return Number(String(html).match(/\d+\s+page out of\s+(\d+)/)?.[1] ?? 1)
}

/**
 * Vrstice razporeda ene strani: [{ id, datumLokalno, uraLokalno, divizija,
 * del, domaci, gostje, domaciId, gostjeId, izid, prizorisce }].
 */
export function vrsticeStrani(html) {
  const out = []
  // Vsaka tekma je dvakrat (namizna in mobilna različica); beremo namizno.
  const deli = String(html ?? '').split('<!-- desktop version -->')
  for (let i = 1; i < deli.length; i += 2) {
    const r = deli[i]
    const id = r.match(/uid-mobile-style">\s*(\d+)/)?.[1]
    if (!id) continue
    const { datum, ura } = lokalniCas(r.match(/<div class="col-xs-2">\s*([^<]*?)\s*</)?.[1])
    const ekipe = [...r.matchAll(/<a class="public-match-team-link" href="\/league-schedule\/teams\/(\d+)"\s+target="_self">\s*<p data-title="([^"]*)">/g)]
      .map((m) => ({ id: m[1], ime: razpakiraj(m[2]).trim() }))
    if (ekipe.length !== 2) continue
    const izid = besedilo(r.match(/<span class="score-match-table">([\s\S]*?)<\/span>/)?.[1]).match(/^(\d+)\s*:\s*(\d+)$/)
    out.push({
      id,
      datumLokalno: datum,
      uraLokalno: ura,
      divizija: razpakiraj(r.match(/js-match-group="([^"]*)"/)?.[1] ?? '').trim(),
      del: razpakiraj(r.match(/js-match-bracket="([^"]*)"/)?.[1] ?? '').trim(),
      domaci: ekipe[0].ime,
      gostje: ekipe[1].ime,
      domaciId: ekipe[0].id,
      gostjeId: ekipe[1].id,
      izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
      prizorisce: razpakiraj(r.match(/<div class="container-location">\s*<p data-title="([^"]*)"/)?.[1] ?? '').trim() || null,
    })
  }
  return out
}

/**
 * Tekme lige (le "League", brez končnice) s krogom (teden) in ljubljanskim
 * časom. `strani` so vse strani razporeda divizije.
 */
export function tekmeLige(koda, strani) {
  const { divizija, leto } = razbijKodo(koda)
  const vse = new Map()
  for (const html of strani) for (const v of vrsticeStrani(html)) vse.set(v.id, v)
  const liga = [...vse.values()].filter((v) => /^league$/i.test(v.del) && v.datumLokalno)
  const tekme = liga
    .map((v) => {
      const pas = pasTekme(divizija, v.domaciId)
      return { ...v, krog: krogIzDatuma(v.datumLokalno, leto), pas, ...vLjubljano(v.datumLokalno, v.uraLokalno, pas) }
    })
    .sort((a, b) => String(a.datumLokalno).localeCompare(String(b.datumLokalno)) ||
      String(a.uraLokalno ?? '').localeCompare(String(b.uraLokalno ?? '')) || Number(a.id) - Number(b.id))
  // Isti par (domači : gostje) igra lahko dvakrat v ISTEM tednu (Mountain 2025:
  // Utah United : Colorado Storm v četrtek 12. 6. in soboto 14. 6.). Tekma je v
  // bazi enolična po (krog, domači, gostje) — druga bi povozila prvo (zapisnik,
  // nastopi). Poznejša zato gre v naslednji krog; rok tega kroga je tako pred
  // njo. Odvisno le od tekem tega para, zato številke ostalih ostanejo stalne.
  const zasedeno = new Set()
  for (const t of tekme) {
    while (zasedeno.has(`${t.krog}:${t.domaciId}:${t.gostjeId}`)) t.krog++
    zasedeno.add(`${t.krog}:${t.domaciId}:${t.gostjeId}`)
  }
  return tekme.sort((a, b) => a.krog - b.krog || String(a.datum).localeCompare(String(b.datum)) || Number(a.id) - Number(b.id))
}

/** Razpored v obliko uvoza razporeda. */
export function razcleniRazpored(koda, strani) {
  const krogi = new Map()
  for (const t of tekmeLige(koda, strani)) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      // Za `kontumacije`: tekmo z izidom 3:0 / 0:3 je treba pogledati v zapisniku.
      m11Id: t.id, izid: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------

/** JSON predmet `'<kljuc>' : {...}` iz skripte strani (prva pojavitev). */
export function predmet(html, kljuc) {
  const m = String(html ?? '').match(new RegExp(`'${kljuc}'\\s*:\\s*(\\{.*\\}),?\\s*$`, 'm'))
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

/** Minuta dogodka: "45" + podaljšek "2" → 45; nad 90 → 90; 0 ali prazno → null. */
export function minuta(min, _dodatek = 0) {
  const n = Number(min)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(n, DOLZINA_TEKME)
}

/** Pozicije začetnikov iz formacije: mesto 1 GK, prva vrsta DEF, zadnja FWD, vmes MID. */
export function pozicijaIzFormacije(shema, mesto) {
  const p = Number(mesto)
  if (p === 1) return 'GK'
  const vrste = String(shema ?? '').trim().split(/\s+/).map(Number)
  if (vrste.length < 2 || vrste.some((x) => !Number.isInteger(x) || x <= 0) || vrste.reduce((a, b) => a + b, 0) !== 10) return null
  let od = 2
  for (const [i, n] of vrste.entries()) {
    if (p >= od && p < od + n) return i === 0 ? 'DEF' : i === vrste.length - 1 ? 'FWD' : 'MID'
    od += n
  }
  return null
}

/** "Ben assane" + "Fall" → "Fall Ben assane" (priimek naprej, kot drugi viri). */
export const imeIgralca = (ime, priimek) =>
  [priimek, ime].map((x) => razpakiraj(String(x ?? '')).replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')

/** Le polja, ki jih potrebujemo — brez datuma rojstva, letnika, šole in slike. */
function igralec(p, shema) {
  const mesto = Number(p.position) || 0
  return {
    st: /^\d+$/.test(String(p.jersey_number ?? '').trim()) ? Number(p.jersey_number) : null,
    ime: imeIgralca(p.firstName, p.lastName),
    regSt: Number(p.UID),
    vratar: mesto === 1,
    pozicija: mesto ? pozicijaIzFormacije(shema, mesto) : null,
    mesto,
  }
}

const ziv = (x) => String(x?.deleted ?? '0') === '0'

/**
 * Kontumacija (forfeit): opomba zapisnika "Forfeit in favor of …" ali izid iz
 * samih avtogolov brez strelca v 1. minuti in brez menjav — tako Modular11
 * vnese dodeljeno zmago (Seacoast United : Black Rock 3:0, 28. 6. 2026).
 */
export function jeKontumacija(d) {
  const opomba = (d?.detail_basic ?? []).filter(ziv).map((b) => String(b.notes ?? '')).join(' ')
  if (/forfeit/i.test(opomba)) return true
  const goli = (d?.goals ?? []).filter(ziv)
  return goli.length > 0 && !(d?.substitutions ?? []).filter(ziv).length &&
    goli.every((g) => String(g.ownGoal) === '1' && !Number(g.UID_player) && Number(g.minute) <= 1)
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida ali
 * stran ni stran tekme. Zapisnik brez polne postave, z goli, ki se ne ujemajo
 * z izidom, ali brez menjav z minuto je `nepopoln: true` (glej CLAUDE.md).
 */
export function vZapisnik(html, { id = null, url = null, pas: pasRazporeda = null } = {}) {
  const m = predmet(html, 'match')
  const d = predmet(html, 'details')
  const c = predmet(html, 'members')
  if (!m || !d || !c) return null
  if (!/^\d+$/.test(String(m.score_home ?? '')) || !/^\d+$/.test(String(m.score_away ?? ''))) return null
  // Kontumacija nima zapisnika: razpored jo označi (`kontumacije`).
  if (jeKontumacija(d)) return null
  const rezultat = { domaci: Number(m.score_home), gostje: Number(m.score_away) }
  const idEkip = [String(m.UID_team_home), String(m.UID_team_away)]
  const shema = [m.match_scheme_home, m.match_scheme_away]
  const ekipe = [0, 1].map((idx) => {
    const igralci = (c.players ?? []).filter((p) => String(p.UID_team) === idEkip[idx]).map((p) => igralec(p, shema[idx]))
    return {
      ime: razpakiraj(m[idx ? 'team_away' : 'team_home']?.name ?? '').trim(),
      postava: igralci.filter((i) => i.mesto > 0).sort((a, b) => a.mesto - b.mesto),
      rezerve: igralci.filter((i) => i.mesto === 0).sort((a, b) => (a.st ?? 999) - (b.st ?? 999)),
    }
  })
  const kje = new Map()
  ekipe.forEach((e, idx) => { for (const i of [...e.postava, ...e.rezerve]) kje.set(String(i.regSt), { idx, i }) })
  const kdo = (uid, min, dodatek) => {
    const k = kje.get(String(uid))
    return k ? { ekipaIdx: k.idx, st: k.i.st, ime: k.i.ime, regSt: k.i.regSt, minuta: minuta(min, dodatek) } : null
  }

  const opozorila = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  // Gol: `UID_team` je ekipa, ki ji gol šteje — pri avtogolu torej NASPROTNIK
  // strelca. Strelec avtogola manjka pogosto (`UID_player` ni med igralci);
  // gol ostane brez strelca, da izid drži. Navaden gol brez strelca v
  // zapisniku je nepopoln zapisnik (nekdo ni dobil točk).
  let brezStrelca = 0
  for (const g of (d.goals ?? []).filter(ziv)) {
    const avtogol = String(g.ownGoal) === '1'
    const zaIdx = idEkip.indexOf(String(g.UID_team))
    const s = kdo(g.UID_player, g.minute, g.minute_add)
    if (s) { goli.push({ ...s, avtogol, enajstmetrovka: false }); continue }
    if (zaIdx < 0) { opozorila.push(`gol v ${g.minute}. minuti: ekipa ${g.UID_team} ni ne domača ne gostujoča`); continue }
    if (!avtogol) brezStrelca++
    opozorila.push(`${avtogol ? 'avtogol' : 'gol'} v ${g.minute}. minuti brez strelca v zapisniku`)
    goli.push({ ekipaIdx: avtogol ? 1 - zaIdx : zaIdx, st: null, ime: null, regSt: null, minuta: minuta(g.minute, g.minute_add), avtogol, enajstmetrovka: false })
  }
  for (const k of (d.cautions ?? []).filter(ziv)) {
    const s = kdo(k.UID_player, k.minute, k.minute_add)
    if (s) rumeni.push(s)
    // Opomin trenerju ali osebju (ni med igralci) ne šteje.
  }
  for (const k of (d.ejections ?? []).filter(ziv)) {
    const s = kdo(k.UID_player, k.minute, k.minute_add)
    if (!s) continue
    if (!rdeci.some((r) => r.ekipaIdx === s.ekipaIdx && r.regSt === s.regSt)) rdeci.push(s)
    // Drugi rumeni ("Second Yellow Card"): drugi opomin je vpisan včasih tudi
    // med opomine (8 od 20 v 2026). Kot pri drugih virih: 1 rumeni + 1 rdeči.
    if (/second\s*yellow/i.test(String(k.reason ?? ''))) {
      const moji = rumeni.filter((r) => r.regSt === s.regSt)
      for (const r of moji.slice(1)) rumeni.splice(rumeni.indexOf(r), 1)
    }
  }
  for (const x of (d.substitutions ?? []).filter(ziv)) {
    const noter = kdo(x.UID_player_in, x.minute, x.minute_add)
    const ven = kdo(x.UID_player_out, x.minute, x.minute_add)
    if (!noter && !ven) { opozorila.push(`menjava v ${x.minute}. minuti: igralcev ni v zapisniku`); continue }
    const brez = { st: null, ime: null, regSt: null }
    const vObliko = (s) => (s ? { st: s.st, ime: s.ime, regSt: s.regSt } : brez)
    menjave.push({ ekipaIdx: (noter ?? ven).ekipaIdx, minuta: minuta(x.minute, x.minute_add), noter: vObliko(noter), ven: vObliko(ven) })
  }
  // Menjave preverimo po vrsti: kdor gre noter, ne sme biti na igrišču, kdor
  // gre ven, mora biti (napaka vnosa — le opozorilo, minute ostanejo, kot so).
  ekipe.forEach((e, idx) => {
    const igra = new Set(e.postava.map((i) => i.regSt))
    for (const x of menjave.filter((y) => y.ekipaIdx === idx && y.minuta != null).sort((a, b) => a.minuta - b.minuta)) {
      if (x.ven.regSt && !igra.has(x.ven.regSt)) opozorila.push(`${e.ime}: menjava v ${x.minuta}. minuti — ${x.ven.ime} gre ven, a ni na igrišču`)
      if (x.noter.regSt && igra.has(x.noter.regSt)) opozorila.push(`${e.ime}: menjava v ${x.minuta}. minuti — ${x.noter.ime} gre noter, a je že na igrišču`)
      igra.delete(x.ven.regSt)
      if (x.noter.regSt) igra.add(x.noter.regSt)
    }
  })
  // Rezerva, ki zamenja začetnega vratarja, je vratar (namig kot pri mlsz).
  for (const mm of menjave) {
    const ven = mm.ven.regSt && ekipe[mm.ekipaIdx].postava.find((i) => i.regSt === mm.ven.regSt && i.vratar)
    const noter = ven && ekipe[mm.ekipaIdx].rezerve.find((i) => i.regSt === mm.noter.regSt)
    if (noter) { noter.vratar = true; noter.pozicija = 'GK' }
  }

  // Popolnost (glej CLAUDE.md): 11 začetnikov pri obeh, goli = izid, vsaka
  // ekipa ima vsaj eno menjavo z minuto in minute niso same enice (vnos brez
  // minut — 1 je privzeta vrednost obrazca).
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  const goliSeUjemajo = zaEkipo(0) === rezultat.domaci && zaEkipo(1) === rezultat.gostje
  const minuteDogodkov = [...goli, ...menjave].map((x) => x.minuta)
  const brezMinut = minuteDogodkov.length > 1 && minuteDogodkov.every((x) => x == null || x <= 1)
  const razlogi = []
  ekipe.forEach((e, idx) => {
    if (e.postava.length !== 11) razlogi.push(`${e.ime} — ${e.postava.length} začetnikov`)
    if (!menjave.some((x) => x.ekipaIdx === idx && x.minuta != null)) razlogi.push(`${e.ime} — brez menjav`)
  })
  if (!goliSeUjemajo) razlogi.push(`goli iz dogodkov ${zaEkipo(0)}:${zaEkipo(1)}, izid ${rezultat.domaci}:${rezultat.gostje}`)
  if (brezMinut) razlogi.push('minute dogodkov so same enice')
  // Zapisnik, ki ga sodnik/zveza še ni zaključila (`final_report` 0).
  if (String(m.final_report ?? '1') !== '1') razlogi.push('zapisnik ni zaključen')
  if (brezStrelca) razlogi.push(`${brezStrelca} golov brez strelca`)
  const nepopoln = razlogi.length > 0
  if (nepopoln) opozorila.unshift(`${NEPOPOLN}: ${razlogi.join('; ')}`)
  ekipe.forEach((e) => {
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (e.postava.length && vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev v postavi je ${vratarjev}`)
  })
  const polcasa = (d.detail_basic ?? []).filter(ziv)[0] ?? {}
  const p1 = Number(polcasa.first_half ?? m.first_half ?? 45)
  const p2 = Number(polcasa.second_half ?? m.second_half ?? 45)
  if (p1 + p2 !== 90) opozorila.push(`polčasa trajata ${p1} + ${p2} minut`)

  // Čas začetka: lokalni čas prizorišča → ljubljanski. Prizorišče brez pasu
  // (novo vneseno igrišče) dobi pas iz razporeda (klub ali divizija).
  const [lDatum, lUra] = String(m.time ?? '').split(' ')
  const pas = m.field?.timezone_name || pasRazporeda || null
  const { datum, ura } = vLjubljano(lDatum, lUra?.slice(0, 5), pas)

  const vObliko = ({ mesto: _m, ...i }) => i
  return {
    zapisnikId: id,
    url,
    sezona: lDatum ? lDatum.slice(0, 4) : null,
    krog: null,
    datum: datum ?? (lDatum || null),
    ura,
    datumLokalno: lDatum || null,
    pas,
    pasPrizorisca: m.field?.timezone_name || null,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
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

/** Nastopi po šifri osebe (kot oefb in jalgpall). */
export const nastopi = (z) => nastopiPoSifri(z)

// --- klubi ---------------------------------------------------------------------

export const kljucKlubaUs = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const OBLIKE_US = new Set(['fc', 'sc', 'afc', 'cf'])

/** Kratko ime: brez "FC"/"SC" ("Southern California Eagles" ostane), največ tri besede. */
export function kratkoImeUs(polno) {
  const besede = razpakiraj(polno).trim().split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE_US.has(b.toLowerCase().replace(/\./g, '')))
  return (ostale.length ? ostale : besede).slice(0, 3).join(' ')
}

// --- prenos --------------------------------------------------------------------

const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new Modular11Zavrnitev(`modular11: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new Modular11Zavrnitev(`modular11: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/** Vse strani razporeda divizije (vedno sveže; stran brez tabele ustavi uvoz). */
async function straniRazporeda(koda, prenesi) {
  const strani = []
  let skupaj = 1
  for (let s = 1; s <= skupaj && s <= 20; s++) {
    const html = await beri(prenesi, naslovStrani(koda, s), imeStrani(koda, s), true)
    if (!jeStranRazporeda(html)) throw new Error(`modular11: ${naslovStrani(koda, s)} ni stran razporeda — uvoz ustavljen`)
    skupaj = steviloStrani(html)
    strani.push(html)
  }
  return strani
}

const vir = {
  ime: 'modular11',
  polnoIme: 'USL League Two (Modular11)',
  drzava: 'US',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: (koda) => naslovStrani(koda, 1),
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new Modular11Zavrnitev(`modular11: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // Stran napake (prazen odgovor, obvestilo strežnika) ne gre v predpomnilnik.
  zaPredpomnilnik: (html) => jeStranRazporeda(html) || jeStranTekme(html),
  // Krog je teden: prestavljena tekma je v razporedu v drugem krogu. Razpored
  // je ves (vse strani), zato uvoz razporeda neuvoženo vrstico, ki je razpored
  // v njenem krogu nima več, odstrani v vsakem krogu (ne le v polnih). NE
  // `krogiPoTednih` (ncefl): ta par domači : gostje šteje za eno tekmo sezone,
  // v USL2 pa isti par igra tudi dvakrat (Great Plains 2026: šest parov).
  razporedCel: true,

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await straniRazporeda(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const { leto } = razbijKodo(koda)
    const out = []
    for (const t of tekmeLige(koda, await straniRazporeda(koda, prenesi)).filter((x) => x.izid)) {
      const url = naslovZapisnika(t.id)
      const star = starostDni(t.datum)
      // Prve 3 dni se zapisnik dopolnjuje: sveže. Nepopolnega ali neveljavno
      // stran (napaka strežnika) beremo znova do 45 dni (`zapisnikSvez`).
      let html = await beri(prenesi, url, imeZapisnika(t.id), star <= 3)
      // Kontumacija nima zapisnika (razpored jo označi) — ne beremo je znova.
      if (jeStranTekme(html) && jeKontumacija(predmet(html, 'details'))) continue
      let z = vZapisnik(html, { id: t.id, url, pas: t.pas })
      if ((!z || z.nepopoln) && star > 3 && star <= 45) {
        html = await beri(prenesi, url, imeZapisnika(t.id), true)
        z = vZapisnik(html, { id: t.id, url, pas: t.pas })
      }
      if (!z) continue
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = leto
      // Datum zapisnika (pas prizorišča) je natančnejši od razporeda (pas kluba).
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      if (z.pasPrizorisca && t.pas && z.pasPrizorisca !== t.pas) z.opozorila.push(`pas prizorišča ${z.pasPrizorisca}, razpored je vzel ${t.pas}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
   * zapisnik je dodeljena zmaga (`jeKontumacija`). Razpored je ne loči od
   * izida; zapisnik gre v isti predpomnilnik kot pri uvozu zapisnikov.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.m11Id || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovZapisnika(t.m11Id), imeZapisnika(t.m11Id), t.datum)
        if (jeIzziv(html)) throw new Modular11Zavrnitev(`modular11: ${naslovZapisnika(t.m11Id)} vrne izziv (CAPTCHA)`)
        if (jeStranTekme(html) && jeKontumacija(predmet(html, 'details'))) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaUs,
  kratkoIme: kratkoImeUs,
  poenostavi: kljucKlubaUs,
}

export default vir
