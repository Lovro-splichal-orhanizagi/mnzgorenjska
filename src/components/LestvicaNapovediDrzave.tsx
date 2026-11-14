import { useEffect, useState } from 'react'
import { Link } from './Povezava'
import { KraljNapovedi, KroneVrstice } from './NapovediMiniLige'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t } from '../i18n'
import type { Database } from '../lib/baza.types'

type Vrstica = Database['public']['Functions']['lestvica_napovedi_drzave']['Returns'][number]
type Pogled = 'sezona' | '7dni'

const MEDALJE = ['🥇', '🥈', '🥉']

/**
 * Zavihek Napovedi državne lestvice: najboljši napovedovalci vseh lig države
 * (`lestvica_napovedi_drzave`), sezona ali zadnjih 7 dni. Pravila in prikaz
 * kot lestvica napovedi lige (/predictions): prikazno ime, brez user_id,
 * vrh 50 in lastna vrstica, če je nižje.
 */
export default function LestvicaNapovediDrzave({ drzava }: { drzava: string }) {
  const { session } = useAuth()
  const uporabnikId = session?.user.id ?? null
  const [pogled, setPogled] = useState<Pogled>('sezona')
  const [vrstice, setVrstice] = useState<Vrstica[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    setVrstice(null)
    let veljavno = true
    supabase
      .rpc('lestvica_napovedi_drzave', { p_drzava: drzava, p_dni: pogled === '7dni' ? 7 : undefined })
      .then(({ data, error }) => {
        if (!veljavno) return
        setNapaka(error ? error.message : null)
        setVrstice(data ?? [])
      })
    return () => {
      veljavno = false
    }
    // Prijava spremeni `je_moj`, zato lestvico preberemo znova.
  }, [drzava, pogled, uporabnikId])

  if (napaka) return <p className="text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{t('lestvice.slovenija.napovediUvod')}</p>
        <div className="inline-flex rounded-lg bg-white/5 p-0.5">
          {(
            [
              ['sezona', t('lestvice.slovenija.napovediSezona')],
              ['7dni', t('lestvice.slovenija.napovedi7dni')],
            ] as [Pogled, string][]
          ).map(([k, naslov]) => (
            <button
              key={k}
              onClick={() => setPogled(k)}
              aria-pressed={pogled === k}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                pogled === k ? 'bg-gnl-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {naslov}
            </button>
          ))}
        </div>
      </div>

      {vrstice == null ? (
        <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>
      ) : vrstice.every((v) => v.ocenjenih === 0) ? (
        <p className="text-sm text-slate-400">
          {pogled === '7dni' ? t('lestvice.slovenija.napovediPrazno7') : t('lestvice.napovedi.prazna')}
        </p>
      ) : (
        <>
          <KraljNapovedi vrstice={vrstice} krog={null} />
          <ol className="kartica divide-y divide-white/10 px-3 sm:px-4">
            <li className="flex items-center gap-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-slate-500">
              <span className="w-7 shrink-0" />
              <span className="min-w-0 flex-1" />
              <span className="w-9 shrink-0" />
              <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocni')}</span>
              <span className="w-12 shrink-0 text-right">{t('lestvice.napovedi.tocke')}</span>
            </li>
            {vrstice.map((v, i) => {
              // Lastna vrstica pod vrhom 50 je ločena s presledkom.
              const vrzel = i > 0 && v.je_moj && v.mesto > vrstice[i - 1].mesto + 1
              return (
                <li
                  key={i}
                  className={`flex min-h-[48px] items-center gap-3 py-1.5 text-sm ${
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {v.display_name}
                      {v.je_moj && (
                        <span className="ml-1.5 text-xs font-normal text-gnl-300">({t('lestvice.napovediLige.ti')})</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {t('lestvice.slovenija.napovediOcenjenih', { n: v.ocenjenih })}
                    </span>
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

      <p className="text-sm">
        <Link to="/predictions" className="font-semibold text-gnl-300 hover:text-gnl-200">
          {t('lestvice.napovedi.naslov')} →
        </Link>
      </p>
    </div>
  )
}
