import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Samodejni {
  user_id: string
  display_name: string | null
  competition_id: number
  liga: string
  glasov: number
  pravilnih: number
  podeljeno_at: string
  odvzeto_at: string | null
  odvzel_admin: boolean
  razlog: string | null
}

/**
 * Poznavalci lige, ki jih je podelila nočna naloga (migracija 20261025223100):
 * vsaj 20 neodvisno potrjenih glasov v ligi in 85 % pravilnih. Odvzem tu je
 * dokončen, samodejno ga ne dobi nikoli več.
 */
export default function SamodejniPoznavalci() {
  const [vrstice, setVrstice] = useState<Samodejni[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_samodejni_poznavalci')
    if (error) return setNapaka(error.message)
    setVrstice((data ?? []) as Samodejni[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function odvzemi(s: Samodejni) {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('admin_nastavi_poznavalca', { p_user_id: s.user_id })
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  if (vrstice === null) return null

  return (
    <section className="kartica space-y-2 p-3 sm:p-4">
      <h2 className="font-bold">Samodejni poznavalci</h2>
      <p className="text-xs text-slate-500">
        Podeljeni ponoči po točnosti glasov (le glasovi, ki jih je potrdil vir, klub, admin ali vsaj dva druga
        glasovalca). Pod 75 % se odvzamejo sami.
      </p>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {vrstice.length === 0 ? (
        <p className="text-sm text-slate-500">Še nihče.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {vrstice.map((s) => (
            <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-semibold">{s.display_name ?? '—'}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {s.liga} · {s.pravilnih}/{s.glasov} · {new Date(s.podeljeno_at).toLocaleDateString('sl-SI')}
                  {s.odvzeto_at && ` · odvzeto (${s.razlog ?? (s.odvzel_admin ? 'admin' : 'samodejno')})`}
                </span>
              </span>
              {!s.odvzeto_at && (
                <button
                  onClick={() => void odvzemi(s)}
                  disabled={dela}
                  className="text-xs text-slate-500 hover:text-rose-300 disabled:opacity-50"
                >
                  odvzemi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
