// Države in tarife dostave trgovine (čisto, preveri smoke).

export const EU27 = 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ')

/** Brezplačna poštnina od tega zneska izdelkov (centi z DDV, brez darilnih bonov). Kopija v shop/src/kosarica.ts (smoke primerja). */
export const BREZPLACNA_OD = 5000

/**
 * Ključi tarif (metadata kljuc v Stripe) za državo dostave: pismo le v SI in le, če so vse postavke pismo;
 * od `BREZPLACNA_OD` (`blago` v centih) le brezplačna tarifa države.
 */
export const tarifeZa = (drzava: string, pismo: boolean, blago = 0): string[] =>
  blago >= BREZPLACNA_OD
    ? [drzava === 'SI' ? 'brez_si' : 'brez_eu']
    : drzava === 'SI' ? (pismo ? ['pismo_si', 'paket_si'] : ['paket_si']) : ['paket_eu']
