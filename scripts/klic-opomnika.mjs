// Klic edge funkcije `posli-opomnik` s ponovitvami omrežnih napak.
//
// 20. in 21. 10. 2026 je "Poslji push opomnike (ni ekipe)" padel na prvem
// klicu: `TypeError: fetch failed` z `read ECONNRESET`. Ena prekinjena
// povezava je podrla korak za vse lige in tisti krog push opomnikov ni šel.
//
// Ponovimo samo to, kar je `fetch` zavrgel (omrežje, ne HTTP odgovor): status
// 4xx/5xx funkcija vrne po svoji presoji (409 = varovalka na ligo) in ga
// ponovitev ne sme preglasiti.
//
// Pri ECONNRESET ne vemo, ali je zahtevek dosegel funkcijo. Če jo je in še
// pošilja, bi takojšnja ponovitev istim prejemnikom poslala drugič: `opozorilo`
// in `opozorilo-odsotni` kandidatov ne preverjata znova ob vsakem prejemniku.
// Zato po nejasni napaki počakamo dlje od omejitve funkcije (60 s, glej
// posli-opomnike.mjs); do takrat je prvi klic končan in je `email_log` že
// zapisan, ponovni klic pa kandidate izbere brez že obveščenih. Kratek premor
// zadostuje le tam, kjer zahtevek zagotovo ni dosegel funkcije (povezave ni
// bilo).
import { jePrehodnaNapaka } from './prenos.mjs'

const NEDOSEGLJIVO = /^(ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|UND_ERR_CONNECT_TIMEOUT)$/

// Premori pred 2. in 3. poskusom, ko zahtevek funkcije zagotovo ni dosegel.
// `OPOMNIK_ZAMIKI_MS` (npr. "0,0") je za preizkus in velja tudi za nejasne napake.
const IZ_ENV = process.env.OPOMNIK_ZAMIKI_MS?.split(',').map(Number)
export const ZAMIKI_KLICA_MS = IZ_ENV ?? [2000, 6000]
export const ZAMIK_NEJASNO_MS = IZ_ENV ? Math.max(...IZ_ENV) : 65000
const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

export async function klicSPonovitvami(
  fetchFn,
  url,
  init,
  { zamiki = ZAMIKI_KLICA_MS, zamikNejasno = ZAMIK_NEJASNO_MS, log = (v) => console.log(v) } = {},
) {
  for (let poskus = 0; ; poskus++) {
    try {
      return await fetchFn(url, init)
    } catch (e) {
      if (!jePrehodnaNapaka(e) || poskus >= zamiki.length) throw e
      const koda = String(e.cause?.code ?? e.code ?? '')
      const zamik = NEDOSEGLJIVO.test(koda) ? zamiki[poskus] : zamikNejasno
      log(`  ponovim klic (${poskus + 2}/${zamiki.length + 1}) čez ${zamik / 1000} s: ${koda || e.message}`)
      await cakaj(zamik)
    }
  }
}
