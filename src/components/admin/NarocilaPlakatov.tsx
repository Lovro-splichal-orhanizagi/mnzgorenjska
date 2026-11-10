// Plakati 40 × 60 cm ob doživljenjskem nakupu (SLF-373): naslov za pošiljanje,
// datoteka za tisk (200 dpi, iz CV igralca) in stanje naročila.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { narisiPlakat, type PodatkiPlakata } from '../../lib/zgodbe'

type Narocilo = {
  id: number
  igralec: number
  ime: string | null
  naslov: { name?: string; line1?: string; line2?: string; postal_code?: string; city?: string; country?: string }
  status: string
  created_at: string
  poslano_at: string | null
  opomba: string | null
  eposta: string | null
}
const STANJA = ['za_tisk', 'natisnjeno', 'poslano', 'preklicano']

export default function NarocilaPlakatov() {
  const [narocila, setNarocila] = useState<Narocilo[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [rise, setRise] = useState<number | null>(null)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_narocila_plakatov')
    if (error) setNapaka(error.message)
    setNarocila((data ?? []) as Narocilo[])
  }, [])
  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function nastavi(n: Narocilo, status: string) {
    const { error } = await supabase.rpc('admin_nastavi_narocilo_plakata', { p_id: n.id, p_status: status })
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  async function prenesi(n: Narocilo) {
    setRise(n.id)
    setNapaka(null)
    const { data } = await supabase.rpc('cv_igralca', { p_player_id: n.igralec })
    const blob = data ? await narisiPlakat(data as PodatkiPlakata) : null
    setRise(null)
    if (!blob) return setNapaka('Plakata ni bilo mogoče narisati (igralec ni več preverjen?).')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `plakat-${n.id}-${(n.ime ?? 'igralec').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold">Plakati 40 × 60 cm</h2>
      <p className="text-sm text-slate-400">
        Ob doživljenjskem nakupu. Datoteka za tisk je 3150 × 4724 px (200 dpi) v jeziku, ki je izbran na strani. Naslov ostane 90 dni po pošiljanju.
      </p>
      {napaka && <p className="text-sm text-red-300">{napaka}</p>}
      {narocila && !narocila.length && <p className="text-sm text-slate-400">Ni naročil.</p>}
      <ul className="space-y-2">
        {narocila?.map((n) => (
          <li key={n.id} className="kartica space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/player/${n.igralec}`} className="font-semibold text-slate-100 underline">{n.ime ?? n.igralec}</a>
              <span className="text-slate-400">{new Date(n.created_at).toLocaleDateString('sl-SI')}{n.eposta && <> · {n.eposta}</>}</span>
            </div>
            <p className="whitespace-pre-line text-slate-300">
              {[n.naslov.name, n.naslov.line1, n.naslov.line2, [n.naslov.postal_code, n.naslov.city].filter(Boolean).join(' '), n.naslov.country]
                .filter(Boolean)
                .join('\n')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="gumb-tih min-h-11 px-3 text-xs" disabled={rise === n.id} onClick={() => prenesi(n)}>
                {rise === n.id ? 'Rišem …' : 'Prenesi datoteko za tisk'}
              </button>
              <select
                value={n.status}
                onChange={(e) => nastavi(n, e.target.value)}
                className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-2 text-sm"
                aria-label={`Stanje plakata: ${n.ime ?? n.igralec}`}
              >
                {STANJA.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
