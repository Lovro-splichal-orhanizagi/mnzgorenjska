// Cloudflare Stream: podpis webhooka in podpisani žetoni za ogled. Brez
// odvisnosti od Deno, da ju preveri tudi smoke (Node).

const enc = new TextEncoder()

async function hmacHex(skrivnost: string, sporocilo: string): Promise<string> {
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

/**
 * Glava `Webhook-Signature: time=<unix>,sig1=<hex>`: HMAC-SHA256 nad
 * `${time}.${telo}` s skrivnostjo webhooka (iz PUT /stream/webhook), največ
 * 5 minut stara, primerjava v stalnem času.
 */
export async function veljavenPodpisStream(
  glava: string | null,
  telo: string,
  skrivnost: string,
  zdaj = Date.now() / 1000,
): Promise<boolean> {
  if (!glava || !skrivnost) return false
  const deli = glava.split(',').map((d) => d.trim().split('='))
  const ts = deli.find(([k]) => k === 'time')?.[1] ?? ''
  const podpis = deli.find(([k]) => k === 'sig1')?.[1] ?? ''
  const t = /^\d+$/.test(ts) ? Number(ts) : NaN
  if (!Number.isFinite(t) || !podpis || Math.abs(zdaj - t) > 300) return false
  return enaka(podpis, await hmacHex(skrivnost, `${ts}.${telo}`))
}

const b64url = (b: Uint8Array) => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlJson = (o: unknown) => b64url(enc.encode(JSON.stringify(o)))

/**
 * Podpisan žeton za ogled (RS256 s ključem iz POST /stream/keys; `jwk` je
 * JSON ključa, ki ga Cloudflare vrne v base64). Žeton zamenja uid v naslovu
 * (`https://<domena>/<žeton>/iframe`); velja `trajanje` sekund.
 */
export async function podpisiZeton(
  uid: string,
  kid: string,
  jwk: JsonWebKey,
  trajanje: number,
  zdaj = Math.floor(Date.now() / 1000),
): Promise<string> {
  const kljuc = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const glava = b64urlJson({ alg: 'RS256', kid })
  const telo = b64urlJson({ sub: uid, kid, exp: zdaj + trajanje, nbf: zdaj - 60 })
  const podpis = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kljuc, enc.encode(`${glava}.${telo}`)))
  return `${glava}.${telo}.${b64url(podpis)}`
}

/** Stanje videa Streama → stanje posnetka v bazi. */
export function stanjeIzStreama(v: { readyToStream?: boolean; status?: { state?: string } } | null | undefined) {
  if (!v) return null
  if (v.readyToStream || v.status?.state === 'ready') return 'pripravljen'
  if (v.status?.state === 'error') return 'napaka'
  return 'obdelava'
}

/** Naslova za predvajalnik (iframe) in sličico z žetonom. */
export function naslovi(domena: string, zeton: string) {
  const slika = `https://${domena}/${zeton}/thumbnails/thumbnail.jpg?time=1s&height=540`
  const predvajaj =
    `https://${domena}/${zeton}/iframe?poster=${encodeURIComponent(slika)}` +
    '&primaryColor=%2322c55e&letterboxColor=transparent&preload=metadata'
  return { predvajaj, slika }
}
