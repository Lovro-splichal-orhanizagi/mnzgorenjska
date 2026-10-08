// Izbirnik lige — iskalni spustni seznam, grupiran po zvezi.
//
// Prej je bila to ravna vrsta gumbov. Pri dveh tekmovanjih je delovala, pri
// šestih (Gorenjska + Ljubljana) ne bi več — na telefonu bi se prelivala čez
// zaslon in ob vsaki novi ligi bolj.
//
// Nad ligami so države kot zavihki. Zavihek le brska; šele izbira lige druge
// države preklopi državo (in jezik, zato stran naloži znova).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { potrdiZapustitev } from '../lib/neshranjeno'
import { drzaveZLigami, preklopiDrzavo } from '../lib/drzava'
import { t as prevod, lokale } from '../i18n'
import { imeDrzave } from './IzbiraDrzave'
import Zastava from './Zastava'

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

/** Razvrsti tekmovanja po zvezi; tista brez zveze pridejo na konec. */
export function poZvezah(tekmovanja: Tekmovanje[]): Skupina[] {
  const skupine = new Map<string, Skupina>()
  for (const t of tekmovanja) {
    const kljuc = t.federation_code ?? '—'
    const naslov = t.federation_short ?? t.country_name ?? prevod('aplikacija.izbirnikLige.ostalo')
    if (!skupine.has(kljuc)) skupine.set(kljuc, { kljuc, naslov, lige: [] })
    skupine.get(kljuc)!.lige.push(t)
  }
  return [...skupine.values()].sort((a, b) => {
    if (a.kljuc === '—') return 1
    if (b.kljuc === '—') return -1
    const as = a.lige[0]?.federation_sort ?? 0
    const bs = b.lige[0]?.federation_sort ?? 0
    return as - bs || a.naslov.localeCompare(b.naslov, lokale())
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
  const { slug, tekmovanja, vsaTekmovanja, drzava, tekmovanje, nastavi } = useTekmovanje()
  const [odprt, setOdprt] = useState(false)
  const [iskanje, setIskanje] = useState('')
  // Država, katere lige plošča kaže. Zavihek le brska — stran se ne naloži
  // znova, dokler človek ne izbere lige.
  const [zavihek, setZavihek] = useState(drzava)
  // Liga, na kateri stoji tipkovnica (puščici gor/dol); Enter jo izbere.
  const [aktivna, setAktivna] = useState(0)
  // Plošča je pod gumbom, na ozkem zaslonu pa zamaknjena, da ne zleze čez rob.
  // (Glava ima backdrop-blur, zato `fixed` v njej ne bi bil glede na okno.)
  const [mesto, setMesto] = useState({ levo: 0, sirina: 352 })
  const ovoj = useRef<HTMLDivElement | null>(null)
  const poljeIskanja = useRef<HTMLInputElement | null>(null)
  const gumb = useRef<HTMLButtonElement | null>(null)

  const drzave = useMemo(() => drzaveZLigami(vsaTekmovanja), [vsaTekmovanja])
  const vecDrzav = drzave.length > 1

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
    // Na dotik bi fokus odprl tipkovnico čez seznam lig, ki ga človek hoče videti.
    if (odprt && window.matchMedia('(hover: hover)').matches) poljeIskanja.current?.focus()
    else setIskanje('')
    if (odprt) setZavihek(drzava)
  }, [odprt, drzava])

  // Širina in zamik plošče ob odprtju in ob spremembi okna.
  useEffect(() => {
    if (!odprt) return
    const postavi = () => {
      const r = gumb.current?.getBoundingClientRect()
      if (!r) return
      const sirina = Math.min(352, window.innerWidth - 24)
      const levo = Math.max(12, Math.min(r.left, window.innerWidth - 12 - sirina)) - r.left
      setMesto({ levo, sirina })
    }
    postavi()
    window.addEventListener('resize', postavi)
    return () => window.removeEventListener('resize', postavi)
  }, [odprt])

  // Iskanje gre čez vse države; brez iskanja le izbrani zavihek.
  const isce = iskanje.trim().length > 0
  const skupine = useMemo(() => {
    const vir = isce
      ? vsaTekmovanja
      : vsaTekmovanja.filter((t) => (t.country_code ?? drzava) === zavihek)
    return poZvezah(vir.filter((t) => ustreza(t, iskanje)))
  }, [vsaTekmovanja, iskanje, isce, zavihek, drzava])

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

  // Ena sama liga povsod: izbirati ni česa.
  if (vsaTekmovanja.length < 2 && tekmovanja.length < 2) return null

  // Prikaz mora vedno vsebovati zvezo, sicer uporabnik ne loci "Clani"
  // (Gorenjska) od "Clani" (Ljubljana). Ce je zveza ze v imenu (kot pri
  // 1. GNL — clani), je ne podvajamo.
  const kratko = tekmovanje?.short_name ?? prevod('aplikacija.izbirnikLige.liga')
  const surovoIme = tekmovanje?.name ?? kratko
  const zveza = pokaziZvezo(tekmovanja) ? tekmovanje?.federation_short : null
  const jeZeVIme = (s: string) =>
    zveza != null && s.toLowerCase().includes(zveza.toLowerCase())
  // Mobilno: kratko ime, zveza v predponi le, če ga ima še katera liga
  // ("GNL Clani" ob "MNZLJ Clani") — sicer bi ime zakrila tripičja.
  const dvoumno = tekmovanja.some((t) => t.slug !== slug && t.short_name === kratko)
  const zaMobile = zveza && dvoumno && !jeZeVIme(kratko) ? `${zveza} ${kratko}` : kratko
  // Desktop: polno ime, po potrebi z zvezo v predponi.
  const zaDesktop = zveza && !jeZeVIme(surovoIme) ? `${zveza} · ${surovoIme}` : surovoIme

  const izberi = (t: Tekmovanje) => {
    // Moja ekipa ob menjavi lige naloži drug kader — neshranjene spremembe bi izginile.
    if (t.slug !== slug && !potrdiZapustitev()) return
    // Liga druge države: jezik se med obiskom ne menja, zato stran naloži znova.
    if (t.country_code && t.country_code !== drzava) {
      preklopiDrzavo(t.country_code, vsaTekmovanja, { liga: t.slug })
      return
    }
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
    <div className="relative min-w-0 max-w-[50vw] sm:max-w-xs lg:max-w-[18rem]" ref={ovoj}>
      <button
        data-pomoc="izbirnik-lige"
        ref={gumb}
        onClick={() => setOdprt(!odprt)}
        aria-haspopup="listbox"
        aria-expanded={odprt}
        title={surovoIme}
        // Preklopnik je bil premajhen — nov obiskovalec ga ni videl. Ambrasti
        // gumb z obrobo je vidno drugačen od tekstualnih povezav v meniju.
        // Značka države pove, kje si; na mobilnem kratko ime, na desktopu polno.
        className="flex w-full min-w-0 items-center gap-1.5 rounded-xl bg-amber-500/10 px-2 py-1.5 sm:gap-2 sm:px-2.5 text-sm font-bold
                   ring-1 ring-amber-400/40 transition hover:bg-amber-500/20 hover:ring-amber-400/60"
      >
        {vecDrzav && <Zastava koda={drzava} className="h-4" />}
        <span className="min-w-0 truncate text-amber-50 sm:hidden">{zaMobile}</span>
        <span className="hidden min-w-0 truncate text-amber-50 sm:inline">{zaDesktop}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 text-amber-300/80 transition ${odprt ? 'rotate-180' : ''}`}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {odprt && (
        <div
          style={{ left: mesto.levo, width: mesto.sirina }}
          className="animiraj-vstop absolute top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10
                     bg-slate-900 shadow-xl shadow-black/50"
        >
          <div className="space-y-2 border-b border-white/10 p-2">
            {/* Države kot zavihki; pri mnogih se vrstica le vodoravno pomakne. */}
            {vecDrzav && (
              <div
                role="tablist"
                aria-label={prevod('aplikacija.izbiraDrzave.oznaka')}
                className="flex gap-1 overflow-x-auto rounded-xl bg-slate-950 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {drzave.map((koda) => {
                  const izbran = !isce && koda === zavihek
                  return (
                    <button
                      key={koda}
                      type="button"
                      role="tab"
                      aria-selected={izbran}
                      onClick={() => {
                        setZavihek(koda)
                        setIskanje('')
                      }}
                      className={`flex min-w-fit flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        izbran ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Zastava koda={koda} />
                      {imeDrzave(koda)}
                    </button>
                  )
                })}
              </div>
            )}
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
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500"
            />
          </div>

          {skupine.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              {prevod('aplikacija.izbirnikLige.niZadetkov')}
            </p>
          ) : (
            <div
              id="seznam-lig"
              role="listbox"
              aria-label={prevod('aplikacija.izbirnikLige.lige')}
              className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain pb-1.5"
            >
              {skupine.map((s) => {
                const koda = s.lige[0]?.country_code ?? null
                return (
                  <div key={s.kljuc} role="group" aria-label={s.naslov}>
                    {/* Glava skupine ostane vidna, ko se seznam pomika. */}
                    <div
                      aria-hidden="true"
                      className="sticky top-0 z-10 flex items-center gap-1.5 bg-slate-900 px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                    >
                      {isce && vecDrzav && koda && <Zastava koda={koda} className="h-3" />}
                      <span className="truncate">{s.naslov}</span>
                      <span className="ml-auto font-semibold text-slate-600">{s.lige.length}</span>
                    </div>
                    <div className="px-1.5">
                      {s.lige.map((t) => {
                        const jeAktivna = aktivnaLiga?.slug === t.slug
                        const izbrana = t.slug === slug
                        return (
                          <div
                            key={t.slug}
                            id={idMoznosti(t)}
                            role="option"
                            aria-selected={izbrana}
                            onClick={() => izberi(t)}
                            onMouseEnter={() => setAktivna(zaporedje.indexOf(t))}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm sm:py-2 ${
                              izbrana
                                ? 'bg-gnl-500/15 font-bold text-gnl-200'
                                : jeAktivna
                                  ? 'bg-white/10 text-slate-100'
                                  : 'text-slate-300'
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">{t.name}</span>
                            {izbrana && (
                              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-gnl-300">
                                <path
                                  d="M2.5 6.5 5 9l4.5-6"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
