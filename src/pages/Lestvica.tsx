import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { useAuth } from '../lib/useAuth'
import Plakat from '../components/Plakat'
import { najboljsiTrije, type VrsticaIgralca } from '../lib/plakat'
import { supabase } from '../lib/supabase'
import { vseVrstice } from '../lib/strani'
import Sponzor from '../components/Sponzor'
import { formatirajTocke, tockZ } from '../lib/pomozno'
import { useNaslov, zDrzavo } from '../lib/naslov'
import { useTekmovanje } from '../lib/tekmovanje'
import { sestejOdKroga } from '../lib/lestvica'
import MojeMiniLige from '../components/MojeMiniLige'
import NavijaciKlubov from '../components/NavijaciKlubov'
import { t, datum } from '../i18n'
import { izvor } from '../lib/platforma'

const MEDALJE = ['🥇', '🥈', '🥉']

/** Krog sezone, kot ga rabi ta stran. */
interface Krog {
  id: number
  number: number
  season: string
}

/** Vrstica `fantasy_round_standings` — tocke ekipe v enem krogu. */
interface TockeKroga {
  round_id: number
  fantasy_team_id: number
  team_name: string | null
  owner_name: string | null
  points: number | null
  penalty: number | null
  transfers: number | null
  rank?: number | null
}

/**
 * Vrstica lestvice. Skupna lestvica prinese `total_points`, sestevek "od
 * kroga N naprej" pa `points` — zato sta oba neobvezna in prikaz izbere
 * pravega.
 */
interface VrsticaLestvice {
  fantasy_team_id: number
  team_name: string | null
  owner_name: string | null
  total_points?: number | null
  points?: number | null
  penalty?: number | null
  transfers?: number | null
  team_created_at?: string | null
  owner_registered_at?: string | null
  krogov?: number
}

/** Zmagovalec enega kroga — vrstica s stevilko kroga zraven. */
type ZmagovalecKroga = TockeKroga & { round_number: number; season: string }

export default function Lestvica() {
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  useNaslov(zDrzavo(tekmovanje), t('lestvice.lestvica.naslov'))
  const { session } = useAuth()
  const [ekipe, setEkipe] = useState<VrsticaLestvice[]>([])
  const [krog, setKrog] = useState<Krog | null>(null)
  const [krogLestvica, setKrogLestvica] = useState<TockeKroga[]>([])
  // Svojo ekipo potrebujemo, da lahko manager deli SVOJ rezultat kroga —
  // to je edina stvar na strani, ki se ponovi vsak teden.
  const [mojaEkipa, setMojaEkipa] = useState<number | null>(null)
  // Za plakat: kdo mi je v tem krogu prinesel največ. Bere zaklenjeno
  // postavo, isto kot stran tuje ekipe — po roku je javna.
  const [mojiNajboljsi, setMojiNajboljsi] = useState<VrsticaIgralca[]>([])
  const [vsiKrogiOdigrani, setVsiKrogiOdigrani] = useState<Krog[]>([])
  const [odigraneTocke, setOdigraneTocke] = useState<TockeKroga[]>([])
  // filter "od kroga N naprej"
  const [odKroga, setOdKroga] = useState(1)
  // Dolga lestvica se na telefonu vleče v nedogled — najprej pokaže vrh.
  const [koliko, setKoliko] = useState(50)
  // Ekipa, do katere naj stran skoči, ko se izriše (gumb "Moje mesto").
  const [skociNa, setSkociNa] = useState<number | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  // Napaka pri krogih (zmagovalec, lestvica kroga) ne sme skriti skupne lestvice.
  const [napakaKrogov, setNapakaKrogov] = useState<string | null>(null)
  const uporabnikId = session?.user.id
  // Zavihek pod lestvico: ekipe ali navijači klubov. `#fans` odpre navijače
  // (povezava s strani kluba).
  const { hash } = useLocation()
  const [zavihek, setZavihek] = useState<'ekipe' | 'navijaci'>(
    hash === '#fans' ? 'navijaci' : 'ekipe',
  )

  useEffect(() => {
    if (!uporabnikId || !tekmovanjeId) {
      setMojaEkipa(null)
      return
    }
    let veljavno = true
    ;(async () => {
      const { data } = await supabase
        .from('fantasy_teams')
        .select('id')
        .eq('owner_id', uporabnikId)
        .eq('competition_id', tekmovanjeId)
        .maybeSingle()
      if (veljavno) setMojaEkipa(data?.id ?? null)
    })()
    return () => {
      veljavno = false
    }
  }, [uporabnikId, tekmovanjeId])

  useEffect(() => {
    if (!tekmovanjeId) return
    // Ob zamenjavi lige začnemo znova: filter "od kroga" in napaka sta
    // pripadala prejšnji, odgovori prejšnje pa ne smejo prepisati nove.
    let veljavno = true
    setNalaganje(true)
    setNapaka(null)
    setNapakaKrogov(null)
    setOdKroga(1)
    setKoliko(50)
    const ligaId = tekmovanjeId
    // Po straneh: velika liga ima lahko čez tisoč ekip.
    vseVrstice((od, do_) =>
      supabase
        .from('fantasy_team_standings')
        .select(
          'fantasy_team_id, team_name, owner_name, owner_registered_at, team_created_at, total_points',
        )
        .eq('competition_id', ligaId)
        .order('total_points', { ascending: false })
        .order('fantasy_team_id')
        .range(od, do_),
    )
      .then((data) => {
        if (veljavno) setEkipe(data as VrsticaLestvice[])
      })
      .catch((e: Error) => {
        if (veljavno) setNapaka(e.message)
      })
      .finally(() => {
        if (veljavno) setNalaganje(false)
      })

    // Zmagovalec zadnjega odigranega kroga — ta je pogosto zanimivejši od
    // skupne lestvice, ker se menja vsak teden.
    //
    // Vse troje gre v en val: prej so se poizvedbe verižile (krog → krogi
    // sezone → točke), čeprav nobena ni rabila izida prejšnje — kroge lahko
    // preberemo za vse sezone in filtriramo tu. Lestvica kroga je bila celo
    // četrta poizvedba nad vrsticami, ki smo jih že imeli; zdaj vzamemo `rank`
    // zraven in jo sestavimo iz istih podatkov.
    async function nalozi() {
      const [zadnjiOdgovor, krogiOdgovor, vseTockeOdgovor] = await Promise.all([
        supabase
          .from('zadnji_odigrani_krog')
          .select('id, season, number')
          .eq('competition_id', ligaId)
          .maybeSingle(),
        supabase
          .from('rounds')
          .select('id, number, season')
          .eq('competition_id', ligaId)
          .order('number', { ascending: true }),
        // Po straneh: 119 ekip krat 9 krogov je čez tisoč vrstic.
        vseVrstice((od, do_) =>
          supabase
            .from('fantasy_round_standings')
            .select(
              'round_id, fantasy_team_id, team_name, owner_name, points, penalty, transfers, rank',
            )
            .eq('competition_id', ligaId)
            .order('round_id')
            .order('fantasy_team_id')
            .range(od, do_),
        ),
      ])
      if (!veljavno) return
      if (zadnjiOdgovor.error) throw new Error(zadnjiOdgovor.error.message)
      if (krogiOdgovor.error) throw new Error(krogiOdgovor.error.message)
      const zadnji = zadnjiOdgovor.data
      // Pogled vrne nullable stolpce; brez id-ja ali sezone kroga ni.
      const krogOk: Krog | null =
        zadnji && zadnji.id != null && zadnji.season != null
          ? { id: zadnji.id, number: zadnji.number ?? 0, season: zadnji.season }
          : null
      setKrog(krogOk)
      if (!krogOk) {
        setVsiKrogiOdigrani([])
        setOdigraneTocke([])
        setKrogLestvica([])
        return
      }

      const vseTocke = vseTockeOdgovor
      const idsOdigranih = new Set<number>()
      // Odigran = ima fantasy_round_standings vrstice
      for (const t of vseTocke ?? [])
        if (t.round_id != null) idsOdigranih.add(t.round_id)
      const odigraniKrogi = ((krogiOdgovor.data ?? []) as Krog[]).filter(
        (k) => k.season === krogOk.season && idsOdigranih.has(k.id),
      )
      setVsiKrogiOdigrani(odigraniKrogi)
      setOdigraneTocke((vseTocke ?? []) as TockeKroga[])

      // Cela lestvica kroga: svoj rezultat iščemo v njej, plakat pa rabi
      // število vseh ekip. Na zaslon gre le vrh.
      setKrogLestvica(
        ((vseTocke ?? []) as TockeKroga[])
          .filter((t) => t.round_id === krogOk.id)
          .sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0)),
      )
    }
    nalozi().catch((e: Error) => {
      if (!veljavno) return
      setNapakaKrogov(e.message)
      setKrog(null)
      setVsiKrogiOdigrani([])
      setOdigraneTocke([])
      setKrogLestvica([])
    })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  // Zmagovalec vsakega odigranega kroga — pregled sezone kdo je bil #1
  // kdaj. Iz fantasy_round_standings vzamemo vrstico z max points na
  // krog. (transfer penalty je že odšteta v .points, glede na definicijo
  // pogleda? Če ne, preverimo tudi tam.)
  const zmagovalciKrogov = useMemo(() => {
    const najPoKrogu = new Map<number, TockeKroga>()
    for (const t of odigraneTocke) {
      const prej = najPoKrogu.get(t.round_id)
      if (!prej || Number(t.points ?? 0) > Number(prej.points ?? 0)) {
        najPoKrogu.set(t.round_id, t)
      }
    }
    // Poveži s številkami krogov, sortiraj naraščajoče po number.
    return [...najPoKrogu.entries()]
      .map(([roundId, t]) => {
        const k = vsiKrogiOdigrani.find((x) => x.id === roundId)
        return k ? { ...t, round_number: k.number, season: k.season } : null
      })
      .filter((z): z is ZmagovalecKroga => z !== null)
      .sort((a, b) => a.round_number - b.round_number)
  }, [odigraneTocke, vsiKrogiOdigrani])

  // Lestvica "od kroga N naprej": sešteje točke krogov te sezone, katerih
  // number >= odKroga. Kazni NE odšteva — v `points` je že vštetá (glej
  // `sestejOdKroga`). Seštevek je v `lib/lestvica.ts`, da ga preverja smoke.
  const lestvicaOd = useMemo<VrsticaLestvice[] | null>(() => {
    if (odKroga <= 1) return null // enako kot Skupno
    const idsOd = new Set<number>(
      vsiKrogiOdigrani.filter((k) => k.number >= odKroga).map((k) => k.id),
    )
    return sestejOdKroga(odigraneTocke, idsOd)
  }, [odKroga, vsiKrogiOdigrani, odigraneTocke])

  useEffect(() => {
    if (!mojaEkipa || !krog?.id) {
      setMojiNajboljsi([])
      return
    }
    let veljavno = true
    ;(async () => {
      const { data } = await supabase.rpc('tuja_postava', {
        p_team: mojaEkipa,
        p_round: krog.id,
      })
      if (!veljavno) return
      // Mnozitelj je ze vracunan: kapetanovih 12 je 4 x 3.
      const zTockami = ((data ?? []) as any[])
        .filter((v) => v.mnozitelj > 0)
        .map((v) => ({ ime: v.ime, tocke: Number(v.tocke) * v.mnozitelj, je_kapetan: v.je_kapetan }))
      setMojiNajboljsi(najboljsiTrije(zTockami))
    })()
    return () => {
      veljavno = false
    }
  }, [mojaEkipa, krog?.id])

  // Povezava `#fans` pripelje do zavihkov, ki stojijo pod zmagovalci krogov.
  // Brskalnik sam ne skoči, ker elementa ob nalaganju še ni.
  useEffect(() => {
    if (nalaganje || hash !== '#fans') return
    document.getElementById('fans')?.scrollIntoView({ block: 'start' })
  }, [nalaganje, hash])

  // Skok šele po izrisu: vrstica je morda za "Pokaži več" in je še ni.
  useEffect(() => {
    if (skociNa === null) return
    document.getElementById(`ekipa-${skociNa}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setSkociNa(null)
  }, [skociNa, koliko])

  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  if (ekipe.length === 0)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {t('lestvice.lestvica.naslov')}
          {tekmovanje?.short_name
            ? ` — ${tekmovanje.short_name}`
            : ''}
        </h1>
        <p className="text-sm text-slate-400">
          {t('lestvice.lestvica.prazna')}
        </p>
      </div>
    )

  const seznam = lestvicaOd ?? ekipe
  const mojeMesto = mojaEkipa ? seznam.findIndex((e) => e.fantasy_team_id === mojaEkipa) : -1

  const zmagovalecKroga = krogLestvica[0]
  const mojRezultat = mojaEkipa
    ? krogLestvica.find((e) => e.fantasy_team_id === mojaEkipa)
    : undefined

  const zavihekRazred = (izbran: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-semibold transition ${
      izbran ? 'bg-gnl-500 text-slate-950' : 'text-slate-300 hover:text-white'
    }`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black naslov sm:text-3xl">
        {t('lestvice.lestvica.naslov')}
        {tekmovanje?.short_name ? ` — ${tekmovanje.short_name}` : ''}
      </h1>

      {/* Najprej moje mini lige: trije prijatelji so igra, dvanajst tujcev ni. */}
      <MojeMiniLige ekipaId={mojaEkipa} />

      {napakaKrogov && (
        <p role="alert" className="text-sm text-rose-300">
          {t('lestvice.lestvica.napakaKrogov', { napaka: napakaKrogov })}
        </p>
      )}

      {/* Svoj rezultat kroga — edina stvar, ki se ponovi vsak teden in jo
          človek rad pokaže. Pokažemo jo NAD lestvico, ker je njegova. */}
      {mojRezultat && (
        <section className="space-y-3 rounded-2xl bg-gnl-500/5 p-3 ring-1 ring-gnl-400/20 sm:p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-slate-400">
              {t('lestvice.lestvica.tvojRezultatZadnji')}
            </span>
            <span className="font-black tabular-nums">
              {formatirajTocke(mojRezultat.points)} {tockZ(mojRezultat.points)}
              {mojRezultat.rank ? (
                <span className="ml-2 text-sm font-bold text-gnl-300">
                  {t('lestvice.mesto', { mesto: mojRezultat.rank })}
                </span>
              ) : null}
            </span>
          </div>
          <Plakat
            podatki={{
              vrsta: 'krog',
              ekipa: mojRezultat.team_name ?? t('lestvice.lestvica.mojaEkipa'),
              liga: tekmovanje?.name ?? '',
              tocke: formatirajTocke(mojRezultat.points),
              krog: krog?.number ?? 0,
              mesto: mojRezultat.rank ?? null,
              odEkip: krogLestvica.length || null,
              igralci: mojiNajboljsi,
            }}
            povezava={
              typeof window !== 'undefined'
                ? `${izvor()}/ekipa/${mojRezultat.fantasy_team_id}`
                : ''
            }
          />
        </section>
      )}

      <section className="space-y-3">
        {/* Ekipe ali navijači klubov (ljudje igrajo tudi za svoj klub) in
            filter "od kroga N naprej" — če se ekipa priključi kasneje, ima
            še zmeraj svojo lestvico. */}
        <div id="fans" className="flex scroll-mt-20 flex-wrap items-center justify-between gap-2">
          <div role="tablist" className="inline-flex rounded-lg bg-white/5 p-0.5">
            {(['ekipe', 'navijaci'] as const).map((z) => (
              <button
                key={z}
                role="tab"
                aria-selected={zavihek === z}
                onClick={() => setZavihek(z)}
                className={zavihekRazred(zavihek === z)}
              >
                {z === 'ekipe'
                  ? t('lestvice.lestvica.zavihekEkipe')
                  : t('lestvice.lestvica.zavihekNavijaci')}
              </button>
            ))}
          </div>
          {zavihek === 'ekipe' && vsiKrogiOdigrani.length > 1 && (
            <select
              value={odKroga}
              onChange={(e) => setOdKroga(Number(e.target.value))}
              aria-label={t('lestvice.lestvica.pozneje')}
              title={t('lestvice.lestvica.pozneje')}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value={1}>{t('lestvice.lestvica.celotnaSezona')}</option>
              {vsiKrogiOdigrani
                .filter((k) => k.number > 1)
                .map((k) => (
                  <option key={k.id} value={k.number}>
                    {t('lestvice.lestvica.odKroga', { n: k.number })}
                  </option>
                ))}
            </select>
          )}
        </div>

        {zavihek === 'navijaci' ? (
          <NavijaciKlubov tekmovanjeId={tekmovanjeId} />
        ) : (
          <>
            {(zmagovalecKroga || mojeMesto >= 0) && (
              <div className="flex items-center justify-between gap-3 text-sm">
                {zmagovalecKroga ? (
                  <p className="min-w-0 truncate text-slate-400">
                    {t('lestvice.lestvica.zmagovalecKroga', { krog: krog?.number })}:{' '}
                    <Link
                      to={`/team/${zmagovalecKroga.fantasy_team_id}`}
                      className="font-semibold text-slate-100 hover:text-gnl-300"
                    >
                      {zmagovalecKroga.team_name}
                    </Link>{' '}
                    · <span className="font-bold tabular-nums text-gnl-300">{formatirajTocke(zmagovalecKroga.points)}</span>
                  </p>
                ) : (
                  <span />
                )}
                {mojeMesto >= 0 && (
                  <button
                    onClick={() => {
                      setKoliko((k) => Math.max(k, mojeMesto + 1))
                      setSkociNa(mojaEkipa)
                    }}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-gnl-300 hover:bg-gnl-500/10"
                  >
                    {t('lestvice.mojeMesto')}
                  </button>
                )}
              </div>
            )}

            <ol className="kartica divide-y divide-white/10 overflow-hidden">
              {seznam.slice(0, koliko).map((e, i) => {
                const tocke = lestvicaOd ? Number(e.points ?? 0) : Number(e.total_points ?? 0)
                const moja = e.fantasy_team_id === mojaEkipa
                return (
                  <li
                    key={e.fantasy_team_id}
                    id={`ekipa-${e.fantasy_team_id}`}
                    className={`relative flex scroll-mt-24 items-center gap-3 px-3 py-2.5 transition hover:bg-white/5 sm:px-4 ${
                      moja ? 'bg-gnl-500/10 shadow-[inset_3px_0_0_theme(colors.gnl.400)]' : ''
                    }`}
                  >
                    <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-slate-400">
                      {/* Medalja in mesto šele, ko je kaj točk: pri samih ničlah
                          bi mesto določil le vrstni red vnosa. */}
                      {tocke > 0 ? (MEDALJE[i] ?? i + 1) : '–'}
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Povezava z ::after pokrije celo vrstico, da se tapne vsa. */}
                      <Link
                        to={`/team/${e.fantasy_team_id}`}
                        className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-300"
                      >
                        {e.team_name}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        {e.owner_name}
                        {(e.team_created_at ?? e.owner_registered_at) && (
                          <span className={`${e.owner_name ? 'ml-1 ' : ''}hidden sm:inline`}>
                            {/* Hišna ekipa nima imena lastnika — brez vodilne pike. */}
                            {t('lestvice.lestvica.igraOd', {
                              datum: datum((e.team_created_at ?? e.owner_registered_at) as string, {
                                day: 'numeric',
                                month: 'numeric',
                                year: 'numeric',
                              }),
                            }).replace(/^·\s*/, e.owner_name ? '· ' : '')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-gnl-300">
                      {formatirajTocke(tocke)}
                    </span>
                  </li>
                )
              })}
            </ol>
            {seznam.length > koliko && (
              <div className="text-center">
                <button onClick={() => setKoliko(koliko + 50)} className="gumb-tih text-sm">
                  {t('lestvice.pokaziVec', { n: seznam.length - koliko })}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Zmagovalci vseh odigranih krogov — pregled sezone, zaprt, da ne
          odrine lestvice. */}
      {zmagovalciKrogov.length > 0 && (
        <details className="group text-sm">
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 py-1 font-semibold text-slate-300 hover:text-white">
            <span>
              <span className="mr-1 inline-block text-slate-500 transition group-open:rotate-90">›</span>
              {t('lestvice.lestvica.zmagovalciPoKrogih')}
            </span>
            <span className="text-xs font-normal text-slate-500">
              {t('lestvice.lestvica.odigraniKrogi', { n: zmagovalciKrogov.length })}
            </span>
          </summary>
          <ul className="mt-2 divide-y divide-white/10">
            {zmagovalciKrogov.map((z) => (
              <li key={z.round_id} className="flex items-center gap-3 py-2">
                <span className="w-14 shrink-0 text-xs text-slate-500">
                  {t('lestvice.krog', { n: z.round_number })}
                </span>
                <Link
                  to={`/team/${z.fantasy_team_id}`}
                  className="min-w-0 flex-1 truncate font-semibold hover:text-gnl-300"
                >
                  {z.team_name}
                </Link>
                <span className="hidden text-xs text-slate-500 sm:inline">{z.owner_name}</span>
                <span className="font-bold tabular-nums text-gnl-300">
                  {formatirajTocke(z.points)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Sponzorsko mesto. Dokler `sponzorji_vidni` ni 1, se ne izriše nič —
          stoji pod lestvico, ne nad njo. */}
      <Sponzor kje="lestvica" />
    </div>
  )
}
