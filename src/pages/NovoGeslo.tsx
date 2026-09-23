import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useNaslov } from '../lib/naslov'
import { napakaPrijave } from '../lib/prijava'

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
  useNaslov('Novo geslo')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // Dogodek iz povezave je lahko prišel prej — takrat ne povozimo `true`.
      setPripravljen((prej) => prej || Boolean(data.session))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => {
      if (s) setPripravljen(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function poslji(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNapaka(null)
    if (geslo !== ponovi) return setNapaka('Gesli se ne ujemata.')
    setPosiljam(true)
    const { error } = await supabase.auth.updateUser({ password: geslo })
    setPosiljam(false)
    if (error) return setNapaka(napakaPrijave(error.message))
    navigate('/moja-ekipa')
  }

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-3xl font-black naslov">Novo geslo</h1>

      {pripravljen === null ? (
        <p className="animiraj-utrip text-slate-400">Preverjam povezavo …</p>
      ) : !pripravljen ? (
        <p className="kartica p-4 text-sm text-slate-300">
          Povezava ni veljavna ali je potekla. Na strani za{' '}
          <Link to="/prijava" className="text-gnl-300 underline hover:text-gnl-200">
            prijavo
          </Link>{' '}
          znova zahtevaj ponastavitev gesla.
        </p>
      ) : (
        <form onSubmit={poslji} className="space-y-3">
          <label className="block text-sm text-slate-400">
            Novo geslo
            <input
              type="password"
              required
              minLength={6}
              value={geslo}
              onChange={(e) => setGeslo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-400">
            Ponovi geslo
            <input
              type="password"
              required
              minLength={6}
              value={ponovi}
              onChange={(e) => setPonovi(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <button type="submit" disabled={posiljam} className="gumb-glavni w-full">
            {posiljam ? 'Shranjujem …' : 'Shrani geslo'}
          </button>
          {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        </form>
      )}
    </div>
  )
}
