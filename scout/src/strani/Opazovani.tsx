import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Opazovan } from '../baza'
import { napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

export function Opazovani() {
  const [seznam, setSeznam] = useState<Opazovan[] | null>(null)
  const [napakaS, setNapakaS] = useState<string | null>(null)
  // Napaka gumba (meja) seznam pusti na strani.
  const [napakaA, setNapakaA] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    let velja = true
    void supabase.rpc('scout_opazovani').then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaS(napaka(error))
      else setSeznam(data ?? [])
    })
    return () => {
      velja = false
    }
  }, [])

  async function odstrani(id: number) {
    setDela(true)
    setNapakaA(null)
    const { error } = await supabase.rpc('scout_opazuj', { p_player_id: id, p_opazuj: false })
    setDela(false)
    if (error) setNapakaA(napaka(error))
    else setSeznam((s) => (s ?? []).filter((x) => x.player_id !== id))
  }

  if (napakaS) return <p className="text-red-700">{napakaS}</p>
  if (!seznam) return <Nalaganje />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('seznam.naslov')}</h1>
      <p className="text-sm text-slate-600">{t('seznam.opis')}</p>
      {napakaA && <p className="text-sm text-red-700">{napakaA}</p>}
      {seznam.length === 0 ? (
        <p className="text-slate-500">{t('seznam.prazno')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {seznam.map((o) => (
            <li key={o.player_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
              <Link to={`/player/${o.player_id}`} className="font-medium hover:underline">{o.ime}</Link>
              <span className="text-slate-600">{o.klub} · {o.liga} · {t(`skupina.${o.skupina}` as Kljuc)}</span>
              {o.odprt_za_prestop && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t('iskanje.odprt')}</span>}
              <button type="button" disabled={dela} onClick={() => void odstrani(o.player_id)} className="ml-auto underline disabled:opacity-50">{t('seznam.odstrani')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
