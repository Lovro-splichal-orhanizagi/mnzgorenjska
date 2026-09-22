// Rast po ligah: katera raste, katera stoji.
//
// Zivost skupnosti sesteje vse lige skupaj in odgovori na "koliko ljudi je
// zivih". Ta razdelek odgovarja na drugo vprasanje — kam poslati naslednje
// pismo. Pri petindvajsetih ligah ena skupna crta tega ne pove.
//
// Ena kartica na ligo (male mnozice) namesto petindvajsetih crt v enem
// grafu: barve za petindvajset vrst ni, ki bi jih clovek locil, oblika
// posamezne lige pa je tu vse, kar steje.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
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
  zveza: string
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
    const m = new Map<number, Liga>()
    for (const v of vrstice) {
      const l = m.get(v.competition_id) ?? {
        id: v.competition_id,
        ime: v.name,
        zveza: v.federation,
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
  }, [vrstice])

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

  const skupaj = lige.reduce((v, l) => v + l.ekip, 0)
  const skupajNovih = lige.reduce((v, l) => v + l.novih, 0)

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

      <p className="text-sm text-slate-400">
        Skupaj <strong className="text-slate-200">{skupaj}</strong> ekip
        {skupajNovih > 0 && (
          <>
            , ta teden <strong className="text-gnl-300">+{skupajNovih}</strong>
          </>
        )}
        .
      </p>

      {tabela ? (
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
              {lige.map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5 pr-2">
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
          {lige.map((l) => (
            <div key={l.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{l.ime}</div>
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
