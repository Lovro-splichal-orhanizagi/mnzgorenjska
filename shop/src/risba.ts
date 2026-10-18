// Izris motiva: predloga iz shop/src/motivi/ + polja kupca + barve sheme → SVG.
// Ista funkcija riše mockup, vitrino in datoteko za tiskarno. Brez DOM-a (teče
// tudi v smoke pod Node): predloga je urejen SVG, menjamo le označena mesta.
//
// Oznake v predlogi (glej shop/src/motivi/index.ts):
//   data-barva="1|2|3"   fill iz sheme      data-crta="1|2|3"  stroke iz sheme
//   data-polje="ime"     vsebina <text> je vrednost polja (ubežana)
//   data-velike          VELIKE ČRKE
//   data-oblika="…"      sezona (2025 → 2025/26), navednice, prvak-naslov|prvak-liga|prvak-sezona
//   data-sirina="260"    najširše besedilo; daljše dobi manjšo pisavo (in tanjšo črto)
//   data-sredina         ob manjši pisavi ostane navpično na sredini (y se premakne)
//   data-luk="cx cy r"   besedilo po krožnem loku, sredina na vrhu (r < 0: spodnji lok)
//   data-ce="ime"        element se skrije, če je polje prazno
import { MOTIVI, type Motiv } from './motivi'
import pisava from './motivi/anton.ttf?inline'

export type VrednostiPolj = Record<string, string | number | null | undefined>

export const PISAVA_MOTIVOV = "Anton, Impact, 'Arial Narrow', sans-serif"

const xml = (s: string): string =>
  s.replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[z]!)

// Širine znakov pisave Anton v enotah 2048 na em (hmtx); neznan znak ≈ 1000.
const SIRINE: Record<string, number> = {
  A: 994, B: 980, C: 971, D: 1010, E: 843, F: 817, G: 993, H: 1022, I: 464, J: 955, K: 967, L: 814, M: 1528,
  N: 1020, O: 996, P: 967, Q: 1011, R: 976, S: 945, T: 810, U: 970, V: 961, W: 1458, X: 991, Y: 914, Z: 840,
  '0': 1012, '1': 677, ' ': 480, '.': 468, "'": 438, '&': 1065, '!': 469, '?': 1008, '-': 637, '/': 830,
  '“': 950, '”': 948, '„': 957, '…': 1450, '–': 1024, '—': 2048,
  a: 990, b: 1027, c: 1006, d: 1020, e: 1000, f: 574, g: 1032, h: 1035, i: 498, j: 538, k: 1005, l: 508, m: 1553,
  n: 1021, o: 1017, p: 1027, q: 1020, r: 710, s: 972, t: 625, u: 1022, v: 944, w: 1426, x: 940, y: 944, z: 790,
}
const VISINA_VELIKIH = 1760 / 2048

/** Širina znaka v em: števke so enako široke kot 0, črka s strešico kot osnovna. */
const sirinaZnaka = (z: string): number =>
  (SIRINE[z] ?? (/\d/.test(z) ? 1012 : SIRINE[z.normalize('NFD')[0] ?? ''] ?? 1000)) / 2048

/** Širina besedila v enotah predloge (pisava Anton, razmik med črkami). */
export const sirinaBesedila = (s: string, velikost: number, razmik = 0): number => {
  const z = [...s]
  return z.reduce((v, c) => v + sirinaZnaka(c) * velikost, 0) + razmik * Math.max(0, z.length - 1)
}

const prazno = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === ''

// "Prvak mini lige Liga pri Šanku 2025/26" (baza, besedilo_prvaka) → naslov, liga, sezona.
const PRVAK = /^(prvak mini lige|mini league champion)\s+(.+?)\s+(\d{4}\/\d{2})$/i
function oblikuj(v: string, oblika: string | undefined): string {
  if (oblika === 'sezona') return /^\d{4}$/.test(v) ? `${v}/${String((Number(v) + 1) % 100).padStart(2, '0')}` : v
  if (oblika === 'navednice') return `“${v}”`
  const p = PRVAK.exec(v)
  if (oblika === 'prvak-naslov') return p ? p[1]! : ''
  if (oblika === 'prvak-liga') return p ? p[2]! : v
  if (oblika === 'prvak-sezona') return p ? p[3]! : ''
  return v
}

const atribut = (oznaka: string, ime: string): string | undefined =>
  new RegExp(`\\s${ime}="([^"]*)"`).exec(oznaka)?.[1]
const imaAtribut = (oznaka: string, ime: string): boolean => new RegExp(`\\s${ime}(="[^"]*")?[\\s/>]`).test(oznaka)
/** Nastavi atribut v začetni oznaki (zamenja obstoječega). */
const nastavi = (oznaka: string, ime: string, vrednost: string): string => {
  const brez = oznaka.replace(new RegExp(`\\s${ime}="[^"]*"`), '')
  return brez.replace(/^<([\w:-]+)/, `<$1 ${ime}="${xml(vrednost)}"`)
}
const brezOznak = (oznaka: string, imena: string[]): string =>
  imena.reduce((o, ime) => o.replace(new RegExp(`\\s${ime}(="[^"]*")?(?=[\\s/>])`, 'g'), ''), oznaka)
const st = (n: number): string => String(Math.round(n * 100) / 100)

const barva = (b: string | undefined): string => (b && /^#[0-9a-f]{3,8}$/i.test(b) ? b : '#000000')

function motiv(slug: string): Motiv {
  const m = MOTIVI.find((x) => x.slug === slug)
  if (!m) throw new Error(`Neznan motiv: ${slug}`)
  return m
}

/** Cone motiva: prva je glavna (motivi.cona), ostale iz polj s svojo cono (sponzor → prsi). */
export const coneMotiva = (slug: string): string[] => Object.keys(motiv(slug).predloge)

/** Polja, ki jih riše dana cona motiva. */
export const poljaCone = (slug: string, cona?: string): string[] =>
  [...predloga(slug, cona).matchAll(/data-polje="(\w+)"/g)].map((m) => m[1]!).filter((k, i, a) => a.indexOf(k) === i)

function predloga(slug: string, cona?: string): string {
  const m = motiv(slug)
  const svg = m.predloge[cona ?? m.cona]
  if (!svg) throw new Error(`Motiv ${slug} nima cone ${cona}`)
  return svg
}

/** Mere tiska v mm (viewBox predloge je v mm). */
export function velikostMm(slug: string, cona?: string): { sirina: number; visina: number } {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(predloga(slug, cona))
  if (!vb) throw new Error(`Predloga ${slug} nima viewBox v mm`)
  return { sirina: Number(vb[1]), visina: Number(vb[2]) }
}

/** Ali je cona prazna (vsa njena polja prazna): taka cona se ne tiska. */
export const praznaCona = (slug: string, polja: VrednostiPolj, cona?: string): boolean =>
  poljaCone(slug, cona).every((k) => prazno(polja[k]))

// Besedilo po loku: vsaka črka svoj <text>, zasukan v tangento. Deluje povsod
// (brskalnik, rsvg-convert, programi tiskarne), tudi kjer textPath ne.
function poLoku(oznaka: string, besedilo: string, velikost: number, razmik: number, luk: string): string {
  const [cx, cy, r] = luk.split(/\s+/).map(Number) as [number, number, number]
  const R = Math.abs(r)
  const znaki = [...besedilo]
  const skupaj = sirinaBesedila(besedilo, velikost, razmik)
  let pot = -skupaj / 2
  const crke = znaki.map((z) => {
    const w = sirinaZnaka(z) * velikost
    const kot = (pot + w / 2) / R
    pot += w + razmik
    const x = cx + R * Math.sin(kot)
    const y = r > 0 ? cy - R * Math.cos(kot) : cy + R * Math.cos(kot)
    const zasuk = ((r > 0 ? kot : -kot) * 180) / Math.PI
    return z === ' ' ? '' : `<text transform="translate(${st(x)} ${st(y)}) rotate(${st(zasuk)})">${xml(z)}</text>`
  })
  const g = brezOznak(oznaka.replace(/^<text/, '<g'), ['x', 'y', 'letter-spacing', 'data-luk', 'data-polje', 'data-sirina', 'data-velike', 'data-oblika', 'data-sredina'])
  return `${nastavi(nastavi(g, 'text-anchor', 'middle'), 'font-size', st(velikost))}${crke.join('')}</g>`
}

// Najboljša delitev v dve vrstici (ob presledku, najožja daljša vrstica) ali null.
function dveVrstici(v: string, velikost: number, razmik: number): [string, string] | null {
  let naj: [string, string] | null = null
  let najW = Infinity
  for (const [i, z] of [...v].entries()) {
    if (z !== ' ') continue
    const a = [...v].slice(0, i).join('')
    const b = [...v].slice(i + 1).join('')
    const w = Math.max(sirinaBesedila(a, velikost, razmik), sirinaBesedila(b, velikost, razmik))
    if (w < najW) [naj, najW] = [[a, b], w]
  }
  return naj
}

function besedilo(oznaka: string, vsebina: string, vrednosti: VrednostiPolj): string {
  const kljuc = atribut(oznaka, 'data-polje')
  const surovo = kljuc ? String(vrednosti[kljuc] ?? '') : vsebina
  let v = oblikuj(surovo.replace(/\s+/g, ' ').trim(), atribut(oznaka, 'data-oblika'))
  if (imaAtribut(oznaka, 'data-velike')) v = v.toUpperCase()
  const velikost0 = Number(atribut(oznaka, 'font-size') ?? 10)
  const razmik = Number(atribut(oznaka, 'letter-spacing') ?? 0)
  const sirina = Number(atribut(oznaka, 'data-sirina') ?? Infinity)
  const prilega = (s: string): number => Math.min(1, sirina / Math.max(sirinaBesedila(s, velikost0, razmik), 1e-9))

  // Ena vrstica, pomanjšana do širine; pri data-vrstice="2" dolgo besedilo raje v dve.
  let vrstice = [v]
  let f = prilega(v)
  const deli = atribut(oznaka, 'data-vrstice') === '2' && f < 0.55 ? dveVrstici(v, velikost0, razmik) : null
  if (deli) {
    vrstice = deli
    f = Math.min(0.55, prilega(deli[0]), prilega(deli[1]))
  }
  const velikost = velikost0 * f
  let o = oznaka
  const crta = atribut(o, 'stroke-width')
  if (crta && f < 1) o = nastavi(o, 'stroke-width', st(Number(crta) * Math.max(f, 0.45)))
  if (f < 1 && razmik) o = nastavi(o, 'letter-spacing', st(razmik * f))
  const luk = atribut(o, 'data-luk')
  if (luk) return poLoku(o, v, velikost, razmik * f, luk)
  o = brezOznak(nastavi(o, 'font-size', st(velikost)), ['data-polje', 'data-sirina', 'data-velike', 'data-oblika', 'data-sredina', 'data-vrstice'])

  // Navpično: y predloge je osnovnica ene vrstice v polni velikosti; z data-sredina
  // ostane sredina velikih črk na istem mestu tudi ob manjši pisavi ali dveh vrsticah.
  const y0 = Number(atribut(oznaka, 'y') ?? 0)
  const visina = velikost * VISINA_VELIKIH
  const razmakVrstic = velikost * 0.2
  const sredina = imaAtribut(oznaka, 'data-sredina')
  const sredisce = y0 - (velikost0 * VISINA_VELIKIH) / 2
  return vrstice
    .map((vrstica, i) => {
      const y = sredina || vrstice.length > 1
        ? sredisce - (vrstice.length * visina + (vrstice.length - 1) * razmakVrstic) / 2 + visina + i * (visina + razmakVrstic)
        : y0
      return `${nastavi(o, 'y', st(y))}${xml(vrstica)}</text>`
    })
    .join('')
}

/**
 * Motiv kot SVG niz za dano cono (privzeto glavno). Barve so po vrsti iz sheme
 * (barve[0] = data-barva="1"). Vse vrednosti so ubežane; prazno polje z
 * data-ce skrije svoj del. Z `mm` (mere cone nosilca) ima koren to širino in
 * višino v mm, motiv je sorazmerno na sredini; brez nje naravna velikost predloge.
 */
export function narisiMotiv(
  slug: string,
  polja: VrednostiPolj,
  barve: string[],
  cona?: string,
  mm?: { sirina: number; visina: number },
): string {
  let svg = predloga(slug, cona)
  // Mere cone nosilca: viewBox ostane, privzeti preserveAspectRatio (xMidYMid meet)
  // motiv sorazmerno pomanjša in postavi na sredino cone.
  if (mm) svg = svg.replace(/^(<svg\b[^>]*>)/m, (o) => nastavi(nastavi(o, 'width', `${st(mm.sirina)}mm`), 'height', `${st(mm.visina)}mm`))
  // Besedila najprej (polja in stalni napisi po loku): vsebina je navaden tekst brez gnezdenja.
  svg = svg.replace(/(<text\b[^>]*\sdata-(?:polje|luk)="[^"]+"[^>]*>)([^<]*)<\/text>/g, (_, oznaka: string, vsebina: string) =>
    besedilo(oznaka, vsebina, polja))
  svg = svg.replace(/<[\w:-]+\b[^>]*>/g, (oznaka) => {
    if (oznaka.startsWith('</')) return oznaka
    let o = oznaka
    const b = atribut(o, 'data-barva')
    if (b) o = nastavi(o, 'fill', barva(barve[Number(b) - 1]))
    const c = atribut(o, 'data-crta')
    if (c) o = nastavi(o, 'stroke', barva(barve[Number(c) - 1]))
    const ce = atribut(o, 'data-ce')
    if (ce && prazno(polja[ce])) o = nastavi(o, 'display', 'none')
    return o
  })
  return svg
}

/** SVG z vgrajeno pisavo (data URL): za tiskarno in <img>/<canvas>, kjer pisava strani ne velja. */
export const zVgrajenoPisavo = (svg: string): string =>
  svg.replace(/(<svg\b[^>]*>)/, `$1<style>@font-face{font-family:Anton;src:url(${pisava}) format('truetype');}</style>`)
