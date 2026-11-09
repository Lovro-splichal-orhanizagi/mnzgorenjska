import type { KeyboardEvent, ReactNode } from 'react'

export interface ZavihekPodatki<K extends string> {
  kljuc: K
  naslov: ReactNode
}

/**
 * Dostopni zavihki (vzorec WAI-ARIA tabs): `tablist`, `tab` z `aria-selected`,
 * tipke ← → Home End premaknejo izbiro, v zaporedje tipke Tab stopi le
 * izbrani zavihek. Vsebino ovij v `PloscaZavihkov` z istim `id`.
 */
export function Zavihki<K extends string>({
  id,
  oznaka,
  zavihki,
  izbran,
  naIzbiro,
  razredSeznama,
  razredZavihka,
}: {
  id: string
  /** Berejo ga bralniki zaslona ("Starostna skupina lig"). */
  oznaka: string
  zavihki: ZavihekPodatki<K>[]
  izbran: K
  naIzbiro: (k: K) => void
  razredSeznama: string
  razredZavihka: (aktiven: boolean) => string
}) {
  const premakni = (e: KeyboardEvent, i: number) => {
    const n = zavihki.length
    let nov: number | null = null
    if (e.key === 'ArrowRight') nov = (i + 1) % n
    else if (e.key === 'ArrowLeft') nov = (i - 1 + n) % n
    else if (e.key === 'Home') nov = 0
    else if (e.key === 'End') nov = n - 1
    if (nov === null) return
    e.preventDefault()
    const k = zavihki[nov].kljuc
    naIzbiro(k)
    document.getElementById(`${id}-${k}`)?.focus()
  }
  return (
    <div role="tablist" aria-label={oznaka} className={razredSeznama}>
      {zavihki.map((z, i) => {
        const aktiven = z.kljuc === izbran
        return (
          <button
            key={z.kljuc}
            type="button"
            role="tab"
            id={`${id}-${z.kljuc}`}
            aria-selected={aktiven}
            aria-controls={`${id}-plosca`}
            tabIndex={aktiven ? 0 : -1}
            onClick={() => naIzbiro(z.kljuc)}
            onKeyDown={(e) => premakni(e, i)}
            className={razredZavihka(aktiven)}
          >
            {z.naslov}
          </button>
        )
      })}
    </div>
  )
}

/** Plošča izbranega zavihka; `id` je enak kot pri `Zavihki`. */
export function PloscaZavihkov({
  id,
  izbran,
  className,
  children,
}: {
  id: string
  izbran: string
  className?: string
  children: ReactNode
}) {
  return (
    <div role="tabpanel" id={`${id}-plosca`} aria-labelledby={`${id}-${izbran}`} className={className}>
      {children}
    </div>
  )
}
