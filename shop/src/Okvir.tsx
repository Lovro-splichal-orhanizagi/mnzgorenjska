import { useEffect, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import grb from '../../public/logo/slff-grb.png'
import { supabase } from './baza'
import { izberiJezik, jezik, t, TELEFON, TELEFON_POVEZAVA } from './besede'
import { kosov, useKosarica } from './kosarica'
import { useSeja } from './seja'

/** Naslov zavihka (in opis za iskalnike) strani; ob odhodu se vrne privzeti. */
export function useNaslov(naslov: string | null, opis?: string) {
  useEffect(() => {
    if (!naslov) return
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prej = { naslov: document.title, opis: meta?.content }
    document.title = `${naslov} · ${t('app.ime')}`
    if (meta && opis) meta.content = opis
    return () => {
      document.title = prej.naslov
      if (meta && prej.opis !== undefined) meta.content = prej.opis
    }
  }, [naslov, opis])
}

// Glava in noga kot na slff.eu in v Scoutu.
const povezava = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-gnl-300'
    : 'whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

const tiho = 'whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

export function Okvir({ children }: { children: ReactNode }) {
  const { seja } = useSeja()
  const n = kosov(useKosarica())
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-x-2 px-4 py-3">
          <Link to="/" aria-label={t('app.ime')} className="flex shrink-0 items-center gap-2 font-black">
            <img src={grb} alt="" className="h-8 w-8" />
            <span className="naslov">SLFF</span>
            <span className="znacka bg-gnl-400/15 text-gnl-300 ring-1 ring-gnl-400/30">{t('app.znacka')}</span>
          </Link>
          <span className="flex-1" />
          <nav className="hidden gap-1 text-sm sm:flex">
            <NavLink to="/" end className={povezava}>{t('nav.trgovina')}</NavLink>
            <NavLink to="/personalised" className={povezava}>{t('nav.poMeri')}</NavLink>
            {seja && <NavLink to="/orders" className={povezava}>{t('nav.narocila')}</NavLink>}
          </nav>
          <div className="flex items-center gap-1 text-sm">
            {seja ? (
              <button type="button" onClick={() => void supabase.auth.signOut({ scope: 'local' })} className={`${tiho} hidden sm:block`}>
                {t('nav.odjava')}
              </button>
            ) : (
              <NavLink to="/login" className={povezava}>{t('nav.prijava')}</NavLink>
            )}
            <button type="button" onClick={() => izberiJezik(jezik === 'sl' ? 'en' : 'sl')} className={`${tiho} font-semibold`}
              lang={jezik === 'sl' ? 'en' : 'sl'} aria-label={jezik === 'sl' ? 'English' : 'Slovenščina'}>
              {jezik === 'sl' ? 'EN' : 'SL'}
            </button>
            <Link to="/cart" aria-label={t('nav.kosarica', { n })} className="relative rounded-lg p-2 text-slate-200 hover:bg-white/5">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l-1 13H7L6 7Z" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              {n > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gnl-400 px-1 text-[11px] font-black text-slate-950">
                  {n}
                </span>
              )}
            </Link>
          </div>
        </div>
        {seja && (
          <nav className="mx-auto flex max-w-6xl gap-1 px-3 pb-2 text-sm sm:hidden">
            <NavLink to="/" end className={povezava}>{t('nav.trgovina')}</NavLink>
            <NavLink to="/personalised" className={povezava}>{t('nav.poMeri')}</NavLink>
            <NavLink to="/orders" className={povezava}>{t('nav.narocila')}</NavLink>
            <span className="flex-1" />
            <button type="button" onClick={() => void supabase.auth.signOut({ scope: 'local' })} className={tiho}>
              {t('nav.odjava')}
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8">{children}</main>
      <footer className="border-t border-white/10 py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-6xl space-y-3 px-4 text-center">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link to="/terms" className="hover:text-slate-200">{t('noga.pogoji')}</Link>
            <Link to="/withdrawal" className="hover:text-slate-200">{t('noga.odstop')}</Link>
            <a href="https://slff.eu/legal#trgovina" className="hover:text-slate-200">{t('noga.zasebnost')}</a>
            <a href="https://slff.eu" className="hover:text-slate-200">{t('noga.slff')}</a>
          </div>
          <p className="text-slate-500">
            {t('noga.prodajalec')} <a href={TELEFON_POVEZAVA} className="hover:text-slate-200">{TELEFON}</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
