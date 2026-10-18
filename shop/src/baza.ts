// Ista baza in isti računi kot slff.eu (api.slff.eu). Seja je svoja, ker je
// izvor drug. Shema trgovina ni v API: katalog in naročila gredo prek RPC
// trgovina_* (Json), zato so oblike odgovorov opisane tu.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/baza.types'
import type { Moznost } from './personalizacija'

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
  cena_do: number
  na_voljo: Voljo
  po_narocilu?: boolean
  digitalni?: boolean
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
  /** Izdelava po naročilu (1–2 tedna, brez zaloge). */
  po_narocilu: boolean
  /** Darilni bon: koda po e-pošti, brez dostave. */
  digitalni: boolean
  personalizacije: Moznost[]
  razlicice: Razlicica[]
}

/** Shranjena personalizacija postavke (trgovina.personaliziraj). */
export interface PersonalizacijaPostavke {
  vrsta?: 'ime_ekipe' | 'poljubno_ime' | 'prvak' | 'znacka'
  ime?: string
  stevilka?: number
}

/** Postavka naročila (trgovina.narocilo_json). */
export interface PostavkaNarocila {
  id: number
  razlicica_id: number
  sku: string
  ime: string
  cena: number
  doplacilo: number
  kolicina: number
  personalizacija: PersonalizacijaPostavke | null
  stanje_tiska: 'za_tisk' | 'v_seriji' | 'natisnjeno' | null
  po_narocilu: boolean
  digitalni: boolean
}

/** Besedilo personalizacije za prikaz: "Kranjski Tigri · 10". */
export const opisPersonalizacije = (p: PersonalizacijaPostavke | null | undefined): string =>
  p ? [p.ime, p.stevilka].filter((x) => x !== undefined && x !== null && x !== '').join(' · ') : ''

/** Element trgovina_moji_prvaki(). */
export interface Prvak {
  mini_liga_id: number
  ime: string
  sezona: string
  fantasy_team_id: number
  ekipa: string
  /** Natisnjena vrstica (največ 40 znakov, ime lige po potrebi skrajšano). */
  besedilo_sl: string
  besedilo_en: string
}

/** Postavka v trgovina_admin_za_tisk() in seriji. */
export interface PostavkaTiska {
  postavka_id: number
  stanje_tiska: 'za_tisk' | 'v_seriji' | 'natisnjeno'
  narocilo_id: number
  javna_oznaka: string
  placano_at: string | null
  sku: string
  ime: string
  kolicina: number
  personalizacija: PersonalizacijaPostavke | null
}

/** trgovina_admin_serija(id) */
export interface Serija {
  id: number
  created_at: string
  poslana_at: string | null
  natisnjena_at: string | null
  postavke: PostavkaTiska[]
}

/** Element trgovina_admin_serije(). */
export interface SerijaPovzetek {
  id: number
  created_at: string
  poslana_at: string | null
  natisnjena_at: string | null
  postavk: number
}

/** Element trgovina_admin_boni() (koda le zadnji 4 znaki). */
export interface Bon {
  id: number
  narocilo_id: number
  javna_oznaka: string
  email: string | null
  koda_konec: string
  znesek: number
  velja_do: string
  porabljeno_at: string | null
  created_at: string
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
  postavke: PostavkaNarocila[]
}

/** Naslov iz Stripe (narocila.naslov). */
export interface Naslov {
  name: string | null
  line1: string | null
  line2: string | null
  postal_code: string | null
  city: string | null
  country: string | null
}

/** Element trgovina_admin_narocila(). manjka > 0: plačano več, kot je bilo zaloge. */
export interface NarociloAdmin {
  id: number
  javna_oznaka: string
  stanje: string
  email: string | null
  ime: string | null
  naslov: Naslov | null
  jezik: 'sl' | 'en'
  znesek_postavke: number | null
  znesek_dostava: number | null
  znesek_ddv: number | null
  znesek_skupaj: number | null
  dostava_kljuc: string | null
  sledilna: string | null
  manjka: number
  placano_at: string | null
  poslano_at: string | null
  created_at: string
  postavke: PostavkaNarocila[]
}

/** Različica v trgovina_admin_izdelki(); na_voljo = zaloga − rezervirano. */
export interface RazlicicaAdmin {
  id: number
  izdelek_id: number
  oznaka_sl: string
  oznaka_en: string
  sku: string
  cena: number
  zaloga: number
  teza_g: number
  aktivna: boolean
  vrstni_red: number
  na_voljo: number
}

/** Element trgovina_admin_izdelki() (tudi neaktivni). */
export interface IzdelekAdmin {
  id: number
  slug: string
  ime_sl: string
  ime_en: string
  opis_sl: string
  opis_en: string
  kategorija: Kategorija
  slike: string[]
  tax_code: string
  pismo: boolean
  aktiven: boolean
  vrstni_red: number
  razlicice: RazlicicaAdmin[]
}
