// Potisna obvestila v mobilni aplikaciji (FCM za iOS in Android).
//
// Prijavljenega vpraša za dovoljenje in žeton naprave shrani v `push_tokens`;
// pošilja jih `posli-opomnik` skupaj z e-pošto. Ob odjavi žeton izbrišemo,
// sicer bi naslednji na isti napravi dobival obvestila prejšnjega. Dotik
// obvestila odpre pot iz `data.url`. Na spletu ne naredi nič.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { jeNativno } from '../lib/platforma'
import { varnaPot } from '../lib/prijava'

async function shrani(token: string) {
  const platforma = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
  await supabase.rpc('shrani_push_zeton', { p_zeton: token, p_platforma: platforma })
}

export default function PotisnaObvestila() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const uporabnik = session?.user.id ?? null
  const prej = useRef<string | null>(null)

  useEffect(() => {
    if (!jeNativno()) return
    const poslusalci = [
      FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const url = (notification.data as { url?: unknown } | undefined)?.url
        if (typeof url !== 'string') return
        try {
          const u = new URL(url, 'https://slff.eu')
          navigate(varnaPot(u.pathname + u.search) ?? '/')
        } catch {
          // Neveljaven naslov v obvestilu — ostanemo, kjer smo.
        }
      }),
      // Žeton se lahko zamenja med uporabo (FCM ga obnavlja).
      FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        if (prej.current) void shrani(token)
      }),
    ]
    return () => {
      for (const p of poslusalci) void p.then((x) => x.remove())
    }
  }, [navigate])

  useEffect(() => {
    if (!jeNativno()) return
    const bil = prej.current
    prej.current = uporabnik
    if (!uporabnik) {
      if (bil) void FirebaseMessaging.deleteToken().catch(() => {})
      return
    }
    void (async () => {
      try {
        const { receive } = await FirebaseMessaging.requestPermissions()
        if (receive !== 'granted') return
        const { token } = await FirebaseMessaging.getToken()
        await shrani(token)
      } catch {
        // Firebase ni nastavljen (razvojna gradnja brez GoogleService datotek).
      }
    })()
  }, [uporabnik])

  return null
}
