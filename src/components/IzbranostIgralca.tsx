// Izbranost na profilu igralca: v koliko fantasy ekipah je, po ligah osebe.
// Vidi jo le preverjen igralec (svoj profil: "Tvoj doseg"; tuj: "Izbranost"),
// admin in strežnik — odloči `izbranost_igralca` v bazi; kdor ne sme, dobi
// prazno in panela ni. Številke so prave ali jih ni: pod 5 ekipami in pred
// prvim rokom pove, zakaj ne. Na svojem profilu še seznam ekip, ki imajo
// igralca (`ekipe_z_igralcem`), s povezavo na javno stran ekipe; na tujem
// imen ekip ni, sicer bi se dalo sestaviti kader vsake ekipe.
import { useEffect, useId, useState } from 'react'
import { t, datum } from '../i18n'
import {
  ekipeZIgralcem,
  izbranostIgralca,
  odstotek,
  useVidiIzbranost,
  type EkipaZIgralcem,
  type IzbranostLige,
} from '../lib/izbranost'
import { zLigo } from '../lib/tekmovanje'
import { Link } from './Povezava'

export default function IzbranostIgralca({ igralecId }: { igralecId: number }) {
  const vidi = useVidiIzbranost()
  const [vrstice, setVrstice] = useState<IzbranostLige[]>([])
  const id = useId()

  useEffect(() => {
    let velja = true
    if (!vidi) {
      setVrstice([])
      return
    }
    void izbranostIgralca(igralecId).then((v) => velja && setVrstice(v))
    return () => {
      velja = false
    }
  }, [igralecId, vidi])

  if (!vrstice.length) return null
  const lastni = vrstice[0].lastni

  return (
    <section aria-labelledby={id} className="kartica space-y-2 p-3 text-sm sm:p-4">
      <h2 id={id} className="font-bold text-slate-100">
        {t(lastni ? 'igralci.izbranost.naslovSvoj' : 'igralci.izbranost.naslovTuj')}
      </h2>
      <p className="text-xs text-slate-400">{t('igralci.izbranost.opis')}</p>
      <ul className="divide-y divide-white/5">
        {vrstice.map((v) => {
          const pct = odstotek(v.owners, v.ekip)
          return (
            <li key={v.player_id} className="space-y-1 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-slate-200">{v.liga}</span>
                <span className="tabular-nums text-slate-200">
                  {v.krog == null
                    ? t('igralci.izbranost.brezKroga')
                    : pct == null
                      ? t('igralci.izbranost.podPragom')
                      : t('igralci.izbranost.vrstica', { n: v.owners ?? 0, ekip: v.ekip ?? 0, odstotek: pct })}
                </span>
              </div>
              {pct != null && (
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gnl-400" style={{ width: `${pct}%` }} />
                </div>
              )}
              {v.krog != null && v.zaklenjen && (
                <p className="text-xs text-slate-500">
                  {t('igralci.izbranost.posnetek', { krog: v.krog, datum: datum(v.zaklenjen) })}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {lastni ? (
        <EkipeZIgralcem igralecId={igralecId} vecLig={vrstice.length > 1} />
      ) : (
        <p className="text-xs text-slate-500">{t('igralci.izbranost.ekipe')}</p>
      )}
    </section>
  )
}

function EkipeZIgralcem({ igralecId, vecLig }: { igralecId: number; vecLig: boolean }) {
  const [ekipe, setEkipe] = useState<EkipaZIgralcem[]>([])
  const [nalaga, setNalaga] = useState(false)
  const id = useId()

  useEffect(() => {
    let velja = true
    setEkipe([])
    void ekipeZIgralcem(igralecId).then((v) => velja && setEkipe(v))
    return () => {
      velja = false
    }
  }, [igralecId])

  if (!ekipe.length) return null
  const skupaj = ekipe[0].skupaj

  const nalozi = () => {
    setNalaga(true)
    void ekipeZIgralcem(igralecId, ekipe.length).then((v) => {
      setEkipe((prej) => [...prej, ...v])
      setNalaga(false)
    })
  }

  return (
    <div className="space-y-1 border-t border-white/5 pt-2">
      <h3 id={id} className="font-semibold text-slate-200">
        {t('igralci.izbranost.seznam')} <span className="tabular-nums text-slate-400">({skupaj})</span>
      </h3>
      <p className="text-xs text-slate-400">{t('igralci.izbranost.seznamOpis')}</p>
      <ul aria-labelledby={id} className="divide-y divide-white/5">
        {ekipe.map((e) => (
          <li key={e.fantasy_team_id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
            <Link to={zLigo(`/team/${e.fantasy_team_id}`, e.competition_slug)} className="font-medium text-gnl-300 hover:underline">
              {e.ime}
            </Link>
            {vecLig && <span className="text-xs text-slate-500">{e.liga}</span>}
          </li>
        ))}
      </ul>
      {ekipe.length < skupaj && (
        <button type="button" onClick={nalozi} disabled={nalaga} className="gumb-tih min-h-11 w-full px-3 py-1.5 text-sm disabled:opacity-60">
          {t('igralci.izbranost.vec')}
        </button>
      )}
    </div>
  )
}
