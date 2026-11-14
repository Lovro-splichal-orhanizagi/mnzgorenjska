// Jeziki trgovine = jeziki slff.eu (src/i18n/jedro.ts, PRIPRAVLJENI). Brez DOM-a:
// uvažajo ga risba.ts (tudi pod Node), besede.ts in smoke.

export const JEZIKI = ['sl', 'en', 'az', 'cs', 'da', 'de', 'el', 'es', 'et', 'hr', 'hu', 'hy', 'lv', 'mk', 'pl', 'ro', 'sk', 'sr', 'tr', 'uk'] as const
export type Jezik = (typeof JEZIKI)[number]

/** Ime jezika v njem samem (izbirnik). */
export const IMENA_JEZIKOV: Record<Jezik, string> = {
  sl: 'Slovenščina', en: 'English', az: 'Azərbaycanca', cs: 'Čeština', da: 'Dansk', de: 'Deutsch', el: 'Ελληνικά',
  es: 'Español', et: 'Eesti', hr: 'Hrvatski', hu: 'Magyar', hy: 'Հայերեն', lv: 'Latviešu', mk: 'Македонски',
  pl: 'Polski', ro: 'Română', sk: 'Slovenčina', sr: 'Srpski', tr: 'Türkçe', uk: 'Українська',
}

/** Oznaka za Intl (datumi, cene, imena držav), kot na slff.eu. */
export const LOKALE: Record<Jezik, string> = {
  sl: 'sl-SI', en: 'en-GB', az: 'az-Latn-AZ', cs: 'cs-CZ', da: 'da-DK', de: 'de-AT', el: 'el-GR', es: 'es-ES', et: 'et-EE',
  hr: 'hr-HR', hu: 'hu-HU', hy: 'hy-AM', lv: 'lv-LV', mk: 'mk-MK', pl: 'pl-PL', ro: 'ro-RO', sk: 'sk-SK', sr: 'sr-Latn-RS',
  tr: 'tr-TR', uk: 'uk-UA',
}

export const jeJezik = (x: unknown): x is Jezik => typeof x === 'string' && (JEZIKI as readonly string[]).includes(x)

/** Oznaka jezika (brskalnik, ?lang= s slff.eu): "de-AT" → de; bosanščina → hr, črnogorščina → sr. */
export function jezikIzOznake(oznaka: string | null | undefined): Jezik | null {
  const p = (oznaka ?? '').trim().toLowerCase().split(/[-_]/)[0] ?? ''
  const x = p === 'bs' ? 'hr' : p === 'cnr' ? 'sr' : p
  return jeJezik(x) ? x : null
}

/**
 * Jezik trgovine: ?lang= (povezava s slff.eu), shranjena izbira, prvi podprt
 * jezik brskalnika, sicer angleščina.
 */
export function izberiJezikIz(o: { param?: string | null; shranjen?: string | null; brskalnik?: readonly string[] | null }): Jezik {
  return jezikIzOznake(o.param) ?? (jeJezik(o.shranjen) ? o.shranjen : null)
    ?? (o.brskalnik ?? []).map(jezikIzOznake).find((j): j is Jezik => j !== null) ?? 'en'
}
