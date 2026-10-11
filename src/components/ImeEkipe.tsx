// Ime fantasy ekipe na lestvici. Sestavo ekipe vidi le lastnik (zasebne
// ekipe, migracija 20261012137100), zato je ime povezava na /team/:id le pri
// svoji ekipi; tuja ekipa je golo ime, njen lastnik pa vodi na profil
// (`ImeLastnika`). Hišna ekipa nima lastnika-človeka (owner_id NULL).
import type { ReactNode } from 'react'
import { Link } from './Povezava'
import { useAuth } from '../lib/useAuth'

export function jeMojaEkipa(lastnikId: string | null | undefined, uporabnikId: string | null | undefined): boolean {
  return Boolean(lastnikId) && lastnikId === uporabnikId
}

export default function ImeEkipe({
  id,
  lastnikId,
  pot,
  className,
  povezavaRazred = '',
  children,
}: {
  id: number | null | undefined
  lastnikId: string | null | undefined
  /** Pot do strani ekipe, privzeto `/team/:id` (z ligo poda klicatelj). */
  pot?: string
  className?: string
  /** Dodatni razredi le za povezavo (npr. ::after čez vrstico). */
  povezavaRazred?: string
  children: ReactNode
}) {
  const { session } = useAuth()
  if (id == null || !jeMojaEkipa(lastnikId, session?.user.id)) {
    return <span className={className}>{children}</span>
  }
  return (
    <Link to={pot ?? `/team/${id}`} className={`${className ?? ''} ${povezavaRazred}`.trim()}>
      {children}
    </Link>
  )
}
