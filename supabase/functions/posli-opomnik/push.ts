// Potisna obvestila prek FCM HTTP v1 (iOS in Android, glej PotisnaObvestila.tsx).
//
// Skrivnost FIREBASE_SERVICE_ACCOUNT je celoten JSON servisnega računa iz
// Firebase (Project settings → Service accounts → Generate new private key).
// Brez nje funkcija pošilja le e-pošto, kot doslej.

interface ServisniRacun {
  project_id: string
  client_email: string
  private_key: string
}

export interface Obvestilo {
  naslov: string
  besedilo: string
  /** Pot ali celoten naslov slff.eu, ki ga odpre dotik obvestila. */
  url: string
}

let racun: ServisniRacun | null | undefined
let dostop: { zeton: string; velja: number } | null = null

function servisniRacun(): ServisniRacun | null {
  if (racun !== undefined) return racun
  const surovo = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  racun = surovo ? (JSON.parse(surovo) as ServisniRacun) : null
  return racun
}

/** Ali je Firebase sploh nastavljen (brez skrivnosti push ne gre nikamor). */
export const pushNastavljen = (): boolean => servisniRacun() != null

const b64url = (b: ArrayBuffer | Uint8Array | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b)))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

/** OAuth žeton Googla iz podpisanega JWT; velja uro, hranimo ga med klici. */
async function dostopniZeton(sa: ServisniRacun): Promise<string> {
  const zdaj = Math.floor(Date.now() / 1000)
  if (dostop && dostop.velja > zdaj + 60) return dostop.zeton
  const glava = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const telo = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: zdaj,
    exp: zdaj + 3600,
  }))
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const kljuc = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const podpis = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kljuc, new TextEncoder().encode(`${glava}.${telo}`))
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${glava}.${telo}.${b64url(podpis)}`,
    }),
  })
  const odg = await r.json()
  if (!r.ok) throw new Error(`Google OAuth: ${odg.error_description ?? r.status}`)
  dostop = { zeton: odg.access_token, velja: zdaj + (odg.expires_in ?? 3600) }
  return dostop.zeton
}

/**
 * Pošlje obvestilo na vse naprave uporabnika. Vrne število dostavljenih;
 * mrtve žetone (aplikacija odstranjena, odjava) sproti pobriše.
 */
export async function posljiPush(
  // deno-lint-ignore no-explicit-any
  db: any,
  userId: string,
  o: Obvestilo,
): Promise<number> {
  let dostavljeno = 0
  // Push nikoli ne sme podreti pošiljanja pošte (pokvarjena skrivnost, omrežje):
  // napaka bi preskočila zapis v email_log in mail bi šel naslednjič še enkrat.
  try {
    const sa = servisniRacun()
    if (!sa) return 0
    const { data: naprave } = await db.from('push_tokens').select('token').eq('user_id', userId)
    if (!naprave?.length) return 0
    const zeton = await dostopniZeton(sa)
    for (const { token } of naprave as { token: string }[]) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${zeton}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: o.naslov, body: o.besedilo },
            data: { url: o.url },
          },
        }),
      })
      if (r.ok) dostavljeno++
      // 404 UNREGISTERED / 400 INVALID_ARGUMENT za žeton: naprave ni več.
      else if (r.status === 404 || (r.status === 400 && (await r.text()).includes('registration token')))
        await db.from('push_tokens').delete().eq('token', token)
    }
  } catch (e) {
    console.error('push', e)
  }
  return dostavljeno
}
