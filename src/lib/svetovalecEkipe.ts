// Svetovalec ekipe: za preverjene igralce pregleda kader Moje ekipe in
// predlaga šibka mesta, do tri prestope in najboljšo prvo postavo s kapetanom.
//
// Vse je le predlog: ekipe tu nič ne spreminja in nič ne shrani. Ocena je
// pravilo iz naših podatkov (točke, minute, razpored, cene) — brez plačljivega
// umetnega razuma. Prestopi gredo skozi `zakajNeGre` iz `pravila.ts`
// (proračun, trije iz kluba, kvota pozicij), zato svetovalec nikoli ne
// predlaga menjave, ki bi jo trg zavrnil; prestopi se računajo drug za drugim
// (vsak že vidi kader po prejšnjem), zato veljajo tudi vsi skupaj.
//
// Ločeno od strani, da se da preizkusiti brez brskalnika (`npm run smoke`).
import { zakajNeGre, POZICIJE } from './pravila.ts'
import { razlogSibkosti } from './namigiEkipe.ts'
import type { IgralecZaNamig, MoznostiNamigov, RazlogSibkosti } from './namigiEkipe.ts'
import type { Pozicija } from './tipi'

/** Koliko prihodnjih krogov upoštevamo pri težavnosti razporeda. */
export const KROGOV_NAPREJ = 3
/** Največ prestopov v enem predlogu. */
export const NAJVEC_PRESTOPOV = 3
/** Najmanjši pričakovani dobiček (točke na krog), da je prestop vreden predloga. */
const MIN_DOBITEK = 0.75
/** Pod tem deležem minut klub-tekem igralec nima mesta v postavi. */
const PRAG_MINUT = 0.35
/** Vsota točk zadnjih treh krogov pod tem pragom je slaba forma. */
const PRAG_FORME = 3
/** Šibkost iz podatkov šteje šele, ko je klub odigral vsaj toliko tekem. */
const MIN_TEKEM_KLUBA = 4

export type RazlogSibkostiSvetovalca = RazlogSibkosti | 'malMinut' | 'slabaForma'

const RESNOST: Record<RazlogSibkostiSvetovalca, number> = {
  neaktiven: 0,
  poskodba: 1,
  odsotnost: 2,
  brezTekme: 3,
  malMinut: 4,
  slabaForma: 5,
}

/** Igralec, kot ga bere svetovalec: kot za namige, s statistiko sezone. */
export interface IgralecZaSvetovalca extends IgralecZaNamig {
  full_name?: string | null
  is_captain?: boolean | null
  is_vice?: boolean | null
  /** Minute v sezoni (`player_season_standings.minutes`). */
  minutes?: number | string | null
}

/** Razpored in moč klubov, izpeljana iz tekem (glej `podatkiRazporeda`). */
export interface PodatkiRazporeda {
  /** team_id → razlika golov na tekmo v sezoni (višje = močnejši klub). */
  moc: Readonly<Record<number, number>>
  /** team_id → število odigranih tekem v sezoni. */
  tekem: Readonly<Record<number, number>>
  /** team_id → nasprotniki v naslednjih krogih po vrsti. */
  naslednji: Readonly<Record<number, number[]>>
}

export const PRAZEN_RAZPORED: PodatkiRazporeda = { moc: {}, tekem: {}, naslednji: {} }

export interface TekmaZaRazpored {
  round_id: number
  home_team_id: number
  away_team_id: number
  home_goals: number | null
  away_goals: number | null
  kontumacija?: boolean | null
}

const stevilka = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const centi = (v: number | string | null | undefined) => Math.round(stevilka(v) * 100)
const omeji = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Moč klubov in razpored iz tekem sezone. `naslednjiKrogi` so id-ji
 * prihodnjih krogov po vrsti; odigrana je tekma z obema rezultatoma.
 */
export function podatkiRazporeda(
  tekme: TekmaZaRazpored[],
  naslednjiKrogi: number[],
): PodatkiRazporeda {
  const razlika: Record<number, number> = {}
  const tekem: Record<number, number> = {}
  const naslednji: Record<number, number[]> = {}
  const mesto = new Map(naslednjiKrogi.map((id, i) => [id, i]))
  const poKrogih: Array<Array<[number, number]>> = naslednjiKrogi.map(() => [])
  for (const m of tekme) {
    if (m.kontumacija) continue
    const i = mesto.get(m.round_id)
    if (i != null) {
      poKrogih[i].push([m.home_team_id, m.away_team_id], [m.away_team_id, m.home_team_id])
      continue
    }
    if (m.home_goals == null || m.away_goals == null) continue
    const d = m.home_goals - m.away_goals
    razlika[m.home_team_id] = (razlika[m.home_team_id] ?? 0) + d
    razlika[m.away_team_id] = (razlika[m.away_team_id] ?? 0) - d
    tekem[m.home_team_id] = (tekem[m.home_team_id] ?? 0) + 1
    tekem[m.away_team_id] = (tekem[m.away_team_id] ?? 0) + 1
  }
  const moc: Record<number, number> = {}
  for (const k of Object.keys(tekem)) moc[Number(k)] = razlika[Number(k)] / tekem[Number(k)]
  for (const krog of poKrogih)
    for (const [klub, nasprotnik] of krog) (naslednji[klub] ??= []).push(nasprotnik)
  return { moc, tekem, naslednji }
}

/** Delež možnih minut, ki jih je igralec odigral; null, dokler ga ne poznamo. */
export function delezMinut(i: IgralecZaSvetovalca, r: PodatkiRazporeda): number | null {
  const tekem = i.team_id != null ? r.tekem[Number(i.team_id)] : undefined
  if (!tekem || tekem < MIN_TEKEM_KLUBA) return null
  return omeji(stevilka(i.minutes) / (tekem * 90), 0, 1)
}

/** Povprečna lahkotnost naslednjih tekem (višje = šibkejši nasprotniki). */
export function lahkotaTekem(i: IgralecZaSvetovalca, r: PodatkiRazporeda): number {
  const nasprotniki = (i.team_id != null ? r.naslednji[Number(i.team_id)] : undefined) ?? []
  const znani = nasprotniki.slice(0, KROGOV_NAPREJ).filter((n) => r.moc[n] != null)
  if (znani.length === 0) return 0
  return -znani.reduce((v, n) => v + r.moc[n], 0) / znani.length
}

/**
 * Pričakovane točke v naslednjem krogu: povprečje forme (točke zadnjih treh
 * krogov, na krog) in točk na tekmo, utežene z minutami in razporedom.
 * Kdor ne bo igral (poškodba, odsotnost, klub brez tekme, ni več v ligi),
 * dobi 0.
 */
export function ocenaIgralca(
  i: IgralecZaSvetovalca,
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  r: PodatkiRazporeda,
): number {
  if (razlogSibkosti(i, moznosti)) return 0
  const osnova = 0.5 * (stevilka(i.form) / 3) + 0.5 * stevilka(i.points_per_match)
  if (osnova <= 0) return 0
  const minute = delezMinut(i, r)
  const faktorMinut = minute == null ? 1 : 0.4 + 0.6 * minute
  const faktorTekem = 1 + omeji(lahkotaTekem(i, r) * 0.1, -0.25, 0.25)
  return osnova * faktorMinut * faktorTekem
}

// --- šibka mesta ------------------------------------------------------------

export interface SibkoMestoSvetovalca<T extends IgralecZaSvetovalca> {
  igralec: T
  razlog: RazlogSibkostiSvetovalca
}

/** Razlog, zakaj igralec ne bo prinesel točk ali jih že dlje ne prinaša. */
export function razlogSibkostiSvetovalca(
  i: IgralecZaSvetovalca,
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  r: PodatkiRazporeda,
): RazlogSibkostiSvetovalca | null {
  const osnovni = razlogSibkosti(i, moznosti)
  if (osnovni) return osnovni
  const minute = delezMinut(i, r)
  if (minute != null && minute < PRAG_MINUT) return 'malMinut'
  if (minute != null && stevilka(i.form) < PRAG_FORME) return 'slabaForma'
  return null
}

export function sibkaMesta<T extends IgralecZaSvetovalca>(
  kader: T[],
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  r: PodatkiRazporeda,
): SibkoMestoSvetovalca<T>[] {
  const sibki: SibkoMestoSvetovalca<T>[] = []
  for (const igralec of kader) {
    const razlog = razlogSibkostiSvetovalca(igralec, moznosti, r)
    if (razlog) sibki.push({ igralec, razlog })
  }
  return sibki.sort(
    (a, b) =>
      Number(!!b.igralec.is_starter) - Number(!!a.igralec.is_starter) ||
      RESNOST[a.razlog] - RESNOST[b.razlog] ||
      a.igralec.id - b.igralec.id,
  )
}

// --- prestopi ---------------------------------------------------------------

export type VrstaRazloga = 'nerazpolozljiv' | 'forma' | 'minute' | 'tekme' | 'cena'

export interface RazlogPrestopa {
  vrsta: VrstaRazloga
  /** Pri `nerazpolozljiv`: zakaj stari ne bo igral. */
  sibkost: RazlogSibkostiSvetovalca | null
  formaNovi: number
  formaStari: number
  /** Delež minut v odstotkih; null, če ga ne poznamo. */
  minuteNovi: number | null
  minuteStari: number | null
  /** Nasprotniki novega igralca v naslednjih krogih (id-ji klubov). */
  nasprotniki: number[]
  /** Razlika v ceni (stari − novi): pozitivno pomeni prihranek. */
  prihranek: number
}

export interface Prestop<T extends IgralecZaSvetovalca> {
  stari: T
  novi: T
  /** Pričakovan dobiček v točkah na krog. */
  dobitek: number
  razlog: RazlogPrestopa
}

function razlogPrestopa<T extends IgralecZaSvetovalca>(
  stari: T,
  novi: T,
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  r: PodatkiRazporeda,
): RazlogPrestopa {
  const sibkost = razlogSibkostiSvetovalca(stari, moznosti, r)
  const minS = delezMinut(stari, r)
  const minN = delezMinut(novi, r)
  const formaS = stevilka(stari.form)
  const formaN = stevilka(novi.form)
  const prihranek = (centi(stari.value) - centi(novi.value)) / 100
  const nerazpolozljiv = sibkost != null && sibkost !== 'malMinut' && sibkost !== 'slabaForma'
  let vrsta: VrstaRazloga
  if (nerazpolozljiv) vrsta = 'nerazpolozljiv'
  else if (formaN - formaS >= 3) vrsta = 'forma'
  else if (minN != null && minS != null && minN - minS >= 0.25) vrsta = 'minute'
  else if (lahkotaTekem(novi, r) - lahkotaTekem(stari, r) >= 0.5) vrsta = 'tekme'
  else if (prihranek >= 0.4) vrsta = 'cena'
  else vrsta = 'forma'
  return {
    vrsta,
    sibkost: nerazpolozljiv ? sibkost : null,
    formaNovi: formaN,
    formaStari: formaS,
    minuteNovi: minN == null ? null : Math.round(minN * 100),
    minuteStari: minS == null ? null : Math.round(minS * 100),
    nasprotniki: (novi.team_id != null ? r.naslednji[Number(novi.team_id)] : undefined)?.slice(0, KROGOV_NAPREJ) ?? [],
    prihranek,
  }
}

/**
 * Do tri prestopi, ki najbolj dvignejo pričakovane točke. Vsak naslednji
 * je izbran iz kadra po prejšnjem (z njegovim denarjem), zato je vsaka
 * menjava dovoljena po pravilih tudi skupaj z ostalimi.
 */
export function predlagajPrestope<T extends IgralecZaSvetovalca>(
  kader: T[],
  trg: T[],
  preostalo: number,
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  r: PodatkiRazporeda,
  najvec: number = NAJVEC_PRESTOPOV,
): Prestop<T>[] {
  const ocene = new Map<number, number>()
  const ocena = (i: T) => {
    let o = ocene.get(i.id)
    if (o == null) ocene.set(i.id, (o = ocenaIgralca(i, moznosti, r)))
    return o
  }
  // Kandidati po pozicijah, najboljši prvi: prvi dovoljen je za igralca najboljši.
  const poPoziciji = new Map<Pozicija, T[]>()
  for (const k of trg) {
    if (!k.position || ocena(k) <= 0) continue
    const seznam = poPoziciji.get(k.position) ?? []
    seznam.push(k)
    poPoziciji.set(k.position, seznam)
  }
  for (const seznam of poPoziciji.values())
    seznam.sort((a, b) => ocena(b) - ocena(a) || centi(a.value) - centi(b.value) || a.id - b.id)

  let trenutni = [...kader]
  let denar = centi(preostalo)
  const uporabljeni = new Set<number>(kader.map((i) => i.id))
  const novi = new Set<number>()
  const prestopi: Prestop<T>[] = []

  while (prestopi.length < najvec) {
    let najboljsi: { stari: T; novi: T; dobitek: number } | null = null
    for (const stari of trenutni) {
      if (!stari.position || novi.has(stari.id)) continue
      const ocenaStarega = ocena(stari)
      const brezStarega = trenutni.filter((i) => i.id !== stari.id)
      const mozniDenar = (denar + centi(stari.value)) / 100
      for (const k of poPoziciji.get(stari.position) ?? []) {
        const dobitek = ocena(k) - ocenaStarega
        if (dobitek < MIN_DOBITEK || (najboljsi && dobitek <= najboljsi.dobitek)) break
        if (uporabljeni.has(k.id)) continue
        if (zakajNeGre(k, brezStarega, mozniDenar) != null) continue
        najboljsi = { stari, novi: k, dobitek }
        break
      }
    }
    if (!najboljsi) break
    prestopi.push({
      ...najboljsi,
      razlog: razlogPrestopa(najboljsi.stari, najboljsi.novi, moznosti, r),
    })
    trenutni = trenutni.map((i) => (i.id === najboljsi!.stari.id ? najboljsi!.novi : i))
    denar += centi(najboljsi.stari.value) - centi(najboljsi.novi.value)
    uporabljeni.add(najboljsi.novi.id)
    novi.add(najboljsi.novi.id)
  }
  return prestopi
}

// --- najboljša postava ------------------------------------------------------

export interface PredlogPostave<T extends IgralecZaSvetovalca> {
  /** Prvih enajst, od vratarja do napadalcev. */
  prvi: T[]
  klop: T[]
  /** "4-4-2". */
  formacija: string
  kapetan: T
  namestnik: T | null
  /** Igralci, ki bi stopili v postavo / zapustili postavo glede na zdajšnjo. */
  noter: T[]
  ven: T[]
  /** Postava in trak sta že taka, kot ju predlagamo. */
  enakoKotSedaj: boolean
}

/**
 * Najboljša veljavna prva postava iz kadra: ena formacija z enim vratarjem,
 * znotraj mej pozicij (`POZICIJE`), z največjo vsoto ocen; pri enakih
 * ocenah obdrži zdajšnjo postavo. Kapetan je najvišje ocenjen, namestnik
 * drugi. Vrne null, če kader ne dopušča nobene veljavne postave.
 */
export function najboljsaPostava<T extends IgralecZaSvetovalca>(
  kader: T[],
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  r: PodatkiRazporeda,
): PredlogPostave<T> | null {
  const ocene = new Map(kader.map((i) => [i.id, ocenaIgralca(i, moznosti, r)]))
  const o = (i: T) => ocene.get(i.id) ?? 0
  const urejeni = (p: Pozicija) =>
    kader
      .filter((i) => i.position === p)
      .sort((a, b) => o(b) - o(a) || Number(!!b.is_starter) - Number(!!a.is_starter) || a.id - b.id)
  const gk = urejeni('GK')
  const def = urejeni('DEF')
  const mid = urejeni('MID')
  const fwd = urejeni('FWD')
  if (gk.length === 0) return null

  let najboljsa: { prvi: T[]; formacija: string; vsota: number; ujemanje: number } | null = null
  for (let d = POZICIJE.DEF.min; d <= POZICIJE.DEF.max; d++)
    for (let m = POZICIJE.MID.min; m <= POZICIJE.MID.max; m++)
      for (let f = POZICIJE.FWD.min; f <= POZICIJE.FWD.max; f++) {
        if (d + m + f !== 10 || def.length < d || mid.length < m || fwd.length < f) continue
        const prvi = [gk[0], ...def.slice(0, d), ...mid.slice(0, m), ...fwd.slice(0, f)]
        const vsota = prvi.reduce((v, i) => v + o(i), 0)
        const ujemanje = prvi.filter((i) => i.is_starter).length
        if (
          !najboljsa ||
          vsota > najboljsa.vsota + 1e-9 ||
          (Math.abs(vsota - najboljsa.vsota) <= 1e-9 && ujemanje > najboljsa.ujemanje)
        )
          najboljsa = { prvi, formacija: `${d}-${m}-${f}`, vsota, ujemanje }
      }
  if (!najboljsa) return null

  const vPostavi = new Set(najboljsa.prvi.map((i) => i.id))
  const klop = kader.filter((i) => !vPostavi.has(i.id)).sort((a, b) => o(b) - o(a) || a.id - b.id)
  // Kapetan in namestnik po oceni; pri enakih ocenah ima prednost zdajšnji trak.
  const poOceni = [...najboljsa.prvi].sort(
    (a, b) =>
      o(b) - o(a) ||
      Number(!!b.is_captain) - Number(!!a.is_captain) ||
      Number(!!b.is_vice) - Number(!!a.is_vice) ||
      a.id - b.id,
  )
  const kapetan = poOceni[0]
  const namestnik = poOceni[1] ?? null
  const noter = najboljsa.prvi.filter((i) => !i.is_starter)
  const ven = kader.filter((i) => i.is_starter && !vPostavi.has(i.id))
  const trenutniKapetan = kader.find((i) => i.is_captain)
  const trenutniNamestnik = kader.find((i) => i.is_vice)
  return {
    prvi: najboljsa.prvi,
    klop,
    formacija: najboljsa.formacija,
    kapetan,
    namestnik,
    noter,
    ven,
    enakoKotSedaj:
      noter.length === 0 &&
      trenutniKapetan?.id === kapetan.id &&
      (trenutniNamestnik?.id ?? null) === (namestnik?.id ?? null),
  }
}

// --- vse skupaj -------------------------------------------------------------

export interface Svetovanje<T extends IgralecZaSvetovalca> {
  sibkosti: SibkoMestoSvetovalca<T>[]
  prestopi: Prestop<T>[]
  postava: PredlogPostave<T> | null
}

export function svetuj<T extends IgralecZaSvetovalca>(
  kader: T[],
  trg: T[],
  preostalo: number,
  moznosti: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
  razpored: PodatkiRazporeda = PRAZEN_RAZPORED,
): Svetovanje<T> {
  return {
    sibkosti: sibkaMesta(kader, moznosti, razpored),
    prestopi: predlagajPrestope(kader, trg, preostalo, moznosti, razpored),
    postava: najboljsaPostava(kader, moznosti, razpored),
  }
}

// --- stikalo ----------------------------------------------------------------

/**
 * Stikalo `svetovalec_ekipe` v `settings`: '0' ga izklopi. Manjkajoča
 * vrstica pomeni vklopljeno, zato za zagon ni treba ničesar pisati v bazo.
 */
export function svetovalecVklopljen(vrstica: { value?: unknown } | null | undefined): boolean {
  if (vrstica == null) return true
  const v = vrstica.value
  if (v === false || v === 0) return false
  return String(v ?? '').trim() !== '0'
}
