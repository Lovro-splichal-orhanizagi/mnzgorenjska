import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { sestaviVabilo, vabiloMailto } from '../lib/vabilo'
import { supabase } from '../lib/supabase'
import IzbirnikLige from './IzbirnikLige'

interface Povezava {
  pot: string
  naslov: string
}

// Glavne povezave so tiste, ki jih manager odpre vsak teden. Vse ostalo je
// pod "Več": enajst enakovrednih povezav je pomenilo, da nobena ne izstopa.
// Grb vodi domov, zato "Domov" ne potrebuje svoje povezave.
const glavne: Povezava[] = [
  { pot: '/moja-ekipa', naslov: 'Moja ekipa' },
  { pot: '/igralci', naslov: 'Igralci' },
  { pot: '/lestvica', naslov: 'Lestvica' },
  { pot: '/rezultati', naslov: 'Rezultati' },
  { pot: '/mini-lige', naslov: 'Mini lige' },
]

const ostale: Povezava[] = [
  { pot: '/glasovanje', naslov: 'Asistence' },
  { pot: '/pozicije', naslov: 'Pozicije' },
  { pot: '/odsotnosti', naslov: 'Odsotnosti' },
  { pot: '/slovenija', naslov: 'Slovenija' },
]

// Vabilo sestavimo iz izbrane lige in njenih klubov (glej `lib/vabilo.ts`).

/** Zapre spustni meni ob kliku zunaj njega ali ob Escape. */
function useZapriZunaj(odprt: boolean, zapri: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!odprt) return
    const klik = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) zapri()
    }
    const tipka = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zapri()
    }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', tipka)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', tipka)
    }
  }, [odprt, zapri])
  return ref
}

export default function Navbar() {
  const { session } = useAuth()
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const [klubiLige, setKlubiLige] = useState<string[]>([])
  const [jeAdmin, setJeAdmin] = useState(false)
  const [ime, setIme] = useState<string | null>(null)
  const [odprt, setOdprt] = useState(false)
  const [vecOdprt, setVecOdprt] = useState(false)
  const [racunOdprt, setRacunOdprt] = useState(false)
  // Koliko golov tekoče sezone še čaka na asistenco — značka ob povezavi je
  // najzanesljivejši opomnik, da liga brez glasov ne deluje.
  const [cakaGlasov, setCakaGlasov] = useState(0)

  const vecRef = useZapriZunaj(vecOdprt, () => setVecOdprt(false))
  const racunRef = useZapriZunaj(racunOdprt, () => setRacunOdprt(false))

  // Klube beremo za vabilo; brez njih vabilo ostane smiselno, le brez seznama.
  useEffect(() => {
    if (!tekmovanjeId) return
    let veljavno = true
    supabase
      .from('competition_teams')
      .select('name')
      .eq('competition_id', tekmovanjeId)
      .then(({ data }) => {
        if (veljavno) setKlubiLige((data ?? []).map((k) => k.name as string))
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  const vabilo = vabiloMailto(sestaviVabilo(tekmovanje, klubiLige))

  useEffect(() => {
    if (!tekmovanjeId) return
    // Prikažemo le sveže odigrane tekme (zadnjih 21 dni), da lansko sezono
    // z ~700 nedokončanimi asistencami ne visimo večno v opozorilu.
    supabase
      .from('match_assist_status')
      .select('brez_asistence, played_on')
      .eq('competition_id', tekmovanjeId)
      .gte(
        'played_on',
        new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
      )
      .then(({ data }) => {
        setCakaGlasov(
          (data ?? []).reduce(
            (v: number, x: { brez_asistence?: number | null }) =>
              v + Number(x.brez_asistence ?? 0),
            0,
          ),
        )
      })
  }, [tekmovanjeId])

  useEffect(() => {
    if (!session) {
      setJeAdmin(false)
      setIme(null)
      return
    }
    supabase
      .from('profiles')
      .select('is_admin, display_name')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setJeAdmin(Boolean(data?.is_admin))
        setIme((data?.display_name as string | null) ?? null)
      })
  }, [session])

  const vec = jeAdmin ? [...ostale, { pot: '/admin', naslov: 'Admin' }] : ostale
  // Začetnica za avatar: iz vzdevka, sicer iz e-naslova.
  const zacetnica = (ime || session?.user.email || '?').trim().charAt(0).toUpperCase()

  const slog = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-gnl-300'
      : 'whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

  const znacka = (n: number) =>
    n > 0 && (
      <span className="ml-1.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
        {n}
      </span>
    )

  const vrsticaMenija =
    'block whitespace-nowrap rounded-lg px-3 py-2 text-left text-slate-300 hover:bg-white/5 hover:text-slate-100'

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-black">
            <img src="/logo/slff-grb.png" alt="" className="h-8 w-8" />
            <span className="naslov hidden sm:inline">SLFF</span>
          </NavLink>

          <IzbirnikLige />

          <div className="ml-auto hidden items-center gap-1 text-sm lg:flex">
            {glavne.map((p) => (
              <NavLink key={p.pot} to={p.pot} className={slog}>
                {p.naslov}
              </NavLink>
            ))}

            {/* "Več": vse, kar ni tedensko. Značka za asistence se prenese na
                gumb, da opomnik ne izgine v meniju. */}
            <div ref={vecRef} className="relative">
              <button
                type="button"
                onClick={() => setVecOdprt(!vecOdprt)}
                aria-haspopup="menu"
                aria-expanded={vecOdprt}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${
                  vecOdprt ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                Več
                {znacka(cakaGlasov)}
                <span aria-hidden="true" className="ml-1 text-[10px]">
                  ▾
                </span>
              </button>
              {vecOdprt && (
                <div
                  role="menu"
                  className="animiraj-vstop absolute right-0 mt-2 min-w-[11rem] rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-xl shadow-black/40"
                >
                  {vec.map((p) => (
                    <NavLink
                      key={p.pot}
                      to={p.pot}
                      role="menuitem"
                      className={({ isActive }) =>
                        `${vrsticaMenija} ${isActive ? 'font-semibold text-gnl-300' : ''}`
                      }
                      onClick={() => setVecOdprt(false)}
                    >
                      {p.naslov}
                      {p.pot === '/glasovanje' && znacka(cakaGlasov)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto text-sm lg:ml-1">
            {session ? (
              <div ref={racunRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRacunOdprt(!racunOdprt)}
                  aria-haspopup="menu"
                  aria-expanded={racunOdprt}
                  aria-label="Račun"
                  title={ime ?? session.user.email ?? 'Račun'}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gnl-500/20 font-black text-gnl-200 ring-1 ring-gnl-400/40 hover:bg-gnl-500/30"
                >
                  {zacetnica}
                </button>
                {racunOdprt && (
                  <div
                    role="menu"
                    className="animiraj-vstop absolute right-0 mt-2 min-w-[13rem] rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-xl shadow-black/40"
                  >
                    <div className="truncate px-3 py-2 text-xs text-slate-500">
                      {ime ?? session.user.email}
                    </div>
                    <a
                      href={vabilo}
                      role="menuitem"
                      className={vrsticaMenija}
                      onClick={() => setRacunOdprt(false)}
                    >
                      Povabi prijatelja
                    </a>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => supabase.auth.signOut()}
                      className={`w-full ${vrsticaMenija}`}
                    >
                      Odjava
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/prijava" className="gumb-glavni whitespace-nowrap text-sm">
                Prijava
              </NavLink>
            )}
          </div>

          <button
            onClick={() => setOdprt(!odprt)}
            aria-label="Meni"
            aria-expanded={odprt}
            className="flex h-11 w-11 items-center justify-center rounded-xl border
                       border-white/15 bg-white/5 text-2xl leading-none text-slate-200
                       active:scale-95 lg:hidden"
          >
            ☰
          </button>
        </div>

        {odprt && (
          <div className="animiraj-vstop mt-3 border-t border-white/10 pt-3 text-base lg:hidden">
            <div className="grid grid-cols-2 gap-1.5">
              {glavne.map((p) => (
                <NavLink key={p.pot} to={p.pot} className={slog} onClick={() => setOdprt(false)}>
                  {p.naslov}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/5 pt-3 text-sm">
              {vec.map((p) => (
                <NavLink key={p.pot} to={p.pot} className={slog} onClick={() => setOdprt(false)}>
                  {p.naslov}
                  {p.pot === '/glasovanje' && znacka(cakaGlasov)}
                </NavLink>
              ))}
              <a
                href={vabilo}
                className="col-span-2 rounded-lg px-3 py-1.5 text-center text-slate-400 hover:bg-white/5"
                onClick={() => setOdprt(false)}
              >
                Povabi prijatelja
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
