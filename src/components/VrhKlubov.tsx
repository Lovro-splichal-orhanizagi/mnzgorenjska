import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke } from '../lib/pomozno'
import Grb from './Grb'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['vrh_klubov_drzave']['Returns'][number]

const MEDALJE = ['🥇', '🥈', '🥉']

/**
 * Najboljši klubi države: seštevek točk vseh igralcev kluba iz vseh lig
 * (člani in mladinci skupaj). Ne fantasy ekipe, ampak pravi klubi — kdo ima
 * največ igralcev, ki nabirajo točke. Sešteje baza (`vrh_klubov_drzave`).
 */
export default function VrhKlubov({ drzava }: { drzava: string }) {
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [koliko, setKoliko] = useState(50)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    setNalaganje(true)
    supabase.rpc('vrh_klubov_drzave', { p_drzava: drzava, p_koliko: 500 }).then(({ data, error }) => {
      if (!veljavno) return
      setNapaka(error ? error.message : null)
      setVrstice(data ?? [])
      setNalaganje(false)
    })
    return () => {
      veljavno = false
    }
  }, [drzava])

  if (nalaganje) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (vrstice.length === 0)
    return <p className="text-sm text-slate-400">{t('lestvice.slovenija.vrhPrazno')}</p>

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {t('lestvice.slovenija.klubiUvod', { sezona: vrstice[0].season })}
      </p>
      <ol className="kartica divide-y divide-white/10 overflow-hidden">
        {vrstice.slice(0, koliko).map((v) => (
          <li
            key={v.team_id}
            className="relative flex min-h-[52px] items-center gap-2 px-3 py-2 transition hover:bg-white/5 sm:gap-3 sm:px-4"
          >
            <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
              {v.mesto <= 3 ? MEDALJE[v.mesto - 1] : v.mesto}
            </span>
            <Grb ime={v.team_name} kratko={v.team_short} logo={v.team_logo} velikost={26} />
            <div className="min-w-0 flex-1">
              <Link
                to={`/club/${v.team_id}`}
                className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-400"
              >
                {v.team_name}
              </Link>
              <div className="truncate text-xs text-slate-500">
                {t('lestvice.slovenija.klubiIgralcev', { n: v.igralcev })} · {v.lige}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold tabular-nums text-gnl-300">{formatirajTocke(v.tocke)}</div>
              <div className="text-[11px] text-slate-500">
                {v.goli} <span aria-hidden>⚽</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {vrstice.length > koliko && (
        <div className="text-center">
          <button onClick={() => setKoliko(koliko + 50)} className="gumb-tih text-sm">
            {t('lestvice.pokaziVec', { n: vrstice.length - koliko })}
          </button>
        </div>
      )}
      <p className="text-xs text-slate-500">{t('lestvice.slovenija.klubiOpomba')}</p>
    </div>
  )
}
