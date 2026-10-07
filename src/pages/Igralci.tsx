import { useEffect, useMemo, useState } from 'react'
import { imeZveze } from '../components/VirPodatkov'
import { supabase } from '../lib/supabase'
import { useOdsotni, opisOdsotnosti } from '../lib/odsotni'
import {
  prikazniIme,
  razredPozicije,
  KRATKA_POZICIJA,
  formatirajTocke,
  formatirajCeno,
  mnozina,
  IGRALCI,
  TEKME,
} from '../lib/pomozno'
import { vseVrstice } from '../lib/strani'
import { useNaslov } from '../lib/naslov'
import { Link } from 'react-router-dom'
import { POZICIJE } from '../lib/pravila'
import { useTekmovanje } from '../lib/tekmovanje'
import Grb from '../components/Grb'
import { t, tx, lokale } from '../i18n'
import type { Pozicija } from '../lib/tipi'
import Sponzor from '../components/Sponzor'

/** Vrstica pogleda `player_season_standings` (+ igralci brez nastopov). */
interface IgralecSezone {
  id: number
  full_name: string | null
  position: Pozicija | null
  team_id: number | null
  team_name?: string | null
  team_short?: string | null
  team_logo?: string | null
  value: number | null
  season: string | null
  points: number | null
  form: number | null
  last_round: number | null
  points_per_match: number | null
  points_per_value: number | null
  owners: number | null
  goals: number | null
  minutes: number | null
  matches: number | null
  clean_sheets: number | null
  rank: number | null
}

/** Vrstica pogleda `sezone`. */
interface SezonaVrstica {
  season: string
  odigranih: number
  tekoca: boolean
}

/** Kljuc stolpca, po katerem se razvrsca. */
type Stolpec = keyof Pick<
  IgralecSezone,
  | 'points'
  | 'form'
  | 'last_round'
  | 'points_per_match'
  | 'points_per_value'
  | 'value'
  | 'goals'
  | 'minutes'
  | 'owners'
>

// Tabela vseh igralcev lige s tekočimi točkami — po kateremkoli stolpcu se da
// razvrstiti, da je razvidno, kdo je v sezoni ali v zadnjih krogih najboljši.
// `mobilno: false` stolpec na ozkem zaslonu skrije, da točke ostanejo vidne.
const STOLPCI: Array<{ kljuc: Stolpec; naslov: string; opis: string; mobilno?: false }> = [
  { kljuc: 'points', naslov: t('igralci.seznam.stolpci.tocke'), opis: t('igralci.seznam.stolpci.tockeOpis') },
  { kljuc: 'form', naslov: t('igralci.seznam.stolpci.forma'), opis: t('igralci.seznam.stolpci.formaOpis') },
  {
    kljuc: 'last_round',
    naslov: t('igralci.seznam.stolpci.zadnjiKrog'),
    opis: t('igralci.seznam.stolpci.zadnjiKrogOpis'),
    mobilno: false,
  },
  {
    kljuc: 'points_per_match',
    naslov: t('igralci.seznam.stolpci.naTekmo'),
    opis: t('igralci.seznam.stolpci.naTekmoOpis'),
  },
  {
    kljuc: 'points_per_value',
    naslov: t('igralci.seznam.stolpci.naCeno'),
    opis: t('igralci.seznam.stolpci.naCenoOpis'),
    mobilno: false,
  },
  { kljuc: 'value', naslov: t('igralci.seznam.stolpci.cena'), opis: t('igralci.seznam.stolpci.cenaOpis') },
  { kljuc: 'goals', naslov: t('igralci.seznam.stolpci.goli'), opis: t('igralci.seznam.stolpci.goliOpis') },
  { kljuc: 'minutes', naslov: t('igralci.seznam.stolpci.minute'), opis: t('igralci.seznam.stolpci.minuteOpis'), mobilno: false },
  {
    kljuc: 'owners',
    naslov: t('igralci.seznam.stolpci.izbran'),
    opis: t('igralci.seznam.stolpci.izbranOpis'),
  },
]

const selectRazred =
  'min-w-0 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-200'

export default function Igralci() {
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const odsotni = useOdsotni(tekmovanjeId)
  const zveza = imeZveze(tekmovanje)
  const [igralci, setIgralci] = useState<IgralecSezone[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [iskanje, setIskanje] = useState('')
  const [filterPoz, setFilterPoz] = useState<Pozicija | 'vse'>('vse')
  const [filterKlub, setFilterKlub] = useState<string>('vsi')
  const [urejanje, setUrejanje] = useState<Stolpec>('points')
  const [koliko, setKoliko] = useState(50)
  const [sezone, setSezone] = useState<SezonaVrstica[]>([])
  const [sezona, setSezona] = useState<string | null>(null)
  // Število ekip v ligi — imenovalec za "Izbran %". Največje število
  // lastnikov enega igralca ni isto: tudi najbolj izbranega nima vsak.
  const [ekipVLigi, setEkipVLigi] = useState<number | null>(null)
  useNaslov(t('igralci.seznam.naslov'))

  // Sezone in prva stran lestvice gresta hkrati: čakanje na seznam sezon, da
  // sploh vemo, katero lestvico naložiti, je podvojilo čas do prvega izrisa.
  useEffect(() => {
    if (!tekmovanjeId) return
    // Nova liga: klubi, sezone in napaka prejšnje ne veljajo več, njeni
    // pozni odgovori pa ne smejo prepisati nove.
    let veljavno = true
    setNalaganje(true)
    setNapaka(null)
    setFilterKlub('vsi')
    setSezona(null)
    setSezone([])
    setEkipVLigi(null)
    const ligaId = tekmovanjeId
    async function nalozi() {
      const [{ data: vse, error }, { data: privzeta }, { count }] = await Promise.all([
        supabase
          .from('sezone')
          .select('season, odigranih, tekoca')
          .eq('competition_id', ligaId)
          .order('season', { ascending: false }),
        supabase
          .from('player_season_standings')
          .select(
            'id, full_name, position, team_id, team_name, team_short, team_logo, value, season, points, form, last_round, points_per_match, points_per_value, owners, goals, minutes, matches, clean_sheets, rank',
          )
          .eq('competition_id', ligaId)
          .order('points', { ascending: false })
          .limit(500),
        // Šteje tabelo, ne pogleda lestvice: ta za vsako ekipo sešteje točke
        // vseh krogov, tu pa rabimo le število ekip.
        supabase
          .from('fantasy_teams')
          .select('id', { count: 'exact', head: true })
          .eq('competition_id', ligaId)
          // Izbranost hišnih ekip ne šteje (glej `owners`), zato tudi imenovalec ne.
          .eq('hisna', false),
      ])
      if (!veljavno) return
      if (error) {
        setNapaka(error.message)
        setNalaganje(false)
        return
      }
      setEkipVLigi(count ?? null)
      const sezone = (vse ?? []) as SezonaVrstica[]
      setSezone(sezone)
      const izbrana =
        (sezone.find((s) => s.tekoca && s.odigranih > 0) ??
          sezone.find((s) => s.odigranih > 0) ??
          sezone[0])?.season
      setSezona(izbrana ?? null)
      // Iz enega prenosa vzamemo vrstice izbrane sezone; ob preklopu sezone
      // spodnji učinek po potrebi donese ostalo.
      const zeImamo = ((privzeta ?? []) as IgralecSezone[]).filter(
        (i) => i.season === izbrana,
      )
      if (zeImamo.length) {
        setIgralci(zeImamo)
        setNalaganje(false)
      }
      // Liga brez ene same odigrane tekme (sveže dodano tekmovanje, sezona
      // pred prvim krogom) nima sezone, ki bi jo spodnji učinek naložil —
      // brez tega bi stran za vedno obtičala na "Nalaganje …".
      if (!izbrana) {
        setIgralci([])
        setNalaganje(false)
      }
    }
    nalozi()
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  useEffect(() => {
    if (!sezona || !tekmovanjeId) return
    let veljavno = true
    setNalaganje(true)
    const ligaId = tekmovanjeId
    const izbranaSezona = sezona
    const jeTekoca = sezone.find((s) => s.season === sezona)?.tekoca
    ;(async () => {
      // Po straneh: velika liga ima v sezoni lahko čez tisoč igralcev.
      let standings: IgralecSezone[]
      try {
        standings = await vseVrstice((od, do_) =>
          supabase
            .from('player_season_standings')
            .select(
              'id, full_name, position, team_id, team_name, team_short, team_logo, value, season, points, form, last_round, points_per_match, points_per_value, owners, goals, minutes, matches, clean_sheets, rank',
            )
            .eq('competition_id', ligaId)
            .eq('season', izbranaSezona)
            .order('points', { ascending: false })
            .order('id')
            .range(od, do_),
        ) as IgralecSezone[]
      } catch (e) {
        if (!veljavno) return
        setNapaka((e as Error).message)
        setNalaganje(false)
        return
      }
      if (!veljavno) return

      // Za TEKOČO sezono pokažimo tudi na novo registrirane igralce, ki
      // še nimajo nastopov — sicer novi igralec (npr. sveži prestop) ne
      // bo viden na tej strani, dokler ne odigra prve tekme.
      let vsi = standings
      if (jeTekoca) {
        const aktivni = await vseVrstice((od, do_) =>
          supabase
            .from('players')
            .select(
              'id, full_name, position, team_id, value, active, teams!inner(name, short_name, logo_url)',
            )
            .eq('competition_id', ligaId)
            .eq('active', true)
            .order('id')
            .range(od, do_),
        ).catch(() => [])
        if (!veljavno) return
        const znani = new Set(vsi.map((i) => i.id))
        const brezStatistike: IgralecSezone[] = ((aktivni ?? []) as any[])
          .filter((p) => !znani.has(p.id))
          .map((p) => ({
            id: p.id,
            full_name: p.full_name,
            position: p.position,
            team_id: p.team_id,
            team_name: p.teams?.name,
            team_short: p.teams?.short_name,
            team_logo: p.teams?.logo_url,
            value: p.value,
            season: izbranaSezona,
            points: 0,
            form: 0,
            last_round: 0,
            points_per_match: 0,
            points_per_value: 0,
            owners: 0,
            goals: 0,
            minutes: 0,
            matches: 0,
            clean_sheets: 0,
            rank: null,
          }))
        vsi = [...vsi, ...brezStatistike]
      }
      setIgralci(vsi)
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [sezona, sezone, tekmovanjeId])

  const klubi = useMemo(() => {
    const m = new Map()
    for (const i of igralci) if (i.team_name) m.set(i.team_id, i.team_name)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], lokale()))
  }, [igralci])

  const vidni = useMemo(() => {
    const f = igralci.filter((i) => {
      if (filterPoz !== 'vse' && i.position !== filterPoz) return false
      if (filterKlub !== 'vsi' && String(i.team_id) !== filterKlub) return false
      if (
        iskanje &&
        !(i.full_name ?? '').toLowerCase().includes(iskanje.toLowerCase())
      )
        return false
      return true
    })
    return [...f].sort(
      (a, b) => Number(b[urejanje] ?? 0) - Number(a[urejanje] ?? 0),
    )
  }, [igralci, iskanje, filterPoz, filterKlub, urejanje])

  const sezonaPodatki = sezone.find((s) => s.season === sezona)
  const jeLanska = Boolean(sezonaPodatki) && !sezonaPodatki?.tekoca

  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (nalaganje)
    return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  // Izbranost pride iz posnetka zadnjega zaklenjenega kroga. Dokler ta ne
  // obstaja, je `owners` NULL — pred prvim rokom so ekipe se skrite in
  // stevilke ni, kar ni isto kot nic. Delež je od vseh ekip v ligi.
  const ekip = Math.max(ekipVLigi ?? 0, 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {tekmovanje?.short_name
            ? t('igralci.seznam.naslovZLigo', { liga: tekmovanje.short_name })
            : t('igralci.seznam.naslov')}
        </h1>
        {/* Na telefonu le stanje sezone: brez njega ni jasno, ali je sezona že stekla. */}
        <p className="mt-1 text-sm text-slate-400">
          <span className="hidden sm:inline">{t('igralci.seznam.uvod', { zveza })}</span>
          {sezonaPodatki && (
            <>
              <span className="hidden sm:inline">{' · '}</span>
              {sezonaPodatki.odigranih === 0
                ? t('igralci.seznam.sezonaNiZacela')
                : t('igralci.seznam.odigranih', { n: sezonaPodatki.odigranih })}
            </>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {/* Filtri v dveh vrsticah: iskanje s sezono (brez sezone ni jasno, ali
            gledaš letošnjo ali lansko statistiko), nato klub, pozicija, vrstni red. */}
        <div className="flex gap-2">
          <input
            value={iskanje}
            onChange={(e) => setIskanje(e.target.value)}
            placeholder={t('igralci.seznam.isci')}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
          />
          {sezone.length > 0 && (
            <select
              value={sezona ?? ''}
              onChange={(e) => setSezona(e.target.value)}
              className={selectRazred}
            >
              {sezone.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.season}
                  {s.tekoca ? ` · ${t('igralci.seznam.tekoca')}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <select value={filterKlub} onChange={(e) => setFilterKlub(e.target.value)} className={`${selectRazred} w-full sm:w-auto`}>
            <option value="vsi">{t('igralci.seznam.vsiKlubi')}</option>
            {klubi.map(([id, ime]) => (
              <option key={id} value={id}>
                {ime}
              </option>
            ))}
          </select>
          <select
            value={filterPoz}
            onChange={(e) => setFilterPoz(e.target.value as Pozicija | 'vse')}
            className={`${selectRazred} w-full sm:w-auto`}
          >
            <option value="vse">{t('igralci.seznam.vsePozicije')}</option>
            {Object.entries(POZICIJE).map(([k, p]) => (
              <option key={k} value={k}>
                {p.naslov}
              </option>
            ))}
          </select>
          {/* Na telefonu so gumbi v glavi tabele drobni in delno zunaj zaslona. */}
          <select
            value={urejanje}
            onChange={(e) => setUrejanje(e.target.value as Stolpec)}
            aria-label={t('igralci.seznam.razvrsti')}
            className={`${selectRazred} w-full sm:hidden`}
          >
            {/* Le stolpci, ki jih telefon kaže: razvrščanje po skriti vrednosti zmede. */}
            {STOLPCI.filter((s) => s.mobilno !== false).map((s) => (
              <option key={s.kljuc} value={s.kljuc}>
                {`↓ ${s.naslov}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {jeLanska && (
        <p className="text-sm text-amber-200">
          {tx('igralci.seznam.lanska', { sezona }, { krepko: (b) => <strong>{b}</strong> })}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[30rem] text-sm sm:min-w-[46rem]">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
              <th className="hidden px-3 py-2 text-left font-semibold sm:table-cell">#</th>
              <th className="sticky left-0 z-10 bg-slate-950 px-3 py-2 text-left font-semibold sm:static sm:bg-transparent">
                {t('igralci.seznam.igralec')}
              </th>
              {STOLPCI.map((s) => (
                <th
                  key={s.kljuc}
                  className={`px-2 py-2 text-right font-semibold ${
                    s.mobilno === false ? 'hidden sm:table-cell' : ''
                  }`}
                >
                  <button
                    onClick={() => setUrejanje(s.kljuc)}
                    title={s.opis}
                    className={`whitespace-nowrap transition hover:text-white ${
                      urejanje === s.kljuc ? 'text-gnl-300' : ''
                    }`}
                  >
                    {s.naslov}
                    {urejanje === s.kljuc ? ' ↓' : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vidni.slice(0, koliko).map((i, idx) => (
              <tr
                key={i.id}
                className="border-b border-white/5 transition hover:bg-white/5"
              >
                <td className="hidden px-3 py-2 text-xs font-black text-slate-400 sm:table-cell">
                  {idx + 1}
                </td>
                <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 sm:static sm:max-w-none sm:bg-transparent">
                  <div className="flex items-center gap-2">
                    <Grb
                      ime={i.team_name}
                      kratko={i.team_short}
                      logo={i.team_logo}
                      velikost={24}
                    />
                    <div className="min-w-0 max-w-[8.5rem] sm:max-w-none">
                      <Link
                        to={`/player/${i.id}`}
                        className="block truncate font-semibold hover:text-gnl-300"
                      >
                        {prikazniIme(i.full_name)}
                        {odsotni[i.id] && (
                          <span
                            title={opisOdsotnosti(odsotni[i.id])}
                            role="img"
                            aria-label={opisOdsotnosti(odsotni[i.id])}
                            className="ml-1.5 align-middle text-xs"
                          >
                            {odsotni[i.id].kind === 'poskodba' ? '🩹' : '🚫'}
                          </span>
                        )}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        <span className={`mr-1 rounded px-1 text-[10px] font-bold ${razredPozicije(i.position)}`}>
                          {(i.position && KRATKA_POZICIJA[i.position]) ?? '?'}
                        </span>
                        {i.team_short} · {mnozina(Number(i.matches ?? 0), TEKME)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-black tabular-nums">
                  {formatirajTocke(i.points)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                  {formatirajTocke(i.form)}
                </td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-300 sm:table-cell">
                  {formatirajTocke(i.last_round)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {formatirajTocke(i.points_per_match)}
                </td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-400 sm:table-cell">
                  {formatirajTocke(i.points_per_value)}
                </td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-gnl-300">
                  {formatirajCeno(i.value)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {i.goals}
                </td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-400 sm:table-cell">
                  {i.minutes}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {i.owners === null ? (
                    <span className="text-slate-500" title={t('igralci.seznam.znanoPoRoku')}>
                      –
                    </span>
                  ) : (
                    <>
                      {i.owners}
                      <span className="ml-1 text-xs text-slate-500">
                        ({Math.round((Number(i.owners ?? 0) / ekip) * 100)}%)
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vidni.length > koliko ? (
        <div className="text-center">
          <button onClick={() => setKoliko(koliko + 50)} className="gumb-tih text-sm">
            {t('igralci.seznam.pokaziVec', { n: vidni.length - koliko })}
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-slate-500">
          {t('igralci.seznam.prikazaniVsi', { igralci: mnozina(vidni.length, IGRALCI) })}
        </p>
      )}

      <Sponzor kje="igralci" />
    </div>
  )
}
