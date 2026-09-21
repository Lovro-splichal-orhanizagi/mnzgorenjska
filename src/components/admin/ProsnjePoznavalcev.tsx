import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Prosnja {
  id: number
  user_id: string
  display_name: string | null
  email: string | null
  competition_id: number
  competition_name: string | null
  team_id: number | null
  team_name: string | null
  vloga: string
  sporocilo: string | null
  created_at: string
  glasov: number
}

const VLOGA: Record<string, string> = {
  igralec: 'igralec',
  trener: 'trener / štab',
  vodstvo: 'vodstvo kluba',
  navijac: 'navijač',
}

/**
 * Čakajoče prošnje za poznavalca. Tri odločitve: za klub (3× na svoj klub),
 * za ligo (en glas potrdi), zavrni. Število dosedanjih glasov pove, ali
 * človek že sodeluje ali samo hoče moč.
 */
export default function ProsnjePoznavalcev() {
  const [prosnje, setProsnje] = useState<Prosnja[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_prosnje_poznavalcev')
    if (error) return setNapaka(error.message)
    setProsnje((data ?? []) as Prosnja[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  const [sporocilo, setSporocilo] = useState<string | null>(null)

  async function odloci(p: Prosnja, odlocitev: 'klub' | 'liga' | 'zavrnjeno') {
    setNapaka(null)
    setSporocilo(null)
    const { error } = await supabase.rpc('admin_odloci_prosnjo', { p_id: p.id, p_odlocitev: odlocitev })
    if (error) return setNapaka(error.message)
    await nalozi()
    if (odlocitev === 'zavrnjeno') return
    // Odobritev pove cloveku po mailu: kaj je dobil in da je to zaupanje.
    const { data: seja } = await supabase.auth.getSession()
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/posli-opomnik`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seja.session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vrsta: 'poznavalec',
        competition_id: p.competition_id,
        user_id: p.user_id,
        obseg: odlocitev,
      }),
    })
    const izid = await r.json().catch(() => ({}))
    if (!r.ok) return setNapaka(`Odobreno, mail pa ni sel: ${izid.error ?? r.status}`)
    setSporocilo(`Odobreno, mail poslan na ${p.email}.`)
  }

  if (prosnje === null) return null

  return (
    <section className="kartica space-y-2 p-3 sm:p-4">
      <h2 className="font-bold">
        Prošnje za poznavalca
        {prosnje.length > 0 && (
          <span className="znacka ml-2 bg-sky-400/20 text-sky-200">{prosnje.length}</span>
        )}
      </h2>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {sporocilo && <p className="text-sm text-gnl-300">{sporocilo}</p>}
      {prosnje.length === 0 ? (
        <p className="text-sm text-slate-500">Ni čakajočih prošenj.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {prosnje.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {p.display_name ?? '—'}
                  <span className="ml-2 text-xs font-normal text-slate-500">{p.email}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {VLOGA[p.vloga] ?? p.vloga} · {p.team_name ?? 'brez kluba'} · {p.competition_name} ·{' '}
                  {p.glasov} {p.glasov === 1 ? 'glas' : p.glasov < 5 ? 'glasovi' : 'glasov'} doslej ·{' '}
                  {new Date(p.created_at).toLocaleDateString('sl-SI')}
                </div>
                {p.sporocilo && <p className="mt-1 text-slate-300">“{p.sporocilo}”</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  onClick={() => odloci(p, 'klub')}
                  disabled={!p.team_id}
                  className="gumb-tih text-xs"
                  title="Poznavalec svojega kluba: glas za igralce tega kluba šteje 3×"
                >
                  za klub
                </button>
                <button
                  onClick={() => odloci(p, 'liga')}
                  className="gumb-glavni text-xs"
                  title="Poznavalec cele lige: en njegov glas potrdi pozicijo ali asistenco"
                >
                  za ligo
                </button>
                <button
                  onClick={() => odloci(p, 'zavrnjeno')}
                  className="text-xs text-slate-500 hover:text-rose-300"
                >
                  zavrni
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
