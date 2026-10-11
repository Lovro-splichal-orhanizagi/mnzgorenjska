import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from '../Povezava'

interface Prijava {
  mini_liga_id: number
  ime: string
  opis: string | null
  javna: boolean
  liga: string | null
  lastnik: string | null
  lastnik_id: string | null
  ekip: number
  prijav: number
  razlogi: string[] | null
  zadnja: string
}

/**
 * Prijavljene javne mini lige. Admin ligo skrije (javna = false in zaklep,
 * lastnik je ne more spet objaviti; člani ostanejo) ali prijave zavrne.
 */
export default function PrijaveMiniLig() {
  const [vrstice, setVrstice] = useState<Prijava[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_prijave_mini_lig')
    if (error) return setNapaka(error.message)
    setVrstice((data ?? []) as Prijava[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function odloci(liga: number, skrij: boolean) {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('admin_odloci_mini_ligo', { p_liga: liga, p_skrij: skrij })
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Prijave javnih mini lig</h2>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {vrstice === null ? (
        <p className="text-sm text-slate-400">Nalaganje …</p>
      ) : vrstice.length === 0 ? (
        <p className="text-sm text-slate-400">Ni odprtih prijav.</p>
      ) : (
        <ul className="kartica divide-y divide-white/10">
          {vrstice.map((v) => (
            <li key={v.mini_liga_id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <Link to={`/mini-leagues/${v.mini_liga_id}`} className="font-semibold hover:text-gnl-300">
                  {v.ime}
                </Link>
                <span className="text-xs text-slate-500">
                  {v.liga ?? '?'} · {v.ekip} ekip · lastnik{' '}
                  {v.lastnik_id ? <Link to={`/u/${v.lastnik_id}`}>{v.lastnik ?? '?'}</Link> : (v.lastnik ?? '?')}
                  {v.javna ? '' : ' · že zasebna'}
                </span>
              </div>
              {v.opis && <p className="text-slate-300">{v.opis}</p>}
              <p className="text-xs text-rose-300">
                Prijav: {v.prijav}, zadnja {new Date(v.zadnja).toLocaleDateString('sl-SI')}
              </p>
              {(v.razlogi ?? []).map((r, i) => (
                <p key={i} className="text-xs text-slate-400">„{r}“</p>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => odloci(v.mini_liga_id, true)}
                  disabled={dela}
                  className="rounded-md bg-rose-500/20 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
                >
                  Skrij ligo
                </button>
                <button
                  onClick={() => odloci(v.mini_liga_id, false)}
                  disabled={dela}
                  className="rounded-md px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 hover:bg-white/5"
                >
                  Zavrni prijave
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
