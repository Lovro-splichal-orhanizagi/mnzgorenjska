import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { useTekmovanje } from '../lib/tekmovanje'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import {
  prikazniIme,
  razredPozicije,
  KRATKA_POZICIJA,
  IME_POZICIJE,
  formatirajTocke,
  formatirajCeno,
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
}

const POZICIJE: Pozicija[] = ['GK', 'DEF', 'MID', 'FWD']
const IKONA: Record<Pozicija, string> = {
  GK: '🧤',
  DEF: '🛡️',
  MID: '⚙️',
  FWD: '🎯',
}

export default function Igralec() {
  const { id } = useParams()
  // Iz naslova pride niz; stolpci so stevilcni.
  const igralecId = Number(id)
  const { session } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const lokacija = useLocation()
  const prijava = povezavaNaPrijavo(lokacija.pathname + lokacija.search)
  const { tekmovanja } = useTekmovanje()
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
  // Za kartico: tekma zadnjega nastopa in v koliko ekipah je igralec.
  const [tekmaKartice, setTekmaKartice] = useState<string | null>(null)
  const [ekipZIgralcem, setEkipZIgralcem] = useState<number | null>(null)
  useNaslov(igralec ? prikazniIme(igralec.full_name) || t('igralci.profil.naslov') : t('igralci.profil.naslov'))

  useEffect(() => {
    let preklican = false
    async function nalozi() {
      const { data: p, error } = await supabase
        .from('player_overview')
        .select('*')
        .eq('id', igralecId)
        .maybeSingle()
      if (preklican) return
      if (error) {
        setNapaka(error.message)
        setNalaganje(false)
        return
      }
      setIgralec((p as Profil | null) ?? null)

      // Trenutna sezona — potrebujemo, da price_changes filtriramo nanjo.
      // Ligo poberemo kar iz igralca: stran je dosegljiva tudi neposredno s
      // povezavo, brez izbranega tekmovanja v naslovu.
      const { data: sez } = await supabase
        .from('sezone')
        .select('season')
        .eq('competition_id', p?.competition_id ?? 0)
        .eq('tekoca', true)
        .maybeSingle()
      if (preklican) return
      const tekocaSez = sez?.season ?? ''

      // Kartice s številkami kažejo tekočo sezono — lanske točke so zgodovina
      // in izhodišče za ceno, ne forma, po kateri se izbira ekipa.
      if (tekocaSez) {
        const { data: ss } = await supabase
          .from('player_season_standings')
          .select('season, points, matches, goals, minutes')
          .eq('id', igralecId)
          // Liga mora biti v filtru: pogled racuna rank() po ligi in sezoni in
          // brez nje izracuna lestvico vseh lig (6,6 s namesto 0,05 s).
          .eq('competition_id', p?.competition_id ?? 0)
          .eq('season', tekocaSez)
          .maybeSingle()
        if (preklican) return
        setSezonsko({
          season: tekocaSez,
          points: ss?.points ?? 0,
          matches: ss?.matches ?? 0,
          goals: ss?.goals ?? 0,
          minutes: ss?.minutes ?? 0,
        })
      } else setSezonsko(null)

      const [{ data: c }, { data: g }, { data: tek }] = await Promise.all([
        // Samo spremembe cen v TEKOČI sezoni — sicer se pokažejo lanski
        // krogi brez konteksta in delujejo kot "napovedi" za prihodnost.
        supabase
          .from('price_changes')
          .select('old_value, new_value, changed_at, rounds!inner(number, season)')
          .eq('player_id', igralecId)
          .eq('rounds.season', tekocaSez)
          .order('changed_at', { ascending: false }),
        supabase
          .from('position_vote_counts')
          .select('position, votes')
          .eq('player_id', igralecId),
        // Naslednje tekme kluba — pomaga pri odločitvi, koga vzeti.
        p?.team_id
          ? supabase
              .from('prihodnje_tekme')
              .select('round_number, played_on, opponent_short, opponent_name, opponent_logo, doma')
              .eq('competition_id', p.competition_id ?? 0)
              .eq('team_id', p.team_id)
              .order('played_on')
              .limit(5)
          : Promise.resolve({ data: [] }),
      ])
      if (preklican) return
      setCene((c ?? []) as any[])

      // Za crto rabimo izhodiscno ceno in zadnji ODIGRANI krog: med
      // premikoma cena ni neznana, ampak mirna, in ravno to je treba videti.
      const [{ data: zac }, { data: zk }] = await Promise.all([
        supabase
          .from('players')
          .select('value_start')
          .eq('id', igralecId)
          .maybeSingle(),
        tekocaSez
          ? supabase
              .from('rounds')
              .select('number, matches!inner(imported_at)')
              .eq('competition_id', p?.competition_id ?? 0)
              .eq('season', tekocaSez)
              .not('matches.imported_at', 'is', null)
              .order('number', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (preklican) return
      setIzhodisce(zac?.value_start != null ? Number(zac.value_start) : null)
      setZadnjiKrog(Number((zk as any)?.number ?? 0))
      setTekme((tek ?? []) as any[])
      setGlasovi(
        Object.fromEntries(
          ((g ?? []) as any[]).map((v) => [String(v.position), Number(v.votes)]),
        ),
      )

      // Razlaga točk per krog — nastopi + goli + asistence
      const { data: nastopi } = await supabase
        .from('appearances')
        .select(
          'match_id, minutes_played, goals, own_goals, penalties_missed, penalties_saved, yellow_cards, red_cards, goals_conceded, clean_sheet, matches(round_id, rounds(number, season, played_on))',
        )
        .eq('player_id', igralecId)
      // Asistence: število golov, kjer je ta igralec confirmed asistent
      const { data: asistGoli } = await supabase
        .from('goals')
        .select('match_id')
        .eq('assist_player_id', igralecId)
      const asistPoMatchu = new Map<number, number>()
      for (const gg of (asistGoli ?? []) as any[])
        asistPoMatchu.set(gg.match_id, (asistPoMatchu.get(gg.match_id) ?? 0) + 1)

      // Brez potrjene pozicije tock ni mogoce razcleniti; privzamemo vezista,
      // kakor je racunala tudi prejsnja razlicica.
      const pozicija = ((p as Profil | null)?.position ?? 'MID') as Pozicija
      const raz: Razlaga[] = []
      for (const n of (nastopi ?? []) as any[]) {
        const r = n.matches?.rounds
        if (!r) continue
        const nastop = {
          minute: n.minutes_played,
          goli: n.goals,
          asistence: asistPoMatchu.get(n.match_id) ?? 0,
          cleanSheet: n.clean_sheet,
          prejetiGoli: n.goals_conceded,
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
            cistaMreza: n.clean_sheet,
            obranjene: n.penalties_saved,
          },
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

      if (uporabnikId) {
        const { data: moj } = await supabase
          .from('position_votes')
          .select('position')
          .eq('player_id', igralecId)
          .eq('voter_id', uporabnikId)
          .maybeSingle()
        if (!preklican) setMojGlas((moj?.position as Pozicija | null) ?? null)
      } else setMojGlas(null)
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
    if (error) return setNapaka(error.message)
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
    if (error) return setNapaka(error.message)
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
    if (error) return setNapaka(error.message)

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
  const tekmaZadnjega = zadnjiNastop?.match_id ?? null
  const ligaIgralca = igralec?.competition_id ?? null
  useEffect(() => {
    let veljavno = true
    ;(async () => {
      const [rTekma, rEkip] = await Promise.all([
        tekmaZadnjega
          ? supabase
              .from('matches')
              .select(
                'home_goals, away_goals, domaci:teams!matches_home_team_id_fkey(name), gostje:teams!matches_away_team_id_fkey(name)',
              )
              .eq('id', tekmaZadnjega)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Z ligo v filtru pogled ne racuna lestvice vseh lig (0,8 s namesto 0,05 s).
        ligaIgralca != null
          ? supabase
              .from('player_standings')
              .select('owners')
              .eq('id', igralecId)
              .eq('competition_id', ligaIgralca)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!veljavno) return
      const tk = rTekma.data as any
      setTekmaKartice(
        tk ? vrsticaTekme(tk.domaci?.name ?? null, tk.gostje?.name ?? null, tk.home_goals, tk.away_goals) : null,
      )
      setEkipZIgralcem(rEkip.data?.owners != null ? Number(rEkip.data.owners) : null)
    })()
    return () => {
      veljavno = false
    }
  }, [tekmaZadnjega, igralecId, ligaIgralca])

  if (nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (!igralec)
    return <p className="kartica p-6 text-center text-slate-400">{t('igralci.profil.niIgralca')}</p>

  // Povezave naprej vodijo v ligo igralca, ne v tisto, ki je izbrana v meniju
  // — igralec iz deljene povezave je lahko iz druge lige.
  const slugLige = tekmovanja.find((tm) => tm.id === igralec.competition_id)?.slug
  const vLigo = slugLige ? `?t=${encodeURIComponent(slugLige)}` : ''

  const zadnjaSprememba = cene[0]
  const premik = zadnjaSprememba
    ? Number(zadnjaSprememba.new_value) - Number(zadnjaSprememba.old_value)
    : 0

  return (
    <div className="space-y-5">
      <Link to={`/players${vLigo}`} className="text-sm text-slate-400 hover:text-white">
        {t('igralci.profil.vsiIgralci')}
      </Link>

      {/* glava */}
      <div className="kartica flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <Grb
          ime={igralec.team_name}
          kratko={igralec.team_short}
          logo={igralec.team_logo}
          velikost={56}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black naslov sm:text-3xl">
            {prikazniIme(igralec.full_name)}
          </h1>
          <p className="text-sm text-slate-400">
            {igralec.team_name}
            {igralec.shirt_number != null && t('igralci.profil.stevilkaDresa', { st: igralec.shirt_number })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tabular-nums text-gnl-300">
            {formatirajCeno(igralec.value)}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {t('igralci.profil.cena')}
            {premik !== 0 && (
              <span className={premik > 0 ? 'text-gnl-300' : 'text-rose-400'}>
                {' '}
                {premik > 0 ? '▲' : '▼'} {Math.abs(premik).toFixed(1)}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* kartica za objavo — za igralca, starše in navijače */}
      {(zadnjiNastop || (sezonsko && (sezonsko.matches ?? 0) > 0)) && (
        <section className="kartica space-y-3 p-4">
          <h2 className="text-sm font-bold text-slate-200">{t('igralci.profil.deliKartico')}</h2>
          <KarticaIgralca
            podatki={{
              ime: igralec.first_name ?? '',
              priimek: igralec.last_name ?? prikazniIme(igralec.full_name),
              stevilka: igralec.shirt_number ?? null,
              pozicija: igralec.position ?? null,
              klub: igralec.team_name ?? '',
              klubKratko: igralec.team_short ?? null,
              grb: igralec.team_logo ?? null,
              liga: tekmovanja.find((tm) => tm.id === igralec.competition_id)?.name ?? '',
              krog: zadnjiNastop?.number ?? null,
              tocke: zadnjiNastop ? zadnjiNastop.skupaj : Number(sezonsko?.points ?? 0),
              dosezki: zadnjiNastop ? dosezkiNastopa(zadnjiNastop.nastop, igralec.position ?? null) : [],
              nastop: zadnjiNastop?.nastop ?? null,
              tekma: zadnjiNastop ? tekmaKartice : null,
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
                ? `${window.location.origin}/igralec/${igralec.id}${slugLige ? `?t=${slugLige}` : ''}`
                : ''
            }
          />
        </section>
      )}

      {/* pozicija — s hitrim glasovanjem, brez preskoka na /pozicije */}
      <section className="kartica space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`znacka ${razredPozicije(igralec.position)}`}>
            <span aria-hidden="true">
              {igralec.position ? IKONA[igralec.position] : '❔'}
            </span>{' '}
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POZICIJE.map((p) => {
                const izbran = mojGlas === p
                const glasov = glasovi[p] ?? 0
                return (
                  <button
                    key={p}
                    onClick={() => glasuj(p)}
                    disabled={!session}
                    aria-pressed={izbran}
                    className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                      izbran
                        ? 'ring-2 ring-gnl-400'
                        : 'ring-1 ring-white/10 hover:ring-white/30'
                    } poz-${p}`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <span aria-hidden="true">{IKONA[p]}</span> {KRATKA_POZICIJA[p]}
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
            <p className="text-[11px] text-slate-500">
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
        <section className="kartica p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('igralci.profil.naslednjeTekme')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {tekme.map((tk, n) => (
              <li
                key={n}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm"
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
                <span className="font-semibold">{tk.opponent_short}</span>
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
      <section className="kartica p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('igralci.odsotnosti.naslov')}
          </h2>
          <Link to={`/absences${vLigo}`} className="text-xs text-gnl-300 hover:underline">
            {t('igralci.profil.vsaPorocila')}
          </Link>
        </div>

        {porocila.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">
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
                className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={posiljamPorocilo || !besediloPorocila.trim()}
                className="gumb-glavni px-4 text-sm"
              >
                {t('igralci.odsotnosti.objavi')}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {t('igralci.profil.samoInformacija')}
            </p>
          </form>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
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
        <section className="kartica p-3 sm:p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('igralci.profil.tockePoKrogih')}
          </h2>
          <p className="mb-3 text-[11px] text-slate-500">
            {t('igralci.profil.klikniKrog')}
          </p>
          <ul className="space-y-1">
            {razlage.map((r) => {
              const odprto = odprtRazlaga === r.round_id
              return (
                <li key={r.round_id} className="rounded-lg bg-white/5">
                  <button
                    onClick={() =>
                      setOdprtRazlaga(odprto ? null : r.round_id)
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
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
                    <div className="border-t border-white/5 px-3 py-2">
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

      {/* gibanje cene */}
      {cene.length > 0 && (
        <section className="kartica p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('igralci.info.gibanjeCene')}
          </h2>
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
                      {Math.abs(dp).toFixed(1)}
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
          <ul className="space-y-1">
            {cene.slice(0, 5).map((c, n) => {
              const d = Number(c.new_value) - Number(c.old_value)
              return (
                <li
                  key={n}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5 text-sm"
                >
                  <span className="text-slate-400">{t('igralci.krog', { krog: c.rounds?.number })}</span>
                  <span className="tabular-nums">
                    {formatirajCeno(c.old_value)} →{' '}
                    <strong>{formatirajCeno(c.new_value)}</strong>
                    <span
                      className={`ml-2 ${d > 0 ? 'text-gnl-300' : 'text-rose-400'}`}
                    >
                      {d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}
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
    <div className="kartica p-3 text-center">
      <div className="text-xl font-black tabular-nums">{vrednost}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {oznaka}
      </div>
    </div>
  )
}
