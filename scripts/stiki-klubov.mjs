// Stiki s klubi iz ukazne vrstice — da vsi, ki pišemo klubom (in naši
// Claudi), vidimo isto: kdo je kateremu klubu že pisal, kaj in kdaj.
//
// PRED vsakim mailom klubu:  node scripts/stiki-klubov.mjs preveri <klub ali naslov>
// PO poslanem mailu:         node scripts/stiki-klubov.mjs zabelezi --za <naslov> --vrsta prvi \
//                              --poslal <ime> --zadeva "…" --telo-datoteka mail.txt
//                              [--klub "NK X" --drzava SI --liga clani]   (nov naslov)
// Odgovor kluba:             … zabelezi --za <naslov> --vrsta odgovor --poslal <ime> --opomba "…"
// Ročno stanje:              … nastavi --za <naslov> --stanje sodeluje|ne_zeli|napacen_mail [--opomba …]
// Seznam:                    … seznam [--drzava SK] [--stanje nov] [--omejitev 50]
// Vse kot JSON:              dodaj --json
//
// Ključ: okolje SLFF_STIKI_KLJUC ali datoteka ~/.config/slff/stiki-kljuc
// (dobiš ga od admina; repo je javen, zato ga NI v gitu). Naslov API in javni
// ključ iz .env.production. Funkcije v bazi (migracija stiki_kljuc) z
// napačnim ključem zavrnejo vse.
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'

function izEnv(datoteka) {
  try {
    return Object.fromEntries(
      readFileSync(new URL(`../${datoteka}`, import.meta.url), 'utf8')
        .split('\n').map((s) => s.trim())
        .filter((s) => s.includes('=') && !s.startsWith('#'))
        .map((s) => [s.slice(0, s.indexOf('=')).trim(), s.slice(s.indexOf('=') + 1).trim()]),
    )
  } catch {
    return {}
  }
}
const env = { ...izEnv('.env.production'), ...process.env }
const BASE = env.SLFF_API_URL ?? 'https://api.slff.eu'
const ANON = env.SLFF_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
const potKljuca = `${homedir()}/.config/slff/stiki-kljuc`
const KLJUC = env.SLFF_STIKI_KLJUC ?? (existsSync(potKljuca) ? readFileSync(potKljuca, 'utf8').trim() : null)

const [ukaz, ...ostalo] = process.argv.slice(2)
const arg = (ime) => {
  const i = ostalo.indexOf(`--${ime}`)
  return i >= 0 ? ostalo[i + 1] : undefined
}
const json = ostalo.includes('--json')
const prosto = ostalo.filter((a, i) => !a.startsWith('--') && !(i > 0 && ostalo[i - 1].startsWith('--') && ostalo[i - 1] !== '--json'))

if (!ukaz || !['preveri', 'seznam', 'zabelezi', 'nastavi'].includes(ukaz)) {
  console.error('Ukazi: preveri <iskanje> | seznam | zabelezi --za … --vrsta … --poslal … | nastavi --za … --stanje …')
  process.exit(1)
}
if (!ANON) { console.error('Manjka javni ključ (VITE_SUPABASE_ANON_KEY v .env.production ali SLFF_ANON_KEY).'); process.exit(1) }
if (!KLJUC) { console.error(`Manjka ključ stikov: SLFF_STIKI_KLJUC ali ${potKljuca} (dobiš ga od admina).`); process.exit(1) }

async function rpc(fn, telo) {
  const o = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_kljuc: KLJUC, ...telo }),
  })
  const t = await o.text()
  if (!o.ok) {
    let s = t
    try { s = JSON.parse(t).message ?? t } catch {}
    console.error(`Napaka: ${s}`)
    process.exit(1)
  }
  return JSON.parse(t)
}

const datum = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') : '—')
function izpisi(stiki) {
  if (json) return console.log(JSON.stringify(stiki, null, 2))
  if (!stiki.length) return console.log('Ni zadetkov — ta klub/naslov še ni med stiki (nihče mu še ni pisal).')
  for (const s of stiki) {
    console.log(`${s.klub} (${s.drzava}${s.liga ? `, ${s.liga}` : ''}) — ${s.email ?? 'brez naslova'}`)
    console.log(`  stanje: ${s.stanje} · mailov: ${s.mailov} · zadnji: ${datum(s.zadnji_mail)}` +
      (s.odgovorni ? ` · ima ga: ${s.odgovorni}` : '') + (s.opomba ? `\n  opomba: ${s.opomba}` : ''))
    for (const m of s.maili) console.log(`    ${datum(m.kdaj)} ${m.vrsta} · ${m.poslal ?? '?'}${m.zadeva ? ` · ${m.zadeva}` : ''}`)
  }
}

if (ukaz === 'preveri') {
  const q = prosto.join(' ').trim()
  if (!q) { console.error('preveri <del imena kluba, naslov ali liga>'); process.exit(1) }
  izpisi(await rpc('stiki_klubov', { p_iskanje: q, p_z_besedilom: ostalo.includes('--besedilo') }))
} else if (ukaz === 'seznam') {
  izpisi(await rpc('stiki_klubov', {
    p_drzava: arg('drzava') ?? null, p_stanje: arg('stanje') ?? null,
    p_omejitev: Number(arg('omejitev') ?? 200),
  }))
} else if (ukaz === 'zabelezi') {
  const datoteka = arg('telo-datoteka')
  const r = await rpc('stiki_zabelezi', {
    p_email: arg('za'), p_vrsta: arg('vrsta') ?? 'prvi', p_poslal: arg('poslal'),
    p_zadeva: arg('zadeva') ?? null,
    p_telo: datoteka ? readFileSync(datoteka, 'utf8') : (arg('telo') ?? null),
    p_klub: arg('klub') ?? null, p_drzava: arg('drzava') ?? null, p_liga: arg('liga') ?? null,
    p_team_id: arg('team-id') ? Number(arg('team-id')) : null,
    p_opomba: arg('opomba') ?? null, p_gmail_nit: arg('gmail-nit') ?? null,
    p_kdaj: arg('kdaj') ?? null,
  })
  console.log(json ? JSON.stringify(r) : `Zabeleženo: ${r.klub} <${r.email}> → ${r.stanje}, mailov ${r.mailov}`)
} else if (ukaz === 'nastavi') {
  const r = await rpc('stiki_nastavi', {
    p_email: arg('za'), p_stanje: arg('stanje') ?? null,
    p_odgovorni: arg('odgovorni') ?? null, p_opomba: arg('opomba') ?? null,
  })
  console.log(json ? JSON.stringify(r) : `${r.klub} <${r.email}> → ${r.stanje}`)
}
