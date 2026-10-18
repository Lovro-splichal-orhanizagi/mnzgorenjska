// Edge Function: stripe-webhook
//
// Dve vrsti klica:
//
// 1. Stripe (glava `Stripe-Signature`, brez JWT): podpis (podpis.ts) ali
//    400. Dogodek (evt_…) se zapiše v `stripe_dogodki`; obdelan
//    (`obdelano_at`) se ne obdela znova, neobdelan (napaka, 500) ob ponovitvi
//    Stripe da. Servisne funkcije so idempotentne.
// 2. Vrsta preklicev: `{"akcija": "preklici"}` s servisnim ključem (delovni
//    tok *Preverjeni: preklici naročnin*, vsako uro) ali admin JWT (po odvzemu
//    v Administraciji). Prekliče naročnine, ki jih je baza označila
//    (`stripe_preklic = 'caka'`: preklic profila, anonimizacija, izbris
//    računa, odvzem, dodelitev drugemu, vračilo, spor). Isto se zgodi tudi
//    po vsakem dogodku Stripe.
//
// Račun Stripe je skupen več znamkam. Seje in naročnine nosijo metadata
// app=slff; plačila (charge) ne nujno, zato vračilo in spor poiščemo v bazi
// (payment_intent, sicer račun → naročnina); neznana → 200 in nič.
//
// Dogodki (nastavi jih lastnik v Stripe → Webhooks):
//   checkout.session.completed, checkout.session.async_payment_succeeded
//     → preverjen_iz_placila (postavke preverjene po lookup_key; letna: rok =
//       konec obdobja + 3 dni milosti; doživljenjska: brez roka; naročilo
//       značke). 'preklican' pri naročnini → naročnino takoj prekličemo.
//   invoice.paid, customer.subscription.updated → preverjen_podaljsaj
//     ('brez_pravice': naša naročnina brez pravice → preklic + Discord).
//     unpaid in past_due pustita pravico do roka.
//   customer.subscription.deleted (ali canceled, incomplete_expired)
//     → preverjen_narocnina_konec
//   charge.refunded → preverjen_vracilo (zneska vrnjeno/plačano)
//   charge.dispute.created → preverjen_vracilo kot spor
//   charge.dispute.closed (won) → preverjen_spor_dobljen
//
// SLFF Scout (metadata app=slff-scout, faza 3): seja → scout_iz_placila
// (postavke po scout.ts; 'aktivna:<stara>' → prekliče staro naročnino;
// 'dvojno', 'zaprt', 'ni_narocnine' → preklic nove + Discord "vrni denar"),
// invoice.paid in subscription.updated → scout_podaljsaj le, če ima naročnina
// samo cene Scouta ('zaprt' ali tuja cena → preklic), deleted →
// scout_narocnina_konec.
// Vračil in sporov Scouta ne obdelujemo samodejno: admin naročnino prekliče v
// Stripe, kar pride kot subscription.deleted.
//
// SLFF Trgovina (metadata app=slff-shop, trgovina.ts): plačana seja
// (completed s payment_status paid ali async_payment_succeeded) →
// trgovina_iz_placila; 'placano'/'premalo' → mail potrditve (trgovina-posta)
// in Discord ('premalo' z opozorilom o zalogi); 'neznano' (poteklo ali
// preklicano naročilo) se ne označi samo: Discord "ročno potrdi ali vrni
// denar" in 200. checkout.session.expired in async_payment_failed →
// trgovina_potekla (sprosti rezervacijo).
//
// Oblike objektov se med različicami API razlikujejo (basil: obdobje na
// postavkah, naročnina računa pod `parent`, račun plačila prek
// invoice_payments); beremo obe.
//
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…), SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
// Objava: scripts/hetzner/objavi-funkcije.sh stripe-webhook
// Naslov: https://api.slff.eu/functions/v1/stripe-webhook (brez JWT!)

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { veljavenPodpis } from './podpis.ts'
import { scoutCeneNarocnine, scoutPostavkeVeljajo } from './scout.ts'
import { napacnaTarifa, trgovinaIzSeje } from './trgovina.ts'

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const baza = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
const MILOST_S = 3 * 24 * 3600
const CENE = { letna: 'slff_preverjen_letna', dozivljenjska: 'slff_preverjen_dozivljenjska', znacka: 'slff_znacka' }
const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null)
const id = (v: unknown): string | null => (typeof v === 'string' ? v : ((v as Obj | null)?.id ?? null))

async function stripe(pot: string, metoda = 'GET'): Promise<{ ok: boolean; status: number; j: Obj }> {
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    method: metoda,
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
  })
  return { ok: r.ok, status: r.status, j: await r.json() }
}
async function beri(pot: string): Promise<Obj> {
  const r = await stripe(pot)
  if (!r.ok) throw new Error(`Stripe ${pot}: ${r.j?.error?.message ?? r.status}`)
  return r.j
}

const konecObdobja = (sub: Obj): number | null =>
  sub.current_period_end ?? (Math.max(0, ...(sub.items?.data ?? []).map((i: Obj) => i.current_period_end ?? 0)) || null)

async function rpc(ime: string, args: Obj): Promise<string> {
  const { data, error } = await baza.rpc(ime, args)
  if (error) throw new Error(`${ime}: ${error.message}`)
  return String(data)
}
const discord = (besedilo: string) => baza.rpc('preverjeni_na_discord', { p_besedilo: besedilo })

/** Prekliče naročnino; že preklicana ali neobstoječa šteje za opravljeno. */
async function prekliciNarocnino(sub: string): Promise<void> {
  const r = await stripe(`subscriptions/${sub}`, 'DELETE')
  if (!r.ok) {
    const g = await stripe(`subscriptions/${sub}`)
    if (g.ok && g.j.status !== 'canceled') throw new Error(`preklic ${sub}: ${r.j?.error?.message ?? r.status}`)
  }
  await rpc('preverjen_preklic_opravljen', { p_subscription: sub })
}

async function prekliciCakajoce(): Promise<number> {
  const { data, error } = await baza.rpc('preverjen_cakajoci_preklici')
  if (error) throw new Error(error.message)
  let n = 0
  for (const sub of (data ?? []) as string[]) {
    try {
      await prekliciNarocnino(sub)
      n++
    } catch (e) {
      console.error('stripe-webhook: preklic', e)
    }
  }
  return n
}

/** Naročnina plačila: račun (stari API: charge.invoice; basil: invoice_payments). */
async function narocninaPlacila(placilo: Obj): Promise<string | null> {
  let racun = id(placilo.invoice)
  const pi = id(placilo.payment_intent)
  if (!racun && pi) {
    const ip = await stripe(`invoice_payments?payment[type]=payment_intent&payment[payment_intent]=${pi}&limit=1`)
    racun = ip.ok ? id(ip.j.data?.[0]?.invoice) : null
  }
  if (!racun) return null
  const inv = await beri(`invoices/${racun}`)
  return id(inv.subscription) ?? id(inv.parent?.subscription_details?.subscription)
}

/** Naše plačilo? Najprej po payment_intent v bazi, sicer po naročnini. */
async function nasePlacilo(placilo: Obj): Promise<{ pi: string | null; sub: string | null } | null> {
  const pi = id(placilo.payment_intent)
  if (pi) {
    const { data } = await baza.from('preverjeni_racuni').select('id').eq('stripe_payment_intent', pi).limit(1)
    if (data?.length) return { pi, sub: null }
  }
  const sub = await narocninaPlacila(placilo)
  if (!sub) return null
  const { data } = await baza.from('preverjeni_racuni').select('id').eq('stripe_subscription_id', sub).limit(1)
  return data?.length ? { pi: null, sub } : null
}

/** Postavke seje ustrezajo nakupu (lookup_key, en kos, cena pred davkom in popustom). Vrne plačan znesek pravice. */
async function preveriPostavke(seja: string, vir: string, znacka: boolean): Promise<number | null> {
  const p = await beri(`checkout/sessions/${seja}/line_items?limit=10`)
  const postavke = (p.data ?? []) as Obj[]
  const najdi = (k: string) => postavke.find((l) => l.price?.lookup_key === k && l.quantity === 1)
  const pravica = najdi(CENE[vir as 'letna' | 'dozivljenjska'])
  const ok =
    !!pravica &&
    pravica.amount_subtotal === pravica.price.unit_amount * pravica.quantity &&
    postavke.length === (znacka ? 2 : 1) &&
    (!znacka || !!najdi(CENE.znacka))
  return ok ? pravica.amount_total : null
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // OPTIONS: brskalnik (admin) in preverba objave (objavi-funkcije.sh).
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const glava = req.headers.get('Stripe-Signature')
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return new Response('not configured', { status: glava ? 500 : 200, headers: CORS })

  if (!glava) {
    // Vrsta preklicev: servis ali admin.
    const auth = req.headers.get('Authorization') ?? ''
    let sme = [SERVICE_KEY, Deno.env.get('SUPABASE_SECRET_KEY')].filter(Boolean).some((k) => auth === `Bearer ${k}`)
    if (!sme && auth) {
      const u = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: auth } },
      })
      sme = (await u.rpc('is_admin')).data === true
    }
    if (!sme) return new Response('bad signature', { status: 400, headers: CORS })
    const glavaJson = { ...CORS, 'Content-Type': 'application/json' }
    try {
      return new Response(JSON.stringify({ preklicano: await prekliciCakajoce() }), { headers: glavaJson })
    } catch (e) {
      console.error('stripe-webhook: vrsta', e)
      return new Response(JSON.stringify({ error: 'vrsta' }), { status: 500, headers: glavaJson })
    }
  }

  const skrivnost = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!skrivnost) return new Response('not configured', { status: 500 })
  const telo = await req.text()
  if (!(await veljavenPodpis(glava, telo, skrivnost))) return new Response('bad signature', { status: 400 })
  let dogodek: Obj
  try {
    dogodek = JSON.parse(telo)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const { data: ze } = await baza.from('stripe_dogodki').select('obdelano_at').eq('id', dogodek.id).maybeSingle()
  if (ze?.obdelano_at) return new Response('duplicate', { status: 200 })
  if (!ze) {
    const { error } = await baza.from('stripe_dogodki').insert({ id: dogodek.id, tip: dogodek.type })
    if (error && error.code !== '23505') return new Response(error.message, { status: 500 })
  }

  try {
    const izid = await obdelaj(dogodek.type, dogodek.data?.object ?? {})
    await baza.from('stripe_dogodki').update({ obdelano_at: new Date().toISOString() }).eq('id', dogodek.id)
    await prekliciCakajoce().catch((e) => console.error('stripe-webhook: vrsta', e))
    console.log(`stripe-webhook: ${dogodek.type} ${dogodek.id} → ${izid}`)
    return new Response(izid, { status: 200 })
  } catch (e) {
    console.error(`stripe-webhook: ${dogodek.type} ${dogodek.id}`, e)
    return new Response('error', { status: 500 })
  }
})

async function obdelaj(tip: string, o: Obj): Promise<string> {
  switch (tip) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const m = o.metadata ?? {}
      if (m.app === 'slff-scout') return await scoutSeja(o)
      if (m.app === 'slff-shop') return await trgovinaSeja(o)
      if (m.app !== 'slff') return 'ignored'
      if (!['paid', 'no_payment_required'].includes(o.payment_status)) return 'unpaid'
      const vir = m.vir
      const sub = id(o.subscription)
      const znesek = await preveriPostavke(o.id, vir, m.znacka === 'true')
      if (znesek == null) {
        await discord(`⚠️ Seja ${o.id}: postavke se ne ujemajo z nakupom, pravice ni (preveri in vrni denar).`)
        if (sub) await prekliciNarocnino(sub)
        return 'neveljavne postavke'
      }
      let veljaDo: string | null = null
      if (vir === 'letna') {
        const konec = konecObdobja(await beri(`subscriptions/${sub}`))
        // Brez konca obdobja bi letna veljala za vedno: raje napaka in ponovitev.
        if (!konec) throw new Error('naročnina brez konca obdobja')
        veljaDo = iso(konec + MILOST_S)
      }
      const dostava = o.collected_information?.shipping_details ?? o.shipping_details
      let naslov: Obj | null = null
      let postnina: string | null = null
      if (m.znacka === 'true' && dostava?.address) {
        const a = dostava.address
        naslov = { name: dostava.name, line1: a.line1, line2: a.line2, postal_code: a.postal_code, city: a.city, country: a.country }
        const tarifa = id(o.shipping_cost?.shipping_rate)
        if (tarifa) postnina = (await beri(`shipping_rates/${tarifa}`)).metadata?.kljuc ?? tarifa
      }
      const izid = await rpc('preverjen_iz_placila', {
        p_user_id: m.user_id,
        p_player_id: Number(m.player_id),
        p_vir: vir,
        p_velja_do: veljaDo,
        p_customer: id(o.customer),
        p_subscription: sub,
        p_checkout: o.id,
        p_payment_intent: id(o.payment_intent),
        p_star_vsaj_18: m.star_vsaj_18 === 'true',
        p_odpoved: m.odpoved_pravici === 'true',
        p_znesek: znesek,
        p_ime_na_znacki: m.ime_na_znacki ?? null,
        p_naslov: naslov,
        p_postnina: postnina,
      })
      // Brez pravice ne smemo zaračunavati naprej (tudi če vrstice ni).
      if (izid === 'preklican' && sub) await prekliciNarocnino(sub)
      return izid
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      if (o.metadata?.app !== 'slff-shop') return 'ignored'
      return await rpc('trgovina_potekla', { p_checkout: o.id })
    case 'invoice.paid': {
      const podrobno = o.parent?.subscription_details ?? o.subscription_details ?? {}
      const sub = id(o.subscription) ?? id(podrobno.subscription)
      const app = podrobno.metadata?.app
      if ((app !== 'slff' && app !== 'slff-scout') || !sub) return 'ignored'
      const konec = Math.max(0, ...(o.lines?.data ?? []).map((l: Obj) => l.period?.end ?? 0))
      if (!konec) return 'no period'
      return app === 'slff-scout' ? await scoutPodaljsaj(await beri(`subscriptions/${sub}`), konec) : await podaljsaj(sub, konec)
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      if (o.metadata?.app === 'slff-scout') return await scoutNarocnina(tip, o)
      if (o.metadata?.app !== 'slff') return 'ignored'
      if (tip === 'customer.subscription.deleted' || ['canceled', 'incomplete_expired'].includes(o.status))
        return await rpc('preverjen_narocnina_konec', {
          p_subscription: o.id,
          p_konec: iso(o.ended_at ?? o.canceled_at) ?? new Date().toISOString(),
        })
      // past_due in unpaid: pravica velja do roka, nato poteče sama.
      const konec = konecObdobja(o)
      if (!konec || !['active', 'trialing'].includes(o.status)) return 'unchanged'
      return await podaljsaj(o.id, konec)
    }
    case 'charge.refunded': {
      const nase = await nasePlacilo(o)
      if (!nase) return 'ignored'
      return await rpc('preverjen_vracilo', {
        p_payment_intent: nase.pi,
        p_subscription: nase.sub,
        p_vrnjeno: o.amount_refunded ?? 0,
        p_znesek: o.amount ?? 0,
        p_spor: false,
      })
    }
    case 'charge.dispute.created':
    case 'charge.dispute.closed': {
      if (tip === 'charge.dispute.closed' && o.status !== 'won') return 'lost or other'
      const nase = await nasePlacilo(await beri(`charges/${id(o.charge)}`))
      if (!nase) return 'ignored'
      if (tip === 'charge.dispute.closed')
        return await rpc('preverjen_spor_dobljen', { p_payment_intent: nase.pi, p_subscription: nase.sub })
      return await rpc('preverjen_vracilo', {
        p_payment_intent: nase.pi,
        p_subscription: nase.sub,
        p_vrnjeno: 0,
        p_znesek: 0,
        p_spor: true,
      })
    }
    default:
      return 'ignored'
  }
}

/** Obnova; naša naročnina brez veljavne pravice se prekliče (varovalo). */
async function podaljsaj(sub: string, konec: number): Promise<string> {
  const izid = await rpc('preverjen_podaljsaj', { p_subscription: sub, p_velja_do: iso(konec + MILOST_S) })
  if (izid === 'brez_pravice') {
    await prekliciNarocnino(sub)
    await discord('⚠️ Naročnina brez veljavne pravice je preklicana (preveri vračilo zadnjega plačila v Stripe).')
  }
  return izid
}

// --- SLFF Scout (metadata app=slff-scout) -----------------------------------

async function scoutSeja(o: Obj): Promise<string> {
  const m = o.metadata ?? {}
  if (!['paid', 'no_payment_required'].includes(o.payment_status)) return 'unpaid'
  const sub = id(o.subscription)
  if (!sub) return 'brez naročnine'
  const postavke = await beri(`checkout/sessions/${o.id}/line_items?limit=10`)
  if (!scoutPostavkeVeljajo(postavke.data ?? [], m.obdobje)) {
    await discord(`⚠️ Scout seja ${o.id}: postavke se ne ujemajo, naročnine ni (preveri in vrni denar).`)
    await prekliciNarocnino(sub)
    return 'neveljavne postavke'
  }
  // Brez kluba RPC pade vsakič: ponovitve ne pomagajo, naročnina se prekliče.
  const klub = Number(m.team_id)
  if (!m.team_id || !Number.isFinite(klub)) {
    await discord(`⚠️ Scout seja ${o.id}: brez kluba v metapodatkih, naročnina preklicana (vrni denar v Stripe).`)
    await prekliciNarocnino(sub)
    return 'neveljavno'
  }
  const konec = konecObdobja(await beri(`subscriptions/${sub}`))
  // Brez konca obdobja bi naročnina veljala za vedno: raje napaka in ponovitev.
  if (!konec) throw new Error('naročnina brez konca obdobja')
  const izid = await rpc('scout_iz_placila', {
    p_team_id: klub,
    p_user_id: m.user_id,
    p_obdobje: m.obdobje,
    p_velja_do: iso(konec + MILOST_S),
    p_customer: id(o.customer),
    p_subscription: sub,
  })
  if (izid.startsWith('aktivna:')) {
    // Nova naročnina zamenja staro (potekla, morda še past_due): stara ne sme teči naprej.
    await prekliciNarocnino(izid.slice('aktivna:'.length))
    return 'aktivna'
  }
  if (izid !== 'aktivna') {
    await discord(`⚠️ Scout seja ${o.id}: ${izid}, naročnina preklicana (vrni denar v Stripe).`)
    await prekliciNarocnino(sub)
  }
  return izid
}

/** Obnova; `sub` je objekt naročnine (s postavkami), ne le id. */
async function scoutPodaljsaj(sub: Obj, konec: number): Promise<string> {
  if (!scoutCeneNarocnine(sub)) {
    await prekliciNarocnino(sub.id)
    await discord(`⚠️ Scout: naročnina ${sub.id} ima tujo ceno, preklicana (preveri vračilo v Stripe).`)
    return 'tuja cena'
  }
  const izid = await rpc('scout_podaljsaj', { p_subscription: sub.id, p_velja_do: iso(konec + MILOST_S) })
  if (izid === 'zaprt') {
    await prekliciNarocnino(sub.id)
    await discord('⚠️ Scout: obnova zaprtega kluba, naročnina preklicana (preveri vračilo v Stripe).')
  }
  return izid
}

async function scoutNarocnina(tip: string, o: Obj): Promise<string> {
  if (tip === 'customer.subscription.deleted' || ['canceled', 'incomplete_expired'].includes(o.status))
    return await rpc('scout_narocnina_konec', {
      p_subscription: o.id,
      p_konec: iso(o.ended_at ?? o.canceled_at) ?? new Date().toISOString(),
    })
  // past_due in unpaid: dostop velja do roka, nato poteče sam.
  const konec = konecObdobja(o)
  if (!konec || !['active', 'trialing'].includes(o.status)) return 'unchanged'
  return await scoutPodaljsaj(o, konec)
}

// --- SLFF Trgovina (metadata app=slff-shop) ---------------------------------

const evri = (c: number) => (c / 100).toFixed(2).replace('.', ',')

async function trgovinaSeja(o: Obj): Promise<string> {
  if (o.payment_status !== 'paid') return 'unpaid'
  const oznaka = o.metadata?.oznaka ?? o.id
  const { args, tarifa, drzava } = trgovinaIzSeje(o)
  const kljuc = tarifa ? ((await beri(`shipping_rates/${tarifa}`)).metadata?.kljuc ?? tarifa) : null
  const izid = await rpc('trgovina_iz_placila', { ...args, p_dostava_kljuc: kljuc })
  if (izid === 'neznano') {
    await discord(`🛒 Trgovina: plačilo za poteklo naročilo ${oznaka} — preveri zalogo in ročno potrdi ali vrni denar`)
    return izid
  }
  if (izid !== 'placano' && izid !== 'premalo') return izid
  await discord(`🛒 Trgovina: naročilo ${oznaka}, ${evri(args.p_skupaj)} €`)
  if (izid === 'premalo') await discord(`⚠️ Trgovina: naročilo ${oznaka} je plačano, zaloge ni bilo dovolj (manjka > 0 v naročilu; uredi s kupcem).`)
  if (napacnaTarifa(kljuc, drzava)) await discord(`⚠️ Trgovina: naročilo ${oznaka} ima tarifo ${kljuc} za državo ${drzava} (doplačilo ali vračilo).`)
  // Mail ne sme ponoviti dogodka: ponovitev bi dobila 'ze' in maila spet ne bi poslala.
  try {
    const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trgovina-posta`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vrsta: 'potrditev', narocilo_id: Number(o.metadata?.narocilo_id) }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`trgovina-posta ${r.status}`)
  } catch (e) {
    console.error('stripe-webhook: trgovina-posta', String(e))
    await discord(`⚠️ Trgovina: potrditev naročila ${oznaka} ni odšla po pošti.`)
  }
  return izid
}
