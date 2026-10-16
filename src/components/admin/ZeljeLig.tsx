import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Zelja {
  competition_id: number | null
  liga: string | null
  slug: string | null
  aktivna: boolean | null
  drzava: string
  imena: string[] | null
  zelj: number
  odprtih: number
  zadnja: string
  ids: number[]
}

/**
 * Želje "Moje lige ni": po vpisani ligi ali po besedilu in državi, najnovejše
 * prve. Prosto besedilo admin poveže z ligo (šifra); ko liga zaživi, gre
 * vsem odprtim željam enkraten mail (opozorila.yml, `liga-zivi`).
 */
export default function ZeljeLig() {
  const [vrstice, setVrstice] = useState<Zelja[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sifre, setSifre] = useState<Record<string, string>>({})
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_zelje_lig')
    if (error) return setNapaka(error.message)
    setVrstice((data ?? []) as Zelja[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function povezi(v: Zelja, slug: string) {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('admin_povezi_zelje', { p_ids: v.ids, p_slug: slug })
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Želje lig</h2>
      <p className="text-sm text-slate-400">
        "Moje lige ni": kdo si želi katero ligo. Prosto besedilo poveži z vpisano ligo (šifra), da dobijo mail, ko
        zaživi.
      </p>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {vrstice === null ? (
        <p className="text-sm text-slate-400">Nalaganje …</p>
      ) : vrstice.length === 0 ? (
        <p className="text-sm text-slate-400">Ni želja.</p>
      ) : (
        <ul className="kartica divide-y divide-white/10">
          {vrstice.map((v) => {
            const kljuc = v.ids.join(',')
            return (
              <li key={kljuc} className="space-y-1 p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{v.liga ?? (v.imena ?? []).join(' · ')}</span>
                  <span className="text-xs text-slate-500">
                    {v.drzava} · {v.zelj} želj ({v.odprtih} neobveščenih) · zadnja{' '}
                    {new Date(v.zadnja).toLocaleDateString('sl-SI')}
                  </span>
                </div>
                {v.liga ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>
                      {v.slug} · {v.aktivna ? 'aktivna' : 'neaktivna'}
                    </span>
                    {v.imena && v.imena.some((i) => i !== v.liga) && <span>„{v.imena.join('“, „')}“</span>}
                    <button
                      onClick={() => povezi(v, '')}
                      disabled={dela}
                      className="rounded-md px-2 py-0.5 ring-1 ring-white/10 hover:bg-white/5"
                    >
                      Odveži
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <input
                      value={sifre[kljuc] ?? ''}
                      onChange={(e) => setSifre((s) => ({ ...s, [kljuc]: e.target.value }))}
                      placeholder="šifra lige (npr. hr-vs-u19)"
                      className="w-56 rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => povezi(v, sifre[kljuc] ?? '')}
                      disabled={dela || !(sifre[kljuc] ?? '').trim()}
                      className="rounded-md bg-gnl-500/20 px-3 py-1 text-xs text-gnl-200 hover:bg-gnl-500/30"
                    >
                      Poveži
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
