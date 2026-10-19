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
//   data-ce="ime"        element se skrije, če je polje prazno (data-ce="!ime": če ni prazno)
//   data-barva="t|s|k"   najtemnejša | najsvetlejša barva sheme | tista od obeh, ki bolj izstopa iz barve 1
//   data-polje="a.b.0.c" pot v predmet (posnetek postave); poljaCone vidi le "a"
//   data-vzorec="{liga} · {sezona}"  besedilo iz delov polja data-polje (data-vzorec-en za angleščino)
//   data-en="…"          stalno besedilo v angleščini
//   data-izracun="povprecje a b"  zaokroženo povprečje polj (ocena kartice)
//   {n}                  v ključu in besedilu: zaporedna številka kosa (podstavki, motiv.kosov)
//   <g data-postava="postava" data-igrisce="x y w h" data-klop="x y w h"/>  postava iz posnetka
//   <g data-dres="spredaj|hrbet" data-polja="…"/>  ves panel dresa (vzorec, ovratnik, napisi)
//   data-polja="a b"     polja, ki jih cona riše, ne da bi imela svoj <text data-polje>
import { MOTIVI, type Motiv } from './motivi'

/** Vrednosti polj: besedilo, število ali predmet (posnetek postave). */
export type VrednostiPolj = Record<string, unknown>
export type Jezik = 'sl' | 'en'
/** Kos (podstavek 1–6) in jezik stalnih napisov ter datuma. */
export interface MoznostiIzrisa { kos?: number; jezik?: Jezik }

export const PISAVA_MOTIVOV = "Anton, Impact, 'Arial Narrow', sans-serif"

// Znaki, ki jih XML ne dovoli (kontrolni razen tab/LF/CR, U+FFFE/FFFF, osamljeni nadomestki), izpustimo.
const PREPOVEDANI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g
const xml = (s: string): string =>
  s.replace(PREPOVEDANI, '').replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[z]!)

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

const prazno = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'object' ? Object.keys(v).length === 0 : String(v).trim() === '')

/** Vrednost po poti "postava.zacetni.3.priimek". */
const poPoti = (vr: VrednostiPolj, pot: string): unknown =>
  pot.split('.').reduce<unknown>((v, k) => (v !== null && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), vr)
const kotBesedilo = (v: unknown): string => (v === null || v === undefined || typeof v === 'object' ? '' : String(v))

const MESECI = {
  sl: ['januarja', 'februarja', 'marca', 'aprila', 'maja', 'junija', 'julija', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const DNEVI = {
  sl: ['nedelja', 'ponedeljek', 'torek', 'sreda', 'četrtek', 'petek', 'sobota'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}
/** "2026-05-17" → "17. maja 2026" / "17 May 2026"; z dnem "nedelja, 17. maja 2026". */
export function oblikujDatum(v: string, jezik: Jezik = 'sl', zDnem = false): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!d) return v
  const [l, m, dan] = [Number(d[1]), Number(d[2]), Number(d[3])]
  if (m < 1 || m > 12) return v
  const datum = jezik === 'sl' ? `${dan}. ${MESECI.sl[m - 1]} ${l}` : `${dan} ${MESECI.en[m - 1]} ${l}`
  return zDnem ? `${DNEVI[jezik][new Date(Date.UTC(l, m - 1, dan)).getUTCDay()]}, ${datum}` : datum
}

// "Prvak mini lige Liga pri Šanku 2025/26" (baza, besedilo_prvaka) → naslov, liga, sezona.
const PRVAK = /^(prvak mini lige|mini league champion)\s+(.+?)\s+(\d{4}\/\d{2})$/i
function oblikuj(v: string, oblika: string | undefined, jezik: Jezik): string {
  if (oblika === 'datum' || oblika === 'datum-dan') return oblikujDatum(v, jezik, oblika === 'datum-dan')
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

/** Relativna svetlost (WCAG) barve #rgb/#rrggbb. */
function svetlost(hex: string): number {
  let h = barva(hex).slice(1)
  if (h.length < 6) h = [...h.slice(0, 3)].map((z) => z + z).join('')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const kontrast = (a: string, b: string): number => {
  const [x, y] = [svetlost(a), svetlost(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}
/** Barva oznake data-barva: indeks sheme ali t/s/k (glej zgoraj). */
function barvaOznake(o: string, barve: string[]): string {
  const veljavne = barve.map(barva)
  const po = [...veljavne].sort((a, b) => svetlost(a) - svetlost(b))
  if (o === 't') return po[0] ?? '#000000'
  if (o === 's') return po[po.length - 1] ?? '#000000'
  if (o === 'k') {
    const [t, s, ena] = [po[0] ?? '#000000', po[po.length - 1] ?? '#000000', veljavne[0] ?? '#000000']
    return kontrast(t, ena) >= kontrast(s, ena) ? t : s
  }
  return barva(barve[Number(o) - 1])
}

function motiv(slug: string): Motiv {
  const m = MOTIVI.find((x) => x.slug === slug)
  if (!m) throw new Error(`Neznan motiv: ${slug}`)
  return m
}

/** Cone motiva: prva je glavna (motivi.cona), ostale iz polj s svojo cono (sponzor → prsi). */
export const coneMotiva = (slug: string): string[] => Object.keys(motiv(slug).predloge)

/** Polja, ki jih riše dana cona motiva. */
export const poljaCone = (slug: string, cona?: string): string[] => {
  const svg = predloga(slug, cona)
  const kosov = motiv(slug).kosov ?? 1
  return [
    ...[...svg.matchAll(/data-polje="(\w+(?:\{n\})?)/g)].map((m) => m[1]!),
    ...[...svg.matchAll(/data-polja="([^"]*)"/g)].flatMap((m) => m[1]!.split(/\s+/).filter(Boolean)),
  ]
    .flatMap((k) => (k.endsWith('{n}') ? Array.from({ length: kosov }, (_, i) => k.replace('{n}', String(i + 1))) : [k]))
    .filter((k, i, a) => a.indexOf(k) === i)
}

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
  const g = brezOznak(oznaka.replace(/^<text/, '<g'), ['x', 'y', 'letter-spacing', 'data-luk', ...POMOZNE])
  return `${nastavi(nastavi(g, 'text-anchor', 'middle'), 'font-size', st(velikost))}${crke.join('')}</g>`
}

// Oznake predloge, ki jih izris porabi (v izhodu jih ni).
const POMOZNE = ['data-polje', 'data-sirina', 'data-velike', 'data-oblika', 'data-sredina', 'data-vrstice', 'data-vrstice-najvec', 'data-prazno', 'data-en', 'data-vzorec', 'data-vzorec-en', 'data-izracun']

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

function besedilo(oznaka: string, vsebina: string, vrednosti: VrednostiPolj, jezik: Jezik): string {
  const kljuc = atribut(oznaka, 'data-polje')
  const vzorec = (jezik === 'en' && atribut(oznaka, 'data-vzorec-en')) || atribut(oznaka, 'data-vzorec')
  const izracun = atribut(oznaka, 'data-izracun')?.split(/\s+/)
  let surovo: string
  if (izracun?.[0] === 'povprecje') {
    const st = izracun.slice(1).map((k) => Number(vrednosti[k])).filter((n) => Number.isFinite(n))
    surovo = st.length ? String(Math.round(st.reduce((a, b) => a + b, 0) / st.length)) : ''
  } else if (kljuc && vzorec) surovo = vzorec.replace(/\{([\w.]+)\}/g, (_, pot: string) => kotBesedilo(poPoti(vrednosti, `${kljuc}.${pot}`)))
  else if (kljuc) surovo = kotBesedilo(poPoti(vrednosti, kljuc))
  else surovo = (jezik === 'en' && atribut(oznaka, 'data-en')) || vsebina.replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[e]!)
  let v = oblikuj(surovo.replace(/\s+/g, ' ').trim(), atribut(oznaka, 'data-oblika'), jezik)
  if (imaAtribut(oznaka, 'data-velike')) v = v.toUpperCase()
  const velikost0 = Number(atribut(oznaka, 'font-size') ?? 10)
  const razmik = Number(atribut(oznaka, 'letter-spacing') ?? 0)
  const sirina = Number(atribut(oznaka, 'data-sirina') ?? Infinity)
  const prilega = (s: string): number => Math.min(1, sirina / Math.max(sirinaBesedila(s, velikost0, razmik), 1e-9))

  // Ena vrstica, pomanjšana do širine; pri data-vrstice="2" dolgo besedilo raje v dve.
  // data-vrstice-najvec: največja velikost dveh vrstic (privzeto 0,55 polne); predloga z več prostora jo dvigne.
  if (!v && atribut(oznaka, 'data-prazno')) v = atribut(oznaka, 'data-prazno')!
  const najvec = Number(atribut(oznaka, 'data-vrstice-najvec') ?? 0.55)
  let vrstice = [v]
  let f = prilega(v)
  const deli = atribut(oznaka, 'data-vrstice') === '2' && f < najvec ? dveVrstici(v, velikost0, razmik) : null
  if (deli) {
    vrstice = deli
    f = Math.min(najvec, prilega(deli[0]), prilega(deli[1]))
  }
  const velikost = velikost0 * f
  let o = oznaka
  const crta = atribut(o, 'stroke-width')
  if (crta && f < 1) o = nastavi(o, 'stroke-width', st(Number(crta) * Math.max(f, 0.45)))
  if (f < 1 && razmik) o = nastavi(o, 'letter-spacing', st(razmik * f))
  const luk = atribut(o, 'data-luk')
  if (luk) return poLoku(o, v, velikost, razmik * f, luk)
  o = brezOznak(nastavi(o, 'font-size', st(velikost)), POMOZNE)

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

// --- Postava (plakat "Moja postava") -------------------------------------
// Posnetek iz baze: zacetni (11, GK → FWD), klop, formacija, tocke. Točke igralca
// so tiste, ki so štele (z množiteljem kapetana; null brez točk); zamenjava = prišel s klopi,
// zamenjan = na klopi, ker ni igral; tocke_skupaj = točke kroga po kazni (glej poročilo Task 1, v2).
const SRAJCA = 'M-6 -14 Q0 -10 6 -14 L15 -9 L12 -1 L8.5 -3 V13 H-8.5 V-3 L-12 -1 L-15 -9 Z'
const VRSTE = ['FWD', 'MID', 'DEF', 'GK'] as const

// Na klopi: točke, ki niso štele, v oklepaju in bledo; igralec s klopi, ki je štel (klop plus), dobi kljukico.
function zeton(pot: string, i: Record<string, unknown>, x: number, y: number, s: number, klop: boolean, zZacetnico: boolean): string {
  const gk = i.pozicija === 'GK'
  const ime = prazno(i.priimek) ? 'ime' : 'priimek'
  const surove = typeof i.tocke === 'number' && Number.isFinite(i.tocke) ? String(i.tocke) : '–'
  const nestete = klop && i.steje !== true
  const tocke = nestete && surove !== '–' ? `(${surove})` : surove
  // Isti priimek dvakrat: začetnica imena pred priimkom (ime je "Ime Priimek" ali "Igralec").
  const zacetnica = zZacetnico && typeof i.ime === 'string' && i.ime.trim() && i.ime !== i.priimek ? `${[...i.ime.trim()][0]}. ` : ''
  const napis = zacetnica
    ? `<text y="22.7" font-size="6.2" letter-spacing=".3" data-velike data-sirina="38" data-barva="t">${xml(zacetnica + kotBesedilo(i.priimek))}</text>`
    : `<text y="22.7" font-size="6.2" letter-spacing=".3" data-polje="${pot}.${ime}" data-velike data-sirina="38" data-barva="t">I</text>`
  const kljukica = klop && i.steje === true ? '<circle cx="-12.5" cy="-12.5" r="4.2" data-barva="1" data-crta="t" stroke-width=".8"/><path d="M-14.6 -12.6 l1.6 1.7 l3.1 -3.4" fill="none" data-crta="t" stroke-width="1.1" stroke-linecap="round"/>' : ''
  const znak = i.kapetan === true
    ? '<circle cx="12.5" cy="-12.5" r="4.8" data-barva="t" data-crta="1" stroke-width="1"/><text x="12.5" y="-9.9" font-size="6.6" data-barva="1">C</text>'
    : i.podkapetan === true
      ? '<circle cx="12.5" cy="-12.5" r="4.2" data-barva="s" data-crta="t" stroke-width=".8"/><text x="12.5" y="-10.2" font-size="5.6" data-barva="t">V</text>'
      : ''
  // Prišel s klopi: puščica gor; zamenjan (ni igral): puščica dol in bledo.
  const zamenjava = i.zamenjava === true ? '<path d="M-16.5 -9.5 l4 -6 l4 6 z" data-barva="1" data-crta="t" stroke-width=".6"/>'
    : i.zamenjan === true ? '<path d="M-16.5 -15.5 l4 6 l4 -6 z" data-barva="s" data-crta="t" stroke-width=".6"/>' : ''
  return `<g transform="translate(${st(x)} ${st(y)}) scale(${s})"${i.zamenjan === true ? ' opacity=".55"' : ''}>`
    + `<path d="${SRAJCA}" data-barva="${gk ? 's' : '1'}" data-crta="t" stroke-width=".7"/>`
    + `<path d="M-6 -14 Q0 -8.5 6 -14" fill="none" data-crta="${gk ? '1' : 't'}" stroke-width="1.3"/>`
    + `<text y="7.4" font-size="${nestete && tocke.length > 2 ? 8.5 : 10.5}" data-barva="${gk ? 't' : 's'}"${gk ? '' : ' data-crta="t" stroke-width="1.8" paint-order="stroke"'}${nestete ? ' opacity=".6"' : ''}>${xml(tocke)}</text>`
    + '<rect x="-21" y="16" width="42" height="8.6" rx="1.3" data-barva="s"/>'
    + napis
    + `<text y="30.8" font-size="4.6" letter-spacing=".5" data-polje="${pot}.klub" data-velike data-sirina="40" data-barva="s" opacity=".72">K</text>`
    + znak + zamenjava + kljukica + '</g>'
}

function narisiPostavo(oznaka: string, vr: VrednostiPolj): string {
  const kljuc = atribut(oznaka, 'data-postava') ?? 'postava'
  const p = poPoti(vr, kljuc)
  const posnetek = p !== null && typeof p === 'object' ? (p as Record<string, unknown>) : {}
  const seznam = (k: string): Record<string, unknown>[] =>
    Array.isArray(posnetek[k]) ? (posnetek[k] as unknown[]).map((x) => (x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : {})) : []
  const okvir = (ime: string): number[] => (atribut(oznaka, ime) ?? '0 0 0 0').split(/\s+/).map(Number)
  const [ix, iy, iw, ih] = okvir('data-igrisce') as [number, number, number, number]
  const [kx, ky, kw, kh] = okvir('data-klop') as [number, number, number, number]
  const zacetni = seznam('zacetni')
  const klop = seznam('klop')
  const priimki = [...zacetni, ...klop].map((i) => kotBesedilo(i.priimek).toLowerCase()).filter((p) => p && p !== 'igralec')
  const podvojen = (i: Record<string, unknown>): boolean => priimki.filter((p) => p === kotBesedilo(i.priimek).toLowerCase()).length > 1
  const deli: string[] = []
  VRSTE.forEach((vrsta, r) => {
    const v = zacetni.map((i, n) => [i, n] as const).filter(([i]) => (VRSTE.includes(i.pozicija as never) ? i.pozicija : 'MID') === vrsta)
    const razmik = Math.min(iw / Math.max(v.length, 1), 58)
    const y = iy + (ih * (r + 0.5)) / VRSTE.length - 8.5
    v.forEach(([i, n], j) => deli.push(zeton(`${kljuc}.zacetni.${n}`, i, ix + iw / 2 + (j - (v.length - 1) / 2) * razmik, y, 1, false, podvojen(i))))
  })
  const razmik = Math.min(kw / Math.max(klop.length, 1), 62)
  klop.forEach((i, n) => deli.push(zeton(`${kljuc}.klop.${n}`, i, kx + kw / 2 + (n - (klop.length - 1) / 2) * razmik, ky + kh / 2 - 6, 0.8, true, podvojen(i))))
  // Kazen za prestope (≥ 0) le, če je bila: pod skupnimi točkami.
  const kazen = Number(posnetek.kazen)
  const [zx, zy] = (atribut(oznaka, 'data-kazen') ?? '').split(/\s+/).map(Number)
  if (kazen > 0 && Number.isFinite(zx) && Number.isFinite(zy)) {
    deli.push(`<text x="${st(zx!)}" y="${st(zy!)}" font-size="4.4" letter-spacing=".8" data-barva="1" data-en="INCL. −${kazen} TRANSFERS">VKLJ. −${kazen} ZA PRESTOPE</text>`)
  }
  return `<g>${deli.join('')}</g>`
}

// --- Dres po meri: ves panel (spredaj, hrbet) v ploskih barvah ----------------
// Barve so barve dresa (barva1, barva2, barva3 po vrsti, le izpolnjene; personalizacija.barve).
// Obliko majice (rokavi, vrat) odreže mockup; tu je pravokotnik cone.
const BELA = '#FFFFFF'
const CRNA = '#111111'
const najmanjsiKontrast = (b: string, ozadje: string[]): number => Math.min(...ozadje.map((o) => kontrast(b, o)))
/** Prva barva, ki dovolj izstopa iz vseh barv ozadja, sicer najbolj kontrastna. */
const izberiBarvo = (kandidati: (string | null)[], ozadje: string[]): string => {
  const k = kandidati.filter((b): b is string => !!b)
  return k.find((b) => najmanjsiKontrast(b, ozadje) >= 3)
    ?? k.reduce((a, b) => (najmanjsiKontrast(b, ozadje) > najmanjsiKontrast(a, ozadje) ? b : a))
}

function grbSlff(x: number, y: number, r: number): string {
  return `<g transform="translate(${st(x)} ${st(y)}) scale(${st(r / 34)})">`
    + '<circle r="34" fill="#0F5A36" stroke="#F3E9C8" stroke-width="1.4"/>'
    + '<circle r="30.6" fill="none" stroke="#F3E9C8" stroke-width="1.3"/>'
    + '<text data-luk="0 0 23.6" font-size="7.2" letter-spacing=".5" fill="#F3E9C8">SUNDAY LEAGUE</text>'
    + '<text data-luk="0 0 -29" font-size="6.4" letter-spacing=".3" fill="#E8B22E">FANTASY FOOTBALL</text>'
    + '<text y="6.4" font-size="15" letter-spacing=".6" fill="#F3E9C8">SLFF</text>'
    + '<path d="M-20 -1 l1.2 2.4 2.6 .4 -1.9 1.8 .5 2.6 -2.4 -1.2 -2.4 1.2 .5 -2.6 -1.9 -1.8 2.6 -.4 z M20 -1 l1.2 2.4 2.6 .4 -1.9 1.8 .5 2.6 -2.4 -1.2 -2.4 1.2 .5 -2.6 -1.9 -1.8 2.6 -.4 z" fill="#E8B22E"/>'
    + '</g>'
}

function narisiDres(oznaka: string, vr: VrednostiPolj, barve: string[]): string {
  const hrbet = atribut(oznaka, 'data-dres') === 'hrbet'
  const [W, H] = (atribut(oznaka, 'data-mere') ?? '600 750').split(/\s+/).map(Number) as [number, number]
  const cx = W / 2
  const b1 = barva(barve[0])
  const b2 = barve[1] ? barva(barve[1]) : b1
  const b3 = barve[2] ? barva(barve[2]) : null
  const vzorec = kotBesedilo(vr.vzorec)
  const pr = (x: number, y: number, w: number, h: number, b: string): string =>
    `<rect x="${st(x)}" y="${st(y)}" width="${st(w)}" height="${st(h)}" fill="${b}"/>`
  const deli: string[] = []
  let ozadje = [b1, b2]
  if (vzorec === 'crte') {
    deli.push(pr(0, 0, W, H, b2))
    for (let x = cx - 37.5 - 150 * Math.ceil(cx / 150); x < W; x += 150) deli.push(pr(x, 0, 75, H, b1))
  } else if (vzorec === 'tanke-crte') {
    deli.push(pr(0, 0, W, H, b1))
    for (let x = cx - 2.5 - 40 * Math.ceil(cx / 40); x < W; x += 40) deli.push(pr(x, 0, 5, H, b2))
    ozadje = [b1]
  } else if (vzorec === 'obroci') {
    deli.push(pr(0, 0, W, H, b2))
    for (let y = 40; y < H; y += 160) deli.push(pr(0, y, W, 80, b1))
  } else if (vzorec === 'serpa') {
    // Šerpa z desne rame nosilca na levi bok; na hrbtu zrcalno.
    deli.push(pr(0, 0, W, H, b1))
    deli.push(`<rect x="${st(cx - 75)}" y="${st(-H)}" width="150" height="${st(3 * H)}" fill="${b2}" transform="${hrbet ? `translate(${W} 0) scale(-1 1) ` : ''}rotate(-38 ${st(cx)} ${st(H / 2)})"/>`)
  } else if (vzorec === 'polovice') {
    deli.push(pr(0, 0, cx, H, hrbet ? b2 : b1), pr(cx, 0, W - cx, H, hrbet ? b1 : b2))
  } else {
    deli.push(pr(0, 0, W, H, b1))
    ozadje = [b1]
  }
  const obroba = b3 ?? (vzorec === 'polovice' ? izberiBarvo([BELA, CRNA], [b1, b2]) : b2)
  // Ovratnik: le namig v barvi obrob; pravi izrez vratu da oblika majice.
  const ovratnik = kotBesedilo(vr.ovratnik)
  const crta = (d: string, w: number, dodatno = ''): string => `<path d="${d}" fill="none" stroke="${obroba}" stroke-width="${w}"${dodatno}/>`
  if (hrbet) deli.push(crta(`M${st(cx - 80)} 0 Q${st(cx)} 36 ${st(cx + 80)} 0`, ovratnik === 'polo' ? 24 : 16))
  else if (ovratnik === 'v') deli.push(crta(`M${st(cx - 80)} 0 L${st(cx)} 130 L${st(cx + 80)} 0`, 18, ' stroke-linejoin="miter"'))
  else if (ovratnik === 'polo') {
    deli.push(pr(cx - 13, 40, 26, 130, obroba))
    deli.push([70, 105, 140].map((y) => `<circle cx="${st(cx)}" cy="${y}" r="4.5" fill="${izberiBarvo([b1, BELA, CRNA], [obroba])}"/>`).join(''))
    deli.push(crta(`M${st(cx - 86)} 0 Q${st(cx)} 76 ${st(cx + 86)} 0`, 20))
    deli.push(`<path d="M${st(cx - 2)} 62 L${st(cx - 74)} 4 L${st(cx - 94)} 44 L${st(cx - 40)} 100 Z M${st(cx + 2)} 62 L${st(cx + 74)} 4 L${st(cx + 94)} 44 L${st(cx + 40)} 100 Z" fill="${obroba}" stroke="${izberiBarvo([BELA, CRNA], [obroba])}" stroke-width="2" stroke-opacity=".35"/>`)
  } else deli.push(crta(`M${st(cx - 82)} 0 Q${st(cx)} 116 ${st(cx + 82)} 0`, 18))
  // Napisi v barvi, ki izstopa iz vzorca; na dvobarvnem vzorcu še obroba.
  // Tanke črte: napis izstopa iz osnove (b1), obroba v osnovni barvi ga loči od črt.
  const tanke = vzorec === 'tanke-crte'
  const napis = izberiBarvo([b3, ozadje.length === 1 ? b2 : null, BELA, CRNA], ozadje)
  const rob = tanke ? ` stroke="${b1}" paint-order="stroke"`
    : ozadje.length > 1 || najmanjsiKontrast(napis, ozadje) < 3
      ? ` stroke="${kontrast(napis, BELA) > kontrast(napis, CRNA) ? BELA : CRNA}" paint-order="stroke"`
      : ''
  const tekst = (polje: string, y: number, velikost: number, sirina: number, razmik: number, debelina: number): string =>
    `<text x="${st(cx)}" y="${st(y)}" font-size="${velikost}" letter-spacing="${razmik}" data-polje="${polje}" data-velike data-sirina="${sirina}" data-sredina data-ce="${polje}" fill="${napis}"${rob ? `${rob} stroke-width="${debelina}"` : ''}>X</text>`
  if (hrbet) {
    deli.push(`<text x="${st(cx)}" y="64" font-size="13" letter-spacing="4" fill="${napis}" opacity=".85">SLFF</text>`)
    deli.push(tekst('ime', H * 0.2, 62, W * 0.68, 5, 7))
    deli.push(tekst('stevilka', H * 0.62, 300, W * 0.7, 0, 12))
  } else {
    deli.push(grbSlff(W * 0.7, H * 0.22, 34))
    deli.push(tekst('sponzor', H * 0.44, 76, W * 0.68, 1.5, 8))
  }
  return `<g>${deli.join('')}</g>`
}

/**
 * Motiv kot SVG niz za dano cono (privzeto glavno). Barve so po vrsti iz sheme
 * (barve[0] = data-barva="1"; pri dresu barve dresa). Vse vrednosti so ubežane;
 * prazno polje z data-ce skrije svoj del. Z `mm` (mere cone nosilca) ima koren to
 * širino in višino v mm, motiv je sorazmerno na sredini; brez nje naravna velikost
 * predloge. `moznosti.kos` izbere kos kompleta (podstavek 1–6), `jezik` stalne napise in datum.
 */
// Vsak izris dobi svoje pripone id-jev: več motivov na isti strani (vitrina) si sicer deli #zvezda, clipPath …
let izrisov = 0

export function narisiMotiv(
  slug: string,
  polja: VrednostiPolj,
  barve: string[],
  cona?: string,
  mm?: { sirina: number; visina: number },
  moznosti: MoznostiIzrisa = {},
): string {
  const jezik = moznosti.jezik ?? 'sl'
  const pripona = `-m${++izrisov}`
  let svg = predloga(slug, cona)
    .replace(/\sid="([^"]+)"/g, ` id="$1${pripona}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1${pripona})`)
    .replace(/href="#([^"]+)"/g, `href="#$1${pripona}"`)
    .replaceAll('{n}', String(Math.max(1, Math.floor(moznosti.kos ?? 1))))
  // Mere cone nosilca: viewBox ostane, privzeti preserveAspectRatio (xMidYMid meet)
  // motiv sorazmerno pomanjša in postavi na sredino cone.
  if (mm) svg = svg.replace(/^(<svg\b[^>]*>)/m, (o) => nastavi(nastavi(o, 'width', `${st(mm.sirina)}mm`), 'height', `${st(mm.visina)}mm`))
  // Sestavljeni deli (postava, dres) najprej: rišejo z istimi oznakami kot predloga.
  svg = svg.replace(/<g\b[^>]*\sdata-postava="[^"]*"[^>]*?(?:\/>|><\/g>)/g, (o) => narisiPostavo(o, polja))
  svg = svg.replace(/<g\b[^>]*\sdata-dres="[^"]*"[^>]*?(?:\/>|><\/g>)/g, (o) => narisiDres(o, polja, barve))
  // Besedila (polja in stalni napisi po loku): vsebina je navaden tekst brez gnezdenja.
  svg = svg.replace(/(<text\b[^>]*\sdata-(?:polje|luk|en|izracun|sirina)="[^"]+"[^>]*>)([^<]*)<\/text>/g, (_, oznaka: string, vsebina: string) =>
    besedilo(oznaka, vsebina, polja, jezik))
  svg = svg.replace(/<[\w:-]+\b[^>]*>/g, (oznaka) => {
    if (oznaka.startsWith('</')) return oznaka
    let o = brezOznak(oznaka, ['data-polja'])
    const b = atribut(o, 'data-barva')
    if (b) o = nastavi(o, 'fill', barvaOznake(b, barve))
    const c = atribut(o, 'data-crta')
    if (c) o = nastavi(o, 'stroke', barvaOznake(c, barve))
    const ce = atribut(o, 'data-ce')
    if (ce && prazno(poPoti(polja, ce.replace(/^!/, ''))) !== ce.startsWith('!')) o = nastavi(o, 'display', 'none')
    return o
  })
  return svg
}

/** Vsi kosi kompleta (podstavki) na enem listu, 3 v vrsti, 5 mm razmika: list za tisk. */
export function narisiKose(slug: string, polja: VrednostiPolj, barve: string[], jezik: Jezik = 'sl'): string {
  const kosov = motiv(slug).kosov ?? 1
  const { sirina, visina } = velikostMm(slug)
  const vVrsti = Math.min(3, kosov)
  const [W, H] = [vVrsti * sirina + (vVrsti - 1) * 5, Math.ceil(kosov / vVrsti) * (visina + 5) - 5]
  const kosi = Array.from({ length: kosov }, (_, i) =>
    narisiMotiv(slug, polja, barve, undefined, undefined, { kos: i + 1, jezik })
      .replace(/^<svg\b[^>]*>/, (o) => nastavi(nastavi(nastavi(nastavi(o, 'width', st(sirina)), 'height', st(visina)),
        'x', st((i % vVrsti) * (sirina + 5))), 'y', st(Math.floor(i / vVrsti) * (visina + 5)))))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${st(W)} ${st(H)}" width="${st(W)}mm" height="${st(H)}mm">${kosi.join('')}</svg>`
}

/** Hex barv dresa iz polj vrste "barva" (po vrsti, le izpolnjena): za predogled; naročilo ima personalizacija.barve. */
export function barveIzPolj(definicije: { kljuc: string; vrsta: string; moznosti?: unknown[] }[], vrednosti: VrednostiPolj): string[] {
  return definicije.filter((d) => d.vrsta === 'barva' && !prazno(vrednosti[d.kljuc])).map((d) => {
    const m = d.moznosti?.find((x) => x !== null && typeof x === 'object' && (x as { kljuc?: unknown }).kljuc === vrednosti[d.kljuc]) as { hex?: string } | undefined
    return barva(m?.hex)
  })
}

/**
 * SVG z vgrajeno pisavo (data URL): za tiskarno in <img>/<canvas>, kjer pisava strani ne velja.
 * Pisava (~30 KB base64) se naloži šele tu, v svojem kosu, ne v vsakem, ki riše motive.
 */
export async function zVgrajenoPisavo(svg: string): Promise<string> {
  const { default: pisava } = await import('./motivi/anton.ttf?inline')
  return svg.replace(/(<svg\b[^>]*>)/, `$1<style>@font-face{font-family:Anton;src:url(${pisava}) format('truetype');}</style>`)
}
