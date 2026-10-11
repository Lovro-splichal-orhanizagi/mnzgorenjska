// Avatar uporabnika: krog v izbrani barvi z začetnicami ali nogometno ikono.
// Slik ne nalagamo (moderacija), zato je ves avatar dva stolpca profila.
import { barvaAvatarja, IKONE_AVATARJA, jeIkona, zacetniceImena } from '../lib/profil'

export default function Avatar({
  id,
  ime,
  barva,
  ikona,
  velikost = 40,
  className = '',
}: {
  id?: string | null
  ime?: string | null
  barva?: number | null
  ikona?: string | null
  velikost?: number
  className?: string
}) {
  const znak = jeIkona(ikona) ? IKONE_AVATARJA[ikona] : zacetniceImena(ime)
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-black text-white ring-1 ring-white/20 ${className}`}
      style={{
        width: velikost,
        height: velikost,
        backgroundColor: barvaAvatarja(id, barva),
        fontSize: Math.round(velikost * (jeIkona(ikona) ? 0.5 : 0.4)),
      }}
    >
      {znak}
    </span>
  )
}
