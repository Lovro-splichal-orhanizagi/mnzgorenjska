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
  p_popust: number
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
      p_popust: o.total_details?.amount_discount ?? 0,
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

// --- Darilni boni ------------------------------------------------------------

/** Brez 0/O in 1/I, da kode ni mogoče prebrati narobe. */
const ABECEDA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Naključna koda SLFF-XXXX-XXXX (8 znakov, 40 bitov). */
export function novaKoda(): string {
  const b = crypto.getRandomValues(new Uint8Array(8))
  const z = Array.from(b, (x) => ABECEDA[x % ABECEDA.length]).join('')
  return `SLFF-${z.slice(0, 4)}-${z.slice(4)}`
}

/**
 * Stalni id kupona za enoto postavke: ponovljen webhook najde isti kupon in
 * njegovo kodo (promotion_codes?coupon=…), zato druge kode za isto enoto ni.
 * Oznaka naročila loči baze, ki si delijo testni Stripe.
 */
export const idKupona = (oznaka: string, postavka: number, enota: number): string =>
  `slff-shop-bon-${oznaka}-${postavka}-${enota}`

export async function zgostiKodo(koda: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(koda))
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Postavke naročila (trgovina.narocilo_json), ki potrebujejo bon: [postavka, enota, znesek]. */
export function enoteBonov(postavke: { id: number; cena: number; kolicina: number; digitalni?: boolean }[]): [number, number, number][] {
  return postavke.filter((p) => p.digitalni).flatMap((p) => Array.from({ length: p.kolicina }, (_, i) => [p.id, i + 1, p.cena] as [number, number, number]))
}

/** Promocijske kode iz popustov seje (total_details.breakdown.discounts ali discounts; id ali objekt). */
export function kodeSeje(o: Obj): string[] {
  const id = (v: unknown): string | null => (typeof v === 'string' ? v : ((v as Obj | null)?.id ?? null))
  const iz = [...(o.total_details?.breakdown?.discounts ?? []).map((d: Obj) => d.discount ?? {}), ...(o.discounts ?? [])]
  return [...new Set(iz.map((d: Obj) => id(d.promotion_code)).filter((x): x is string => !!x))]
}
