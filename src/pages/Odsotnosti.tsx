// Forum: kdo naslednjič ne bo igral.
//
// Zapisnik pove, kdo je igral — ne pa, kdo bo manjkal. To ve skupnost, in
// doslej je bilo to ustno izročilo. Tu je zbrano na enem mestu, urejeno po
// času, z možnostjo filtriranja po vrsti.
//
// Informacija je SAMO informacija: nič od tega ne označi igralca za
// nedosegljivega in ne vpliva na sestavo ekipe.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { prikazniIme } from '../lib/pomozno'
import { vseVrstice } from '../lib/strani'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import Grb from '../components/Grb'
import { t, tx } from '../i18n'
import {
  VRSTE,
  VrsticaPorocila,
  type Porocilo,
  type VrstaPorocila,
} from '../components/Odsotnost'

/** Brez šumnikov in velikih črk — "zeleznik" najde "Železnik" (kot izbirnik lige). */
const poenostavi = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

/** Igralec v izbirniku ob objavi. */
interface IgralecIzbira {
  id: number
  full_name: string | null
  team_name?: string | null
}

export default function Odsotnosti() {
  const { session } = useAuth()
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const [porocila, setPorocila] = useState<Porocilo[]>([])
  // Kaj se dogaja v DRUGIH ligah. Pri petindvajsetih ligah in peščici poročil
  // je stran skoraj vedno prazna — in prazna stran ne pove, čemu služi.
  const [drugod, setDrugod] = useState<Porocilo[]>([])
  const [filter, setFilter] = useState<VrstaPorocila | 'vse'>('vse')
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)

  // obrazec
  const [odprt, setOdprt] = useState(false)
  const [iskanje, setIskanje] = useState('')
  // Vsi igralci lige, naloženi ob prvem odprtju obrazca. Iščemo po njih v
  // brskalniku, ker `ilike` v bazi ne zna enačiti "c" in "č".
  const [igralciLige, setIgralciLige] = useState<IgralecIzbira[]>([])
  const [izbran, setIzbran] = useState<IgralecIzbira | null>(null)
  const [vrsta, setVrsta] = useState<VrstaPorocila>('poskodba')
  const [besedilo, setBesedilo] = useState('')
  const [posiljam, setPosiljam] = useState(false)
  const { pathname, search } = useLocation()
  useNaslov(t('igralci.odsotnosti.naslov'))

  useEffect(() => {
    if (!tekmovanjeId) return
    const ligaId = tekmovanjeId
    setNalaganje(true)
    setNapaka(null)
    let veljavno = true
    ;(async () => {
      const [{ data, error }, { data: ostalo }] = await Promise.all([
        supabase
          .from('player_reports_view')
          .select('*')
          .eq('competition_id', ligaId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('player_reports_view')
          .select('*')
          .neq('competition_id', ligaId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (!veljavno) return
      if (error) setNapaka(error.message)
      else setPorocila((data ?? []) as Porocilo[])
      setDrugod((ostalo ?? []) as Porocilo[])
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  // Iskanje igralca ob objavi. Brez izbranega igralca poročilo nima smisla —
  // forum je urejen po igralcih, ne po prostem besedilu.
  useEffect(() => {
    if (!tekmovanjeId || !odprt) return
    const ligaId = tekmovanjeId
    setIgralciLige([])
    let veljavno = true
    vseVrstice((od, do_) =>
      supabase
        .from('player_overview')
        .select('id, full_name, team_name')
        .eq('competition_id', ligaId)
        .order('id')
        .range(od, do_),
    )
      .then((vsi) => {
        if (veljavno)
          setIgralciLige(
            vsi.flatMap((i) => (i.id == null ? [] : [{ ...i, id: i.id }])),
          )
      })
      .catch((e: Error) => {
        if (veljavno) setNapaka(e.message)
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId, odprt])

  const zadetki = useMemo(() => {
    const q = poenostavi(iskanje)
    if (q.length < 2) return []
    return igralciLige
      .filter((i) => poenostavi(i.full_name ?? '').includes(q))
      .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'sl'))
      .slice(0, 8)
  }, [iskanje, igralciLige])

  const vidna = useMemo(
    () => (filter === 'vse' ? porocila : porocila.filter((p) => p.kind === filter)),
    [porocila, filter],
  )

  async function objavi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return setNapaka(t('igralci.odsotnosti.prijavaZaObjavo'))
    if (!izbran) return setNapaka(t('igralci.odsotnosti.najprejIzberi'))
    const vsebina = besedilo.trim()
    if (!vsebina) return
    setPosiljam(true)
    setNapaka(null)

    const { data, error } = await supabase
      .from('player_reports')
      .insert({
        player_id: izbran.id,
        user_id: session.user.id,
        kind: vrsta,
        content: vsebina,
      })
      .select('id')
      .single()
    setPosiljam(false)
    if (error) return setNapaka(error.message)

    // Vstavimo na vrh brez ponovnega branja — pogled bi zahteval dodatno
    // poizvedbo samo za ime igralca, ki ga že imamo.
    if (data)
      setPorocila((prej) => [
        {
          id: data.id,
          player_id: izbran.id,
          user_id: session.user.id,
          kind: vrsta,
          content: vsebina,
          created_at: new Date().toISOString(),
          player_name: izbran.full_name,
          team_name: izbran.team_name,
          author_name: null,
        },
        ...prej,
      ])
    setBesedilo('')
    setIzbran(null)
    setIskanje('')
    setOdprt(false)
  }

  async function izbrisi(id: number) {
    const { error } = await supabase.from('player_reports').delete().eq('id', id)
    if (error) return setNapaka(error.message)
    setPorocila((prej) => prej.filter((p) => p.id !== id))
  }

  if (nalaganje) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {t('igralci.odsotnosti.naslov')}
          {tekmovanje?.short_name && (
            <span className="ml-2 align-middle text-base font-bold text-slate-500">
              {tekmovanje.short_name}
            </span>
          )}
        </h1>
        <p className="max-w-2xl text-slate-400">
          {tx('igralci.odsotnosti.uvod', {}, {
            krepko: (b) => <strong className="text-slate-300">{b}</strong>,
          })}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('vse')}
          className={`znacka transition ${
            filter === 'vse'
              ? 'bg-gnl-500 text-slate-950'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          {t('igralci.odsotnosti.vse')}
        </button>
        {VRSTE.map((v) => (
          <button
            key={v.kljuc}
            onClick={() => setFilter(v.kljuc)}
            className={`znacka transition ${
              filter === v.kljuc
                ? 'bg-gnl-500 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span aria-hidden="true">{v.ikona}</span> {v.oznaka}
          </button>
        ))}
        <div className="ml-auto">
          {session ? (
            <button onClick={() => setOdprt(!odprt)} className={odprt ? 'gumb-tih' : 'gumb-glavni'}>
              {odprt ? t('skupno.zapri') : t('igralci.odsotnosti.javi')}
            </button>
          ) : (
            <Link
              to={povezavaNaPrijavo(pathname + search)}
              className="text-sm text-gnl-300 underline"
            >
              {t('igralci.odsotnosti.prijaviSe')}
            </Link>
          )}
        </div>
      </div>

      {odprt && session && (
        <form onSubmit={objavi} className="kartica animiraj-vstop space-y-3 p-4">
          <div>
            <label className="block text-sm text-slate-400">
              {t('igralci.odsotnosti.kdo')}
              <input
                value={izbran ? prikazniIme(izbran.full_name) : iskanje}
                onChange={(e) => {
                  setIzbran(null)
                  setIskanje(e.target.value)
                }}
                placeholder={t('igralci.odsotnosti.isciIgralca')}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            {!izbran && zadetki.length > 0 && (
              <ul className="mt-1 space-y-1">
                {zadetki.map((z) => (
                  <li key={z.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIzbran(z)
                      }}
                      className="w-full rounded-lg bg-white/5 px-3 py-1.5 text-left text-sm hover:bg-white/10"
                    >
                      {prikazniIme(z.full_name)}
                      <span className="ml-2 text-xs text-slate-500">{z.team_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {VRSTE.map((v) => (
              <button
                key={v.kljuc}
                type="button"
                onClick={() => setVrsta(v.kljuc)}
                className={`znacka transition ${
                  vrsta === v.kljuc
                    ? 'bg-gnl-500 text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span aria-hidden="true">{v.ikona}</span> {v.oznaka}
              </button>
            ))}
          </div>

          <textarea
            value={besedilo}
            onChange={(e) => setBesedilo(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t('igralci.odsotnosti.primer')}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={posiljam || !izbran || !besedilo.trim()}
            className="gumb-glavni w-full sm:w-auto"
          >
            {posiljam ? t('igralci.odsotnosti.objavljam') : t('igralci.odsotnosti.objavi')}
          </button>
        </form>
      )}

      {vidna.length === 0 ? (
        <div className="kartica space-y-2 p-6 text-center text-slate-400">
          <p>
            {porocila.length === 0
              ? t('igralci.odsotnosti.prazno')
              : t('igralci.odsotnosti.praznaKategorija')}
          </p>
          {porocila.length === 0 && (
            <p className="text-sm text-slate-500">
              {t('igralci.odsotnosti.praznoNamig')}
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {vidna.map((p) => (
            <VrsticaPorocila
              key={p.id}
              porocilo={p}
              naslov={
                <span className="flex min-w-0 items-center gap-1.5">
                  <Grb
                    ime={p.team_name}
                    kratko={p.team_short}
                    logo={p.team_logo}
                    velikost={18}
                  />
                  <Link
                    to={`/igralec/${p.player_id}`}
                    className="truncate font-semibold hover:text-gnl-300"
                  >
                    {prikazniIme(p.player_name)}
                  </Link>
                </span>
              }
              naIzbris={
                session?.user?.id === p.user_id ? () => izbrisi(p.id) : undefined
              }
            />
          ))}
        </ul>
      )}

      {drugod.length > 0 && (
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {t('igralci.odsotnosti.drugod')}
          </h2>
          <ul className="space-y-2 opacity-75">
            {drugod.map((p) => (
              <VrsticaPorocila
                key={`d-${p.id}`}
                porocilo={p}
                naslov={
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Grb
                      ime={p.team_name}
                      kratko={p.team_short}
                      logo={p.team_logo}
                      velikost={18}
                    />
                    <Link
                      to={`/igralec/${p.player_id}`}
                      className="truncate font-semibold hover:text-gnl-300"
                    >
                      {prikazniIme(p.player_name)}
                    </Link>
                  </span>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </div>
  )
}
