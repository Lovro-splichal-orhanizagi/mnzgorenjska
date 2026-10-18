import { Link } from 'react-router-dom'
import { t, type Kljuc } from '../besede'

const RAZDELKI = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'] as const

export const odstavki = (k: Kljuc) => t(k).split('\n\n')

export function Pogoji() {
  return (
    <article className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black naslov sm:text-4xl">{t('pogoji.naslov')}</h1>
        <p className="text-sm text-slate-400">{t('pogoji.velja')}</p>
      </header>
      {RAZDELKI.map((s) => (
        <section key={s} className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">{t(`pogoji.${s}.naslov`)}</h2>
          {odstavki(`pogoji.${s}.besedilo`).map((o, n) => <p key={n} className="leading-relaxed text-slate-300">{o}</p>)}
          {s === 's6' && (
            <>
              <Link to="/withdrawal" className="povezava inline-block">{t('pogoji.odstopObrazec')} →</Link>
              <div className="kartica space-y-2 p-5">
                <h3 className="font-bold">{t('odstop.vzorecNaslov')}</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{t('odstop.vzorec')}</p>
              </div>
            </>
          )}
          {s === 's9' && <a href="https://slff.eu/legal" className="povezava inline-block">{t('pogoji.zasebnost')} →</a>}
        </section>
      ))}
    </article>
  )
}
