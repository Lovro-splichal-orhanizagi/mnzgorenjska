// Predstavitev potrjenega igralca: značka, vzdevek, opis in omrežja.
// Ista na profilu (PrevzemIgralca) in v plošči ob izbiri (InfoIgralca).
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { NASLOV_OMREZJA } from '../lib/prevzem'
import { t } from '../i18n'

export type Potrdil = 'admin' | 'klub' | 'soigralci'
export type Omrezje = 'instagram' | 'tiktok' | 'facebook'
export const OMREZJA: Omrezje[] = ['instagram', 'tiktok', 'facebook']

export interface Predstavitev {
  player_id: number
  vzdevek: string | null
  opis: string | null
  instagram: string | null
  tiktok: string | null
  facebook: string | null
  fotografija: string | null
  skrij_ime: boolean
}

/**
 * Potrditev in predstavitev igralca (`potrjeni_igralci` → `profil_igralca`
 * glavne vrstice, skupna povezanim). Null, če igralec ni potrjen;
 * undefined med nalaganjem.
 */
export function usePredstavitev(igralecId: number | null | undefined) {
  const [stanje, setStanje] = useState<
    { glavni: number; potrdil: Potrdil; profil: Predstavitev | null } | null | undefined
  >(undefined)
  useEffect(() => {
    if (igralecId == null) return setStanje(null)
    let veljavno = true
    setStanje(undefined)
    ;(async () => {
      const { data: p } = await supabase
        .from('potrjeni_igralci')
        .select('glavni_player_id, potrdil')
        .eq('player_id', igralecId)
        .maybeSingle()
      if (!veljavno) return
      if (p?.glavni_player_id == null) return setStanje(null)
      const { data: pr } = await supabase.from('profil_igralca').select('*').eq('player_id', p.glavni_player_id).maybeSingle()
      if (!veljavno) return
      setStanje({ glavni: p.glavni_player_id, potrdil: p.potrdil as Potrdil, profil: (pr ?? null) as Predstavitev | null })
    })()
    return () => {
      veljavno = false
    }
  }, [igralecId])
  return stanje
}

export default function PredstavitevIgralca({
  potrdil,
  profil,
  children,
}: {
  potrdil: Potrdil
  profil: Predstavitev | null
  /** Dodatno pod predstavitvijo (npr. gumb za urejanje na profilu). */
  children?: ReactNode
}) {
  const omrezja = profil ? OMREZJA.filter((o) => profil[o]) : []
  return (
    <div className="kartica space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="znacka bg-sky-400/20 text-sky-200" title={t('igralci.prevzem.znackaOpis')}>
          <span aria-hidden="true">✓</span> {t(`igralci.prevzem.znacka.${potrdil}`)}
        </span>
        {profil?.vzdevek && <span className="font-bold text-slate-100">"{profil.vzdevek}"</span>}
      </div>
      {profil?.opis && <p className="whitespace-pre-line break-words text-sm text-slate-300">{profil.opis}</p>}
      {omrezja.length > 0 && (
        <ul className="flex flex-wrap gap-3 text-sm">
          {omrezja.map((o) => (
            <li key={o}>
              <a
                href={NASLOV_OMREZJA[o](profil![o]!)}
                target="_blank"
                rel="nofollow noopener noreferrer ugc"
                className="text-gnl-300 hover:underline"
              >
                {t(`igralci.prevzem.${o}`)}: @{profil![o]}
              </a>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )
}
