// Lestvica prave lige (ne fantasy): izračun iz izidov tekem (`lestvica_lige`)
// in strelci sezone. To ljudje iščejo ("1. GNL lestvica", "Tabelle").
import { useEffect, useState } from 'react'
import { Link } from '../components/Povezava'
import { supabase } from '../lib/supabase'
import { useTekmovanje } from '../lib/tekmovanje'
import { imeZveze } from '../components/VirPodatkov'
import Grb from '../components/Grb'
import { useNaslov, zDrzavo } from '../lib/naslov'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['lestvica_lige']['Returns'][number]

interface Strelec {
  id: number | null
  full_name: string | null
  team_name: string | null
  team_short: string | null
  team_logo: string | null
  goals: number | null
  matches: number | null
  minutes: number | null
}

const IZIDI = ['W', 'D', 'L'] as const
type Izid = (typeof IZIDI)[number]
const BARVA: Record<Izid, string> = {
  W: 'bg-emerald-500/80 text-white',
  D: 'bg-slate-500/80 text-white',
  L: 'bg-rose-500/80 text-white',
}

export default function Tabela() {
  const { id: tekmovanjeId, tekmovanje, slug } = useTekmovanje()
  const zveza = imeZveze(tekmovanje)
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [strelci, setStrelci] = useState<Strelec[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  useNaslov(tekmovanje?.name ? t('tekme.tabela.zavihek', { liga: zDrzavo(tekmovanje) }) : t('tekme.tabela.naslov'))

  useEffect(() => {
    if (!tekmovanjeId) return
    let veljavno = true
    const ligaId = tekmovanjeId
    setNalaganje(true)
    setNapaka(null)
    async function nalozi() {
      const { data, error } = await supabase.rpc('lestvica_lige', { p_competition_id: ligaId })
      if (!veljavno) return
      if (error) setNapaka(error.message)
      const tabela = data ?? []
      setVrstice(tabela)
      const sezona = tabela[0]?.sezona
      if (sezona) {
        const { data: s } = await supabase
          .from('player_season_standings')
          .select('id, full_name, team_name, team_short, team_logo, goals, matches, minutes')
          .eq('competition_id', ligaId)
          .eq('season', sezona)
          .gt('goals', 0)
          .order('goals', { ascending: false })
          .order('minutes')
          .order('id')
          .limit(20)
        if (!veljavno) return
        setStrelci((s ?? []) as Strelec[])
      } else setStrelci([])
      setNalaganje(false)
    }
    nalozi()
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  if (nalaganje) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  const liga = `?t=${encodeURIComponent(slug)}`
  const sezona = vrstice[0]?.sezona ?? ''
  const odigrano = vrstice.some((v) => v.tekme > 0)
  const th = 'px-1.5 py-2 text-center font-semibold'
  const td = 'px-1.5 py-2 text-center tabular-nums'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black naslov sm:text-3xl">
          {t('tekme.tabela.naslov')}
          {tekmovanje?.short_name ? ` — ${tekmovanje.short_name}` : ''}
        </h1>
        {odigrano && (
          <p className="max-w-2xl text-sm text-slate-400">{t('tekme.tabela.uvod', { sezona, zveza })}</p>
        )}
      </header>

      {!odigrano && !napaka ? (
        <p className="text-sm text-slate-400">{t('tekme.tabela.niTekem')}</p>
      ) : (
        <div className="kartica overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-xs text-slate-400">
              <tr>
                <th className={`${th} w-8`}>#</th>
                <th className="px-1.5 py-2 text-left font-semibold">{t('tekme.tabela.stolpci.klub')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.tekme')}>{t('tekme.tabela.stolpci.tekme')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.zmage')}>{t('tekme.tabela.stolpci.zmage')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.remiji')}>{t('tekme.tabela.stolpci.remiji')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.porazi')}>{t('tekme.tabela.stolpci.porazi')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.goli')}>{t('tekme.tabela.stolpci.goli')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.razlika')}>{t('tekme.tabela.stolpci.razlika')}</th>
                <th className={th} title={t('tekme.tabela.stolpciOpis.tocke')}>{t('tekme.tabela.stolpci.tocke')}</th>
                <th className={`${th} hidden sm:table-cell`}>{t('tekme.tabela.stolpci.forma')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vrstice.map((v) => (
                <tr key={v.team_id} className="hover:bg-white/5">
                  <td className={`${td} text-slate-400`}>{v.mesto}</td>
                  <td className="w-full max-w-0 px-1.5 py-2">
                    <Link to={`/club/${v.team_id}${liga}`} className="flex min-w-[6rem] items-center gap-2 font-semibold hover:text-gnl-300">
                      <Grb ime={v.ime} kratko={v.kratko} logo={v.grb} velikost={20} />
                      <span className="truncate">{v.ime}</span>
                    </Link>
                  </td>
                  <td className={td}>{v.tekme}</td>
                  <td className={td}>{v.zmage}</td>
                  <td className={td}>{v.remiji}</td>
                  <td className={td}>{v.porazi}</td>
                  <td className={`${td} whitespace-nowrap`}>{v.dani}:{v.prejeti}</td>
                  <td className={td}>{v.razlika > 0 ? `+${v.razlika}` : v.razlika}</td>
                  <td className={`${td} font-black`}>{v.tocke}</td>
                  <td className="hidden px-1.5 py-2 sm:table-cell">
                    <span className="flex justify-center gap-0.5">
                      {[...v.forma].filter((c): c is Izid => (IZIDI as readonly string[]).includes(c)).map((c, i) => (
                        <span
                          key={i}
                          title={t(`tekme.tabela.formaOpis.${c}`)}
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-0.5 text-[10px] font-black ${BARVA[c]}`}
                        >
                          {t(`tekme.tabela.forma.${c}`)}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {odigrano && <p className="text-xs text-slate-500">{t('tekme.tabela.opomba', { zveza })}</p>}

      {odigrano && (
        <section className="space-y-3">
          <h2 className="text-xl font-black naslov">{t('tekme.tabela.strelci')}</h2>
          {strelci.length === 0 ? (
            <p className="text-sm text-slate-400">{t('tekme.tabela.niStrelcev')}</p>
          ) : (
            <div className="kartica overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 text-xs text-slate-400">
                  <tr>
                    <th className={`${th} w-8`}>#</th>
                    <th className="px-1.5 py-2 text-left font-semibold">{t('tekme.tabela.stolpciStrelcev.igralec')}</th>
                    <th className="px-1.5 py-2 text-left font-semibold">{t('tekme.tabela.stolpciStrelcev.klub')}</th>
                    <th className={th}>{t('tekme.tabela.stolpciStrelcev.goli')}</th>
                    <th className={th}>{t('tekme.tabela.stolpciStrelcev.tekme')}</th>
                    <th className={`${th} hidden sm:table-cell`}>{t('tekme.tabela.stolpciStrelcev.minute')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {strelci.map((s, i) => (
                    <tr key={s.id ?? i} className="hover:bg-white/5">
                      <td className={`${td} text-slate-400`}>{i + 1}</td>
                      <td className="px-1.5 py-2">
                        <Link to={`/player/${s.id}${liga}`} className="font-semibold hover:text-gnl-300">
                          {s.full_name}
                        </Link>
                      </td>
                      <td className="px-1.5 py-2">
                        <span className="flex items-center gap-2 text-slate-300">
                          <Grb ime={s.team_name} kratko={s.team_short} logo={s.team_logo} velikost={18} />
                          <span className="truncate">{s.team_short || s.team_name}</span>
                        </span>
                      </td>
                      <td className={`${td} font-black`}>{s.goals}</td>
                      <td className={td}>{s.matches}</td>
                      <td className={`${td} hidden sm:table-cell`}>{s.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </div>
  )
}
