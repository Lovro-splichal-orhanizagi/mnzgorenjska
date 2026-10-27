import { t, type Kljuc } from '../besede'

// Pogoji za klube (spec 2): pred prvim plačilom morajo biti objavljeni.
const RAZDELKI = ['kaj', 'kdo', 'raba', 'ekipa', 'obdelava', 'meje', 'dnevnik', 'cene', 'odpoved', 'odgovornost', 'spremembe', 'krsitev', 'zasebnost', 'ponudnik', 'pravo'] as const

export function Pogoji() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-black naslov sm:text-3xl">{t('pogoji.naslov')}</h1>
      <p className="text-sm text-slate-400">{t('pogoji.zadnja')}</p>
      {RAZDELKI.map((r) => (
        <section key={r} id={r} className="kartica space-y-1 p-4">
          <h2 className="font-bold text-slate-100">{t(`pogoji.h.${r}` as Kljuc)}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{t(`pogoji.${r}` as Kljuc)}</p>
        </section>
      ))}
      <a href="https://slff.eu/legal#scout" className="povezava text-sm">{t('pogoji.igralci')}</a>
    </article>
  )
}
