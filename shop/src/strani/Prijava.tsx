import { useState, type FormEvent } from 'react'
import grb from '../../../public/logo/slff-grb.png'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../baza'
import { t } from '../besede'
import { useSeja } from '../seja'

/** ?next= le kot pot na tem izvoru ("/admin"), nikoli "//drug.si" ali polni naslov. */
export function varnaPot(p: string | null): string | null {
  if (!p?.startsWith('/')) return null
  try {
    const u = new URL(p, 'https://shop.invalid')
    return u.origin === 'https://shop.invalid' ? u.pathname + u.search + u.hash : null
  } catch {
    return null
  }
}

// Brez registracije in ponastavitve gesla: obe sta na slff.eu.
export function Prijava() {
  const { seja } = useSeja()
  const cilj = varnaPot(useSearchParams()[0].get('next')) ?? '/orders'
  const [eposta, setEposta] = useState('')
  const [geslo, setGeslo] = useState('')
  const [neuspeh, setNeuspeh] = useState(false)
  const [poteka, setPoteka] = useState(false)
  if (seja) return <Navigate to={cilj} replace />

  async function prijava(e: FormEvent) {
    e.preventDefault()
    setPoteka(true)
    const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: geslo })
    setNeuspeh(Boolean(error))
    setPoteka(false)
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <img src={grb} alt="" className="mx-auto h-16 w-16" />
        <h1 className="text-3xl font-black naslov">{t('prijava.naslov')}</h1>
        <p className="text-sm leading-relaxed text-slate-400">{t('prijava.uvod')}</p>
      </div>
      <div className="kartica space-y-4 p-5">
        <button
          type="button"
          onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}${cilj}` } })}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-2.5 font-semibold text-slate-900 hover:bg-slate-100"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
            <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {t('prijava.google')}
        </button>
        <div className="h-px bg-white/10" />
        <form onSubmit={(e) => void prijava(e)} className="space-y-3">
          <label className="block text-sm text-slate-400">
            {t('prijava.eposta')}
            <input type="email" required autoComplete="email" value={eposta} onChange={(e) => setEposta(e.target.value)} className="polje mt-1 w-full" />
          </label>
          <label className="block text-sm text-slate-400">
            {t('prijava.geslo')}
            <input type="password" required autoComplete="current-password" value={geslo} onChange={(e) => setGeslo(e.target.value)} className="polje mt-1 w-full" />
          </label>
          <div aria-live="polite">{neuspeh && <p className="opozorilo">{t('prijava.napaka')}</p>}</div>
          <button disabled={poteka} className="gumb-glavni w-full">{t('prijava.gumb')}</button>
        </form>
      </div>
      <p className="text-center text-sm text-slate-400">
        {t('prijava.brezRacuna')} <a href="https://slff.eu/login" className="povezava">{t('prijava.slff')}</a>
      </p>
    </div>
  )
}
