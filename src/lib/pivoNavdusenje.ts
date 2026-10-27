// Kdaj okno "Časti pivo" povabi: ko je človek dobre volje, ne ob naključnem
// nalaganju strani. Dva povoda:
//
// - ekipa: pravkar je shranil veljavno ekipo za naslednji krog (MojaEkipa),
// - krog:  prvi obisk po končanem krogu, v katerem je ekipa napredovala na
//          lestvici lige ali zbrala več točk od povprečja lige.
//
// Slab krog ne sproži ničesar. Pogoje okna (splet, ne mladinska liga, račun
// star vsaj 3 dni, razmik 14 dni) preveri PivoOkno.
import { supabase } from './supabase'
import { vseVrstice } from './strani'
import { krogKoncan, danesIso, mestoVLigi } from './tedenskiPregled'

export type PovodPiva =
  | { vrsta: 'ekipa'; krog: number | null }
  | { vrsta: 'krog'; krog: number; premik: number | null; tocke: number; povprecje: number }

const DOGODEK = 'slff-pivo-povod'
const KLJUC_KROGA = 'slff-pivo-krog'
/** Krog, starejši od tega, ni več novica. */
const SVEZ_DNI = 10

/** MojaEkipa po uspešni shrambi. Okno se odloči samo, ali se pokaže. */
export function sproziPivoOkno(povod: PovodPiva) {
  window.dispatchEvent(new CustomEvent<PovodPiva>(DOGODEK, { detail: povod }))
}

export function poslusajPovode(ob: (povod: PovodPiva) => void): () => void {
  const fn = (e: Event) => ob((e as CustomEvent<PovodPiva>).detail)
  window.addEventListener(DOGODEK, fn)
  return () => window.removeEventListener(DOGODEK, fn)
}

/** Dober krog: napredek na lestvici ali več točk od povprečja lige. */
export function jeDoberKrog(tocke: number, povprecje: number, premik: number | null): boolean {
  if (premik != null && premik >= 1) return true
  return tocke > 0 && tocke > povprecje
}

/** Povprečje točk kroga, zaokroženo na eno decimalko. */
export function povprecjeKroga(tocke: number[]): number {
  if (!tocke.length) return 0
  return Math.round((tocke.reduce((a, b) => a + b, 0) / tocke.length) * 10) / 10
}

function zeOcenjen(krogId: number): boolean {
  try {
    return localStorage.getItem(KLJUC_KROGA) === String(krogId)
  } catch {
    return true
  }
}

function oznaciOcenjen(krogId: number) {
  try {
    localStorage.setItem(KLJUC_KROGA, String(krogId))
  } catch {}
}

/**
 * Zadnji končani krog ekipe uporabnika v ligi, če je bil dober in ga ta
 * naprava še ni ocenila. Vsak krog se oceni enkrat (tudi slab), zato poznejši
 * obiski istega kroga ne sprožijo ničesar.
 */
export async function najdiDoberKrog(uporabnik: string, ligaId: number): Promise<PovodPiva | null> {
  const { data: ekipa } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('owner_id', uporabnik)
    .eq('competition_id', ligaId)
    .eq('hisna', false)
    .order('id')
    .limit(1)
    .maybeSingle()
  if (!ekipa) return null

  const { data: zadnja } = await supabase
    .from('fantasy_round_points')
    .select('round_id, season, round_number, points, statistics_pending')
    .eq('fantasy_team_id', ekipa.id)
    .order('season', { ascending: false })
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (zadnja?.statistics_pending || zadnja?.points == null) return null
  if (!zadnja?.round_id || zadnja.season == null || zadnja.round_number == null) return null
  const krogId = zadnja.round_id
  if (zeOcenjen(krogId)) return null

  const { data: tekme } = await supabase
    .from('matches')
    .select('played_on, imported_at, kontumacija')
    .eq('round_id', krogId)
  const danes = danesIso()
  if (!krogKoncan(tekme ?? [], danes)) return null
  const odigrano = (tekme ?? []).map((m) => m.played_on).filter((d): d is string => !!d).sort().at(-1)
  const meja = danesIso(new Date(Date.now() - SVEZ_DNI * 24 * 60 * 60 * 1000))
  if (odigrano && odigrano < meja) {
    oznaciOcenjen(krogId)
    return null
  }

  const [krogi, vrstice] = await Promise.all([
    supabase.from('rounds').select('id, number').eq('competition_id', ligaId).eq('season', zadnja.season),
    vseVrstice((od, do_) =>
      supabase
        .from('fantasy_round_points')
        .select('round_id, fantasy_team_id, points, statistics_pending')
        .eq('competition_id', ligaId)
        .eq('season', zadnja.season!)
        .lte('round_number', zadnja.round_number!)
        .order('round_id')
        .order('fantasy_team_id')
        .range(od, do_),
    ),
  ])
  if (vrstice.some(row => row.statistics_pending)) return null
  oznaciOcenjen(krogId)

  const stevilke = new Map<number, number>((krogi.data ?? []).map((k) => [k.id, k.number]))
  const { premik } = mestoVLigi(vrstice, stevilke, ekipa.id, zadnja.round_number)
  const tocke = Number(zadnja.points ?? 0)
  const povprecje = povprecjeKroga(vrstice.filter((v) => v.round_id === krogId).map((v) => Number(v.points ?? 0)))
  if (!jeDoberKrog(tocke, povprecje, premik)) return null
  return { vrsta: 'krog', krog: zadnja.round_number, premik, tocke, povprecje }
}
