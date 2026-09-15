// Državna lestvica — kaj se prikaže in kako se razvrsti.
//
// Ločeno od strani, da razvrščanje in oznake preverja `npm run smoke` brez
// omrežja in brez izrisa. Vrstni red lestvice je pravilo igre, ne slog.

/** Vrstica pogleda `lestvica_drzavna`. */
export interface DrzavnaVrstica {
  // Stolpci pogleda so v tipih baze `| null`; oblika naj to odraža, sicer
  // pretvorba ne gre skozi.
  fantasy_team_id: number | null
  team_name: string | null
  owner_name: string | null
  total_points: number | null
  rounds_played: number | null
  points_per_round: number | null
  competition_slug: string | null
  competition_short: string | null
  federation_short: string | null
}

export type Razvrstitev = 'skupno' | 'povprecje'

/**
 * Najmanj krogov, da ekipa nastopa v razvrstitvi po povprečju.
 *
 * Brez tega je na vrhu vedno nekdo z enim samim odigranim krogom: ena dobra
 * nedelja da povprečje 104, cela sezona pa redko čez 60. Lestvica, ki jo
 * vodi naključje, ni lestvica.
 */
export const NAJMANJ_KROGOV_ZA_POVPRECJE = 3

/**
 * Razvrsti vrstice.
 *
 * `skupno` je privzeto in pošteno kot v vsaki ligi. `povprecje` obstaja zato,
 * ker lige ne začnejo hkrati — ekipa iz lige, ki je začela teden prej, ima
 * več točk zgolj zaradi tega, ne ker bi bila boljša.
 */
export function razvrsti(
  vrstice: DrzavnaVrstica[],
  kako: Razvrstitev = 'skupno',
): DrzavnaVrstica[] {
  const st = (v: number | null | undefined) => Number(v ?? 0)
  const kopija = [...vrstice]
  if (kako === 'povprecje') {
    return kopija
      .filter((v) => st(v.rounds_played) >= NAJMANJ_KROGOV_ZA_POVPRECJE)
      .sort(
        (a, b) =>
          st(b.points_per_round) - st(a.points_per_round) ||
          st(b.total_points) - st(a.total_points) ||
          (a.team_name ?? '').localeCompare(b.team_name ?? '', 'sl'),
      )
  }
  return kopija.sort(
    (a, b) =>
      st(b.total_points) - st(a.total_points) ||
      st(b.rounds_played) - st(a.rounds_played) ||
      (a.team_name ?? '').localeCompare(b.team_name ?? '', 'sl'),
  )
}

/**
 * Mesta z enakim izidom si delijo mesto (1, 2, 2, 4) — kakor v športu.
 * Brez tega bi dve ekipi z istim izkupičkom videli različno številko in ena
 * bi upravičeno vprašala, zakaj.
 */
export function zMesti<T extends DrzavnaVrstica>(
  vrstice: T[],
  kako: Razvrstitev = 'skupno',
): (T & { mesto: number })[] {
  const kljuc = (v: DrzavnaVrstica) =>
    kako === 'povprecje' ? Number(v.points_per_round ?? 0) : Number(v.total_points ?? 0)
  let zadnji: number | null = null
  let mesto = 0
  return vrstice.map((v, i) => {
    const k = kljuc(v)
    if (zadnji === null || k !== zadnji) mesto = i + 1
    zadnji = k
    return { ...v, mesto }
  })
}

/** Koliko lig in zvez je zastopanih — za kratko povzetek nad lestvico. */
export function povzetek(vrstice: DrzavnaVrstica[]) {
  return {
    ekip: vrstice.length,
    lig: new Set(vrstice.map((v) => v.competition_slug).filter(Boolean)).size,
    zvez: new Set(vrstice.map((v) => v.federation_short).filter(Boolean)).size,
  }
}
