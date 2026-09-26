// Ugib države obiskovalca brez odvisnosti — bere ga tudi jedro prevodov
// (`src/i18n/jedro.ts`), ki ga uvažajo skripte v Node, zato tu ni Reacta ne
// Supabase. Razlaga pravil je v `drzava.ts`.

const KLJUC = 'slff-drzava'

/** Znane države: jezik in časovni pas, ki nanje kažeta. */
const DRZAVE: Record<string, { jeziki: string[]; pasovi: string[] }> = {
  SI: { jeziki: ['sl'], pasovi: ['Europe/Ljubljana'] },
  SK: { jeziki: ['sk'], pasovi: ['Europe/Bratislava'] },
}
export const znaneDrzave = () => Object.keys(DRZAVE)

/**
 * Države, ki so že vklopljene, a še zaprte: vanje pride le, kdor ima
 * povezavo `slff.eu/sk` ali deljeno povezavo lige (`?t=sk-…`). Jezik in
 * časovni pas brskalnika jih ne odpreta. Ko je država pripravljena za vse,
 * jo odstrani s seznama.
 */
export const SAMO_S_POVEZAVO: string[] = ['SK']

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
  // Zaprte države se po brskalniku ne ugiba — vanje pride le, kdor ima povezavo.
  const odprte = Object.entries(DRZAVE).filter(([k]) => !SAMO_S_POVEZAVO.includes(k))
  for (const j of jeziki ?? []) {
    const osnova = j.toLowerCase().slice(0, 2)
    const d = odprte.find(([, v]) => v.jeziki.includes(osnova))
    if (d) return d[0]
  }
  const poPasu = odprte.find(([, v]) => casovniPas && v.pasovi.includes(casovniPas))
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
 * Država lige po njeni šifri, preden je seznam lig naložen. Dogovor: šifra
 * lige zunaj Slovenije se začne s kodo države (`sk-ssfz-4liga`). Samo za
 * izbiro jezika ob nalaganju — kontekst lige ga popravi, če bi se zmotil.
 */
export function drzavaLige(slug: string | null | undefined): string | null {
  if (!slug) return null
  const m = slug.match(/^([a-z]{2})-/)
  return m && m[1].toUpperCase() in DRZAVE && m[1] !== 'sl' ? m[1].toUpperCase() : 'SI'
}

/** Jezik vmesnika za državo. */
export const JEZIK_DRZAVE: Record<string, string> = { SI: 'sl', SK: 'sk' }
