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
import tretjiPolcas from './tretji-polcas.svg?raw'
import ekipniKozarec from './ekipni-kozarec.svg?raw'
import kafanskiKomplet from './kafanski-komplet.svg?raw'
import imeInStevilka from './ime-in-stevilka.svg?raw'
import mojaPostava from './moja-postava.svg?raw'
import retroPlakatTekme from './retro-plakat-tekme.svg?raw'
import karticaLegende from './kartica-legende.svg?raw'
import klubskaZastavica from './klubska-zastavica.svg?raw'
import navijaskiSal from './navijaski-sal.svg?raw'
import vezenaEkipa from './vezena-ekipa.svg?raw'
import kapetanskiTrak from './kapetanski-trak.svg?raw'
import dresPoMeri from './dres-po-meri.svg?raw'
import dresPoMeriHrbet from './dres-po-meri.hrbet.svg?raw'

export interface Motiv {
  slug: string
  /** Glavna cona (motivi.cona). */
  cona: string
  /** Vsa polja motiva, kot v semenu. */
  polja: string[]
  /** Število barv sheme, ki jih predloga uporablja. */
  barve: number
  /** Kosov v kompletu (podstavki: 6); ključ s {n} v predlogi velja za vsak kos. */
  kosov?: number
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
  // Dela 2 in 3 (migracija 20261019160000). Laser: ena barva; vezenje: največ 4 barve.
  { slug: 'tretji-polcas', cona: 'ovoj', polja: ['ime', 'slogan'], barve: 1, predloge: { ovoj: tretjiPolcas } },
  { slug: 'ekipni-kozarec', cona: 'ovoj', polja: ['ekipa', 'leto'], barve: 1, predloge: { ovoj: ekipniKozarec } },
  { slug: 'kafanski-komplet', cona: 'podstavek', polja: ['ekipa', 'slogan1', 'slogan2', 'slogan3', 'slogan4', 'slogan5', 'slogan6'], barve: 3, kosov: 6, predloge: { podstavek: kafanskiKomplet } },
  { slug: 'ime-in-stevilka', cona: 'rocaj', polja: ['ime', 'stevilka'], barve: 1, predloge: { rocaj: imeInStevilka } },
  { slug: 'moja-postava', cona: 'plakat', polja: ['postava'], barve: 3, predloge: { plakat: mojaPostava } },
  { slug: 'retro-plakat-tekme', cona: 'plakat', polja: ['domaci', 'gostje', 'goli_domaci', 'goli_gostje', 'datum', 'igrisce'], barve: 3, predloge: { plakat: retroPlakatTekme } },
  { slug: 'kartica-legende', cona: 'kartica', polja: ['ime', 'pozicija', 'klub', 'hitrost', 'strel', 'podaje', 'obramba'], barve: 3, predloge: { kartica: karticaLegende } },
  { slug: 'klubska-zastavica', cona: 'zastavica', polja: ['ekipa', 'leto'], barve: 3, predloge: { zastavica: klubskaZastavica } },
  { slug: 'navijaski-sal', cona: 'sal', polja: ['ekipa', 'slogan'], barve: 3, predloge: { sal: navijaskiSal } },
  { slug: 'vezena-ekipa', cona: 'spredaj', polja: ['ime', 'stevilka'], barve: 2, predloge: { spredaj: vezenaEkipa } },
  { slug: 'kapetanski-trak', cona: 'trak', polja: ['ime'], barve: 3, predloge: { trak: kapetanskiTrak } },
  // Barve dresa pridejo iz polj barva1–3 (personalizacija.barve), ne iz sheme.
  { slug: 'dres-po-meri', cona: 'spredaj', polja: ['vzorec', 'barva1', 'barva2', 'barva3', 'ovratnik', 'sponzor', 'ime', 'stevilka'], barve: 3, predloge: { spredaj: dresPoMeri, hrbet: dresPoMeriHrbet } },
]
