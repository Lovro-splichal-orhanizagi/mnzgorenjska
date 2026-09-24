// Kdo je odsoten — za strani, kjer se izbira ekipa.
//
// Poročilo o poškodbi je bilo doslej vidno samo na strani Odsotnosti in na
// profilu igralca. Kdor je sestavljal ekipo, tega ni videl: da bi izvedel za
// poškodbo, bi moral klikniti vsakega igralca posebej.
//
// Šteje ZADNJE poročilo: "vrnitev" pomeni, da je spet na voljo, in poročilo,
// starejše od 30 dni, ne pomeni nič — to počisti že pogled `odsotni_igralci`.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { t } from '../i18n/jedro.ts'
import type { VrstaPorocila } from '../components/Odsotnost'

export interface Odsotnost {
  kind: VrstaPorocila
  content: string
  created_at: string
}

/** player_id → zadnje poročilo, samo za tiste, ki so zares odsotni. */
export function useOdsotni(ligaId: number | null): Record<number, Odsotnost> {
  const [odsotni, setOdsotni] = useState<Record<number, Odsotnost>>({})

  useEffect(() => {
    if (!ligaId) return
    let veljavno = true
    ;(async () => {
      const { data } = await supabase
        .from('odsotni_igralci')
        .select('player_id, kind, content, created_at')
        .eq('competition_id', ligaId)
      if (!veljavno) return
      const m: Record<number, Odsotnost> = {}
      for (const v of (data ?? []) as Array<{
        player_id: number | null
        kind: string | null
        content: string | null
        created_at: string | null
      }>) {
        // "Vrnitev" je novica, da igralec spet igra — ne odsotnost.
        if (!v.player_id || v.kind === 'vrnitev' || !v.kind) continue
        m[v.player_id] = {
          kind: v.kind as VrstaPorocila,
          content: v.content ?? '',
          created_at: v.created_at ?? '',
        }
      }
      setOdsotni(m)
    })()
    return () => {
      veljavno = false
    }
  }, [ligaId])

  return odsotni
}

/** Kratka oznaka ob imenu; naslov nosi besedilo poročila. */
export function opisOdsotnosti(o: Odsotnost): string {
  const kaj =
    o.kind === 'poskodba'
      ? t('igralci.odsotni.poskodba')
      : o.kind === 'odsotnost'
        ? t('igralci.odsotni.odsoten')
        : t('igralci.odsotni.opomba')
  return o.content ? t('igralci.odsotni.zBesedilom', { kaj, besedilo: o.content }) : kaj
}
