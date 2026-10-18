// SLFF Trgovina v stripe-webhook (metadata app=slff-shop): iz seje Checkout
// razbere zneske, naslov in tarifo za trgovina_iz_placila (čista funkcija,
// preveri jo smoke). Vejo dogodkov ima index.ts.

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>

export interface PlaciloTrgovine {
  p_checkout: string
  p_payment_intent: string | null
  p_email: string | null
  p_ime: string | null
  p_naslov: Obj | null
  p_postavke: number
  p_dostava: number
  p_ddv: number
  p_skupaj: number
}

/**
 * Argumenti trgovina_iz_placila brez p_dostava_kljuc (ta je v metapodatkih
 * tarife, ki jo index.ts prebere iz Stripe) in id tarife. Cene so z DDV,
 * zato `amount_subtotal` že vsebuje davek, `amount_tax` je le njegov delež.
 */
export function trgovinaIzSeje(o: Obj): { args: PlaciloTrgovine; tarifa: string | null; drzava: string | null } {
  const id = (v: unknown): string | null => (typeof v === 'string' ? v : ((v as Obj | null)?.id ?? null))
  const dostava = o.collected_information?.shipping_details ?? o.shipping_details
  const a = dostava?.address
  const naslov = a
    ? { name: dostava.name ?? null, line1: a.line1, line2: a.line2 ?? null, postal_code: a.postal_code, city: a.city, country: a.country }
    : null
  return {
    args: {
      p_checkout: o.id,
      p_payment_intent: id(o.payment_intent),
      p_email: o.customer_details?.email ?? o.customer_email ?? null,
      p_ime: dostava?.name ?? o.customer_details?.name ?? null,
      p_naslov: naslov,
      p_postavke: o.amount_subtotal ?? 0,
      p_dostava: o.total_details?.amount_shipping ?? o.shipping_cost?.amount_total ?? 0,
      p_ddv: o.total_details?.amount_tax ?? 0,
      p_skupaj: o.amount_total ?? 0,
    },
    tarifa: id(o.shipping_cost?.shipping_rate),
    drzava: a?.country ?? null,
  }
}

/**
 * Hosted Checkout ponudi vse tarife ne glede na državo: tarifa *_si za naslov
 * zunaj Slovenije je napaka kupca (doplačilo ali vračilo, preveri ročno).
 */
export const napacnaTarifa = (kljuc: string | null, drzava: string | null): boolean =>
  !!kljuc && kljuc.endsWith('_si') && drzava !== 'SI'
