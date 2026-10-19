import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Opazovan } from '../baza'
import { datum, napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'
import { prenesiCsv } from './Iskanje'

export function Opazovani() {
  const [seznam, setSeznam] = useState<Opazovan[] | null>(null)
  const [napakaS, setNapakaS] = useState<string | null>(null)
  // Napaka gumba (meja) seznam pusti na strani.
  const [napakaA, setNapakaA] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    let velja = true
    void supabase.rpc('scout_opazovani').then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaS(napaka(error))
      else setSeznam(data ?? [])
    })
    return () => {
      velja = false
    }
  }, [])

  async function odstrani(id: number) {
    setDela(true)
    setNapakaA(null)
    const { error } = await supabase.rpc('scout_opazuj', { p_player_id: id, p_opazuj: false })
    setDela(false)
    if (error) setNapakaA(napaka(error))
    else setSeznam((s) => (s ?? []).filter((x) => x.player_id !== id))
  }

  if (napakaS) return <p className="opozorilo">{napakaS}</p>
  if (!seznam) return <Nalaganje />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black naslov sm:text-3xl">{t('seznam.naslov')}</h1>
      <p className="text-sm text-slate-400">{t('seznam.opis')}</p>
      {napakaA && <p className="opozorilo">{napakaA}</p>}
      {seznam.length === 0 ? (
        <p className="kartica p-5 text-center text-slate-400">{t('seznam.prazno')}</p>
      ) : (
        <ul className="kartica divide-y divide-white/5 overflow-hidden">
          {seznam.map((o) => (
            <li key={o.player_id} className="flex items-center gap-3 px-4 py-3">
              <Link to={`/player/${o.player_id}`} className="group min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-100 group-hover:text-gnl-300">{o.ime}</span>
                  <span className={`znacka poz-${o.skupina}`} title={t(`skupina.${o.skupina}` as Kljuc)}>{t(`poz.${o.skupina}` as Kljuc)}</span>
                  {o.odprt_za_prestop && <span className="znacka-odprt">{t('iskanje.odprt')}</span>}
                </span>
                <span className="block text-xs text-slate-400">{o.klub} · {o.liga}</span>
                <span className="block text-xs text-slate-400">{t('seznam.podrobno', { minute: o.minute, datum: datum(o.dodano) })}</span>
              </Link>
              <span className="shrink-0 cursor-help text-right" title={t('iskanje.percentilOpis')}>
                <span className="block text-xl font-black tabular-nums text-gnl-300">{Math.round(o.percentil)}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('iskanje.percentil')}</span>
              </span>
              <button type="button" disabled={dela} onClick={() => void odstrani(o.player_id)} className="gumb-tih shrink-0 px-3 py-1 text-sm">{t('seznam.odstrani')}</button>
            </li>
          ))}
        </ul>
      )}
      {seznam.length > 0 && (
        <button
          type="button"
          onClick={() =>
            prenesiCsv('scout-opazovani.csv', [
              [t('klub.st.ime'), t('klub.st.poz'), t('igralec.st.klub'), t('igralec.st.liga'), t('iskanje.percentil'), t('igralec.st.minute'), t('iskanje.odprt'), t('seznam.dodano')],
              ...seznam.map((o) => [o.ime, t(`poz.${o.skupina}` as Kljuc), o.klub, o.liga, Math.round(o.percentil), o.minute, o.odprt_za_prestop ? 1 : 0, o.dodano.slice(0, 10)]),
            ])
          }
          className="gumb-tih text-sm"
        >
          {t('iskanje.csv')}
        </button>
      )}
    </div>
  )
}
