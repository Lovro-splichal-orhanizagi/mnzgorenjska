// Highlight videi preverjenih igralcev (SLF-373): kdor ima 6 odobrenih
// posnetkov, dobi zmontiran video; z manj ga kontaktiramo. Stanje vodi admin.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vrstica = { igralec: number; ime: string; posnetkov: number; stanje: string | null; opomba: string | null; eposta: string | null }
const STANJA: Array<[string | null, string]> = [
  [null, 'ni začeto'],
  ['kontaktiran', 'kontaktiran'],
  ['v_delu', 'v delu'],
  ['oddan', 'oddan'],
]

export default function HighlightVrsta() {
  const [vrste, setVrste] = useState<Vrstica[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_highlight_vrsta')
    if (error) setNapaka(error.message)
    setVrste((data ?? []) as Vrstica[])
  }, [])
  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function nastavi(v: Vrstica, stanje: string | null) {
    const { error } = await supabase.rpc('admin_highlight_stanje', { p_igralec: v.igralec, p_stanje: stanje as string, p_opomba: v.opomba ?? undefined })
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold">Highlight videi</h2>
      <p className="text-sm text-slate-400">
        Preverjen igralec s 6 odobrenimi posnetki dobi zmontiran video (del preverjenega profila). Z manj posnetki mu pišemo.
      </p>
      {napaka && <p className="text-sm text-red-300">{napaka}</p>}
      {vrste && !vrste.length && <p className="text-sm text-slate-400">Ni preverjenih igralcev.</p>}
      <ul className="space-y-2">
        {vrste?.map((v) => (
          <li key={v.igralec} className="kartica flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <a href={`/player/${v.igralec}`} className="font-semibold text-slate-100 underline">{v.ime}</a>
              <span className="ml-2 text-slate-400">
                {v.posnetkov}/6 posnetkov · {v.posnetkov >= 6 ? 'naredi video' : 'kontaktiraj'}
                {v.eposta && <> · {v.eposta}</>}
              </span>
            </span>
            <select
              value={v.stanje ?? ''}
              onChange={(e) => nastavi(v, e.target.value || null)}
              className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-2 text-sm"
              aria-label={`Stanje videa: ${v.ime}`}
            >
              {STANJA.map(([k, n]) => (
                <option key={n} value={k ?? ''}>{n}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  )
}
