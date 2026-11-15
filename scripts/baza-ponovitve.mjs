// Node --import preloader: zahtevki na bazo dobijo ponovitve prehodnih napak.
//
// Tedensko prevrednotenje je 3. 11. 2026 izgubilo devet zapisov cene
// (`TypeError: fetch failed` po `players.update(popravek)`, run 41629158707):
// `ovrednoti-igralce.mjs` ustvari odjemalca Supabase brez `fetchZaBazo`, igralec
// pa ostane teden dni pri stari ceni. Same skripte se ne dotikamo — njen
// zgoščeni vsebinski odtis (`fcfTargetPricingModelSha256`) je pripet v migraciji
// zagona FCF. Zato ponovitve vključi ta predmodul: `node --import
// ./scripts/baza-ponovitve.mjs scripts/ovrednoti-igralce.mjs ...`.
//
// Odjemalec Supabase pokliče `fetch` šele ob zahtevku (`(...a) => fetch(...a)`),
// zato zadošča zamenjava `globalThis.fetch`. Ponovitve veljajo samo za naslov
// baze (SUPABASE_URL); vse drugo gre skozi nespremenjeni `fetch`.
import { fetchZaBazo } from './prenos.mjs'

const naslov = process.env.SUPABASE_URL
if (naslov) {
  const izvor = new URL(naslov).origin
  const prvotni = globalThis.fetch
  const zBazo = fetchZaBazo({ fetchFn: (...a) => prvotni(...a) })
  globalThis.fetch = (url, init) => {
    const cilj = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    return cilj.startsWith(izvor + '/') ? zBazo(url, init) : prvotni(url, init)
  }
}
