// SLFF Pro v stripe-webhook: preverjanje postavk seje in obnove (čisti
// funkciji, preveri ju smoke). Kopija ključev cen je v pro-placilo/index.ts
// (funkciji se objavljata vsaka iz svoje mape). Zneski so v Stripe, ne tu.
import type { Postavka } from './scout.ts'

export const PRO_CENE: Record<string, string> = {
  sezona: 'slff_pro_sezona',
  mesec: 'slff_pro_mesec',
}

// Sezonski paket velja 365 dni od plačila (pokrije celo sezono, jesensko-pomladno ali koledarsko).
export const PRO_SEZONA_S = 365 * 24 * 3600

/** Seja ima natanko eno postavko: cena paketa, en kos, znesek pred popustom enak ceni. */
export function proPostavkeVeljajo(postavke: Postavka[], vir: string): boolean {
  const kljuc = PRO_CENE[vir]
  const l = postavke[0]
  return (
    Boolean(kljuc) &&
    postavke.length === 1 &&
    l?.quantity === 1 &&
    l.price?.lookup_key === kljuc &&
    l.amount_subtotal === l.price.unit_amount
  )
}

/** Obnova podaljša le naročnino, ki ima samo mesečno ceno Pro. */
export function proCeneNarocnine(sub: { items?: { data?: Postavka[] | null } | null }): boolean {
  const postavke = sub.items?.data ?? []
  return postavke.length > 0 && postavke.every((l) => l.price?.lookup_key === PRO_CENE.mesec)
}
