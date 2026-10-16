import type { Vrzel } from '../baza'
import { t } from '../besede'

export function Vrzeli() {
  return <h1 className="text-xl font-semibold">{t('vrzeli.naslov')}</h1>
}

export function opisVrzeli(_v: Pick<Vrzel, 'vrsta' | 'skupina' | 'ime' | 'vrednost'>): string {
  return ''
}
