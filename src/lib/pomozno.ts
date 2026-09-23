// Skupne pomožne funkcije za prikaz.

import type { Pozicija } from './tipi'

export const IME_POZICIJE: Record<Pozicija, string> = {
  GK: 'Vratar',
  DEF: 'Branilec',
  MID: 'Vezist',
  FWD: 'Napadalec',
}

export const KRATKA_POZICIJA: Record<Pozicija, string> = {
  GK: 'VRA',
  DEF: 'BRA',
  MID: 'VEZ',
  FWD: 'NAP',
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
export const formatirajCeno = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0)
  return `${n.toFixed(1).replace('.', ',')} M€`
}

/**
 * Slovenska števna oblika. Odloča ostanek pri 100, ne pri 10:
 * 1, 101 → ednina; 2, 102 → dvojina; 3–4, 103–104 → množina; ostalo (tudi 11–14, 21) → rodilnik.
 * `oblike` = [ena, dve, tri-štiri, pet+], npr. ['točka', 'točki', 'točke', 'točk'].
 */
export function oblika(n: number, oblike: [string, string, string, string]): string {
  const o = Math.abs(Math.trunc(n)) % 100
  if (o === 1) return oblike[0]
  if (o === 2) return oblike[1]
  if (o === 3 || o === 4) return oblike[2]
  return oblike[3]
}

/** Število z besedo v pravilni obliki: mnozina(4, TOCKE) → "4 točke". */
export function mnozina(n: number, oblike: [string, string, string, string]): string {
  return `${n} ${oblika(n, oblike)}`
}

export const TOCKE: [string, string, string, string] = ['točka', 'točki', 'točke', 'točk']
/** Rodilnik ("odbitek 1 točke, 2 točk"). */
export const TOCK_RODILNIK: [string, string, string, string] = ['točke', 'točk', 'točk', 'točk']
/** Tožilnik ("prinesla 1 točko, 2 točki"). */
export const TOCKE_TOZILNIK: [string, string, string, string] = ['točko', 'točki', 'točke', 'točk']

/**
 * Beseda za točke ob številu. Dogovor: neceli seštevki (kapetan, polovičke)
 * so vedno "točke" ("2.5 točke") — povsod enako, kot je bilo na Domov.
 */
export function tockZ(t: number | string | null | undefined): string {
  const n = Number(t ?? 0)
  return Number.isInteger(n) ? oblika(n, TOCKE) : 'točke'
}
export const IGRALCI: [string, string, string, string] = ['igralec', 'igralca', 'igralci', 'igralcev']
export const EKIPE: [string, string, string, string] = ['ekipa', 'ekipi', 'ekipe', 'ekip']
export const TEKME: [string, string, string, string] = ['tekma', 'tekmi', 'tekme', 'tekem']
export const GOLI: [string, string, string, string] = ['gol', 'gola', 'goli', 'golov']
export const GLASOVI: [string, string, string, string] = ['glas', 'glasova', 'glasovi', 'glasov']
export const KROGI: [string, string, string, string] = ['krog', 'kroga', 'krogi', 'krogov']
