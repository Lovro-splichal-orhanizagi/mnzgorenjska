// Ugib države obiskovalca brez odvisnosti — bere ga tudi jedro prevodov
// (`src/i18n/jedro.ts`), ki ga uvažajo skripte v Node, zato tu ni Reacta ne
// Supabase. Razlaga pravil je v `drzava.ts`.

const KLJUC = 'slff-drzava'

/** Znane države: jezik in časovni pas, ki nanje kažeta. */
const DRZAVE: Record<string, { jeziki: string[]; pasovi: string[] }> = {
  SI: { jeziki: ['sl'], pasovi: ['Europe/Ljubljana'] },
  SK: { jeziki: ['sk'], pasovi: ['Europe/Bratislava'] },
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
    const osnova = j.toLowerCase().slice(0, 2)
    const d = odprte.find(([, v]) => v.jeziki.includes(osnova))
    if (d) return d[0]
  }
  const poPasu = odprte.find(([, v]) => casovniPas && v.pasovi.includes(casovniPas))
  return poPasu?.[0] ?? null
}

function shranjenaDrzava(): string | null {
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
      const odg = await fetchFn('/api/drzava', { signal: prekini?.signal, cache: 'no-store' })
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

/**
 * Celoten ugib za novega obiskovalca: izbrana država ne potrebuje IP-ja (in
 * ga ne sprašuje), sicer IP, nato jezik in pas.
 */
export async function ugibajObiskovalca(
  poIp: () => Promise<string | null> = drzavaPoIp,
): Promise<string | null> {
  if (shranjenaDrzava()) return drzavaObiskovalca()
  return drzavaObiskovalca(await poIp())
}

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
export const JEZIK_DRZAVE: Record<string, string> = { SI: 'sl', SK: 'sk' }
