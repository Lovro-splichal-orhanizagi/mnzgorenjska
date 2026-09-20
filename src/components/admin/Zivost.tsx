// Koliko ljudi je res zivih, po tednih.
//
// Registriranih je 354, a to je enkraten dogodek izpred treh tednov. Vprasanje
// "koliko pravih uporabnikov imam" meri nekaj drugega: koliko jih vsak teden
// kaj naredi. Stejejo dejanja — glas, sporocilo, prijava odsotnosti,
// shranjena ekipa — ker obiskov ne merimo in se ta pogled ne pretvarja, da jih.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Teden {
  teden: string
  zacetek: string
  aktivnih: number
  novih: number
  glasovalcev: number
  klepetalcev: number
  urejalcev_ekipe: number
  javiteljev: number
}

interface Zivost {
  registriranih: number
  aktivnih_7dni: number
  aktivnih_30dni: number
  z_veljavno_ekipo: number
  prijavljenih_7dni: number
  mini_lig: number
  v_mini_ligah: number
}

export default function ZivostSkupnosti() {
  const [tedni, setTedni] = useState<Teden[]>([])
  const [zdaj, setZdaj] = useState<Zivost | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    ;(async () => {
      const [{ data: t, error: e1 }, { data: z, error: e2 }] = await Promise.all([
        supabase.rpc('admin_tedenska_aktivnost', { p_tednov: 12 }),
        supabase.rpc('admin_zivost'),
      ])
      if (!veljavno) return
      // Migracija in koda potujeta vsaka po svoji poti; brez nje naj razdelek
      // pove, da ga se ni, ne pa da je skupnost mrtva.
      if (e1 || e2) setNapaka((e1 ?? e2)?.message ?? 'Napaka.')
      // Tedne pred prvim dejanjem odrežemo: aplikacija takrat še ni
      // obstajala in osem praznih vrstic pove le to. Prazen teden MED
      // dejavnimi pa ostane — ta je podatek.
      const vsi = (t ?? []) as Teden[]
      const prvi = vsi.findIndex((x) => x.aktivnih > 0 || x.novih > 0)
      setTedni((prvi === -1 ? vsi : vsi.slice(prvi)).reverse())
      setZdaj(((z ?? []) as Zivost[])[0] ?? null)
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [])

  if (nalaganje) return <p className="text-slate-400">Nalaganje živosti …</p>
  if (napaka)
    return (
      <section className="kartica p-3 sm:p-4">
        <h2 className="font-bold">Živost skupnosti</h2>
        <p className="mt-1 text-sm text-amber-300">
          Statistike ni bilo mogoče prebrati: {napaka}
        </p>
      </section>
    )

  const najvec = Math.max(...tedni.map((t) => t.aktivnih), 1)

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">
          Živost skupnosti
          {/* Pas nad tem razdelkom je za IZBRANO ligo, te številke pa so
              skupne. Brez oznake stojita druga ob drugi dve različni meri. */}
          <span className="ml-2 text-xs font-normal text-slate-500">
            vse lige skupaj
          </span>
        </h2>
        <span className="text-xs text-slate-500">
          šteje dejanja, ne obiskov
        </span>
      </div>

      {zdaj && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stevilka oznaka="Registriranih" vrednost={zdaj.registriranih} />
          <Stevilka oznaka="Aktivnih 7 dni" vrednost={zdaj.aktivnih_7dni} poudari />
          <Stevilka oznaka="Aktivnih 30 dni" vrednost={zdaj.aktivnih_30dni} />
          <Stevilka oznaka="Z veljavno ekipo" vrednost={zdaj.z_veljavno_ekipo} />
          <Stevilka oznaka="Prijav 7 dni" vrednost={zdaj.prijavljenih_7dni} />
          <Stevilka oznaka="Mini lig" vrednost={zdaj.mini_lig} />
          <Stevilka oznaka="V mini ligah" vrednost={zdaj.v_mini_ligah} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1 pr-2 font-semibold">Teden</th>
              <th className="py-1 pr-2 font-semibold">Aktivnih</th>
              <th className="py-1 pr-2 font-semibold"></th>
              <th className="py-1 pr-2 text-right font-semibold">Novih</th>
              <th className="py-1 pr-2 text-right font-semibold">Glasov.</th>
              <th className="py-1 pr-2 text-right font-semibold">Ekipa</th>
              <th className="py-1 text-right font-semibold">Klepet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tedni.map((t, i) => (
              <tr key={t.teden} className={i === 0 ? 'text-slate-200' : ''}>
                <td className="py-1.5 pr-2 tabular-nums">
                  {t.teden}
                  {i === 0 && (
                    <span className="ml-1 text-[10px] text-slate-500">
                      (v teku)
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2 font-black tabular-nums">
                  {t.aktivnih}
                </td>
                <td className="w-32 py-1.5 pr-2">
                  <div
                    className="h-2 rounded-full bg-gnl-500/70"
                    style={{ width: `${(t.aktivnih / najvec) * 100}%` }}
                  />
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-400">
                  {t.novih || ''}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                  {t.glasovalcev || ''}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                  {t.urejalcev_ekipe || ''}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-500">
                  {t.klepetalcev || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Aktiven je, kdor je tisti teden glasoval, pisal v klepet, javil
        odsotnost ali shranil ekipo. <strong>Pretekli tedni so spodnja meja:</strong>{' '}
        pri ekipah se hrani samo zadnje shranjevanje, zato kdor je ekipo shranil
        večkrat, šteje le v zadnjem takem tednu. Glasovi, klepet in odsotnosti
        imajo polno zgodovino.
      </p>
    </section>
  )
}

function Stevilka({
  oznaka,
  vrednost,
  poudari = false,
}: {
  oznaka: string
  vrednost: number
  poudari?: boolean
}) {
  return (
    <div
      className={`rounded-lg px-2 py-2 text-center ${
        poudari ? 'bg-gnl-500/15 ring-1 ring-gnl-400/30' : 'bg-white/5'
      }`}
    >
      <div className="text-xl font-black tabular-nums">{vrednost}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {oznaka}
      </div>
    </div>
  )
}
