// Pivski zid: vsa piva (BMC in ročna), skrij ali pokaži sporočilo, dodaj
// ročno pivo, izbriši ročni vnos. Nakupov BMC se ne briše (le skrije).
//
// Zneskov ni, ker jih baza ne hrani. Vračila in testni nakupi so tu označeni,
// na zidu (/beers) jih ni.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Potrditev from './Potrditev'
import { datum } from '../../i18n'

interface Pivo {
  id: number
  zunanji_id: string | null
  ime: string | null
  piv: number
  sporocilo: string | null
  skrito: boolean
  vracilo: boolean
  test: boolean
  vir: string
  created_at: string
}

const danes = () => new Date().toISOString().slice(0, 10)
const PRAZEN = { ime: '', piv: '1', sporocilo: '', datum: '' }

export default function Piva() {
  const [piva, setPiva] = useState<Pivo[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [delam, setDelam] = useState(false)
  const [brisem, setBrisem] = useState<number | null>(null)
  const [nov, setNov] = useState(PRAZEN)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_piva')
    if (error) return setNapaka(error.message)
    setPiva((data ?? []) as Pivo[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  // Med zapisom so gumbi onemogočeni, da dvojni klik ne naredi dvakrat.
  async function zDelom(fn: () => Promise<string | null>) {
    if (delam) return
    setDelam(true)
    setNapaka(null)
    try {
      const n = await fn()
      if (n) setNapaka(n)
      else await nalozi()
    } finally {
      setDelam(false)
    }
  }

  const skrij = (p: Pivo) =>
    zDelom(async () => {
      const { error } = await supabase.rpc('admin_skrij_pivo', { p_id: p.id, p_skrito: !p.skrito })
      return error?.message ?? null
    })

  const izbrisi = (p: Pivo) =>
    zDelom(async () => {
      const { error } = await supabase.rpc('admin_izbrisi_pivo', { p_id: p.id })
      setBrisem(null)
      return error?.message ?? null
    })

  const dodaj = () =>
    zDelom(async () => {
      const piv = Number(nov.piv)
      if (!Number.isInteger(piv) || piv < 1 || piv > 1000) return 'Število piv mora biti celo število med 1 in 1000.'
      const { error } = await supabase.rpc('admin_dodaj_pivo', {
        p_ime: nov.ime.trim(),
        p_piv: piv,
        ...(nov.sporocilo.trim() ? { p_sporocilo: nov.sporocilo.trim() } : {}),
        ...(nov.datum ? { p_datum: nov.datum } : {}),
      })
      if (error) return error.message
      setNov(PRAZEN)
      return null
    })

  if (piva === null) return napaka ? <p className="text-sm text-rose-400">{napaka}</p> : null

  const vidnih = piva.filter((p) => !p.vracilo && !p.test).reduce((v, p) => v + p.piv, 0)

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">Pivski zid</h2>
        <span className="text-xs text-slate-500">
          {vidnih} piv na zidu ·{' '}
          <a href="/beers" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
            /beers
          </a>
        </span>
      </div>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}

      <div className="space-y-2 rounded-xl bg-white/5 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Dodaj pivo ročno</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_10rem]">
          <input
            value={nov.ime}
            onChange={(e) => setNov({ ...nov, ime: e.target.value })}
            placeholder="Ime (prazno = anonimno)"
            maxLength={60}
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={1000}
            value={nov.piv}
            onChange={(e) => setNov({ ...nov, piv: e.target.value })}
            aria-label="Število piv"
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={nov.datum}
            max={danes()}
            onChange={(e) => setNov({ ...nov, datum: e.target.value })}
            aria-label="Datum (prazno = danes)"
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
          />
        </div>
        <textarea
          value={nov.sporocilo}
          onChange={(e) => setNov({ ...nov, sporocilo: e.target.value })}
          placeholder="Sporočilo (neobvezno, do 500 znakov)"
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
        />
        <button onClick={dodaj} disabled={delam} className="gumb-glavni text-sm disabled:opacity-50">
          Dodaj
        </button>
      </div>

      {piva.length === 0 ? (
        <p className="text-sm text-slate-500">Na zidu še ni nobenega piva.</p>
      ) : (
        <ul className="divide-y divide-white/5 text-sm">
          {piva.map((p) => (
            <li key={p.id} className="space-y-1 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-semibold ${p.ime ? '' : 'italic text-slate-400'}`}>{p.ime ?? 'anonimno'}</span>
                <span className="text-xs tabular-nums text-gnl-300">{p.piv}× 🍺</span>
                <span className="text-xs text-slate-500">
                  {datum(p.created_at)} · {p.vir === 'rocno' ? 'ročno' : 'BMC'}
                </span>
                {p.vracilo && <span className="rounded bg-rose-500/20 px-1.5 text-xs text-rose-200">vračilo</span>}
                {p.test && <span className="rounded bg-amber-500/20 px-1.5 text-xs text-amber-200">test</span>}
                {p.skrito && <span className="rounded bg-white/10 px-1.5 text-xs text-slate-300">sporočilo skrito</span>}
                <span className="ml-auto flex gap-2">
                  {p.sporocilo && (
                    <button onClick={() => skrij(p)} disabled={delam} className="gumb-tih text-xs disabled:opacity-50">
                      {p.skrito ? 'pokaži sporočilo' : 'skrij sporočilo'}
                    </button>
                  )}
                  {p.vir === 'rocno' && (
                    <button
                      onClick={() => setBrisem(p.id)}
                      disabled={delam || brisem === p.id}
                      className="text-xs text-slate-500 hover:text-rose-300 disabled:opacity-50"
                    >
                      izbriši
                    </button>
                  )}
                </span>
              </div>
              {p.sporocilo && (
                <p className={`whitespace-pre-line break-words text-xs ${p.skrito ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                  {p.sporocilo}
                </p>
              )}
              {brisem === p.id && (
                <Potrditev potrdi={() => izbrisi(p)} preklici={() => setBrisem(null)} zaseden={delam} gumb="Da, izbriši">
                  Izbrišem ročni vnos <strong>{p.ime ?? 'anonimno'}</strong> ({p.piv}× pivo)?
                </Potrditev>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
