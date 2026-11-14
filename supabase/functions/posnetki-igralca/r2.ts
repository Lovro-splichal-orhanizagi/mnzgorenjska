// Cloudflare R2 (S3 API): podpisani naslovi AWS SigV4 (query string) z
// WebCrypto, brez knjižnic. Brez odvisnosti od Deno, da jih preveri smoke
// (Node) — tudi z uradnim primerom AWS.

const enc = new TextEncoder()

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)))
async function hmac(kljuc: ArrayBuffer, s: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', kljuc, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return await crypto.subtle.sign('HMAC', k, enc.encode(s))
}

/** RFC 3986 (AWS): vse razen A-Z a-z 0-9 - _ . ~ je kodirano. */
export const kodiraj = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

export interface Podpis {
  dostopniKljuc: string
  skrivniKljuc: string
  regija: string
  gostitelj: string
  /** Privzeto https (http le za lokalni preizkus s S3 posnemovalnikom). */
  shema?: 'https' | 'http'
  /** Pot z vodilno poševnico, nekodirana (npr. "/vedro/posnetki/abc"). */
  pot: string
  metoda: 'GET' | 'PUT' | 'HEAD' | 'DELETE'
  /** Veljavnost v sekundah (1–604800). */
  traja: number
  /** Dodatne podpisane glave (content-type, content-length …); host je vedno. */
  glave?: Record<string, string>
  zdaj?: Date
}

/** Podpisan naslov (X-Amz-* v poizvedbi, UNSIGNED-PAYLOAD). */
export async function podpisanNaslov(p: Podpis): Promise<string> {
  const amzDatum = (p.zdaj ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dan = amzDatum.slice(0, 8)
  const obseg = `${dan}/${p.regija}/s3/aws4_request`
  const glave: Record<string, string> = { host: p.gostitelj }
  for (const [k, v] of Object.entries(p.glave ?? {})) glave[k.toLowerCase()] = String(v).trim()
  const imena = Object.keys(glave).sort()
  const podpisane = imena.join(';')
  const poizvedba: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${p.dostopniKljuc}/${obseg}`,
    'X-Amz-Date': amzDatum,
    'X-Amz-Expires': String(p.traja),
    'X-Amz-SignedHeaders': podpisane,
  }
  const kanonicnaPoizvedba = Object.keys(poizvedba)
    .sort()
    .map((k) => `${kodiraj(k)}=${kodiraj(poizvedba[k])}`)
    .join('&')
  const pot = p.pot.split('/').map(kodiraj).join('/')
  const zahteva = [
    p.metoda,
    pot,
    kanonicnaPoizvedba,
    imena.map((k) => `${k}:${glave[k]}\n`).join(''),
    podpisane,
    'UNSIGNED-PAYLOAD',
  ].join('\n')
  const zaPodpis = ['AWS4-HMAC-SHA256', amzDatum, obseg, await sha256(zahteva)].join('\n')
  let kljuc = await hmac(enc.encode(`AWS4${p.skrivniKljuc}`).buffer as ArrayBuffer, dan)
  kljuc = await hmac(kljuc, p.regija)
  kljuc = await hmac(kljuc, 's3')
  kljuc = await hmac(kljuc, 'aws4_request')
  const podpis = hex(await hmac(kljuc, zaPodpis))
  return `${p.shema ?? 'https'}://${p.gostitelj}${pot}?${kanonicnaPoizvedba}&X-Amz-Signature=${podpis}`
}

export interface R2 {
  racun: string
  dostopniKljuc: string
  skrivniKljuc: string
  vedro: string
  /** Neobvezno: druga končna točka S3 (npr. http://127.0.0.1:9000 za lokalni preizkus). */
  koncna?: string
}

export const DOVOLJENE_VRSTE = ['video/mp4', 'video/quicktime', 'video/webm'] as const
export const NAJVEC_VIDEO = 100 * 1024 * 1024
export const NAJVEC_SLIKA = 1024 * 1024
export const VRSTE_SLIKE = ['image/jpeg', 'image/webp'] as const

/** Ključa predmetov v vedru za posnetek (uid "r2-…"). */
export const kljucVidea = (uid: string) => `posnetki/${uid}`
export const kljucSlike = (uid: string) => `posnetki/${uid}-slika`

/** Podpisan naslov za predmet v R2 (pot v slogu poti, regija "auto"). */
export function r2Naslov(r2: R2, kljuc: string, metoda: Podpis['metoda'], traja: number, glave?: Record<string, string>) {
  return podpisanNaslov({
    dostopniKljuc: r2.dostopniKljuc,
    skrivniKljuc: r2.skrivniKljuc,
    regija: 'auto',
    gostitelj: r2.koncna ? new URL(r2.koncna).host : `${r2.racun}.r2.cloudflarestorage.com`,
    shema: r2.koncna?.startsWith('http://') ? 'http' : 'https',
    pot: `/${r2.vedro}/${kljuc}`,
    metoda,
    traja,
    glave,
  })
}
