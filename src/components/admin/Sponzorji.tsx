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
import Potrditev from './Potrditev'

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

// Povezava sponzorja se izriše kot <a href>: `javascript:` ali `data:` bi
// na klik pognal kodo v strani. Zato le http(s).
function jeSpletniNaslov(v: string) {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

// Logotip je lahko pot na naši strani (/sponzorji/x.png) ali http(s) naslov.
const jeLogotip = (v: string) => (v.startsWith('/') && !v.startsWith('//')) || jeSpletniNaslov(v)

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
  // Kateri sponzor čaka na potrditev izbrisa, in ali zapis ravno teče.
  const [brisem, setBrisem] = useState<number | null>(null)
  const [delam, setDelam] = useState(false)

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

  // Vsi zapisi gredo skozi to: med izvajanjem so gumbi onemogočeni, da dvojni
  // klik ne vstavi sponzorja dvakrat ali preklopi vidnosti tja in nazaj.
  async function zDelom(fn: () => Promise<void>) {
    if (delam) return
    setDelam(true)
    try {
      await fn()
    } finally {
      setDelam(false)
    }
  }

  const preklopiVidnost = () =>
    zDelom(async () => {
      const nova = vidni ? '0' : '1'
      const { error } = await supabase
        .from('settings')
        .update({ value: nova })
        .eq('key', 'sponzorji_vidni')
      if (error) return setNapaka(error.message)
      setVidni(!vidni)
    })

  const dodaj = () => zDelom(dodajZdaj)

  async function dodajZdaj() {
    setNapaka(null)
    if (!nov.name.trim() || !nov.url.trim())
      return setNapaka('Ime in povezava sta obvezna.')
    if (!jeSpletniNaslov(nov.url.trim()))
      return setNapaka('Povezava mora biti spletni naslov, ki se začne s http:// ali https://.')
    if (nov.logo_url.trim() && !jeLogotip(nov.logo_url.trim()))
      return setNapaka('Logotip mora biti pot na strani (/sponzorji/…) ali naslov http(s)://.')
    const [vrsta, vrednost] = nov.doseg.split(':')
    let competition_id: number | null = null
    let federation_id: number | null = null
    let country_id: number | null = null
    if (vrsta === 'liga') competition_id = Number(vrednost)
    // Če iskanje zveze ali države ne uspe, NE shranimo: prazen doseg pomeni
    // "Povsod" in sponzor iz Kranja bi se tiho pokazal vsem.
    if (vrsta === 'zveza') {
      const { data: f, error: eF } = await supabase
        .from('federations')
        .select('id')
        .eq('code', vrednost)
        .maybeSingle()
      if (eF || !f) return setNapaka(`Zveze ${vrednost} ni bilo mogoče najti${eF ? `: ${eF.message}` : ''}. Sponzor ni shranjen.`)
      federation_id = f.id
    }
    if (vrsta === 'drzava') {
      const { data: d, error: eD } = await supabase
        .from('countries')
        .select('id')
        .eq('code', vrednost)
        .maybeSingle()
      if (eD || !d) return setNapaka(`Države ${vrednost} ni bilo mogoče najti${eD ? `: ${eD.message}` : ''}. Sponzor ni shranjen.`)
      country_id = d.id
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

  const preklopi = (s: Sponzor) =>
    zDelom(async () => {
      const { error } = await supabase
        .from('sponsors')
        .update({ active: !s.active, updated_at: new Date().toISOString() })
        .eq('id', s.id)
      if (error) return setNapaka(error.message)
      await nalozi()
    })

  // Brez window.confirm — glej Potrditev.tsx.
  const odstrani = (s: Sponzor) =>
    zDelom(async () => {
      const { error } = await supabase.from('sponsors').delete().eq('id', s.id)
      setBrisem(null)
      if (error) return setNapaka(error.message)
      await nalozi()
    })

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
          <input type="checkbox" checked={vidni} onChange={preklopiVidnost} disabled={delam} />
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
              <button
                onClick={() => preklopi(s)}
                disabled={delam}
                className="gumb-tih shrink-0 text-xs disabled:opacity-50"
              >
                {s.active ? 'ugasni' : 'vklopi'}
              </button>
              <button
                onClick={() => setBrisem(s.id)}
                disabled={delam || brisem === s.id}
                className="shrink-0 text-xs text-slate-500 hover:text-rose-300 disabled:opacity-50"
              >
                izbriši
              </button>
              {brisem === s.id && (
                <div className="w-full">
                  <Potrditev
                    potrdi={() => odstrani(s)}
                    preklici={() => setBrisem(null)}
                    zaseden={delam}
                    gumb="Da, izbriši"
                  >
                    Izbrišem sponzorja <strong>{s.name}</strong>? Z njim gredo tudi
                    števci prikazov in klikov.
                  </Potrditev>
                </div>
              )}
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
            <button onClick={dodaj} disabled={delam} className="gumb-glavni text-sm disabled:opacity-50">
              {delam ? 'Shranjujem …' : 'Dodaj'}
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
