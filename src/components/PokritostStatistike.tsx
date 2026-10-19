import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/baza.types'

export type Pokritost = Pick<Database['public']['Views']['sezone']['Row'],
  'season' | 'odigranih' | 'statistics_complete_matches' | 'statistics_unavailable_matches'>

/** Current/selected league-season coverage, never private policy metadata. */
export function usePokritostStatistike(competitionId: number | null | undefined, season?: string | null) {
  const [odgovor, setOdgovor] = useState<{ kljuc: string; podatki: Pokritost | null } | null>(null)
  const kljuc = `${competitionId}|${season ?? 'current'}`
  useEffect(() => {
    if (!competitionId) return
    let veljavno = true
    let query = supabase.from('sezone')
      .select('season, odigranih, statistics_complete_matches, statistics_unavailable_matches')
      .eq('competition_id', competitionId)
    query = season ? query.eq('season', season) : query.eq('tekoca', true)
    void query.maybeSingle().then(({ data }) => {
      if (veljavno) setOdgovor({ kljuc, podatki: data })
    })
    return () => { veljavno = false }
  }, [competitionId, season, kljuc])
  return odgovor?.kljuc === kljuc ? odgovor.podatki : null
}

/** Archive gaps also qualify an all-season total, even when this season is complete. */
export function usePokritostZgodovine(competitionId: number | null | undefined) {
  const [odgovor, setOdgovor] = useState<{ competitionId: number; podatki: Pokritost[] } | null>(null)
  useEffect(() => {
    if (!competitionId) return
    let veljavno = true
    void supabase.from('sezone')
      .select('season, odigranih, statistics_complete_matches, statistics_unavailable_matches')
      .eq('competition_id', competitionId)
      .gt('statistics_unavailable_matches', 0)
      .order('season', { ascending: false })
      .then(({ data }) => {
        if (veljavno) setOdgovor({ competitionId, podatki: data ?? [] })
      })
    return () => { veljavno = false }
  }, [competitionId])
  return odgovor && odgovor.competitionId === competitionId ? odgovor.podatki : []
}

export function PokritostStatistike({ podatki }: { podatki: Pokritost | null | undefined }) {
  if (!podatki || !podatki.statistics_unavailable_matches) return null
  return (
    <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-200">
      {t('tekme.statistika.delno', {
        sezona: podatki.season,
        popolnih: podatki.statistics_complete_matches,
        odigranih: podatki.odigranih,
        nedosegljivih: podatki.statistics_unavailable_matches,
      })}
    </p>
  )
}

/** A missing observation cannot establish a zero when historical reports are absent. */
export function brezPreverjenihNastopov(podatki: Pokritost | null | undefined, matches: number | null | undefined) {
  return Number(podatki?.statistics_unavailable_matches ?? 0) > 0 && !matches
}

export function NedosegljivaStatistika({ resultKnown = true }: { resultKnown?: boolean }) {
  return (
    <section className="space-y-3">
      <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-200">
        {t(resultKnown ? 'tekme.statistika.nedosegljivo' : 'tekme.statistika.kratko')}
      </p>
      <dl className="kartica grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
        {[t('tekme.statistika.postaveTocke'), t('tekme.tockovanje.pravila.igralniCas'),
          t('tekme.tekma.goliInAsistence'), t('tekme.statistika.kartoni')].map(oznaka => (
          <div key={oznaka}>
            <dt className="text-slate-400">{oznaka}</dt>
            <dd className="mt-1 text-lg text-slate-300" aria-label={t('tekme.statistika.kratko')}>—</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
