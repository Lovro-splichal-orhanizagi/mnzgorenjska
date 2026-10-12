// Preverjeni igralci: modra kljukica ob imenu in dodatki profila.
//
// Baza: migracija 20261012190100 (preverjeni_racuni, profil_igralca_plus,
// preverjeni_igralci_za, je_preverjen, vidi_preverjene). Ali je igralec
// preverjen, pove le baza; pri izklopljenem stikalu `preverjeni_racuni` vrne
// prazno, zato vmesnik stikala ne pozna in ga ne preverja.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Barva = 'modra' | 'zelena' | 'rdeca' | 'oranzna' | 'vijolicna' | 'rumena' | 'roza' | 'siva'
/** Paleta barv profila (isti ključi kot CHECK v bazi). */
export const BARVE: Record<Barva, string> = {
  modra: '#38bdf8',
  zelena: '#4ade80',
  rdeca: '#f87171',
  oranzna: '#fb923c',
  vijolicna: '#a78bfa',
  rumena: '#facc15',
  roza: '#f472b6',
  siva: '#94a3b8',
}

export type Statistika = 'tocke' | 'goli' | 'asistence' | 'nastopi' | 'minute' | 'ciste_mreze'
/** Ključ izpostavljene statistike → stolpec `player_season_stats`. */
export const STOLPEC_STATISTIKE = {
  tocke: 'points',
  goli: 'goals',
  asistence: 'assists',
  nastopi: 'matches',
  minute: 'minutes',
  ciste_mreze: 'clean_sheets',
} as const satisfies Record<Statistika, string>

export const VZOREC = {
  youtube: /^[A-Za-z0-9._-]{3,30}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
  splet: /^https:\/\/[^\s<>"'\\]+$/,
} as const

export const NASLOV = {
  youtube: (r: string) => `https://www.youtube.com/@${r}`,
  x: (r: string) => `https://x.com/${r}`,
} as const

/** Uporabniško ime iz vnosa ("@ime", "https://x.com/ime", "youtube.com/@ime"). */
export function ocistiRocicoPlus(vnos: string): string {
  let s = vnos.trim()
  const m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|x\.com|twitter\.com)\/@?([^/?#]+)/i)
  if (m) s = m[1]
  return s.replace(/^@/, '')
}

// --- značke za sezname: ena poizvedba na stran, kot useFotografije ---------

export interface Preverjen {
  vzdevek: string | null
}
const predpomnilnik = new Map<number, Preverjen | null>()
const poslusalci = new Set<() => void>()
let vrsta = new Set<number>()
let casovnik: ReturnType<typeof setTimeout> | null = null

async function preberiKos(kos: number[]) {
  // Ena ponovitev; neuspel kos ostane neznan in ga naslednji izris vpraša znova.
  for (let poskus = 0; poskus < 2; poskus++) {
    const { data, error } = await supabase.rpc('preverjeni_igralci_za', { p_ids: kos })
    if (error) continue
    for (const id of kos) predpomnilnik.set(id, null)
    for (const v of data ?? []) predpomnilnik.set(v.player_id, { vzdevek: v.vzdevek })
    return
  }
}

async function preberi() {
  casovnik = null
  const ids = [...vrsta].filter((id) => !predpomnilnik.has(id))
  vrsta = new Set()
  // Baza vzame največ 300 id-jev na klic; kosi gredo hkrati.
  const kosi: number[][] = []
  for (let i = 0; i < ids.length; i += 300) kosi.push(ids.slice(i, i + 300))
  await Promise.all(kosi.map(preberiKos))
  poslusalci.forEach((f) => f())
}

/**
 * Pozabi vse (sprememba pravice, vzdevka ali prijave) in znane id-je vpraša
 * znova, da se kljukice na strani osvežijo.
 */
export function pozabiPreverjene() {
  for (const id of predpomnilnik.keys()) vrsta.add(id)
  predpomnilnik.clear()
  poslusalci.forEach((f) => f())
  if (vrsta.size && !casovnik) casovnik = setTimeout(preberi, 0)
}

// Kaj kdo vidi, je odvisno od prijave (stikalo 1: admin, preizkuševalci).
// Le ob menjavi uporabnika (SIGNED_IN pride tudi ob vrnitvi na zavihek).
let uporabnik: string | null | undefined
supabase.auth.onAuthStateChange((_dogodek, seja) => {
  const nov = seja?.user.id ?? null
  if (uporabnik !== undefined && nov !== uporabnik) pozabiPreverjene()
  uporabnik = nov
})

/**
 * Preverjeni med igralci na strani. Vse komponente na strani se zberejo v en
 * zahtevek (naslednji tik), že prebrani ostanejo v pomnilniku.
 */
export function usePreverjeni(ids: Array<number | null | undefined>): Map<number, Preverjen | null> {
  const [, osvezi] = useState(0)
  const kljuc = ids.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b).join(',')
  useEffect(() => {
    const f = () => osvezi((n) => n + 1)
    poslusalci.add(f)
    const manjka = kljuc ? kljuc.split(',').map(Number).filter((id) => !predpomnilnik.has(id)) : []
    if (manjka.length) {
      manjka.forEach((id) => vrsta.add(id))
      if (!casovnik) casovnik = setTimeout(preberi, 0)
    }
    return () => {
      poslusalci.delete(f)
    }
  }, [kljuc])
  return predpomnilnik
}

export function usePreverjen(id: number | null | undefined): Preverjen | null {
  const m = usePreverjeni([id])
  return id == null ? null : (m.get(id) ?? null)
}

// --- pasica: izrez 3 : 1 ----------------------------------------------------

export const NAJVEC_PASICA = 2 * 1024 * 1024

async function izrez(bmp: ImageBitmap, vrsta: 'image/webp' | 'image/jpeg'): Promise<Blob> {
  const s = 1200
  const v = 400
  const razmerje = s / v
  // Največji pravokotnik 3 : 1 na sredini slike.
  const sirina = Math.min(bmp.width, bmp.height * razmerje)
  const visina = sirina / razmerje
  const cv = document.createElement('canvas')
  cv.width = s
  cv.height = v
  const c = cv.getContext('2d')!
  c.imageSmoothingQuality = 'high'
  if (vrsta === 'image/jpeg') {
    c.fillStyle = '#0f172a'
    c.fillRect(0, 0, s, v)
  }
  c.drawImage(bmp, (bmp.width - sirina) / 2, (bmp.height - visina) / 2, sirina, visina, 0, 0, s, v)
  const blob = await new Promise<Blob | null>((r) => cv.toBlob((b) => r(b), vrsta, 0.82))
  // Safari WebP ne zna kodirati in vrne PNG.
  if (!blob || blob.type !== vrsta) throw new Error('vrsta-izhoda')
  return blob
}

/** Pasica 1200 × 400: WebP, kjer gre, sicer JPEG. Ponovno kodiranje odstrani EXIF. */
export async function pripraviPasico(datoteka: File): Promise<{ slika: Blob; koncnica: 'webp' | 'jpg'; vrsta: 'image/webp' | 'image/jpeg' }> {
  if (datoteka.size > 20 * 1024 * 1024) throw new Error('prevelika')
  if (!/^image\/(jpeg|png|webp)$/.test(datoteka.type)) throw new Error('vrsta')
  const bmp = await createImageBitmap(datoteka)
  try {
    let izid: { slika: Blob; koncnica: 'webp' | 'jpg'; vrsta: 'image/webp' | 'image/jpeg' }
    try {
      izid = { slika: await izrez(bmp, 'image/webp'), koncnica: 'webp', vrsta: 'image/webp' }
    } catch {
      izid = { slika: await izrez(bmp, 'image/jpeg'), koncnica: 'jpg', vrsta: 'image/jpeg' }
    }
    if (izid.slika.size > NAJVEC_PASICA) throw new Error('prevelika')
    return izid
  } finally {
    bmp.close()
  }
}
