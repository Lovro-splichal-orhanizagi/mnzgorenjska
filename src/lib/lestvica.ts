// Seštevanje lestvice "od N. kroga naprej".
//
// Ločeno od komponente, da je mogoče preveriti brez brskalnika in baze
// (`npm run smoke`) — prav ta izračun je namreč tiho kazal napačne vsote.
//
// POZOR: `fantasy_round_points.points` ima kazen za prestope ŽE odšteto:
//
//     coalesce(sum(ps.points * up.mnozitelj), 0) - coalesce(max(tr.penalty), 0)
//       as points,
//     coalesce(max(tr.penalty), 0) as penalty,
//
// `penalty` je zraven samo zato, da jo stran lahko pokaže ("−20"). Kdor jo tu
// odšteje še enkrat, dobi dvojno kazen: ekipa z 13 točkami in 20 kazni je
// namesto -7 pokazala -27.
/** Vrstica `fantasy_round_standings`, kot jo rabi seštevek. */
export interface VrsticaKroga {
  round_id: number
  fantasy_team_id: number
  team_name?: string | null
  owner_name?: string | null
  points?: number | null
}

export interface SkupekEkipe {
  fantasy_team_id: number
  team_name: string | null
  owner_name: string | null
  points: number
  krogov: number
}

/**
 * Sešteje točke ekip po krogih, ki so v `krogi`.
 *
 * Kazni NE odšteva — v `points` je že vštetá. Rezultat je urejen padajoče.
 */
export function sestejOdKroga(
  vrstice: VrsticaKroga[],
  krogi: Set<number>,
): SkupekEkipe[] {
  const skupine = new Map<number, SkupekEkipe>()
  for (const v of vrstice) {
    if (!krogi.has(v.round_id)) continue
    const prej =
      skupine.get(v.fantasy_team_id) ?? {
        fantasy_team_id: v.fantasy_team_id,
        team_name: v.team_name ?? null,
        owner_name: v.owner_name ?? null,
        points: 0,
        krogov: 0,
      }
    prej.points += Number(v.points ?? 0)
    prej.krogov += 1
    skupine.set(v.fantasy_team_id, prej)
  }
  return [...skupine.values()].sort((a, b) => b.points - a.points)
}
