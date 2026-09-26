// Pomoč pri prijavi: povezava "prijavi se in se vrni sem" in slovenska
// sporočila za napake, ki jih Supabase vrne v angleščini.
import { t } from '../i18n/jedro.ts'

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
  return `/login?nazaj=${encodeURIComponent(pot)}`
}

/** Prevede pogoste napake Supabase Auth; neznano sporočilo vrne nespremenjeno. */
export function napakaPrijave(sporocilo: string): string {
  const s = sporocilo.toLowerCase()
  if (s.includes('invalid login credentials')) return t('racun.napake.napacnaPrijava')
  if (s.includes('email not confirmed'))
    return t('racun.napake.niPotrjen')
  if (s.includes('already registered') || s.includes('already been registered'))
    return t('racun.napake.zeRegistriran')
  if (s.includes('rate limit') || s.includes('too many requests') || s.includes('for security purposes'))
    return t('racun.napake.prevecPoskusov')
  if (s.includes('password') && (s.includes('weak') || s.includes('at least') || s.includes('should be')))
    return t('racun.napake.sibkoGeslo')
  if (s.includes('same password') || s.includes('different from the old'))
    return t('racun.napake.istoGeslo')
  if (s.includes('invalid email') || s.includes('unable to validate email'))
    return t('racun.napake.neveljavenNaslov')
  return sporocilo
}
