// Košarica: čiste funkcije in shramba v localStorage (slff-shop-kosarica).
// Cene in imena niso shranjeni: košarica jih ob prikazu prebere iz
// trgovina_izdelek(slug), plačilo pa jih vzame iz baze. Meje so iste kot v
// trgovina_rezerviraj (20 vrstic, 20 kosov na vrstico); 50 skupaj preveri baza.
import { useSyncExternalStore } from 'react'
import { stabilno, veljavnaOblika, type Personalizacija } from './personalizacija'

export interface Postavka {
  razlicica_id: number
  slug: string
  kolicina: number
  /** Ista različica z drugačno personalizacijo je druga vrstica. */
  personalizacija?: Personalizacija
  /** Besedilo za prikaz v košarici (ime ekipe, prvak); baza ga sestavi sama. */
  opis?: string
}
export interface Kosarica {
  postavke: Postavka[]
  /** Država dostave, ISO2 iz EU27. */
  drzava: string
}

export const NAJVEC = 20
export const EU27 = 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ')
export const PRAZNA: Kosarica = { postavke: [], drzava: 'SI' }

const omeji = (n: number, najvec = NAJVEC): number => Math.max(0, Math.min(najvec, Math.floor(n)))

/** Istovetnost vrstice: različica in personalizacija. */
export const kljuc = (p: { razlicica_id: number; personalizacija?: Personalizacija }): string =>
  `${p.razlicica_id}|${p.personalizacija ? stabilno(p.personalizacija) : ''}`

/** `najvec`: meja izdelka (značka 1, darilni bon 5), sicer 20. */
export function nastavi(k: Kosarica, vrstica: string, kolicina: number, najvec = NAJVEC): Kosarica {
  const n = omeji(kolicina, najvec)
  const postavke = n === 0
    ? k.postavke.filter((p) => kljuc(p) !== vrstica)
    : k.postavke.map((p) => (kljuc(p) === vrstica ? { ...p, kolicina: n } : p))
  return { ...k, postavke }
}

export function dodaj(k: Kosarica, razlicica_id: number, kolicina: number, slug: string, personalizacija?: Personalizacija, opis?: string, najvec = NAJVEC): Kosarica {
  const nova: Postavka = { razlicica_id, slug, kolicina: omeji(kolicina, najvec), ...(personalizacija && { personalizacija }), ...(opis && { opis }) }
  const obstaja = k.postavke.find((p) => kljuc(p) === kljuc(nova))
  if (obstaja) return nastavi(k, kljuc(nova), obstaja.kolicina + kolicina, najvec)
  if (nova.kolicina === 0 || k.postavke.length >= NAJVEC) return k
  return { ...k, postavke: [...k.postavke, nova] }
}

export const odstrani = (k: Kosarica, vrstica: string): Kosarica => nastavi(k, vrstica, 0)

/** Seštevek v centih (cene po ključu vrstice, z doplačilom); postavke brez znane cene ne štejejo. */
export const skupaj = (k: Kosarica, cene: Record<string, number>): number =>
  k.postavke.reduce((s, p) => s + (cene[kljuc(p)] ?? 0) * p.kolicina, 0)

export const kosov = (k: Kosarica): number => k.postavke.reduce((s, p) => s + p.kolicina, 0)

/** Privzete tarife (spec Dostava); prave so v Stripe, zato jih kažemo z "od". */
export const postnina = (drzava: string, pismo: boolean): number => (drzava === 'SI' ? (pismo ? 150 : 390) : 990)

/** Shranjena vrednost je od brskalnika: vzamemo le, kar ima pravo obliko. */
export function preberi(surovo: string | null): Kosarica {
  try {
    const v = JSON.parse(surovo ?? 'null') as Partial<Kosarica> | null
    const postavke = (Array.isArray(v?.postavke) ? v.postavke : [])
      .filter((p): p is Postavka => Number.isSafeInteger(p?.razlicica_id) && p.razlicica_id > 0 && typeof p.slug === 'string' && omeji(p.kolicina) > 0
        && (p.personalizacija === undefined || veljavnaOblika(p.personalizacija) !== null))
      .filter((p, n, vse) => vse.findIndex((q) => kljuc(q) === kljuc(p)) === n)
      .slice(0, NAJVEC)
      .map((p) => ({
        razlicica_id: p.razlicica_id, slug: p.slug, kolicina: omeji(p.kolicina),
        ...(p.personalizacija && { personalizacija: p.personalizacija }),
        ...(typeof p.opis === 'string' && p.opis && { opis: p.opis.slice(0, 120) }),
      }))
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

// Drug zavihek je spremenil košarico.
if (typeof window !== 'undefined') {
  addEventListener('storage', (e) => {
    if (e.key !== SHRAMBA && e.key !== null) return
    stanje = preberi(e.newValue)
    prebrano = true
    poslusalci.forEach((f) => f())
  })
}

function narocise(f: () => void) {
  poslusalci.add(f)
  return () => void poslusalci.delete(f)
}

/** Zadnje plačilo tega zavihka (trgovina-nakup vrne sejo in oznako). */
export interface Placilo {
  seja: string
  oznaka: string
}
const PLACILO = 'slff-shop-placilo'

export function zadnjePlacilo(): Placilo | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(PLACILO) ?? 'null') as Partial<Placilo> | null
    return typeof v?.seja === 'string' && typeof v.oznaka === 'string' ? { seja: v.seja, oznaka: v.oznaka } : null
  } catch {
    return null
  }
}

export function shraniPlacilo(p: Placilo | null): void {
  try {
    if (p) sessionStorage.setItem(PLACILO, JSON.stringify(p))
    else sessionStorage.removeItem(PLACILO)
  } catch {}
}

export const useKosarica = (): Kosarica => useSyncExternalStore(narocise, trenutna, () => PRAZNA)
