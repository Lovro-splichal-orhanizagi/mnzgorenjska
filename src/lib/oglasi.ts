// Oglasi Google AdSense na sponzorskih mestih (migracija 20261120130000).
//
// Kdo jih vidi, odloči baza (`oglasi_za`: stikalo `oglasi`, založnik, mladinska
// liga, plačnik). Vmesnik doda le, česar baza ne ve: v aplikaciji (WebView)
// AdSense ni dovoljen. Na javnih spletnih straneh skripto (pregled strani)
// vpiše strežnik HTML, razen v mladinskih ligah; mest pa ni, dokler
// `oglasi_za` vrne NULL. Drugje jo naloži šele `naloziAdSense`. Privolitev v
// EU zbere Googlov CMP, ki ga prinese ista skripta (AdSense → Zasebnost in
// sporočila).
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth'
import { useTekmovanje } from './tekmovanje'
import { jeNativno } from './platforma'
import { jeMladinskiSlug } from './prevzem'

export interface Oglas {
  client: string
  slot: string
}

/** Enota za mesto iz odgovora `oglasi_za`, ali null. Čista funkcija (smoke). */
export function izberiOglas(
  odgovor: unknown,
  kje: string,
  slug: string | null | undefined,
  nativno: boolean,
): Oglas | null {
  if (nativno || jeMladinskiSlug(slug) || !odgovor || typeof odgovor !== 'object') return null
  const { client, mesta } = odgovor as { client?: unknown; mesta?: unknown }
  if (typeof client !== 'string' || !/^ca-pub-\d{10,20}$/.test(client)) return null
  const slot = mesta && typeof mesta === 'object' ? (mesta as Record<string, unknown>)[kje] : null
  return typeof slot === 'string' && /^\d{5,20}$/.test(slot) ? { client, slot } : null
}

// shortcut: odgovor velja do ponovnega nalaganja na par liga + uporabnik; nakup Pro ga ne osveži sproti.
const odgovori = new Map<string, Promise<unknown>>()

export function useOglas(kje: string): Oglas | null {
  const { id, slug } = useTekmovanje()
  const uid = useAuth().session?.user.id ?? ''
  const [odgovor, setOdgovor] = useState<unknown>(null)

  useEffect(() => {
    setOdgovor(null)
    if (!id || jeNativno() || jeMladinskiSlug(slug)) return
    const kljuc = `${id}:${uid}`
    let p = odgovori.get(kljuc)
    if (!p) {
      p = Promise.resolve(supabase.rpc('oglasi_za', { p_competition_id: id })).then(
        ({ data }) => data,
        () => null,
      )
      odgovori.set(kljuc, p)
    }
    let veljavno = true
    p.then((d) => {
      if (veljavno) setOdgovor(d)
    })
    return () => {
      veljavno = false
    }
  }, [id, slug, uid])

  return izberiOglas(odgovor, kje, slug, jeNativno())
}

/** Googlovo skripto naloži enkrat na obisk, šele ko je oglas res na strani. */
export function naloziAdSense(client: string): void {
  // Na javnih straneh jo že vpiše strežnik HTML (streznik.mjs, `ADSENSE`).
  if (document.querySelector('script[src*="adsbygoogle.js"]')) return
  const s = document.createElement('script')
  s.id = 'adsbygoogle-js'
  s.async = true
  s.crossOrigin = 'anonymous'
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  document.head.appendChild(s)
}
