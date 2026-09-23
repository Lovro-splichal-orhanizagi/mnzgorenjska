// Pomoč pri prijavi: povezava "prijavi se in se vrni sem" in slovenska
// sporočila za napake, ki jih Supabase vrne v angleščini.

/**
 * Ali je `nazaj` varna notranja pot. Samo "/…", brez kontrolnih znakov
 * (razčlenjevalnik URL-jev tabulator in nove vrstice izpusti, zato bi
 * "/\t/zlo.si" postal "//zlo.si") in brez "\\". Razčlenjena pot mora ostati
 * na istem izvoru — sicer bi povezava s prijave preusmerila na tujo stran.
 */
export function varnaPot(nazaj: string | null | undefined): string | null {
  if (!nazaj || !nazaj.startsWith('/')) return null
  if (/[\u0000-\u001F\u007F\\]/.test(nazaj)) return null
  try {
    const url = new URL(nazaj, 'https://x.invalid')
    if (url.origin !== 'https://x.invalid') return null
    return url.pathname + url.search + url.hash
  } catch {
    return null
  }
}

/** Povezava na prijavo, ki uporabnika po prijavi vrne na `pot` (pot + iskanje). */
export function povezavaNaPrijavo(pot: string): string {
  return `/prijava?nazaj=${encodeURIComponent(pot)}`
}

/** Prevede pogoste napake Supabase Auth; neznano sporočilo vrne nespremenjeno. */
export function napakaPrijave(sporocilo: string): string {
  const s = sporocilo.toLowerCase()
  if (s.includes('invalid login credentials')) return 'Napačen e-naslov ali geslo.'
  if (s.includes('email not confirmed'))
    return 'E-naslov še ni potrjen. Klikni povezavo v sporočilu, ki smo ti ga poslali.'
  if (s.includes('already registered') || s.includes('already been registered'))
    return 'Ta e-naslov je že registriran. Prijavi se ali ponastavi geslo.'
  if (s.includes('rate limit') || s.includes('too many requests') || s.includes('for security purposes'))
    return 'Preveč poskusov. Počakaj nekaj minut in poskusi znova.'
  if (s.includes('password') && (s.includes('weak') || s.includes('at least') || s.includes('should be')))
    return 'Geslo je prešibko. Uporabi vsaj 6 znakov, najbolje mešanico črk in številk.'
  if (s.includes('same password') || s.includes('different from the old'))
    return 'Novo geslo mora biti drugačno od starega.'
  if (s.includes('invalid email') || s.includes('unable to validate email'))
    return 'E-naslov ni veljaven.'
  return sporocilo
}
