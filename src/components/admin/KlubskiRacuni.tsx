// Administracija → Klubi: klubski računi in vrsta zahtevkov (migracija
// 20261013201100). Brez kluba: izberi klub. Polno: izberi račun za preklic.
// Nov naslov: preveri povezavo (dokaz), nato potrdi ali zavrni z razlogom.
// Igralci, ki jih je dodal klub (20261024123700) in po 6 tednih še niso
// nastopili: pusti ali odstrani (kdor ga ima v ekipi, ga le umakne s trga).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/baza.types'

type Zahtevek = Database['public']['Functions']['admin_klubski_zahtevki']['Returns'][number]
type Racun = Database['public']['Functions']['admin_klubski_racuni']['Returns'][number]
type BrezNastopa = Database['public']['Functions']['admin_klubski_igralci_brez_nastopa']['Returns'][number]

const VRSTA: Record<string, string> = {
  brez_kluba: 'naslov brez kluba',
  polno: 'klub ima 5 računov',
  nov_naslov: 'nov naslov',
}

export default function KlubskiRacuni() {
  const [zahtevki, setZahtevki] = useState<Zahtevek[] | null>(null)
  const [racuni, setRacuni] = useState<Racun[]>([])
  const [brezNastopa, setBrezNastopa] = useState<BrezNastopa[]>([])
  const [napaka, setNapaka] = useState<string | null>(null)
  const [klubZa, setKlubZa] = useState<Record<number, string>>({})
  const [preklicZa, setPreklicZa] = useState<Record<number, string>>({})
  const [razlogZa, setRazlogZa] = useState<Record<number, string>>({})

  const nalozi = useCallback(async () => {
    const [z, r, b] = await Promise.all([
      supabase.rpc('admin_klubski_zahtevki'),
      supabase.rpc('admin_klubski_racuni'),
      supabase.rpc('admin_klubski_igralci_brez_nastopa'),
    ])
    if (z.error || r.error) return setNapaka((z.error ?? r.error)!.message)
    setZahtevki(z.data ?? [])
    setRacuni(r.data ?? [])
    setBrezNastopa((b.data ?? []).filter((x) => x.aktiven))
  }, [])
  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function odloci(z: Zahtevek, potrdi: boolean) {
    const { error } = await supabase.rpc('admin_odloci_klubski_zahtevek', {
      p_id: z.id,
      p_potrdi: potrdi,
      p_team_id: klubZa[z.id] ? Number(klubZa[z.id]) : undefined,
      p_razlog: razlogZa[z.id] || undefined,
      p_preklici_racun: preklicZa[z.id] ? Number(preklicZa[z.id]) : undefined,
    })
    if (error) return setNapaka(error.message)
    setNapaka(null)
    await nalozi()
  }

  async function preklici(r: Racun) {
    const { error } = await supabase.rpc('admin_preklici_klubski_racun', { p_id: r.id })
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  async function odstraniIgralca(id: number) {
    const { error } = await supabase.rpc('admin_odstrani_klubskega_igralca', { p_player_id: id })
    if (error) return setNapaka(error.message)
    await nalozi()
  }

  if (zahtevki === null) return napaka ? <p className="text-sm text-rose-400">{napaka}</p> : null
  const odprti = zahtevki.filter((z) => z.status === 'odprt')
  const aktivni = racuni.filter((r) => !r.preklican_at)

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <h2 className="font-bold">
        Klubi
        <span className="znacka ml-2 bg-sky-400/20 text-sky-200">{aktivni.length} računov</span>
        {odprti.length > 0 && <span className="znacka ml-2 bg-amber-400/20 text-amber-200">{odprti.length} čaka</span>}
      </h2>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {odprti.length === 0 ? (
        <p className="text-sm text-slate-500">Ni odprtih zahtevkov.</p>
      ) : (
        <ul className="space-y-2">
          {odprti.map((z) => (
            <li key={z.id} className="space-y-1 rounded-xl bg-white/5 p-2 text-sm">
              <div>
                <b>{z.team_name ?? '(klub neznan)'}</b> · {VRSTA[z.vrsta] ?? z.vrsta} · {z.email}
                {z.display_name && <> · {z.display_name}</>}
                {z.vloga && <> · {z.vloga}</>}
                {z.team_id && <> · računov: {z.racunov_kluba}/5</>}
              </div>
              {z.dokaz_url && (
                <a href={z.dokaz_url} target="_blank" rel="noreferrer noopener" className="text-sky-300 underline">
                  {z.dokaz_url}
                </a>
              )}
              {z.opomba && <p className="text-slate-400">{z.opomba}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {!z.team_id && (
                  <input
                    placeholder="team_id kluba"
                    value={klubZa[z.id] ?? ''}
                    onChange={(e) => setKlubZa({ ...klubZa, [z.id]: e.target.value })}
                    className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                  />
                )}
                {z.team_id && z.racunov_kluba >= 5 && (
                  <select
                    value={preklicZa[z.id] ?? ''}
                    onChange={(e) => setPreklicZa({ ...preklicZa, [z.id]: e.target.value })}
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                  >
                    <option value="">prekliči račun …</option>
                    {aktivni
                      .filter((r) => r.team_id === z.team_id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.email}
                        </option>
                      ))}
                  </select>
                )}
                <button type="button" className="gumb-glavni text-xs" onClick={() => void odloci(z, true)}>
                  Potrdi
                </button>
                <input
                  placeholder="razlog zavrnitve"
                  value={razlogZa[z.id] ?? ''}
                  onChange={(e) => setRazlogZa({ ...razlogZa, [z.id]: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
                <button type="button" className="gumb-tih text-xs" onClick={() => void odloci(z, false)}>
                  Zavrni
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-slate-400">Aktivni računi ({aktivni.length})</summary>
        <ul className="mt-2 divide-y divide-white/5 text-sm">
          {aktivni.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-1">
              <span>
                <b>{r.team_name}</b> · {r.email} · od {new Date(r.created_at).toLocaleDateString('sl-SI')}
              </span>
              <button type="button" className="text-xs text-rose-300 underline" onClick={() => void preklici(r)}>
                prekliči
              </button>
            </li>
          ))}
        </ul>
      </details>
      {brezNastopa.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-slate-400">
            Dodani igralci brez nastopa po 6 tednih ({brezNastopa.length})
          </summary>
          <ul className="mt-2 divide-y divide-white/5 text-sm">
            {brezNastopa.map((b) => (
              <li key={b.igralec} className="flex items-center justify-between gap-2 py-1">
                <span>
                  <b>{b.ime}</b> · {b.klub} · {b.liga} · dodan {new Date(b.dodan).toLocaleDateString('sl-SI')}
                  {b.lastnikov > 0 && ` · ${b.lastnikov} v ekipah`}
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-300 underline"
                  onClick={() => void odstraniIgralca(b.igralec)}
                >
                  odstrani
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
