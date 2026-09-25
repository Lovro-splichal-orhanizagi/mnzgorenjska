// Prevodi vmesnika — jedro brez JSX.
//
// Ta datoteka se uvaža z izrecno končnico (`../i18n/jedro.ts`), ker jo prek
// `src/lib` berejo tudi skripte v navadnem Node (preveri-podatke,
// pripravljenost-lige …). `tx` za React je v `index.tsx`.
//
//
// Slovenščina je izvor: `sl/` vsebuje VSE nize, drugi jeziki (`hr/`) le
// prevedene; kar manjka, pride iz slovenščine. Ključ je pot v slovarju
// (`'navigacija.igralci'`) in je tipiziran — napačen ključ javi že
// `npm run typecheck`.
//
// Jezik se izbere enkrat ob nalaganju strani in se med obiskom ne menja
// (zamenjava jezika stran naloži znova). Zato je `t` navadna funkcija in ga
// smejo klicati tudi moduli zunaj Reacta: risanje slik na platno, `lib/`,
// konstante na vrhu datoteke.
//
// Niz lahko vsebuje {ime} za vstavljanje vrednosti. Množinski niz je objekt
// z oblikami po `Intl.PluralRules` (slovenščina: one/two/few/other,
// hrvaščina: one/few/other) in se izbere po parametru `n`.
import { sl } from './sl/index.ts'
import { hr } from './hr/index.ts'
import { sk } from './sk/index.ts'
import { drzavaLige, JEZIK_DRZAVE } from '../lib/drzavaUgib.ts'

export type Jezik = 'sl' | 'hr' | 'sk'

/** Množinske oblike; `other` je obvezna, ostale po pravilih jezika. */
// `many` rabi slovaščina za necela števila ("2,5 bodu").
export type Mnozina = { one?: string; two?: string; few?: string; many?: string; other: string }
type Vrednost = string | Mnozina
type Drevo = { [k: string]: Vrednost | Drevo }

type DelnoDrevo<T> = { [K in keyof T]?: T[K] extends string ? string : T[K] extends Mnozina ? Mnozina : DelnoDrevo<T[K]> }
export type Prevod = DelnoDrevo<typeof sl>

// Vse poti do listov: 'navigacija.igralci', 'skupno.tocke' …
type Poti<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | Mnozina ? `${P}${K}` : Poti<T[K], `${P}${K}.`>
}[keyof T & string]
export type Kljuc = Poti<typeof sl>

export type Parametri = Record<string, string | number | null | undefined>

const SLOVARJI: Record<Jezik, Drevo> = { sl: sl as Drevo, hr: hr as Drevo, sk: sk as Drevo }
/** Jeziki, ki so dovolj prevedeni, da jih vmesnik izbere sam. */
const PRIPRAVLJENI: Jezik[] = ['sl', 'sk']
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', hr: 'hr-HR', sk: 'sk-SK' }
const SHRAMBA = 'slff-jezik'

export const jePripravljen = (j: string): j is Jezik => PRIPRAVLJENI.includes(j as Jezik)

/**
 * Jezik sledi DRŽAVI lige, ne brskalniku: Slovenec na slovaškem računalniku
 * ostane v slovenščini, Slovak v slovaški ligi dobi slovaščino. Ob nalaganju
 * seznama lig še ni, zato državo razberemo iz šifre lige (naslov, shranjena
 * izbira) ali ugiba; kontekst lige jezik popravi, če se je zmotil.
 */
function izberi(): Jezik {
  // Skripte v Node (preveri-podatke …) so vedno slovenske in se localStorage
  // ne dotaknejo — Node ga ima, a ob branju izpiše opozorilo.
  if (typeof window === 'undefined') return 'sl'
  let shranjen: string | null = null
  let liga: string | null = null
  let izbranaDrzava: string | null = null
  try {
    shranjen = localStorage.getItem(SHRAMBA)
    liga = new URLSearchParams(location.search).get('t') || localStorage.getItem('slff-tekmovanje')
    izbranaDrzava = localStorage.getItem('slff-drzava')
  } catch {}
  if (shranjen && jePripravljen(shranjen)) return shranjen
  // Brez lige in brez izbrane države (povezava /sk) ostane slovenščina, tudi
  // na slovaškem brskalniku: Slovenec ne sme niti za hip videti slovaščine.
  // Slovak brez povezave dobi slovaščino ob prvem popravku konteksta lige.
  const drzava = liga ? drzavaLige(liga) : izbranaDrzava
  const j = JEZIK_DRZAVE[drzava ?? 'SI'] ?? 'sl'
  return jePripravljen(j) ? j : 'sl'
}

let izbran: Jezik | null = null
export function jezik(): Jezik {
  if (!izbran) izbran = izberi()
  return izbran
}
export const lokale = (): string => LOKALE[jezik()]

/** Zamenja jezik in naloži stran znova. */
export function nastaviJezik(j: Jezik) {
  try {
    localStorage.setItem(SHRAMBA, j)
  } catch {}
  location.reload()
}

function poisci(drevo: Drevo, kljuc: string): Vrednost | undefined {
  let v: Vrednost | Drevo | undefined = drevo
  for (const del of kljuc.split('.')) {
    if (!v || typeof v === 'string' || !(del in v)) return undefined
    v = (v as Drevo)[del]
  }
  return typeof v === 'string' || (v && 'other' in v) ? (v as Vrednost) : undefined
}

const pravila = new Map<string, Intl.PluralRules>()
function oblikaZa(m: Mnozina, n: number): string {
  const l = lokale()
  if (!pravila.has(l)) pravila.set(l, new Intl.PluralRules(l))
  const kat = pravila.get(l)!.select(n) as keyof Mnozina
  return m[kat] ?? m.other
}

function vstavi(niz: string, p?: Parametri): string {
  if (!p) return niz
  return niz.replace(/\{(\w+)\}/g, (cel, ime: string) => (ime in p ? String(p[ime] ?? '') : cel))
}

/**
 * Prevod ključa. Množinski niz izbere obliko po `n`:
 * `t('skupno.tock', { n: 4 })` → "4 točke".
 */
export function t(kljuc: Kljuc, p?: Parametri): string {
  const v = poisci(SLOVARJI[jezik()], kljuc) ?? poisci(SLOVARJI.sl, kljuc)
  if (v === undefined) return kljuc
  if (typeof v === 'string') return vstavi(v, p)
  return vstavi(oblikaZa(v, Number(p?.n ?? 0)), p)
}

// --- oblikovanje po jeziku ------------------------------------------------

/** Datum v obliki jezika: `datum(iso, { day: 'numeric', month: 'long' })`. */
export function datum(d: string | number | Date, o?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString(lokale(), o)
}
/** Datum in ura v obliki jezika. */
export function datumUra(d: string | number | Date, o?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleString(lokale(), o)
}
/** Ura v obliki jezika. */
export function ura(d: string | number | Date, o?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleTimeString(lokale(), o)
}
/** Število z ločili jezika (1.000 / 1,5). */
export function stevilo(n: number, o?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(lokale(), o)
}
