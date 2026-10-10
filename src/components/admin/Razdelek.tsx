// Razdelek administracije: izriše se le, ko je izbran v meniju.
//
// Izbranega pove `AktivenRazdelek` (stran ga vzame iz # v naslovu). Ostali se
// ne izrišejo, zato njihovi podatki ne nalagajo, dokler jih kdo ne odpre.
import { createContext, useContext, type ReactNode } from 'react'

export const AktivenRazdelek = createContext<string | null>(null)

export default function Razdelek({ id, children }: { id: string; children: ReactNode }) {
  if (useContext(AktivenRazdelek) !== id) return null
  return <div className="space-y-6">{children}</div>
}
