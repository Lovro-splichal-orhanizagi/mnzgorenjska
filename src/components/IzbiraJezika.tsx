// Izbira jezika: gumb "🌐 Slovenščina" s spustnim seznamom vseh jezikov.
//
// Jezik sicer sledi državi lige (tujec dobi angleščino); tu ga obiskovalec
// izbere sam in izbira obvelja pred vsem drugim (`izberiJezik`, le v
// brskalniku). Jezik se med obiskom ne menja, zato izbira stran naloži znova.
//
// Prej je bila to vrsta kod "SL · HR · SK …"; pri trinajstih jezikih se je na
// telefonu raztegnila čez tri vrstice in koda ni povedala, kateri jezik je.
import { PRIPRAVLJENI, izberiJezik, jezik, t, type Jezik } from '../i18n'
import { potrdiZapustitev } from '../lib/neshranjeno'
import SpustniMeni from './SpustniMeni'

/** Ime jezika v njem samem — v vseh prevodih enako. */
const IMENA: Partial<Record<Jezik, string>> = {
  sl: 'Slovenščina',
  hr: 'Hrvatski',
  sk: 'Slovenčina',
  cs: 'Čeština',
  hu: 'Magyar',
  de: 'Deutsch',
  sr: 'Srpski',
  ro: 'Română',
  et: 'Eesti',
  pl: 'Polski',
  es: 'Español',
  lv: 'Latviešu',
  mk: 'Македонски',
  en: 'English',
}

export default function IzbiraJezika({
  className = '',
  navzgor = false,
}: {
  className?: string
  /** Seznam nad gumbom (noga strani). */
  navzgor?: boolean
}) {
  const zdaj = jezik()
  const ime = (j: Jezik) => IMENA[j] ?? j
  const preklopi = (j: string) => {
    if (j === zdaj || !potrdiZapustitev()) return
    izberiJezik(j as Jezik)
  }

  return (
    <SpustniMeni
      className={`text-xs ${className}`}
      navzgor={navzgor}
      oznakaGumba={t('aplikacija.izbiraJezika.gumb', { jezik: ime(zdaj) })}
      oznakaMenija={t('aplikacija.izbiraJezika.oznaka')}
      gumb={
        <>
          <span aria-hidden="true">🌐</span>
          <span lang={zdaj}>{ime(zdaj)}</span>
        </>
      }
      moznosti={PRIPRAVLJENI.map((j) => ({
        kljuc: j,
        lang: j,
        izbrana: j === zdaj,
        vsebina: ime(j),
      }))}
      izberi={preklopi}
    />
  )
}
