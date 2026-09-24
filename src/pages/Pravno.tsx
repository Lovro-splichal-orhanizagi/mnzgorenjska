// Kratka izjava o zasebnosti in pogoji. Namenoma brez pravniškega balasta —
// pove, kaj hranimo, zakaj in kako se tega znebiš.
import { useNaslov } from '../lib/naslov'
import { t, tx } from '../i18n'
import type { ReactNode } from 'react'

const krepko = { b: (v: ReactNode) => <strong>{v}</strong> }

export default function Pravno() {
  useNaslov(t('racun.pravno.naslov'))
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {t('racun.pravno.naslov')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('racun.pravno.zadnjaSprememba')}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.kajJeNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.kajJe')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.podatkiNaslov')}</h2>
        <ul className="space-y-2 text-slate-300">
          <li>{tx('racun.pravno.podatkiEposta', {}, krepko)}</li>
          <li>{tx('racun.pravno.podatkiIme', {}, krepko)}</li>
          <li>{tx('racun.pravno.podatkiEkipa', {}, krepko)}</li>
        </ul>
        <p className="text-slate-300">{t('racun.pravno.neHranimo')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.dostopNaslov')}</h2>
        <p className="text-slate-300">{tx('racun.pravno.dostop', {}, krepko)}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.statistikaNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.statistika')}</p>
        <p className="text-slate-300">{t('racun.pravno.grbi')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.fotografijeNaslov')}</h2>
        <p className="text-slate-300">
          {tx('racun.pravno.fotografije', {}, {
            unsplash: (v) => (
              <a
                href="https://unsplash.com/photos/1a6deb1dec8d"
                target="_blank"
                rel="noreferrer"
                className="text-gnl-300 underline"
              >
                {v}
              </a>
            ),
          })}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.praviceNaslov')}</h2>
        <p className="text-slate-300">
          {tx('racun.pravno.pravice', {}, {
            eposta: (v) => (
              <a href="mailto:info@slff.eu" className="text-gnl-300 underline">
                {v}
              </a>
            ),
          })}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.pravilaNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.pravila')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.jamstvoNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.jamstvo')}</p>
      </section>
    </div>
  )
}
