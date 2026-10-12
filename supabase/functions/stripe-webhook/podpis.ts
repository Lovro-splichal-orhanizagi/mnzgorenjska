// Preverba glave Stripe-Signature (t=…,v1=…): HMAC-SHA256 nad `${t}.${telo}`
// s skrivnostjo webhooka (whsec_…), hex, primerjava v stalnem času, največ
// 5 minut stara. Brez odvisnosti od Deno, da jo preveri tudi smoke (Node).

const enc = new TextEncoder()

export async function hmacHex(skrivnost: string, sporocilo: string): Promise<string> {
  const kljuc = await crypto.subtle.importKey('raw', enc.encode(skrivnost), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', kljuc, enc.encode(sporocilo)))
  return Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')
}

function enaka(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export async function veljavenPodpis(glava: string | null, telo: string, skrivnost: string, zdaj = Date.now() / 1000): Promise<boolean> {
  if (!glava) return false
  const deli = glava.split(',').map((d) => d.trim().split('='))
  const ts = deli.find(([k]) => k === 't')?.[1] ?? ''
  const t = /^\d+$/.test(ts) ? Number(ts) : NaN
  const podpisi = deli.filter(([k]) => k === 'v1').map(([, v]) => v ?? '')
  if (!Number.isFinite(t) || !podpisi.length || Math.abs(zdaj - t) > 300) return false
  const pricakovan = await hmacHex(skrivnost, `${ts}.${telo}`)
  return podpisi.some((p) => enaka(p, pricakovan))
}
