// Ali ima odprta stran (Moja ekipa) neshranjene spremembe. Modulska zastavica
// namesto konteksta: berejo jo le deli vmesnika, ki sami zapustijo stran
// (izbirnik lige, odjava), in ob branju ni treba ničesar ponovno izrisati.

import { t } from '../i18n/jedro.ts'

let neshranjeno = false

export function nastaviNeshranjeno(v: boolean): void {
  neshranjeno = v
}

export function jeNeshranjeno(): boolean {
  return neshranjeno
}

export const VPRASANJE_ZAPUSTITVE = t('mojaEkipa.vprasanjeZapustitve')

/** true, če ni neshranjenih sprememb ali jih uporabnik potrdi, da jih zavrže. */
export function potrdiZapustitev(): boolean {
  if (!neshranjeno) return true
  if (typeof window === 'undefined') return true
  return window.confirm(VPRASANJE_ZAPUSTITVE)
}
