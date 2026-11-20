// Oglas AdSense na sponzorskem mestu, kjer ni sponzorja (glej lib/oglasi.ts).
// Ko oglasa ni (stikalo, mladinska liga, aplikacija, plačnik), ne izriše nič.
import { useEffect, useRef } from 'react'
import { naloziAdSense, useOglas } from '../lib/oglasi'
import { t } from '../i18n'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function Oglas({ kje }: { kje: string }) {
  const oglas = useOglas(kje)
  const enota = useRef<HTMLModElement | null>(null)

  useEffect(() => {
    const el = enota.current
    if (!oglas || !el || el.dataset.adsbygoogleStatus) return
    naloziAdSense(oglas.client)
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Blokirnik oglasov ali dvojni push: mesto ostane prazno.
    }
  }, [oglas])

  if (!oglas) return null
  return (
    <aside className="kartica overflow-hidden p-2" aria-label={t('aplikacija.oglas.oznaka')}>
      <span className="block px-1 text-xs uppercase tracking-wide text-slate-400">
        {t('aplikacija.oglas.oznaka')}
      </span>
      <ins
        ref={enota}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={oglas.client}
        data-ad-slot={oglas.slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
