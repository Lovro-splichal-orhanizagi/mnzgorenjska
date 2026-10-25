// Čakajoči popravki podatkov (migracija 20261025150100). Klubski račun vidi
// in odloča o popravkih svojega kluba, admin (brez `klubId`) o vseh.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { prikazniIme } from '../lib/pomozno'
import { Link } from './Povezava'
import { t } from '../i18n'

interface Popravek {
  id: number
  vrsta: string
  liga: string
  klub: string
  igralec_id: number | null
  igralec: string | null
  pozicija_zdaj: string | null
  pozicija: string | null
  tekma_id: number | null
  minuta: number | null
  strelec: string | null
  asistenca_zdaj: string | null
  asistent: string | null
  opomba: string | null
  avtor: string | null
}

const pozicija = (p: string | null) => (p ? t(`skupno.pozicija.${p as 'GK'}`) : '?')

function Opis({ p, admin }: { p: Popravek; admin: boolean }) {
  if (p.vrsta === 'asistenca')
    return (
      <Link to={`/match/${p.tekma_id}`} className="hover:underline">
        {t('skupno.popravki.gol')} {p.minuta != null ? `${p.minuta}'` : ''} {prikazniIme(p.strelec ?? '?')}:{' '}
        {p.asistenca_zdaj ? prikazniIme(p.asistenca_zdaj) : '?'} →{' '}
        <b>{p.asistent ? prikazniIme(p.asistent) : t('skupno.popravki.brezAsistence')}</b>
        {admin && <span className="text-slate-500"> · {p.klub}</span>}
      </Link>
    )
  return (
    <Link to={`/player/${p.igralec_id}`} className="hover:underline">
      {prikazniIme(p.igralec ?? '?')}:{' '}
      {p.vrsta === 'pozicija' ? (
        <>
          {pozicija(p.pozicija_zdaj)} → <b>{pozicija(p.pozicija)}</b>
        </>
      ) : (
        <b>{t('skupno.popravki.odhod')}</b>
      )}
      {admin && <span className="text-slate-500"> · {p.klub} · {p.liga}</span>}
    </Link>
  )
}

export default function SeznamPopravkov({ klubId }: { klubId?: number }) {
  const [popravki, setPopravki] = useState<Popravek[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('popravki_v_pregledu', klubId != null ? { p_team_id: klubId } : {})
    if (error) return setNapaka(prevediNapako(error.message))
    setPopravki((data ?? []) as Popravek[])
  }, [klubId])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function odloci(id: number, sprejmi: boolean) {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('odloci_popravek', { p_id: id, p_sprejmi: sprejmi })
    setDela(false)
    if (error) setNapaka(prevediNapako(error.message))
    await nalozi()
  }

  return (
    <section className="mt-4 space-y-2 text-sm">
      <h3 className="font-semibold">{t('skupno.popravki.vPregledu')}</h3>
      <p className="text-xs text-slate-400">{t('skupno.popravki.vPregleduOpis')}</p>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {popravki === null ? null : popravki.length === 0 ? (
        <p className="text-xs text-slate-500">{t('skupno.popravki.niPopravkov')}</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {popravki.map((p) => (
            <li key={p.id} className="space-y-1 py-2">
              <Opis p={p} admin={klubId == null} />
              {p.opomba && <p className="text-xs text-slate-300">“{p.opomba}”</p>}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">{t('skupno.popravki.predlaga', { ime: p.avtor ?? '?' })}</span>
                <button
                  type="button"
                  className="znacka bg-gnl-500/20 text-gnl-200"
                  disabled={dela}
                  onClick={() => void odloci(p.id, true)}
                >
                  {t('skupno.popravki.sprejmi')}
                </button>
                <button
                  type="button"
                  className="znacka bg-white/10 text-slate-300"
                  disabled={dela}
                  onClick={() => void odloci(p.id, false)}
                >
                  {t('skupno.popravki.zavrni')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
