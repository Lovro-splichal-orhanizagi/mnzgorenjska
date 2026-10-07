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
//
// Tujec (IP iz države brez lig, `vprasajDrzavo`) najprej izbere državo
// ("🇸🇮 Slovenija · 🇸🇰 Slovensko"), nato njeno ligo. Državi sta iz vseh
// aktivnih lig, ker `tekmovanja` hrani le lige trenutne države.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTekmovanje } from '../lib/tekmovanje'
import { supabase } from '../lib/supabase'
import { vseVrstice } from '../lib/strani'
import { mnozina, EKIPE } from '../lib/pomozno'
import { poZvezah } from './IzbirnikLige'
import { t } from '../i18n'
import { KLJUC_VSTOPA, drzaveZLigami, preklopiDrzavo, zastava } from '../lib/drzava'
import { imeDrzave } from './IzbiraDrzave'

// Vstop `/sk` doda ligo v naslov sam; to ni izbira obiskovalca.
export { oznaciVstopDrzave } from '../lib/drzava'

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

/** Ali je obiskovalec prišel s povezavo, ki že nosi ligo (`?t=…`). */
// Oznako vstopa le preberemo; pobriše jo učinek ob prvem izrisu. Branje z
// brisanjem je v StrictMode (dvojni klic začetne vrednosti) okno skrilo.
function ligaVPovezavi(): boolean {
  try {
    if (sessionStorage.getItem(KLJUC_VSTOPA)) return false
    return new URLSearchParams(window.location.search).has('t')
  } catch {
    return false
  }
}

export default function PrviObisk() {
  const { tekmovanja, vsaTekmovanja, drzava: drzavaLige, vprasajDrzavo, nastavi } = useTekmovanje()
  // Povezava z ligo (`?t=sk-za-1trieda` v mailu klubu, deljena lestvica)
  // pove, katero ligo človek gleda — vprašanje "kje želiš igrati?" bi ga
  // le zmedlo. Bere se ob prvem izrisu, preden aplikacija sama doda `?t=`.
  const [skrit, setSkrit] = useState(() => zeVprasan() || ligaVPovezavi())
  useEffect(() => {
    try {
      sessionStorage.removeItem(KLJUC_VSTOPA)
    } catch {
      /* zasebno okno */
    }
  }, [])
  const [cas, setCas] = useState(false)
  const [drzava, setDrzava] = useState<string | null>(null)
  const [ekip, setEkip] = useState<Record<number, number>>({})
  const { pathname } = useLocation()
  // Povezava na klub, igralca, ekipo ali povabilo v mini ligo že pove, kam
  // človek gre — okno bi ga le zmotilo.
  const vabljen =
    pathname.startsWith('/club/') ||
    pathname.startsWith('/l/') ||
    // Deljena kartica igralca ali plakat ekipe: kdor pride od tam (pogosto
    // starši), naj najprej vidi, kar mu je kdo poslal.
    pathname.startsWith('/player/') ||
    pathname.startsWith('/team/') ||
    pathname.startsWith('/match/')
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
  // pred očmi. Beremo tabelo `fantasy_teams`, ne pogleda lestvice: ta za vsako
  // ligo sešteje točke vseh krogov in petindvajset hkratnih štetij je bazo
  // zasulo, da je lestvica vsem padla na časovni omejitvi. Po straneh, ker bi
  // PostgREST seznam tiho odrezal pri tisoč vrsticah.
  useEffect(() => {
    if (skrit || !vsaTekmovanja.length) return
    let veljavno = true
    vseVrstice<{ competition_id: number }>((od, do_) =>
      supabase.from('fantasy_teams').select('competition_id').order('id').range(od, do_),
    )
      .then((vrstice) => {
        if (!veljavno) return
        const stevila: Record<number, number> = {}
        for (const t of vsaTekmovanja) stevila[t.id] = 0
        for (const v of vrstice) stevila[v.competition_id] = (stevila[v.competition_id] ?? 0) + 1
        setEkip(stevila)
      })
      // Brez števil je okno še vedno uporabno; ne kaži napake.
      .catch(() => {})
    return () => {
      veljavno = false
    }
  }, [skrit, vsaTekmovanja])

  const prikazan =
    !skrit && cas && !vabljen && (vprasajDrzavo ? vsaTekmovanja : tekmovanja).length >= 2
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

  // Vse države z aktivnimi ligami — `tekmovanja` ima le lige ene države.
  const drzave = useMemo(() => drzaveZLigami(vsaTekmovanja), [vsaTekmovanja])

  const skupine = useMemo(
    () =>
      poZvezah(drzava ? vsaTekmovanja.filter((t) => t.country_code === drzava) : tekmovanja),
    [tekmovanja, vsaTekmovanja, drzava],
  )

  // Dokler se lige ne naložijo ali dokler ne mine zamik, ni kaj pokazati.
  if (!prikazan) return null

  // Korak države le za tujca (IP iz države brez lig) in le, ko je izbira.
  // Ostali dobijo lige ugibane države, kot doslej.
  const potrebnaDrzava = vprasajDrzavo && drzave.length > 1 && !drzava

  // Okno kaže lige ugibane države; če se je ugib zmotil (Slovenec na
  // slovaškem IP), je tu majhna povezava na drugo. Stran se naloži znova v
  // jeziku te države in okno vpraša znova, z njenimi ligami.
  const druge = drzaveZLigami(vsaTekmovanja).filter((d) => d !== drzavaLige)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pb-[max(1rem,var(--dno))] pt-[max(1rem,var(--vrh))] backdrop-blur">
      <div
        ref={okno}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prvi-obisk-naslov"
        tabIndex={-1}
        className="animiraj-vstop max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl outline-none"
      >
        <h2 id="prvi-obisk-naslov" className="text-xl font-black naslov">
          {t('aplikacija.prviObisk.naslov')}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {t(potrebnaDrzava ? 'aplikacija.prviObisk.drzavaOpis' : 'aplikacija.prviObisk.opis')}
        </p>

        {potrebnaDrzava ? (
          <div className="mt-4 space-y-1.5">
            {drzave.map((koda) => (
              <button
                key={koda}
                onClick={() => setDrzava(koda)}
                className="block w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/10"
              >
                <span aria-hidden="true">{zastava(koda)} </span>
                {imeDrzave(koda)}
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
                {s.lige.map((liga) => {
                  const n = ekip[liga.id] ?? 0
                  return (
                    <button
                      key={liga.slug}
                      onClick={() => {
                        nastavi(liga.slug)
                        zapri()
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left text-sm hover:bg-gnl-500/20"
                    >
                      <span className="min-w-0 flex-1 truncate">{liga.name}</span>
                      <span
                        className={`shrink-0 text-xs tabular-nums ${
                          n >= 5 ? 'text-gnl-300' : 'text-slate-500'
                        }`}
                      >
                        {n === 0 ? t('aplikacija.prviObisk.brezEkip') : mnozina(n, EKIPE)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          {vprasajDrzavo && drzava && drzave.length > 1 ? (
            <button
              onClick={() => setDrzava(null)}
              className="inline-flex min-h-[44px] items-center px-2 text-sm text-slate-400 hover:text-slate-200"
            >
              {t('aplikacija.prviObisk.nazaj')}
            </button>
          ) : druge.length && !potrebnaDrzava ? (
            <span className="flex gap-3">
              {druge.map((koda) => (
                <button
                  key={koda}
                  onClick={() => preklopiDrzavo(koda, vsaTekmovanja, { izberiLigo: false })}
                  className="inline-flex min-h-[44px] items-center px-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  <span aria-hidden="true">{zastava(koda)} </span>
                  {t('aplikacija.prviObisk.drugaDrzava', { drzava: imeDrzave(koda) })}
                </button>
              ))}
            </span>
          ) : (
            <span />
          )}
          <button onClick={zapri} className="inline-flex min-h-[44px] items-center px-2 text-sm text-slate-500 hover:text-slate-300">
            {t('aplikacija.prviObisk.preskoci')}
          </button>
        </div>
      </div>
    </div>
  )
}
