// Izbranost na profilu igralca: v koliko fantasy ekipah je, po ligah osebe.
// Vidi jo le preverjen igralec, admin in strežnik — odloči `izbranost_igralca`
// v bazi; kdor ne sme, dobi prazno in panela ni. Na svojem profilu je to
// reflektor tik pod identiteto (ena velika številka, vir in krog, ekipe po
// ligah s povezavo na javno stran ekipe — `ekipe_z_igralcem`); na tujem
// profilu lažji modul s številkami brez imen ekip, sicer bi se dalo sestaviti
// kader vsake ekipe. Številke so prave ali jih ni: pod 5 ekipami in pred
// prvim rokom pove, zakaj ne. Spremembe od prejšnjega kroga ni, ker baza
// za ta prikaz vrne le zadnji zaklenjeni krog.
import { useEffect, useId, useRef, useState } from 'react'
import { t, datum, stevilo } from '../i18n'
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
  return vrstice[0].lastni ? <Reflektor igralecId={igralecId} vrstice={vrstice} /> : <IzbranVEkipah vrstice={vrstice} />
}

/** Stanje lige: prava številka, pod pragom ali še brez zaklenjenega kroga. */
function stanje(v: IzbranostLige): string {
  const pct = odstotek(v.owners, v.ekip)
  if (v.krog == null) return t('igralci.izbranost.brezKroga')
  if (pct == null) return t('igralci.izbranost.podPragom')
  return t('igralci.izbranost.vrstica', { n: v.owners ?? 0, ekip: v.ekip ?? 0, odstotek: pct })
}

const svez = (v: IzbranostLige) =>
  v.krog != null && v.zaklenjen ? t('igralci.izbranost.posnetek', { krog: v.krog, datum: datum(v.zaklenjen) }) : null

/** Lastni preverjeni profil: ena zgodba, ena številka, nato ekipe po ligah. */
function Reflektor({ igralecId, vrstice }: { igralecId: number; vrstice: IzbranostLige[] }) {
  const id = useId()
  const seznam = useRef<HTMLHeadingElement>(null)
  // Ekipe v različnih ligah so različne ekipe: vsota ne šteje dvakrat.
  const stete = vrstice.filter((v) => odstotek(v.owners, v.ekip) != null)
  const skupaj = stete.reduce((s, v) => s + (v.owners ?? 0), 0)
  const ena = stete.length === 1 ? stete[0] : null
  const [ekipe, setEkipe] = useState<EkipaZIgralcem[]>([])
  const [nalaga, setNalaga] = useState(false)

  useEffect(() => {
    let velja = true
    setEkipe([])
    void ekipeZIgralcem(igralecId).then((v) => velja && setEkipe(v))
    return () => {
      velja = false
    }
  }, [igralecId])

  const vseh = ekipe[0]?.skupaj ?? 0
  const nalozi = () => {
    setNalaga(true)
    void ekipeZIgralcem(igralecId, ekipe.length).then((v) => {
      setEkipe((prej) => [...prej, ...v])
      setNalaga(false)
    })
  }

  return (
    <section aria-labelledby={id} className="izbranost-reflektor space-y-4 rounded-2xl p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gnl-300">{t('igralci.izbranost.zgodba')}</p>
        <h2 id={id} className="text-lg font-black text-white sm:text-xl">
          {t('igralci.izbranost.naslovReflektor')}
        </h2>
      </div>

      {stete.length ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-200">{t('igralci.izbranost.stevecOznaka')}</p>
          <p className="text-6xl font-black tabular-nums leading-none text-white">{stevilo(skupaj)}</p>
          <p className="text-xs text-slate-300">
            {ena && ena.krog != null && ena.zaklenjen
              ? t('igralci.izbranost.virEna', {
                  liga: ena.liga,
                  sezona: ena.sezona ?? '',
                  krog: ena.krog,
                  datum: datum(ena.zaklenjen),
                })
              : t('igralci.izbranost.virVec', { n: stete.length })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-200">{stanje(vrstice[0])}</p>
      )}

      {vseh > 0 && (
        <button
          type="button"
          onClick={() => {
            seznam.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            seznam.current?.focus({ preventScroll: true })
          }}
          className="gumb-glavni min-h-11 w-full text-sm sm:w-auto sm:px-5"
        >
          {t('igralci.izbranost.razisci')}
        </button>
      )}

      <div className="space-y-3 border-t border-white/10 pt-3">
        <h3 ref={seznam} tabIndex={-1} className="font-semibold text-slate-100 outline-none">
          {t('igralci.izbranost.seznam')}
          {vseh > 0 && <span className="ml-1 tabular-nums text-slate-400">({stevilo(vseh)})</span>}
        </h3>
        {vrstice.map((v) => {
          const pct = odstotek(v.owners, v.ekip)
          const lige = ekipe.filter((e) => e.competition_id === v.competition_id)
          return (
            <div key={v.player_id} className="space-y-1.5 rounded-xl bg-black/20 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-slate-100">{v.liga}</span>
                <span className="text-sm tabular-nums text-slate-200">{stanje(v)}</span>
              </div>
              {pct != null && (
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gnl-400" style={{ width: `${pct}%` }} />
                </div>
              )}
              {svez(v) && <p className="text-xs text-slate-400">{svez(v)}</p>}
              {lige.length > 0 && (
                <ul aria-label={v.liga} className="flex flex-wrap gap-1.5 pt-1">
                  {lige.map((e) => (
                    <li key={e.fantasy_team_id}>
                      <Link
                        to={zLigo(`/team/${e.fantasy_team_id}`, e.competition_slug)}
                        className="inline-flex min-h-9 items-center rounded-full bg-white/10 px-3 text-sm font-medium text-gnl-200 hover:bg-white/15 hover:underline"
                      >
                        {e.ime}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
        {ekipe.length > 0 && ekipe.length < vseh && (
          <button type="button" onClick={nalozi} disabled={nalaga} className="gumb-tih min-h-11 w-full px-3 py-1.5 text-sm disabled:opacity-60">
            {t('igralci.izbranost.vec')}
          </button>
        )}
        <p className="text-xs text-slate-400">{t('igralci.izbranost.seznamOpis')}</p>
      </div>
    </section>
  )
}

/** Preverjen gledalec na tujem profilu: le številke po ligah, brez imen ekip. */
function IzbranVEkipah({ vrstice }: { vrstice: IzbranostLige[] }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="kartica space-y-2 p-3 text-sm sm:p-4">
      <h2 id={id} className="font-bold text-slate-100">
        {t('igralci.izbranost.naslovTuj')}
      </h2>
      <ul className="divide-y divide-white/5">
        {vrstice.map((v) => {
          const pct = odstotek(v.owners, v.ekip)
          return (
            <li key={v.player_id} className="space-y-1 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-slate-200">{v.liga}</span>
                <span className="tabular-nums text-slate-200">{stanje(v)}</span>
              </div>
              {pct != null && (
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gnl-400" style={{ width: `${pct}%` }} />
                </div>
              )}
              {svez(v) && <p className="text-xs text-slate-500">{svez(v)}</p>}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-slate-500">
        {t('igralci.izbranost.opis')} {t('igralci.izbranost.ekipe')}
      </p>
    </section>
  )
}

/**
 * Lastnik potrjenega odraslega profila, ki še ni preverjen (le splet): isto
 * mesto in videz kot reflektor, a brez številk — kaj preverjanje odklene in
 * en gumb, ki odpre obstoječi nakup.
 */
export function PredogledPreverjanja({ naPreveri }: { naPreveri: () => void }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="izbranost-reflektor space-y-3 rounded-2xl p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gnl-300">{t('igralci.izbranost.zgodba')}</p>
      <h2 id={id} className="text-lg font-black text-white sm:text-xl">
        {t('igralci.izbranost.predogled.naslov')}
      </h2>
      <ul className="space-y-2 text-sm text-slate-100">
        {(['korist1', 'korist2', 'korist3'] as const).map((k) => (
          <li key={k} className="flex gap-2">
            <span className="font-bold text-gnl-300" aria-hidden="true">
              ✓
            </span>
            {t(`igralci.izbranost.predogled.${k}`)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-300">{t('igralci.izbranost.predogled.opomba')}</p>
      <button type="button" onClick={naPreveri} className="gumb-glavni min-h-11 w-full text-sm sm:w-auto sm:px-5">
        {t('igralci.izbranost.predogled.cta')}
      </button>
    </section>
  )
}
