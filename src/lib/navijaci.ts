// Navijači klubov: vrstice `navijaci_klubov(liga)` zložene po klubih.
//
// Ločeno od komponente, da ga `npm run smoke` preveri brez baze. Funkcija
// vrne en navijač na vrstico (klub brez navijačev ima eno vrstico brez
// ekipe), podatki kluba se ponovijo v vsaki.

/** Vrstica `navijaci_klubov`. Stolpci so lahko prazni (klub brez navijačev, liga brez kroga). */
export interface VrsticaNavijacev {
  team_id: number
  klub: string | null
  klub_kratko: string | null
  grb: string | null
  navijacev: number | null
  povprecje_sezona: number | string | null
  povprecje_krog: number | string | null
  mesto: number | null
  min_navijacev: number | null
  fantasy_team_id: number | null
  ekipa: string | null
  lastnik: string | null
  tocke_sezona: number | string | null
  tocke_krog: number | string | null
  round_number: number | null
  season: string | null
}

export interface Navijac {
  fantasy_team_id: number
  ekipa: string | null
  lastnik: string | null
  tocke_sezona: number
  tocke_krog: number
}

export interface KlubNavijacev {
  team_id: number
  klub: string
  klub_kratko: string | null
  grb: string | null
  navijacev: number
  povprecje_sezona: number
  povprecje_krog: number
  /** Mesto med klubi z dovolj navijači; `null`, če jih ima premalo. */
  mesto: number | null
  navijaci: Navijac[]
}

export interface NavijaciLige {
  /** Klubi z mestom, od prvega navzdol. */
  uvrsceni: KlubNavijacev[]
  /** Klubi z navijači, a premalo za mesto. */
  premalo: KlubNavijacev[]
  /** Klubi lige, za katere še nihče ne navija. */
  brez: KlubNavijacev[]
  /** Najmanj navijačev za mesto. */
  min: number
  /** Zadnji odigrani krog lige, `null` pred prvim. */
  krog: number | null
}

export const MIN_NAVIJACEV_PRIVZETO = 3

const st = (v: number | string | null | undefined) => Number(v ?? 0)

export function zdruziNavijace(vrstice: VrsticaNavijacev[]): NavijaciLige {
  const klubi = new Map<number, KlubNavijacev>()
  let min = MIN_NAVIJACEV_PRIVZETO
  let krog: number | null = null
  for (const v of vrstice) {
    if (v.min_navijacev != null) min = v.min_navijacev
    if (v.round_number != null) krog = v.round_number
    let k = klubi.get(v.team_id)
    if (!k) {
      k = {
        team_id: v.team_id,
        klub: v.klub ?? '',
        klub_kratko: v.klub_kratko,
        grb: v.grb,
        navijacev: v.navijacev ?? 0,
        povprecje_sezona: st(v.povprecje_sezona),
        povprecje_krog: st(v.povprecje_krog),
        mesto: v.mesto,
        navijaci: [],
      }
      klubi.set(v.team_id, k)
    }
    if (v.fantasy_team_id != null)
      k.navijaci.push({
        fantasy_team_id: v.fantasy_team_id,
        ekipa: v.ekipa,
        lastnik: v.lastnik,
        tocke_sezona: st(v.tocke_sezona),
        tocke_krog: st(v.tocke_krog),
      })
  }
  const vsi = [...klubi.values()]
  for (const k of vsi)
    k.navijaci.sort(
      (a, b) => b.tocke_sezona - a.tocke_sezona || a.fantasy_team_id - b.fantasy_team_id,
    )
  const poImenu = (a: KlubNavijacev, b: KlubNavijacev) => a.klub.localeCompare(b.klub)
  return {
    uvrsceni: vsi
      .filter((k) => k.mesto != null)
      .sort((a, b) => a.mesto! - b.mesto! || poImenu(a, b)),
    premalo: vsi
      .filter((k) => k.mesto == null && k.navijacev > 0)
      .sort((a, b) => b.navijacev - a.navijacev || poImenu(a, b)),
    brez: vsi.filter((k) => k.navijacev === 0).sort(poImenu),
    min,
    krog,
  }
}
