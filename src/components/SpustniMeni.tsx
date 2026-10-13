// Spustni meni z eno izbiro: gumb s trenutno vrednostjo, ob kliku seznam.
//
// Skupen izbiri jezika in države. Pri trinajstih jezikih in dvanajstih
// državah vrsta povezav ("SL · HR · SK …") ni več šla v eno vrstico.
//
// Vzorec je menu z menuitemradio: fokus gre na izbrano možnost, puščice,
// Home/End in Escape kot v sistemskih menijih. `vVrsti` seznam pokaže pod
// gumbom v toku strani (v plošči izbirnika lige, ki ima overflow-hidden in bi
// lebdeči seznam odrezala).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface Moznost {
  kljuc: string
  vsebina: ReactNode
  izbrana: boolean
  /** Ime za bralnike zaslona, kadar vsebina ni besedilo (zastava, števec). */
  oznaka?: string
  lang?: string
}

export default function SpustniMeni({
  gumb,
  oznakaGumba,
  oznakaMenija,
  moznosti,
  izberi,
  navzgor = false,
  vVrsti = false,
  className = '',
  obOdprtju,
}: {
  /** Vsebina gumba (trenutna vrednost); puščica se doda sama. */
  gumb: ReactNode
  oznakaGumba: string
  oznakaMenija: string
  moznosti: Moznost[]
  izberi: (kljuc: string) => void
  /** Seznam nad gumbom (noga strani). */
  navzgor?: boolean
  vVrsti?: boolean
  className?: string
  /** Pove, ali je seznam odprt (izbirnik lige takrat skrije svoj seznam). */
  obOdprtju?: (odprt: boolean) => void
}) {
  const [odprt, setOdprt] = useState(false)
  const ovoj = useRef<HTMLDivElement | null>(null)
  const gumbRef = useRef<HTMLButtonElement | null>(null)
  const elementi = useRef<Array<HTMLButtonElement | null>>([])
  const id = useId()

  // Klik izven zapre.
  useEffect(() => {
    if (!odprt) return
    const zunaj = (e: MouseEvent) => {
      if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false)
    }
    document.addEventListener('mousedown', zunaj)
    return () => document.removeEventListener('mousedown', zunaj)
  }, [odprt])

  // Ob odprtju fokus na izbrano možnost (ali prvo).
  useEffect(() => {
    obOdprtju?.(odprt)
    if (!odprt) return
    const i = Math.max(0, moznosti.findIndex((m) => m.izbrana))
    elementi.current[i]?.focus()
    // Le ob odprtju: ponovni izris ne sme premikati fokusa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odprt])

  const zapri = () => {
    setOdprt(false)
    gumbRef.current?.focus()
  }

  const tipka = (e: KeyboardEvent<HTMLDivElement>) => {
    const vsi = elementi.current.filter((x): x is HTMLButtonElement => x != null)
    const zdaj = vsi.indexOf(document.activeElement as HTMLButtonElement)
    const premakni = (i: number) => vsi[(i + vsi.length) % vsi.length]?.focus()
    if (e.key === 'ArrowDown') premakni(zdaj + 1)
    else if (e.key === 'ArrowUp') premakni(zdaj - 1)
    else if (e.key === 'Home') premakni(0)
    else if (e.key === 'End') premakni(vsi.length - 1)
    else if (e.key === 'Escape') {
      // Izbirnik lige zapre celo ploščo ob Escape na dokumentu; najprej naj
      // se zapre le ta meni.
      e.stopPropagation()
      zapri()
    } else if (e.key === 'Tab') setOdprt(false)
    else return
    if (e.key !== 'Tab') e.preventDefault()
  }

  const polozaj = vVrsti
    ? 'mt-1.5 w-full'
    : `absolute z-40 w-56 max-w-[calc(100vw-2rem)] ${navzgor ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${
        // V nogi je gumb na sredini zaslona; drugod ob levem robu, kjer bi
        // sredinski seznam zlezel čez rob okna.
        navzgor ? 'left-1/2 -translate-x-1/2' : 'left-0'
      }`

  return (
    <div ref={ovoj} className={`relative ${vVrsti ? 'block' : 'inline-block'} ${className}`}>
      <button
        ref={gumbRef}
        type="button"
        onClick={() => setOdprt(!odprt)}
        aria-haspopup="menu"
        aria-expanded={odprt}
        aria-controls={odprt ? id : undefined}
        aria-label={oznakaGumba}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-slate-300 transition hover:bg-white/5 hover:text-slate-100 ${
          vVrsti ? 'w-full bg-slate-950 ring-1 ring-white/10' : ''
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">{gumb}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 text-slate-500 transition ${odprt ? 'rotate-180' : ''}`}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {odprt && (
        <div
          id={id}
          role="menu"
          aria-label={oznakaMenija}
          onKeyDown={tipka}
          className={`${polozaj} max-h-[min(50vh,20rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-slate-900 p-1 text-left text-sm shadow-xl shadow-black/50`}
        >
          {moznosti.map((m, i) => (
            <button
              key={m.kljuc}
              ref={(el) => {
                elementi.current[i] = el
              }}
              type="button"
              role="menuitemradio"
              aria-checked={m.izbrana}
              aria-label={m.oznaka}
              lang={m.lang}
              tabIndex={-1}
              onClick={() => {
                zapri()
                if (!m.izbrana) izberi(m.kljuc)
              }}
              className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 text-left outline-none focus-visible:bg-white/10 hover:bg-white/5 ${
                m.izbrana ? 'font-semibold text-gnl-200' : 'text-slate-300'
              }`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{m.vsebina}</span>
              {m.izbrana && (
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-gnl-300">
                  <path
                    d="M2.5 6.5 5 9l4.5-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
