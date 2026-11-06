// Edge Function: preverjen-placilo
//
// Nakup značke preverjenega igralca s Stripe Checkout (le splet; v aplikaciji
// je kartica skrita). Kliče prijavljen uporabnik (Bearer <access_token>):
//
//   {"akcija": "checkout", "player_id": 123, "vir": "letna"|"dozivljenjska",
//    "znacka": false, "dostava"?: "si"|"eu", "ime_na_znacki"?: "…",
//    "star_vsaj_18": true, "odpoved_pravici": true, "jezik"?: "sl"|…} → {"url": "<Checkout>"}
//   {"akcija": "portal", "player_id"?: 123} → {"url": "<Billing portal>"}
//     (vsak kupec z aktivno naročnino, ne glede na stikalo; vrnitev na
//     profil igralca ali /account)
//
// Kaj sme, odloči baza z JWT kupca: `preverjen_pripravi_nakup` (stikalo
// vidi_preverjene, potrjen profil kupca, ime ni skrito, ni že preverjen, ime
// na znački po `prepovedane_besede`). Pravico zapiše šele webhook
// (`stripe-webhook`) po plačilu. Cene iščemo po lookup_key, poštnino po
// metapodatku `kljuc` — id-jev ne pišemo v kodo.
//
// Poštnina: kupec izbere "Slovenija" ali "druga država EU"; seja dobi le
// ustrezno tarifo in le te države (SI ali EU-26).
//
// Napake baze, ki jih vmesnik pozna, gredo naprej; ostale postanejo splošna.
//
// Nad gumbom za plačilo in na računu (noga pri enkratnem plačilu, opis pri
// naročnini) je opomba o takojšnji zagotovitvi in izgubi pravice do odstopa
// (slovensko za `jezik: sl`, sicer angleško). STRIPE_TOS=1 doda še obvezno
// potrditev pogojev (`consent_collection[terms_of_service]`); Stripe jo zavrne, dokler v Settings → Public details ni vpisan Terms of service URL
// (https://slff.eu/legal#placljivo), zato je privzeto izklopljena.
//
// Env: STRIPE_SECRET_KEY (najprej sk_test_…), SITE_URL (https://slff.eu), STRIPE_TOS (neobvezno, 1),
// SUPABASE_URL, SUPABASE_ANON_KEY. Objava: scripts/hetzner/objavi-funkcije.sh preverjen-placilo

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { sledi } from '../_shared/napake.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// EU-27 (značka se pošilja le tja).
const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']

// Sporočila RPC, ki jih vmesnik prevede (src/lib/napake.ts).
const ZNANE = [/^Plačilo trenutno ni na voljo/, /^Preveriš lahko le svoj potrjen profil/, /^Profil je že preverjen/,
  /^Ime na znački ima lahko/, /^Ime tega igralca je skrito/, /^Besedilo vsebuje nedovoljene znake/,
  /^To besedilo ni dovoljeno/, /^Za nakup se je treba prijaviti/]
const NAPAKA = 'Plačila ni bilo mogoče začeti.'
const napakaBaze = (m: string) => (ZNANE.some((v) => v.test(m)) ? m : NAPAKA)

// Opomba nad gumbom in v nogi računa (trajni nosilec potrditve odpovedi).
const OPOMBA = {
  sl: 'Vsebina se zagotovi takoj po plačilu, zato s plačilom izgubiš pravico do odstopa v 14 dneh. Pogoji: https://slff.eu/legal#placljivo',
  en: 'The content is provided immediately after payment, so by paying you lose the 14-day right of withdrawal. Terms: https://slff.eu/legal#placljivo',
}

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

sledi('preverjen-placilo')

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
    dostava?: string
    ime_na_znacki?: string
    star_vsaj_18?: boolean
    odpoved_pravici?: boolean
    jezik?: string
  }
  try {
    if (vhod.akcija === 'portal') {
      const { data, error } = await baza.rpc('preverjen_moje_narocnine')
      if (error) return json({ error: napakaBaze(error.message) }, 400)
      const kupec = ((data ?? [])[0] as { stripe_customer_id: string } | undefined)?.stripe_customer_id
      if (!kupec) return json({ error: NAPAKA }, 400)
      const s = await stripe<{ url: string }>('billing_portal/sessions', {
        customer: kupec,
        return_url: Number.isInteger(vhod.player_id) ? `${SITE}/player/${vhod.player_id}` : `${SITE}/account`,
      })
      return json({ url: s.url })
    }
    if (!Number.isInteger(vhod.player_id)) return json({ error: NAPAKA }, 400)

    if (vhod.akcija !== 'checkout') return json({ error: 'akcija: checkout ali portal.' }, 400)
    const vir = vhod.vir
    if (vir !== 'letna' && vir !== 'dozivljenjska') return json({ error: 'vir: letna ali dozivljenjska.' }, 400)
    const znacka = vhod.znacka === true
    if (znacka && vir !== 'dozivljenjska') return json({ error: NAPAKA }, 400)
    if (znacka && vhod.dostava !== 'si' && vhod.dostava !== 'eu') return json({ error: NAPAKA }, 400)
    if (vhod.star_vsaj_18 !== true || vhod.odpoved_pravici !== true)
      return json({ error: NAPAKA }, 400)

    const { data, error } = await baza.rpc('preverjen_pripravi_nakup', {
      p_player_id: vhod.player_id,
      p_ime_na_znacki: znacka ? (vhod.ime_na_znacki ?? '') : null,
    })
    if (error) return json({ error: napakaBaze(error.message) }, 400)
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
      ...(znacka ? { ime_na_znacki: n.ime_na_znacki ?? '', dostava: vhod.dostava ?? '' } : {}),
    }
    const opomba = OPOMBA[vhod.jezik === 'sl' ? 'sl' : 'en']
    const polja: Polja = {
      mode: vir === 'letna' ? 'subscription' : 'payment',
      'line_items[0][price]': cena(CENE[vir]),
      'line_items[0][quantity]': 1,
      'automatic_tax[enabled]': true,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      client_reference_id: u.user.id,
      success_url: `${nazaj}uspeh`,
      cancel_url: `${nazaj}preklic`,
      locale: 'auto',
      'custom_text[submit][message]': opomba,
    }
    // Račun z isto opombo: pri enkratnem plačilu ga ustvari Checkout, pri
    // naročnini ga ustvari naročnina (nogo da privzeta noga računov v Stripe,
    // `invoice_creation` v načinu subscription ni dovoljen), opis naročnine pa se izpiše.
    if (vir === 'letna') polja['subscription_data[description]'] = opomba
    else {
      polja['invoice_creation[enabled]'] = true
      polja['invoice_creation[invoice_data][footer]'] = opomba
    }
    if (Deno.env.get('STRIPE_TOS') === '1') polja['consent_collection[terms_of_service]'] = 'required'
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
      const drzave = vhod.dostava === 'si' ? ['SI'] : EU.filter((d) => d !== 'SI')
      drzave.forEach((d, i) => (polja[`shipping_address_collection[allowed_countries][${i}]`] = d))
      const tarife = await stripe<{ data: { id: string; metadata: Record<string, string> }[] }>('shipping_rates?active=true&limit=100')
      const tarifa = tarife.data.find((t) => t.metadata?.kljuc === `postnina_${vhod.dostava}`)?.id
      if (!tarifa) throw new Error('Poštnina v Stripe ne obstaja.')
      polja['shipping_options[0][shipping_rate]'] = tarifa
    }
    const s = await stripe<{ url: string }>('checkout/sessions', polja)
    return json({ url: s.url })
  } catch (e) {
    console.error('preverjen-placilo:', e)
    return json({ error: NAPAKA }, 502)
  }
})
