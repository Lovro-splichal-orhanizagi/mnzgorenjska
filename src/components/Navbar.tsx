import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import { useLocation } from 'react-router-dom'
import { NavLink } from './Povezava'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { sestaviVabilo, vabiloMailto } from '../lib/vabilo'
import { supabase } from '../lib/supabase'
import { potrdiZapustitev } from '../lib/neshranjeno'
import { jeNativno, povezavaTrgovine } from '../lib/platforma'
import IzbirnikLige from './IzbirnikLige'
import { odpriPodporo } from './Podpora'
import { t } from '../i18n'

interface Povezava {
  pot: string
  naslov: string
  /** Na računalniku v vrstici šele od xl, prej v "Več" (prostor ob izbirniku lige). */
  odXl?: boolean
}

// Glavne povezave so tiste, ki jih manager odpre vsak teden. Vse ostalo je
// pod "Več": enajst enakovrednih povezav je pomenilo, da nobena ne izstopa.
// Grb vodi domov, zato "Domov" ne potrebuje svoje povezave.
/** Države, kjer zapisnik pozicij ne pozna in jih določi glasovanje (stran Pozicije v meniju). */
const DRZAVE_Z_GLASOVANJEM = ['SI', 'HR', 'CZ', 'HU', 'AT', 'RS', 'RO', 'EE', 'PL', 'ES', 'LV', 'MK', 'GR', 'TR', 'UA', 'AM', 'AZ', 'DK', 'GB', 'MT', 'ME', 'BA', 'MD']

const glavne: Povezava[] = [
  { pot: '/my-team', get naslov() { return t('aplikacija.meni.mojaEkipa') } },
  { pot: '/players', get naslov() { return t('aplikacija.meni.igralci') } },
  { pot: '/standings', get naslov() { return t('aplikacija.meni.lestvica') } },
  { pot: '/results', get naslov() { return t('aplikacija.meni.rezultati') } },
  { pot: '/mini-leagues', get naslov() { return t('aplikacija.meni.miniLige') } },
  { pot: '/predictions', get naslov() { return t('aplikacija.meni.napovedi') }, odXl: true },
]

const ostale: Povezava[] = [
  // Prava lestvica lige (ne fantasy) — iščejo jo iskalniki, tedensko je ne odpira vsak.
  { pot: '/table', get naslov() { return t('aplikacija.meni.tabela') } },
  { pot: '/assists', get naslov() { return t('aplikacija.meni.asistence') } },
  { pot: '/positions', get naslov() { return t('aplikacija.meni.pozicije') } },
  { pot: '/absences', get naslov() { return t('aplikacija.meni.odsotnosti') } },
  { pot: '/national', get naslov() { return t('aplikacija.meni.slovenija') } },
]

// Vabilo sestavimo iz izbrane lige in njenih klubov (glej `lib/vabilo.ts`).

/** Zapre spustni meni ob kliku zunaj njega ali ob Escape. */
function useZapriZunaj(odprt: boolean, zapri: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!odprt) return
    const klik = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) zapri()
    }
    const tipka = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zapri()
    }
    document.addEventListener('pointerdown', klik)
    document.addEventListener('keydown', tipka)
    return () => {
      document.removeEventListener('pointerdown', klik)
      document.removeEventListener('keydown', tipka)
    }
  }, [odprt, zapri])
  return ref
}

export default function Navbar() {
  const { session } = useAuth()
  const { id: tekmovanjeId, tekmovanje, drzava } = useTekmovanje()
  const [klubiLige, setKlubiLige] = useState<string[]>([])
  const [jeAdmin, setJeAdmin] = useState(false)
  const [ime, setIme] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<{ barva: number | null; ikona: string | null }>({ barva: null, ikona: null })
  const [odprt, setOdprt] = useState(false)
  const [vecOdprt, setVecOdprt] = useState(false)
  const [racunOdprt, setRacunOdprt] = useState(false)
  // Koliko golov tekoče sezone še čaka na asistenco — značka ob povezavi je
  // najzanesljivejši opomnik, da liga brez glasov ne deluje.
  const [cakaGlasov, setCakaGlasov] = useState(0)

  const vecRef = useZapriZunaj(vecOdprt, () => setVecOdprt(false))
  const racunRef = useZapriZunaj(racunOdprt, () => setRacunOdprt(false))

  // Mobilni meni se zapre ob vsaki navigaciji — tudi ob gumbu nazaj ali
  // povezavi zunaj menija, ne le ob kliku nanj.
  const { pathname } = useLocation()
  useEffect(() => {
    setOdprt(false)
    setVecOdprt(false)
    setRacunOdprt(false)
  }, [pathname])

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
    let veljavno = true
    // Samo tekme, o katerih se je še mogoče izreči: glasovanje se zapre z
    // naslednjim krogom. Prej je značka štela vse od začetka časa in je
    // kazala številko, ki je ni bilo mogoče spraviti na nič.
    supabase
      .from('match_assist_status')
      .select('brez_asistence')
      .eq('competition_id', tekmovanjeId)
      .eq('glasovanje_odprto', true)
      .then(({ data }) => {
        // Odgovor za ligo, ki je medtem ni več v meniju, ne sme prepisati značke.
        if (!veljavno) return
        setCakaGlasov(
          (data ?? []).reduce(
            (v: number, x: { brez_asistence?: number | null }) =>
              v + Number(x.brez_asistence ?? 0),
            0,
          ),
        )
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  const uporabnikId = session?.user.id
  useEffect(() => {
    if (!uporabnikId) {
      setJeAdmin(false)
      setIme(null)
      return
    }
    let veljavno = true
    supabase
      .from('profiles')
      .select('is_admin, display_name, avatar_barva, avatar_ikona')
      .eq('id', uporabnikId)
      .maybeSingle()
      .then(({ data }) => {
        if (!veljavno) return
        setJeAdmin(Boolean(data?.is_admin))
        setIme((data?.display_name as string | null) ?? null)
        setAvatar({ barva: data?.avatar_barva ?? null, ikona: data?.avatar_ikona ?? null })
      })
    return () => {
      veljavno = false
    }
  }, [uporabnikId])

  // Glasovanje o pozicijah je nadomestek za zapisnik, ki pozicij ne pozna
  // (vse države razen Slovaške). Slovaški zapisnik jih ima, zato stran tam nima kaj početi.
  const zaDrzavo = drzava && DRZAVE_Z_GLASOVANJEM.includes(drzava) ? ostale : ostale.filter((p) => p.pot !== '/positions')
  // Administracija je samo na spletu, mobilna aplikacija je za igralce.
  // Pivski zid je le na spletu (kot gumb "Časti pivo", glej Pivo.tsx).
  const zSpletom = jeNativno() ? zaDrzavo : [...zaDrzavo, { pot: '/beers', get naslov() { return t('aplikacija.pivo.zid') } }]
  const vec = jeAdmin && !jeNativno() ? [...zSpletom, { pot: '/admin', get naslov() { return t('aplikacija.meni.admin') } }] : zSpletom
  // Začetnica za avatar: iz vzdevka, sicer iz e-naslova.
  const zacetnica = (ime || session?.user.email || '?').trim().charAt(0).toUpperCase()

  const slog = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-gnl-300'
      : 'whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100'

  // Na telefonu so vrstice menija višje, da jih prst zadene.
  const slogMobilni = (a: { isActive: boolean }) => slog(a).replace('py-1.5', 'py-2.5')

  const znacka = (n: number) =>
    n > 0 && (
      <span className="ml-1.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
        {n}
      </span>
    )

  // Trgovina je nova; oznaka se bere kot del povezave ("Trgovina Novo").
  const novo = (
    <span className="ml-1.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 align-middle text-[10px] font-black uppercase text-amber-200">
      {t('aplikacija.meni.novo')}
    </span>
  )

  const vrsticaMenija =
    'block whitespace-nowrap rounded-lg px-3 py-2 text-left text-slate-300 hover:bg-white/5 hover:text-slate-100'

  return (
    <header className="sticky top-[var(--vrh)] z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <NavLink to="/" aria-label="SLFF" className="flex shrink-0 items-center gap-2 font-black">
            <img src="/logo/slff-grb.png" alt="" className="h-8 w-8" />
            <span className="naslov hidden sm:inline">SLFF</span>
          </NavLink>

          <IzbirnikLige />

          <div className="ml-auto hidden items-center gap-1 text-sm lg:flex">
            {glavne.map((p) => (
              <NavLink key={p.pot} to={p.pot} className={(a) => (p.odXl ? `${slog(a)} hidden xl:inline` : slog(a))}>
                {p.naslov}
              </NavLink>
            ))}
            {/* Pri 1024 px bi trgovina izbirniku lige vzela skoraj ves prostor
                (grščina se prelije čez rob), zato je zgoraj šele od xl, prej v "Več". */}
            <a {...povezavaTrgovine()} className={`${slog({ isActive: false })} hidden xl:inline`}>
              {t('aplikacija.meni.trgovina')}
              {' '}
              {novo}
            </a>

            {/* "Več": vse, kar ni tedensko. Pika za asistence se prenese na
                gumb, da opomnik ne izgine v meniju; število je ob povezavi. */}
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
                {t('aplikacija.meni.vec')}
                {cakaGlasov > 0 && (
                  <span aria-hidden="true" className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
                )}
                <span aria-hidden="true" className="ml-1 text-[10px]">
                  ▾
                </span>
              </button>
              {vecOdprt && (
                <div
                  role="menu"
                  className="animiraj-vstop absolute right-0 mt-2 min-w-[11rem] rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-xl shadow-black/40"
                >
                  {[...glavne.filter((p) => p.odXl), ...vec].map((p: Povezava) => (
                    <NavLink
                      key={p.pot}
                      to={p.pot}
                      role="menuitem"
                      className={({ isActive }) =>
                        `${vrsticaMenija} ${isActive ? 'font-semibold text-gnl-300' : ''} ${p.odXl ? 'xl:hidden' : ''}`
                      }
                      onClick={() => setVecOdprt(false)}
                    >
                      {p.naslov}
                      {p.pot === '/assists' && znacka(cakaGlasov)}
                    </NavLink>
                  ))}
                  <a
                    {...povezavaTrgovine()}
                    role="menuitem"
                    className={`${vrsticaMenija} xl:hidden`}
                    onClick={() => setVecOdprt(false)}
                  >
                    {t('aplikacija.meni.trgovina')}
                    {' '}
                    {novo}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto shrink-0 text-sm lg:ml-1">
            {session ? (
              <div ref={racunRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRacunOdprt(!racunOdprt)}
                  aria-haspopup="menu"
                  aria-expanded={racunOdprt}
                  aria-label={t('aplikacija.meni.nastavitve')}
                  title={ime ?? session.user.email ?? t('aplikacija.meni.nastavitve')}
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:opacity-90"
                >
                  {/* Avatar profila; dokler se ime nalaga, začetnica e-naslova. */}
                  <Avatar id={session.user.id} ime={ime ?? zacetnica} barva={avatar.barva} ikona={avatar.ikona} velikost={36} />
                </button>
                {racunOdprt && (
                  <div
                    role="menu"
                    className="animiraj-vstop absolute right-0 mt-2 min-w-[13rem] rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-xl shadow-black/40"
                  >
                    <div className="truncate px-3 py-2 text-xs text-slate-500">
                      {ime ?? session.user.email}
                    </div>
                    <NavLink
                      to={`/u/${session.user.id}`}
                      role="menuitem"
                      className={vrsticaMenija}
                      onClick={() => setRacunOdprt(false)}
                    >
                      {t('aplikacija.meni.mojProfil')}
                    </NavLink>
                    <NavLink
                      to="/reminders"
                      role="menuitem"
                      className={vrsticaMenija}
                      onClick={() => setRacunOdprt(false)}
                    >
                      {t('aplikacija.meni.opomniki')}
                    </NavLink>
                    <NavLink
                      to="/account"
                      role="menuitem"
                      className={vrsticaMenija}
                      onClick={() => setRacunOdprt(false)}
                    >
                      {t('aplikacija.meni.nastavitve')}
                    </NavLink>
                    <a
                      href={vabilo}
                      role="menuitem"
                      className={vrsticaMenija}
                      onClick={() => setRacunOdprt(false)}
                    >
                      {t('aplikacija.meni.povabi')}
                    </a>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setRacunOdprt(false)
                        odpriPodporo()
                      }}
                      className={`w-full ${vrsticaMenija}`}
                    >
                      {t('aplikacija.meni.pomoc')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (!potrdiZapustitev()) return
                        supabase.auth.signOut()
                      }}
                      className={`w-full ${vrsticaMenija}`}
                    >
                      {t('aplikacija.meni.odjava')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Novinec je pogostejši od vračajočega: glavni gumb odpre
              // registracijo, prijava je tiha povezava ob njem (na telefonu v meniju).
              <div className="flex items-center gap-3">
                <NavLink
                  to="/login"
                  className="hidden whitespace-nowrap text-slate-300 hover:text-white sm:inline"
                >
                  {t('aplikacija.meni.prijava')}
                </NavLink>
                <NavLink to="/login?nacin=registracija" className="gumb-glavni whitespace-nowrap px-3 text-sm sm:px-4">
                  {t('aplikacija.meni.zacni')}
                </NavLink>
              </div>
            )}
          </div>

          {/* Golov brez asistence je na hamburgerju le pika (število je v
              meniju ob Asistencah): številka "20" je glavo delala glasno. */}
          <button
            onClick={() => setOdprt(!odprt)}
            aria-label={
              cakaGlasov > 0
                ? t('aplikacija.meni.meniZGlasovi', { n: cakaGlasov })
                : t('aplikacija.meni.meni')
            }
            aria-expanded={odprt}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-slate-200 hover:bg-white/5
                       active:scale-95 lg:hidden"
          >
            <span aria-hidden="true">☰</span>
            {cakaGlasov > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400"
              />
            )}
          </button>
        </div>

        {odprt && (
          <div className="animiraj-vstop mt-3 border-t border-white/10 pt-3 text-base lg:hidden">
            <div className="grid grid-cols-2 gap-1.5">
              {glavne.map((p) => (
                <NavLink key={p.pot} to={p.pot} className={slogMobilni} onClick={() => setOdprt(false)}>
                  {p.naslov}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/5 pt-3 text-sm">
              {vec.map((p) => (
                <NavLink key={p.pot} to={p.pot} className={slogMobilni} onClick={() => setOdprt(false)}>
                  {p.naslov}
                  {p.pot === '/assists' && znacka(cakaGlasov)}
                </NavLink>
              ))}
              <a {...povezavaTrgovine()} className={slogMobilni({ isActive: false })} onClick={() => setOdprt(false)}>
                {t('aplikacija.meni.trgovina')}
                {' '}
                {novo}
              </a>
              {session ? (
                <NavLink to="/reminders" className={slogMobilni} onClick={() => setOdprt(false)}>
                  {t('aplikacija.meni.opomniki')}
                </NavLink>
              ) : (
                <NavLink to="/login" className={slogMobilni} onClick={() => setOdprt(false)}>
                  {t('aplikacija.meni.prijava')}
                </NavLink>
              )}
              <button
                type="button"
                className={`${slogMobilni({ isActive: false })} text-left`}
                onClick={() => {
                  setOdprt(false)
                  odpriPodporo()
                }}
              >
                {t('aplikacija.meni.pomoc')}
              </button>
              <a
                href={vabilo}
                className="col-span-2 rounded-lg px-3 py-2.5 text-center text-slate-400 hover:bg-white/5"
                onClick={() => setOdprt(false)}
              >
                {t('aplikacija.meni.povabi')}
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
