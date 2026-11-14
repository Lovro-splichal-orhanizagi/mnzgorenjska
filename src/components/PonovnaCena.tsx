// Plačljivo ponovno vrednotenje cene igralca (migracija 20261025193100).
//
// Ob ceni v glavi strani igralca: majhen poziv "Zahtevaj pregled cene", ki odpre
// okno z razlago in plačilom (Stripe Checkout prek funkcije `ponovna-cena`).
// Izračun je isti kot ob tedenskem zagonu in ceno premakne šele admin, zato
// besedilo ne obljublja smeri. Kaj kdo vidi in sme, pove baza
// (`ponovna_cena_stanje`: stikalo, ovira, odprt zahtevek, zadnji potrjeni izid).
//
// Stanje drži en kavelj (`usePonovnaCena`): pri izložbi je cena v strani dvakrat
// (namizje, mobilno), zato se baza vpraša enkrat in okno je eno.
// V mobilni aplikaciji ga ni (plačila v aplikaciji le prek trgovin), tudi ne
// za neprijavljene.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
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

export interface PonovnaCenaKrmilo {
  stanje: Stanje | null
  odprto: boolean
  odpri: () => void
  zapri: () => void
  dela: boolean
  napaka: string | null
  odpoved: boolean
  nastaviOdpoved: (v: boolean) => void
  kupi: () => Promise<void>
}

export function usePonovnaCena(igralecId: number | undefined): PonovnaCenaKrmilo {
  const { session } = useAuth()
  const [stanje, setStanje] = useState<Stanje | null>(null)
  const [odprto, setOdprto] = useState(false)
  const [odpoved, setOdpoved] = useState(false)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const odpri = useCallback(() => setOdprto(true), [])
  const zapri = useCallback(() => setOdprto(false), [])

  const smePrikazati = !jeNativno() && Boolean(session) && igralecId != null
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

  return {
    stanje: smePrikazati && stanje?.vidno ? stanje : null,
    odprto,
    odpri,
    zapri,
    dela,
    napaka,
    odpoved,
    nastaviOdpoved: setOdpoved,
    kupi,
  }
}

function znesekCene(stanje: Stanje) {
  return stevilo((stanje.centi ?? 499) / 100, { style: 'currency', currency: 'EUR' })
}

/** Majhen poziv ob ceni: besedilna povezava s ceno, brez kartice. Ko ni na voljo, ga ni. */
export function PonovnaCenaAkcija({ krmilo }: { krmilo: PonovnaCenaKrmilo }) {
  const { stanje } = krmilo
  if (!stanje || stanje.v_pregledu || stanje.ovira != null) return null
  return (
    <button
      type="button"
      onClick={krmilo.odpri}
      className="flex min-h-11 w-fit items-center gap-1.5 text-xs font-semibold text-gnl-300 underline decoration-dotted underline-offset-2 hover:text-white sm:ml-auto sm:min-h-8"
    >
      {t('igralci.ponovnaCena.gumb')}
      <span className="font-normal text-slate-500">· {znesekCene(stanje)}</span>
    </button>
  )
}

/** Povratna informacija pod glavo: plačilo uspelo, zahtevek v pregledu, ovira, zadnji izid. */
export function PonovnaCenaPovratno({ krmilo }: { krmilo: PonovnaCenaKrmilo }) {
  const { search } = useLocation()
  const { stanje } = krmilo
  const vrnitev = new URLSearchParams(search).get('cena')
  if (!stanje && vrnitev !== 'uspeh') return null
  const z = stanje?.zadnja
  const ovira = stanje?.ovira ? OVIRE[stanje.ovira as keyof typeof OVIRE] : undefined
  return (
    <div className="space-y-1 text-xs text-slate-400">
      {vrnitev === 'uspeh' && <p className="text-sm text-gnl-300">{t('igralci.ponovnaCena.uspeh')}</p>}
      {stanje?.v_pregledu ? (
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
    </div>
  )
}

/** Okno z razlago, ceno, soglasjem in plačilom (isto kot doslej). */
export function PonovnaCenaOkno({ krmilo }: { krmilo: PonovnaCenaKrmilo }) {
  const { stanje, odprto, zapri } = krmilo
  const okno = useRef<HTMLDivElement | null>(null)
  const idp = useId()

  useEffect(() => {
    if (!odprto) return
    okno.current?.focus()
    const tipka = (e: KeyboardEvent) => e.key === 'Escape' && zapri()
    window.addEventListener('keydown', tipka)
    return () => window.removeEventListener('keydown', tipka)
  }, [odprto, zapri])

  if (!odprto || !stanje) return null
  const znesek = znesekCene(stanje)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pb-[max(1rem,var(--dno))] pt-[max(1rem,var(--vrh))] text-left backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && zapri()}
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
          <input
            id={`${idp}-odpoved`}
            type="checkbox"
            className="mt-1"
            checked={krmilo.odpoved}
            onChange={(e) => krmilo.nastaviOdpoved(e.target.checked)}
          />
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
        {krmilo.napaka && <p className="text-rose-400">{krmilo.napaka}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="gumb-tih text-sm" onClick={zapri}>
            {t('igralci.ponovnaCena.zapri')}
          </button>
          <button
            type="button"
            className="gumb-glavni flex-1 text-sm disabled:opacity-50 sm:flex-none"
            disabled={krmilo.dela || !krmilo.odpoved}
            onClick={() => void krmilo.kupi()}
          >
            {t('igralci.ponovnaCena.kupi', { cena: znesek })}
          </button>
        </div>
      </div>
    </div>
  )
}
