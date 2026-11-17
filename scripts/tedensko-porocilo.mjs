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
import { preveriPodatkeVBazi } from './preverbe-baze.mjs'

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

// Vsaka zahteva ima svojo mejo: zatikljaj mora pasti glasno (in priti v
// `poskusi`), ne pa molce zadrzati zagona do 10-minutne meje Actions.
const MEJA_ZAHTEVE_MS = 30_000
const db = createClient(BASE, SERVICE, {
  auth: { persistSession: false },
  global: { fetch: (url, opts = {}) => fetch(url, { ...opts, signal: AbortSignal.timeout(MEJA_ZAHTEVE_MS) }) },
})

const zacetek = Date.now()
const dnevnik = (s) => console.log(`[${Math.round((Date.now() - zacetek) / 1000)} s] ${s}`)

// Zadnja varovalka: ce zagon kljub mejam zahtev traja predolgo, to povemo
// SAMI, prej kot GitHub ubije posel (ob preklicu se korak "Javi padec" ne
// sprozi, zato tedne ni nihce izvedel, da porocila ni).
const MEJA_ZAGONA_MS = 8 * 60_000
setTimeout(async () => {
  const sporocilo = `zagon traja ze ${MEJA_ZAGONA_MS / 60_000} min, prekinjam (${stanje})`
  console.error(sporocilo)
  await javiNapako(sporocilo)
  process.exit(1)
}, MEJA_ZAGONA_MS).unref()
let stanje = 'zacetek'

/**
 * Poizvedba s ponovnimi poskusi.
 *
 * Prvi zagon tega poročila je padel na `Gateway Timeout` pri PRVI poizvedbi.
 * Poročilo, ki naj dokaže, da je vse v redu, ne sme odpovedati ob enem
 * zatikljaju — sicer je njegova odsotnost dvoumna na isti način kot tišina,
 * ki naj bi jo odpravilo.
 */
async function poskusi(ime, fn, poskusov = 4) {
  let zadnja
  for (let i = 1; i <= poskusov; i++) {
    let r
    try { r = await fn() } catch (e) { r = { error: e } }
    const { data, error, count } = r
    if (!error) return { data, count }
    zadnja = error
    if (i < poskusov) await new Promise((r) => setTimeout(r, 1000 * 2 ** (i - 1)))
  }
  throw new Error(`${ime}: ${zadnja?.message ?? 'neznana napaka'}`)
}

/** Ob usodni napaki povej na Discord — tiho odpovedan nadzor je najhujsi. */
async function javiNapako(sporocilo) {
  const webhook = process.env.DISCORD_WEBHOOK_TEDENSKO ?? env.DISCORD_WEBHOOK_TEDENSKO
  if (!process.argv.includes('--discord') || !webhook) return
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🔴 **Tedenskega poročila ni bilo mogoče sestaviti**\n\`${sporocilo}\`\n_Podrobnosti v zagonu GitHub Actions._`.slice(0, 1900),
      }),
    })
  } catch { /* ce tudi Discord ne dela, ostane zagon Actions */ }
}

const DNI = 7
const odKdaj = new Date(Date.now() - DNI * 86400000).toISOString().slice(0, 10)

const STRAN = 1000

/** Vse vrstice poizvedbe: PostgREST odgovor omeji (privzeto 1000 vrstic). */
async function vse(ime, sestavi) {
  const rezultat = []
  for (let od = 0; ; od += STRAN) {
    const { data } = await poskusi(`${ime} (od ${od})`, () => sestavi().range(od, od + STRAN - 1))
    rezultat.push(...(data ?? []))
    if ((data?.length ?? 0) < STRAN) return rezultat
  }
}

/** Izvede `fn` nad elementi z omejeno vzporednostjo; prva napaka ustavi vse. */
async function vzporedno(elementi, vzporednost, fn) {
  const izid = new Array(elementi.length)
  let naslednji = 0
  await Promise.all(Array.from({ length: Math.min(vzporednost, elementi.length) }, async () => {
    while (naslednji < elementi.length) {
      const i = naslednji++
      izid[i] = await fn(elementi[i], i)
    }
  }))
  return izid
}

let lige
try {
  stanje = 'lige'
  lige = await vse('lige', () =>
    db.from('competitions_view')
      .select('id, slug, name, short_name, federation_short')
      .eq('active', true)
      .order('federation_sort')
      .order('sort_order')
      .order('id'))
  dnevnik(`${lige.length} lig`)
} catch (e) {
  console.error(e.message)
  await javiNapako(e.message)
  process.exit(1)
}

/** Zadnji krog z odigrano tekmo in koliko tekem v njem je uvoženih. */
async function stanjeLige(liga, manjka) {
  // Napaka poizvedbe se NE sme prebrati kot "ni podatkov": `poskusi` jo ponovi
  // in nazadnje vrze, poročilo pa pade glasno.
  const { data: krogi } = await poskusi(`${liga.slug}: krogi`, () => db
    .from('rounds')
    .select('id, number, season, played_on, deadline_at')
    .eq('competition_id', liga.id)
    .not('played_on', 'is', null)
    .lte('played_on', new Date().toISOString().slice(0, 10))
    .order('played_on', { ascending: false })
    .limit(1))
  const zadnji = krogi?.[0] ?? null

  const { data: naslednji } = await poskusi(`${liga.slug}: rok`, () => db
    .from('rounds')
    .select('number, deadline_at')
    .eq('competition_id', liga.id)
    .gt('deadline_at', new Date().toISOString())
    .order('deadline_at')
    .limit(1))

  let tekem = 0, uvozenih = 0
  if (zadnji) {
    const { data: t } = await poskusi(`${liga.slug}: tekme`, () => db
      .from('matches')
      .select('id, imported_at')
      .eq('round_id', zadnji.id))
    tekem = t?.length ?? 0
    uvozenih = (t ?? []).filter((x) => x.imported_at).length
  }

  // Tekme zadnjega tedna, ki še čakajo na statistiko — to uporabnik opazi
  // prvi: tekma je odigrana, točk pa ni.
  //
  // Meja NAVZGOR je bistvena. Brez nje so med "brez statistike" šteti tudi
  // vsi PRIHODNJI krogi, ki seveda nimajo zapisnikov, ker še niso bili
  // odigrani — prvo poročilo je tako javilo 145 manjkajočih tekem za ligo,
  // ki ni zamujala z ničimer. Merilo štejemo po datumu TEKME, ne kroga:
  // prestavljena tekma ima svoj datum in ni zamuda kroga.
  //
  // Te tekme poberemo ENKRAT za vse lige (glej spodaj), ne po poizvedbo na
  // ligo: pri ~1400 ligah je to prihranilo tretjino vseh zahtev.
  return { zadnji, naslednji: naslednji?.[0] ?? null, tekem, uvozenih, manjka: manjka.get(liga.id) ?? [] }
}

const VZPOREDNOST = 8
const vrstice = []
let skupajManjka = 0
let stanja
try {
  stanje = 'sveze tekme'
  const danes = new Date().toISOString().slice(0, 10)
  const sveze = await vse('sveze tekme', () =>
    db.from('matches')
      .select('id, imported_at, played_on, rounds!inner(number, competition_id)')
      .gte('played_on', odKdaj)
      .lte('played_on', danes)
      .is('imported_at', null)
      .order('id'))
  const manjkaPoLigi = new Map()
  for (const t of sveze) {
    const id = t.rounds?.competition_id
    if (!manjkaPoLigi.has(id)) manjkaPoLigi.set(id, [])
    manjkaPoLigi.get(id).push(t)
  }
  dnevnik(`${sveze.length} svezih tekem brez statistike`)

  stanje = 'stanje lig'
  let koncanih = 0
  stanja = await vzporedno(lige, VZPOREDNOST, async (liga) => {
    const s = await stanjeLige(liga, manjkaPoLigi)
    if (++koncanih % 100 === 0) dnevnik(`lige: ${koncanih}/${lige.length}`)
    return s
  })
  dnevnik(`lige: ${lige.length}/${lige.length}`)
} catch (e) {
  console.error(e.message)
  await javiNapako(e.message)
  process.exit(1)
}

for (const [i, liga] of (lige ?? []).entries()) {
  const s = stanja[i]
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

let tezave, igralcev, ekip
try {
  stanje = 'preverba'
  ;({ data: tezave } = await poskusi('preverba', () => preveriPodatkeVBazi(db)))
  ;({ count: igralcev } = await poskusi('igralci', () =>
    db.from('players').select('id', { count: 'exact', head: true }).eq('active', true)))
  ;({ count: ekip } = await poskusi('ekipe', () =>
    db.from('fantasy_teams').select('id', { count: 'exact', head: true }).eq('hisna', false)))
  dnevnik('preverba koncana')
} catch (e) {
  console.error(e.message)
  await javiNapako(e.message)
  process.exit(1)
}

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

  // Težave najprej: Discord sprejme 2000 znakov, vrstica na ligo pa jih ima
  // ~80 — pri 150 ligah bi seznam lig izrinil težave. Lige le tiste z zamudo.
  const telo = [`${lige?.length ?? 0} lig · ${igralcev ?? 0} igralcev · ${ekip ?? 0} fantasy ekip`]
  if (tezave?.length) {
    telo.push('', '**Težave:**')
    for (const t of tezave) telo.push(`• ${t.opis} — ${t.koliko}× (\`${t.primer}\`)`)
  }
  if (zamude.length) {
    telo.push('', '**Lige s tekmami brez statistike:**')
    for (const v of zamude) telo.push(`⚠ **${v.liga}** ${v.krog} — **${v.manjka}** brez statistike · rok ${v.rok}`)
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
