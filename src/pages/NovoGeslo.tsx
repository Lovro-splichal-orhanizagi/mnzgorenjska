import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useNaslov } from '../lib/naslov'
import { napakaPrijave } from '../lib/prijava'
import { t, tx } from '../i18n'

// Sem pride uporabnik s povezave iz e-pošte. Supabase ob odprtju povezave
// ustvari začasno sejo, zato je dovolj, da nastavimo novo geslo.
export default function NovoGeslo() {
  const navigate = useNavigate()
  const [geslo, setGeslo] = useState('')
  const [ponovi, setPonovi] = useState('')
  // null = seja se še preverja; do takrat ne trdimo, da povezava ni veljavna.
  const [pripravljen, setPripravljen] = useState<boolean | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [posiljam, setPosiljam] = useState(false)
  // E-pošta seje: skrito polje, da upravitelj gesel novo geslo shrani k pravemu računu.
  const [email, setEmail] = useState('')
  useNaslov(t('racun.novoGeslo.naslov'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // Dogodek iz povezave je lahko prišel prej — takrat ne povozimo `true`.
      setPripravljen((prej) => prej || Boolean(data.session))
      if (data.session?.user.email) setEmail(data.session.user.email)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => {
      if (s) setPripravljen(true)
      if (s?.user.email) setEmail(s.user.email)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function poslji(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNapaka(null)
    if (geslo !== ponovi) return setNapaka(t('racun.novoGeslo.gesliSeNeUjemata'))
    setPosiljam(true)
    const { error } = await supabase.auth.updateUser({ password: geslo })
    setPosiljam(false)
    if (error) return setNapaka(napakaPrijave(error.message))
    navigate('/my-team')
  }

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-3xl font-black naslov">{t('racun.novoGeslo.naslov')}</h1>

      {pripravljen === null ? (
        <p className="animiraj-utrip text-slate-400">{t('racun.novoGeslo.preverjam')}</p>
      ) : !pripravljen ? (
        <p className="kartica p-4 text-sm text-slate-300">
          {tx('racun.novoGeslo.neveljavna', {}, {
            prijava: (v) => (
              <Link to="/login" className="text-gnl-300 underline hover:text-gnl-200">
                {v}
              </Link>
            ),
          })}
        </p>
      ) : (
        <form onSubmit={poslji} className="space-y-3">
          {email && (
            <input type="email" autoComplete="username" value={email} readOnly hidden />
          )}
          <label className="block text-sm text-slate-400">
            {t('racun.novoGeslo.novoGeslo')}
            <input
              type="password"
              required
              minLength={6}
              value={geslo}
              onChange={(e) => setGeslo(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-400">
            {t('racun.novoGeslo.ponovi')}
            <input
              type="password"
              required
              minLength={6}
              value={ponovi}
              onChange={(e) => setPonovi(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <button type="submit" disabled={posiljam} className="gumb-glavni w-full">
            {posiljam ? t('racun.novoGeslo.shranjujem') : t('racun.novoGeslo.shrani')}
          </button>
          {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        </form>
      )}
    </div>
  )
}
