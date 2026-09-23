import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { vseVrstice } from '../lib/strani'
import { povezavaNaPrijavo } from '../lib/prijava'
import { nastaviNeshranjeno, VPRASANJE_ZAPUSTITVE } from '../lib/neshranjeno'
import { useOdsotni, opisOdsotnosti, type Odsotnost as PorociloOdsotnosti } from '../lib/odsotni'
import { useNaslov } from '../lib/naslov'
import type { Odsotnost } from '../lib/odsotni'
import { useAuth } from '../lib/useAuth'
import { preberiVabilo, pozabiVabilo } from '../lib/miniLige'
import PovabiSoigralce from '../components/PovabiSoigralce'
import {
  VELIKOST_EKIPE,
  STEVILO_PRVIH,
  MAX_IZ_KLUBA,
  PRORACUN,
  POZICIJE,
  VRSTNI_RED,
  KAPETAN_MNOZITELJ,
  poPozicijah,
  lahkoZacne,
  zakajNeGre,
  preveriEkipo,
  lahkoUrejasPripomocek,
} from '../lib/pravila'
import {
  prikazniIme,
  razredPozicije,
  KRATKA_POZICIJA,
  formatirajCeno,
  mnozina,
  oblika,
  IGRALCI,
  TOCKE,
  TOCK_RODILNIK,
  TOCKE_TOZILNIK,
} from '../lib/pomozno'
import { useTekmovanje } from '../lib/tekmovanje'
import Igrisce from '../components/Igrisce'
import Grb from '../components/Grb'
import Odstevanje from '../components/Odstevanje'
import EnajstericaNaIgriscu from '../components/EnajstericaNaIgriscu'
import InfoIgralca from '../components/InfoIgralca'
import { predlagajKader } from '../lib/predlogKadra'
import type { IgralecNaIgriscu } from '../components/Igrisce'
import type { Pozicija } from '../lib/tipi'

/** Igralec na trgu (`player_overview` / `player_season_standings`). */
interface IgralecTrga {
  id: number
  full_name: string | null
  position: Pozicija | null
  team_id: number | null
  team_name?: string | null
  team_short?: string | null
  team_logo?: string | null
  value: number | null
  points?: number | null
  form?: number | null
  minutes?: number | null
  goals?: number | null
  active?: boolean | null
  [k: string]: any
}

/** Vrstica kadra, kakor jo hrani stran pred shranjevanjem. */
interface VrsticaKadra {
  player_id: number
  is_starter: boolean
  is_captain: boolean
  is_vice: boolean
  buy_value: number
  buy_position: Pozicija | null
  bench_order?: number | null
}

/** Časi rokov so v lokalnem času lige, ne naprave. */
const OBLIKA_ROKA: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Ljubljana',
}
const izpisRoka = (rok: string) => new Date(rok).toLocaleString('sl-SI', OBLIKA_ROKA)

/** Najdaljše ime ekipe (enako kot pri mini ligah). */
const NAJDALJSE_IME = 40

const BREZPLACNI: [string, string, string, string] = [
  'brezplačen',
  'brezplačna',
  'brezplačni',
  'brezplačnih',
]

/** Denar v centih, da vsota ne pokaže "-0,0". */
const centi = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 100)

/** Supabase vrne napako v objektu; tu jo spremenimo v izjemo. */
function podatki<T>(odgovor: { data: T; error: { message: string } | null }): T {
  if (odgovor.error) throw new Error(odgovor.error.message)
  return odgovor.data
}

/**
 * Surova napaka baze ali omrežja v slovenščini. Sporočila, ki jih sestavi naš
 * SQL (npr. "Premalo sredstev …"), so že slovenska in ostanejo, kot so.
 */
function napakaShranjevanja(e: { message?: string; code?: string } | null | undefined): string {
  const sporocilo = e?.message ?? ''
  const s = sporocilo.toLowerCase()
  if (/[čšž]/i.test(sporocilo) || /^(Premalo|Ni |V ekipi|Kader|Izberi|Rok|Vrste)/.test(sporocilo))
    return sporocilo
  if (e?.code === '23505' || s.includes('duplicate key') || s.includes('unique constraint'))
    return 'Ekipo v tej ligi že imaš — naloži stran znova.'
  if (e?.code === '42501' || s.includes('row-level security') || s.includes('permission denied'))
    return 'Za to nimaš dovoljenja. Prijavi se znova in poskusi še enkrat.'
  if (s.includes('failed to fetch') || s.includes('network') || s.includes('load failed'))
    return 'Ni povezave s strežnikom. Preveri internet in poskusi znova.'
  return 'Shranjevanje ni uspelo. Poskusi znova.'
}

/** Kader brez cen — za primerjavo z zadnjim shranjenim stanjem. */
function kljucKadra(izbrani: VrsticaKadra[]): string {
  const vrstica = (s: VrsticaKadra) =>
    `${s.player_id}:${s.is_starter ? 1 : 0}${s.is_captain ? 1 : 0}${s.is_vice ? 1 : 0}`
  const prvi = izbrani.filter((s) => s.is_starter).map(vrstica).sort()
  // Na klopi šteje vrstni red — po njem gredo samodejne menjave.
  const klop = izbrani.filter((s) => !s.is_starter).map(vrstica)
  return `${prvi.join(',')}|${klop.join(',')}`
}

const PRAZEN_KADER = kljucKadra([])

/** Posnetki postav ekipe; čez več sezon jih je lahko več kot tisoč. */
function preberiPosnetke(ekipaId: number) {
  return vseVrstice((od, do_) =>
    supabase
      .from('fantasy_lineups')
      .select(
        'round_id, player_id, is_starter, is_captain, is_vice, bench_order, position, rounds(number, season, played_on)',
      )
      .eq('fantasy_team_id', ekipaId)
      .order('round_id', { ascending: false })
      .order('player_id')
      .range(od, do_),
  )
}

/** Klop po vrsti (`bench_order`), prva postava ostane, kakor je. */
function poVrstiKlopi<T extends { is_starter: boolean; bench_order?: number | null }>(
  vrstice: T[],
): T[] {
  const mesto = (s: T) => (s.is_starter ? -1 : (s.bench_order ?? 99))
  return [...vrstice].sort((a, b) => mesto(a) - mesto(b))
}

/**
 * Zadnja zaklenjena postava ISTE sezone pred krogom — od nje baza šteje
 * prestope. Lanska postava ni izhodišče: nova sezona je nov začetek.
 */
function postavaZaPrestope(
  posnetki: Array<{ round_id: number; player_id: number; rounds: { number: number | null; season: string | null } | null }>,
  krog: KrogRok | null,
): number[] | null {
  if (!krog?.season) return null
  let zadnji: { round_id: number; number: number } | null = null
  for (const p of posnetki) {
    const n = p.rounds?.number
    if (p.rounds?.season !== krog.season || n == null) continue
    if (krog.number != null && n >= krog.number) continue
    if (!zadnji || n > zadnji.number) zadnji = { round_id: p.round_id, number: n }
  }
  if (!zadnji) return null
  return posnetki.filter((p) => p.round_id === zadnji!.round_id).map((p) => p.player_id)
}

/** Krog s rokom. */
interface KrogRok {
  id: number
  number: number | null
  season?: string | null
  played_on?: string | null
  deadline_at?: string | null
  competition_id?: number | null
  lineups_locked_at?: string | null
}

function odsotnostZaIgrisce(o: PorociloOdsotnosti | undefined): IgralecNaIgriscu['odsotnost'] {
  if (!o || (o.kind !== 'poskodba' && o.kind !== 'odsotnost')) return null
  return { vrsta: o.kind, opis: opisOdsotnosti(o) }
}

export default function MojaEkipa() {
  const { session, loading } = useAuth()
  useNaslov('Moja ekipa')
  // Ob osvežitvi žetona (in ob vrnitvi v zavihek) useAuth nastavi NOV objekt
  // seje za istega človeka. Nalaganje zato visi na id-ju, ne na seji — sicer
  // bi vsaka osvežitev pobrisala nesharanjen kader.
  const uporabnikId = session?.user.id ?? null
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const [ekipa, setEkipa] = useState<any | null>(null)
  const [imeEkipe, setImeEkipe] = useState('')
  const [igralci, setIgralci] = useState<IgralecTrga[]>([])
  const [izbrani, setIzbrani] = useState<VrsticaKadra[]>([])
  // Set player_id-jev, ki so bili v DB ob nalaganju. Nujno za izračun
  // "denar od prodaje" — sprememba glede na ta izhodiščni stanje pove,
  // koliko denarja se osvobodi (odstranjeni) oz. porabi (dodani).
  const [zacetniIds, setZacetniIds] = useState<Set<number>>(new Set())
  // Kader, kakršen je v bazi — po njem vemo, ali so spremembe neshranjene.
  const [shranjenKljuc, setShranjenKljuc] = useState(PRAZEN_KADER)
  const [krogi, setKrogi] = useState<KrogRok[]>([])
  const [naslednjiKrog, setNaslednjiKrog] = useState<KrogRok | null>(null)
  const [zadnjiKrog, setZadnjiKrog] = useState<KrogRok | null>(null)
  // player_id -> tocke zadnjega kroga
  const [tockeZadnjiKrog, setTockeZadnjiKrog] = useState<Record<string, number>>(
    {},
  )
  const [posnetkiPoKrogih, setPosnetkiPoKrogih] = useState<any[]>([])
  const [zgodovinaKrogId, setZgodovinaKrogId] = useState<number | null>(null)
  const [pripomocki, setPripomocki] = useState<any[]>([])
  // Sezona, v kateri veljajo pripomočki (enkratni na sezono).
  const [sezonaPripomockov, setSezonaPripomockov] = useState<string | null>(null)
  const [zaklenjenaPostava, setZaklenjenaPostava] = useState<number[] | null>(null)
  const [pravila, setPravila] = useState({ prosti: 3, kazen: 4 })
  const [izbranKrog, setIzbranKrog] = useState('')
  const [casPripomockov, setCasPripomockov] = useState(Date.now)
  const [nalaganje, setNalaganje] = useState(true)
  // Delno naložena stran ne sme shranjevati: shrani_ekipo zamenja CEL kader,
  // in kar se ni naložilo, bi izginilo.
  const [napakaNalaganja, setNapakaNalaganja] = useState<string | null>(null)
  const [poskus, setPoskus] = useState(0)
  const [shranjujem, setShranjujem] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  // Odstranjen igralec za gumb "Razveljavi" — vrne se na isto mesto in vlogo.
  const [razveljavi, setRazveljavi] = useState<{
    vrstica: VrsticaKadra
    mesto: number
    ime: string
  } | null>(null)
  // Po shranjeni ekipi je pravi trenutek za povabilo v mini ligo: clovek je
  // ravno vlozil delo in hoce nekoga, ki ga bo premagal.
  const [pokaziVabilo, setPokaziVabilo] = useState(false)
  const navigate = useNavigate()
  const lokacija = useLocation()
  const [napaka, setNapaka] = useState<string | null>(null)
  const [filterKlub, setFilterKlub] = useState<string>('vsi')
  const [filterPoz, setFilterPoz] = useState<Pozicija | 'vse'>('vse')
  const [iskanje, setIskanje] = useState('')
  // Na telefonu je trg predal, ki se odpre ob kliku na prazno mesto.
  const [odprtTrg, setOdprtTrg] = useState(false)
  // Iz praznega mesta uporabnik brska po poziciji, ne išče imena — takrat
  // tipkovnica ne sme prekriti pol seznama.
  const [trgZIskanjem, setTrgZIskanjem] = useState(false)
  // Igralec, za katerega je odprta plosca s podatki.
  const [info, setInfo] = useState<IgralecTrga | null>(null)
  const imeRef = useRef<HTMLInputElement | null>(null)
  const odsotni = useOdsotni(tekmovanjeId)
  // Osvežitev roka potrebuje zadnjo ekipo in ligo, ne tistih iz časa, ko je
  // bil časovnik nastavljen.
  const ekipaIdRef = useRef<number | null>(null)
  ekipaIdRef.current = ekipa?.id ?? null
  const ligaRef = useRef<number | null>(null)
  ligaRef.current = tekmovanjeId

  // Rok, naslednji krog in izhodišče prestopov. Ob roku se vse to premakne,
  // stran pa je lahko odprta ure — brez osvežitve bi kazala zaklenjen krog.
  async function osveziRok() {
    const ligaId = ligaRef.current
    if (!ligaId) return
    try {
      const [rNaslednji, rKrogi] = await Promise.all([
        supabase
          .from('naslednji_krog')
          .select('id, number, season, played_on, deadline_at')
          .eq('competition_id', ligaId)
          .maybeSingle(),
        supabase
          .from('rounds')
          .select('id, season, number, played_on, deadline_at, competition_id, lineups_locked_at')
          .eq('competition_id', ligaId)
          .order('number', { ascending: true }),
      ])
      const naslednji = podatki(rNaslednji)
      const vsiKrogi = podatki(rKrogi)
      const ekipaId = ekipaIdRef.current
      const posnetki = ekipaId ? await preberiPosnetke(ekipaId) : []
      if (ligaRef.current !== ligaId) return
      const krog = naslednji && naslednji.id != null ? (naslednji as KrogRok) : null
      setKrogi(vsiKrogi ?? [])
      setNaslednjiKrog(krog)
      setZaklenjenaPostava(postavaZaPrestope(posnetki as any[], krog))
    } catch {
      // Osvežitev v ozadju: ob napaki ostane zadnje znano stanje.
    }
  }

  // Ob roku se zaprejo tudi že odprti gumbi in seznam krogov.
  useEffect(() => {
    const zdaj = Date.now()
    const roki = krogi.map((k) => Date.parse(k.deadline_at ?? '')).filter((r) => r > zdaj)
    if (!roki.length) return
    const timer = setTimeout(() => {
      setCasPripomockov(Date.now())
      osveziRok()
    }, Math.min(Math.min(...roki) - zdaj + 1, 2147483647))
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krogi, casPripomockov])

  // Rok je potekel, krog pa se še ni zaklenil (zaklep teče po cronu) — čez
  // minuto pogledamo znova, da naslednji krog pride sam.
  useEffect(() => {
    const rok = Date.parse(naslednjiKrog?.deadline_at ?? '')
    if (!Number.isFinite(rok) || rok > Date.now()) return
    const timer = setTimeout(() => osveziRok(), 60000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naslednjiKrog])

  // Sporocilo o uspehu shrani samo za nekaj sekund — kot toast. Napake pustimo,
  // dokler jih uporabnik ne odpravi.
  useEffect(() => {
    if (!sporocilo) return
    const t = setTimeout(() => setSporocilo(null), 4000)
    return () => clearTimeout(t)
  }, [sporocilo])

  useEffect(() => {
    if (!razveljavi) return
    const t = setTimeout(() => setRazveljavi(null), 7000)
    return () => clearTimeout(t)
  }, [razveljavi])

  // Neshranjene spremembe: kader, postava, trak ali vrstni red klopi.
  const neshranjeno =
    !nalaganje && !napakaNalaganja && kljucKadra(izbrani) !== shranjenKljuc

  // Izbirnik lige in odjava v meniju vprašata sama (lib/neshranjeno).
  useEffect(() => {
    nastaviNeshranjeno(neshranjeno)
    return () => nastaviNeshranjeno(false)
  }, [neshranjeno])

  // Zapiranje zavihka ali osvežitev strani z neshranjenim kadrom.
  useEffect(() => {
    if (!neshranjeno) return
    const opozori = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', opozori)
    return () => window.removeEventListener('beforeunload', opozori)
  }, [neshranjeno])

  // Klik na povezavo znotraj aplikacije (meni, profil igralca …). Usmerjevalnik
  // ni podatkovni, zato useBlocker ne deluje; klik prestrežemo pred Reactom.
  useEffect(() => {
    if (!neshranjeno) return
    const prestrezi = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== window.location.origin) return
      // Pot in iskanje: /moja-ekipa?t=druga je druga liga in zavrže kader.
      if (a.pathname + a.search === window.location.pathname + window.location.search) return
      if (!window.confirm(VPRASANJE_ZAPUSTITVE)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', prestrezi, true)
    return () => document.removeEventListener('click', prestrezi, true)
  }, [neshranjeno])

  useEffect(() => {
    if (loading || !tekmovanjeId) return
    // Ob preklopu lige začnemo znova — ekipa, kader in zgodovina so vezani
    // na tekmovanje, mešanica obojega bi pomenila neveljaven kader.
    setNalaganje(true)
    setNapakaNalaganja(null)
    setEkipa(null)
    setImeEkipe('')
    setKrogi([])
    setNaslednjiKrog(null)
    setZadnjiKrog(null)
    setIzbranKrog('')
    setIzbrani([])
    setZacetniIds(new Set())
    setShranjenKljuc(PRAZEN_KADER)
    setPripomocki([])
    setSezonaPripomockov(null)
    setPokaziVabilo(false)
    setZaklenjenaPostava(null)
    setPosnetkiPoKrogih([])
    setTockeZadnjiKrog({})
    setFilterKlub('vsi')
    setFilterPoz('vse')
    setIskanje('')
    setInfo(null)
    setOdprtTrg(false)
    setSporocilo(null)
    setNapaka(null)
    setRazveljavi(null)
    if (!uporabnikId) {
      setNalaganje(false)
      return
    }
    const ligaId = tekmovanjeId
    const uid = uporabnikId
    // Odgovor stare lige, ki prispe po preklopu, ne sme pristati v novi.
    let veljavno = true

    // Na trgu štejejo LETOŠNJE številke — lanska sezona je zgodovina in služi
    // le izhodiščni ceni. Dokler igralec letos še ni igral, ob njih izpišemo
    // lansko, izrecno označeno: po prvem krogu so sicer vse ničle, mladinec z
    // lansko generacijo pa ne sme izgledati boljši, kot letos je.
    async function zStatistikoSezone(seznam: any[], sezone: any[]) {
      const letos = (
        sezone.find((s: any) => s.tekoca && s.odigranih > 0) ??
        sezone.find((s: any) => s.odigranih > 0) ??
        sezone[0]
      )?.season
      if (!letos) return seznam
      const lani = sezone.find(
        (s: any) => s.season !== letos && s.odigranih > 0,
      )?.season

      const zaSezono = (sezona?: string | null) =>
        sezona
          ? vseVrstice((od, do_) =>
              supabase
                .from('player_season_standings')
                .select('id, goals, minutes, points, form')
                .eq('competition_id', ligaId)
                .eq('season', sezona)
                .order('id')
                .range(od, do_),
            )
          : Promise.resolve([])

      const [statLetos, statLani] = await Promise.all([
        zaSezono(letos),
        zaSezono(lani),
      ])
      const letosPo = new Map(statLetos.map((s) => [s.id, s]))
      const laniPo = new Map(statLani.map((s) => [s.id, s]))

      return seznam.map((i) => ({
        ...i,
        goals: letosPo.get(i.id)?.goals ?? 0,
        minutes: letosPo.get(i.id)?.minutes ?? 0,
        // Točke za predlog kadra: letošnje, ne seštevek vseh sezon.
        points: letosPo.get(i.id)?.points ?? 0,
        form: letosPo.get(i.id)?.form ?? 0,
        goli_lani: laniPo.get(i.id)?.goals ?? 0,
      }))
    }

    async function nalozi() {
      // Vse, kar ni odvisno drugo od drugega, gre hkrati — zaporedne poizvedbe
      // so na mobilnem omrežju pomenile nekaj sekund praznega čakanja.
      const [vsi, rKrogi, rNaslednji, rMoja, rNast, rSezone, rZadnji] = await Promise.all([
        vseVrstice((od, do_) =>
          supabase
            .from('player_overview')
            .select(
              'id, full_name, position, team_id, team_name, team_short, team_logo, value, points, goals, minutes, active',
            )
            .eq('competition_id', ligaId)
            .order('value', { ascending: false })
            .order('id')
            .range(od, do_),
        ),
        supabase
          .from('rounds')
          .select('id, season, number, played_on, deadline_at, competition_id, lineups_locked_at')
          .eq('competition_id', ligaId)
          .order('number', { ascending: true }),
        supabase
          .from('naslednji_krog')
          .select('id, number, season, played_on, deadline_at')
          .eq('competition_id', ligaId)
          .maybeSingle(),
        supabase
          .from('fantasy_teams')
          .select('id, name, budget, cash')
          .eq('owner_id', uid)
          .eq('competition_id', ligaId)
          .maybeSingle(),
        supabase
          .from('settings')
          .select('key, value')
          .in('key', ['prosti_prestopi', 'kazen_prestopa']),
        supabase
          .from('sezone')
          .select('season, odigranih, tekoca')
          .eq('competition_id', ligaId)
          .order('season', { ascending: false }),
        supabase
          .from('zadnji_odigrani_krog')
          .select('id, number, season')
          .eq('competition_id', ligaId)
          .maybeSingle(),
      ])
      const vsiKrogi = podatki(rKrogi) ?? []
      const naslednjiVrstica = podatki(rNaslednji)
      const moja = podatki(rMoja)
      const nast = podatki(rNast)
      const zadnjiVrstica = podatki(rZadnji)
      const sezone = podatki(rSezone) ?? []
      const zStatistiko = await zStatistikoSezone(vsi, sezone)
      const naslednji =
        naslednjiVrstica && naslednjiVrstica.id != null
          ? (naslednjiVrstica as KrogRok)
          : null
      const zadnji =
        zadnjiVrstica && zadnjiVrstica.id != null ? (zadnjiVrstica as KrogRok) : null

      // Točke zadnjega odigranega kroga za VSE igralce lige — trg jih kaže
      // ob vsakem imenu in "Kaj-če" jih rabi tudi za pravkar dodane.
      const tocke = zadnji
        ? await vseVrstice((od, do_) =>
            supabase
              .from('player_scores')
              .select('player_id, points')
              .eq('round_id', zadnji.id)
              .order('player_id')
              .range(od, do_),
          )
        : []
      if (!veljavno) return

      const tockePo: Record<string, number> = {}
      for (const t of tocke)
        tockePo[String(t.player_id)] = (tockePo[String(t.player_id)] ?? 0) + Number(t.points)

      let ekipaStanje: null | {
        nabor: VrsticaKadra[]
        chips: any[]
        posnetki: any[]
        zgod: any[]
      } = null

      // Pripomoček je enkraten na SEZONO: lanski vložek letos ne šteje.
      // Brez naslednjega kroga (konec sezone) velja tekoča sezona; krogi so
      // urejeni le po številki, zato zadnji med njimi ni nujno letošnji.
      const sezona: string | null =
        naslednji?.season ??
        sezone.find((s: any) => s.tekoca)?.season ??
        sezone[0]?.season ??
        [...vsiKrogi]
          .filter((k) => k.season)
          .sort((a, b) => String(a.season).localeCompare(String(b.season)) || a.number - b.number)
          .pop()?.season ??
        null

      if (moja) {
        const [rNabor, rChips, posnetki, rSkupno] = await Promise.all([
          supabase
            .from('fantasy_roster')
            .select('player_id, is_starter, is_captain, is_vice, buy_value, buy_position, bench_order')
            .eq('fantasy_team_id', moja.id),
          sezona
            ? supabase
                .from('fantasy_chips')
                .select('chip, round_id')
                .eq('fantasy_team_id', moja.id)
                .eq('season', sezona)
            : Promise.resolve({ data: [], error: null }),
          // Posnetki postav: izhodišče za prestope in zgodovina krogov.
          preberiPosnetke(moja.id),
          // Točke krogov po samodejnih menjavah in odbitkih — iste kot na lestvici.
          supabase
            .from('fantasy_round_points')
            .select('round_id, points')
            .eq('fantasy_team_id', moja.id),
        ])
        const nabor = poVrstiKlopi((podatki(rNabor) ?? []) as VrsticaKadra[])
        const skupno = new Map(
          (podatki(rSkupno) ?? []).map((r) => [r.round_id, r.points]),
        )

        // Zgodovina postav — za vsak odigrani krog vzamemo fantasy_lineups
        // snapshot in točke igralcev. Uporabniku omogoča ogled "kakšno ekipo
        // sem imel v N. krogu".
        const idsIgralcev = [...new Set(posnetki.map((p) => p.player_id))]
        const roundIds = [...new Set(posnetki.map((p) => p.round_id))]
        const [rDet, vseTocke] = await Promise.all([
          idsIgralcev.length
            ? supabase
                .from('player_overview')
                .select('id, full_name, team_name, team_short, team_logo, value')
                .in('id', idsIgralcev)
            : Promise.resolve({ data: [], error: null }),
          roundIds.length
            ? vseVrstice((od, do_) =>
                supabase
                  .from('player_scores')
                  .select('round_id, player_id, points')
                  .in('round_id', roundIds)
                  .in('player_id', idsIgralcev)
                  .order('round_id')
                  .order('player_id')
                  .range(od, do_),
              )
            : Promise.resolve([]),
        ])
        const igralecPo = Object.fromEntries(
          ((podatki(rDet as any) as any[] | null) ?? []).map((i: any) => [i.id, i]),
        )
        const tockeZgod = new Map<string, number>()
        for (const t of vseTocke as any[])
          tockeZgod.set(
            `${t.round_id}-${t.player_id}`,
            (tockeZgod.get(`${t.round_id}-${t.player_id}`) ?? 0) + Number(t.points),
          )
        const poKrogih = new Map()
        for (const p of posnetki) {
          const key = p.round_id
          const prej = poKrogih.get(key) ?? {
            round_id: key,
            krog: p.rounds,
            skupaj: skupno.get(key) ?? null,
            igralci: [],
          }
          const det = igralecPo[p.player_id]
          if (det) {
            prej.igralci.push({
              ...det,
              // Mesto iz posnetka: postava tistega kroga, ne današnje pozicije.
              position: p.position,
              player_id: p.player_id,
              is_starter: p.is_starter,
              is_captain: p.is_captain,
              is_vice: p.is_vice,
              bench_order: p.bench_order,
              points: tockeZgod.get(`${p.round_id}-${p.player_id}`) ?? 0,
            })
          }
          poKrogih.set(key, prej)
        }
        const zgod = [...poKrogih.values()].sort(
          (a, b) => (b.krog?.number ?? 0) - (a.krog?.number ?? 0),
        )
        ekipaStanje = { nabor, chips: podatki(rChips) ?? [], posnetki, zgod }
      }
      if (!veljavno) return

      // Šele ko je vse prebrano, vpišemo stanje — napol naložena stran bi
      // lahko shranila okrnjen kader.
      setIgralci(zStatistiko)
      setKrogi(vsiKrogi)
      setNaslednjiKrog(naslednji)
      setZadnjiKrog(zadnji)
      setTockeZadnjiKrog(tockePo)
      setSezonaPripomockov(sezona)
      if (nast?.length) {
        const m = Object.fromEntries(nast.map((n) => [n.key, Number(n.value)]))
        setPravila({
          prosti: m.prosti_prestopi ?? 3,
          kazen: m.kazen_prestopa ?? 4,
        })
      }
      if (moja && ekipaStanje) {
        const { nabor, chips, posnetki, zgod } = ekipaStanje
        setEkipa(moja)
        setImeEkipe(moja.name)
        setIzbrani(nabor)
        setZacetniIds(new Set(nabor.map((x) => x.player_id)))
        setShranjenKljuc(kljucKadra(nabor))
        setPripomocki(chips)
        setZaklenjenaPostava(postavaZaPrestope(posnetki, naslednji))
        setPosnetkiPoKrogih(zgod)
        setZgodovinaKrogId(zgod[0]?.round_id ?? null)
      }
      setNalaganje(false)
    }
    nalozi().catch((e) => {
      if (!veljavno) return
      const s = String(e?.message ?? '').toLowerCase()
      setNapakaNalaganja(
        s.includes('fetch') || s.includes('network')
          ? 'Ni povezave s strežnikom — preveri internet.'
          : 'Podatkov ekipe ni bilo mogoče naložiti.',
      )
      setNalaganje(false)
    })
    return () => {
      veljavno = false
    }
  }, [uporabnikId, loading, tekmovanjeId, poskus])

  const poId = useMemo(
    () => Object.fromEntries(igralci.map((i) => [i.id, i])),
    [igralci],
  )

  // V kadru igralec zaseda mesto, na katerem je bil kupljen — po njem se meri
  // kvota 2-5-5-3 in po njem stoji na igrišču. Če ga skupnost pozneje prestavi,
  // kader zaradi tega ne razpade (enako sodi `roster_je_veljaven` v bazi);
  // točke pa mu šteje prava, trenutna pozicija.
  const izbraniPodrobno = useMemo(
    () =>
      izbrani
        .map((s) => {
          const igralec = poId[s.player_id]
          return {
            ...igralec,
            ...s,
            position: s.buy_position ?? igralec?.position ?? null,
            prava_pozicija: igralec?.position ?? null,
            // Točke zadnjega odigranega kroga (za prikaz na igrišču).
            tocke_krog: tockeZadnjiKrog[s.player_id] ?? null,
            // Poškodba/odsotnost: ekipa ostane veljavna, a naj se vidi na dresu.
            odsotnost: odsotnostZaIgrisce(odsotni[s.player_id]),
          }
        })
        .filter((s) => s.id != null),
    [izbrani, poId, tockeZadnjiKrog, odsotni],
  )

  const proracun = ekipa?.budget ?? PRORACUN
  // Cash iz baze je stanje po zadnjem "Shrani". Draft (spremembe od tedaj)
  // ga premika navidezno: pri odstranitvi igralca dobiš njegovo TRENUTNO
  // vrednost (dobiček od podražitve se realizira ob prodaji), pri dodajanju
  // ga plačaš po trenutni ceni.
  const cashPersistiran =
    ekipa?.cash != null ? Number(ekipa.cash) : proracun
  const dodaniIds = izbraniPodrobno
    .filter((s) => !zacetniIds.has(s.player_id ?? s.id))
    .map((s) => s.player_id ?? s.id)
  const odstranjeniIds = [...zacetniIds].filter(
    (id) => !izbraniPodrobno.some((s) => (s.player_id ?? s.id) === id),
  )
  const stroskiNovih = dodaniIds.reduce(
    (v, id) => v + centi(poId[id]?.value),
    0,
  )
  const dobicekOdstranjenih = odstranjeniIds.reduce(
    (v, id) => v + centi(poId[id]?.value),
    0,
  )
  const preostalo =
    (centi(cashPersistiran) + dobicekOdstranjenih - stroskiNovih) / 100
  // Porabljeno = kar so plačali za trenutno držane igralce (buy_value).
  const porabljeno = izbraniPodrobno.reduce(
    (v, s) => v + Number(s.buy_value ?? s.value ?? 0),
    0,
  )
  // Bogastvo = cash + trenutna vrednost kadra (za info okvirček). V centih,
  // sicer razlika do proračuna pokaže "-0,0".
  const vrednostKadraC = izbraniPodrobno.reduce((v, s) => v + centi(s.value), 0)
  const bogastvoC = centi(preostalo) + vrednostKadraC
  const razlikaC = bogastvoC - centi(proracun)
  const bogastvo = bogastvoC / 100
  const napakeEkipe = preveriEkipo(izbraniPodrobno, proracun, preostalo)
  const prvi = izbraniPodrobno.filter((s) => s.is_starter)
  const vKadru = poPozicijah(izbraniPodrobno)

  const klubi = useMemo(() => {
    const m = new Map<number, string>()
    for (const i of igralci)
      if (i.team_id != null && i.team_name && i.active !== false)
        m.set(i.team_id, i.team_name)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'sl'))
  }, [igralci])

  const ime = (id: number) => prikazniIme(poId[id]?.full_name) || 'Igralec'

  function dodaj(igralec: IgralecTrga) {
    setSporocilo(null)
    const razlog = zakajNeGre(igralec, izbraniPodrobno, preostalo)
    if (razlog) return setSporocilo(razlog)

    setRazveljavi(null)
    setIzbrani([
      ...izbrani,
      {
        player_id: igralec.id,
        is_starter: igralec.position ? lahkoZacne(igralec.position, prvi) : false,
        is_captain: false,
        is_vice: false,
        buy_value: Number(igralec.value ?? 0),
        // Novi igralec zasede mesto, kakršno ima danes; od tod naprej ga
        // glasovanje skupnosti ne premakne iz kadra.
        buy_position: igralec.position ?? null,
      },
    ])
  }

  // Predlog sme porabiti toliko, kolikor bi baza dovolila, če bi zamenjali
  // ves kader: denar v blagajni + trenutna vrednost vseh izbranih.
  const denarZaPredlog =
    (centi(preostalo) + izbraniPodrobno.reduce((v, s) => v + centi(s.value), 0)) / 100
  const zakajNiPredloga =
    igralci.length === 0
      ? 'V tej ligi še ni igralcev na trgu.'
      : shranjujem
        ? 'Počakaj, da se shranjevanje konča.'
        : null

  /**
   * Ekipa v enem kliku.
   *
   * Novinec pristane na praznem igriscu ob trgu s petsto igralci in mora
   * izbrati petnajst imen, ki hkrati ustrezajo razmerju pozicij, proracunu in
   * omejitvi treh iz kluba. Od 354 registriranih jih ekipe ni zacelo 196, in
   * samo sedem jih je odnehalo sredi sestavljanja — ustavi jih prazen zacetek.
   * Predlog je zato izhodisce, ne koncna beseda: igralce se da takoj menjati,
   * shrani pa se, ko uporabnik sam pritisne Shrani.
   */
  function predlagaj() {
    setSporocilo(null)
    // Poškodovanega ali kaznovanega ne predlagamo — to bi bil prvi prestop.
    const predlog = predlagajKader(
      igralci.filter(
        (i) =>
          i.active !== false &&
          odsotni[i.id]?.kind !== 'poskodba' &&
          odsotni[i.id]?.kind !== 'odsotnost',
      ),
      denarZaPredlog,
    )
    if (!predlog) {
      return setSporocilo(
        'Iz te lige zaenkrat ni mogoče sestaviti veljavne ekipe.',
      )
    }
    setRazveljavi(null)
    setIzbrani(
      predlog.map((p) => ({
        player_id: p.id,
        is_starter: p.je_zacetnik,
        is_captain: p.je_kapetan,
        is_vice: p.je_namestnik,
        buy_value: p.value,
        buy_position: p.position,
      })),
    )
    setSporocilo(
      'Ekipa je sestavljena — zamenjaj, kogar hočeš, in pritisni Shrani.',
    )
  }

  function odstrani(igralec: IgralecTrga) {
    setSporocilo(null)
    const mesto = izbrani.findIndex((s) => s.player_id === igralec.id)
    if (mesto < 0) return
    setRazveljavi({ vrstica: izbrani[mesto], mesto, ime: ime(igralec.id) })
    setIzbrani(izbrani.filter((s) => s.player_id !== igralec.id))
  }

  // Vrne odstranjenega na isto mesto in v isto vlogo — če je vloga medtem
  // zasedena, pristane na klopi oz. brez traku.
  function razveljaviOdstranitev() {
    if (!razveljavi) return
    const { vrstica, mesto } = razveljavi
    setRazveljavi(null)
    if (izbrani.some((s) => s.player_id === vrstica.player_id)) return
    const igralec = poId[vrstica.player_id]
    const pozicija = vrstica.buy_position ?? igralec?.position ?? null
    const razlog = zakajNeGre(
      { ...igralec, position: pozicija },
      izbraniPodrobno,
      preostalo,
    )
    if (razlog) return setSporocilo(razlog)
    const zacne = vrstica.is_starter && pozicija != null && lahkoZacne(pozicija, prvi)
    const nova: VrsticaKadra = {
      ...vrstica,
      is_starter: zacne,
      is_captain: zacne && vrstica.is_captain && !izbrani.some((s) => s.is_captain),
      is_vice: zacne && vrstica.is_vice && !izbrani.some((s) => s.is_vice),
    }
    const kopija = [...izbrani]
    kopija.splice(Math.min(mesto, kopija.length), 0, nova)
    setIzbrani(kopija)
  }

  function preklopi(igralec: IgralecTrga) {
    if (izbrani.some((s) => s.player_id === igralec.id)) odstrani(igralec)
    else dodaj(igralec)
  }

  function preklopiPrvo(igralec: IgralecNaIgriscu & { position?: Pozicija | null }) {
    setSporocilo(null)
    if (igralec.is_starter) {
      // Na klop gre brez traku: kapetan s klopi ne igra.
      if (igralec.is_captain)
        setSporocilo(`${ime(Number(igralec.id))} je šel na klop — izberi novega kapetana.`)
      else if (igralec.is_vice)
        setSporocilo(`${ime(Number(igralec.id))} je šel na klop — izberi novega namestnika.`)
      return setIzbrani(
        izbrani.map((s) =>
          s.player_id === igralec.id
            ? { ...s, is_starter: false, is_captain: false, is_vice: false }
            : s,
        ),
      )
    }
    if (!igralec.position)
      return setSporocilo(
        'Igralec še nima potrjene pozicije, zato ga ni mogoče postaviti na igrišče.',
      )
    if (!lahkoZacne(igralec.position, prvi))
      return setSporocilo(
        'V postavi ni prostora za še enega igralca na tej poziciji — najprej daj koga na klop.',
      )
    setIzbrani(
      izbrani.map((s) =>
        s.player_id === igralec.id ? { ...s, is_starter: true } : s,
      ),
    )
  }

  // Vrstni red klopi: kdo prvi vskoči ob samodejni menjavi.
  function premakniNaKlopi(igralec: IgralecNaIgriscu, smer: -1 | 1) {
    // Isti seznam kot klop na igrišču: igralci brez pozicije tam ne stojijo.
    const klop = izbrani
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.is_starter && (s.buy_position ?? poId[s.player_id]?.position))
    const k = klop.findIndex(({ s }) => s.player_id === igralec.id)
    const sosed = klop[k + smer]
    if (k < 0 || !sosed) return
    const kopija = [...izbrani]
    kopija[klop[k].i] = sosed.s
    kopija[sosed.i] = klop[k].s
    setIzbrani(kopija)
  }

  function nastaviTrak(playerId: string | number, polje: 'is_captain' | 'is_vice') {
    const id = Number(playerId)
    const prej = izbrani.find((s) => s.player_id === id)
    // Isti igralec ne more biti kapetan in namestnik hkrati.
    if (polje === 'is_captain' && prej?.is_vice)
      setSporocilo(`${ime(id)} ni več namestnik — izberi novega.`)
    else if (polje === 'is_vice' && prej?.is_captain)
      setSporocilo(`${ime(id)} ni več kapetan — izberi novega.`)
    setIzbrani(
      izbrani.map((s) => ({
        ...s,
        [polje]: s.player_id === id,
        ...(polje === 'is_captain' && s.player_id === id
          ? { is_vice: false }
          : {}),
        ...(polje === 'is_vice' && s.player_id === id
          ? { is_captain: false }
          : {}),
      })),
    )
  }

  function naPraznoMesto(koda: Pozicija) {
    setFilterPoz(koda)
    setTrgZIskanjem(false)
    setOdprtTrg(true)
  }

  function poskusiShraniti() {
    if (shranjujem) return
    if (!imeEkipe.trim()) {
      setSporocilo(null)
      setNapaka('Najprej vpiši ime ekipe.')
      imeRef.current?.focus()
      imeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setShranjujem(true)
    shrani().finally(() => setShranjujem(false))
  }

  async function shrani() {
    setNapaka(null)
    setSporocilo(null)
    setRazveljavi(null)
    // Stanje ob pritisku: po njem povemo, ali je ekipa pripravljena za krog.
    const veljavna = napakeEkipe.length === 0
    const zdajMs = Date.now()
    const rokPotekel =
      naslednjiKrog?.deadline_at != null && Date.parse(naslednjiKrog.deadline_at) <= zdajMs
    const ciljniKrog = rokPotekel
      ? krogi
          .filter((k) => k.deadline_at && Date.parse(k.deadline_at) > zdajMs)
          .sort((a, b) => Date.parse(a.deadline_at!) - Date.parse(b.deadline_at!))[0] ?? null
      : naslednjiKrog

    let ekipaId = ekipa?.id
    if (!ekipaId) {
      const { data, error } = await supabase
        .from('fantasy_teams')
        .insert({
          owner_id: session!.user.id,
          competition_id: tekmovanjeId ?? undefined,
          name: imeEkipe.trim(),
        })
        .select('id, name, budget, cash')
        .single()
      if (error) return setNapaka(napakaShranjevanja(error))
      ekipaId = data.id
      setEkipa(data)
    } else if (imeEkipe.trim() !== ekipa.name) {
      const { error } = await supabase
        .from('fantasy_teams')
        .update({ name: imeEkipe.trim() })
        .eq('id', ekipaId)
      if (error) return setNapaka(napakaShranjevanja(error))
      setEkipa({ ...ekipa, name: imeEkipe.trim() })
    }

    // Vrstni red klopi določa, kdo prvi vskoči ob samodejni menjavi.
    let naKlopi = 0
    const roster = izbrani.map((s) => ({
      player_id: s.player_id,
      is_starter: !!s.is_starter,
      is_captain: !!s.is_captain,
      is_vice: !!s.is_vice,
      bench_order: s.is_starter ? null : ++naKlopi,
    }))

    // RPC atomarno posodobi roster + cash (dobiček od odstranjenih ostane
    // v ekipi kot dodaten denar).
    const { data: rezultat, error } = await supabase.rpc('shrani_ekipo', {
      p_team_id: ekipaId,
      p_roster: roster,
    })
    if (error) return setNapaka(napakaShranjevanja(error))

    const izid = rezultat as {
      cash?: number
      dobicek?: number
      strosek?: number
    } | null
    const novCash = izid && typeof izid === 'object' ? Number(izid.cash ?? 0) : null
    if (novCash != null) {
      setEkipa((prej: any) => (prej ? { ...prej, cash: novCash } : prej))
    }

    // Osveži lokalno stanje: zdaj so vsi izbrani "začetni" (pomeni: ni več
    // "novih" ali "odstranjenih" v draftu).
    const { data: svezRoster, error: eOsvezitev } = await supabase
      .from('fantasy_roster')
      .select('player_id, is_starter, is_captain, is_vice, buy_value, buy_position, bench_order')
      .eq('fantasy_team_id', ekipaId)
    if (eOsvezitev || !svezRoster) {
      // Shranjeno je bilo natanko to, kar smo poslali — to je novo izhodišče.
      setZacetniIds(new Set(izbrani.map((x) => x.player_id)))
      setShranjenKljuc(kljucKadra(izbrani))
      setNapaka(
        'Ekipa je shranjena, osvežitev pa ni uspela — naloži stran znova, preden jo spet urejaš.',
      )
    } else {
      const urejen = poVrstiKlopi(svezRoster as VrsticaKadra[])
      setIzbrani(urejen)
      setZacetniIds(new Set(urejen.map((x) => x.player_id)))
      setShranjenKljuc(kljucKadra(urejen))
    }
    osveziRok()

    const deltaC = centi(izid?.dobicek) - centi(izid?.strosek)
    const denar =
      deltaC > 0
        ? ` Prodaja ti je prinesla +${formatirajCeno(deltaC / 100)}.`
        : deltaC < 0
          ? ` Nakupi so stali ${formatirajCeno(-deltaC / 100)}.`
          : ''
    const rok = rokPotekel
      ? `Rok ${naslednjiKrog?.number}. kroga je že potekel, zato spremembe veljajo od naslednjega kroga. `
      : ''
    if (!eOsvezitev)
      setSporocilo(
        rok +
          (veljavna
            ? ciljniKrog?.number != null
              ? `Ekipa je shranjena in pripravljena za ${ciljniKrog.number}. krog.`
              : 'Ekipa je shranjena in izpolnjuje pravila.'
            : 'Osnutek shranjen — ekipa še ne izpolnjuje pravil, zato za ta krog ne bi dobila točk.') +
          denar,
      )

    // Povabilo v mini ligo, ki je cakalo na ekipo: vstop dokoncamo zdaj, brez
    // vracanja na povezavo iz tujega pogovora.
    const cakajoce = preberiVabilo()
    if (cakajoce && ekipaId) {
      const { data: vstop, error: eVstop } = await supabase.rpc('pridruzi_mini_ligi', {
        p_koda: cakajoce,
        p_ekipa: ekipaId,
      })
      pozabiVabilo()
      const izidVstopa = Array.isArray(vstop) ? vstop[0] : vstop
      if (!eVstop && izidVstopa?.mini_liga_id) {
        navigate(`/mini-lige?liga=${izidVstopa.mini_liga_id}&vstop=${izidVstopa.dodano ? 'nov' : 'ze'}`)
        return
      }
    }
    setPokaziVabilo(true)
  }

  async function vloziPripomocek(chip: string, krogId: number) {
    setNapaka(null)
    if (shranjujem) return
    if (!ekipa?.id) return setNapaka('Najprej shrani ekipo.')
    if (!krogId) return setNapaka('Izberi krog, v katerem naj pripomoček velja.')
    if (!lahkoUrejasPripomocek(krogi.find((k) => k.id === krogId), tekmovanjeId))
      return setNapaka('Izberi prihodnji nezaklenjen krog z določenim rokom.')
    setShranjujem(true)
    try {
      const { error } = await supabase.from('fantasy_chips').insert({
        fantasy_team_id: ekipa.id,
        chip,
        round_id: Number(krogId),
      })
      if (error) {
        const dvojnik =
          error.code === '23505' || /duplicate key|unique constraint/i.test(error.message ?? '')
        return setNapaka(
          dvojnik ? 'Ta pripomoček si v tej sezoni že uporabil.' : napakaShranjevanja(error),
        )
      }
      setPripomocki([...pripomocki, { chip, round_id: Number(krogId) }])
      setSporocilo(
        chip === 'wildcard'
          ? 'Wildcard je vložen — prestopi v tem krogu so brezplačni.'
          : 'Klop+ je vložen.',
      )
    } finally {
      setShranjujem(false)
    }
  }

  async function prekliciPripomocek(chip: any) {
    setNapaka(null)
    if (!ekipa?.id || shranjujem) return
    // Preklic je dovoljen SAMO dokler rok kroga še ni potekel. Ob roku se
    // postava (in učinek pripomočka) posname; kasneje preklic ne velja več.
    const chipVpis = pripomocki.find((c) => c.chip === chip)
    if (!chipVpis) return
    const krogVpisa = krogi.find((k) => k.id === chipVpis.round_id)
    if (!lahkoUrejasPripomocek(krogVpisa, tekmovanjeId)) {
      return setNapaka(
        'Pripomočka za ta krog ni več mogoče preklicati.',
      )
    }
    setShranjujem(true)
    try {
      // Samo letošnji vložek (njegov krog) — lanski istega pripomočka ostane
      // v zgodovini, in ker je rok že potekel, bi ga baza zavrnila.
      const { error } = await supabase
        .from('fantasy_chips')
        .delete()
        .eq('fantasy_team_id', ekipa.id)
        .eq('chip', chip)
        .eq('round_id', chipVpis.round_id)
      if (error) return setNapaka(napakaShranjevanja(error))
      setPripomocki(pripomocki.filter((c) => c.chip !== chip))
      setSporocilo(
        chip === 'wildcard'
          ? 'Wildcard je preklican — na voljo je za drug krog.'
          : 'Klop+ je preklican — na voljo je za drug krog.',
      )
    } finally {
      setShranjujem(false)
    }
  }

  if (loading || nalaganje)
    return <p className="animiraj-utrip text-slate-400">Nalaganje …</p>
  if (!session)
    return (
      <div className="kartica space-y-3 p-6 text-center text-slate-300">
        <p>Za sestavo ekipe se moraš prijaviti.</p>
        <Link
          to={povezavaNaPrijavo(lokacija.pathname + lokacija.search)}
          className="gumb-glavni inline-block px-4 py-2 text-sm"
        >
          Prijava
        </Link>
      </div>
    )
  if (napakaNalaganja)
    return (
      <div role="alert" className="kartica space-y-3 p-6 text-center">
        <p className="font-semibold text-rose-300">{napakaNalaganja}</p>
        <p className="text-sm text-slate-400">
          Dokler se ekipa ne naloži v celoti, je ni mogoče shraniti — sicer bi
          shranjevanje izbrisalo igralce, ki se niso naložili.
        </p>
        <button
          onClick={() => setPoskus((n) => n + 1)}
          className="gumb-glavni px-4 py-2 text-sm"
        >
          Poskusi znova
        </button>
      </div>
    )

  // Neaktivnega igralca (klub letos ne igra, igralec je odšel) na trgu ni:
  // kader z njim je neveljaven in ekipi tiho vzame vse točke kroga. V kadru,
  // če je nekdo tja prišel prej, ostane viden — sicer bi z igrišča izginil.
  const vidni = igralci
    .filter((i) => {
      if (i.active === false && !izbrani.some((s) => s.player_id === i.id))
        return false
      if (filterKlub !== 'vsi' && String(i.team_id) !== filterKlub) return false
      if (filterPoz !== 'vse' && i.position !== filterPoz) return false
      if (iskanje && !(i.full_name ?? '').toLowerCase().includes(iskanje.toLowerCase()))
        return false
      return true
    })
    // Točke zadnjega odigranega kroga — vidno na trgu, da uporabnik hitro
    // oceni, ali je igralec v formi. Prej so bile točke prikazane samo za
    // igralce, ki so že v kadru; na trgu se jih ni videlo, kar je otežilo
    // primerjavo pri iskanju.
    .map((i) => ({ ...i, tocke_krog: tockeZadnjiKrog[i.id] ?? null }))

  const klopPlus = pripomocki.find((c) => c.chip === 'klop_plus')
  const wildcard = pripomocki.find((c) => c.chip === 'wildcard')
  const krogPripomocka = krogi.find((k) => k.id === klopPlus?.round_id)
  const krogWildcard = krogi.find((k) => k.id === wildcard?.round_id)
  const zdaj = Math.max(casPripomockov, Date.now())
  // Le krogi sezone, za katero so prebrani pripomočki — v novi sezoni je
  // lanski vložek porabljen, letošnji pa še prost.
  const krogiZaPripomocek = krogi
    .filter((k) => sezonaPripomockov == null || k.season === sezonaPripomockov)
    .filter((k) => lahkoUrejasPripomocek(k, tekmovanjeId, zdaj))
    .sort((a, b) => Date.parse(a.deadline_at!) - Date.parse(b.deadline_at!))
  const izbranKrogPripomocka = krogiZaPripomocek.find((k) => k.id === Number(izbranKrog))
  const naslednjiZaPripomocek = krogiZaPripomocek[0]

  // Prestop je igralec, ki ga v zadnji zaklenjeni postavi ni bilo.
  const prestopi = zaklenjenaPostava
    ? izbrani.filter((s) => !zaklenjenaPostava.includes(s.player_id)).length
    : 0
  const wildcardVelja =
    wildcard && naslednjiKrog && wildcard.round_id === naslednjiKrog.id
  const kazen = wildcardVelja
    ? 0
    : Math.max(0, prestopi - pravila.prosti) * pravila.kazen

  const trg = (
    <TrgIgralcev
      vidni={vidni}
      izbrani={izbrani}
      izbraniPodrobno={izbraniPodrobno}
      preostalo={preostalo}
      vKadru={vKadru}
      klubi={klubi}
      iskanje={iskanje}
      setIskanje={setIskanje}
      filterKlub={filterKlub}
      setFilterKlub={setFilterKlub}
      filterPoz={filterPoz}
      setFilterPoz={setFilterPoz}
      naPreklop={preklopi}
      naInfo={setInfo}
      odsotni={odsotni}
    />
  )

  return (
    <div className="space-y-4 pb-20 sm:space-y-6 lg:pb-0">
      {/* Obvestila — en sklad pod navbarjem, da se ne prekrivajo. Napaka
          ostane, dokler je uporabnik ne zapre; potrditev izgine sama. */}
      {(sporocilo || napaka || razveljavi) && (
        <div className="fixed inset-x-0 top-16 z-[60] mx-auto flex max-w-md flex-col gap-2 px-3">
          {napaka && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/60 bg-rose-500/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/50 backdrop-blur"
            >
              <span className="min-w-0 flex-1">⚠ {napaka}</span>
              <button
                onClick={() => setNapaka(null)}
                aria-label="Zapri opozorilo"
                className="shrink-0 rounded-lg px-2 py-0.5 text-white/80 hover:bg-black/10"
              >
                ✕
              </button>
            </div>
          )}
          {sporocilo && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-3 rounded-2xl border border-gnl-400/40 bg-gnl-500/95 px-4 py-3 text-sm font-semibold text-slate-950 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <span className="min-w-0 flex-1">{sporocilo}</span>
              <button
                onClick={() => setSporocilo(null)}
                aria-label="Zapri obvestilo"
                className="shrink-0 rounded-lg px-2 py-0.5 text-slate-950/70 hover:bg-black/10"
              >
                ✕
              </button>
            </div>
          )}
          {razveljavi && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-800/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <span className="min-w-0 flex-1">{razveljavi.ime} je odstranjen.</span>
              <button
                onClick={razveljaviOdstranitev}
                className="shrink-0 rounded-lg bg-white/15 px-3 py-1 font-semibold hover:bg-white/25"
              >
                Razveljavi
              </button>
            </div>
          )}
        </div>
      )}

      <h1 className="text-2xl font-black naslov sm:text-3xl">
        Moja ekipa
        {tekmovanje && (
          <span className="ml-2 align-middle text-base font-bold text-slate-500">
            {tekmovanje.short_name}
          </span>
        )}
      </h1>

      {/* V vsaki ligi se igra s svojo ekipo — to je pogosto presenečenje, zato
          je zapisano nad rokom in ne kje v drobnem tisku. */}
      {tekmovanje?.prvi_fantasy_krog != null && tekmovanje.prvi_fantasy_krog > 1 && (
        <p className="kartica p-3 text-sm text-slate-300">
          Ekipa v ligi <strong>{tekmovanje.short_name}</strong> je ločena od
          ekip v drugih ligah — s svojim proračunom in svojo lestvico. Točke
          štejejo od {tekmovanje.prvi_fantasy_krog}. kroga naprej, ker se do
          takrat še vrstijo prestopi in prehodi med selekcijami.
        </p>
      )}

      {pokaziVabilo && ekipa?.id && (
        <PovabiSoigralce ekipaId={ekipa.id} naZapri={() => setPokaziVabilo(false)} />
      )}

      {naslednjiKrog && <Rok krog={naslednjiKrog} />}

      {zaklenjenaPostava && (
        <div className="kartica flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
          <span className="font-semibold">
            Prestopi: {prestopi}/{pravila.prosti}
          </span>
          {wildcardVelja ? (
            <span className="znacka bg-gnl-400/20 text-gnl-200">
              wildcard — brez kazni
            </span>
          ) : kazen > 0 ? (
            <span className="text-rose-400">
              odbitek {mnozina(kazen, TOCK_RODILNIK)} v tem krogu
            </span>
          ) : (
            <span className="text-slate-400">
              še {pravila.prosti - prestopi}{' '}
              {oblika(pravila.prosti - prestopi, BREZPLACNI)}, nato −
              {mnozina(pravila.kazen, TOCKE)} za vsakega
            </span>
          )}
        </div>
      )}

      {/* Rdeč opozorilni pas s KONKRETNIMI napakami + katerim krogom velja. */}
      {izbrani.length > 0 && napakeEkipe.length > 0 && (
        <div className="kartica animiraj-utrip border-2 border-rose-400/60 bg-rose-500/10 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="text-sm font-black text-rose-100 sm:text-base">
                Tvoja ekipa NE ustreza pravilom
              </div>
              {naslednjiKrog && (
                <div className="text-xs text-rose-100/90">
                  <strong>Za {naslednjiKrog.number}. krog</strong>
                  {naslednjiKrog.deadline_at && (
                    <>
                      {' '}(rok:{' '}
                      {izpisRoka(naslednjiKrog.deadline_at)}
                      )
                    </>
                  )}{' '}
                  v tem stanju <strong>NE boš dobil točk</strong>.
                </div>
              )}
              <div className="text-xs text-rose-100/90">
                Konkretne napake:
                <ul className="mt-1 space-y-0.5 pl-4">
                  {napakeEkipe.map((n) => (
                    <li key={n} className="list-disc">
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-rose-100/70">
                Pogosto se to zgodi, ker glasovanje o poziciji premakne igralca
                (npr. iz napadalca v vezista) in ti poruši kader. Popravi zdaj,
                dokler rok ni potekel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Povzetek — na desktopu sticky pri vrhu, na mobilnem samo naslovni pas.
          Mobilni ima že fiksno spodnjo vrstico s proračunom in shrani gumbom,
          zato tu ne rabi ponovno velike sticky kartice. */}
      <div className="kartica space-y-3 p-3 sm:sticky sm:top-2 sm:z-30 sm:p-4 sm:shadow-lg sm:shadow-black/30 sm:backdrop-blur">
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto] sm:items-start sm:gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Na voljo še
            </div>
            <div
              className={`text-3xl font-black tabular-nums leading-none sm:text-4xl ${
                preostalo < 0 ? 'text-rose-400' : 'text-gnl-300'
              }`}
            >
              {formatirajCeno(preostalo)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              bogastvo <strong className={razlikaC > 0 ? 'text-gnl-300' : razlikaC < 0 ? 'text-rose-300' : 'text-slate-300'}>
                {formatirajCeno(bogastvo)}
              </strong>
              {razlikaC !== 0 && (
                <span className={razlikaC > 0 ? 'text-gnl-300' : 'text-rose-300'}>
                  {' '}({razlikaC > 0 ? '+' : '−'}{formatirajCeno(Math.abs(razlikaC) / 100)})
                </span>
              )}
              {' · '}kader{' '}
              <span>{formatirajCeno(porabljeno)} </span>
              <span className="text-slate-500">plačano</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={poskusiShraniti}
              disabled={shranjujem}
              className="gumb-glavni whitespace-nowrap px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-60"
            >
              {shranjujem ? 'Shranjujem …' : 'Shrani ekipo'}
            </button>
            {neshranjeno && (
              <span className="text-[11px] font-semibold text-amber-300">
                Neshranjene spremembe
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                preostalo < 0
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-gnl-500 to-gnl-300'
              }`}
              style={{
                width: `${Math.min(100, (porabljeno / proracun) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {izbrani.length}/{mnozina(VELIKOST_EKIPE, IGRALCI)} · postava{' '}
              {prvi.length}/{STEVILO_PRVIH}
            </span>
            <span className="flex flex-wrap gap-1">
              {VRSTNI_RED.map((koda) => (
                <span
                  key={koda}
                  className={`znacka ${
                    vKadru[koda] === POZICIJE[koda].kader
                      ? razredPozicije(koda)
                      : 'poz-none'
                  }`}
                >
                  {KRATKA_POZICIJA[koda]} {vKadru[koda]}/{POZICIJE[koda].kader}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div className="block">
          <label
            htmlFor="ime-ekipe"
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            Ime ekipe
          </label>
          {ekipa?.name ? (
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm">
              <span className="flex-1 font-semibold text-slate-100">
                {ekipa.name}
              </span>
              <span
                title="Ime ekipe je po prvi shranitvi fiksno — enotna oznaka na lestvici in v zgodovini."
                className="znacka bg-white/10 text-[10px] text-slate-400"
              >
                🔒 fiksno
              </span>
            </div>
          ) : (
            <>
              <input
                id="ime-ekipe"
                ref={imeRef}
                value={imeEkipe}
                maxLength={NAJDALJSE_IME}
                aria-describedby="ime-ekipe-namig"
                onChange={(e) => setImeEkipe(e.target.value)}
                placeholder="npr. Nedeljski Junaki"
                className={`mt-1 w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm ${
                  !imeEkipe.trim() && napaka
                    ? 'border-rose-400/60 ring-1 ring-rose-400/30'
                    : 'border-white/10'
                }`}
              />
              <p id="ime-ekipe-namig" className="mt-1 text-[11px] text-slate-500">
                Imena po prvi shranitvi ni več mogoče spremeniti.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uvodni nasvet, ko ekipa še nima igralcev. */}
      {izbrani.length === 0 && (
        <div className="kartica border-gnl-400/30 bg-gnl-500/5 p-3 text-sm sm:p-4">
          <h2 className="mb-1 text-sm font-bold text-gnl-200">Kje začeti?</h2>

          {/* Najhitrejša pot je ena. Navodila spodaj ostanejo za tiste, ki
              hočejo ekipo sestaviti sami — ni pa več edina pot naprej. */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-950/40 p-2.5">
            <button
              onClick={predlagaj}
              disabled={zakajNiPredloga != null}
              title={zakajNiPredloga ?? undefined}
              className="gumb-glavni px-3 py-2 text-sm disabled:opacity-50"
            >
              ⚡ Sestavi mi ekipo
            </button>
            <span className="min-w-0 flex-1 text-xs text-slate-400">
              {zakajNiPredloga ??
                'Postavimo veljavno ekipo v okviru proračuna. Nato zamenjaj, kogar hočeš, in shrani.'}
            </span>
          </div>

          <ol className="ml-4 list-decimal space-y-1 text-slate-300">
            <li>
              Vpiši ime ekipe zgoraj — brez njega shranjevanje ne bo delovalo.
            </li>
            <li>
              Klikni <strong className="text-white">＋</strong> na praznem mestu
              igrišča. Na telefonu je v spodnjem pasu še gumb{' '}
              <strong className="text-white">＋ Dodaj</strong>, na računalniku
              pa izbiraš s <strong className="text-white">trga igralcev</strong>{' '}
              desno.
            </li>
            <li>
              Kader je {VELIKOST_EKIPE} igralcev: {POZICIJE.GK.kader} GK,{' '}
              {POZICIJE.DEF.kader} BR, {POZICIJE.MID.kader} VE,{' '}
              {POZICIJE.FWD.kader} NA. Iz istega kluba največ {MAX_IZ_KLUBA}.
            </li>
            <li>
              Ko so mesta zapolnjena, določi{' '}
              <strong className="text-white">kapetana</strong> in{' '}
              <strong className="text-white">namestnika</strong>, nato pritisni{' '}
              <strong className="text-white">Shrani ekipo</strong> (na telefonu{' '}
              <strong className="text-white">Shrani</strong> v spodnjem pasu).
            </li>
          </ol>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <Igrisce
            izbrani={izbraniPodrobno}
            naPreklopPrvo={preklopiPrvo}
            naOdstrani={(i) => odstrani(i as IgralecTrga)}
            naPraznoMesto={naPraznoMesto}
            naPremakniKlop={premakniNaKlopi}
          />

          {/* Trak (kapetan + namestnik) — takoj pod igriscem, ker se
              nanasa na igralce iz iste postave. */}
          <section className="kartica space-y-2 p-3 sm:p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Trak
            </h3>
            <IzborTraku
              oznaka={`Kapetan (×${KAPETAN_MNOZITELJ})`}
              vrednost={prvi.find((s) => s.is_captain)?.id ?? ''}
              moznosti={prvi}
              naIzbor={(v) => nastaviTrak(v, 'is_captain')}
            />
            <IzborTraku
              oznaka="Namestnik"
              vrednost={prvi.find((s) => s.is_vice)?.id ?? ''}
              moznosti={prvi}
              naIzbor={(v) => nastaviTrak(v, 'is_vice')}
            />
            <p className="text-xs text-slate-500">
              Kapetan prinese trojne točke. Če ne igra, trak prevzame
              namestnik.
            </p>
          </section>

          {/* "Kaj-če" scenarij: vsota točk zdajšnjih starterjev, izračunana
              iz zadnje odigrane runde. Zamenjava igralca to številko
              spremeni — zato je pomembno, da naslov jasno pove, da NI
              zgodovinski rezultat te ekipe. Historičen rezultat je v
              lestvici in posnetku postave; ta vrstica je za oceno "kaj
              bi bilo, če bi imel zdajsnji kader tudi tam".
              Skrijemo, ce fantasy scoring v tem tekmovanju še ni začel
              (mladinci: prvi krog se ne šteje, zato tega prikaza ne
              rabimo). */}
          {zadnjiKrog &&
            Object.keys(tockeZadnjiKrog).length > 0 &&
            (!tekmovanje?.prvi_fantasy_krog ||
              Number(zadnjiKrog.number ?? 0) >= tekmovanje.prvi_fantasy_krog) && (
              <section className="kartica p-3 text-sm sm:p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-slate-400">
                    Zdajšnja postava bi v{' '}
                    <strong className="text-slate-200">
                      {zadnjiKrog.number ?? 0}. krogu
                    </strong>{' '}
                    ({zadnjiKrog.season}) prinesla
                  </span>
                  <span className="text-lg font-black tabular-nums text-gnl-300">
                    {mnozina(
                      Math.round(
                        izbraniPodrobno
                          .filter((s) => s.is_starter)
                          .reduce(
                            (v, s) =>
                              v +
                              (s.tocke_krog ?? 0) *
                                (s.is_captain ? KAPETAN_MNOZITELJ : 1),
                            0,
                          ),
                      ),
                      TOCKE_TOZILNIK,
                    )}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  "Kaj-če" pregled — ni zgodovinski rezultat, spremeni se
                  ob vsaki zamenjavi. Dejanske točke za pretekle kroge
                  najdeš na lestvici in v posnetku postave.
                </p>
              </section>
            )}

          {/* status ekipe in shranjevanje */}
          <section id="status-ekipe" className="kartica p-3 sm:p-4">
            {(() => {
              const brezImena = !imeEkipe.trim()
              const pripravljena = !brezImena && napakeEkipe.length === 0
              return (
                <div className="space-y-3">
                  <div
                    className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                      pripravljena
                        ? 'border-gnl-400/40 bg-gnl-500/10 text-gnl-200'
                        : 'border-amber-400/30 bg-amber-500/5 text-amber-200'
                    }`}
                  >
                    <span className="text-lg leading-none">
                      {pripravljena ? '✅' : 'ℹ️'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {pripravljena
                          ? 'Ekipa je pripravljena za shranjevanje.'
                          : 'Za dokončno shranitev je še nekaj potrebnega:'}
                      </div>
                      {!pripravljena && (
                        <ul className="mt-2 space-y-1 text-amber-100/90">
                          {brezImena && (
                            <li>• Vpiši ime ekipe (v polju zgoraj).</li>
                          )}
                          {napakeEkipe.map((n) => (
                            <li key={n}>• {n}</li>
                          ))}
                        </ul>
                      )}
                      {!pripravljena && !brezImena && (
                        <div className="mt-2 text-xs text-slate-400">
                          Osnutek lahko shraniš tudi zdaj — pravila boš dopolnil
                          pozneje.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="hidden flex-wrap items-center gap-3 lg:flex">
                    <button
                      onClick={poskusiShraniti}
                      disabled={shranjujem}
                      className="gumb-glavni disabled:cursor-wait disabled:opacity-60"
                    >
                      {shranjujem
                        ? 'Shranjujem …'
                        : pripravljena
                          ? 'Shrani ekipo'
                          : 'Shrani osnutek'}
                    </button>
                    {neshranjeno && (
                      <span className="text-xs font-semibold text-amber-300">
                        Neshranjene spremembe
                      </span>
                    )}
                    {brezImena && (
                      <span className="text-xs text-rose-300">
                        Ime ekipe je obvezno — klik te vrne na polje zgoraj.
                      </span>
                    )}
                  </div>

                  {/* Kaj se pravzaprav zgodi ob shranjevanju — jasno pojasnilo. */}
                  <div className="rounded-xl bg-slate-950/40 p-3 text-[11px] leading-snug text-slate-400">
                    <strong className="text-slate-300">
                      Kaj pomeni "Shrani"?
                    </strong>{' '}
                    Tvoje spremembe (kader, postava, kapetan) se zapišejo v bazo.
                    Za trenutni krog velja stanje ob roku
                    {naslednjiKrog?.deadline_at && (
                      <>
                        {' '}
                        (
                        <strong className="text-slate-300">
                          {naslednjiKrog.number}. krog —{' '}
                          {izpisRoka(naslednjiKrog.deadline_at)}
                        </strong>
                        )
                      </>
                    )}
                    . Do roka lahko poljubno spreminjaš in ponovno pritiskaš
                    Shrani — velja zadnja verzija.{' '}
                    <strong className="text-slate-300">"Shrani osnutek"</strong>{' '}
                    pomeni isto, samo z opombo, da ekipa še ne izpolnjuje vseh
                    pravil (za točke rabiš popravke — glej seznam zgoraj).
                  </div>

                  {sporocilo && (
                    <p className="text-sm text-gnl-300">{sporocilo}</p>
                  )}
                  {napaka && (
                    <p className="text-sm text-rose-400">Napaka: {napaka}</p>
                  )}
                </div>
              )
            })()}
          </section>

          {/* Pripomočki (Klop+ + Wildcard) — enkratni bonusi, spodaj pod
              glavnim tokom. */}
          <section className="kartica p-3 sm:p-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Pripomoček Klop+
              </h3>
              {klopPlus ? (
                (() => {
                  const zaklenjen = !lahkoUrejasPripomocek(krogPripomocka, tekmovanjeId, zdaj)
                  return (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-gnl-300">
                          {krogPripomocka
                            ? `Vložen za ${krogPripomocka.number}. krog (${krogPripomocka.season})`
                            : 'Klop+ je že vložen'} — v njem štejejo tudi točke klopi.
                        </p>
                        {zaklenjen ? (
                          <span className="znacka bg-white/10 text-[10px] text-slate-400">
                            🔒 zaklenjen
                          </span>
                        ) : (
                          <button
                            onClick={() => prekliciPripomocek('klop_plus')}
                            disabled={shranjujem}
                            className="text-xs text-slate-400 underline hover:text-rose-400"
                          >
                            prekliči
                          </button>
                        )}
                      </div>
                      {!zaklenjen && krogPripomocka?.deadline_at && (
                        <p className="text-[11px] text-slate-500">
                          Prekliči lahko do{' '}
                          <Odstevanje do={krogPripomocka.deadline_at} />
                        </p>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="flex flex-wrap gap-2">
                  <select
                    value={izbranKrogPripomocka ? izbranKrog : ''}
                    disabled={!krogiZaPripomocek.length}
                    onChange={(e) => setIzbranKrog(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="">{krogiZaPripomocek.length ? 'Izberi krog …' : 'Ni prihodnjega kroga z rokom'}</option>
                    {krogiZaPripomocek.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.number}. krog ({k.season})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => vloziPripomocek('klop_plus', Number(izbranKrog))}
                    disabled={!izbranKrogPripomocka || shranjujem}
                    className="gumb-tih disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {shranjujem ? 'Shranjujem …' : 'Vloži'}
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Enkrat na sezono: v izbranem krogu se prištejejo še točke vseh
                štirih rezervnih igralcev.
              </p>

              <h3 className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Pripomoček Wildcard
              </h3>
              {wildcard ? (
                (() => {
                  const zaklenjen = !lahkoUrejasPripomocek(krogWildcard, tekmovanjeId, zdaj)
                  return (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-gnl-300">
                          {krogWildcard
                            ? `Vložen za ${krogWildcard.number}. krog (${krogWildcard.season})`
                            : 'Wildcard je že vložen'} — prestopi v njem so brezplačni.
                        </p>
                        {zaklenjen ? (
                          <span className="znacka bg-white/10 text-[10px] text-slate-400">
                            🔒 zaklenjen
                          </span>
                        ) : (
                          <button
                            onClick={() => prekliciPripomocek('wildcard')}
                            disabled={shranjujem}
                            className="text-xs text-slate-400 underline hover:text-rose-400"
                          >
                            prekliči
                          </button>
                        )}
                      </div>
                      {!zaklenjen && krogWildcard?.deadline_at && (
                        <p className="text-[11px] text-slate-500">
                          Prekliči lahko do{' '}
                          <Odstevanje do={krogWildcard.deadline_at} />
                        </p>
                      )}
                    </div>
                  )
                })()
              ) : (
                <button
                  onClick={() =>
                    vloziPripomocek(
                      'wildcard',
                      Number(naslednjiZaPripomocek?.id),
                    )
                  }
                  disabled={!naslednjiZaPripomocek || shranjujem}
                  className="gumb-tih w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {shranjujem ? 'Shranjujem …' : naslednjiZaPripomocek ? `Vloži za ${naslednjiZaPripomocek.number}. krog` : 'Ni prihodnjega kroga z rokom'}
                </button>
              )}
              <p className="text-xs text-slate-500">
                Enkrat na sezono: v tem krogu lahko zamenjaš kolikor igralcev
                hočeš, brez odbitka točk.
              </p>
            </div>
          </section>

          {/* Zgodovina postav — na koncu, za pregled preteklih krogov. */}
          {posnetkiPoKrogih.length > 0 && (
            <section className="kartica space-y-3 p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Zgodovina postav
                </h2>
                <span className="text-xs text-slate-500">
                  {mnozina(posnetkiPoKrogih.length, [
                    'krog s posnetkom',
                    'kroga s posnetkoma',
                    'krogi s posnetki',
                    'krogov s posnetki',
                  ])}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...posnetkiPoKrogih]
                  .sort(
                    (a, b) => (a.krog?.number ?? 0) - (b.krog?.number ?? 0),
                  )
                  .map((p) => (
                    <button
                      key={p.round_id}
                      onClick={() => setZgodovinaKrogId(p.round_id)}
                      className={`znacka transition ${
                        zgodovinaKrogId === p.round_id
                          ? 'bg-gnl-500 text-slate-950'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {p.krog?.number}. krog
                    </button>
                  ))}
              </div>
              {(() => {
                const izbrani = posnetkiPoKrogih.find(
                  (p) => p.round_id === zgodovinaKrogId,
                )
                if (!izbrani) return null
                const starterji = izbrani.igralci.filter(
                  (i: any) => i.is_starter,
                )
                // Točke kroga iz lestvice: s samodejnimi menjavami, trakom
                // namestnika in odbitkom za prestope.
                const skupaj =
                  izbrani.skupaj != null ? Math.round(Number(izbrani.skupaj)) : null
                return (
                  <>
                    <div className="text-xs text-slate-500">
                      {izbrani.krog?.number}. krog · sezona {izbrani.krog?.season}
                      {skupaj != null && (
                        <>
                          {' '}· skupaj{' '}
                          <strong className="text-gnl-300">
                            {mnozina(skupaj, TOCKE)}
                          </strong>
                        </>
                      )}
                    </div>
                    <EnajstericaNaIgriscu
                      igralci={starterji.map((s: any) => ({
                        ...s,
                        position: s.position,
                      }))}
                    />
                  </>
                )
              })()}
            </section>
          )}
        </div>

        {/* trg — na velikih zaslonih stranski stolpec, ki ostane na mestu */}
        <aside className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          {trg}
        </aside>
      </div>

      {/* trg — na telefonu predal, ki se odpre ob kliku na prazno mesto */}
      {odprtTrg && (
        <PredalTrga
          naZapri={() => setOdprtTrg(false)}
          // Nad predalom je lahko odprta plošča igralca — Escape zapre njo.
          escapeZanj={!info}
          povzetek={
            <span className="tabular-nums text-xs text-slate-400">
              ostane{' '}
              <strong className={preostalo < 0 ? 'text-rose-400' : 'text-gnl-300'}>
                {formatirajCeno(preostalo)}
              </strong>{' '}
              · {izbrani.length}/{VELIKOST_EKIPE}
            </span>
          }
        >
          <TrgIgralcev
            vidni={vidni}
            izbrani={izbrani}
            izbraniPodrobno={izbraniPodrobno}
            preostalo={preostalo}
            vKadru={vKadru}
            klubi={klubi}
            iskanje={iskanje}
            setIskanje={setIskanje}
            filterKlub={filterKlub}
            setFilterKlub={setFilterKlub}
            filterPoz={filterPoz}
            setFilterPoz={setFilterPoz}
            naPreklop={preklopi}
            naInfo={setInfo}
            odsotni={odsotni}
            mobilno
            zIskanjem={trgZIskanjem}
          />
        </PredalTrga>
      )}

      {/* Na telefonu sta glavni dejanji vedno pri roki v enem tanjsem pasu —
          prej sta dve vrstici cez ~100 px vzeli prevec ekrana. Cena in
          napredek sta zdaj strnjena v levo, gumba desno. Ce je z ekipo
          kaj narobe, zgoraj v pasu izpisemo prvo napako, da uporabnik
          vidi razlog, zakaj ne dobi tock v naslednjem krogu. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {izbrani.length > 0 && napakeEkipe.length > 0 && (
          <button
            onClick={() =>
              document
                .getElementById('status-ekipe')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            className="flex w-full items-center gap-2 border-b border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-left text-[11px] text-rose-100 hover:bg-rose-500/25"
          >
            <span className="shrink-0 text-sm">⚠</span>
            <span className="min-w-0 flex-1 truncate">
              {napakeEkipe[0]}
              {napakeEkipe.length > 1 && (
                <span className="text-rose-200/80">
                  {' '}
                  · +{napakeEkipe.length - 1}
                </span>
              )}
            </span>
            <span className="shrink-0 text-rose-200/70">popravi ↑</span>
          </button>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="min-w-0 flex-1 tabular-nums leading-tight">
            <span className="text-[10px] text-slate-500">ostane </span>
            <span
              className={`text-xs font-black ${
                preostalo < 0 ? 'text-rose-400' : 'text-gnl-300'
              }`}
            >
              {formatirajCeno(preostalo)}
            </span>
            <span className="ml-2 text-[10px] text-slate-500">
              {izbrani.length}/{VELIKOST_EKIPE} · {prvi.length}/{STEVILO_PRVIH}
            </span>
            {neshranjeno && (
              <span className="ml-2 text-[10px] font-semibold text-amber-300">
                neshranjeno
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setFilterPoz('vse')
              setTrgZIskanjem(true)
              setOdprtTrg(true)
            }}
            className="gumb-tih shrink-0 px-3 py-2 text-xs"
          >
            ＋ Dodaj
          </button>
          <button
            onClick={poskusiShraniti}
            disabled={shranjujem}
            title={
              !imeEkipe.trim() || napakeEkipe.length
                ? 'Ekipa še ne izpolnjuje pravil — shrani se kot osnutek.'
                : undefined
            }
            className="gumb-glavni relative shrink-0 px-3 py-2 text-xs disabled:cursor-wait disabled:opacity-60"
          >
            {shranjujem ? 'Shranjujem …' : 'Shrani'}
            {!shranjujem && (!imeEkipe.trim() || napakeEkipe.length > 0) && (
              <span
                aria-label="ekipa še ne izpolnjuje pravil"
                className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-slate-950"
              />
            )}
          </button>
        </div>
      </div>

      {/* Podatki o igralcu — brez zapuscanja na pol sestavljene ekipe. */}
      {info && tekmovanjeId != null && (
        <InfoIgralca
          igralecId={info.id}
          tekmovanjeId={tekmovanjeId}
          ime={info.full_name}
          klub={info.team_name}
          klubKratko={info.team_short}
          klubLogo={info.team_logo}
          naZapri={() => setInfo(null)}
        />
      )}
    </div>
  )
}

function TrgIgralcev({
  vidni,
  izbrani,
  izbraniPodrobno,
  preostalo,
  vKadru,
  klubi,
  iskanje,
  setIskanje,
  filterKlub,
  setFilterKlub,
  filterPoz,
  setFilterPoz,
  naPreklop,
  naInfo,
  odsotni,
  mobilno = false,
  zIskanjem = true,
}: {
  vidni: IgralecTrga[]
  izbrani: VrsticaKadra[]
  izbraniPodrobno: IgralecTrga[]
  preostalo: number
  vKadru: Record<string, number>
  klubi: Array<[number, string]>
  iskanje: string
  setIskanje: (v: string) => void
  filterKlub: string
  setFilterKlub: (v: string) => void
  filterPoz: Pozicija | 'vse'
  setFilterPoz: (v: Pozicija | 'vse') => void
  naPreklop: (i: IgralecTrga) => void
  naInfo: (i: IgralecTrga) => void
  /** Poškodba je razlog, da igralca NE kupiš — vidna mora biti na trgu. */
  odsotni: Record<number, Odsotnost>
  mobilno?: boolean
  /** Ali naj se ob odprtju tipkovnica postavi v iskanje. */
  zIskanjem?: boolean
}) {
  const iskanjeRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    // Z gumbom "Dodaj" uporabnik odpre predal, ker ve, koga išče — tipkovnica
    // naj bo pripravljena. S praznega mesta brska po poziciji in tipkovnica
    // bi mu le prekrila seznam. Na desktopu tega ne rabimo.
    if (mobilno && zIskanjem && iskanjeRef.current) {
      const t = setTimeout(() => iskanjeRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [mobilno, zIskanjem])
  return (
    <section className="space-y-3">
      {/* Iskanje in filtri so sticky, da ne izginejo, ko listaš seznam.
          Na mobilnem je to ključno — brskaš po 60 igralcih z eno roko. */}
      <div className="sticky top-0 z-10 -mx-3 space-y-2 border-b border-white/5 bg-slate-950/95 px-3 pb-2 pt-2 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold sm:text-xl">
            {filterPoz === 'vse' ? 'Trg igralcev' : POZICIJE[filterPoz].naslov}
          </h2>
          <span className="text-xs text-slate-500">{mnozina(vidni.length, IGRALCI)}</span>
        </div>

        <div className="relative">
          <input
            ref={iskanjeRef}
            value={iskanje}
            onChange={(e) => setIskanje(e.target.value)}
            placeholder="Išči po imenu …"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 pr-9 text-base sm:text-sm"
          />
          {iskanje && (
            <button
              onClick={() => {
                setIskanje('')
                iskanjeRef.current?.focus()
              }}
              aria-label="Počisti iskanje"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-slate-400 hover:bg-white/5"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterPoz('vse')}
            className={`znacka whitespace-nowrap px-2 py-1 transition ${
              filterPoz === 'vse'
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            vsi
          </button>
          {VRSTNI_RED.map((koda) => (
            <button
              key={koda}
              onClick={() => setFilterPoz(koda)}
              title={POZICIJE[koda].naslov}
              className={`znacka whitespace-nowrap px-2 py-1 transition ${
                filterPoz === koda
                  ? razredPozicije(koda)
                  : 'bg-white/5 text-slate-400'
              } ${vKadru[koda] >= POZICIJE[koda].kader ? 'opacity-50' : ''}`}
            >
              {KRATKA_POZICIJA[koda]} {vKadru[koda]}/{POZICIJE[koda].kader}
            </button>
          ))}
        </div>

        <select
          value={filterKlub}
          onChange={(e) => setFilterKlub(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="vsi">Vsi klubi</option>
          {klubi.map(([id, ime]) => (
            <option key={id} value={id}>
              {ime}
            </option>
          ))}
        </select>
      </div>

      {vidni.length === 0 && (
        <div className="kartica space-y-2 p-4 text-center text-sm text-slate-400">
          <p>Ni zadetkov.</p>
          <button
            onClick={() => {
              setIskanje('')
              setFilterPoz('vse')
              setFilterKlub('vsi')
            }}
            className="gumb-tih px-3 py-1.5 text-xs"
          >
            Počisti filtre
          </button>
        </div>
      )}

      <ul className="space-y-1.5">
        {vidni.slice(0, 60).map((i) => {
          const jeIzbran = izbrani.some((s) => s.player_id === i.id)
          const razlog = jeIzbran
            ? null
            : zakajNeGre(i, izbraniPodrobno, preostalo)
          const statLetos =
            Number(i.minutes ?? 0) > 0
              ? `${i.goals} G · ${i.minutes} min`
              : i.goli_lani > 0
                ? `lani ${i.goli_lani} G`
                : 'brez nastopov'
          const zadnjeTocke =
            (i as any).tocke_krog != null ? Number((i as any).tocke_krog) : null
          return (
            <li
              key={i.id}
              className={`kartica p-2 ${
                jeIzbran ? 'ring-1 ring-gnl-400/40' : ''
              } ${razlog ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Grb
                  ime={i.team_name}
                  kratko={i.team_short}
                  logo={i.team_logo}
                  velikost={22}
                />
                <span className={`znacka shrink-0 ${razredPozicije(i.position)}`}>
                  {(i.position && KRATKA_POZICIJA[i.position]) ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {prikazniIme(i.full_name)}
                    {odsotni[i.id] && (
                      <span
                        title={opisOdsotnosti(odsotni[i.id])}
                        className="ml-1.5 align-middle text-xs"
                      >
                        {odsotni[i.id].kind === 'poskodba' ? '🩹' : '🚫'}
                      </span>
                    )}
                    {i.active === false && (
                      <span className="znacka ml-1.5 bg-rose-500/20 align-middle text-[10px] text-rose-200">
                        ni več v ligi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                    <span className="truncate">
                      {i.team_short} · {statLetos}
                    </span>
                    {zadnjeTocke != null && (
                      <span
                        title="Točke v zadnjem odigranem krogu"
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                          zadnjeTocke > 0
                            ? 'bg-fuchsia-500/25 text-fuchsia-100'
                            : zadnjeTocke < 0
                              ? 'bg-rose-500/20 text-rose-200'
                              : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {zadnjeTocke > 0 ? '+' : ''}
                        {zadnjeTocke}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    naInfo(i)
                  }}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  aria-label={`Podatki o igralcu ${prikazniIme(i.full_name)}`}
                  title="Statistika, gibanje cene, naslednje tekme"
                  className="flex h-9 w-9 shrink-0 items-center justify-center"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/15">
                    i
                  </span>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-black tabular-nums text-gnl-300">
                    {formatirajCeno(i.value)}
                  </span>
                  <button
                    onClick={(e) => {
                      // Prepreci "phantom click" ob naravnem drsanju po
                      // seznamu na mobilnem, kjer prst mimogrede zadene
                      // gumb. React onClick se vseeno sprozi tudi z rocnim
                      // dotikom, ki sledi drsanju.
                      e.stopPropagation()
                      naPreklop(i)
                    }}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    title={razlog ?? undefined}
                    className={`${
                      jeIzbran ? 'gumb-tih' : 'gumb-glavni'
                    } px-3 py-1 text-sm`}
                  >
                    {jeIzbran ? '✕ odstrani' : '⊕ dodaj'}
                  </button>
                </div>
              </div>
              {razlog && (
                <p className="mt-1 text-[11px] leading-tight text-amber-300/90">
                  ⚠ {razlog}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {vidni.length > 60 && (
        <p className="text-center text-xs text-slate-500">
          Prikazanih prvih 60 — zoži izbor z iskanjem.
        </p>
      )}
      <p className="text-center text-xs text-slate-600">
        Iz istega kluba lahko izbereš največ {MAX_IZ_KLUBA} igralce.
        Goli in minute so iz tekoče sezone.
      </p>
    </section>
  )
}

/** Trg na telefonu: predal od spodaj, ki se obnaša kot pogovorno okno. */
function PredalTrga({
  naZapri,
  escapeZanj,
  povzetek,
  children,
}: {
  naZapri: () => void
  escapeZanj: boolean
  povzetek: React.ReactNode
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    // Fokus na okno, da bralnik zaslona in tipkovnica začneta v njem.
    ref.current?.focus()
  }, [])
  useEffect(() => {
    if (!escapeZanj) return
    const tipka = (e: KeyboardEvent) => {
      if (e.key === 'Escape') naZapri()
    }
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [escapeZanj, naZapri])
  return (
    <div className="lg:hidden">
      <div
        onClick={naZapri}
        className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Trg igralcev"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-white/15 bg-slate-950 shadow-2xl outline-none"
      >
        <div className="shrink-0 border-b border-white/10 px-3 pb-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="h-1 w-10 shrink-0 rounded-full bg-white/30" aria-hidden />
            {/* Proračun in zasedenost ostaneta vidna, ko listaš seznam. */}
            <span className="min-w-0 flex-1 truncate">{povzetek}</span>
            <button
              onClick={naZapri}
              aria-label="Zapri trg"
              className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              ✕ Zapri
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function Rok({ krog }: { krog: KrogRok }) {
  const rok = krog.deadline_at ? new Date(krog.deadline_at) : null
  const zapadel = rok ? rok.getTime() <= Date.now() : false
  return (
    <div className="kartica flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
      <span className="znacka bg-gnl-400/20 text-gnl-200">{krog.number}. krog</span>
      {rok ? (
        <>
          <span className="text-slate-300">
            {zapadel ? 'Rok je potekel — ' : 'Rok: '}
            <strong className="font-semibold">
              {izpisRoka(krog.deadline_at!)}
            </strong>
          </span>
          <Odstevanje do={krog.deadline_at} ozadje />
        </>
      ) : (
        <span className="text-slate-400">Rok še ni določen.</span>
      )}
      <span className="w-full text-xs text-slate-500">
        {zapadel
          ? 'Spremembe zdaj veljajo za naslednji krog.'
          : 'Ob roku se postava posname — dokler ni potekel, prosto spreminjaj.'}
      </span>
    </div>
  )
}

function IzborTraku({
  oznaka,
  vrednost,
  moznosti,
  naIzbor,
}: {
  oznaka: string
  vrednost: string | number
  moznosti: Array<{ id: number | string; full_name?: string | null }>
  naIzbor: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-slate-400 sm:w-28">{oznaka}</span>
      <select
        value={vrednost}
        onChange={(e) => naIzbor(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
      >
        <option value="">— nihče —</option>
        {moznosti.map((s) => (
          <option key={s.id} value={s.id}>
            {prikazniIme(s.full_name)}
          </option>
        ))}
      </select>
    </label>
  )
}
