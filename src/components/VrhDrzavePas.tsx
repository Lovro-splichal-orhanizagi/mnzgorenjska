import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke, prikazniIme } from '../lib/pomozno'
import Grb from './Grb'
import { LESTVICE } from './VrhDrzave'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['vrh_drzave']['Returns'][number]

/**
 * Pas pod uvodom naslovnice: vodilni v vsaki lestvici strani Slovenija
 * (VrhDrzave), klik vodi na stran Slovenija na zavihek Igralci. Cel pas je ena
 * povezava (brez gnezdenih povezav na igralce), dokler podatkov ni, ga ni.
 */
export default function VrhDrzavePas({ drzava }: { drzava: string }) {
  const [vrstice, setVrstice] = useState<Vrstica[]>([])

  useEffect(() => {
    let veljavno = true
    supabase.rpc('vrh_drzave', { p_drzava: drzava, p_koliko: 1 }).then(({ data }) => {
      // Napaka ali prazna sezona: pas izostane, naslovnica ostane cela.
      if (veljavno) setVrstice(data ?? [])
    })
    return () => {
      veljavno = false
    }
  }, [drzava])

  const vodilni = LESTVICE.map((l) => ({ l, v: vrstice.find((v) => v.kategorija === l.kljuc) })).filter(
    (x): x is { l: (typeof LESTVICE)[number]; v: Vrstica } => x.v != null,
  )
  if (vodilni.length === 0) return null

  return (
    <Link
      to="/national?pogled=igralci"
      className="group relative block overflow-hidden rounded-3xl p-5 ring-1 ring-white/10 transition hover:ring-gnl-400/50 sm:p-6"
    >
      {/* Isti reflektor kot na strani Slovenija — pas je njen napovednik. */}
      <img
        src="/foto/igrisce.jpg"
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-[50%_25%]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30"
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-black leading-tight text-white drop-shadow-lg sm:text-3xl">
            {t('lestvice.slovenija.vrhNaslov')}
          </h2>
          <span className="text-sm font-bold text-gnl-200 group-hover:text-gnl-100">
            {t('lestvice.slovenija.vrhPoglejVse')}
          </span>
        </div>
        {/* Mobilno vrtiljak kot drugje na naslovnici, od sm naprej trije v vrsti. */}
        <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
          {vodilni.map(({ l, v }) => (
            <li
              key={l.kljuc}
              className="w-[78%] shrink-0 snap-start rounded-2xl bg-slate-950/60 p-3 ring-1 ring-white/10 backdrop-blur sm:w-auto"
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <span aria-hidden>{l.ikona || '👑'}</span> {l.naslov()}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Grb ime={v.team_name} kratko={v.team_short} logo={v.team_logo} velikost={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-white">{prikazniIme(v.full_name)}</div>
                  <div className="truncate text-xs text-slate-400">
                    {v.team_name} · {v.competition_short}
                  </div>
                </div>
                <span className="shrink-0 text-xl font-black tabular-nums text-gnl-300">
                  {l.tocke ? formatirajTocke(v.vrednost) : v.vrednost}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Link>
  )
}
