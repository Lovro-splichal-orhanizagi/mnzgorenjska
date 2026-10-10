// Izbris računa. Trgovini (App Store, Google Play) zahtevata, da ga uporabnik
// najde in izvede sam; Google Play ta naslov (slff.eu/account) navede tudi v
// opisu aplikacije. Brisanje opravi `izbrisi_moj_racun` v bazi.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { t, tx } from '../i18n'

export default function Racun() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [potrjujem, setPotrjujem] = useState(false)
  const [brisem, setBrisem] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  useNaslov(t('racun.izbris.naslov'))

  async function izbrisi() {
    setBrisem(true)
    setNapaka(null)
    const { error } = await supabase.rpc('izbrisi_moj_racun')
    if (error) {
      setBrisem(false)
      return setNapaka(t('racun.izbris.napaka', { napaka: error.message }))
    }
    // Uporabnika ni več; lokalno sejo počistimo brez klica strežnika.
    await supabase.auth.signOut({ scope: 'local' })
    navigate('/', { replace: true })
  }

  if (loading) return <p className="text-slate-400">{t('racun.opomniki.nalagam')}</p>

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-3xl font-black naslov">{t('racun.izbris.naslov')}</h1>
      {session && (
        <Link to="/reminders" className="kartica flex min-h-[44px] items-center justify-between p-4 font-semibold">
          {t('racun.opomniki.povezava')}
          <span aria-hidden="true">→</span>
        </Link>
      )}
      {!session ? (
        <p className="text-slate-300">
          {tx('racun.izbris.moraPrijava', {}, {
            prijava: (v) => (
              <Link to={povezavaNaPrijavo('/account')} className="text-gnl-300 underline">
                {v}
              </Link>
            ),
          })}
        </p>
      ) : (
        <div className="kartica space-y-3 p-4">
          <p className="text-sm text-slate-300">{t('racun.izbris.opis', { email: session.user.email ?? '' })}</p>
          {!potrjujem ? (
            <button type="button" onClick={() => setPotrjujem(true)} className="gumb-tih px-3 py-2 text-sm text-rose-300">
              {t('racun.izbris.gumb')}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={izbrisi}
                disabled={brisem}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {brisem ? t('racun.izbris.brisem') : t('racun.izbris.potrdi')}
              </button>
              <button type="button" onClick={() => setPotrjujem(false)} disabled={brisem} className="gumb-tih px-3 py-2 text-sm">
                {t('racun.izbris.preklici')}
              </button>
            </div>
          )}
          {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        </div>
      )}
    </div>
  )
}
