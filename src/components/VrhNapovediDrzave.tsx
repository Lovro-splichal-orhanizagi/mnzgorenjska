import { useEffect, useState } from 'react'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['lestvica_napovedi_drzave']['Returns'][number]

/**
 * Naslovnica: vrh 5 napovedovalcev države v sezoni, s povezavo na zavihek
 * Napovedi državne lestvice. Brez ocenjene napovedi (ali če baza funkcije še
 * nima) se ne pokaže. Namenoma brez `NapovediMiniLige`, da naslovnica ne
 * vleče obrazca napovedi v glavni sveženj.
 */
export default function VrhNapovediDrzave({ drzava }: { drzava: string }) {
  const [vrstice, setVrstice] = useState<Vrstica[]>([])

  useEffect(() => {
    setVrstice([])
    let veljavno = true
    supabase.rpc('lestvica_napovedi_drzave', { p_drzava: drzava, p_limit: 5 }).then(({ data }) => {
      // Lastna vrstica pod vrhom pride za njim; tu le vrh.
      if (veljavno) setVrstice((data ?? []).slice(0, 5))
    })
    return () => {
      veljavno = false
    }
  }, [drzava])

  if (!vrstice.some((v) => v.ocenjenih > 0)) return null

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold">{t('lestvice.slovenija.vrhNapovedi')}</h2>
        <Link
          to="/national?pogled=napovedi"
          className="shrink-0 text-sm font-semibold text-gnl-300 hover:text-gnl-200"
        >
          {t('lestvice.slovenija.vrhNapovediVse')} →
        </Link>
      </div>
      <ol className="kartica divide-y divide-white/10">
        {vrstice.map((v, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 px-3 py-2 text-sm ${v.je_moj ? 'bg-gnl-500/10' : ''}`}
          >
            <span className={`w-4 text-center font-bold ${v.mesto === 1 ? 'text-amber-300' : 'text-slate-500'}`}>
              {v.mesto}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {v.display_name}
              {v.je_moj && <span className="ml-1.5 text-xs font-normal text-gnl-300">({t('lestvice.napovediLige.ti')})</span>}
            </span>
            {v.kralj && (
              <span role="img" aria-label={t('lestvice.napovedi.kraljOznaka')} title={t('lestvice.napovedi.kraljOznaka')}>
                👑
              </span>
            )}
            <span className="shrink-0 font-bold tabular-nums text-gnl-300">{v.tocke}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
