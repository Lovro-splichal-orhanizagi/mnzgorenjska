// Edge Function: posnetki-igralca
//
// Video posnetki izložbe preverjenega igralca v Cloudflare Stream (ne na
// našem disku). Kaj kdo sme, odloči baza z JWT klicatelja
// (`izlozba_dovoljena`, `posnetki_pripravi`, `posnetki_za_ogled`,
// `scout_posnetki`, `posnetki_izbrisi`); funkcija le govori s Streamom.
//
//   {"akcija": "nalozi", "player_id": 1, "naslov": "…"}   lastnik → {"id", "uploadURL"}
//      Direct Creator Upload: največ 3 min (maxDurationSeconds), osnovno
//      nalaganje (POST multipart, polje "file") Stream omeji na 200 MB,
//      requireSignedURLs. V preizkusnem načinu {"id", "test": true}.
//   {"akcija": "stanje", "id": 1}                          lastnik → {"stanje"}
//      Vpraša Stream (rezerva za webhook), zapiše stanje in trajanje.
//   {"akcija": "ogled", "posnetki": [1, 2]}               kdorkoli → {"posnetki": [{id, predvajaj, slika}]}
//      Podpisani žetoni (2 uri) le za posnetke, ki jih klicatelj sme videti.
//   {"akcija": "scout", "player_id": 1}                    sedež SLFF Club → {"posnetki": [...]}
//      Prek `scout_posnetki` (scout.dostop: dnevnik in meja, scout.vidni).
//   {"akcija": "izbrisi", "id": 1}                         lastnik ali admin → {"ok"}
//      Vrstica gre takoj, video v Streamu takoj ali iz vrste brisanja.
//   {"akcija": "pocisti"}                                  servis ali admin → {"izbrisanih", "streamu"}
//      `posnetki_pocisti()` in vrsta `posnetki_brisanje` (delovni tok vsako uro).
//   Webhook Streama: glava `Webhook-Signature` (HMAC), zapiše stanje.
//
// Env (strežnik, compose `functions`): CF_ACCOUNT_ID, CF_STREAM_TOKEN (API
// žeton: Stream Edit), CF_STREAM_DOMAIN (customer-<koda>.cloudflarestream.com),
// CF_STREAM_WEBHOOK_SECRET, CF_STREAM_KEY_ID + CF_STREAM_KEY_JWK (podpisni
// ključ, base64 JWK; brez njiju žetone izda API Streama), POSNETKI_ORIGINS
// (neobvezno, npr. "slff.eu,club.slff.eu"), SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. Brez CF_* in z POSNETKI_TEST=1 teče preizkusni
// način brez Cloudflara (lokalno, CI): nalaganje se le odigra, ogled nima
// naslovov. Objava: scripts/hetzner/objavi-funkcije.sh posnetki-igralca

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'
import { naslovi, podpisiZeton, stanjeIzStreama, veljavenPodpisStream } from './stream.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const TRAJANJE_ZETONA = 2 * 60 * 60
const env = (k: string) => Deno.env.get(k) ?? ''
const URL_BAZE = env('SUPABASE_URL')
const ANON = env('SUPABASE_ANON_KEY')
const SERVIS = env('SUPABASE_SERVICE_ROLE_KEY')
const servis = createClient(URL_BAZE, SERVIS)

const CF = {
  racun: env('CF_ACCOUNT_ID'),
  zeton: env('CF_STREAM_TOKEN'),
  domena: env('CF_STREAM_DOMAIN'),
  webhook: env('CF_STREAM_WEBHOOK_SECRET'),
  kid: env('CF_STREAM_KEY_ID'),
  jwk: env('CF_STREAM_KEY_JWK'),
}
const VKLOPLJEN = !!(CF.racun && CF.zeton && CF.domena)
const TEST = !VKLOPLJEN && env('POSNETKI_TEST') === '1'

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

// Napake baze s kodo v hint (vmesnik jih prevede) gredo naprej, ostale ne.
function napakaBaze(e: { message: string; hint?: string | null; code?: string }) {
  const znana = (e.hint ?? '').startsWith('posnetki-') || (e.hint ?? '').startsWith('plus-')
  return json({ error: znana ? e.message : 'Posnetka ni bilo mogoče obdelati.', hint: e.hint ?? null },
    e.code === '42501' ? 403 : 400)
}

type Odgovor<T> = { ok: boolean; status: number; result?: T }
async function cf<T>(pot: string, init?: { method?: string; telo?: unknown }): Promise<Odgovor<T>> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF.racun}/stream${pot}`, {
    method: init?.method ?? (init?.telo ? 'POST' : 'GET'),
    headers: { Authorization: `Bearer ${CF.zeton}`, 'Content-Type': 'application/json' },
    body: init?.telo ? JSON.stringify(init.telo) : undefined,
  })
  const j = await r.json().catch(() => null)
  return { ok: r.ok && j?.success !== false, status: r.status, result: j?.result as T }
}

let jwk: JsonWebKey | null = null
async function zetonZa(uid: string): Promise<string | null> {
  if (CF.kid && CF.jwk) {
    jwk ??= JSON.parse(atob(CF.jwk)) as JsonWebKey
    return await podpisiZeton(uid, CF.kid, jwk, TRAJANJE_ZETONA)
  }
  // Brez podpisnega ključa: žeton izda Stream (omejeno število na dan).
  const r = await cf<{ token: string }>(`/${uid}/token`, { telo: { exp: Math.floor(Date.now() / 1000) + TRAJANJE_ZETONA } })
  return r.ok ? r.result?.token ?? null : null
}

async function zNasloviZa<T extends { id: number; stream_uid: string; urejanje?: boolean }>(vrstice: T[]) {
  return await Promise.all(
    vrstice.map(async (v) => {
      const { stream_uid: uid, urejanje: _u, ...ostalo } = v
      if (TEST || uid.startsWith('test-')) return { ...ostalo, predvajaj: null, slika: null }
      const z = await zetonZa(uid)
      return { ...ostalo, ...(z ? naslovi(CF.domena, z) : { predvajaj: null, slika: null }) }
    }),
  )
}

async function izbrisiVStreamu(uid: string): Promise<boolean> {
  if (uid.startsWith('test-')) return true
  if (!VKLOPLJEN) return false
  const r = await cf(`/${uid}`, { method: 'DELETE' })
  return r.ok || r.status === 404
}

async function praznjenjeVrste(): Promise<number> {
  const { data, error } = await servis.rpc('posnetki_za_brisanje', { p_najvec: 100 })
  if (error) throw new Error(error.message)
  let n = 0
  for (const uid of (data ?? []) as string[]) {
    const uspeh = await izbrisiVStreamu(uid).catch(() => false)
    await servis.rpc('posnetki_brisanje_izid', { p_uid: uid, p_uspeh: uspeh })
    if (uspeh) n++
  }
  return n
}

async function webhook(req: Request): Promise<Response> {
  const telo = await req.text()
  if (!(await veljavenPodpisStream(req.headers.get('Webhook-Signature'), telo, CF.webhook))) {
    return new Response('bad signature', { status: 400, headers: CORS })
  }
  const v = JSON.parse(telo) as { uid?: string; duration?: number; readyToStream?: boolean; status?: { state?: string } }
  const stanje = stanjeIzStreama(v)
  if (v.uid && stanje) {
    const { error } = await servis.rpc('posnetki_stream_stanje', {
      p_uid: v.uid,
      p_stanje: stanje,
      p_trajanje: v.duration && v.duration > 0 ? v.duration : null,
    })
    if (error) return new Response('db', { status: 500, headers: CORS })
  }
  return new Response('ok', { headers: CORS })
}

async function jeServisAliAdmin(auth: string, baza: SupabaseClient): Promise<boolean> {
  if ([SERVIS, env('SUPABASE_SECRET_KEY')].filter(Boolean).some((k) => auth === `Bearer ${k}`)) return true
  return auth !== '' && (await baza.rpc('is_admin')).data === true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  if (req.headers.get('Webhook-Signature')) return await webhook(req)
  if (!VKLOPLJEN && !TEST) return json({ error: 'Posnetki trenutno niso na voljo.', hint: 'posnetki-izklopljeno' }, 503)

  const auth = req.headers.get('Authorization') ?? ''
  // Brez prijave je klicatelj anon (ogled javnih posnetkov).
  const baza = createClient(URL_BAZE, ANON, { global: { headers: { Authorization: auth || `Bearer ${ANON}` } } })
  const vhod = (await req.json().catch(() => ({}))) as {
    akcija?: string
    player_id?: number
    naslov?: string
    id?: number
    posnetki?: number[]
  }

  try {
    switch (vhod.akcija) {
      case 'ogled': {
        const ids = (vhod.posnetki ?? []).filter((x) => Number.isSafeInteger(x)).slice(0, 12)
        if (!ids.length) return json({ posnetki: [] })
        const { data, error } = await baza.rpc('posnetki_za_ogled', { p_ids: ids })
        if (error) return napakaBaze(error)
        return json({ posnetki: await zNasloviZa((data ?? []) as { id: number; stream_uid: string }[]), test: TEST })
      }

      case 'scout': {
        if (!Number.isSafeInteger(vhod.player_id)) return json({ error: 'player_id' }, 400)
        const { data, error } = await baza.rpc('scout_posnetki', { p_player_id: vhod.player_id })
        if (error) return napakaBaze(error)
        return json({ posnetki: await zNasloviZa((data ?? []) as { id: number; stream_uid: string }[]), test: TEST })
      }

      case 'nalozi': {
        if (!auth) return json({ error: 'Za nalaganje se je treba prijaviti.' }, 401)
        if (!Number.isSafeInteger(vhod.player_id)) return json({ error: 'player_id' }, 400)
        const { data: id, error } = await baza.rpc('posnetki_pripravi', {
          p_player_id: vhod.player_id,
          p_naslov: String(vhod.naslov ?? '').slice(0, 120),
        })
        if (error) return napakaBaze(error)
        if (TEST) {
          await servis.rpc('posnetki_nastavi_uid', { p_id: id, p_uid: `test-${crypto.randomUUID().slice(0, 18)}` })
          return json({ id, test: true })
        }
        const izvori = env('POSNETKI_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean)
        const r = await cf<{ uid: string; uploadURL: string }>('/direct_upload', {
          telo: {
            maxDurationSeconds: 180,
            requireSignedURLs: true,
            expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            meta: { name: `slff-${vhod.player_id}-${id}` },
            creator: `slff-${vhod.player_id}`,
            thumbnailTimestampPct: 0.1,
            ...(izvori.length ? { allowedOrigins: izvori } : {}),
          },
        })
        if (!r.ok || !r.result?.uid) {
          // Rezervacija brez uid: izbris ne gre v vrsto Streama.
          await baza.rpc('posnetki_izbrisi', { p_id: id })
          return json({ error: 'Nalaganja ni bilo mogoče začeti.', hint: 'posnetki-stream' }, 502)
        }
        const { error: e2 } = await servis.rpc('posnetki_nastavi_uid', { p_id: id, p_uid: r.result.uid })
        if (e2) return json({ error: 'Nalaganja ni bilo mogoče začeti.', hint: 'posnetki-stream' }, 500)
        return json({ id, uploadURL: r.result.uploadURL })
      }

      case 'stanje': {
        if (!auth || !Number.isSafeInteger(vhod.id)) return json({ error: 'id' }, 400)
        // Lastnik (ali admin) dobi uid svojega posnetka v vsakem stanju.
        const { data, error } = await baza.rpc('posnetki_za_ogled', { p_ids: [vhod.id] })
        if (error) return napakaBaze(error)
        const v = (data ?? [])[0] as { stream_uid?: string; urejanje?: boolean } | undefined
        const uid = v?.urejanje ? v.stream_uid : undefined
        if (!uid) return json({ error: 'Posnetka ni.' }, 404)
        if (TEST || uid.startsWith('test-')) {
          await servis.rpc('posnetki_stream_stanje', { p_uid: uid, p_stanje: 'pripravljen', p_trajanje: 42 })
          return json({ stanje: 'pripravljen' })
        }
        const r = await cf<{ readyToStream?: boolean; status?: { state?: string }; duration?: number }>(`/${uid}`)
        const stanje = r.ok ? stanjeIzStreama(r.result) : null
        if (!stanje) return json({ stanje: 'nalaganje' })
        await servis.rpc('posnetki_stream_stanje', {
          p_uid: uid,
          p_stanje: stanje,
          p_trajanje: r.result?.duration && r.result.duration > 0 ? r.result.duration : null,
        })
        return json({ stanje })
      }

      case 'izbrisi': {
        if (!auth || !Number.isSafeInteger(vhod.id)) return json({ error: 'id' }, 400)
        const { data: uid, error } = await baza.rpc('posnetki_izbrisi', { p_id: vhod.id })
        if (error) return napakaBaze(error)
        if (uid) {
          const uspeh = await izbrisiVStreamu(uid as string).catch(() => false)
          if (uspeh) await servis.rpc('posnetki_brisanje_izid', { p_uid: uid, p_uspeh: true })
        }
        return json({ ok: true })
      }

      case 'pocisti': {
        if (!(await jeServisAliAdmin(auth, baza))) return json({ error: 'Samo servis ali admin.' }, 403)
        const { data: izbrisanih, error } = await servis.rpc('posnetki_pocisti')
        if (error) throw new Error(error.message)
        return json({ izbrisanih, streamu: await praznjenjeVrste() })
      }

      default:
        return json({ error: 'akcija: ogled, scout, nalozi, stanje, izbrisi ali pocisti.' }, 400)
    }
  } catch (e) {
    console.error('posnetki-igralca', e)
    return json({ error: 'Posnetka ni bilo mogoče obdelati.' }, 500)
  }
})
