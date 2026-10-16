// Edge Function: scout-placilo
//
// Naročnina SLFF Scout s Stripe Checkout. Kliče prijavljen uradni račun kluba
// s scout.slff.eu (Bearer <access_token>):
//
//   {"akcija": "checkout", "obdobje": "mesec"|"sezona", "jezik"?: "sl"|"en"} → {"url": "<Checkout>"}
//   {"akcija": "portal"} → {"url": "<Billing portal>"}  (plačnik ali katerikoli
//     uradni račun kluba: preklic mora biti vedno mogoč)
//
// Kaj sme, odloči baza z JWT kupca (scout_pripravi_nakup: sedež, klubski
// račun, ni že plačano, država odprta; scout_portal_kupec). Naročnino zapiše
// šele stripe-webhook (metadata app=slff-scout). Cene po lookup_key; B2B:
// davčna številka (tax_id_collection), cene brez DDV (tax_behavior exclusive),
// DDV doda Stripe Tax (automatic_tax). Portal je lastna konfiguracija Scouta
// (metadata app=slff-scout: preklic da, menjava paketa ne; ustvari jo lastnik
// enkrat na način, načrt 3b naloga 8), da kupec ne preklopi na ceno preverjenih.
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SCOUT_URL (neobvezno,
// privzeto https://scout.slff.eu). Objava: scripts/hetzner/objavi-funkcije.sh scout-placilo

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
// Kopija SCOUT_CENE iz stripe-webhook/scout.ts.
const CENE: Record<string, string> = { mesec: 'slff_scout_klub_mesec', sezona: 'slff_scout_klub_sezona' }
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
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Stripe ${pot}: ${j?.error?.message ?? r.status}`)
  return j as T
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: NAPAKA }, 503)
  const SCOUT = (Deno.env.get('SCOUT_URL') ?? 'https://scout.slff.eu').replace(/\/$/, '')

  const auth = req.headers.get('Authorization') ?? ''
  const baza = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: u } = await baza.auth.getUser(auth.replace(/^Bearer /, ''))
  if (!u?.user) return json({ error: NAPAKA }, 401)

  const vhod = (await req.json().catch(() => ({}))) as { akcija?: string; obdobje?: string; jezik?: string }
  try {
    if (vhod.akcija === 'portal') {
      const { data, error } = await baza.rpc('scout_portal_kupec')
      if (error || typeof data !== 'string') return json({ error: NAPAKA }, 400)
      const konfig = await stripe<{ data: { id: string; metadata: Record<string, string> }[] }>(
        'billing_portal/configurations?active=true&limit=100',
      )
      const configuration = konfig.data.find((c) => c.metadata?.app === 'slff-scout')?.id
      if (!configuration) throw new Error('Portal Scouta (metadata app=slff-scout) v Stripe ne obstaja.')
      const s = await stripe<{ url: string }>('billing_portal/sessions', {
        customer: data,
        configuration,
        return_url: `${SCOUT}/account`,
      })
      return json({ url: s.url })
    }
    if (vhod.akcija !== 'checkout') return json({ error: 'akcija: checkout ali portal.' }, 400)
    const obdobje = vhod.obdobje ?? ''
    if (!CENE[obdobje]) return json({ error: NAPAKA, hint: 'scout-filter' }, 400)

    const { data, error } = await baza.rpc('scout_pripravi_nakup', { p_obdobje: obdobje })
    if (error) return json({ error: NAPAKA, hint: error.hint ?? null }, 400)
    const n = (data ?? [])[0] as { team_id: number; stripe_customer_id: string | null; email: string | null } | undefined
    if (!n) return json({ error: NAPAKA }, 400)

    const cene = await stripe<{ data: { id: string; lookup_key: string; tax_behavior: string | null }[] }>(
      `prices?active=true&lookup_keys[]=${CENE[obdobje]}`,
    )
    // Cena brez DDV: DDV doda Stripe Tax. Vključen DDV bi klub plačal napačen znesek.
    const cena = cene.data.find((c) => c.lookup_key === CENE[obdobje] && c.tax_behavior === 'exclusive')?.id
    if (!cena) throw new Error(`Cena ${CENE[obdobje]} (tax_behavior exclusive) v Stripe ne obstaja.`)

    const meta = { app: 'slff-scout', team_id: String(n.team_id), user_id: u.user.id, obdobje }
    const polja: Polja = {
      mode: 'subscription',
      'line_items[0][price]': cena,
      'line_items[0][quantity]': 1,
      'automatic_tax[enabled]': true,
      'tax_id_collection[enabled]': true,
      billing_address_collection: 'required',
      client_reference_id: u.user.id,
      success_url: `${SCOUT}/account?placilo=uspeh`,
      cancel_url: `${SCOUT}/account?placilo=preklic`,
      locale: vhod.jezik === 'sl' ? 'sl' : 'en',
    }
    // Naročnina nosi iste oznake, da webhook loči dogodke Scouta od drugih.
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      polja[`subscription_data[metadata][${k}]`] = v
    }
    if (n.stripe_customer_id) {
      polja.customer = n.stripe_customer_id
      polja['customer_update[address]'] = 'auto'
      polja['customer_update[name]'] = 'auto'
    } else {
      polja.customer_email = n.email ?? u.user.email
    }
    const s = await stripe<{ url: string }>('checkout/sessions', polja)
    return json({ url: s.url })
  } catch (e) {
    console.error('scout-placilo:', e)
    return json({ error: NAPAKA }, 502)
  }
})
