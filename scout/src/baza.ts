// Ista baza in isti računi kot slff.eu (api.slff.eu). Seja je svoja, ker je
// izvor drug: na scout.slff.eu se prijaviš posebej. Shema scout ni v API;
// vse gre prek RPC scout_* (faza 3a), ki preverijo sedež in naročnino.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/baza.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  { auth: { flowType: 'implicit', storageKey: 'slff-scout-seja' } },
)

type Fn = Database['public']['Functions']
export type Zadetek = Fn['scout_isci']['Returns'][number]
export type Podoben = Fn['scout_podobni']['Returns'][number]
export type Vrzel = Fn['scout_vrzeli']['Returns'][number]
export type Opazovan = Fn['scout_opazovani']['Returns'][number]
export type Skupina = 'GK' | 'DEF' | 'MID' | 'FWD'
export const SKUPINE: Skupina[] = ['GK', 'DEF', 'MID', 'FWD']

/** scout_moj_klub() */
export interface Klub {
  team_id: number
  klub: string
  country_id: number
  drzava_odprta: boolean
  sedez: boolean
  narocnina: {
    paket: 'preizkus' | 'klub'
    obdobje: 'mesec' | 'sezona' | null
    velja_do: string
    velja: boolean
  } | null
  sedezi: { user_id: string; ime: string | null }[]
}

export interface SezonaIgralca {
  sezona: string
  liga: string
  klub: string
  minute: number
  delez_minut: number
  zacetki_delez: number
  cele_delez: number
  goli_ref_90: number
  goli_90_pri_nas: number | null
  delez_golov: number
  enajstm: number
  onoff_ref_90: number
  prejeti_ref_90: number
  ciste_delez: number
  kartoni_90: number
  vratar_ref_90: number
  stalnost: number
  trend_minut: number | null
  zaupanje: number
}

/** scout_igralec(id) */
export interface ProfilIgralca {
  player_id: number
  ime: string
  klub: string
  liga: string
  skupina: Skupina
  indeks: number
  percentil: number
  zaupanje: number
  moc_lige: number | null
  moc_kluba: number | null
  opazujem: boolean
  /** Le pri "odprt za prestop"; stika ni (faza 4). */
  privolitev: { letnik: number; regije: string[] } | null
  sezone: SezonaIgralca[] | null
}

/** scout_klub(): statistika na tekmo; ciste je delež 0..1. */
export interface StatEkipe {
  tekme: number
  tocke: number
  za: number
  proti: number
  ciste: number
  tocke_doma: number | null
  tocke_gost: number | null
  za_doma: number | null
  proti_doma: number | null
  za_gost: number | null
  proti_gost: number | null
  kartoni: number | null
}
export interface IgralecKluba {
  player_id: number
  ime: string
  skupina: Skupina | null
  nastopi: number
  minute: number
  delez_minut: number | null
  zacetki_delez: number
  goli: number
  onoff_ref_90: number | null
  kartoni_90: number | null
  trend_minut: number | null
  /** Igralec z mladinsko vrstico: le svojemu klubu, le javna dejstva tekem, brez profila. */
  mladi: boolean
}
export interface PregledKluba {
  team_id: number
  ime: string
  country_id: number
  admin: boolean
  glava: {
    competition_id: number
    liga: string
    sezona?: string
    mesto?: number
    klubov?: number
    tekme?: number
    tocke?: number
    forma?: string
    elo: number | null
    elo_lani: number | null
    moc_mesto: number | null
    lig: number
  } | null
  ekipa: { klub: StatEkipe | null; liga: StatEkipe } | null
  kader: IgralecKluba[]
  vrzeli: Vrzel[]
}

export type VrstaDogodka = 'trening' | 'prijateljska' | 'sestanek' | 'drugo'
export const VRSTE_DOGODKOV: VrstaDogodka[] = ['trening', 'prijateljska', 'sestanek', 'drugo']
export type Stanje = 'prisoten' | 'opravicen' | 'odsoten'
export const STANJA: Stanje[] = ['prisoten', 'opravicen', 'odsoten']

export interface Selekcija {
  competition_id: number
  ime: string
  mladinska: boolean
}

/** scout_koledar(od, do): uradne tekme kluba živo iz zapisnikov, dogodki kluba iz scout.dogodki. */
/** Pogled kluba: svoj ali (administrator) tuj klub države, ki vidi le javno. */
export interface PogledKluba {
  team_id: number
  ime: string
  svoj: boolean
  admin: boolean
  country_id: number
}

export interface Koledar extends PogledKluba {
  selekcije: Selekcija[]
  tekme: { id: number; datum: string; competition_id: number; doma: boolean; nasprotnik: string; za: number | null; proti: number | null }[]
  dogodki: { id: number; competition_id: number; vrsta: VrstaDogodka; zacetek: string; trajanje_min: number; kraj: string | null; serija: string | null; oznaceni: number }[]
}

/** scout_dogodek(id) */
export interface Dogodek {
  id: number
  competition_id: number
  selekcija: string
  vrsta: VrstaDogodka
  zacetek: string
  trajanje_min: number
  kraj: string | null
  opomba: string | null
  serija: string | null
  selekcije: Selekcija[]
  kader: { player_id: number; ime: string; pozicija: Skupina | null; stanje: Stanje | null }[]
}

/** scout_ekipa(selekcija): dejstva tekoče sezone in prisotnost zadnjih 30 dni. */
export interface ClanKadra {
  player_id: number
  ime: string
  pozicija: Skupina | null
  nastopi: number
  zacetki: number
  minute: number
  goli: number
  rumeni: number
  rdeci: number
  prisoten: number
  oznacen: number
}
export interface Ekipa extends PogledKluba {
  selekcije: Selekcija[]
  competition_id: number | null
  sezona?: string
  igralci: ClanKadra[]
}
