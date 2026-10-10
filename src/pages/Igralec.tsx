import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { useNaslov, useNoindex } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { useKanonicnaLiga, useTekmovanje, zLigo } from '../lib/tekmovanje'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import {
  prikazniIme,
  razredPozicije,
  KRATKA_POZICIJA,
  IME_POZICIJE,
  formatirajTocke,
  formatirajCeno,
  formatirajPremik,
  mnozina,
  oblika,
  TOCKE,
  TEKME,
  GOLI,
} from '../lib/pomozno'
// `premik` je tu ze ime lokalne stevilke (zadnja sprememba cene), zato
// funkcijo uvozimo pod drugim imenom.
import { serijaCen, premik as premikSerije, crta } from '../lib/gibanjeCene'
import Grb from '../components/Grb'
import KarticaIgralca from '../components/KarticaIgralca'
import { dosezkiNastopa, vrsticaTekme, type NastopZaKartico } from '../lib/karticaIgralca'
import {
  VRSTE,
  VrsticaPorocila,
  type Porocilo,
  type VrstaPorocila,
} from '../components/Odsotnost'
import { tockeZaNastop } from '../lib/tockovanje'
import type { Pozicija, Postavka } from '../lib/tipi'
import { t, tx } from '../i18n'
import { izvor } from '../lib/platforma'
import { prevediNapako } from '../lib/napake'
import { NalaganjeZaBralnik, Skelet } from '../components/Skelet'

/** Vrstica pogleda `player_overview` — profil igralca. */
type Profil = Record<string, any> & {
  id: number
  competition_id?: number | null
  team_id?: number | null
  position?: Pozicija | null
  full_name?: string | null
}

/** Številke tekoče sezone (`player_season_standings`). */
interface Sezonsko {
  season: string
  points: number | null
  matches: number | null
  goals: number | null
  minutes: number | null
}

/** Razlaga tock v enem krogu. */
interface Razlaga {
  round_id: number
  number: number | null
  season: string | null
  played_on: string | null
  match_id: number
  minute: number | null
  postavke: Postavka[]
  skupaj: number
  /** Surove številke nastopa — za kartico igralca. */
  nastop: NastopZaKartico
  /** "Domači 2 : 1 Gostje" — za kartico igralca. */
  tekma: string | null
}

const POZICIJE: Pozicija[] = ['GK', 'DEF', 'MID', 'FWD']

/** Naslov razdelka — enak povsod na strani. */
const NASLOV = 'mb-2 text-base font-bold text-slate-100'

export default function Igralec() {
  const { id } = useParams()
  // Iz naslova pride niz; stolpci so stevilcni.
  const igralecId = Number(id)
  const { session } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const lokacija = useLocation()
  const prijava = povezavaNaPrijavo(lokacija.pathname + lokacija.search)
  const { vsaTekmovanja } = useTekmovanje()
  const [igralec, setIgralec] = useState<Profil | null>(null)
  // Številke tekoče sezone; `igralec` (player_overview) je seštevek vseh sezon.
  const [sezonsko, setSezonsko] = useState<Sezonsko | null>(null)
  const [razlage, setRazlage] = useState<Razlaga[]>([])
  const [odprtRazlaga, setOdprtRazlaga] = useState<number | null>(null)
  const [cene, setCene] = useState<any[]>([])
  const [izhodisce, setIzhodisce] = useState<number | null>(null)
  const [zadnjiKrog, setZadnjiKrog] = useState(0)
  const [tekme, setTekme] = useState<any[]>([])
  const [glasovi, setGlasovi] = useState<Record<string, number>>({})
  const [mojGlas, setMojGlas] = useState<Pozicija | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  // odsotnosti in poškodbe tega igralca
  const [porocila, setPorocila] = useState<Porocilo[]>([])
  const [vrstaPorocila, setVrstaPorocila] = useState<VrstaPorocila>('poskodba')
  const [besediloPorocila, setBesediloPorocila] = useState('')
  const [posiljamPorocilo, setPosiljamPorocilo] = useState(false)
  const [nalaganje, setNalaganje] = useState(true)
  // Za kartico: v koliko ekipah je igralec.
  const [ekipZIgralcem, setEkipZIgralcem] = useState<number | null>(null)
  // "Ime Priimek (Klub)": isto ime v drugem klubu je drug igralec.
  useNaslov(
    igralec
      ? `${prikazniIme(igralec.full_name) || t('igralci.profil.naslov')}${igralec.team_name ? ` (${igralec.team_name})` : ''}`
      : t('igralci.profil.naslov'),
  )
  useNoindex(!nalaganje && !igralec)
  useKanonicnaLiga(vsaTekmovanja.find((tm) => tm.id === igralec?.competition_id)?.slug)

  useEffect(() => {
    let preklican = false
    async function nalozi() {
      // Kar rabi le id igralca, gre takoj, vzporedno s profilom; kar rabi
      // ligo ali klub, takoj za njim v enem krogu. Prej je bilo devet
      // zaporednih korakov (~670 ms).
      const poIdju = Promise.all([
        supabase
          .from('position_vote_counts')
          .select('position, votes')
          .eq('player_id', igralecId),
        // Za crto rabimo izhodiscno ceno.
        supabase
          .from('players')
          .select('value_start')
          .eq('id', igralecId)
          .maybeSingle(),
        // Razlaga točk per krog — nastopi + goli + asistence; tekma nosi še
        // izid in klube za kartico.
        supabase
          .from('appearances')
          .select(
            'match_id, minutes_played, goals, own_goals, penalties_missed, penalties_saved, yellow_cards, red_cards, goals_conceded, clean_sheet, matches(round_id, home_goals, away_goals, domaci:teams!matches_home_team_id_fkey(name), gostje:teams!matches_away_team_id_fkey(name), rounds(number, season, played_on))',
          )
          .eq('player_id', igralecId),
        // Asistence: število golov, kjer je ta igralec confirmed asistent
        supabase
          .from('goals')
          .select('match_id')
          .eq('assist_player_id', igralecId),
        // Zmago, prejete gole med igranjem in različico pravil kroga pove pogled.
        supabase
          .from('appearance_points')
          .select('match_id, zmaga, prejeti_na_igriscu, cista_mreza, pravila')
          .eq('player_id', igralecId),
        uporabnikId
          ? supabase
              .from('position_votes')
              .select('position')
              .eq('player_id', igralecId)
              .eq('voter_id', uporabnikId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const { data: p, error } = await supabase
        .from('player_overview')
        .select('*')
        .eq('id', igralecId)
        .maybeSingle()
      if (preklican) return
      if (error) {
        setNapaka(prevediNapako(error.message))
        setNalaganje(false)
        return
      }
      setIgralec((p as Profil | null) ?? null)
      if (!p) {
        setNalaganje(false)
        return
      }
      // Ligo poberemo kar iz igralca: stran je dosegljiva tudi neposredno s
      // povezavo, brez izbranega tekmovanja v naslovu.
      const ligaId = p.competition_id ?? 0

      const [
        [{ data: g }, { data: zac }, { data: nastopi }, { data: asistGoli }, { data: izPogleda }, { data: moj }],
        { data: tek },
        [tekocaSez, ss, c, zk],
      ] = await Promise.all([
        poIdju,
        // Naslednje tekme kluba — pomaga pri odločitvi, koga vzeti.
        p.team_id
          ? supabase
              .from('prihodnje_tekme')
              .select('round_number, played_on, opponent_id, opponent_short, opponent_name, opponent_logo, doma')
              .eq('competition_id', ligaId)
              .eq('team_id', p.team_id)
              .order('played_on')
              .limit(5)
          : Promise.resolve({ data: [] }),
        // Trenutna sezona — nanjo filtriramo številke, cene in zadnji krog.
        supabase
          .from('sezone')
          .select('season')
          .eq('competition_id', ligaId)
          .eq('tekoca', true)
          .maybeSingle()
          .then(async ({ data: sez }) => {
            const s = sez?.season ?? ''
            if (!s) return [s, null, [], null] as const
            const [r1, r2, r3] = await Promise.all([
              // Kartice s številkami kažejo tekočo sezono — lanske točke so
              // zgodovina in izhodišče za ceno, ne forma, po kateri se izbira
              // ekipa. `owners` (v koliko ekipah) gre na kartico; prej je šel
              // posebej v `player_standings`, ki računa vso ligo.
              supabase
                .from('player_season_standings')
                .select('season, points, matches, goals, minutes, owners')
                .eq('id', igralecId)
                // Liga mora biti v filtru: pogled racuna rank() po ligi in sezoni in
                // brez nje izracuna lestvico vseh lig (6,6 s namesto 0,05 s).
                .eq('competition_id', ligaId)
                .eq('season', s)
                .maybeSingle(),
              // Samo spremembe cen v TEKOČI sezoni — sicer se pokažejo lanski
              // krogi brez konteksta in delujejo kot "napovedi" za prihodnost.
              supabase
                .from('price_changes')
                .select('old_value, new_value, changed_at, rounds!inner(number, season)')
                .eq('player_id', igralecId)
                .eq('rounds.season', s)
                .order('changed_at', { ascending: false }),
              // Zadnji ODIGRANI krog: med premikoma cena ni neznana, ampak
              // mirna, in ravno to je treba videti.
              supabase
                .from('rounds')
                .select('number, matches!inner(imported_at)')
                .eq('competition_id', ligaId)
                .eq('season', s)
                .not('matches.imported_at', 'is', null)
                .order('number', { ascending: false })
                .limit(1)
                .maybeSingle(),
            ])
            return [s, r1.data, r2.data ?? [], r3.data] as const
          }),
      ])
      if (preklican) return

      setSezonsko(
        tekocaSez
          ? {
              season: tekocaSez,
              points: ss?.points ?? 0,
              matches: ss?.matches ?? 0,
              goals: ss?.goals ?? 0,
              minutes: ss?.minutes ?? 0,
            }
          : null,
      )
      setEkipZIgralcem(ss?.owners != null ? Number(ss.owners) : null)
      // Brez letošnjega nastopa igralec v player_season_standings nima vrstice,
      // v ekipah pa je lahko vseeno. Le takrat vprašamo player_standings (z
      // ligo v filtru) — mimo nalaganja, ker kartica na to ne čaka.
      if (!ss)
        supabase
          .from('player_standings')
          .select('owners')
          .eq('id', igralecId)
          .eq('competition_id', ligaId)
          .maybeSingle()
          .then(({ data }) => {
            if (!preklican) setEkipZIgralcem(data?.owners != null ? Number(data.owners) : null)
          })
      // Po krogu, ne po času zapisa: borza ob popravku zapisnika krog obračuna
      // znova in starejši krog dobi novejši `changed_at` (8., 6., 7. krog).
      setCene(
        ([...c] as any[]).sort(
          (a, b) => Number(b.rounds?.number ?? 0) - Number(a.rounds?.number ?? 0),
        ),
      )
      setIzhodisce(zac?.value_start != null ? Number(zac.value_start) : null)
      setZadnjiKrog(Number((zk as any)?.number ?? 0))
      setTekme((tek ?? []) as any[])
      setGlasovi(
        Object.fromEntries(
          ((g ?? []) as any[]).map((v) => [String(v.position), Number(v.votes)]),
        ),
      )
      setMojGlas((moj?.position as Pozicija | null) ?? null)

      const asistPoMatchu = new Map<number, number>()
      for (const gg of (asistGoli ?? []) as any[])
        asistPoMatchu.set(gg.match_id, (asistPoMatchu.get(gg.match_id) ?? 0) + 1)
      const poMatchu = new Map((izPogleda ?? []).map((x) => [x.match_id, x]))

      // Brez potrjene pozicije tock ni mogoce razcleniti; privzamemo vezista,
      // kakor je racunala tudi prejsnja razlicica.
      const pozicija = ((p as Profil | null)?.position ?? 'MID') as Pozicija
      const raz: Razlaga[] = []
      for (const n of (nastopi ?? []) as any[]) {
        const r = n.matches?.rounds
        if (!r) continue
        const v = poMatchu.get(n.match_id)
        const nastop = {
          minute: n.minutes_played,
          goli: n.goals,
          asistence: asistPoMatchu.get(n.match_id) ?? 0,
          cleanSheet: v?.cista_mreza ?? n.clean_sheet,
          prejetiGoli: v?.prejeti_na_igriscu ?? n.goals_conceded,
          zmaga: v?.zmaga,
          pravila: v?.pravila,
          obranjeneEnajstmetrovke: n.penalties_saved,
          zgreseneEnajstmetrovke: n.penalties_missed,
          avtogoli: n.own_goals,
          rumeni: n.yellow_cards,
          rdeci: n.red_cards,
        }
        const { skupaj, postavke } = tockeZaNastop(nastop, pozicija)
        raz.push({
          nastop: {
            minute: n.minutes_played,
            goli: n.goals,
            asistence: asistPoMatchu.get(n.match_id) ?? 0,
            cistaMreza: nastop.cleanSheet,
            obranjene: n.penalties_saved,
          },
          tekma: vrsticaTekme(n.matches.domaci?.name ?? null, n.matches.gostje?.name ?? null, n.matches.home_goals, n.matches.away_goals),
          round_id: n.matches.round_id,
          number: r.number,
          season: r.season,
          played_on: r.played_on,
          match_id: n.match_id,
          minute: n.minutes_played,
          postavke,
          skupaj,
        })
      }
      raz.sort((a, b) => (b.played_on ?? '').localeCompare(a.played_on ?? ''))
      setRazlage(raz)
      setNalaganje(false)
    }
    nalozi()
    return () => {
      preklican = true
    }
  }, [igralecId, uporabnikId])

  // Poročila o odsotnosti in poškodbah — ločena poizvedba, da počasnejši
  // pogled ne zadržuje profila igralca.
  useEffect(() => {
    if (!igralecId) return
    let preklican = false
    supabase
      .from('player_reports_view')
      .select('*')
      .eq('player_id', igralecId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!preklican) setPorocila((data ?? []) as Porocilo[])
      })
    return () => {
      preklican = true
    }
  }, [igralecId])

  async function objaviPorocilo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return
    const vsebina = besediloPorocila.trim()
    if (!vsebina) return
    setPosiljamPorocilo(true)
    setNapaka(null)
    const { data, error } = await supabase
      .from('player_reports')
      .insert({
        player_id: igralecId,
        user_id: session.user.id,
        kind: vrstaPorocila,
        content: vsebina,
      })
      .select('id')
      .single()
    setPosiljamPorocilo(false)
    if (error) return setNapaka(prevediNapako(error.message))
    if (data)
      setPorocila((prej) => [
        {
          id: data.id,
          player_id: igralecId,
          user_id: session.user.id,
          kind: vrstaPorocila,
          content: vsebina,
          created_at: new Date().toISOString(),
        },
        ...prej,
      ])
    setBesediloPorocila('')
  }

  async function izbrisiPorocilo(id: number) {
    const { error } = await supabase.from('player_reports').delete().eq('id', id)
    if (error) return setNapaka(prevediNapako(error.message))
    setPorocila((prej) => prej.filter((p) => p.id !== id))
  }

  // Zaporedna številka branja po glasu: dva hitra klika (DEF, nato MID)
  // sprožita dve branji in počasnejše prvo bi sicer povozilo drugo.
  const branjeGlasov = useRef(0)

  async function glasuj(pozicija: Pozicija) {
    if (!session) return
    setNapaka(null)
    const { error } = await supabase
      .from('position_votes')
      .upsert(
        {
          player_id: igralecId,
          voter_id: session.user.id,
          position: pozicija,
        },
        { onConflict: 'player_id,voter_id' },
      )
    if (error) return setNapaka(prevediNapako(error.message))

    // Glas je en sam (upsert na player_id,voter_id): ob premisleku se prestavi,
    // ne prišteje. Brez odštevanja prejšnjega bi po nekaj klikih vsaka pozicija
    // kazala svoj števec, kot da smo glasovali za vse — dokler strani ne osvežiš.
    const prejsnji = mojGlas
    setMojGlas(pozicija)
    setGlasovi((prej) => {
      if (prejsnji === pozicija) return prej
      const nov = { ...prej, [pozicija]: (prej[pozicija] ?? 0) + 1 }
      if (prejsnji) nov[prejsnji] = Math.max(0, (nov[prejsnji] ?? 0) - 1)
      return nov
    })
    setSporocilo(t('igralci.profil.hvalaGlas'))

    // Pravo stanje vseeno preberemo iz baze: medtem je lahko glasoval še kdo,
    // uteži pa niso vse enake, zato ocene ne gre puščati na naši aritmetiki.
    const to = ++branjeGlasov.current
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase.from('player_overview').select('*').eq('id', igralecId).maybeSingle(),
      supabase
        .from('position_vote_counts')
        .select('position, votes')
        .eq('player_id', igralecId),
    ])
    if (to !== branjeGlasov.current) return
    if (p) setIgralec(p as Profil)
    if (g)
      setGlasovi(
        Object.fromEntries(
          (g as any[]).map((v) => [String(v.position), Number(v.votes)]),
        ),
      )
  }

  // Kartica igralca: zadnji nastop tekoče sezone, tekma in v koliko ekipah je.
  const zadnjiNastop = sezonsko ? razlage.find((r) => r.season === sezonsko.season) ?? null : null

  // Skelet v obliki glave in številk: povezava je takoj prava, nič ne skoči.
  if (nalaganje)
    return (
      <div className="space-y-6">
        <Link to="/players" className="inline-flex min-h-11 items-center text-sm text-slate-400 hover:text-white">
          {t('igralci.profil.vsiIgralci')}
        </Link>
        <div className="-mt-3 flex items-center gap-3 sm:gap-4">
          <Skelet className="h-10 w-10 shrink-0 rounded-full sm:h-14 sm:w-14" />
          <div className="min-w-0 flex-1">
            <Skelet className="h-8 max-w-xs sm:h-9" />
            <Skelet className="h-5 max-w-[12rem]" />
          </div>
          <Skelet className="h-11 w-16" />
        </div>
        {/* višini sta izmerjeni na telefonu: številke s sezono (119 px), pozicija */}
        <Skelet className="h-[7.4375rem]" />
        <Skelet className="h-12" />
        <NalaganjeZaBralnik />
      </div>
    )
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (!igralec)
    return <p className="kartica p-6 text-center text-slate-400">{t('igralci.profil.niIgralca')}</p>

  // Povezave naprej vodijo v ligo igralca, ne v tisto, ki je izbrana v meniju
  // — igralec iz deljene povezave je lahko iz druge lige.
  const slugLige = vsaTekmovanja.find((tm) => tm.id === igralec.competition_id)?.slug
  const vLigo = slugLige ? `?t=${encodeURIComponent(slugLige)}` : ''

  const zadnjaSprememba = cene[0]
  const premik = zadnjaSprememba
    ? Number(zadnjaSprememba.new_value) - Number(zadnjaSprememba.old_value)
    : 0

  return (
    <div className="space-y-6">
      <Link to={`/players${vLigo}`} className="inline-flex min-h-11 items-center text-sm text-slate-400 hover:text-white">
        {t('igralci.profil.vsiIgralci')}
      </Link>

      {/* glava */}
      <div className="-mt-3 flex items-center gap-3 sm:gap-4">
        <span className="sm:hidden">
          <Grb ime={igralec.team_name} kratko={igralec.team_short} logo={igralec.team_logo} velikost={40} />
        </span>
        <span className="hidden sm:block">
          <Grb ime={igralec.team_name} kratko={igralec.team_short} logo={igralec.team_logo} velikost={56} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 break-words text-2xl font-black naslov sm:text-3xl">
            {prikazniIme(igralec.full_name)}
          </h1>
          <p className="text-sm text-slate-400">
            {igralec.team_id ? (
              <Link to={zLigo(`/club/${igralec.team_id}`, slugLige)} className="hover:text-gnl-300 hover:underline">
                {igralec.team_name}
              </Link>
            ) : (
              igralec.team_name
            )}
            {igralec.shirt_number != null && t('igralci.profil.stevilkaDresa', { st: igralec.shirt_number })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black tabular-nums text-gnl-300 sm:text-2xl">
            {formatirajCeno(igralec.value)}
          </div>
          <div className="whitespace-nowrap text-xs text-slate-500">
            {t('igralci.profil.cena')}
            {premik !== 0 && (
              <span className={premik > 0 ? 'text-gnl-300' : 'text-rose-400'}>
                {' '}
                {premik > 0 ? '▲' : '▼'} {formatirajPremik(premik)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* številke — tekoča sezona; seštevek vseh sezon je drugotna vrstica */}
      <div className="space-y-2">
        {sezonsko && (
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('igralci.profil.sezona', { sezona: sezonsko.season })}
          </h2>
        )}
        <div className="kartica grid grid-cols-4 divide-x divide-white/10">
          <Stevilka
            oznaka={t('igralci.profil.stevilke.tocke')}
            vrednost={formatirajTocke((sezonsko ?? igralec).points)}
          />
          <Stevilka oznaka={t('igralci.profil.stevilke.tekem')} vrednost={(sezonsko ?? igralec).matches ?? 0} />
          <Stevilka oznaka={t('igralci.profil.stevilke.golov')} vrednost={(sezonsko ?? igralec).goals ?? 0} />
          <Stevilka oznaka={t('igralci.profil.stevilke.minut')} vrednost={(sezonsko ?? igralec).minutes ?? 0} />
        </div>
        {sezonsko && (
          <p className="text-xs text-slate-500">
            {t('igralci.profil.skupajVseSezone', {
              tocke: formatirajTocke(igralec.points),
              tockeBeseda: oblika(Number(igralec.points ?? 0), TOCKE),
              tekme: mnozina(igralec.matches ?? 0, TEKME),
              goli: mnozina(igralec.goals ?? 0, GOLI),
              minute: igralec.minutes ?? 0,
            })}
          </p>
        )}
      </div>

      {/* pozicija — s hitrim glasovanjem, brez preskoka na /pozicije */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`znacka ${razredPozicije(igralec.position)}`}>
            {(igralec.position && IME_POZICIJE[igralec.position]) ??
              t('igralci.profil.pozicijaNeznana')}
          </span>
          {igralec.position_source === 'zapisnik' && (
            <span className="text-xs text-slate-500">
              {t('igralci.profil.izZapisnika')}
            </span>
          )}
        </div>

        {igralec.position_source !== 'zapisnik' && (
          <>
            <p className="text-xs text-slate-400">
              {session
                ? t('igralci.profil.glasujVprasanje')
                : t('igralci.profil.glasujPrijavljeni')}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:max-w-md">
              {POZICIJE.map((p) => {
                const izbran = mojGlas === p
                const glasov = glasovi[p] ?? 0
                return (
                  <button
                    key={p}
                    onClick={() => glasuj(p)}
                    disabled={!session}
                    aria-pressed={izbran}
                    className={`relative rounded-lg px-2 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
                      izbran
                        ? 'ring-2 ring-gnl-400'
                        : 'ring-1 ring-white/10 hover:ring-white/30'
                    } poz-${p}`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {KRATKA_POZICIJA[p]}
                      {glasov > 0 && (
                        <span className="tabular-nums opacity-70">
                          {glasov}
                        </span>
                      )}
                      {izbran && <span aria-hidden="true">✓</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            {!session && (
              <p className="text-xs text-slate-500">
                {tx('igralci.profil.zaGlasovanjePrijava', {}, {
                  povezava: (b) => (
                    <Link to={prijava} className="underline">
                      {b}
                    </Link>
                  ),
                })}
              </p>
            )}
            <p className="hidden text-[11px] text-slate-500 sm:block">
              {tx('igralci.profil.podrobenPregled', {}, {
                povezava: (b) => (
                  <Link to={`/positions${vLigo}`} className="underline hover:text-gnl-300">
                    {b}
                  </Link>
                ),
              })}
            </p>
          </>
        )}
        {sporocilo && <p className="text-sm text-gnl-300">{sporocilo}</p>}
      </section>

      {/* prihodnji nasprotniki */}
      {tekme.length > 0 && (
        <section>
          <h2 className={NASLOV}>{t('igralci.profil.naslednjeTekme')}</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {tekme.map((tk, n) => (
              <li
                key={n}
                className="flex items-center gap-1.5 text-sm"
                title={t(tk.doma ? 'igralci.profil.tekmaDoma' : 'igralci.profil.tekmaVGosteh', {
                  krog: tk.round_number,
                  nasprotnik: tk.opponent_name,
                })}
              >
                <Grb
                  ime={tk.opponent_name}
                  kratko={tk.opponent_short}
                  logo={tk.opponent_logo}
                  velikost={20}
                />
                {tk.opponent_id ? (
                  <Link to={zLigo(`/club/${tk.opponent_id}`, slugLige)} className="font-semibold hover:text-gnl-300 hover:underline">
                    {tk.opponent_short}
                  </Link>
                ) : (
                  <span className="font-semibold">{tk.opponent_short}</span>
                )}
                <span
                  className={`text-xs ${tk.doma ? 'text-gnl-300' : 'text-slate-500'}`}
                >
                  {tk.doma ? t('igralci.profil.domaKratko') : t('igralci.profil.vGostehKratko')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* odsotnosti in poškodbe — informativno, ne vpliva na sestavo ekipe */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={NASLOV}>{t('igralci.odsotnosti.naslov')}</h2>
          <Link to={`/absences${vLigo}`} className="text-xs text-gnl-300 hover:underline">
            {t('igralci.profil.vsaPorocila')}
          </Link>
        </div>

        {porocila.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t('igralci.profil.niPorocil')}
          </p>
        ) : (
          <ul className="space-y-2">
            {porocila.map((p) => (
              <VrsticaPorocila
                key={p.id}
                porocilo={p}
                naIzbris={
                  session?.user?.id === p.user_id
                    ? () => izbrisiPorocilo(p.id)
                    : undefined
                }
              />
            ))}
          </ul>
        )}

        {session ? (
          <form onSubmit={objaviPorocilo} className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {VRSTE.map((v) => (
                <button
                  key={v.kljuc}
                  type="button"
                  onClick={() => setVrstaPorocila(v.kljuc)}
                  className={`znacka transition ${
                    vrstaPorocila === v.kljuc
                      ? 'bg-gnl-500 text-slate-950'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span aria-hidden="true">{v.ikona}</span> {v.oznaka}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={besediloPorocila}
                onChange={(e) => setBesediloPorocila(e.target.value)}
                maxLength={500}
                placeholder={t('igralci.profil.porociloPrimer')}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={posiljamPorocilo || !besediloPorocila.trim()}
                className="gumb-glavni px-3 py-1.5 text-sm"
              >
                {t('igralci.odsotnosti.objavi')}
              </button>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              {t('igralci.profil.samoInformacija')}
            </p>
          </form>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            {tx('igralci.profil.zaObjavoPrijava', {}, {
              povezava: (b) => (
                <Link to={prijava} className="underline hover:text-gnl-300">
                  {b}
                </Link>
              ),
            })}
          </p>
        )}
      </section>

      {/* zadnji krogi + razlaga točk */}
      {razlage.length > 0 && (
        <section>
          <h2 className={NASLOV}>{t('igralci.profil.tockePoKrogih')}</h2>
          <p className="mb-2 hidden text-xs text-slate-500 sm:block">
            {t('igralci.profil.klikniKrog')}
          </p>
          <ul className="kartica divide-y divide-white/10 overflow-hidden">
            {razlage.map((r) => {
              const odprto = odprtRazlaga === r.round_id
              return (
                <li key={r.round_id}>
                  <button
                    onClick={() =>
                      setOdprtRazlaga(odprto ? null : r.round_id)
                    }
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/5"
                  >
                    <span className="text-slate-300">
                      <strong className="text-slate-100">
                        {t('igralci.krog', { krog: r.number })}
                      </strong>
                      <span className="ml-2 text-xs text-slate-500">
                        {t('igralci.profil.sezonaMinute', { sezona: r.season, minute: r.minute })}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`font-black tabular-nums ${
                          r.skupaj > 0
                            ? 'text-gnl-300'
                            : r.skupaj < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {formatirajTocke(r.skupaj)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {odprto ? '▲' : '▼'}
                      </span>
                    </span>
                  </button>
                  {odprto && (
                    <div className="px-3 pb-3">
                      {r.postavke.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          {t('igralci.profil.niIgralnegaCasa')}
                        </p>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {r.postavke.map((p, i) => (
                            <li
                              key={i}
                              className="flex justify-between gap-3"
                            >
                              <span className="text-slate-400">{p.opis}</span>
                              <span
                                className={`font-bold tabular-nums ${
                                  p.tocke > 0
                                    ? 'text-gnl-300'
                                    : 'text-rose-400'
                                }`}
                              >
                                {p.tocke > 0 ? '+' : ''}
                                {p.tocke}
                              </span>
                            </li>
                          ))}
                          <li className="mt-1 flex justify-between gap-3 border-t border-white/10 pt-1 text-slate-300">
                            <span className="font-semibold">{t('igralci.profil.skupaj')}</span>
                            <span className="font-black tabular-nums">
                              {formatirajTocke(r.skupaj)}
                            </span>
                          </li>
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* kartica za objavo — za igralca, starše in navijače; pod statistiko,
          da na telefonu ne odrine podatkov za cel zaslon */}
      {(zadnjiNastop || (sezonsko && (sezonsko.matches ?? 0) > 0)) && (
        <section>
          <h2 className={NASLOV}>{t('igralci.profil.deliKartico')}</h2>
          <KarticaIgralca
            podatki={{
              ime: igralec.first_name ?? '',
              priimek: igralec.last_name ?? prikazniIme(igralec.full_name),
              stevilka: igralec.shirt_number ?? null,
              pozicija: igralec.position ?? null,
              klub: igralec.team_name ?? '',
              klubKratko: igralec.team_short ?? null,
              grb: igralec.team_logo ?? null,
              liga: vsaTekmovanja.find((tm) => tm.id === igralec.competition_id)?.name ?? '',
              krog: zadnjiNastop?.number ?? null,
              tocke: zadnjiNastop ? zadnjiNastop.skupaj : Number(sezonsko?.points ?? 0),
              dosezki: zadnjiNastop ? dosezkiNastopa(zadnjiNastop.nastop, igralec.position ?? null) : [],
              nastop: zadnjiNastop?.nastop ?? null,
              tekma: zadnjiNastop?.tekma ?? null,
              sezona: sezonsko
                ? {
                    tocke: Number(sezonsko.points ?? 0),
                    tekem: Number(sezonsko.matches ?? 0),
                    golov: Number(sezonsko.goals ?? 0),
                  }
                : null,
              ekip: ekipZIgralcem,
            }}
            povezava={
              typeof window !== 'undefined'
                ? `${izvor()}/player/${igralec.id}${slugLige ? `?t=${slugLige}` : ''}`
                : ''
            }
          />
        </section>
      )}

      {/* gibanje cene */}
      {cene.length > 0 && (
        <section>
          <h2 className={NASLOV}>{t('igralci.info.gibanjeCene')}</h2>
          {(() => {
            if (izhodisce == null) return null
            const serija = serijaCen(
              izhodisce,
              cene.map((c: any) => ({
                krog: Number(c.rounds?.number ?? 0),
                nova: Number(c.new_value),
              })),
              zadnjiKrog,
            )
            if (serija.length < 2) return null
            const dp = premikSerije(serija)
            const barva = dp > 0 ? '#86efac' : dp < 0 ? '#fda4af' : '#94a3b8'
            return (
              <div className="mb-3">
                <div className="mb-1 flex items-baseline justify-between text-xs tabular-nums text-slate-400">
                  <span>
                    {t('igralci.profil.obPostavitvi', { cena: formatirajCeno(serija[0].cena) })}
                  </span>
                  <span>
                    <strong className="text-slate-200">
                      {formatirajCeno(serija[serija.length - 1].cena)}
                    </strong>
                    <span
                      className={`ml-1.5 ${
                        dp > 0
                          ? 'text-gnl-300'
                          : dp < 0
                            ? 'text-rose-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {dp > 0 ? '▲' : dp < 0 ? '▼' : '•'}{' '}
                      {formatirajPremik(dp)}
                    </span>
                  </span>
                </div>
                <svg
                  viewBox="0 0 160 40"
                  className="h-12 w-full"
                  preserveAspectRatio="none"
                  aria-label={t('igralci.profil.cenaOdDo', { od: serija[0].cena, do: serija[serija.length - 1].cena })}
                >
                  <path
                    d={crta(serija, 160, 40)}
                    fill="none"
                    stroke={barva}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t('igralci.profil.zacetekSezone')}</span>
                  <span>{t('igralci.krog', { krog: serija[serija.length - 1].krog })}</span>
                </div>
              </div>
            )
          })()}
          <ul className="divide-y divide-white/10">
            {cene.slice(0, 5).map((c, n) => {
              const d = Number(c.new_value) - Number(c.old_value)
              return (
                <li
                  key={n}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="text-slate-400">{t('igralci.krog', { krog: c.rounds?.number })}</span>
                  <span className="tabular-nums">
                    {formatirajCeno(c.old_value)} →{' '}
                    <strong>{formatirajCeno(c.new_value)}</strong>
                    <span
                      className={`ml-2 ${d > 0 ? 'text-gnl-300' : 'text-rose-400'}`}
                    >
                      {d > 0 ? '▲' : '▼'} {formatirajPremik(d)}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stevilka({
  oznaka,
  vrednost,
}: {
  oznaka: string
  vrednost: ReactNode
}) {
  return (
    <div className="px-1 py-3 text-center">
      <div className="text-lg font-black tabular-nums sm:text-xl">{vrednost}</div>
      <div className="text-[11px] text-slate-500">
        {oznaka}
      </div>
    </div>
  )
}
