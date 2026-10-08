// Zložljiv razdelek administracije: vrstica z naslovom, klik odpre vsebino.
//
// Stran je dolga, zato je vsak razdelek privzeto zaprt. Kaj je kdo pustil
// odprto, si zapomni brskalnik (le udobje — brez shrambe so vsi zaprti).
// Vsebina se izriše tudi zaprta, da razdelki naložijo podatke kot prej.
import { useState, type ReactNode } from 'react'

const KLJUC = 'slff-admin-odprto'

function beriOdprte(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KLJUC) ?? '[]')
  } catch {
    return []
  }
}

export default function Razdelek({
  id,
  naslov,
  children,
}: {
  id: string
  naslov: ReactNode
  children: ReactNode
}) {
  const [odprt, setOdprt] = useState(() => beriOdprte().includes(id))

  function preklopi(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const zdaj = e.currentTarget.open
    setOdprt(zdaj)
    try {
      const ostali = beriOdprte().filter((x) => x !== id)
      localStorage.setItem(KLJUC, JSON.stringify(zdaj ? [...ostali, id] : ostali))
    } catch {
      // zasebno okno ali blokirana shramba — razdelek dela vseeno
    }
  }

  return (
    <details open={odprt} onToggle={preklopi} className="group">
      <summary className="kartica flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-bold select-none hover:bg-white/5 [&::-webkit-details-marker]:hidden">
        <span>{naslov}</span>
        <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-3 space-y-6">{children}</div>
    </details>
  )
}
