// Dres v barvi pozicije. Isti znak nosita igrišče pri sestavi ekipe in igrišče
// s točkami ob rezultatu tekme, zato živi v svoji datoteki.

import type { Pozicija } from '../lib/tipi'
import { naslovFotografije, useFotografija } from '../lib/prevzem'

const BARVA_DRESA: Record<Pozicija, { dres: string; rokav: string }> = {
  GK: { dres: '#fbbf24', rokav: '#d97706' },
  DEF: { dres: '#38bdf8', rokav: '#0284c7' },
  MID: { dres: '#34d399', rokav: '#059669' },
  FWD: { dres: '#fb7185', rokav: '#e11d48' },
}

/**
 * Z `igralecId` potrjen igralec s fotografijo dobi okroglo fotografijo z
 * robom v barvi pozicije (ista velikost kot dres); ostali dres. Fotografije
 * vseh dresov na strani pridejo v enem zahtevku (`useFotografije`).
 */
export default function Dres({
  pozicija,
  razred = 'h-7 w-8 sm:h-9 sm:w-10',
  igralecId,
}: {
  pozicija?: Pozicija | null
  razred?: string
  igralecId?: number | string | null
}) {
  const barva =
    (pozicija ? BARVA_DRESA[pozicija] : undefined) ?? {
      dres: '#94a3b8',
      rokav: '#475569',
    }
  const n = igralecId == null || igralecId === '' ? null : Number(igralecId)
  const src = naslovFotografije(useFotografija(Number.isFinite(n) ? n : null), true)
  if (src)
    return (
      <span className={`grid place-items-center ${razred}`} aria-hidden="true">
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-square h-full rounded-full border-2 object-cover drop-shadow"
          style={{ borderColor: barva.dres }}
        />
      </span>
    )
  return (
    <svg
      viewBox="0 0 48 44"
      className={`drop-shadow ${razred}`}
      aria-hidden="true"
    >
      <path
        d="M17 3 L24 7 L31 3 L44 10 L39 19 L34 16 V41 H14 V16 L9 19 L4 10 Z"
        fill={barva.dres}
        stroke={barva.rokav}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M17 3 L24 10 L31 3" fill="none" stroke={barva.rokav} strokeWidth="2" />
    </svg>
  )
}
