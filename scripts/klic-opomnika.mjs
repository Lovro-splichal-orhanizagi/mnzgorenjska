// Klic edge funkcije `posli-opomnik` s ponovitvami omrežnih napak.
//
// 20. in 21. 10. 2026 je "Poslji push opomnike (ni ekipe)" padel na prvem
// klicu: `TypeError: fetch failed` z `read ECONNRESET`. Ena prekinjena
// povezava je podrla korak za vse lige in tisti krog push opomnikov ni šel.
//
// Ponovimo samo to, kar je `fetch` zavrgel (omrežje, ne HTTP odgovor): status
// 4xx/5xx funkcija vrne po svoji presoji (409 = varovalka na ligo) in ga
// ponovitev ne sme preglasiti. Ponovitev ne podvoji pošte: funkcija po vsakem
// prejemniku zapiše `email_log`, kandidate pa izbere brez že obveščenih, zato
// pri ECONNRESET, kjer ne vemo, ali je zahtevek dosegel funkcijo, ponovni klic
// ne more obvestiti nikogar, ki je bil že obveščen (največ tistega, ki je bil
// ob prekinitvi v teku).
import { jePrehodnaNapaka } from './prenos.mjs'

// Premori pred 2. in 3. poskusom; trije poskusi skupaj.
// `OPOMNIK_ZAMIKI_MS` (npr. "0,0") je za preizkus.
export const ZAMIKI_KLICA_MS = process.env.OPOMNIK_ZAMIKI_MS
  ? process.env.OPOMNIK_ZAMIKI_MS.split(',').map(Number)
  : [2000, 6000]
const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

export async function klicSPonovitvami(
  fetchFn,
  url,
  init,
  { zamiki = ZAMIKI_KLICA_MS, log = (v) => console.log(v) } = {},
) {
  for (let poskus = 0; ; poskus++) {
    try {
      return await fetchFn(url, init)
    } catch (e) {
      if (!jePrehodnaNapaka(e) || poskus >= zamiki.length) throw e
      log(`  ponovim klic (${poskus + 2}/${zamiki.length + 1}) čez ${zamiki[poskus] / 1000} s: ${e.cause?.code ?? e.message}`)
      await cakaj(zamiki[poskus])
    }
  }
}
