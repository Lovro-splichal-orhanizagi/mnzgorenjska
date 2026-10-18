// Edge Function: trgovina-nakup
//
// Začetek plačila v trgovini (shop.slff.eu). Kliče brskalnik, kot gost ali
// prijavljen (Bearer <access_token>; neveljaven žeton = gost):
//
//   {"postavke": [{"razlicica_id": 1, "kolicina": 2}], "jezik": "sl"|"en", "drzava": "SI", "prejsnja"?: "cs_…"}
//     → {"url": "<Checkout>", "seja": "cs_…", "oznaka": "<javna oznaka>"}
//   400 {"error", "hint": "trgovina-vnos"|"trgovina-zaloga"}, 429 {"hint": "trgovina-omejitev"},
//   409 {"hint": "trgovina-placano"} (prejšnja seja je že plačana)
//
// `prejsnja` je seja, ki jo je brskalnik dobil zadnjič (nazaj s Checkouta):
// če je naročilo tega uporabnika ali odjemalca in še čaka plačilo, sejo
// zapremo v Stripe in rezervacijo sprostimo, da ponoven poskus ne drži zaloge
// dvakrat. Če je seja medtem plačana, ne sprostimo ničesar (409).
//
// Košarico preveri in zalogo rezervira baza (trgovina_rezerviraj, servis:
// cene in imena iz baze, ne iz brskalnika; rezervacija 35 min, seja 31 min).
// Odjemalec = sha256(IP + TRGOVINA_PEPPER): največ 5 odprtih naročil na
// uporabnika, gost na odjemalca; brez IP-ja je odjemalec naključen (brez
// meje). Država (EU-27) je izbrana pred plačilom: Checkout sprejme le
// naslov v njej in ponudi le njene tarife (tarife.ts). Le kartica, da je
// plačilo takoj. Seja nosi metadata app=slff-shop, narocilo_id in
// oznaka; plačilo zapiše šele stripe-webhook. Če seje ni, se rezervacija
// sprosti (trgovina_sprosti). Cene z DDV (tax_behavior inclusive), DDV po
// državi kupca izračuna Stripe Tax. Tarife dostave so v Stripe (metadata
// app=slff-shop in kljuc, scripts/stripe-trgovina.sh) ali v TRGOVINA_TARIFE.
// Pogoji (consent_collection) potrebujejo naslov pogojev v Stripe → Settings
// → Public details.
//
// Env: STRIPE_SECRET_KEY, TRGOVINA_PEPPER, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SHOP_URL (neobvezno, privzeto
// https://shop.slff.eu), TRGOVINA_TARIFE (neobvezno, JSON {kljuc: shr_…},
// sicer se tarife enkrat na proces preberejo iz Stripe).
// Objava: scripts/hetzner/objavi-funkcije.sh trgovina-nakup

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { EU27, tarifeZa } from './tarife.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const NAPAKA = 'Plačila ni bilo mogoče začeti.'

type Polja = Record<string, string | number | boolean | undefined | null>

async function stripe<T>(pot: string, polja?: Polja): Promise<T> {
  const telo = polja
    ? new URLSearchParams(Object.entries(polja).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    : undefined
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    method: telo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: telo,
    signal: AbortSignal.timeout(10000),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Stripe ${pot}: ${j?.error?.message ?? r.status}`)
  return j as T
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

let tarife: Record<string, string> | null = null

async function tarifeTrgovine(): Promise<Record<string, string>> {
  if (tarife) return tarife
  const env = Deno.env.get('TRGOVINA_TARIFE')
  const t: Record<string, string> = env ? JSON.parse(env) : {}
  if (!env) {
    const s = await stripe<{ data: { id: string; metadata: Record<string, string> }[] }>('shipping_rates?active=true&limit=100')
    for (const r of s.data) if (r.metadata?.app === 'slff-shop' && r.metadata.kljuc) t[r.metadata.kljuc] = r.id
  }
  if (!t.paket_si || !t.paket_eu) throw new Error('Tarife trgovine (paket_si, paket_eu) ne obstajajo.')
  return (tarife = t)
}

async function odjemalec(req: Request, poper: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || crypto.randomUUID()
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${poper}`))
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('')
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
  const poper = Deno.env.get('TRGOVINA_PEPPER')
  if (!Deno.env.get('STRIPE_SECRET_KEY') || !poper) return json({ error: NAPAKA }, 503)
  const SHOP = (Deno.env.get('SHOP_URL') ?? 'https://shop.slff.eu').replace(/\/$/, '')
  const URL_ = Deno.env.get('SUPABASE_URL')!

  const zeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: u } = zeton
    ? await createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(zeton)
    : { data: null }
  const user = u?.user ?? null

  const vhod = ((await req.json().catch(() => null)) ?? {}) as { postavke?: unknown; jezik?: string; drzava?: unknown; prejsnja?: unknown }
  const jezik = vhod.jezik === 'en' ? 'en' : 'sl'
  const drzava = vhod.drzava
  if (typeof drzava !== 'string' || !EU27.includes(drzava)) return json({ error: 'Dostava le v EU.', hint: 'trgovina-vnos' }, 400)
  const service = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const p_odjemalec = await odjemalec(req, poper)

  const prejsnja = typeof vhod.prejsnja === 'string' && /^cs_[A-Za-z0-9_]{10,200}$/.test(vhod.prejsnja) ? vhod.prejsnja : null
  if (prejsnja) {
    const { data: staro } = await service.rpc('trgovina_narocilo_seje', { p_checkout: prejsnja, p_user: user?.id ?? null, p_odjemalec })
    const n = staro as { id: number; stanje: string } | null
    if (n && (n.stanje === 'placano' || n.stanje === 'poslano')) return json({ error: 'Naročilo je že plačano.', hint: 'trgovina-placano' }, 409)
    if (n?.stanje === 'caka_placilo') {
      // Zapri v Stripe; če ne gre (že potekla ali plačana), preberi stanje seje.
      const status = await stripe<{ status: string }>(`checkout/sessions/${prejsnja}/expire`, {})
        .catch(() => stripe<{ status: string }>(`checkout/sessions/${prejsnja}`))
        .then((s) => s.status, (e) => (console.error('trgovina-nakup: prejšnja seja', String(e)), null))
      if (status === 'complete') return json({ error: 'Naročilo je že plačano.', hint: 'trgovina-placano' }, 409)
      if (status === 'expired') {
        const sp = await service.rpc('trgovina_sprosti', { p_narocilo: n.id })
        if (sp.error) console.error('trgovina-nakup: sprosti prejšnjo', sp.error)
      }
    }
  }

  const { data, error } = await service.rpc('trgovina_rezerviraj', {
    p_postavke: vhod.postavke ?? null,
    p_user: user?.id ?? null,
    p_jezik: jezik,
    p_odjemalec,
  })
  if (error) {
    if (error.hint === 'trgovina-omejitev') return json({ error: error.message, hint: error.hint }, 429)
    if (error.hint === 'trgovina-vnos' || error.hint === 'trgovina-zaloga') return json({ error: error.message, hint: error.hint }, 400)
    console.error('trgovina-nakup: rezerviraj', error)
    return json({ error: NAPAKA }, 500)
  }
  const r = data as Rezervacija

  try {
    const t = await tarifeTrgovine()
    const ponudba = tarifeZa(drzava, r.pismo).map((k) => t[k]).filter((id): id is string => !!id)

    const meta = { app: 'slff-shop', narocilo_id: String(r.narocilo_id), oznaka: r.javna_oznaka }
    const polja: Polja = {
      mode: 'payment',
      'payment_method_types[0]': 'card',
      'shipping_address_collection[allowed_countries][0]': drzava,
      'automatic_tax[enabled]': true,
      customer_creation: 'if_required',
      customer_email: user?.email,
      client_reference_id: user?.id,
      locale: jezik,
      // Stripe zahteva vsaj 30 min od nastanka seje; minuta rezerve za pot zahteve.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${SHOP}/thanks?n=${encodeURIComponent(r.javna_oznaka)}`,
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
    ponudba.forEach((id, i) => (polja[`shipping_options[${i}][shipping_rate]`] = id))
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      polja[`payment_intent_data[metadata][${k}]`] = v
    }

    const s = await stripe<{ id: string; url: string }>('checkout/sessions', polja).catch((e) => {
      tarife = null // tarifa je morda izbrisana v Stripe: naslednji klic jih prebere znova
      throw e
    })
    const vez = await service.rpc('trgovina_vezi_sejo', { p_narocilo: r.narocilo_id, p_checkout: s.id })
    if (vez.error) {
      // Seja brez naročila bi plačala nič: raje jo zapremo.
      await stripe(`checkout/sessions/${s.id}/expire`, {}).catch(() => {})
      throw new Error(`trgovina_vezi_sejo: ${vez.error.message}`)
    }
    return json({ url: s.url, seja: s.id, oznaka: r.javna_oznaka })
  } catch (e) {
    console.error('trgovina-nakup:', e)
    const sp = await service.rpc('trgovina_sprosti', { p_narocilo: r.narocilo_id })
    if (sp.error) console.error('trgovina-nakup: sprosti', sp.error)
    return json({ error: NAPAKA }, 502)
  }
})
