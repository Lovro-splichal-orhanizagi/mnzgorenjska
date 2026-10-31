// Izložba preverjenega polnoletnega igralca na vrhu profila: pasica,
// fotografija, ime in kljukica, privolitev SLFF Club (odprt za prestop),
// velik izpostavljeni posnetek, seznam posnetkov, številke sezone, pozitiven
// kazalnik Scouta, opis in opomba o omrežju SLFF Club. Lastnik isto stran
// ureja na mestu (pasica, opis, posnetki), vidi moč profila in oglede
// skavtov. Kaj kdo vidi, odloči baza (`izlozba_igralca`, `izlozba_dovoljena`);
// posnetki so v Cloudflare Stream, naslove za ogled da funkcija
// `posnetki-igralca` (podpisani žetoni, le za dovoljene posnetke).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t, stevilo } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { IME_POZICIJE, formatirajTocke } from '../lib/pomozno'
import { VEDRO_FOTOGRAFIJ, naslovFotografije } from '../lib/prevzem'
import { BARVE, pozabiPreverjene, pripraviPasico, type Barva } from '../lib/preverjeni'
import {
  NAJVEC_POSNETKOV,
  mocProfila,
  naloziPut,
  naloziVStream,
  ogledi as naloziOglede,
  pocakajObdelavo,
  pripraviVideo,
  type PripravljenVideo,
  posnetki as klic,
  trajanjeBesedilo,
  vrhOdstotek,
  type Izlozba,
  type Ogled,
  type Posnetek,
} from '../lib/izlozba'
import type { Pozicija } from '../lib/tipi'
import FotoIgralca from './FotoIgralca'
import ZnakPreverjen from './ZnakPreverjen'
import Grb from './Grb'
import { Link } from './Povezava'
import { zLigo } from '../lib/tekmovanje'

interface Plus {
  opis: string | null
  pasica: string | null
  barva: string | null
}

interface Stevilke {
  season: string
  points: number | null
  matches: number | null
  goals: number | null
  assists: number | null
}

export interface IgralecIzlozbe {
  id: number
  full_name?: string | null
  team_id?: number | null
  team_name?: string | null
  team_short?: string | null
  team_logo?: string | null
  position?: Pozicija | null
}

export default function IzlozbaIgralca({
  izlozba,
  igralec,
  liga,
  slugLige,
  gost,
  desno,
  naSpremembo,
}: {
  izlozba: Izlozba
  igralec: IgralecIzlozbe
  liga: string | null
  slugLige: string | undefined
  /** Gost ne vidi številk (kot preostanek strani). */
  gost: boolean
  /** Cena igralca (desno ob imenu). */
  desno?: ReactNode
  /** Izložbo naloži znova (po nalaganju, izbrisu, odločitvi). */
  naSpremembo: () => Promise<void>
}) {
  const { session } = useAuth()
  const lastnik = izlozba.lastnik
  const glavni = izlozba.glavni
  const posnetki = useMemo(() => izlozba.posnetki ?? [], [izlozba.posnetki])
  const [plus, setPlus] = useState<Plus | null>(null)
  const [profil, setProfil] = useState<{ opis: string | null; fotografija: string | null } | null>(null)
  const [stevilke, setStevilke] = useState<Stevilke | null>(null)
  const [oglediPosnetkov, setOglediPosnetkov] = useState<Map<number, Ogled>>(new Map())
  const [aktiven, setAktiven] = useState<number | null>(null)
  const [predvaja, setPredvaja] = useState(false)
  const [nalaganje, setNalaganje] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const naloziDodatke = useCallback(async () => {
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from('profil_igralca_plus').select('opis, pasica, barva').eq('player_id', glavni).maybeSingle(),
      supabase.from('profil_igralca').select('opis, fotografija').eq('player_id', glavni).maybeSingle(),
    ])
    setPlus((p as Plus | null) ?? null)
    setProfil(pr ?? null)
  }, [glavni])

  useEffect(() => {
    void naloziDodatke()
  }, [naloziDodatke])

  useEffect(() => {
    if (gost) return
    let velja = true
    void supabase
      .from('player_season_stats')
      .select('season, points, matches, goals, assists')
      .eq('player_id', igralec.id)
      .order('season', { ascending: false })
      .limit(1)
      .then(({ data }) => velja && setStevilke((data?.[0] as Stevilke | undefined) ?? null))
    return () => {
      velja = false
    }
  }, [igralec.id, gost])

  // Žetoni za obdelane posnetke (lastnik tudi za tiste v pregledu).
  const kljucOgledov = posnetki.filter((p) => p.stanje === 'pripravljen').map((p) => p.id).join(',')
  useEffect(() => {
    let velja = true
    const ids = kljucOgledov ? kljucOgledov.split(',').map(Number) : []
    void naloziOglede(ids).then((m) => velja && setOglediPosnetkov(m))
    return () => {
      velja = false
    }
  }, [kljucOgledov])

  // Aktiven posnetek: izbran, sicer prvi (izpostavljen je prvi po vrstnem redu).
  const izbran = posnetki.find((p) => p.id === aktiven) ?? posnetki[0] ?? null
  useEffect(() => setPredvaja(false), [izbran?.id])

  const barva = (plus?.barva && BARVE[plus.barva as Barva]) || '#34d399'
  const slog = { '--poudarek': barva } as CSSProperties
  const opis = plus?.opis ?? profil?.opis ?? null
  const kazalnik = izlozba.scout ? vrhOdstotek(izlozba.scout.percentil) : null
  const moc = mocProfila({
    foto: !!profil?.fotografija,
    pasica: !!plus?.pasica,
    opis: !!opis,
    posnetkov: posnetki.filter((p) => p.stanje !== 'napaka').length,
    prestop: !!izlozba.privolitev,
  })

  async function dejanje(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setDela(true)
    setNapaka(null)
    const { error } = await fn()
    setDela(false)
    if (error) {
      setNapaka(prevediNapako(error.message))
      return false
    }
    await naSpremembo()
    return true
  }

  async function razvrsti(id: number, smer: -1 | 1) {
    const ids = posnetki.map((p) => p.id)
    const i = ids.indexOf(id)
    const j = i + smer
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await dejanje(() => supabase.rpc('posnetki_razvrsti', { p_ids: ids }))
  }

  async function izbrisi(p: Posnetek) {
    if (!window.confirm(t('igralci.izlozba.izbrisiPotrdi', { naslov: p.naslov }))) return
    setDela(true)
    setNapaka(null)
    const r = await klic({ akcija: 'izbrisi', id: p.id })
    setDela(false)
    if (r.napaka) return setNapaka(r.napaka)
    setAktiven(null)
    await naSpremembo()
  }

  return (
    <section aria-label={t('igralci.izlozba.oznaka')} className="izlozba -mx-4 sm:mx-0" style={slog}>
      <Pasica
        pasica={plus?.pasica ?? null}
        lastnik={lastnik}
        glavni={glavni}
        naNalozeno={async () => {
          pozabiPreverjene()
          await naloziDodatke()
        }}
        naNapako={setNapaka}
      />

      {/* glava: fotografija čez pasico, ime, kljukica */}
      <div className="relative z-10 -mt-12 flex items-end gap-3 px-4 sm:-mt-16 sm:gap-5 sm:px-6">
        <div className="izlozba-foto shrink-0 overflow-hidden rounded-full">
          <span className="sm:hidden">
            <FotoIgralca
              id={igralec.id}
              velikost={88}
              nadomestek={<Nadomestek igralec={igralec} velikost={88} />}
            />
          </span>
          <span className="hidden sm:block">
            <FotoIgralca
              id={igralec.id}
              velikost={128}
              nadomestek={<Nadomestek igralec={igralec} velikost={128} />}
            />
          </span>
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="break-words text-[1.75rem] font-black leading-tight tracking-tight text-white sm:text-4xl">
            {igralec.full_name}
            <ZnakPreverjen id={igralec.id} velikost={24} className="ml-2" />
          </h1>
        </div>
        {desno && <div className="hidden pb-1 sm:block">{desno}</div>}
      </div>

      <div className="space-y-5 px-4 pt-3 sm:px-6">
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
            {igralec.position && (
              <span className={`znacka poz-${igralec.position}`}>{IME_POZICIJE[igralec.position]}</span>
            )}
            {igralec.team_id ? (
              <Link to={zLigo(`/club/${igralec.team_id}`, slugLige)} className="font-semibold text-slate-100 hover:underline">
                {igralec.team_name}
              </Link>
            ) : (
              <span className="font-semibold text-slate-100">{igralec.team_name}</span>
            )}
            {liga && <span className="text-slate-400">{liga}</span>}
            {izlozba.privolitev?.letnik && (
              <span className="text-slate-400">{t('igralci.izlozba.letnik', { letnik: izlozba.privolitev.letnik })}</span>
            )}
          </p>
          {izlozba.privolitev && (
            <ul className="flex flex-wrap gap-2 text-xs font-semibold">
              <li className="izlozba-zlato rounded-full px-3 py-1">{t('igralci.izlozba.odprt')}</li>
              {izlozba.privolitev.regije.length > 0 && (
                <li className="rounded-full border border-white/15 px-3 py-1 text-slate-300">
                  {t('igralci.izlozba.regije', { regije: izlozba.privolitev.regije.join(', ') })}
                </li>
              )}
            </ul>
          )}
          {desno && <div className="izlozba-cena-mobilno sm:hidden">{desno}</div>}
        </div>

        {lastnik && (
          <PlosceLastnika
            moc={moc}
            ogledi={izlozba.mreza ? (izlozba.ogledi ?? { ogledov: 0, klubov: 0 }) : null}
          />
        )}

        {/* posnetki: velik okvir (izbran, sicer izpostavljen) in seznam; na
            širokem zaslonu seznam desno od okvirja */}
        <div className={posnetki.length > 1 || (lastnik && posnetki.length > 0) ? 'space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-5 lg:space-y-0' : ''}>
        {izbran ? (
          <div className="space-y-2">
            <Okvir
              posnetek={izbran}
              ogled={oglediPosnetkov.get(izbran.id)}
              predvaja={predvaja}
              naPredvajaj={() => setPredvaja(true)}
              lastnik={lastnik}
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-bold text-white">{izbran.naslov}</p>
                {lastnik && <StanjeBesedilo p={izbran} />}
              </div>
              {lastnik ? (
                <OrodjaPosnetka
                  p={izbran}
                  prvi={posnetki[0]?.id === izbran.id}
                  zadnji={posnetki[posnetki.length - 1]?.id === izbran.id}
                  dela={dela}
                  naIzpostavi={() => dejanje(() => supabase.rpc('posnetki_izpostavi', { p_id: izbran.id }))}
                  naPremik={(s) => razvrsti(izbran.id, s)}
                  naPreimenuj={(naslov) => dejanje(() => supabase.rpc('posnetki_uredi', { p_id: izbran.id, p_naslov: naslov }))}
                  naIzbrisi={() => izbrisi(izbran)}
                />
              ) : (
                session && <Prijava posnetekId={izbran.id} />
              )}
            </div>
          </div>
        ) : (
          lastnik && (
            <button
              type="button"
              onClick={() => setNalaganje(true)}
              className="izlozba-prazno flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center"
            >
              <span className="izlozba-gumb-predvajaj" aria-hidden="true">+</span>
              <span className="text-base font-bold text-white">{t('igralci.izlozba.dodaj')}</span>
              <span className="max-w-sm text-sm text-slate-300">{t('igralci.izlozba.prazno')}</span>
            </button>
          )
        )}

        {(posnetki.length > 1 || (lastnik && posnetki.length > 0)) && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-slate-200">{t('igralci.izlozba.posnetki')}</h2>
              {lastnik && (
                <span className="text-xs text-slate-400">
                  {t('igralci.izlozba.mesta', { n: posnetki.length, najvec: NAJVEC_POSNETKOV })}
                </span>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-2 lg:gap-2">
              {posnetki.map((p) => (
                <li key={p.id}>
                  <Plosca
                    p={p}
                    ogled={oglediPosnetkov.get(p.id)}
                    izbran={p.id === izbran?.id}
                    lastnik={lastnik}
                    naIzberi={() => {
                      setAktiven(p.id)
                      setPredvaja(p.stanje === 'pripravljen')
                    }}
                  />
                </li>
              ))}
              {lastnik && posnetki.length < NAJVEC_POSNETKOV && (
                <li>
                  <button
                    type="button"
                    onClick={() => setNalaganje(true)}
                    className="izlozba-prazno flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-xl text-center"
                  >
                    <span className="text-2xl leading-none text-white" aria-hidden="true">+</span>
                    <span className="text-xs font-semibold text-slate-200">{t('igralci.izlozba.dodaj')}</span>
                    <span className="hidden text-[11px] text-slate-400 sm:block lg:hidden">{t('igralci.izlozba.dodajOpis')}</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
        </div>

        {napaka && <p className="text-sm text-rose-400">{napaka}</p>}

        {/* številke tekoče sezone */}
        {!gost && stevilke && (
          <div>
            <dl className="izlozba-stevilke grid grid-cols-4 overflow-hidden rounded-2xl">
              <Stevilka oznaka={t('igralci.izlozba.stevilke.tekme')} vrednost={stevilo(stevilke.matches ?? 0)} />
              <Stevilka oznaka={t('igralci.izlozba.stevilke.goli')} vrednost={stevilo(stevilke.goals ?? 0)} />
              <Stevilka oznaka={t('igralci.izlozba.stevilke.asistence')} vrednost={stevilo(stevilke.assists ?? 0)} />
              <Stevilka oznaka={t('igralci.izlozba.stevilke.tocke')} vrednost={formatirajTocke(stevilke.points ?? 0)} />
            </dl>
            <p className="mt-1.5 text-xs text-slate-500">{t('igralci.izlozba.sezona', { sezona: stevilke.season })}</p>
          </div>
        )}

        {kazalnik && izlozba.scout && (
          <p className="izlozba-kazalnik text-sm text-slate-200">
            {t('igralci.izlozba.kazalnik', {
              p: kazalnik,
              skupina: t(`igralci.izlozba.skupine.${izlozba.scout.skupina}`),
            })}
          </p>
        )}

        <OMeni opis={opis} lastnik={lastnik} glavni={glavni} naShranjeno={naloziDodatke} />

        {izlozba.mreza && (
          <p className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-400">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0 text-[color:var(--poudarek)]">
              <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="2.5" fill="currentColor" />
            </svg>
            {t('igralci.izlozba.mreza')}
          </p>
        )}
      </div>

      {nalaganje && (
        <OknoNalaganja
          igralecId={igralec.id}
          naZapri={() => setNalaganje(false)}
          naKoncano={async (id) => {
            setNalaganje(false)
            setAktiven(id)
            await naSpremembo()
          }}
          naSpremembo={naSpremembo}
        />
      )}
    </section>
  )
}

function Nadomestek({ igralec, velikost }: { igralec: IgralecIzlozbe; velikost: number }) {
  return (
    <span className="flex items-center justify-center bg-slate-900" style={{ width: velikost, height: velikost }}>
      <Grb ime={igralec.team_name} kratko={igralec.team_short} logo={igralec.team_logo} velikost={Math.round(velikost * 0.6)} />
    </span>
  )
}

function Pasica({
  pasica,
  lastnik,
  glavni,
  naNalozeno,
  naNapako,
}: {
  pasica: string | null
  lastnik: boolean
  glavni: number
  naNalozeno: () => Promise<void>
  naNapako: (s: string | null) => void
}) {
  const [dela, setDela] = useState(false)
  const src = naslovFotografije(pasica)

  async function nalozi(datoteka: File) {
    naNapako(null)
    let slika: Awaited<ReturnType<typeof pripraviPasico>>
    try {
      slika = await pripraviPasico(datoteka)
    } catch (e) {
      return naNapako((e as Error).message === 'vrsta' ? t('igralci.prevzem.fotoVrsta') : t('igralci.preverjen.pasicaNapaka'))
    }
    setDela(true)
    const pot = `${glavni}/banner-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${slika.koncnica}`
    const { error: e1 } = await supabase.storage
      .from(VEDRO_FOTOGRAFIJ)
      .upload(pot, slika.slika, { contentType: slika.vrsta, cacheControl: '31536000', upsert: false })
    if (e1) {
      setDela(false)
      return naNapako(t('igralci.preverjen.pasicaNapaka'))
    }
    const { data: obstaja } = await supabase.from('profil_igralca_plus').select('player_id').eq('player_id', glavni).maybeSingle()
    const { error } = obstaja
      ? await supabase.from('profil_igralca_plus').update({ pasica: pot }).eq('player_id', glavni)
      : await supabase.from('profil_igralca_plus').insert({ player_id: glavni, pasica: pot })
    if (error) {
      await supabase.storage.from(VEDRO_FOTOGRAFIJ).remove([pot])
      setDela(false)
      return naNapako(prevediNapako(error.message))
    }
    if (pasica) await supabase.storage.from(VEDRO_FOTOGRAFIJ).remove([pasica])
    await naNalozeno()
    setDela(false)
  }

  return (
    <div className="izlozba-pasica relative aspect-[3/1] overflow-hidden sm:aspect-auto sm:h-56 sm:rounded-t-3xl lg:h-64">
      {src ? (
        <img src={src} alt="" width={1200} height={400} className="h-full w-full object-cover" />
      ) : (
        <div className="izlozba-pasica-privzeta h-full w-full" aria-hidden="true" />
      )}
      <div className="izlozba-pasica-senca pointer-events-none absolute inset-0" aria-hidden="true" />
      {lastnik && (
        <label className="izlozba-gumb-pasica absolute right-3 top-3 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-white">
          {dela ? t('igralci.izlozba.pasicaNalagam') : t('igralci.izlozba.urediPasico')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={dela}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void nalozi(f)
            }}
          />
        </label>
      )}
    </div>
  )
}

function Okvir({
  posnetek,
  ogled,
  predvaja,
  naPredvajaj,
  lastnik,
}: {
  posnetek: Posnetek
  ogled: Ogled | undefined
  predvaja: boolean
  naPredvajaj: () => void
  lastnik: boolean
}) {
  const trajanje = trajanjeBesedilo(posnetek.trajanje)
  if (predvaja && ogled?.predvajaj && ogled.tip === 'video') {
    // R2: podpisan naslov naravnost na R2; brskalnik sam bere po delih (Range).
    return (
      <div className="izlozba-okvir relative aspect-video overflow-hidden rounded-2xl">
        <video
          src={ogled.predvajaj}
          poster={ogled.slika ?? undefined}
          controls
          autoPlay
          playsInline
          preload="metadata"
          aria-label={posnetek.naslov}
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      </div>
    )
  }
  if (predvaja && ogled?.predvajaj) {
    return (
      <div className="izlozba-okvir relative aspect-video overflow-hidden rounded-2xl">
        <iframe
          src={`${ogled.predvajaj}&autoplay=true`}
          title={posnetek.naslov}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  const pripravljen = posnetek.stanje === 'pripravljen' && !!ogled
  return (
    <button
      type="button"
      onClick={naPredvajaj}
      disabled={!ogled?.predvajaj}
      aria-label={t('igralci.izlozba.predvajaj', { naslov: posnetek.naslov })}
      className="izlozba-okvir group relative block aspect-video w-full overflow-hidden rounded-2xl text-left"
    >
      {ogled?.slika ? (
        <img src={ogled.slika} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="izlozba-poster absolute inset-0" aria-hidden="true" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" aria-hidden="true" />
      {pripravljen ? (
        <span className="izlozba-gumb-predvajaj absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
        </span>
      ) : (
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-sm font-semibold text-slate-200">
          {posnetek.stanje === 'napaka' ? t('igralci.izlozba.napakaVidea') : t('igralci.izlozba.obdelava')}
        </span>
      )}
      {lastnik && posnetek.pregled !== 'odobren' && <ZnackaPregleda p={posnetek} className="absolute left-3 top-3" />}
      {trajanje && (
        <span className="absolute bottom-3 right-3 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
          {trajanje}
        </span>
      )}
    </button>
  )
}

function Plosca({
  p,
  ogled,
  izbran,
  lastnik,
  naIzberi,
}: {
  p: Posnetek
  ogled: Ogled | undefined
  izbran: boolean
  lastnik: boolean
  naIzberi: () => void
}) {
  const trajanje = trajanjeBesedilo(p.trajanje)
  return (
    <button
      type="button"
      onClick={naIzberi}
      aria-pressed={izbran}
      className={`izlozba-plosca group block w-full overflow-hidden rounded-xl text-left ${izbran ? 'izlozba-plosca-izbrana' : ''}`}
    >
      <span className="relative block aspect-video">
        {ogled?.slika ? (
          <img src={ogled.slika} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="izlozba-poster absolute inset-0" aria-hidden="true" />
        )}
        {lastnik && p.pregled !== 'odobren' && <ZnackaPregleda p={p} className="absolute left-1.5 top-1.5" />}
        {p.izpostavljen && (
          <span className="absolute right-1.5 top-1.5 text-[color:var(--poudarek)]" title={t('igralci.izlozba.jeIzpostavljen')}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-label={t('igralci.izlozba.jeIzpostavljen')}>
              <path d="M8 1.5l1.9 4.1 4.4.4-3.3 3 1 4.4L8 11.2 4 13.4l1-4.4-3.3-3 4.4-.4z" fill="currentColor" />
            </svg>
          </span>
        )}
        {trajanje && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-slate-950/70 px-1 text-[11px] font-semibold tabular-nums text-white">
            {trajanje}
          </span>
        )}
      </span>
      <span className="block truncate px-2 py-1.5 text-xs font-semibold text-slate-200">{p.naslov}</span>
    </button>
  )
}

function ZnackaPregleda({ p, className = '' }: { p: Posnetek; className?: string }) {
  const zavrnjen = p.pregled === 'zavrnjen'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        zavrnjen ? 'bg-rose-500/90 text-white' : 'bg-amber-300/90 text-slate-950'
      } ${className}`}
    >
      {zavrnjen ? t('igralci.izlozba.zavrnjenZnacka') : t('igralci.izlozba.cakaPregled')}
    </span>
  )
}

function StanjeBesedilo({ p }: { p: Posnetek }) {
  if (p.pregled === 'zavrnjen')
    return <p className="text-xs text-rose-300">{t('igralci.izlozba.zavrnjen', { razlog: p.razlog ?? '' })}</p>
  if (p.pregled === 'caka') return <p className="text-xs text-amber-200">{t('igralci.izlozba.cakaPregledOpis')}</p>
  return null
}

function OrodjaPosnetka({
  p,
  prvi,
  zadnji,
  dela,
  naIzpostavi,
  naPremik,
  naPreimenuj,
  naIzbrisi,
}: {
  p: Posnetek
  prvi: boolean
  zadnji: boolean
  dela: boolean
  naIzpostavi: () => void
  naPremik: (smer: -1 | 1) => void
  naPreimenuj: (naslov: string) => Promise<boolean>
  naIzbrisi: () => void
}) {
  const [ime, setIme] = useState<string | null>(null)
  if (ime !== null)
    return (
      <form
        className="flex w-full gap-2 sm:w-auto"
        onSubmit={async (e) => {
          e.preventDefault()
          if (await naPreimenuj(ime)) setIme(null)
        }}
      >
        <input
          value={ime}
          onChange={(e) => setIme(e.target.value)}
          maxLength={60}
          aria-label={t('igralci.izlozba.naslovPosnetka')}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-sm"
          autoFocus
        />
        <button type="submit" disabled={dela || !ime.trim()} className="gumb-glavni px-3 py-1.5 text-sm">
          {t('igralci.izlozba.shrani')}
        </button>
        <button type="button" onClick={() => setIme(null)} className="gumb-tih px-3 py-1.5 text-sm">
          {t('igralci.izlozba.preklici')}
        </button>
      </form>
    )
  const gumb = 'rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-40'
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className={gumb} disabled={dela || p.izpostavljen} onClick={naIzpostavi} aria-pressed={p.izpostavljen}>
        {p.izpostavljen ? t('igralci.izlozba.jeIzpostavljen') : t('igralci.izlozba.izpostavi')}
      </button>
      <button type="button" className={gumb} disabled={dela || prvi} onClick={() => naPremik(-1)} aria-label={t('igralci.izlozba.levo')} title={t('igralci.izlozba.levo')}>
        ←
      </button>
      <button type="button" className={gumb} disabled={dela || zadnji} onClick={() => naPremik(1)} aria-label={t('igralci.izlozba.desno')} title={t('igralci.izlozba.desno')}>
        →
      </button>
      <button type="button" className={gumb} disabled={dela} onClick={() => setIme(p.naslov)}>
        {t('igralci.izlozba.preimenuj')}
      </button>
      <button type="button" className={`${gumb} hover:text-rose-300`} disabled={dela} onClick={naIzbrisi}>
        {t('igralci.izlozba.izbrisi')}
      </button>
    </div>
  )
}

function Prijava({ posnetekId }: { posnetekId: number }) {
  const [odprto, setOdprto] = useState(false)
  const [razlog, setRazlog] = useState('')
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  useEffect(() => {
    setOdprto(false)
    setSporocilo(null)
  }, [posnetekId])
  if (sporocilo) return <p className="text-xs text-slate-400">{sporocilo}</p>
  if (!odprto)
    return (
      <button type="button" onClick={() => setOdprto(true)} className="text-xs text-slate-500 hover:text-rose-300">
        {t('igralci.izlozba.prijavi')}
      </button>
    )
  return (
    <form
      className="w-full space-y-2 sm:max-w-sm"
      onSubmit={async (e) => {
        e.preventDefault()
        setDela(true)
        const { error } = await supabase.rpc('prijavi_posnetek', { p_id: posnetekId, p_razlog: razlog.trim() || undefined })
        setDela(false)
        setSporocilo(error ? prevediNapako(error.message) : t('igralci.izlozba.prijavljeno'))
      }}
    >
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">{t('igralci.izlozba.prijaviRazlog')}</span>
        <textarea
          value={razlog}
          onChange={(e) => setRazlog(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={dela} className="gumb-glavni px-3 py-1 text-xs">
          {t('igralci.izlozba.prijavi')}
        </button>
        <button type="button" onClick={() => setOdprto(false)} className="gumb-tih px-3 py-1 text-xs">
          {t('igralci.izlozba.preklici')}
        </button>
      </div>
    </form>
  )
}

function PlosceLastnika({
  moc,
  ogledi,
}: {
  moc: ReturnType<typeof mocProfila>
  ogledi: { ogledov: number; klubov: number } | null
}) {
  return (
    <div className={`grid gap-2 ${ogledi ? 'sm:grid-cols-[1.4fr_1fr]' : ''}`}>
      <div className="izlozba-plosca-lastnika rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold text-white">{t('igralci.izlozba.moc')}</p>
          <p className="text-sm font-black tabular-nums text-[color:var(--poudarek)]">
            {t('igralci.izlozba.mocOdstotek', { odstotek: moc.odstotek })}
          </p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={moc.odstotek}
          aria-label={t('igralci.izlozba.moc')}
        >
          <div className="izlozba-moc h-full rounded-full" style={{ width: `${moc.odstotek}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-300">
          {moc.naslednji
            ? t('igralci.izlozba.naslednjiKorak', { korak: t(`igralci.izlozba.koraki.${moc.naslednji}`) })
            : t('igralci.izlozba.mocPolna')}
        </p>
      </div>
      {ogledi && (
        <div className="izlozba-plosca-lastnika rounded-2xl p-4">
          <p className="text-sm font-bold text-white">{t('igralci.izlozba.ogledi')}</p>
          <p className="text-[11px] text-slate-400">{t('igralci.izlozba.ogledovOpis')}</p>
          <dl className="mt-2 flex gap-5">
            <div>
              <dt className="sr-only">{t('igralci.izlozba.ogledov')}</dt>
              <dd className="text-2xl font-black tabular-nums text-white">{stevilo(ogledi.ogledov)}</dd>
              <dd className="text-[11px] text-slate-400" aria-hidden="true">{t('igralci.izlozba.ogledov')}</dd>
            </div>
            <div>
              <dt className="sr-only">{t('igralci.izlozba.klubov')}</dt>
              <dd className="text-2xl font-black tabular-nums text-white">{stevilo(ogledi.klubov)}</dd>
              <dd className="text-[11px] text-slate-400" aria-hidden="true">{t('igralci.izlozba.klubov')}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">{t('igralci.izlozba.ogledoviZasebno')}</p>
        </div>
      )}
    </div>
  )
}

function Stevilka({ oznaka, vrednost }: { oznaka: string; vrednost: ReactNode }) {
  return (
    <div className="px-1 py-3 text-center">
      <dd className="text-xl font-black tabular-nums text-white sm:text-2xl">{vrednost}</dd>
      <dt className="text-[11px] text-slate-400">{oznaka}</dt>
    </div>
  )
}

function OMeni({
  opis,
  lastnik,
  glavni,
  naShranjeno,
}: {
  opis: string | null
  lastnik: boolean
  glavni: number
  naShranjeno: () => Promise<void>
}) {
  const [urejam, setUrejam] = useState(false)
  const [besedilo, setBesedilo] = useState(opis ?? '')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  useEffect(() => setBesedilo(opis ?? ''), [opis])
  if (!opis && !lastnik) return null

  async function shrani(e: React.FormEvent) {
    e.preventDefault()
    setDela(true)
    setNapaka(null)
    const vrednost = besedilo.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim() || null
    const { data: obstaja } = await supabase.from('profil_igralca_plus').select('player_id').eq('player_id', glavni).maybeSingle()
    const { error } = obstaja
      ? await supabase.from('profil_igralca_plus').update({ opis: vrednost }).eq('player_id', glavni)
      : await supabase.from('profil_igralca_plus').insert({ player_id: glavni, opis: vrednost })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setUrejam(false)
    await naShranjeno()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-200">{t('igralci.izlozba.oMeni')}</h2>
        {lastnik && !urejam && (
          <button type="button" onClick={() => setUrejam(true)} className="text-xs font-semibold text-[color:var(--poudarek)] hover:underline">
            {t('igralci.izlozba.urediOpis')}
          </button>
        )}
      </div>
      {urejam ? (
        <form onSubmit={shrani} className="space-y-2">
          <textarea
            value={besedilo}
            onChange={(e) => setBesedilo(e.target.value)}
            maxLength={500}
            rows={5}
            aria-label={t('igralci.izlozba.oMeni')}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={dela} className="gumb-glavni px-3 py-1.5 text-sm">
              {t('igralci.izlozba.shrani')}
            </button>
            <button type="button" onClick={() => setUrejam(false)} className="gumb-tih px-3 py-1.5 text-sm">
              {t('igralci.izlozba.preklici')}
            </button>
            <span className="ml-auto text-xs tabular-nums text-slate-500">{besedilo.length}/500</span>
          </div>
          {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        </form>
      ) : opis ? (
        <p className="max-w-prose whitespace-pre-line break-words text-[15px] leading-relaxed text-slate-200">{opis}</p>
      ) : (
        <p className="text-sm text-slate-400">{t('igralci.izlozba.opisPrazen')}</p>
      )}
    </div>
  )
}

function OknoNalaganja({
  igralecId,
  naZapri,
  naKoncano,
  naSpremembo,
}: {
  igralecId: number
  naZapri: () => void
  naKoncano: (id: number) => Promise<void>
  naSpremembo: () => Promise<void>
}) {
  const [naslov, setNaslov] = useState('')
  const [datoteka, setDatoteka] = useState<File | null>(null)
  const [video, setVideo] = useState<PripravljenVideo | null>(null)
  const [preverjam, setPreverjam] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [faza, setFaza] = useState<'izbira' | 'nalaganje' | 'obdelava'>('izbira')
  const [odstotek, setOdstotek] = useState(0)
  const vhod = useRef<HTMLInputElement>(null)
  const zaseden = faza !== 'izbira'

  useEffect(() => {
    const ob = (e: KeyboardEvent) => e.key === 'Escape' && !zaseden && naZapri()
    window.addEventListener('keydown', ob)
    return () => window.removeEventListener('keydown', ob)
  }, [naZapri, zaseden])

  async function izberi(f: File) {
    setNapaka(null)
    setPreverjam(true)
    const p = await pripraviVideo(f)
    setPreverjam(false)
    if ('napaka' in p) {
      setDatoteka(null)
      setVideo(null)
      return setNapaka(t(p.napaka))
    }
    setDatoteka(f)
    setVideo(p)
    if (!naslov.trim()) setNaslov(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60))
  }

  async function poslji(e: React.FormEvent) {
    e.preventDefault()
    if (!datoteka || !video) return setNapaka(t('igralci.izlozba.napakaVrsta'))
    if (!naslov.trim()) return setNapaka(t('igralci.izlozba.napakaNaslov'))
    setNapaka(null)
    setFaza('nalaganje')
    type Put = { url: string; glave: Record<string, string> }
    const r = await klic<{ id: number; ponudnik?: string; uploadURL?: string; video?: Put; slika?: Put }>({
      akcija: 'nalozi',
      player_id: igralecId,
      naslov: naslov.trim(),
      vrsta: video.vrsta,
      velikost: datoteka.size,
      trajanje: Math.round(video.trajanje * 10) / 10,
      vrsta_slike: video.slika.type || 'image/jpeg',
      velikost_slike: video.slika.size,
    })
    if (!r.data) {
      setFaza('izbira')
      return setNapaka(r.napaka ?? t('igralci.izlozba.napaka'))
    }
    const id = r.data.id
    if (r.data.ponudnik === 'r2' && r.data.video && r.data.slika) {
      // R2: video in plakat na podpisana PUT, nato potrditev (HEAD v funkciji).
      const [okVideo, okSlika] = await Promise.all([
        naloziPut(r.data.video.url, datoteka, r.data.video.glave, setOdstotek),
        naloziPut(r.data.slika.url, video.slika, r.data.slika.glave),
      ])
      if (!okVideo || !okSlika) {
        await klic({ akcija: 'izbrisi', id })
        setFaza('izbira')
        return setNapaka(t('igralci.izlozba.napaka'))
      }
      setFaza('obdelava')
      const p = await klic<{ stanje: string }>({ akcija: 'potrdi', id })
      if (p.data?.stanje !== 'pripravljen') {
        setFaza('izbira')
        await naSpremembo()
        return setNapaka(p.napaka ?? t('igralci.izlozba.napakaVidea'))
      }
      return naKoncano(id)
    }
    if (r.data.uploadURL) {
      const ok = await naloziVStream(r.data.uploadURL, datoteka, setOdstotek)
      if (!ok) {
        await klic({ akcija: 'izbrisi', id })
        setFaza('izbira')
        return setNapaka(t('igralci.izlozba.napaka'))
      }
    } else {
      setOdstotek(100)
    }
    setFaza('obdelava')
    await naSpremembo()
    await pocakajObdelavo(id)
    await naKoncano(id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div onClick={() => !zaseden && naZapri()} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t('igralci.izlozba.dodaj')}
        onSubmit={poslji}
        className="relative max-h-[88dvh] w-full space-y-4 overflow-y-auto rounded-t-3xl border-t border-white/15 bg-slate-950 p-5 pb-[calc(1.25rem+var(--dno))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:border sm:pb-5"
      >
        <div>
          <h2 className="text-lg font-black text-white">{t('igralci.izlozba.dodaj')}</h2>
          <p className="text-sm text-slate-400">{t('igralci.izlozba.dodajOpis')}</p>
        </div>
        <button
          type="button"
          disabled={zaseden || preverjam}
          onClick={() => vhod.current?.click()}
          className="izlozba-prazno flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-4 py-6 text-center"
        >
          <span className="text-sm font-bold text-white">{preverjam ? t('igralci.izlozba.preverjam') : datoteka ? datoteka.name : t('igralci.izlozba.izberiVideo')}</span>
          {datoteka && (
            <span className="text-xs tabular-nums text-slate-400">{stevilo(datoteka.size / 1024 / 1024, { maximumFractionDigits: 1 })} MB</span>
          )}
        </button>
        <input
          ref={vhod}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void izberi(f)
          }}
        />
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-slate-200">{t('igralci.izlozba.naslovPosnetka')}</span>
          <input
            value={naslov}
            onChange={(e) => setNaslov(e.target.value)}
            maxLength={60}
            disabled={zaseden}
            placeholder={t('igralci.izlozba.naslovPrimer')}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2"
          />
        </label>
        {zaseden && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`izlozba-moc h-full rounded-full ${faza === 'obdelava' ? 'animate-pulse' : ''}`}
                style={{ width: `${faza === 'obdelava' ? 100 : odstotek}%` }}
              />
            </div>
            <p className="text-xs text-slate-300">
              {faza === 'obdelava' ? t('igralci.izlozba.obdelava') : t('igralci.izlozba.nalagam', { odstotek })}
            </p>
          </div>
        )}
        {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        <p className="text-xs text-slate-500">{t('igralci.izlozba.cakaPregledOpis')}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={naZapri} disabled={zaseden} className="gumb-tih text-sm">
            {t('igralci.izlozba.preklici')}
          </button>
          <button type="submit" disabled={zaseden || !datoteka || !naslov.trim()} className="gumb-glavni text-sm">
            {t('igralci.izlozba.nalozi')}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Ponudba lastniku potrjenega, polnoletnega profila, ki še ni preverjen:
 * kaj prinese izložba (posnetki, SLFF Club). Nakup je spodaj (Ponudba v
 * PreverjeniProfil); v aplikaciji je skrita kot nakup.
 */
export function PonudbaIzlozbe() {
  return (
    <div className="izlozba-ponudba relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="izlozba-ponudba-okvir mb-4 flex aspect-[16/7] items-center justify-center rounded-xl" aria-hidden="true">
        <span className="izlozba-gumb-predvajaj">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
        </span>
      </div>
      <h3 className="text-lg font-black text-white">{t('igralci.izlozba.ponudba.naslov')}</h3>
      <p className="mt-1 text-sm text-slate-300">{t('igralci.izlozba.ponudba.opis')}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
        {(['tocka1', 'tocka2', 'tocka3'] as const).map((k) => (
          <li key={k} className="flex gap-2">
            <span className="text-gnl-300" aria-hidden="true">✓</span>
            {t(`igralci.izlozba.ponudba.${k}`)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">{t('igralci.izlozba.ponudba.opomba')}</p>
    </div>
  )
}
