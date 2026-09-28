import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { vseVrstice } from '../lib/strani'
import { formatirajTocke } from '../lib/pomozno'
import { navijacev } from '../lib/plakat'
import { zdruziNavijace, type KlubNavijacev, type NavijaciLige, type VrsticaNavijacev } from '../lib/navijaci'
import Grb from './Grb'
import { t, tx, stevilo } from '../i18n'

const MEDALJE = ['🥇', '🥈', '🥉']

/** Povprečje na eno decimalko, v obliki jezika ("12,3"). */
const povprecje = (n: number) =>
  stevilo(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Navijači klubov lige in klub prijavljenega (`profiles.navijam_team_id`).
 * Navijanje ni poznavalec kluba (`insider_team_id`, stran Pozicije): ta
 * daje glasu utež, zato ga to povabilo ne nastavlja.
 */
function useNavijaci(tekmovanjeId: number | null) {
  const { session } = useAuth()
  const uporabnikId = session?.user.id
  const [podatki, setPodatki] = useState<NavijaciLige | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  // undefined = še ne vemo (ali neprijavljen), null = kluba ni izbral.
  const [mojKlub, setMojKlub] = useState<number | null | undefined>(undefined)
  const [osvezi, setOsvezi] = useState(0)

  useEffect(() => {
    if (!tekmovanjeId) return
    let veljavno = true
    setNapaka(null)
    const ligaId = tekmovanjeId
    // Po straneh: vrstica je en navijač, velika liga jih lahko ima čez tisoč.
    vseVrstice((od, do_) =>
      supabase
        .rpc('navijaci_klubov', { p_competition_id: ligaId })
        .order('team_id')
        .order('fantasy_team_id')
        .range(od, do_),
    )
      .then((vrstice) => {
        if (veljavno) setPodatki(zdruziNavijace(vrstice as unknown as VrsticaNavijacev[]))
      })
      .catch((e: Error) => {
        if (veljavno) setNapaka(e.message)
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId, osvezi])

  useEffect(() => {
    if (!uporabnikId) {
      setMojKlub(undefined)
      return
    }
    let veljavno = true
    supabase
      .from('profiles')
      .select('navijam_team_id')
      .eq('id', uporabnikId)
      .maybeSingle()
      .then(({ data }) => {
        if (veljavno) setMojKlub(data?.navijam_team_id ?? null)
      })
    return () => {
      veljavno = false
    }
  }, [uporabnikId])

  const nastaviKlub = useCallback(
    async (klubId: number) => {
      if (!uporabnikId) return
      setNapaka(null)
      const { error } = await supabase
        .from('profiles')
        .update({ navijam_team_id: klubId })
        .eq('id', uporabnikId)
      if (error) return setNapaka(error.message)
      setMojKlub(klubId)
      setOsvezi((n) => n + 1)
    },
    [uporabnikId],
  )

  return { podatki, napaka, mojKlub, nastaviKlub }
}

/** Nežno povabilo, naj si prijavljeni brez kluba izbere svojega. */
export function IzbiraKluba({
  klubi,
  onIzberi,
}: {
  klubi: { team_id: number; klub: string }[]
  onIzberi: (klubId: number) => void
}) {
  const [izbran, setIzbran] = useState<number | null>(null)
  if (!klubi.length) return null
  return (
    <div className="kartica space-y-2 border-gnl-400/30 bg-gnl-500/5 p-3 text-sm">
      <div className="font-bold text-gnl-200">
        <span aria-hidden="true">📣</span> {t('lestvice.navijaciKlubov.izbira.naslov')}
      </div>
      <p className="text-slate-300">{t('lestvice.navijaciKlubov.izbira.opis')}</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={izbran ?? ''}
          onChange={(e) => setIzbran(e.target.value ? Number(e.target.value) : null)}
          aria-label={t('lestvice.navijaciKlubov.izbira.naslov')}
          className="min-w-48 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100"
        >
          <option value="">{t('lestvice.navijaciKlubov.izbira.izberi')}</option>
          {klubi.map((k) => (
            <option key={k.team_id} value={k.team_id}>
              {k.klub}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={izbran == null}
          onClick={() => izbran != null && onIzberi(izbran)}
          className="gumb-glavni px-3 py-2 text-sm disabled:opacity-50"
        >
          {t('lestvice.navijaciKlubov.izbira.shrani')}
        </button>
      </div>
      <p className="text-xs text-slate-500">{t('lestvice.navijaciKlubov.izbira.spremeni')}</p>
    </div>
  )
}

/** Navijači enega kluba: njihove ekipe s točkami. */
function SeznamNavijacev({ klub, krog }: { klub: KlubNavijacev; krog: number | null }) {
  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-lg bg-white/5">
      {klub.navijaci.map((n) => (
        <li key={n.fantasy_team_id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
          <div className="min-w-0 flex-1">
            <Link to={`/team/${n.fantasy_team_id}`} className="block truncate font-semibold hover:text-gnl-400">
              {n.ekipa}
            </Link>
            <div className="truncate text-xs text-slate-500">{n.lastnik}</div>
          </div>
          {krog != null && (
            <span
              className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-400"
              title={t('lestvice.navijaciKlubov.povprecjeKroga', { n: krog })}
            >
              {formatirajTocke(n.tocke_krog)}
            </span>
          )}
          <span className="w-12 shrink-0 text-right font-bold tabular-nums">
            {formatirajTocke(n.tocke_sezona)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function VrsticaKluba({
  klub,
  krog,
  mojKlub,
}: {
  klub: KlubNavijacev
  krog: number | null
  mojKlub: number | null | undefined
}) {
  const moj = mojKlub === klub.team_id
  return (
    <li className={`kartica p-3 ${moj ? 'ring-1 ring-gnl-400/50' : ''}`}>
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <span className="w-8 shrink-0 text-center text-lg font-black text-slate-400">
            {klub.mesto != null ? (MEDALJE[klub.mesto - 1] ?? klub.mesto) : '–'}
          </span>
          <Grb ime={klub.klub} kratko={klub.klub_kratko} logo={klub.grb} velikost={28} />
          <div className="min-w-0 flex-1">
            <Link to={`/club/${klub.team_id}`} className="block truncate font-bold hover:text-gnl-400">
              {klub.klub}
            </Link>
            <div className="text-xs text-slate-500">
              {navijacev(klub.navijacev)}
              {moj && (
                <span className="znacka ml-2 bg-gnl-400/15 text-[10px] text-gnl-200">
                  {t('lestvice.navijaciKlubov.tvojKlub')}
                </span>
              )}
            </div>
          </div>
          {krog != null && (
            <span className="hidden w-16 shrink-0 text-right sm:block">
              <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                {t('lestvice.navijaciKlubov.povprecjeKroga', { n: krog })}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-300">
                {povprecje(klub.povprecje_krog)}
              </span>
            </span>
          )}
          <span className="w-16 shrink-0 text-right">
            <span className="block text-[10px] uppercase tracking-wide text-slate-500">
              {t('lestvice.navijaciKlubov.povprecjeSezona')}
            </span>
            <span className="text-xl font-black tabular-nums text-gnl-300">
              {povprecje(klub.povprecje_sezona)}
            </span>
          </span>
        </summary>
        <div className="mt-2">
          <SeznamNavijacev klub={klub} krog={krog} />
        </div>
      </details>
    </li>
  )
}

/** Lestvica klubov po povprečju navijačev. Brez poizvedb, zato jo izriše tudi smoke. */
export function TabelaNavijacev({
  podatki,
  mojKlub,
}: {
  podatki: NavijaciLige
  mojKlub?: number | null
}) {
  const { uvrsceni, premalo, brez, min, krog } = podatki
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        {t('lestvice.navijaciKlubov.opis')} {t('lestvice.navijaciKlubov.pogoj', { n: min })}
      </p>
      {uvrsceni.length === 0 && premalo.length === 0 ? (
        <p className="kartica p-6 text-center text-slate-400">{t('lestvice.navijaciKlubov.prazno')}</p>
      ) : (
        <>
          {uvrsceni.length > 0 && (
            <ul className="space-y-2">
              {uvrsceni.map((k) => (
                <VrsticaKluba key={k.team_id} klub={k} krog={krog} mojKlub={mojKlub} />
              ))}
            </ul>
          )}
          {premalo.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {t('lestvice.navijaciKlubov.premalo')}
              </h3>
              <ul className="space-y-2 opacity-80">
                {premalo.map((k) => (
                  <VrsticaKluba key={k.team_id} klub={k} krog={krog} mojKlub={mojKlub} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {brez.length > 0 && (
        <p className="text-xs text-slate-500">
          {t('lestvice.navijaciKlubov.brezNavijacev', { klubi: brez.map((k) => k.klub).join(', ') })}
        </p>
      )}
    </div>
  )
}

/** Vsi klubi lige — zavihek na Lestvici. */
export default function NavijaciKlubov({ tekmovanjeId }: { tekmovanjeId: number | null }) {
  const { podatki, napaka, mojKlub, nastaviKlub } = useNavijaci(tekmovanjeId)
  const [urejam, setUrejam] = useState(false)
  if (napaka) return <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (!podatki) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
  const klubi = [...podatki.uvrsceni, ...podatki.premalo, ...podatki.brez].sort((a, b) =>
    a.klub.localeCompare(b.klub),
  )
  // Klub prijavljenega, če igra v tej ligi (navija lahko za klub druge lige).
  const moj = mojKlub != null ? klubi.find((k) => k.team_id === mojKlub) : undefined
  return (
    <div className="space-y-3">
      {mojKlub === null || urejam ? (
        <IzbiraKluba
          klubi={klubi}
          onIzberi={(id) => {
            setUrejam(false)
            nastaviKlub(id)
          }}
        />
      ) : moj ? (
        <p className="text-sm text-slate-300">
          {tx('lestvice.navijaciKlubov.izbira.mojKlub', { klub: moj.klub }, { b: (v) => <strong>{v}</strong> })}{' '}
          <button type="button" onClick={() => setUrejam(true)} className="text-xs text-gnl-400 underline">
            {t('lestvice.navijaciKlubov.izbira.zamenjaj')}
          </button>
        </p>
      ) : null}
      <TabelaNavijacev podatki={podatki} mojKlub={mojKlub} />
    </div>
  )
}

/** "Navijači tega kluba" na strani kluba: mesto kluba in njegovi navijači. */
export function NavijaciKluba({
  tekmovanjeId,
  klubId,
  klubIme,
  ligaSlug,
}: {
  tekmovanjeId: number | null
  klubId: number
  klubIme: string
  ligaSlug: string | null
}) {
  const { podatki, napaka, mojKlub, nastaviKlub } = useNavijaci(tekmovanjeId)
  if (napaka) return <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
  if (!podatki) return null
  return <KlubMedNavijaci podatki={podatki} klubId={klubId} klubIme={klubIme} ligaSlug={ligaSlug} mojKlub={mojKlub} onNavijam={nastaviKlub} />
}

/** Prikaz za en klub, brez poizvedb (preveri ga smoke). */
export function KlubMedNavijaci({
  podatki,
  klubId,
  klubIme,
  ligaSlug,
  mojKlub,
  onNavijam,
}: {
  podatki: NavijaciLige
  klubId: number
  klubIme: string
  ligaSlug: string | null
  mojKlub?: number | null
  onNavijam?: (klubId: number) => void
}) {
  const klub = [...podatki.uvrsceni, ...podatki.premalo, ...podatki.brez].find(
    (k) => k.team_id === klubId,
  )
  const manjka = klub ? Math.max(podatki.min - klub.navijacev, 0) : podatki.min
  const ligaParam = ligaSlug ? `?t=${encodeURIComponent(ligaSlug)}` : ''
  return (
    <section className="kartica space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">
          <span aria-hidden="true">📣</span> {t('lestvice.navijaciKlubov.klub.naslov')}
        </h2>
        <Link to={`/standings${ligaParam}#fans`} className="text-xs text-gnl-400 underline">
          {t('lestvice.navijaciKlubov.klub.vsiKlubi')}
        </Link>
      </div>
      {klub?.mesto != null ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-black text-gnl-300">
            {MEDALJE[klub.mesto - 1] ? `${MEDALJE[klub.mesto - 1]} ` : ''}
            {t('lestvice.navijaciKlubov.klub.mesto', { mesto: klub.mesto })}
          </span>
          <span className="text-sm text-slate-400">
            {t('lestvice.navijaciKlubov.klub.odKlubov', { n: podatki.uvrsceni.length })}
          </span>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          {klub && klub.navijacev > 0
            ? t('lestvice.navijaciKlubov.klub.manjka', { n: manjka })
            : t('lestvice.navijaciKlubov.klub.brez')}
        </p>
      )}
      {klub && klub.navijacev > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            <span className="text-slate-400">{t('lestvice.navijaciKlubov.navijaci')}: </span>
            <strong>{klub.navijacev}</strong>
          </span>
          <span>
            <span className="text-slate-400">{t('lestvice.navijaciKlubov.povprecjeSezona')}: </span>
            <strong className="tabular-nums">{povprecje(klub.povprecje_sezona)}</strong>
          </span>
          {podatki.krog != null && (
            <span>
              <span className="text-slate-400">
                {t('lestvice.navijaciKlubov.povprecjeKroga', { n: podatki.krog })}:{' '}
              </span>
              <strong className="tabular-nums">{povprecje(klub.povprecje_krog)}</strong>
            </span>
          )}
        </div>
      )}
      {klub && klub.navijaci.length > 0 && <SeznamNavijacev klub={klub} krog={podatki.krog} />}
      {/* Prijavljen brez kluba: en klik, ker je klub že izbran s strani. */}
      {mojKlub === null && onNavijam && (
        <div className="space-y-1 border-t border-white/10 pt-3">
          <p className="text-sm text-slate-300">{t('lestvice.navijaciKlubov.izbira.opis')}</p>
          <button
            type="button"
            onClick={() => onNavijam(klubId)}
            className="gumb-glavni px-3 py-2 text-sm"
          >
            {t('lestvice.navijaciKlubov.klub.navijam', { klub: klubIme })}
          </button>
        </div>
      )}
    </section>
  )
}
