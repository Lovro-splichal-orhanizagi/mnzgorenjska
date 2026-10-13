// Klubski računi (migracija 20261013201100). Ali je uporabnik klub, pove le
// baza: ob vsaki prijavi `uveljavi_klubski_racun` preveri potrjen mail proti
// uradnim naslovom klubov in po potrebi ustvari račun.
import { supabase } from './supabase'

export interface StanjeKluba {
  racun: { team_id: number; team_name: string; od: string } | null
  zahtevek: {
    id: number
    vrsta: 'brez_kluba' | 'polno' | 'nov_naslov'
    status: 'odprt' | 'potrjen' | 'zavrnjen'
    razlog: string | null
    team_name: string | null
    created_at: string
  } | null
}

export const VLOGE_KLUBA = ['predsednik', 'tajnik', 'trener', 'vodstvo', 'drugo'] as const
export type VlogaKluba = (typeof VLOGE_KLUBA)[number]

export async function uveljaviKlubskiRacun(): Promise<number | null> {
  const { data, error } = await supabase.rpc('uveljavi_klubski_racun')
  if (error) return null
  return (data as number | null) ?? null
}

export async function mojKlubskiRacun(): Promise<StanjeKluba> {
  const { data } = await supabase.rpc('moj_klubski_racun')
  return (data as unknown as StanjeKluba | null) ?? { racun: null, zahtevek: null }
}

/** Grb za nalaganje: cel (brez izreza) v 256 × 256, prozorno ozadje, WebP ali PNG. */
export async function pripraviGrb(datoteka: File): Promise<{ blob: Blob; koncnica: 'webp' | 'png' }> {
  if (datoteka.size > 20 * 1024 * 1024) throw new Error('prevelika')
  if (!/^image\/(jpeg|png|webp|svg\+xml)$/.test(datoteka.type)) throw new Error('vrsta')
  const bmp = await createImageBitmap(datoteka)
  try {
    const platno = document.createElement('canvas')
    platno.width = platno.height = 256
    const ctx = platno.getContext('2d')
    if (!ctx) throw new Error('kodiranje')
    const s = Math.min(256 / bmp.width, 256 / bmp.height)
    const w = bmp.width * s
    const h = bmp.height * s
    ctx.drawImage(bmp, (256 - w) / 2, (256 - h) / 2, w, h)
    const kot = (vrsta: string) => new Promise<Blob | null>((r) => platno.toBlob(r, vrsta, 0.9))
    const webp = await kot('image/webp')
    if (webp && webp.type === 'image/webp') return { blob: webp, koncnica: 'webp' }
    const png = await kot('image/png')
    if (!png) throw new Error('kodiranje')
    return { blob: png, koncnica: 'png' }
  } finally {
    bmp.close()
  }
}
