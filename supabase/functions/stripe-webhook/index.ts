// Edge Function: stripe-webhook
//
// Stripe pokliče to funkcijo ob plačilih značke preverjenega igralca. Klic ni
// prijavljen, edino varovalo je podpis (`Stripe-Signature`, podpis.ts); brez
// veljavnega 400. Vsak dogodek (evt_…) se zapiše v `stripe_dogodki` enkrat —
// ponovljen dobi 200 brez obdelave. Ob napaki obdelave zapis zbrišemo in
// vrnemo 500, da Stripe poskusi znova (servisne funkcije so idempotentne).
//
// Račun Stripe je skupen več znamkam: obdelamo le dogodke z metadata
// app=slff (seja, naročnina, plačilo), druge potrdimo z 200 in pustimo.
//
// Dogodki (nastavi jih lastnik v Stripe → Webhooks):
//   checkout.session.completed, checkout.session.async_payment_succeeded
//     → preverjen_iz_placila (letna: rok = konec obdobja + 3 dni milosti,
//       ker se obnova plača nekaj ur po izteku; doživljenjska: brez roka;
//       po želji naročilo značke z naslovom za pošiljanje)
//   invoice.paid → preverjen_podaljsaj (obnova)
//   customer.subscription.updated → podaljšaj ali konec (canceled/unpaid);
//     cancel_at_period_end pusti pravico do konca obdobja
//   customer.subscription.deleted → preverjen_narocnina_konec (potekel)
//   charge.refunded → preverjen_vracilo (polno: pravica preklicana; delno pri
//     znački: le značka). Plačila naročnine metapodatkov nimajo: vračilo
//     naročnine uredi preklic naročnine (deleted) ali admin.
//   charge.dispute.created → preverjen_vracilo kot spor (tudi po kupcu)
//
// Oblike objektov se med različicami API razlikujejo (basil je premaknil
// obdobje naročnine na postavke, naročnino računa pod `parent`); beremo obe.
//
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…), SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Objava: scripts/hetzner/objavi-funkcije.sh stripe-webhook
// Naslov: https://api.slff.eu/functions/v1/stripe-webhook

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { veljavenPodpis } from './podpis.ts'

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>

const baza = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const MILOST_S = 3 * 24 * 3600
const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null)
const id = (v: unknown) => (typeof v === 'string' ? v : (v as Obj | null)?.id ?? null)

async function stripe(pot: string): Promise<Obj> {
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Stripe ${pot}: ${j?.error?.message ?? r.status}`)
  return j
}

const konecObdobja = (sub: Obj): number | null =>
  sub.current_period_end ?? (Math.max(0, ...(sub.items?.data ?? []).map((i: Obj) => i.current_period_end ?? 0)) || null)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const skrivnost = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!skrivnost || !Deno.env.get('STRIPE_SECRET_KEY')) return new Response('not configured', { status: 500 })

  const telo = await req.text()
  if (!(await veljavenPodpis(req.headers.get('Stripe-Signature'), telo, skrivnost)))
    return new Response('bad signature', { status: 400 })
  let dogodek: Obj
  try {
    dogodek = JSON.parse(telo)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const { error: e1 } = await baza.from('stripe_dogodki').insert({ id: dogodek.id, tip: dogodek.type })
  if (e1?.code === '23505') return new Response('duplicate', { status: 200 })
  if (e1) return new Response(e1.message, { status: 500 })

  try {
    const izid = await obdelaj(dogodek.type, dogodek.data?.object ?? {})
    console.log(`stripe-webhook: ${dogodek.type} ${dogodek.id} → ${izid}`)
    return new Response(izid, { status: 200 })
  } catch (e) {
    console.error(`stripe-webhook: ${dogodek.type} ${dogodek.id}`, e)
    await baza.from('stripe_dogodki').delete().eq('id', dogodek.id)
    return new Response('error', { status: 500 })
  }
})

async function rpc(ime: string, args: Obj): Promise<string> {
  const { data, error } = await baza.rpc(ime, args)
  if (error) throw new Error(`${ime}: ${error.message}`)
  return String(data)
}

async function obdelaj(tip: string, o: Obj): Promise<string> {
  switch (tip) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const m = o.metadata ?? {}
      if (m.app !== 'slff') return 'ignored'
      if (!['paid', 'no_payment_required'].includes(o.payment_status)) return 'unpaid'
      const vir = m.vir
      let veljaDo: string | null = null
      if (vir === 'letna') {
        const konec = konecObdobja(await stripe(`subscriptions/${id(o.subscription)}`))
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
        if (tarifa) postnina = (await stripe(`shipping_rates/${tarifa}`)).metadata?.kljuc ?? tarifa
      }
      return await rpc('preverjen_iz_placila', {
        p_user_id: m.user_id,
        p_player_id: Number(m.player_id),
        p_vir: vir,
        p_velja_do: veljaDo,
        p_customer: id(o.customer),
        p_subscription: id(o.subscription),
        p_checkout: o.id,
        p_payment_intent: id(o.payment_intent),
        p_star_vsaj_18: m.star_vsaj_18 === 'true',
        p_odpoved: m.odpoved_pravici === 'true',
        p_ime_na_znacki: m.ime_na_znacki ?? null,
        p_naslov: naslov,
        p_postnina: postnina,
      })
    }
    case 'invoice.paid': {
      const podrobno = o.parent?.subscription_details ?? o.subscription_details ?? {}
      const narocnina = id(o.subscription) ?? id(podrobno.subscription)
      if (podrobno.metadata?.app !== 'slff' || !narocnina) return 'ignored'
      const konec = Math.max(0, ...(o.lines?.data ?? []).map((l: Obj) => l.period?.end ?? 0))
      if (!konec) return 'no period'
      return await rpc('preverjen_podaljsaj', { p_subscription: narocnina, p_velja_do: iso(konec + MILOST_S) })
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      if (o.metadata?.app !== 'slff') return 'ignored'
      if (tip === 'customer.subscription.deleted' || ['canceled', 'unpaid', 'incomplete_expired'].includes(o.status))
        return await rpc('preverjen_narocnina_konec', {
          p_subscription: o.id,
          p_konec: iso(o.ended_at ?? o.canceled_at) ?? new Date().toISOString(),
        })
      const konec = konecObdobja(o)
      if (!konec || !['active', 'trialing'].includes(o.status)) return 'unchanged'
      return await rpc('preverjen_podaljsaj', { p_subscription: o.id, p_velja_do: iso(konec + MILOST_S) })
    }
    case 'charge.refunded':
      if (o.metadata?.app !== 'slff') return 'ignored'
      return await rpc('preverjen_vracilo', {
        p_payment_intent: id(o.payment_intent),
        p_customer: id(o.customer),
        p_delno: o.refunded !== true,
        p_spor: false,
      })
    case 'charge.dispute.created': {
      const placilo = await stripe(`charges/${id(o.charge)}`)
      const kupec = id(placilo.customer)
      // Plačila naročnine nimajo naših metapodatkov: naš je kupec, ki ga poznamo.
      if (placilo.metadata?.app !== 'slff') {
        const { data } = kupec
          ? await baza.from('preverjeni_racuni').select('id').eq('stripe_customer_id', kupec).limit(1)
          : { data: [] }
        if (!data?.length) return 'ignored'
      }
      return await rpc('preverjen_vracilo', {
        p_payment_intent: id(placilo.payment_intent),
        p_customer: kupec,
        p_delno: false,
        p_spor: true,
      })
    }
    default:
      return 'ignored'
  }
}
