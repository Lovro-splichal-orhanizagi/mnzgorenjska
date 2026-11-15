// YouTube Data API v3 za prenose tekem (SLF-477): le videos.list (1 enota na
// klic, do 50 videov). Brez Deno API-jev, da jo preizkus pokliče z lažnim
// fetch (youtube.test.ts).

/** Del odgovora videos.list, ki ga beremo. */
export interface YtVideo {
  id: string
  snippet?: { title?: string; description?: string; channelId?: string; channelTitle?: string; liveBroadcastContent?: string }
  status?: { privacyStatus?: string; embeddable?: boolean; uploadStatus?: string }
  contentDetails?: {
    duration?: string
    contentRating?: { ytRating?: string }
    regionRestriction?: { allowed?: string[]; blocked?: string[] }
  }
  liveStreamingDetails?: {
    actualStartTime?: string
    actualEndTime?: string
    scheduledStartTime?: string
    concurrentViewers?: string
  }
}

export type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

/** Id videa iz povezave (watch, youtu.be, live, shorts, embed, m.) ali golega id. */
export function idVidea(vnos: string): string | null {
  const s = vnos.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  const gostitelj = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (gostitelj === 'youtu.be') id = u.pathname.split('/')[1] ?? null
  else if (gostitelj === 'youtube.com' || gostitelj === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else {
      const m = u.pathname.match(/^\/(live|shorts|embed|v)\/([^/?#]+)/)
      id = m ? m[2] : null
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}

/** ISO 8601 trajanje (PT1H52M14S) v sekunde. */
export function sekunde(trajanje?: string): number | null {
  const m = trajanje?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return null
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0))
  const skupaj = d * 86400 + h * 3600 + min * 60 + s
  return skupaj > 0 ? skupaj : null
}

const DELI = 'snippet,status,contentDetails,liveStreamingDetails'

/** videos.list za do 50 id-jev; vrne slovar id → video (manjkajoči = izbrisan ali zaseben). */
export async function videi(ids: string[], kljuc: string, f: Fetch = fetch): Promise<Map<string, YtVideo>> {
  const izid = new Map<string, YtVideo>()
  for (let i = 0; i < ids.length; i += 50) {
    const kos = ids.slice(i, i + 50)
    const url = `https://www.googleapis.com/youtube/v3/videos?part=${DELI}&id=${kos.join(',')}&key=${encodeURIComponent(kljuc)}`
    const r = await f(url)
    if (!r.ok) throw new Error(`YouTube videos.list ${r.status}`)
    const odg = (await r.json()) as { items?: YtVideo[] }
    for (const v of odg.items ?? []) izid.set(v.id, v)
  }
  return izid
}

export type Zavrnitev =
  | 'ni_videa' // ne obstaja ali je zaseben
  | 'ni_prenos' // navaden video, ne prenos v živo
  | 'se_ni_zacel' // napovedan, še ni v živo
  | 'star_posnetek' // prenos je že končan
  | 'zaseben'
  | 'ni_vdelave' // lastnik je izklopil vdelavo
  | 'starostna_omejitev'
  | 'regija' // ni na voljo v Sloveniji

export interface Prenos {
  video_id: string
  kanal_id: string
  kanal_ime: string
  naslov: string
  opis: string
  zacetek: string
  gledalcev: number | null
}

/** Pravila YouTube strani: v živo zdaj, javen ali neobjavljen, vdelava, brez omejitev. */
export function preveriVideo(v: YtVideo | undefined, drzava = 'SI'): { ok: true; prenos: Prenos } | { ok: false; napaka: Zavrnitev } {
  if (!v) return { ok: false, napaka: 'ni_videa' }
  const zasebnost = v.status?.privacyStatus
  if (zasebnost !== 'public' && zasebnost !== 'unlisted') return { ok: false, napaka: 'zaseben' }
  const zivo = v.liveStreamingDetails
  if (!zivo) return { ok: false, napaka: 'ni_prenos' }
  if (zivo.actualEndTime) return { ok: false, napaka: 'star_posnetek' }
  if (!zivo.actualStartTime || v.snippet?.liveBroadcastContent === 'upcoming') return { ok: false, napaka: 'se_ni_zacel' }
  if (v.status?.embeddable === false) return { ok: false, napaka: 'ni_vdelave' }
  if (v.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') return { ok: false, napaka: 'starostna_omejitev' }
  const omejitev = v.contentDetails?.regionRestriction
  if (omejitev?.blocked?.includes(drzava) || (omejitev?.allowed && !omejitev.allowed.includes(drzava)))
    return { ok: false, napaka: 'regija' }
  if (!v.snippet?.channelId) return { ok: false, napaka: 'ni_videa' }
  const gledalcev = Number(zivo.concurrentViewers)
  return {
    ok: true,
    prenos: {
      video_id: v.id,
      kanal_id: v.snippet.channelId,
      kanal_ime: v.snippet.channelTitle ?? '',
      naslov: v.snippet.title ?? '',
      opis: (v.snippet.description ?? '').slice(0, 2000),
      zacetek: zivo.actualStartTime,
      gledalcev: Number.isFinite(gledalcev) && zivo.concurrentViewers != null ? gledalcev : null,
    },
  }
}

/** Vrstica za `prenosi_osvezi`: najden, še v živo, konec, gledalci, trajanje. */
export function osvezitev(id: string, v: YtVideo | undefined) {
  const zasebnost = v?.status?.privacyStatus
  const najden = !!v && (zasebnost === 'public' || zasebnost === 'unlisted') && v.status?.embeddable !== false
  const zivo = v?.liveStreamingDetails
  const gledalcev = Number(zivo?.concurrentViewers)
  return {
    video_id: id,
    najden,
    v_zivo: najden && !!zivo?.actualStartTime && !zivo?.actualEndTime,
    konec: zivo?.actualEndTime ?? null,
    gledalcev: zivo?.concurrentViewers != null && Number.isFinite(gledalcev) ? gledalcev : null,
    trajanje_s: sekunde(v?.contentDetails?.duration),
  }
}
