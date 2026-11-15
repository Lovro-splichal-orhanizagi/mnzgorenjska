// "Ligo predstavlja …" pod imenom lige (SLF-481). Liga brez pokrovitelja: nič.
// Plačana povezava ostane označena kot taka (rel="sponsored").
import { usePokroviteljLige } from '../lib/pokrovitelj'
import { t } from '../i18n'

/** `blok`: v svoji vrstici (pod značko lige), sicer v vrstici z besedilom. */
export default function PokroviteljLige({ ligaId, blok = false, className = '' }: { ligaId: number | null | undefined; blok?: boolean; className?: string }) {
  const p = usePokroviteljLige(ligaId)
  if (!p) return null
  return (
    <a
      href={p.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`${blok ? 'flex w-fit' : 'inline-flex'} max-w-full items-center gap-2 text-xs font-semibold text-slate-300 no-underline hover:text-white ${className}`}
    >
      {p.logo && <img src={p.logo} alt="" className="h-6 max-w-[5rem] shrink-0 object-contain" loading="lazy" />}
      <span className="truncate">{t('aplikacija.sponzor.predstavlja', { pokrovitelj: p.ime })}</span>
    </a>
  )
}
