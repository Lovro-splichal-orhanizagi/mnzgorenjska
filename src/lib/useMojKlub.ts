// Klub, ki ga zastopa prijavljeni uporabnik (klubski račun, migracija
// 20261013201100). Ločeno od klubskiRacun.ts, ker ta uvaža useAuth, useAuth pa
// klubskiRacun (preverba ob prijavi).
import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { mojKlubskiRacun } from './klubskiRacun'

/** team_id kluba, ki ga zastopa prijavljeni uporabnik, ali null. */
export function useMojKlub(): number | null {
  const { session, klubPreverjen } = useAuth()
  const [klub, setKlub] = useState<number | null>(null)
  useEffect(() => {
    if (!session || !klubPreverjen) return setKlub(null)
    let veljavno = true
    void mojKlubskiRacun().then((s) => {
      if (veljavno) setKlub(s.racun?.team_id ?? null)
    })
    return () => {
      veljavno = false
    }
  }, [session, klubPreverjen])
  return klub
}
