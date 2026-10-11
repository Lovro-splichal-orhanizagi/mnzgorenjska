// Ime lastnika ekipe na lestvici, ki vodi na njegov profil (/u/:id). Vrstica
// lestvice je cela povezava na ekipo (::after čez vrstico), zato je ta
// povezava dvignjena nadnjo (relative z-10). Hišna ekipa nima lastnika-
// človeka (owner_id NULL) in ostane golo ime.
import { Link } from './Povezava'

export default function ImeLastnika({ ime, id }: { ime: string | null | undefined; id: string | null | undefined }) {
  if (!ime) return null
  if (!id) return <>{ime}</>
  return (
    <Link to={`/u/${id}`} className="relative z-10 hover:text-gnl-300 hover:underline">
      {ime}
    </Link>
  )
}
