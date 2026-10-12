// Edge Function: preverjen-placilo
//
// Nakup značke preverjenega igralca s Stripe Checkout (le splet; v aplikaciji
// je kartica skrita). Kliče prijavljen uporabnik (Bearer <access_token>):
//
//   {"akcija": "checkout", "player_id": 123, "vir": "letna"|"dozivljenjska",
//    "znacka": false, "ime_na_znacki"?: "…", "star_vsaj_18": true, "odpoved_pravici": true}
//     → {"url": "<Checkout>"}
//   {"akcija": "portal", "player_id": 123} → {"url": "<Billing portal>"}
//
// Kaj sme, odloči baza z JWT kupca: `preverjen_pripravi_nakup` (stikalo
// vidi_preverjene, potrjen profil kupca, ime ni skrito, ni že preverjen, ime
// na znački po `prepovedane_besede`). Pravico zapiše šele webhook
// (`stripe-webhook`) po plačilu. Cene iščemo po lookup_key, poštnino po
// metapodatku `kljuc` — id-jev ne pišemo v kodo.
//
// Poštnina: Checkout ne zna omejiti tarife na državo, zato kupec vidi obe
// (SI 2 €, EU 4 €); admin v naročilu vidi tarifo in državo.
//
// Env: STRIPE_SECRET_KEY (najprej sk_test_…), SITE_URL (https://slff.eu),
// SUPABASE_URL, SUPABASE_ANON_KEY. Objava: scripts/hetzner/objavi-funkcije.sh preverjen-placilo

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// EU-27 (značka se pošilja le tja).
const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']

const CENE = { letna: 'slff_preverjen_letna', dozivljenjska: 'slff_preverjen_dozivljenjska', znacka: 'slff_znacka' }

type Polja = Record<string, string | number | boolean | undefined | null>

/** Stripe REST: obrazec (`a[b][0]=c`), Bearer skrivni ključ. */
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

  const vhod = (await req.json().catch(() => ({}))) as {
    akcija?: string
    player_id?: number
    vir?: string
    znacka?: boolean
    ime_na_znacki?: string
    star_vsaj_18?: boolean
    odpoved_pravici?: boolean
  }
  if (!Number.isInteger(vhod.player_id)) return json({ error: 'player_id: številka igralca.' }, 400)

  try {
    if (vhod.akcija === 'portal') {
      const { data, error } = await baza.rpc('preverjen_moja_pravica', { p_player_id: vhod.player_id })
      if (error) return json({ error: error.message }, 400)
      const p = (data ?? [])[0] as { stripe_customer_id: string | null; liga: string | null } | undefined
      if (!p?.stripe_customer_id) return json({ error: 'Naročnine ni.' }, 400)
      const s = await stripe<{ url: string }>('billing_portal/sessions', {
        customer: p.stripe_customer_id,
        return_url: `${SITE}/player/${vhod.player_id}?t=${encodeURIComponent(p.liga ?? '')}`,
      })
      return json({ url: s.url })
    }

    if (vhod.akcija !== 'checkout') return json({ error: 'akcija: checkout ali portal.' }, 400)
    const vir = vhod.vir
    if (vir !== 'letna' && vir !== 'dozivljenjska') return json({ error: 'vir: letna ali dozivljenjska.' }, 400)
    const znacka = vhod.znacka === true
    if (znacka && vir !== 'dozivljenjska') return json({ error: 'Značka je le z doživljenjsko.' }, 400)
    if (vhod.star_vsaj_18 !== true || vhod.odpoved_pravici !== true)
      return json({ error: 'Potrdi, da si star vsaj 18 let, in soglasje o takojšnji zagotovitvi.' }, 400)

    const { data, error } = await baza.rpc('preverjen_pripravi_nakup', {
      p_player_id: vhod.player_id,
      p_ime_na_znacki: znacka ? (vhod.ime_na_znacki ?? '') : null,
    })
    if (error) return json({ error: error.message }, 400)
    const n = (data ?? [])[0] as
      | { glavni: number; liga: string | null; stripe_customer_id: string | null; email: string | null; ime_na_znacki: string | null }
      | undefined
    if (!n) return json({ error: 'Preveriš lahko le svoj potrjen profil.' }, 400)

    const kljuci = [CENE[vir], ...(znacka ? [CENE.znacka] : [])]
    const cene = await stripe<{ data: { id: string; lookup_key: string }[] }>(
      `prices?active=true&${kljuci.map((k) => `lookup_keys[]=${k}`).join('&')}`,
    )
    const cena = (k: string) => {
      const c = cene.data.find((x) => x.lookup_key === k)
      if (!c) throw new Error(`Cena ${k} v Stripe ne obstaja.`)
      return c.id
    }

    const nazaj = `${SITE}/player/${vhod.player_id}?t=${encodeURIComponent(n.liga ?? '')}&placilo=`
    const meta = {
      app: 'slff',
      user_id: u.user.id,
      player_id: String(n.glavni),
      vir,
      znacka: String(znacka),
      star_vsaj_18: 'true',
      odpoved_pravici: 'true',
      ...(znacka ? { ime_na_znacki: n.ime_na_znacki ?? '' } : {}),
    }
    const polja: Polja = {
      mode: vir === 'letna' ? 'subscription' : 'payment',
      'line_items[0][price]': cena(CENE[vir]),
      'line_items[0][quantity]': 1,
      'automatic_tax[enabled]': true,
      billing_address_collection: 'required',
      client_reference_id: u.user.id,
      success_url: `${nazaj}uspeh`,
      cancel_url: `${nazaj}preklic`,
      locale: 'auto',
    }
    for (const [k, v] of Object.entries(meta)) {
      polja[`metadata[${k}]`] = v
      // Naročnina in plačilo nosita iste oznake, da webhook loči naše dogodke od drugih znamk računa.
      polja[vir === 'letna' ? `subscription_data[metadata][${k}]` : `payment_intent_data[metadata][${k}]`] = v
    }
    if (n.stripe_customer_id) {
      polja.customer = n.stripe_customer_id
      polja['customer_update[address]'] = 'auto'
      polja['customer_update[name]'] = 'auto'
      if (znacka) polja['customer_update[shipping]'] = 'auto'
    } else {
      polja.customer_email = n.email ?? u.user.email
      if (vir === 'dozivljenjska') polja.customer_creation = 'always'
    }
    if (znacka) {
      polja['line_items[1][price]'] = cena(CENE.znacka)
      polja['line_items[1][quantity]'] = 1
      EU.forEach((d, i) => (polja[`shipping_address_collection[allowed_countries][${i}]`] = d))
      const tarife = await stripe<{ data: { id: string; metadata: Record<string, string> }[] }>('shipping_rates?active=true&limit=100')
      const izbrane = ['postnina_si', 'postnina_eu'].map((k) => tarife.data.find((t) => t.metadata?.kljuc === k)?.id)
      if (izbrane.some((t) => !t)) throw new Error('Poštnina v Stripe ne obstaja.')
      izbrane.forEach((t, i) => (polja[`shipping_options[${i}][shipping_rate]`] = t))
    }
    const s = await stripe<{ url: string }>('checkout/sessions', polja)
    return json({ url: s.url })
  } catch (e) {
    console.error('preverjen-placilo:', e)
    return json({ error: 'Plačila ni bilo mogoče začeti.' }, 502)
  }
})
