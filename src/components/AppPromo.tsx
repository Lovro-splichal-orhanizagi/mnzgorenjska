// Časovno omejena kartica z aplikacijama na naslovnici: ~48 ur od objave
// stoji namesto kartice trgovine, nato se trgovina sama vrne. Obiskovalec brez
// prijave znački že vidi v uvodu, zato kartica velja za prijavljene. V
// aplikaciji je ni (tam je namestitev brez pomena).
import { jeNativno } from '../lib/platforma'
import { t } from '../i18n'
import { APP_STORE } from './Trgovine'
import ZnackeTrgovin from './ZnackeTrgovin'

/** Konec promocije (Ljubljana, 11. 11. 2026 00:00); po tem se spet kaže trgovina. */
export const APP_PROMO_DO = Date.parse('2026-11-11T00:00:00+01:00')

/** Ali naj naslovnica zdaj kaže promocijo aplikacij namesto trgovine. */
export const appPromoAktivna = (zdaj: number = Date.now(), nativno: boolean = jeNativno()): boolean =>
  !nativno && APP_STORE !== null && zdaj < APP_PROMO_DO

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
      <ZnackeTrgovin razred="sm:shrink-0" />
    </section>
  )
}
