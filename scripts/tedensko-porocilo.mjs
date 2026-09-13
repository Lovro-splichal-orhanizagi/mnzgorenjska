// Tedensko poročilo o stanju vseh lig — na Discord.
//
// Dnevna `preveri-podatke.mjs` oglasi se SAMO ob težavi. To je prav za
// alarm, a pomeni, da tišina lahko pomeni oboje: da je vse v redu ali da je
// nekaj nehalo teči. Teden dni tišine je zato brez pomena.
//
// To poročilo pride vsak teden, tudi kadar je vse v redu, in pove številke:
// koliko krogov je bilo odigranih, koliko tekem je uvoženih, kje manjka
// statistika in kdaj je naslednji rok. Če ga kak teden ni, je to podatek.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/tedensko-porocilo.mjs
//   ... --discord        pošlje na Discord (sicer samo izpiše)
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
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

const DNI = 7
const odKdaj = new Date(Date.now() - DNI * 86400000).toISOString().slice(0, 10)

const { data: lige, error: eLige } = await db
  .from('competitions_view')
  .select('id, slug, name, short_name, federation_short')
  .eq('active', true)
  .order('federation_sort')
  .order('sort_order')
if (eLige) { console.error(`Lig ni bilo mogoče prebrati: ${eLige.message}`); process.exit(1) }

/** Zadnji krog z odigrano tekmo in koliko tekem v njem je uvoženih. */
async function stanjeLige(liga) {
  const { data: krogi } = await db
    .from('rounds')
    .select('id, number, season, played_on, deadline_at')
    .eq('competition_id', liga.id)
    .not('played_on', 'is', null)
    .lte('played_on', new Date().toISOString().slice(0, 10))
    .order('played_on', { ascending: false })
    .limit(1)
  const zadnji = krogi?.[0] ?? null

  const { data: naslednji } = await db
    .from('rounds')
    .select('number, deadline_at')
    .eq('competition_id', liga.id)
    .gt('deadline_at', new Date().toISOString())
    .order('deadline_at')
    .limit(1)

  let tekem = 0, uvozenih = 0
  if (zadnji) {
    const { data: t } = await db
      .from('matches')
      .select('id, imported_at')
      .eq('round_id', zadnji.id)
    tekem = t?.length ?? 0
    uvozenih = (t ?? []).filter((x) => x.imported_at).length
  }

  // Tekme zadnjega tedna, ki se cakajo na statistiko — to je tisto, kar
  // uporabnik opazi prvi: krog je odigran, tock pa ni.
  const { data: sveze } = await db
    .from('rounds')
    .select('id, number, matches(id, imported_at)')
    .eq('competition_id', liga.id)
    .gte('played_on', odKdaj)
  const manjka = (sveze ?? []).flatMap((r) =>
    (r.matches ?? []).filter((m) => !m.imported_at).map(() => r.number),
  )

  return { zadnji, naslednji: naslednji?.[0] ?? null, tekem, uvozenih, manjka }
}

const vrstice = []
let skupajManjka = 0
for (const liga of lige ?? []) {
  const s = await stanjeLige(liga)
  skupajManjka += s.manjka.length
  const krog = s.zadnji ? `${s.zadnji.number}. krog` : 'brez odigranega kroga'
  const uvoz = s.zadnji ? `${s.uvozenih}/${s.tekem}` : '—'
  const rok = s.naslednji?.deadline_at
    ? new Date(s.naslednji.deadline_at).toLocaleString('sl-SI', {
        timeZone: 'Europe/Ljubljana', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : 'ni razporeda'
  vrstice.push({
    liga: liga.short_name ?? liga.slug,
    zveza: liga.federation_short ?? '',
    krog, uvoz, rok,
    manjka: s.manjka.length,
    polno: s.zadnji ? s.uvozenih === s.tekem : true,
  })
}

const { data: tezave } = await db.rpc('preveri_podatke')
const { count: igralcev } = await db
  .from('players').select('id', { count: 'exact', head: true }).eq('active', true)
const { count: ekip } = await db
  .from('fantasy_teams').select('id', { count: 'exact', head: true })

// --- izpis ------------------------------------------------------------------
console.log(`Tedensko poročilo — ${lige?.length ?? 0} lig, ${igralcev ?? 0} igralcev, ${ekip ?? 0} fantasy ekip\n`)
for (const v of vrstice)
  console.log(`  ${v.liga.padEnd(10)} ${v.zveza.padEnd(14)} ${v.krog.padEnd(22)} uvoz ${v.uvoz.padEnd(7)} rok ${v.rok}${v.manjka ? `  ← ${v.manjka} tekem brez statistike` : ''}`)
console.log(`\nTežave: ${tezave?.length ? tezave.map((t) => `${t.opis} (${t.koliko}×)`).join('; ') : 'brez'}`)

// --- Discord ----------------------------------------------------------------
if (process.argv.includes('--discord')) {
  const webhook = process.env.DISCORD_WEBHOOK_TEDENSKO ?? env.DISCORD_WEBHOOK_TEDENSKO
  if (!webhook) { console.log('\nDISCORD_WEBHOOK_TEDENSKO ni nastavljen — ne pošiljam.'); process.exit(0) }

  const zamude = vrstice.filter((v) => v.manjka > 0)
  const glava = tezave?.length
    ? `⚠️ **Tedensko poročilo** — ${tezave.length} težav v podatkih`
    : zamude.length
      ? `📋 **Tedensko poročilo** — podatki v redu, ${zamude.length} lig čaka na statistiko`
      : `✅ **Tedensko poročilo** — vse v redu`

  const telo = [
    `${lige?.length ?? 0} lig · ${igralcev ?? 0} igralcev · ${ekip ?? 0} fantasy ekip`,
    '',
    ...vrstice.map((v) =>
      `${v.polno ? '·' : '⚠'} **${v.liga}** ${v.krog} — uvoženih ${v.uvoz}` +
      (v.manjka ? ` · **${v.manjka} tekem brez statistike**` : '') +
      ` · rok ${v.rok}`),
  ]
  if (tezave?.length) {
    telo.push('', '**Težave:**')
    for (const t of tezave) telo.push(`• ${t.opis} — ${t.koliko}× (\`${t.primer}\`)`)
  }

  try {
    const odgovor = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Discord zavrne sporočilo, daljše od 2000 znakov.
      body: JSON.stringify({ content: `${glava}\n${telo.join('\n')}`.slice(0, 1900) }),
    })
    console.log(odgovor.ok ? '\nPoslano na Discord.' : `\nDiscord: HTTP ${odgovor.status}`)
  } catch (e) {
    console.log(`\nDiscord ni dosegljiv: ${e.message}`)
  }
}
