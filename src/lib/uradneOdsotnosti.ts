// Uradne odsotnosti: potrjeni igralec sam javi, da ne bo igral (migracija
// 20261012135100, tabela `uradne_odsotnosti`, pogled `uradne_odsotnosti_view`).
//
// Samo informacija, kot skupnostna poročila: ne vpliva na izbiro, cene ne
// točke. Če igralec po zapisniku zaigra, preden odsotnost zapre, jo preverba
// po uvozu označi "ni držalo" in to je opomin; dva v sezoni vzameta pravico do
// uradnih odsotnosti do konca sezone. Pravila so v bazi; tu je le prikaz.
import { datum } from '../i18n/jedro.ts'
import type { Porocilo, VrstaPorocila } from '../components/Odsotnost'

export type VrstaUradne = 'poskodba' | 'bolezen' | 'dopust' | 'kazen' | 'drugo'
export type StatusUradne = 'odprto' | 'zaprto' | 'ni_drzalo'

export const VRSTE_URADNE: VrstaUradne[] = ['poskodba', 'bolezen', 'dopust', 'kazen', 'drugo']
export const IKONA_URADNE: Record<VrstaUradne, string> = {
  poskodba: '🩹',
  bolezen: '🤒',
  dopust: '🧳',
  kazen: '🟥',
  drugo: '💬',
}
/** Največ znakov opombe (isto kot `check` v bazi). */
export const NAJVEC_OPOMBA = 140

export interface UradnaOdsotnost {
  id: number
  player_id: number
  glavni_player_id: number | null
  competition_id: number | null
  player_name: string | null
  team_id: number | null
  team_name: string | null
  team_short: string | null
  team_logo: string | null
  vrsta: VrstaUradne
  od: string
  vrnitev: string | null
  opomba: string | null
  status: StatusUradne
  created_at: string
  zaprto_at: string | null
  ni_drzalo_datum: string | null
  moje: boolean
}

/** Današnji datum v Ljubljani (YYYY-MM-DD), kot ga šteje baza. */
export function danes(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana' }).format(new Date())
}

/** "11. 10." za datum brez ure (opoldne, da pas ne premakne dneva). */
export function kratekDatum(d: string): string {
  return datum(d.length === 10 ? `${d}T12:00:00` : d, { day: 'numeric', month: 'numeric' })
}

/** Odprta in vrnitev še ni mimo. */
export function jeAktivna(o: Pick<UradnaOdsotnost, 'status' | 'vrnitev'>, dan = danes()): boolean {
  return o.status === 'odprto' && (!o.vrnitev || o.vrnitev > dan)
}

/** Kateremu filtru skupnostnih poročil ustreza uradna vrsta (forum). */
export function skupnaVrsta(v: VrstaUradne): VrstaPorocila {
  if (v === 'poskodba') return 'poskodba'
  if (v === 'drugo') return 'drugo'
  return 'odsotnost'
}

export type VnosForuma =
  | { vrsta: 'uradna'; uradna: UradnaOdsotnost }
  | { vrsta: 'porocilo'; porocilo: Porocilo }

/**
 * Forum: igralci po najnovejšem vnosu, pri istem igralcu najprej uradne
 * odsotnosti (igralec sam), nato skupnostna poročila; znotraj po času.
 */
export function zdruziZaForum(uradne: UradnaOdsotnost[], porocila: Porocilo[]): VnosForuma[] {
  const vnosi: Array<VnosForuma & { igralec: number; cas: string }> = [
    ...uradne.map((u) => ({ vrsta: 'uradna' as const, uradna: u, igralec: u.player_id, cas: u.created_at })),
    ...porocila.map((p) => ({ vrsta: 'porocilo' as const, porocilo: p, igralec: p.player_id, cas: p.created_at })),
  ]
  const zadnji = new Map<number, string>()
  for (const v of vnosi) if ((zadnji.get(v.igralec) ?? '') < v.cas) zadnji.set(v.igralec, v.cas)
  vnosi.sort((a, b) => {
    if (a.igralec !== b.igralec) {
      const r = (zadnji.get(b.igralec) ?? '').localeCompare(zadnji.get(a.igralec) ?? '')
      return r || a.igralec - b.igralec
    }
    if (a.vrsta !== b.vrsta) return a.vrsta === 'uradna' ? -1 : 1
    return b.cas.localeCompare(a.cas)
  })
  return vnosi.map((v) => (v.vrsta === 'uradna' ? { vrsta: 'uradna', uradna: v.uradna } : { vrsta: 'porocilo', porocilo: v.porocilo }))
}
