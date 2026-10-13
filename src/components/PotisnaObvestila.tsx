// Potisna obvestila: FCM v mobilni aplikaciji (iOS, Android) in v brskalniku.
//
// Žeton naprave prijavljenega shrani v `push_tokens`, če je dovoljenje že
// dano; pošilja jih `posli-opomnik`. Za dovoljenje NE vpraša ob prijavi (brez
// konteksta, zavrnitve pa ni mogoče popraviti v aplikaciji): vpraša prva
// shramba ekipe, stikalo na strani Obvestila (`registrirajPush(true)`) in pas
// po prijavi, dokler dovoljenje ni odločeno (ekipo je večina sestavila na
// spletu, zato prve shrambe v aplikaciji nikoli ni bilo). "Zapri" pas skrije
// za teden dni.
//
// V brskalniku gre isti vtičnik prek Firebase JS (spletna aplikacija "SLFF web"
// v projektu slff-cb58e, privzeti ključ VAPID); obvestilo prikaže
// `public/obvestila-sw.js`. Safari na iPhonu push pozna le v aplikaciji na
// zaslonu, zato tam pasu ni (`pushPodprt`).
// Ob odjavi žeton izbrišemo,
// sicer bi naslednji na isti napravi dobival obvestila prejšnjega. Dotik
// obvestila odpre pot iz `data.url`.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { jeNativno } from '../lib/platforma'
import { varnaPot } from '../lib/prijava'
import { t } from '../i18n'

const ZAPRTO = 'slff-push-pas-zaprt'
const TEDEN = 7 * 86400e3
// Prva gradnja trgovine z nastavitvijo Firebase (1.0.1, gradnja 3).
const PUSH_OD_GRADNJE = 3

// Javna nastavitev spletne aplikacije Firebase (ni skrivnost).
const FIREBASE_SPLET = {
  apiKey: 'AIzaSyAfwaMY71Te0RxJcoopZpTmoktahJ1q1Ns',
  authDomain: 'slff-cb58e.firebaseapp.com',
  projectId: 'slff-cb58e',
  messagingSenderId: '397012484212',
  appId: '1:397012484212:web:157ee3df49d897ada65121',
}

/** Ali ta naprava sploh zna push (aplikacija ali brskalnik s Push API). */
export function pushPodprt(): boolean {
  if (jeNativno()) return true
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

let splet: Promise<ServiceWorkerRegistration> | null = null
/** Firebase in delavec obvestil v brskalniku, enkrat na stran. */
function pripraviSplet(): Promise<ServiceWorkerRegistration> {
  splet ??= (async () => {
    const { initializeApp, getApps } = await import('firebase/app')
    if (!getApps().length) initializeApp(FIREBASE_SPLET)
    return navigator.serviceWorker.register('/obvestila-sw.js')
  })()
  return splet
}

async function shrani(token: string) {
  const platforma = jeNativno() ? (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android') : 'web'
  await supabase.rpc('shrani_push_zeton', { p_zeton: token, p_platforma: platforma })
}

export type DovoljenjePush = 'granted' | 'denied' | 'prompt'

/**
 * Stanje dovoljenja; z `vprasaj` ob neodločenem vpraša sistem. Ob dovoljenju
 * shrani žeton. Brez podpore ali brez Firebase vrne `denied`.
 */
export async function registrirajPush(vprasaj: boolean): Promise<DovoljenjePush> {
  if (!pushPodprt()) return 'denied'
  try {
    // V brskalniku se vprašanje ne sme izgubiti za uvozom Firebase (Safari
    // dovoli requestPermission le neposredno ob kliku), zato najprej to.
    if (!jeNativno()) {
      let d = Notification.permission
      if (d === 'default' && vprasaj) d = await Notification.requestPermission()
      if (d !== 'granted') return d === 'denied' ? 'denied' : 'prompt'
      const registracija = await pripraviSplet()
      const { token } = await FirebaseMessaging.getToken({ serviceWorkerRegistration: registracija })
      await shrani(token)
      return 'granted'
    }
    let { receive } = await FirebaseMessaging.checkPermissions()
    if (receive !== 'granted' && receive !== 'denied' && vprasaj)
      ({ receive } = await FirebaseMessaging.requestPermissions())
    if (receive !== 'granted') return receive === 'denied' ? 'denied' : 'prompt'
    const { token } = await FirebaseMessaging.getToken()
    await shrani(token)
    return 'granted'
  } catch {
    // Firebase ni nastavljen (razvojna gradnja brez GoogleService datotek) ali brskalnik zavrne.
    return 'denied'
  }
}

export default function PotisnaObvestila() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const uporabnik = session?.user.id ?? null
  const prej = useRef<string | null>(null)
  const [pas, setPas] = useState(false)

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
    if (!pushPodprt()) return
    const bil = prej.current
    prej.current = uporabnik
    if (!uporabnik) {
      setPas(false)
      // Na spletu je Firebase pripravljen le, če je ta stran žeton že dobila.
      if (bil && (jeNativno() || splet)) void FirebaseMessaging.deleteToken().catch(() => {})
      return
    }
    void registrirajPush(false).then(async (d) => {
      if (d !== 'prompt' || Date.now() - Number(localStorage.getItem(ZAPRTO) ?? 0) < TEDEN) return
      // Gradnja 1 (iOS in Android 1.0) je brez Firebase: žetona ne dobi, pas bi lagal.
      if (jeNativno() && Number((await App.getInfo()).build) < PUSH_OD_GRADNJE) return
      const { data } = await supabase.from('profiles').select('brez_push').eq('id', uporabnik).maybeSingle()
      if (!data?.brez_push) setPas(true)
    })
  }, [uporabnik])

  if (!pas) return null
  return (
    <div className="kartica fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md space-y-3 p-4 shadow-lg">
      <p className="font-semibold">{t('racun.opomniki.push')}</p>
      <p className="text-sm text-slate-300">{t('racun.opomniki.pushOpis')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="gumb-glavni min-h-[44px] flex-1 px-3 py-2"
          onClick={() => {
            setPas(false)
            void registrirajPush(true)
          }}
        >
          {t('racun.opomniki.pushDovoli')}
        </button>
        <button
          type="button"
          className="gumb-tih min-h-[44px] px-3 py-2"
          onClick={() => {
            localStorage.setItem(ZAPRTO, String(Date.now()))
            setPas(false)
          }}
        >
          {t('skupno.zapri')}
        </button>
      </div>
    </div>
  )
}
