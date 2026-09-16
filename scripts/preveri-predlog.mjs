// Ali gumb "Sestavi mi ekipo" deluje v VSAKI aktivni ligi?
//
// Predlog kadra je preizkusen na izmisljeni ligi v `npm run smoke`, kar pove,
// da je algoritem pravilen. Ne pove pa, ali so prave lige dovolj velike: liga
// z devetimi klubi in tremi vratarji je lahko preveljavna na papirju in
// nemogoca v praksi. Ta skripta poskusi predlog v vsaki ligi in pove, kje bi
// gumb ostal brez odgovora.
//
//   node scripts/preveri-predlog.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { predlagajKader } from '../src/lib/predlogKadra.ts'
import { PRORACUN, MAX_IZ_KLUBA, VELIKOST_EKIPE, STEVILO_PRVIH } from '../src/lib/pravila.ts'

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
const KLJUC = process.env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

const { data: lige, error } = await db
  .from('competitions').select('id, slug').eq('active', true).order('sort_order')
if (error) { console.error(error.message); process.exit(1) }

let padlo = 0
for (const liga of lige ?? []) {
  // Napake NE tiho pozresi: prvi zagon je za stiri lige javil "0 igralcev",
  // v resnici pa je poizvedba padla in so podatki bili tam. Prazen odgovor in
  // neuspela poizvedba sta dve razlicni stvari.
  const { data, error: napakaLige } = await db
    .from('player_season_standings')
    .select('id, position, team_id, value, points, form')
    .eq('competition_id', liga.id)
    .order('id')
    .limit(1000)
  if (napakaLige) {
    console.log(`  ${liga.slug.padEnd(14)} POIZVEDBA PADLA  ${napakaLige.message}`)
    padlo++
    continue
  }
  const igralci = (data ?? []).filter((i) => i.position && i.team_id && i.value)
  const kader = predlagajKader(igralci, PRORACUN)
  if (!kader) {
    console.log(`  ${liga.slug.padEnd(14)} PREDLOGA NI  (${igralci.length} igralcev)`)
    padlo++
    continue
  }
  const cena = kader.reduce((v, k) => v + k.value, 0)
  const zacetnikov = kader.filter((k) => k.je_zacetnik).length
  const poKlubu = {}
  for (const k of kader) poKlubu[k.team_id] = (poKlubu[k.team_id] ?? 0) + 1
  const najvec = Math.max(...Object.values(poKlubu))
  const napake = []
  if (kader.length !== VELIKOST_EKIPE) napake.push(`${kader.length} igralcev`)
  if (cena > PRORACUN + 1e-9) napake.push(`cena ${cena.toFixed(1)}`)
  if (najvec > MAX_IZ_KLUBA) napake.push(`${najvec} iz kluba`)
  if (zacetnikov !== STEVILO_PRVIH) napake.push(`${zacetnikov} v postavi`)
  if (kader.filter((k) => k.je_kapetan).length !== 1) napake.push('ni kapetana')
  if (napake.length) padlo++
  console.log(
    `  ${liga.slug.padEnd(14)} ${napake.length ? 'NAPAKA' : 'OK    '}` +
      ` cena ${cena.toFixed(1).padStart(5)} M€  postava ${zacetnikov}  max klub ${najvec}` +
      ` (${igralci.length} igralcev)` + (napake.length ? `  ← ${napake.join(', ')}` : ''),
  )
}
console.log(padlo ? `\n${padlo} lig brez uporabnega predloga` : '\nVSE LIGE: predlog deluje')
process.exit(padlo ? 1 : 0)
