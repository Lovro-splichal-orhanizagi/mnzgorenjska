// Države in tarife dostave trgovine (čisto, preveri smoke).

export const EU27 = 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ')

/** Ključi tarif (metadata kljuc v Stripe) za državo dostave: pismo le v SI in le, če so vse postavke pismo. */
export const tarifeZa = (drzava: string, pismo: boolean): string[] =>
  drzava === 'SI' ? (pismo ? ['pismo_si', 'paket_si'] : ['paket_si']) : ['paket_eu']
