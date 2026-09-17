// Plakat za objavo — slika, ki jo klub ali manager deli na FB in Instagramu.
//
// Instagram povezav ne sprejme, zato mora slika sama povedati vse: kdo, koliko
// in kje. Ker sta priloznosti dve in nista isti — klub objavi enkrat, da je v
// ligi, manager pa vsak teden svoj rezultat — je plakat splosen: veliko
// stevilo, oznaka pod njim in po potrebi znacka.
//
// Tu je samo racunanje. Risanje je v `src/components/Plakat.tsx`, ker
// potrebuje `canvas`.

/** Kvadrat: Instagram ga ne obreze, FB ga pokaze v celoti. */
export const SIRINA = 1080
export const VISINA = 1080

export interface PodatkiPlakata {
  /** Ime kluba ali ekipe — najvecje besedilo na kartici. */
  naslov: string
  /** Drobno nad imenom: liga. */
  liga?: string | null
  /** Junak plakata: ena sama velika stevilka. */
  stevilo: number | string
  /** Kaj ta stevilka je ("točk v 4. krogu", "igralcev v igri"). */
  oznaka: string
  /** Zlata znacka pod stevilko; brez nje se ne izrise. */
  znacka?: string | null
}

/**
 * Velikost pisave za ime: dolga imena ("Kety Emmi&Impol Bistrica") morajo
 * ostati v eni vrstici, ne pa pobegniti cez rob kartice.
 */
export function velikostNaslova(ime: string): number {
  const n = ime.length
  if (n <= 10) return 88
  if (n <= 16) return 72
  if (n <= 24) return 56
  return 46
}

/** Visina kartice iz vsebine — brez tega plakat pusti prazno tretjino. */
export function visinaKartice(p: PodatkiPlakata, visinaGrba = 208): number {
  const padTop = visinaGrba * 0.55 + 54
  return padTop + 46 + (velikostNaslova(p.naslov) + 22) + 194 + 48 + (p.znacka ? 96 : 0) + 54
}

/** Kje se kartica zacne, da je slika navpicno uravnotezena. */
export function zacetekKartice(visina: number): number {
  return Math.max(96, Math.round((VISINA - visina - 150) / 2) + 40)
}

/** Znacka za plakat kluba — nicel ne oglasujemo. */
export function znackaKluba(navijacev: number): string | null {
  if (!navijacev) return null
  const beseda =
    navijacev % 100 >= 11 && navijacev % 100 <= 14
      ? 'navijačev'
      : { 1: 'navijač', 2: 'navijača', 3: 'navijači', 4: 'navijači' }[navijacev % 10] ??
        'navijačev'
  return `${navijacev} ${beseda.toUpperCase()} JIH IMA`
}

/** Znacka za tedenski rezultat. */
export function znackaKroga(mesto?: number | null, odEkip?: number | null): string | null {
  if (!mesto) return null
  return odEkip ? `${mesto}. MESTO OD ${odEkip}` : `${mesto}. MESTO`
}

/** Ime datoteke, ki jo clovek prenese. */
export function imeDatoteke(naslov: string): string {
  const cist = naslov
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || 'ekipa'}.png`
}
