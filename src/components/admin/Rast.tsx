// Rast: uporabniki, ekipe in namestitve aplikacije po dnevih.
//
// Vse pride iz enega klica `admin_rast(od)`. Namestitve zapisuje delovni tok
// *Trgovine* (scripts/trgovine.mjs) enkrat na dan; dan brez vrstice nosi
// zadnji znani seštevek naprej, da črta ne pade na nič.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Crta, { type Tocka } from '../Crta'
import { datumUra } from '../../i18n'

interface Dan {
  dan: string
  novi_uporabniki: number
  skupaj_uporabnikov: number
  nove_ekipe: number
  obiskovalcev: number | null
  ios_skupaj: number | null
  ios_novi: number | null
  android_skupaj: number | null
  android_novi: number | null
}

interface Stanje {
  trgovina: string
  stanje: string | null
  posodobljeno: string
  mejnik: number | null
}

interface Rast {
  dnevi: Dan[]
  stanje: Stanje[]
}

const kratekDatum = (d: string) => `${Number(d.slice(8, 10))}. ${Number(d.slice(5, 7))}.`
const vsota = (dnevi: Dan[], kljuc: 'novi_uporabniki' | 'nove_ekipe') =>
  dnevi.reduce((s, d) => s + d[kljuc], 0)

/** Seštevek namestitev z zadnjo znano vrednostjo za dneve brez poročila. */
function naprej(dnevi: Dan[], kljuc: 'ios_skupaj' | 'android_skupaj'): Tocka[] {
  let zadnja = 0
  return dnevi.map((d) => {
    zadnja = d[kljuc] ?? zadnja
    return { oznaka: kratekDatum(d.dan), vrednost: zadnja }
  })
}

/** Dnevni stolpci; vrednost dneva pove `title` ob dotiku ali miški. */
function Stolpci({ tocke, barva = '#34d399' }: { tocke: Tocka[]; barva?: string }) {
  if (tocke.length < 2) return null
  const najvec = Math.max(1, ...tocke.map((t) => t.vrednost))
  const sirina = 100 / tocke.length
  return (
    <div>
      <div className="flex gap-1.5">
        <div className="flex h-20 shrink-0 flex-col justify-between text-right text-[10px] leading-none tabular-nums text-slate-500">
          <span>{najvec}</span>
          <span>0</span>
        </div>
        <svg
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          className="h-20 min-w-0 flex-1 border-l border-white/10"
          role="img"
          aria-label={tocke.map((t) => `${t.oznaka} ${t.vrednost}`).join(', ')}
        >
          {tocke.map((t, i) => {
            const h = (t.vrednost / najvec) * 78
            return (
              <rect
                key={i}
                x={i * sirina + sirina * 0.1}
                y={80 - h}
                width={sirina * 0.8}
                height={h}
                fill={barva}
              >
                <title>{`${t.oznaka}: ${t.vrednost}`}</title>
              </rect>
            )
          })}
        </svg>
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-slate-500">
        <span>{tocke[0].oznaka}</span>
        <span>{tocke.at(-1)!.oznaka}</span>
      </div>
    </div>
  )
}

function Kpi({ oznaka, vrednost, opomba }: { oznaka: string; vrednost: number | string; opomba?: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-xl font-black tabular-nums">{vrednost}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{oznaka}</div>
      {opomba && <div className="mt-0.5 truncate text-[11px] text-slate-400">{opomba}</div>}
    </div>
  )
}

function Graf({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <h3 className="mb-1.5 text-sm font-semibold">{naslov}</h3>
      {children}
    </div>
  )
}

export default function Rast() {
  const [dni, setDni] = useState(90)
  const [rast, setRast] = useState<Rast | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    const od = new Date(Date.now() - (dni - 1) * 86400000).toISOString().slice(0, 10)
    supabase.rpc('admin_rast', { p_od: od }).then(({ data, error }) => {
      if (!veljavno) return
      setNapaka(error?.message ?? null)
      setRast((data as unknown as Rast | null) ?? null)
    })
    return () => {
      veljavno = false
    }
  }, [dni])

  const dnevi = useMemo(() => rast?.dnevi ?? [], [rast])
  const zadnjih = (n: number) => dnevi.slice(-n)
  const ios = naprej(dnevi, 'ios_skupaj')
  const android = naprej(dnevi, 'android_skupaj')
  const iosStanje = rast?.stanje.find((s) => s.trgovina === 'ios')
  const gumb = (izbran: boolean) =>
    `rounded-full px-2.5 py-1 text-xs ${
      izbran ? 'bg-gnl-500/25 text-gnl-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
    }`

  if (napaka) return <p className="text-sm text-amber-300">Rasti ni bilo mogoče naložiti: {napaka}</p>
  if (!rast) return <p className="text-slate-400">Nalaganje rasti …</p>

  return (
    <section className="kartica space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">
          Rast
          <span className="ml-2 text-xs font-normal text-slate-500">zadnjih {dni} dni</span>
        </h2>
        <div className="flex gap-1.5">
          {[30, 90, 365].map((d) => (
            <button key={d} onClick={() => setDni(d)} className={gumb(dni === d)}>
              {d} dni
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi oznaka="Uporabnikov" vrednost={dnevi.at(-1)?.skupaj_uporabnikov ?? 0} />
        <Kpi oznaka="Novih 7 dni" vrednost={vsota(zadnjih(7), 'novi_uporabniki')} />
        <Kpi oznaka="Novih 30 dni" vrednost={vsota(zadnjih(30), 'novi_uporabniki')} />
        <Kpi oznaka={`Novih ekip (${dni} dni)`} vrednost={vsota(dnevi, 'nove_ekipe')} />
        <Kpi
          oznaka="iOS namestitev"
          vrednost={ios.at(-1)?.vrednost ?? 0}
          opomba={iosStanje?.stanje ?? undefined}
        />
        <Kpi oznaka="Android namestitev" vrednost={android.at(-1)?.vrednost ?? 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Graf naslov="Uporabnikov skupaj">
          <Crta os tocke={dnevi.map((d) => ({ oznaka: kratekDatum(d.dan), vrednost: d.skupaj_uporabnikov }))} />
        </Graf>
        <Graf naslov="Novi uporabniki na dan">
          <Stolpci tocke={dnevi.map((d) => ({ oznaka: kratekDatum(d.dan), vrednost: d.novi_uporabniki }))} />
        </Graf>
        <Graf naslov="Nove ekipe na dan (brez hišnih)">
          <Stolpci
            barva="#60a5fa"
            tocke={dnevi.map((d) => ({ oznaka: kratekDatum(d.dan), vrednost: d.nove_ekipe }))}
          />
        </Graf>
        <Graf naslov="Obiskovalcev na dan (najbolj obiskana stran, spodnja meja)">
          <Stolpci
            barva="#a78bfa"
            tocke={dnevi.map((d) => ({ oznaka: kratekDatum(d.dan), vrednost: d.obiskovalcev ?? 0 }))}
          />
        </Graf>
        <Graf naslov="iOS namestitev skupaj (App Store)">
          <Crta os barva="#f472b6" tocke={ios} />
        </Graf>
        <Graf naslov="Android namestitev skupaj (Google Play)">
          <Crta os barva="#fbbf24" tocke={android} />
        </Graf>
      </div>
      <p className="text-[11px] text-slate-500">
        Namestitve osveži delovni tok Trgovine vsak dan ob 7.30 UTC; Apple in Google
        poročilo objavita z dan ali dva zamika.
        {iosStanje && ` Stanje iOS preverjeno ${datumUra(iosStanje.posodobljeno)}.`}
      </p>
    </section>
  )
}
