// SLFF Scout v stripe-webhook: preverjanje postavk seje (čista funkcija,
// preveri jo smoke). Kopija ključev cen je v scout-placilo/index.ts (funkciji
// se objavljata vsaka iz svoje mape).
export const SCOUT_CENE: Record<string, string> = {
  mesec: 'slff_scout_klub_mesec',
  sezona: 'slff_scout_klub_sezona',
}

export interface Postavka {
  quantity?: number | null
  amount_subtotal?: number | null
  amount_discount?: number | null
  price?: { lookup_key?: string | null; unit_amount?: number | null } | null
}

/** Seja ima natanko eno postavko: cena obdobja, en kos, znesek pred davkom brez popusta. */
export function scoutPostavkeVeljajo(postavke: Postavka[], obdobje: string): boolean {
  const kljuc = SCOUT_CENE[obdobje]
  const l = postavke[0]
  return (
    Boolean(kljuc) &&
    postavke.length === 1 &&
    l?.quantity === 1 &&
    l.price?.lookup_key === kljuc &&
    l.amount_subtotal === l.price.unit_amount &&
    (l.amount_discount ?? 0) === 0
  )
}

/** Naročnina (objekt subscription) ima le cene Scouta: obnova tuje cene ne podaljša dostopa. */
export function scoutCeneNarocnine(sub: { items?: { data?: Postavka[] | null } | null }): boolean {
  const postavke = sub.items?.data ?? []
  const kljuci = Object.values(SCOUT_CENE)
  return postavke.length > 0 && postavke.every((l) => kljuci.includes(l.price?.lookup_key ?? ''))
}
