import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t, tx } from '../i18n'

interface Vrstica {
  glasov_pozicij: number | null
  glasov_asistenc: number | null
  obveljalo_pozicij: number | null
  obveljalo_asistenc: number | null
}

/**
 * Koliko je človek prispeval k statistiki.
 *
 * Pozicije in asistence za te lige NE OBSTAJAJO, dokler jih skupnost ne
 * ustvari — uradni zapisnik označi samo vratarja. Vse drugo je delo
 * uporabnikov, ki pa tega doslej ni videl nihče, niti oni sami.
 *
 * Štejemo tudi, koliko glasov je OBVELJALO: oddan glas je namera, obveljal
 * glas je sprememba v podatkih, ki jih vidi vsa liga.
 */
export default function Prispevek() {
  const { session } = useAuth()
  const [v, setV] = useState<Vrstica | null>(null)

  useEffect(() => {
    if (!session) return
    let veljavno = true
    ;(async () => {
      const { data } = await supabase
        .from('moj_prispevek')
        .select('glasov_pozicij, glasov_asistenc, obveljalo_pozicij, obveljalo_asistenc')
        .eq('voter_id', session.user.id)
        .maybeSingle()
      if (veljavno) setV((data as Vrstica) ?? null)
    })()
    return () => {
      veljavno = false
    }
  }, [session])

  const st = (x: number | null | undefined) => Number(x ?? 0)
  const skupaj = v ? st(v.glasov_pozicij) + st(v.glasov_asistenc) : 0
  // Brez enega samega glasu kartica ne pove nič — takrat je molk boljši od
  // praznega okvirja z ničlami.
  if (!session || !v || skupaj === 0) return null

  const obveljalo = st(v.obveljalo_pozicij) + st(v.obveljalo_asistenc)

  return (
    <section className="kartica space-y-2 p-4">
      <h2 className="text-lg font-bold">{t('aplikacija.prispevek.naslov')}</h2>
      <p className="text-sm text-slate-400">{t('aplikacija.prispevek.opis')}</p>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-lg bg-white/5 px-3 py-1.5">
          {tx('aplikacija.prispevek.glasoviPozicij', { n: st(v.glasov_pozicij) }, { st: (b) => <span className="font-black tabular-nums text-gnl-300">{b}</span> })}
          {st(v.obveljalo_pozicij) > 0 && (
            <span className="text-slate-500">
              {t('aplikacija.prispevek.obveljalo', { n: st(v.obveljalo_pozicij) })}
            </span>
          )}
        </span>
        <span className="rounded-lg bg-white/5 px-3 py-1.5">
          {tx('aplikacija.prispevek.glasoviAsistenc', { n: st(v.glasov_asistenc) }, { st: (b) => <span className="font-black tabular-nums text-gnl-300">{b}</span> })}
          {st(v.obveljalo_asistenc) > 0 && (
            <span className="text-slate-500">
              {t('aplikacija.prispevek.obveljalo', { n: st(v.obveljalo_asistenc) })}
            </span>
          )}
        </span>
      </div>
      {obveljalo > 0 && (
        <p className="text-xs text-slate-500">
          {obveljalo === 1
            ? t('aplikacija.prispevek.obveljalEn')
            : t('aplikacija.prispevek.obveljaloVec', { n: obveljalo })}
        </p>
      )}
    </section>
  )
}
