import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import grb from '../../public/logo/slff-grb.png'
import { supabase } from './baza'
import { izberiJezik, jezik, t } from './besede'
import { useSeja } from './seja'

// Glava in noga kot na slff.eu (src/components/Navbar.tsx, App.tsx).
const povezava = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-gnl-300'
    : 'whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

const tiho = 'whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

export function Okvir({ children }: { children: ReactNode }) {
  const { seja, klub } = useSeja()
  const dostop = Boolean(klub?.sedez && klub.narocnina?.velja)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <Link to="/" aria-label={t('app.ime')} className="flex shrink-0 items-center gap-2 font-black">
            <img src={grb} alt="" className="h-8 w-8" />
            <span className="naslov">SLFF</span>
            <span className="znacka bg-gnl-400/15 text-gnl-300 ring-1 ring-gnl-400/30">Scout</span>
          </Link>
          {klub && <span className="hidden truncate text-sm text-slate-400 sm:inline">{klub.klub}</span>}
          {seja && (
            <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:mx-0 sm:ml-auto sm:w-auto">
              {dostop && (
                <>
                  <NavLink to="/" end className={povezava}>{t('nav.iskanje')}</NavLink>
                  <NavLink to="/gaps" className={povezava}>{t('nav.vrzeli')}</NavLink>
                  <NavLink to="/watchlist" className={povezava}>{t('nav.seznam')}</NavLink>
                </>
              )}
              <NavLink to="/account" className={povezava}>{t('nav.racun')}</NavLink>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-1 text-sm sm:ml-0">
            {seja && (
              <button type="button" onClick={() => void supabase.auth.signOut({ scope: 'local' })} className={tiho}>
                {t('nav.odjava')}
              </button>
            )}
            <button type="button" onClick={() => izberiJezik(jezik === 'sl' ? 'en' : 'sl')} className={`${tiho} font-semibold`}>
              {jezik === 'sl' ? 'EN' : 'SL'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8">{children}</main>
      <footer className="border-t border-white/10 py-6 text-xs text-slate-400">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-4 gap-y-2 px-4">
          <Link to="/terms" className="hover:text-slate-200">{t('noga.pogoji')}</Link>
          <a href="https://slff.eu" className="hover:text-slate-200">{t('noga.vir')}</a>
        </div>
      </footer>
    </div>
  )
}
