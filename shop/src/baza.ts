// Ista baza in isti računi kot slff.eu (api.slff.eu). Seja je svoja, ker je
// izvor drug. Shema trgovina ni v API: katalog in naročila gredo prek RPC
// trgovina_* (Json), zato so oblike odgovorov opisane tu.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/baza.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  { auth: { flowType: 'implicit', storageKey: 'slff-shop-seja' } },
)

export type Voljo = 'da' | 'malo' | 'ne'
export type Kategorija = 'oblacila' | 'dodatki' | 'dom' | 'nalepke'

/** trgovina_katalog() */
export interface IzdelekKataloga {
  slug: string
  ime_sl: string
  ime_en: string
  kategorija: Kategorija
  slike: string[]
  cena_od: number
  na_voljo: Voljo
}

export interface Razlicica {
  id: number
  oznaka_sl: string
  oznaka_en: string
  cena: number
  na_voljo: Voljo
}

/** trgovina_izdelek(slug); null, če ga ni ali ni aktiven. */
export interface Izdelek {
  slug: string
  ime_sl: string
  ime_en: string
  opis_sl: string
  opis_en: string
  kategorija: Kategorija
  slike: string[]
  pismo: boolean
  razlicice: Razlicica[]
}

/** Element trgovina_moja_narocila(). */
export interface Narocilo {
  id: number
  javna_oznaka: string
  stanje: 'placano' | 'poslano' | 'preklicano' | 'vrnjeno'
  znesek_postavke: number | null
  znesek_dostava: number | null
  znesek_skupaj: number | null
  sledilna: string | null
  placano_at: string | null
  poslano_at: string | null
  created_at: string
  postavke: { razlicica_id: number; ime: string; cena: number; kolicina: number }[]
}
