// Edge Function: ponovna-cena
//
// Plačljivo ponovno vrednotenje cene igralca s Stripe Checkout (le splet; v
// aplikaciji je gumb skrit). Kliče prijavljen uporabnik (Bearer <access_token>):
//
//   {"player_id": 123, "jezik"?: "sl"|…} → {"url": "<Checkout>"}
//
// Kaj sme, odloči baza z JWT kupca (`ponovna_cena_pripravi`: stikalo
// `ponovna_cena`, liga, igralec, borza, teden, 7 dni, rok kroga; zahtevek
// 'caka_placilo'). Plačilo zabeleži stripe-webhook (metadata app=slff-cena →
// `ponovna_cena_iz_placila`), predlog izračuna delovni tok *Ponovne cene*,
// ceno premakne šele admin. Cena po lookup_key `slff_ponovna_cena` (z DDV).
//
// Env: STRIPE_SECRET_KEY, SITE_URL (https://slff.eu), SUPABASE_URL, SUPABASE_ANON_KEY.
// Objava: scripts/hetzner/objavi-funkcije.sh ponovna-cena

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const CENA = 'slff_ponovna_cena'
const NAPAKA = 'Plačila ni bilo mogoče začeti.'
// Sporočila RPC, ki jih vmesnik prevede (src/lib/napake.ts).
const ZNANE = [/^Plačilo trenutno ni na voljo/, /^Za nakup se je treba prijaviti/, /^Ponovno vrednotenje cene zdaj ni mogoče/, /^Račun je omejen do/]
const napakaBaze = (m: string) => (ZNANE.some((v) => v.test(m)) ? m : NAPAKA)

// Opomba nad gumbom in v nogi računa: storitev se zagotovi takoj (izračun), ne obljublja smeri.
const OPOMBA = {
  sl: 'Ceno izračunamo znova z istimi pravili kot vsak teden in jo potrdimo v nekaj dneh. Lahko se zviša, zniža ali ostane enaka. S plačilom izgubiš pravico do odstopa v 14 dneh. Pogoji: https://slff.eu/legal#placljivo',
  en: 'We recalculate the price with the same rules as every week and confirm it within a few days. It can go up, down or stay the same. By paying you lose the 14-day right of withdrawal. Terms: https://slff.eu/legal#placljivo',
}

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
  const SITE = Deno.env.get('SITE_URL')?.replace(/\/$/, '')
  if (!Deno.env.get('STRIPE_SECRET_KEY') || !SITE) return json({ error: 'Plačilo trenutno ni na voljo.' }, 503)

  const auth = req.headers.get('Authorization') ?? ''
  const baza = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: u } = await baza.auth.getUser(auth.replace(/^Bearer /, ''))
  if (!u?.user) return json({ error: 'Za nakup se je treba prijaviti.' }, 401)

  const vhod = (await req.json().catch(() => ({}))) as { player_id?: number; jezik?: string }
  if (!Number.isInteger(vhod.player_id)) return json({ error: NAPAKA }, 400)
  try {
    const { data, error } = await baza.rpc('ponovna_cena_pripravi', { p_player_id: vhod.player_id })
    if (error) return json({ error: napakaBaze(error.message) }, 400)
    const n = (data ?? [])[0] as { zahtevek: number; liga: string | null; email: string | null } | undefined
    if (!n) return json({ error: NAPAKA }, 400)

    const cene = await stripe<{ data: { id: string; lookup_key: string }[] }>(`prices?active=true&lookup_keys[]=${CENA}`)
    const cena = cene.data.find((c) => c.lookup_key === CENA)?.id
    if (!cena) throw new Error(`Cena ${CENA} v Stripe ne obstaja.`)

    const nazaj = `${SITE}/player/${vhod.player_id}?t=${encodeURIComponent(n.liga ?? '')}&cena=`
    const meta = { app: 'slff-cena', zahtevek: String(n.zahtevek), user_id: u.user.id, player_id: String(vhod.player_id) }
    const opomba = OPOMBA[vhod.jezik === 'sl' ? 'sl' : 'en']
    const polja: Polja = {
      mode: 'payment',
      'line_items[0][price]': cena,
      'line_items[0][quantity]': 1,
      'automatic_tax[enabled]': true,
      client_reference_id: u.user.id,
      customer_email: n.email ?? u.user.email,
      success_url: `${nazaj}uspeh`,
      cancel_url: `${nazaj}preklic`,
      locale: 'auto',
      'custom_text[submit][message]': opomba,
      'invoice_creation[enabled]': true,
      'invoice_creation[invoice_data][footer]': opomba,
      // Seja poteče prej kot privzetih 24 ur: zahtevek 'caka_placilo' drži igralca 35 minut (Stripe zahteva vsaj 30).
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    }
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      polja[`payment_intent_data[metadata][${k}]`] = v
    }
    const s = await stripe<{ url: string }>('checkout/sessions', polja)
    return json({ url: s.url })
  } catch (e) {
    console.error('ponovna-cena:', e)
    return json({ error: NAPAKA }, 502)
  }
})
