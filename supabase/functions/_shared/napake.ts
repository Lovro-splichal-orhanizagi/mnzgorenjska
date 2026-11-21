// Napake funkcij v Bugsink (SLF-245, docs/napake.md). Funkcija na vrhu pokliče
// `sledi('ime')`: od tod gre vsak console.error (tako funkcije že javljajo
// neuspehe: plačila, pošta, Stripe) in vsaka neujeta izjema kot dogodek v
// Bugsink. Brez NAPAKE_DSN ne naredi nič. Dogodek gre skozi pocistiDogodek
// (brez uporabnika, zahteve, e-naslovov, žetonov, poizvedb), največ 10 na
// minuto na izolat, pošiljanje ne čaka odgovora in ne vrže.
import { pocisti, pocistiDogodek } from './napake-cistilo.ts'
import { idDogodka, naslov, okvirji, omejevalnik, zahteva } from './napake-ovojnica.ts'

// V funkcijah so okvirji s https: oddaljeni uvozi (esm.sh), ne naša koda.
const nasi = (sklad: string) => okvirji(sklad).map((o) => (/^https?:/.test(o.filename ?? '') ? { ...o, in_app: false } : o))

export function sestaviDogodek(funkcija: string, napaka: unknown, opis: string[] = []) {
  const e = napaka instanceof Error ? napaka : null
  const besedilo = [...opis, e ? e.message : String(napaka ?? '')].filter(Boolean).join(' ')
  return pocistiDogodek({
    event_id: idDogodka(),
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
        stacktrace: e?.stack ? { frames: nasi(e.stack) } : undefined,
      }],
    },
  })
}

let zagnano = false
const smem = omejevalnik(10)

export function posli(dsn: string, dogodek: Record<string, unknown>) {
  if (!smem()) return
  const { url, kljuc } = naslov(dsn)
  const p = fetch(url, { ...zahteva(kljuc, dogodek, 'slff-deno/1'), signal: AbortSignal.timeout(3000) })
    .then((r) => r.body?.cancel()).catch(() => {})
  // Edge runtime izolat ugasne po odgovoru; waitUntil počaka na pošiljanje.
  ;(globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(p)
}

/** Vklopi sledenje napakam za to funkcijo (enkrat na izolat). */
export function sledi(funkcija: string) {
  if (zagnano) return
  zagnano = true
  const dsn = Deno.env.get('NAPAKE_DSN')
  // Enkrat na izolat v dnevnik: tako `slff-ops logs supabase-edge-functions` pokaže,
  // da NAPAKE_DSN ni prišel v vsebnik (SLF-519), namesto tihega izklopa.
  if (!dsn) return console.warn(`napake: NAPAKE_DSN ni nastavljen, ${funkcija} ne javlja v Bugsink`)
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
