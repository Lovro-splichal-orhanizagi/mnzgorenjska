import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, type Klub } from './baza'
import { t } from './besede'

interface Seja {
  seja: Session | null
  /** Seja še ni znana ali stanje kluba prijavljenega še ni prebrano. */
  nalaga: boolean
  klub: Klub | null
  /** Branje kluba je padlo: ne vemo, ali je klub, zato ga ne obravnavaj kot "ni kluba". */
  napakaKluba: boolean
  osvezi: () => Promise<void>
}

const Kontekst = createContext<Seja>({ seja: null, nalaga: true, klub: null, napakaKluba: false, osvezi: async () => {} })

export function SejaProvider({ children }: { children: ReactNode }) {
  const [seja, setSeja] = useState<Session | null>(null)
  const [sejaZnana, setSejaZnana] = useState(false)
  const [klub, setKlub] = useState<Klub | null>(null)
  const [klubZa, setKlubZa] = useState<string | null>(null)
  const [napakaKluba, setNapakaKluba] = useState(false)
  const uid = seja?.user.id ?? null

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSeja(data.session)
      setSejaZnana(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_dogodek, s) => setSeja(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const osvezi = useCallback(async () => {
    const { data, error } = await supabase.rpc('scout_moj_klub')
    if (error) return
    setKlub((data as unknown as Klub | null) ?? null)
    setNapakaKluba(false)
  }, [])

  useEffect(() => {
    if (!uid) {
      setKlub(null)
      setNapakaKluba(false)
      return
    }
    let velja = true
    void (async () => {
      // Klubski račun nastane ob prvi prijavi z uradnim naslovom kluba, kot na slff.eu.
      await supabase.rpc('uveljavi_klubski_racun')
      const { data, error } = await supabase.rpc('scout_moj_klub')
      if (!velja) return
      setKlub(error ? null : ((data as unknown as Klub | null) ?? null))
      setNapakaKluba(Boolean(error))
      setKlubZa(uid)
    })()
    return () => {
      velja = false
    }
  }, [uid])

  const nalaga = !sejaZnana || (uid !== null && klubZa !== uid)
  return <Kontekst.Provider value={{ seja, nalaga, klub, napakaKluba, osvezi }}>{children}</Kontekst.Provider>
}

export const useSeja = (): Seja => useContext(Kontekst)

export function Nalaganje() {
  return <p className="text-slate-500">{t('app.nalaganje')}</p>
}

/** Strani s podatki igralcev: sedež kluba z veljavno naročnino (baza to preveri še enkrat). */
export function ZahtevaSedez({ children }: { children: ReactNode }) {
  const { seja, nalaga, klub, napakaKluba } = useSeja()
  if (nalaga) return <Nalaganje />
  if (!seja) return <Navigate to="/login" replace />
  if (napakaKluba)
    return (
      <>
        <Nalaganje />
        <p className="text-red-700">{t('napaka.splosna')}</p>
      </>
    )
  if (!klub?.sedez || !klub.narocnina?.velja) return <Navigate to="/account" replace />
  return <>{children}</>
}
