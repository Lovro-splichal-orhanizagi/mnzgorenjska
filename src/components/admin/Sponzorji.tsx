// Sponzorska mesta.
//
// Doseg je hierarhicen: liga > zveza (regija) > drzava > vsi. Sponzor iz
// Kranja naj se pokaze Gorenjcem in ne Prekmurcem, sponzor lige samo v tisti
// ligi. Najbolj dolocen zadetek zmaga.
//
// Dokler nastavitev `sponzorji_vidni` ni 1, se na strani ne pokaze nic —
// tukaj se sponzorje pripravi, vklopi pa jih stikalo.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTekmovanje } from '../../lib/tekmovanje'

interface Sponzor {
  id: number
  name: string
  logo_url: string | null
  url: string
  claim: string | null
  country_id: number | null
  federation_id: number | null
  competition_id: number | null
  doseg_ime: string
  starts_on: string | null
  ends_on: string | null
  utez: number
  active: boolean
  opomba: string | null
  prikazov: number
  klikov: number
}

const PRAZEN = {
  name: '',
  url: '',
  claim: '',
  logo_url: '',
  doseg: '',
  opomba: '',
}

export default function Sponzorji() {
  const { tekmovanja } = useTekmovanje()
  const [sponzorji, setSponzorji] = useState<Sponzor[] | null>(null)
  const [vidni, setVidni] = useState(false)
  const [nov, setNov] = useState(PRAZEN)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [odprto, setOdprto] = useState(false)

  const nalozi = useCallback(async () => {
    const [{ data, error }, { data: n }] = await Promise.all([
      supabase.rpc('admin_sponzorji'),
      supabase.from('settings').select('value').eq('key', 'sponzorji_vidni').maybeSingle(),
    ])
    if (error) return setNapaka(error.message)
    setSponzorji((data ?? []) as Sponzor[])
    setVidni(String(n?.value ?? '0') === '1')
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  // Doseg izberemo z enim spustnim seznamom; vrednost pove, katero polje
  // pisemo. Zvezo in drzavo naslovimo s SIFRO — pogled tekmovanj nosi kodo,
  // ne id-ja, id pa poisce baza ob vpisu.
  const dosegi = useMemo(() => {
    const zveze = new Map<string, string>()
    const drzave = new Map<string, string>()
    for (const t of tekmovanja) {
      if (t.federation_code)
        zveze.set(t.federation_code, t.federation_name ?? t.federation_code)
      if (t.country_code)
        drzave.set(t.country_code, t.country_name ?? t.country_code)
    }
    return {
      lige: tekmovanja.map((t) => ({ id: t.id, ime: t.name })),
      zveze: [...zveze.entries()],
      drzave: [...drzave.entries()],
    }
  }, [tekmovanja])

  async function preklopiVidnost() {
    const nova = vidni ? '0' : '1'
    const { error } = await supabase
      .from('settings')
      .update({ value: nova })
      .eq('key', 'sponzorji_vidni')
    if (error) return setNapaka(error.message)
    setVidni(!vidni)
  }

  async function dodaj() {
    setNapaka(null)
    if (!nov.name.trim() || !nov.url.trim())
      return setNapaka('Ime in povezava sta obvezna.')
    const [vrsta, vrednost] = nov.doseg.split(':')
    let competition_id: number | null = null
    let federation_id: number | null = null
    let country_id: number | null = null
    if (vrsta === 'liga') competition_id = Number(vrednost)
    if (vrsta === 'zveza') {
      const { data: f } = await supabase
        .from('federations')
        .select('id')
        .eq('code', vrednost)
        .maybeSingle()
      federation_id = f?.id ?? null
    }
    if (vrsta === 'drzava') {
      const { data: d } = await supabase
        .from('countries')
        .select('id')
        .eq('code', vrednost)
        .maybeSingle()
      country_id = d?.id ?? null
    }
    const { error } = await supabase.from('sponsors').insert({
      name: nov.name.trim(),
      url: nov.url.trim(),
      claim: nov.claim.trim() || null,
      logo_url: nov.logo_url.trim() || null,
      opomba: nov.opomba.trim() || null,
      competition_id,
      federation_id,
      country_id,
    })
    if (error) return setNapaka(error.message)
    setNov(PRAZEN)
    setOdprto(false)
    await nalozi()
  }

  async function preklopi(s: Sponzor) {
    const { error } = await supabase
      .from('sponsors')
      .update({ active: !s.active, updated_at: new Date().toISOString() })
      .eq('id', s.id)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  async function odstrani(s: Sponzor) {
    if (!confirm(`Izbrišem sponzorja ${s.name}?`)) return
    const { error } = await supabase.from('sponsors').delete().eq('id', s.id)
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  if (sponzorji === null) return null

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          Sponzorji
          <span className="ml-2 text-xs font-normal text-slate-500">
            liga › zveza › država
          </span>
        </h2>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={vidni} onChange={preklopiVidnost} />
          Prikaži na strani
        </label>
      </div>

      {!vidni && (
        <p className="rounded-lg bg-white/5 p-2 text-xs text-slate-400">
          Mesta so pripravljena, a skrita: dokler stikalo ni vklopljeno, jih
          obiskovalec ne vidi nikjer.
        </p>
      )}
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}

      {sponzorji.length === 0 ? (
        <p className="text-sm text-slate-500">Ni še nobenega sponzorja.</p>
      ) : (
        <ul className="divide-y divide-white/5 text-sm">
          {sponzorji.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <span className={s.active ? 'font-semibold' : 'font-semibold text-slate-500'}>
                  {s.name}
                </span>
                <span className="ml-2 text-xs text-slate-500">{s.doseg_ime}</span>
                {s.claim && (
                  <div className="truncate text-xs text-slate-400">{s.claim}</div>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                {s.prikazov} prikazov · {s.klikov} klikov
              </span>
              <button onClick={() => preklopi(s)} className="gumb-tih shrink-0 text-xs">
                {s.active ? 'ugasni' : 'vklopi'}
              </button>
              <button
                onClick={() => odstrani(s)}
                className="shrink-0 text-xs text-slate-500 hover:text-rose-300"
              >
                izbriši
              </button>
            </li>
          ))}
        </ul>
      )}

      {odprto ? (
        <div className="space-y-2 rounded-xl bg-white/5 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={nov.name}
              onChange={(e) => setNov({ ...nov, name: e.target.value })}
              placeholder="Ime sponzorja"
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
            />
            <input
              value={nov.url}
              onChange={(e) => setNov({ ...nov, url: e.target.value })}
              placeholder="https://povezava"
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
            />
            <input
              value={nov.claim}
              onChange={(e) => setNov({ ...nov, claim: e.target.value })}
              placeholder="Ena vrstica besedila (neobvezno)"
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
            />
            <input
              value={nov.logo_url}
              onChange={(e) => setNov({ ...nov, logo_url: e.target.value })}
              placeholder="/sponzorji/logo.png (neobvezno)"
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
            />
            <select
              value={nov.doseg}
              onChange={(e) => setNov({ ...nov, doseg: e.target.value })}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
            >
              <option value="">Povsod</option>
              <optgroup label="Država">
                {dosegi.drzave.map(([koda, ime]) => (
                  <option key={koda} value={`drzava:${koda}`}>
                    {ime}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Zveza (regija)">
                {dosegi.zveze.map(([koda, ime]) => (
                  <option key={koda} value={`zveza:${koda}`}>
                    {ime}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Posamezna liga">
                {dosegi.lige.map((l) => (
                  <option key={l.id} value={`liga:${l.id}`}>
                    {l.ime}
                  </option>
                ))}
              </optgroup>
            </select>
            <input
              value={nov.opomba}
              onChange={(e) => setNov({ ...nov, opomba: e.target.value })}
              placeholder="Interna opomba (kontakt, cena)"
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={dodaj} className="gumb-glavni text-sm">
              Dodaj
            </button>
            <button onClick={() => setOdprto(false)} className="gumb-tih text-sm">
              Prekliči
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOdprto(true)} className="gumb-tih text-sm">
          Dodaj sponzorja
        </button>
      )}
    </section>
  )
}
