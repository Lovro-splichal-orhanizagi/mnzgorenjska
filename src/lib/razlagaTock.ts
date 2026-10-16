// Razlaga točk igralca po krogih: nastopi, potrjene asistence in točke iz
// pogleda `appearance_points`. Bere jo stran igralca in hitri vpogled v Moji
// ekipi; vse tri vire sme brati vsak obiskovalec.
import { supabase } from './supabase'
import { razloziTocke } from './tockovanje'
import { vrsticaTekme, type NastopZaKartico } from './karticaIgralca'
import type { Pozicija, Postavka } from './tipi'

/** Razlaga točk na eni tekmi. */
export interface Razlaga {
  round_id: number
  number: number | null
  season: string | null
  played_on: string | null
  match_id: number
  minute: number | null
  postavke: Postavka[]
  skupaj: number
  /** Gol brez določene pozicije ne prinese točk. */
  brezPozicije: boolean
  /** Različica pravil kroga (`rounds.pravila_tockovanja`). */
  pravila: number | null
  /** Surove številke nastopa — za kartico igralca. */
  nastop: NastopZaKartico
  /** "Domači 2 : 1 Gostje" — za kartico igralca. */
  tekma: string | null
}

/** Vse tekme igralca z razlago točk, najnovejša prva. */
export async function naloziRazlage(igralecId: number): Promise<Razlaga[]> {
  const [{ data: nastopi }, { data: izPogleda }] = await Promise.all([
    supabase
      .from('appearances')
      .select(
        'match_id, minutes_played, goals, own_goals, penalties_missed, penalties_saved, yellow_cards, red_cards, goals_conceded, clean_sheet, matches(round_id, home_goals, away_goals, domaci:teams!matches_home_team_id_fkey(name), gostje:teams!matches_away_team_id_fkey(name), rounds(number, season, played_on))',
      )
      .eq('player_id', igralecId),
    // Točke, potrjene asistence, zmago, prejete gole med igranjem in
    // različico pravil kroga pove pogled — iste številke kot lestvica.
    supabase
      .from('appearance_points')
      .select('match_id, position, points, assists, zmaga, prejeti_na_igriscu, cista_mreza, pravila')
      .eq('player_id', igralecId),
  ])
  const poMatchu = new Map((izPogleda ?? []).map((x) => [x.match_id, x]))

  const raz: Razlaga[] = []
  for (const n of (nastopi ?? []) as any[]) {
    const r = n.matches?.rounds
    if (!r) continue
    const v = poMatchu.get(n.match_id)
    const nastop = {
      minute: n.minutes_played,
      goli: n.goals,
      asistence: v?.assists ?? 0,
      cleanSheet: v?.cista_mreza ?? n.clean_sheet,
      prejetiGoli: v?.prejeti_na_igriscu ?? n.goals_conceded,
      zmaga: v?.zmaga,
      pravila: v?.pravila,
      obranjeneEnajstmetrovke: n.penalties_saved,
      zgreseneEnajstmetrovke: n.penalties_missed,
      avtogoli: n.own_goals,
      rumeni: n.yellow_cards,
      rdeci: n.red_cards,
    }
    const { skupaj, postavke, brezPozicije } = razloziTocke(
      nastop,
      (v?.position as Pozicija | null) ?? null,
      v?.points,
    )
    raz.push({
      nastop: {
        minute: n.minutes_played,
        goli: n.goals,
        asistence: nastop.asistence,
        cistaMreza: nastop.cleanSheet,
        obranjene: n.penalties_saved,
      },
      tekma: vrsticaTekme(n.matches.domaci?.name ?? null, n.matches.gostje?.name ?? null, n.matches.home_goals, n.matches.away_goals),
      round_id: n.matches.round_id,
      number: r.number,
      season: r.season,
      played_on: r.played_on,
      match_id: n.match_id,
      minute: n.minutes_played,
      postavke,
      skupaj,
      brezPozicije,
      pravila: v?.pravila ?? null,
    })
  }
  raz.sort((a, b) => (b.played_on ?? '').localeCompare(a.played_on ?? ''))
  return raz
}
