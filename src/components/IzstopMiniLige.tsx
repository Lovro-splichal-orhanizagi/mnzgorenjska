import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { t } from '../i18n'

/**
 * Izstop ekipe iz mini lige ali odstranitev tuje ekipe (lastnik mini lige).
 *
 * Briše le vrstico v `mini_liga_clani`; ekipa, njeni igralci in točke ostanejo.
 * Pravico preveri RLS (politika "odidi ali odstrani"): lastnik ekipe jo sme
 * umakniti, lastnik mini lige sme umakniti katerokoli. Lastništvo mini lige
 * ostane, tudi ko lastnik umakne svojo zadnjo ekipo: `sem_v_mini_ligi` mu ligo
 * pokaže še naprej, zato ne nastane liga brez lastnika.
 *
 * Vrne gumb in, ko je odprto, vprašanje v vrstici pod njim (brez
 * window.confirm, glej admin/Potrditev.tsx). Starš naj bo `flex-wrap`, da
 * vprašanje pade v svojo vrstico.
 */
export default function IzstopMiniLige({
  ligaId,
  imeLige,
  ekipaId,
  imeEkipe,
  ligaEkipe,
  nacin,
  zadnja = false,
  lastnik = false,
  javna = false,
  onKoncano,
}: {
  ligaId: number
  imeLige: string
  ekipaId: number
  imeEkipe: string
  /** Kratko ime lige (tekmovanja) ekipe: kadar ima človek več ekip, pove, katera odide. */
  ligaEkipe?: string | null
  /** `izstop`: svoja ekipa odide. `odstrani`: lastnik mini lige umakne tujo. */
  nacin: 'izstop' | 'odstrani'
  /** Izstop zadnje svoje ekipe: liga izgine s seznama (če nisi lastnik). */
  zadnja?: boolean
  /** Izstopa lastnik mini lige: ostane lastnik. */
  lastnik?: boolean
  /** Javna liga: odstranjena ekipa se lahko spet pridruži. */
  javna?: boolean
  onKoncano: (sporocilo: string) => void
}) {
  const [odprto, setOdprto] = useState(false)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const id = useId()
  const gumbPreklici = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (odprto) gumbPreklici.current?.focus()
  }, [odprto])

  const ekipa = ligaEkipe ? `${imeEkipe} (${ligaEkipe})` : imeEkipe
  const izstop = nacin === 'izstop'

  async function potrdi() {
    setDela(true)
    setNapaka(null)
    const { error, count } = await supabase
      .from('mini_liga_clani')
      .delete({ count: 'exact' })
      .eq('mini_liga_id', ligaId)
      .eq('fantasy_team_id', ekipaId)
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    // RLS tuje vrstice tiho preskoči: nič izbrisanega pomeni, da ni šlo.
    if (!count) return setNapaka(t('lestvice.izstopMiniLige.niUspelo'))
    setOdprto(false)
    onKoncano(
      t(izstop ? 'lestvice.izstopMiniLige.izstopila' : 'lestvice.izstopMiniLige.odstranjena', { ekipa }),
    )
  }

  const opombe = [
    izstop && lastnik ? t('lestvice.izstopMiniLige.lastnikOstane') : null,
    izstop && !lastnik && zadnja ? t('lestvice.izstopMiniLige.zadnja') : null,
    !izstop && javna ? t('lestvice.izstopMiniLige.javnaNazaj') : null,
  ].filter(Boolean)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNapaka(null)
          setOdprto((o) => !o)
        }}
        aria-expanded={odprto}
        aria-label={t(
          izstop ? 'lestvice.izstopMiniLige.izstopiAria' : 'lestvice.izstopMiniLige.odstraniAria',
          { ekipa },
        )}
        className="relative z-10 shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-rose-300"
      >
        {t(izstop ? 'lestvice.izstopMiniLige.izstopi' : 'lestvice.izstopMiniLige.odstrani')}
      </button>
      {odprto && (
        <div
          role="alertdialog"
          aria-labelledby={id}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !dela) {
              e.preventDefault()
              e.stopPropagation()
              setOdprto(false)
            }
          }}
          className="animiraj-vstop relative z-10 w-full basis-full space-y-2 rounded-xl bg-amber-400/10 p-3 text-sm ring-1 ring-amber-400/30"
        >
          <p id={id} className="text-amber-100">
            {t(
              izstop ? 'lestvice.izstopMiniLige.izstopVprasanje' : 'lestvice.izstopMiniLige.odstraniVprasanje',
              { ekipa, liga: imeLige },
            )}
            {opombe.map((o) => ` ${o}`)}
          </p>
          {napaka && (
            <p role="alert" className="text-rose-300">
              {napaka}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void potrdi()} disabled={dela} className="gumb-glavni text-xs disabled:opacity-50">
              {dela
                ? t('lestvice.izstopMiniLige.delam')
                : t(izstop ? 'lestvice.izstopMiniLige.potrdiIzstop' : 'lestvice.izstopMiniLige.potrdiOdstrani')}
            </button>
            <button
              ref={gumbPreklici}
              onClick={() => setOdprto(false)}
              disabled={dela}
              className="gumb-tih text-xs disabled:opacity-50"
            >
              {t('lestvice.izstopMiniLige.preklici')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
