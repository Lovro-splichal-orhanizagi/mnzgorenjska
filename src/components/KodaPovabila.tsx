// Na registraciji: kdo te je povabil (koda iz povezave) ali vnos kode, ki ti
// jo je prijatelj povedal. Koda gre v localStorage; zabeleži jo
// `BeleziPovabilo` po prijavi (tudi po Googlu in potrditvi e-pošte).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { shraniKodoPovabila, shranjenaKodaPovabila, VZOREC_KODE } from '../lib/povabilo'
import { t } from '../i18n'

export default function KodaPovabila() {
  const [koda, setKoda] = useState(() => shranjenaKodaPovabila() ?? '')
  const [odprto, setOdprto] = useState(() => Boolean(shranjenaKodaPovabila()))
  const [ime, setIme] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!VZOREC_KODE.test(koda)) return setIme(undefined)
    let zivo = true
    const cakaj = setTimeout(() => {
      void supabase.rpc('vabilo_od', { p_koda: koda }).then(({ data }) => {
        if (!zivo) return
        const v = (data as { ime: string | null } | null)?.ime ?? null
        setIme(v)
        if (v) shraniKodoPovabila(koda)
      })
    }, 300)
    return () => {
      zivo = false
      clearTimeout(cakaj)
    }
  }, [koda])

  if (!odprto)
    return (
      <button type="button" onClick={() => setOdprto(true)} className="text-sm text-slate-400 underline hover:text-slate-200">
        {t('racun.vabilo.imasKodo')}
      </button>
    )

  return (
    <div className="space-y-1 rounded-xl border border-gnl-500/30 bg-gnl-500/10 p-3">
      {ime ? (
        <p className="text-sm font-semibold text-gnl-200">🎉 {t('racun.vabilo.povabilTe', { ime })}</p>
      ) : null}
      <label className="block text-sm text-slate-300">
        {t('racun.vabilo.kodaPolje')}
        <input
          value={koda}
          onChange={(e) => setKoda(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20))}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono"
        />
      </label>
      {ime === null && koda.length >= 3 && <p className="text-xs text-amber-300">{t('racun.vabilo.neznanaKoda')}</p>}
    </div>
  )
}
