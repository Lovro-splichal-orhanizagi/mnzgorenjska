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

export interface PodatkiPlakata {
  klub: string
  liga: string
  igralcev: number
  navijacev: number
  najboljsi?: string | null
  tock?: number | null
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

/** Vrstice s stevilkami — izpustimo tiste, ki nicesar ne povedo. */
export function vrsticeStatistike(p: PodatkiPlakata): string[] {
  const out = [`${p.igralcev} igralcev v igri`]
  if (p.navijacev > 0) {
    out.push(
      `${p.navijacev} ${p.navijacev === 1 ? 'navijač jih ima' : 'navijačev jih ima'} v ekipi`,
    )
  }
  if (p.najboljsi && p.tock != null && p.tock > 0) {
    out.push(`Največ točk: ${p.najboljsi} (${p.tock})`)
  }
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
