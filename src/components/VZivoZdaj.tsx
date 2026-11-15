// Pas »V živo zdaj« na naslovnici in strani kluba (SLF-477): tekme, ki imajo
// prav zdaj viden prenos v živo. Brez prenosov se ne pokaže.
import { useEffect, useState } from 'react'
import { Link } from './Povezava'
import Grb from './Grb'
import { t } from '../i18n'
import { useTekmovanje } from '../lib/tekmovanje'
import { osvezi, prenosiVZivo, zastarelo, type PrenosVZivo } from '../lib/prenosi'

export default function VZivoZdaj({ teamId }: { teamId?: number }) {
  const [vse, setTekme] = useState<PrenosVZivo[]>([])
  // Le lige gledane države (docs/drzava-obiskovalca.md); stran kluba pokaže svoje.
  const lige = useTekmovanje().tekmovanja
  const tekme = teamId ? vse : vse.filter((m) => lige.some((l) => l.id === m.competition_id))
  useEffect(() => {
    let veljavno = true
    const krog = async () => {
      let v = await prenosiVZivo(teamId)
      if (veljavno && v.some((x) => zastarelo(x.osvezeno_at)) && (await osvezi())) v = await prenosiVZivo(teamId)
      if (veljavno) setTekme(v)
    }
    void krog()
    const ura2 = window.setInterval(() => void krog(), 2 * 60 * 1000)
    return () => {
      veljavno = false
      window.clearInterval(ura2)
    }
  }, [teamId])

  if (!tekme.length) return null
  return (
    <section className="space-y-3" aria-label={t('prenosi.pas.naslov')}>
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">{t('prenosi.pas.naslov')}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold uppercase text-white">
          <span aria-hidden="true">●</span> {t('prenosi.vZivo')}
        </span>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {tekme.map((m) => (
          <Link
            key={m.match_id}
            to={`/match/${m.match_id}`}
            className="kartica kartica-hover w-72 shrink-0 snap-start overflow-hidden"
          >
            <div className="relative aspect-video bg-gradient-to-b from-emerald-800 to-emerald-950">
              <span className="absolute inset-x-0 top-0 truncate bg-gradient-to-b from-slate-200/90 to-slate-200/0 p-2 text-sm font-semibold text-slate-900">
                {m.naslov}
              </span>
              <span className="absolute left-1/2 top-1/2 grid h-10 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-rose-600 text-xl text-white" aria-hidden="true">
                ▶
              </span>
              <span className="absolute bottom-2 left-2 flex items-center gap-2 text-sm text-white">
                <span className="rounded bg-rose-600 px-1.5 py-0.5 text-xs font-bold">LIVE</span>
                {m.gledalcev != null && t('prenosi.gleda', { n: m.gledalcev })}
              </span>
            </div>
            <div className="space-y-1 p-3">
              {[
                { ime: m.home_short ?? m.home_name, cel: m.home_name, logo: m.home_logo, goli: m.home_goals },
                { ime: m.away_short ?? m.away_name, cel: m.away_name, logo: m.away_logo, goli: m.away_goals },
              ].map((k) => (
                <div key={k.cel} className="flex items-center gap-2 font-semibold">
                  <Grb ime={k.cel} kratko={k.ime} logo={k.logo} velikost={20} />
                  <span className="truncate">{k.ime}</span>
                  <span className="ml-auto tabular-nums">{k.goli ?? ''}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400">
                {m.liga} · {t('prenosi.pas.prenosov', { n: m.prenosov })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
