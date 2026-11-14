import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/baza.types'

type Prijava = Database['public']['Functions']['admin_prijave_napak']['Returns'][number]

/**
 * Napake v podatkih, ki jih je javil klepet podpore (`prijavi_napako`):
 * pozicija, manjkajoč igralec, rezultat, asistenca, cena. Admin popravi
 * podatek po svoji poti in prijavo zapre; stik je le za odgovor prijavitelju.
 */
export default function PrijaveNapak() {
  const [stanje, setStanje] = useState<'odprta' | 'resena' | 'zavrnjena'>('odprta')
  const [vrstice, setVrstice] = useState<Prijava[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_prijave_napak', { p_stanje: stanje })
    if (error) return setNapaka(error.message)
    setVrstice(data ?? [])
  }, [stanje])

  useEffect(() => {
    setVrstice(null)
    void nalozi()
  }, [nalozi])

  async function zapri(id: number, novo: 'odprta' | 'resena' | 'zavrnjena') {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('admin_resi_prijavo_napake', { p_id: id, p_stanje: novo })
    setDela(false)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Prijave napak (klepet)</h2>
      <p className="text-sm text-slate-400">
        Napake v podatkih, ki so jih uporabniki javili v klepetu podpore. Popravi podatek in prijavo zapri.
      </p>
      <div className="flex gap-2 text-xs">
        {(['odprta', 'resena', 'zavrnjena'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStanje(s)}
            className={`rounded-md px-2 py-0.5 ring-1 ring-white/10 ${s === stanje ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            {s === 'odprta' ? 'Odprte' : s === 'resena' ? 'Rešene' : 'Zavrnjene'}
          </button>
        ))}
      </div>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {vrstice === null ? (
        <p className="text-sm text-slate-400">Nalaganje …</p>
      ) : vrstice.length === 0 ? (
        <p className="text-sm text-slate-400">Ni prijav.</p>
      ) : (
        <ul className="kartica divide-y divide-white/10">
          {vrstice.map((v) => (
            <li key={v.id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="znacka bg-white/5">{v.vrsta}</span>
                <span className="font-semibold">
                  {[v.igralec, v.klub, v.liga].filter(Boolean).join(' · ') || `#${v.id}`}
                </span>
                <span className="text-xs text-slate-500">
                  #{v.id} · {new Date(v.created_at).toLocaleString('sl-SI')}
                </span>
              </div>
              <p className="text-slate-300">{v.opis}</p>
              {v.pravilno && <p className="text-xs text-slate-400">Pravilno: {v.pravilno}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {v.player_id && (
                  <a className="underline" href={`/player/${v.player_id}${v.liga_slug ? `?t=${v.liga_slug}` : ''}`}>
                    igralec
                  </a>
                )}
                {v.kontakt && <span>stik: {v.kontakt}</span>}
                {v.opomba && <span>opomba: {v.opomba}</span>}
                {stanje === 'odprta' ? (
                  <>
                    <button
                      onClick={() => zapri(v.id, 'resena')}
                      disabled={dela}
                      className="rounded-md bg-gnl-500/20 px-2 py-0.5 text-gnl-200 hover:bg-gnl-500/30"
                    >
                      Rešeno
                    </button>
                    <button
                      onClick={() => zapri(v.id, 'zavrnjena')}
                      disabled={dela}
                      className="rounded-md px-2 py-0.5 ring-1 ring-white/10 hover:bg-white/5"
                    >
                      Zavrni
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => zapri(v.id, 'odprta')}
                    disabled={dela}
                    className="rounded-md px-2 py-0.5 ring-1 ring-white/10 hover:bg-white/5"
                  >
                    Odpri znova
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
