// Košarica: čiste funkcije in shramba v localStorage (slff-shop-kosarica).
// Cene in imena niso shranjeni: košarica jih ob prikazu prebere iz
// trgovina_izdelek(slug), plačilo pa jih vzame iz baze. Meje so iste kot v
// trgovina_rezerviraj (20 vrstic, 20 kosov na vrstico); 50 skupaj preveri baza.
import { useSyncExternalStore } from 'react'

export interface Postavka {
  razlicica_id: number
  slug: string
  kolicina: number
}
export interface Kosarica {
  postavke: Postavka[]
  /** Država dostave, ISO2 iz EU27. */
  drzava: string
}

export const NAJVEC = 20
export const EU27 = 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ')
export const PRAZNA: Kosarica = { postavke: [], drzava: 'SI' }

const omeji = (n: number): number => Math.max(0, Math.min(NAJVEC, Math.floor(n)))

export function nastavi(k: Kosarica, razlicica_id: number, kolicina: number): Kosarica {
  const n = omeji(kolicina)
  const postavke = n === 0
    ? k.postavke.filter((p) => p.razlicica_id !== razlicica_id)
    : k.postavke.map((p) => (p.razlicica_id === razlicica_id ? { ...p, kolicina: n } : p))
  return { ...k, postavke }
}

export function dodaj(k: Kosarica, razlicica_id: number, kolicina: number, slug: string): Kosarica {
  const obstaja = k.postavke.find((p) => p.razlicica_id === razlicica_id)
  if (obstaja) return nastavi(k, razlicica_id, obstaja.kolicina + kolicina)
  const n = omeji(kolicina)
  if (n === 0 || k.postavke.length >= NAJVEC) return k
  return { ...k, postavke: [...k.postavke, { razlicica_id, slug, kolicina: n }] }
}

export const odstrani = (k: Kosarica, razlicica_id: number): Kosarica => nastavi(k, razlicica_id, 0)

/** Seštevek v centih; postavke brez znane cene ne štejejo. */
export const skupaj = (k: Kosarica, cene: Record<number, number>): number =>
  k.postavke.reduce((s, p) => s + (cene[p.razlicica_id] ?? 0) * p.kolicina, 0)

export const kosov = (k: Kosarica): number => k.postavke.reduce((s, p) => s + p.kolicina, 0)

/** Privzete tarife (spec Dostava); prave so v Stripe, zato jih kažemo z "od". */
export const postnina = (drzava: string, pismo: boolean): number => (drzava === 'SI' ? (pismo ? 150 : 390) : 990)

/** Shranjena vrednost je od brskalnika: vzamemo le, kar ima pravo obliko. */
export function preberi(surovo: string | null): Kosarica {
  try {
    const v = JSON.parse(surovo ?? 'null') as Partial<Kosarica> | null
    const postavke = (Array.isArray(v?.postavke) ? v.postavke : [])
      .filter((p): p is Postavka => Number.isSafeInteger(p?.razlicica_id) && p.razlicica_id > 0 && typeof p.slug === 'string' && omeji(p.kolicina) > 0)
      .slice(0, NAJVEC)
      .map((p) => ({ razlicica_id: p.razlicica_id, slug: p.slug, kolicina: omeji(p.kolicina) }))
    const drzava = typeof v?.drzava === 'string' && EU27.includes(v.drzava) ? v.drzava : 'SI'
    return { postavke, drzava }
  } catch {
    return PRAZNA
  }
}

const SHRAMBA = 'slff-shop-kosarica'
let stanje: Kosarica = PRAZNA
let prebrano = false
const poslusalci = new Set<() => void>()

function trenutna(): Kosarica {
  if (!prebrano && typeof window !== 'undefined') {
    prebrano = true
    try {
      stanje = preberi(localStorage.getItem(SHRAMBA))
    } catch {}
  }
  return stanje
}

export function shrani(k: Kosarica): void {
  stanje = k
  prebrano = true
  try {
    localStorage.setItem(SHRAMBA, JSON.stringify(k))
  } catch {}
  poslusalci.forEach((f) => f())
}

/** Po plačilu: postavke proč, država ostane. */
export const izprazni = (): void => shrani({ ...PRAZNA, drzava: trenutna().drzava })

function narocise(f: () => void) {
  poslusalci.add(f)
  return () => void poslusalci.delete(f)
}

export const useKosarica = (): Kosarica => useSyncExternalStore(narocise, trenutna, () => PRAZNA)
