import { usePreverjen } from '../lib/preverjeni'
import { t } from '../i18n'

/**
 * Modra kljukica preverjenega igralca ob imenu (in vzdevek, če ga seznam
 * želi). Brez preverjenega igralca ne izriše nič; vsi na strani se zberejo v
 * en zahtevek (`usePreverjeni`). Drugačna od značke prevzema ("Potrdil klub").
 */
export default function ZnakPreverjen({
  id,
  vzdevek = false,
  velikost = 14,
  className = '',
}: {
  /** Id igralca; igrišča ga imajo lahko kot niz (kot `Dres`). */
  id: number | string | null | undefined
  /** Pokaži še vzdevek ("Kljukica") za kljukico. */
  vzdevek?: boolean
  velikost?: number
  className?: string
}) {
  const n = id == null ? NaN : Number(id)
  const p = usePreverjen(Number.isFinite(n) ? n : null)
  if (!p) return null
  const oznaka = t('igralci.preverjen.znacka')
  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      <svg
        role="img"
        aria-label={oznaka}
        viewBox="0 0 24 24"
        width={velikost}
        height={velikost}
        className="shrink-0"
      >
        <title>{oznaka}</title>
        <path
          fill="#38bdf8"
          d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z"
        />
        <path fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.3l3 3 6-6.3" />
      </svg>
      {vzdevek && p.vzdevek && <span className="truncate text-xs font-normal text-sky-200">"{p.vzdevek}"</span>}
    </span>
  )
}
