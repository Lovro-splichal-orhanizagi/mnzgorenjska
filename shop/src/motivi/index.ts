// Predloge motivov (trgovina.motivi). Vsak motiv ima eno predlogo na cono:
// <slug>.svg je glavna cona (motivi.cona), <slug>.<cona>.svg dodatna (polje z
// "cona", npr. sponzor retro dresa na prsih). viewBox je v mm, pisava Anton
// (anton.ttf, OFL; podmnožica latinice). Oznake mest so opisane v shop/src/risba.ts.
// Nov motiv: predloga + vrstica tu + seme v migraciji; smoke preveri ujemanje.
import retroDres from './retro-dres.svg?raw'
import retroDresPrsi from './retro-dres.prsi.svg?raw'
import legenda from './legenda.svg?raw'
import hangoverXi from './hangover-xi.svg?raw'
import kapetan from './kapetan.svg?raw'
import kraljKafane from './kralj-kafane.svg?raw'
import prvakMiniLige from './prvak-mini-lige.svg?raw'

export interface Motiv {
  slug: string
  /** Glavna cona (motivi.cona). */
  cona: string
  /** Vsa polja motiva, kot v semenu. */
  polja: string[]
  /** Število barv sheme, ki jih predloga uporablja. */
  barve: number
  /** SVG predloge po conah; glavna prva. */
  predloge: Record<string, string>
}

export const MOTIVI: Motiv[] = [
  { slug: 'retro-dres', cona: 'hrbet', polja: ['ime', 'stevilka', 'sponzor', 'leto'], barve: 3, predloge: { hrbet: retroDres, prsi: retroDresPrsi } },
  { slug: 'legenda', cona: 'hrbet', polja: ['ime', 'vzdevek', 'leto'], barve: 3, predloge: { hrbet: legenda } },
  { slug: 'hangover-xi', cona: 'hrbet', polja: ['ekipa', 'stevilka'], barve: 3, predloge: { hrbet: hangoverXi } },
  { slug: 'kapetan', cona: 'hrbet', polja: ['ime', 'stevilka'], barve: 3, predloge: { hrbet: kapetan } },
  { slug: 'kralj-kafane', cona: 'hrbet', polja: ['ime', 'goli', 'sezona'], barve: 3, predloge: { hrbet: kraljKafane } },
  { slug: 'prvak-mini-lige', cona: 'hrbet', polja: ['prvak'], barve: 3, predloge: { hrbet: prvakMiniLige } },
]
