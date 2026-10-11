import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import ImeLastnika from '../components/ImeLastnika'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { formatirajTocke, mnozina, EKIPE, KROGI } from '../lib/pomozno'
import { razvrstiMini, vecLig, type MiniVrstica } from '../lib/miniLige'
import { napakaJavnosti, type GlavaLige } from '../lib/javneMiniLige'
import { dogodek } from '../lib/analitika'
import { t, tx } from '../i18n'

const MEDALJE = ['🥇', '🥈', '🥉']

interface Ekipa {
  id: number
  name: string
  competition_id: number | null
}

/**
 * Javna stran mini lige (/mini-leagues/:id): glava in lestvica, vidna vsem,
 * ko je liga javna (zasebna le članom). Le lestvica — ime ekipe, lastnik,
 * točke, mesto —, nikoli postave tujih ekip. Pridružitev brez kode z ekipo
 * lige, v kateri je mini liga javna; prijava lige gre v vrsto admina.
 */
export default function JavnaMiniLiga() {
  const { id: surovId } = useParams()
  const ligaId = Number(surovId)
  const { session, loading } = useAuth()
  const uporabnikId = session?.user.id
  const { pathname, search } = useLocation()
  const [glava, setGlava] = useState<GlavaLige | null | undefined>(undefined)
  const [lestvica, setLestvica] = useState<MiniVrstica[]>([])
  const [ekipe, setEkipe] = useState<Ekipa[]>([])
  const [osvezi, setOsvezi] = useState(0)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  const [prijavljam, setPrijavljam] = useState(false)
  const [razlog, setRazlog] = useState('')

  // Ime in opis piše uporabnik: pot je med zasebnimi (noindex, `jeZasebna`).
  useNaslov(glava ? glava.name : t('lestvice.javneLige.javnaMiniLiga'))

  useEffect(() => {
    if (!Number.isFinite(ligaId) || loading) return
    let veljavno = true
    ;(async () => {
      const [{ data: g }, { data: l }] = await Promise.all([
        supabase.rpc('mini_liga_glava', { p_liga: ligaId }),
        supabase.rpc('lestvica_javne_mini_lige', { p_liga: ligaId }),
      ])
      if (!veljavno) return
      const vrstica = (Array.isArray(g) ? g[0] : g) as GlavaLige | undefined
      setGlava(vrstica ?? null)
      setLestvica((l ?? []) as MiniVrstica[])
    })()
    return () => {
      veljavno = false
    }
  }, [ligaId, loading, uporabnikId, osvezi])

  useEffect(() => {
    if (!uporabnikId) return setEkipe([])
    let veljavno = true
    supabase
      .from('fantasy_teams')
      .select('id, name, competition_id')
      .eq('owner_id', uporabnikId)
      .then(({ data }) => {
        if (veljavno) setEkipe((data ?? []) as Ekipa[])
      })
    return () => {
      veljavno = false
    }
  }, [uporabnikId])

  const urejena = useMemo(() => razvrstiMini(lestvica), [lestvica])
  const kaziLigo = useMemo(() => vecLig(lestvica), [lestvica])

  if (!Number.isFinite(ligaId) || glava === null)
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-black naslov">{t('lestvice.javneLige.niLige')}</h1>
        <p className="kartica p-4 text-sm text-slate-400">
          {tx('lestvice.javneLige.niLigeOpis', {}, {
            mini: (b) => (
              <Link to="/mini-leagues" className="text-gnl-300 hover:underline">
                {b}
              </Link>
            ),
          })}
        </p>
      </div>
    )
  if (glava === undefined) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  const mojaEkipa = ekipe.find((e) => e.competition_id === glava.competition_id) ?? null

  async function pridruzi() {
    if (!mojaEkipa || !glava) return
    setNapaka(null)
    setSporocilo(null)
    setDela(true)
    const { error } = await supabase.rpc('pridruzi_javni_mini_ligi', {
      p_liga: glava.id,
      p_ekipa: mojaEkipa.id,
    })
    setDela(false)
    if (error) return setNapaka(napakaJavnosti(error))
    dogodek('mini_liga_pridruzitev', { vir: 'javna-stran' })
    setSporocilo(t('lestvice.javneLige.pridruzen', { ime: glava.name }))
    setOsvezi((n) => n + 1)
  }

  async function prijavi() {
    if (!glava) return
    setNapaka(null)
    setDela(true)
    const { error } = await supabase.rpc('prijavi_mini_ligo', {
      p_liga: glava.id,
      p_razlog: razlog.trim() || undefined,
    })
    setDela(false)
    if (error) return setNapaka(napakaJavnosti(error))
    setPrijavljam(false)
    setRazlog('')
    setSporocilo(t('lestvice.javneLige.prijavljena'))
  }

  return (
    <div className="space-y-6">
      <div className="kartica space-y-1 p-5">
        <p className="text-xs text-slate-500">
          {glava.javna ? t('lestvice.javneLige.javnaMiniLiga') : t('lestvice.vstop.miniLiga')}
          {glava.competition_short ? ` · ${glava.competition_short}` : ''}
        </p>
        <h1 className="text-2xl font-black naslov">{glava.name}</h1>
        {glava.opis && <p className="text-sm text-slate-300">{glava.opis}</p>}
        <p className="text-sm text-slate-400">
          {glava.owner_name && (
            <>
              {tx('lestvice.javneLige.ustvaril', { ime: glava.owner_name }, {
                lastnik: () => <ImeLastnika ime={glava.owner_name} id={glava.owner_id} />,
              })}
              {' · '}
            </>
          )}
          {mnozina(glava.ekip, EKIPE)}
        </p>
      </div>

      {napaka && <p role="alert" className="text-sm text-rose-400">{napaka}</p>}
      {sporocilo && <p role="status" className="text-sm text-gnl-300">{sporocilo}</p>}

      {glava.sem_clan ? (
        <Link to={`/mini-leagues?liga=${glava.id}`} className="gumb-glavni inline-block text-sm">
          {t('lestvice.javneLige.moja')}
        </Link>
      ) : glava.javna && !session ? (
        <p className="text-sm text-slate-400">
          {tx('lestvice.javneLige.prijava', {}, {
            prijava: (b) => (
              <Link
                to={povezavaNaPrijavo(pathname + search)}
                className="font-semibold text-gnl-300 underline hover:text-gnl-200"
              >
                {b}
              </Link>
            ),
          })}
        </p>
      ) : glava.javna && mojaEkipa ? (
        <button onClick={pridruzi} disabled={dela} className="gumb-glavni text-sm">
          {t('lestvice.vstop.pridruziSe', { ime: mojaEkipa.name })}
        </button>
      ) : glava.javna ? (
        <p className="text-sm text-slate-400">
          {t('lestvice.javneLige.potrebujesEkipo')}{' '}
          <Link to="/my-team" className="font-semibold text-gnl-300 hover:underline">
            {t('lestvice.javneLige.sestaviEkipo')}
          </Link>
        </p>
      ) : null}

      {urejena.length === 0 ? (
        <p className="text-sm text-slate-400">{t('lestvice.miniLige.prazna')}</p>
      ) : (
        <ol className="kartica divide-y divide-white/10 overflow-hidden">
          {urejena.map((v) => (
            <li
              key={v.fantasy_team_id}
              className="flex min-h-[52px] items-center gap-3 px-3 py-2 sm:px-4"
            >
              <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
                {v.mesto <= 3 ? (
                  <span role="img" aria-label={t('lestvice.mesto', { mesto: v.mesto })}>
                    {MEDALJE[v.mesto - 1]}
                  </span>
                ) : (
                  v.mesto
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{v.team_name}</p>
                <div className="truncate text-xs text-slate-500">
                  <ImeLastnika ime={v.owner_name} id={v.owner_id} />
                  {kaziLigo && v.competition_short ? ` · ${v.competition_short}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold tabular-nums text-gnl-300">{formatirajTocke(v.total_points)}</div>
                <div className="text-[11px] text-slate-500">{mnozina(v.rounds_played ?? 0, KROGI)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {glava.javna && session && !glava.sem_lastnik && (
        <div className="text-sm">
          {prijavljam ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void prijavi()
              }}
              className="kartica space-y-2 p-3"
            >
              <input
                value={razlog}
                onChange={(e) => setRazlog(e.target.value)}
                placeholder={t('lestvice.javneLige.razlog')}
                maxLength={300}
                className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={dela} className="gumb-glavni text-sm">
                  {t('lestvice.javneLige.poslji')}
                </button>
                <button
                  type="button"
                  onClick={() => setPrijavljam(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  {t('lestvice.javneLige.preklici')}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setPrijavljam(true)}
              className="text-xs text-slate-500 underline hover:text-slate-300"
            >
              {t('lestvice.javneLige.prijavi')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
