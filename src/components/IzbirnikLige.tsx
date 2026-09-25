// Izbirnik lige — iskalni spustni seznam, grupiran po zvezi.
//
// Prej je bila to ravna vrsta gumbov. Pri dveh tekmovanjih je delovala, pri
// šestih (Gorenjska + Ljubljana) ne bi več — na telefonu bi se prelivala čez
// zaslon in ob vsaki novi ligi bolj.
//
// Zgradba dopušča, da se nad ligo pozneje doda izbirnik države: skupine so
// že narejene iz podatka o zvezi, država pa potuje zraven (`country_code`).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { potrdiZapustitev } from '../lib/neshranjeno'
import { t as prevod } from '../i18n'

/** Brez šumnikov in velikih črk — da "zelezniki" najde "Železniki". */
const poenostavi = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

interface Skupina {
  kljuc: string
  naslov: string
  lige: Tekmovanje[]
}

/**
 * Razvrsti tekmovanja po zvezi; tista brez zveze pridejo na konec.
 *
 * `prvaDrzava` je država lige, ki jo uporabnik gleda: njene zveze so na vrhu,
 * zveze druge države pa na dnu in z imenom države ob sebi — Slovenec sicer
 * ne ve, kaj je "SsFZ".
 */
export function poZvezah(tekmovanja: Tekmovanje[], prvaDrzava: string | null = null): Skupina[] {
  const skupine = new Map<string, Skupina>()
  const tuja = (t: Tekmovanje) => Boolean(prvaDrzava && t.country_code && t.country_code !== prvaDrzava)
  for (const t of tekmovanja) {
    const kljuc = t.federation_code ?? '—'
    const osnova = t.federation_short ?? t.country_name ?? prevod('aplikacija.izbirnikLige.ostalo')
    const naslov = tuja(t) && t.country_name && t.federation_short ? `${osnova} (${t.country_name})` : osnova
    if (!skupine.has(kljuc)) skupine.set(kljuc, { kljuc, naslov, lige: [] })
    skupine.get(kljuc)!.lige.push(t)
  }
  return [...skupine.values()].sort((a, b) => {
    if (a.kljuc === '—') return 1
    if (b.kljuc === '—') return -1
    const at = tuja(a.lige[0]) ? 1 : 0
    const bt = tuja(b.lige[0]) ? 1 : 0
    const as = a.lige[0]?.federation_sort ?? 0
    const bs = b.lige[0]?.federation_sort ?? 0
    return at - bt || as - bs || a.naslov.localeCompare(b.naslov, 'sl')
  })
}

/**
 * Ali naj gumb pred imenom lige pokaže še zvezo.
 *
 * Pri eni sami zvezi ne pove ničesar — vse lige so njene — zato jo izpustimo.
 * Vrstica v meniju je ozka: `max-w-6xl` je bilo z dodano "Gorenjska" preseženo
 * in značka je zlezla čez logotip.
 */
export function pokaziZvezo(tekmovanja: Tekmovanje[]): boolean {
  const zveze = new Set(tekmovanja.map((t) => t.federation_code ?? '—'))
  return zveze.size > 1
}

/** Ali liga ustreza iskalnemu nizu — po imenu lige, kratici ali zvezi. */
export function ustreza(t: Tekmovanje, iskanje: string): boolean {
  const q = poenostavi(iskanje)
  if (!q) return true
  const kosi = [t.name, t.short_name, t.federation_short, t.federation_name]
    .filter(Boolean)
    .map((x) => poenostavi(String(x)))
  return kosi.some((k) => k.includes(q))
}

export default function IzbirnikLige() {
  const { slug, tekmovanja, tekmovanje, nastavi } = useTekmovanje()
  const [odprt, setOdprt] = useState(false)
  const [iskanje, setIskanje] = useState('')
  // Liga, na kateri stoji tipkovnica (puščici gor/dol); Enter jo izbere.
  const [aktivna, setAktivna] = useState(0)
  const ovoj = useRef<HTMLDivElement | null>(null)
  const poljeIskanja = useRef<HTMLInputElement | null>(null)
  const gumb = useRef<HTMLButtonElement | null>(null)

  // Klik izven zapre; brez tega spustni seznam ostane odprt čez celo stran.
  useEffect(() => {
    if (!odprt) return
    const zunaj = (e: MouseEvent) => {
      if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false)
    }
    document.addEventListener('mousedown', zunaj)
    return () => document.removeEventListener('mousedown', zunaj)
  }, [odprt])

  useEffect(() => {
    if (odprt) poljeIskanja.current?.focus()
    else setIskanje('')
  }, [odprt])

  const skupine = useMemo(() => {
    const vidne = tekmovanja.filter((t) => ustreza(t, iskanje))
    return poZvezah(vidne, tekmovanje?.country_code ?? null)
  }, [tekmovanja, iskanje, tekmovanje?.country_code])

  // Ravno zaporedje, kot ga vidi oko — po njem se premikata puščici.
  const zaporedje = useMemo(() => skupine.flatMap((s) => s.lige), [skupine])

  // Ob odprtju in ob vsakem novem iskanju začni pri izbrani ligi, sicer pri prvi.
  useEffect(() => {
    const i = zaporedje.findIndex((t) => t.slug === slug)
    setAktivna(i >= 0 ? i : 0)
  }, [zaporedje, slug, odprt])

  // Escape zapre seznam, tudi ko fokus ni v iskalnem polju (npr. po kliku
  // na drsnik seznama).
  useEffect(() => {
    if (!odprt) return
    const tipkaDok = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOdprt(false)
      gumb.current?.focus()
    }
    document.addEventListener('keydown', tipkaDok)
    return () => document.removeEventListener('keydown', tipkaDok)
  }, [odprt])

  // Liga pod tipkovnico mora ostati vidna, ko jo puščica premakne pod rob seznama.
  useEffect(() => {
    if (!odprt) return
    const t = zaporedje[aktivna]
    if (!t) return
    document.getElementById(`liga-${t.slug}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [odprt, aktivna, zaporedje])

  // Ena sama liga: izbirati ni česa.
  if (tekmovanja.length < 2) return null

  // Prikaz mora vedno vsebovati zvezo, sicer uporabnik ne loci "Clani"
  // (Gorenjska) od "Clani" (Ljubljana). Ce je zveza ze v imenu (kot pri
  // 1. GNL — clani), je ne podvajamo.
  const kratko = tekmovanje?.short_name ?? prevod('aplikacija.izbirnikLige.liga')
  const surovoIme = tekmovanje?.name ?? kratko
  const zveza = pokaziZvezo(tekmovanja) ? tekmovanje?.federation_short : null
  const jeZeVIme = (s: string) =>
    zveza != null && s.toLowerCase().includes(zveza.toLowerCase())
  // Mobilno: kratko z zvezo v predponi ("GNL Clani", "MNZLJ LJ 1.").
  const zaMobile = zveza && !jeZeVIme(kratko) ? `${zveza} ${kratko}` : kratko
  // Desktop: polno ime, po potrebi z zvezo v predponi.
  const zaDesktop = zveza && !jeZeVIme(surovoIme)
    ? `${zveza} — ${surovoIme}`
    : surovoIme

  const izberi = (t: Tekmovanje) => {
    // Moja ekipa ob menjavi lige naloži drug kader — neshranjene spremembe bi izginile.
    if (t.slug !== slug && !potrdiZapustitev()) return
    nastavi(t.slug)
    setOdprt(false)
    gumb.current?.focus()
  }

  const tipka = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!zaporedje.length) return
      const korak = e.key === 'ArrowDown' ? 1 : -1
      setAktivna((a) => (a + korak + zaporedje.length) % zaporedje.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const t = zaporedje[aktivna]
      if (t) izberi(t)
    }
    // Escape ujame poslušalec na dokumentu (zgoraj).
  }

  const idMoznosti = (t: Tekmovanje) => `liga-${t.slug}`
  const aktivnaLiga = zaporedje[aktivna]

  return (
    // min-w-0 + max-w: gumb se na ozkem zaslonu skrajša, namesto da bi
    // hamburger potisnil čez rob (360 px).
    <div className="relative min-w-0 max-w-[50vw] sm:max-w-xs lg:max-w-[16rem]" ref={ovoj}>
      <button
        ref={gumb}
        onClick={() => setOdprt(!odprt)}
        aria-haspopup="listbox"
        aria-expanded={odprt}
        // Preklopnik je bil premajhen — nov obiskovalec ga ni videl, kliknil
        // je Igralce in nadrznil se je nad Ljubljancani na gorenjski lestvici.
        // Ambrasti gumb z obrobo je vidno drugacen od cistih tekstualnih
        // povezav v meniju. Na mobilnem kratko ime, na desktopu polno.
        className="flex w-full min-w-0 items-center gap-1.5
                   rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-black
                   ring-1 ring-amber-400/40 shadow-sm shadow-amber-500/10
                   transition hover:bg-amber-500/25 hover:ring-amber-400/60"
      >
        <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-300/80 sm:inline">
          {prevod('aplikacija.izbirnikLige.oznaka')}
        </span>
        <span className="min-w-0 truncate text-amber-100 sm:hidden">{zaMobile}</span>
        <span className="hidden min-w-0 truncate text-amber-100 sm:inline">{zaDesktop}</span>
        <span aria-hidden="true" className="shrink-0 text-amber-300/70">
          ▾
        </span>
      </button>

      {odprt && (
        <div
          className="animiraj-vstop absolute left-0 z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10
                     bg-slate-900 p-2 shadow-xl shadow-black/40"
        >
          {/* Iskalno polje je zunaj seznama: v role=listbox smejo biti le možnosti. */}
          <input
            ref={poljeIskanja}
            value={iskanje}
            onChange={(e) => setIskanje(e.target.value)}
            onKeyDown={tipka}
            placeholder={prevod('aplikacija.izbirnikLige.isciPolje')}
            role="combobox"
            aria-label={prevod('aplikacija.izbirnikLige.isci')}
            aria-expanded="true"
            aria-controls="seznam-lig"
            aria-autocomplete="list"
            aria-activedescendant={aktivnaLiga ? idMoznosti(aktivnaLiga) : undefined}
            className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs"
          />

          {skupine.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              {prevod('aplikacija.izbirnikLige.niZadetkov')}
            </p>
          ) : (
            <div
              id="seznam-lig"
              role="listbox"
              aria-label={prevod('aplikacija.izbirnikLige.lige')}
              className="max-h-72 overflow-y-auto"
            >
              {skupine.map((s) => (
                <div key={s.kljuc} role="group" aria-label={s.naslov} className="mb-1.5 last:mb-0">
                  <div
                    aria-hidden="true"
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    {s.naslov}
                  </div>
                  {s.lige.map((t) => {
                    const jeAktivna = aktivnaLiga?.slug === t.slug
                    return (
                      <div
                        key={t.slug}
                        id={idMoznosti(t)}
                        role="option"
                        aria-selected={t.slug === slug}
                        onClick={() => izberi(t)}
                        onMouseEnter={() => setAktivna(zaporedje.indexOf(t))}
                        className={`block w-full cursor-pointer truncate rounded-lg px-2 py-1.5 text-left text-xs ${
                          t.slug === slug
                            ? 'bg-gnl-500/25 font-bold text-gnl-200'
                            : jeAktivna
                              ? 'bg-white/10 text-slate-100'
                              : 'text-slate-300 hover:bg-white/5'
                        } ${jeAktivna ? 'ring-1 ring-white/30' : ''}`}
                      >
                        {t.name}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
