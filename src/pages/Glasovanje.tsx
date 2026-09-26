import { useEffect, useMemo, useState } from 'react'
import { useNastavitev } from '../lib/nastavitve'
import { imeZveze } from '../components/VirPodatkov'
import { Link, useLocation } from 'react-router-dom'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { mnozina, GOLI } from '../lib/pomozno'
import { t, tx } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import Grb from '../components/Grb'
import GolZaGlasovanje, {
  PRAG_ASISTENCE_PRIVZETO,
  caka,
} from '../components/GolZaGlasovanje'
import type { Gol, Glas, Kandidat } from '../components/GolZaGlasovanje'
import type { TekmaVrstica } from '../lib/tipi'


export default function Glasovanje() {
  const { session, loading } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const lokacija = useLocation()
  useNaslov(t('tekme.glasovanje.naslov'))
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const zveza = imeZveze(tekmovanje)
  const pragAsistence = useNastavitev()(
    'prag_glasov_asistenca',
    PRAG_ASISTENCE_PRIVZETO,
  )
  const [tekme, setTekme] = useState<TekmaVrstica[]>([])
  const [krogId, setKrogId] = useState<number | null>(null)
  const [sezona, setSezona] = useState<string | null>(null)
  const [tekmaId, setTekmaId] = useState<number | null>(null)
  const [goli, setGoli] = useState<Gol[]>([])
  const [igralci, setIgralci] = useState<Kandidat[]>([])
  // goal_id -> glasovi, razvrsceni padajoce
  const [glasovi, setGlasovi] = useState<Record<string, Glas[]>>({})
  // goal_id -> igralec, za katerega sem glasoval
  const [mojiGlasovi, setMojiGlasovi] = useState<Record<string, number | null>>(
    {},
  )
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [pravkarOddan, setPravkarOddan] = useState<number | null>(null)

  // Vse odigrane tekme naenkrat — samo TEKOČA sezona. Lanska liga ni bila
  // fantasy-aktivna, zato bi glasovanje o lanskih asistencah bilo brez smisla.
  // Sezono filtrira strežnik: z arhivi vred bi pogled hitro presegel 1000
  // vrstic, ki jih PostgREST vrne, in tekoča sezona bi tiho ostala brez tekem.
  useEffect(() => {
    if (!tekmovanjeId) return
    // Izbira iz prejšnje lige tu nima pomena — tekma drugje ne obstaja.
    setTekme([])
    setKrogId(null)
    setTekmaId(null)
    setGoli([])
    setNapaka(null)
    setNalaganje(true)
    const ligaId = tekmovanjeId
    let veljavno = true
    async function nalozi() {
      const { data: sez } = await supabase
        .from('sezone')
        .select('season, tekoca')
        .eq('competition_id', ligaId)
      if (!veljavno) return
      const tekocaSez =
        ((sez ?? []) as any[]).find((x) => x.tekoca)?.season ?? null
      let samoTekoca: TekmaVrstica[] = []
      if (tekocaSez) {
        const { data, error } = await supabase
          .from('match_assist_status')
          .select('*')
          .eq('competition_id', ligaId)
          .eq('season', tekocaSez)
          .order('played_on', { ascending: false })
          .order('match_id')
        if (!veljavno) return
        if (error) setNapaka(error.message)
        samoTekoca = (data ?? []) as TekmaVrstica[]
      }
      setTekme(samoTekoca)
      setSezona(tekocaSez)
      // Najprej krog, ki še čaka IN je odprt — zaprtega ni smisel ponujati.
      const cakajoc = samoTekoca.find(
        (t) => Number(t.brez_asistence ?? 0) > 0 && t.glasovanje_odprto,
      )
      setKrogId(cakajoc?.round_id ?? samoTekoca[0]?.round_id ?? null)
      setNalaganje(false)
    }
    nalozi()
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  // Ob menjavi kroga izberemo prvo tekmo, ki še potrebuje glasove.
  useEffect(() => {
    if (!krogId) return
    const vKrogu = tekme.filter((t) => t.round_id === krogId)
    const cakajoca =
      vKrogu.find(
        (t) => Number(t.brez_asistence ?? 0) > 0 && t.glasovanje_odprto,
      ) ?? vKrogu[0]
    setTekmaId(cakajoca?.match_id ?? null)
  }, [krogId, tekme])

  // goli izbrane tekme + kandidati + glasovi
  useEffect(() => {
    if (!tekmaId) return
    const idTekme = tekmaId
    let preklican = false

    async function nalozi() {
      const [{ data: g }, { data: nastopi }] = await Promise.all([
        supabase
          .from('goals')
          .select(
            'id, minute, is_own_goal, is_penalty, score_home, score_away, team_id, scorer:scorer_id(id, full_name), assist_player_id, assist:assist_player_id(full_name)',
          )
          .eq('match_id', idTekme)
          .order('minute'),
        supabase
          .from('appearances')
          // shirt_number je iz TE tekme (zapisnika), ne s profila igralca —
          // dres se med sezono lahko zamenja. Olajša iskanje pravega
          // podajalca: "16 — Priimek Ime" je isti zapis kot v zapisniku.
          .select(
            'player_id, team_id, minutes_played, shirt_number, players(id, full_name, position)',
          )
          .eq('match_id', idTekme),
      ])
      if (preklican) return
      setGoli(((g ?? []) as unknown) as Gol[])
      setIgralci(((nastopi ?? []) as unknown) as Kandidat[])

      const ids = ((g ?? []) as any[]).map((x) => x.id as number)
      if (ids.length) {
        const { data: st } = await supabase
          .from('assist_vote_counts')
          .select('goal_id, player_id, votes')
          .in('goal_id', ids)
        if (preklican) return
        const skupine: Record<string, Glas[]> = {}
        for (const v of (st ?? []) as any[]) {
          const kljuc = String(v.goal_id)
          skupine[kljuc] = skupine[kljuc] ?? []
          skupine[kljuc].push({ player_id: v.player_id, votes: v.votes })
        }
        for (const k of Object.keys(skupine))
          skupine[k].sort((a, b) => Number(b.votes ?? 0) - Number(a.votes ?? 0))
        setGlasovi(skupine)

        if (uporabnikId) {
          const { data: moji } = await supabase
            .from('assist_votes')
            .select('goal_id, player_id')
            .in('goal_id', ids)
            .eq('voter_id', uporabnikId)
          if (preklican) return
          setMojiGlasovi(
            Object.fromEntries(
              (moji ?? []).map((m: any) => [String(m.goal_id), m.player_id]),
            ),
          )
        }
      } else {
        setGlasovi({})
        setMojiGlasovi({})
      }
    }
    nalozi()
    return () => {
      preklican = true
    }
  }, [tekmaId, uporabnikId])

  const sezone = useMemo(
    () =>
      [
        ...new Set(tekme.map((t) => t.season).filter((x): x is string => !!x)),
      ]
        .sort()
        .reverse(),
    [tekme],
  )

  // Krogi z odigranimi tekmami; značka pove, koliko golov v krogu še čaka.
  const krogi = useMemo(() => {
    const m = new Map()
    for (const t of tekme.filter((t) => !sezona || t.season === sezona)) {
      const k = m.get(t.round_id) ?? {
        id: t.round_id,
        number: t.round_number,
        season: t.season,
        brez_asistence: 0,
        odprt: false,
      }
      k.brez_asistence += t.brez_asistence
      k.odprt = k.odprt || Boolean(t.glasovanje_odprto)
      m.set(t.round_id, k)
    }
    return [...m.values()].sort(
      (a, b) => b.season.localeCompare(a.season) || b.number - a.number,
    )
  }, [tekme, sezona])

  const tekmeVKrogu = useMemo(
    () => tekme.filter((t) => t.round_id === krogId),
    [tekme, krogId],
  )

  const tekma = useMemo(
    () => tekme.find((t) => t.match_id === tekmaId),
    [tekme, tekmaId],
  )

  async function glasuj(golId: number, playerId: number | null) {
    if (!session) return
    setNapaka(null)

    const { error } = await supabase.from('assist_votes').upsert(
      { goal_id: golId, voter_id: session.user.id, player_id: playerId },
      { onConflict: 'goal_id,voter_id' },
    )
    if (error) return setNapaka(error.message)

    setMojiGlasovi({ ...mojiGlasovi, [golId]: playerId })
    setPravkarOddan(golId)
    setTimeout(() => setPravkarOddan(null), 1200)

    // osveži števce in morebitno potrditev
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
      [golId]: (st ?? []).sort((a, b) => Number(b.votes ?? 0) - Number(a.votes ?? 0)),
    }))
    if (gg)
      setGoli((prej) =>
        prej.map((x) =>
          x.id === golId
            ? { ...x, assist_player_id: gg.assist_player_id, assist: gg.assist }
            : x,
        ),
      )
  }

  if (loading || nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  const nepotrjenih = goli.filter((g) => caka(g, glasovi[g.id] ?? [], pragAsistence)).length

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black naslov">
          {t('tekme.glasovanje.kdoJePodal')}
          {tekmovanje && (
            <span className="ml-2 align-middle text-base font-bold text-slate-500">
              {tekmovanje.short_name}
            </span>
          )}
        </h1>
        <p className="max-w-2xl text-slate-400">
          {tx(
            'tekme.glasovanje.uvod',
            {
              zveza,
              glasov: t('tekme.glasovanje.pragGlasov', { n: pragAsistence }),
            },
            { b: (v) => <strong className="text-gnl-300">{v}</strong> },
          )}
        </p>
      </header>

      {tekme.length === 0 && (
        <div className="kartica p-6 text-center text-sm text-slate-300">
          <p className="mb-2 text-lg font-semibold">
            {t('tekme.glasovanje.niTekem')} <span aria-hidden="true">🎯</span>
          </p>
          <p className="text-slate-400">
            {t('tekme.glasovanje.niTekemOpis')}
          </p>
        </div>
      )}

      {sezone.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {sezone.map((sz) => (
            <button
              key={sz}
              onClick={() => {
                setSezona(sz)
                const prva = tekme.find(
                  (t) => t.season === sz && Number(t.brez_asistence ?? 0) > 0,
                )
                const katerakoli = tekme.find((t) => t.season === sz)
                setKrogId((prva ?? katerakoli)?.round_id ?? null)
              }}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                sezona === sz ? 'bg-gnl-500 text-slate-950' : 'kartica text-slate-300'
              }`}
            >
              {sz}
              {sz !== sezone[0] && (
                <span className="ml-1.5 text-[10px] uppercase opacity-70">
                  {t('tekme.glasovanje.arhiv')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {sezona && sezona !== sezone[0] && (
        <p className="kartica border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          {t('tekme.glasovanje.preteklaSezona')}
        </p>
      )}

      {/* 1. korak: krog */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('tekme.glasovanje.izberiKrog')}
        </h2>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {krogi.map((k) => (
            <button
              key={k.id}
              onClick={() => setKrogId(k.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                krogId === k.id
                  ? 'bg-gnl-500 text-slate-950'
                  : 'kartica text-slate-300'
              }`}
            >
              {t('tekme.krog', { n: k.number })}
              {k.brez_asistence > 0 && k.odprt && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    krogId === k.id
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-amber-400/20 text-amber-300'
                  }`}
                >
                  {k.brez_asistence}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. korak: tekma v krogu */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('tekme.glasovanje.izberiTekmo')}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {tekmeVKrogu.map((tk) => (
            <li key={tk.match_id}>
              <button
                onClick={() => setTekmaId(tk.match_id)}
                className={`flex w-full items-center gap-2 rounded-2xl p-2.5 text-left transition ${
                  tekmaId === tk.match_id
                    ? 'bg-gnl-500/15 ring-1 ring-gnl-400/50'
                    : 'kartica kartica-hover'
                }`}
              >
                <Grb ime={tk.home_name} kratko={tk.home_short} logo={tk.home_logo} velikost={22} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {tk.home_short} – {tk.away_short}
                </span>
                <Grb ime={tk.away_name} kratko={tk.away_short} logo={tk.away_logo} velikost={22} />
                <span className="rounded-lg bg-slate-950/60 px-2 py-0.5 text-sm font-black tabular-nums">
                  {tk.home_goals}:{tk.away_goals}
                </span>
                {Number(tk.brez_asistence ?? 0) === 0 ? (
                  <span className="znacka bg-gnl-400/20 text-gnl-200" aria-label={t('tekme.glasovanje.vsePotrjeno')}>✓</span>
                ) : tk.glasovanje_odprto ? (
                  <span className="znacka bg-amber-400/20 text-amber-300">
                    {tk.brez_asistence}
                  </span>
                ) : (
                  <span className="znacka bg-white/5 text-slate-500">{t('tekme.glasovanje.zaprto')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {!session && (
        <p className="kartica border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          {tx('tekme.moraPrijava', {}, {
            prijava: (v) => (
              <Link
                to={povezavaNaPrijavo(lokacija.pathname + lokacija.search)}
                className="font-semibold underline hover:text-amber-100"
              >
                {v}
              </Link>
            ),
          })}
        </p>
      )}

      {tekma && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gnl-800/50 to-slate-900/50 p-3 text-center ring-1 ring-white/10 sm:gap-4 sm:p-5">
          <Grb ime={tekma.home_name} kratko={tekma.home_short} logo={tekma.home_logo} velikost={32} />
          <span className="min-w-0 flex-1 text-right text-sm font-bold sm:text-base">
            {tekma.home_name}
          </span>
          <span className="rounded-xl bg-slate-950 px-3 py-2 text-xl font-black tabular-nums sm:px-4 sm:text-2xl">
            {tekma.home_goals} : {tekma.away_goals}
          </span>
          <span className="min-w-0 flex-1 text-left text-sm font-bold sm:text-base">
            {tekma.away_name}
          </span>
          <Grb ime={tekma.away_name} kratko={tekma.away_short} logo={tekma.away_logo} velikost={32} />
        </div>
      )}

      {tekma && (
        <p className="text-center">
          <Link
            to={`/match/${tekma.match_id}`}
            className="text-sm text-slate-400 underline hover:text-gnl-300"
          >
            {t('tekme.glasovanje.poglejTekmo')}
          </Link>
        </p>
      )}

      {goli.length === 0 ? (
        <p className="text-slate-400">{t('tekme.glasovanje.niGolov')}</p>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            {nepotrjenih === 0
              ? t('tekme.glasovanje.vsePotrjene')
              : tekma?.glasovanje_odprto === false
                ? t('tekme.glasovanje.zaprtoOpis')
                : t('tekme.glasovanje.brezPotrjene', { goli: mnozina(nepotrjenih, GOLI) })}
          </p>

          <ul className="space-y-4">
            {goli.map((g) => (
              <GolZaGlasovanje
                key={g.id}
                gol={g}
                tekma={tekma}
                kandidati={igralci.filter(
                  (i) =>
                    i.team_id === g.team_id &&
                    i.player_id !== g.scorer?.id &&
                    Number(i.minutes_played ?? 0) > 0,
                )}
                nastopi={igralci}
                glasovi={glasovi[g.id] ?? []}
                mojGlas={mojiGlasovi[g.id]}
                omogoceno={Boolean(session) && Boolean(tekma?.glasovanje_odprto)}
                pravkar={pravkarOddan === g.id}
                onGlasuj={glasuj}
              />
            ))}
          </ul>
        </>
      )}

      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </div>
  )
}
