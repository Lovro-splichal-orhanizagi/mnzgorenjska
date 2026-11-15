import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { t } from '../i18n'

/**
 * Razpustitev mini lige (le lastnik, SLF-462).
 *
 * Briše vrstico v `mini_lige`; prek CASCADE odidejo članstva, dvoboji in
 * napovedi te lige. Ekipe, igralci in točke ostanejo, koda povabila preneha
 * veljati. Pravico preveri RLS (politika "lastnik razpusti mini ligo").
 * Vprašanje je v strani, brez window.confirm (glej admin/Potrditev.tsx).
 */
export default function RazpustiMiniLigo({
  ligaId,
  imeLige,
  onKoncano,
}: {
  ligaId: number
  imeLige: string
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

  // Druga liga: vprašanje iz prejšnje ne sme ostati odprto.
  useEffect(() => {
    setOdprto(false)
    setNapaka(null)
  }, [ligaId])

  async function potrdi() {
    setDela(true)
    setNapaka(null)
    const { error, count } = await supabase
      .from('mini_lige')
      .delete({ count: 'exact' })
      .eq('id', ligaId)
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    // RLS tuje vrstice tiho preskoči: nič izbrisanega pomeni, da ni šlo.
    if (!count) return setNapaka(t('lestvice.izstopMiniLige.niUspelo'))
    setOdprto(false)
    onKoncano(t('lestvice.razpustiMiniLigo.razpuscena', { liga: imeLige }))
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
        {t('lestvice.razpustiMiniLigo.gumb')}
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
            {t('lestvice.razpustiMiniLigo.vprasanje', { liga: imeLige })}
          </p>
          {napaka && (
            <p role="alert" className="text-rose-300">
              {napaka}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void potrdi()} disabled={dela} className="gumb-glavni text-xs disabled:opacity-50">
              {dela ? t('lestvice.izstopMiniLige.delam') : t('lestvice.razpustiMiniLigo.potrdi')}
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
