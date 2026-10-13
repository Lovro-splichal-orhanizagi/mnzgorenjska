import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { uveljaviKlubskiRacun } from './klubskiRacun'

interface AuthVrednost {
  session: Session | null
  loading: boolean
  /** Preverba klubskega računa za to sejo je končana (glej uveljaviKlubskiRacun). */
  klubPreverjen: boolean
}

const AuthContext = createContext<AuthVrednost>({ session: null, loading: true, klubPreverjen: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Klubski račun: ob vsaki prijavi (in ob odprtju strani s sejo) preveri,
  // ali je potrjen mail uradni naslov kluba. Enkrat na uporabnika na nalaganje.
  // Stran Račun počaka na to preverbo, sicer bi nov klub ob prvi prijavi
  // videl obrazec za prošnjo, preden račun nastane.
  const uid = session?.user.id
  const [preverjenZa, setPreverjenZa] = useState<string | null>(null)
  useEffect(() => {
    if (!uid) return
    let veljavno = true
    void uveljaviKlubskiRacun().then(() => {
      if (veljavno) setPreverjenZa(uid)
    })
    return () => {
      veljavno = false
    }
  }, [uid])
  const klubPreverjen = Boolean(uid) && preverjenZa === uid

  return (
    <AuthContext.Provider value={{ session, loading, klubPreverjen }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthVrednost => useContext(AuthContext)
