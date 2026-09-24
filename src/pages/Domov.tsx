import { useEffect, useState } from 'react'
import Prispevek from '../components/Prispevek'
import { imeZveze } from '../components/VirPodatkov'
import { sestaviVabilo, vabiloMailto } from '../lib/vabilo'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { vseVrstice } from '../lib/strani'
import { PRAVILA_OPIS } from '../lib/tockovanje'
import {
  prikazniIme,
  formatirajTocke,
  formatirajCeno,
  mnozina,
  KRATKA_POZICIJA,
  GOLI,
  IGRALCI,
  TEKME,
  tockZ,
} from '../lib/pomozno'
import { useTekmovanje } from '../lib/tekmovanje'
import { useNastavitev } from '../lib/nastavitve'
import { useNaslov } from '../lib/naslov'
import { PRAG_ASISTENCE_PRIVZETO } from '../components/GolZaGlasovanje'
import Grb from '../components/Grb'
import Klepet from '../components/Klepet'
import Odstevanje from '../components/Odstevanje'
import EnajstericaNaIgriscu from '../components/EnajstericaNaIgriscu'
import type { IgralecEnajsterice } from '../components/EnajstericaNaIgriscu'
import type { Pozicija } from '../lib/tipi'
import { t, tx, datum } from '../i18n'

/** Stevilke v pasu na vrhu naslovnice. */
interface Statistika {
  tekme: number
  igralci: number
  goli: number
  brezAsistence: number
  brezPozicije: number
}

/** Igralec v eni od treh lestvic (strelci, podajalci, obrambe). */
interface VrhIgralec {
  id: number
  full_name: string | null
  team_name?: string | null
  team_short?: string | null
  team_logo?: string | null
  position?: Pozicija | null
  value?: number | null
  goals?: number | null
  assists?: number | null
  clean_sheets?: number | null
  minutes?: number | null
}

/** Krog, kot ga rabi naslovnica. */
interface KrogPodatek {
  id: number
  number: number | null
  season: string | null
  played_on: string | null
  deadline_at?: string | null
}

/** Današnji datum v Ljubljani (YYYY-MM-DD) — tekme so zapisane po lokalnem koledarju. */
function danesVLjubljani(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Ljubljana' })
}

/** Kratka oznaka pozicije (VRA/BRA/VEZ/NAP), kakor jo kažejo ostale strani. */
function kratkaPozicija(p: string | null | undefined): string {
  return (p && KRATKA_POZICIJA[p as Pozicija]) || (p ?? '')
}

export default function Domov() {
  useNaslov(null)
  const { id: tekmovanjeId, tekmovanje, tekmovanja } = useTekmovanje()
  const zveza = imeZveze(tekmovanje)
  const [klubiLige, setKlubiLige] = useState<string[]>([])
  const vabilo = vabiloMailto(sestaviVabilo(tekmovanje, klubiLige))

  // Klube beremo samo za vabilo; brez njih vabilo ostane smiselno, le brez
  // seznama imen.
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
  const [stat, setStat] = useState<Statistika | null>(null)
  const [zvezde, setZvezde] = useState<VrhIgralec[]>([])
  const [podajalci, setPodajalci] = useState<VrhIgralec[]>([])
  const [obrambe, setObrambe] = useState<VrhIgralec[]>([])
  const [krog, setKrog] = useState<KrogPodatek | null>(null)
  const [krogNajboljsi, setKrogNajboljsi] = useState<any[]>([])
  const [igralecSezone, setIgralecSezone] = useState<any[]>([])
  const [idealnaPostava, setIdealnaPostava] = useState<IgralecEnajsterice[]>(
    [],
  )
  const [naslednjeTekme, setNaslednjeTekme] = useState<any[]>([])
  const [zadnjiRezultati, setZadnjiRezultati] = useState<any[]>([])
  const [naslednjiKrog, setNaslednjiKrog] = useState<KrogPodatek | null>(null)
  const [tekocaSezona, setTekocaSezona] = useState('')
  // Ali je tekoča sezona že odigrala vsaj en krog. `null`, dokler ne vemo —
  // takrat ne kažemo ne predsezonske kartice ne poziva za zamudnike.
  const [sezonaTece, setSezonaTece] = useState<boolean | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const prag = useNastavitev()('prag_glasov_asistenca', PRAG_ASISTENCE_PRIVZETO)

  useEffect(() => {
    if (!tekmovanjeId) return
    const ligaId = tekmovanjeId
    // Hiter preklop lig: odgovor prejšnje lige ne sme povoziti nove.
    let veljavno = true
    setNapaka(null)
    setSezonaTece(null)
    async function nalozi() {
      // Ob zamenjavi lige se naloži vse od začetka, zato gre v en sam val
      // vse, kar ne potrebuje sezone ali kroga. Prej je bilo šest zaporednih
      // valov in vsak je čakal prejšnjega: na članih 3.4 s namesto 1.2 s.
      // Odvisna sta le dva — lestvice sezone (rabijo sezono) in najboljši
      // kroga (rabi id kroga) — in ta dva gresta skupaj v drugi val.

      // Tekme in goli tekmovanja ne nosijo neposredno — do njega pridemo prek
      // kroga, zato notranji spoj (`!inner`) namesto navadnega štetja.
      const [
        sezonaPodatek,
        tekme,
        igralci,
        goli,
        brezAsistence,
        brezPozicije,
        nextRoundOdgovor,
        zadnjiOdgovor,
        prihajajoceOdgovor,
        nedavnoOdgovor,
        klubiOdgovor,
        krogiOdgovor,
      ] = await Promise.all([
          supabase
            .from('sezone')
            .select('season')
            .eq('competition_id', ligaId)
            .eq('tekoca', true)
            .maybeSingle(),
          supabase
            .from('matches')
            .select('id, rounds!inner(competition_id)', {
              count: 'exact',
              head: true,
            })
            .eq('rounds.competition_id', ligaId),
          supabase
            .from('players')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', ligaId),
          supabase
            .from('goals')
            .select('id, matches!inner(rounds!inner(competition_id))', {
              count: 'exact',
              head: true,
            })
            .eq('matches.rounds.competition_id', ligaId),
          // Samo tekme, ki so bile odigrane v zadnjih 21 dneh — sicer 704
          // nerešenih iz prejšnje sezone večno visijo v obvestilu.
          supabase
            .from('match_assist_status')
            .select('brez_asistence, played_on')
            .eq('competition_id', ligaId)
            .gte(
              'played_on',
              new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
            ),
          // Igralci, ki jim je pozicijo doslej le ugibal uvoz. Pozicija
          // odloca, koliko je vreden gol, zato ni kozmeticna.
          supabase
            .from('player_overview')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', ligaId)
            .eq('position_source', 'ugibanje')
            .eq('active', true)
            .gt('minutes', 0),
          // Naslednji krog — za odštevalnik do zaklepanja postave.
          supabase
            .from('naslednji_krog')
            .select('id, number, season, played_on, deadline_at')
            .eq('competition_id', ligaId)
            .maybeSingle(),
          // Zadnji odigrani krog — za najboljše kroga in idealno enajsterico.
          supabase
            .from('zadnji_odigrani_krog')
            .select('id, season, number, played_on')
            .eq('competition_id', ligaId)
            .maybeSingle(),
          // Naslednje tekme (neuvožene) + zadnji rezultati (uvožene v 14 dneh).
          supabase
            .from('matches')
            .select(
              'id, round_id, home_team_id, away_team_id, played_on, home_goals, away_goals, rounds!inner(competition_id)',
            )
            .eq('rounds.competition_id', ligaId)
            .is('imported_at', null)
            // Brez spodnje meje bi se med "naslednjimi" znašle neuvožene
            // tekme iz preteklih krogov (odpovedane, preložene, nikoli
            // objavljene) — in kot prve, ker so najstarejše.
            // Tekme brez datuma (razpored še ni objavljen) ostanejo — na koncu.
            .or(`played_on.gte.${danesVLjubljani()},played_on.is.null`)
            .order('played_on', { ascending: true, nullsFirst: false })
            .order('round_id', { ascending: true })
            .limit(30),
          supabase
            .from('matches')
            .select(
              'id, round_id, home_team_id, away_team_id, played_on, home_goals, away_goals, rounds!inner(competition_id)',
            )
            .eq('rounds.competition_id', ligaId)
            .not('imported_at', 'is', null)
            .gte(
              'played_on',
              new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
            )
            .order('played_on', { ascending: false })
            .limit(30),
          supabase
            .from('competition_teams')
            .select('team_id, name, short_name, logo_url')
            .eq('competition_id', ligaId),
          supabase
            .from('rounds')
            .select('id, season, number, played_on')
            .eq('competition_id', ligaId),
        ])
      if (!veljavno) return
      const tekocaSezona = sezonaPodatek.data?.season ?? ''
      setTekocaSezona(tekocaSezona)
      setStat({
        tekme: tekme.count ?? 0,
        igralci: igralci.count ?? 0,
        goli: goli.count ?? 0,
        brezAsistence: ((brezAsistence.data ?? []) as any[]).reduce(
          (v: number, x) => v + Number(x.brez_asistence ?? 0),
          0,
        ),
        brezPozicije: brezPozicije.count ?? 0,
      })
      setNaslednjiKrog((nextRoundOdgovor.data as KrogPodatek | null) ?? null)

      const prihajajoce = prihajajoceOdgovor.data
      const nedavno = nedavnoOdgovor.data
      const vsiKlubi = klubiOdgovor.data
      const vsiKrogi = krogiOdgovor.data
      const klubPo: Record<string, any> = Object.fromEntries(
        ((vsiKlubi ?? []) as any[]).map((k) => [
          String(k.team_id),
          { ...k, id: k.team_id },
        ]),
      )
      const krogPo: Record<string, any> = Object.fromEntries(
        ((vsiKrogi ?? []) as any[]).map((k) => [String(k.id), k]),
      )
      const obogati = (m: any) => ({
        ...m,
        home: klubPo[String(m.home_team_id)],
        away: klubPo[String(m.away_team_id)],
        krog: krogPo[String(m.round_id)],
      })
      // Placeholderji iz uvoz-razporeda (imported_at IS NULL) so pogosto
      // dvojnik uvoženih tekem. Iztlačimo tiste, za katere OBSTAJA uvožena
      // tekma z istimi ekipami na isti dan.
      const uvozeniKljuc = new Set<string>(
        ((nedavno ?? []) as any[]).map(
          (m) =>
            `${m.home_team_id}-${m.away_team_id}-${m.played_on ?? ''}`,
        ),
      )
      const cistoNove = (prihajajoce ?? []).filter(
        (m) =>
          // Obe ekipi morata biti v ligi. V razporedu se znajde tudi vrstica
          // z ekipo, ki jo `competition_teams` ne pozna (npr. tisti krog
          // počiva) — brez tega filtra bi se izrisala tekma z "?".
          klubPo[String(m.home_team_id)] &&
          klubPo[String(m.away_team_id)] &&
          !uvozeniKljuc.has(
            `${m.home_team_id}-${m.away_team_id}-${m.played_on ?? ''}`,
          ),
      )
      setNaslednjeTekme(cistoNove.map(obogati))
      setZadnjiRezultati((nedavno ?? []).map(obogati))

      // Kdo je bil najboljši v zadnjem odigranem krogu.
      const zadnji = zadnjiOdgovor.data
      // Pogled vraca nullable stolpce; brez id-ja kroga ni.
      const krogOk: KrogPodatek | null =
        zadnji && zadnji.id != null
          ? {
              id: zadnji.id,
              number: zadnji.number,
              season: zadnji.season,
              played_on: zadnji.played_on,
            }
          : null
      setKrog(krogOk)
      // `zadnji_odigrani_krog` pred prvim krogom vrne zadnjega lanskega.
      setSezonaTece(Boolean(krogOk && tekocaSezona && krogOk.season === tekocaSezona))

      // Drugi val: oboje je odvisno od prvega (sezona, id kroga), zato gresta
      // skupaj. `player_season_standings` je najdražji pogled v aplikaciji
      // (~1.2 s) — prej smo ga za štiri lestvice klicali štirikrat, čeprav so
      // vse iz istih vrstic; zdaj ga preberemo enkrat in uredimo v brskalniku.
      const [sezonaVrstice, najboljsiOdgovor] = await Promise.all([
        // Po straneh: 1. SML ima čez 500 igralcev in vrh bi tiho ostal brez
        // tistih za mejo.
        vseVrstice((od, do_) =>
          supabase
            .from('player_season_standings')
            .select(
              'id, full_name, team_name, team_short, team_logo, position, value,' +
                ' goals, assists, clean_sheets, points, minutes, matches',
            )
            .eq('competition_id', ligaId)
            .eq('season', tekocaSezona)
            .order('id')
            .range(od, do_),
        ),
        krogOk
          ? supabase
              .from('krog_najboljsi')
              .select(
                'player_id, full_name, position, team_name, team_short, team_logo, points, minutes, price_delta, rank',
              )
              .eq('round_id', krogOk.id)
              .order('points', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: null }),
      ])
      if (!veljavno) return

      // Minute so povsod razsodnik ob izenačenju — enako kot prej v SQL.
      const vrh = (stolpec: 'goals' | 'assists' | 'clean_sheets' | 'points') =>
        [...(sezonaVrstice as any[])]
          .sort(
            (a, b) =>
              Number(b[stolpec] ?? 0) - Number(a[stolpec] ?? 0) ||
              Number(b.minutes ?? 0) - Number(a.minutes ?? 0),
          )
          .slice(0, 5)
      setZvezde(vrh('goals') as VrhIgralec[])
      setPodajalci(vrh('assists') as VrhIgralec[])
      setObrambe(vrh('clean_sheets') as VrhIgralec[])
      setIgralecSezone(vrh('points'))

      if (krogOk) {
        const najboljsi = najboljsiOdgovor.data
        setKrogNajboljsi(((najboljsi ?? []) as any[]).slice(0, 5))

        // Idealna enajsterica: 1 GK + top 4 DEF + top 4 MID + top 2 FWD
        // po točkah v zadnjem odigranem krogu. Če je pozicij premalo,
        // dopolni z ostalimi najboljšimi. Pokaže, kaj se sistem šteje
        // za "the team of the week".
        const poPozicijah: Record<Pozicija, any[]> = {
          GK: [],
          DEF: [],
          MID: [],
          FWD: [],
        }
        for (const p of (najboljsi ?? []) as any[]) {
          const poz = p.position as Pozicija | null
          if (poz && poPozicijah[poz]) poPozicijah[poz].push(p)
        }
        const izbrani: any[] = [
          ...poPozicijah.GK.slice(0, 1),
          ...poPozicijah.DEF.slice(0, 4),
          ...poPozicijah.MID.slice(0, 4),
          ...poPozicijah.FWD.slice(0, 2),
        ]
        // Če je premalo (redke pozicije brez podatkov), dopolni s top preostalimi.
        const uporabljeni = new Set(izbrani.map((p) => p.player_id))
        for (const p of (najboljsi ?? []) as any[]) {
          if (izbrani.length >= 11) break
          if (!uporabljeni.has(p.player_id)) izbrani.push(p)
        }
        setIdealnaPostava(izbrani as IgralecEnajsterice[])
      } else {
        setKrogNajboljsi([])
        setIdealnaPostava([])
      }
    }
    nalozi().catch((e: unknown) => {
      if (veljavno)
        setNapaka(e instanceof Error ? e.message : t('domov.napakaNalaganja'))
    })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  // Pred prvim krogom: datum začetka iz naslednjega kroga (tekma ali rok).
  const zacetekSezone = naslednjiKrog?.played_on ?? naslednjiKrog?.deadline_at ?? null

  return (
    <div className="space-y-10">
      {/* uvod */}
      <section className="relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:p-8">
        {/* Amaterska tekma pod reflektorji — natanko to, o čemer je liga. */}
        <img
          src="/foto/igrisce.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-950/75 to-gnl-900/80"
          aria-hidden
        />
        <div className="relative space-y-4">
          <img
            src="/logo/slff-grb.png"
            alt={t('aplikacija.naslovStrani.osnova')}
            className="h-24 w-24 drop-shadow-xl sm:h-32 sm:w-32"
          />
          {/* Dokler se lige nalagajo, ne vemo, katera je izbrana — nevtralen
              obris namesto gorenjskega imena, ki bi obiskovalcu druge lige
              za hip pokazal napačno ligo. */}
          {!tekmovanje ? (
            <span
              className="znacka inline-block h-6 w-48 animate-pulse bg-white/10"
              aria-hidden
            />
          ) : (
            <span className="znacka bg-gnl-400/20 text-gnl-200">
              {/* Gorenjski besedili sta oglasni in ostaneta natanko taki, kot
                  sta bili; druga zveza dobi ime svoje lige. */}
              {tekmovanje.federation_code === 'mnzg'
                ? tekmovanje.slug === 'mladinci'
                  ? t('domov.uvod.gorenjskaMladinci')
                  : t('domov.uvod.gorenjskaClani')
                : tekmovanje.name}
            </span>
          )}
          <h1 className="text-4xl font-black leading-tight naslov sm:text-5xl">
            Sunday League
            <br />
            Fantasy Football
          </h1>
          <p className="text-lg font-semibold text-gnl-300">
            {t('domov.uvod.geslo')}
          </p>
          <p className="max-w-xl text-slate-300">{t('domov.uvod.opis', { zveza })}</p>
          {tekmovanja.length > 1 && (
            <p className="text-sm text-slate-400">
              <span aria-hidden>👉</span>{' '}
              {tx('domov.uvod.vecLig', {}, { krepko: (b) => <strong>{b}</strong> })}
            </p>
          )}
          {/* Pred sezono: kdaj se začne in do kdaj sestaviti ekipo. */}
          {sezonaTece === false && zacetekSezone && (
            <div className="rounded-2xl border border-gnl-400/40 bg-gnl-500/10 p-3 text-sm text-gnl-100 backdrop-blur">
              <span aria-hidden>📅</span>{' '}
              {tx(
                'domov.uvod.zacetekSezone',
                { datum: datum(zacetekSezone, { day: 'numeric', month: 'long', year: 'numeric' }) },
                { krepko: (b) => <strong>{b}</strong> },
              )}
            </div>
          )}
          {/* Poziv za zamudnike — v hero, da ga vidi vsak prvič obiskovalec.
              Smisel ima šele, ko je odigran vsaj prvi krog. */}
          {sezonaTece && (
            <div className="rounded-2xl border border-gnl-400/40 bg-gnl-500/10 p-3 text-sm text-gnl-100 backdrop-blur">
              <span aria-hidden>🏁</span>{' '}
              {tx('domov.uvod.zamudniki', {}, {
                krepko: (b) => <strong>{b}</strong>,
                lestvica: (b) => (
                  <Link to="/lestvica" className="underline">
                    {b}
                  </Link>
                ),
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/moja-ekipa" className="gumb-glavni">
              {t('domov.uvod.sestaviEkipo')}
            </Link>
            <Link to="/glasovanje" className="gumb-tih">
              {t('domov.uvod.glasuj')}
            </Link>
            <Link to="/rezultati" className="gumb-tih">
              {t('domov.uvod.rezultati')}
            </Link>
          </div>
        </div>
      </section>

      {napaka && (
        <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/30">
          {t('domov.delNiNalozen', { napaka })}
        </p>
      )}

      {/* glasovanje o asistencah je edino, kar liga potrebuje od ljudi */}
      {stat && stat.brezAsistence > 0 && (
        <Link
          to="/glasovanje"
          className="block overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 to-rose-500/10
                     p-5 ring-1 ring-amber-400/40 transition hover:ring-amber-300/70 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-4xl sm:text-5xl" aria-hidden>🅰️</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black text-amber-100 sm:text-2xl">
                {t('domov.asistence.cakajo', { n: stat.brezAsistence })}
              </h2>
              <p className="mt-1 text-sm text-amber-100/80">
                {tx('domov.asistence.opis', {}, { krepko: (b) => <strong>{b}</strong> })}
              </p>
            </div>
            <span className="gumb-glavni shrink-0">{t('domov.asistence.glasujZdaj')}</span>
          </div>
        </Link>
      )}

      {/* odštevalnik do zaklepanja postave naslednjega kroga */}
      {naslednjiKrog?.deadline_at && (
        <Link
          to="/moja-ekipa"
          className="block overflow-hidden rounded-3xl bg-gradient-to-r from-gnl-500/15 to-gnl-800/10 p-4 ring-1 ring-gnl-400/30 transition hover:ring-gnl-300/60 sm:p-5"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl" aria-hidden>⏱️</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-bold text-gnl-200">
                  {t('domov.rok.seZaklene', { krog: naslednjiKrog.number })}
                </span>
                <Odstevanje do={naslednjiKrog.deadline_at} />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {tx('domov.rok.opis', {}, {
                  uredi: (b) => <span className="underline">{b}</span>,
                })}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* zadnji rezultati — odigrane tekme zadnjih 14 dni */}
      {zadnjiRezultati.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{t('domov.zadnjiRezultati.naslov')}</h2>
            <Link
              to="/rezultati"
              className="text-sm font-semibold text-gnl-300 hover:text-gnl-200"
            >
              {t('domov.zadnjiRezultati.vsi')}
            </Link>
          </div>
          <div className="space-y-4">
            {(() => {
              const poKrogu = new Map()
              for (const tekma of zadnjiRezultati) {
                const key = tekma.krog?.id ?? 0
                if (!poKrogu.has(key))
                  poKrogu.set(key, { krog: tekma.krog, tekme: [] })
                poKrogu.get(key).tekme.push(tekma)
              }
              return [...poKrogu.values()]
                .sort((a, b) => (b.krog?.number ?? 0) - (a.krog?.number ?? 0))
                .slice(0, 2)
                .map(({ krog, tekme }) => (
                  <div key={krog?.id ?? 'brez'} className="kartica p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-bold text-gnl-300">
                        {krog ? t('domov.krog', { krog: krog.number }) : t('domov.brezKroga')}
                        {krog?.season && (
                          <span className="ml-2 font-normal text-slate-500">
                            {krog.season}
                          </span>
                        )}
                      </span>
                      {krog?.played_on && (
                        <span className="text-xs text-slate-500">
                          {datum(krog.played_on, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {tekme.map((tekma: any) => (
                        <li key={tekma.id}>
                          <Link
                            to={`/tekma/${tekma.id}`}
                            title={t('domov.zadnjiRezultati.poglejTekmo')}
                            className="flex items-center gap-2 rounded-lg bg-white/5 p-2 text-sm transition hover:bg-white/10"
                          >
                            <div className="flex flex-1 items-center justify-end gap-2 truncate">
                              <span className="truncate font-semibold">
                                {tekma.home?.name ?? '?'}
                              </span>
                              <Grb
                                ime={tekma.home?.name}
                                kratko={tekma.home?.short_name}
                                logo={tekma.home?.logo_url}
                                velikost={22}
                              />
                            </div>
                            <span className="shrink-0 rounded-lg bg-slate-950/60 px-2 py-0.5 text-sm font-black tabular-nums">
                              {tekma.home_goals}:{tekma.away_goals}
                            </span>
                            <div className="flex flex-1 items-center gap-2 truncate">
                              <Grb
                                ime={tekma.away?.name}
                                kratko={tekma.away?.short_name}
                                logo={tekma.away?.logo_url}
                                velikost={22}
                              />
                              <span className="truncate font-semibold">
                                {tekma.away?.name ?? '?'}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
            })()}
          </div>
        </section>
      )}

      {/* Igralec kroga + sezonske lestvice + igralec sezone.
          Mobilno: vodoravni "carousel" — po eno kartico naenkrat, prst povleče
          vstran (snap). Prej so se vse zložile ena pod drugo in nastal je
          en neskončen seznam "kot Excel".
          lg: mreža 2×2, kot doslej. */}
      {(krogNajboljsi.length > 0 ||
        zvezde.length > 0 ||
        podajalci.length > 0 ||
        obrambe.length > 0 ||
        igralecSezone.length > 0) && (
      <section
        className="-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-3
                   sm:mx-0 sm:px-0
                   lg:grid lg:snap-none lg:grid-cols-2 lg:overflow-visible lg:pb-0"
      >
        {krogNajboljsi.length > 0 && (
        <div className="w-[86%] shrink-0 snap-start space-y-2 sm:w-[68%] lg:w-auto lg:shrink">
          {/* Igralec kroga — header (zvezda + oznaka), ime čez celo širino,
              spodaj klub+meta levo, točke desno. */}
          {krogNajboljsi[0] && (
            <section className="relative overflow-hidden rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-500/20 via-slate-950/60 to-fuchsia-500/10 p-4 shadow-lg shadow-black/40 sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-200/80 sm:text-xs">
                <span className="text-lg leading-none sm:text-xl" aria-hidden>🌟</span>
                <span>{t('domov.najboljsi.igralecKroga', { krog: krog?.number })}</span>
              </div>
              <Link
                to={`/igralec/${krogNajboljsi[0].player_id}`}
                className="mt-1 block break-words text-2xl font-black leading-tight text-white hover:text-gnl-200 sm:text-3xl md:text-4xl"
              >
                {prikazniIme(krogNajboljsi[0].full_name)}
              </Link>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 sm:text-sm">
                  <Grb
                    ime={krogNajboljsi[0].team_name}
                    kratko={krogNajboljsi[0].team_short}
                    logo={krogNajboljsi[0].team_logo}
                    velikost={18}
                  />
                  <span className="truncate">{krogNajboljsi[0].team_name}</span>
                  <span
                    className={`znacka poz-${krogNajboljsi[0].position}`}
                  >
                    {kratkaPozicija(krogNajboljsi[0].position)}
                  </span>
                  <span className="text-slate-500">
                    · {t('domov.minut', { n: krogNajboljsi[0].minutes })}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-3xl font-black tabular-nums text-amber-200 sm:text-5xl">
                    {formatirajTocke(krogNajboljsi[0].points)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 sm:text-xs">
                    {tockZ(krogNajboljsi[0].points)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Za zvezdo kroga se lestvica nadaljuje: 2., 3., 4. … */}
          {krogNajboljsi.length > 1 && (
            <ul className="space-y-1.5">
              {krogNajboljsi.slice(1).map((z, i) => (
                <li
                  key={z.player_id}
                  className="kartica kartica-hover flex items-center gap-2 p-2.5 sm:gap-3"
                >
                  <span className="w-6 text-center font-black text-slate-500">
                    {i + 2}
                  </span>
                  <Grb
                    ime={z.team_name}
                    kratko={z.team_short}
                    logo={z.team_logo}
                    velikost={22}
                  />
                  <Link
                    to={`/igralec/${z.player_id}`}
                    className="min-w-0 flex-1 truncate font-semibold hover:text-gnl-300"
                  >
                    {prikazniIme(z.full_name)}
                  </Link>
                  <span className="hidden text-xs text-slate-500 sm:inline">
                    {t('domov.minut', { n: z.minutes })}
                  </span>
                  {Number(z.price_delta) !== 0 && (
                    <span
                      className={`text-xs font-bold ${
                        Number(z.price_delta) > 0 ? 'text-gnl-300' : 'text-rose-400'
                      }`}
                    >
                      {Number(z.price_delta) > 0 ? '▲' : '▼'}
                      {Math.abs(Number(z.price_delta)).toFixed(1)}
                    </span>
                  )}
                  <span className="w-12 text-right font-black tabular-nums">
                    {formatirajTocke(z.points)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {krogNajboljsi.length > 0 && (
            <p className="pt-1 text-right">
              <Link
                to="/rezultati"
                className="text-sm text-slate-500 underline hover:text-gnl-300"
              >
                {t('domov.najboljsi.rezultatiKroga', { krog: krog?.number })}
              </Link>
            </p>
          )}
        </div>
        )}

        {zvezde.length > 0 && (
          <div className="w-[86%] shrink-0 snap-start sm:w-[68%] lg:w-auto lg:shrink">
            <VrhLestvice
              naslov={t('domov.najboljsi.strelci')}
              ikona="⚽"
              znacka="bg-rose-400/15 text-rose-200"
              kljuc="goals"
              seznam={zvezde}
            />
          </div>
        )}

        {podajalci.length > 0 && (
          <div className="w-[86%] shrink-0 snap-start sm:w-[68%] lg:w-auto lg:shrink">
            <VrhLestvice
              naslov={t('domov.najboljsi.podajalci')}
              ikona="🅰️"
              znacka="bg-gnl-400/15 text-gnl-200"
              kljuc="assists"
              seznam={podajalci}
            />
          </div>
        )}

        {obrambe.length > 0 && (
          <div className="w-[86%] shrink-0 snap-start sm:w-[68%] lg:w-auto lg:shrink">
            <VrhLestvice
              naslov={t('domov.najboljsi.ohranjeneMreze')}
              ikona="🧤"
              znacka="bg-sky-400/15 text-sky-200"
              kljuc="clean_sheets"
              seznam={obrambe}
            />
          </div>
        )}

        {/* Igralec sezone — največ fantasy točk doslej. Poudarjen vrh kot pri
            igralcu kroga, pod njim 2.–5. */}
        {igralecSezone.length > 0 && (
          <div className="w-[86%] shrink-0 snap-start space-y-2 sm:w-[68%] lg:w-auto lg:shrink">
            <section className="relative overflow-hidden rounded-3xl border border-emerald-300/40 bg-gradient-to-br from-emerald-500/20 via-slate-950/60 to-gnl-500/10 p-4 shadow-lg shadow-black/40 sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-200/80 sm:text-xs">
                <span className="text-lg leading-none sm:text-xl" aria-hidden>🏆</span>
                <span>
                  {tekocaSezona
                    ? t('domov.najboljsi.igralecSezoneZ', { sezona: tekocaSezona })
                    : t('domov.najboljsi.igralecSezone')}
                </span>
              </div>
              <Link
                to={`/igralec/${igralecSezone[0].id}`}
                className="mt-1 block break-words text-2xl font-black leading-tight text-white hover:text-gnl-200 sm:text-3xl md:text-4xl"
              >
                {prikazniIme(igralecSezone[0].full_name)}
              </Link>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 sm:text-sm">
                  <Grb
                    ime={igralecSezone[0].team_name}
                    kratko={igralecSezone[0].team_short}
                    logo={igralecSezone[0].team_logo}
                    velikost={18}
                  />
                  <span className="truncate">{igralecSezone[0].team_name}</span>
                  <span className={`znacka poz-${igralecSezone[0].position}`}>
                    {kratkaPozicija(igralecSezone[0].position)}
                  </span>
                  <span className="text-slate-500">
                    · {mnozina(Number(igralecSezone[0].matches ?? 0), TEKME)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-3xl font-black tabular-nums text-emerald-200 sm:text-5xl">
                    {formatirajTocke(igralecSezone[0].points)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 sm:text-xs">
                    {tockZ(igralecSezone[0].points)}
                  </span>
                </div>
              </div>
            </section>

            {igralecSezone.length > 1 && (
              <ul className="space-y-1.5">
                {igralecSezone.slice(1).map((z, i) => (
                  <li
                    key={z.id}
                    className="kartica kartica-hover flex items-center gap-2 p-2.5 sm:gap-3"
                  >
                    <span className="w-6 text-center font-black text-slate-500">
                      {i + 2}
                    </span>
                    <Grb
                      ime={z.team_name}
                      kratko={z.team_short}
                      logo={z.team_logo}
                      velikost={22}
                    />
                    <Link
                      to={`/igralec/${z.id}`}
                      className="min-w-0 flex-1 truncate font-semibold hover:text-gnl-300"
                    >
                      {prikazniIme(z.full_name)}
                    </Link>
                    <span className="hidden text-xs text-slate-500 sm:inline">
                      {t('domov.minut', { n: z.minutes })}
                    </span>
                    <span className="w-12 text-right font-black tabular-nums">
                      {formatirajTocke(z.points)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="pt-1 text-right">
              <Link
                to="/lestvica"
                className="text-sm text-slate-500 underline hover:text-gnl-300"
              >
                {t('domov.najboljsi.celaLestvica')}
              </Link>
            </p>
          </div>
        )}
      </section>
      )}

      {/* idealna enajsterica zadnjega kroga — na igrišču */}
      {idealnaPostava.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{t('domov.idealna.naslov')}</h2>
            <span className="text-xs text-slate-500">
              {t('domov.idealna.krogSezona', { krog: krog?.number, sezona: krog?.season })}
            </span>
          </div>
          <p className="text-xs text-slate-500">{t('domov.idealna.opis')}</p>
          <EnajstericaNaIgriscu igralci={idealnaPostava} />
        </section>
      )}

      {/* Povabi prijatelja — pomaga rasti bazi uporabnikov. Email-only,
          da uporabnik izbere prejemnika (privzeto brez WhatsApp preskoka). */}
      <section className="kartica overflow-hidden border-gnl-400/30 bg-gradient-to-br from-gnl-500/10 via-slate-950/50 to-fuchsia-500/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-3xl" aria-hidden>📧</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gnl-100 sm:text-lg">
              {t('domov.povabi.naslov')}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t('domov.povabi.opis')}
            </p>
          </div>
          <a
            href={vabilo}
            className="gumb-glavni shrink-0"
          >
            {t('domov.povabi.gumb')}
          </a>
        </div>
      </section>

      {/* klepet — anonimni prostor za pogovor */}
      <Klepet />

      {/* Naloge za skupnost.
          Pozicij tu dolgo ni bilo, ker jih postavi statistika in jih
          glasovanje le popravi. Potem je v klepetu nekdo prosil "dajte
          naredit da se lahko glasuje za pravo pozicijo igralcev" — za stran,
          ki obstaja in je v meniju. Prosnja za nekaj, kar ze imamo, ni
          prosnja za funkcijo, ampak podatek, da je ne najdejo. Isto velja za
          odsotnosti: stran je bila, prijav ni bilo nobene. */}
      {stat && (stat.brezAsistence > 0 || stat.brezPozicije > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t('domov.skupnost.naslov')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stat.brezAsistence > 0 && (
              <Link
                to="/glasovanje"
                className="kartica kartica-hover flex items-center gap-4 p-4"
              >
                <span className="text-3xl" aria-hidden>🅰️</span>
                <div className="min-w-0">
                  <div className="font-bold">
                    {t('domov.skupnost.brezAsistence', { goli: mnozina(stat.brezAsistence, GOLI) })}
                  </div>
                  <div className="text-sm text-slate-400">
                    {t('domov.skupnost.povejKdo', { n: prag })}
                  </div>
                </div>
              </Link>
            )}
            {stat.brezPozicije > 0 && (
              <Link
                to="/pozicije"
                className="kartica kartica-hover flex items-center gap-4 p-4"
              >
                <span className="text-3xl" aria-hidden>🧭</span>
                <div className="min-w-0">
                  <div className="font-bold">
                    {t('domov.skupnost.ugibanaPozicija', {
                      igralci: mnozina(stat.brezPozicije, IGRALCI),
                    })}
                  </div>
                  <div className="text-sm text-slate-400">
                    {t('domov.skupnost.pozicijaOdloca')}
                  </div>
                </div>
              </Link>
            )}
            <Link
              to="/odsotnosti"
              className="kartica kartica-hover flex items-center gap-4 p-4"
            >
              <span className="text-3xl" aria-hidden>🩹</span>
              <div className="min-w-0">
                <div className="font-bold">{t('domov.skupnost.odsotnosti')}</div>
                <div className="text-sm text-slate-400">
                  {t('domov.skupnost.javi')}
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* naslednje tekme — razpored, da uporabniki vedo kaj prihaja */}
      {naslednjeTekme.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{t('domov.naslednje.naslov')}</h2>
            <span className="text-xs text-slate-500">
              {t('domov.naslednje.vRazporedu', { tekme: mnozina(naslednjeTekme.length, TEKME) })}
            </span>
          </div>
          <div className="space-y-4">
            {(() => {
              const poKrogu = new Map()
              for (const tekma of naslednjeTekme) {
                const key = tekma.krog?.id ?? 0
                if (!poKrogu.has(key))
                  poKrogu.set(key, { krog: tekma.krog, tekme: [] })
                poKrogu.get(key).tekme.push(tekma)
              }
              return [...poKrogu.values()]
                .sort((a, b) => (a.krog?.number ?? 0) - (b.krog?.number ?? 0))
                .slice(0, 3)
                .map(({ krog, tekme }) => (
                  <div key={krog?.id ?? 'brez'} className="kartica p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-bold text-gnl-300">
                        {krog ? t('domov.krog', { krog: krog.number }) : t('domov.brezKroga')}
                        {krog?.season && (
                          <span className="ml-2 font-normal text-slate-500">
                            {krog.season}
                          </span>
                        )}
                      </span>
                      {krog?.played_on && (
                        <span className="text-xs text-slate-500">
                          {datum(krog.played_on, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {tekme.map((tekma: any) => (
                        <li
                          key={tekma.id}
                          className="flex items-center gap-2 rounded-lg bg-white/5 p-2 text-sm"
                        >
                          <div className="flex flex-1 items-center justify-end gap-2 truncate">
                            <span className="truncate font-semibold">
                              {tekma.home?.name ?? '?'}
                            </span>
                            <Grb
                              ime={tekma.home?.name}
                              kratko={tekma.home?.short_name}
                              logo={tekma.home?.logo_url}
                              velikost={22}
                            />
                          </div>
                          <span className="shrink-0 text-slate-500">
                            {tekma.played_on
                              ? datum(tekma.played_on, { day: 'numeric', month: 'numeric' })
                              : t('domov.naslednje.proti')}
                          </span>
                          <div className="flex flex-1 items-center gap-2 truncate">
                            <Grb
                              ime={tekma.away?.name}
                              kratko={tekma.away?.short_name}
                              logo={tekma.away?.logo_url}
                              velikost={22}
                            />
                            <span className="truncate font-semibold">
                              {tekma.away?.name ?? '?'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
            })()}
          </div>
        </section>
      )}

      {/* Prispevek glasovalca: pokaže se le, kdor je kdaj glasoval. */}
      <Prispevek />

      {/* številke — štetje zajame vse sezone lige, zato jih pred prvim
          krogom označimo kot zgodovino; ko sezona teče, to ne drži več. */}
      {stat && sezonaTece !== null && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              {sezonaTece ? t('domov.stevilke.ligaVStevilkah') : t('domov.stevilke.izZgodovine')}
            </h2>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              {sezonaTece ? t('domov.stevilke.vseSezone') : t('domov.stevilke.novaSezona')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stevilka oznaka={t('domov.stevilke.tekem')} vrednost={stat.tekme} ikona="📋" />
            <Stevilka oznaka={t('domov.stevilke.igralcev')} vrednost={stat.igralci} ikona="👥" />
            <Stevilka oznaka={t('domov.stevilke.golov')} vrednost={stat.goli} ikona="⚽" />
            <Stevilka
              oznaka={t('domov.stevilke.cakaGlasov')}
              vrednost={stat.brezAsistence}
              ikona="🗳️"
              poudari
            />
          </div>
        </section>
      )}

      {/* potek igre */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('domov.kakoIgras.naslov')}</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            [t('domov.kakoIgras.registracija'), t('domov.kakoIgras.registracijaOpis')],
            [t('domov.kakoIgras.kader'), t('domov.kakoIgras.kaderOpis')],
            [t('domov.kakoIgras.enajsterica'), t('domov.kakoIgras.enajstericaOpis')],
            [t('domov.kakoIgras.poKrogu'), t('domov.kakoIgras.poKroguOpis')],
          ].map(([naslov, opis]) => (
            <li key={naslov} className="kartica p-4">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-gnl-300">
                {naslov}
              </h3>
              <p className="text-sm text-slate-300">{opis}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* pravila */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('domov.kakoSeTockuje')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRAVILA_OPIS.map((s) => (
            <div key={s.skupina} className="kartica p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gnl-300">
                {s.skupina}
              </h3>
              <ul className="space-y-1 text-sm">
                {s.vrstice.map(([opis, tocke]) => (
                  <li key={opis} className="flex justify-between gap-3">
                    <span className="text-slate-300">{opis}</span>
                    <span
                      className={`shrink-0 font-black tabular-nums ${
                        tocke.startsWith('−') ? 'text-rose-400' : 'text-gnl-300'
                      }`}
                    >
                      {tocke}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// Vrh sezonske lestvice po enem statu (goli, asistence, ohranjene mreže) —
// isti vzorec za vse tri, da lestvice na prvi pogled izgledajo kot ena
// družina, ne tri različne komponente.
function VrhLestvice({
  naslov,
  ikona,
  znacka,
  kljuc,
  seznam,
}: {
  naslov: string
  ikona: string
  znacka: string
  kljuc: 'goals' | 'assists' | 'clean_sheets'
  seznam: VrhIgralec[]
}) {
  if (seznam.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{naslov}</h2>
      <ul className="space-y-2">
        {seznam.map((z, i) => (
          <li
            key={z.id}
            className="kartica kartica-hover flex items-center gap-2 p-3 sm:gap-3"
          >
            <span className="w-6 text-center font-black text-slate-500">
              {i + 1}
            </span>
            <Grb
              ime={z.team_name}
              kratko={z.team_short}
              logo={z.team_logo}
              velikost={22}
            />
            <Link
              to={`/igralec/${z.id}`}
              className="min-w-0 flex-1 truncate font-semibold hover:text-gnl-300"
            >
              {prikazniIme(z.full_name)}
            </Link>
            <span className={`znacka ${znacka}`}>
              {z[kljuc]} <span aria-hidden>{ikona}</span>
            </span>
            <span className="w-20 text-right font-black tabular-nums text-gnl-300">
              {formatirajCeno(z.value)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Stevilka({
  oznaka,
  vrednost,
  ikona,
  poudari,
}: {
  oznaka: string
  vrednost: number
  ikona: string
  poudari?: boolean
}) {
  return (
    <div
      className={`kartica p-4 ${poudari && vrednost > 0 ? 'ring-1 ring-gnl-400/40' : ''}`}
    >
      <div className="text-2xl" aria-hidden>
        {ikona}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{vrednost}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {oznaka}
      </div>
    </div>
  )
}
