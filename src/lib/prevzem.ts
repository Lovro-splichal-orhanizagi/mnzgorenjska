// Prevzem profila igralca ("To sem jaz") in fotografije potrjenih igralcev.
//
// Baza: migracija 20261012091100 (zahtevki_igralca, profil_igralca,
// potrjeni_igralci, fotografije_igralcev). Fotografije so v vedru
// `fotografije-igralcev` (javno branje): "<igralec>/<ime>.webp" je 256 px,
// "<igralec>/<ime>-64.webp" 64 px. Ime je naključno, zato se slika nikoli ne
// spremeni in jo brskalnik lahko hrani leto dni.
import { useEffect, useState } from 'react'
import { supabase, API_URL } from './supabase'

export const VEDRO_FOTOGRAFIJ = 'fotografije-igralcev'
export const NAJVEC_VHOD = 2 * 1024 * 1024

/** Mladinska liga po šifri (isto pravilo kot SQL `je_mladinski_slug`). */
export function jeMladinskiSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return /(^|-)(u19|mladinci)($|-)/.test(slug) || /^sml[0-9]/.test(slug)
}

/** Javni naslov fotografije; `majhna` vrne 64-pikselsko različico. */
export function naslovFotografije(pot: string | null | undefined, majhna = false): string | null {
  if (!pot) return null
  const p = majhna ? pot.replace(/\.(webp|jpg|png)$/, '-64.$1') : pot
  return `${API_URL}/storage/v1/object/public/${VEDRO_FOTOGRAFIJ}/${p}`
}

/**
 * Uporabniško ime omrežja iz vnosa: odreže "@" in naslov profila
 * ("https://instagram.com/ime/" → "ime"). Preveri ga baza.
 */
export function ocistiRocico(vnos: string): string {
  let s = vnos.trim()
  const m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|tiktok\.com|facebook\.com|fb\.com)\/@?([^/?#]+)/i)
  if (m) s = m[1]
  return s.replace(/^@/, '')
}

export const VZOREC_ROCICE = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{2,24}$/,
  facebook: /^[A-Za-z0-9.]{5,50}$/,
} as const

export const NASLOV_OMREZJA = {
  instagram: (r: string) => `https://www.instagram.com/${r}/`,
  tiktok: (r: string) => `https://www.tiktok.com/@${r}`,
  facebook: (r: string) => `https://www.facebook.com/${r}`,
} as const

/** Kvadratni izrez na sredini, pomanjšan na `stranica` px, kot WebP. */
async function kvadrat(bmp: ImageBitmap, stranica: number): Promise<Blob> {
  const s = Math.min(bmp.width, bmp.height)
  const cv = document.createElement('canvas')
  cv.width = stranica
  cv.height = stranica
  const c = cv.getContext('2d')!
  c.imageSmoothingQuality = 'high'
  c.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, stranica, stranica)
  const blob = await new Promise<Blob | null>((r) => cv.toBlob((b) => r(b), 'image/webp', 0.85))
  // Brskalnik brez WebP (stari Safari) vrne PNG; to ni WebP in ga zavrnemo.
  if (!blob || blob.type !== 'image/webp') throw new Error('webp')
  return blob
}

/**
 * Pripravi fotografijo za nalaganje: izrez na sredino, 256 in 64 px WebP.
 * Ponovno kodiranje odstrani tudi metapodatke (EXIF, lokacija).
 */
export async function pripraviFotografijo(datoteka: File): Promise<{ velika: Blob; majhna: Blob }> {
  if (datoteka.size > NAJVEC_VHOD) throw new Error('prevelika')
  if (!/^image\/(jpeg|png|webp)$/.test(datoteka.type)) throw new Error('vrsta')
  // createImageBitmap upošteva zasuk iz EXIF (kot na kartici igralca).
  const bmp = await createImageBitmap(datoteka)
  try {
    return { velika: await kvadrat(bmp, 256), majhna: await kvadrat(bmp, 64) }
  } finally {
    bmp.close()
  }
}

// --- fotografije za sezname: ena poizvedba na seznam, ne na igralca --------

const predpomnilnik = new Map<number, string | null>()
const poslusalci = new Set<() => void>()
let vrsta = new Set<number>()
let casovnik: ReturnType<typeof setTimeout> | null = null

async function preberi() {
  casovnik = null
  const ids = [...vrsta].filter((id) => !predpomnilnik.has(id))
  vrsta = new Set()
  // Krajši kosi: id-ji gredo v naslov zahtevka.
  for (let i = 0; i < ids.length; i += 150) {
    const kos = ids.slice(i, i + 150)
    const { data, error } = await supabase
      .from('fotografije_igralcev')
      .select('player_id, fotografija')
      .in('player_id', kos)
    if (error) continue
    for (const id of kos) predpomnilnik.set(id, null)
    for (const v of data ?? []) if (v.player_id != null) predpomnilnik.set(v.player_id, v.fotografija)
  }
  poslusalci.forEach((f) => f())
}

/** Pozabi fotografijo (po spremembi), da jo seznami preberejo znova. */
export function pozabiFotografijo(id: number) {
  predpomnilnik.delete(id)
}

/**
 * Poti fotografij za igralce na strani. Vse komponente na strani se zberejo
 * v en zahtevek (naslednji tik), že prebrane ostanejo v pomnilniku.
 */
export function useFotografije(ids: Array<number | null | undefined>): Map<number, string | null> {
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

/** Ena fotografija (stran igralca, kartica). */
export function useFotografija(id: number | null | undefined): string | null {
  const m = useFotografije([id])
  return id == null ? null : (m.get(id) ?? null)
}
