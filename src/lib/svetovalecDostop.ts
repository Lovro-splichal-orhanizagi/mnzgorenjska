// Kdo vidi Svetovalca ekipe: preverjen igralec (potrjen zahtevek za profil in
// pravica `je_preverjen`), ko stikalo `svetovalec_ekipe` ni '0'.
//
// Dokler preverjeni profili niso odprti (`vidi_preverjene` vrne false), ne
// kažemo niti vabila k preverjanju: vodil bi na stran, ki ničesar ne ponuja.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { svetovalecVklopljen } from './svetovalecEkipe'

export type DostopSvetovalca = 'nalaga' | 'skrit' | 'zaklenjen' | 'odprt'

export function useDostopSvetovalca(uporabnikId: string | null): DostopSvetovalca {
  const [dostop, setDostop] = useState<DostopSvetovalca>('nalaga')

  useEffect(() => {
    if (!uporabnikId) {
      setDostop('skrit')
      return
    }
    let velja = true
    void (async () => {
      try {
        const { data: stikalo } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'svetovalec_ekipe')
          .maybeSingle()
        if (!svetovalecVklopljen(stikalo)) return velja && setDostop('skrit')
        const { data: vidi } = await supabase.rpc('vidi_preverjene')
        if (vidi !== true) return velja && setDostop('skrit')
        const { data: zahtevki } = await supabase
          .from('zahtevki_igralca')
          .select('player_id')
          .eq('user_id', uporabnikId)
          .eq('status', 'potrjen')
          .limit(5)
        const preverjeni = await Promise.all(
          (zahtevki ?? []).map((z) => supabase.rpc('je_preverjen', { p_player_id: z.player_id })),
        )
        if (velja) setDostop(preverjeni.some((p) => p.data === true) ? 'odprt' : 'zaklenjen')
      } catch {
        // Napaka omrežja: svetovalec je dodatek, stran deluje brez njega.
        if (velja) setDostop('skrit')
      }
    })()
    return () => {
      velja = false
    }
  }, [uporabnikId])

  return dostop
}
