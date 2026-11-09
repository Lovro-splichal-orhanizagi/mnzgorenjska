// Starostna skupina državne lestvice (SLF-366).
//
// Lige imajo v bazi `starostna_skupina` (`clani`, `u19`, `pod_u19`; neznano =
// null). Državna lestvica ima dva pogleda, ki se ne mešata:
//   glavna  člani + U19
//   mladi   U18 in mlajši (kadeti U17, U15, …)
// Skupina je oznaka LIGE, ne trditev o letih posameznega igralca. Neznana
// skupina ni v nobenem pogledu.

export type Starost = 'glavna' | 'mladi'

/** Vrednost `?starost=`; vse razen `mladi` je glavna skupina. */
export function starostIzNaslova(v: string | null | undefined): Starost {
  return v === 'mladi' ? 'mladi' : 'glavna'
}

/** Ali liga s to skupino sodi v pogled. Neznana skupina (null) ne sodi nikamor. */
export function jeVStarosti(skupinaLige: string | null | undefined, starost: Starost): boolean {
  if (skupinaLige === 'clani' || skupinaLige === 'u19') return starost === 'glavna'
  if (skupinaLige === 'pod_u19') return starost === 'mladi'
  return false
}

/** Povezava na pogled z ohranjenimi parametri (liga `t`, zavihek `pogled`, …). */
export function naslovStarosti(iskanje: URLSearchParams, starost: Starost): URLSearchParams {
  const novo = new URLSearchParams(iskanje)
  if (starost === 'mladi') novo.set('starost', 'mladi')
  else novo.delete('starost')
  return novo
}

/** Baza še nima stolpca ali funkcij te migracije (koda je prišla pred njo). */
export function jeNiPripravljeno(napaka: { code?: string; message: string } | null): boolean {
  if (!napaka) return false
  return (
    ['42703', '42883', '42P01', 'PGRST202', 'PGRST204'].includes(napaka.code ?? '') ||
    /starostna_skupina|vrh_drzave|vrh_klubov_drzave/.test(napaka.message)
  )
}
