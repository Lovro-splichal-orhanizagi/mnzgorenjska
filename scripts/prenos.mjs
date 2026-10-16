// Skupni prenos strani za vse uvozne skripte: ponovitve, časovna omejitev.
//
// Zveze gostujejo na majhnih strežnikih in kratke motnje so pogoste. Ena
// sama je podrla celo ligo: `getaddrinfo EAI_AGAIN mnzgorica.si` (DNS se za
// trenutek ni odzval) in nočni uvoz ng-primorska se je končal z napako, čeprav
// je bila stran minuto pozneje v redu. Zato vsak zahtevek poskusimo večkrat.
//
// Ponovimo le, kar je lahko prehodno: omrežne napake, 5xx in 429. Odgovor 4xx
// je končen (404 pri NZS pomeni "zapisnika še ni") in gre takoj h klicatelju.
// Prazna stran s statusom 200 tu ni napaka — zanjo ima uvoz razporeda svojo
// rezervo (zadnji shranjeni razpored).

// Premori pred 2., 3. in 4. poskusom; štirje poskusi skupaj.
export const ZAMIKI_MS = [2000, 6000, 15000]
// En zahtevek ne sme viseti v nedogled: GitHub Actions bi ga ubil šele po
// šestih urah in s tem tudi vse lige za njim.
export const CASOVNA_OMEJITEV_MS = 30000
// Retry-After zna biti velik; dlje od tega raje odnehamo.
const NAJDALJSI_PREMOR_MS = 60000

// Kode, ki jih Node (undici) pripne omrežnim napakam, v `e.cause.code`.
const PREHODNE_KODE = /^(ECONNRESET|ECONNREFUSED|ECONNABORTED|EAI_AGAIN|ENOTFOUND|ETIMEDOUT|EPIPE|EHOSTUNREACH|ENETUNREACH|UND_ERR_\w+)$/

// Gostitelji, ki so v tem zagonu odpovedali po vseh poskusih. Uvoz zapisnikov
// gre čez sto strani in napako posamezne strani pogoltne; brez tega bi mrtev
// strežnik vsako stran čakal skoraj dve minuti. Zanje le en poskus, dokler
// kateri spet ne uspe.
const padli = new Set()
/** Za preizkus: pozabi odpovedane gostitelje. */
export const pozabiPadle = () => padli.clear()
const gostitelj = (url) => { try { return new URL(url).host } catch { return url } }

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

/** Je napaka `fetch` prehodna (omrežje, DNS, časovna omejitev)? */
export function jePrehodnaNapaka(e) {
  if (!e) return false
  if (e.name === 'TimeoutError' || e.name === 'AbortError') return true
  const koda = e.cause?.code ?? e.code
  if (koda && PREHODNE_KODE.test(String(koda))) return true
  // "fetch failed" brez kode: undici tako javi tudi prekinjeno povezavo.
  return e instanceof TypeError && /fetch failed/i.test(e.message)
}

/** Je HTTP status vreden ponovitve? */
export const jePrehodenStatus = (status) => status === 429 || (status >= 500 && status <= 599)

/** Retry-After v milisekundah (sekunde ali datum); null, če ga ni. */
export function retryAfterMs(vrednost, zdaj = Date.now()) {
  if (!vrednost) return null
  const s = Number(vrednost)
  if (Number.isFinite(s) && s >= 0) return s * 1000
  const t = Date.parse(vrednost)
  return Number.isFinite(t) ? Math.max(0, t - zdaj) : null
}

// Nočni uvoz bere vir iz več poslov hkrati (scripts/nocni-kosi.mjs); vsak posel
// takrat čaka toliko-krat dlje, da skupni tempo k viru ostane kot pri enem.
const FAKTOR_PREMORA = Math.max(1, Number(process.env.SLFF_PREMOR_FAKTOR) || 1)

/**
 * `fetch` s ponovitvami. Vrne `Response` kot `fetch` — tudi 4xx in zadnji 5xx,
 * da klicatelj sam odloči, kaj z njim (in napako napiše kot doslej).
 * Omrežno napako po zadnjem poskusu vrže naprej.
 *
 * @param {string} url
 * @param {{
 *   glave?: Record<string,string>,  // glave vira (Sportnet: User-Agent)
 *   premorMs?: number,              // vljudnost vira: premor pred VSAKIM zahtevkom
 *   zamiki?: number[],              // premori med poskusi
 *   casovnaOmejitevMs?: number,
 *   fetchFn?: typeof fetch,         // za preizkus; vir s sejo ali posrednikom (FAČR) da svojega
 *   log?: (vrstica: string) => void,
 * }} [moznosti]
 * @returns {Promise<Response>}
 */
export async function prenesiSPonovitvami(url, moznosti = {}) {
  const {
    glave,
    premorMs = 0,
    zamiki = ZAMIKI_MS,
    casovnaOmejitevMs = CASOVNA_OMEJITEV_MS,
    fetchFn = fetch,
    log = (v) => console.log(v),
  } = moznosti
  const host = gostitelj(url)
  const poskusov = padli.has(host) ? 1 : zamiki.length + 1

  for (let poskus = 1; ; poskus++) {
    if (premorMs) await cakaj(premorMs * FAKTOR_PREMORA)
    let odgovor
    let napaka
    try {
      odgovor = await fetchFn(url, {
        ...(glave ? { headers: glave } : {}),
        signal: AbortSignal.timeout(casovnaOmejitevMs),
      })
    } catch (e) {
      if (!jePrehodnaNapaka(e)) throw e
      napaka = e
    }

    if (odgovor && !jePrehodenStatus(odgovor.status)) {
      padli.delete(host)
      return odgovor
    }
    if (poskus >= poskusov) {
      padli.add(host)
      if (odgovor) return odgovor
      throw napaka
    }

    let premor = zamiki[poskus - 1]
    let razlog
    if (odgovor) {
      razlog = `HTTP ${odgovor.status}`
      const ra = retryAfterMs(odgovor.headers.get('retry-after'))
      if (ra !== null) premor = Math.max(premor, ra)
      if (premor > NAJDALJSI_PREMOR_MS) return odgovor
      // Telo zavržemo, sicer undici drži povezavo odprto.
      await odgovor.body?.cancel().catch(() => {})
    } else {
      razlog = napaka.cause?.code ?? napaka.name ?? napaka.message
    }
    log(`  ponovim (${poskus}/${poskusov - 1}) čez ${Math.round(premor / 1000)} s: ${razlog} ${url}`)
    await cakaj(premor)
  }
}

// --- baza -------------------------------------------------------------------
// Uvozi pišejo v bazo na strežniku (api.slff.eu prek Cloudflara). Ponoči jih
// teče več hkrati in posamezen zahtevek kdaj pade: "TypeError: fetch failed",
// Cloudflare 520, PostgREST "schema cache" (503). Ena taka napaka je podrla
// ligo (at-regionalliga-nord, at-ooe-bezirksliga-ost, at-noe-1-klasse-ost,
// at-k-2-klasse-d, 11.–14. 10. 2026), čeprav je bila baza sekundo pozneje v
// redu. Zato odjemalec Supabase v uvozih dobi `fetchZaBazo`.
//
// Ponovimo le, kar ponovitev ne more pokvariti: branje, PATCH/PUT/DELETE,
// upsert in RPC, ki tekmo zamenja v celoti. Navaden INSERT ali drug RPC
// ponovimo samo, kadar zahtevek baze zagotovo ni dosegel (povezave ni bilo,
// Cloudflare strežnika ni dosegel: 521–523).
export const ZAMIKI_BAZE_MS = [2000, 5000, 15000, 30000]
const NEDOSEGLJIVO = /^(ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|UND_ERR_CONNECT_TIMEOUT)$/
const PONOVLJIVI_RPC = /\/rpc\/zamenjaj_nastope_tekme$/

/** Je zahtevek na PostgREST varno ponoviti, tudi če je baza morda že pisala? */
export function jeIdempotenten(url, init = {}) {
  const metoda = String(init.method ?? 'GET').toUpperCase()
  if (['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE'].includes(metoda)) return true
  if (/resolution=(merge|ignore)-duplicates/.test(new Headers(init.headers).get('prefer') ?? '')) return true
  return PONOVLJIVI_RPC.test(new URL(String(url)).pathname)
}

/** `fetch` za odjemalca Supabase s ponovitvami prehodnih napak (glej zgoraj). */
export function fetchZaBazo({ fetchFn = (...a) => fetch(...a), zamiki = ZAMIKI_BAZE_MS, log = (v) => console.log(v) } = {}) {
  return async (url, init = {}) => {
    const varno = jeIdempotenten(url, init)
    for (let poskus = 0; ; poskus++) {
      let odgovor, napaka
      try {
        odgovor = await fetchFn(url, init)
      } catch (e) {
        if (!jePrehodnaNapaka(e)) throw e
        napaka = e
      }
      const status = odgovor?.status
      const ponovi = napaka
        ? varno || NEDOSEGLJIVO.test(String(napaka.cause?.code ?? napaka.code ?? ''))
        : [521, 522, 523].includes(status) || (varno && [502, 503, 504, 520, 524].includes(status))
      if (!ponovi || poskus >= zamiki.length) {
        if (napaka) throw napaka
        return odgovor
      }
      await odgovor?.body?.cancel().catch(() => {})
      const razlog = napaka ? (napaka.cause?.code ?? napaka.message) : `HTTP ${status}`
      log(`  baza: ponovim (${poskus + 1}/${zamiki.length}) čez ${zamiki[poskus] / 1000} s: ${razlog}`)
      await cakaj(zamiki[poskus])
    }
  }
}
