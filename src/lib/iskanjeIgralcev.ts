// Iskanje igralcev čez vse aktivne lige (RPC `isci_igralce`, migracija
// 20261011201100). Uporabljata ga izbirnik lige (razdelek "Igralci" pod
// ligami) in stran Igralci (ko iskanje v izbrani ligi ne najde nikogar).
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { prikazniIme } from './pomozno'

/** Vrstica, ki jo vrne `isci_igralce`. */
export interface NajdenIgralec {
  id: number
  full_name: string | null
  klub: string | null
  /** Šifra lige (`?t=`). */
  liga: string
  /** Kratko ime lige. */
  liga_ime: string | null
  drzava: string | null
  pozicija: string | null
  cena: number | null
  aktiven: boolean
  liga_aktivna: boolean
  /** Zadetek po podobnosti (tipkarska napaka), ne po natančnem imenu. */
  podobno: boolean
}

/** Toliko znakov (brez presledkov) mora imeti iskanje; isto pravilo ima baza. */
export const NAJMANJ_ZNAKOV = 3

export function dovoljZaIskanje(niz: string): boolean {
  return niz.replace(/\s+/g, '').length >= NAJMANJ_ZNAKOV
}

/** Brez šumnikov in velikih črk, kot `podpora_brez_sumnikov` v bazi. */
const brezSumnikov = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Ali ime ustreza iskanju po istem pravilu kot baza: vsaka beseda iskanja
 * stoji v imenu, brez šumnikov, vrstni red ni pomemben ("zan seljak" najde
 * "Seljak Žan"). Prazno iskanje ustreza vsem.
 */
export function ujemaIme(ime: string | null | undefined, iskanje: string): boolean {
  const besede = brezSumnikov(iskanje).split(/\s+/).filter(Boolean)
  if (!besede.length) return true
  const cilj = brezSumnikov(ime ?? '')
  return besede.every((b) => cilj.includes(b))
}

/** "Ime Priimek · Klub · Liga" za vrstico zadetka. */
export function opisIgralca(z: NajdenIgralec): string {
  return [prikazniIme(z.full_name), z.klub, z.liga_ime].filter(Boolean).join(' · ')
}

/** Pot do strani igralca v njegovi ligi. */
export function potIgralca(z: Pick<NajdenIgralec, 'id' | 'liga'>): string {
  return `/player/${z.id}?t=${encodeURIComponent(z.liga)}`
}

/** Zadetki zunaj izbrane lige, največ `koliko`. */
export function izDrugihLig(zadetki: NajdenIgralec[], slug: string | null, koliko: number): NajdenIgralec[] {
  return zadetki.filter((z) => z.liga !== slug).slice(0, koliko)
}

export async function isciIgralce(niz: string, omejitev = 8): Promise<NajdenIgralec[]> {
  if (!dovoljZaIskanje(niz)) return []
  const { data, error } = await supabase.rpc('isci_igralce', { iskanje: niz.trim(), omejitev })
  if (error) throw error
  return (data ?? []) as NajdenIgralec[]
}

/**
 * Zadetki za niz, ki ga človek tipka: poizvedba šele po `zamik` ms mirovanja,
 * odgovor starejšega niza, ki pride za novejšim, se zavrže. Prekratek niz
 * (ali `vklopljeno = false`) ne sproži ničesar.
 */
export function useIskanjeIgralcev(
  niz: string,
  { omejitev = 8, zamik = 250, vklopljeno = true }: { omejitev?: number; zamik?: number; vklopljeno?: boolean } = {},
): { zadetki: NajdenIgralec[]; nalaganje: boolean } {
  const [stanje, setStanje] = useState<{ niz: string; zadetki: NajdenIgralec[] }>({ niz: '', zadetki: [] })
  const [nalaganje, setNalaganje] = useState(false)
  const iskati = vklopljeno && dovoljZaIskanje(niz)
  const kljuc = niz.trim()

  useEffect(() => {
    if (!iskati) {
      setNalaganje(false)
      return
    }
    let veljavno = true
    setNalaganje(true)
    const cakaj = setTimeout(() => {
      isciIgralce(kljuc, omejitev)
        .catch(() => [] as NajdenIgralec[])
        .then((zadetki) => {
          if (!veljavno) return
          setStanje({ niz: kljuc, zadetki })
          setNalaganje(false)
        })
    }, zamik)
    return () => {
      veljavno = false
      clearTimeout(cakaj)
    }
  }, [iskati, kljuc, omejitev, zamik])

  // Med tipkanjem ostanejo zadetki prejšnjega niza, da seznam ne utripa;
  // `nalaganje` pove, da novi še prihajajo.
  const zadetki = iskati && stanje.niz ? stanje.zadetki : []
  return { zadetki, nalaganje: iskati && (nalaganje || stanje.niz !== kljuc) }
}
