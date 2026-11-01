// Čiščenje dogodkov napak pred pošiljanjem v Bugsink (SLF-245, docs/napake.md).
// Skupno brskalniku (src/lib/napake.ts, beforeSend) in funkcijam (napake.ts tu):
// iz dogodka gredo uporabnik, piškotki, glave, telo zahteve, poizvedbe in
// fragmenti naslovov, iz vseh nizov pa e-naslovi, žetoni, ključi, IP-ji, uuid-ji
// in dolge številke. Brez odvisnosti, da teče v Vite in v Deno.

const ZAMENJAVE: [RegExp, string][] = [
  // Naslov s poizvedbo ali fragmentom: ostane le pot (/auth/confirm?token_hash=…, #access_token=…).
  [/((?:https?|capacitor):\/\/[^\s?#"'<>]*)[?#][^\s"'<>)]*/gi, '$1'],
  [/(\/[\w\-./:]*)\?[\w\-.%]+=[^\s"'<>)]*/g, '$1'],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, '[jwt]'],
  [/\b(bearer|basic)\s+[\w\-.~+/=]+/gi, '$1 [zeton]'],
  [/\b(sb_(publishable|secret)|sk_(live|test)|rk_(live|test)|pk_(live|test)|whsec|re)_[\w]+/g, '[kljuc]'],
  [/\b(token|token_hash|access_token|refresh_token|code|key|apikey|password|geslo|secret|signature)=[^\s&"'<>]+/gi, '$1=[skrito]'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]'],
  [/\b\d{1,3}(\.\d{1,3}){3}\b/g, '[ip]'],
  // Telefon, kartica, IBAN-ske števke; datumi (2026-11-01) in različice ostanejo.
  [/\+\d[\d ]{7,}\d|\b\d{9,}\b/g, '[stevilka]'],
]

/** Niz brez osebnih podatkov in skrivnosti. */
export function pocisti(niz: string): string {
  let s = niz.length > 2000 ? niz.slice(0, 2000) + '…' : niz
  for (const [vzorec, nadomestek] of ZAMENJAVE) s = s.replace(vzorec, nadomestek)
  return s
}

// Ključi, katerih vrednost ne gre nikamor, ne glede na vsebino.
const SKRITI_KLJUCI = /pass|geslo|token|secret|auth|cookie|session|email|e_?naslov|apikey|api_key|signature|podpis|^key$|^ip$|ip_address/i

/** Globoka kopija z očiščenimi nizi; skrite ključe vrže proč. */
export function pocistiVse<T>(v: T, globina = 0): T {
  if (typeof v === 'string') return pocisti(v) as T
  if (v === null || typeof v !== 'object' || globina > 8) return (globina > 8 ? undefined : v) as T
  if (Array.isArray(v)) return v.slice(0, 100).map((x) => pocistiVse(x, globina + 1)) as T
  const izhod: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (SKRITI_KLJUCI.test(k)) continue
    izhod[k] = pocistiVse(x, globina + 1)
  }
  return izhod as T
}

type Dogodek = {
  user?: unknown
  request?: { url?: string; headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown; env?: unknown }
  extra?: unknown
  server_name?: string
  [k: string]: unknown
}

/** Sentryjev dogodek, pripravljen za pošiljanje: brez uporabnika in zahteve, nizi očiščeni. */
export function pocistiDogodek<T extends object>(dogodek: T): T {
  const d = { ...dogodek } as Dogodek
  delete d.user
  delete d.server_name
  if (d.request) d.request = { url: d.request.url ? pocisti(d.request.url) : undefined }
  return pocistiVse(d) as T
}
