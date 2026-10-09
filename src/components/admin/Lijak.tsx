// Kje ljudje obtičijo: lijak začetka in obiskane strani.
//
// Dve vprašanji, en pogled. Lijak pove, koliko jih od prazne Moje ekipe
// pride do shranjene ekipe; obiski povedo, kam gredo tisti, ki ne pridejo.
// Brez drugega je prvi slep: 829 od 1447 registriranih je bilo 4. 10. 2026
// brez ekipe, in dokler ne vemo, ali so Mojo ekipo sploh odprli, popravljamo
// na slepo.
//
// Oboje so dnevni seštevki (`lijak_dnevno`, `obiski_dnevno`) — brez
// uporabnika, naprave in naslova. Zato tu ni poti posameznika in je ta pogled
// ne obljublja: stolpec "nov" je skupina, ne oseba.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface VrsticaLijaka {
  dan: string
  korak: string
  stevilo: number
}

interface VrsticaObiska {
  dan: string
  stran: string
  skupina: string
  stevilo: number
}

const DNI = 30

/** Koraki v vrstnem redu lijaka; ključ je vrednost v bazi. */
const KORAKI: [string, string][] = [
  ['prazna_ekipa', 'Prišel na prazno Mojo ekipo'],
  ['predlog', 'Pritisnil »Sestavi mi ekipo«'],
  ['prva_shramba', 'Prvič shranil ekipo'],
]

/** Imena strani iz `zabelezi_obisk()` v človeška. */
const STRANI: Record<string, string> = {
  domov: 'Domov',
  vstop_drzave: 'Vstop države (/si, /sk, /hr, /cz, /hu, /at, /rs)',
  moja_ekipa: 'Moja ekipa',
  igralci: 'Igralci',
  igralec: 'Igralec',
  lestvica: 'Lestvica',
  slovenija: 'Državna lestvica',
  mini_lige: 'Mini lige',
  vstop_v_mini_ligo: 'Vstop v mini ligo',
  ekipa: 'Tuja ekipa',
  klub: 'Klub',
  rezultati: 'Rezultati',
  tekma: 'Tekma',
  glasovanje: 'Glasovanje (podaje)',
  pozicije: 'Pozicije',
  odsotnosti: 'Odsotnosti',
  racun: 'Račun',
  opomniki: 'Opomniki',
  pravno: 'Pravno',
  prijava: 'Prijava',
  potrditev: 'Potrditev povezave',
}

const SKUPINE: [string, string][] = [
  ['nov', 'Nov (do 7 dni)'],
  ['star', 'Starejši'],
  ['neprijavljen', 'Neprijavljen'],
]

const odstotek = (del: number, celota: number) =>
  celota > 0 ? `${Math.round((del / celota) * 100)} %` : '—'

export default function Lijak() {
  const [lijak, setLijak] = useState<VrsticaLijaka[]>([])
  const [obiski, setObiski] = useState<VrsticaObiska[]>([])
  const [nalaganje, setNalaganje] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dni, setDni] = useState(DNI)

  useEffect(() => {
    let veljavno = true
    ;(async () => {
      setNalaganje(true)
      const od = new Date(Date.now() - dni * 86400000).toISOString().slice(0, 10)
      const [a, b] = await Promise.all([
        supabase.from('lijak_dnevno').select('dan, korak, stevilo').gte('dan', od),
        supabase.from('obiski_dnevno').select('dan, stran, skupina, stevilo').gte('dan', od),
      ])
      if (!veljavno) return
      // Tabeli sta novi: dokler migracija ni na strežniku, pogled ne sme pasti.
      setNapaka(a.error?.message ?? b.error?.message ?? null)
      setLijak((a.data ?? []) as VrsticaLijaka[])
      setObiski((b.data ?? []) as VrsticaObiska[])
      setNalaganje(false)
    })()
    return () => {
      veljavno = false
    }
  }, [dni])

  const poKoraku = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of lijak) m.set(v.korak, (m.get(v.korak) ?? 0) + v.stevilo)
    return m
  }, [lijak])

  const poStrani = useMemo(() => {
    const m = new Map<string, Map<string, number>>()
    for (const v of obiski) {
      const s = m.get(v.stran) ?? new Map<string, number>()
      s.set(v.skupina, (s.get(v.skupina) ?? 0) + v.stevilo)
      m.set(v.stran, s)
    }
    const vrstice = [...m.entries()].map(([stran, skupine]) => ({
      stran,
      nov: skupine.get('nov') ?? 0,
      star: skupine.get('star') ?? 0,
      neprijavljen: skupine.get('neprijavljen') ?? 0,
    }))
    // Novi najprej: to je vprašanje, zaradi katerega pogled obstaja.
    return vrstice.sort((a, b) => b.nov - a.nov || b.star - a.star)
  }, [obiski])

  const vrhNovih = Math.max(1, ...poStrani.map((v) => v.nov))
  const novihSkupaj = poStrani.reduce((v, s) => v + s.nov, 0)
  const izhodisce = poKoraku.get('prazna_ekipa') ?? 0
  const gumb = (izbran: boolean) =>
    `rounded-full px-2.5 py-1 text-xs ${
      izbran ? 'bg-gnl-500/25 text-gnl-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
    }`

  if (nalaganje) return <p className="text-slate-400">Nalaganje lijaka …</p>

  return (
    <section className="kartica space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">
          Kje ljudje obtičijo
          <span className="ml-2 text-xs font-normal text-slate-500">
            zadnjih {dni} dni, dnevni seštevki
          </span>
        </h2>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDni(d)} className={gumb(dni === d)}>
              {d} dni
            </button>
          ))}
        </div>
      </div>

      {napaka && (
        <p className="text-sm text-amber-300">
          Števcev ni bilo mogoče prebrati: {napaka}
          <span className="block text-xs text-slate-500">
            Če je napaka »relation does not exist«, migracija še ni na strežniku.
          </span>
        </p>
      )}

      {/* Lijak začetka — od prazne ekipe do shranjene */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-300">Od prazne ekipe do shranjene</h3>
        {KORAKI.map(([kljuc, oznaka], i) => {
          const n = poKoraku.get(kljuc) ?? 0
          const prej = i === 0 ? n : (poKoraku.get(KORAKI[i - 1][0]) ?? 0)
          return (
            <div key={kljuc} className="flex items-center gap-2 text-sm">
              <div className="w-56 shrink-0 text-slate-400">{oznaka}</div>
              <div className="h-5 flex-1 rounded bg-white/5">
                <div
                  className="h-5 rounded bg-gnl-500/40"
                  style={{ width: `${izhodisce > 0 ? (n / izhodisce) * 100 : 0}%` }}
                />
              </div>
              <div className="w-14 shrink-0 text-right tabular-nums">{n}</div>
              <div className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">
                {i === 0 ? '' : `${odstotek(n, prej)} prejšnjega`}
              </div>
            </div>
          )
        })}
        <p className="text-xs text-slate-500">
          Iz e-pošte (»Sestavi mi ekipo«): {poKoraku.get('sestavi_iz_maila') ?? 0}. Klik na
          »Časti pivo«: {poKoraku.get('pivo') ?? 0} (nakupi pridejo na Discord). Isti korak se v
          isti seji šteje enkrat na dan.
        </p>
      </div>

      {/* Obiski strani — kam gredo novi */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-300">
          Katero stran odprejo
          <span className="ml-2 text-xs font-normal text-slate-500">
            {novihSkupaj} obiskov novih računov
          </span>
        </h3>
        {poStrani.length === 0 ? (
          <p className="text-sm text-slate-500">
            Še ni podatkov — šteti se začne, ko gre migracija na strežnik.
          </p>
        ) : (
          <table className="w-full text-xs sm:text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 text-left font-normal">Stran</th>
                {SKUPINE.map(([k, oznaka]) => (
                  <th key={k} className="py-1 pl-2 text-right font-normal">
                    {oznaka}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {poStrani.map((v) => (
                <tr key={v.stran} className="border-t border-white/5">
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span>{STRANI[v.stran] ?? v.stran}</span>
                      <span
                        className="h-1.5 rounded bg-gnl-500/40"
                        style={{ width: `${(v.nov / vrhNovih) * 60}px` }}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 pl-2 text-right font-bold tabular-nums">{v.nov}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-slate-400">{v.star}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-slate-500">
                    {v.neprijavljen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-slate-500">
          Ena stran na sejo na dan — doseg, ne ogledi. »Nov« je račun, registriran v
          zadnjih sedmih dneh; starost pripiše baza, zapisan ni noben uporabnik.
        </p>
      </div>
    </section>
  )
}
