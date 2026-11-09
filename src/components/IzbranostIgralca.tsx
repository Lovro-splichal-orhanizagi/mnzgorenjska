// Izbranost na profilu igralca: v koliko fantasy ekipah je, po ligah osebe.
// Vidi jo le preverjen igralec (svoj profil: "Tvoj doseg"; tuj: "Izbranost"),
// admin in strežnik — odloči `izbranost_igralca` v bazi; kdor ne sme, dobi
// prazno in panela ni. Številke so prave ali jih ni: pod 5 ekipami in pred
// prvim rokom pove, zakaj ne. Imen ekip ni (sestave so zasebne).
import { useEffect, useId, useState } from 'react'
import { t, datum } from '../i18n'
import { izbranostIgralca, odstotek, useVidiIzbranost, type IzbranostLige } from '../lib/izbranost'

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
      <p className="text-xs text-slate-500">{t('igralci.izbranost.ekipe')}</p>
    </section>
  )
}
