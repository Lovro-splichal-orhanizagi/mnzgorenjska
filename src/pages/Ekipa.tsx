import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke, prikazniIme, tockZ } from '../lib/pomozno'
import { useNaslov } from '../lib/naslov'
import EnajstericaNaIgriscu from '../components/EnajstericaNaIgriscu'
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

interface Krog {
  id: number
  number: number
  season: string | null
}

/**
 * Ekipa drugega managerja — a le v krogih, ki so se ze zaklenili.
 *
 * V klepetu sta padli dve nasprotujoci si prosnji: en manager je hotel videti
 * tuje ekipe, drug je odgovoril, da igra tako izgubi smisel. Obe drzita, le
 * vsaka na svoji strani roka. Pred rokom bi bil vpogled prepisovanje; po
 * roku je postava zamrznjena in je edino, kar se da z njo poceti, primerjati
 * se z njo. Zato ta stran ne pozna nastavitve zasebnosti — pozna samo rok.
 */
export default function Ekipa() {
  const { id } = useParams<{ id: string }>()
  const [iskanje, nastaviIskanje] = useSearchParams()
  const [ekipa, setEkipa] = useState<{
    team_name: string | null
    owner_name: string | null
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
  useNaslov(ekipa?.team_name ?? t('lestvice.ekipa.naslov'))

  // --- ekipa in njeni zaklenjeni krogi -------------------------------------
  useEffect(() => {
    if (!id) return
    let veljavno = true
    ;(async () => {
      setNalaganje(true)
      const { data: e, error } = await supabase
        .from('fantasy_team_standings')
        .select('team_name, owner_name, total_points, competition_id')
        .eq('fantasy_team_id', Number(id))
        .maybeSingle()
      if (!veljavno) return
      if (error || !e) {
        setNapaka(t('lestvice.ekipa.niEkipe'))
        setNalaganje(false)
        return
      }
      setEkipa(e)

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

  // --- postava izbranega kroga ---------------------------------------------
  useEffect(() => {
    if (!id || !izbranKrog) return
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
  }, [id, izbranKrog])

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

  if (nalaganje) return <p className="p-4 text-slate-400">{t('skupno.nalaganje')}</p>
  if (napaka)
    return (
      <div className="p-4">
        <p className="text-slate-300">{napaka}</p>
        <Link to="/lestvica" className="text-gnl-400 underline">
          {t('lestvice.ekipa.nazaj')}
        </Link>
      </div>
    )

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {ekipa?.team_name ?? t('lestvice.ekipa.naslov')}
        </h1>
        <p className="text-sm text-slate-400">
          {prikazniIme(ekipa?.owner_name)} ·{' '}
          {t('lestvice.ekipa.skupaj', {
            tocke: formatirajTocke(ekipa?.total_points),
            beseda: tockZ(ekipa?.total_points),
          })}
        </p>
      </header>

      {krogi.length === 0 ? (
        <p className="rounded-lg bg-slate-800/60 p-4 text-slate-300">
          {t('lestvice.ekipa.brezKrogov')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {krogi.map((k) => (
              <button
                key={k.id}
                onClick={() => izberi(k.id)}
                className={`rounded-md px-2.5 py-1 text-sm font-bold transition ${
                  k.id === izbranKrog
                    ? 'bg-gnl-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
            <p className="rounded-lg bg-rose-500/10 p-4 text-rose-200">{okvara}</p>
          ) : vrstice.length === 0 ? (
            <p className="rounded-lg bg-slate-800/60 p-4 text-slate-300">
              {t('lestvice.ekipa.brezPostave')}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums text-gnl-400">
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
                  <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-400">
                    {t('lestvice.ekipa.klop')}
                  </h2>
                  <ul className="divide-y divide-slate-800 rounded-lg bg-slate-800/40">
                    {klop.map((v) => (
                      <li
                        key={v.player_id}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm"
                      >
                        <Link
                          to={`/igralec/${v.player_id}`}
                          className="min-w-0 flex-1 truncate hover:text-gnl-400"
                        >
                          {prikazniIme(v.ime)}
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
            </>
          )}
        </>
      )}
    </div>
  )
}
