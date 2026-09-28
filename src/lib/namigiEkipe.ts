// Namigi za prestope in gibanje cen od zadnjega obiska — razlog, da se
// človek vrne na Mojo ekipo tudi, ko se v njegovem kadru nič ne zgodi samo.
//
// Oboje je le predlog: ekipe tu nič ne spreminja in nič ne shrani. Pravila
// sestave (proračun, 3 iz kluba, kvota pozicij) pridejo iz `pravila.ts`, zato
// namig nikoli ne predlaga menjave, ki bi jo trg zavrnil.
//
// Ločeno od strani, da se da preizkusiti brez brskalnika (`npm run smoke`).
import { zakajNeGre } from './pravila.ts'
import type { IgralecZaPravila, Pozicija } from './tipi'

/** Zakaj igralec v naslednjem krogu verjetno ne bo prinesel točk. */
export type RazlogSibkosti = 'neaktiven' | 'poskodba' | 'odsotnost' | 'brezTekme'

/** Vrstni red resnosti: kdor ni več v ligi, je večja luknja kot klub brez tekme. */
const RESNOST: Record<RazlogSibkosti, number> = {
  neaktiven: 0,
  poskodba: 1,
  odsotnost: 2,
  brezTekme: 3,
}

/** Igralec v kadru ali na trgu, kot ga berejo namigi. */
export interface IgralecZaNamig extends IgralecZaPravila {
  id: number
  position?: Pozicija | null
  team_id?: number | string | null
  value?: number | string | null
  active?: boolean | null
  is_starter?: boolean | null
  /** Forma tekoče sezone (`player_season_standings.form`). */
  form?: number | string | null
  /** Točke na tekmo tekoče sezone (`player_season_standings.points_per_match`). */
  points_per_match?: number | string | null
}

export interface MoznostiNamigov {
  /**
   * Klubi, ki imajo v naslednjem krogu tekmo. `null` pomeni, da razporeda
   * kroga ne poznamo — takrat klub brez tekme ni razlog, sicer bi bil
   * sumljiv cel kader.
   */
  klubiZTekmo: ReadonlySet<number> | null
  /** player_id → vrsta zadnjega poročila (`poskodba`, `odsotnost` …). */
  odsotni: Readonly<Record<number, string | undefined>>
  /** Koliko zamenjav predlagamo za eno šibko mesto. */
  koliko?: number
}

export interface SibkoMesto<T extends IgralecZaNamig> {
  igralec: T
  razlog: RazlogSibkosti
  /** Najboljše zamenjave po formi, ki si jih ekipa lahko privošči. */
  zamenjave: T[]
}

const stevilka = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Denar v centih, da 0,1 + 0,2 ne preseže proračuna za las. */
const centi = (v: number | string | null | undefined) => Math.round(stevilka(v) * 100)

/** Vrne razlog, zakaj igralec verjetno ne bo igral, ali null, če bo. */
export function razlogSibkosti(
  igralec: IgralecZaNamig,
  { klubiZTekmo, odsotni }: Pick<MoznostiNamigov, 'klubiZTekmo' | 'odsotni'>,
): RazlogSibkosti | null {
  if (igralec.active === false) return 'neaktiven'
  const porocilo = odsotni[igralec.id]
  if (porocilo === 'poskodba' || porocilo === 'odsotnost') return porocilo
  if (klubiZTekmo && igralec.team_id != null && !klubiZTekmo.has(Number(igralec.team_id)))
    return 'brezTekme'
  return null
}

/** Boljši kandidat prej: forma, nato točke na tekmo, pri enakih cenejši. */
function primerjaj(a: IgralecZaNamig, b: IgralecZaNamig): number {
  return (
    stevilka(b.form) - stevilka(a.form) ||
    stevilka(b.points_per_match) - stevilka(a.points_per_match) ||
    stevilka(a.value) - stevilka(b.value) ||
    a.id - b.id
  )
}

/**
 * Zamenjave za enega igralca: ista pozicija (mesto v kadru, ne današnja
 * pozicija), aktiven, brez poročila o odsotnosti, s tekmo v krogu — in
 * dovoljen po pravilih, ko igralca prodaš po trenutni ceni.
 */
export function zamenjaveZa<T extends IgralecZaNamig>(
  stari: T,
  kader: T[],
  trg: T[],
  preostalo: number,
  moznosti: MoznostiNamigov,
): T[] {
  const pozicija = stari.position
  if (!pozicija) return []
  const vKadru = new Set(kader.map((i) => i.id))
  const brezStarega = kader.filter((i) => i.id !== stari.id)
  // Prodaja vrne trenutno vrednost (enako kot stran ob odstranitvi).
  const denar = (centi(preostalo) + centi(stari.value)) / 100
  return trg
    .filter(
      (k) =>
        k.position === pozicija &&
        !vKadru.has(k.id) &&
        razlogSibkosti(k, moznosti) == null &&
        zakajNeGre(k, brezStarega, denar) == null,
    )
    .sort(primerjaj)
    .slice(0, moznosti.koliko ?? 3)
}

/**
 * Šibka mesta kadra z zamenjavami. Vsak namig velja zase: dve menjavi
 * hkrati porabita denar dvakrat, zato stran po vsaki menjavi namige
 * preračuna iz novega kadra.
 */
export function namigiZaPrestope<T extends IgralecZaNamig>(
  kader: T[],
  trg: T[],
  preostalo: number,
  moznosti: MoznostiNamigov,
): SibkoMesto<T>[] {
  const sibki: Array<{ igralec: T; razlog: RazlogSibkosti }> = []
  for (const igralec of kader) {
    const razlog = razlogSibkosti(igralec, moznosti)
    if (razlog) sibki.push({ igralec, razlog })
  }
  // Prva postava pred klopjo, nato po resnosti razloga.
  sibki.sort(
    (a, b) =>
      Number(!!b.igralec.is_starter) - Number(!!a.igralec.is_starter) ||
      RESNOST[a.razlog] - RESNOST[b.razlog],
  )
  return sibki.map((s) => ({
    ...s,
    zamenjave: zamenjaveZa(s.igralec, kader, trg, preostalo, moznosti),
  }))
}

// --- gibanje cen ------------------------------------------------------------

export interface VrsticaSpremembeCene {
  player_id: number
  old_value: number | string
  new_value: number | string
  changed_at: string
}

export interface GibanjeIgralca {
  player_id: number
  iz: number
  v: number
  /** Razlika v centih — celo število, brez "-0,0". */
  razlikaC: number
}

/**
 * Gibanje cen igralcev od danega trenutka: za vsakega prva stara in zadnja
 * nova cena. Kdor je šel gor in nazaj dol, se ni premaknil in ga ni.
 * `skupajC` je sprememba vrednosti kadra v centih.
 */
export function gibanjeCen(
  spremembe: VrsticaSpremembeCene[],
): { igralci: GibanjeIgralca[]; skupajC: number } {
  const poIgralcu = new Map<number, VrsticaSpremembeCene[]>()
  for (const s of spremembe) {
    const seznam = poIgralcu.get(s.player_id) ?? []
    seznam.push(s)
    poIgralcu.set(s.player_id, seznam)
  }
  const igralci: GibanjeIgralca[] = []
  for (const [player_id, seznam] of poIgralcu) {
    seznam.sort((a, b) => Date.parse(a.changed_at) - Date.parse(b.changed_at))
    const iz = stevilka(seznam[0].old_value)
    const v = stevilka(seznam[seznam.length - 1].new_value)
    const razlikaC = centi(v) - centi(iz)
    if (razlikaC !== 0) igralci.push({ player_id, iz, v, razlikaC })
  }
  igralci.sort((a, b) => Math.abs(b.razlikaC) - Math.abs(a.razlikaC) || a.player_id - b.player_id)
  return { igralci, skupajC: igralci.reduce((v, i) => v + i.razlikaC, 0) }
}

// --- zadnji obisk (localStorage) ---------------------------------------------
// Le udobje: brez shrambe (zasebno okno, blokirani piškotki) velja zadnji
// teden, stran pa deluje enako.

export const DNI_BREZ_OBISKA = 7
const KLJUC_OBISKA = 'slff-zadnji-ogled-ekipe:'
const KLJUC_SKRITIH_NAMIGOV = 'slff-namigi-skriti:'

/**
 * Od kdaj kažemo gibanje: od zadnjega obiska, če ga poznamo in je smiseln,
 * sicer zadnjih sedem dni. Vrne tudi, ali gre za pravi zadnji obisk.
 */
export function odKdaj(
  shranjeno: string | null,
  zdaj: number,
): { od: string; zadnjiObisk: boolean } {
  const cas = shranjeno ? Date.parse(shranjeno) : NaN
  if (Number.isFinite(cas) && cas < zdaj) return { od: new Date(cas).toISOString(), zadnjiObisk: true }
  return { od: new Date(zdaj - DNI_BREZ_OBISKA * 86400000).toISOString(), zadnjiObisk: false }
}

export function preberiZadnjiOgled(ekipaId: number): string | null {
  try {
    return localStorage.getItem(KLJUC_OBISKA + ekipaId)
  } catch {
    return null
  }
}

export function zapisiZadnjiOgled(ekipaId: number, zdaj: number): void {
  try {
    localStorage.setItem(KLJUC_OBISKA + ekipaId, new Date(zdaj).toISOString())
  } catch {
    // Brez shrambe ob naslednjem obisku pokažemo zadnji teden.
  }
}

/** Namigi so skriti za en krog; v naslednjem se pokažejo znova. */
export function namigiSkriti(ekipaId: number, krogId: number): boolean {
  try {
    return localStorage.getItem(KLJUC_SKRITIH_NAMIGOV + ekipaId) === String(krogId)
  } catch {
    return false
  }
}

export function skrijNamige(ekipaId: number, krogId: number): void {
  try {
    localStorage.setItem(KLJUC_SKRITIH_NAMIGOV + ekipaId, String(krogId))
  } catch {
    // Skrito ostane le do osvežitve strani.
  }
}
