// deno test supabase/functions/prenosi/youtube.test.ts
// Pravila YouTuba z lažnim odgovorom videos.list (pravega ključa CI nima).
import { idVidea, osvezitev, preveriVideo, sekunde, videi, type YtVideo } from './youtube.ts'

function enako(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`)
}

const ID = 'dQw4w9WgXcQ'
const zivi = (): YtVideo => ({
  id: ID,
  snippet: { title: 'Bled vs Železniki v živo', description: '', channelId: 'UCabc', channelTitle: 'jurek_sport', liveBroadcastContent: 'live' },
  status: { privacyStatus: 'public', embeddable: true },
  contentDetails: { duration: 'P0D' },
  liveStreamingDetails: { actualStartTime: '2026-11-21T13:52:00Z', concurrentViewers: '124' },
})

Deno.test('id videa iz vseh oblik povezave', () => {
  for (const p of [
    `https://www.youtube.com/watch?v=${ID}&t=3`,
    `https://youtu.be/${ID}?si=x`,
    `https://youtube.com/live/${ID}?feature=share`,
    `m.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    ID,
  ]) enako(idVidea(p), ID)
  enako(idVidea('https://vimeo.com/123'), null)
  enako(idVidea('https://www.youtube.com/@kanal/live'), null)
  enako(idVidea('nekaj'), null)
})

Deno.test('prenos v živo je sprejet', () => {
  const r = preveriVideo(zivi())
  if (!r.ok) throw new Error(r.napaka)
  enako([r.prenos.kanal_id, r.prenos.zacetek, r.prenos.gledalcev], ['UCabc', '2026-11-21T13:52:00Z', 124])
})

Deno.test('zavrnitve', () => {
  const z = (spremeni: (v: YtVideo) => void) => {
    const v = zivi()
    spremeni(v)
    const r = preveriVideo(v)
    return r.ok ? 'ok' : r.napaka
  }
  enako(preveriVideo(undefined), { ok: false, napaka: 'ni_videa' })
  enako(z((v) => { delete v.liveStreamingDetails }), 'ni_prenos')
  enako(z((v) => { v.liveStreamingDetails!.actualEndTime = '2026-11-21T15:50:00Z' }), 'star_posnetek')
  enako(z((v) => { delete v.liveStreamingDetails!.actualStartTime; v.snippet!.liveBroadcastContent = 'upcoming' }), 'se_ni_zacel')
  enako(z((v) => { v.status!.privacyStatus = 'private' }), 'zaseben')
  enako(z((v) => { v.status!.privacyStatus = 'unlisted' }), 'ok')
  enako(z((v) => { v.status!.embeddable = false }), 'ni_vdelave')
  enako(z((v) => { v.contentDetails!.contentRating = { ytRating: 'ytAgeRestricted' } }), 'starostna_omejitev')
  enako(z((v) => { v.contentDetails!.regionRestriction = { blocked: ['SI'] } }), 'regija')
  enako(z((v) => { v.contentDetails!.regionRestriction = { allowed: ['AT'] } }), 'regija')
})

Deno.test('osvežitev: konec, izbris, trajanje', () => {
  const v = zivi()
  enako(osvezitev(ID, v).v_zivo, true)
  v.liveStreamingDetails!.actualEndTime = '2026-11-21T15:44:14Z'
  v.contentDetails!.duration = 'PT1H52M14S'
  enako(osvezitev(ID, v), { video_id: ID, najden: true, v_zivo: false, konec: '2026-11-21T15:44:14Z', gledalcev: 124, trajanje_s: 6734 })
  enako(osvezitev(ID, undefined).najden, false)
  enako(sekunde('PT45S'), 45)
  enako(sekunde('P0D'), null)
})

Deno.test('videos.list: en klic na 50 videov, ključ v naslovu', async () => {
  const klici: string[] = []
  const ids = Array.from({ length: 51 }, (_, i) => `abcdefghi${String(i).padStart(2, '0')}`)
  const r = await videi(ids, 'K', (url) => {
    klici.push(url)
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [{ id: ids[0] }] }) })
  })
  enako(klici.length, 2)
  enako(klici[0].includes('part=snippet,status,contentDetails,liveStreamingDetails') && klici[0].includes('key=K'), true)
  enako([...r.keys()], [ids[0]])
})
