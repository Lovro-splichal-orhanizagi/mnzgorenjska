// Preverjeni igralci (faza 1, brez plačil).
//
// Stikalo `preverjeni_racuni`: 0 nihče ne vidi ničesar, 1 le admin in
// preizkuševalci, 2 vsi. Pravico (kljukica in dodatki profila) zdaj dodeli le
// admin potrjenemu profilu; plačilo pride pozneje.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { pozabiPreverjene } from '../../lib/preverjeni'
import { Link } from '../Povezava'

interface Profil {
  zahtevek_id: number
  player_id: number
  player_name: string | null
  team_name: string | null
  liga: string | null
  user_id: string
  prosilec: string | null
  email: string | null
  pravica_id: number | null
  vir: string | null
  status: string | null
  velja_do: string | null
  dodeljena_at: string | null
  velja: boolean
}

interface Tester {
  user_id: string
  display_name: string | null
  email: string | null
}

const STIKALO = [
  ['0', 'Izklopljeno (nihče)'],
  ['1', 'Preizkus (admin in preizkuševalci)'],
  ['2', 'V živo (vsi)'],
] as const

const dan = (d: string) => new Date(d).toLocaleDateString('sl-SI')

export default function Preverjeni() {
  const [stikalo, setStikalo] = useState<string | null>(null)
  const [profili, setProfili] = useState<Profil[]>([])
  const [testerji, setTesterji] = useState<Tester[]>([])
  const [uporabniki, setUporabniki] = useState<Tester[]>([])
  const [iskanje, setIskanje] = useState('')
  const [iskanjeTesterja, setIskanjeTesterja] = useState('')
  const [roki, setRoki] = useState<Record<number, string>>({})
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const [n, p, te] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'preverjeni_racuni').maybeSingle(),
      supabase.rpc('admin_preverjeni'),
      supabase.rpc('admin_testerji'),
    ])
    const e = p.error ?? te.error
    if (e) return setNapaka(e.message)
    setStikalo(String(n.data?.value ?? '0'))
    setProfili((p.data ?? []) as Profil[])
    setTesterji((te.data ?? []) as Tester[])
  }, [])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  // Uporabnike za preizkuševalce naloži šele, ko jih admin išče.
  useEffect(() => {
    if (iskanjeTesterja.trim().length < 2 || uporabniki.length) return
    void supabase.rpc('admin_uporabniki', {}).then(({ data, error }) => {
      if (error) return setNapaka(error.message)
      const vsi = new Map<string, Tester>()
      for (const u of data ?? []) vsi.set(u.user_id, { user_id: u.user_id, display_name: u.display_name, email: u.email })
      setUporabniki([...vsi.values()])
    })
  }, [iskanjeTesterja, uporabniki.length])

  async function izvedi(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    if (dela) return
    setDela(true)
    setNapaka(null)
    const { error } = await fn()
    setDela(false)
    if (error) return setNapaka(error.message)
    pozabiPreverjene()
    await nalozi()
  }

  const nastaviStikalo = (v: string) =>
    izvedi(() => supabase.from('settings').update({ value: v }).eq('key', 'preverjeni_racuni'))

  const zadetkiProfilov = useMemo(() => {
    const niz = iskanje.trim().toLowerCase()
    const vsi = niz
      ? profili.filter((p) =>
          [p.player_name, p.prosilec, p.email, p.team_name, p.liga].some((v) => v?.toLowerCase().includes(niz)),
        )
      : profili.filter((p) => p.velja)
    return vsi.slice(0, 50)
  }, [profili, iskanje])

  const zadetkiUporabnikov = useMemo(() => {
    const niz = iskanjeTesterja.trim().toLowerCase()
    if (niz.length < 2) return []
    const ze = new Set(testerji.map((t) => t.user_id))
    return uporabniki
      .filter((u) => !ze.has(u.user_id) && [u.display_name, u.email].some((v) => v?.toLowerCase().includes(niz)))
      .slice(0, 10)
  }, [uporabniki, testerji, iskanjeTesterja])

  return (
    <section className="kartica space-y-4 p-3 sm:p-4">
      <div>
        <h2 className="font-bold">Preverjeni igralci</h2>
        <p className="text-sm text-slate-400">
          Modra kljukica in dodatki profila za potrjene igralce. Plačila še ni: pravico dodeli admin (vir "ročno").
        </p>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold">Stikalo</legend>
        <div className="flex flex-wrap gap-2">
          {STIKALO.map(([v, opis]) => (
            <button
              key={v}
              type="button"
              disabled={dela || stikalo === null}
              onClick={() => v !== stikalo && void nastaviStikalo(v)}
              aria-pressed={stikalo === v}
              className={`rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 disabled:opacity-50 ${
                stikalo === v ? 'bg-sky-500/30 font-bold text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {v} · {opis}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Preizkuševalci ({testerji.length})</h3>
        <ul className="space-y-1 text-sm">
          {testerji.map((te) => (
            <li key={te.user_id} className="flex flex-wrap items-center gap-2">
              <span>{te.display_name ?? '?'}</span>
              <span className="text-xs text-slate-500">{te.email}</span>
              <button
                type="button"
                disabled={dela}
                onClick={() => izvedi(() => supabase.rpc('admin_nastavi_testerja', { p_user_id: te.user_id, p_dodaj: false }))}
                className="text-xs text-slate-500 hover:text-rose-300"
              >
                odstrani
              </button>
            </li>
          ))}
        </ul>
        <input
          value={iskanjeTesterja}
          onChange={(e) => setIskanjeTesterja(e.target.value)}
          placeholder="Dodaj: ime ali e-naslov …"
          aria-label="Poišči uporabnika za preizkuševalca"
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm sm:max-w-sm"
        />
        {zadetkiUporabnikov.length > 0 && (
          <ul className="space-y-1 text-sm">
            {zadetkiUporabnikov.map((u) => (
              <li key={u.user_id}>
                <button
                  type="button"
                  disabled={dela}
                  onClick={() =>
                    izvedi(async () => {
                      const r = await supabase.rpc('admin_nastavi_testerja', { p_user_id: u.user_id, p_dodaj: true })
                      if (!r.error) setIskanjeTesterja('')
                      return r
                    })
                  }
                  className="text-left hover:text-gnl-300"
                >
                  + {u.display_name ?? '?'} <span className="text-xs text-slate-500">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          Potrjeni profili ({profili.filter((p) => p.velja).length} preverjenih od {profili.length})
        </h3>
        <input
          value={iskanje}
          onChange={(e) => setIskanje(e.target.value)}
          placeholder="Išči igralca, uporabnika, klub … (prazno: le preverjeni)"
          aria-label="Išči potrjen profil"
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm sm:max-w-sm"
        />
        <ul className="divide-y divide-white/5 text-sm">
          {zadetkiProfilov.map((p) => (
            <li key={p.zahtevek_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <Link to={`/player/${p.player_id}`} className="font-semibold hover:text-gnl-300">
                  {p.player_name}
                </Link>
                <span className="ml-2 text-xs text-slate-500">
                  {[p.team_name, p.liga].filter(Boolean).join(' · ')}
                </span>
                <div className="text-xs text-slate-400">
                  {p.prosilec} · {p.email}
                  {p.pravica_id != null && (
                    <span className={p.velja ? 'ml-2 text-sky-300' : 'ml-2 text-slate-500'}>
                      {p.velja ? 'preverjen' : p.status === 'aktiven' ? 'potekel' : p.status} ({p.vir}
                      {p.velja_do ? `, do ${dan(p.velja_do)}` : ', brez roka'}
                      {p.dodeljena_at ? `, od ${dan(p.dodeljena_at)}` : ''})
                    </span>
                  )}
                </div>
              </div>
              {p.velja ? (
                <button
                  type="button"
                  disabled={dela}
                  onClick={() => {
                    if (!window.confirm(`Odvzamem kljukico igralcu ${p.player_name}?`)) return
                    void izvedi(() => supabase.rpc('admin_odvzemi_preverjen', { p_id: p.pravica_id! }))
                  }}
                  className="text-xs text-slate-500 hover:text-rose-300"
                >
                  Odvzemi
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={roki[p.zahtevek_id] ?? ''}
                    onChange={(e) => setRoki((r) => ({ ...r, [p.zahtevek_id]: e.target.value }))}
                    aria-label={`Velja do (prazno: brez roka) za ${p.player_name}`}
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    disabled={dela}
                    onClick={() =>
                      izvedi(() =>
                        supabase.rpc('admin_dodeli_preverjen', {
                          p_player_id: p.player_id,
                          p_vir: 'rocno',
                          p_velja_do: roki[p.zahtevek_id] ? new Date(`${roki[p.zahtevek_id]}T23:59:59`).toISOString() : undefined,
                        }),
                      )
                    }
                    className="gumb-glavni text-xs disabled:opacity-50"
                  >
                    Dodeli
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </section>
  )
}
