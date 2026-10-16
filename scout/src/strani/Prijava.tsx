import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../baza'
import { t } from '../besede'
import { useSeja } from '../seja'

// Brez registracije in ponastavitve gesla: obe sta na slff.eu (tam tudi
// nastane klubski račun ob prvi prijavi z uradnim naslovom).
export function Prijava() {
  const { seja } = useSeja()
  const [eposta, setEposta] = useState('')
  const [geslo, setGeslo] = useState('')
  const [neuspeh, setNeuspeh] = useState(false)
  const [poteka, setPoteka] = useState(false)
  if (seja) return <Navigate to="/account" replace />

  async function prijava(e: FormEvent) {
    e.preventDefault()
    setPoteka(true)
    const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: geslo })
    setNeuspeh(Boolean(error))
    setPoteka(false)
  }

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t('prijava.naslov')}</h1>
      <p className="text-sm text-slate-600">{t('prijava.uvod')}</p>
      <form onSubmit={(e) => void prijava(e)} className="space-y-3">
        <label className="block text-sm">
          {t('prijava.eposta')}
          <input type="email" required autoComplete="email" value={eposta} onChange={(e) => setEposta(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          {t('prijava.geslo')}
          <input type="password" required autoComplete="current-password" value={geslo} onChange={(e) => setGeslo(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
        </label>
        {neuspeh && <p className="text-sm text-red-700">{t('prijava.napaka')}</p>}
        <button disabled={poteka} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{t('prijava.gumb')}</button>
      </form>
      <button
        type="button"
        onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/account` } })}
        className="w-full rounded border border-slate-300 px-4 py-2"
      >
        {t('prijava.google')}
      </button>
      <p className="text-sm text-slate-600">
        {t('prijava.brezRacuna')} <a href="https://slff.eu/login" className="underline">{t('prijava.slff')}</a>
      </p>
    </div>
  )
}
