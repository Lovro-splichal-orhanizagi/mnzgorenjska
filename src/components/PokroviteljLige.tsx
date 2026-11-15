// "Ligo predstavlja …" pod imenom lige (SLF-481). Liga brez pokrovitelja: nič.
// Plačana povezava ostane označena kot taka (rel="sponsored").
//
// Števec (SLF-484): prikaz enkrat, ko je vrstica vsaj do polovice na zaslonu,
// in klik na sponzorja; mesto `glava`. Kot pri `Sponzor`.
import { useEffect, useRef } from 'react'
import { usePokroviteljLige, zabeleziPokrovitelja } from '../lib/pokrovitelj'
import { t } from '../i18n'

/** `blok`: v svoji vrstici (pod značko lige), sicer v vrstici z besedilom. */
export default function PokroviteljLige({ ligaId, blok = false, className = '' }: { ligaId: number | null | undefined; blok?: boolean; className?: string }) {
  const p = usePokroviteljLige(ligaId)
  const povezava = useRef<HTMLAnchorElement | null>(null)

  const id = p?.id
  const liga = p?.liga
  useEffect(() => {
    const el = povezava.current
    if (!id || !liga || !el) return
    if (typeof IntersectionObserver === 'undefined') return zabeleziPokrovitelja({ id, liga }, 'glava', false)
    const opazovalec = new IntersectionObserver(
      (vnosi) => {
        if (vnosi.some((v) => v.isIntersecting)) {
          zabeleziPokrovitelja({ id, liga }, 'glava', false)
          opazovalec.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    opazovalec.observe(el)
    return () => opazovalec.disconnect()
  }, [id, liga])

  if (!p) return null
  return (
    <a
      ref={povezava}
      href={p.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => zabeleziPokrovitelja(p, 'glava', true)}
      className={`${blok ? 'flex w-fit' : 'inline-flex'} max-w-full items-center gap-2 text-xs font-semibold text-slate-300 no-underline hover:text-white ${className}`}
    >
      {p.logo && <img src={p.logo} alt="" className="h-6 max-w-[5rem] shrink-0 object-contain" loading="lazy" />}
      <span className="truncate">{t('aplikacija.sponzor.predstavlja', { pokrovitelj: p.ime })}</span>
    </a>
  )
}
