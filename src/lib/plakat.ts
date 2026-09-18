// Plakat za objavo — matchday plakat, ne kartica s stevilko.
//
// Prva razlicica je bila kremna kartica z eno veliko stevilko: "18 igralcev v
// igri". To navijacu ne pove nicesar. Navijac nedeljske lige pozna igralce
// osebno — ustavi ga IME, ne stevilka. Zato je plakat sestavljen kot program
// tekme: grb, ime kluba cez vso sirino, tri imena s tockami, en stavek, ki
// pove, kaj naj naredi.
//
// Dve razlicici z istim jezikom:
//   • klub: "ZAGORJE — sestavi svojo ekipo iz nasih igralcev" + najboljsi trije
//   • krog: "22 tock, 4. krog, GOSPODINI, 5. mesto" + moji najboljsi + "premagaj me"
//
// Tu je racunski del; risanje je v `src/components/Plakat.tsx`.

export const SIRINA = 1080
export const VISINA = 1080
/** Levi rob — vse je levo poravnano, kot na plakatu, ne sredinjeno kot na kartici. */
export const ROB = 84

export interface VrsticaIgralca {
  ime: string
  tocke: number
  kapetan?: boolean
}

export interface PlakatKluba {
  vrsta: 'klub'
  klub: string
  liga: string
  grb: string | null
  igralci: VrsticaIgralca[]
  navijacev: number
}

export interface PlakatKroga {
  vrsta: 'krog'
  ekipa: string
  liga: string
  tocke: number | string
  krog: number
  mesto: number | null
  odEkip: number | null
  igralci: VrsticaIgralca[]
}

export type PodatkiPlakata = PlakatKluba | PlakatKroga

/**
 * Ime kluba cez vso sirino: velikost pade z dolzino, da "KETY EMMI&IMPOL
 * BISTRICA" ostane v eni vrstici, "VIR" pa ne izgleda izgubljeno.
 */
export function velikostImena(ime: string): number {
  const n = ime.length
  if (n <= 8) return 210
  if (n <= 12) return 170
  if (n <= 16) return 132
  if (n <= 22) return 100
  return 78
}

/** Ime ekipe managerja — manjse, ker nad njim ze stoji stevilka tock. */
export function velikostEkipe(ime: string): number {
  const n = ime.length
  if (n <= 10) return 96
  if (n <= 16) return 78
  if (n <= 24) return 60
  return 48
}

/** "Priimek Ime" iz baze -> "Ime Priimek" za plakat. */
export function imeZaPlakat(polno: string | null | undefined): string {
  const d = (polno ?? '').trim().split(/\s+/)
  if (d.length < 2) return polno ?? ''
  return `${d.slice(1).join(' ')} ${d[0]}`
}

/**
 * Krajsanje imena, kot ga naredi program tekme: najprej gredo srednja imena,
 * nato se prvo ime skrajsa na zacetnico. "Isaac Raphaël Tshima Omombo
 * Tshipamba-Mulowayi" (46 znakov — in tak igralec v bazi res je) postane
 * "I. Tshipamba-Mulowayi". Priimek je zadnja beseda in ostane cel, ker je
 * to tisto, po cemer ga navijaci poznajo.
 *
 * `meri` vrne sirino besedila v pikslih — na platnu `ctx.measureText`.
 */
export function skrajsajIme(ime: string, najvec: number, meri: (s: string) => number): string {
  if (meri(ime) <= najvec) return ime
  const d = ime.trim().split(/\s+/)
  if (d.length < 2) return ime
  const priimek = d[d.length - 1]
  const prvo = d[0]
  // 1. samo prvo ime + priimek
  const kratko = `${prvo} ${priimek}`
  if (meri(kratko) <= najvec) return kratko
  // 2. zacetnica + priimek
  const zacetnica = `${prvo[0]}. ${priimek}`
  if (meri(zacetnica) <= najvec) return zacetnica
  // 3. tudi priimek je predolg — ostane, kar je; klicatelj bo zmanjsal pisavo
  return zacetnica
}

/**
 * Najvecja velikost pisave, pri kateri besedilo ostane v `najvec` pikslih.
 * Racun po dolzini v znakih ne zadosca: "ND POLZELA - ZDRUŽENA SAVINJSKA" je
 * pri najmanjsem razredu (78 px) se vedno 1211 px sirok v 912 px prostora.
 */
export function prilagodiVelikost(
  besedilo: string,
  zacetna: number,
  najmanj: number,
  najvec: number,
  meriPri: (px: number, s: string) => number,
): number {
  let px = zacetna
  while (px > najmanj && meriPri(px, besedilo) > najvec) px -= 4
  return Math.max(px, najmanj)
}

/** Najvec trije, samo s tockami nad nic — plakat ne hvali nicel. */
export function najboljsiTrije(
  seznam: Array<{ full_name?: string | null; ime?: string | null; points?: number | string | null; tocke?: number | string | null; je_kapetan?: boolean }>,
): VrsticaIgralca[] {
  return seznam
    .map((s) => ({
      ime: imeZaPlakat(s.full_name ?? s.ime ?? ''),
      tocke: Number(s.points ?? s.tocke ?? 0),
      kapetan: Boolean(s.je_kapetan),
    }))
    .filter((s) => s.ime && s.tocke > 0)
    .sort((a, b) => b.tocke - a.tocke)
    .slice(0, 3)
}

/** Slovenska sklanjatev: 1 navijač, 2 navijača, 3–4 navijači, 5+ navijačev. */
export function navijacev(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return `${n} navijačev`
  const k = { 1: 'navijač', 2: 'navijača', 3: 'navijači', 4: 'navijači' }[n % 10] ?? 'navijačev'
  return `${n} ${k}`
}

/** Stavek pod seznamom kluba; prazen, kadar ni kaj povedati. */
export function stavekNavijacev(n: number): string | null {
  if (n <= 0) return null
  const glagol = n === 1 ? 'že ima' : n === 2 ? 'že imata' : n <= 4 ? 'že imajo' : 'že ima'
  return `${navijacev(n)} ${glagol} naše igralce v ekipi.`
}

/** Ime datoteke, ki jo clovek prenese. */
export function imeDatoteke(naslov: string): string {
  const cist = naslov
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || 'plakat'}.png`
}
