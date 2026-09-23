// Ob prvem obisku: kje želiš igrati?
//
// Doslej je nov obiskovalec tiho pristal na Gorenjski (`PRIVZETO = 'clani'`).
// Ob eni zvezi je bilo to prav; ob dveh je narobe — nekdo iz Ljubljane bi
// sestavljal gorenjsko ekipo, ne da bi opazil.
//
// Kdor ligo že ima izbrano, tega ne vidi nikoli. To je bistveno: obstoječi
// uporabniki iz Gorenjske ne smejo opaziti nobene spremembe.
//
// Zaslon se da preskočiti. Kdor je prišel samo pogledat lestvico, ne sme
// naleteti na zid; preskok pomeni privzeto ligo, kakor doslej.
//
// Vprašanje počaka poldrugo sekundo. Modalno okno, ki pade čez stran, preden
// je ta sploh narisana, vpraša nekoga, ki še ne ve, kaj ga sprašujemo — in
// prvo dejanje na strani je zapiranje okna. Po zamiku obiskovalec vidi, da
// je prišel na fantasy ligo, in šele nato izbira.
//
// Ob vsaki ligi piše, koliko ekip že igra. Sedemnajst lig je in v trinajstih
// je manj kot pet ekip — novinec, ki slepo izbere prazno, nima nasprotnikov in
// se ne vrne. Število ni okras, ampak edino, kar mu to pove vnaprej.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTekmovanje } from '../lib/tekmovanje'
import { supabase } from '../lib/supabase'
import { mnozina, EKIPE } from '../lib/pomozno'
import { poZvezah } from './IzbirnikLige'

const KLJUC_PRESKOKA = 'slff-prvi-obisk'

/** Ali smo uporabnika že vprašali (ali je sam izbral ligo). */
export function zeVprasan(): boolean {
  try {
    return (
      localStorage.getItem(KLJUC_PRESKOKA) === 'da' ||
      Boolean(localStorage.getItem('slff-tekmovanje'))
    )
  } catch {
    // Zasebno okno: raje ne vprašamo, kot da bi vprašali ob vsakem nalaganju.
    return true
  }
}

function zapomniSi() {
  try {
    localStorage.setItem(KLJUC_PRESKOKA, 'da')
  } catch {
    /* zasebno okno — vprašanje se bo pojavilo spet, kar je manjše zlo */
  }
}

const ZAMIK_MS = 1500

export default function PrviObisk() {
  const { tekmovanja, nastavi } = useTekmovanje()
  const [skrit, setSkrit] = useState(() => zeVprasan())
  const [cas, setCas] = useState(false)
  const [drzava, setDrzava] = useState<string | null>(null)
  const [ekip, setEkip] = useState<Record<number, number>>({})
  const { pathname } = useLocation()
  // Povezava na klub ali povabilo v mini ligo že pove, kam človek gre — liga
  // je v naslovu ali pa je sploh ne rabi, okno bi ga le zmotilo.
  const vabljen = pathname.startsWith('/klub/') || pathname.startsWith('/l/')
  const okno = useRef<HTMLDivElement | null>(null)

  const zapri = () => {
    zapomniSi()
    setSkrit(true)
  }

  useEffect(() => {
    if (skrit) return
    const t = window.setTimeout(() => setCas(true), ZAMIK_MS)
    return () => window.clearTimeout(t)
  }, [skrit])

  // Število ekip naložimo takoj, da je ob prikazu že tu in se okno ne dopolnjuje
  // pred očmi. Šteje baza, po ligi posebej: seznam vseh ekip bi PostgREST
  // tiho odrezal pri tisoč vrsticah.
  useEffect(() => {
    if (skrit || !tekmovanja.length) return
    let veljavno = true
    ;(async () => {
      const stevila = await Promise.all(
        tekmovanja.map((t) =>
          supabase
            .from('fantasy_team_standings')
            .select('*', { count: 'exact', head: true })
            .eq('competition_id', t.id)
            .then(({ count }) => [t.id, count ?? 0] as const),
        ),
      )
      if (!veljavno) return
      setEkip(Object.fromEntries(stevila))
    })()
    return () => {
      veljavno = false
    }
  }, [skrit, tekmovanja])

  const prikazan = !skrit && cas && !vabljen && tekmovanja.length >= 2
  useEffect(() => {
    if (!prikazan) return
    okno.current?.focus()
    const tipka = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        zapomniSi()
        setSkrit(true)
      }
    }
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [prikazan])

  const drzave = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tekmovanja)
      if (t.country_code) m.set(t.country_code, t.country_name ?? t.country_code)
    return [...m.entries()]
  }, [tekmovanja])

  const skupine = useMemo(
    () => poZvezah(tekmovanja.filter((t) => !drzava || t.country_code === drzava)),
    [tekmovanja, drzava],
  )

  // Dokler se lige ne naložijo ali dokler ne mine zamik, ni kaj pokazati.
  if (!prikazan) return null

  // Ena sama država: koraka za državo ne pokažemo, ker ni izbire. Ko jih bo
  // več, se pojavi sam.
  const potrebnaDrzava = drzave.length > 1 && !drzava

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
      <div
        ref={okno}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prvi-obisk-naslov"
        tabIndex={-1}
        className="animiraj-vstop w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl outline-none"
      >
        <h2 id="prvi-obisk-naslov" className="text-xl font-black naslov">Kje želiš igrati?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Izberi ligo, v kateri boš sestavil ekipo in tekmoval. Pokažemo ti
          njene igralce in lestvico; pozneje jo lahko kadarkoli zamenjaš zgoraj.
        </p>

        {potrebnaDrzava ? (
          <div className="mt-4 space-y-1.5">
            {drzave.map(([koda, ime]) => (
              <button
                key={koda}
                onClick={() => setDrzava(koda)}
                className="block w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/10"
              >
                {ime}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {skupine.map((s) => (
              <div key={s.kljuc}>
                <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {s.naslov}
                </div>
                {s.lige.map((t) => {
                  const n = ekip[t.id] ?? 0
                  return (
                    <button
                      key={t.slug}
                      onClick={() => {
                        nastavi(t.slug)
                        zapri()
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left text-sm hover:bg-gnl-500/20"
                    >
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      <span
                        className={`shrink-0 text-xs tabular-nums ${
                          n >= 5 ? 'text-gnl-300' : 'text-slate-500'
                        }`}
                      >
                        {n === 0 ? 'še brez ekip' : mnozina(n, EKIPE)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          {drzava && drzave.length > 1 ? (
            <button
              onClick={() => setDrzava(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Nazaj
            </button>
          ) : (
            <span />
          )}
          <button onClick={zapri} className="text-xs text-slate-500 hover:text-slate-300">
            Preskoči
          </button>
        </div>
      </div>
    </div>
  )
}
