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

export type PokroviteljLige = { id: number; ime: string; logo: string | null; url: string }

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
  return { id: s.id, ime: s.name, logo: varenNaslov(s.logo_url, true), url }
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
