// Izdelki trgovine v Stripe (čisto, preveri smoke).
//
// Postavka Checkouta nosi `price_data.product` = izdelek "slff-shop-<slug>-<jezik>"
// (ime izdelka v jeziku naročila, tax_code izdelka), ne `product_data`: darilni bon
// (kupon z applies_to) velja le za izdelke trgovine, zato morajo biti postavke
// vezane na stalne izdelke v Stripe. Ime z različico in personalizacijo kupec vidi
// pod gumbom (custom_text.after_submit) in v potrditvenem mailu.

export interface IzdelekKataloga {
  slug: string
  ime_sl: string
  ime_en: string
  digitalni: boolean
}

export const imeV = (i: IzdelekKataloga, jezik: string): string => (jezik === 'en' ? i.ime_en : i.ime_sl)

export const idIzdelka = (slug: string, jezik: string): string => `slff-shop-${slug}-${jezik === 'en' ? 'en' : 'sl'}`

/**
 * Izdelek kataloga za ime postavke. Baza ime sestavi kot "<ime izdelka> (<različica>)"
 * (trgovina_rezerviraj); ob dveh ujemanjih zmaga daljše ime. Brez ujemanja null.
 */
export function izdelekPostavke(ime: string, jezik: string, katalog: IzdelekKataloga[]): IzdelekKataloga | null {
  let najdeno: IzdelekKataloga | null = null
  for (const i of katalog) {
    const k = imeV(i, jezik)
    if (ime.startsWith(`${k} (`) && (!najdeno || k.length > imeV(najdeno, jezik).length)) najdeno = i
  }
  return najdeno
}

/** Seznam postavk pod gumbom Checkouta (Stripe dovoli največ 1200 znakov). */
export const seznamPostavk = (postavke: { ime: string; kolicina: number; opis?: string | null }[]): string =>
  postavke.map((p) => `${p.kolicina} × ${p.ime}${p.opis ? `: ${p.opis}` : ''}`).join('; ').slice(0, 1200)
