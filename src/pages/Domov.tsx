import { useEffect, useState, type ReactNode } from 'react'
import Pivo from '../components/Pivo'
import { imeZveze } from '../components/VirPodatkov'
import { sestaviVabilo, vabiloMailto } from '../lib/vabilo'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { vseVrstice } from '../lib/strani'
import { pravilaOpis } from '../lib/tockovanje'
import {
  prikazniIme,
  formatirajTocke,
  mnozina,
  KRATKA_POZICIJA,
  IGRALCI,
} from '../lib/pomozno'
import { PRIVZETO, useTekmovanje } from '../lib/tekmovanje'
import { useAuth } from '../lib/useAuth'
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
import Sponzor from '../components/Sponzor'

/** Kar liga čaka od skupnosti (asistence, pozicije). */
interface Statistika {
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
  const { id: tekmovanjeId, slug, tekmovanje, tekmovanja, brezLig } = useTekmovanje()
  // Naslovnica privzete lige ima osnovni naslov; druge lige svojega, sicer bi
  // bile vse naslovnice za iskalnik ista stran.
  useNaslov(slug === PRIVZETO ? null : tekmovanje?.name)
  const { session, loading: avtNalaganje } = useAuth()
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
  const [igralecSezone, setIgralecSezone] = useState<any[]>([])
  const [idealnaPostava, setIdealnaPostava] = useState<IgralecEnajsterice[]>(
    [],
  )
  const [naslednjeTekme, setNaslednjeTekme] = useState<any[]>([])
  const [zadnjiRezultati, setZadnjiRezultati] = useState<any[]>([])
  const [naslednjiKrog, setNaslednjiKrog] = useState<KrogPodatek | null>(null)
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

      const [
        sezonaPodatek,
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
      setStat({
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
      // Igralec z 0 ne sodi na lestvico strelcev/podajalcev: dokler nihče ne
      // potrdi asistence, bi bila "Najboljši podajalci" pet imen z ničlo.
      const vrh = (stolpec: 'goals' | 'assists' | 'clean_sheets' | 'points') =>
        [...(sezonaVrstice as any[])]
          .filter((v) => stolpec === 'points' || Number(v[stolpec] ?? 0) > 0)
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
  // Navodila in točkovanje sta na širšem zaslonu odprta, na telefonu zaprta.
  const siroko = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(min-width: 640px)').matches)

  // Na naslovnici le en krog rezultatov in en krog razporeda — ostalo je na
  // strani Rezultati. Prej sta bila po dva oz. tri kroge in stran je bila
  // na telefonu dolga čez 5000 px.
  const zadnjiKrog = poKrogih(zadnjiRezultati, -1)
  const prihodnjiKrog = poKrogih(naslednjeTekme, 1)

  // Vodilni po golih, asistencah in čistih mrežah — po ena vrstica, cele
  // lestvice so na strani Igralci.
  const vodilni = [
    { naslov: t('domov.najboljsi.vodilni.strelec'), z: zvezde[0], vrednost: zvezde[0]?.goals },
    { naslov: t('domov.najboljsi.vodilni.podajalec'), z: podajalci[0], vrednost: podajalci[0]?.assists },
    { naslov: t('domov.najboljsi.vodilni.mreze'), z: obrambe[0], vrednost: obrambe[0]?.clean_sheets },
  ].filter((v): v is { naslov: string; z: VrhIgralec; vrednost: number } => v.z != null)

  return (
    <div className="space-y-8">
      {/* Prijavljen ne rabi oglasnega uvoda: ime lige, njegova ekipa in
          ena povezava. Obiskovalec dobi cel uvod. Dokler seja ni znana, nič,
          da uvod ne utripne in izgine. */}
      {avtNalaganje ? null : session ? (
        <MojaGlava
          ligaId={tekmovanjeId}
          liga={tekmovanje?.name ?? null}
          uporabnikId={session.user.id}
          krog={sezonaTece ? krog : null}
        />
      ) : (
        <section className="relative overflow-hidden rounded-3xl p-4 ring-1 ring-white/10 sm:p-8">
          {/* Amaterska tekma pod reflektorji — natanko to, o čemer je liga. */}
          <picture>
            <source srcSet="/foto/igrisce.webp" type="image/webp" />
            <img
              src="/foto/igrisce.jpg"
              alt=""
              aria-hidden
              width={1600}
              height={1067}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-slate-950/70"
            aria-hidden
          />
          <div className="relative space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-4">
              <img
                src="/logo/slff-grb.png"
                alt={t('aplikacija.naslovStrani.osnova')}
                className="h-12 w-12 sm:h-24 sm:w-24"
              />
              <Pivo src="domov" />
            </div>
            {/* Dokler se lige nalagajo, ne vemo, katera je izbrana — nevtralen
                obris namesto gorenjskega imena, ki bi obiskovalcu druge lige
                za hip pokazal napačno ligo. */}
            {!tekmovanje ? (
              <span className="block h-4 w-48 animate-pulse rounded bg-white/10" aria-hidden />
            ) : (
              <p className="text-xs font-bold uppercase tracking-wide text-gnl-300">
                {/* Gorenjski besedili sta oglasni in ostaneta natanko taki, kot
                    sta bili; druga zveza dobi ime svoje lige. */}
                {tekmovanje.federation_code === 'mnzg'
                  ? tekmovanje.slug === 'mladinci'
                    ? t('domov.uvod.gorenjskaMladinci')
                    : t('domov.uvod.gorenjskaClani')
                  : tekmovanje.name}
              </p>
            )}
            <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
              Sunday League
              <br />
              Fantasy Football
            </h1>
            <p className="font-semibold text-gnl-300 sm:text-lg">{t('domov.uvod.geslo')}</p>
            <p className="hidden max-w-xl text-slate-300 sm:block">{t('domov.uvod.opis', { zveza })}</p>
            {/* En poziv; rezultati so tiha povezava ob njem. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              <Link to="/my-team" className="gumb-glavni">
                {t('domov.uvod.sestaviEkipo')}
              </Link>
              <Link to="/results" className="text-sm font-semibold text-slate-200 hover:text-white">
                {t('domov.uvod.rezultati')} →
              </Link>
            </div>
            {tekmovanja.length > 1 && (
              <p className="hidden text-sm text-slate-400 sm:block">
                {tx('domov.uvod.vecLig', {}, { krepko: (b) => <strong>{b}</strong> })}
              </p>
            )}
            {/* Pred sezono: kdaj se začne. Po prvem krogu: poziv za zamudnike. */}
            {sezonaTece === false && zacetekSezone && (
              <p className="text-sm text-gnl-100">
                {tx(
                  'domov.uvod.zacetekSezone',
                  { datum: datum(zacetekSezone, { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { krepko: (b) => <strong>{b}</strong> },
                )}
              </p>
            )}
            {sezonaTece && (
              <p className="text-sm text-slate-300">
                {tx('domov.uvod.zamudniki', {}, {
                  krepko: (b) => <strong className="text-slate-100">{b}</strong>,
                  lestvica: (b) => (
                    <Link to="/standings" className="underline">
                      {b}
                    </Link>
                  ),
                })}
              </p>
            )}
          </div>
        </section>
      )}

      {napaka && (
        <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/30">
          {t('domov.delNiNalozen', { napaka })}
        </p>
      )}

      {/* Na širšem zaslonu razdelki v dveh stolpcih, na telefonu drug pod drugim. */}
      {/* Dokler prvi val ne pride (`sezonaTece` je null), razdelki držijo
          zaslon prostora: sicer bi sponzor, klepet in navodila pod njimi
          najprej stali tik pod uvodom in nato skočili navzdol (CLS). */}
      <div
        className={`grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start ${
          sezonaTece === null && !napaka && !brezLig ? 'min-h-screen' : ''
        }`}
      >
        {/* Ta teden: rok in kar liga čaka od ljudi — vrstice v eni skupini
            namesto štirih kartic. Asistence so edino, brez česar liga ne
            deluje, zato so poudarjene. */}
        {(naslednjiKrog?.deadline_at || stat) && (
          <Razdelek naslov={t('domov.taTeden')}>
            <ul className="kartica divide-y divide-white/10">
              {naslednjiKrog?.deadline_at && (
                <Naloga
                  to="/my-team"
                  naslov={t('domov.rok.seZaklene', { krog: naslednjiKrog.number })}
                  opis={<Odstevanje do={naslednjiKrog.deadline_at} />}
                />
              )}
              {stat && stat.brezAsistence > 0 && (
                <Naloga
                  to="/assists"
                  naslov={t('domov.asistence.cakajo', { n: stat.brezAsistence })}
                  opis={t('domov.skupnost.povejKdo', { n: prag })}
                  poudarek
                />
              )}
              {stat && stat.brezPozicije > 0 && (
                <Naloga
                  to="/positions"
                  naslov={t('domov.skupnost.ugibanaPozicija', {
                    igralci: mnozina(stat.brezPozicije, IGRALCI),
                  })}
                  opis={t('domov.skupnost.pozicijaOdloca')}
                />
              )}
              {stat && (
                <Naloga
                  to="/absences"
                  naslov={t('domov.skupnost.odsotnosti')}
                  opis={t('domov.skupnost.javi')}
                />
              )}
            </ul>
          </Razdelek>
        )}

        {/* zadnji rezultati — zadnji odigrani krog */}
        {zadnjiKrog && (
          <Razdelek
            naslov={t('domov.zadnjiRezultati.naslov')}
            povezava={{ to: '/results', besedilo: t('domov.zadnjiRezultati.vsi') }}
          >
            <div className="kartica">
              <GlavaKroga krog={zadnjiKrog.krog} />
              <ul className="divide-y divide-white/10">
                {zadnjiKrog.tekme.map((tekma) => (
                  <li key={tekma.id}>
                    <Link
                      to={`/match/${tekma.id}`}
                      title={t('domov.zadnjiRezultati.poglejTekmo')}
                      className="block px-3 py-2 transition hover:bg-white/5"
                    >
                      <VrsticaTekme tekma={tekma}>
                        <span className="font-black tabular-nums">
                          {tekma.home_goals}:{tekma.away_goals}
                        </span>
                      </VrsticaTekme>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Razdelek>
        )}

        {/* idealna enajsterica zadnjega kroga — na igrišču */}
        {idealnaPostava.length > 0 && (
          <Razdelek
            naslov={t('domov.idealna.naslov')}
            povezava={{ to: '/results', besedilo: t('domov.krog', { krog: krog?.number }) }}
          >
            <p className="text-xs text-slate-400">{t('domov.idealna.opis')}</p>
            <EnajstericaNaIgriscu igralci={idealnaPostava} />
          </Razdelek>
        )}

        {/* Igralci sezone: vrh po točkah, pod njim vodilni po golih,
            asistencah in mrežah. Najboljše kroga kaže idealna enajsterica. */}
        {igralecSezone.length > 0 && (
          <Razdelek
            naslov={t('domov.najboljsi.igralecSezone')}
            povezava={{ to: '/players', besedilo: t('domov.najboljsi.celaLestvica') }}
          >
            <ol className="kartica divide-y divide-white/10">
              {igralecSezone.map((z, i) => (
                <VrsticaIgralca
                  key={z.id}
                  mesto={i + 1}
                  id={z.id}
                  igralec={z}
                  desno={formatirajTocke(z.points)}
                />
              ))}
            </ol>
            {vodilni.length > 0 && (
              <ul className="kartica divide-y divide-white/10">
                {vodilni.map(({ naslov, z, vrednost }) => (
                  <VrsticaIgralca
                    key={naslov}
                    id={z.id}
                    igralec={z}
                    oznaka={naslov}
                    desno={String(vrednost)}
                  />
                ))}
              </ul>
            )}
            {/* Vrh države ima svojo stran; tu le povezava, da ni dvojnika. */}
            <Link
              to="/national?pogled=igralci"
              className="block pt-1 text-sm font-semibold text-gnl-300 hover:text-gnl-200"
            >
              {t('lestvice.slovenija.vrhNaslov')} →
            </Link>
          </Razdelek>
        )}

        {/* naslednje tekme — prvi krog razporeda */}
        {prihodnjiKrog && (
          <Razdelek naslov={t('domov.naslednje.naslov')}>
            <div className="kartica">
              <GlavaKroga krog={prihodnjiKrog.krog} />
              <ul className="divide-y divide-white/10">
                {prihodnjiKrog.tekme.map((tekma) => (
                  <li key={tekma.id} className="px-3 py-2">
                    <VrsticaTekme tekma={tekma}>
                      <span className="text-xs text-slate-400">
                        {/* Datum le, kadar se razlikuje od dneva kroga v glavi. */}
                        {tekma.played_on && tekma.played_on !== prihodnjiKrog.krog?.played_on
                          ? datum(tekma.played_on, { day: 'numeric', month: 'numeric' })
                          : t('domov.naslednje.proti')}
                      </span>
                    </VrsticaTekme>
                  </li>
                ))}
              </ul>
            </div>
          </Razdelek>
        )}

      </div>

      <Sponzor kje="domov" />

      {/* Klepet je dolg; na telefonu je zaprt, kot navodila spodaj. Na
          širšem zaslonu je odprt in brez dvojnega naslova. */}
      {siroko ? (
        <Klepet />
      ) : (
        <details className="group">
          <Povzetek>{t('domov.klepet')}</Povzetek>
          <div className="mt-3">
            <Klepet />
          </div>
        </details>
      )}

      {/* potek igre — na telefonu zaprto, da naslovnica ni neskončna */}
      <details open={siroko} className="group">
        <Povzetek>{t('domov.kakoIgras.naslov')}</Povzetek>
        <ol className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            [t('domov.kakoIgras.registracija'), t('domov.kakoIgras.registracijaOpis')],
            [t('domov.kakoIgras.kader'), t('domov.kakoIgras.kaderOpis')],
            [t('domov.kakoIgras.enajsterica'), t('domov.kakoIgras.enajstericaOpis')],
            [t('domov.kakoIgras.poKrogu'), t('domov.kakoIgras.poKroguOpis')],
          ].map(([naslov, opis]) => (
            <li key={naslov}>
              <h3 className="text-sm font-bold text-gnl-300">{naslov}</h3>
              <p className="mt-0.5 text-sm text-slate-300">{opis}</p>
            </li>
          ))}
        </ol>
      </details>

      {/* pravila */}
      <details open={siroko} className="group">
        <Povzetek>{t('domov.kakoSeTockuje')}</Povzetek>
        <div className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {pravilaOpis().map((s) => (
            <div key={s.skupina}>
              <h3 className="mb-1 text-sm font-bold text-gnl-300">{s.skupina}</h3>
              <ul className="divide-y divide-white/5 text-sm">
                {s.vrstice.map(([opis, tocke]) => (
                  <li key={opis} className="flex justify-between gap-3 py-1">
                    <span className="text-slate-300">{opis}</span>
                    <span
                      className={`shrink-0 font-bold tabular-nums ${
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
        <p className="mt-3 text-xs text-slate-400">{t('tekme.tockovanje.pravila.opomba')}</p>
      </details>

      {/* Povabilo je tiha povezava na koncu, ne svoja kartica. */}
      <p className="text-center text-sm">
        <a href={vabilo} className="font-semibold text-gnl-300 hover:text-gnl-200">
          {t('domov.povabi.naslov')} →
        </a>
      </p>
    </div>
  )
}

/** Tekme združi po krogu in vrne prvi krog v smeri `smer` (-1 zadnji, 1 prvi). */
function poKrogih(tekme: any[], smer: 1 | -1): { krog: any; tekme: any[] } | null {
  const poKrogu = new Map<unknown, { krog: any; tekme: any[] }>()
  for (const tekma of tekme) {
    const key = tekma.krog?.id ?? 0
    if (!poKrogu.has(key)) poKrogu.set(key, { krog: tekma.krog, tekme: [] })
    poKrogu.get(key)!.tekme.push(tekma)
  }
  return (
    [...poKrogu.values()].sort(
      (a, b) => smer * ((a.krog?.number ?? 0) - (b.krog?.number ?? 0)),
    )[0] ?? null
  )
}

/** Razdelek naslovnice: majhen naslov (in povezava desno), pod njim vsebina. */
function Razdelek({
  naslov,
  povezava,
  children,
}: {
  naslov: string
  povezava?: { to: string; besedilo: string }
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold">{naslov}</h2>
        {povezava && (
          <Link
            to={povezava.to}
            className="shrink-0 text-sm font-semibold text-gnl-300 hover:text-gnl-200"
          >
            {povezava.besedilo}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Naslov zložljivega razdelka, z oznako, ki se ob odprtju obrne. */
function Povzetek({ children }: { children: ReactNode }) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-t border-white/10 pt-3 [&::-webkit-details-marker]:hidden">
      <h2 className="text-lg font-bold">{children}</h2>
      <span aria-hidden className="text-slate-500 transition group-open:rotate-180">
        ▾
      </span>
    </summary>
  )
}

/** Vrstica v skupini "Ta teden": naslov, kratka vrstica pod njim, puščica. */
function Naloga({
  to,
  naslov,
  opis,
  poudarek,
}: {
  to: string
  naslov: string
  opis: ReactNode
  poudarek?: boolean
}) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5">
        {poudarek && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold ${poudarek ? 'text-amber-100' : ''}`}>{naslov}</span>
          <span className="block truncate text-xs text-slate-400">{opis}</span>
        </span>
        <span aria-hidden className="text-slate-500">›</span>
      </Link>
    </li>
  )
}

/** Glava kroga v skupini tekem: "7. krog · sob, 3. 10." */
function GlavaKroga({ krog }: { krog: any }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs">
      <span className="font-bold text-gnl-300">
        {krog ? t('domov.krog', { krog: krog.number }) : t('domov.brezKroga')}
      </span>
      {krog?.played_on && (
        <span className="text-slate-400">
          {datum(krog.played_on, { weekday: 'short', day: 'numeric', month: 'numeric' })}
        </span>
      )}
    </div>
  )
}

/** Domači — sredina (izid ali datum) — gostje. */
function VrsticaTekme({ tekma, children }: { tekma: any; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="truncate">{tekma.home?.name ?? '?'}</span>
        <Grb ime={tekma.home?.name} kratko={tekma.home?.short_name} logo={tekma.home?.logo_url} velikost={20} />
      </div>
      <span className="w-11 shrink-0 text-center">{children}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Grb ime={tekma.away?.name} kratko={tekma.away?.short_name} logo={tekma.away?.logo_url} velikost={20} />
        <span className="truncate">{tekma.away?.name ?? '?'}</span>
      </div>
    </div>
  )
}

/** Vrstica igralca v seznamu: mesto ali oznaka, grb, ime, klub, vrednost. */
function VrsticaIgralca({
  mesto,
  oznaka,
  id,
  igralec,
  desno,
}: {
  mesto?: number
  oznaka?: string
  id: number
  igralec: { full_name: string | null; team_name?: string | null; team_short?: string | null; team_logo?: string | null; position?: string | null }
  desno: string
}) {
  return (
    <li>
      <Link to={`/player/${id}`} className="flex items-center gap-3 px-3 py-2 transition hover:bg-white/5">
        {mesto != null && (
          <span className={`w-4 text-center text-sm font-bold ${mesto === 1 ? 'text-amber-300' : 'text-slate-500'}`}>
            {mesto}
          </span>
        )}
        <Grb ime={igralec.team_name} kratko={igralec.team_short} logo={igralec.team_logo} velikost={20} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{prikazniIme(igralec.full_name)}</span>
          <span className="block truncate text-xs text-slate-400">
            {oznaka ?? `${igralec.team_name ?? ''} · ${kratkaPozicija(igralec.position)}`}
          </span>
        </span>
        <span className="shrink-0 font-bold tabular-nums text-gnl-300">{desno}</span>
      </Link>
    </li>
  )
}

/** Glava naslovnice za prijavljenega: liga, njegova ekipa (točke, zadnji
 *  krog, mesto) in ena povezava; brez ekipe le poziv, naj jo sestavi. */
function MojaGlava({
  ligaId,
  liga,
  uporabnikId,
  krog,
}: {
  ligaId: number | null
  liga: string | null
  uporabnikId: string
  krog: KrogPodatek | null
}) {
  // undefined = nalaganje, null = brez ekipe v tej ligi, false = napaka branja
  const [ekipa, setEkipa] = useState<
    { ime: string; tocke: number; krog: number | null; mesto: number; od: number } | null | false | undefined
  >(undefined)
  const krogId = krog?.id ?? null

  useEffect(() => {
    if (!ligaId) return
    let veljavno = true
    setEkipa(undefined)
    async function nalozi(liga: number) {
      const { data: moja, error } = await supabase
        .from('fantasy_teams')
        .select('id, name')
        .eq('competition_id', liga)
        .eq('owner_id', uporabnikId)
        .eq('hisna', false)
        .maybeSingle()
      // Napaka ni "brez ekipe": ne vabi k sestavi tistega, ki ekipo ima.
      if (error) throw error
      if (!moja) return null
      const { data: vrsta } = await supabase
        .from('fantasy_team_standings')
        .select('total_points')
        .eq('fantasy_team_id', moja.id)
        .maybeSingle()
      const tocke = Number(vrsta?.total_points ?? 0)
      // Mesto = koliko ekip ima več točk + 1; štejemo v bazi, ne beremo lestvice.
      const [boljsi, vse, kroga] = await Promise.all([
        supabase
          .from('fantasy_team_standings')
          .select('fantasy_team_id', { count: 'exact', head: true })
          .eq('competition_id', liga)
          .gt('total_points', tocke),
        supabase
          .from('fantasy_team_standings')
          .select('fantasy_team_id', { count: 'exact', head: true })
          .eq('competition_id', liga),
        krogId
          ? supabase
              .from('fantasy_round_standings')
              .select('points')
              .eq('fantasy_team_id', moja.id)
              .eq('round_id', krogId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      return {
        ime: moja.name,
        tocke,
        krog: kroga.data?.points ?? null,
        mesto: (boljsi.count ?? 0) + 1,
        od: vse.count ?? 0,
      }
    }
    nalozi(ligaId)
      .then((e) => {
        if (veljavno) setEkipa(e)
      })
      // Ob napaki glave ne kažemo: ne vemo, ali ekipo ima.
      .catch(() => {
        if (veljavno) setEkipa(false)
      })
    return () => {
      veljavno = false
    }
  }, [ligaId, uporabnikId, krogId])

  if (ekipa === false) return null
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-gnl-300">{liga}</p>
          <h1 className="truncate text-2xl font-black">
            {ekipa ? ekipa.ime : t('aplikacija.meni.mojaEkipa')}
          </h1>
        </div>
        {ekipa && (
          <Link to="/my-team" className="shrink-0 pb-1 text-sm font-semibold text-gnl-300 hover:text-gnl-200">
            {t('domov.moja.uredi')}
          </Link>
        )}
      </div>
      {ekipa === undefined ? (
        <div className="kartica h-[66px] animate-pulse" aria-hidden />
      ) : ekipa ? (
        <dl className="kartica grid grid-cols-3 divide-x divide-white/10 text-center">
          {[
            [t('domov.moja.tocke'), formatirajTocke(ekipa.tocke)],
            [
              krog ? t('domov.krog', { krog: krog.number }) : t('domov.brezKroga'),
              ekipa.krog == null ? '–' : formatirajTocke(ekipa.krog),
            ],
            // Pred prvimi točkami mesta ni (kot "–" na lestvici). Mesto vodi
            // na lestvico ekip; povezava razpne čez celo celico.
            [
              t('domov.moja.mesto'),
              ekipa.tocke > 0 ? t('domov.moja.mestoOd', { mesto: ekipa.mesto, n: ekipa.od }) : '–',
              '/standings',
            ],
          ].map(([oznaka, vrednost, pot]) => (
            <div
              key={oznaka}
              className={`relative px-2 py-2.5 ${pot ? 'transition hover:bg-white/5' : ''}`}
            >
              <dt className="truncate text-xs text-slate-400">{oznaka}</dt>
              <dd className="text-lg font-bold tabular-nums">
                {pot ? (
                  <Link to={pot} className="after:absolute after:inset-0 hover:text-gnl-200">
                    {vrednost}
                  </Link>
                ) : (
                  vrednost
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <Link to="/my-team" className="gumb-glavni inline-block">
          {t('domov.uvod.sestaviEkipo')}
        </Link>
      )}
    </section>
  )
}
