// Javne mini lige: lastnik ligo objavi v eni ligi, drugi jo najdejo in se
// pridružijo brez kode. Odloča baza (migracija 20261012139100,
// `nastavi_javnost_mini_lige`, `pridruzi_javni_mini_ligi`, sprožilec
// `varuj_mini_ligo`); tu je isto pravilo za obrazec in prevod kod napak.
import { t } from '../i18n'
import { prevediNapako } from './napake'
import { prepovedanoBesedilo } from './profil'

export const DOLZINA_OPISA = 120
export const NAJVEC_JAVNIH = 3
/** Koliko javnih lig pokaže seznam brez iskanja (baza vrne največ 100). */
export const OMEJITEV_SEZNAMA = 50

/** Vrstica `javne_mini_lige(liga, iskanje)`. */
export interface JavnaLiga {
  id: number
  name: string
  opis: string | null
  ekip: number
  owner_name: string | null
  owner_id: string | null
  created_at: string
  sem_clan: boolean
}

/** Glava strani lige, `mini_liga_glava(id)`. Kode ne vsebuje. */
export interface GlavaLige {
  id: number
  name: string
  opis: string | null
  javna: boolean
  competition_id: number | null
  competition_slug: string | null
  competition_short: string | null
  competition_name: string | null
  ekip: number
  owner_name: string | null
  owner_id: string | null
  sem_clan: boolean
  sem_lastnik: boolean
  zaklenjena: boolean
}

const KODE = {
  'ime-znaki': 'lestvice.javneLige.napake.imeZnaki',
  'ime-rezervirano': 'lestvice.javneLige.napake.imeRezervirano',
  'ime-neprimerno': 'lestvice.javneLige.napake.imeNeprimerno',
  'opis-znaki': 'lestvice.javneLige.napake.opisZnaki',
  'opis-rezervirano': 'lestvice.javneLige.napake.opisRezervirano',
  'opis-neprimerno': 'lestvice.javneLige.napake.opisNeprimerno',
  'opis-dolzina': 'lestvice.javneLige.napake.opisDolzina',
  'javne-najvec': 'lestvice.javneLige.napake.najvec',
  'javna-zaklenjena': 'lestvice.javneLige.napake.zaklenjena',
  'javna-liga': 'lestvice.javneLige.napake.izberiLigo',
  'javna-brez-ekipe': 'lestvice.javneLige.brezEkipe',
} as const

export type KodaJavnosti = keyof typeof KODE

/** Besedilo napake iz odgovora baze: po kodi (`hint`), sicer po sporočilu. */
export function napakaJavnosti(napaka: { hint?: string | null; message: string }): string {
  const koda = napaka.hint as KodaJavnosti | undefined
  return koda && koda in KODE ? t(KODE[koda]) : prevediNapako(napaka.message)
}

/**
 * Isto pravilo kot sprožilec pred objavo, da obrazec napako pove pred
 * klicem. Vrne kodo napake ali null.
 */
export function preveriJavnoLigo(ime: string, opis: string): KodaJavnosti | null {
  const vIme = prepovedanoBesedilo(ime)
  if (vIme) return `ime-${vIme}`
  const cist = opis.replace(/\s+/g, ' ').trim()
  if ([...cist].length > DOLZINA_OPISA) return 'opis-dolzina'
  const vOpis = cist ? prepovedanoBesedilo(cist) : null
  if (vOpis) return `opis-${vOpis}`
  return null
}

export const besediloNapake = (koda: KodaJavnosti): string => t(KODE[koda])
