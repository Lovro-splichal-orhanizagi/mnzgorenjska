// Prenosi tekem v živo z YouTuba (SLF-477). Baza: migracija
// 20261115120000_prenosi_tekem.sql; preverba povezave: funkcija `prenosi`.
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Prenos {
  id: string
  video_id: string
  kanal_id: string
  kanal_ime: string
  naslov: string
  dodal: string | null
  stanje: 'v_zivo' | 'posnetek'
  gledalcev: number | null
  trajanje_s: number | null
  zacetek: string
  osvezeno_at: string
  moj: boolean
  prijavil: boolean
}

export interface StanjeTekme {
  vklopljeno: boolean
  zaprto: 'ni_tekme' | 'mladinska' | 'tekmovanje' | null
  okno_od: string | null
  okno_do: string | null
  ura_znana: boolean
}

export interface PrenosVZivo {
  match_id: number
  competition_id: number
  liga: string
  home_name: string
  home_short: string | null
  home_logo: string | null
  away_name: string
  away_short: string | null
  away_logo: string | null
  home_goals: number | null
  away_goals: number | null
  prenosov: number
  video_id: string
  naslov: string
  kanal_ime: string
  gledalcev: number | null
  osvezeno_at: string
}

export interface IzidDodaj {
  ok: boolean
  napaka?: string
  nepreverjeno?: boolean
  od?: string
  do?: string
  ura_znana?: boolean
  razlog?: string
}

/** Vdelava brez piškotkov; naloži se šele po tapu (PredvajalnikPrenosa). */
export const vdelava = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`
export const naYoutubu = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`

/** Podatek je star več kot 2 min: ob branju sprožimo osvežitev (strežnik jo omeji). */
export const zastarelo = (osvezenoAt: string) => Date.now() - new Date(osvezenoAt).getTime() > 2 * 60 * 1000

export async function stanjeTekme(matchId: number): Promise<StanjeTekme | null> {
  const { data } = await supabase.rpc('prenosi_stanje_tekme', { p_match: matchId })
  return (data as unknown as StanjeTekme | null) ?? null
}

export async function prenosiTekme(matchId: number): Promise<Prenos[]> {
  const { data } = await supabase.rpc('prenosi_tekme', { p_match: matchId })
  return (data ?? []) as Prenos[]
}

export async function prenosiVZivo(teamId?: number): Promise<PrenosVZivo[]> {
  const { data } = await supabase.rpc('prenosi_v_zivo', teamId ? { p_team: teamId } : {})
  return (data ?? []) as PrenosVZivo[]
}

/** Strežnik vpraša YouTube največ enkrat na 2 min, ne glede na število obiskov. */
export async function osvezi(): Promise<boolean> {
  const { data } = await supabase.functions.invoke('prenosi', { body: { akcija: 'osvezi' } })
  return ((data as { osvezenih?: number } | null)?.osvezenih ?? 0) > 0
}

export async function dodajPrenos(matchId: number, povezava: string): Promise<IzidDodaj> {
  const { data, error } = await supabase.functions.invoke('prenosi', {
    body: { akcija: 'dodaj', match_id: matchId, povezava },
  })
  if (!error) return data as IzidDodaj
  if (error instanceof FunctionsHttpError) {
    const telo = await (error.context as Response).json().catch(() => null)
    if (telo?.napaka) return telo as IzidDodaj
  }
  return { ok: false, napaka: 'splosna' }
}

export async function prijaviPrenos(id: string, razlog: string, opomba: string): Promise<string | null> {
  const { error } = await supabase.rpc('prenos_prijavi', { p_prenos: id, p_razlog: razlog, p_opomba: opomba })
  return error ? error.message : null
}

// Merilo (SLF-472): edinstveni gledalci po prenosu in prijave, ki so se začele
// na tekmi med prenosom. Oznaka naprave je naključna, brez podatkov o osebi.
const KLJUC_NAPRAVE = 'slff-prenosi-naprava'
const KLJUC_IZVORA = 'slff-prenos-izvor'

function oznakaNaprave(): string {
  try {
    let o = localStorage.getItem(KLJUC_NAPRAVE)
    if (!o) {
      o = crypto.randomUUID()
      localStorage.setItem(KLJUC_NAPRAVE, o)
    }
    return o
  } catch {
    return crypto.randomUUID()
  }
}

export function zabeleziOgled(prenosId: string) {
  void supabase.rpc('prenos_ogled', { p_prenos: prenosId, p_obiskovalec: oznakaNaprave() })
}

/** Gost je na strani tekme s prenosom v živo: ob prijavi v 2 h jo pripišemo prenosu. */
export function zapomniIzvorPrijave(prenosId: string) {
  try {
    localStorage.setItem(KLJUC_IZVORA, JSON.stringify({ id: prenosId, cas: Date.now() }))
  } catch {
    /* zasebni način */
  }
}

/** Ob prijavi: pripiši jo prenosu, če se je začela na tekmi med prenosom. */
export function pripisiPrijavo() {
  try {
    const surovo = localStorage.getItem(KLJUC_IZVORA)
    if (!surovo) return
    localStorage.removeItem(KLJUC_IZVORA)
    const { id, cas } = JSON.parse(surovo) as { id: string; cas: number }
    if (Date.now() - cas < 2 * 60 * 60 * 1000) void supabase.rpc('prenos_vpis', { p_prenos: id })
  } catch {
    /* pokvarjen zapis */
  }
}
