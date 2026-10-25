import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from '../Povezava'

interface Omejitev {
  id: number
  user_id: string
  ime: string | null
  velja_do: string
  razlog: string
  created_at: string
  avtor: string | null
}

interface Porocilo {
  id: number
  user_id: string
  author_name: string | null
  player_id: number
  player_name: string | null
  team_name: string | null
  kind: string
  content: string
  created_at: string
}

/**
 * Omejitve uporabnikov (migracija 20261025111100). Omejen račun do roka ne
 * more prijavljati, pisati v klepet ali glasovati; ekipa ostane. Spodaj so
 * zadnje prijave o igralcih: avtorja omejiš ali prijavo izbrišeš.
 */
export default function OmejitveUporabnikov() {
  const [omejitve, setOmejitve] = useState<Omejitev[] | null>(null)
  const [porocila, setPorocila] = useState<Porocilo[]>([])
  const [razlog, setRazlog] = useState('neprimerne prijave')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const [o, p] = await Promise.all([
      supabase.rpc('admin_omejitve'),
      supabase
        .from('player_reports_view')
        .select('id, user_id, author_name, player_id, player_name, team_name, kind, content, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    if (o.error) return setNapaka(o.error.message)
    if (p.error) return setNapaka(p.error.message)
    setOmejitve((o.data ?? []) as Omejitev[])
    setPorocila((p.data ?? []) as Porocilo[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function izvedi(klic: () => PromiseLike<{ error: { message: string } | null }>) {
    setDela(true)
    setNapaka(null)
    const { error } = await klic()
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  const omeji = (uid: string, dni: number) =>
    izvedi(() => supabase.rpc('admin_omeji_uporabnika', { p_user_id: uid, p_dni: dni, p_razlog: razlog }))
  const omejeni = new Set((omejitve ?? []).map((o) => o.user_id))

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Omejitve uporabnikov</h2>
      <p className="text-xs text-slate-400">
        Omejen račun do roka ne more prijavljati igralcev, mini lig in profilov, pisati v klepet, glasovati o
        asistencah in pozicijah ali potrjevati soigralcev. Ekipa in ime ostaneta.
      </p>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {omejitve === null ? (
        <p className="text-sm text-slate-400">Nalaganje …</p>
      ) : omejitve.length === 0 ? (
        <p className="text-sm text-slate-400">Ni veljavnih omejitev.</p>
      ) : (
        <ul className="kartica divide-y divide-white/10">
          {omejitve.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                <Link to={`/u/${o.user_id}`} className="font-semibold hover:text-gnl-300">
                  {o.ime ?? o.user_id}
                </Link>{' '}
                <span className="text-xs text-slate-400">
                  do {new Date(o.velja_do).toLocaleString('sl-SI')} · {o.razlog}
                  {o.avtor ? ` · ${o.avtor}` : ''}
                </span>
              </span>
              <button
                onClick={() => izvedi(() => supabase.rpc('admin_odstrani_omejitev', { p_id: o.id }))}
                disabled={dela}
                className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              >
                Odstrani omejitev
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="pt-2 font-semibold">Zadnje prijave o igralcih</h3>
      <label className="block text-xs text-slate-400">
        Razlog nove omejitve
        <input
          value={razlog}
          maxLength={300}
          onChange={(e) => setRazlog(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        />
      </label>
      <ul className="kartica divide-y divide-white/10">
        {porocila.map((p) => (
          <li key={p.id} className="space-y-1 p-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-2 text-xs text-slate-400">
              <Link to={`/u/${p.user_id}`} className="font-semibold text-slate-200 hover:text-gnl-300">
                {p.author_name ?? '?'}
              </Link>
              <span>
                o <Link to={`/player/${p.player_id}`}>{p.player_name ?? '?'}</Link> ({p.team_name ?? '?'}) · {p.kind} ·{' '}
                {new Date(p.created_at).toLocaleString('sl-SI')}
              </span>
              {omejeni.has(p.user_id) && <span className="znacka bg-rose-400/20 text-rose-200">omejen</span>}
            </div>
            <p className="text-slate-200">„{p.content}“</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => izvedi(() => supabase.from('player_reports').delete().eq('id', p.id))}
                disabled={dela}
                className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              >
                Izbriši prijavo
              </button>
              {[7, 30].map((dni) => (
                <button
                  key={dni}
                  onClick={() => omeji(p.user_id, dni)}
                  disabled={dela || !razlog.trim()}
                  className="rounded-md bg-rose-500/20 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
                >
                  Omeji avtorja {dni} dni
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
