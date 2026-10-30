// Lijak začetka: dnevni seštevki korakov (prazna ekipa → predlog → prva
// shramba), brez uporabnika ali naprave. Isti korak se v isti seji šteje
// enkrat na dan, da osvežitev strani ne napihne številk.
import { supabase } from './supabase'
import { dogodek } from './analitika'
import { platforma } from './platforma'

export type KorakLijaka =
  | 'prazna_ekipa'
  | 'predlog'
  | 'prva_shramba'
  | 'sestavi_iz_maila'
  | 'pivo'
  | 'vodic_zacetek'
  | 'vodic_preskok'
  | 'vodic_konec'
  | 'osnutek_brez_prijave'
  | 'osnutek_shranjen'
  | 'igralec_cta'
  | 'kartica_deljena'
  | 'pivo_okno'
  | 'pivo_okno_ekipa'
  | 'pivo_okno_krog'
  | 'pivo_klik_ekipa'
  | 'pivo_klik_krog'
  | 'pivo_okno_zaprto'
  | 'push_pas'
  | 'push_pas_zaprt'
  | 'push_dovoljeno'
  | 'push_zavrnjeno'
  | 'aplikacija_odprta'

export function zabeleziKorak(korak: KorakLijaka) {
  const kljuc = `slff-lijak-${korak}-${new Date().toISOString().slice(0, 10)}`
  try {
    if (sessionStorage.getItem(kljuc)) return
    sessionStorage.setItem(kljuc, '1')
  } catch {}
  dogodek(korak)
  // Klic se izvede šele ob then — `void supabase.rpc(…)` ne pošlje ničesar.
  // Prijavljenemu baza zapiše korak še osebno (dejanja_uporabnikov), razen ob "Ne sledi".
  const osebno = typeof navigator === 'undefined' || navigator.doNotTrack !== '1'
  supabase.rpc('zabelezi_korak', { p_korak: korak, p_platforma: platforma(), p_osebno: osebno }).then(
    () => {},
    () => {},
  )
}
