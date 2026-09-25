// Vir: Sportnet / futbalnet.sk — Slovenský futbalový zväz (ISSF).
//
// Prvi vir zunaj Slovenije in prvi, ki ne bere HTML-ja: futbalnet.sk sam
// bere javni API tekmovanj (`sutaze.api.sportnet.online`), in isti API berem
// tudi jaz. Zapisnik je tam že strukturiran — postavi s številko, pozicijo in
// stalno šifro igralca (ISSF), dogodki z minuto. Zato tu ni razčlenjevanja
// besedila, le preslikava v obliko, ki jo pričakuje `uvoz-zapisnikov`.
//
// Šifra lige je `<appSpace>/<competitionId>`, npr. `SsFZ/6a154cf844ff24612e07e083`
// (appSpace je zveza: SFZ, SsFZ, ZsFZ, VsFZ, BFZ, ali ObFZ). Sezona je del
// tekmovanja — vsaka sezona ima svoj competitionId.
//
// POZOR: dovoljenje za uporabo podatkov še ni potrjeno. Dokler SFZ/Sportnet
// ne odgovori, ta vir teče samo proti lokalni bazi; liga v produkciji ostane
// neaktivna in je nočni uvoz ne vidi.
import { nastopi as skupniNastopi } from '../zapisnik.mjs'

// Enako kot v zapisnik.mjs: sodniški podaljšek se ne šteje.
const DOLZINA_TEKME = 90
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

const API = 'https://sutaze.api.sportnet.online/api/v2'
const NA_STRAN = 100

/** `SsFZ/<id>` → { appSpace, id }. */
export function razbijKodo(koda) {
  const [appSpace, id] = String(koda).split('/')
  if (!appSpace || !id) throw new Error(`sportnet: šifra lige mora biti <appSpace>/<competitionId>, ne "${koda}"`)
  return { appSpace, id }
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
async function vseTekme(koda, prenesi) {
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
  return [...new Map(vse.map((t) => [t._id, t])).values()]
}

const vir = {
  ime: 'sportnet',
  polnoIme: 'Slovenský futbalový zväz (futbalnet.sk)',
  drzava: 'SK',
  osnovniNaslov: 'https://sportnet.sme.sk/futbalnet/',
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
      krogi.get(stevilka).tekme.push({ domaci, gostje, datum, ura })
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

  kljucKluba: naredikljucKluba({}),
  kratkoIme,
  poenostavi,
}

export default vir
