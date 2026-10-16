import { t, type Kljuc } from '../besede'

// Pogoji za klube (spec 2): pred prvim plačilom morajo biti objavljeni.
const RAZDELKI = ['kaj', 'kdo', 'raba', 'meje', 'dnevnik', 'cene', 'odpoved', 'krsitev', 'zasebnost', 'ponudnik', 'pravo'] as const

export function Pogoji() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{t('pogoji.naslov')}</h1>
      <p className="text-sm text-slate-500">{t('pogoji.zadnja')}</p>
      {RAZDELKI.map((r) => (
        <section key={r} id={r} className="space-y-1">
          <h2 className="font-semibold">{t(`pogoji.h.${r}` as Kljuc)}</h2>
          <p className="text-slate-700">{t(`pogoji.${r}` as Kljuc)}</p>
        </section>
      ))}
      <a href="https://slff.eu/legal#scout" className="underline">{t('pogoji.igralci')}</a>
    </article>
  )
}
