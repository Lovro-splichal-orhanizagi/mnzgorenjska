// Nastavitve, kakor veljajo za izbrano ligo.
//
// Pragovi glasovanja so od migracije 20260909090000 last tekmovanja: trije
// glasovi so v ligi z dvesto igralci lahek dosežek in v ligi z dvajsetimi
// nedosegljivi. Strežnik jih od takrat upošteva, vmesnik pa je kazal števila,
// zapisana v kodi — ob prvem povozu bi stran trdila "1 / 3", asistenca pa bi
// se potrdila že pri dveh.
//
// Vrednosti so majhne in se skoraj nikoli ne spremenijo, zato jih naložimo
// enkrat na ligo in shranimo v modul: stran Asistence izriše `GolZaGlasovanje`
// za vsak gol posebej in vsak bi sicer sprožil svojo poizvedbo.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useTekmovanje } from './tekmovanje'

export type Nastavitve = Record<string, unknown>

const predpomnilnik = new Map<number, Nastavitve>()
const vTeku = new Map<number, Promise<Nastavitve>>()

async function naloziZa(id: number): Promise<Nastavitve> {
  const zeTu = predpomnilnik.get(id)
  if (zeTu) return zeTu
  const tece = vTeku.get(id)
  if (tece) return tece

  const p = (async () => {
    const { data, error } = await supabase.rpc('nastavitve_tekmovanja', {
      p_competition_id: id,
    })
    const v: Nastavitve =
      !error && data && typeof data === 'object' ? (data as Nastavitve) : {}
    predpomnilnik.set(id, v)
    vTeku.delete(id)
    return v
  })()
  vTeku.set(id, p)
  return p
}

/**
 * Vrne funkcijo za branje celoštevilske nastavitve s privzetkom.
 *
 * Dokler se nastavitve ne naložijo, vrne privzetek — enako, kot je vmesnik
 * kazal doslej, le da se nato popravi na vrednost lige.
 */
export function useNastavitev(): (kljuc: string, privzeto: number) => number {
  const { id } = useTekmovanje()
  const [nastavitve, setNastavitve] = useState<Nastavitve>(() =>
    id != null ? (predpomnilnik.get(id) ?? {}) : {},
  )

  useEffect(() => {
    if (id == null) return
    let veljavno = true
    naloziZa(id).then((v) => {
      if (veljavno) setNastavitve(v)
    })
    return () => {
      veljavno = false
    }
  }, [id])

  return (kljuc, privzeto) => {
    const v = nastavitve[kljuc]
    const n = typeof v === 'string' ? Number(v) : v
    return typeof n === 'number' && Number.isFinite(n) ? n : privzeto
  }
}
