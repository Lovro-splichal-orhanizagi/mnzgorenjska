import { useEffect, useState } from 'react'
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

const povezave: Povezava[] = [
  { pot: '/', naslov: 'Domov' },
  { pot: '/moja-ekipa', naslov: 'Moja ekipa' },
  { pot: '/glasovanje', naslov: 'Asistence' },
  { pot: '/pozicije', naslov: 'Pozicije' },
  { pot: '/odsotnosti', naslov: 'Odsotnosti' },
  { pot: '/igralci', naslov: 'Igralci' },
  { pot: '/rezultati', naslov: 'Rezultati' },
  { pot: '/lestvica', naslov: 'Lestvica' },
]

// Vabilo sestavimo iz izbrane lige in njenih klubov (glej `lib/vabilo.ts`).

export default function Navbar() {
  const { session } = useAuth()
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const [klubiLige, setKlubiLige] = useState<string[]>([])
  const [jeAdmin, setJeAdmin] = useState(false)
  const [odprt, setOdprt] = useState(false)
  // Koliko golov tekoče sezone še čaka na asistenco — značka ob povezavi je
  // najzanesljivejši opomnik, da liga brez glasov ne deluje.
  const [cakaGlasov, setCakaGlasov] = useState(0)

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
      return
    }
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setJeAdmin(Boolean(data?.is_admin)))
  }, [session])

  const vse = jeAdmin
    ? [...povezave, { pot: '/admin', naslov: 'Admin' }]
    : povezave

  const slog = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-gnl-300'
      : 'rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-black">
            <img src="/logo/slff-grb.png" alt="" className="h-8 w-8" />
            <span className="naslov hidden sm:inline">SLFF</span>
          </NavLink>

          <IzbirnikLige />

          <div className="ml-auto hidden items-center gap-1.5 text-sm lg:flex">
            {vse.map((p) => (
              <NavLink key={p.pot} to={p.pot} className={slog} end={p.pot === '/'}>
                {p.naslov}
                {p.pot === '/glasovanje' && cakaGlasov > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                    {cakaGlasov}
                  </span>
                )}
              </NavLink>
            ))}
            {/* Povabi prijatelja — mailto link odpre lokalni mail klient.
                Na ozjih desktopih (lg 1024–1279) samo ikona, da menija ne
                stisne; polni napis se vrne na xl. */}
            <a
              href={vabilo}
              title="Povabi prijatelja"
              aria-label="Povabi prijatelja"
              className="rounded-lg bg-fuchsia-500/15 px-3 py-1.5 font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/30 hover:bg-fuchsia-500/25"
            >
              <span aria-hidden="true">✉️</span>
              <span className="ml-1 hidden xl:inline">Povabi</span>
            </a>
          </div>

          <div className="ml-auto text-sm lg:ml-2">
            {session ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-xl px-3 py-2.5 text-slate-400 hover:text-slate-100"
              >
                Odjava
              </button>
            ) : (
              <NavLink to="/prijava" className="gumb-glavni text-sm">
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
          <div className="animiraj-vstop mt-3 grid grid-cols-2 gap-1.5 border-t border-white/10 pt-3 text-base lg:hidden">
            {vse.map((p) => (
              <NavLink
                key={p.pot}
                to={p.pot}
                className={slog}
                end={p.pot === '/'}
                onClick={() => setOdprt(false)}
              >
                {p.naslov}
                {p.pot === '/glasovanje' && cakaGlasov > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                    {cakaGlasov}
                  </span>
                )}
              </NavLink>
            ))}
            <a
              href={vabilo}
              className="col-span-2 rounded-lg bg-fuchsia-500/15 px-3 py-1.5 text-center font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/30"
              onClick={() => setOdprt(false)}
            >
              ✉️ Povabi prijatelja
            </a>
          </div>
        )}
      </nav>
    </header>
  )
}
