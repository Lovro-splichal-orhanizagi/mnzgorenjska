import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import ImeLastnika from '../components/ImeLastnika'
import { KraljNapovedi, KronaKralja, useKraljMiniLige } from '../components/NapovediMiniLige'
import IzstopMiniLige from '../components/IzstopMiniLige'
import DvobojiMiniLige, { IzbiraPogleda, type PogledMiniLige } from '../components/DvobojiMiniLige'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { formatirajTocke, mnozina, EKIPE, KROGI } from '../lib/pomozno'
import { razvrstiMini, vecLig, NAJMANJ_EKIP_ZA_DVOBOJE, type GlavaLige, type MiniVrstica } from '../lib/miniLige'
import { t, tx } from '../i18n'

const MEDALJE = ['🥇', '🥈', '🥉']

/**
 * Stran mini lige (/mini-leagues/:id): glava in lestvica, vidna članom. Le
 * lestvica — ime ekipe, lastnik, točke, mesto —, nikoli postave tujih ekip.
 * Vstop je le s kodo ali povezavo (/l/:koda).
 */
export default function JavnaMiniLiga() {
  const { id: surovId } = useParams()
  const ligaId = Number(surovId)
  const { session, loading } = useAuth()
  const uporabnikId = session?.user.id
  const pojdi = useNavigate()
  const [glava, setGlava] = useState<GlavaLige | null | undefined>(undefined)
  const [lestvica, setLestvica] = useState<MiniVrstica[]>([])
  const [osvezi, setOsvezi] = useState(0)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [pogled, setPogled] = useState<PogledMiniLige>('skupno')

  // Ime in opis piše uporabnik: pot je med zasebnimi (noindex, `jeZasebna`).
  useNaslov(glava ? glava.name : t('lestvice.vstop.miniLiga'))

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

  const urejena = useMemo(() => razvrstiMini(lestvica), [lestvica])
  const kaziLigo = useMemo(() => vecLig(lestvica), [lestvica])
  // Kralj napovedi sezone: le članom (javno ligo gledajo tudi nečlani).
  const kralji = useKraljMiniLige(glava?.sem_clan ? ligaId : null)
  const kraljiId = useMemo(() => new Set(kralji.map((k) => k.user_id)), [kralji])

  if (!Number.isFinite(ligaId) || glava === null)
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-black naslov">{t('lestvice.vstop.niLige')}</h1>
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

  const mojihVLigi = uporabnikId ? lestvica.filter((v) => v.owner_id === uporabnikId).length : 0

  function poIzstopu(besedilo: string) {
    // Liga po izstopu zadnje ekipe ni več vidna: nazaj na Mini lige.
    // Gumb ima tujec le za svoje ekipe, zato je to vedno izstop, ne odstranitev.
    if (glava && !glava.sem_lastnik && mojihVLigi <= 1) {
      pojdi('/mini-leagues')
      return
    }
    setSporocilo(besedilo)
    setOsvezi((n) => n + 1)
  }

  return (
    <div className="space-y-6">
      <div className="kartica space-y-1 p-5">
        <p className="text-xs text-slate-500">
          {t('lestvice.vstop.miniLiga')}
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
        <KraljNapovedi vrstice={kralji} krog={null} drobno />
      </div>

      {sporocilo && <p role="status" className="text-sm text-gnl-300">{sporocilo}</p>}

      {glava.sem_clan && (
        <Link to={`/mini-leagues?liga=${glava.id}`} className="gumb-glavni inline-block text-sm">
          {t('lestvice.javneLige.moja')}
        </Link>
      )}

      {urejena.length >= NAJMANJ_EKIP_ZA_DVOBOJE && <IzbiraPogleda pogled={pogled} onPogled={setPogled} />}

      {urejena.length >= NAJMANJ_EKIP_ZA_DVOBOJE && pogled === 'dvoboji' ? (
        <DvobojiMiniLige ligaId={ligaId} />
      ) : urejena.length === 0 ? (
        <p className="text-sm text-slate-400">{t('lestvice.miniLige.prazna')}</p>
      ) : (
        <ol className="kartica divide-y divide-white/10 overflow-hidden">
          {urejena.map((v) => (
            <li
              key={v.fantasy_team_id}
              className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4"
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
                  {v.owner_id != null && kraljiId.has(v.owner_id) && <KronaKralja />}
                  <ImeLastnika ime={v.owner_name} id={v.owner_id} />
                  {kaziLigo && v.competition_short ? ` · ${v.competition_short}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold tabular-nums text-gnl-300">{formatirajTocke(v.total_points)}</div>
                <div className="text-[11px] text-slate-500">{mnozina(v.rounds_played ?? 0, KROGI)}</div>
              </div>
              {uporabnikId && v.fantasy_team_id != null && (v.owner_id === uporabnikId || glava.sem_lastnik) && (
                <IzstopMiniLige
                  ligaId={glava.id}
                  imeLige={glava.name}
                  ekipaId={v.fantasy_team_id}
                  imeEkipe={v.team_name ?? ''}
                  ligaEkipe={v.competition_short}
                  nacin={v.owner_id === uporabnikId ? 'izstop' : 'odstrani'}
                  zadnja={mojihVLigi <= 1}
                  lastnik={glava.sem_lastnik}
                  onKoncano={poIzstopu}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
