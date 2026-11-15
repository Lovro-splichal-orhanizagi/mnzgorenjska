// Pokrovitelj lige (SLF-481): "Ligo predstavlja …" v glavi lige, na kartici
// za deljenje in v objavi lige tedna.
//
// Nove tabele ni: pokrovitelj je sponzor z dosegom te lige (admin, Sponzorji,
// doseg "liga"), sezono določata začetek in konec. `sponzorji_za` brez mesta
// vrne vse, kar velja za ligo (aktiven, v roku, stikalo `sponzorji_vidni`);
// vzamemo prvega z dosegom lige. Zveze in države ne štejejo: liga brez
// svojega pokrovitelja ne pokaže nič.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type PokroviteljLige = { id: number; liga: number; ime: string; logo: string | null; url: string }

type Vrstica = { id: number; name: string; logo_url: string | null; url: string; doseg: string }

/** Naslov iz baze gre v `href` ali na platno: le http(s) ali pot na naši strani. */
export function varenNaslov(url: string | null | undefined, dovoliPot = false): string | null {
  if (!url) return null
  if (dovoliPot && url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

export async function pokroviteljLige(ligaId: number): Promise<PokroviteljLige | null> {
  const { data } = await supabase.rpc('sponzorji_za', { p_competition_id: ligaId })
  const s = ((data ?? []) as Vrstica[]).find((v) => v.doseg === 'liga')
  const url = varenNaslov(s?.url)
  if (!s || !url) return null
  return { id: s.id, liga: ligaId, ime: s.name, logo: varenNaslov(s.logo_url, true), url }
}

/** Kje je bil pokrovitelj viden (SLF-484); pomen prikaza in klika v migraciji 20261115190000. */
export type MestoPokrovitelja = 'glava' | 'kartica' | 'objava'

/**
 * Zapis prikaza ali klika pokrovitelja. Baza šteje le trenutnega pokrovitelja
 * te lige. Poizvedba Supabase se pošlje šele ob `then`.
 */
export function zabeleziPokrovitelja(p: { id: number; liga: number }, mesto: MestoPokrovitelja, klik: boolean) {
  supabase
    .rpc('zabelezi_sponzorja', { p_sponsor_id: p.id, p_competition_id: p.liga, p_klik: klik, p_mesto: mesto })
    .then(
      () => {},
      () => {},
    )
}

/**
 * Oznaka v povezavi s kartice ali iz objave: `pk=k12.345` (k = kartica,
 * o = objava, sponzor 12, liga 345). Obisk prek nje je klik na tem mestu.
 */
export const oznakaPokrovitelja = (p: { id: number; liga: number }, mesto: 'kartica' | 'objava') =>
  `${mesto === 'kartica' ? 'k' : 'o'}${p.id}.${p.liga}`

/** Obisk s `pk=` v naslovu: enkrat na sejo zapiše klik. */
export function zabeleziObiskPokrovitelja(iskanje: string) {
  const m = /^([ko])(\d+)\.(\d+)$/.exec(new URLSearchParams(iskanje).get('pk') ?? '')
  if (!m) return
  const kljuc = `slff-pk-${m[0]}`
  try {
    if (sessionStorage.getItem(kljuc)) return
    sessionStorage.setItem(kljuc, '1')
  } catch {
    // Brez sessionStorage (zasebno okno): šteje vsak obisk, kot prej Umami.
  }
  zabeleziPokrovitelja({ id: Number(m[2]), liga: Number(m[3]) }, m[1] === 'k' ? 'kartica' : 'objava', true)
}

/** Pokrovitelj po slugu lige (kartica igralca pozna le slug). */
export async function pokroviteljPoSlugu(slug: string): Promise<PokroviteljLige | null> {
  const { data } = await supabase.from('competitions').select('id').eq('slug', slug).maybeSingle()
  return data?.id ? pokroviteljLige(data.id as number) : null
}

/** undefined = še nalaga, null = liga nima pokrovitelja. */
export function usePokroviteljLige(ligaId: number | null | undefined): PokroviteljLige | null | undefined {
  const [p, setP] = useState<{ liga: number; p: PokroviteljLige | null } | null>(null)
  useEffect(() => {
    if (!ligaId) return
    let velja = true
    pokroviteljLige(ligaId).then(
      (r) => velja && setP({ liga: ligaId, p: r }),
      () => velja && setP({ liga: ligaId, p: null }),
    )
    return () => {
      velja = false
    }
  }, [ligaId])
  if (!ligaId) return null
  return p?.liga === ligaId ? p.p : undefined
}
