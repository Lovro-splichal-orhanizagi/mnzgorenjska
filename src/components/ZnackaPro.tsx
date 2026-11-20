import { t } from '../i18n'

/** Značka SLFF Pro ob imenu ekipe (le dodatek, brez vpliva na igro). */
export function ZnackaPro() {
  return (
    <span
      title={t('pro.znackaOpis')}
      className="ml-1 inline-block rounded bg-amber-400/15 px-1 align-middle text-[10px] font-black uppercase leading-4 text-amber-300"
    >
      {t('pro.znacka')}
    </span>
  )
}
