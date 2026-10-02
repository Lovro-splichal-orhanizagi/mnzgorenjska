// Povezave, ki odprejo mobilno aplikacijo: slff.eu/… (Universal Links, App
// Links — e-pošta, deljene povezave, povabila) in `eu.slff.app://auth` (vrnitev
// iz prijave z Googlom/Applom v sistemskem brskalniku). Na spletu ne naredi nič.
//
// Seje iz povezave ne sprejmemo: kdorkoli lahko pošlje povezavo s svojimi
// žetoni in žrtev bi tiho prijavil v svoj račun. Prijava v aplikaciji teče po
// PKCE (src/lib/supabase.ts) — povratna povezava nosi le `code`, ki ga zamenja
// samo naprava, ki je prijavo začela.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { jeNativno, SHEMA } from '../lib/platforma'
import { varnaPot } from '../lib/prijava'

export default function NativnePovezave() {
  const navigate = useNavigate()
  // `navigate` se menja z vsako potjo; poslušalca nastavimo enkrat, sicer bi
  // getLaunchUrl() ob vsakem kliku znova odprl povezavo, s katero se je
  // aplikacija zagnala.
  const pojdi = useRef(navigate)
  pojdi.current = navigate

  useEffect(() => {
    if (!jeNativno()) return
    // Hladen zagon sproži appUrlOpen in getLaunchUrl z istim naslovom.
    const obdelani = new Set<string>()
    async function odpri(naslov: string) {
      if (obdelani.has(naslov)) return
      obdelani.add(naslov)
      let url: URL
      try {
        url = new URL(naslov)
      } catch {
        return
      }
      if (url.protocol === `${SHEMA}:`) {
        void Browser.close().catch(() => {})
        const koda = url.searchParams.get('code')
        if (koda) await supabase.auth.exchangeCodeForSession(koda)
        pojdi.current(varnaPot(url.searchParams.get('nazaj')) ?? '/', { replace: true })
        return
      }
      pojdi.current(varnaPot(url.pathname + url.search) ?? '/')
    }
    const poslusalec = App.addListener('appUrlOpen', ({ url }) => void odpri(url))
    void App.getLaunchUrl().then((z) => {
      if (z?.url) void odpri(z.url)
    })
    return () => {
      void poslusalec.then((p) => p.remove())
    }
  }, [])

  return null
}
