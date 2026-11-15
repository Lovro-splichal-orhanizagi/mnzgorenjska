// Sledenje napakam z Bugsinkom na našem strežniku (SLF-245, docs/napake.md).
// Brez SDK-ja (package.json je del pripete zaprtosti): neujete izjeme,
// zavrnjene obljube in NapakaOprijem gredo kot Sentryjeva ovojnica prek
// slff.eu/n/ (Caddy pusti skozi le sprejem dogodkov). Brez VITE_NAPAKE_DSN
// (lokalno, CI) se ne zgodi nič. Vsak dogodek gre skozi pocistiDogodek: brez
// uporabnika, piškotkov, glav, poizvedb, e-naslovov in žetonov.
import { pocisti, pocistiDogodek } from '../../supabase/functions/_shared/napake-cistilo.ts'
import { idDogodka, naslov, okvirji, omejevalnik, zahteva } from '../../supabase/functions/_shared/napake-ovojnica.ts'

const DSN = import.meta.env.VITE_NAPAKE_DSN

// Šum, ki ni naša napaka: ResizeObserver, stari kosi po objavi (main.tsx stran naloži znova).
const PREZRI = [
  /ResizeObserver loop/,
  /Failed to fetch dynamically imported module/,
  /Importing a module script failed/,
  /error loading dynamically imported module/,
]

const smem = omejevalnik(10)
const videno = new Set<string>()

export function sestaviDogodek(napaka: unknown, kje?: string) {
  const e = napaka instanceof Error ? napaka : null
  const frames = e?.stack ? okvirji(e.stack) : []
  return pocistiDogodek({
    event_id: idDogodka(),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    release: document.querySelector<HTMLMetaElement>('meta[name="slff-commit"]')?.content || undefined,
    environment: import.meta.env.VITE_NAPAKE_OKOLJE || 'production',
    request: { url: location.origin + location.pathname },
    tags: kje ? { kje } : undefined,
    exception: {
      values: [{
        type: e?.name || 'Error',
        value: (e ? e.message : String(napaka ?? '')).slice(0, 500),
        stacktrace: frames.length ? { frames } : undefined,
      }],
    },
  })
}

function posli(napaka: unknown, kje?: string) {
  if (!DSN) return
  try {
    const sporocilo = napaka instanceof Error ? napaka.message : String(napaka ?? '')
    if (PREZRI.some((v) => v.test(sporocilo))) return
    // Napake razširitev brskalnika niso naše.
    if (napaka instanceof Error && /(chrome|moz|safari-web)-extension:/.test(napaka.stack ?? '')) return
    // Ista napaka v istem zavihku le enkrat (zanka ponavljanja ne poje meje).
    const kljucNapake = pocisti(`${kje ?? ''}|${sporocilo}`)
    if (videno.has(kljucNapake) || !smem()) return
    videno.add(kljucNapake)
    const { url, kljuc } = naslov(DSN)
    void fetch(url, { ...zahteva(kljuc, sestaviDogodek(napaka, kje), 'slff-web/1'), keepalive: true, credentials: 'omit' })
      .catch(() => {})
  } catch { /* sledenje nikoli ne podre strani */ }
}

export function pripraviSledenjeNapak() {
  if (!DSN || typeof window === 'undefined') return
  window.addEventListener('error', (e) => posli(e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => posli(e.reason))
}

/** Ujeta napaka (npr. NapakaOprijem); tiho, če sledenje ni vklopljeno. */
export function prijaviNapako(napaka: unknown, kje?: string) {
  posli(napaka, kje)
}
