// Pivski zid (/beers): lestvica podpornikov z Buy Me a Coffee, vsak s svojimi
// sporočili ob imenu.
//
// Podatke da `javna_piva()` (supabase/migrations/…_pivski_zid.sql): ime,
// število piv, sporočilo, datum. Zneskov baza ne pozna, zato jih tu ni.
// Sporočilo je navadno besedilo (baza ga počisti); izrišemo ga kot besedilo
// z `whitespace-pre-line`, nikoli kot HTML.
import { useEffect, useMemo, useState } from 'react'
import Pivo from '../components/Pivo'
import { supabase } from '../lib/supabase'
import { useNaslov } from '../lib/naslov'
import { lestvicaPodpornikov, vsehPiv, type JavnoPivo } from '../lib/piva'
import { t } from '../i18n'

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
                <li key={p.ime ?? '—anonimni'} className="flex gap-3 px-3 py-3 sm:px-4">
                  <span className="w-7 shrink-0 pt-0.5 text-center text-sm font-bold tabular-nums text-slate-500">
                    {p.ime === null ? '🙈' : (MEDALJE[i] ?? `${i + 1}.`)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-baseline gap-3">
                      <span
                        className={`min-w-0 flex-1 truncate font-semibold ${p.ime === null ? 'italic text-slate-400' : ''}`}
                      >
                        {p.ime ?? t('aplikacija.pivo.stran.anonimni')}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-gnl-300">
                        {t('aplikacija.pivo.stran.piv', { n: p.piv })}
                      </span>
                    </div>
                    {/* Sporočila podpornika: navadno besedilo, nikoli HTML. */}
                    {p.sporocila.map((s, j) => (
                      <p
                        key={j}
                        className="whitespace-pre-line break-words border-l-2 border-gnl-400/40 pl-2.5 text-sm text-slate-200"
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}
