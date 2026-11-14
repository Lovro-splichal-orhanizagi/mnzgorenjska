// Edge Function: posnetki-igralca
//
// Video posnetki izložbe preverjenega igralca v Cloudflare R2 ali Cloudflare
// Stream (nikoli na našem disku). Kaj kdo sme, odloči baza z JWT klicatelja
// (`izlozba_dovoljena`, `posnetki_pripravi`, `posnetki_za_ogled`,
// `scout_posnetki`, `posnetki_izbrisi`); funkcija le govori s ponudnikom.
// Ponudnik je zapisan na posnetku (`ponudnik`): nov posnetek gre k
// ponudniku iz POSNETKI_PONUDNIK, obstoječi ostanejo, kjer so.
//
//   {"akcija": "nalozi", "player_id": 1, "naslov": "…",
//    "vrsta": "video/mp4", "velikost": 1234, "trajanje": 42.1,
//    "vrsta_slike": "image/jpeg", "velikost_slike": 3456}       lastnik →
//      r2:     {"id", "ponudnik": "r2", "video": {url, glave}, "slika": {url, glave}}
//              Podpisana PUT (15 min) s podpisanima Content-Type in
//              Content-Length; video do 100 MB (mp4, mov, webm), sličica do 1 MB.
//      stream: {"id", "ponudnik": "stream", "uploadURL"} (Direct Creator Upload,
//              največ 3 min, requireSignedURLs)
//      test:   {"id", "ponudnik": "test", "test": true}
//   {"akcija": "potrdi", "id": 1}                       lastnik → {"stanje"}
//      R2: HEAD obeh predmetov, vrsta in velikost; posnetek gre v pregled.
//      Stream in test: kot "stanje".
//   {"akcija": "stanje", "id": 1}                       lastnik → {"stanje"}
//   {"akcija": "ogled", "posnetki": [1, 2]}            kdorkoli → {"posnetki": [{id, tip, predvajaj, slika}]}
//      R2: podpisan GET (2 uri) naravnost na R2 (tip "video", Range dela);
//      Stream: podpisan žeton (2 uri, tip "iframe"). Le za posnetke, ki jih
//      klicatelj sme videti.
//   {"akcija": "scout", "player_id": 1}                 sedež SLFF Club → {"posnetki": [...]}
//   {"akcija": "izbrisi", "id": 1}                      lastnik ali admin → {"ok"}
//   {"akcija": "pocisti"}                               servis ali admin → {"izbrisanih", "streamu"}
//   Webhook Streama: glava `Webhook-Signature` (HMAC), zapiše stanje.
//
// Env (strežnik, compose `functions`):
//   POSNETKI_PONUDNIK  r2 | stream | test (privzeto r2, če so R2_*; sicer
//                      stream, če so CF_*; sicer test ob POSNETKI_TEST=1)
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (privzeto slff-posnetki)
//   CF_ACCOUNT_ID, CF_STREAM_TOKEN, CF_STREAM_DOMAIN, CF_STREAM_WEBHOOK_SECRET,
//   CF_STREAM_KEY_ID + CF_STREAM_KEY_JWK, POSNETKI_ORIGINS (le Stream)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Objava: scripts/hetzner/objavi-funkcije.sh posnetki-igralca

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'
import { naslovi, podpisiZeton, stanjeIzStreama, veljavenPodpisStream } from './stream.ts'
import {
  DOVOLJENE_VRSTE,
  NAJVEC_SLIKA,
  NAJVEC_VIDEO,
  VRSTE_SLIKE,
  kljucSlike,
  kljucVidea,
  r2Naslov,
  type R2,
} from './r2.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const TRAJANJE_OGLEDA = 2 * 60 * 60
const TRAJANJE_NALAGANJA = 15 * 60
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
const R2_NAST: R2 = {
  racun: env('R2_ACCOUNT_ID'),
  dostopniKljuc: env('R2_ACCESS_KEY_ID'),
  skrivniKljuc: env('R2_SECRET_ACCESS_KEY'),
  vedro: env('R2_BUCKET') || 'slff-posnetki',
  // Le lokalni preizkus (S3 posnemovalnik); v produkciji prazno.
  koncna: env('R2_ENDPOINT') || undefined,
}
const STREAM = !!(CF.racun && CF.zeton && CF.domena)
const R2_VKLOP = !!(R2_NAST.racun && R2_NAST.dostopniKljuc && R2_NAST.skrivniKljuc)

type Ponudnik = 'r2' | 'stream' | 'test'
/** Ponudnik za NOVE posnetke (null: nalaganje ni na voljo). */
function ponudnikNalaganja(): Ponudnik | null {
  const izbran = env('POSNETKI_PONUDNIK')
  if (izbran === 'r2') return R2_VKLOP ? 'r2' : null
  if (izbran === 'stream') return STREAM ? 'stream' : null
  if (izbran === 'test') return 'test'
  if (R2_VKLOP) return 'r2'
  if (STREAM) return 'stream'
  return env('POSNETKI_TEST') === '1' ? 'test' : null
}
const PONUDNIK = ponudnikNalaganja()
/** Ponudnik uid-ja, ko vrstice ni več (izbris iz vmesnika). */
const ponudnikUid = (uid: string): Ponudnik => (uid.startsWith('r2-') ? 'r2' : uid.startsWith('test-') ? 'test' : 'stream')

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
    return await podpisiZeton(uid, CF.kid, jwk, TRAJANJE_OGLEDA)
  }
  // Brez podpisnega ključa: žeton izda Stream (omejeno število na dan).
  const r = await cf<{ token: string }>(`/${uid}/token`, { telo: { exp: Math.floor(Date.now() / 1000) + TRAJANJE_OGLEDA } })
  return r.ok ? r.result?.token ?? null : null
}

type Vrstica = { id: number; stream_uid: string; urejanje?: boolean; ponudnik?: string; vrsta?: string | null }

/** Naslovi za ogled po ponudniku posnetka. */
async function zNasloviZa<T extends Vrstica>(vrstice: T[]) {
  return await Promise.all(
    vrstice.map(async (v) => {
      const { stream_uid: uid, urejanje: _u, ponudnik, ...ostalo } = v
      if (ponudnik === 'r2' && R2_VKLOP) {
        const [predvajaj, slika] = await Promise.all([
          r2Naslov(R2_NAST, kljucVidea(uid), 'GET', TRAJANJE_OGLEDA),
          r2Naslov(R2_NAST, kljucSlike(uid), 'GET', TRAJANJE_OGLEDA),
        ])
        return { ...ostalo, tip: 'video', predvajaj, slika }
      }
      if (ponudnik === 'stream' && STREAM && !uid.startsWith('test-')) {
        const z = await zetonZa(uid)
        if (z) return { ...ostalo, tip: 'iframe', ...naslovi(CF.domena, z) }
      }
      return { ...ostalo, tip: null, predvajaj: null, slika: null }
    }),
  )
}

/** HEAD predmeta v R2: velikost in vrsta (null, če ga ni). */
async function glavaR2(kljuc: string): Promise<{ velikost: number; vrsta: string } | null> {
  const r = await fetch(await r2Naslov(R2_NAST, kljuc, 'HEAD', 60), { method: 'HEAD' })
  if (!r.ok) return null
  return { velikost: Number(r.headers.get('content-length') ?? 0), vrsta: (r.headers.get('content-type') ?? '').toLowerCase() }
}

async function izbrisiPredmet(uid: string, ponudnik: string): Promise<boolean> {
  if (ponudnik === 'test' || uid.startsWith('test-')) return true
  if (ponudnik === 'r2') {
    if (!R2_VKLOP) return false
    const izidi = await Promise.all(
      [kljucVidea(uid), kljucSlike(uid)].map(async (k) => {
        const r = await fetch(await r2Naslov(R2_NAST, k, 'DELETE', 60), { method: 'DELETE' })
        return r.ok || r.status === 404
      }),
    )
    return izidi.every(Boolean)
  }
  if (!STREAM) return false
  const r = await cf(`/${uid}`, { method: 'DELETE' })
  return r.ok || r.status === 404
}

async function praznjenjeVrste(): Promise<number> {
  const { data, error } = await servis.rpc('posnetki_za_brisanje', { p_najvec: 100 })
  if (error) throw new Error(error.message)
  let n = 0
  for (const v of (data ?? []) as { stream_uid: string; ponudnik: string }[]) {
    const uspeh = await izbrisiPredmet(v.stream_uid, v.ponudnik).catch(() => false)
    await servis.rpc('posnetki_brisanje_izid', { p_uid: v.stream_uid, p_uspeh: uspeh })
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

/** Posnetek, ki ga klicatelj ureja (lastnik ali admin), v vsakem stanju. */
async function urejan(baza: SupabaseClient, id: number): Promise<Vrstica | null> {
  const { data } = await baza.rpc('posnetki_za_ogled', { p_ids: [id] })
  const v = (data ?? [])[0] as Vrstica | undefined
  return v?.urejanje ? v : null
}

/** Stanje iz Streama ali preizkusa (R2 se potrdi z HEAD). */
async function stanjeStreama(uid: string): Promise<string> {
  if (uid.startsWith('test-')) {
    await servis.rpc('posnetki_stream_stanje', { p_uid: uid, p_stanje: 'pripravljen', p_trajanje: 42 })
    return 'pripravljen'
  }
  if (!STREAM) return 'nalaganje'
  const r = await cf<{ readyToStream?: boolean; status?: { state?: string }; duration?: number }>(`/${uid}`)
  const stanje = r.ok ? stanjeIzStreama(r.result) : null
  if (!stanje) return 'nalaganje'
  await servis.rpc('posnetki_stream_stanje', {
    p_uid: uid,
    p_stanje: stanje,
    p_trajanje: r.result?.duration && r.result.duration > 0 ? r.result.duration : null,
  })
  return stanje
}

/** Potrditev nalaganja v R2: HEAD videa in sličice, nato pregled. */
async function potrdiR2(v: Vrstica): Promise<Response> {
  if (!R2_VKLOP) return json({ error: 'Posnetki trenutno niso na voljo.', hint: 'posnetki-izklopljeno' }, 503)
  const [video, slika] = await Promise.all([glavaR2(kljucVidea(v.stream_uid)), glavaR2(kljucSlike(v.stream_uid))])
  if (!video) return json({ error: 'Video ni naložen.', hint: 'posnetki-ni-datoteke' }, 409)
  const vrstaOk = (DOVOLJENE_VRSTE as readonly string[]).includes(video.vrsta) && (!v.vrsta || v.vrsta === video.vrsta)
  if (!vrstaOk || video.velikost < 1 || video.velikost > NAJVEC_VIDEO) {
    await servis.rpc('posnetki_stream_stanje', { p_uid: v.stream_uid, p_stanje: 'napaka' })
    return json({ stanje: 'napaka' })
  }
  const slikaOk = slika && slika.velikost >= 1 && slika.velikost <= NAJVEC_SLIKA &&
    (VRSTE_SLIKE as readonly string[]).includes(slika.vrsta)
  const { error } = await servis.rpc('posnetki_r2_potrjen', {
    p_uid: v.stream_uid,
    p_velikost: video.velikost,
    p_velikost_slike: slikaOk ? slika.velikost : null,
  })
  if (error) return napakaBaze(error)
  return json({ stanje: 'pripravljen' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  if (req.headers.get('Webhook-Signature')) return await webhook(req)

  const auth = req.headers.get('Authorization') ?? ''
  // Brez prijave je klicatelj anon (ogled javnih posnetkov).
  const baza = createClient(URL_BAZE, ANON, { global: { headers: { Authorization: auth || `Bearer ${ANON}` } } })
  const vhod = (await req.json().catch(() => ({}))) as {
    akcija?: string
    player_id?: number
    naslov?: string
    id?: number
    posnetki?: number[]
    vrsta?: string
    velikost?: number
    trajanje?: number
    vrsta_slike?: string
    velikost_slike?: number
  }

  try {
    switch (vhod.akcija) {
      case 'ogled': {
        const ids = (vhod.posnetki ?? []).filter((x) => Number.isSafeInteger(x)).slice(0, 12)
        if (!ids.length) return json({ posnetki: [] })
        const { data, error } = await baza.rpc('posnetki_za_ogled', { p_ids: ids })
        if (error) return napakaBaze(error)
        return json({ posnetki: await zNasloviZa((data ?? []) as Vrstica[]) })
      }

      case 'scout': {
        if (!Number.isSafeInteger(vhod.player_id)) return json({ error: 'player_id' }, 400)
        const { data, error } = await baza.rpc('scout_posnetki', { p_player_id: vhod.player_id })
        if (error) return napakaBaze(error)
        return json({ posnetki: await zNasloviZa((data ?? []) as Vrstica[]) })
      }

      case 'nalozi': {
        if (!PONUDNIK) return json({ error: 'Posnetki trenutno niso na voljo.', hint: 'posnetki-izklopljeno' }, 503)
        if (!auth) return json({ error: 'Za nalaganje se je treba prijaviti.' }, 401)
        if (!Number.isSafeInteger(vhod.player_id)) return json({ error: 'player_id' }, 400)
        const vrsta = String(vhod.vrsta ?? '').toLowerCase()
        const velikost = Number(vhod.velikost)
        const vrstaSlike = String(vhod.vrsta_slike ?? '').toLowerCase()
        const velikostSlike = Number(vhod.velikost_slike)
        if (PONUDNIK === 'r2') {
          if (!(DOVOLJENE_VRSTE as readonly string[]).includes(vrsta)) return json({ error: 'vrsta', hint: 'posnetki-vrsta' }, 400)
          if (!Number.isSafeInteger(velikost) || velikost < 1 || velikost > NAJVEC_VIDEO)
            return json({ error: 'velikost', hint: 'posnetki-velikost' }, 400)
          if (!(VRSTE_SLIKE as readonly string[]).includes(vrstaSlike) || !Number.isSafeInteger(velikostSlike) ||
            velikostSlike < 1 || velikostSlike > NAJVEC_SLIKA) return json({ error: 'slika' }, 400)
        }
        const { data: id, error } = await baza.rpc('posnetki_pripravi', {
          p_player_id: vhod.player_id,
          p_naslov: String(vhod.naslov ?? '').slice(0, 120),
        })
        if (error) return napakaBaze(error)

        if (PONUDNIK === 'test') {
          await servis.rpc('posnetki_nastavi_uid', { p_id: id, p_uid: `test-${crypto.randomUUID().slice(0, 18)}`, p_ponudnik: 'test' })
          return json({ id, ponudnik: 'test', test: true })
        }

        if (PONUDNIK === 'r2') {
          const uid = `r2-${crypto.randomUUID()}`
          const { error: eR } = await servis.rpc('posnetki_r2_rezerviraj', {
            p_id: id,
            p_uid: uid,
            p_vrsta: vrsta,
            p_velikost: velikost,
            p_velikost_slike: velikostSlike,
            p_trajanje: Number.isFinite(vhod.trajanje) ? vhod.trajanje : null,
          })
          if (eR) {
            await baza.rpc('posnetki_izbrisi', { p_id: id })
            return napakaBaze(eR)
          }
          const glaveVidea = { 'Content-Type': vrsta, 'Content-Length': String(velikost) }
          const glaveSlike = { 'Content-Type': vrstaSlike, 'Content-Length': String(velikostSlike) }
          const [video, slika] = await Promise.all([
            r2Naslov(R2_NAST, kljucVidea(uid), 'PUT', TRAJANJE_NALAGANJA, glaveVidea),
            r2Naslov(R2_NAST, kljucSlike(uid), 'PUT', TRAJANJE_NALAGANJA, glaveSlike),
          ])
          // Content-Length nastavi brskalnik sam (mora se ujemati s podpisanim).
          return json({
            id,
            ponudnik: 'r2',
            video: { url: video, glave: { 'Content-Type': vrsta } },
            slika: { url: slika, glave: { 'Content-Type': vrstaSlike } },
          })
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
          // Rezervacija brez uid: izbris ne gre v vrsto brisanja.
          await baza.rpc('posnetki_izbrisi', { p_id: id })
          return json({ error: 'Nalaganja ni bilo mogoče začeti.', hint: 'posnetki-stream' }, 502)
        }
        const { error: e2 } = await servis.rpc('posnetki_nastavi_uid', { p_id: id, p_uid: r.result.uid, p_ponudnik: 'stream' })
        if (e2) return json({ error: 'Nalaganja ni bilo mogoče začeti.', hint: 'posnetki-stream' }, 500)
        return json({ id, ponudnik: 'stream', uploadURL: r.result.uploadURL })
      }

      case 'potrdi':
      case 'stanje': {
        if (!auth || !Number.isSafeInteger(vhod.id)) return json({ error: 'id' }, 400)
        const v = await urejan(baza, vhod.id as number)
        if (!v) return json({ error: 'Posnetka ni.' }, 404)
        if (v.ponudnik === 'r2') return await potrdiR2(v)
        return json({ stanje: await stanjeStreama(v.stream_uid) })
      }

      case 'izbrisi': {
        if (!auth || !Number.isSafeInteger(vhod.id)) return json({ error: 'id' }, 400)
        const { data: uid, error } = await baza.rpc('posnetki_izbrisi', { p_id: vhod.id })
        if (error) return napakaBaze(error)
        if (uid) {
          const uspeh = await izbrisiPredmet(uid as string, ponudnikUid(uid as string)).catch(() => false)
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
        return json({ error: 'akcija: ogled, scout, nalozi, potrdi, stanje, izbrisi ali pocisti.' }, 400)
    }
  } catch (e) {
    console.error('posnetki-igralca', e)
    return json({ error: 'Posnetka ni bilo mogoče obdelati.' }, 500)
  }
})
