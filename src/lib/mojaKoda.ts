// Lastna koda povabila prijavljenega (akcija vabil). Nastavi jo `BeleziPovabilo`
// (src/lib/povabilo.tsx); brez odvisnosti, ker `miniLige.ts` berejo tudi skripte.
let koda: string | null = null

export function mojaKodaVabila(): string | null {
  return koda
}

export function nastaviMojoKodo(k: string | null): void {
  koda = k
}
