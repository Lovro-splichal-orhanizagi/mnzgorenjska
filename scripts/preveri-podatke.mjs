// Preverba podatkov: trditve, ki morajo držati v vsaki ligi.
//
// Vsaka huda napaka v tem projektu je bila TIHA — uvoz je poročal uspeh in
// vpisal smeti, testi so bili zeleni, stran je izrisala številko. Enotski
// testi tega ne ujamejo, ker koda naredi natanko to, kar ji piše.
//
// Ujame jih šele trditev o podatkih samih. Del jih je v bazi
// (`preveri_podatke()`), del tu — tisti, ki potrebujejo pravila igre.
//
// Uporaba:
//   node scripts/preveri-podatke.mjs                # izpiši in končaj z 1, če kaj ni v redu
//   node scripts/preveri-podatke.mjs --discord      # ob težavi javi še na Discord
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { vseVrstice } from './strani.mjs'
import { POZICIJE, VELIKOST_EKIPE, MAX_IZ_KLUBA, PRORACUN } from '../src/lib/pravila.ts'

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
const tezave = []

// --- preverbe v bazi --------------------------------------------------------
const { data: izBaze, error } = await db.rpc('preveri_podatke')
if (error) {
  console.error(`Preverb ni bilo mogoče pognati: ${error.message}`)
  process.exit(1)
}
for (const t of izBaze ?? [])
  tezave.push({ kljuc: t.kljuc, opis: t.opis, koliko: t.koliko, primer: t.primer })

// --- ali je ekipo sploh mogoče sestaviti ------------------------------------
// Pozicije in klubi so lahko vsak zase v redu, ekipa pa vseeno nemogoča:
// pravilo o največ treh igralcih iz kluba in proračun se sekata. Zato
// poskusimo sestaviti najcenejši veljaven kader.
const { data: lige } = await db.from('competitions').select('id, slug').eq('active', true)

for (const l of lige ?? []) {
  const igralci = await vseVrstice((od, do_) =>
    db
      .from('players')
      .select('id, team_id, position, value')
      .eq('competition_id', l.id)
      .eq('active', true)
      .not('position', 'is', null)
      .order('id')
      .range(od, do_),
  )

  const naKlub = {}
  let cena = 0
  let manjka = null
  for (const [koda, pravilo] of Object.entries(POZICIJE)) {
    const kandidati = igralci
      .filter((i) => i.position === koda)
      .sort((a, b) => Number(a.value) - Number(b.value))
    let vzeto = 0
    for (const i of kandidati) {
      if (vzeto >= pravilo.kader) break
      if ((naKlub[i.team_id] ?? 0) >= MAX_IZ_KLUBA) continue
      naKlub[i.team_id] = (naKlub[i.team_id] ?? 0) + 1
      cena += Number(i.value)
      vzeto++
    }
    if (vzeto < pravilo.kader) manjka = `${pravilo.naslov}: ${vzeto} od ${pravilo.kader}`
  }

  if (manjka)
    tezave.push({
      kljuc: 'kader-nemogoc',
      opis: `Veljavnega kadra ${VELIKOST_EKIPE} igralcev ni mogoče sestaviti`,
      koliko: 1,
      primer: `${l.slug} — ${manjka}`,
    })
  else if (cena > PRORACUN)
    tezave.push({
      kljuc: 'kader-predrag',
      opis: 'Tudi najcenejši veljaven kader presega proračun',
      koliko: 1,
      primer: `${l.slug}: ${cena.toFixed(1)} proti ${PRORACUN}`,
    })
}

// --- izpis ------------------------------------------------------------------
if (!tezave.length) {
  console.log(`Vse v redu — ${(lige ?? []).length} vklopljenih lig, nobene težave.`)
  process.exit(0)
}

console.log(`NAJDENE TEŽAVE (${tezave.length}):\n`)
for (const t of tezave)
  console.log(`  • [${t.kljuc}] ${t.opis}\n    ${t.koliko}× — npr. ${t.primer}`)

// --- javi na Discord --------------------------------------------------------
if (process.argv.includes('--discord') && env.DISCORD_WEBHOOK) {
  const vrstice = tezave
    .map((t) => `• **${t.opis}** — ${t.koliko}×\n  \`${t.primer}\``)
    .join('\n')
  const besedilo =
    `**Preverba podatkov je našla ${tezave.length} težav**\n` +
    `${vrstice}\n\n_Podrobnosti v zagonu GitHub Actions._`
  try {
    const odgovor = await fetch(env.DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Discord zavrne sporočilo, daljše od 2000 znakov.
      body: JSON.stringify({ content: besedilo.slice(0, 1900) }),
    })
    console.log(odgovor.ok ? '\nJavljeno na Discord.' : `\nDiscord: HTTP ${odgovor.status}`)
  } catch (e) {
    console.log(`\nDiscord ni dosegljiv: ${e.message}`)
  }
}

process.exit(1)
