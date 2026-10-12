// Sporočilo podpornika z Buy Me a Coffee je HTML (preloma vrstic piše kot
// `<br>`). Za Discord ga spremenimo v navadno besedilo; isto pravilo ima baza
// v `ocisti_sporocilo_piva` (sprožilec na tabeli `piva`), smoke ga preveri.
//
// &amp; zadnji, da "&amp;lt;" ostane "&lt;" in ne postane "<".
export const NAJVEC_ZNAKOV = 500

export function ocistiSporocilo(besedilo: string | null | undefined, najvec = NAJVEC_ZNAKOV): string | null {
  const cisto = (besedilo ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
    .slice(0, najvec)
    .trim()
  return cisto || null
}
