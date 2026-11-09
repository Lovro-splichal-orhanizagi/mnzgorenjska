// Zasebna sporočila v igri (migracija 20261109191000, SLF-373). Preverjen
// igralec piše komurkoli, ostali le preverjenim; kdo sme, odloči baza
// (`sporocila_razlog`) in vrne kodo razloga, ki jo tu prevedemo.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth'
import { t } from '../i18n'

export type Razlog = 'prijava' | 'sam' | 'omejen' | 'mladinec' | 'izklop' | 'blokada' | 'preverjen' | 'ni_lastnika' | 'meja' | 'ni_pogovora'

export type Pogovor = {
  id: number
  drugi: string
  ime: string | null
  igralec_id: number | null
  igralec: string | null
  preverjen: boolean
  zadnje: string | null
  zadnje_moje: boolean | null
  zadnje_at: string
  neprebranih: number
  razlog: Razlog | null
  blokiran: boolean
}

export type Sporocilo = { id: number; moje: boolean; besedilo: string; created_at: string; prebrano: boolean }

export const NAJDALJSE = 1000

/** Razlog iz napake RPC (`hint`), sicer splošna napaka. */
export function razlogNapake(napaka: { hint?: string | null; message?: string } | null): string {
  const r = napaka?.hint as Razlog | undefined
  return r ? opisRazloga(r) : t('igralci.sporocila.napaka')
}

export function opisRazloga(r: Razlog): string {
  return t(`igralci.sporocila.razlogi.${r}`)
}

export async function smePisati(igralecId: number): Promise<Razlog | null> {
  const { data } = await supabase.rpc('sporocila_sme_pisati', { p_player_id: igralecId })
  return (data as Razlog | null) ?? null
}

export async function pogovori(): Promise<Pogovor[]> {
  const { data } = await supabase.rpc('sporocila_pogovori')
  return (data ?? []) as Pogovor[]
}

/** Najnovejša sporočila pogovora v časovnem zaporedju; prejeta označi kot prebrana. */
export async function sporocilaPogovora(id: number): Promise<Sporocilo[]> {
  const { data } = await supabase.rpc('sporocila_pogovora', { p_pogovor: id })
  return ((data ?? []) as Sporocilo[]).slice().reverse()
}

/** Število neprebranih za značko v meniju; osveži se vsako minuto in ob fokusu. */
export function useNeprebrana(): number {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!uid) return setN(0)
    let velja = true
    const osvezi = () => {
      if (document.visibilityState !== 'visible') return
      supabase.rpc('sporocila_neprebrana').then(
        ({ data }) => velja && setN(typeof data === 'number' ? data : 0),
        () => {},
      )
    }
    osvezi()
    const ura = window.setInterval(osvezi, 60_000)
    window.addEventListener('focus', osvezi)
    window.addEventListener('slff-sporocila', osvezi)
    return () => {
      velja = false
      window.clearInterval(ura)
      window.removeEventListener('focus', osvezi)
      window.removeEventListener('slff-sporocila', osvezi)
    }
  }, [uid])
  return n
}

/** Po branju pogovora naj značka v meniju takoj pade. */
export function osveziZnacko() {
  window.dispatchEvent(new Event('slff-sporocila'))
}
