// Časovno omejena kartica z aplikacijama na naslovnici: ~48 ur od objave
// stoji namesto kartice trgovine, nato se trgovina sama vrne. V aplikaciji
// je ni (tam je namestitev brez pomena).
import { jeNativno } from '../lib/platforma'
import { t } from '../i18n'
import { APP_STORE, GOOGLE_PLAY } from './Trgovine'

/** Konec promocije (Ljubljana, 11. 11. 2026 00:00); po tem se spet kaže trgovina. */
export const APP_PROMO_DO = Date.parse('2026-11-11T00:00:00+01:00')

/** Ali naj naslovnica zdaj kaže promocijo aplikacij namesto trgovine. */
export const appPromoAktivna = (zdaj: number = Date.now(), nativno: boolean = jeNativno()): boolean =>
  !nativno && APP_STORE !== null && zdaj < APP_PROMO_DO

const GUMB =
  'inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnl-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

export default function AppPromo() {
  return (
    <section className="kartica flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <div aria-hidden className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gnl-500/20 text-3xl sm:flex">
        📱
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <span className="inline-block rounded-full bg-gnl-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gnl-300">
          {t('domov.appPromo.oznaka')}
        </span>
        <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">{t('domov.appPromo.naslov')}</h2>
        <p className="max-w-xl text-slate-300">{t('domov.appPromo.opis')}</p>
      </div>
      <div className="flex flex-col gap-2 sm:shrink-0">
        <a href={GOOGLE_PLAY} target="_blank" rel="noopener noreferrer" className={GUMB}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-gnl-400">
            <path d="M5 3.5v17a1 1 0 0 0 1.52.85l13.6-8.5a1 1 0 0 0 0-1.7L6.52 2.65A1 1 0 0 0 5 3.5z" />
          </svg>
          {t('aplikacija.noga.android')}
        </a>
        {APP_STORE && (
          <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className={GUMB}>
            <span aria-hidden>📱</span>
            {t('aplikacija.noga.iphone')}
          </a>
        )}
      </div>
    </section>
  )
}
