// Prazen blok v velikosti vsebine, ki še prihaja: stran se ob prihodu podatkov
// ne premakne (CLS), napis "Nalaganje …" pa ostane le za bralnike zaslona.
import { t } from '../i18n'

export function Skelet({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animiraj-utrip rounded-lg bg-white/5 ${className}`} />
}

export function NalaganjeZaBralnik() {
  return (
    <p role="status" className="sr-only">
      {t('skupno.nalaganje')}
    </p>
  )
}
