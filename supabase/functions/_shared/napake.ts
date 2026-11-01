// Napake funkcij v Bugsink (SLF-245, docs/napake.md). Funkcija na vrhu pokliče
// `sledi('ime')`: od tod gre vsak console.error (tako funkcije že javljajo
// neuspehe: plačila, pošta, Stripe) in vsaka neujeta izjema kot dogodek v
// Bugsink. Brez NAPAKE_DSN ne naredi nič. Dogodek gre skozi pocistiDogodek
// (brez uporabnika, zahteve, e-naslovov, žetonov, poizvedb), največ 10 na
// minuto na izolat, pošiljanje ne čaka odgovora in ne vrže.
import { pocisti, pocistiDogodek } from './napake-cistilo.ts'

type Okvir = { function?: string; filename?: string; lineno?: number; colno?: number; in_app: boolean }

/** Okvirji sklada Deno/V8 (`at fn (file:///…/index.ts:12:5)`), najstarejši prvi, kot jih želi Sentry. */
export function okvirji(sklad: string | undefined): Okvir[] {
  const izhod: Okvir[] = []
  for (const vrstica of (sklad ?? '').split('\n')) {
    const m = vrstica.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/)
    if (!m) continue
    // Pot do funkcije brez mape na strežniku: /home/deno/functions/x/index.ts -> x/index.ts
    const datoteka = m[2].replace(/^file:\/\//, '').replace(/^.*\/functions\//, '')
    izhod.push({
      function: m[1],
      filename: datoteka,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !/^(ext:|node:|https?:|npm:|jsr:)/.test(datoteka),
    })
  }
  return izhod.reverse().slice(-40)
}

export function sestaviDogodek(funkcija: string, napaka: unknown, opis: string[] = []) {
  const e = napaka instanceof Error ? napaka : null
  const besedilo = [...opis, e ? e.message : String(napaka ?? '')].filter(Boolean).join(' ')
  return pocistiDogodek({
    event_id: crypto.randomUUID().replaceAll('-', ''),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    logger: funkcija,
    transaction: funkcija,
    release: Deno.env.get('NAPAKE_RELEASE') || undefined,
    environment: Deno.env.get('NAPAKE_OKOLJE') || 'production',
    tags: { funkcija },
    exception: {
      values: [{
        type: e?.name || 'console.error',
        value: besedilo.slice(0, 500),
        stacktrace: e?.stack ? { frames: okvirji(e.stack) } : undefined,
      }],
    },
  })
}

function naslov(dsn: string) {
  const u = new URL(dsn)
  const deli = u.pathname.split('/')
  const projekt = deli.pop()
  return { url: `${u.protocol}//${u.host}${deli.join('/')}/api/${projekt}/envelope/`, kljuc: u.username }
}

let zagnano = false
const poslano: number[] = []

export function posli(dsn: string, dogodek: Record<string, unknown>) {
  const zdaj = Date.now()
  while (poslano.length && zdaj - poslano[0] > 60_000) poslano.shift()
  if (poslano.length >= 10) return
  poslano.push(zdaj)
  const { url, kljuc } = naslov(dsn)
  const ovojnica = [
    JSON.stringify({ event_id: dogodek.event_id, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(dogodek),
  ].join('\n')
  const p = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${kljuc}, sentry_client=slff-deno/1`,
    },
    body: ovojnica,
    signal: AbortSignal.timeout(3000),
  }).then((r) => r.body?.cancel()).catch(() => {})
  // Edge runtime izolat ugasne po odgovoru; waitUntil počaka na pošiljanje.
  ;(globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(p)
}

/** Vklopi sledenje napakam za to funkcijo (enkrat na izolat). */
export function sledi(funkcija: string) {
  const dsn = Deno.env.get('NAPAKE_DSN')
  if (!dsn || zagnano) return
  zagnano = true
  const izvirni = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    izvirni(...args)
    try {
      const napaka = args.find((a) => a instanceof Error)
      const opis = args.filter((a) => typeof a === 'string').map((a) => pocisti(a as string))
      posli(dsn, sestaviDogodek(funkcija, napaka ?? '', opis))
    } catch { /* sledenje nikoli ne podre funkcije */ }
  }
  globalThis.addEventListener('error', (e) => posli(dsn, sestaviDogodek(funkcija, (e as ErrorEvent).error)))
  globalThis.addEventListener('unhandledrejection', (e) => posli(dsn, sestaviDogodek(funkcija, (e as PromiseRejectionEvent).reason)))
}
