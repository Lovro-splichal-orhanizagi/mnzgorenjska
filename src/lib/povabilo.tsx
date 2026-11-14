// Povabilo prijatelja s kodo (`?od=<koda>`): kdo je koga pripeljal.
//
// Kdor ima čakajoč zahtevek za prevzem profila, je pregledan prej, če
// pripelje prijatelja, ki se prijavi prek njegove povezave in sestavi ekipo
// (migracija 20261014233100). Koda ob obisku počaka v shrambi brskalnika, ker
// se prijatelj večinoma najprej prijavi (potrditev e-pošte, Google) in šele
// nato pride nazaj. Zabeleži se le novemu računu, enkrat — to preveri baza.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './useAuth'
import { izvor } from './platforma'
import { nastaviMojoKodo } from './mojaKoda'

const KLJUC = 'slff-povabil'
const KLJUC_MOJA = 'slff-moja-koda'
/** Enkrat na napravo in račun: koda se ne spreminja, zato je shranjena. */
async function naloziMojoKodo(uid: string) {
  try {
    const [u, k] = (localStorage.getItem(KLJUC_MOJA) ?? '').split(':')
    if (u === uid && VZOREC.test(k ?? '')) return nastaviMojoKodo(k ?? null)
  } catch {
    /* zasebno okno: vprašamo bazo */
  }
  const { data } = await supabase.rpc('moja_koda_vabila')
  if (typeof data !== 'string') return
  nastaviMojoKodo(data)
  try {
    localStorage.setItem(KLJUC_MOJA, `${uid}:${data}`)
  } catch {
    /* nič */
  }
}
const VZOREC = /^[a-z0-9]{8}$/

/** Ob nalaganju strani: zapomni si kodo iz naslova. */
function ujemiPovabilo() {
  try {
    const koda = new URLSearchParams(window.location.search).get('od')?.trim().toLowerCase()
    if (koda && VZOREC.test(koda)) localStorage.setItem(KLJUC, koda)
  } catch {
    /* zasebno okno: povabilo se izgubi, stran dela naprej */
  }
}

/** Po prijavi: zabeleži shranjeno kodo in jo pozabi (tudi ob zavrnitvi). */
export async function zabeleziPovabilo() {
  let koda: string | null = null
  try {
    koda = localStorage.getItem(KLJUC)
  } catch {
    return
  }
  if (!koda) return
  const { error } = await supabase.rpc('zabelezi_povabilo', { p_koda: koda })
  if (error) return // omrežje: poskusi ob naslednjem nalaganju
  try {
    localStorage.removeItem(KLJUC)
  } catch {
    /* nič */
  }
}

/** Povezava s kodo prijavljenega do te strani (v aplikaciji vedno slff.eu). */
export async function povezavaZVabilom(pot: string): Promise<string> {
  const { data } = await supabase.rpc('moja_koda_vabila')
  const u = new URL(pot, izvor())
  if (typeof data === 'string') u.searchParams.set('od', data)
  return u.toString()
}

/** V App: ujame kodo ob vsakem prehodu (tudi povezave, ki jih odpre aplikacija) in jo po prijavi zabeleži. */
export function BeleziPovabilo() {
  const { search } = useLocation()
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  useEffect(() => {
    ujemiPovabilo()
    if (uid) void zabeleziPovabilo()
  }, [search, uid])
  useEffect(() => {
    nastaviMojoKodo(null)
    if (uid) void naloziMojoKodo(uid)
  }, [uid])
  return null
}
