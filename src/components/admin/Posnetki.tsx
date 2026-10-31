// Posnetki izložbe preverjenih igralcev: moderacija.
//
// Stikalo `posnetki_igralcev`: 0 nihče, 1 admin in preizkuševalci (iz
// Preverjeni), 2 vsi. Vsak nov posnetek čaka na pregled; javno in klubom v
// SLFF Club se pokaže šele odobren. Zavrnitev potrebuje razlog (vidi ga
// lastnik). Tri prijave vrnejo posnetek v pregled. Izbris odstrani posnetek
// tudi iz Cloudflare Stream (funkcija posnetki-igralca).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ogledi as naloziOglede, posnetki as klic, trajanjeBesedilo, type Ogled } from '../../lib/izlozba'
import { Link } from '../Povezava'

interface Vrstica {
  id: number
  player_id: number
  player_name: string | null
  team_name: string | null
  liga: string | null
  lastnik: string | null
  naslov: string
  stanje: string
  pregled: string
  razlog: string | null
  trajanje: number | null
  created_at: string
  pregledan_at: string | null
  prijav: number
  razlogi_prijav: string[]
  pravica: boolean
}

const STIKALO = [
  ['0', 'Izklopljeno (nihče)'],
  ['1', 'Preizkus (admin in preizkuševalci)'],
  ['2', 'V živo (vsi)'],
] as const

const cas = (d: string) => new Date(d).toLocaleString('sl-SI', { dateStyle: 'short', timeStyle: 'short' })

export default function Posnetki() {
  const [stikalo, setStikalo] = useState<string | null>(null)
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [oglediV, setOglediV] = useState<Map<number, Ogled>>(new Map())
  const [predvajam, setPredvajam] = useState<number | null>(null)
  const [razlogi, setRazlogi] = useState<Record<number, string>>({})
  const [napaka, setNapaka] = useState<string | null>(null)
  const [obvestilo, setObvestilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const [n, p] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'posnetki_igralcev').maybeSingle(),
      supabase.rpc('admin_posnetki'),
    ])
    if (p.error) return setNapaka(p.error.message)
    setStikalo(String(n.data?.value ?? '0'))
    const v = (p.data ?? []) as Vrstica[]
    setVrstice(v)
    setOglediV(await naloziOglede(v.filter((x) => x.stanje === 'pripravljen').map((x) => x.id).slice(0, 12)))
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function izvedi(fn: () => PromiseLike<{ error: { message: string } | null }>, ok?: string) {
    setDela(true)
    setNapaka(null)
    setObvestilo(null)
    const { error } = await fn()
    setDela(false)
    if (error) return setNapaka(error.message)
    if (ok) setObvestilo(ok)
    await nalozi()
  }

  async function izbrisi(v: Vrstica) {
    if (!window.confirm(`Izbrišem posnetek "${v.naslov}" (${v.player_name})? Izbriše se tudi v Streamu.`)) return
    setDela(true)
    const r = await klic({ akcija: 'izbrisi', id: v.id })
    setDela(false)
    if (r.napaka) return setNapaka(r.napaka)
    await nalozi()
  }

  async function pocisti() {
    setDela(true)
    const r = await klic<{ izbrisanih: number; streamu: number }>({ akcija: 'pocisti' })
    setDela(false)
    if (r.napaka) return setNapaka(r.napaka)
    setObvestilo(`Počiščeno: ${r.data?.izbrisanih ?? 0} vrstic, ${r.data?.streamu ?? 0} videov v Streamu.`)
    await nalozi()
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Posnetki igralcev</h2>
      <p className="text-sm text-slate-400">
        Izložba preverjenih polnoletnih igralcev. Posnetek je javen (profil in SLFF Club) šele, ko ga odobriš.
        Zavrnitev potrebuje razlog, ki ga vidi lastnik.
      </p>

      <div className="kartica flex flex-wrap items-center gap-3 p-3 text-sm">
        <span className="font-semibold">Stikalo posnetkov:</span>
        {STIKALO.map(([v, oznaka]) => (
          <label key={v} className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="stikalo-posnetkov"
              checked={stikalo === v}
              disabled={dela}
              onChange={() => izvedi(() => supabase.from('settings').update({ value: v }).eq('key', 'posnetki_igralcev'))}
            />
            {oznaka}
          </label>
        ))}
        <button type="button" onClick={pocisti} disabled={dela} className="gumb-tih ml-auto text-xs">
          Počisti zdaj
        </button>
      </div>

      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {obvestilo && <p className="text-sm text-gnl-300">{obvestilo}</p>}

      {vrstice.length === 0 ? (
        <p className="text-sm text-slate-500">Ni posnetkov v pregledu, prijavljenih ali odločenih v zadnjih 30 dneh.</p>
      ) : (
        <ul className="space-y-3">
          {vrstice.map((v) => {
            const o = oglediV.get(v.id)
            return (
              <li key={v.id} className="kartica space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{v.naslov}</p>
                    <p className="text-xs text-slate-400">
                      <Link to={`/player/${v.player_id}`} className="hover:underline">{v.player_name}</Link>
                      {' · '}{v.team_name} · {v.liga} · lastnik {v.lastnik ?? '?'} · {cas(v.created_at)}
                      {v.trajanje != null && ` · ${trajanjeBesedilo(v.trajanje)}`}
                    </p>
                    <p className="text-xs">
                      <span className={v.pregled === 'odobren' ? 'text-gnl-300' : v.pregled === 'zavrnjen' ? 'text-rose-300' : 'text-amber-200'}>
                        {v.pregled}
                      </span>
                      <span className="text-slate-500"> · {v.stanje}</span>
                      {!v.pravica && <span className="text-rose-300"> · pravica ne velja (skrito)</span>}
                      {v.razlog && <span className="text-slate-400"> · razlog: {v.razlog}</span>}
                    </p>
                    {v.prijav > 0 && (
                      <p className="text-xs text-rose-300">
                        Prijav: {v.prijav}
                        {v.razlogi_prijav.length > 0 && ` — ${v.razlogi_prijav.join(' | ')}`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o?.predvajaj && (
                      <button type="button" className="gumb-tih text-xs" onClick={() => setPredvajam(predvajam === v.id ? null : v.id)}>
                        {predvajam === v.id ? 'Skrij' : 'Predvajaj'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={dela || v.stanje !== 'pripravljen'}
                      className="gumb-glavni text-xs"
                      onClick={() => izvedi(() => supabase.rpc('admin_odloci_posnetek', { p_id: v.id, p_odobri: true }), 'Odobreno.')}
                    >
                      Odobri
                    </button>
                    <button type="button" disabled={dela} className="text-xs text-slate-500 hover:text-rose-300" onClick={() => izbrisi(v)}>
                      Izbriši
                    </button>
                  </div>
                </div>
                {predvajam === v.id && o?.predvajaj && (
                  <div className="relative aspect-video max-w-xl overflow-hidden rounded-xl bg-black">
                    <iframe
                      src={`${o.predvajaj}&autoplay=true`}
                      title={v.naslov}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {o && !o.predvajaj && v.stanje === 'pripravljen' && (
                  <p className="text-xs text-slate-500">Preizkusni način (brez Cloudflare): predvajanja ni.</p>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void izvedi(
                      () => supabase.rpc('admin_odloci_posnetek', { p_id: v.id, p_odobri: false, p_razlog: razlogi[v.id] ?? '' }),
                      'Zavrnjeno.',
                    )
                  }}
                >
                  <input
                    value={razlogi[v.id] ?? ''}
                    onChange={(e) => setRazlogi((r) => ({ ...r, [v.id]: e.target.value }))}
                    maxLength={300}
                    placeholder="Razlog zavrnitve (vidi ga lastnik)"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs"
                  />
                  <button type="submit" disabled={dela || !(razlogi[v.id] ?? '').trim()} className="gumb-tih text-xs">
                    Zavrni
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
