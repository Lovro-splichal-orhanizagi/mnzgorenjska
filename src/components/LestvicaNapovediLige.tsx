// Lestvica napovedi lige: skupna ali za izbrani krog, s kronami. Na strani
// /predictions in kot zavihek Napovedi na lestvici lige.
import { useEffect, useState } from 'react'
import { IzbiraKroga, KraljNapovedi, KroneVrstice } from './NapovediMiniLige'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type VrsticaLestvice = Database['public']['Functions']['lestvica_napovedi_lige']['Returns'][number]

const MEDALJE = ['🥇', '🥈', '🥉']

/**
 * `krogi` (končani krogi z napovedmi, najnovejši prvi) poda stran, ki jih že
 * ima; sicer jih komponenta prebere sama.
 */
export default function LestvicaNapovediLige({
  tekmovanjeId,
  krogi: podaniKrogi,
}: {
  tekmovanjeId: number | null
  krogi?: number[]
}) {
  const { session } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const [lastniKrogi, setLastniKrogi] = useState<number[]>([])
  const [krog, setKrog] = useState<number | null>(null)
  const [lestvica, setLestvica] = useState<VrsticaLestvice[] | null>(null)
  const krogi = podaniKrogi ?? lastniKrogi

  // Nova liga začne pri skupni lestvici.
  useEffect(() => setKrog(null), [tekmovanjeId])

  useEffect(() => {
    setLastniKrogi([])
    if (podaniKrogi || tekmovanjeId == null) return
    let veljavno = true
    supabase.rpc('krogi_napovedi_lige', { p_tekmovanje: tekmovanjeId }).then(({ data }) => {
      if (veljavno) setLastniKrogi((data ?? []).map((k) => k.krog))
    })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId, podaniKrogi])

  useEffect(() => {
    setLestvica(null)
    if (tekmovanjeId == null) return
    let veljavno = true
    supabase
      .rpc('lestvica_napovedi_lige', { p_tekmovanje: tekmovanjeId, p_krog: krog ?? undefined })
      .then(({ data }) => {
        if (veljavno) setLestvica(data ?? [])
      })
    return () => {
      veljavno = false
    }
    // Prijava spremeni `je_moj`, zato lestvico preberemo znova.
  }, [tekmovanjeId, krog, uporabnikId])

  return (
    <section className="kartica space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t('lestvice.napovedi.lestvicaNaslov')}</h2>
        <IzbiraKroga krogi={krogi} krog={krog} onKrog={setKrog} />
      </div>

      {lestvica == null ? (
        <p className="animiraj-utrip text-sm text-slate-400">{t('skupno.nalaganje')}</p>
      ) : lestvica.length === 0 || lestvica.every((v) => v.ocenjenih === 0) ? (
        <p className="text-sm text-slate-400">{t('lestvice.napovedi.prazna')}</p>
      ) : (
        <>
        <KraljNapovedi vrstice={lestvica} krog={krog} />
        <ol className="divide-y divide-white/10">
          <li className="flex items-center gap-3 pb-1 text-[11px] uppercase tracking-wide text-slate-500">
            <span className="w-7 shrink-0" />
            <span className="min-w-0 flex-1" />
            <span className="w-9 shrink-0" />
            <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocni')}</span>
            <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocke')}</span>
          </li>
          {lestvica.map((v, i) => {
            // Lastna vrstica pod vrhom 50 je ločena s presledkom.
            const vrzel = i > 0 && v.je_moj && v.mesto > lestvica[i - 1].mesto + 1
            return (
              <li
                key={i}
                className={`flex min-h-[44px] items-center gap-3 py-1.5 text-sm ${
                  v.je_moj ? '-mx-2 rounded-lg bg-gnl-500/10 px-2 ring-1 ring-gnl-400/30' : ''
                } ${vrzel ? 'mt-3' : ''}`}
              >
                <span className="w-7 shrink-0 text-center font-bold text-slate-400">
                  {v.mesto <= 3 ? (
                    <span role="img" aria-label={t('lestvice.mesto', { mesto: v.mesto })}>
                      {MEDALJE[v.mesto - 1]}
                    </span>
                  ) : (
                    v.mesto
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {v.display_name}
                  {v.je_moj && <span className="ml-1.5 text-xs font-normal text-gnl-300">({t('lestvice.napovediLige.ti')})</span>}
                </span>
                <KroneVrstice kralj={v.kralj} kron={v.kron} />
                <span className="w-12 shrink-0 text-right tabular-nums text-slate-400">{v.tocnih}</span>
                <span className="w-12 shrink-0 text-right font-bold tabular-nums text-gnl-300">{v.tocke}</span>
              </li>
            )
          })}
        </ol>
        </>
      )}
    </section>
  )
}
