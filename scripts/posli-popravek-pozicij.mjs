// Obvestilo lastnikom ekip, ki imajo v kadru igralca s popravljeno pozicijo.
//
// 29. 9. 2026 smo 53 igralcem, ki jih je uvoz iz ene napacne oznake (V)
// prekrstil v vratarje, vrnili pozicijo iz polja (glej preveri-vratarje.mjs).
// V kadru ostanejo na mestu vratarja, tocke pa odslej dobivajo kot igralci iz
// polja — lastnik mora to izvedeti od nas, ne iz lestvice.
//
// Klice `posli-opomnik` z vrsto `popravek-pozicije`, po eno ligo naenkrat.
// Funkcija istemu lastniku v ligi ne poslje dvakrat.
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/posli-popravek-pozicij.mjs   # suho
//   ... SUHO=false node scripts/posli-popravek-pozicij.mjs                  # poslje
//   ... IGRALCI=1,2,3 ...                                                   # drug seznam
import { createClient } from '@supabase/supabase-js'

// Lazni vratarji, popravljeni 29. 9. 2026.
const POPRAVLJENI_2026_09_29 = [
  1109, 1151, 4517, 21111, 20708, 20883, 28712, 20975, 23734, 23855, 24465, 24927, 24980, 29351,
  26809, 23104, 9247, 21563, 12347, 12263, 12411, 12497, 12423, 12410, 12772, 12513, 12192, 12819,
  12464, 12761, 13115, 13163, 13379, 13306, 16863, 18145, 23635, 11082, 19281, 14532, 11896, 11677,
  11855, 11986, 11981, 11958, 12005, 12097, 18568, 18762, 18800, 18855, 19631,
]

const BASE = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !SERVICE) { console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const suho = String(process.env.SUHO ?? 'true').toLowerCase() !== 'false'
const igralci = process.env.IGRALCI
  ? process.env.IGRALCI.split(',').map((s) => Number(s.trim())).filter(Number.isInteger)
  : POPRAVLJENI_2026_09_29

const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })
const { data: vrstice, error } = await db
  .from('players').select('competition_id, competitions(slug)').in('id', igralci)
if (error) { console.error(error.message); process.exit(1) }
const lige = new Map((vrstice ?? []).map((v) => [v.competition_id, v.competitions?.slug ?? '?']))

console.log(`POPRAVEK POZICIJ — ${igralci.length} igralcev, ${lige.size} lig — ` +
  (suho ? 'SUHI TEK, pošte ne pošiljam.\n' : 'POŠILJAM pošto.\n'))

let skupaj = 0
let padlo = 0
for (const [id, slug] of lige) {
  const odgovor = await fetch(`${BASE}/functions/v1/posli-opomnik`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ competition_id: id, vrsta: 'popravek-pozicije', player_ids: igralci, suho, najvec: 25 }),
  })
  const izid = await odgovor.json().catch(() => ({}))
  if (!odgovor.ok) {
    console.error(`  ${slug.padEnd(20)} NAPAKA ${odgovor.status}: ${izid.error ?? ''}`)
    padlo++
    continue
  }
  const n = izid.kandidati_stevilo ?? 0
  skupaj += n
  console.log(`  ${slug.padEnd(20)} ekip ${String(n).padStart(3)}` +
    (suho ? '' : ` · poslano ${izid.poslano ?? 0}, preskočeno ${izid.preskoceno ?? 0}`))
  for (const r of izid.rezultati ?? []) if (!r.ok) console.log(`      ekipa ${r.ekipa}: ${r.razlog}`)
}

console.log(`\nSkupaj ekip: ${skupaj}`)
if (padlo) process.exit(1)
