// Stran povabila prijatelja: slff.eu/i/<koda> (migracija 20261114200000).
//
// Prijatelj vidi, kdo ga vabi, in z enim gumbom pride do registracije. Kodo
// si zapomnimo takoj (localStorage), ker se registracija večinoma konča
// drugje (potrditev e-pošte, Google); `BeleziPovabilo` jo zabeleži po prijavi.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { shraniKodoPovabila } from '../lib/povabilo'
import { t } from '../i18n'

interface Vabitelj {
  ime: string | null
  avatar_barva: number | null
  avatar_ikona: string | null
}

export default function VabiloPrijatelja() {
  const { koda: surova } = useParams()
  const koda = (surova ?? '').trim().toLowerCase()
  const { session } = useAuth()
  const [vabitelj, setVabitelj] = useState<Vabitelj | null | undefined>(undefined)
  useNaslov(vabitelj?.ime ? t('racun.vabilo.naslovZImenom', { ime: vabitelj.ime }) : t('racun.vabilo.naslov'))

  useEffect(() => {
    // Samo nov račun: obstoječemu prijavljenemu povabilo ne velja.
    if (!session) shraniKodoPovabila(koda)
    let zivo = true
    void supabase.rpc('vabilo_od', { p_koda: koda }).then(({ data }) => {
      if (zivo) setVabitelj((data as Vabitelj | null) ?? null)
    })
    return () => {
      zivo = false
    }
  }, [koda, session])

  const registracija = '/login?nacin=registracija&nazaj=' + encodeURIComponent('/my-team')

  return (
    <div className="mx-auto max-w-md space-y-6 py-4 text-center">
      {vabitelj ? (
        <div className="flex flex-col items-center gap-3">
          <Avatar ime={vabitelj.ime} barva={vabitelj.avatar_barva} ikona={vabitelj.avatar_ikona} velikost={72} />
          <h1 className="text-3xl font-black naslov">{t('racun.vabilo.naslovZImenom', { ime: vabitelj.ime ?? '' })}</h1>
        </div>
      ) : (
        <h1 className="text-3xl font-black naslov">{t('racun.vabilo.naslov')}</h1>
      )}
      <p className="text-slate-300">{t('racun.vabilo.opis')}</p>

      <ul className="kartica space-y-2 p-4 text-left text-sm text-slate-200">
        <li>⚽ {t('racun.vabilo.tocka1')}</li>
        <li>💶 {t('racun.vabilo.tocka2')}</li>
        <li>🏆 {t('racun.vabilo.tocka3')}</li>
      </ul>

      {session ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t('racun.vabilo.zePrijavljen')}</p>
          <Link to="/my-team" className="gumb-glavni inline-block">
            {t('racun.vabilo.mojaEkipa')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <Link to={registracija} className="gumb-glavni block w-full py-3 text-base">
            {t('racun.vabilo.registracija')}
          </Link>
          <Link to={'/login?nazaj=' + encodeURIComponent('/my-team')} className="block text-sm text-slate-400 hover:text-slate-200">
            {t('racun.vabilo.prijava')}
          </Link>
          {vabitelj === null && <p className="text-xs text-slate-500">{t('racun.vabilo.neznanaKoda')}</p>}
        </div>
      )}
    </div>
  )
}
