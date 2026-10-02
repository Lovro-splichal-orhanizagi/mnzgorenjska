// Država obiskovalca po IP — Vercel jo da v glavi `x-vercel-ip-country`.
//
// Bere jo le nov obiskovalec brez lige (`drzavaPoIp` v src/lib/drzavaUgib.ts),
// da Slovak ne pristane na Gorenjski. Vrne samo dvočrkovno kodo države; nič
// ne beleži in ne hrani, odgovor se ne predpomni.
export const config = { runtime: 'edge' }

export default function handler(req: Request): Response {
  const glava = req.headers.get('x-vercel-ip-country')
  const drzava = glava && /^[A-Z]{2}$/.test(glava) ? glava : null
  return new Response(JSON.stringify({ drzava }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      // Mobilna aplikacija kliče s svojega izvora (capacitor://localhost).
      'access-control-allow-origin': '*',
    },
  })
}
