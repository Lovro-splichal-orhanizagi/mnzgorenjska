// Prevodi vmesnika.
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
import { Fragment, type ReactNode } from 'react'
import { sl } from './sl'
import { hr } from './hr'

export type Jezik = 'sl' | 'hr'

/** Množinske oblike; `other` je obvezna, ostale po pravilih jezika. */
export type Mnozina = { one?: string; two?: string; few?: string; other: string }
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

const SLOVARJI: Record<Jezik, Drevo> = { sl: sl as Drevo, hr: hr as Drevo }
/** Jeziki, ki so dovolj prevedeni, da jih izberemo sami po brskalniku. */
const PRIPRAVLJENI: Jezik[] = ['sl']
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', hr: 'hr-HR' }
const SHRAMBA = 'slff-jezik'

function izberi(): Jezik {
  try {
    const shranjen = localStorage.getItem(SHRAMBA)
    if (shranjen === 'sl' || shranjen === 'hr') return shranjen
  } catch {}
  try {
    const brskalnik = navigator.language?.slice(0, 2)
    if (PRIPRAVLJENI.includes(brskalnik as Jezik)) return brskalnik as Jezik
  } catch {}
  return 'sl'
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

/**
 * Prevod z oznakami za dele, ki niso navaden tekst (povezava, krepko):
 * `tx('prijava.pogoji', {}, { povezava: (b) => <Link to="/pravno">{b}</Link> })`
 * za niz "Strinjam se s <povezava>pogoji</povezava>." Tako stavek ostane
 * cel in ga prevajalec lahko preuredi.
 */
export function tx(
  kljuc: Kljuc,
  p: Parametri = {},
  oznake: Record<string, (vsebina: ReactNode) => ReactNode> = {},
): ReactNode {
  const niz = t(kljuc, p)
  const deli: ReactNode[] = []
  const re = /<(\w+)>(.*?)<\/\1>/gs
  let zadnji = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(niz))) {
    if (m.index > zadnji) deli.push(niz.slice(zadnji, m.index))
    const fn = oznake[m[1]]
    deli.push(<Fragment key={i++}>{fn ? fn(m[2]) : m[2]}</Fragment>)
    zadnji = m.index + m[0].length
  }
  if (zadnji < niz.length) deli.push(niz.slice(zadnji))
  return <>{deli}</>
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
