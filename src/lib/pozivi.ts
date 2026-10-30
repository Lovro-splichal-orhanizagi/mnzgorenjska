// Pozivi ob dobri volji: katero okno pokaže povod (shranjena ekipa, dober
// krog). Eno okno na 7 dni za vse skupaj (tudi pivo), vrstni red:
//
//   1. aplikacija — splet na telefonu, kjer je aplikacija v trgovini,
//   2. sledi      — Instagram in Facebook (tudi v aplikaciji in mladinski ligi),
//   3. pivo       — kot doslej (PivoOkno), le splet in ne mladinska liga.
//
// Vsak poziv ima svoj premor: zapiranje ga utiša za 60 dni, klik za leto
// (aplikacije ne moremo zaznati, sledenja tudi ne). Vse le na napravi.
import { jeNativno } from './platforma'
import { APP_STORE, GOOGLE_PLAY } from '../components/Trgovine'

export type Poziv = 'aplikacija' | 'sledi' | 'pivo'

const DAN = 24 * 60 * 60 * 1000
const SKUPNI = 'slff-poziv-zadnji'
const RAZMIK_DNI = 7
const kljuc = (p: Exclude<Poziv, 'pivo'>) => `slff-poziv-${p}-do`

function beri(k: string): number {
  try {
    return Number(localStorage.getItem(k) ?? 0)
  } catch {
    // Zasebno okno: raje nikoli kot ob vsakem nalaganju.
    return Infinity
  }
}

function pisi(k: string, v: number) {
  try {
    localStorage.setItem(k, String(v))
  } catch {}
}

/** Trgovina za ta telefon, če je aplikacija tam objavljena; sicer null. */
export function trgovinaTelefona(ua = navigator.userAgent, dotik = navigator.maxTouchPoints): string | null {
  if (/Android/i.test(ua)) return GOOGLE_PLAY
  // iPad se v Safariju predstavi kot Mac, a ima zaslon na dotik.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && dotik > 1)) return APP_STORE
  return null
}

/** Ali je od zadnjega okna (katerega koli) minilo dovolj časa. */
export function prostoZaOkno(zdaj = Date.now()): boolean {
  return zdaj - beri(SKUPNI) >= RAZMIK_DNI * DAN
}

/** Okno se je pokazalo: naslednje šele čez 7 dni. */
export function oznaciOkno(zdaj = Date.now()) {
  pisi(SKUPNI, zdaj)
}

/** Poziv utihne za `dni` dni. */
export function utisajPoziv(p: Exclude<Poziv, 'pivo'>, dni: number) {
  pisi(kljuc(p), Date.now() + dni * DAN)
}

/**
 * Kateri poziv naj se pokaže ob povodu; `pivoMogoce` pove PivoOkno (splet,
 * ne mladinska liga, okno piva ni utišano). Null, če nič.
 */
export function izberiPoziv(pivoMogoce: boolean, zdaj = Date.now()): Poziv | null {
  if (!prostoZaOkno(zdaj)) return null
  if (!jeNativno() && trgovinaTelefona() && beri(kljuc('aplikacija')) < zdaj) return 'aplikacija'
  if (beri(kljuc('sledi')) < zdaj) return 'sledi'
  return pivoMogoce ? 'pivo' : null
}
