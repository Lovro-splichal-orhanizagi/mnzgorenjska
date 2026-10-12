import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import ImeLastnika from '../components/ImeLastnika'
import { supabase } from '../lib/supabase'
import { formatirajTocke, prikazniIme, tockZ } from '../lib/pomozno'
import { useNaslov, useNoindex } from '../lib/naslov'
import EnajstericaNaIgriscu from '../components/EnajstericaNaIgriscu'
import FotoIgralca from '../components/FotoIgralca'
import ZnakPreverjen from '../components/ZnakPreverjen'
import ZgodbaKroga from '../components/ZgodbaKroga'
import { useKanonicnaLiga, useTekmovanje, zLigo } from '../lib/tekmovanje'
import {
  razdeli,
  skupajTock,
  zaIgrisce,
  oznaka,
  prispevek,
  namestnikJeVskocil,
  type VrsticaTuje,
} from '../lib/tujaEkipa'
import { t } from '../i18n'
import { izvor } from '../lib/platforma'
import { useAuth } from '../lib/useAuth'
import { jeMojaEkipa } from '../components/ImeEkipe'

interface Krog {
  id: number
  number: number
  season: string | null
}

/**
 * Ekipa po krogih — postave zaklenjenih krogov s točkami.
 *
 * Sestava ekipe je zasebna (odločitev lastnika, 10/2026; migracija
 * 20261012137100): postavo, kapetana in klop vidi le lastnik (in admin).
 * Drugim stran pokaže ime, lastnika, točke in mesto ter pove, da ekipe drugih
 * niso javne. Pravilo varuje baza (`tuja_postava`, RLS na posnetkih); stran
 * tujcu postave niti ne zahteva.
 */
export default function Ekipa() {
  const { id } = useParams<{ id: string }>()
  const [iskanje, nastaviIskanje] = useSearchParams()
  const [ekipa, setEkipa] = useState<{
    team_name: string | null
    owner_name: string | null
    owner_id: string | null
    total_points: number | null
    competition_id: number | null
  } | null>(null)
  const [krogi, setKrogi] = useState<Krog[]>([])
  const [izbranKrog, setIzbranKrog] = useState<number | null>(null)
  const [vrstice, setVrstice] = useState<VrsticaTuje[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [nalaganjePostave, setNalaganjePostave] = useState(false)
  const [okvara, setOkvara] = useState<string | null>(null)
  const [kazen, setKazen] = useState(0)
  const [neto, setNeto] = useState<number | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [mesto, setMesto] = useState<number | null>(null)
  const [jeAdmin, setJeAdmin] = useState(false)
  const { session, loading: nalaganjeSeje } = useAuth()
  const uporabnikId = session?.user.id ?? null
  // Vrstica krogov drsi vodoravno; izbrani krog naj bo viden.
  const vrsticaKrogov = useRef<HTMLDivElement>(null)
  // Liga ekipe, ne tista, ki je izbrana v meniju — povezava lahko pripelje
  // do ekipe iz druge lige.
  const { vsaTekmovanja } = useTekmovanje()
  const tekmovanjeEkipe = vsaTekmovanja.find((l) => l.id === ekipa?.competition_id)
  const liga = tekmovanjeEkipe?.name ?? ''
  useNaslov(ekipa?.team_name ?? t('lestvice.ekipa.naslov'), liga)
  useNoindex(!nalaganje && Boolean(napaka) && !ekipa)
  useKanonicnaLiga(tekmovanjeEkipe?.slug)

  // --- ekipa in njeni zaklenjeni krogi -------------------------------------
  useEffect(() => {
    if (!id) return
    let veljavno = true
    ;(async () => {
      setNalaganje(true)
      const { data: e, error } = await supabase
        .from('fantasy_team_standings')
        .select('team_name, owner_name, owner_id, total_points, competition_id')
        .eq('fantasy_team_id', Number(id))
        .maybeSingle()
      if (!veljavno) return
      if (error || !e) {
        setNapaka(t('lestvice.ekipa.niEkipe'))
        setNalaganje(false)
        return
      }
      setEkipa(e)

      // Mesto na lestvici lige: koliko ekip ima več točk.
      if (e.competition_id != null && e.total_points != null) {
        const { count } = await supabase
          .from('fantasy_team_standings')
          .select('fantasy_team_id', { count: 'exact', head: true })
          .eq('competition_id', e.competition_id)
          .gt('total_points', e.total_points)
        if (!veljavno) return
        setMesto(count != null ? count + 1 : null)
      }

      // Samo krogi, v katerih ima TA ekipa posnetek. Migracija 20260913100000
      // je zaklenila vse ze zapadle kroge, tudi cele lanske sezone, za katere
      // posnetkov ni — gumbi so vodili v prazno, stevilke krogov pa so se
      // med sezonama podvajale ("2. krog" dvakrat) in privzeto se je odprl
      // lanski zadnji krog namesto letosnjega.
      // `fantasy_round_points` ima vrstico natanko za kroge s posnetkom —
      // ena vrstica na krog namesto petnajstih iz `fantasy_lineups`.
      const { data: posnetki } = await supabase
        .from('fantasy_round_points')
        .select('round_id')
        .eq('fantasy_team_id', Number(id))
      const ids = [...new Set((posnetki ?? []).map((p) => p.round_id))].filter(
        (x): x is number => x != null,
      )
      const { data: k } = ids.length
        ? await supabase
            .from('rounds')
            .select('id, number, season')
            .in('id', ids)
            .order('season', { ascending: false })
            .order('number', { ascending: false })
        : { data: [] }
      if (!veljavno) return
      const zaprti = (k ?? []) as Krog[]
      setKrogi(zaprti)
      const iz = Number(iskanje.get('krog'))
      const zacetni = zaprti.find((r) => r.id === iz)?.id ?? zaprti[0]?.id ?? null
      setIzbranKrog(zacetni)
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
    // Parameter kroga beremo le ob prvem prihodu; naprej ga vodi izbirnik.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // --- kdo sme videti sestavo ----------------------------------------------
  // Lastnik vedno; admin tudi (baza mu postavo vrne). Dokler ni znano, ali je
  // gledalec admin, stran še nalaga, da se adminu ne pokaže zasebno sporočilo.
  const jeLastnik = jeMojaEkipa(ekipa?.owner_id, uporabnikId)
  const [adminZnan, setAdminZnan] = useState(false)
  useEffect(() => {
    if (!ekipa || !uporabnikId || jeLastnik) {
      setJeAdmin(false)
      setAdminZnan(true)
      return
    }
    let veljavno = true
    setAdminZnan(false)
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', uporabnikId)
      .maybeSingle()
      .then(({ data }) => {
        if (!veljavno) return
        setJeAdmin(Boolean(data?.is_admin))
        setAdminZnan(true)
      })
    return () => {
      veljavno = false
    }
  }, [ekipa, uporabnikId, jeLastnik])
  const smeVideti = jeLastnik || jeAdmin
  const odloceno = !nalaganjeSeje && adminZnan

  // --- postava izbranega kroga ---------------------------------------------
  useEffect(() => {
    if (!id || !izbranKrog || !smeVideti) return
    let veljavno = true
    ;(async () => {
      setNalaganjePostave(true)
      const [{ data, error }, { data: krogTocke }] = await Promise.all([
        supabase.rpc('tuja_postava', {
          p_team: Number(id),
          p_round: izbranKrog,
        }),
        // Naslov mora pokazati isto stevilko kot lestvica, ta pa od vsote
        // igralcev odsteje se kazen za prestope.
        supabase
          .from('fantasy_round_points')
          .select('points, penalty')
          .eq('fantasy_team_id', Number(id))
          .eq('round_id', izbranKrog)
          .maybeSingle(),
      ])
      if (!veljavno) return
      // Migracija in koda potujeta vsaka po svoji poti. Ce funkcije se ni,
      // naj stran pove, da je slo kaj narobe — prazna postava in okvara
      // nista isto.
      setOkvara(error ? t('lestvice.ekipa.okvara') : null)
      setVrstice(error ? [] : ((data ?? []) as VrsticaTuje[]))
      setKazen(Number(krogTocke?.penalty ?? 0))
      setNeto(krogTocke ? Number(krogTocke.points) : null)
      setNalaganjePostave(false)
    })()
    return () => {
      veljavno = false
    }
  }, [id, izbranKrog, smeVideti])

  const { postava, klop } = useMemo(() => razdeli(vrstice), [vrstice])
  const skupaj = useMemo(() => skupajTock(vrstice), [vrstice])
  const vskocil = useMemo(() => namestnikJeVskocil(vrstice), [vrstice])

  // Sezono pokazemo le, kadar jih je vec — sicer je pri vsakem gumbu odvec.
  const vecSezon = useMemo(
    () => new Set(krogi.map((k) => k.season)).size > 1,
    [krogi],
  )

  function izberi(krog: number) {
    setIzbranKrog(krog)
    // Ohrani ostale parametre — brez `?t=` bi se liga v meniju tiho zamenjala.
    nastaviIskanje(
      (prej) => {
        const novo = new URLSearchParams(prej)
        novo.set('krog', String(krog))
        return novo
      },
      { replace: true },
    )
  }

  useEffect(() => {
    const vrsta = vrsticaKrogov.current
    const gumb = vrsta?.querySelector<HTMLElement>('[aria-pressed="true"]')
    // Le vodoravno: scrollIntoView bi premaknil še stran.
    if (vrsta && gumb) vrsta.scrollLeft = gumb.offsetLeft - (vrsta.clientWidth - gumb.offsetWidth) / 2
  }, [izbranKrog, krogi, nalaganje])

  if (nalaganje || (ekipa && !odloceno)) return <p className="text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka)
    return (
      <div>
        <p className="text-slate-300">{napaka}</p>
        <Link to="/standings" className="text-gnl-400 underline">
          {t('lestvice.ekipa.nazaj')}
        </Link>
      </div>
    )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {ekipa?.team_name ?? t('lestvice.ekipa.naslov')}
        </h1>
        <p className="text-sm text-slate-400">
          {ekipa?.owner_name ? (
            <>
              <ImeLastnika ime={prikazniIme(ekipa.owner_name)} id={ekipa.owner_id} /> ·{' '}
            </>
          ) : null}
          {t('lestvice.ekipa.skupaj', {
            tocke: formatirajTocke(ekipa?.total_points),
            beseda: tockZ(ekipa?.total_points),
          })}
          {mesto != null && <> · {t('lestvice.mesto', { mesto })}</>}
        </p>
      </header>

      {!smeVideti ? (
        <div className="kartica space-y-2 p-4">
          <p className="font-semibold">{t('lestvice.ekipa.zasebna')}</p>
          <p className="text-sm text-slate-400">{t('lestvice.ekipa.zasebnaOpis')}</p>
          <Link
            to={zLigo('/standings', tekmovanjeEkipe?.slug)}
            className="inline-block text-sm text-gnl-400 underline"
          >
            {t('lestvice.ekipa.nazaj')}
          </Link>
        </div>
      ) : krogi.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t('lestvice.ekipa.brezKrogov')}
        </p>
      ) : (
        <>
          <div ref={vrsticaKrogov} className="relative flex gap-1.5 overflow-x-auto pb-1">
            {krogi.map((k) => (
              <button
                key={k.id}
                onClick={() => izberi(k.id)}
                aria-pressed={k.id === izbranKrog}
                className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${
                  k.id === izbranKrog
                    ? 'bg-gnl-500 text-slate-950'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('lestvice.krog', { n: k.number })}
                {vecSezon && k.season && (
                  <span className="ml-1 font-normal opacity-70">{k.season}</span>
                )}
              </button>
            ))}
          </div>

          {nalaganjePostave ? (
            <p className="text-slate-400">{t('lestvice.ekipa.nalaganjePostave')}</p>
          ) : okvara ? (
            <p className="text-sm text-rose-300">{okvara}</p>
          ) : vrstice.length === 0 ? (
            <p className="text-sm text-slate-400">
              {t('lestvice.ekipa.brezPostave')}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-gnl-300">
                  {formatirajTocke(neto ?? skupaj)}
                </span>
                <span className="text-sm text-slate-400">
                  {t('lestvice.ekipa.vTemKrogu', { beseda: tockZ(neto ?? skupaj) })}
                </span>
                {kazen > 0 && (
                  <span className="text-sm text-rose-400">
                    {t('lestvice.ekipa.kazen', { kazen })}
                  </span>
                )}
              </div>

              <EnajstericaNaIgriscu igralci={postava.map(zaIgrisce)} />

              {vskocil && (
                <p className="text-sm text-slate-400">
                  {t('lestvice.ekipa.namestnik')}
                </p>
              )}

              {klop.length > 0 && (
                <section>
                  <h2 className="mb-2 text-base font-bold">{t('lestvice.ekipa.klop')}</h2>
                  <ul className="kartica divide-y divide-white/10 overflow-hidden">
                    {klop.map((v) => (
                      <li
                        key={v.player_id}
                        className="flex min-h-11 items-center gap-2 px-3 py-2 text-sm"
                      >
                        <FotoIgralca id={Number(v.player_id)} velikost={24} />
                        <Link
                          to={zLigo(`/player/${v.player_id}`, tekmovanjeEkipe?.slug)}
                          className="min-w-0 flex-1 truncate hover:text-gnl-400"
                        >
                          {prikazniIme(v.ime)}
                          <ZnakPreverjen id={Number(v.player_id)} className="ml-1" />
                          {oznaka(v) && (
                            <span className="ml-1 rounded bg-slate-700 px-1 text-[10px] font-black">
                              {oznaka(v)}
                            </span>
                          )}
                        </Link>
                        <span className="shrink-0 text-xs text-slate-500">
                          {v.klub}
                        </span>
                        <span className="w-8 shrink-0 text-right tabular-nums text-slate-400">
                          {formatirajTocke(prispevek(v))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Pokaže se sama, ko je krog končan — pod igriščem, da ob
                  nalaganju ne potisne postave navzdol. */}
              {id && izbranKrog && (
                <ZgodbaKroga
                  ekipaId={Number(id)}
                  krogId={izbranKrog}
                  ekipa={ekipa?.team_name ?? t('lestvice.ekipa.naslov')}
                  liga={liga}
                  povezava={
                    typeof window !== 'undefined'
                      ? `${izvor()}/team/${id}?krog=${izbranKrog}`
                      : ''
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
