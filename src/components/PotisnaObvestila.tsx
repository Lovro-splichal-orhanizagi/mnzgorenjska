// Potisna obvestila v mobilni aplikaciji (FCM za iOS in Android).
//
// Žeton naprave prijavljenega shrani v `push_tokens`, če je dovoljenje že
// dano; pošilja jih `posli-opomnik`. Za dovoljenje NE vpraša ob prijavi (brez
// konteksta, zavrnitve pa ni mogoče popraviti v aplikaciji): vpraša prva
// shramba ekipe, stikalo na strani Obvestila (`registrirajPush(true)`) in pas
// po prijavi v aplikaciji, dokler dovoljenje ni odločeno (ekipo je večina
// sestavila na spletu, zato prve shrambe v aplikaciji nikoli ni bilo).
// "Zapri" pas skrije za teden dni.
// Ob odjavi žeton izbrišemo,
// sicer bi naslednji na isti napravi dobival obvestila prejšnjega. Dotik
// obvestila odpre pot iz `data.url`. Na spletu ne naredi nič.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { jeNativno } from '../lib/platforma'
import { varnaPot } from '../lib/prijava'
import { t } from '../i18n'

const ZAPRTO = 'slff-push-pas-zaprt'
const TEDEN = 7 * 86400e3

async function shrani(token: string) {
  const platforma = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
  await supabase.rpc('shrani_push_zeton', { p_zeton: token, p_platforma: platforma })
}

export type DovoljenjePush = 'granted' | 'denied' | 'prompt'

/**
 * Stanje dovoljenja; z `vprasaj` ob neodločenem vpraša sistem. Ob dovoljenju
 * shrani žeton. Zunaj aplikacije ali brez Firebase vrne `denied`.
 */
export async function registrirajPush(vprasaj: boolean): Promise<DovoljenjePush> {
  if (!jeNativno()) return 'denied'
  try {
    let { receive } = await FirebaseMessaging.checkPermissions()
    if (receive !== 'granted' && receive !== 'denied' && vprasaj)
      ({ receive } = await FirebaseMessaging.requestPermissions())
    if (receive !== 'granted') return receive === 'denied' ? 'denied' : 'prompt'
    const { token } = await FirebaseMessaging.getToken()
    await shrani(token)
    return 'granted'
  } catch {
    // Firebase ni nastavljen (razvojna gradnja brez GoogleService datotek).
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
    if (!jeNativno()) return
    const bil = prej.current
    prej.current = uporabnik
    if (!uporabnik) {
      if (bil) void FirebaseMessaging.deleteToken().catch(() => {})
      return
    }
    setPas(false)
    void registrirajPush(false).then(async (d) => {
      if (d !== 'prompt' || Date.now() - Number(localStorage.getItem(ZAPRTO) ?? 0) < TEDEN) return
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
