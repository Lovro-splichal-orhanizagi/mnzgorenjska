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
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { supabase } from '../lib/supabase'
import { mnozina, EKIPE } from '../lib/pomozno'
import { poZvezah, ustreza } from './IzbirnikLige'
import { t } from '../i18n'
import { KLJUC_VSTOPA, drzaveZLigami, preklopiDrzavo, zaznajTujca } from '../lib/drzava'
import { drzavaVstopa } from '../lib/drzavaUgib'
import Zastava from './Zastava'
import { imeDrzave } from './IzbiraDrzave'
import ZelimLigo from './ZelimLigo'

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
  const { tekmovanja, vsaTekmovanja, ligeSveze, drzava: drzavaLige, vprasajDrzavo: tujec, nastavi } =
    useTekmovanje()
  // Po državi vpraša le gola naslovnica; stran lige ali entitete je v jeziku
  // svoje lige in brez koraka države (iskalnik z ameriškega IP-ja).
  const vprasajDrzavo = tujec && zaznajTujca()
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
  const [iskanje, setIskanje] = useState('')
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
    pathname.startsWith('/match/') ||
    // Pogoje, zasebnost in izbris računa berejo tudi pregledovalci trgovin
    // (Google Play je posodobitev zavrnil, ker je okno prekrilo pravilnik).
    pathname === '/legal' ||
    pathname === '/account' ||
    // Vstopna stran države sama našteje lige.
    Boolean(drzavaVstopa(pathname))
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
  // pred očmi. Beremo pogled `stevilo_ekip_lig` (ena vrstica na ligo), ne
  // pogleda lestvice: ta za vsako ligo sešteje točke vseh krogov in
  // petindvajset hkratnih štetij je bazo zasulo. Lig je manj kot tisoč, zato
  // brez strani.
  useEffect(() => {
    if (skrit || !ligeSveze) return
    let veljavno = true
    supabase
      .from('stevilo_ekip_lig')
      .select('competition_id, ekip')
      .then(({ data }) => {
        if (!veljavno || !data) return
        const stevila: Record<number, number> = {}
        for (const t of vsaTekmovanja) stevila[t.id] = 0
        for (const v of data) if (v.competition_id != null) stevila[v.competition_id] = v.ekip ?? 0
        setEkip(stevila)
        // Brez števil je okno še vedno uporabno; ne kaži napake.
      }, () => {})
    return () => {
      veljavno = false
    }
  }, [skrit, ligeSveze, vsaTekmovanja])

  // Izbira lige iz shrambe bi lahko ponudila že ugasnjeno ligo — počakamo na svež seznam.
  const prikazan =
    !skrit && cas && !vabljen && ligeSveze && (vprasajDrzavo ? vsaTekmovanja : tekmovanja).length >= 2
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

  const lige = useMemo(
    () => (drzava ? vsaTekmovanja.filter((t) => t.country_code === drzava) : tekmovanja),
    [tekmovanja, vsaTekmovanja, drzava],
  )
  const skupine = useMemo(
    () => poZvezah(lige.filter((l) => ustreza(l, iskanje))),
    [lige, iskanje],
  )
  // Najbolj žive lige države na vrhu: novinec v ligi z ekipami ima nasprotnike.
  // Le pri daljšem seznamu in brez iskanja; lige brez ekip niso "najbolj žive".
  const najvec = useMemo(
    () =>
      lige.length > 5
        ? lige
            .filter((l) => (ekip[l.id] ?? 0) > 0)
            .sort((a, b) => (ekip[b.id] ?? 0) - (ekip[a.id] ?? 0))
            .slice(0, 3)
        : [],
    [lige, ekip],
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

  const gumbLige = (liga: Tekmovanje) => {
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
        <span className={`shrink-0 text-xs tabular-nums ${n >= 5 ? 'text-gnl-300' : 'text-slate-500'}`}>
          {n === 0 ? t('aplikacija.prviObisk.brezEkip') : mnozina(n, EKIPE)}
        </span>
      </button>
    )
  }

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
        <div className="flex items-start justify-between gap-3">
          <h2 id="prvi-obisk-naslov" className="text-xl font-black naslov">
            {t('aplikacija.prviObisk.naslov')}
          </h2>
          {/* Zapri = preskoči: privzeta liga, okno se ne vrne. */}
          <button
            onClick={zapri}
            aria-label={t('aplikacija.prviObisk.preskoci')}
            title={t('aplikacija.prviObisk.preskoci')}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {t(potrebnaDrzava ? 'aplikacija.prviObisk.drzavaOpis' : 'aplikacija.prviObisk.opis')}
        </p>

        {potrebnaDrzava ? (
          <div className="mt-4 space-y-1.5">
            {drzave.map((koda) => (
              <button
                key={koda}
                onClick={() => setDrzava(koda)}
                className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/10"
              >
                <Zastava koda={koda} />
                {imeDrzave(koda)}
              </button>
            ))}
          </div>
        ) : (
          <>
            {lige.length > 5 && (
              <input
                type="search"
                value={iskanje}
                onChange={(e) => setIskanje(e.target.value)}
                placeholder={t('aplikacija.prviObisk.isci')}
                aria-label={t('aplikacija.prviObisk.isci')}
                className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-gnl-400 focus:outline-none"
              />
            )}
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {!iskanje && najvec.length > 0 && (
                <div>
                  <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-gnl-300">
                    {t('aplikacija.prviObisk.najvecEkip')}
                  </div>
                  {najvec.map(gumbLige)}
                </div>
              )}
              {skupine.map((s) => (
                <div key={s.kljuc}>
                  <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {s.naslov}
                  </div>
                  {s.lige.map(gumbLige)}
                </div>
              ))}
              {!skupine.length && (
                <p className="px-1 py-2 text-sm text-slate-500">{t('aplikacija.izbirnikLige.niZadetkov')}</p>
              )}
            </div>
          </>
        )}

        <div className="mt-3 text-center">
          <ZelimLigo drzava={drzava ?? drzavaLige} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {vprasajDrzavo && drzava && drzave.length > 1 ? (
            <button
              onClick={() => setDrzava(null)}
              className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm text-slate-400 hover:text-slate-200"
            >
              {t('aplikacija.prviObisk.nazaj')}
            </button>
          ) : druge.length && !potrebnaDrzava ? (
            <span className="flex min-w-0 gap-3 overflow-x-auto whitespace-nowrap">
              {druge.map((koda) => (
                <button
                  key={koda}
                  onClick={() => preklopiDrzavo(koda, vsaTekmovanja, { izberiLigo: false })}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  <Zastava koda={koda} />
                  {t('aplikacija.prviObisk.drugaDrzava', { drzava: imeDrzave(koda) })}
                </button>
              ))}
            </span>
          ) : (
            <span />
          )}
          <button onClick={zapri} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 text-sm font-semibold text-slate-300 hover:text-white">
            {t('aplikacija.prviObisk.preskoci')}
          </button>
        </div>
      </div>
    </div>
  )
}
