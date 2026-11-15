// Zamenjave ciljev za `pokazi`, ko prvi cilj ni viden (brez uvozov, da ga testira node).
//
// Na telefonu je trg skrit, viden je gumb »+ Dodaj«; na velikem zaslonu je ravno obratno.
// Na Asistencah `goli` ni viden, dokler ni izbrana tekma: takrat pokažemo tekme, nato kroge.
export const ZAMENJAVE: Record<string, string[]> = {
  trg: ['dodaj'],
  dodaj: ['trg'],
  goli: ['tekme', 'krogi'],
}

/** Prvi viden cilj od zahtevanega in njegovih zamenjav; `prikazan` pove, kateri je res. */
export function najdiZZamenjavo<T>(cilj: string, najdi: (c: string) => T | null): { el: T; prikazan: string } | null {
  for (const c of [cilj, ...(ZAMENJAVE[cilj] ?? [])]) {
    const el = najdi(c)
    if (el) return { el, prikazan: c }
  }
  return null
}
