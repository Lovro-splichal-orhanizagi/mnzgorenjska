// Prenosi tekem v živo z YouTuba (SLF-477). Akcije:
//   dodaj   {match_id, povezava}  prijavljen uporabnik s potrjenim naslovom
//   osvezi  {}                    kdorkoli; YouTube vpraša največ enkrat na 2 min
//   dnevno  {}                    le servis (prenosi-osvezi.yml): posnetki
//
// Ključ YouTube Data API je le tu (YOUTUBE_API_KEY, nikoli v brskalniku). Brez
// njega `dodaj` odgovori 'ni_kljuca', osvežitev pa ne naredi nič. Pravila baze
// (okno tekme, mladinske lige, prepovedi, podvojeni videi) so v SQL
// `prenos_dodaj`; tu so le pravila YouTuba (youtube.ts).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { idVidea, osvezitev, preveriVideo, videi } from './youtube.ts'
import { posljiPush } from '../_shared/push.ts'
import { sledi } from '../_shared/napake.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const env = (k: string) => Deno.env.get(k) ?? ''
const URL_BAZE = env('SUPABASE_URL')
const ANON = env('SUPABASE_ANON_KEY')
const SERVIS = env('SUPABASE_SERVICE_ROLE_KEY')
const KLJUC = env('YOUTUBE_API_KEY')
const servis = createClient(URL_BAZE, SERVIS)

const json = (telo: unknown, status = 200) =>
  new Response(JSON.stringify(telo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Osveži dane videe (ali vse žive, če je minilo 2 min) in zapiše v bazo. */
async function osvezi(vrsta: 'zivo' | 'dnevno', kanal?: string): Promise<number> {
  if (!KLJUC) return 0
  const { data, error } = await servis.rpc('prenosi_za_osvezitev', { p_vrsta: vrsta, p_kanal: kanal ?? null })
  if (error) throw error
  const ids = (data ?? []) as string[]
  if (!ids.length) return 0
  const najdeni = await videi(ids, KLJUC)
  const { data: n, error: e2 } = await servis.rpc('prenosi_osvezi', {
    p_podatki: ids.map((id) => osvezitev(id, najdeni.get(id))),
  })
  if (e2) throw e2
  return (n as number) ?? 0
}

/** Obvestilo navijačem obeh klubov, ko gre tekma prvič v živo (stikalo prenosi_push). */
async function obvestiNavijace(matchId: number) {
  const { data: tekma } = await servis
    .from('match_assist_status')
    .select('home_name, away_name')
    .eq('match_id', matchId)
    .maybeSingle()
  if (!tekma) return
  const { data: prejemniki, error } = await servis.rpc('prenos_push_prejemniki', { p_match: matchId })
  if (error) return console.error('prenos push', error.message)
  const o = {
    naslov: `Tekma ${tekma.home_name} – ${tekma.away_name} je v živo`,
    besedilo: 'SLFF',
    url: `/match/${matchId}`,
  }
  for (const uid of (prejemniki ?? []) as string[]) await posljiPush(servis, uid, o)
}

async function dodaj(auth: string, matchId: unknown, povezava: unknown): Promise<Response> {
  const baza = createClient(URL_BAZE, ANON, { global: { headers: { Authorization: auth } } })
  const { data: u } = await baza.auth.getUser()
  if (!u?.user) return json({ ok: false, napaka: 'prijava' }, 401)
  if (!u.user.email_confirmed_at) return json({ ok: false, napaka: 'potrdi_naslov' })
  if (!Number.isSafeInteger(matchId)) return json({ ok: false, napaka: 'ni_tekme' }, 400)
  if ((await baza.rpc('vidi_prenose')).data !== true) return json({ ok: false, napaka: 'izklopljeno' })
  const id = typeof povezava === 'string' ? idVidea(povezava) : null
  if (!id) return json({ ok: false, napaka: 'povezava' })
  if (!KLJUC) return json({ ok: false, napaka: 'ni_kljuca' })

  const v = (await videi([id], KLJUC)).get(id)
  const pregled = preveriVideo(v)
  if (!pregled.ok) return json({ ok: false, napaka: pregled.napaka })
  const p = pregled.prenos
  // Prejšnji prenos istega kanala je morda že končan, a še ni osvežen.
  await osvezi('zivo', p.kanal_id)

  const { data, error } = await servis.rpc('prenos_dodaj', {
    p_user: u.user.id,
    p_match: matchId,
    p_video_id: p.video_id,
    p_kanal_id: p.kanal_id,
    p_kanal_ime: p.kanal_ime,
    p_naslov: p.naslov,
    p_opis: p.opis,
    p_zacetek: p.zacetek,
    p_gledalcev: p.gledalcev,
  })
  if (error) {
    console.error('prenos_dodaj', error.message)
    return json({ ok: false, napaka: 'baza' }, 500)
  }
  const izid = data as { ok: boolean; prvi?: boolean }
  if (izid.ok && izid.prvi) await obvestiNavijace(matchId as number).catch((e) => console.error('prenos push', e))
  return json(izid)
}

sledi('prenosi')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Samo POST.' }, 405)
  const auth = req.headers.get('Authorization') ?? ''
  const vhod = (await req.json().catch(() => ({}))) as { akcija?: string; match_id?: unknown; povezava?: unknown }
  try {
    switch (vhod.akcija) {
      case 'dodaj':
        return await dodaj(auth, vhod.match_id, vhod.povezava)
      case 'osvezi':
        return json({ osvezenih: await osvezi('zivo') })
      case 'dnevno':
        if (!SERVIS || auth !== `Bearer ${SERVIS}`) return json({ error: 'Le servis.' }, 403)
        return json({ zivih: await osvezi('zivo'), posnetkov: await osvezi('dnevno') })
      default:
        return json({ error: 'Neznana akcija.' }, 400)
    }
  } catch (e) {
    console.error('prenosi', e instanceof Error ? e.message : e)
    return json({ ok: false, napaka: 'youtube' }, 502)
  }
})
