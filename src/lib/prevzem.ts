// Prevzem profila igralca ("To sem jaz") in fotografije potrjenih igralcev.
//
// Baza: migracija 20261012091100 (zahtevki_igralca, profil_igralca,
// potrjeni_igralci, fotografije_igralcev). Fotografije so v vedru
// `fotografije-igralcev` (javno branje): "<igralec>/<ime>.webp" je 256 px,
// "<igralec>/<ime>-64.webp" 64 px, "<igralec>/<ime>-768.webp" 768 px za
// slike za deljenje (kartica, zgodba kroga); namesto .webp je lahko .jpg
// (Safari WebP ne zna kodirati). Ime je naključno, zato se slika nikoli ne
// spremeni in jo brskalnik lahko hrani leto dni.
import { useEffect, useState } from 'react'
import { supabase, API_URL } from './supabase'

export const VEDRO_FOTOGRAFIJ = 'fotografije-igralcev'
// Izvirnik s telefona ima 3–8 MB; v shrambo gre le 256 px izrez (nekaj deset kB).
export const NAJVEC_VHOD = 20 * 1024 * 1024

/** Mladinska liga po šifri (isto pravilo kot SQL `je_mladinski_slug`). */
export function jeMladinskiSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return /(^|-)(u19|mladinci)($|-)/.test(slug) || /^sml[0-9]/.test(slug)
}

/** Pot različice fotografije: '' (256 px), '-64' ali '-768'. */
export function razlicicaFotografije(pot: string, pripona: '' | '-64' | '-768'): string {
  return pot.replace(/\.(webp|jpg|png)$/, `${pripona}.$1`)
}

/** Javni naslov fotografije; `majhna` vrne 64-pikselsko različico. */
export function naslovFotografije(pot: string | null | undefined, majhna = false): string | null {
  if (!pot) return null
  const p = majhna ? razlicicaFotografije(pot, '-64') : pot
  return `${API_URL}/storage/v1/object/public/${VEDRO_FOTOGRAFIJ}/${p}`
}

/**
 * Naslova za sliko za deljenje: 768 px, nato 256 px (fotografije, naložene
 * pred 768-pikselsko različico, je nimajo).
 */
export function naslovaVelikeFotografije(pot: string | null | undefined): string[] {
  if (!pot) return []
  const n = (p: string) => `${API_URL}/storage/v1/object/public/${VEDRO_FOTOGRAFIJ}/${p}`
  return [n(razlicicaFotografije(pot, '-768')), n(pot)]
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

/** Kvadratni izrez na sredini, pomanjšan na `stranica` px. */
async function kvadrat(bmp: ImageBitmap, stranica: number, vrsta: 'image/webp' | 'image/jpeg'): Promise<Blob> {
  const s = Math.min(bmp.width, bmp.height)
  const cv = document.createElement('canvas')
  cv.width = stranica
  cv.height = stranica
  const c = cv.getContext('2d')!
  c.imageSmoothingQuality = 'high'
  // JPEG nima prosojnosti: prosojni PNG bi dobil črno ozadje.
  if (vrsta === 'image/jpeg') {
    c.fillStyle = '#fff'
    c.fillRect(0, 0, stranica, stranica)
  }
  c.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, stranica, stranica)
  const blob = await new Promise<Blob | null>((r) => cv.toBlob((b) => r(b), vrsta, 0.85))
  // Safari (tudi vsi brskalniki na iPhonu) WebP ne zna kodirati in vrne PNG.
  if (!blob || blob.type !== vrsta) throw new Error('vrsta-izhoda')
  return blob
}

/**
 * Pripravi fotografijo za nalaganje: izrez na sredino, 256, 64 in 768 px — WebP,
 * kjer ga brskalnik zna kodirati, sicer JPEG (Safari, iPhone).
 * Ponovno kodiranje odstrani tudi metapodatke (EXIF, lokacija).
 */
export async function pripraviFotografijo(
  datoteka: File,
): Promise<{ velika: Blob; majhna: Blob; polna: Blob; koncnica: 'webp' | 'jpg'; vrsta: 'image/webp' | 'image/jpeg' }> {
  if (datoteka.size > NAJVEC_VHOD) throw new Error('prevelika')
  if (!/^image\/(jpeg|png|webp)$/.test(datoteka.type)) throw new Error('vrsta')
  // createImageBitmap upošteva zasuk iz EXIF (kot na kartici igralca).
  const bmp = await createImageBitmap(datoteka)
  try {
    // Majhne fotografije ne povečujemo: 768 px je največ, kolikor jo je.
    const polna = Math.min(768, Math.max(256, Math.min(bmp.width, bmp.height)))
    const vse = async (vrsta: 'image/webp' | 'image/jpeg') => ({
      velika: await kvadrat(bmp, 256, vrsta),
      majhna: await kvadrat(bmp, 64, vrsta),
      polna: await kvadrat(bmp, polna, vrsta),
    })
    try {
      return { ...(await vse('image/webp')), koncnica: 'webp', vrsta: 'image/webp' }
    } catch {
      return { ...(await vse('image/jpeg')), koncnica: 'jpg', vrsta: 'image/jpeg' }
    }
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
