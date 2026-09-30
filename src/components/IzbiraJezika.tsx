// Izbira jezika: "SL · SK · EN".
//
// Jezik sicer sledi državi lige (tujec dobi angleščino); tu ga obiskovalec
// izbere sam in izbira obvelja pred vsem drugim (`izberiJezik`, le v
// brskalniku). Jezik se med obiskom ne menja, zato izbira stran naloži znova.
import { PRIPRAVLJENI, izberiJezik, jezik, t, type Jezik } from '../i18n'
import { potrdiZapustitev } from '../lib/neshranjeno'

/** Ime jezika v njem samem — v vseh prevodih enako. */
const IMENA: Partial<Record<Jezik, string>> = {
  sl: 'Slovenščina',
  sk: 'Slovenčina',
  en: 'English',
}

export default function IzbiraJezika({ className = '' }: { className?: string }) {
  const zdaj = jezik()
  const preklopi = (j: Jezik) => {
    if (j === zdaj || !potrdiZapustitev()) return
    izberiJezik(j)
  }

  return (
    <nav aria-label={t('aplikacija.izbiraJezika.oznaka')} className={`text-xs ${className}`}>
      {PRIPRAVLJENI.map((j, i) => {
        const ime = IMENA[j] ?? j
        return (
          <span key={j}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {j === zdaj ? (
              <span aria-current="true" lang={j} title={ime} className="font-semibold text-slate-200">
                {j.toUpperCase()}
              </span>
            ) : (
              <button
                type="button"
                lang={j}
                onClick={() => preklopi(j)}
                title={t('aplikacija.izbiraJezika.preklopi', { jezik: ime })}
                aria-label={ime}
                className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                {j.toUpperCase()}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
