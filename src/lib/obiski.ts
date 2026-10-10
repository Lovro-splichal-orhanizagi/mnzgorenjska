// Obiski strani: en zapis na stran na sejo na dan, brez uporabnika.
//
// Merimo doseg ("koliko ljudi je stran odprlo"), ne ogledov: osvežitev in
// vračanje na Lestvico štejeta enkrat, sicer bi stran, po kateri človek
// kroži, izgledala priljubljenejša od tiste, ki jo odpre enkrat in na njej
// ostane. Starost računa pripiše baza — odjemalec pošlje le ime strani.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase'

/**
 * Pot → ime strani v števcih. Dinamični deli (id igralca, koda mini lige)
 * odpadejo: v seštevkih ni oseb in ne posameznih ekip. Imena se morajo
 * ujemati s seznamom v `zabelezi_obisk()` — česar baza ne pozna, zavrže.
 */
const PO_POTI: Record<string, string> = {
  '/': 'domov',
  '/sk': 'vstop_drzave',
  '/hr': 'vstop_drzave',
  '/cz': 'vstop_drzave',
  '/hu': 'vstop_drzave',
  '/at': 'vstop_drzave',
  '/rs': 'vstop_drzave',
  '/ro': 'vstop_drzave',
  '/ee': 'vstop_drzave',
  '/si': 'vstop_drzave',
  '/my-team': 'moja_ekipa',
  '/players': 'igralci',
  '/standings': 'lestvica',
  '/national': 'slovenija',
  '/mini-leagues': 'mini_lige',
  '/results': 'rezultati',
  '/table': 'tabela',
  '/assists': 'glasovanje',
  '/positions': 'pozicije',
  '/absences': 'odsotnosti',
  '/account': 'racun',
  '/reminders': 'opomniki',
  '/legal': 'pravno',
  '/login': 'prijava',
  '/auth/confirm': 'potrditev',
}

const PO_PREDPONI: [string, string][] = [
  ['/player/', 'igralec'],
  ['/team/', 'ekipa'],
  ['/club/', 'klub'],
  ['/match/', 'tekma'],
  ['/l/', 'vstop_v_mini_ligo'],
]

export function imeStrani(pot: string): string | null {
  const cista = pot.length > 1 && pot.endsWith('/') ? pot.slice(0, -1) : pot
  if (PO_POTI[cista]) return PO_POTI[cista]
  for (const [predpona, ime] of PO_PREDPONI) {
    if (cista.startsWith(predpona)) return ime
  }
  // Admin, stare poti in neznane strani se ne štejejo.
  return null
}

export function zabeleziObisk(pot: string) {
  const stran = imeStrani(pot)
  if (!stran) return
  const kljuc = `slff-obisk-${stran}-${new Date().toISOString().slice(0, 10)}`
  try {
    if (sessionStorage.getItem(kljuc)) return
    sessionStorage.setItem(kljuc, '1')
  } catch {}
  // Klic se izvede šele ob then — `void supabase.rpc(…)` ne pošlje ničesar.
  supabase.rpc('zabelezi_obisk', { p_stran: stran }).then(
    () => {},
    () => {},
  )
}

/** Šteje obisk ob vsaki menjavi poti. */
export function useObisk() {
  const { pathname } = useLocation()
  useEffect(() => {
    zabeleziObisk(pathname)
  }, [pathname])
}
