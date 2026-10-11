import type { ReactNode } from 'react'
import { naslovFotografije, useFotografija } from '../lib/prevzem'

/**
 * Okrogla fotografija potrjenega igralca (`profil_igralca`, skupna povezanim
 * vrsticam). Brez fotografije izriše `nadomestek` (dres, začetnice …) ali nič.
 *
 * `pot` podaj, kadar jo stran že ima (seznam z `useFotografije`), sicer jo
 * komponenta poišče sama po `id` — vse na strani se zberejo v en zahtevek.
 */
export default function FotoIgralca({
  id,
  pot,
  velikost = 32,
  nadomestek = null,
  className = '',
}: {
  id?: number | null
  pot?: string | null
  velikost?: number
  nadomestek?: ReactNode
  className?: string
}) {
  const najdena = useFotografija(pot === undefined ? id : null)
  const p = pot === undefined ? najdena : pot
  const src = naslovFotografije(p, velikost <= 64)
  if (!src) return <>{nadomestek}</>
  return (
    <img
      src={src}
      alt=""
      width={velikost}
      height={velikost}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-full object-cover ring-1 ring-white/20 ${className}`}
      style={{ width: velikost, height: velikost }}
    />
  )
}
