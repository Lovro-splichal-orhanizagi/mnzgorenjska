// Edge Function: trgovina-nakup
//
// Začetek plačila v trgovini (shop.slff.eu). Kliče brskalnik, kot gost ali
// prijavljen (Bearer <access_token>; neveljaven žeton = gost):
//
//   {"postavke": [{"razlicica_id": 1, "kolicina": 2}], "jezik": "sl"|"en"} → {"url": "<Checkout>"}
//   400 {"error", "hint": "trgovina-vnos"|"trgovina-zaloga"}
//
// Košarico preveri in zalogo rezervira baza (trgovina_rezerviraj, servis:
// cene in imena iz baze, ne iz brskalnika; rezervacija 30 min). Seja nosi
// metadata app=slff-shop, narocilo_id in oznaka; plačilo zapiše šele
// stripe-webhook. Cene z DDV (tax_behavior inclusive), DDV po državi kupca
// izračuna Stripe Tax. Tarife dostave so v Stripe (metadata app=slff-shop in
// kljuc, scripts/stripe-trgovina.sh): pismo_si le, če so vse postavke pismo.
// Pogoji (consent_collection) potrebujejo naslov pogojev v Stripe → Settings
// → Public details.
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_ANON_KEY, SHOP_URL (neobvezno, privzeto https://shop.slff.eu).
// Objava: scripts/hetzner/objavi-funkcije.sh trgovina-nakup

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const NAPAKA = 'Plačila ni bilo mogoče začeti.'
const EU27 = 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ')

type Polja = Record<string, string | number | boolean | undefined | null>

async function stripe<T>(pot: string, polja?: Polja): Promise<T> {
  const telo = polja
    ? new URLSearchParams(Object.entries(polja).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    : undefined
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    method: telo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: telo,
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Stripe ${pot}: ${j?.error?.message ?? r.status}`)
  return j as T
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

interface Rezervacija {
  narocilo_id: number
  javna_oznaka: string
  postavke: { ime: string; cena: number; kolicina: number; tax_code: string }[]
  pismo: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: NAPAKA }, 503)
  const SHOP = (Deno.env.get('SHOP_URL') ?? 'https://shop.slff.eu').replace(/\/$/, '')
  const URL_ = Deno.env.get('SUPABASE_URL')!

  const zeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: u } = zeton
    ? await createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(zeton)
    : { data: null }
  const user = u?.user ?? null

  const vhod = (await req.json().catch(() => ({}))) as { postavke?: unknown; jezik?: string }
  const jezik = vhod.jezik === 'en' ? 'en' : 'sl'
  const service = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await service.rpc('trgovina_rezerviraj', {
    p_postavke: vhod.postavke ?? null,
    p_user: user?.id ?? null,
    p_jezik: jezik,
  })
  if (error) {
    if (error.hint === 'trgovina-vnos' || error.hint === 'trgovina-zaloga') return json({ error: error.message, hint: error.hint }, 400)
    console.error('trgovina-nakup: rezerviraj', error)
    return json({ error: NAPAKA }, 500)
  }
  const r = data as Rezervacija

  try {
    const tarife = await stripe<{ data: { id: string; metadata: Record<string, string> }[] }>('shipping_rates?active=true&limit=100')
    const tarifa = (k: string) => tarife.data.find((t) => t.metadata?.app === 'slff-shop' && t.metadata?.kljuc === k)?.id
    const kljuci = r.pismo ? ['pismo_si', 'paket_si', 'paket_eu'] : ['paket_si', 'paket_eu']
    const ponudba = kljuci.map(tarifa).filter((t): t is string => !!t)
    if (!tarifa('paket_si') || !tarifa('paket_eu')) throw new Error('Tarife trgovine (paket_si, paket_eu) v Stripe ne obstajajo.')

    const meta = { app: 'slff-shop', narocilo_id: String(r.narocilo_id), oznaka: r.javna_oznaka }
    const polja: Polja = {
      mode: 'payment',
      'automatic_tax[enabled]': true,
      customer_creation: 'if_required',
      customer_email: user?.email,
      client_reference_id: user?.id,
      locale: jezik,
      // Stripe zahteva vsaj 30 min od nastanka seje; minuta rezerve za pot zahteve.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${SHOP}/thanks?n=${r.javna_oznaka}`,
      cancel_url: `${SHOP}/cart`,
      'consent_collection[terms_of_service]': 'required',
      'custom_text[terms_of_service_acceptance][message]':
        jezik === 'en' ? `I agree to the [terms of sale](${SHOP}/terms).` : `Strinjam se s [pogoji prodaje](${SHOP}/terms).`,
    }
    r.postavke.forEach((p, i) => {
      polja[`line_items[${i}][price_data][currency]`] = 'eur'
      polja[`line_items[${i}][price_data][unit_amount]`] = p.cena
      polja[`line_items[${i}][price_data][tax_behavior]`] = 'inclusive'
      polja[`line_items[${i}][price_data][product_data][name]`] = p.ime
      polja[`line_items[${i}][price_data][product_data][tax_code]`] = p.tax_code
      polja[`line_items[${i}][quantity]`] = p.kolicina
    })
    EU27.forEach((d, i) => (polja[`shipping_address_collection[allowed_countries][${i}]`] = d))
    ponudba.forEach((t, i) => (polja[`shipping_options[${i}][shipping_rate]`] = t))
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      polja[`payment_intent_data[metadata][${k}]`] = v
    }

    const s = await stripe<{ id: string; url: string }>('checkout/sessions', polja)
    const vez = await service.rpc('trgovina_vezi_sejo', { p_narocilo: r.narocilo_id, p_checkout: s.id })
    if (vez.error) {
      // Seja brez naročila bi plačala nič: raje jo zapremo.
      await stripe(`checkout/sessions/${s.id}/expire`, {}).catch(() => {})
      throw new Error(`trgovina_vezi_sejo: ${vez.error.message}`)
    }
    return json({ url: s.url })
  } catch (e) {
    // ponytail: rezervacija neuspele seje drži zalogo do svojega roka (30 min); sprostitev po id naročila, če bo motilo.
    console.error('trgovina-nakup:', e)
    return json({ error: NAPAKA }, 502)
  }
})
