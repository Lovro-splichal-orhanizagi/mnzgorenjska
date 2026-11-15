import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { t } from '../i18n'

/**
 * Odstranitev lastne ekipe v ligi, ki je človek ni hotel (SLF-462).
 *
 * Kliče `izbrisi_mojo_ekipo`: zbriše ekipo, njen kader in članstva v mini
 * ligah. Baza to dovoli le ekipi brez točk; sicer vrne napako s `hint`
 * `ekipa_ima_tocke` in človek se obrne na podporo. Vprašanje je v strani,
 * brez window.confirm (glej admin/Potrditev.tsx).
 */
export default function OdstraniEkipo({
  ekipaId,
  imeEkipe,
  imeLige,
  onKoncano,
}: {
  ekipaId: number
  imeEkipe: string
  imeLige: string
  onKoncano: () => void
}) {
  const [odprto, setOdprto] = useState(false)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const id = useId()
  const gumbPreklici = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (odprto) gumbPreklici.current?.focus()
  }, [odprto])

  async function potrdi() {
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('izbrisi_mojo_ekipo', { p_ekipa: ekipaId })
    setDela(false)
    if (error) {
      return setNapaka(
        (error as { hint?: string }).hint === 'ekipa_ima_tocke'
          ? t('mojaEkipa.odstraniEkipo.imaTocke')
          : prevediNapako(error.message),
      )
    }
    setOdprto(false)
    onKoncano()
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setNapaka(null)
          setOdprto((o) => !o)
        }}
        aria-expanded={odprto}
        className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-rose-300"
      >
        {t('mojaEkipa.odstraniEkipo.gumb')}
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
          className="animiraj-vstop space-y-2 rounded-xl bg-amber-400/10 p-3 text-sm ring-1 ring-amber-400/30"
        >
          <p id={id} className="text-amber-100">
            {t('mojaEkipa.odstraniEkipo.vprasanje', { ekipa: imeEkipe, liga: imeLige })}
          </p>
          {napaka && (
            <p role="alert" className="text-rose-300">
              {napaka}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void potrdi()} disabled={dela} className="gumb-glavni text-xs disabled:opacity-50">
              {dela ? t('lestvice.izstopMiniLige.delam') : t('mojaEkipa.odstraniEkipo.potrdi')}
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
    </div>
  )
}
