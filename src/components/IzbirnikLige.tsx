// Izbirnik lige — iskalni spustni seznam, grupiran po zvezi.
//
// Prej je bila to ravna vrsta gumbov. Pri dveh tekmovanjih je delovala, pri
// šestih (Gorenjska + Ljubljana) ne bi več — na telefonu bi se prelivala čez
// zaslon in ob vsaki novi ligi bolj.
//
// Zgradba dopušča, da se nad ligo pozneje doda izbirnik države: skupine so
// že narejene iz podatka o zvezi, država pa potuje zraven (`country_code`).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'

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
    const naslov = t.federation_short ?? t.country_name ?? 'Ostalo'
    if (!skupine.has(kljuc)) skupine.set(kljuc, { kljuc, naslov, lige: [] })
    skupine.get(kljuc)!.lige.push(t)
  }
  return [...skupine.values()].sort((a, b) => {
    if (a.kljuc === '—') return 1
    if (b.kljuc === '—') return -1
    const as = a.lige[0]?.federation_sort ?? 0
    const bs = b.lige[0]?.federation_sort ?? 0
    return as - bs || a.naslov.localeCompare(b.naslov, 'sl')
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
  const ovoj = useRef<HTMLDivElement | null>(null)
  const poljeIskanja = useRef<HTMLInputElement | null>(null)

  // Klik izven zapre; brez tega spustni seznam ostane odprt čez celo stran.
  useEffect(() => {
    if (!odprt) return
    const zunaj = (e: MouseEvent) => {
      if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOdprt(false)
    }
    document.addEventListener('mousedown', zunaj)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', zunaj)
      document.removeEventListener('keydown', esc)
    }
  }, [odprt])

  useEffect(() => {
    if (odprt) poljeIskanja.current?.focus()
    else setIskanje('')
  }, [odprt])

  const skupine = useMemo(() => {
    const vidne = tekmovanja.filter((t) => ustreza(t, iskanje))
    return poZvezah(vidne)
  }, [tekmovanja, iskanje])

  // Ena sama liga: izbirati ni česa.
  if (tekmovanja.length < 2) return null

  const oznaka = tekmovanje?.short_name ?? 'Liga'
  const zveza = pokaziZvezo(tekmovanja) ? tekmovanje?.federation_short : null

  return (
    <div className="relative" ref={ovoj}>
      <button
        onClick={() => setOdprt(!odprt)}
        aria-haspopup="listbox"
        aria-expanded={odprt}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-1.5
                   text-[11px] font-bold ring-1 ring-white/10 hover:bg-white/10 sm:text-xs"
      >
        {zveza && <span className="text-slate-400">{zveza}</span>}
        <span className="text-gnl-200">{oznaka}</span>
        <span aria-hidden="true" className="text-slate-500">
          ▾
        </span>
      </button>

      {odprt && (
        <div
          className="animiraj-vstop absolute left-0 z-30 mt-1 w-64 rounded-xl border border-white/10
                     bg-slate-900 p-2 shadow-xl shadow-black/40"
          role="listbox"
        >
          <input
            ref={poljeIskanja}
            value={iskanje}
            onChange={(e) => setIskanje(e.target.value)}
            placeholder="Išči ligo …"
            className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs"
          />

          <div className="max-h-72 overflow-y-auto">
            {skupine.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-500">
                Ni zadetkov.
              </p>
            ) : (
              skupine.map((s) => (
                <div key={s.kljuc} className="mb-1.5 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {s.naslov}
                  </div>
                  {s.lige.map((t) => (
                    <button
                      key={t.slug}
                      role="option"
                      aria-selected={t.slug === slug}
                      onClick={() => {
                        nastavi(t.slug)
                        setOdprt(false)
                      }}
                      className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs ${
                        t.slug === slug
                          ? 'bg-gnl-500/25 font-bold text-gnl-200'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
