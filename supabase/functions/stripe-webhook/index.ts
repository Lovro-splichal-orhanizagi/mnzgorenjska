// Edge Function: stripe-webhook
//
// Dve vrsti klica:
//
// 1. Stripe (glava `Stripe-Signature`, brez JWT): podpis (podpis.ts) ali
//    400. Dogodek (evt_…) se zapiše v `stripe_dogodki`; obdelan
//    (`obdelano_at`) se ne obdela znova, neobdelan (napaka, 500) ob ponovitvi
//    Stripe da. Servisne funkcije so idempotentne.
// 2. Brez podpisa, servisni ključ ali admin JWT:
//    `{"akcija": "bon_znova", "narocilo_id": <id>}` (admin trgovine, "Pošlji bon
//    znova"): kode bonov naročila prebere iz Stripe (po stripe_promocija, baza
//    čistopisa nima), manjkajoče izda in kupcu znova pošlje mail.
//    Vrsta preklicev: `{"akcija": "preklici"}` s servisnim ključem (delovni
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
// trgovina_potekla (sprosti rezervacijo). Darilni boni (digitalne postavke,
// tudi ob 'ze', da ponovitev dokonča prekinjeno izdajo; le za placano ali
// poslano naročilo, vrnjeno ne dobi kode): za vsako enoto kupon s stalnim id
// (trgovina.ts idKupona; amount_off = cena, enkrat, applies_to = izdelek
// "SLFF Trgovina" v Stripe, rok 1 leto, max_redemptions 1) in ena promocijska
// koda SLFF-XXXX-XXXX. Že zabeležena enota (trgovina_boni_narocila) kodo
// prebere iz Stripe po id; nova najde kupon in njegovo kodo in druge ne
// ustvari. Zapis trgovina_zabelezi_bon (le zgoščena koda in zadnji 4 znaki),
// kode gredo kupcu (trgovina-posta, vrsta bon). Dokler mail ni zabeležen
// (bon_mail_at), dogodek vrne 500 in Stripe ga ponovi (do 3 dni); nato admin
// "Pošlji bon znova".
//
// Promocijske kode: plačana seja trgovine, Scouta ali preverjenih s popustom
// → trgovina_bon_porabljen za vsako kodo (le zapis, napaka ne ustavi dogodka).
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
import { enoteBonov, idKupona, IZDELEK_TRGOVINE, kodeSeje, napacnaTarifa, novaKoda, trgovinaIzSeje, zgostiKodo } from './trgovina.ts'

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const baza = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
const MILOST_S = 3 * 24 * 3600
const CENE = { letna: 'slff_preverjen_letna', dozivljenjska: 'slff_preverjen_dozivljenjska', znacka: 'slff_znacka' }
const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null)
const id = (v: unknown): string | null => (typeof v === 'string' ? v : ((v as Obj | null)?.id ?? null))

// Boni: različica API je zapisana, ker clover (2025-09) spremeni obliko promocijskih kod.
const RAZLICICA_BONOV = '2025-03-31.basil'

async function stripe(pot: string, metoda = 'GET', polja?: Record<string, string | number>, razlicica?: string): Promise<{ ok: boolean; status: number; j: Obj }> {
  const glave: Record<string, string> = { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` }
  if (razlicica) glave['Stripe-Version'] = razlicica
  if (polja) glave['Content-Type'] = 'application/x-www-form-urlencoded'
  const r = await fetch(`https://api.stripe.com/v1/${pot}`, {
    method: metoda,
    headers: glave,
    body: polja ? new URLSearchParams(Object.entries(polja).map(([k, v]) => [k, String(v)])) : undefined,
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
    const vhod = ((await req.json().catch(() => null)) ?? {}) as { akcija?: string; narocilo_id?: unknown }
    if (vhod.akcija === 'bon_znova') {
      if (!Number.isSafeInteger(vhod.narocilo_id)) return new Response(JSON.stringify({ error: 'narocilo_id' }), { status: 400, headers: glavaJson })
      try {
        const poslano = await bonZnova(vhod.narocilo_id as number)
        return new Response(JSON.stringify({ poslano }), { status: poslano ? 200 : 400, headers: glavaJson })
      } catch (e) {
        console.error('stripe-webhook: bon znova', String(e))
        return new Response(JSON.stringify({ error: 'bon' }), { status: 500, headers: glavaJson })
      }
    }
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
      if (['slff', 'slff-scout', 'slff-shop'].includes(m.app) && ['paid', 'no_payment_required'].includes(o.payment_status)) await oznaciBone(o)
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
      if (await vraciloTrgovine(o)) return 'trgovina'
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
  // no_payment_required: bon ali koda je pokrila ves znesek.
  if (!['paid', 'no_payment_required'].includes(o.payment_status)) return 'unpaid'
  const oznaka = o.metadata?.oznaka ?? o.id
  const { args, tarifa, drzava } = trgovinaIzSeje(o)
  const kljuc = tarifa ? ((await beri(`shipping_rates/${tarifa}`)).metadata?.kljuc ?? tarifa) : null
  const izid = await rpc('trgovina_iz_placila', { ...args, p_dostava_kljuc: kljuc })
  if (izid === 'neznano') {
    await discord(`🛒 Trgovina: plačilo za poteklo naročilo ${oznaka} — preveri zalogo in ročno potrdi ali vrni denar`)
    return izid
  }
  if (izid === 'ze') {
    await boniNarocila(o, oznaka) // ponovitev dokonča prekinjeno izdajo
    return izid
  }
  if (izid !== 'placano' && izid !== 'premalo') return izid
  await discord(`🛒 Trgovina: naročilo ${oznaka}, ${evri(args.p_skupaj)} €`)
  if (izid === 'premalo') await discord(`⚠️ Trgovina: naročilo ${oznaka} je plačano, zaloge ni bilo dovolj (manjka > 0 v naročilu; uredi s kupcem).`)
  if (napacnaTarifa(kljuc, drzava)) await discord(`⚠️ Trgovina: naročilo ${oznaka} ima tarifo ${kljuc} za državo ${drzava} (doplačilo ali vračilo).`)
  // Mail ne sme ponoviti dogodka: ponovitev bi dobila 'ze' in maila spet ne bi poslala.
  await postaTrgovine({ vrsta: 'potrditev', narocilo_id: Number(o.metadata?.narocilo_id) }, oznaka, 'potrditev')
  await boniNarocila(o, oznaka)
  return izid
}

/** Pošlje mail trgovine; napaka gre na Discord. Vrne, ali je mail potrjeno odšel (bone ob false ponovi izdajBone). */
async function postaTrgovine(telo: Obj, oznaka: string, kaj: string): Promise<boolean> {
  try {
    const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trgovina-posta`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(telo),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`trgovina-posta ${r.status}`)
    return true
  } catch (e) {
    console.error('stripe-webhook: trgovina-posta', String(e))
    // Ob časovni omejitvi je mail morda vseeno odšel.
    await discord((e as Error)?.name === 'TimeoutError'
      ? `⚠️ Trgovina: mail (${kaj}) naročila ${oznaka} ni potrjen — preveri email_log.`
      : `⚠️ Trgovina: mail (${kaj}) naročila ${oznaka} ni odšel po pošti.`)
    return false
  }
}

/** Kupon in koda za enoto (najde obstoječa); vrne kodo v čistopisu, id kode in rok. */
async function bonEnote(oznaka: string, narocilo: number, postavka: number, enota: number, znesek: number) {
  const kid = idKupona(oznaka, postavka, enota)
  const meta = { 'metadata[app]': 'slff-shop', 'metadata[narocilo]': String(narocilo), 'metadata[postavka]': String(postavka), 'metadata[enota]': String(enota) }
  let k = await stripe(`coupons/${kid}`, 'GET', undefined, RAZLICICA_BONOV)
  if (!k.ok) {
    const polja: Record<string, string | number> = {
      id: kid, name: 'SLFF darilni bon', amount_off: znesek, currency: 'eur', duration: 'once', max_redemptions: 1,
      redeem_by: Math.floor(Date.now() / 1000) + 365 * 24 * 3600, ...meta,
    }
    polja['applies_to[products][0]'] = IZDELEK_TRGOVINE
    k = await stripe('coupons', 'POST', polja, RAZLICICA_BONOV)
    // Hkratna ponovitev ga je morda ravno ustvarila.
    if (!k.ok) k = await stripe(`coupons/${kid}`, 'GET', undefined, RAZLICICA_BONOV)
    if (!k.ok) throw new Error(`kupon ${kid}: ${k.j?.error?.message ?? k.status}`)
  }
  // Tudi neaktivna: koda, ki jo je Stripe ustvaril, a je baza ni zabeležila, ostane edina.
  const obstojeca = await stripe(`promotion_codes?coupon=${kid}&limit=1`, 'GET', undefined, RAZLICICA_BONOV)
  if (!obstojeca.ok) throw new Error(`kode ${kid}: ${obstojeca.j?.error?.message ?? obstojeca.status}`)
  let pc: Obj | undefined = obstojeca.j.data?.[0]
  if (!pc) {
    const n = await stripe('promotion_codes', 'POST', {
      // Koda poteče minuto pred kuponom (Stripe zavrne kodo, ki živi dlje od kupona).
      coupon: kid, code: novaKoda(), max_redemptions: 1, expires_at: k.j.redeem_by - 60, ...meta,
    }, RAZLICICA_BONOV)
    if (!n.ok) throw new Error(`koda ${kid}: ${n.j?.error?.message ?? n.status}`)
    pc = n.j
  }
  return { koda: String(pc!.code), promocija: String(pc!.id), velja_do: iso(pc!.expires_at ?? k.j.redeem_by)! }
}

/** Darilni boni plačanega naročila; napaka gre na Discord (brez kode) in ponovi dogodek. */
async function boniNarocila(o: Obj, oznaka: string): Promise<void> {
  try {
    await izdajBone(Number(o.metadata?.narocilo_id), oznaka, false)
  } catch (e) {
    await discord(`🛒 Trgovina: bon za ${oznaka} ni izdan ali poslan — Stripe dogodek ponovi, sicer "Pošlji bon znova"`)
    throw e
  }
}

/** Admin "Pošlji bon znova": vse kode naročila znova po pošti. Vrne število kod (0 = ni bonov). */
async function bonZnova(id_: number): Promise<number> {
  const { data, error } = await baza.rpc('trgovina_narocilo_za_posto', { p_id: id_ })
  if (error) throw new Error(`trgovina_narocilo_za_posto: ${error.message}`)
  const oznaka = (data as Obj | null)?.javna_oznaka
  return oznaka ? await izdajBone(id_, oznaka, true) : 0
}

/**
 * Izda manjkajoče bone in kupcu pošlje vse kode, dokler mail ni zabeležen
 * (bon_mail_at; `znova` pošlje tudi po tem). Zabeležena enota kode ne izda
 * znova: prebere jo iz Stripe po stripe_promocija. Mail, ki ni potrjeno odšel,
 * je napaka (dogodek se ponovi). Vrnjeno ali preklicano naročilo kode ne dobi.
 */
async function izdajBone(id_: number, oznaka: string, znova: boolean): Promise<number> {
  const { data, error } = await baza.rpc('trgovina_narocilo_za_posto', { p_id: id_ })
  if (error) throw new Error(`trgovina_narocilo_za_posto: ${error.message}`)
  const narocilo = data as Obj | null
  if (!narocilo || !['placano', 'poslano'].includes(narocilo.stanje)) return 0
  // Mail gre šele po izdaji vseh enot: zabeležen mail pomeni, da je vse izdano.
  if (narocilo.bon_mail_at && !znova) return 0
  const enote = enoteBonov(narocilo.postavke ?? [])
  if (!enote.length) return 0
  const zb = await baza.rpc('trgovina_boni_narocila', { p_narocilo: id_ })
  if (zb.error) throw new Error(`trgovina_boni_narocila: ${zb.error.message}`)
  const izdani = new Map(((zb.data ?? []) as Obj[]).map((b) => [`${b.postavka_id}-${b.zaporedje}`, b]))
  const kode: { koda: string; znesek: number; velja_do: string }[] = []
  for (const [postavka, enota, znesek] of enote) {
    const z = izdani.get(`${postavka}-${enota}`)
    if (z) {
      const pc = await stripe(`promotion_codes/${z.stripe_promocija}`, 'GET', undefined, RAZLICICA_BONOV)
      if (!pc.ok) throw new Error(`koda ${z.stripe_promocija}: ${pc.j?.error?.message ?? pc.status}`)
      kode.push({ koda: String(pc.j.code), znesek: z.znesek, velja_do: z.velja_do })
      continue
    }
    const b = await bonEnote(oznaka, id_, postavka, enota, znesek)
    const zapis = await rpc('trgovina_zabelezi_bon', {
      p_postavka: postavka, p_zaporedje: enota, p_koda_hash: await zgostiKodo(b.koda),
      p_koda_konec: b.koda.slice(-4), p_velja_do: b.velja_do, p_stripe_promocija: b.promocija,
    })
    // Hkratna ponovitev je enoto zabeležila z drugo kodo: naslednja ponovitev pošlje zabeleženo.
    if (zapis === 'ze') throw new Error(`bon ${postavka}-${enota} je zabeležen hkrati`)
    kode.push({ koda: b.koda, znesek, velja_do: b.velja_do })
  }
  if (!(await postaTrgovine({ vrsta: 'bon', narocilo_id: id_, kode }, oznaka, 'darilni bon'))) throw new Error('mail bonov ni odšel')
  await rpc('trgovina_bon_poslan', { p_narocilo: id_ })
  return kode.length
}

/**
 * Vračilo plačila trgovine (metadata app=slff-shop na payment_intent). Celotno:
 * trgovina_vracilo (naročilo vrnjeno, značka preklicana, tisk sproščen) in
 * izklop promocijskih kod bonov naročila. Delno: le Discord (uredi ročno).
 */
async function vraciloTrgovine(placilo: Obj): Promise<boolean> {
  const pi = id(placilo.payment_intent)
  let meta: Obj = placilo.metadata?.app ? placilo.metadata : {}
  if (!meta.app && pi) {
    const r = await stripe(`payment_intents/${pi}`)
    // Brez plačila ne vemo, čigavo je: napaka, Stripe dogodek ponovi.
    if (!r.ok) throw new Error(`payment_intents/${pi}: ${r.j?.error?.message ?? r.status}`)
    meta = r.j?.metadata ?? {}
  }
  if (meta.app !== 'slff-shop') return false
  const vrnjeno = placilo.amount_refunded ?? 0
  if (!(placilo.refunded === true || vrnjeno >= (placilo.amount ?? Infinity))) {
    await discord(`↩️ Trgovina: delno vračilo ${meta.oznaka ?? pi} (${evri(vrnjeno)} €) — uredi značko/tisk in bone ročno.`)
    return true
  }
  const { data, error } = await baza.rpc('trgovina_vracilo', { p_payment_intent: pi ?? '' })
  if (error) throw new Error(`trgovina_vracilo: ${error.message}`)
  const v = data as { oznaka: string; promocije: string[] } | null
  for (const pc of v?.promocije ?? []) {
    const r = await stripe(`promotion_codes/${pc}`, 'POST', { active: 'false' }, RAZLICICA_BONOV)
    if (!r.ok) throw new Error(`izklop kode ${pc}: ${r.j?.error?.message ?? r.status}`)
  }
  await discord(`↩️ Trgovina: vračilo ${v?.oznaka ?? meta.oznaka ?? pi}`)
  return true
}

/** Uporabljene promocijske kode plačane seje označi kot porabljene (le zapis; napaka ne ustavi dogodka). */
async function oznaciBone(o: Obj): Promise<void> {
  if (!((o.total_details?.amount_discount ?? 0) > 0)) return
  try {
    const s = await beri(`checkout/sessions/${o.id}?expand[]=total_details.breakdown`)
    for (const k of kodeSeje(s)) {
      const { error } = await baza.rpc('trgovina_bon_porabljen', { p_promocija: k })
      if (error) console.error('stripe-webhook: bon porabljen', error.message)
    }
  } catch (e) {
    console.error('stripe-webhook: bon porabljen', String(e))
  }
}
