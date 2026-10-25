// Lijak začetka: dnevni seštevki korakov (prazna ekipa → predlog → prva
// shramba), brez uporabnika ali naprave. Isti korak se v isti seji šteje
// enkrat na dan, da osvežitev strani ne napihne številk.
import { supabase } from './supabase'
import { dogodek } from './analitika'

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
  | 'pivo_prikaz'

/** Kje je gumb "Časti pivo"; mora se ujemati s seznamom v `zabelezi_korak`. */
export type PivoVir = 'noga' | 'domov' | 'domov-lestvica' | 'zid' | 'okno'

export function zabeleziKorak(korak: KorakLijaka | `${'pivo' | 'pivo_prikaz'}:${PivoVir}`) {
  const kljuc = `slff-lijak-${korak}-${new Date().toISOString().slice(0, 10)}`
  try {
    if (sessionStorage.getItem(kljuc)) return
    sessionStorage.setItem(kljuc, '1')
  } catch {}
  // Korak z virom je le razčlenitev skupnega: Umami dobi le skupnega, da ne šteje dvakrat.
  if (!korak.includes(':')) dogodek(korak)
  // Klic se izvede šele ob then — `void supabase.rpc(…)` ne pošlje ničesar.
  supabase.rpc('zabelezi_korak', { p_korak: korak }).then(
    () => {},
    () => {},
  )
}

/** Prikaz ali klik gumba "Časti pivo": skupni korak in isti korak z virom. */
export function zabeleziPivo(korak: 'pivo' | 'pivo_prikaz', vir: PivoVir) {
  zabeleziKorak(korak)
  zabeleziKorak(`${korak}:${vir}`)
}
