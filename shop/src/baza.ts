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
  /** Nosilec motivov: najnižja cena z doplačilom aktivnega motiva (kupi se le z motivom); sicer null. */
  cena_z_motivom?: number | null
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
  /** Postopek tiska (dtf …) pri nosilcih motivov. */
  postopek?: string | null
  /** Aktivni motivi, ki veljajo za ta izdelek (nosilec). */
  motivi?: MotivIzdelka[]
  cone?: Cona[]
}

/** Polje motiva (trgovina.motivi.polja). */
export interface PoljeMotiva {
  kljuc: string
  vrsta: 'besedilo' | 'stevilka' | 'leto' | 'datum' | 'ekipa' | 'prvak' | 'postava' | 'izbira' | 'barva'
  oznaka_sl: string
  oznaka_en: string
  max?: number
  /** Najmanjša številka (ocene na kartici: 1). */
  min?: number
  obvezno: boolean
  privzeto?: string | number
  /** izbira: nizi ali {kljuc, ime_sl, ime_en}; barva: paleta {kljuc, hex, ime_sl, ime_en}. */
  moznosti?: (string | MoznostPolja)[]
  /** Vrednost mora biti drugačna kot v tem polju (barvi dresa). */
  razlicna_od?: string
  /** Cona, če ni glavna cona motiva (sponzor retro dresa → prsi). */
  cona?: string
}

/** Možnost izbire ali barve: shrani se ključ, kupec vidi ime v svojem jeziku. */
export interface MoznostPolja {
  kljuc: string
  ime_sl: string
  ime_en: string
  hex?: string
}

export interface ShemaMotiva {
  kljuc: string
  ime_sl: string
  ime_en: string
  barve: string[]
}

/** Izmišljen primer: ekipa in prvak sta natisnjeno besedilo, postava posnetek (Postava). */
export interface PrimerMotiva {
  polja: Record<string, string | number | Postava>
  shema: string
  izdelek: string
  barva: string
}

interface MotivOsnova {
  slug: string
  ime_sl: string
  ime_en: string
  opis_sl: string
  opis_en: string
  cona: string
  polja: PoljeMotiva[]
  sheme: ShemaMotiva[]
  primeri: PrimerMotiva[]
}

/** Motiv v trgovina_izdelek(slug).motivi. */
export interface MotivIzdelka extends MotivOsnova {
  doplacilo: number
}

/** Cona tiska na fotografiji nosilca (koti TL, TR, BR, BL v px fotografije 1600×1600). */
export interface Cona {
  kljuc: string
  barva: string | null
  slika: string
  koti: [number, number][]
  sirina_mm: number
  visina_mm: number
}

/** Element trgovina_motivi(): le aktivni izdelki (lahko prazno). */
export interface MotivKataloga extends MotivOsnova {
  izdelki: { slug: string; ime_sl: string; ime_en: string; postopek: string | null; doplacilo: number; cena_od: number; cone: Cona[] }[]
}

/** Shranjena personalizacija postavke (trgovina.personaliziraj). */
export interface PersonalizacijaPostavke {
  vrsta?: 'ime_ekipe' | 'poljubno_ime' | 'prvak' | 'znacka'
  ime?: string
  stevilka?: number
  /** Motiv: natisnjene vrednosti polj (ekipa in prvak kot besedilo). */
  motiv?: string
  shema?: string
  polja?: Record<string, string | number | Postava | null>
  /** Posnetek ob nakupu: barve sheme in mere vsake neprazne cone nosilca te barve. */
  barve?: string[]
  cone?: Record<string, { sirina_mm: number; visina_mm: number }>
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

/** Igralec v posnetku postave (trgovina.postava_ekipe). */
export interface IgralecPostave {
  ime: string
  priimek: string
  pozicija: 'GK' | 'DEF' | 'MID' | 'FWD'
  klub: string
  tocke: number | null
  kapetan: boolean
  podkapetan: boolean
  steje?: boolean
}

/** Posnetek postave: trgovina_moja_postava(p_team_id) in polja.postava na postavki. */
export interface Postava {
  ekipa: string
  liga?: string
  sezona?: string
  krog?: number
  formacija?: string
  tocke_skupaj?: number | null
  kazen?: number
  zacetni: IgralecPostave[]
  klop?: IgralecPostave[]
}

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
  /** Oznaka različice ("Črna / M"): barva izbere cono nosilca. */
  razlicica?: string
  postopek?: string | null
  /** Barve sheme motiva; null pri stari obliki. */
  barve?: string[] | null
  /** Cone nosilca (mere v mm); null pri stari obliki. */
  cone?: Cona[] | null
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
  stanje: 'placano' | 'v_izdelavi' | 'poslano' | 'dostavljeno' | 'preklicano' | 'vrnjeno'
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
  znesek_popust?: number | null
  dostava_kljuc: string | null
  sledilna: string | null
  manjka: number
  placano_at: string | null
  poslano_at: string | null
  created_at: string
  postavke: PostavkaNarocila[]
}

export const STANJA_NAROCILA = ['caka_placilo', 'placano', 'v_izdelavi', 'poslano', 'dostavljeno', 'preklicano', 'vrnjeno', 'poteklo'] as const
export type StanjeNarocila = (typeof STANJA_NAROCILA)[number]

/** trgovina_admin_vsa_narocila(): stanja = število po stanju za isto iskanje. */
export interface VsaNarocila {
  skupaj: number
  stanja: Partial<Record<StanjeNarocila, number>>
  narocila: NarociloAdmin[]
}

/** trgovina_admin_narocilo(): še Stripe in zgodovina stanj. */
export interface NarociloPodrobno extends NarociloAdmin {
  stripe_payment_intent: string | null
  stripe_checkout_id: string | null
  zgodovina: { iz: string | null; v: string; admin_id: string | null; admin: string | null; opomba: string | null; created_at: string }[]
  /** Le v odgovoru trgovina_admin_nastavi_stanje. */
  vracilo_potrebno?: boolean
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
  po_narocilu: boolean
  digitalni: boolean
  postopek: string | null
  aktiven: boolean
  vrstni_red: number
  razlicice: RazlicicaAdmin[]
}
