// Mini lige — pravila, ki niso slog.
//
// Ločeno od strani, da jih preverja `npm run smoke` brez omrežja: normalizacija
// kode in razvrstitev lestvice odločata, ali se človek pridruži in kdo je prvi.

/** Vrstica pogleda `mini_liga_lestvica`. */
export interface MiniVrstica {
  fantasy_team_id: number | null
  team_name: string | null
  owner_name: string | null
  total_points: number | null
  rounds_played: number | null
  points_per_round: number | null
  competition_short: string | null
  federation_short: string | null
}

export interface MiniLiga {
  id: number
  name: string
  code: string
  owner_id: string
}

/** Znaki, iz katerih je koda — brez dvoumnih 0/O in 1/I/L. */
export const ZNAKI_KODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const DOLZINA_KODE = 6

/**
 * Pripravi kodo, kot jo je človek vtipkal.
 *
 * Koda potuje po SMS, na glas ali na listku, zato pride nazaj z malimi
 * črkami, presledki ali vezaji. Vse to je ista koda — zavrniti jo zaradi
 * oblike pomeni izgubiti človeka na zadnjem koraku.
 */
export function ocistiKodo(vnos: string): string {
  return (vnos ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Ali je koda sploh lahko veljavna? Preveri PREDEN gremo na strežnik. */
export function kodaJeVeljavna(vnos: string): boolean {
  const k = ocistiKodo(vnos)
  if (k.length !== DOLZINA_KODE) return false
  return [...k].every((z) => ZNAKI_KODE.includes(z))
}

/**
 * Zakaj koda ni sprejemljiva — v jeziku, ki uporabniku pomaga.
 * `null` pomeni, da je v redu.
 */
export function zakajNiVeljavna(vnos: string): string | null {
  const k = ocistiKodo(vnos)
  if (k.length === 0) return 'Vpiši kodo mini lige.'
  if (k.length !== DOLZINA_KODE)
    return `Koda ima ${DOLZINA_KODE} znakov, ti si jih vpisal ${k.length}.`
  const slabi = [...new Set([...k].filter((z) => !ZNAKI_KODE.includes(z)))]
  if (slabi.length)
    return `Koda ne vsebuje znakov ${slabi.join(', ')} — poglej, ali si zamenjal 0 in O ali 1 in I.`
  return null
}

/** Lestvica mini lige: po skupnih točkah, ob enakem izidu po imenu. */
export function razvrstiMini(vrstice: MiniVrstica[]): (MiniVrstica & { mesto: number })[] {
  const st = (v: number | null | undefined) => Number(v ?? 0)
  const urejene = [...vrstice].sort(
    (a, b) =>
      st(b.total_points) - st(a.total_points) ||
      st(b.rounds_played) - st(a.rounds_played) ||
      (a.team_name ?? '').localeCompare(b.team_name ?? '', 'sl'),
  )
  let zadnji: number | null = null
  let mesto = 0
  return urejene.map((v, i) => {
    const t = st(v.total_points)
    if (zadnji === null || t !== zadnji) mesto = i + 1
    zadnji = t
    return { ...v, mesto }
  })
}

/**
 * Ali so v mini ligi ekipe iz več lig?
 *
 * Če so, mora lestvica pokazati, iz katere lige je katera ekipa — sicer je
 * videti, kot da nekdo igra po drugačnih pravilih. Če so vse iz iste, je
 * stolpec šum.
 */
export function vecLig(vrstice: MiniVrstica[]): boolean {
  return new Set(vrstice.map((v) => v.competition_short).filter(Boolean)).size > 1
}

/** Povabilo, ki ga človek prilepi v pogovor. */
export function besediloVabila(ime: string, koda: string, naslov: string): string {
  return (
    `Pridruži se mini ligi "${ime}" v SLFF.\n` +
    `Koda: ${koda}\n` +
    `${naslov}/mini-lige`
  )
}
