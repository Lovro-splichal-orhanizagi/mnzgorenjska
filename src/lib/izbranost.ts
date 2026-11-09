// Izbranost (v koliko fantasy ekipah je igralec) vidijo le preverjeni igralci,
// admin in strežnik. Odloči baza (`vidi_izbranost`, migracija
// 20261109120000): drugim pogleda vrneta `owners` NULL. Vmesnik vpraša le,
// ali naj stolpec in številke sploh pokaže, namesto da kaže "–".
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

let obljuba: Promise<boolean> | null = null
let uporabnik: string | null | undefined
const poslusalci = new Set<() => void>()

function preberi(): Promise<boolean> {
  obljuba ??= Promise.resolve(supabase.rpc('vidi_izbranost')).then(
    ({ data }) => data === true,
    () => false,
  )
  return obljuba
}

/** Pozabi odgovor (nova pravica po plačilu, preklic, druga prijava). */
export function pozabiIzbranost() {
  obljuba = null
  poslusalci.forEach((f) => f())
}

supabase.auth.onAuthStateChange((_dogodek, seja) => {
  const nov = seja?.user.id ?? null
  if (uporabnik !== undefined && nov !== uporabnik) pozabiIzbranost()
  uporabnik = nov
})

/** Ali sme gledalec videti izbranost; do odgovora `false` (nič ne utripne). */
export function useVidiIzbranost(): boolean {
  const [vidi, setVidi] = useState(false)
  useEffect(() => {
    let velja = true
    const osvezi = () => void preberi().then((v) => velja && setVidi(v))
    poslusalci.add(osvezi)
    osvezi()
    return () => {
      velja = false
      poslusalci.delete(osvezi)
    }
  }, [])
  return vidi
}

export interface IzbranostLige {
  player_id: number
  competition_id: number
  liga: string
  sezona: string | null
  krog: number | null
  zaklenjen: string | null
  ekip: number | null
  owners: number | null
  lastni: boolean
}

/** Razčlenitev po ligah osebe (`izbranost_igralca`); prazno, kdor ne sme. */
export async function izbranostIgralca(igralecId: number): Promise<IzbranostLige[]> {
  const { data, error } = await supabase.rpc('izbranost_igralca', { p_player_id: igralecId })
  if (error) return []
  return (data ?? []) as IzbranostLige[]
}

export interface EkipaZIgralcem {
  fantasy_team_id: number
  ime: string
  competition_id: number
  competition_slug: string
  liga: string
  krog: number
  skupaj: number
}

/**
 * Ekipe, ki imajo igralca v zadnjem zaklenjenem krogu (`ekipe_z_igralcem`,
 * 20261109130000): le preverjen na svojem profilu in admin, le nad pragom,
 * brez hišnih. Stran z največ 50 ekipami; prazno, kdor ne sme.
 */
export async function ekipeZIgralcem(igralecId: number, od = 0, koliko = 25): Promise<EkipaZIgralcem[]> {
  const { data, error } = await supabase.rpc('ekipe_z_igralcem', { p_player_id: igralecId, p_od: od, p_koliko: koliko })
  if (error) return []
  return data ?? []
}

let zivo: Promise<boolean> | null = null

/** Funkcije v bazi ni (PostgREST ali Postgres): objava še ni prišla. */
const funkcijeNi = (kodaNapake?: string) => kodaNapake === 'PGRST202' || kodaNapake === '42883'

/**
 * Ali sta funkciji izbranosti (`vidi_izbranost`, `ekipe_z_igralcem`) v bazi.
 * Odgovor je za vsakogar enak (ne odloča, kdo sme videti), zato lahko javna
 * stran o preverjenem profilu pokaže korist "kdo te je izbral" šele, ko je
 * baza obeh funkcij zares dobila; brez njiju (nepopolna objava) korist izpusti.
 * `ekipe_z_igralcem` je le za prijavljene: obiskovalcu brez seje vrne zavrnjen
 * dostop (42501), kar pomeni, da funkcija obstaja. Le "ni funkcije" je "ni živo";
 * drugo napako (omrežje) štejemo kot ne živo in ne zapomnimo.
 */
export function izbranostJeZivo(): Promise<boolean> {
  if (zivo) return zivo
  const pot = Promise.all([
    supabase.rpc('vidi_izbranost'),
    supabase.rpc('ekipe_z_igralcem', { p_player_id: 0, p_od: 0, p_koliko: 1 }),
  ]).then(
    ([a, b]) => {
      const dokoncno = [a, b].every((r) => !r.error || funkcijeNi(r.error.code) || r.error.code === '42501')
      const zares = [a, b].every((r) => !r.error || r.error.code === '42501')
      if (!dokoncno) zivo = null
      return zares
    },
    () => {
      zivo = null
      return false
    },
  )
  zivo = pot
  return pot
}

/** Odstotek, zaokrožen; brez imenovalca ali števca ga ni. */
export function odstotek(owners: number | null, ekip: number | null): number | null {
  if (owners == null || !ekip) return null
  return Math.round((owners / ekip) * 100)
}
