// Skupne pomožne funkcije za prikaz.

import type { Pozicija } from './tipi'
import { t, stevilo, type Kljuc } from '../i18n/jedro.ts'

export const IME_POZICIJE: Record<Pozicija, string> = {
  GK: t('skupno.pozicija.GK'),
  DEF: t('skupno.pozicija.DEF'),
  MID: t('skupno.pozicija.MID'),
  FWD: t('skupno.pozicija.FWD'),
}

export const KRATKA_POZICIJA: Record<Pozicija, string> = {
  GK: t('skupno.pozicijaKratko.GK'),
  DEF: t('skupno.pozicijaKratko.DEF'),
  MID: t('skupno.pozicijaKratko.MID'),
  FWD: t('skupno.pozicijaKratko.FWD'),
}

/** Iz "Priimek Ime" naredi "Ime Priimek" za prijaznejši prikaz. */
export function prikazniIme(polno: string | null | undefined): string {
  if (!polno) return ''
  const deli = polno.trim().split(/\s+/)
  if (deli.length < 2) return polno
  return deli.slice(1).join(' ') + ' ' + deli[0]
}

export function razredPozicije(poz: Pozicija | null | undefined): string {
  return poz ? `poz-${poz}` : 'poz-none'
}

export const formatirajTocke = (t: number | string | null | undefined): string => {
  const n = Number(t ?? 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * Cena v obliki valute: 5.5 -> "5,5 M€". Točke in cene se sicer izpisujejo z
 * isto funkcijo in ju je bilo na zaslonu težko ločiti.
 */
export const formatirajCeno = (v: number | string | null | undefined): string =>
  t('skupno.cena', { v: stevilo(Number(v ?? 0), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })

/**
 * Števna beseda iz slovarja (`skupno.besede`). Obliko izbere jezik: slovenščina
 * loči ednino, dvojino, 3–4 in ostalo po ostanku pri 100, hrvaščina drugače.
 */
export type StevnaBeseda = Extract<Kljuc, `skupno.besede.${string}`>

/** Beseda v obliki za število: oblika(4, TOCKE) → "točke". */
export function oblika(n: number, beseda: StevnaBeseda): string {
  return t(beseda, { n })
}

/** Število z besedo v pravilni obliki: mnozina(4, TOCKE) → "4 točke". */
export function mnozina(n: number, beseda: StevnaBeseda): string {
  return `${n} ${oblika(n, beseda)}`
}

export const TOCKE: StevnaBeseda = 'skupno.besede.tocke'
/** Rodilnik ("odbitek 1 točke, 2 točk"). */
export const TOCK_RODILNIK: StevnaBeseda = 'skupno.besede.tockRodilnik'
/** Tožilnik ("prinesla 1 točko, 2 točki"). */
export const TOCKE_TOZILNIK: StevnaBeseda = 'skupno.besede.tockeTozilnik'

/**
 * Beseda za točke ob številu. Dogovor: neceli seštevki (kapetan, polovičke)
 * so vedno "točke" ("2.5 točke") — pravila množine za necela števila to v
 * slovenščini dajo sama.
 */
export function tockZ(t: number | string | null | undefined): string {
  return oblika(Number(t ?? 0), TOCKE)
}
export const IGRALCI: StevnaBeseda = 'skupno.besede.igralci'
export const EKIPE: StevnaBeseda = 'skupno.besede.ekipe'
export const TEKME: StevnaBeseda = 'skupno.besede.tekme'
export const GOLI: StevnaBeseda = 'skupno.besede.goli'
export const GLASOVI: StevnaBeseda = 'skupno.besede.glasovi'
export const KROGI: StevnaBeseda = 'skupno.besede.krogi'
