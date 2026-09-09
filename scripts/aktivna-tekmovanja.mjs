// Izpiše slug-e tekmovanj, ki jih je treba uvažati — enega na vrstico.
//
// Nočni uvoz je doslej imel obe ligi napisani v `.github/workflows` kot dva
// bloka korakov. Ob tretji ligi bi to pomenilo, da se nova liga tiho ne
// uvaža: stran bi jo pokazala, točke pa se ne bi nikoli osvežile, in nič ne
// bi javilo napake. Zato seznam pove baza.
//
// Uporaba:
//   node scripts/aktivna-tekmovanja.mjs           # aktivna tekmovanja
//   node scripts/aktivna-tekmovanja.mjs --vsa     # tudi neaktivna (za pripravo lige)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

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

// Vrstni red naj bo določen, da je dnevnik uvoza med zagoni primerljiv.
// Namenoma se ne naslanjamo na `federation_id`: skripta mora delovati tudi
// proti bazi, kjer migracija za zveze še ni stekla.
let q = db
  .from('competitions')
  .select('slug, active, sort_order')
  .order('sort_order')
  .order('slug')
if (!process.argv.includes('--vsa')) q = q.eq('active', true)

const { data, error } = await q
if (error) {
  console.error(`Tekmovanj ni mogoče prebrati: ${error.message}`)
  process.exit(1)
}
if (!data?.length) {
  console.error('Ni nobenega tekmovanja za uvoz.')
  process.exit(1)
}

for (const t of data) console.log(t.slug)
