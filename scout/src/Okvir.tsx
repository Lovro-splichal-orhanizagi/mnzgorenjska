import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { supabase } from './baza'
import { izberiJezik, jezik, t } from './besede'
import { useSeja } from './seja'

const povezava = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'}`

export function Okvir({ children }: { children: ReactNode }) {
  const { seja, klub } = useSeja()
  const dostop = Boolean(klub?.sedez && klub.narocnina?.velja)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">{t('app.ime')}</Link>
          {klub && <span className="text-sm text-slate-500">{klub.klub}</span>}
          <nav className="ml-auto flex flex-wrap gap-1 text-sm">
            {dostop && (
              <>
                <NavLink to="/" end className={povezava}>{t('nav.iskanje')}</NavLink>
                <NavLink to="/gaps" className={povezava}>{t('nav.vrzeli')}</NavLink>
                <NavLink to="/watchlist" className={povezava}>{t('nav.seznam')}</NavLink>
              </>
            )}
            {seja && <NavLink to="/account" className={povezava}>{t('nav.racun')}</NavLink>}
            {seja && (
              <button type="button" onClick={() => void supabase.auth.signOut()} className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200">
                {t('nav.odjava')}
              </button>
            )}
            <button type="button" onClick={() => izberiJezik(jezik === 'sl' ? 'en' : 'sl')} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200">
              {jezik === 'sl' ? 'EN' : 'SL'}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 text-sm text-slate-500">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-4">
          <Link to="/terms" className="hover:underline">{t('noga.pogoji')}</Link>
          <a href="https://slff.eu" className="hover:underline">{t('noga.vir')}</a>
        </div>
      </footer>
    </div>
  )
}
