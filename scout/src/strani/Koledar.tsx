import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, VRSTE_DOGODKOV, type Koledar as KoledarT, type Selekcija, type VrstaDogodka } from '../baza'
import { dan, mesec, napaka, t, ura, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

/** Krajevni dan "YYYY-MM-DD" (brez UTC zamika toISOString). */
export const dIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Mesec iz naslova (?m=2026-10), sicer tekoči; vedno 1. dan meseca. */
export function mesecIzNaslova(v: string | null, danes = new Date()): Date {
  const m = v?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : new Date(danes.getFullYear(), danes.getMonth(), 1)
}

type Vnos =
  | { vrsta: 'tekma'; kljuc: string; cas: number; t: KoledarT['tekme'][number] }
  | { vrsta: 'dogodek'; kljuc: string; cas: number; d: KoledarT['dogodki'][number] }

/** Tekme (le datum) in dogodki, po krajevnih dnevih; tekma na vrhu dneva. */
export function poDnevih(k: KoledarT, selekcija: number | null): [string, Vnos[]][] {
  const vnosi: Vnos[] = [
    ...k.tekme.map((x) => ({ vrsta: 'tekma' as const, kljuc: `t${x.id}`, cas: new Date(`${x.datum}T00:00`).getTime(), t: x })),
    ...k.dogodki.map((x) => ({ vrsta: 'dogodek' as const, kljuc: `d${x.id}`, cas: new Date(x.zacetek).getTime(), d: x })),
  ].filter((v) => selekcija === null || (v.vrsta === 'tekma' ? v.t.competition_id : v.d.competition_id) === selekcija)
  vnosi.sort((a, b) => a.cas - b.cas)
  const dnevi = new Map<string, Vnos[]>()
  for (const v of vnosi) {
    const k2 = dIso(new Date(v.cas))
    dnevi.set(k2, [...(dnevi.get(k2) ?? []), v])
  }
  return [...dnevi]
}

export function Koledar() {
  const [q, setQ] = useSearchParams()
  const m = mesecIzNaslova(q.get('m'))
  const mKljuc = dIso(m).slice(0, 7)
  const [k, setK] = useState<KoledarT | null>(null)
  const [napakaK, setNapakaK] = useState<string | null>(null)
  const [selekcija, setSelekcija] = useState<number | null>(null)
  const [obrazec, setObrazec] = useState(false)
  // Ostanejo med nalaganjem drugega meseca, da odprt obrazec ne izgubi vnosa.
  const [selekcije, setSelekcije] = useState<Selekcija[]>([])

  const nalozi = useCallback(() => {
    let velja = true
    const od = new Date(m)
    const doo = new Date(m.getFullYear(), m.getMonth() + 1, 0)
    setNapakaK(null)
    void supabase.rpc('scout_koledar', { p_od: dIso(od), p_do: dIso(doo) }).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaK(napaka(error))
      else {
        const r = data as unknown as KoledarT
        setK(r)
        setSelekcije(r.selekcije)
      }
    })
    return () => {
      velja = false
    }
    // m se izračuna iz mKljuc ob vsakem izrisu
  }, [mKljuc])
  useEffect(nalozi, [nalozi])

  const premakni = (n: number) => {
    const x = new Date(m.getFullYear(), m.getMonth() + n, 1)
    setK(null)
    setQ({ m: dIso(x).slice(0, 7) })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black naslov sm:text-3xl">{t('koledar.naslov')}</h1>
        <p className="text-sm text-slate-400">{t('koledar.uvod')}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => premakni(-1)} aria-label={t('koledar.prejsnji')} className="gumb-tih min-h-11 min-w-11 px-3">←</button>
        <h2 className="min-w-40 text-center text-lg font-bold first-letter:uppercase text-slate-100" aria-live="polite">{mesec(m)}</h2>
        <button type="button" onClick={() => premakni(1)} aria-label={t('koledar.naslednji')} className="gumb-tih min-h-11 min-w-11 px-3">→</button>
        <span className="flex-1" />
        {selekcije.length > 0 && !obrazec && (
          <button type="button" onClick={() => setObrazec(true)} className="gumb-glavni min-h-11">+ {t('koledar.dodaj')}</button>
        )}
      </div>

      {obrazec && selekcije.length > 0 && (
        <ObrazecDogodka
          selekcije={selekcije}
          zacetna={{ competition_id: selekcija ?? selekcije[0].competition_id }}
          onShranjeno={() => {
            setObrazec(false)
            nalozi()
          }}
          onPreklic={() => setObrazec(false)}
        />
      )}

      {k && k.selekcije.length > 1 && (
        <div role="group" aria-label={t('obrazec.selekcija')} className="flex flex-wrap gap-2">
          {[{ competition_id: null, ime: t('koledar.vse') }, ...k.selekcije].map((s) => (
            <button
              key={s.competition_id ?? 'vse'}
              type="button"
              aria-pressed={selekcija === s.competition_id}
              onClick={() => setSelekcija(s.competition_id)}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold ring-1 transition ${
                selekcija === s.competition_id ? 'bg-gnl-400/15 text-gnl-200 ring-gnl-400/40' : 'text-slate-300 ring-white/15 hover:bg-white/5'
              }`}
            >
              {s.ime}
            </button>
          ))}
        </div>
      )}

      {napakaK ? (
        <p className="opozorilo">{napakaK}</p>
      ) : !k ? (
        <Nalaganje />
      ) : (
        <SeznamDni k={k} selekcija={selekcija} />
      )}
    </div>
  )
}

export function SeznamDni({ k, selekcija }: { k: KoledarT; selekcija: number | null }) {
  const dnevi = poDnevih(k, selekcija)
  const imeSel = (id: number) => k.selekcije.find((s) => s.competition_id === id)?.ime ?? ''
  const vecSel = k.selekcije.length > 1
  if (dnevi.length === 0) return <p className="kartica p-5 text-center text-slate-400">{t('koledar.prazno')}</p>
  const danes = dIso(new Date())
  return (
    <ol className="space-y-4">
      {dnevi.map(([d, vnosi]) => (
        <li key={d} className="space-y-2">
          <h3 className={`text-sm font-semibold first-letter:uppercase ${d === danes ? 'text-gnl-300' : 'text-slate-400'}`}>
            {dan(new Date(`${d}T00:00`))}
          </h3>
          <ul className="kartica divide-y divide-white/5 overflow-hidden">
            {vnosi.map((v) =>
              v.vrsta === 'tekma' ? (
                <li key={v.kljuc}>
                  <a href={`https://slff.eu/match/${v.t.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-white/5">
                    <span className="znacka bg-gnl-400/15 text-gnl-300 ring-1 ring-gnl-400/30">{t('koledar.tekma')}</span>
                    <span className="min-w-0 flex-1 font-semibold text-slate-100">
                      {v.t.doma ? '' : '@ '}{v.t.nasprotnik}
                      <span className="ml-2 text-xs font-normal text-slate-400">{v.t.doma ? t('koledar.doma') : t('koledar.gost')}{vecSel ? ` · ${imeSel(v.t.competition_id)}` : ''}</span>
                    </span>
                    {v.t.za != null && v.t.proti != null && (
                      <span className="font-bold tabular-nums text-slate-100">{v.t.za}:{v.t.proti}</span>
                    )}
                  </a>
                </li>
              ) : (
                <li key={v.kljuc}>
                  <Link to={`/calendar/${v.d.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-white/5">
                    <span className="w-12 shrink-0 font-bold tabular-nums text-slate-100">{ura(v.d.zacetek)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-100">{t(`vrsta.${v.d.vrsta}` as Kljuc)}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {[vecSel ? imeSel(v.d.competition_id) : null, v.d.kraj, v.d.serija ? t('koledar.serija') : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {v.d.oznaceni > 0 && <span className="text-xs text-slate-400">{t('koledar.oznaceni', { n: v.d.oznaceni })}</span>}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </li>
      ))}
    </ol>
  )
}

export interface Zacetna {
  id?: number
  competition_id: number
  vrsta?: VrstaDogodka
  zacetek?: string
  trajanje_min?: number
  kraj?: string | null
  opomba?: string | null
}

/** Nov dogodek ali urejanje enega (ponovitev le pri novem). */
export function ObrazecDogodka({ selekcije, zacetna, onShranjeno, onPreklic }: {
  selekcije: Selekcija[]
  zacetna: Zacetna
  onShranjeno: (id: number) => void
  onPreklic: () => void
}) {
  const z = zacetna.zacetek ? new Date(zacetna.zacetek) : null
  const [sel, setSel] = useState(zacetna.competition_id)
  const [vrsta, setVrsta] = useState<VrstaDogodka>(zacetna.vrsta ?? 'trening')
  const [datumV, setDatumV] = useState(z ? dIso(z) : dIso(new Date()))
  const [uraV, setUraV] = useState(z ? `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}` : '18:00')
  const [trajanje, setTrajanje] = useState(zacetna.trajanje_min ?? 90)
  const [kraj, setKraj] = useState(zacetna.kraj ?? '')
  const [opomba, setOpomba] = useState(zacetna.opomba ?? '')
  const [ponovi, setPonovi] = useState(false)
  const [ponoviDo, setPonoviDo] = useState('')
  const [shranjujem, setShranjujem] = useState(false)
  const [napakaO, setNapakaO] = useState<string | null>(null)

  const shrani = async (e: FormEvent) => {
    e.preventDefault()
    setShranjujem(true)
    setNapakaO(null)
    const { data, error } = await supabase.rpc('scout_shrani_dogodek', {
      p_id: zacetna.id,
      p_competition_id: sel,
      p_vrsta: vrsta,
      // Brskalnikov krajevni čas: klubi so v istem pasu kot Scout (Europe/Ljubljana).
      p_zacetek: new Date(`${datumV}T${uraV}`).toISOString(),
      p_trajanje_min: trajanje,
      p_kraj: kraj,
      p_opomba: opomba,
      p_ponovi_do: !zacetna.id && ponovi && ponoviDo ? ponoviDo : undefined,
    })
    setShranjujem(false)
    if (error) setNapakaO(napaka(error))
    else onShranjeno(data as unknown as number)
  }

  const oznaka = 'block space-y-1 text-sm text-slate-300'
  return (
    <form onSubmit={(e) => void shrani(e)} className="kartica grid gap-4 p-5 sm:grid-cols-2">
      <label className={oznaka}>
        <span>{t('obrazec.selekcija')}</span>
        <select value={sel} onChange={(e) => setSel(Number(e.target.value))} className="polje min-h-11 w-full">
          {selekcije.map((s) => <option key={s.competition_id} value={s.competition_id}>{s.ime}</option>)}
        </select>
      </label>
      <label className={oznaka}>
        <span>{t('obrazec.vrsta')}</span>
        <select value={vrsta} onChange={(e) => setVrsta(e.target.value as VrstaDogodka)} className="polje min-h-11 w-full">
          {VRSTE_DOGODKOV.map((v) => <option key={v} value={v}>{t(`vrsta.${v}` as Kljuc)}</option>)}
        </select>
      </label>
      <label className={oznaka}>
        <span>{t('obrazec.datum')}</span>
        <input type="date" required value={datumV} onChange={(e) => setDatumV(e.target.value)} className="polje min-h-11 w-full" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={oznaka}>
          <span>{t('obrazec.ura')}</span>
          <input type="time" required value={uraV} onChange={(e) => setUraV(e.target.value)} className="polje min-h-11 w-full" />
        </label>
        <label className={oznaka}>
          <span>{t('obrazec.trajanje')}</span>
          <input type="number" required min={15} max={600} step={5} value={trajanje} onChange={(e) => setTrajanje(Number(e.target.value))} className="polje min-h-11 w-full" />
        </label>
      </div>
      <label className={`${oznaka} sm:col-span-2`}>
        <span>{t('obrazec.kraj')}</span>
        <input value={kraj} maxLength={120} onChange={(e) => setKraj(e.target.value)} className="polje min-h-11 w-full" />
      </label>
      <label className={`${oznaka} sm:col-span-2`}>
        <span>{t('obrazec.opomba')}</span>
        <textarea value={opomba} maxLength={500} rows={2} onChange={(e) => setOpomba(e.target.value)} placeholder={t('obrazec.brezIgralcev')} className="polje w-full" />
      </label>
      {!zacetna.id && (
        <div className="space-y-2 sm:col-span-2">
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" checked={ponovi} onChange={(e) => setPonovi(e.target.checked)} className="h-5 w-5 accent-gnl-400" />
            {t('obrazec.ponovi')}
          </label>
          {ponovi && (
            <label className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span>{t('obrazec.ponoviDo')}</span>
              <input type="date" required min={datumV} value={ponoviDo} onChange={(e) => setPonoviDo(e.target.value)} className="polje min-h-11" />
              <span className="text-xs text-slate-500">{t('obrazec.ponoviNamig')}</span>
            </label>
          )}
        </div>
      )}
      {napakaO && <p className="opozorilo sm:col-span-2" role="alert">{napakaO}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={shranjujem} className="gumb-glavni min-h-11">{t('obrazec.shrani')}</button>
        <button type="button" onClick={onPreklic} className="gumb-tih min-h-11">{t('obrazec.preklici')}</button>
      </div>
    </form>
  )
}
