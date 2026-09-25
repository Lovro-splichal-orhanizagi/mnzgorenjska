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

export { znaneDrzave, ugibajDrzavo, drzavaObiskovalca, zapomniDrzavo, drzavaLige, JEZIK_DRZAVE } from './drzavaUgib.ts'

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
