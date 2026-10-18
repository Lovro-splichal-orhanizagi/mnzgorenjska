import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './baza'
import { t } from './besede'

interface Seja {
  seja: Session | null
  /** Seja še ni znana. */
  nalaga: boolean
}

const Kontekst = createContext<Seja>({ seja: null, nalaga: true })

export function SejaProvider({ children }: { children: ReactNode }) {
  const [seja, setSeja] = useState<Session | null>(null)
  const [nalaga, setNalaga] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSeja(data.session)
      setNalaga(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_dogodek, s) => setSeja(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return <Kontekst.Provider value={{ seja, nalaga }}>{children}</Kontekst.Provider>
}

export const useSeja = (): Seja => useContext(Kontekst)

export function Nalaganje() {
  return <p className="animate-pulse text-sm text-slate-400">{t('app.nalaganje')}</p>
}
