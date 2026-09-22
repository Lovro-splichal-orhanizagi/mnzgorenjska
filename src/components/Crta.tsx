import { useId, useState } from 'react'

/**
 * Drobna crta (sparkline) za eno samo vrsto podatkov.
 *
 * Ena vrsta — zato ni legende: naslov kartice pove, kaj crta je. Zadnja
 * vrednost je napisana ob koncu crte, vmesne pa se pokazejo ob dotiku, ker bi
 * stevilka nad vsako tocko zakrila obliko, zaradi katere crta sploh obstaja.
 *
 * Zaloga vrednosti se zacne pri nic: rast s 300 na 310 je pri obrezani osi
 * videti kot podvojitev, kar ni res.
 */
export interface Tocka {
  oznaka: string
  vrednost: number
}

const S = 240 // sirina risbe v uporabljenih enotah
const V = 56 // visina

export default function Crta({
  tocke,
  barva = '#34d399',
  enota = '',
}: {
  tocke: Tocka[]
  barva?: string
  enota?: string
}) {
  const [nad, setNad] = useState<number | null>(null)
  const id = useId()

  if (tocke.length < 2) return null

  const najvec = Math.max(...tocke.map((t) => t.vrednost), 1)
  const x = (i: number) => (i / (tocke.length - 1)) * S
  const y = (v: number) => V - (v / najvec) * (V - 6) - 3
  const crta = tocke.map((t, i) => `${i ? 'L' : 'M'}${x(i)},${y(t.vrednost)}`).join(' ')
  const ploskev = `${crta} L${S},${V} L0,${V} Z`
  const izbran = nad ?? tocke.length - 1

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${S} ${V}`}
        className="h-14 w-full"
        role="img"
        aria-label={`Gibanje: ${tocke.map((t) => `${t.oznaka} ${t.vrednost}${enota}`).join(', ')}`}
        onMouseLeave={() => setNad(null)}
      >
        <defs>
          <linearGradient id={`p-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={barva} stopOpacity="0.28" />
            <stop offset="100%" stopColor={barva} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={ploskev} fill={`url(#p-${id})`} />
        <path
          d={crta}
          fill="none"
          stroke={barva}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Zadnja tocka je vedno vidna, izbrana pa se poudari. */}
        <circle
          cx={x(izbran)}
          cy={y(tocke[izbran].vrednost)}
          r="3.5"
          fill={barva}
          stroke="#020617"
          strokeWidth="2"
        />
        {/* Nevidni stolpci so tarce za miško: cela sirina, ne le tocka. */}
        {tocke.map((t, i) => (
          <rect
            key={t.oznaka}
            x={i === 0 ? 0 : x(i) - S / (tocke.length - 1) / 2}
            y={0}
            width={S / (tocke.length - 1)}
            height={V}
            fill="transparent"
            onMouseEnter={() => setNad(i)}
          >
            <title>{`${t.oznaka}: ${t.vrednost}${enota}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-0.5 flex items-baseline justify-between text-[11px] text-slate-500">
        <span>{tocke[0].oznaka}</span>
        <span className={nad === null ? '' : 'text-slate-300'}>
          {tocke[izbran].oznaka}: <span className="tabular-nums">{tocke[izbran].vrednost}</span>
          {enota}
        </span>
      </div>
    </div>
  )
}
