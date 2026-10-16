// Povezavi na aplikacijo v trgovinah (noga, Nastavitve). V aplikaciji ju ni.
// Brez uradnih značk trgovin (licenca, slike) — gumb v slogu povezave na Facebook.
import { jeNativno } from '../lib/platforma'
import { t } from '../i18n'

export const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=eu.slff.app'
/** App Store še ni objavljen: ko je, sem naslov in gumb se pokaže sam. */
export const APP_STORE: string | null = null

const SLOG =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnl-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

export default function Trgovine() {
  if (jeNativno()) return null
  return (
    <>
      <a href={GOOGLE_PLAY} target="_blank" rel="noopener noreferrer" className={SLOG}>
        {/* Trikotnik "predvajaj" — ne Googlov znak. */}
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-gnl-400">
          <path d="M5 3.5v17a1 1 0 0 0 1.52.85l13.6-8.5a1 1 0 0 0 0-1.7L6.52 2.65A1 1 0 0 0 5 3.5z" />
        </svg>
        {t('aplikacija.noga.android')}
      </a>
      {APP_STORE && (
        <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className={SLOG}>
          <span aria-hidden>📱</span>
          {t('aplikacija.noga.iphone')}
        </a>
      )}
    </>
  )
}
