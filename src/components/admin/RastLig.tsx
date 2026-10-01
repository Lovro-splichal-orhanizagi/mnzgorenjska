// Rast po ligah: katera raste, katera stoji.
//
// Zivost skupnosti sesteje vse lige skupaj in odgovori na "koliko ljudi je
// zivih". Ta razdelek odgovarja na drugo vprasanje — kam poslati naslednje
// pismo. Pri petindvajsetih ligah ena skupna crta tega ne pove.
//
// Ena kartica na ligo (male mnozice) namesto petindvajsetih crt v enem
// grafu: barve za petindvajset vrst ni, ki bi jih clovek locil, oblika
// posamezne lige pa je tu vse, kar steje.
//
// Vsaka kartica ima svojo os (vrh in nic ob robu): brez nje sta liga z eno
// in liga s sto ekipami videti enako. "Skupna skala" da vsem isti vrh, da se
// velikosti primerjajo na pogled. Drzava pride iz seznama lig v kontekstu,
// zato RPC ostaja nespremenjen.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTekmovanje } from '../../lib/tekmovanje'
import { drzaveZLigami, zastava } from '../../lib/drzava'
import { imeDrzave } from '../IzbiraDrzave'
import Crta from '../Crta'

interface Vrstica {
  competition_id: number
  slug: string
  name: string
  federation: string
  teden: string
  ekip: number
  novih: number
  aktivnih: number
}

interface Liga {
  id: number
  ime: string
  slug: string
  zveza: string
  drzava: string | null
  ekip: number
  novih: number
  aktivnih: number
  tedni: Vrstica[]
}

const TEDNOV = 12

/** "2026-09-22" → "22. 9." */
function kratekDatum(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}. ${d.getMonth() + 1}.`
}

export default function RastLig() {
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [tabela, setTabela] = useState(false)
  const [drzava, setDrzava] = useState<string | null>(null)
  const [iskanje, setIskanje] = useState('')
  const [skupnaSkala, setSkupnaSkala] = useState(false)
  const { vsaTekmovanja } = useTekmovanje()

  useEffect(() => {
    let veljavno = true
    ;(async () => {
      const { data, error } = await supabase.rpc('admin_rast_lig', {
        p_tednov: TEDNOV,
      })
      if (!veljavno) return
      if (error) setNapaka(error.message)
      else setVrstice((data ?? []) as Vrstica[])
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [])

  const lige = useMemo(() => {
    const drzavaLige = new Map(vsaTekmovanja.map((t) => [t.id, t.country_code]))
    const m = new Map<number, Liga>()
    for (const v of vrstice) {
      const l = m.get(v.competition_id) ?? {
        id: v.competition_id,
        ime: v.name,
        slug: v.slug,
        zveza: v.federation,
        drzava: drzavaLige.get(v.competition_id) ?? null,
        ekip: 0,
        novih: 0,
        aktivnih: 0,
        tedni: [],
      }
      l.tedni.push(v)
      m.set(v.competition_id, l)
    }
    for (const l of m.values()) {
      const zadnji = l.tedni[l.tedni.length - 1]
      l.ekip = zadnji?.ekip ?? 0
      l.novih = zadnji?.novih ?? 0
      l.aktivnih = zadnji?.aktivnih ?? 0
    }
    // Najvecje najprej: pri petindvajsetih ligah je vrstni red edina navigacija.
    return [...m.values()].sort((a, b) => b.ekip - a.ekip || a.ime.localeCompare(b.ime))
  }, [vrstice, vsaTekmovanja])

  const drzave = useMemo(() => drzaveZLigami(vsaTekmovanja), [vsaTekmovanja])

  const vidne = useMemo(() => {
    const iskano = iskanje.trim().toLowerCase()
    return lige.filter(
      (l) =>
        (!drzava || l.drzava === drzava) &&
        (!iskano || `${l.ime} ${l.zveza} ${l.slug}`.toLowerCase().includes(iskano)),
    )
  }, [lige, drzava, iskanje])

  const vrh = useMemo(
    () => Math.max(1, ...vidne.flatMap((l) => l.tedni.map((t) => t.ekip))),
    [vidne],
  )

  if (nalaganje) return <p className="text-slate-400">Nalaganje rasti …</p>
  if (napaka)
    return (
      <section className="kartica p-3 sm:p-4">
        <h2 className="font-bold">Rast po ligah</h2>
        <p className="mt-1 text-sm text-amber-300">
          Statistike ni bilo mogoče prebrati: {napaka}
        </p>
      </section>
    )

  const skupaj = vidne.reduce((v, l) => v + l.ekip, 0)
  const skupajNovih = vidne.reduce((v, l) => v + l.novih, 0)
  const gumb = (izbran: boolean) =>
    `rounded-full px-2.5 py-1 text-xs ${
      izbran ? 'bg-gnl-500/25 text-gnl-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
    }`

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">
          Rast po ligah
          <span className="ml-2 text-xs font-normal text-slate-500">
            ekipe po tednih, zadnjih {TEDNOV}
          </span>
        </h2>
        <button
          onClick={() => setTabela(!tabela)}
          className="text-xs text-slate-400 underline hover:text-gnl-300"
        >
          {tabela ? 'Pokaži grafe' : 'Pokaži tabelo'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setDrzava(null)} className={gumb(drzava === null)}>
          Vse ({lige.length})
        </button>
        {drzave.map((d) => (
          <button key={d} onClick={() => setDrzava(d)} className={gumb(drzava === d)}>
            {zastava(d)} {imeDrzave(d)} ({lige.filter((l) => l.drzava === d).length})
          </button>
        ))}
        <input
          type="search"
          value={iskanje}
          onChange={(e) => setIskanje(e.target.value)}
          placeholder="Išči ligo ali zvezo …"
          aria-label="Išči ligo ali zvezo"
          className="min-w-[10rem] flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
        />
        {!tabela && (
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={skupnaSkala}
              onChange={(e) => setSkupnaSkala(e.target.checked)}
            />
            Skupna skala
          </label>
        )}
      </div>

      <p className="text-sm text-slate-400">
        {vidne.length < lige.length && <>{vidne.length} lig · </>}
        Skupaj <strong className="text-slate-200">{skupaj}</strong> ekip
        {skupajNovih > 0 && (
          <>
            , ta teden <strong className="text-gnl-300">+{skupajNovih}</strong>
          </>
        )}
        .
      </p>

      {vidne.length === 0 ? (
        <p className="text-sm text-slate-500">Nobena liga ne ustreza izbiri.</p>
      ) : tabela ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1 pr-2 font-semibold">Liga</th>
                <th className="py-1 pr-2 text-right font-semibold">Ekip</th>
                <th className="py-1 pr-2 text-right font-semibold">Ta teden</th>
                <th className="py-1 text-right font-semibold">Aktivnih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vidne.map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5 pr-2">
                    {l.drzava && <span aria-hidden="true">{zastava(l.drzava)} </span>}
                    {l.ime}
                    <span className="ml-1.5 text-xs text-slate-500">{l.zveza}</span>
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{l.ekip}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-gnl-300">
                    {l.novih > 0 ? `+${l.novih}` : '—'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-400">
                    {l.aktivnih}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vidne.map((l) => (
            <div key={l.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {l.drzava && <span aria-hidden="true">{zastava(l.drzava)} </span>}
                    {l.ime}
                  </div>
                  <div className="text-[11px] text-slate-500">{l.zveza}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xl font-black tabular-nums text-slate-100">
                    {l.ekip}
                  </div>
                  <div className="text-[11px] text-gnl-300">
                    {l.novih > 0 ? `+${l.novih} ta teden` : 'brez novih'}
                  </div>
                </div>
              </div>
              <div className="mt-1.5">
                <Crta
                  os
                  najvec={skupnaSkala ? vrh : undefined}
                  tocke={l.tedni.map((t) => ({
                    oznaka: kratekDatum(t.teden),
                    vrednost: t.ekip,
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
