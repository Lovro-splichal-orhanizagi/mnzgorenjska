import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, type ClanKadra, type Ekipa } from '../baza'
import { napaka, odstotek, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'
import { idIzNaslova } from './Igralec'

/** Delež prisotnosti 0..1 ali null, če igralec ni bil označen. */
export const delezPrisotnosti = (k: ClanKadra): number | null => (k.oznacen > 0 ? k.prisoten / k.oznacen : null)

type Polje = 'nastopi' | 'zacetki' | 'minute' | 'goli' | 'rumeni' | 'rdeci' | 'prisotnost'
const STOLPCI: [Kljuc, Polje, (k: ClanKadra) => string][] = [
  ['klub.st.nastopi', 'nastopi', (k) => String(k.nastopi)],
  ['kader.st.zacetki', 'zacetki', (k) => String(k.zacetki)],
  ['kader.st.minute', 'minute', (k) => String(k.minute)],
  ['klub.st.goli', 'goli', (k) => String(k.goli)],
  ['kader.st.rumeni', 'rumeni', (k) => String(k.rumeni)],
  ['kader.st.rdeci', 'rdeci', (k) => String(k.rdeci)],
  ['kader.st.prisotnost', 'prisotnost', (k) => {
    const x = delezPrisotnosti(k)
    return x == null ? '–' : `${k.prisoten}/${k.oznacen} · ${odstotek(Math.round(x * 100))}`
  }],
]
const vrednost = (k: ClanKadra, p: Polje): number => (p === 'prisotnost' ? delezPrisotnosti(k) ?? -1 : k[p])

export function Kader() {
  const [q, setQ] = useSearchParams()
  const izbrana = idIzNaslova(q.get('sel') ?? undefined)
  const [e, setE] = useState<Ekipa | null>(null)
  const [napakaE, setNapakaE] = useState<string | null>(null)

  useEffect(() => {
    let velja = true
    setE(null)
    setNapakaE(null)
    void supabase.rpc('scout_ekipa', izbrana ? { p_competition_id: izbrana } : {}).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaE(napaka(error))
      else setE(data as unknown as Ekipa)
    })
    return () => {
      velja = false
    }
  }, [izbrana])

  if (napakaE) return <p className="opozorilo">{napakaE}</p>
  if (!e) return <Nalaganje />
  return <KaderView e={e} onSelekcija={(id) => setQ({ sel: String(id) })} />
}

export function KaderView({ e, onSelekcija }: { e: Ekipa; onSelekcija: (id: number) => void }) {
  const [razvrsti, setRazvrsti] = useState<Polje>('minute')
  const igralci = [...e.igralci].sort((a, b) => vrednost(b, razvrsti) - vrednost(a, razvrsti))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-black naslov sm:text-3xl">{t('kader.naslov')}</h1>
          <p className="text-sm text-slate-400">{t('kader.uvod')}{e.sezona ? ` · ${e.sezona}` : ''}</p>
        </div>
        {e.selekcije.length > 1 && (
          <label className="space-y-1 text-sm text-slate-300">
            <span className="block">{t('obrazec.selekcija')}</span>
            <select value={e.competition_id ?? ''} onChange={(x) => onSelekcija(Number(x.target.value))} className="polje min-h-11">
              {e.selekcije.map((s) => <option key={s.competition_id} value={s.competition_id}>{s.ime}</option>)}
            </select>
          </label>
        )}
      </header>

      {igralci.length === 0 ? (
        <p className="kartica p-5 text-center text-slate-400">{t('kader.prazno')}</p>
      ) : (
        <section className="space-y-2">
          <div className="kartica overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs text-slate-400">
                <tr>
                  <th className="sticky left-0 bg-slate-900 px-3 py-2 font-semibold">{t('klub.st.ime')}</th>
                  <th className="px-3 py-2 font-semibold">{t('klub.st.poz')}</th>
                  {STOLPCI.map(([k, polje]) => (
                    <th key={k} aria-sort={razvrsti === polje ? 'descending' : 'none'} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                      <button type="button" onClick={() => setRazvrsti(polje)} className={`min-h-11 ${razvrsti === polje ? 'text-gnl-300' : 'hover:text-slate-200'}`}>
                        {t(k)}
                        {razvrsti === polje && <span aria-hidden="true"> ▼</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {igralci.map((k) => (
                  <tr key={k.player_id} className="group hover:bg-slate-800">
                    <td className="sticky left-0 whitespace-nowrap bg-slate-900 px-3 py-2 font-semibold text-slate-100 group-hover:bg-slate-800">{k.ime}</td>
                    <td className="px-3 py-2">
                      {k.pozicija && <span className={`znacka poz-${k.pozicija}`}>{t(`poz.${k.pozicija}` as Kljuc)}</span>}
                    </td>
                    {STOLPCI.map(([kl, , f]) => (
                      <td key={kl} className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-300">{f(k)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">{t('kader.karton')}</p>
        </section>
      )}
    </div>
  )
}
