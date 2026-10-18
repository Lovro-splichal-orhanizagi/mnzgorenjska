// Živ mockup: motiv (SVG iz narisiMotiv) na fotografiji praznega nosilca.
// Cona je štirikotnik na fotografiji (trgovina.cone.koti, px na 1600×1600):
// pravokotnik se postavi v odstotkih (brez merjenja, brez premika ob izrisu),
// drug štirikotnik dobi perspektivo z matrix3d. Tisk je neprosojen (DTF), zato
// navadno prekrivanje, nato ga potemnijo gube: svetlost fotografije pod cono,
// deljena s povprečjem cone (0,45 + 0,55·x, največ 1), pomnožena z motivom.
import { useEffect, useId, useRef, useState } from 'react'
import type { Cona } from './baza'

/** Velikost fotografij nosilcev v px (shop/nosilci). */
export const FOTO = 1600

type Tocka = [number, number]

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

/** Povprečna svetlost cone: fotografije so enakomerno osvetljene, zadošča barva nosilca. */
const svetlost = (barva: string | null | undefined): number => (barva === 'Bela' ? 0.9 : 0.1)

export interface MockupProps {
  cona: Cona
  /** SVG motiva (narisiMotiv) ali null za prazen nosilec. */
  svg: string | null
  /** Barva različice (Črna, Bela) za senčenje. */
  barva?: string | null
  alt: string
  /** Povečava na cono (sličice): 1 = cela fotografija. */
  povecava?: number
  className?: string
}

export function Mockup({ cona, svg, barva, alt, povecava = 1, className = '' }: MockupProps) {
  const id = useId().replace(/:/g, '')
  const okvir = useRef<HTMLDivElement>(null)
  const koti = cona.koti.map(([x, y]) => [x / FOTO, y / FOTO] as Tocka)
  const ravna = pravokotnik(cona.koti)
  const [S, setS] = useState(0)
  useEffect(() => {
    if (ravna || !okvir.current) return
    const el = okvir.current
    const ro = new ResizeObserver(() => setS(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ravna])

  const xs = cona.koti.map((p) => p[0]), ys = cona.koti.map((p) => p[1])
  const [bx, by] = [Math.min(...xs), Math.min(...ys)]
  const [bw, bh] = [Math.max(...xs) - bx, Math.max(...ys) - by]
  const { sirina_mm: s, visina_mm: v } = cona
  const [sx, sy] = [s / bw, v / bh]
  const sredina = `${((bx + bw / 2) / FOTO) * 100}% ${((by + bh / 2) / FOTO) * 100}%`
  const polozaj = ravna
    ? { left: `${koti[0]![0] * 100}%`, top: `${koti[0]![1] * 100}%`, width: `${(koti[1]![0] - koti[0]![0]) * 100}%`, height: `${(koti[3]![1] - koti[0]![1]) * 100}%` }
    : { left: 0, top: 0, width: '100%', height: '100%', transformOrigin: '0 0', transform: S ? matrika(koti, S) : undefined, visibility: S ? undefined : ('hidden' as const) }
  const m = svetlost(barva)

  return (
    <div ref={okvir} role="img" aria-label={alt} className={`relative aspect-square overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={povecava !== 1 ? { transform: `scale(${povecava})`, transformOrigin: sredina } : undefined}>
        <img src={cona.slika} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
        {svg && (
          <svg viewBox={`0 0 ${s} ${v}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute overflow-visible" style={polozaj}>
            <defs>
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
            </defs>
            <g filter={`url(#senca-${id})`} dangerouslySetInnerHTML={{ __html: vCono(svg, s, v) }} />
          </svg>
        )}
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
