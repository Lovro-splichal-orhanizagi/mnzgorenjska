// Varovalo različice mobilne aplikacije. Koda je zapakirana v aplikacijo in
// se posodobi le prek trgovine, baza pa se spreminja sproti — po migraciji,
// ki zlomi star klic, stara aplikacija ne sme več delati tiho narobe.
// `settings.min_app_verzija` je najnižja številka gradnje (iOS
// CURRENT_PROJECT_VERSION, Android versionCode); starejša aplikacija vidi le
// poziv k posodobitvi. Brez vrstice velja 0. Na spletu ne naredi nič.
import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { jeNativno } from '../lib/platforma'
import { t } from '../i18n'

const TRGOVINA = {
  ios: 'https://apps.apple.com/app/id6818746153',
  android: 'https://play.google.com/store/apps/details?id=eu.slff.app',
}

export default function PosodobiAplikacijo() {
  const [zastarela, setZastarela] = useState(false)

  useEffect(() => {
    if (!jeNativno()) return
    void Promise.all([
      App.getInfo(),
      supabase.from('settings').select('value').eq('key', 'min_app_verzija').maybeSingle(),
    ]).then(([info, { data }]) => {
      setZastarela(Number(info.build) < Number(data?.value ?? 0))
    })
  }, [])

  if (!zastarela) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950 p-6 pb-[max(1.5rem,var(--dno))] pt-[max(1.5rem,var(--vrh))]">
      <div className="max-w-sm space-y-4 text-center">
        <img src="/logo/slff-grb.png" alt="" className="mx-auto h-24 w-24" />
        <h1 className="text-2xl font-black naslov">{t('aplikacija.posodobi.naslov')}</h1>
        <p className="text-slate-300">{t('aplikacija.posodobi.opis')}</p>
        <a
          href={Capacitor.getPlatform() === 'ios' ? TRGOVINA.ios : TRGOVINA.android}
          className="gumb-glavni inline-block px-4 py-2"
        >
          {t('aplikacija.posodobi.gumb')}
        </a>
      </div>
    </div>
  )
}
