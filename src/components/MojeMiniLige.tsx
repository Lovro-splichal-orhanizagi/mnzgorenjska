import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke } from '../lib/pomozno'
import { razvrstiMini, type MiniVrstica } from '../lib/miniLige'
import { t } from '../i18n'

interface Vrstica {
  id: number
  name: string
  mesto: number
  ekip: number
  tocke: number
  vodilni: string | null
}

/**
 * Moje mini lige na Lestvici: kje sem med svojimi.
 *
 * Lestvica dvanajstih tujcev ni igra; trije prijatelji so. Zato mini lige
 * stojijo NAD javno lestvico, s položajem, ne le imenom — človek pride
 * pogledat prav to. Brez mini lige pokaže povabilo, ne praznine.
 */
export default function MojeMiniLige({ ekipaId }: { ekipaId: number | null }) {
  const [vrstice, setVrstice] = useState<Vrstica[] | null>(null)

  useEffect(() => {
    if (!ekipaId) {
      setVrstice(null)
      return
    }
    let veljavno = true
    ;(async () => {
      const { data: clanstva } = await supabase
        .from('mini_liga_clani')
        .select('mini_liga_id')
        .eq('fantasy_team_id', ekipaId)
      const idji = [...new Set((clanstva ?? []).map((c) => c.mini_liga_id as number))]
      if (!idji.length) {
        if (veljavno) setVrstice([])
        return
      }
      const [{ data: lige }, { data: lestvice }] = await Promise.all([
        supabase.from('mini_lige').select('id, name').in('id', idji),
        supabase
          .from('mini_liga_lestvica')
          .select('mini_liga_id, fantasy_team_id, team_name, owner_name, total_points, rounds_played, points_per_round, competition_short, federation_short')
          .in('mini_liga_id', idji),
      ])
      if (!veljavno) return
      const izid: Vrstica[] = (lige ?? []).map((l) => {
        const vse = ((lestvice ?? []) as (MiniVrstica & { mini_liga_id: number })[]).filter(
          (v) => v.mini_liga_id === l.id,
        )
        const urejene = razvrstiMini(vse)
        const moja = urejene.find((v) => v.fantasy_team_id === ekipaId)
        return {
          id: l.id as number,
          name: l.name as string,
          mesto: moja?.mesto ?? 0,
          ekip: urejene.length,
          tocke: Number(moja?.total_points ?? 0),
          vodilni: urejene[0]?.team_name ?? null,
        }
      })
      setVrstice(izid)
    })()
    return () => {
      veljavno = false
    }
  }, [ekipaId])

  if (!ekipaId || vrstice === null) return null

  if (vrstice.length === 0)
    return (
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-slate-400">
        <span>{t('lestvice.mojeMiniLige.povabilo')}</span>
        <Link to="/mini-leagues" className="font-semibold text-gnl-300 hover:underline">
          {t('lestvice.mojeMiniLige.ustvari')} →
        </Link>
      </p>
    )

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">{t('lestvice.mojeMiniLige.naslov')}</h2>
        <Link to="/mini-leagues" className="text-xs text-slate-500 hover:text-slate-300">
          {t('lestvice.mojeMiniLige.vse')}
        </Link>
      </div>
      <ul className="divide-y divide-white/10">
        {vrstice.map((v) => (
          <li key={v.id} className="relative flex items-center gap-3 py-2">
            <span
              className={`w-7 shrink-0 text-center text-sm font-bold ${
                v.mesto === 1 ? 'text-gnl-300' : 'text-slate-400'
              }`}
            >
              {v.mesto ? `${v.mesto}.` : '—'}
            </span>
            <div className="min-w-0 flex-1">
              <Link to={`/mini-leagues?liga=${v.id}`} className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-300">
                {v.name}
              </Link>
              <div className="truncate text-xs text-slate-500">
                {t('lestvice.odEkip', { n: v.ekip })}
                {v.mesto > 1 && v.vodilni ? t('lestvice.mojeMiniLige.vodi', { ime: v.vodilni }) : ''}
                {v.ekip <= 1 && (
                  <Link to={`/mini-leagues?liga=${v.id}`} className="relative z-10 ml-1 font-semibold text-gnl-300 hover:underline">
                    {t('lestvice.mojeMiniLige.sam')}
                  </Link>
                )}
              </div>
            </div>
            <span className="shrink-0 font-bold tabular-nums text-gnl-300">
              {formatirajTocke(v.tocke)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
