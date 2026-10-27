// Ena tekma: obe postavi na igrišču in točke, ki jih je prinesla.
import { useCallback, useEffect, useState } from 'react'
import { useNastavitev } from '../lib/nastavitve'
import { PRAG_ASISTENCE_PRIVZETO } from '../components/GolZaGlasovanje'
import { useLocation, useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { useNaslov, useNoindex } from '../lib/naslov'
import { useKanonicnaLiga, useTekmovanje, zLigo } from '../lib/tekmovanje'
import { povezavaNaPrijavo } from '../lib/prijava'
import { t, datum } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import type { Pozicija } from '../lib/tipi'
import KartoniZaGlasovanje, { StatistikaCakaKartone } from '../components/KartoniZaGlasovanje'
import Grb from '../components/Grb'
import { NedosegljivaStatistika } from '../components/PokritostStatistike'
import IgrisceTocke from '../components/IgrisceTocke'
import GolZaGlasovanje, { caka } from '../components/GolZaGlasovanje'
import PopravekAsistence from '../components/PopravekAsistence'
import PasSkupnosti from '../components/PasSkupnosti'
import type { Gol, Glas, Kandidat } from '../components/GolZaGlasovanje'
import type { NastopNaTekmi } from '../components/IgrisceTocke'
import type { TekmaVrstica } from '../lib/tipi'
import { prevediNapako } from '../lib/napake'
import { unattributedYellowEvents } from '../lib/nepripisaniRumeni.mjs'

/**
 * Nastop na tekmi, kot ga sestavi ta stran: vrstica `appearances` z vlozenim
 * igralcem, sploscenimi imeni in tockami iz `appearance_points`.
 */
type NastopTekme = NastopNaTekmi &
  Kandidat & {
    team_id?: number | null
    players?: { full_name?: string | null; position?: Pozicija | null } | null
  }

const datumTekme = (d?: string | null) =>
  d
    ? datum(d, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

/** Grb in ime kluba v izidu; ime vodi na stran kluba v ligi tekme. */
function Klub({ ime, kratko, logo, id, liga }: {
  ime: string | null
  kratko: string | null
  logo: string | null
  id: number | null
  liga: string | null
}) {
  const vsebina = (
    <>
      <Grb ime={ime} kratko={kratko} logo={logo} velikost={36} />
      <span className="text-sm font-semibold leading-tight sm:text-base">{ime}</span>
    </>
  )
  const slog = 'flex min-w-0 flex-1 flex-col items-center gap-1.5'
  return id ? (
    <Link to={zLigo(`/club/${id}`, liga)} className={`${slog} hover:text-gnl-300`}>
      {vsebina}
    </Link>
  ) : (
    <span className={slog}>{vsebina}</span>
  )
}

/** Public summary only: source event details stay out of the match display. */
export function OpozoriloRumenih({ opozorila, nedosegljivo = false }: {
  opozorila: unknown
  nedosegljivo?: boolean
}) {
  const n = unattributedYellowEvents(opozorila).length
  if (!nedosegljivo && n === 0) return null
  return (
    <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-200">
      {nedosegljivo
        ? t('aplikacija.rumeniKartoni.nedosegljivo')
        : t('aplikacija.rumeniKartoni.nepripisani', { n })}
    </p>
  )
}

export default function Tekma() {
  const { id } = useParams()
  // Iz naslova pride niz; stolpec je stevilcen. Doslej je pretvorbo tiho
  // opravil PostgREST, zdaj jo naredimo tu in je razvidna.
  const tekmaId = Number(id)
  const { session } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const lokacija = useLocation()
  const [cardPending, setCardPending] = useState<{ matchId: number; pending: boolean } | null>(null)
  const updateCardPending = useCallback((pending: boolean) => setCardPending({ matchId: tekmaId, pending }), [tekmaId])
  const [tekma, setTekma] = useState<TekmaVrstica | null>(null)
  // Prag lige, v kateri je bila tekma odigrana — ne lige iz menija. Do
  // nalaganja tekme velja privzetek.
  const pragAsistence = useNastavitev(tekma?.competition_id ?? null)(
    'prag_glasov_asistenca',
    PRAG_ASISTENCE_PRIVZETO,
  )
  // Povezave naprej vodijo v ligo tekme, ne v izbrano.
  const liga = useTekmovanje().vsaTekmovanja.find((l) => l.id === tekma?.competition_id)
  const slugLige = liga?.slug ?? null
  useKanonicnaLiga(slugLige)
  useNaslov(tekma ? `${tekma.home_name} : ${tekma.away_name}` : t('tekme.tekma.naslov'), liga?.name)
  const [nastopi, setNastopi] = useState<NastopTekme[]>([])
  const [goli, setGoli] = useState<Gol[]>([])
  const [opozorilaRumenih, setOpozorilaRumenih] = useState<{
    tekmaId: number; opozorila: unknown; nedosegljivo: boolean
  } | null>(null)
  // goal_id -> glasovi, razvrsceni padajoce
  const [glasovi, setGlasovi] = useState<Record<string, Glas[]>>({})
  // goal_id -> igralec, za katerega sem glasoval (null = "brez asistence")
  const [mojiGlasovi, setMojiGlasovi] = useState<Record<string, number | null>>(
    {},
  )
  const [pravkarOddan, setPravkarOddan] = useState<number | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  // Izbira skupnosti (napovedi) za to tekmo: baza jo da šele po roku kroga
  // in od treh napovedi naprej, sicer je ni.
  const [skupnost, setSkupnost] = useState<{ match_id: number; n: number; doma: number; remi: number; gostje: number } | null>(null)
  const krogTekme = tekma?.round_id ?? null
  useEffect(() => {
    setSkupnost(null)
    if (krogTekme == null) return
    let veljavno = true
    supabase.rpc('skupnost_napovedi_kroga', { p_round: krogTekme }).then(({ data }) => {
      if (veljavno) setSkupnost((data ?? []).find((v) => v.match_id === tekmaId) ?? null)
    })
    return () => {
      veljavno = false
    }
  }, [krogTekme, tekmaId])

  useEffect(() => {
    let preklican = false
    async function nalozi() {
      setNalaganje(true)
      setOpozorilaRumenih(null)
      // Nastope in tocke beremo iz obstojecih tabel in pogleda appearance_points
      // ter ju zdruzimo tu. Tako stran deluje brez nove migracije v bazi.
      const [
        { data: t, error: eT },
        { data: nastopiTekme, error: eN },
        { data: tockeNastopov, error: eP },
        { data: g, error: eG },
        rumeni,
      ] = await Promise.all([
        supabase
          .from('match_assist_status')
          .select('*')
          .eq('match_id', tekmaId)
          .maybeSingle(),
        supabase
          .from('appearances')
          .select(
            'id, team_id, player_id, started, shirt_number, minutes_played, goals, own_goals, penalties_scored, penalties_missed, penalties_saved, yellow_cards, red_cards, goals_conceded, clean_sheet, players(full_name, position)',
          )
          .eq('match_id', tekmaId)
          .order('shirt_number', { nullsFirst: false }),
        supabase
          .from('appearance_points')
          .select('appearance_id, points, assists, prejeti_na_igriscu, cista_mreza, zmaga, pravila')
          .eq('match_id', tekmaId),
        supabase
          .from('goals')
          .select(
            'id, minute, is_own_goal, is_penalty, score_home, score_away, team_id, scorer:scorer_id(id, full_name), assist_player_id, assist:assist_player_id(full_name)',
          )
          .eq('match_id', tekmaId)
          .order('minute'),
        // Optional public metadata must never turn known statistics into an error.
        // Match IDs are globally unique; this also works for another league's link.
        supabase
          .from('matches')
          .select('import_warnings')
          .eq('id', tekmaId)
          .maybeSingle()
          .then(
            ({ data, error }) => ({ opozorila: data?.import_warnings, nedosegljivo: !!error || !data }),
            () => ({ opozorila: null, nedosegljivo: true }),
          ),
      ])
      if (preklican) return
      setOpozorilaRumenih({ tekmaId, ...rumeni })
      const napacno = eT ?? eN ?? eP ?? eG
      if (napacno) setNapaka(napacno.message)

      const tocke: Record<
        string,
        { points?: number | null; assists?: number | null; prejeti_na_igriscu?: number | null; cista_mreza?: boolean | null; zmaga?: boolean | null; pravila?: number | null }
      > =
        Object.fromEntries(
          (tockeNastopov ?? []).map((x: any) => [String(x.appearance_id), x]),
        )
      setTekma((t as TekmaVrstica | null) ?? null)
      setNastopi(
        (nastopiTekme ?? []).map((n: any) => ({
          ...n,
          full_name: n.players?.full_name,
          position: n.players?.position,
          points: tocke[String(n.id)]?.points ?? 0,
          assists: tocke[String(n.id)]?.assists ?? 0,
          // tocke racuna pogled z goli, prejetimi med igranjem
          goals_conceded: tocke[String(n.id)]?.prejeti_na_igriscu ?? n.goals_conceded,
          clean_sheet: tocke[String(n.id)]?.cista_mreza ?? n.clean_sheet,
          zmaga: tocke[String(n.id)]?.zmaga ?? null,
          pravila: tocke[String(n.id)]?.pravila ?? null,
        })) as NastopTekme[],
      )
      setGoli(((g ?? []) as unknown) as Gol[])
      setNalaganje(false)

      // Glasovi o asistencah — na tej strani se da tudi glasovati.
      const idji = (g ?? []).map((x: any) => x.id as number)
      if (t?.statistics_status !== 'unavailable_historical' && t?.statistics_status !== 'pending_cards' && idji.length) osveziGlasove(idji)
    }
    async function osveziGlasove(idji: number[]) {
      const { data: st } = await supabase
        .from('assist_vote_counts')
        .select('goal_id, player_id, votes')
        .in('goal_id', idji)
      if (preklican) return
      const skupine: Record<string, Glas[]> = {}
      for (const x of (st ?? []) as any[])
        (skupine[String(x.goal_id)] ??= []).push({
          player_id: x.player_id,
          votes: x.votes,
        })
      for (const k of Object.keys(skupine))
        skupine[k].sort((a, b) => b.votes - a.votes)
      setGlasovi(skupine)

      if (!uporabnikId) return setMojiGlasovi({})
      const { data: moji } = await supabase
        .from('assist_votes')
        .select('goal_id, player_id')
        .in('goal_id', idji)
        .eq('voter_id', uporabnikId)
      if (preklican) return
      setMojiGlasovi(
        Object.fromEntries(
          (moji ?? []).map((m: any) => [String(m.goal_id), m.player_id]),
        ),
      )
    }

    nalozi()
    return () => {
      preklican = true
    }
  }, [tekmaId, uporabnikId])

  async function glasuj(golId: number, playerId: number | null) {
    if (!session || tekma?.statistics_status === 'unavailable_historical' || tekma?.statistics_status === 'pending_cards' || (cardPending?.matchId === tekmaId && cardPending.pending)) return
    setNapaka(null)

    const { error } = await supabase.from('assist_votes').upsert(
      { goal_id: golId, voter_id: session.user.id, player_id: playerId },
      { onConflict: 'goal_id,voter_id' },
    )
    if (error) return setNapaka(prevediNapako(error.message))

    setMojiGlasovi({ ...mojiGlasovi, [String(golId)]: playerId })
    setPravkarOddan(golId)
    setTimeout(() => setPravkarOddan(null), 1200)

    // Osveži števce in morebitno potrditev asistence (prag potrdi baza).
    const [{ data: st }, { data: gg }] = await Promise.all([
      supabase
        .from('assist_vote_counts')
        .select('goal_id, player_id, votes')
        .eq('goal_id', golId),
      supabase
        .from('goals')
        .select('id, assist_player_id, assist:assist_player_id(full_name)')
        .eq('id', golId)
        .single(),
    ])
    setGlasovi((prej) => ({
      ...prej,
      [String(golId)]: ((st ?? []) as any[])
        .map((x) => ({ player_id: x.player_id, votes: x.votes }))
        .sort((a, b) => b.votes - a.votes),
    }))
    if (gg)
      setGoli((prej) =>
        prej.map((x) =>
          x.id === golId
            ? {
                ...x,
                assist_player_id: gg.assist_player_id,
                assist: gg.assist as Gol['assist'],
              }
            : x,
        ),
      )
  }

  useNoindex(!nalaganje && !tekma)

  if (nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  if (!tekma)
    return (
      <div className="space-y-3">
        <p className="text-slate-400">{t('tekme.tekma.niTekme')}</p>
        <Link to="/results" className="gumb-tih inline-block">
          {t('tekme.tekma.nazaj')}
        </Link>
      </div>
    )

  // Koliko golov te tekme še čaka na odločitev skupnosti. Enajstmetrovke,
  // avtogoli in goli, pri katerih je zmagalo »brez asistence«, ne čakajo.
  const kartoniCakajo = tekma.statistics_status === 'pending_cards' || (cardPending?.matchId === tekmaId && cardPending.pending)
  const nedosegljivo = tekma.statistics_status === 'unavailable_historical' || kartoniCakajo
  const cakajocih = goli.filter((g) => caka(g, glasovi[String(g.id)] ?? [], pragAsistence)).length

  // Nastopi so v isti tabeli za obe ekipi; razdelimo jih po klubu.
  const domaci = nastopi.filter((n) => n.team_id === tekma.home_team_id)
  const gostje = nastopi.filter((n) => n.team_id === tekma.away_team_id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={zLigo(tekma.round_id ? `/results?krog=${tekma.round_id}` : '/results', slugLige)}
          className="inline-flex min-h-11 items-center text-sm text-slate-400 hover:text-gnl-300"
        >
          {t('tekme.tekma.nazaj')}
        </Link>
        <span className="text-sm text-slate-500">
          {t('tekme.krog', { n: tekma.round_number })} · {tekma.season}
          {tekma.played_on && ` · ${datumTekme(tekma.played_on)}`}
        </span>
      </div>

      {/* Izid: grb nad imenom, da ime na telefonu ni skrajšano na kratico.
          Ves izid je naslov strani (h1): "Domači 2:1 Gostje". */}
      <h1 className="flex items-start justify-center gap-3 text-center sm:gap-6">
        <Klub ime={tekma.home_name} kratko={tekma.home_short} logo={tekma.home_logo} id={tekma.home_team_id} liga={slugLige} />
        <span className="pt-1 text-3xl font-black tabular-nums sm:text-4xl">
          {tekma.home_goals == null || tekma.away_goals == null
            ? '—'
            : `${tekma.home_goals}:${tekma.away_goals}`}
        </span>
        <Klub ime={tekma.away_name} kratko={tekma.away_short} logo={tekma.away_logo} id={tekma.away_team_id} liga={slugLige} />
      </h1>

      {skupnost && skupnost.match_id === tekmaId && (
        <section className="kartica space-y-2 p-3" aria-label={t('lestvice.napovediLige.skupnost')}>
          <Link to={zLigo('/predictions', slugLige)} className="text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-gnl-300">
            {t('lestvice.napovediLige.skupnost')}
          </Link>
          <PasSkupnosti n={skupnost.n} doma={skupnost.doma} remi={skupnost.remi} gostje={skupnost.gostje} />
        </section>
      )}

      {!nedosegljivo && opozorilaRumenih?.tekmaId === tekmaId && (
        <OpozoriloRumenih
          opozorila={opozorilaRumenih.opozorila}
          nedosegljivo={opozorilaRumenih.nedosegljivo}
        />
      )}

      {kartoniCakajo ? <StatistikaCakaKartone /> : nedosegljivo ? <NedosegljivaStatistika resultKnown={tekma.home_goals != null && tekma.away_goals != null} /> : nastopi.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t('tekme.tekma.brezPostav')}
        </p>
      ) : (
        <>
          <p className="hidden text-sm text-slate-400 sm:block">
            {t('tekme.tekma.naDresu')}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <IgrisceTocke
              ekipa={{
                ime: tekma.home_name,
                kratko: tekma.home_short,
                logo: tekma.home_logo,
              }}
              nastopi={domaci}
            />
            <IgrisceTocke
              ekipa={{
                ime: tekma.away_name,
                kratko: tekma.away_short,
                logo: tekma.away_logo,
              }}
              nastopi={gostje}
            />
          </div>
        </>
      )}

      {tekma.statistics_status !== 'unavailable_historical' && <KartoniZaGlasovanje key={tekmaId} matchId={tekmaId} onStatisticsPending={updateCardPending} />}

      {!nedosegljivo && cakajocih > 0 && (
        <p className="text-sm text-amber-200">
          {t('tekme.tekma.cakajo', { n: cakajocih })}
        </p>
      )}

      {!nedosegljivo && goli.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{t('tekme.tekma.goliInAsistence')}</h2>
            {!session && (
              <Link
                to={povezavaNaPrijavo(lokacija.pathname + lokacija.search)}
                className="text-sm text-gnl-300 underline"
              >
                {t('tekme.tekma.prijaviSe')}
              </Link>
            )}
          </div>
          <ul className="kartica divide-y divide-white/10 overflow-hidden">
            {goli.map((g) => (
              <GolZaGlasovanje
                key={g.id}
                gol={g}
                tekma={tekma}
                kandidati={nastopi.filter(
                  (n) =>
                    n.team_id === g.team_id &&
                    n.player_id !== g.scorer?.id &&
                    Number(n.minutes_played ?? 0) > 0,
                )}
                nastopi={nastopi}
                glasovi={glasovi[String(g.id)] ?? []}
                mojGlas={mojiGlasovi[String(g.id)]}
                omogoceno={Boolean(session) && tekma?.glasovanje_odprto !== false}
                pravkar={pravkarOddan === g.id}
                onGlasuj={glasuj}
              />
            ))}
          </ul>
          {session && <PopravekAsistence goli={goli} nastopi={nastopi} />}
        </section>
      )}
      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </div>
  )
}
