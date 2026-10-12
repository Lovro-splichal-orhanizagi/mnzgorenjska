// Edge Function: bmc-pivo
//
// Buy Me a Coffee pokliče to funkcijo ob vsakem "pivu" (webhook, dogodka
// donation.created in donation.refunded) — mi pošljemo sporočilo na Discord.
// Klike na gumb šteje lijak_dnevno; tu so le dejanski nakupi.
//
// Klic ni prijavljen (BMC ne pozna naših ključev), zato je edino varovalo
// podpis: HMAC-SHA256 surovega telesa s skrivnostjo webhooka, hex, v glavi
// x-signature-sha256 (help.buymeacoffee.com, OpenAPI bmc-webhooks-openapi.json).
// Brez veljavnega podpisa ne pošljemo ničesar.
//
// Skrivnosti iz env: BMC_WEBHOOK_SECRET, DISCORD_WEBHOOK, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. E-naslova podpornika na Discord ne pošiljamo;
// sporočilo podpornika le, če ga ni skril.
//
// Pivski zid (/beers): vsak nakup se zapiše v `piva` (servisni ključ) —
// ime, število piv, sporočilo (če ni skrito), test (live_mode = false).
// Zneska, valute in e-naslova NE zapišemo. Zapis je po `zunanji_id` (BMC
// data.id) idempoten: ponovljen donation.created ne naredi nič, vračilo
// postavi `vracilo`. Če zapis v bazo ne uspe, Discord vseeno dobi sporočilo,
// odgovor pa je 500, da BMC dogodek ponovi (ponovitev je varna, Discord pa
// lahko ob tem sporočilo dobi dvakrat).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { ocistiSporocilo } from './sporocilo.ts'

interface Dogodek {
  type?: string
  live_mode?: boolean
  data?: {
    id?: number | string
    supporter_name?: string
    coffee_count?: number
    amount?: number
    currency?: string
    support_note?: string
    note_hidden?: string
  }
}

const enc = new TextEncoder()

async function podpis(skrivnost: string, telo: string): Promise<string> {
  const kljuc = await crypto.subtle.importKey('raw', enc.encode(skrivnost), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', kljuc, enc.encode(telo)))
  return Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Primerjava v stalnem času, da podpisa ni mogoče uganiti po trajanju. */
function enaka(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

function besedilo(d: Dogodek): string | null {
  const p = d.data ?? {}
  const kdo = p.supporter_name?.trim() || 'Nekdo'
  const piv = p.coffee_count ?? 1
  const znesek = p.amount != null ? ` (${p.amount} ${p.currency ?? ''})`.trimEnd() : ''
  const test = d.live_mode === false ? '[TEST] ' : ''
  if (d.type === 'donation.created') {
    const cisto = p.note_hidden !== 'true' ? ocistiSporocilo(p.support_note) : null
    const opomba = cisto ? `\n> ${cisto.replace(/\n/g, '\n> ')}` : ''
    return `${test}🍺 **${kdo}** nam je častil ${piv}× pivo${znesek}${opomba}`
  }
  if (d.type === 'donation.refunded') return `${test}↩️ Vračilo: ${kdo}, ${piv}× pivo${znesek}`
  return null
}

/** Zapis v pivski zid. Vrne napako ali null. Brez zneska in e-naslova. */
async function zapisi(d: Dogodek): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const kljuc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !kljuc) return 'baza ni nastavljena'
  const p = d.data ?? {}
  if (p.id == null || String(p.id).trim() === '') return 'dogodek brez data.id'
  const baza = createClient(url, kljuc, { auth: { persistSession: false } })
  const vrstica = {
    zunanji_id: String(p.id),
    ime: p.supporter_name?.trim() || null,
    piv: Math.max(1, Math.floor(Number(p.coffee_count) || 1)),
    // Skrito sporočilo ne gre v bazo; čisti ga še sprožilec v bazi.
    sporocilo: p.note_hidden === 'true' ? null : (p.support_note ?? null),
    test: d.live_mode === false,
    vir: 'bmc',
  }
  const { error } = d.type === 'donation.refunded'
    // Vračilo nakupa, ki ga še nimamo (pred pivskim zidom), se vpiše že vrnjeno.
    ? await baza.from('piva').upsert({ ...vrstica, vracilo: true }, { onConflict: 'zunanji_id' })
    // Ponovljen webhook ne spremeni ničesar (tudi skritega sporočila ne).
    : await baza.from('piva').upsert(vrstica, { onConflict: 'zunanji_id', ignoreDuplicates: true })
  return error ? error.message : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const skrivnost = Deno.env.get('BMC_WEBHOOK_SECRET')
  const discord = Deno.env.get('DISCORD_WEBHOOK')
  if (!skrivnost || !discord) return new Response('not configured', { status: 500 })

  const telo = await req.text()
  const prejet = (req.headers.get('x-signature-sha256') ?? '').toLowerCase()
  if (!enaka(prejet, await podpis(skrivnost, telo))) return new Response('bad signature', { status: 401 })

  let dogodek: Dogodek
  try {
    dogodek = JSON.parse(telo)
  } catch {
    return new Response('bad json', { status: 400 })
  }
  const vsebina = besedilo(dogodek)
  // Drugi dogodki (članstva ipd.) so izklopljeni; potrdimo prejem, da BMC ne ponavlja.
  if (!vsebina) {
    console.log(`bmc-pivo: ignored event type ${JSON.stringify(dogodek.type)}`)
    return new Response('ignored', { status: 200 })
  }

  const napakaBaze = await zapisi(dogodek).catch((e) => String(e))
  if (napakaBaze) console.error(`bmc-pivo: zapis v bazo ni uspel: ${napakaBaze}`)

  const r = await fetch(discord, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: vsebina.slice(0, 1990), allowed_mentions: { parse: [] } }),
  })
  // Če baza ali Discord ne sprejme, vrnemo napako — BMC bo poskusil znova.
  if (napakaBaze) return new Response('db failed', { status: 500 })
  return new Response(r.ok ? 'ok' : 'discord failed', { status: r.ok ? 200 : 502 })
})
