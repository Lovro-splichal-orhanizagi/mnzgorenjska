// Sledenje napakam z Bugsinkom na našem strežniku (SLF-245, docs/napake.md).
// SDK Sentry (@sentry/browser) se naloži šele, ko je stran prižgana, v svojem
// kosu; do takrat napake čakajo v vrsti. Pošiljanje gre prek slff.eu/n/ (Caddy
// pusti skozi le sprejem dogodkov). Brez VITE_NAPAKE_DSN (lokalno, CI) se ne
// naloži nič. Vsak dogodek gre skozi pocistiDogodek: brez uporabnika, piškotkov,
// glav, poizvedb, e-naslovov in žetonov.
import { pocisti, pocistiDogodek } from '../../supabase/functions/_shared/napake-cistilo.ts'

const DSN = import.meta.env.VITE_NAPAKE_DSN

type Sentry = typeof import('./sentryJedro')
let sentry: Sentry | null = null
const vrsta: unknown[] = []

// Šum, ki ni naša napaka: ResizeObserver, stari kosi po objavi (main.tsx stran naloži znova).
const PREZRI = [
  /ResizeObserver loop/,
  /Failed to fetch dynamically imported module/,
  /Importing a module script failed/,
  /error loading dynamically imported module/,
]

function zgodnja(e: ErrorEvent | PromiseRejectionEvent) {
  if (vrsta.length < 20) vrsta.push('reason' in e ? e.reason : (e.error ?? e.message))
}

export function pripraviSledenjeNapak() {
  if (!DSN || typeof window === 'undefined') return
  window.addEventListener('error', zgodnja)
  window.addEventListener('unhandledrejection', zgodnja)
  const nalozi = () =>
    void import('./sentryJedro')
      .then((S) => {
        S.init({
          dsn: DSN,
          release: document.querySelector<HTMLMetaElement>('meta[name="slff-commit"]')?.content || undefined,
          environment: import.meta.env.VITE_NAPAKE_OKOLJE || 'production',
          // SDK sam ne zbira uporabnika, piškotkov, glav, teles in poizvedb; beforeSend počisti še ostalo.
          dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
          maxBreadcrumbs: 30,
          ignoreErrors: PREZRI,
          denyUrls: [/^(chrome|moz|safari-web)-extension:/],
          // Brez sej (ping ob vsakem obisku): obisk šteje Umami, tu le napake.
          integrations: (privzete) => privzete.filter((i) => i.name !== 'BrowserSession'),
          // Vnosi konzole lahko nosijo karkoli; naslovi klicev gredo skozi čiščenje.
          beforeBreadcrumb: (b) => (b.category === 'console' ? null : pocistiDogodek(b)),
          beforeSend: (d) => pocistiDogodek(d),
        })
        window.removeEventListener('error', zgodnja)
        window.removeEventListener('unhandledrejection', zgodnja)
        sentry = S
        for (const n of vrsta.splice(0)) S.captureException(n)
      })
      .catch(() => {})
  if ('requestIdleCallback' in window) window.requestIdleCallback(nalozi, { timeout: 5000 })
  else setTimeout(nalozi, 2000)
}

/** Ujeta napaka (npr. NapakaOprijem); tiho, če sledenje ni vklopljeno. */
export function prijaviNapako(napaka: unknown, kje?: string) {
  if (!DSN) return
  if (!sentry) {
    if (vrsta.length < 20) vrsta.push(napaka)
    return
  }
  sentry.captureException(napaka, kje ? { tags: { kje: pocisti(kje) } } : undefined)
}
