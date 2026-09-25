// Iz katere države je obiskovalec — samo za prvi obisk.
//
// Domena je ena (slff.eu), lig pa je lahko iz več držav. Kdor ligo že ima
// (povezava s `?t=` ali shranjena izbira), ostane pri njej in tega ne
// potrebuje: država sledi ligi. Ugibanje velja le za novega obiskovalca brez
// izbire, da Slovak ne pristane na Gorenjski.
//
// Brez strežnika: IP je na statičnem gostovanju nedosegljiv, jezik brskalnika
// in časovni pas pa povesta dovolj. Kdor pride s povezave `slff.eu/sk`, je
// državo izbral sam in ta obvelja pred ugibanjem.
import { PRIVZETO, type Tekmovanje } from './tekmovanje'

const KLJUC = 'slff-drzava'

/** Znane države: jezik in časovni pas, ki nanje kažeta. */
const DRZAVE: Record<string, { jeziki: string[]; pasovi: string[] }> = {
  SI: { jeziki: ['sl'], pasovi: ['Europe/Ljubljana'] },
  SK: { jeziki: ['sk'], pasovi: ['Europe/Bratislava'] },
}
export const znaneDrzave = () => Object.keys(DRZAVE)

/**
 * Ugib iz podatkov brskalnika (brez dostopa do njega, da je preverljiv v
 * `npm run smoke`). Vrstni red: izbira s povezave, prvi jezik brskalnika, ki
 * ga poznamo, časovni pas. Kdor ne ustreza ničemur, dobi null — in s tem
 * privzeto ligo, kakor doslej.
 */
export function ugibajDrzavo({
  shranjena,
  jeziki,
  casovniPas,
}: {
  shranjena?: string | null
  jeziki?: readonly string[] | null
  casovniPas?: string | null
}): string | null {
  if (shranjena && shranjena in DRZAVE) return shranjena
  for (const j of jeziki ?? []) {
    const osnova = j.toLowerCase().slice(0, 2)
    const d = Object.entries(DRZAVE).find(([, v]) => v.jeziki.includes(osnova))
    if (d) return d[0]
  }
  const poPasu = Object.entries(DRZAVE).find(([, v]) => casovniPas && v.pasovi.includes(casovniPas))
  return poPasu?.[0] ?? null
}

/** Ugib za tega obiskovalca. */
export function drzavaObiskovalca(): string | null {
  let shranjena: string | null = null
  try {
    shranjena = localStorage.getItem(KLJUC)
  } catch {}
  let casovniPas: string | null = null
  try {
    casovniPas = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {}
  return ugibajDrzavo({
    shranjena,
    jeziki: typeof navigator !== 'undefined' ? navigator.languages : null,
    casovniPas,
  })
}

/** Izbira države s povezave (`/sk`) — obvelja pred ugibanjem. */
export function zapomniDrzavo(koda: string) {
  try {
    localStorage.setItem(KLJUC, koda)
  } catch {}
}

/**
 * Privzeta liga za državo. Slovenija (in neznana država) ostane pri
 * `PRIVZETO`, kakor je bilo vedno; druga država dobi svojo prvo ligo. Če
 * država nima nobene aktivne lige, ugib ne pomeni nič in velja `PRIVZETO`.
 */
export function privzetaLiga(tekmovanja: readonly Tekmovanje[], drzava: string | null): string {
  if (!drzava || drzava === 'SI') return PRIVZETO
  return tekmovanja.find((t) => t.country_code === drzava)?.slug ?? PRIVZETO
}

/**
 * Država, ki jo obiskovalec gleda, in lige, ki jih vidi.
 *
 * Lige druge države so skrite: Slovenec slovaških ne vidi v izbirniku, oknu
 * prvega obiska ali državni lestvici. Država sledi ligi — kdor odpre
 * slovaško ligo (povezava `/sk`, deljena povezava s `?t=`), je v Slovaški in
 * vidi njene lige. Dokler liga ni znana, velja ugib, nato Slovenija.
 */
export function ligeDrzave(
  vse: readonly Tekmovanje[],
  slug: string,
  ugib: string | null,
): { drzava: string; lige: Tekmovanje[] } {
  const drzava = vse.find((t) => t.slug === slug)?.country_code ?? ugib ?? 'SI'
  const lige = vse.filter((t) => t.country_code === drzava)
  // Država brez aktivnih lig (ugib za Slovaka, dokler je njihova liga
  // neaktivna) ne sme pustiti izbirnika praznega.
  if (lige.length) return { drzava, lige }
  const slovenske = vse.filter((t) => t.country_code === 'SI')
  return { drzava: 'SI', lige: slovenske.length ? slovenske : [...vse] }
}
