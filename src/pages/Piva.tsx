// Pivski zid (/beers): podporniki z Buy Me a Coffee in njihova sporočila.
//
// Podatke da `javna_piva()` (supabase/migrations/…_pivski_zid.sql): ime,
// število piv, sporočilo, datum. Zneskov baza ne pozna, zato jih tu ni.
// Sporočilo je navadno besedilo (baza ga počisti); izrišemo ga kot besedilo
// z `whitespace-pre-line`, nikoli kot HTML.
import { useEffect, useMemo, useState } from 'react'
import Pivo from '../components/Pivo'
import { supabase } from '../lib/supabase'
import { useNaslov } from '../lib/naslov'
import { lestvicaPodpornikov, vsehPiv, zadnjaSporocila, type JavnoPivo } from '../lib/piva'
import { t, datum } from '../i18n'

const MEDALJE = ['🥇', '🥈', '🥉']

export default function Piva() {
  useNaslov(t('aplikacija.pivo.zid'))
  const [piva, setPiva] = useState<JavnoPivo[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    supabase.rpc('javna_piva').then(({ data, error }) => {
      if (!veljavno) return
      if (error) setNapaka(error.message)
      else setPiva((data ?? []) as JavnoPivo[])
    })
    return () => {
      veljavno = false
    }
  }, [])

  const lestvica = useMemo(() => lestvicaPodpornikov(piva ?? []), [piva])
  const sporocila = useMemo(() => zadnjaSporocila(piva ?? []), [piva])
  const skupaj = useMemo(() => vsehPiv(piva ?? []), [piva])

  return (
    <div className="space-y-6">
      <section className="kartica space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-black naslov sm:text-3xl">
            <span aria-hidden>🍺 </span>
            {t('aplikacija.pivo.zid')}
          </h1>
          <Pivo src="zid" />
        </div>
        <p className="text-sm text-slate-300">{t('aplikacija.pivo.stran.uvod')}</p>
        {skupaj > 0 && (
          <p className="text-sm font-bold text-gnl-300">{t('aplikacija.pivo.stran.skupaj', { n: skupaj })}</p>
        )}
      </section>

      {napaka ? (
        <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
      ) : piva === null ? (
        <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
      ) : piva.length === 0 ? (
        <p className="kartica p-4 text-sm text-slate-400">{t('aplikacija.pivo.stran.prazno')}</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-bold">{t('aplikacija.pivo.stran.lestvica')}</h2>
            <ol className="kartica divide-y divide-white/10 overflow-hidden">
              {lestvica.map((p, i) => (
                <li key={p.ime ?? '—anonimni'} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                  <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-slate-500">
                    {p.ime === null ? '🙈' : (MEDALJE[i] ?? `${i + 1}.`)}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate font-semibold ${p.ime === null ? 'italic text-slate-400' : ''}`}
                  >
                    {p.ime ?? t('aplikacija.pivo.stran.anonimni')}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-gnl-300">
                    {t('aplikacija.pivo.stran.piv', { n: p.piv })}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">{t('aplikacija.pivo.stran.sporocila')}</h2>
            {sporocila.length === 0 ? (
              <p className="text-sm text-slate-400">{t('aplikacija.pivo.stran.brezSporocil')}</p>
            ) : (
              <ul className="space-y-2">
                {sporocila.map((p, i) => (
                  <li key={`${p.created_at}-${i}`} className="kartica space-y-1.5 p-3 sm:p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                      <span className={`font-semibold ${p.ime ? '' : 'italic text-slate-400'}`}>
                        {p.ime ?? t('aplikacija.pivo.stran.anonimno')}
                      </span>
                      <span className="text-xs text-slate-500">
                        <span aria-hidden>🍺 </span>
                        {t('aplikacija.pivo.stran.piv', { n: p.piv })} · {datum(p.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="whitespace-pre-line break-words text-sm text-slate-200">{p.sporocilo}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
