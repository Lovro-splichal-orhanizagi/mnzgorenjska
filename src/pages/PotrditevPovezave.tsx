// Povezava iz e-pošte (potrditev registracije, ponastavitev gesla):
// slff.eu/auth/confirm?token_hash=…&type=…  Predloge v supabase/templates/
// vodijo sem naravnost, ne prek supabase.co: le tako telefon povezavo odpre
// v aplikaciji (Universal/App Links ne sledijo preusmeritvi).
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useNaslov } from '../lib/naslov'
import { t, tx } from '../i18n'

const VRSTE: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

export default function PotrditevPovezave() {
  const [iskanje] = useSearchParams()
  const navigate = useNavigate()
  const [napaka, setNapaka] = useState(false)
  useNaslov(t('racun.potrditev.naslov'))

  useEffect(() => {
    const token_hash = iskanje.get('token_hash')
    const type = VRSTE.find((v) => v === iskanje.get('type'))
    if (!token_hash || !type) return setNapaka(true)
    supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) return setNapaka(true)
      navigate(type === 'recovery' ? '/novo-geslo' : '/my-team', { replace: true })
    })
  }, [iskanje, navigate])

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-3xl font-black naslov">{t('racun.potrditev.naslov')}</h1>
      {napaka ? (
        <p className="kartica p-4 text-sm text-slate-300">
          {tx('racun.potrditev.neveljavna', {}, {
            prijava: (v) => (
              <Link to="/login" className="text-gnl-300 underline hover:text-gnl-200">
                {v}
              </Link>
            ),
          })}
        </p>
      ) : (
        <p className="animiraj-utrip text-slate-400">{t('racun.potrditev.preverjam')}</p>
      )}
    </div>
  )
}
