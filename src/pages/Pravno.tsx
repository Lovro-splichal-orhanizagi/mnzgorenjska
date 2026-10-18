// Kratka izjava o zasebnosti in pogoji. Namenoma brez pravniškega balasta —
// pove, kaj hranimo, zakaj in kako se tega znebiš.
import { useNaslov } from '../lib/naslov'
import { t, tx } from '../i18n'
import { useEffect, type ReactNode } from 'react'

const krepko = { b: (v: ReactNode) => <strong>{v}</strong> }
const eposta = (v: ReactNode) => (
  <a href="mailto:info@slff.eu" className="text-gnl-300 underline">
    {v}
  </a>
)

export default function Pravno() {
  useNaslov(t('racun.pravno.naslov'))
  // Povezava "pogoji nakupa" (/legal#placljivo) pride v nov zavihek: stran je
  // lazy kos, zato brskalnik do sidra sam ne skoči.
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [])
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
        <p className="text-slate-300">{t('racun.pravno.kajJePlacljivo')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.podatkiNaslov')}</h2>
        <ul className="space-y-2 text-slate-300">
          <li>{tx('racun.pravno.podatkiEposta', {}, krepko)}</li>
          <li>{tx('racun.pravno.podatkiIme', {}, krepko)}</li>
          <li>{tx('racun.pravno.podatkiEkipa', {}, krepko)}</li>
          <li>{tx('racun.pravno.podatkiNaprava', {}, krepko)}</li>
          <li>{tx('racun.pravno.podatkiPlacilo', {}, krepko)}</li>
        </ul>
        <p className="text-slate-300">{t('racun.pravno.neHranimo')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.dostopNaslov')}</h2>
        <p className="text-slate-300">{tx('racun.pravno.dostop', {}, krepko)}</p>
        <p className="text-slate-300">{tx('racun.pravno.dostopStripe', {}, krepko)}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.statistikaNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.statistika')}</p>
        <p className="text-slate-300">{t('racun.pravno.statistikaPodlaga')}</p>
        <p className="text-slate-300">{tx('racun.pravno.statistikaUgovor', {}, { eposta })}</p>
        <p className="text-slate-300">{t('racun.pravno.grbi')}</p>
      </section>

      <section id="scout" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.scoutNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.scoutKaj')}</p>
        <p className="text-slate-300">{t('racun.pravno.scoutPodlaga')}</p>
        <p className="text-slate-300">{t('racun.pravno.scoutPrivolitev')}</p>
        <p className="text-slate-300">{tx('racun.pravno.scoutUgovor', {}, { eposta })}</p>
      </section>

      <section id="trgovina" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.trgovinaNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.trgovinaKaj')}</p>
        <p className="text-slate-300">{t('racun.pravno.trgovinaPodlaga')}</p>
        <p className="text-slate-300">{tx('racun.pravno.trgovinaHramba', {}, { eposta })}</p>
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
            ...krepko,
            eposta,
          })}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.pravilaNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.pravila')}</p>
      </section>

      <section id="placljivo" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.placljivoNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.placljivoUvod')}</p>
        <p className="text-slate-300">{tx('racun.pravno.prodajalec', {}, { ...krepko, eposta })}</p>
        {(['kupis', 'placilo', 'odpoved', 'odstop', 'konec', 'vracila'] as const).map((k) => (
          <p key={k} className="text-slate-300">{tx(`racun.pravno.${k}`, {}, krepko)}</p>
        ))}
        <p className="text-slate-300">{tx('racun.pravno.pritozbe', {}, { ...krepko, eposta })}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('racun.pravno.jamstvoNaslov')}</h2>
        <p className="text-slate-300">{t('racun.pravno.jamstvo')}</p>
      </section>
    </div>
  )
}
