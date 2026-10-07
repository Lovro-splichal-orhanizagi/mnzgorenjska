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
// Skrivnosti iz env: BMC_WEBHOOK_SECRET, DISCORD_WEBHOOK. E-naslova podpornika
// na Discord ne pošiljamo; sporočilo podpornika le, če ga ni skril.

interface Dogodek {
  type?: string
  live_mode?: boolean
  data?: {
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
    const opomba = p.support_note && p.note_hidden !== 'true' ? `\n> ${p.support_note.slice(0, 500)}` : ''
    return `${test}🍺 **${kdo}** nam je častil ${piv}× pivo${znesek}${opomba}`
  }
  if (d.type === 'donation.refunded') return `${test}↩️ Vračilo: ${kdo}, ${piv}× pivo${znesek}`
  return null
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
  if (!vsebina) return new Response('ignored', { status: 200 })

  const r = await fetch(discord, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: vsebina.slice(0, 1990), allowed_mentions: { parse: [] } }),
  })
  // Če Discord ne sprejme, vrnemo napako — BMC bo poskusil znova.
  return new Response(r.ok ? 'ok' : 'discord failed', { status: r.ok ? 200 : 502 })
})
