import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Poznavalec {
  user_id: string
  display_name: string | null
  email: string | null
  obseg: 'klub' | 'liga'
  competition_id: number
  competition_name: string | null
  team_id: number | null
  team_name: string | null
  vloga: string | null
  potrjeno_at: string | null
  velja: boolean
  glasov: number
}

const VLOGA: Record<string, string> = {
  igralec: 'igralec',
  trener: 'trener / štab',
  vodstvo: 'vodstvo kluba',
  navijac: 'navijač',
}

/**
 * Potrjeni poznavalci: odobrene prošnje (za klub ali ligo) in poznavalci lige,
 * dodeljeni neposredno. "Ne velja več" pomeni, da je vlogo medtem zamenjal
 * (druga liga ali klub) ali mu je bila odvzeta.
 */
export default function PotrjeniPoznavalci() {
  const [poznavalci, setPoznavalci] = useState<Poznavalec[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [vsi, setVsi] = useState(false)
  const [iskanje, setIskanje] = useState('')

  useEffect(() => {
    void supabase.rpc('admin_potrjeni_poznavalci').then(({ data, error }) => {
      if (error) return setNapaka(error.message)
      setPoznavalci((data ?? []) as Poznavalec[])
    })
  }, [])

  const prikazani = useMemo(() => {
    const q = iskanje.trim().toLowerCase()
    return (poznavalci ?? []).filter(
      (p) =>
        (vsi || p.velja) &&
        (!q ||
          [p.display_name, p.email, p.competition_name, p.team_name].some((s) => s?.toLowerCase().includes(q))),
    )
  }, [poznavalci, vsi, iskanje])

  if (napaka) return <p className="text-sm text-rose-400">{napaka}</p>
  if (poznavalci === null) return null

  const veljavnih = poznavalci.filter((p) => p.velja).length

  return (
    <section className="kartica space-y-2 p-3 sm:p-4">
      <h2 className="font-bold">
        Potrjeni poznavalci
        <span className="znacka ml-2 bg-sky-400/20 text-sky-200">{veljavnih}</span>
      </h2>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <input
          value={iskanje}
          onChange={(e) => setIskanje(e.target.value)}
          placeholder="Išči ime, mail, ligo, klub …"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1.5 text-slate-400">
          <input type="checkbox" checked={vsi} onChange={(e) => setVsi(e.target.checked)} />
          tudi tisti, ki ne veljajo več
        </label>
      </div>
      {prikazani.length === 0 ? (
        <p className="text-sm text-slate-500">Ni potrjenih poznavalcev.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {prikazani.map((p) => (
            <li
              key={`${p.user_id}-${p.obseg}-${p.competition_id}`}
              className={`flex flex-wrap items-start justify-between gap-3 py-3 text-sm ${p.velja ? '' : 'opacity-50'}`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {p.display_name ?? '—'}
                  <span className="ml-2 text-xs font-normal text-slate-500">{p.email}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {p.obseg === 'liga' ? 'cela liga' : (p.team_name ?? 'klub')} · {p.competition_name}
                  {p.vloga && <> · {VLOGA[p.vloga] ?? p.vloga}</>} · {p.glasov}{' '}
                  {p.glasov === 1 ? 'glas' : p.glasov < 5 ? 'glasovi' : 'glasov'} ·{' '}
                  {p.potrjeno_at ? new Date(p.potrjeno_at).toLocaleDateString('sl-SI') : 'dodelil admin'}
                </div>
              </div>
              <span
                className={`znacka shrink-0 ${p.obseg === 'liga' ? 'bg-sky-400/20 text-sky-200' : 'bg-gnl-500/25 text-gnl-200'}`}
              >
                {p.velja ? (p.obseg === 'liga' ? '★ liga' : '★ klub') : 'ne velja več'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
