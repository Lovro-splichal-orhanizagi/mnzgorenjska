import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Vrzel } from '../baza'
import { napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

/** Opis vrzeli po poziciji; o igralcu le dejstvo iz tekem, brez oznake osebe. */
export function opisVrzeli(v: Pick<Vrzel, 'vrsta' | 'skupina' | 'ime' | 'vrednost'>): string {
  const n = v.vrsta === 'odvisnost' ? Math.round(v.vrednost * 100) : Math.round(v.vrednost)
  return t(`vrzeli.${v.vrsta}` as Kljuc, {
    skupina: v.skupina ? t(`skupina.${v.skupina}` as Kljuc) : '',
    ime: v.ime ?? '',
    n,
  })
}

export function Vrzeli() {
  const [vrzeli, setVrzeli] = useState<Vrzel[] | null>(null)
  const [napakaV, setNapakaV] = useState<string | null>(null)

  useEffect(() => {
    let velja = true
    void supabase.rpc('scout_vrzeli').then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaV(napaka(error))
      else setVrzeli(data ?? [])
    })
    return () => {
      velja = false
    }
  }, [])

  if (napakaV) return <p className="text-red-700">{napakaV}</p>
  if (!vrzeli) return <Nalaganje />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('vrzeli.naslov')}</h1>
      <p className="text-sm text-slate-600">{t('vrzeli.opis')}</p>
      {vrzeli.length === 0 ? (
        <p className="text-slate-500">{t('vrzeli.prazno')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {vrzeli.map((v, i) => (
            <li key={`${v.liga}-${v.vrsta}-${v.skupina}-${v.player_id ?? i}`} className="flex flex-wrap items-baseline justify-between gap-2 p-3">
              <span>
                {opisVrzeli(v)} <span className="text-xs text-slate-500">{v.liga}</span>
              </span>
              {v.skupina && (
                <Link to={`/?skupina=${v.skupina}&raven=ista_ali_nizja`} className="text-sm underline">{t('vrzeli.isci')}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
    </div>
  )
}
