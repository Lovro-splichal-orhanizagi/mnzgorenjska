// Prijavljena zasebna sporočila (SLF-373): admin vidi le prijavljeno
// sporočilo, ne celega pogovora. Zapri prijavo ali izbriši sporočilo;
// za ponavljanje je omejitev računa (Omejitve uporabnikov).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Prijava = {
  id: number
  sporocilo_id: number
  besedilo: string
  avtor: string
  avtor_ime: string | null
  prijavil_ime: string | null
  razlog: string | null
  created_at: string
}

export default function PrijaveSporocil() {
  const [prijave, setPrijave] = useState<Prijava[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_prijave_sporocil')
    if (error) setNapaka(error.message)
    setPrijave((data ?? []) as Prijava[])
  }, [])
  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function resi(id: number, izbrisi: boolean) {
    const { error } = await supabase.rpc('admin_resi_prijavo_sporocila', { p_id: id, p_izbrisi: izbrisi })
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold">Prijavljena sporočila</h2>
      <p className="text-sm text-slate-400">Vidiš le prijavljeno sporočilo. Avtorja, ki ponavlja, omeji v Omejitvah uporabnikov.</p>
      {napaka && <p className="text-sm text-red-300">{napaka}</p>}
      {prijave && !prijave.length && <p className="text-sm text-slate-400">Ni odprtih prijav.</p>}
      <ul className="space-y-2">
        {prijave?.map((p) => (
          <li key={p.id} className="kartica space-y-2 p-3 text-sm">
            <p className="whitespace-pre-wrap break-words text-slate-100">{p.besedilo}</p>
            <p className="text-xs text-slate-400">
              Avtor: {p.avtor_ime ?? p.avtor} · prijavil: {p.prijavil_ime ?? '?'} · {new Date(p.created_at).toLocaleString('sl-SI')}
              {p.razlog && <> · razlog: {p.razlog}</>}
            </p>
            <div className="flex gap-2">
              <button type="button" className="gumb-tih min-h-11 px-3 text-xs" onClick={() => resi(p.id, false)}>
                Zapri (v redu)
              </button>
              <button type="button" className="gumb-tih min-h-11 px-3 text-xs text-red-300" onClick={() => resi(p.id, true)}>
                Izbriši sporočilo
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
