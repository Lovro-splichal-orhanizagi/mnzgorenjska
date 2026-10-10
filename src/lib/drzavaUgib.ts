// Ugib države obiskovalca brez odvisnosti — bere ga tudi jedro prevodov
// (`src/i18n/jedro.ts`), ki ga uvažajo skripte v Node, zato tu ni Reacta ne
// Supabase. Razlaga pravil je v `drzava.ts`.

import { DOMENA, jeNativno } from './platforma.ts'

const KLJUC = 'slff-drzava'

/**
 * Znane države: jezik in časovni pas, ki nanje kažeta. Jezik je osnova
 * (`sk`) ali cela oznaka z regijo (`de-at`): nemščina sama je tudi Nemčija
 * in Švica, zato na Avstrijo kaže le `de-AT` ali pas `Europe/Vienna`.
 */
const DRZAVE: Record<string, { jeziki: string[]; pasovi: string[] }> = {
  SI: { jeziki: ['sl'], pasovi: ['Europe/Ljubljana'] },
  SK: { jeziki: ['sk'], pasovi: ['Europe/Bratislava'] },
  HR: { jeziki: ['hr', 'bs'], pasovi: ['Europe/Zagreb'] },
  CZ: { jeziki: ['cs'], pasovi: ['Europe/Prague'] },
  HU: { jeziki: ['hu'], pasovi: ['Europe/Budapest'] },
  AT: { jeziki: ['de-at'], pasovi: ['Europe/Vienna'] },
  RS: { jeziki: ['sr'], pasovi: ['Europe/Belgrade'] },
  RO: { jeziki: ['ro'], pasovi: ['Europe/Bucharest'] },
}
export const znaneDrzave = () => Object.keys(DRZAVE)

/**
 * Zaprte države: lige so vklopljene, a država se ne ugiba — vanjo pride le,
 * kdor ima povezavo `slff.eu/sk` ali deljeno povezavo lige (`?t=sk-…`).
 * IP, jezik in časovni pas je ne odprejo. Državo zapreš tako, da jo dodaš
 * sem (npr. `['SK']`); odprta je, ko je ni na seznamu.
 */
export const SAMO_S_POVEZAVO: string[] = []

const jeOdprta = (koda: string | null | undefined): koda is string =>
  Boolean(koda && koda in DRZAVE && !SAMO_S_POVEZAVO.includes(koda))

/**
 * Ugib iz podatkov brskalnika (brez dostopa do njega, da je preverljiv v
 * `npm run smoke`). Vrstni red:
 *   1. izbira s povezave `/sk` ali izbirnika države (`shranjena`),
 *   2. država po IP (`/api/drzava`, glava Vercela),
 *   3. prvi jezik brskalnika, ki ga poznamo,
 *   4. časovni pas (šibak znak — Bratislava in Ljubljana sta isti pas).
 * Kdor ne ustreza ničemur, dobi null — in s tem Slovenijo, kakor doslej.
 */
export function ugibajDrzavo({
  shranjena,
  ip,
  jeziki,
  casovniPas,
}: {
  shranjena?: string | null
  ip?: string | null
  jeziki?: readonly string[] | null
  casovniPas?: string | null
}): string | null {
  if (shranjena && shranjena in DRZAVE) return shranjena
  if (jeOdprta(ip)) return ip
  // Zaprte države se ne ugiba — vanje pride le, kdor ima povezavo.
  const odprte = Object.entries(DRZAVE).filter(([k]) => jeOdprta(k))
  for (const j of jeziki ?? []) {
    const oznaka = j.toLowerCase()
    const d = odprte.find(([, v]) => v.jeziki.includes(oznaka.slice(0, 2)) || v.jeziki.includes(oznaka))
    if (d) return d[0]
  }
  const poPasu = odprte.find(([, v]) => casovniPas && v.pasovi.includes(casovniPas))
  return poPasu?.[0] ?? null
}

export function shranjenaDrzava(): string | null {
  try {
    return localStorage.getItem(KLJUC)
  } catch {
    return null
  }
}

/** Ugib za tega obiskovalca brez IP (takoj, brez čakanja). */
export function drzavaObiskovalca(ip: string | null = null): string | null {
  let casovniPas: string | null = null
  try {
    casovniPas = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {}
  return ugibajDrzavo({
    shranjena: shranjenaDrzava(),
    ip,
    jeziki: typeof navigator !== 'undefined' ? navigator.languages : null,
    casovniPas,
  })
}

/** Koliko najdlje čakamo na državo po IP, preden ugibamo brez nje. */
export const CAKAJ_IP_MS = 800

/**
 * Država po IP iz `/api/drzava` (Vercel jo da v glavi `x-vercel-ip-country`).
 * Nikoli ne vrže in ne čaka dlje od `casMs`: ob napaki, počasnem odgovoru ali
 * lokalno (`vite dev` funkcije nima in vrne index.html) vrne null.
 */
export async function drzavaPoIp({
  fetchFn = typeof fetch !== 'undefined' ? fetch : undefined,
  casMs = CAKAJ_IP_MS,
}: { fetchFn?: typeof fetch; casMs?: number } = {}): Promise<string | null> {
  if (!fetchFn) return null
  const prekini = typeof AbortController !== 'undefined' ? new AbortController() : null
  let ura: ReturnType<typeof setTimeout> | undefined
  const rok = new Promise<null>((r) => {
    ura = setTimeout(() => {
      prekini?.abort()
      r(null)
    }, casMs)
  })
  const branje = (async () => {
    try {
      const odg = await fetchFn(`${jeNativno() ? DOMENA : ''}/api/drzava`, { signal: prekini?.signal, cache: 'no-store' })
      if (!odg.ok || !(odg.headers.get('content-type') ?? '').includes('json')) return null
      const { drzava } = (await odg.json()) as { drzava?: unknown }
      return typeof drzava === 'string' && /^[A-Z]{2}$/.test(drzava) ? drzava : null
    } catch {
      return null
    }
  })()
  try {
    return await Promise.race([branje, rok])
  } finally {
    clearTimeout(ura)
  }
}

/** Ugib za novega obiskovalca: država (za ozadje) in golo državo po IP. */
export interface UgibObiskovalca {
  /** Ugibana država (izbira → IP → jezik → pas) ali null (Slovenija). */
  drzava: string | null
  /** Država po IP, kakor jo je javil Vercel; null ob napaki ali brez vprašanja. */
  ip: string | null
}

/**
 * Celoten ugib za novega obiskovalca: izbrana država ne potrebuje IP-ja (in
 * ga ne sprašuje), sicer IP, nato jezik in pas. `ip` ostane zraven, da
 * kontekst lige prepozna tujca (IP iz države brez lig).
 */
export async function ugibajObiskovalca(
  poIp: () => Promise<string | null> = drzavaPoIp,
): Promise<UgibObiskovalca> {
  if (shranjenaDrzava()) return { drzava: drzavaObiskovalca(), ip: null }
  const ip = await poIp()
  return { drzava: drzavaObiskovalca(ip), ip }
}

// --- tujec in jezik vmesnika -----------------------------------------------
//
// Tujec je nov obiskovalec, čigar IP je iz države BREZ naših lig (CZ, AT,
// DE …). Ne pristane tiho v Sloveniji: okno prvega obiska ga najprej vpraša po
// državi, vmesnik pa je v angleščini (razen če je prvi jezik brskalnika
// slovenski ali slovaški). Oznaka ostane v brskalniku, da jezik ostane isti
// tudi, ko izbere ligo (in države ne ugibamo več).

const KLJUC_TUJCA = 'slff-tujec'
/** Izrecna izbira jezika z izbirnika "SL · SK · EN" — povozi vse ugibe. */
export const KLJUC_IZBRANEGA_JEZIKA = 'slff-jezik-izbran'

function beri(kljuc: string): string | null {
  try {
    return localStorage.getItem(kljuc)
  } catch {
    return null
  }
}

/**
 * Gola naslovnica: pot `/` brez `?t=` in brez shranjene lige. Le tu je tujec
 * tujec (angleščina, vprašanje po državi); vsaka druga stran je v jeziku
 * države svoje lige, da ima naslov en sam jezik — tudi za iskalnik, ki
 * pride z ameriškega IP-ja. Velja stanje ob nalaganju strani, ker se jezik
 * med obiskom ne menja; v Node (smoke) se bere sproti.
 */
const golaNaslovnica = (pot: string, iskanje: string): boolean =>
  pot === '/' && !new URLSearchParams(iskanje).has('t') && !beri('slff-tekmovanje')
const golaObNalaganju =
  typeof location === 'undefined' ? null : golaNaslovnica(location.pathname, location.search)
export const naGoliNaslovnici = (): boolean => golaObNalaganju ?? golaNaslovnica('/', '')

/** Država po IP tujca — le na goli naslovnici (`naGoliNaslovnici`). */
export const tujec = (): string | null => (naGoliNaslovnici() ? beri(KLJUC_TUJCA) : null)

export function zapomniTujca(ip: string) {
  try {
    localStorage.setItem(KLJUC_TUJCA, ip)
  } catch {}
}

/** Država tujca je dobila lige (Hrvaška ob vklopu): oznaka ne velja več. */
export function pozabiTujca() {
  try {
    localStorage.removeItem(KLJUC_TUJCA)
  } catch {}
}

/** Jezik, ki ga je obiskovalec izbral sam (ali null). */
export const izbranJezik = (): string | null => beri(KLJUC_IZBRANEGA_JEZIKA)

/**
 * Ali je IP tujca: znan, a iz države brez aktivnih lig. Neuspel IP (null)
 * ni tujec — takrat velja stari ugib brez vprašanja.
 */
export const jeTujIp = (ip: string | null | undefined, drzaveZLigami: readonly string[]): boolean =>
  Boolean(ip && drzaveZLigami.length && !drzaveZLigami.includes(ip))

/** Jezik tujca: angleščina, razen če je prvi jezik brskalnika sl, sk, hr, cs, hu, de, sr ali ro. */
export function jezikTujca(jeziki: readonly string[] | null | undefined): string {
  const prvi = (jeziki?.[0] ?? '').toLowerCase().slice(0, 2)
  return prvi === 'sl' || prvi === 'sk' || prvi === 'hr' || prvi === 'cs' || prvi === 'hu' || prvi === 'de' || prvi === 'sr' || prvi === 'ro' ? prvi : 'en'
}

/**
 * Jezik vmesnika za obiskovalca, ki gleda `drzava`:
 *   1. izrecna izbira z izbirnika jezika,
 *   2. tujec → angleščina (ali sl/sk po prvem jeziku brskalnika),
 *   3. jezik države lige (Slovenec slovenščino, Slovak slovaščino).
 */
export function zeljenJezik({
  drzava,
  izbran = null,
  tujec: tuj = null,
  jeziki = null,
}: {
  drzava: string | null
  izbran?: string | null
  tujec?: string | null
  jeziki?: readonly string[] | null
}): string {
  if (izbran) return izbran
  if (tuj) return jezikTujca(jeziki)
  return JEZIK_DRZAVE[drzava ?? 'SI'] ?? 'sl'
}

/** `zeljenJezik` s podatki tega brskalnika. */
export const jezikObiskovalca = (drzava: string | null): string =>
  zeljenJezik({
    drzava,
    izbran: izbranJezik(),
    tujec: tujec(),
    jeziki: typeof navigator !== 'undefined' ? navigator.languages : null,
  })

/** Izbira države s povezave (`/sk`) — obvelja pred ugibanjem. */
export function zapomniDrzavo(koda: string) {
  try {
    localStorage.setItem(KLJUC, koda)
  } catch {}
}

/**
 * Država lige po njeni šifri, preden je seznam lig naložen. Dogovor: šifra
 * lige zunaj Slovenije se začne s kodo države (`sk-ssfz-4liga`). Samo za
 * izbiro jezika ob nalaganju — kontekst lige ga popravi, če bi se zmotil.
 */
export function drzavaLige(slug: string | null | undefined): string | null {
  if (!slug) return null
  const m = slug.match(/^([a-z]{2})-/)
  return m && m[1].toUpperCase() in DRZAVE && m[1] !== 'sl' ? m[1].toUpperCase() : 'SI'
}

/** Jezik vmesnika za državo. */
export const JEZIK_DRZAVE: Record<string, string> = { SI: 'sl', SK: 'sk', HR: 'hr', CZ: 'cs', HU: 'hu', AT: 'de', RS: 'sr', RO: 'ro' }
