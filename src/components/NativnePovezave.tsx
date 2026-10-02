// Povezave, ki odprejo mobilno aplikacijo: slff.eu/… (Universal Links, App
// Links — e-pošta, deljene povezave, povabila) in `eu.slff.app://auth` (vrnitev
// iz prijave z Googlom/Applom v sistemskem brskalniku). Na spletu ne naredi nič.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { jeNativno, SHEMA } from '../lib/platforma'
import { varnaPot } from '../lib/prijava'

export default function NativnePovezave() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!jeNativno()) return
    async function odpri(naslov: string) {
      let url: URL
      try {
        url = new URL(naslov)
      } catch {
        return
      }
      // Seja iz prijave pride v # (implicitni tok Supabase), kot na spletu.
      const hash = new URLSearchParams(url.hash.slice(1))
      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token')
      if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token })

      if (url.protocol === `${SHEMA}:`) {
        void Browser.close().catch(() => {})
        navigate(varnaPot(url.searchParams.get('nazaj')) ?? '/', { replace: true })
        return
      }
      navigate(varnaPot(url.pathname + url.search + (access_token ? '' : url.hash)) ?? '/')
    }
    const poslusalec = App.addListener('appUrlOpen', ({ url }) => void odpri(url))
    // Hladen zagon s povezavo: dogodek je lahko prišel, preden je stran poslušala.
    void App.getLaunchUrl().then((z) => {
      if (z?.url) void odpri(z.url)
    })
    return () => {
      void poslusalec.then((p) => p.remove())
    }
  }, [navigate])

  return null
}
