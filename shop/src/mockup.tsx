// Živ mockup: motiv (SVG iz narisiMotiv) na fotografiji praznega nosilca.
// Cona je štirikotnik na fotografiji (trgovina.cone.koti, px na 1600×1600):
// pravokotnik se postavi v odstotkih (brez merjenja, brez premika ob izrisu),
// drug štirikotnik dobi perspektivo z matrix3d. Tisk je neprosojen (DTF), zato
// navadno prekrivanje, nato ga potemnijo gube: svetlost fotografije pod cono,
// deljena s povprečjem cone (0,45 + 0,55·x, največ 1), pomnožena z motivom.
//
// Nosilci delov 2 in 3 (po fotografiji, ker jih baza ne opiše): kozarec in vrč
// sta valj (cona je razvita v merilu osi, motiv se ukrivi okoli navpične osi),
// gravura je bela in prosojna; odpirač ima temno gravuro z robom svetlobe; kapa
// vezenje z nitjo; plakat steklo okvirja; podstavki vseh šest kosov; dres se
// obreže na obris majice, rokavi dobijo barvo 1.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Cona } from './baza'

/** Velikost fotografij nosilcev v px (shop/nosilci). */
export const FOTO = 1600

type Tocka = [number, number]
type Videz = 'steklo' | 'kovina' | 'vezenje' | 'okvir' | 'dres'

/** Posebnosti fotografije nosilca: svetlost pod cono (meritev), valj v mm, videz, kosi kompleta. */
interface Nosilec { svetlost?: number; valj?: number; videz?: Videz; kosi?: Tocka[][] }

/** Pravokotnik [x0,y0]–[x1,y1] kot štirje koti TL, TR, BR, BL. */
const kvadrat = (x0: number, y0: number, x1: number, y1: number): Tocka[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

export const NOSILCI: Record<string, Nosilec> = {
  '/nosilci/kozarec.webp': { valj: 37.6, videz: 'steklo' },
  '/nosilci/vrc.webp': { valj: 45, videz: 'steklo' },
  '/nosilci/odpirac.webp': { videz: 'kovina' },
  '/nosilci/kapa-crna.webp': { svetlost: 0.1, videz: 'vezenje' },
  '/nosilci/kapa-bela-crna.webp': { svetlost: 0.85, videz: 'vezenje' },
  '/nosilci/plakat.webp': { svetlost: 0.95, videz: 'okvir' },
  '/nosilci/kartica.webp': { svetlost: 0.93 },
  '/nosilci/zastavica.webp': { svetlost: 0.85 },
  '/nosilci/sal.webp': { svetlost: 0.86 },
  '/nosilci/trak.webp': { svetlost: 0.88 },
  '/nosilci/dres-spredaj.webp': { svetlost: 0.9, videz: 'dres' },
  '/nosilci/dres-hrbet.webp': { svetlost: 0.88, videz: 'dres' },
  // Šest podstavkov (3×2), kos 1–6 po vrsti; cona je kos 2.
  '/nosilci/podstavki.webp': {
    svetlost: 0.85,
    kosi: [kvadrat(63, 303, 522, 762), kvadrat(568, 302, 1028, 761), kvadrat(1075, 303, 1534, 762),
      kvadrat(63, 802, 524, 1265), kvadrat(567, 802, 1028, 1266), kvadrat(1071, 802, 1533, 1266)],
  },
}

/** Projektivna preslikava enotskega kvadrata v štirikotnik TL, TR, BR, BL (Heckbert). */
export function homografija(k: Tocka[]): { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number } {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = k as [Tocka, Tocka, Tocka, Tocka]
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  const det = dx1 * dy2 - dx2 * dy1
  const g = dx3 === 0 && dy3 === 0 ? 0 : (dx3 * dy2 - dx2 * dy3) / det
  const h = dx3 === 0 && dy3 === 0 ? 0 : (dx1 * dy3 - dx3 * dy1) / det
  return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h }
}

/** matrix3d za element velikosti S×S (izhodišče 0 0), ki ga preslika v štirikotnik `k` (v enotah 0–1). */
export function matrika(k: Tocka[], S: number): string {
  const { a, b, c, d, e, f, g, h } = homografija(k)
  return `matrix3d(${[a, d, 0, g / S, b, e, 0, h / S, 0, 0, 1, 0, c * S, f * S, 0, 1].map((n) => +n.toFixed(6)).join(',')})`
}

/** Pravokotnik brez zasuka: dovolj so odstotki. */
const pravokotnik = ([tl, tr, br, bl]: Tocka[]): boolean =>
  tl![1] === tr![1] && bl![1] === br![1] && tl![0] === bl![0] && tr![0] === br![0]

/** Koren predloge dobi mere v uporabniških enotah (mm cone), ne v pravih mm. */
const vCono = (svg: string, s: number, v: number): string =>
  svg.replace(/^<svg\b[^>]*>/, (o) => o.replace(/\s(width|height)="[^"]*"/g, '').replace(/^<svg/, `<svg width="${s}" height="${v}"`))

/** Povprečna svetlost cone: izmerjena pri fotografiji, sicer po barvi oblačila. */
const svetlost = (slika: string, barva: string | null | undefined): number =>
  NOSILCI[slika]?.svetlost ?? (barva === 'Bela' || barva === 'Bela-črna' ? 0.9 : 0.1)

/**
 * Valj: navpični trakovi razvite cone, vsak premaknjen in stisnjen na x' = c + R·sin((x − c)/R)
 * (mm cone, R = polmer). Gravura proti robu valja zbledi, kot pod kotom na steklu.
 */
export function trakoviValja(s: number, R: number, n = 40): { x0: number; x1: number; x0v: number; k: number; prosojnost: number }[] {
  const c = s / 2
  const L = Math.min(s / 2, R * 1.5)
  const v = (x: number) => c + R * Math.sin((x - c) / R)
  return Array.from({ length: n }, (_, i) => {
    const x0 = c - L + (2 * L * i) / n, x1 = c - L + (2 * L * (i + 1)) / n
    return { x0, x1, x0v: v(x0), k: (v(x1) - v(x0)) / (x1 - x0), prosojnost: +(0.5 + 0.42 * Math.cos(((x0 + x1) / 2 - c) / R)).toFixed(3) }
  })
}

/** Filtri videza (enote filtra = mm cone). */
function filterVideza(id: string, videz: Videz | undefined, s: number, v: number): ReactNode {
  const obseg = { filterUnits: 'userSpaceOnUse' as const, x: -2, y: -2, width: s + 4, height: v + 4, colorInterpolationFilters: 'sRGB' as const }
  if (videz === 'steklo') {
    // Peskana gravura: bela, rahlo zabrisan rob in mehak sij.
    return (
      <filter id={id} {...obseg}>
        <feGaussianBlur in="SourceGraphic" stdDeviation={0.35} result="sij" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={0.06} result="rob" />
        <feMerge><feMergeNode in="sij" /><feMergeNode in="rob" /></feMerge>
      </filter>
    )
  }
  if (videz === 'kovina') {
    // Gravura v kovini: temna, spodaj tanek svetel rob (luč na zarezi).
    return (
      <filter id={id} {...obseg}>
        <feOffset in="SourceAlpha" dy={0.18} result="zamik" />
        <feFlood floodColor="#ffffff" floodOpacity={0.45} />
        <feComposite in2="zamik" operator="in" result="luc" />
        <feComposite in="luc" in2="SourceAlpha" operator="out" result="rob" />
        <feMerge><feMergeNode in="rob" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    )
  }
  if (videz === 'vezenje') {
    // Nit: drobne poševne proge v svetlosti, rahlo izbočeno (senca spodaj desno).
    return (
      <filter id={id} {...obseg}>
        <feTurbulence type="fractalNoise" baseFrequency="1.6 0.18" numOctaves={2} seed={3} result="sum" />
        <feColorMatrix in="sum" type="matrix" values="0.6 0 0 0 0.6  0.6 0 0 0 0.6  0.6 0 0 0 0.6  0 0 0 0 1" result="nit" />
        <feComposite in="SourceGraphic" in2="nit" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="vez" />
        <feDropShadow in="vez" dx={0.12} dy={0.22} stdDeviation={0.18} floodColor="#000" floodOpacity={0.55} />
      </filter>
    )
  }
  return null
}

interface PlastProps {
  id: string
  cona: Cona
  koti: Tocka[]
  svg: string
  barva?: string | null
  S: number
}

/** En motiv v enem štirikotniku fotografije. */
function Plast({ id, cona, koti: kotiPx, svg, barva, S }: PlastProps) {
  const nosilec = NOSILCI[cona.slika] ?? {}
  const koti = kotiPx.map(([x, y]) => [x / FOTO, y / FOTO] as Tocka)
  const ravna = pravokotnik(kotiPx)
  const xs = kotiPx.map((p) => p[0]), ys = kotiPx.map((p) => p[1])
  const [bx, by] = [Math.min(...xs), Math.min(...ys)]
  const [bw, bh] = [Math.max(...xs) - bx, Math.max(...ys) - by]
  const { sirina_mm: s, visina_mm: v } = cona
  const [sx, sy] = [s / bw, v / bh]
  const polozaj = ravna
    ? { left: `${koti[0]![0] * 100}%`, top: `${koti[0]![1] * 100}%`, width: `${(koti[1]![0] - koti[0]![0]) * 100}%`, height: `${(koti[3]![1] - koti[0]![1]) * 100}%` }
    : { left: 0, top: 0, width: '100%', height: '100%', transformOrigin: '0 0', transform: S ? matrika(koti, S) : undefined, visibility: S ? undefined : ('hidden' as const) }
  const m = svetlost(cona.slika, barva)
  const { videz, valj } = nosilec
  const laser = videz === 'steklo' || videz === 'kovina'
  const vsebina = <g dangerouslySetInnerHTML={{ __html: vCono(svg, s, v) }} />
  // Valj: motiv enkrat v defs, nato trakovi (use + clipPath) na ukrivljenih mestih.
  const motiv = valj ? (
    <>
      <defs>
        <g id={`motiv-${id}`}>{vsebina}</g>
        {trakoviValja(s, valj).map((t, i) => (
          <clipPath key={i} id={`trak-${id}-${i}`} clipPathUnits="userSpaceOnUse"><rect x={t.x0} y={-1} width={t.x1 - t.x0} height={v + 2} /></clipPath>
        ))}
      </defs>
      {trakoviValja(s, valj).map((t, i) => (
        <g key={i} transform={`translate(${+t.x0v.toFixed(3)} 0) scale(${+t.k.toFixed(4)} 1) translate(${-t.x0} 0)`} opacity={t.prosojnost}>
          <use href={`#motiv-${id}`} clipPath={`url(#trak-${id}-${i})`} />
        </g>
      ))}
    </>
  ) : vsebina
  return (
    <svg viewBox={`0 0 ${s} ${v}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute overflow-visible" style={polozaj}>
      <defs>
        {!laser && (
          <filter id={`senca-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width={s} height={v} colorInterpolationFilters="sRGB">
            <feImage href={cona.slika} x={-bx * sx} y={-by * sy} width={FOTO * sx} height={FOTO * sy} preserveAspectRatio="none" result="foto" />
            <feColorMatrix in="foto" type="matrix" result="siva"
              values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 0 1" />
            <feComponentTransfer in="siva" result="gube">
              <feFuncR type="linear" slope={0.55 / m} intercept="0.45" />
              <feFuncG type="linear" slope={0.55 / m} intercept="0.45" />
              <feFuncB type="linear" slope={0.55 / m} intercept="0.45" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="gube" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
          </filter>
        )}
        {filterVideza(`videz-${id}`, videz, s, v)}
        {videz === 'okvir' && (
          <linearGradient id={`steklo-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.38" stopColor="#fff" stopOpacity="0.03" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        )}
      </defs>
      {laser ? (
        <g filter={`url(#videz-${id})`} opacity={videz === 'kovina' ? 0.82 : 0.9}>{motiv}</g>
      ) : (
        <g filter={`url(#senca-${id})`}>{videz === 'vezenje' ? <g filter={`url(#videz-${id})`}>{motiv}</g> : motiv}</g>
      )}
      {videz === 'okvir' && <rect width={s} height={v} fill={`url(#steklo-${id})`} />}
    </svg>
  )
}

/** Dres: obris majice (svetli del fotografije) v barvi 1, motiv v coni, vse obrezano na obris in senčeno z gubami. */
function PlastDresa({ id, cona, svg, podlaga }: { id: string; cona: Cona; svg: string; podlaga: string }) {
  const [[x0, y0], [x1], , [, y1]] = cona.koti as [Tocka, Tocka, Tocka, Tocka]
  const m = svetlost(cona.slika, null)
  return (
    <svg viewBox={`0 0 ${FOTO} ${FOTO}`} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <filter id={`obris-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width={FOTO} height={FOTO} colorInterpolationFilters="sRGB">
          <feImage href={cona.slika} x="0" y="0" width={FOTO} height={FOTO} preserveAspectRatio="none" />
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 0 1" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="7" intercept="-2.5" />
            <feFuncG type="linear" slope="7" intercept="-2.5" />
            <feFuncB type="linear" slope="7" intercept="-2.5" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <mask id={`maska-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={FOTO} height={FOTO}>
          <rect width={FOTO} height={FOTO} filter={`url(#obris-${id})`} />
        </mask>
        <filter id={`senca-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width={FOTO} height={FOTO} colorInterpolationFilters="sRGB">
          <feImage href={cona.slika} x="0" y="0" width={FOTO} height={FOTO} preserveAspectRatio="none" />
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 0 1" />
          <feComponentTransfer result="gube">
            <feFuncR type="linear" slope={0.6 / m} intercept="0.4" />
            <feFuncG type="linear" slope={0.6 / m} intercept="0.4" />
            <feFuncB type="linear" slope={0.6 / m} intercept="0.4" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="gube" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
        </filter>
      </defs>
      <g mask={`url(#maska-${id})`}>
        <g filter={`url(#senca-${id})`}>
          <rect width={FOTO} height={FOTO} fill={podlaga} />
          <svg x={x0} y={y0} width={x1 - x0} height={y1 - y0} viewBox={`0 0 ${cona.sirina_mm} ${cona.visina_mm}`} preserveAspectRatio="none"
            dangerouslySetInnerHTML={{ __html: vCono(svg, cona.sirina_mm, cona.visina_mm) }} />
        </g>
      </g>
    </svg>
  )
}

export interface MockupProps {
  cona: Cona
  /** SVG motiva (narisiMotiv), kosi kompleta (podstavki: 6) ali null za prazen nosilec. */
  svg: string | string[] | null
  /** Barva različice (Črna, Bela) za senčenje. */
  barva?: string | null
  /** Barva podlage pri dresu (barva 1: rokavi zunaj cone). */
  podlaga?: string
  alt: string
  /** Povečava na cono (sličice): 1 = cela fotografija. */
  povecava?: number
  className?: string
}

export function Mockup({ cona, svg, barva, podlaga, alt, povecava = 1, className = '' }: MockupProps) {
  const id = useId().replace(/:/g, '')
  const okvir = useRef<HTMLDivElement>(null)
  const nosilec = NOSILCI[cona.slika] ?? {}
  const kosi = Array.isArray(svg) ? svg : svg ? [svg] : []
  // Komplet: vsak kos v svoj štirikotnik (če ga fotografija pozna), sicer le prvi v cono.
  const mesta = kosi.length > 1 && nosilec.kosi ? nosilec.kosi.slice(0, kosi.length) : [cona.koti as Tocka[]]
  const ravna = mesta.every(pravokotnik)
  const [S, setS] = useState(0)
  useEffect(() => {
    if (ravna || !okvir.current) return
    const el = okvir.current
    const ro = new ResizeObserver(() => setS(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ravna])

  const xs = mesta.flat().map((p) => p[0]), ys = mesta.flat().map((p) => p[1])
  // Sredina povečave: vidni del cone (vrč sega čez rob fotografije) ali vseh kosov kompleta.
  const [bx, by] = [Math.max(0, Math.min(...xs)), Math.min(...ys)]
  const [bw, bh] = [Math.min(FOTO, Math.max(...xs)) - bx, Math.max(...ys) - by]
  const sredina = `${((bx + bw / 2) / FOTO) * 100}% ${((by + bh / 2) / FOTO) * 100}%`

  return (
    <div ref={okvir} {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })} className={`relative aspect-square overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={povecava !== 1 ? { transform: `scale(${povecava})`, transformOrigin: sredina } : undefined}>
        <img src={cona.slika} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
        {nosilec.videz === 'dres' && kosi[0]
          ? <PlastDresa id={id} cona={cona} svg={kosi[0]} podlaga={podlaga ?? '#ffffff'} />
          : mesta.map((k, i) => kosi[i] && <Plast key={i} id={`${id}-${i}`} cona={cona} koti={k} svg={kosi[i]!} barva={barva} S={S} />)}
      </div>
    </div>
  )
}

/** Cona izdelka za ključ in barvo različice (barva null = velja za vse). */
export const conaZa = (cone: Cona[], kljuc: string, barva: string | null): Cona | undefined =>
  cone.find((c) => c.kljuc === kljuc && c.barva === barva) ?? cone.find((c) => c.kljuc === kljuc && c.barva === null)
    ?? cone.find((c) => c.kljuc === kljuc)

/** "Črna / M" → "Črna" (cone.barva je začetek oznake različice). */
export const barvaRazlicice = (oznaka: string): string => oznaka.split(' / ')[0]!.trim()
export const velikostRazlicice = (oznaka: string): string => oznaka.split(' / ')[1]?.trim() ?? oznaka
