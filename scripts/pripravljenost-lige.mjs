// Ali je liga pripravljena na vklop?
//
// Uporaba:
//   node scripts/pripravljenost-lige.mjs --tekmovanje lj-1-liga
//
// Izpiše stanje in se konča z napako, če liga ni pripravljena — tako korak v
// delovnem toku pade, namesto da bi ligo vklopili s praznim cenikom.
//
// Merila so v `src/lib/pripravljenost.ts`, ker jih uporablja tudi admin.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { tekmovanje as najdiTekmovanje, slugTekmovanja } from './tekmovanje.mjs'
import { oceniPripravljenost } from '../src/lib/pripravljenost.ts'

function izEnv() {
  try {
    const vsebina = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      vsebina
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter((v) => v.includes('=') && !v.startsWith('#'))
        .map((v) => {
          const i = v.indexOf('=')
          return [v.slice(0, i).trim(), v.slice(i + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const env = { ...izEnv(), ...process.env }
const BASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const KLJUC = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
if (!BASE || !KLJUC) {
  console.error('Manjka SUPABASE_URL ali ključ.')
  process.exit(1)
}

const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })
const t = await najdiTekmovanje(db, slugTekmovanja())

const { data, error } = await db.rpc('stanje_lige', { p_competition_id: t.id })
if (error || !data) {
  console.error(`Stanja lige ni mogoče prebrati: ${error?.message ?? 'Manjka odgovor baze.'}`)
  process.exit(1)
}

const s = {
  aktivnih: data.aktivnih ?? 0,
  privzetih: data.privzetih ?? 0,
  klubov: data.klubov ?? 0,
  najvisjaCena: Number(data.najvisja_cena ?? 0),
  poPozicijah: data.po_pozicijah ?? {},
  nastopovSKlopi: data.nastopov_s_klopi ?? 0,
  golovBrezNastopa: data.golov_brez_nastopa ?? 0,
  krogovTekoce: data.krogov_tekoce ?? 0,
  // Ločeni števci ne povedo, ali pozicije, klubi in proračun dopuščajo isti kader.
  igralci: data.igralci,
}

const o = oceniPripravljenost(s)

console.log(`Liga: ${t.name} (${t.slug})`)
console.log(`  aktivnih igralcev   ${s.aktivnih}`)
console.log(`  s privzeto ceno     ${s.privzetih}  (${o.odstotekPrivzetih} %)`)
console.log(`  najvišja cena       ${s.najvisjaCena}`)
console.log(`  klubov              ${s.klubov}`)
console.log(`  po pozicijah        ${Object.entries(s.poPozicijah).map(([k, v]) => `${k} ${v}`).join(', ')}`)
console.log(`  nastopov s klopi    ${s.nastopovSKlopi}`)
console.log(`  golov brez nastopa  ${s.golovBrezNastopa}`)
console.log(`  krogov tekoče sez.  ${s.krogovTekoce}`)

if (o.pripravljena) {
  console.log('\nLiga je pripravljena na vklop:')
  console.log(`  update competitions set active = true where slug = '${t.slug}';`)
  process.exit(0)
}

console.log(`\nLiga NI pripravljena (${o.tezave.length}):`)
for (const t2 of o.tezave) console.log(`  • ${t2.kaj}\n    ${t2.zakaj}`)
process.exit(1)
