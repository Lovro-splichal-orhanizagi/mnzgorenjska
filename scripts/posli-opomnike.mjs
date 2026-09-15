// Opomnik uporabnikom, ki v ligi še nimajo veljavne ekipe.
//
// Kliče edge funkcijo `posli-opomnik` s service ključem — ta pot obstaja
// prav zato, da opomnika ni treba prožiti z gumbom. Ključ ostane v GitHubu,
// `RESEND_API_KEY` pa v Supabase, kjer je že bil; nove skrivnosti ni.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/posli-opomnike.mjs        # suho
//   ... SUHO=false node scripts/posli-opomnike.mjs                       # pošlje
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function izEnv() {
  try {
    const v = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      v.split('\n').map((s) => s.trim())
        .filter((s) => s.includes('=') && !s.startsWith('#'))
        .map((s) => [s.slice(0, s.indexOf('=')).trim(), s.slice(s.indexOf('=') + 1).trim()]),
    )
  } catch { return {} }
}

const env = izEnv()
const BASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) { console.error('Manjka SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

// Suho je PRIVZETO. Pošiljanje pošte resničnim ljudem mora biti izrecna
// izbira, ne privzeta posledica zagona.
const suho = String(process.env.SUHO ?? 'true').toLowerCase() !== 'false'

const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })
const { data: lige, error } = await db
  .from('competitions')
  .select('id, slug, name')
  .eq('active', true)
  .order('sort_order')
if (error) { console.error(`Lig ni bilo mogoče prebrati: ${error.message}`); process.exit(1) }

console.log(suho ? 'SUHI TEK — pošte ne pošiljam.\n' : 'POŠILJAM pošto.\n')

let skupaj = 0
let padlo = 0
for (const liga of lige ?? []) {
  const odgovor = await fetch(`${BASE}/functions/v1/posli-opomnik`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ competition_id: liga.id, suho }),
  })
  const izid = await odgovor.json().catch(() => ({}))
  if (!odgovor.ok) {
    console.log(`  ${liga.slug.padEnd(14)} NAPAKA ${odgovor.status}: ${izid.error ?? ''}`)
    padlo++
    continue
  }
  const n = izid.kandidati_stevilo ?? 0
  skupaj += n
  console.log(
    `  ${liga.slug.padEnd(14)} kandidatov ${String(n).padStart(4)}` +
      (suho ? '' : ` · poslano ${izid.poslano ?? 0}, preskočeno ${izid.preskoceno ?? 0}`),
  )
}

console.log(`\nSkupaj kandidatov: ${skupaj}`)
if (padlo) {
  console.error(`Lig z napako: ${padlo}`)
  process.exit(1)
}
