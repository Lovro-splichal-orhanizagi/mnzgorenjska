// Edge Function: trgovina-boni
//
// Admin trgovine (shop.slff.eu/admin, zavihek Boni) ustvari promocijsko kodo
// za SLFF Scout ali preverjene igralce:
//
//   Bearer <access_token admina>
//   {"za": "scout"|"preverjen", "odstotek"?: 1–100, "znesek"?: centi > 0 (eno od obeh),
//    "uporab": 1–1000, "do": "YYYY-MM-DD" (jutri … 2 leti)}
//     → {"koda": "SLFF-XXXX-XXXX", "promocija": "promo_…", "velja_do": "<iso>"}
//   403 ni admin, 400 napačen vnos, 500 Stripe
//
// Admina preveri baza (rpc is_admin z žetonom klicatelja). Kupon velja le za
// izdelke Scouta ali preverjenih (applies_to.products iz cen po lookup_key),
// duration=once (pri naročnini Scouta prvi račun). metadata.app = slff-shop.
// Koda se vrne enkrat; ne beležimo je (ne v log ne v bazo), vidna je v Stripe.
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.
// Objava: scripts/hetzner/objavi-funkcije.sh trgovina-boni

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { preberiVnos } from './vnos.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
/** Oblika promocijskih kod se je v novejših API spremenila; kot stripe-webhook (boni). */
const RAZLICICA = '2025-03-31.basil'

export const CENE: Record<'scout' | 'preverjen', string[]> = {
  scout: ['slff_scout_klub_mesec', 'slff_scout_klub_sezona'],
  preverjen: ['slff_preverjen_letna', 'slff_preverjen_dozivljenjska', 'slff_znacka'],
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function stripe(pot: string, polja?: Record<string, string | number>, metoda = polja ? 'POST' : 'GET'): Promise<{ ok: boolean; j: Record<string, unknown> & { error?: { message?: string; code?: string } } }> {
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    method: metoda,
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      'Stripe-Version': RAZLICICA,
      ...(polja && { 'Content-Type': 'application/x-www-form-urlencoded' }),
    },
    body: polja ? new URLSearchParams(Object.entries(polja).map(([k, v]) => [k, String(v)])) : undefined,
    signal: AbortSignal.timeout(10000),
  })
  return { ok: r.ok, j: await r.json() }
}

/** Brez 0/O in 1/I; kot stripe-webhook/trgovina.ts novaKoda. */
const ABECEDA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function novaKoda(): string {
  const z = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => ABECEDA[x % ABECEDA.length]).join('')
  return `SLFF-${z.slice(0, 4)}-${z.slice(4)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Samo administrator.' }, 403)
  const uporabnik = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: admin } = await uporabnik.rpc('is_admin')
  if (admin !== true) return json({ error: 'Samo administrator.' }, 403)

  const v = preberiVnos(await req.json().catch(() => null))
  if (!v) return json({ error: 'Neveljaven vnos.' }, 400)
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: 'Pomanjkljiva nastavitev: STRIPE_SECRET_KEY.' }, 500)

  const cene = await stripe(`prices?active=true&limit=20&${CENE[v.za].map((k) => `lookup_keys[]=${k}`).join('&')}`)
  const izdelki = [...new Set(((cene.j.data ?? []) as { product: string | { id: string } }[])
    .map((c) => (typeof c.product === 'string' ? c.product : c.product.id)))]
  if (!cene.ok || izdelki.length === 0) {
    console.error('trgovina-boni: cene', cene.j.error?.message ?? 'brez cen')
    return json({ error: 'Izdelkov v Stripe ni bilo mogoče najti.' }, 500)
  }

  const meta = { 'metadata[app]': 'slff-shop', 'metadata[vrsta]': 'popust', 'metadata[za]': v.za }
  const kupon: Record<string, string | number> = {
    duration: 'once', max_redemptions: v.uporab, redeem_by: v.do, ...meta,
    name: `SLFF ${v.za === 'scout' ? 'Scout' : 'preverjen'} ${v.odstotek !== null ? `-${v.odstotek} %` : `-${(v.znesek! / 100).toFixed(2)} €`}`,
    ...(v.odstotek !== null ? { percent_off: v.odstotek } : { amount_off: v.znesek!, currency: 'eur' }),
  }
  izdelki.forEach((p, i) => (kupon[`applies_to[products][${i}]`] = p))
  const k = await stripe('coupons', kupon)
  if (!k.ok) {
    console.error('trgovina-boni: kupon', k.j.error?.message)
    return json({ error: k.j.error?.message ?? 'Kupona ni bilo mogoče ustvariti.' }, 500)
  }

  // Trk naključne kode je malo verjeten; ob napaki poskusimo še enkrat z drugo.
  let napaka = ''
  for (let poskus = 0; poskus < 2; poskus++) {
    // Koda poteče minuto pred kuponom (Stripe zavrne kodo, ki živi dlje od kupona; kot stripe-webhook).
    const pc = await stripe('promotion_codes', { coupon: String(k.j.id), code: novaKoda(), max_redemptions: v.uporab, expires_at: v.do - 60, ...meta })
    if (pc.ok) return json({ koda: pc.j.code, promocija: pc.j.id, velja_do: new Date((v.do - 60) * 1000).toISOString() })
    napaka = pc.j.error?.message ?? ''
  }
  console.error('trgovina-boni: koda', napaka)
  // Kupon brez kode ne služi ničemur: pospravimo ga.
  const brisi = await stripe(`coupons/${k.j.id}`, undefined, 'DELETE').catch(() => null)
  if (!brisi?.ok) console.error('trgovina-boni: brisanje kupona', brisi?.j.error?.message ?? 'napaka')
  return json({ error: napaka || 'Kode ni bilo mogoče ustvariti.' }, 500)
})
