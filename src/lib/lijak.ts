// Lijak začetka: dnevni seštevki korakov (prazna ekipa → predlog → prva
// shramba), brez uporabnika ali naprave. Isti korak se v isti seji šteje
// enkrat na dan, da osvežitev strani ne napihne številk.
import { supabase } from './supabase'
import { dogodek } from './analitika'

export type KorakLijaka = 'prazna_ekipa' | 'predlog' | 'prva_shramba' | 'sestavi_iz_maila' | 'pivo'

export function zabeleziKorak(korak: KorakLijaka) {
  const kljuc = `slff-lijak-${korak}-${new Date().toISOString().slice(0, 10)}`
  try {
    if (sessionStorage.getItem(kljuc)) return
    sessionStorage.setItem(kljuc, '1')
  } catch {}
  dogodek(korak)
  // Klic se izvede šele ob then — `void supabase.rpc(…)` ne pošlje ničesar.
  supabase.rpc('zabelezi_korak', { p_korak: korak }).then(
    () => {},
    () => {},
  )
}
