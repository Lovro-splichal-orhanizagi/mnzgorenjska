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

  if (napakaV) return <p className="opozorilo">{napakaV}</p>
  if (!vrzeli) return <Nalaganje />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black naslov sm:text-3xl">{t('vrzeli.naslov')}</h1>
      <p className="text-sm text-slate-400">{t('vrzeli.opis')}</p>
      {vrzeli.length === 0 ? (
        <p className="kartica p-5 text-center text-slate-400">{t('vrzeli.prazno')}</p>
      ) : (
        <ul className="kartica divide-y divide-white/5 overflow-hidden">
          {vrzeli.map((v, i) => (
            <li key={`${v.liga}-${v.vrsta}-${v.skupina}-${v.player_id ?? i}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2 text-slate-100">
                  {v.skupina && <span className={`znacka poz-${v.skupina}`}>{t(`poz.${v.skupina}` as Kljuc)}</span>}
                  {opisVrzeli(v)}
                </span>
                <span className="block text-xs text-slate-400">{v.liga}</span>
              </span>
              {v.skupina && (
                <Link to={`/?skupina=${v.skupina}&raven=ista_ali_nizja`} className="gumb-tih px-3 py-1 text-sm">{t('vrzeli.isci')} →</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
    </div>
  )
}
