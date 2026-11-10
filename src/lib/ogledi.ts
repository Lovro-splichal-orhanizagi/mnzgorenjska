// Ogledi profila igralca za mesečno statistiko preverjenega profila
// (`zabelezi_ogled_profila`, migracija 20261109190000). Kot obiski strani:
// enkrat na sejo na dan na igralca, brez gledalca. Baza šteje le potrjene
// profile in ne lastnika samega.
import { supabase } from './supabase'

/**
 * Prišel od zunaj: ta profil je prva stran obiska in pred njo je bila druga
 * stran (deljena povezava, iskalnik, družbena omrežja). `document.referrer`
 * ostane v SPA ves obisk isti, zato šteje le vstopna stran.
 */
function odZunaj(): boolean {
  try {
    const vstop = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (!vstop || new URL(vstop.name).pathname !== location.pathname) return false
    return !!document.referrer && new URL(document.referrer).origin !== location.origin
  } catch {
    return false
  }
}

export function zabeleziOgledProfila(igralecId: number) {
  if (!Number.isFinite(igralecId)) return
  const kljuc = `slff-ogled-${igralecId}-${new Date().toISOString().slice(0, 10)}`
  try {
    if (sessionStorage.getItem(kljuc)) return
    sessionStorage.setItem(kljuc, '1')
  } catch {}
  // Klic se izvede šele ob then — `void supabase.rpc(…)` ne pošlje ničesar.
  supabase.rpc('zabelezi_ogled_profila', { p_player_id: igralecId, p_od_zunaj: odZunaj() }).then(
    () => {},
    () => {},
  )
}

export type MesecOgledov = { mesec: string; igra: number; gost: number; povezava: number; scout: number }

/** Zadnjih 6 mesecev, najnovejši prvi; prazno, če klicatelj ni preverjen lastnik. */
export async function mesecniOgledi(igralecId: number): Promise<MesecOgledov[]> {
  const { data } = await supabase.rpc('mesecni_ogledi_profila', { p_player_id: igralecId })
  return (data ?? []) as MesecOgledov[]
}

/**
 * Vsak ogled strani igralca za okno "Tvoj profil" (`zabelezi_ogled_igralca`):
 * brez sejnega omejevanja, tudi lastnikov in osvežitev — okno kaže oglede,
 * ne ljudi. Državo doda baza iz glave Cloudflara.
 */
export function zabeleziOgledIgralca(igralecId: number) {
  if (!Number.isFinite(igralecId)) return
  supabase.rpc('zabelezi_ogled_igralca', { p_igralec: igralecId }).then(
    () => {},
    () => {},
  )
}

export type VlogaVEkipi = 'kapetan' | 'podkapetan' | 'postava' | 'klop'
export type EkipaVabe = {
  id: number
  ime: string
  lastnik: string | null
  liga: string
  mesto: number | null
  tock: number | null
  vloga: VlogaVEkipi
}
export type Vaba =
  | { preverjen: false }
  | {
      preverjen: true
      ogledi_7: number
      ogledi_skupaj: number
      tedni: { teden: string; ogledi: number }[]
      drzave: { drzava: string; ogledi: number }[]
      ekipe: EkipaVabe[]
    }

/** Okno "Tvoj profil"; null, če klicatelj ni lastnik potrjenega profila. */
export async function vabaProfila(igralecId: number): Promise<Vaba | null> {
  const { data, error } = await supabase.rpc('vaba_profila', { p_igralec: igralecId })
  if (error || !data) return null
  return data as unknown as Vaba
}
