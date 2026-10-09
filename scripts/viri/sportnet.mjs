// Vir: Sportnet / futbalnet.sk — Slovenský futbalový zväz (ISSF).
//
// Prvi vir zunaj Slovenije in prvi, ki ne bere HTML-ja: futbalnet.sk sam
// bere javni API tekmovanj (`sutaze.api.sportnet.online`), in isti API berem
// tudi jaz. Zapisnik je tam že strukturiran — postavi s številko, pozicijo in
// stalno šifro igralca (ISSF), dogodki z minuto. Zato tu ni razčlenjevanja
// besedila, le preslikava v obliko, ki jo pričakuje `uvoz-zapisnikov`.
//
// Šifra lige je `<appSpace>/<competitionId>[/<partId>]`, npr.
// `SsFZ/6a154cf844ff24612e07e083`. appSpace je zveza (SFZ, SsFZ, ZsFZ, VsFZ,
// BFZ ali okresná zveza, npr. `obfz-zvolen.futbalnet.sk`). Sezona je del
// tekmovanja — vsaka sezona ima svoj competitionId. Tekmovanje s skupinami
// (V. liga SsFZ: Sever in Juh) je za fantasy več lig: skupino izbere `partId`,
// sicer bi se ekipe obeh skupin znašle v isti ligi.
//
// Podatki so javni (API brez prijave, ki ga bere futbalnet.sk), izrecnega
// dovoljenja SFZ/Sportnet pa nimamo. Zato beremo odkrito (glava z imenom in
// naslovom), počasi in le nove tekme, na strani lige pa navedemo vir s
// povezavo. Če nas prosijo, naj nehamo, slovaške lige izklopimo.
import { nastopi as skupniNastopi } from '../zapisnik.mjs'

// Enako kot v zapisnik.mjs: sodniški podaljšek se ne šteje.
const DOLZINA_TEKME = 90
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

const API = 'https://sutaze.api.sportnet.online/api/v2'
const NA_STRAN = 100

/** `SsFZ/<id>[/<partId>]` → { appSpace, id, del }. */
export function razbijKodo(koda) {
  const [appSpace, id, del = null] = String(koda).split('/')
  if (!appSpace || !id) throw new Error(`sportnet: šifra lige mora biti <appSpace>/<competitionId>[/<partId>], ne "${koda}"`)
  return { appSpace, id, del }
}

/** "2026/2027" → "2026/27". */
export const sezonaIz = (ime) => {
  const m = String(ime ?? '').match(/^(\d{4})\/(\d{2})(\d{2})$/)
  return m ? `${m[1]}/${m[3]}` : null
}

// Datum in ura po slovaškem času. API vrača UTC; tekma ob 15.00 je v
// septembru 13:00Z in bi brez pretvorbe pri večernih tekmah dobila napačen dan.
const oblikaDatuma = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Bratislava',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
export function lokalniCas(iso) {
  if (!iso) return { datum: null, ura: null }
  const [datum, ura] = oblikaDatuma.format(new Date(iso)).split(' ')
  return { datum, ura }
}

/**
 * Sportnet piše "Ime Priimek", baza (kot vsi slovenski zapisniki) "Priimek
 * Ime". Priimek vzamemo kot zadnjo besedo — sestavljena imena ("Paulo
 * Henrique Vieira Dos Santos") pri tem dobijo le del priimka, a igralca
 * vseeno prepoznamo po šifri ISSF, ne po imenu.
 */
export function vPriimekIme(ime) {
  const deli = String(ime ?? '').trim().split(/\s+/).filter(Boolean)
  if (deli.length < 2) return deli.join(' ')
  return [deli.at(-1), ...deli.slice(0, -1)].join(' ')
}

const POZICIJA = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' }

/** "27:00" → 27; sodniški podaljšek prvega polčasa ostane v prvem polčasu. */
function minuta(dogodek) {
  const m = Number(String(dogodek?.eventTime ?? '').split(':')[0])
  if (!Number.isFinite(m)) return null
  return dogodek.phase === '1HT' ? Math.min(m, 45) : Math.min(m, DOLZINA_TEKME)
}

/**
 * Tekma iz API-ja v obliko zapisnika, kot jo dajo slovenski viri.
 * Vrne null, če tekma ni odigrana ali zapisnik še ni popoln.
 */
export function vZapisnik(t, { url = null } = {}) {
  if (!t?.closed || !Array.isArray(t.score) || !t.protocol) return null
  const domaci = t.teams?.find((e) => e.additionalProperties?.homeaway === 'home')
  const gostje = t.teams?.find((e) => e.additionalProperties?.homeaway === 'away')
  if (!domaci || !gostje) return null

  const ekipe = [domaci, gostje].map((e) => {
    const nominacija = t.nominations?.find((n) => n.teamId === e._id)
    const igralci = (nominacija?.athletes ?? []).map((a) => ({
      sportnetId: a.sportnetUser?._id,
      st: a.additionalData?.nr ?? null,
      ime: vPriimekIme(a.sportnetUser?.name),
      regSt: a.additionalData?.__issfId ? Number(a.additionalData.__issfId) : null,
      pozicija: POZICIJA[a.additionalData?.position] ?? null,
      vratar: a.additionalData?.position === 'goalkeeper',
      kapetan: Boolean(a.additionalData?.captain),
      rezerva: Boolean(a.additionalData?.substitute),
    }))
    return {
      id: e._id,
      ime: e.name,
      postava: igralci.filter((i) => !i.rezerva),
      rezerve: igralci.filter((i) => i.rezerva),
    }
  })
  if (ekipe.some((e) => !e.postava.length)) return null

  // Dogodek prepoznamo po igralcu, ne po polju `team`: pri avtogolu (`dropped`)
  // je `team` ekipa igralca, gol pa šteje nasprotniku.
  const kje = new Map()
  ekipe.forEach((e, idx) => [...e.postava, ...e.rezerve].forEach((i) => kje.set(i.sportnetId, { idx, i })))
  const dogodki = (vrsta, tip) =>
    (t.protocol.events ?? [])
      .filter((d) => d.eventType === vrsta && (tip == null || tip(d.type)))
      .map((d) => {
        const najden = kje.get(d.player?._id)
        if (!najden) return null
        return { ekipaIdx: najden.idx, st: najden.i.st, ime: najden.i.ime, minuta: minuta(d), d }
      })
      .filter(Boolean)

  const goli = dogodki('goal').map((g) => ({
    ekipaIdx: g.ekipaIdx,
    st: g.st,
    ime: g.ime,
    minuta: g.minuta,
    avtogol: g.d.type === 'dropped',
    enajstmetrovka: g.d.type === 'goal_penalty',
  }))
  const zgresene = dogodki('failed_goal', (x) => x === 'failed_goal_penalty').map(({ d, ...g }) => g)
  const rumeni = dogodki('yellow_card').map(({ d, ...g }) => g)
  // Drugi rumeni je izključitev: igralec je od tam naprej zunaj.
  const rdeci = [...dogodki('red_card'), ...dogodki('second_yellow_card')].map(({ d, ...g }) => g)

  const menjave = (t.protocol.events ?? [])
    .filter((d) => d.eventType === 'substitution')
    .map((d) => {
      const ven = kje.get(d.player?._id)
      const noter = kje.get(d.replacement?._id)
      if (!ven && !noter) return null
      return {
        ekipaIdx: (ven ?? noter).idx,
        minuta: minuta(d),
        noter: noter ? { st: noter.i.st, ime: noter.i.ime } : { st: null, ime: null },
        ven: ven ? { st: ven.i.st, ime: ven.i.ime } : { st: null, ime: null },
      }
    })
    .filter(Boolean)

  const rezultat = { domaci: t.score[0], gostje: t.score[1] }
  // Avtogol šteje nasprotniku; brez tega bi preverba izida lagala.
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  const opozorila = []
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const { datum } = lokalniCas(t.startDate)
  return {
    zapisnikId: t.__issfId ?? t._id,
    url,
    sezona: sezonaIz(t.season?.name),
    krog: Number(t.round?.name) || null,
    datum,
    domaci: ekipe[0],
    gostje: ekipe[1],
    rezultat,
    polcas: Array.isArray(t.scoreByPhases?.[0]) ? { domaci: t.scoreByPhases[0][0], gostje: t.scoreByPhases[0][1] } : null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Nastopi z registrsko številko ISSF — igralca prepoznamo po njej, ne po imenu. */
export function nastopi(z) {
  return skupniNastopi(z).map((n) => {
    const e = n.ekipaIdx === 0 ? z.domaci : z.gostje
    const i = [...e.postava, ...e.rezerve].find((x) => x.st === n.st && x.ime === n.ime)
    return { ...n, regSt: i?.regSt ?? null, pozicija: i?.pozicija ?? null }
  })
}

/** Vse tekme tekmovanja (tudi neodigrane) — API jih vrača po sto. */
export async function vseTekme(koda, prenesi) {
  const { appSpace, id } = razbijKodo(koda)
  const vse = []
  for (let od = 0, stran = 0; stran < 50; stran++) {
    const url = `${API}/public/${appSpace}/competitions/${id}/matches?limit=${NA_STRAN}&offset=${od}`
    const d = JSON.parse(await prenesi(url, `tekme-${appSpace}-${id}-${stran}.json`, true))
    vse.push(...(d.matches ?? []))
    if (d.nextOffset == null || !(d.matches ?? []).length) break
    od = d.nextOffset
  }
  // Ista tekma na dveh straneh bi v bazi nastala dvakrat.
  const edinstvene = [...new Map(vse.map((t) => [t._id, t])).values()]
  const { del } = razbijKodo(koda)
  return del ? edinstvene.filter((t) => t.competitionPart?._id === del) : edinstvene
}

// Kratko ime slovaškega kluba je KRAJ, ne začetnice. Uradna imena so dolga
// in se začnejo z obliko društva ("Telovýchovná jednota JEDNOTA Bánová",
// "ŠK Badín, občianske združenie"); začetnice so dale "TJJB", "ŠBOZ" in dva
// različna kluba z isto "FT" (FK Terchová, FK Turie). Odstranimo obliko
// društva in tradicionalna imena (Sokol, Slovan, Družstevník …), velike
// črke ("OŠK BEŠEŇOVÁ") spremenimo v navadne. Oznaka moštva (B) ostane.
const OBLIKE = new Set(['tj', 'fk', 'ofk', 'šk', 'ošk', 'mfk', 'mšk', 'fc', 'afc', 'tjd', 'dfk', 'šku', 'ok', 'obfz',
  'telovýchovná', 'jednota', 'športový', 'futbalový', 'klub', 'obecný', 'mestský', 'mesta', 'o.z.', 'oz', 'fo'])
const TRADICIJA = new Set(['sokol', 'slovan', 'družstevník', 'tatran', 'partizán', 'baník', 'iskra', 'štart', 'lokomotíva',
  'spartak', 'dynamo', 'jednota', 'inter', 'rozvoj', 'hviezda', 'považan', 'fatran', 'kysučan', 'olympia', 'zornička',
  'prameň', 'vinohrad', 'sklotatran', 'ipeľ', 'agro', 'druzstevnik', 'podnik', 'lesov', 'obecný', 'agrokomplex', 'máj', 'filjo'])
const lepoVelike = (b) => (b.length > 3 && b === b.toUpperCase() ? b[0] + b.slice(1).toLowerCase() : b)
export function kratkoImeSk(polno, { obdrziTradicijo = false } = {}) {
  const glava = String(polno).split(',')[0].replace(/\s+-\s+[A-ZŠČŽÁÉÍÓÚÝĽŤŇĎ]{2,5}$/, '').replace(/"/g, '')
  let besede = glava.split(/[\s-]+/).filter(Boolean)
  // Oznaka moštva (Bánová B) ni del kraja.
  const mostvo = /^[A-D]$/.test(besede.at(-1) ?? '') && besede.length > 2 ? besede.pop() : null
  besede = besede.filter((b) => !/^\d+\.?$/.test(b) && !OBLIKE.has(b.toLowerCase()) &&
    (obdrziTradicijo || !TRADICIJA.has(b.toLowerCase())))
  // "Krásno nad Kysucou", "Hliník nad Hronom": kraj je beseda pred "nad".
  const i = besede.findIndex((b) => ['nad', 'pod', 'pri'].includes(b.toLowerCase()))
  let kraj = i > 0 ? besede.slice(i - 1, i) : besede
  // Zadnji del je kraj; spredaj ostane lahko sponzor ali vzdevek ("Jupie").
  if (kraj.length > 2) kraj = kraj.slice(-2)
  const ime = [...kraj.map(lepoVelike), ...(mostvo ? [mostvo] : [])].join(' ')
  return ime.length >= 3 ? ime : kratkoIme(polno)
}

// Isti klub Sportnet zapiše različno — iz sezone v sezono in med ligami
// istega kluba ("FK Nižná" v 7. ligi, "Futbalový klub Nižná" v 8. in U19;
// "Futbalový klub Čadca" proti "FK Čadca"). Ključ zato pravno obliko na
// začetku skrajša v kratico; brez tega je uvoz za vsako različico ustvaril
// nov klub in tekme sezone razklal na dva (Čadca, Nižná, 2. 10. 2026).
const PRAVNE_OBLIKE = [
  ['obecný futbalový klub', 'ofk'],
  ['obecný športový klub', 'ošk'],
  ['mestský futbalový klub', 'mfk'],
  ['mestský športový klub', 'mšk'],
  ['telovýchovná jednota', 'tj'],
  ['futbalový klub', 'fk'],
  ['športový klub', 'šk'],
]
const kljucBrezOblike = naredikljucKluba({})
export function kljucKlubaSk(ime) {
  let s = String(ime ?? '').trim().toLowerCase()
  for (const [dolgo, kratko] of PRAVNE_OBLIKE)
    if (s.startsWith(dolgo + ' ')) {
      s = kratko + s.slice(dolgo.length)
      break
    }
  return kljucBrezOblike(s)
}

const vir = {
  ime: 'sportnet',
  polnoIme: 'Slovenský futbalový zväz (futbalnet.sk)',
  drzava: 'SK',
  osnovniNaslov: 'https://sportnet.sme.sk/futbalnet/',
  // Beremo odkrito in vljudno: glava pove, kdo smo in kje nas najdejo, premor
  // med zahtevki pa, da API ne čuti nočnega uvoza. Nespremenjenih zapisnikov
  // uvoz tako ali tako ne bere znova (predpomnilnik).
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 300,
  // Sportnet ne objavlja delegiranja in zapisnikov o prestopih v obliki,
  // ki jo poznamo — skripti za to se ob tem viru končata brez dela.
  imaRegistracije: false,

  naslovRazporeda: (koda) => {
    const { appSpace, id } = razbijKodo(koda)
    return `${API}/public/${appSpace}/competitions/${id}/matches`
  },
  naslovZapisnika: (_koda, sifra) => `${API}/matches/${sifra}`,

  async razporedVseStrani(koda, prenesi) {
    const krogi = new Map()
    for (const t of await vseTekme(koda, prenesi)) {
      const stevilka = Number(t.round?.name)
      const domaci = t.teams?.find((e) => e.additionalProperties?.homeaway === 'home')?.name
      const gostje = t.teams?.find((e) => e.additionalProperties?.homeaway === 'away')?.name
      if (!Number.isInteger(stevilka) || !domaci || !gostje) continue
      const { datum, ura } = lokalniCas(t.startDate)
      if (!krogi.has(stevilka)) krogi.set(stevilka, { stevilka, tekme: [] })
      // Tekma brez igre: kontumacija (npr. "Ohlásená neúčasť hostí") ali
      // odstop moštva iz tekmovanja. Izid je dodeljen, zapisnika ni; uvoz
      // razporeda tekmo označi, da borza ne čaka. `__issfMatchStatus` je
      // ODOHRATY (odigrana), KONTUMOVANY ali ODSTUPENE_DRUZSTVO — slednji ob
      // zaključeni tekmi nima niti postav niti `contumation`.
      const status = t.__issfMatchStatus
      const odstop = status === 'ODSTUPENE_DRUZSTVO'
      const kontumacija = !!t.contumation?.isContumated || status === 'KONTUMOVANY' || odstop
      // Neodigrana tekma je nezaključena s stanjem VYGENEROVANY (le
      // razpisana); prestavljena brez novega datuma ostane taka pri starem
      // datumu (Prosiek : Východná, 4. 10. 2026). Vse drugo štejemo za
      // odigrano, da preverba raje javi preveč kot premalo.
      const odigrana = !(t.closed === false && status === 'VYGENEROVANY')
      krogi.get(stevilka).tekme.push({ domaci, gostje, datum, ura, kontumacija, odstop, odigrana })
    }
    return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
  },

  async zapisniki(koda, prenesi) {
    const out = []
    const odigrane = (await vseTekme(koda, prenesi)).filter((t) => t.closed)
    for (const t of odigrane) {
      const url = vir.naslovZapisnika(koda, t._id)
      const ime = `tekma-${t._id}.json`
      // Zaključena tekma v predpomnilniku se ne spreminja več; nezaključeno
      // (zapisnik se še dopolnjuje) preberemo znova.
      let z = vZapisnik(JSON.parse(await prenesi(url, ime)), { url })
      if (!z) z = vZapisnik(JSON.parse(await prenesi(url, ime, true)), { url })
      if (z) out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  // Uvoz razporeda kliče `vBesedilo` le, kadar vir nima `razporedVseStrani`.
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaSk,
  kratkoIme: kratkoImeSk,
  poenostavi,
}

export default vir
