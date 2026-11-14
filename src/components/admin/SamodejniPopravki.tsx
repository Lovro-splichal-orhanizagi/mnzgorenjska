import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { prikazniIme } from '../../lib/pomozno'
import { datumUra } from '../../i18n'
import type { Database } from '../../lib/baza.types'

type Vrstica = Database['public']['Functions']['admin_samodejni_popravki']['Returns'][number]

const NACIN: Record<string, string> = {
  preverjen: 'preverjen igralec kluba',
  soglasje: 'soglasje',
}

/**
 * Samodejno sprejeti popravki zadnjih 30 dni (migracija 20261113101100):
 * kaj je bilo prej, kdo je predlagal in razveljavitev.
 */
export default function SamodejniPopravki() {
  const [vrstice, setVrstice] = useState<Vrstica[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_samodejni_popravki')
    if (error) return setNapaka(error.message)
    setVrstice(data ?? [])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function razveljavi(id: number) {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('admin_razveljavi_samodejni_popravek', { p_id: id })
    setDela(false)
    if (error) setNapaka(error.message)
    await nalozi()
  }

  return (
    <section className="mt-6 space-y-2 text-sm">
      <h3 className="font-semibold">Samodejno sprejeti popravki (30 dni)</h3>
      <p className="text-xs text-slate-400">
        Pozicija ali asistenca velja takoj, če jo predlaga igralec s potrjenim profilom za svoj klub ali če isto
        predlagajo 3 ljudje (pozicija) oz. 2 (asistenca), brez spora. Razveljavitev vrne prejšnjo vrednost.
      </p>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {vrstice === null ? null : vrstice.length === 0 ? (
        <p className="text-xs text-slate-500">Ni samodejnih popravkov.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {vrstice.map((v) => (
            <li key={v.id} className={`space-y-1 py-2 ${v.razveljavljen_at ? 'opacity-50' : ''}`}>
              <p>
                {v.vrsta === 'pozicija' ? (
                  <>
                    {prikazniIme(v.igralec ?? '?')}: {v.prej ?? '?'} → <b>{v.pozicija}</b>
                  </>
                ) : (
                  <>
                    Gol {v.minuta != null ? `${v.minuta}'` : ''} {prikazniIme(v.strelec ?? '?')}:{' '}
                    {v.prej ? prikazniIme(v.prej) : '—'} → <b>{v.asistent ? prikazniIme(v.asistent) : 'brez asistence'}</b>
                  </>
                )}
                <span className="text-slate-500"> · {v.klub} · {v.liga}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  {NACIN[v.nacin] ?? v.nacin} · predlagal {v.avtor ?? '?'} · {datumUra(v.created_at)}
                </span>
                {v.razveljavljen_at ? (
                  <span>razveljavljeno</span>
                ) : (
                  <button
                    type="button"
                    className="znacka bg-white/10 text-slate-300"
                    disabled={dela}
                    onClick={() => void razveljavi(v.id)}
                  >
                    Razveljavi
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
