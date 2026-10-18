// Izdelek trgovine v Stripe (čisto, preveri smoke).
//
// Vsaka nedigitalna postavka Checkouta nosi `price_data.product` = izdelek
// "SLFF Trgovina" (id slff-shop), ne `product_data`: darilni bon (kupon z
// applies_to) velja le za izdelke trgovine, en stalni izdelek pa pomeni, da bon
// velja tudi za izdelke, dodane po izdaji bona. Ime izdelka, različico in
// personalizacijo kupec vidi pod gumbom (custom_text.after_submit) in v
// potrditvenem mailu. Darilni bon gre s product_data (z bonom se bona ne kupi).

/** Isti id v stripe-webhook (IZDELEK_TRGOVINE, applies_to bonov). */
export const IZDELEK_TRGOVINE = 'slff-shop'

/** Seznam postavk pod gumbom Checkouta (Stripe dovoli največ 1200 znakov). */
export const seznamPostavk = (postavke: { ime: string; kolicina: number; opis?: string | null }[]): string =>
  postavke.map((p) => `${p.kolicina} × ${p.ime}${p.opis ? `: ${p.opis}` : ''}`).join('; ').slice(0, 1200)
