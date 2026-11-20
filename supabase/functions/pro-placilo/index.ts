// Edge Function: pro-placilo
//
// SLFF Pro s Stripe Checkout (le splet; v aplikaciji je nakup skrit).
//
//   {"akcija": "cene"} → {"cene": [{"vir": "sezona"|"mesec", "centi", "valuta", "interval"}]}
//     (zneski iz Stripe po lookup_key, ne iz kode; le ko vidi_pro())
//   {"akcija": "checkout", "vir": "sezona"|"mesec", "star_vsaj_18": true,
//    "odpoved_pravici": true, "jezik"?: "sl"|…} → {"url": "<Checkout>"}  (prijavljen)
//   {"akcija": "portal"} → {"url": "<Billing portal>"}  (vsak kupec, ne glede
//     na stikalo: preklic mora biti vedno mogoč)
//
// Kaj sme, odloči baza z JWT kupca (`pro_pripravi_nakup`: stikalo slff_pro,
// ni že Pro). Pravico zapiše šele stripe-webhook (metadata app=slff-pro).
// Cene z DDV (tax_behavior inclusive), Stripe Tax (automatic_tax). Portal:
// konfiguracija z metadata app=slff-pro, če obstaja, sicer privzeta.
//
// Env: STRIPE_SECRET_KEY, SITE_URL (https://slff.eu), SUPABASE_URL, SUPABASE_ANON_KEY.
// Objava: scripts/hetzner/objavi-funkcije.sh pro-placilo

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { sledi } from '../_shared/napake.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
// Kopija PRO_CENE iz stripe-webhook/pro.ts.
const CENE: Record<string, string> = { sezona: 'slff_pro_sezona', mesec: 'slff_pro_mesec' }
const NAPAKA = 'Plačila ni bilo mogoče začeti.'
const NI_NA_VOLJO = 'Plačilo trenutno ni na voljo.'
// Sporočila RPC, ki jih vmesnik prevede (src/lib/napake.ts).
const ZNANE = [/^Plačilo trenutno ni na voljo/, /^Za nakup se je treba prijaviti/, /^SLFF Pro že imaš/]
const napakaBaze = (m: string) => (ZNANE.some((v) => v.test(m)) ? m : NAPAKA)

const OPOMBA = {
  sl: 'SLFF Pro se vklopi takoj po plačilu, zato s plačilom izgubiš pravico do odstopa v 14 dneh. Naročnino lahko kadarkoli prekličeš. Pogoji: https://slff.eu/legal#placljivo',
  en: 'SLFF Pro starts immediately after payment, so by paying you lose the 14-day right of withdrawal. You can cancel the subscription at any time. Terms: https://slff.eu/legal#placljivo',
}

type Polja = Record<string, string | number | boolean | undefined | null>
interface Cena { id: string; lookup_key: string; unit_amount: number; currency: string; tax_behavior: string | null; recurring: { interval: string } | null }

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

/** Aktivne cene Pro z DDV; cena brez DDV bi kupcu zaračunala napačen znesek. */
async function cene(): Promise<Cena[]> {
  const r = await stripe<{ data: Cena[] }>(`prices?active=true&${Object.values(CENE).map((k) => `lookup_keys[]=${k}`).join('&')}`)
  return r.data.filter((c) => c.tax_behavior === 'inclusive')
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

sledi('pro-placilo')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const SITE = Deno.env.get('SITE_URL')?.replace(/\/$/, '')
  if (!Deno.env.get('STRIPE_SECRET_KEY') || !SITE) return json({ error: NI_NA_VOLJO }, 503)

  const auth = req.headers.get('Authorization') ?? ''
  const baza = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const vhod = (await req.json().catch(() => ({}))) as {
    akcija?: string
    vir?: string
    star_vsaj_18?: boolean
    odpoved_pravici?: boolean
    jezik?: string
  }
  try {
    if (vhod.akcija === 'cene') {
      const { data: vidi } = await baza.rpc('vidi_pro')
      if (vidi !== true) return json({ error: NI_NA_VOLJO }, 403)
      const vir = (k: string) => Object.keys(CENE).find((v) => CENE[v] === k)
      return json({
        cene: (await cene()).map((c) => ({ vir: vir(c.lookup_key), centi: c.unit_amount, valuta: c.currency, interval: c.recurring?.interval ?? null })),
      })
    }

    const { data: u } = await baza.auth.getUser(auth.replace(/^Bearer /, ''))
    if (!u?.user) return json({ error: 'Za nakup se je treba prijaviti.' }, 401)

    if (vhod.akcija === 'portal') {
      const { data, error } = await baza.rpc('pro_portal_kupec')
      if (error || typeof data !== 'string') return json({ error: NAPAKA }, 400)
      const konfig = await stripe<{ data: { id: string; metadata: Record<string, string> }[] }>(
        'billing_portal/configurations?active=true&limit=100',
      )
      const s = await stripe<{ url: string }>('billing_portal/sessions', {
        customer: data,
        configuration: konfig.data.find((c) => c.metadata?.app === 'slff-pro')?.id,
        return_url: `${SITE}/account`,
      })
      return json({ url: s.url })
    }

    if (vhod.akcija !== 'checkout') return json({ error: 'akcija: cene, checkout ali portal.' }, 400)
    const vir = vhod.vir ?? ''
    if (!CENE[vir] || vhod.star_vsaj_18 !== true || vhod.odpoved_pravici !== true) return json({ error: NAPAKA }, 400)

    const { data, error } = await baza.rpc('pro_pripravi_nakup', { p_vir: vir })
    if (error) return json({ error: napakaBaze(error.message) }, 400)
    const n = (data ?? [])[0] as { stripe_customer_id: string | null; email: string | null } | undefined
    if (!n) return json({ error: NAPAKA }, 400)

    const cena = (await cene()).find((c) => c.lookup_key === CENE[vir])
    if (!cena) throw new Error(`Cena ${CENE[vir]} (tax_behavior inclusive) v Stripe ne obstaja.`)

    const narocnina = vir === 'mesec'
    const meta = { app: 'slff-pro', user_id: u.user.id, vir, star_vsaj_18: 'true', odpoved_pravici: 'true' }
    const opomba = OPOMBA[vhod.jezik === 'sl' ? 'sl' : 'en']
    const polja: Polja = {
      mode: narocnina ? 'subscription' : 'payment',
      'line_items[0][price]': cena.id,
      'line_items[0][quantity]': 1,
      'automatic_tax[enabled]': true,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      client_reference_id: u.user.id,
      success_url: `${SITE}/pro?placilo=uspeh`,
      cancel_url: `${SITE}/pro?placilo=preklic`,
      locale: 'auto',
      'custom_text[submit][message]': opomba,
    }
    // Račun z opombo: pri enkratnem plačilu ga ustvari Checkout, pri naročnini naročnina.
    if (narocnina) polja['subscription_data[description]'] = opomba
    else {
      polja['invoice_creation[enabled]'] = true
      polja['invoice_creation[invoice_data][footer]'] = opomba
    }
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      // Naročnina in plačilo nosita iste oznake, da webhook loči dogodke Pro od drugih.
      polja[narocnina ? `subscription_data[metadata][${k}]` : `payment_intent_data[metadata][${k}]`] = v
    }
    if (n.stripe_customer_id) {
      polja.customer = n.stripe_customer_id
      polja['customer_update[address]'] = 'auto'
      polja['customer_update[name]'] = 'auto'
    } else {
      polja.customer_email = n.email ?? u.user.email
      // Kupec sezonskega paketa potrebuje stranko v Stripe za portal (računi).
      if (!narocnina) polja.customer_creation = 'always'
    }
    const s = await stripe<{ url: string }>('checkout/sessions', polja)
    return json({ url: s.url })
  } catch (e) {
    console.error('pro-placilo:', e)
    return json({ error: NAPAKA }, 502)
  }
})
