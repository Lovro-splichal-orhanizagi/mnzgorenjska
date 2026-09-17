// Plakat za objavo — slika, ki jo klub deli na FB ali Instagramu.
//
// Klub je prosil za "grafiko, da objavimo novico". Poslati eno sliko vsem ni
// prav: na Instagramu povezave ne delujejo, zato je slika edino, kar posteno
// pove, za kateri klub gre. Zato plakat nastane V BRSKALNIKU za vsak klub
// posebej — grb, ime, stevilke — in ga klub prenese z enim klikom.
//
// Tu je samo racunanje: postavitev, lomljenje besedila in barve. Risanje na
// platno je v `src/components/Plakat.tsx`, ker potrebuje `canvas`.

/** Kvadrat je najbolj varen: Instagram ga ne obreze, FB ga pokaze v celoti. */
export const SIRINA = 1080
export const VISINA = 1080

/**
 * Plakat je splosen, ker sta priloznosti dve in nista ista:
 *   • klub objavi, da je v ligi (enkrat),
 *   • manager objavi svoj rezultat kroga (vsak teden).
 * Druga je tista, ki se ponavlja, zato plakat ne sme poznati samo klubov.
 */
export interface PodatkiPlakata {
  /** Veliko, na sredini: ime kluba ali ime ekipe. */
  naslov: string
  /** Zeleno pod naslovom: "je v fantasy ligi SLFF" ali "68 tock v 4. krogu". */
  podnaslov: string
  /** Drobno: ime lige. */
  drobno?: string | null
  /** Vrstice s stevilkami. */
  vrstice: string[]
}

/**
 * Razlomi besedilo na vrstice, ki so ozje od `najvec`. Dolzino meri klicatelj
 * (na platnu `ctx.measureText`), da je racun enak temu, kar se res izrise.
 */
export function vVrstice(
  besedilo: string,
  najvec: number,
  sirinaBesedila: (s: string) => number,
): string[] {
  const besede = besedilo.split(/\s+/).filter(Boolean)
  if (!besede.length) return []
  const vrstice: string[] = []
  let tekoca = besede[0]
  for (const b of besede.slice(1)) {
    const poskus = `${tekoca} ${b}`
    if (sirinaBesedila(poskus) <= najvec) tekoca = poskus
    else {
      vrstice.push(tekoca)
      tekoca = b
    }
  }
  vrstice.push(tekoca)
  return vrstice
}

/**
 * Velikost pisave za naslov: dolga imena klubov ("Kety Emmi&Impol Bistrica")
 * morajo ostati v enem ali dveh vrsticah, ne pa pobegniti cez rob.
 */
export function velikostNaslova(ime: string): number {
  const n = ime.length
  if (n <= 12) return 96
  if (n <= 18) return 78
  if (n <= 26) return 64
  return 52
}

/** Vrstice za plakat kluba — izpustimo tiste, ki nicesar ne povedo. */
export function vrsticeKluba(v: {
  igralcev: number
  navijacev: number
  najboljsi?: string | null
  tock?: number | null
}): string[] {
  const out = [`${v.igralcev} igralcev v igri`]
  if (v.navijacev > 0) {
    out.push(
      `${v.navijacev} ${v.navijacev === 1 ? 'navijač jih ima' : 'navijačev jih ima'} v ekipi`,
    )
  }
  if (v.najboljsi && v.tock != null && v.tock > 0) {
    out.push(`Največ točk: ${v.najboljsi} (${v.tock})`)
  }
  return out
}

/** Vrstice za plakat tedenskega rezultata. */
export function vrsticeKroga(v: {
  mesto?: number | null
  odEkip?: number | null
  najboljsi?: string | null
  tockeNajboljsega?: number | null
  kazen?: number | null
}): string[] {
  const out: string[] = []
  if (v.mesto && v.odEkip) out.push(`${v.mesto}. mesto med ${v.odEkip} ekipami`)
  else if (v.mesto) out.push(`${v.mesto}. mesto v krogu`)
  if (v.najboljsi && v.tockeNajboljsega != null && v.tockeNajboljsega > 0) {
    out.push(`Najboljši: ${v.najboljsi} (${v.tockeNajboljsega})`)
  }
  // Kazen povemo, ker brez nje stevilka ne bi bila resnicna.
  if (v.kazen && v.kazen > 0) out.push(`Kazen za prestope: −${v.kazen}`)
  return out
}

/** Ime datoteke, ki jo klub prenese. */
export function imeDatoteke(klub: string): string {
  const cist = klub
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || 'klub'}.png`
}

/**
 * Kje naj se blok zacne, da je navpicno sredinjen.
 *
 * Brez tega plakat brez grba pusti veliko luknjo: vsebina se zacne na istem
 * mestu kot pri grbu, konca pa visje, in spodnja tretjina ostane prazna.
 */
export function zacetekBloka(visinaVsebine: number, visinaNoge = 200): number {
  const prostor = VISINA - visinaNoge
  return Math.max(120, Math.round((prostor - visinaVsebine) / 2))
}
