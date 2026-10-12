// Pivski zid (/beers): podporniki z Buy Me a Coffee.
//
// Baza vrne le ime (null = anonimno), število piv, sporočilo (null, če ga je
// podpornik ali admin skril) in datum (`javna_piva()`); zneskov ne pozna.
// Sporočila so na lestvici ob imenu podpornika. Tu so le čiste funkcije, da jih smoke preveri brez baze.

export interface JavnoPivo {
  ime: string | null
  piv: number
  sporocilo: string | null
  created_at: string
}

export interface Podpornik {
  /** Ime, kot ga je napisal pri prvem pivu; null = anonimni podporniki skupaj. */
  ime: string | null
  piv: number
  /** Kolikokrat je častil. */
  nakupov: number
  zadnjic: string
  /** Njegova sporočila (brez skritih in praznih), najnovejše prvo. */
  sporocila: string[]
}

/**
 * Lestvica po imenu (brez razlike v velikosti črk in presledkih), urejena po
 * pivih, nato po zadnjem nakupu. Vsi anonimni so ena vrstica na koncu.
 */
export function lestvicaPodpornikov(piva: JavnoPivo[]): Podpornik[] {
  const po = new Map<string, Podpornik>()
  let anonimni: Podpornik | null = null
  for (const p of piva) {
    const ime = p.ime?.trim().replace(/\s+/g, ' ') || null
    if (!ime) {
      anonimni ??= { ime: null, piv: 0, nakupov: 0, zadnjic: p.created_at, sporocila: [] }
      anonimni.piv += p.piv
      anonimni.nakupov += 1
      if (p.created_at > anonimni.zadnjic) anonimni.zadnjic = p.created_at
      continue
    }
    const kljuc = ime.toLocaleLowerCase()
    const v = po.get(kljuc)
    if (!v) po.set(kljuc, { ime, piv: p.piv, nakupov: 1, zadnjic: p.created_at, sporocila: [] })
    else {
      v.piv += p.piv
      v.nakupov += 1
      if (p.created_at > v.zadnjic) v.zadnjic = p.created_at
    }
  }
  // Sporočila k vrstici podpornika, najnovejše prvo.
  for (const p of [...piva].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const besedilo = p.sporocilo?.trim()
    if (!besedilo) continue
    const ime = p.ime?.trim().replace(/\s+/g, ' ') || null
    const v = ime ? po.get(ime.toLocaleLowerCase()) : anonimni
    v?.sporocila.push(besedilo)
  }
  const lestvica = [...po.values()].sort(
    (a, b) => b.piv - a.piv || b.zadnjic.localeCompare(a.zadnjic) || a.ime!.localeCompare(b.ime!),
  )
  return anonimni ? [...lestvica, anonimni] : lestvica
}

/** Vsota piv (za naslov zidu). */
export const vsehPiv = (piva: JavnoPivo[]) => piva.reduce((v, p) => v + p.piv, 0)
