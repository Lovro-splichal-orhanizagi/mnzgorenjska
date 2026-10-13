// Stran kluba: predstavitev, ki jo uredi klubski račun (migracija 20261013215100),
// in oznaka "Uradni račun kluba". Brez predstavitve in računa ne pokaže ničesar.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import { imeGostitelja } from '../lib/klubskiRacun'

export interface Predstavitev {
  opis: string | null
  spletna_stran: string | null
  instagram: string | null
  facebook: string | null
}

export default function KlubPredstavitev({ klubId, osvezi }: { klubId: number; osvezi: number }) {
  const [p, setP] = useState<Predstavitev | null>(null)
  const [uraden, setUraden] = useState(false)
  useEffect(() => {
    let veljavno = true
    void Promise.all([
      supabase
        .from('klub_predstavitev')
        .select('opis, spletna_stran, instagram, facebook')
        .eq('team_id', klubId)
        .maybeSingle(),
      supabase.rpc('ima_klubski_racun', { p_team_id: klubId }),
    ]).then(([a, b]) => {
      if (!veljavno) return
      setP((a.data as Predstavitev | null) ?? null)
      setUraden(Boolean(b.data))
    })
    return () => {
      veljavno = false
    }
  }, [klubId, osvezi])
  if (!uraden && !p) return null
  return (
    <section className="space-y-1 text-sm">
      {uraden && <span className="znacka bg-sky-400/20 text-sky-200">✓ {t('lestvice.klub.uradniRacun')}</span>}
      {p?.opis && <p className="text-slate-300">{p.opis}</p>}
      <div className="flex flex-wrap gap-3 text-sky-300">
        {p?.spletna_stran && (
          <a href={p.spletna_stran} target="_blank" rel="noreferrer noopener nofollow" className="underline">
            {imeGostitelja(p.spletna_stran)}
          </a>
        )}
        {p?.instagram && (
          <a
            href={`https://instagram.com/${p.instagram}`}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Instagram
          </a>
        )}
        {p?.facebook && (
          <a
            href={`https://facebook.com/${p.facebook}`}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Facebook
          </a>
        )}
      </div>
    </section>
  )
}
