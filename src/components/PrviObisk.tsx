// Ob prvem obisku: katero ligo gledaš?
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
import { useMemo, useState } from 'react'
import { useTekmovanje } from '../lib/tekmovanje'
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

export default function PrviObisk() {
  const { tekmovanja, nastavi } = useTekmovanje()
  const [skrit, setSkrit] = useState(() => zeVprasan())
  const [drzava, setDrzava] = useState<string | null>(null)

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

  // Dokler se lige ne naložijo, ni kaj ponuditi.
  if (skrit || tekmovanja.length < 2) return null

  const zapri = () => {
    zapomniSi()
    setSkrit(true)
  }

  // Ena sama država: koraka za državo ne pokažemo, ker ni izbire. Ko jih bo
  // več, se pojavi sam.
  const potrebnaDrzava = drzave.length > 1 && !drzava

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
      <div className="animiraj-vstop w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <h2 className="text-xl font-black naslov">Katero ligo spremljaš?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Da ti pokažemo prave igralce in lestvico. Pozneje jo lahko kadarkoli
          zamenjaš zgoraj.
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
                {s.lige.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => {
                      nastavi(t.slug)
                      zapri()
                    }}
                    className="mb-1 block w-full truncate rounded-xl bg-white/5 px-3 py-2 text-left text-sm hover:bg-gnl-500/20"
                  >
                    {t.name}
                  </button>
                ))}
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
