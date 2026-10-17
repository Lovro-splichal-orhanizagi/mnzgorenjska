import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'

/**
 * Stikalo šaljivih nagrad tedenskega pregleda — vidi ga le ustvarjalec mini
 * lige. Izklop skrije Leseno žlico, Prosti pad in Zlato na klopi; pohvale
 * ostanejo. Piše le `nastavi_saljive_nagrade` (preveri lastnika).
 */
export default function SaljiveNagrade({
  liga,
  onSpremenjeno,
}: {
  liga: { id: number; saljive_nagrade: boolean }
  onSpremenjeno: () => void
}) {
  const [vklop, setVklop] = useState(liga.saljive_nagrade)
  const [dela, setDela] = useState(false)
  const [sporocilo, setSporocilo] = useState<{ napaka: boolean; besedilo: string } | null>(null)

  useEffect(() => {
    setVklop(liga.saljive_nagrade)
    setSporocilo(null)
  }, [liga.id, liga.saljive_nagrade])

  async function nastavi(novo: boolean) {
    setVklop(novo)
    setSporocilo(null)
    setDela(true)
    const { error } = await supabase.rpc('nastavi_saljive_nagrade', { p_liga: liga.id, p_vklop: novo })
    setDela(false)
    if (error) {
      setVklop(!novo)
      return setSporocilo({ napaka: true, besedilo: t('lestvice.saljiveNagrade.napaka') })
    }
    setSporocilo({ napaka: false, besedilo: t('lestvice.saljiveNagrade.shranjeno') })
    onSpremenjeno()
  }

  return (
    <details className="group kartica p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="mr-1 inline-block text-slate-500 transition group-open:rotate-90">
          ›
        </span>
        {t('lestvice.saljiveNagrade.naslov')}
      </summary>
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-slate-400">{t('lestvice.saljiveNagrade.opis')}</p>
        <label className="flex items-center gap-2 text-slate-200">
          <input
            type="checkbox"
            checked={vklop}
            disabled={dela}
            onChange={(e) => void nastavi(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          {t('lestvice.saljiveNagrade.vklop')}
        </label>
        {sporocilo && (
          <p className={`text-xs ${sporocilo.napaka ? 'text-rose-400' : 'text-gnl-300'}`} role="status">
            {sporocilo.besedilo}
          </p>
        )}
      </div>
    </details>
  )
}
