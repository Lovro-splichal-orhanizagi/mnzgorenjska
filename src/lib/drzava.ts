// Iz katere države je obiskovalec — samo za prvi obisk.
//
// Domena je ena (slff.eu), lig pa je lahko iz več držav. Kdor ligo že ima
// (povezava s `?t=` ali shranjena izbira), ostane pri njej in tega ne
// potrebuje: država sledi ligi. Prijavljen uporabnik brez shranjene lige (nova
// naprava) dobi ligo svojih ekip. Šele kdor nima ničesar, dobi ugib — da Slovak
// ne pristane na Gorenjski:
//
//   izbira s povezave `/sk` ali izbirnika → IP (`/api/drzava`) → jezik
//   brskalnika → časovni pas → Slovenija.
//
// Kdor pride s povezave `slff.eu/sk`, je državo izbral sam in ta obvelja pred
// ugibanjem.
import { PRIVZETO, type Tekmovanje } from './tekmovanje'

import { JEZIK_DRZAVE, zapomniDrzavo } from './drzavaUgib.ts'

export {
  znaneDrzave,
  ugibajDrzavo,
  drzavaObiskovalca,
  drzavaPoIp,
  ugibajObiskovalca,
  zapomniDrzavo,
  drzavaLige,
  JEZIK_DRZAVE,
} from './drzavaUgib.ts'

/**
 * Privzeta liga za državo. Slovenija (in neznana država) ostane pri
 * `PRIVZETO`, kakor je bilo vedno; druga država dobi svojo prvo ligo. Če
 * država nima nobene aktivne lige, ugib ne pomeni nič in velja `PRIVZETO`.
 */
export function privzetaLiga(tekmovanja: readonly Tekmovanje[], drzava: string | null): string {
  if (!drzava || drzava === 'SI') return PRIVZETO
  return tekmovanja.find((t) => t.country_code === drzava)?.slug ?? PRIVZETO
}

/**
 * Država, ki jo obiskovalec gleda, in lige, ki jih vidi.
 *
 * Lige druge države so skrite: Slovenec slovaških ne vidi v izbirniku, oknu
 * prvega obiska ali državni lestvici. Država sledi ligi — kdor odpre
 * slovaško ligo (povezava `/sk`, deljena povezava s `?t=`), je v Slovaški in
 * vidi njene lige. Dokler liga ni znana, velja ugib, nato Slovenija.
 */
export function ligeDrzave(
  vse: readonly Tekmovanje[],
  slug: string,
  ugib: string | null,
): { drzava: string; lige: Tekmovanje[] } {
  const drzava = vse.find((t) => t.slug === slug)?.country_code ?? ugib ?? 'SI'
  const lige = vse.filter((t) => t.country_code === drzava)
  // Država brez aktivnih lig (ugib za Slovaka, dokler je njihova liga
  // neaktivna) ne sme pustiti izbirnika praznega.
  if (lige.length) return { drzava, lige }
  const slovenske = vse.filter((t) => t.country_code === 'SI')
  return { drzava: 'SI', lige: slovenske.length ? slovenske : [...vse] }
}

/**
 * Liga iz ekip prijavljenega uporabnika — za novo napravo brez shranjene lige.
 * Država z največ ekipami zmaga (ob izenačenju tista s prvo ekipo); liga je
 * njegova prva ekipa v tej državi. Ekipe v neaktivnih ligah ne štejejo.
 * `ekipe` naj bodo urejene po nastanku (`order('id')`).
 */
export function ligaEkip(
  ekipe: readonly { competition_id: number }[],
  vse: readonly Tekmovanje[],
): string | null {
  const moje = ekipe
    .map((e) => vse.find((t) => t.id === e.competition_id))
    .filter((t): t is Tekmovanje => Boolean(t?.country_code))
  if (!moje.length) return null
  const stevila = new Map<string, number>()
  for (const t of moje) stevila.set(t.country_code!, (stevila.get(t.country_code!) ?? 0) + 1)
  // Map ohrani vrstni red vstavljanja, zato izenačenje dobi prva ekipa.
  let drzava = moje[0].country_code!
  for (const [d, n] of stevila) if (n > stevila.get(drzava)!) drzava = d
  return moje.find((t) => t.country_code === drzava)!.slug
}

/**
 * Katero ligo naj vidi obiskovalec, ki je ni izbral sam. Vrstni red:
 *   1. izrecna izbira (`?t=` ali shranjena liga) — ostane, `null` = ne spreminjaj,
 *   2. liga ekip prijavljenega uporabnika,
 *   3. privzeta liga ugibane države,
 *   4. `PRIVZETO`.
 * Neznana liga v naslovu (tipkarska napaka, stara povezava) gre po istem redu.
 */
export function zacetnaLiga({
  vse,
  slug,
  izrecno,
  ligaEkip,
  ugib,
}: {
  vse: readonly Tekmovanje[]
  slug: string
  izrecno: boolean
  ligaEkip: string | null
  ugib: string | null
}): string | null {
  const znana = (s: string | null) => Boolean(s && vse.some((t) => t.slug === s))
  if (znana(slug) && izrecno) return null
  const zeljena = znana(ligaEkip) ? ligaEkip! : privzetaLiga(vse, ugib)
  return znana(zeljena) ? zeljena : PRIVZETO
}

/** Države z vsaj eno aktivno ligo, v vrstnem redu lig (Slovenija prva). */
export function drzaveZLigami(vse: readonly Tekmovanje[]): string[] {
  const d = [...new Set(vse.map((t) => t.country_code).filter((k): k is string => Boolean(k)))]
  return d.sort((a, b) => (a === 'SI' ? -1 : b === 'SI' ? 1 : a.localeCompare(b)))
}

/** Zastavica iz kode države (regionalna indikatorja): SI → 🇸🇮. */
export function zastava(koda: string): string {
  return [...koda.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
}

const KLJUC_JEZIKA = 'slff-jezik'
const KLJUC_LIGE = 'slff-tekmovanje'

/**
 * Preklop države (izbirnik v nogi in izbirniku lige, povezava v oknu prvega
 * obiska). Piše le v brskalnik — ekipe in vse na strežniku ostanejo, kot so.
 *
 * Jezik se med obiskom ne menja (glej `i18n/jedro.ts`), zato preklop stran
 * naloži znova, na naslovnici nove države. `izberiLigo: false` (okno prvega
 * obiska) si zapomni le državo, ne lige: novinec po nalaganju dobi vprašanje
 * "kje želiš igrati?" z ligami nove države.
 */
export function preklopiDrzavo(
  koda: string,
  vse: readonly Tekmovanje[],
  { izberiLigo = true, pojdi = (url: string) => window.location.assign(url) }: {
    izberiLigo?: boolean
    pojdi?: (url: string) => void
  } = {},
): string {
  const liga = privzetaLiga(vse, koda)
  zapomniDrzavo(koda)
  try {
    const j = JEZIK_DRZAVE[koda]
    if (j) localStorage.setItem(KLJUC_JEZIKA, j)
    if (izberiLigo) localStorage.setItem(KLJUC_LIGE, liga)
    else localStorage.removeItem(KLJUC_LIGE)
  } catch {
    /* zasebno okno — liga pride iz naslova */
  }
  const url = izberiLigo && liga !== PRIVZETO ? `/?t=${liga}` : '/'
  pojdi(url)
  return url
}

export const KLJUC_VSTOPA = 'slff-vstop-drzave'

/**
 * Liga v naslovu je prišla od aplikacije (vstop `/sk`, ugib države pred
 * ponovnim nalaganjem zaradi jezika), ne od obiskovalca — okno prvega obiska
 * naj se vseeno pokaže.
 */
export function oznaciVstopDrzave() {
  try {
    sessionStorage.setItem(KLJUC_VSTOPA, '1')
  } catch {
    /* zasebno okno — okno se pač ne pokaže */
  }
}
