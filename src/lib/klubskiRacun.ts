// Klubski računi (migracija 20261013201100). Ali je uporabnik klub, pove le
// baza: ob vsaki prijavi `uveljavi_klubski_racun` preveri potrjen mail proti
// uradnim naslovom klubov in po potrebi ustvari račun.
import { supabase } from './supabase'

export interface StanjeKluba {
  racun: { team_id: number; team_name: string; od: string } | null
  zahtevek: {
    id: number
    vrsta: 'brez_kluba' | 'polno' | 'nov_naslov'
    status: 'odprt' | 'potrjen' | 'zavrnjen'
    razlog: string | null
    team_name: string | null
    created_at: string
  } | null
}

export const VLOGE_KLUBA = ['predsednik', 'tajnik', 'trener', 'vodstvo', 'drugo'] as const
export type VlogaKluba = (typeof VLOGE_KLUBA)[number]

export async function uveljaviKlubskiRacun(): Promise<number | null> {
  const { data, error } = await supabase.rpc('uveljavi_klubski_racun')
  if (error) return null
  return (data as number | null) ?? null
}

export async function mojKlubskiRacun(): Promise<StanjeKluba> {
  const { data } = await supabase.rpc('moj_klubski_racun')
  return (data as unknown as StanjeKluba | null) ?? { racun: null, zahtevek: null }
}
