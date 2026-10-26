import { useEffect, useState } from 'react'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'

/**
 * Poziv na Moji ekipi: naslednji krog lige ima tekme brez moje napovedi.
 * Kaže se vsakemu z ekipo v ligi — napovedi tekmujejo na lestvici lige
 * (/predictions) in v vseh njegovih mini ligah.
 */
export default function PozivNapovedi({ tekmovanjeId }: { tekmovanjeId: number | null }) {
  const [poziv, setPoziv] = useState<{ krog: number; brez: number } | null>(null)

  useEffect(() => {
    setPoziv(null)
    if (tekmovanjeId == null) return
    let veljavno = true
    ;(async () => {
      const { data: tekme } = await supabase.rpc('moje_odprte_napovedi', { p_tekmovanje: tekmovanjeId })
      const brez = (tekme ?? []).filter((tk) => tk.napoved_doma == null)
      if (veljavno && brez.length) setPoziv({ krog: brez[0].krog, brez: brez.length })
    })()
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId])

  if (!poziv) return null
  return (
    <Link
      to="/predictions"
      className="kartica flex items-center gap-3 p-3 transition hover:bg-white/5"
    >
      <span aria-hidden className="text-2xl">🎯</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {t('lestvice.napovedi.poziv', { krog: t('lestvice.krog', { n: poziv.krog }) })}
        </span>
        <span className="block text-xs text-slate-400">{t('lestvice.napovedi.pozivOpis', { n: poziv.brez })}</span>
      </span>
      <span className="gumb-glavni shrink-0 text-sm">{t('lestvice.napovedi.pozivGumb')}</span>
    </Link>
  )
}
