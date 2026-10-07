import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatirajTocke } from '../lib/pomozno'
import {
  besediloPregleda,
  deliBesedilo,
  naslovZgodbe,
  opisZgodbe,
  zgodbeKroga,
  type IzidDeljenja,
  type TedenskiPregled as Pregled,
} from '../lib/miniLige'
import { t } from '../i18n'
import { izvor } from '../lib/platforma'

/**
 * Tedenski pregled mini lige: zgodbe končanega kroga.
 *
 * Lestvica pove, kdo vodi; pregled pove, kaj se je zgodilo — in to je
 * tisto, o čemer se v skupini pogovarja do naslednjega kroga. Privzeto
 * zadnji končani krog, starejše izbere vrstica krogov.
 */
export default function TedenskiPregled({ ligaId, ime, koda }: { ligaId: number; ime: string; koda: string }) {
  const [krog, setKrog] = useState<number | null>(null)
  const [pregled, setPregled] = useState<Pregled | null | undefined>(undefined)
  const [izid, setIzid] = useState<IzidDeljenja | null>(null)

  // Nova liga začne pri zadnjem krogu.
  useEffect(() => setKrog(null), [ligaId])

  useEffect(() => {
    let veljavno = true
    setPregled(undefined)
    setIzid(null)
    supabase
      .rpc('tedenski_pregled_mini_lige', { p_liga: ligaId, p_krog: krog ?? undefined })
      .then(({ data, error }) => {
        if (!veljavno) return
        // Napaka ali migracija, ki še ni prišla: pregleda ni, stran dela naprej.
        setPregled(error ? null : ((data as unknown as Pregled | null) ?? null))
      })
    return () => {
      veljavno = false
    }
  }, [ligaId, krog])

  const zgodbe = useMemo(() => zgodbeKroga(pregled), [pregled])

  // Vrstica krogov drsi vodoravno; izbrani krog naj bo viden.
  const vrsticaKrogov = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const vrsta = vrsticaKrogov.current
    const gumb = vrsta?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (vrsta && gumb) vrsta.scrollLeft = gumb.offsetLeft - (vrsta.clientWidth - gumb.offsetWidth) / 2
  }, [pregled])

  if (pregled === null) return null

  return (
    <section className="kartica space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t('lestvice.pregled.naslov')}</h2>
        {pregled && pregled.krogi.length > 0 && (
          <div
            ref={vrsticaKrogov}
            className="relative flex min-w-0 max-w-full gap-1 overflow-x-auto pb-1"
            role="group"
            aria-label={t('lestvice.pregled.krog')}
          >
            {pregled.krogi.map((k) => (
              <button
                key={k}
                onClick={() => setKrog(k)}
                aria-pressed={k === pregled.krog}
                className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-bold tabular-nums ${
                  k === pregled.krog
                    ? 'bg-gnl-500/20 text-gnl-200 ring-1 ring-gnl-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('lestvice.krog', { n: k })}
              </button>
            ))}
          </div>
        )}
      </div>

      {pregled === undefined ? (
        <p className="animiraj-utrip text-sm text-slate-400">{t('lestvice.pregled.nalaganje')}</p>
      ) : pregled.krog == null ? (
        <p className="text-sm text-slate-400">{t('lestvice.pregled.prazno')}</p>
      ) : (
        <>
          {zgodbe.length > 0 && (
            // Zgodbe so vrstice z ločnico, ne kartice v kartici; slabo novico
            // pove le barva naslova.
            <ul className="divide-y divide-white/10 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
              {zgodbe.map((z) => (
                <li key={z.vrsta} className="py-2">
                  <div
                    className={`text-xs font-bold uppercase tracking-wide ${
                      z.vrsta === 'zlica' || z.vrsta === 'padec' || z.vrsta === 'klop'
                        ? 'text-rose-300'
                        : 'text-gnl-300'
                    }`}
                  >
                    {naslovZgodbe(z)}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-100">{opisZgodbe(z)}</p>
                  {z.lastnik && <p className="mt-0.5 truncate text-xs text-slate-500">{z.lastnik}</p>}
                </li>
              ))}
            </ul>
          )}

          {(pregled.vrstice?.length ?? 0) === 1 && (
            <p className="text-sm text-slate-400">{t('lestvice.pregled.samoEna')}</p>
          )}

          {(pregled.vrstice?.length ?? 0) > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                {t('lestvice.pregled.tockeKroga')}
              </summary>
              <ol className="mt-2 space-y-1">
                {pregled.vrstice!.map((v, i) => (
                  <li key={v.ekipa_id} className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs text-slate-500">{i + 1}.</span>
                    <Link to={`/team/${v.ekipa_id}`} className="min-w-0 flex-1 truncate hover:text-gnl-300">
                      {v.ekipa}
                    </Link>
                    <span className="font-bold tabular-nums text-gnl-300">{formatirajTocke(v.tocke)}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {zgodbe.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={async () =>
                  setIzid(
                    await deliBesedilo(
                      t('lestvice.pregled.sporociloNaslov', { ime, krog: pregled.krog ?? '' }),
                      besediloPregleda(ime, pregled.krog ?? 0, zgodbe, koda, izvor()),
                    ),
                  )
                }
                className="gumb-glavni text-sm"
              >
                {t('lestvice.pregled.deliPregled')}
              </button>
              {izid && izid !== 'preklicano' && (
                <span className={`text-sm ${izid === 'neuspelo' ? 'text-rose-400' : 'text-gnl-300'}`} role="status">
                  {izid === 'deljeno'
                    ? t('lestvice.miniLige.poslano')
                    : izid === 'kopirano'
                      ? t('lestvice.pregled.kopiran')
                      : t('lestvice.miniLige.neuspelo')}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
