import { useEffect, useState, type ReactNode } from 'react'
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
import { PokritostStatistike, usePokritostStatistike, usePokritostZgodovine, brezPreverjenihNastopov } from '../components/PokritostStatistike'
import FotoIgralca from '../components/FotoIgralca'
import ZnakPreverjen from '../components/ZnakPreverjen'
import PrevzemIgralca from '../components/PrevzemIgralca'
import IzbranostIgralca from '../components/IzbranostIgralca'
import Razpolozljivost from '../components/Razpolozljivost'
import KarticaIgralca from '../components/KarticaIgralca'
import IzlozbaIgralca from '../components/IzlozbaIgralca'
import { naloziIzlozbo, type Izlozba } from '../lib/izlozba'
import { jeMladinskiSlug, useFotografija } from '../lib/prevzem'
import { dosezkiNastopa, odstotekIzbranosti } from '../lib/karticaIgralca'
import { naloziRazlage, type Razlaga } from '../lib/razlagaTock'
import { SeznamPostavk, RazlagaCene } from '../components/Razlaga'
import type { Pozicija } from '../lib/tipi'
import { t, tx } from '../i18n'
import { izvor } from '../lib/platforma'
import { naTrgu } from '../lib/osnutek'
import { zabeleziKorak } from '../lib/lijak'
import PopravekIgralca from '../components/PopravekIgralca'
import { usePonovnaCena, PonovnaCenaAkcija, PonovnaCenaPovratno, PonovnaCenaOkno } from '../components/PonovnaCena'
import { prevediNapako } from '../lib/napake'
import { NalaganjeZaBralnik, Skelet } from '../components/Skelet'
import GumbGoogle from '../components/GumbGoogle'

/** Vrstica pogleda `player_overview` — profil igralca. */
type Profil = Record<string, any> & {
  id: number
  competition_id?: number | null
  team_id?: number | null
  position?: Pozicija | null
  full_name?: string | null
  active?: boolean | null
  izstopil_at?: string | null
}

/** Številke tekoče sezone (`player_season_standings`). */
interface Sezonsko {
  season: string
  points: number | null
  matches: number | null
  goals: number | null
  minutes: number | null
}

/** Naslov razdelka — enak povsod na strani. */
const NASLOV = 'mb-2 text-base font-bold text-slate-100'

export default function Igralec() {
  const { id } = useParams()
  // Iz naslova pride niz; stolpci so stevilcni.
  const igralecId = Number(id)
  const { session, loading: nalaganjeSeje } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const lokacija = useLocation()
  const prijava = povezavaNaPrijavo(lokacija.pathname + lokacija.search)
  // Statistika igralca je le za prijavljene (kot seznam igralcev, 20. 10. 2026):
  // gost vidi ime, klub in gumb "v ekipo", namesto številk pa povabilo k registraciji.
  const gost = !nalaganjeSeje && !session
  const { vsaTekmovanja } = useTekmovanje()
  const [igralec, setIgralec] = useState<Profil | null>(null)
  const ponovnaCena = usePonovnaCena(gost ? undefined : igralec?.id)
  // Fotografija s profila potrjenega igralca je privzeta slika na kartici za deljenje.
  const fotoProfila = useFotografija(igralec?.id ?? null)
  // Številke tekoče sezone; `igralec` (player_overview) je seštevek vseh sezon.
  const [sezonsko, setSezonsko] = useState<Sezonsko | null>(null)
  const pokritost = usePokritostStatistike(igralec?.competition_id, sezonsko?.season)
  const zgodovina = usePokritostZgodovine(igralec?.competition_id)
  const brezOpazovanj = brezPreverjenihNastopov(pokritost, (sezonsko ?? igralec)?.matches)
  const [razlage, setRazlage] = useState<Razlaga[]>([])
  const [odprtRazlaga, setOdprtRazlaga] = useState<number | null>(null)
  const [cene, setCene] = useState<any[]>([])
  // Ime je skrito na željo kluba (ugovor), ne zaradi neaktivnosti.
  const [naZeljoKluba, setNaZeljoKluba] = useState(false)
  useEffect(() => {
    setNaZeljoKluba(false)
    if (!igralec?.id || !String(igralec.full_name ?? '').startsWith('#')) return
    let veljavno = true
    void supabase
      .from('players')
      .select('anonimiziran_razlog')
      .eq('id', igralec.id)
      .maybeSingle()
      .then(({ data }) => {
        if (veljavno) setNaZeljoKluba(data?.anonimiziran_razlog === 'ugovor')
      })
    return () => {
      veljavno = false
    }
  }, [igralec?.id, igralec?.full_name])
  const [izhodisce, setIzhodisce] = useState<number | null>(null)
  const [zadnjiKrog, setZadnjiKrog] = useState(0)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  // Za kartico: v koliko ekipah je igralec.
  const [ekipZIgralcem, setEkipZIgralcem] = useState<number | null>(null)
  // Imenovalec izbranosti na kartici: človeške ekipe lige (kot stran Igralci).
  const [ekipVLigi, setEkipVLigi] = useState<number | null>(null)
  // Potrjeni lastnik profila deli "svojo" kartico.
  const [jeLastnik, setJeLastnik] = useState(false)
  // Izložba preverjenega polnoletnega igralca (posnetki); null brez nje.
  const [izlozba, setIzlozba] = useState<Izlozba | null>(null)
  const osveziIzlozbo = async () => setIzlozba(await naloziIzlozbo(igralecId))
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
        // Za crto rabimo izhodiscno ceno.
        supabase
          .from('players')
          .select('value_start')
          .eq('id', igralecId)
          .maybeSingle(),
        // Razlaga točk po krogih; tekma nosi še izid in klube za kartico.
        naloziRazlage(igralecId),
        // Izložba gre z glavo, da stran ob prikazu ne skoči.
        naloziIzlozbo(igralecId),
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
        [{ data: zac }, raz, izl],
        [tekocaSez, ss, c, zk],
      ] = await Promise.all([
        poIdju,
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
      supabase
        .from('fantasy_teams')
        .select('id', { count: 'exact', head: true })
        .eq('competition_id', ligaId)
        .eq('hisna', false)
        .then(({ count }) => {
          if (!preklican) setEkipVLigi(count ?? null)
        })
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
      setRazlage(raz)
      setIzlozba(izl)
      setNalaganje(false)
    }
    nalozi()
    return () => {
      preklican = true
    }
  }, [igralecId, uporabnikId])

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

  const anonimiziran = String(igralec.full_name ?? '').startsWith('#')
  // Kartice ni za mladinske lige (mladoletni) in za igralce s skritim imenom.
  const smeKartico = !anonimiziran && !!slugLige && !jeMladinskiSlug(slugLige)
  const povezavaKartice = smeKartico
    ? `${izvor()}/player/${igralec.id}?t=${encodeURIComponent(slugLige)}&src=kartica`
    : ''

  const zadnjaSprememba = cene[0]
  const premik = zadnjaSprememba
    ? Number(zadnjaSprememba.new_value) - Number(zadnjaSprememba.old_value)
    : 0

  // Cena: v glavi ali v izložbi (desno ob imenu).
  const blokCene = !gost && (
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
      <RazlagaCene cena={igralec.value} izhodisce={izhodisce} />
      <PonovnaCenaAkcija krmilo={ponovnaCena} />
    </div>
  )
  // Preverjen polnoleten igralec: izložba (posnetki, pasica, opis) namesto glave.
  const zIzlozbo = !!izlozba?.dovoljena && !anonimiziran

  return (
    <div className="space-y-6">
      <Link to={`/players${vLigo}`} className="inline-flex min-h-11 items-center text-sm text-slate-400 hover:text-white">
        {t('igralci.profil.vsiIgralci')}
      </Link>

      {zIzlozbo && izlozba ? (
        <div className="-mt-3">
          <IzlozbaIgralca
            izlozba={izlozba}
            igralec={{ ...igralec, full_name: prikazniIme(igralec.full_name) }}
            liga={vsaTekmovanja.find((tm) => tm.id === igralec.competition_id)?.name ?? null}
            slugLige={slugLige}
            gost={gost}
            desno={blokCene || undefined}
            naSpremembo={osveziIzlozbo}
          />
        </div>
      ) : (
      /* glava */
      <div className="-mt-3 flex items-center gap-3 sm:gap-4">
        {/* Potrjen igralec s fotografijo: fotografija namesto grba kluba. */}
        <span className="sm:hidden">
          <FotoIgralca
            id={igralec.id}
            velikost={48}
            nadomestek={<Grb ime={igralec.team_name} kratko={igralec.team_short} logo={igralec.team_logo} velikost={40} />}
          />
        </span>
        <span className="hidden sm:block">
          <FotoIgralca
            id={igralec.id}
            velikost={72}
            nadomestek={<Grb ime={igralec.team_name} kratko={igralec.team_short} logo={igralec.team_logo} velikost={56} />}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 break-words text-2xl font-black naslov sm:text-3xl">
            {prikazniIme(igralec.full_name)}
            <ZnakPreverjen id={igralec.id} velikost={22} className="ml-2" />
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
          {naZeljoKluba && <p className="text-xs text-slate-500">{t('skupno.naZeljoKluba')}</p>}
        </div>
        {blokCene}
      </div>
      )}
      <PonovnaCenaPovratno krmilo={ponovnaCena} />
      <PonovnaCenaOkno krmilo={ponovnaCena} />

      {/* Deljena povezava na igralca vodi v igro: dodaj ga v svojo ekipo (tudi brez računa). */}
      {slugLige && naTrgu(igralec) && !String(igralec.full_name ?? '').startsWith('#') && (
        <Link
          to={zLigo(`/my-team?dodaj=${igralec.id}`, slugLige)}
          onClick={() => zabeleziKorak('igralec_cta')}
          className="gumb-glavni flex w-full flex-col items-center"
        >
          <span>{t('igralci.profil.vEkipo')}</span>
          <span className="text-xs font-normal opacity-80">{t('igralci.profil.vEkipoBrezplacno')}</span>
        </Link>
      )}

      {gost ? (
        <div className="kartica max-w-sm space-y-3 p-4 text-sm text-slate-300">
          <p>
            {tx(
              'igralci.profil.leZaRegistrirane',
              {},
              {
                prijava: (b) => (
                  <Link to={prijava} className="font-semibold text-gnl-300 underline">
                    {b}
                  </Link>
                ),
              },
            )}
          </p>
          <GumbGoogle nazaj={lokacija.pathname + lokacija.search} />
        </div>
      ) : nalaganjeSeje ? null : (
        <>
      {/* prevzem profila: značka in predstavitev potrjenega igralca, "To sem jaz" */}
      <PrevzemIgralca
        igralecId={igralec.id}
        slugLige={slugLige}
        anonimiziran={anonimiziran}
        naLastnika={setJeLastnik}
        vIzlozbi={zIzlozbo}
        ponudbaIzlozbe={!!izlozba && izlozba.lastnik && !izlozba.dovoljena && izlozba.vidi && izlozba.odrasla}
        odrasel={smeKartico}
      />

      {/* Izbranost: le za preverjene (baza drugim vrne prazno), brez mladinskih lig */}
      {smeKartico && <IzbranostIgralca igralecId={igralec.id} />}

      {/* številke — tekoča sezona; seštevek vseh sezon je drugotna vrstica */}
      <div className="space-y-2">
        {sezonsko && (
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('igralci.profil.sezona', { sezona: sezonsko.season })}
          </h2>
        )}
        <PokritostStatistike podatki={pokritost} />
        {zgodovina.filter(s => s.season !== sezonsko?.season).map(s => (
          <PokritostStatistike key={s.season} podatki={s} />
        ))}
        {/* V izložbi so številke sezone že na vrhu. */}
        {!zIzlozbo && (
        <div className="kartica grid grid-cols-4 divide-x divide-white/10">
          <Stevilka
            oznaka={t('igralci.profil.stevilke.tocke')}
            vrednost={brezOpazovanj ? '—' : formatirajTocke((sezonsko ?? igralec).points)}
          />
          <Stevilka oznaka={t('igralci.profil.stevilke.tekem')} vrednost={brezOpazovanj ? '—' : (sezonsko ?? igralec).matches ?? 0} />
          <Stevilka oznaka={t('igralci.profil.stevilke.golov')} vrednost={brezOpazovanj ? '—' : (sezonsko ?? igralec).goals ?? 0} />
          <Stevilka oznaka={t('igralci.profil.stevilke.minut')} vrednost={brezOpazovanj ? '—' : (sezonsko ?? igralec).minutes ?? 0} />
        </div>
        )}
        {sezonsko && !zgodovina.some(s => brezPreverjenihNastopov(s, igralec.matches)) && (
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

      {/* pozicija: glasovanje je na strani Pozicije, tu le povezava, dokler ni potrjena */}
      <section className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`znacka ${razredPozicije(igralec.position)}`}>
          {(igralec.position && IME_POZICIJE[igralec.position]) ??
            t('igralci.profil.pozicijaNeznana')}
        </span>
        {igralec.position_source === 'zapisnik' ? (
          <span className="text-xs text-slate-500">{t('igralci.profil.izZapisnika')}</span>
        ) : (
          igralec.team_id && (
            <Link
              to={`/positions?t=${encodeURIComponent(slugLige ?? '')}&klub=${igralec.team_id}&igralec=${igralec.id}`}
              className="inline-flex min-h-11 items-center text-xs text-gnl-300 hover:underline"
            >
              {t('igralci.profil.potrdiPozicijo')}
            </Link>
          )
        )}
        {igralec.team_id && (
          <Link
            to={zLigo(`/club/${igralec.team_id}`, slugLige)}
            className="inline-flex min-h-11 items-center text-xs text-gnl-300 hover:underline sm:ml-auto"
          >
            {t('igralci.profil.klubTekme')}
          </Link>
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
                      <SeznamPostavk razlaga={r} />
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


      {/* razpoložljivost: uradno stanje in poročila skupnosti, obrazca zaprta */}
      <Razpolozljivost igralecId={igralec.id} vLigo={vLigo} nazaj={lokacija.pathname + lokacija.search} />

      {session && !anonimiziran && (
        <PopravekIgralca
          igralecId={igralec.id}
          pozicija={(igralec.position as Pozicija | null) ?? null}
          aktiven={igralec.active !== false}
        />
      )}

      {/* kartica za objavo — za igralca, starše in navijače; pod statistiko,
          da na telefonu ne odrine podatkov za cel zaslon */}
      {smeKartico && (zadnjiNastop || (sezonsko && (sezonsko.matches ?? 0) > 0)) && (
        <section>
          <h2 className={NASLOV}>
            {jeLastnik ? t('igralci.profil.deliSvojoKartico') : t('igralci.profil.deliKartico')}
          </h2>
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
              cena: igralec.value != null ? Number(igralec.value) : null,
              premikCene: premik,
              izbran: odstotekIzbranosti(ekipZIgralcem, ekipVLigi),
              naslov: povezavaKartice,
            }}
            fotografija={fotoProfila}
            povezava={povezavaKartice}
          />
        </section>
      )}

        </>
      )}

      {/* ugovor proti SLFF Scout: na vsaki javni strani igralca (spec, razdelek 2) */}
      {!anonimiziran && !!slugLige && !jeMladinskiSlug(slugLige) && (
        <p className="text-xs text-slate-500">
          <Link to="/legal#scout" className="underline hover:text-slate-300">
            {t('igralci.scout.ugovorPovezava')}
          </Link>
        </p>
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
