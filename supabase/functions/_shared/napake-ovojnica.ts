// Pošiljanje dogodka v Bugsink po Sentryjevem protokolu ovojnic (SLF-245,
// docs/napake.md). Skupno brskalniku (src/lib/sledenjeNapak.ts) in funkcijam
// (napake.ts): brez SDK-ja in brez odvisnosti, da teče v Vite in v Deno.

export type Okvir = { function?: string; filename?: string; lineno?: number; colno?: number; in_app: boolean }

// V8 (`at fn (file:///…/x.ts:12:5)`, `at file:///…:1:2`) in Firefox/Safari (`fn@https://…:12:5`).
const V8 = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/
const GECKO = /^\s*(.*?)@(.+?):(\d+):(\d+)$/

/** Okvirji sklada, najstarejši prvi, kot jih želi Sentry; poti brez mape na strežniku. */
export function okvirji(sklad: string | undefined): Okvir[] {
  const izhod: Okvir[] = []
  for (const vrstica of (sklad ?? '').split('\n')) {
    const m = vrstica.match(V8) ?? vrstica.match(GECKO)
    if (!m) continue
    // /home/deno/functions/x/index.ts -> x/index.ts ; naslov v brskalniku brez poizvedbe
    const datoteka = m[2].replace(/^file:\/\//, '').replace(/^.*\/functions\//, '').replace(/[?#].*$/, '')
    izhod.push({
      function: m[1] || undefined,
      filename: datoteka,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !/^(ext:|node:|npm:|jsr:|chrome-extension:|moz-extension:|safari-web-extension:)/.test(datoteka),
    })
  }
  return izhod.reverse().slice(-40)
}

/** Iz DSN https://<ključ>@gostitelj/pot/<projekt> naslov za ovojnice in ključ. */
export function naslov(dsn: string) {
  const u = new URL(dsn)
  const deli = u.pathname.split('/')
  const projekt = deli.pop()
  return { url: `${u.protocol}//${u.host}${deli.join('/')}/api/${projekt}/envelope/`, kljuc: u.username }
}

/** Zahteva za fetch: ovojnica z enim dogodkom in Sentryjeva glava s (javnim) ključem. */
export function zahteva(kljuc: string, dogodek: Record<string, unknown>, odjemalec: string) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${kljuc}, sentry_client=${odjemalec}`,
    },
    body: [
      JSON.stringify({ event_id: dogodek.event_id, sent_at: new Date().toISOString() }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify(dogodek),
    ].join('\n'),
  }
}

/** Največ `meja` dogodkov na minuto; vrne false, ko je meja dosežena. */
export function omejevalnik(meja: number) {
  const poslano: number[] = []
  return () => {
    const zdaj = Date.now()
    while (poslano.length && zdaj - poslano[0] > 60_000) poslano.shift()
    if (poslano.length >= meja) return false
    poslano.push(zdaj)
    return true
  }
}

export function idDogodka() {
  return crypto.randomUUID().replaceAll('-', '')
}
