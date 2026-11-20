// SLFF Pro v brskalniku: klic funkcije pro-placilo in značke ekip.
//
// Kaj kdo ima, odloči baza (stikalo `slff_pro`, `pro_aktiven`, migracija
// 20261120120000); vmesnik le prikaže. Značke: `vidi_pro` enkrat na obisk
// (pri izklopljenem stikalu nič drugega), nato `pro_ekipe` enkrat na val imen
// ekip, ki se izrišejo skupaj (lestvica, mini liga, dvoboji).
import { useEffect, useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { prevediNapako } from './napake'
import { t } from '../i18n'

export interface MojPro {
  vidno: boolean
  aktiven: boolean
  vir?: 'sezona' | 'mesec' | 'rocno' | null
  velja_do?: string | null
  portal: boolean
  bonov?: number
}

export interface CenaPro {
  vir: 'sezona' | 'mesec'
  centi: number
  valuta: string
  interval: string | null
}

export async function mojPro(): Promise<MojPro | null> {
  const { data } = await supabase.rpc('moj_pro')
  return (data as unknown as MojPro | null) ?? null
}

/** Klic funkcije pro-placilo; vrne odgovor ali prevedeno napako. */
export async function proPlacilo(telo: Record<string, unknown>): Promise<{ url?: string; cene?: CenaPro[]; napaka?: string }> {
  const { data, error } = await supabase.functions.invoke('pro-placilo', { body: telo })
  let sporocilo: string | undefined = data?.error
  if (error instanceof FunctionsHttpError) {
    sporocilo = await (error.context as Response)
      .json()
      .then((j: { error?: string }) => j?.error)
      .catch(() => undefined)
  }
  if (!error && (data?.url || data?.cene)) return { url: data.url, cene: data.cene }
  return { napaka: sporocilo ? prevediNapako(sporocilo) : t('pro.napaka') }
}

let vidi: Promise<boolean> | null = null
const znane = new Map<number, boolean>()
const cakajo = new Set<number>()
const poslusalci = new Set<() => void>()
let val: ReturnType<typeof setTimeout> | null = null

async function preberiVal(): Promise<void> {
  val = null
  const ids = [...cakajo]
  cakajo.clear()
  vidi ??= Promise.resolve(supabase.rpc('vidi_pro')).then(({ data }) => data === true, () => false)
  const pro = new Set<number>()
  if (await vidi) {
    for (let i = 0; i < ids.length; i += 2000) {
      const { data } = await supabase.rpc('pro_ekipe', { p_ekipe: ids.slice(i, i + 2000) })
      for (const id of (data ?? []) as number[]) pro.add(id)
    }
  }
  for (const id of ids) znane.set(id, pro.has(id))
  poslusalci.forEach((f) => f())
}

/** Ali ekipa nosi značko Pro (false, dokler ni znano). */
export function useProEkipa(id: number | null | undefined): boolean {
  const [, osvezi] = useState(0)
  useEffect(() => {
    if (id == null || znane.has(id)) return
    const f = () => osvezi((n) => n + 1)
    poslusalci.add(f)
    cakajo.add(id)
    val ??= setTimeout(() => void preberiVal(), 0)
    return () => {
      poslusalci.delete(f)
    }
  }, [id])
  return id != null && znane.get(id) === true
}
