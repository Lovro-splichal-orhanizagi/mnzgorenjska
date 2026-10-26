// Napovedi izidov za vse: obrazec za naslednji krog izbrane lige, lestvica
// napovedi lige in po roku izbira skupnosti po tekmah.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from '../components/Povezava'
import Grb from '../components/Grb'
import PasSkupnosti from '../components/PasSkupnosti'
import { ObrazecNapovedi, IzbiraKroga } from '../components/NapovediMiniLige'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type VrsticaLestvice = Database['public']['Functions']['lestvica_napovedi_lige']['Returns'][number]
type Skupnost = Database['public']['Functions']['skupnost_napovedi_kroga']['Returns'][number]

interface TekmaSkupnosti extends Skupnost {
  home_name: string | null
  home_short: string | null
  home_logo: string | null
  away_name: string | null
  away_short: string | null
  away_logo: string | null
}

const MEDALJE = ['🥇', '🥈', '🥉']

/**
 * Stran /predictions. Napoveduje vsak z (nehišno) ekipo v izbrani ligi;
 * napoved je ena in šteje tu in v vseh njegovih mini ligah. Lestvica in
 * izbira skupnosti sta javni (le prikazna imena in seštevki).
 */
export default function Napovedi() {
  const { session, loading: nalaganjePrijave } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const { pathname, search } = useLocation()
  useNaslov(t('lestvice.napovediLige.naslov'), tekmovanje?.name)

  // null: še ne vemo (nalaganje), sicer ali ima klicatelj ekipo v ligi.
  const [imamEkipo, setImamEkipo] = useState<boolean | null>(null)
  const [krogi, setKrogi] = useState<{ krog: number; round_id: number }[]>([])
  const [krog, setKrog] = useState<number | null>(null)
  const [lestvica, setLestvica] = useState<VrsticaLestvice[] | null>(null)
  const [skupnost, setSkupnost] = useState<TekmaSkupnosti[]>([])

  // Nova liga začne pri skupni lestvici.
  useEffect(() => setKrog(null), [tekmovanjeId])

  useEffect(() => {
    setImamEkipo(null)
    if (!uporabnikId || tekmovanjeId == null) return
    let veljavno = true
    supabase
      .from('fantasy_teams')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', uporabnikId)
      .eq('competition_id', tekmovanjeId)
      .eq('hisna', false)
      .then(({ count }) => {
        if (veljavno) setImamEkipo(Boolean(count))
      })
    return () => {
      veljavno = false
    }
  }, [uporabnikId, tekmovanjeId])

  useEffect(() => {
    setKrogi([])
    if (tekmovanjeId == null) return
    let veljavno = true
    supabase.rpc('krogi_napovedi_lige', { p_tekmovanje: tekmovanjeId }).then(({ data }) => {
      if (veljavno) setKrogi(data ?? [])
    })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  useEffect(() => {
    setLestvica(null)
    if (tekmovanjeId == null) return
    let veljavno = true
    supabase
      .rpc('lestvica_napovedi_lige', { p_tekmovanje: tekmovanjeId, p_krog: krog ?? undefined })
      .then(({ data }) => {
        if (veljavno) setLestvica(data ?? [])
      })
    return () => {
      veljavno = false
    }
    // Prijava spremeni `je_moj`, zato lestvico preberemo znova.
  }, [tekmovanjeId, krog, uporabnikId])

  // Izbira skupnosti: zadnji krog, katerega rok je potekel (prvi v seznamu).
  const zadnji = krogi[0] ?? null
  const zadnjiId = zadnji?.round_id ?? null
  useEffect(() => {
    setSkupnost([])
    if (zadnjiId == null) return
    let veljavno = true
    ;(async () => {
      const { data } = await supabase.rpc('skupnost_napovedi_kroga', { p_round: zadnjiId })
      if (!data?.length) return
      const { data: tekme } = await supabase
        .from('match_assist_status')
        .select('match_id, played_on, home_name, home_short, home_logo, away_name, away_short, away_logo')
        .eq('round_id', zadnjiId)
        .order('played_on')
        .order('match_id')
      if (!veljavno) return
      const poId = new Map(data.map((v) => [v.match_id, v]))
      setSkupnost(
        (tekme ?? []).flatMap((tk) => {
          const v = tk.match_id == null ? undefined : poId.get(tk.match_id)
          return v ? [{ ...v, ...tk, match_id: v.match_id }] : []
        }),
      )
    })()
    return () => {
      veljavno = false
    }
  }, [zadnjiId])

  const nazaj = pathname + search

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black naslov sm:text-3xl">{t('lestvice.napovediLige.naslov')}</h1>
        <p className="mt-1 text-sm text-slate-400">{t('lestvice.napovediLige.pravila')}</p>
      </div>

      {/* Obrazec, ali pot do njega: prijava oziroma ekipa v tej ligi. */}
      {nalaganjePrijave ? null : !session ? (
        <section className="kartica space-y-3 p-4">
          <p className="text-sm text-slate-300">{t('lestvice.napovediLige.brezPrijave')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={`${povezavaNaPrijavo(nazaj)}&nacin=registracija`} className="gumb-glavni text-sm">
              {t('aplikacija.meni.zacni')}
            </Link>
            <Link to={povezavaNaPrijavo(nazaj)} className="text-sm text-slate-300 underline hover:text-white">
              {t('aplikacija.meni.prijava')}
            </Link>
          </div>
        </section>
      ) : imamEkipo === false ? (
        <section className="kartica space-y-3 p-4">
          <p className="text-sm text-slate-300">{t('lestvice.napovediLige.brezEkipe')}</p>
          <Link to="/my-team" className="gumb-glavni inline-block text-sm">
            {t('lestvice.napovediLige.sestavi')}
          </Link>
        </section>
      ) : imamEkipo && tekmovanjeId != null ? (
        <ObrazecNapovedi tekmovanjeId={tekmovanjeId} brezPravil />
      ) : null}

      <section className="kartica space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t('lestvice.napovedi.lestvicaNaslov')}</h2>
          <IzbiraKroga krogi={krogi.map((k) => k.krog)} krog={krog} onKrog={setKrog} />
        </div>

        {lestvica == null ? (
          <p className="animiraj-utrip text-sm text-slate-400">{t('skupno.nalaganje')}</p>
        ) : lestvica.length === 0 || lestvica.every((v) => v.ocenjenih === 0) ? (
          <p className="text-sm text-slate-400">{t('lestvice.napovedi.prazna')}</p>
        ) : (
          <ol className="divide-y divide-white/10">
            <li className="flex items-center gap-3 pb-1 text-[11px] uppercase tracking-wide text-slate-500">
              <span className="w-7 shrink-0" />
              <span className="min-w-0 flex-1" />
              <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocni')}</span>
              <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocke')}</span>
            </li>
            {lestvica.map((v, i) => {
              // Lastna vrstica pod vrhom 50 je ločena s presledkom.
              const vrzel = i > 0 && v.je_moj && v.mesto > lestvica[i - 1].mesto + 1
              return (
                <li
                  key={i}
                  className={`flex min-h-[44px] items-center gap-3 py-1.5 text-sm ${
                    v.je_moj ? '-mx-2 rounded-lg bg-gnl-500/10 px-2 ring-1 ring-gnl-400/30' : ''
                  } ${vrzel ? 'mt-3' : ''}`}
                >
                  <span className="w-7 shrink-0 text-center font-bold text-slate-400">
                    {v.mesto <= 3 ? (
                      <span role="img" aria-label={t('lestvice.mesto', { mesto: v.mesto })}>
                        {MEDALJE[v.mesto - 1]}
                      </span>
                    ) : (
                      v.mesto
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {v.display_name}
                    {v.je_moj && <span className="ml-1.5 text-xs font-normal text-gnl-300">({t('lestvice.napovediLige.ti')})</span>}
                  </span>
                  <span className="w-12 shrink-0 text-right tabular-nums text-slate-400">{v.tocnih}</span>
                  <span className="w-12 shrink-0 text-right font-bold tabular-nums text-gnl-300">{v.tocke}</span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {zadnji && skupnost.length > 0 && (
        <section className="kartica space-y-3 p-4">
          <div>
            <h2 className="text-lg font-bold">
              {t('lestvice.napovediLige.skupnost')} · {t('lestvice.krog', { n: zadnji.krog })}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{t('lestvice.napovediLige.skupnostOpis')}</p>
          </div>
          <ul className="space-y-4">
            {skupnost.map((tk) => (
              <li key={tk.match_id} className="space-y-1.5">
                <Link to={`/match/${tk.match_id}`} className="flex items-center gap-2 text-sm font-semibold hover:text-gnl-300">
                  <Grb ime={tk.home_name} kratko={tk.home_short} logo={tk.home_logo} velikost={18} />
                  <span className="min-w-0 flex-1 truncate">{tk.home_name}</span>
                  <span className="shrink-0 text-slate-500">–</span>
                  <span className="min-w-0 flex-1 truncate text-right">{tk.away_name}</span>
                  <Grb ime={tk.away_name} kratko={tk.away_short} logo={tk.away_logo} velikost={18} />
                </Link>
                <PasSkupnosti n={tk.n} doma={tk.doma} remi={tk.remi} gostje={tk.gostje} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
