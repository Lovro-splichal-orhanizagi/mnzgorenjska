import type { Zadetek } from '../baza'
import { t } from '../besede'

export function Iskanje() {
  return <h1 className="text-xl font-semibold">{t('iskanje.naslov')}</h1>
}

export function utemeljitev(_z: Pick<Zadetek, 'percentil' | 'skupina' | 'minute' | 'delez_minut' | 'goli_90_pri_nas'>): string {
  return ''
}
