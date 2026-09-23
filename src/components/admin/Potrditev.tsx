// Vprašanje "Si prepričan?" kar na strani.
//
// window.confirm in window.prompt sta nezanesljiva: na telefonu ju brskalnik
// pogosto ne pokaže, na namizju pa ju po nekaj oknih ponudi blokirati — koda
// nato tiho ne naredi nič. Zato vprašanje živi v vrstici pod gumbom, isti
// vzorec kot pri pošiljanju opomnikov.
import { useEffect, useId, useRef, type ReactNode } from 'react'

export default function Potrditev({
  children,
  potrdi,
  preklici,
  zaseden = false,
  gumb = 'Da',
}: {
  children: ReactNode
  potrdi: () => void
  preklici: () => void
  /** Med izvajanjem sta oba gumba onemogočena — dvojni klik ne sproži dvakrat. */
  zaseden?: boolean
  gumb?: string
}) {
  const id = useId()
  const gumbPreklici = useRef<HTMLButtonElement | null>(null)
  const ovoj = useRef<HTMLDivElement | null>(null)

  // Fokus na "Prekliči" (varna izbira za Enter), ob zaprtju nazaj na element,
  // ki je vprašanje odprl — a le, če je bil fokus še v vprašanju.
  useEffect(() => {
    const prej = document.activeElement as HTMLElement | null
    gumbPreklici.current?.focus()
    const vVprasanju = ovoj.current
    return () => {
      const zdaj = document.activeElement
      const fokusJeBilTu = !zdaj || zdaj === document.body || (vVprasanju?.contains(zdaj) ?? false)
      if (fokusJeBilTu && prej && prej !== document.body && prej.isConnected) prej.focus()
    }
  }, [])

  return (
    <div
      ref={ovoj}
      role="alertdialog"
      aria-labelledby={id}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !zaseden) {
          e.preventDefault()
          e.stopPropagation()
          preklici()
        }
      }}
      className="animiraj-vstop flex flex-wrap items-center gap-2 rounded-xl bg-amber-400/10 p-3 text-sm ring-1 ring-amber-400/30"
    >
      <span id={id} className="text-amber-100">{children}</span>
      <button onClick={potrdi} disabled={zaseden} className="gumb-glavni text-xs disabled:opacity-50">
        {zaseden ? 'Delam …' : gumb}
      </button>
      <button ref={gumbPreklici} onClick={preklici} disabled={zaseden} className="gumb-tih text-xs disabled:opacity-50">
        Prekliči
      </button>
    </div>
  )
}
