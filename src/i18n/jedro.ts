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
// hrvaščina, srbščina in romunščina: one/few/other, slovaščina in češčina: one/few/many/other,
// angleščina, madžarščina in nemščina: one/other) in se izbere po parametru `n`.
import { sl } from './sl/index.ts'
import {
  drzavaLige,
  izbranJezik,
  jezikTujca,
  tujec,
  zeljenJezik,
  KLJUC_IZBRANEGA_JEZIKA,
} from '../lib/drzavaUgib.ts'

export type Jezik = 'sl' | 'hr' | 'sk' | 'cs' | 'hu' | 'de' | 'sr' | 'ro' | 'en'

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

// Slovenščina je v glavnem svežnju (izvor in rezerva), drugi jeziki so vsak
// svoj kos, ki ga `naloziSlovar` prenese pred prvim izrisom (main.tsx). Obiskovalec
// tako ne prenaša sedmih slovarjev, ki jih ne bo nikoli videl.
const NALAGALNIKI: Record<Exclude<Jezik, 'sl'>, () => Promise<Drevo>> = {
  hr: () => import('./hr/index.ts').then((m) => m.hr as Drevo),
  sk: () => import('./sk/index.ts').then((m) => m.sk as Drevo),
  cs: () => import('./cs/index.ts').then((m) => m.cs as Drevo),
  hu: () => import('./hu/index.ts').then((m) => m.hu as Drevo),
  de: () => import('./de/index.ts').then((m) => m.de as Drevo),
  sr: () => import('./sr/index.ts').then((m) => m.sr as Drevo),
  ro: () => import('./ro/index.ts').then((m) => m.ro as Drevo),
  en: () => import('./en/index.ts').then((m) => m.en as Drevo),
}
const SL = sl as Drevo
// null = slovar še ni naložen; `t` do takrat vrača slovenščino.
let slovar: Drevo | null = null
// Ključi, prevedeni pred `naloziSlovar` — konstanta na vrhu modula, ki bi v
// drugem jeziku ostala slovenska. Smoke zahteva, da je seznam prazen.
const prezgodnji = new Set<string>()
export const prezgodnjiKljuci = (): string[] => [...prezgodnji]

// Jezik slovarja, ki je res v rabi; po njem gredo datumi in množina, da
// slovenski nadomestek ne dobi madžarskih oblik. null = še ni naložen.
let jezikVRabi: Jezik | null = null
/** Jezik nizov na zaslonu: izbrani, ali 'sl', če njegov slovar ni prišel. */
export const jezikSlovarja = (): Jezik => jezikVRabi ?? jezik()

/**
 * Naloži slovar izbranega jezika. Kliče se enkrat, pred izrisom. Če kos ne
 * pride v `rokMs` (zastalo omrežje) ali sploh ne, ostane slovenščina za ves
 * obisk — pozen slovar bi sredi strani zamenjal jezik.
 */
export async function naloziSlovar(rokMs = 3000): Promise<void> {
  const j = jezik()
  let d: Drevo | null = null
  if (j !== 'sl') {
    try {
      d = await Promise.race([
        NALAGALNIKI[j](),
        new Promise<null>((r) => setTimeout(() => r(null), rokMs)),
      ])
      if (!d) console.error('Slovar ni prišel pravočasno, ostane slovenščina:', j)
    } catch (e) {
      console.error('Slovarja ni bilo mogoče naložiti:', j, e)
    }
  }
  slovar = d ?? SL
  jezikVRabi = d ? j : 'sl'
}
/** Jeziki, ki so dovolj prevedeni, da jih vmesnik izbere sam. */
export const PRIPRAVLJENI: Jezik[] = ['sl', 'hr', 'sk', 'cs', 'hu', 'de', 'sr', 'ro', 'en']
// Angleščina v britanski obliki: "3 Oct", 24-urni čas, decimalna pika.
// Srbščina v latinici (`sr-Latn-RS`): sama `sr-RS` bi datume pisala v cirilici.
const LOKALE: Record<Jezik, string> = { sl: 'sl-SI', hr: 'hr-HR', sk: 'sk-SK', cs: 'cs-CZ', hu: 'hu-HU', de: 'de-AT', sr: 'sr-Latn-RS', ro: 'ro-RO', en: 'en-GB' }
const SHRAMBA = 'slff-jezik'

export const jePripravljen = (j: string): j is Jezik => PRIPRAVLJENI.includes(j as Jezik)

/**
 * Jezik sledi DRŽAVI lige, ne brskalniku: Slovenec na slovaškem računalniku
 * ostane v slovenščini, Slovak v slovaški ligi dobi slovaščino. Ob nalaganju
 * seznama lig še ni, zato državo razberemo iz šifre lige (naslov, shranjena
 * izbira) ali ugiba; kontekst lige jezik popravi, če se je zmotil.
 *
 * Pred državo imata prednost izrecna izbira z izbirnika "SL · SK · EN" in
 * tujec (IP iz države brez lig — angleščina, a le na goli naslovnici `/` brez
 * lige; glej `drzavaUgib.ts`).
 */
function izberi(): Jezik {
  // Skripte v Node (preveri-podatke …) so vedno slovenske in se localStorage
  // ne dotaknejo — Node ga ima, a ob branju izpiše opozorilo.
  if (typeof window === 'undefined') return 'sl'
  const izbranJ = izbranJezik()
  if (izbranJ && jePripravljen(izbranJ)) return izbranJ
  if (tujec()) {
    const j = jezikTujca(typeof navigator !== 'undefined' ? navigator.languages : null)
    if (jePripravljen(j)) return j
  }
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
  const j = zeljenJezik({ drzava })
  return jePripravljen(j) ? j : 'sl'
}

let izbran: Jezik | null = null
export function jezik(): Jezik {
  if (!izbran) izbran = izberi()
  return izbran
}
export const lokale = (): string => LOKALE[jezikSlovarja()]

/**
 * Zamenja jezik in naloži stran znova. To je samodejni popravek (kontekst
 * lige); izbiro obiskovalca zapiše `izberiJezik`.
 */
export function nastaviJezik(j: Jezik) {
  try {
    localStorage.setItem(SHRAMBA, j)
  } catch {}
  location.reload()
}

/**
 * Izbira z izbirnika jezika: obvelja pred državo lige in ugibom, dokler je
 * obiskovalec ne zamenja. Le v brskalniku, stran se naloži znova.
 */
export function izberiJezik(j: Jezik) {
  try {
    localStorage.setItem(KLJUC_IZBRANEGA_JEZIKA, j)
  } catch {}
  nastaviJezik(j)
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
  if (!slovar) prezgodnji.add(kljuc)
  const v = (slovar && poisci(slovar, kljuc)) ?? poisci(SL, kljuc)
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
