import { useEffect, useMemo, useState } from 'react'
import { useNastavitev } from '../lib/nastavitve'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import {
  prikazniIme,
  IME_POZICIJE,
  KRATKA_POZICIJA,
  mnozina,
  GOLI,
  TEKME,
} from '../lib/pomozno'
import { useTekmovanje } from '../lib/tekmovanje'
import ProsnjaZaPoznavalca from '../components/ProsnjaZaPoznavalca'
import Grb from '../components/Grb'
import { Link, useLocation } from 'react-router-dom'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import type { Pozicija } from '../lib/tipi'
import { t, tx } from '../i18n'

/** Klub v izbirniku. */
interface Klub {
  id: number
  name: string | null
}

/** Igralec, kot ga prikaze ta stran (`player_overview`). */
interface IgralecPoz {
  id: number
  full_name: string | null
  position: Pozicija | null
  position_source: string | null
  shirt_number: number | null
  minutes: number | null
  goals: number | null
  matches: number | null
  clean_sheets: number | null
  active?: boolean | null
  team_name?: string | null
  team_short?: string | null
  team_logo?: string | null
}

/** Glasovi za enega igralca po pozicijah. */
type GlasoviIgralca = Partial<Record<Pozicija, { votes: number; weight: number }>>

/** Statisticni prior za enega igralca po pozicijah. */
type PrioriIgralca = Partial<Record<Pozicija, number>>

// Privzetka; dejanska pragova povesta `settings` oz. `competition_settings`
// za izbrano ligo (`useNastavitev`). Isti števili sta privzetka tudi v
// `adaptivni_prag` na strežniku.
const PRAG_PRIVZETO = 5
const MIN_PRAG_PRIVZETO = 2
const POZICIJE: Pozicija[] = ['GK', 'DEF', 'MID', 'FWD']

const IKONA: Record<Pozicija, string> = {
  GK: '🧤',
  DEF: '🛡️',
  MID: '⚙️',
  FWD: '🎯',
}

// Ista logika kot v migraciji `adaptivni_prag` — če je prior močan za neko
// pozicijo, prag za to pozicijo pade. Pragova sta last tekmovanja, zato ju
// funkcija dobi od klicatelja in ju ne bere iz kode.
export function adaptivniPrag(priorZaTo: number, prag: number, minPrag: number) {
  if (priorZaTo >= 0.7) return Math.max(minPrag, prag - 3)
  if (priorZaTo >= 0.5) return Math.max(minPrag, prag - 2)
  if (priorZaTo >= 0.3) return Math.max(minPrag, prag - 1)
  return prag
}

export default function Pozicije() {
  const { session, loading } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const lokacija = useLocation()
  useNaslov(t('tekme.pozicije.naslov'))
  const nastavitev = useNastavitev()
  const prag = nastavitev('prag_glasov_pozicija', PRAG_PRIVZETO)
  const minPrag = nastavitev('min_prag_glasov_pozicija', MIN_PRAG_PRIVZETO)
  const [klubi, setKlubi] = useState<Klub[]>([])
  const [klubId, setKlubId] = useState<number | null>(null)
  const [igralci, setIgralci] = useState<IgralecPoz[]>([])
  // player_id -> glasovi po pozicijah
  const [glasovi, setGlasovi] = useState<Record<string, GlasoviIgralca>>({})
  // player_id -> prior po pozicijah
  const [priori, setPriori] = useState<Record<string, PrioriIgralca>>({})
  // player_id -> pozicija, za katero sem glasoval
  const [mojiGlasovi, setMojiGlasovi] = useState<Record<string, Pozicija>>({})
  const [insiderTeamId, setInsiderTeamId] = useState<number | null>(null)
  // Poznavalec lige (ali admin) sme oznaciti, da igralec ne igra vec.
  const [poznavalecLige, setPoznavalecLige] = useState(false)
  const [insiderCompetitionId, setInsiderCompetitionId] = useState<number | null>(null)
  const [mojaUtez, setMojaUtez] = useState<number | null>(null)
  const [mojaTocnost, setMojaTocnost] = useState<{
    correct: number
    resolved: number
  } | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  // Privzeto pokažemo tiste, ki jih je vredno popraviti: brez pozicije in
  // ugibanja iz statistike. Potrjene iz zapisnika glasovanje itak ne premakne.
  const [samoNepotrjene, setSamoNepotrjene] = useState(true)

  useEffect(() => {
    if (!tekmovanjeId) return
    // Klub prejšnje lige v tej morda sploh ne igra — izbira se začne znova.
    setKlubId(null)
    setIgralci([])
    setNalaganje(true)
    let veljavno = true
    supabase
      .from('competition_teams')
      .select('team_id, name')
      .eq('competition_id', tekmovanjeId)
      .order('name')
      .then(({ data }) => {
        if (!veljavno) return
        const seznam: Klub[] = ((data ?? []) as any[]).map((k) => ({
          id: k.team_id,
          name: k.name,
        }))
        setKlubi(seznam)
        setKlubId(seznam[0]?.id ?? null)
        setNalaganje(false)
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  // Profil (insider status) in točnost glasovanja — enkrat ob prijavi.
  useEffect(() => {
    if (!uporabnikId) {
      setInsiderTeamId(null)
      setPoznavalecLige(false)
      setMojaUtez(null)
      setMojaTocnost(null)
      return
    }
    let preklican = false
    ;(async () => {
      const [{ data: profil }, { data: tocnost }] = await Promise.all([
        supabase
          .from('profiles')
          .select('insider_team_id, insider_competition_id, is_admin')
          .eq('id', uporabnikId)
          .maybeSingle(),
        supabase
          .from('voter_position_accuracy')
          .select('resolved, correct')
          .eq('voter_id', uporabnikId)
          .maybeSingle(),
      ])
      if (preklican) return
      setInsiderTeamId(profil?.insider_team_id ?? null)
      setInsiderCompetitionId(profil?.insider_competition_id ?? null)
      setPoznavalecLige(
        Boolean(profil?.is_admin) ||
          (profil?.insider_competition_id != null && profil.insider_competition_id === tekmovanjeId),
      )
      const r = tocnost?.resolved ?? 0
      const c = tocnost?.correct ?? 0
      setMojaTocnost({ resolved: r, correct: c })
      // Ista formula kot voter_weight v migraciji.
      const min = 5
      const max = 2
      if (r < min) setMojaUtez(1.0)
      else setMojaUtez(Math.max(0.5, Math.min(max, 0.5 + (max - 0.5) * (c / r))))
    })()
    return () => { preklican = true }
  }, [uporabnikId, tekmovanjeId])

  useEffect(() => {
    if (!klubId || !tekmovanjeId) return
    const ligaId = tekmovanjeId
    const idKluba = klubId
    let preklican = false

    async function nalozi() {
      const { data: p } = await supabase
        .from('player_overview')
        .select(
          'id, full_name, position, position_source, shirt_number, minutes, goals, matches, clean_sheets, active, team_name, team_short, team_logo',
        )
        .eq('competition_id', ligaId as number)
        .eq('team_id', idKluba as number)
        .order('minutes', { ascending: false })
      if (preklican) return
      setIgralci((p ?? []) as IgralecPoz[])

      const ids = ((p ?? []) as IgralecPoz[]).map((x) => x.id)
      if (!ids.length) return

      // Uteži glasovanja (upoštevajo zaupanje + insider), priori za pozicije.
      const [{ data: st }, { data: pr }] = await Promise.all([
        supabase
          .from('position_vote_weights')
          .select('player_id, position, votes, weight')
          .in('player_id', ids),
        supabase
          .from('position_priors')
          .select('player_id, position, score')
          .in('player_id', ids),
      ])
      if (preklican) return
      const skupine: Record<string, GlasoviIgralca> = {}
      for (const v of (st ?? []) as any[]) {
        const kljuc = String(v.player_id)
        skupine[kljuc] = skupine[kljuc] ?? {}
        skupine[kljuc][v.position as Pozicija] = {
          votes: v.votes,
          weight: Number(v.weight),
        }
      }
      setGlasovi(skupine)

      const priorMap: Record<string, PrioriIgralca> = {}
      for (const v of (pr ?? []) as any[]) {
        const kljuc = String(v.player_id)
        priorMap[kljuc] = priorMap[kljuc] ?? {}
        priorMap[kljuc][v.position as Pozicija] = Number(v.score)
      }
      setPriori(priorMap)

      if (uporabnikId) {
        const { data: moji } = await supabase
          .from('position_votes')
          .select('player_id, position')
          .in('player_id', ids)
          .eq('voter_id', uporabnikId)
        if (preklican) return
        setMojiGlasovi(
          Object.fromEntries(
            (moji ?? []).map((m: any) => [String(m.player_id), m.position]),
          ),
        )
      }
    }
    nalozi()
    return () => {
      preklican = true
    }
    // insiderTeamId je v DEP, ker sprememba insider statusa vpliva na uteži.
  }, [klubId, uporabnikId, insiderTeamId, tekmovanjeId])

  async function nastaviInsider(id: number | null) {
    if (!session) return
    setNapaka(null)
    const { error } = await supabase
      .from('profiles')
      .update({ insider_team_id: id })
      .eq('id', session.user.id)
    if (error) return setNapaka(error.message)
    setInsiderTeamId(id)
  }

  // Odhod: poznavalec lige oznaci, da igralec ne igra vec (ali to preklice).
  // Nastop v zapisniku oznako pobrise sam.
  async function oznaciOdhod(playerId: number, odsel: boolean) {
    setNapaka(null)
    const { error } = await supabase.rpc('oznaci_odhod_igralca', {
      p_player_id: playerId,
      p_odsel: odsel,
    })
    if (error) return setNapaka(error.message)
    setIgralci((prev) => prev.map((i) => (i.id === playerId ? { ...i, active: !odsel } : i)))
  }

  async function glasuj(playerId: number, pozicija: Pozicija) {
    if (!session) return
    setNapaka(null)

    const { error } = await supabase.from('position_votes').upsert(
      { player_id: playerId, voter_id: session.user.id, position: pozicija },
      { onConflict: 'player_id,voter_id' },
    )
    if (error) return setNapaka(error.message)

    setMojiGlasovi({ ...mojiGlasovi, [String(playerId)]: pozicija })

    const [{ data: st }, { data: p }] = await Promise.all([
      supabase
        .from('position_vote_weights')
        .select('player_id, position, votes, weight')
        .eq('player_id', playerId),
      supabase
        .from('players')
        .select('id, position, position_source')
        .eq('id', playerId)
        .single(),
    ])
    setGlasovi((prej) => ({
      ...prej,
      [String(playerId)]: Object.fromEntries(
        ((st ?? []) as any[]).map((v) => [
          v.position,
          { votes: v.votes, weight: Number(v.weight) },
        ]),
      ),
    }))
    if (p)
      setIgralci((prej) =>
        prej.map((x) =>
          x.id === playerId
            ? {
                ...x,
                position: (p.position as Pozicija | null) ?? null,
                position_source: p.position_source,
              }
            : x,
        ),
      )
  }

  const vidni = useMemo(
    () =>
      samoNepotrjene
        ? igralci.filter(
            (i) => !i.position || i.position_source === 'ugibanje',
          )
        : igralci,
    [igralci, samoNepotrjene],
  )

  const stNepotrjenih = igralci.filter(
    (i) => !i.position || i.position_source === 'ugibanje',
  ).length

  if (loading || nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  const insiderVeljaZaKlub = insiderTeamId && insiderTeamId === klubId

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black naslov">
          {t('tekme.pozicije.kjeKdoIgra')}
          {tekmovanje && (
            <span className="ml-2 align-middle text-base font-bold text-slate-500">
              {tekmovanje.short_name}
            </span>
          )}
        </h1>
        <p className="max-w-2xl text-slate-400">
          {tx(
            'tekme.pozicije.uvod',
            { prag, minPrag },
            { b: (v) => <strong className="text-gnl-300">{v}</strong> },
          )}
        </p>
        <p className="max-w-2xl rounded-xl bg-white/5 p-3 text-sm text-slate-400">
          <span aria-hidden="true">⏳</span>{' '}
          {tx('tekme.pozicije.enkratNaTeden', {}, {
            b: (v) => <strong>{v}</strong>,
            ikona: (v) => <span aria-hidden="true">{v}</span>,
          })}
        </p>
      </header>

      {session && (
        <MojStatus
          klubi={klubi}
          insiderTeamId={insiderTeamId}
          onNastaviInsider={nastaviInsider}
          utez={mojaUtez}
          tocnost={mojaTocnost}
          prosnja={
            tekmovanjeId ? (
              <ProsnjaZaPoznavalca
                competitionId={tekmovanjeId}
                klubi={klubi}
                insiderCompetitionId={insiderCompetitionId}
              />
            ) : null
          }
        />
      )}

      <div className="kartica flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-48 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('tekme.pozicije.klub')}
          </span>
          <select
            value={klubId ?? ''}
            onChange={(e) => setKlubId(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100"
          >
            {klubi.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
                {insiderTeamId === k.id ? t('tekme.pozicije.poznavalecOznaka') : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={samoNepotrjene}
            onChange={(e) => setSamoNepotrjene(e.target.checked)}
            className="h-4 w-4 rounded accent-gnl-400"
          />
          {t('tekme.pozicije.samoIzStatistike', { n: stNepotrjenih })}
        </label>
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

      {vidni.length === 0 ? (
        <p className="kartica p-6 text-center text-slate-400">
          {samoNepotrjene
            ? t('tekme.pozicije.vsiPotrjeni')
            : t('tekme.pozicije.niIgralcev')}
        </p>
      ) : (
        <ul className="space-y-3">
          {vidni.map((i) => (
            <IgralecKartica
              key={i.id}
              igralec={i}
              glasovi={glasovi[i.id] ?? {}}
              prior={priori[i.id] ?? null}
              mojGlas={mojiGlasovi[i.id]}
              omogoceno={Boolean(session)}
              insiderVelja={Boolean(insiderVeljaZaKlub)}
              poznavalecLige={poznavalecLige}
              onGlasuj={glasuj}
              onOdhod={oznaciOdhod}
            />
          ))}
        </ul>
      )}

      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </div>
  )
}

function MojStatus({
  klubi,
  insiderTeamId,
  onNastaviInsider,
  utez,
  tocnost,
  prosnja,
}: {
  klubi: Klub[]
  insiderTeamId: number | null
  onNastaviInsider: (id: number | null) => void
  utez: number | null
  tocnost: { correct: number; resolved: number } | null
  prosnja?: React.ReactNode
}) {
  return (
    <div className="kartica space-y-3 border-gnl-400/20 bg-gnl-500/5 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gnl-200">{t('tekme.pozicije.status.naslov')}</h2>
        {utez != null && (
          <span
            title={t('tekme.pozicije.status.utezOpis')}
            className="znacka bg-white/10 text-slate-200"
          >
            {t('tekme.pozicije.status.utez', { utez: utez.toFixed(2) })}
            {tocnost && tocnost.resolved > 0 && (
              <span className="ml-1 text-[10px] text-slate-400">
                {t('tekme.pozicije.status.tocnih', { pravilni: tocnost.correct, vsi: tocnost.resolved })}
              </span>
            )}
          </span>
        )}
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-400">
          {t('tekme.pozicije.status.klubPoznam')}
        </span>
        <select
          value={insiderTeamId ?? ''}
          onChange={(e) =>
            onNastaviInsider(e.target.value ? Number(e.target.value) : null)
          }
          className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100"
        >
          <option value="">{t('tekme.pozicije.status.nisemPoznavalec')}</option>
          {klubi.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] leading-snug text-slate-500">
        {t('tekme.pozicije.status.opomba')}
      </p>
      {prosnja}
    </div>
  )
}

function IgralecKartica({
  igralec,
  glasovi,
  prior,
  mojGlas,
  omogoceno,
  insiderVelja,
  poznavalecLige,
  onGlasuj,
  onOdhod,
}: {
  igralec: IgralecPoz
  glasovi: GlasoviIgralca
  prior: PrioriIgralca | null
  mojGlas?: Pozicija
  omogoceno: boolean
  insiderVelja: boolean
  poznavalecLige: boolean
  onGlasuj: (playerId: number, pozicija: Pozicija) => void
  onOdhod: (playerId: number, odsel: boolean) => void
}) {
  // Pragova pripadata ligi; `useNastavitev` ju naloži enkrat za vse kartice.
  const nastavitev = useNastavitev()
  const prag = nastavitev('prag_glasov_pozicija', PRAG_PRIVZETO)
  const minPrag = nastavitev('min_prag_glasov_pozicija', MIN_PRAG_PRIVZETO)
  const pragZaPrior = (p: number) => adaptivniPrag(p, prag, minPrag)

  // Zapisnika in ročnega vnosa administratorja glasovanje ne premakne; vse
  // ostalo (neznano, ugibanje, prejšnje glasovanje) je mogoče popraviti.
  const izZapisnika = igralec.position_source === 'zapisnik'
  const zaklenjeno = izZapisnika || igralec.position_source === 'admin'
  const ugibano = igralec.position_source === 'ugibanje'
  const potrjeno = Boolean(igralec.position)
  // Vodilna pozicija po SEŠTETIH UTEŽEH (ne surovih glasovih).
  const vodilna = (
    Object.entries(glasovi) as Array<[Pozicija, { votes: number; weight: number }]>
  )
    .map(([p, v]) => [p, v.weight ?? v.votes ?? 0] as [Pozicija, number])
    .sort((a, b) => b[1] - a[1])[0]

  const priorVodilna = prior
    ? (Object.entries(prior) as Array<[Pozicija, number]>).sort(
        (a, b) => b[1] - a[1],
      )[0]
    : null

  // Glas pozicije ne premakne takoj — zbrani se uveljavijo enkrat na teden, v
  // ponedeljek zjutraj, da se liga med tednom ne spreminja pod prsti. Brez tega
  // opozorila bi uporabnik videl zbran prag in nič se ne bi zgodilo.
  const cakaUveljavitve =
    !zaklenjeno &&
    vodilna &&
    vodilna[0] !== igralec.position &&
    vodilna[1] >= pragZaPrior(prior?.[vodilna[0]] ?? 0)

  return (
    <li className="kartica kartica-hover p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Grb
          ime={igralec.team_name}
          kratko={igralec.team_short}
          logo={igralec.team_logo}
          velikost={28}
        />
        {igralec.shirt_number != null && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-black tabular-nums text-slate-400">
            {igralec.shirt_number}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/igralec/${igralec.id}`}
            className="block truncate font-bold hover:text-gnl-300"
          >
            {prikazniIme(igralec.full_name)}
          </Link>
          <div className="text-xs text-slate-500">
            {t('tekme.pozicije.igralec.statistika', {
              tekme: mnozina(igralec.matches ?? 0, TEKME),
              minute: igralec.minutes ?? 0,
              goli: mnozina(igralec.goals ?? 0, GOLI),
              cs: igralec.clean_sheets ?? 0,
            })}
          </div>
        </div>

        {potrjeno && (
          <span
            className={`znacka ${igralec.position ? `poz-${igralec.position}` : 'poz-none'}`}
            title={
              izZapisnika
                ? t('tekme.pozicije.igralec.izZapisnika')
                : ugibano
                  ? t('tekme.pozicije.igralec.izStatistike')
                  : t('tekme.pozicije.igralec.potrdilaSkupnost')
            }
          >
            <span aria-hidden="true">
              {igralec.position ? IKONA[igralec.position] : '❔'}
            </span>{' '}
            {igralec.position && (
              <abbr title={IME_POZICIJE[igralec.position]} className="no-underline">
                {KRATKA_POZICIJA[igralec.position]}
              </abbr>
            )}
            {izZapisnika && t('tekme.pozicije.igralec.zapisnik')}
          </span>
        )}

        {cakaUveljavitve && (
          <span
            className="znacka bg-amber-400/20 text-amber-200"
            title={t('tekme.pozicije.igralec.uveljavitevOpis')}
          >
            <span aria-hidden="true">⏳</span>{' '}
            {t('tekme.pozicije.igralec.izglasovano', { pozicija: KRATKA_POZICIJA[vodilna[0]] })}
          </span>
        )}

        {igralec.active === false && (
          <span
            className="znacka bg-slate-700/60 text-slate-300"
            title={t('tekme.pozicije.igralec.neIgraOpis')}
          >
            {t('tekme.pozicije.igralec.neIgra')}
          </span>
        )}
        {poznavalecLige &&
          (igralec.active === false ? (
            <button
              onClick={() => onOdhod(igralec.id, false)}
              className="gumb-tih text-xs"
              title={t('tekme.pozicije.igralec.vrniOpis')}
            >
              {t('tekme.pozicije.igralec.vrni')}
            </button>
          ) : (
            <button
              onClick={() => onOdhod(igralec.id, true)}
              className="text-xs text-slate-400 hover:text-rose-300"
              title={t('tekme.pozicije.igralec.odhodOpis')}
            >
              {t('tekme.pozicije.igralec.neIgra')}
            </button>
          ))}
      </div>

      {!zaklenjeno && priorVodilna && priorVodilna[1] >= 0.30 && (
        <p className="mt-2 text-xs text-slate-500">
          {tx(
            'tekme.pozicije.igralec.statistikaKaze',
            {
              pozicija: IME_POZICIJE[priorVodilna[0]],
              odstotek: Math.round(priorVodilna[1] * 100),
              nizji: pragZaPrior(priorVodilna[1]),
              prag,
            },
            { b: (v) => <strong className="text-slate-300">{v}</strong> },
          )}
        </p>
      )}

      {!zaklenjeno && potrjeno && !priorVodilna && (
        <p className="mt-2 text-xs text-slate-500">
          {ugibano
            ? t('tekme.pozicije.igralec.dolocenaIzStatistike')
            : t('tekme.pozicije.igralec.dolocilaSkupnost')}
        </p>
      )}

      {!zaklenjeno && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {POZICIJE.map((p) => {
            const g = glasovi[p]
            const votes = g?.votes ?? 0
            const weight = g?.weight ?? 0
            const priorZa = prior?.[p] ?? 0
            const pragZa = pragZaPrior(priorZa)
            const izbran = mojGlas === p
            const delez = Math.min(100, (weight / pragZa) * 100)
            const potrjenBiVajino = weight >= pragZa
            return (
              <button
                key={p}
                onClick={() => onGlasuj(igralec.id, p)}
                disabled={!omogoceno}
                aria-pressed={izbran}
                title={
                  t('tekme.pozicije.igralec.gumbUtez', { utez: weight.toFixed(1), prag: pragZa }) +
                  (priorZa
                    ? t('tekme.pozicije.igralec.gumbPrior', { odstotek: Math.round(priorZa * 100) })
                    : '') +
                  (insiderVelja ? t('tekme.pozicije.igralec.gumbPoznavalec') : '')
                }
                className={`relative overflow-hidden rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                  izbran
                    ? 'ring-2 ring-gnl-400'
                    : potrjenBiVajino
                      ? 'ring-2 ring-emerald-400/60'
                      : 'ring-1 ring-white/10 hover:ring-white/30'
                } poz-${p}`}
              >
                {/* Napredek do praga (utežno). */}
                <span
                  className="absolute inset-y-0 left-0 bg-white/15 transition-all duration-300"
                  style={{ width: `${delez}%` }}
                  aria-hidden
                />
                {/* Prior — tanka črtica na dnu. */}
                {priorZa > 0 && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-1 bg-slate-100/40"
                    style={{ width: `${Math.round(priorZa * 100)}%` }}
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center justify-center gap-1">
                  <span aria-hidden="true">{IKONA[p]}</span> {KRATKA_POZICIJA[p]}
                  {votes > 0 && (
                    <span className="tabular-nums opacity-70">
                      {weight.toFixed(1)}
                    </span>
                  )}
                  {izbran && <span aria-hidden="true">✓</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!potrjeno && vodilna && (
        <p className="mt-2 text-xs text-slate-500">
          {t('tekme.pozicije.igralec.vodi', {
            pozicija: IME_POZICIJE[vodilna[0]],
            utez: vodilna[1].toFixed(1),
            prag: pragZaPrior(prior?.[vodilna[0]] ?? 0),
          })}
        </p>
      )}
    </li>
  )
}
