// Plačljivo ponovno vrednotenje cene igralca (migracija 20261025193100).
//
// Pod glavo strani igralca: kartica s pozivom, ki odpre okno z razlago in plačilom
// (Stripe Checkout prek funkcije `ponovna-cena`). Izračun je isti kot ob
// tedenskem zagonu in ceno premakne šele admin, zato besedilo ne obljublja
// smeri. Kaj kdo vidi in sme, pove baza (`ponovna_cena_stanje`: stikalo,
// ovira, odprt zahtevek, zadnji potrjeni izid).
//
// V mobilni aplikaciji ga ni (plačila v aplikaciji le prek trgovin), tudi ne
// za neprijavljene.
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { jeNativno } from '../lib/platforma'
import { prevediNapako } from '../lib/napake'
import { formatirajCeno } from '../lib/pomozno'
import { t, tx, datum, stevilo, jezikSlovarja } from '../i18n'

interface Stanje {
  vidno: boolean
  ovira?: string | null
  v_pregledu?: boolean
  centi?: number
  zadnja?: { kdaj: string; stara: number; nova: number } | null
}

// Ovire, ki jih uporabniku razložimo; ostale (liga, mladinska, zaklenjena …) le skrijejo gumb.
const OVIRE = { ta_teden: 'taTeden', nedavno: 'nedavno', rok: 'rok' } as const

export default function PonovnaCena({ igralecId }: { igralecId: number }) {
  const { session } = useAuth()
  const { search } = useLocation()
  const [stanje, setStanje] = useState<Stanje | null>(null)
  const [odprto, setOdprto] = useState(false)
  const [odpoved, setOdpoved] = useState(false)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const okno = useRef<HTMLDivElement | null>(null)
  const idp = useId()
  const vrnitev = new URLSearchParams(search).get('cena')

  const smePrikazati = !jeNativno() && Boolean(session)
  useEffect(() => {
    if (!smePrikazati) return
    let zivo = true
    supabase.rpc('ponovna_cena_stanje', { p_player_id: igralecId }).then(({ data }) => {
      if (zivo) setStanje((data as Stanje | null) ?? null)
    })
    return () => {
      zivo = false
    }
  }, [igralecId, smePrikazati])

  useEffect(() => {
    if (!odprto) return
    okno.current?.focus()
    const tipka = (e: KeyboardEvent) => e.key === 'Escape' && setOdprto(false)
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [odprto])

  if (!smePrikazati || !stanje?.vidno) return null

  const znesek = stevilo((stanje.centi ?? 499) / 100, { style: 'currency', currency: 'EUR' })
  const ovira = stanje.ovira ? OVIRE[stanje.ovira as keyof typeof OVIRE] : undefined

  async function kupi() {
    setDela(true)
    setNapaka(null)
    const { data, error } = await supabase.functions.invoke('ponovna-cena', {
      body: { player_id: igralecId, jezik: jezikSlovarja() },
    })
    let sporocilo: string | undefined = data?.error
    if (error instanceof FunctionsHttpError) {
      sporocilo = await (error.context as Response)
        .json()
        .then((j: { error?: string }) => j?.error)
        .catch(() => undefined)
    }
    if (data?.url && !error) return window.location.assign(data.url as string)
    setDela(false)
    setNapaka(sporocilo ? prevediNapako(sporocilo) : t('igralci.ponovnaCena.napaka'))
  }

  const z = stanje.zadnja
  const naprodaj = !stanje.v_pregledu && stanje.ovira == null
  return (
    <div className="mt-4 space-y-1 text-xs text-slate-400">
      {vrnitev === 'uspeh' && <p className="text-sm text-gnl-300">{t('igralci.ponovnaCena.uspeh')}</p>}
      {naprodaj ? (
        // Edina plačljiva storitev na strani: kartica čez celo širino, ne povezava pod ceno.
        <section className="kartica flex flex-col gap-3 border-gnl-400/40 bg-gradient-to-br from-gnl-400/15 via-white/[0.04] to-transparent p-4 text-left sm:flex-row sm:items-center sm:gap-4">
          <span aria-hidden="true" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gnl-400/20 text-xl sm:flex">
            ⚖️
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-white">{t('igralci.ponovnaCena.vprasanje')}</p>
            <p className="text-sm text-slate-300">{t('igralci.ponovnaCena.podnaslov', { cena: znesek })}</p>
          </div>
          <button
            type="button"
            className="gumb-glavni w-full shrink-0 shadow-lg shadow-gnl-400/20 sm:w-auto"
            onClick={() => setOdprto(true)}
          >
            {t('igralci.ponovnaCena.gumb')}
          </button>
        </section>
      ) : stanje.v_pregledu ? (
        <p>{t('igralci.ponovnaCena.vPregledu')}</p>
      ) : (
        ovira && <p>{t(`igralci.ponovnaCena.ovire.${ovira}`)}</p>
      )}
      {z && (
        <p>
          {Number(z.nova) === Number(z.stara)
            ? t('igralci.ponovnaCena.zadnjaEnaka', { datum: datum(z.kdaj), stara: formatirajCeno(z.stara) })
            : t('igralci.ponovnaCena.zadnja', { datum: datum(z.kdaj), stara: formatirajCeno(z.stara), nova: formatirajCeno(z.nova) })}
        </p>
      )}
      {odprto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pb-[max(1rem,var(--dno))] pt-[max(1rem,var(--vrh))] text-left backdrop-blur"
          onClick={(e) => e.target === e.currentTarget && setOdprto(false)}
        >
          <div
            ref={okno}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${idp}-naslov`}
            tabIndex={-1}
            className="kartica w-full max-w-md space-y-3 p-4 text-sm text-slate-200"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`${idp}-naslov`} className="text-base font-bold">
                {t('igralci.ponovnaCena.naslov')}
              </h2>
              <span className="text-xl font-black tabular-nums text-gnl-300">{znesek}</span>
            </div>
            <p>{t('igralci.ponovnaCena.opis', { cena: znesek })}</p>
            <label htmlFor={`${idp}-odpoved`} className="flex cursor-pointer items-start gap-2">
              <input id={`${idp}-odpoved`} type="checkbox" className="mt-1" checked={odpoved} onChange={(e) => setOdpoved(e.target.checked)} />
              <span>{t('igralci.ponovnaCena.odpoved')}</span>
            </label>
            <p className="text-xs text-slate-400">
              {tx('igralci.ponovnaCena.pogoji', {}, {
                pogoji: (v) => (
                  <a href="/legal#placljivo" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">
                    {v}
                  </a>
                ),
              })}
            </p>
            {napaka && <p className="text-rose-400">{napaka}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="gumb-tih text-sm" onClick={() => setOdprto(false)}>
                {t('igralci.ponovnaCena.zapri')}
              </button>
              <button
                type="button"
                className="gumb-glavni flex-1 text-sm disabled:opacity-50 sm:flex-none"
                disabled={dela || !odpoved}
                onClick={() => void kupi()}
              >
                {t('igralci.ponovnaCena.kupi', { cena: znesek })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
