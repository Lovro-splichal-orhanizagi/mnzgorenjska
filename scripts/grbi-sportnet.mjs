// Grbi slovaških klubov s Sportneta (futbalnet.sk).
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/grbi-sportnet.mjs          # načrt
//   ... --pisi   (prenese v public/grbi/sk-*.{png,jpg} in zapiše logo_url)
//   ... --vse    (tudi klubi, ki grb že imajo)
//
// Vsaka ekipa na tekmi nosi svojo organizacijo (klub) z `logo_public_url` —
// grb, ki ga klub sam naloži v ISSF. Rezervna ekipa ("Bánová B") dobi grb
// matičnega kluba. Pregledamo vsa sportnet tekmovanja v bazi, tudi neaktivna,
// da so grbi pripravljeni, ko ligo vklopimo. Klub brez naloženega grba
// ostane pri grbu iz začetnic.
//
// Beremo enako vljudno kot uvoz: glava z imenom in 300 ms med zahtevki.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import vir, { vseTekme } from './viri/sportnet.mjs'
import { mapaKlubov } from './klubi.mjs'

const MAPA = 'public/grbi'
const NAJVECJA_STRANICA = 256

function izEnv() {
  try {
    return Object.fromEntries(
      readFileSync(new URL('../.env', import.meta.url), 'utf8')
        .split('\n')
        .map((v) => v.trim())
        .filter((v) => v.includes('=') && !v.startsWith('#'))
        .map((v) => [v.slice(0, v.indexOf('=')).trim(), v.slice(v.indexOf('=') + 1).trim()]),
    )
  } catch {
    return {}
  }
}
const env = izEnv()
const BASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const pisi = process.argv.includes('--pisi')
const vse = process.argv.includes('--vse')
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

const pocakaj = () => new Promise((r) => setTimeout(r, vir.premorMs))
async function prenesi(url) {
  await pocakaj()
  const o = await fetch(url, { headers: vir.glave })
  if (!o.ok) throw new Error(`${o.status} ${url}`)
  return o.text()
}

// Enako kot `prenesi-grbe.mjs`: sips na macOS, convert v GitHub Actions.
function zmanjsaj(pot) {
  for (const [ukaz, arg] of [
    ['sips', ['--resampleHeightWidthMax', String(NAJVECJA_STRANICA), pot]],
    ['magick', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
    ['convert', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
  ]) {
    try {
      execFileSync(ukaz, arg, { stdio: 'ignore' })
      return
    } catch {}
  }
}

const imeDatoteke = (ime) =>
  'sk-' +
  ime
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

const { data: lige, error } = await db
  .from('competitions')
  .select('slug, source_league_code')
  .eq('source', 'sportnet')
  .order('slug')
if (error) throw new Error(error.message)

const klubi = await mapaKlubov(db, vir) // ključ kluba -> id
const { data: vrstice } = await db.from('teams').select('id, name, logo_url')
const poId = new Map(vrstice.map((k) => [k.id, k]))

// id kluba -> naslov grba (prvi, ki ga najdemo)
const grbi = new Map()
const ppoKluba = new Map() // klub -> id profila na Sportnetu (za grbIzProfila)
const brez = new Set()
for (const l of lige) {
  if (!l.source_league_code) continue
  let tekme
  try {
    tekme = await vseTekme(l.source_league_code, prenesi)
  } catch (e) {
    console.log(`  ${l.slug}: tekem ni mogoče prebrati (${e.message})`)
    continue
  }
  for (const t of tekme)
    for (const e of t.teams ?? []) {
      const id = klubi.get(vir.kljucKluba(e.name)) ?? klubi.get(vir.poenostavi(e.name))
      if (!id || grbi.has(id)) continue
      const url = e.organization?.logo_public_url
      if (url) grbi.set(id, url)
      if (url && e.organization?._id) ppoKluba.set(id, e.organization._id)
      else brez.add(e.name)
    }
  console.log(`${l.slug}: ${tekme.length} tekem, grbov doslej ${grbi.size}`)
}

// Naslov grba v podatkih tekme je pri ~60 klubih zastarel (404, 8. 10. 2026);
// profil kluba (/v1/ppo/<id>) ima veljavnega. Ob 404 vprašamo profil.
async function grbIzProfila(id) {
  const ppo = ppoKluba.get(id)
  if (!ppo) return null
  await pocakaj()
  const o = await fetch(`https://api.sportnet.online/v1/ppo/${encodeURIComponent(ppo)}`, { headers: vir.glave })
  if (!o.ok) return null
  return (await o.json()).logo_public_url ?? null
}

const nacrt = [...grbi]
  .map(([id, url]) => ({ klub: poId.get(id), url }))
  .filter((n) => n.klub && (vse || !n.klub.logo_url))
  .map((n) => {
    const konc = (n.url.match(/\.(png|jpe?g|svg|webp)$/i)?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg')
    return { ...n, pot: `/grbi/${imeDatoteke(n.klub.name)}.${konc}` }
  })

console.log(`\nGrbov za prenos: ${nacrt.length}`)
for (const n of nacrt) console.log(`  ${n.klub.name} → ${n.pot}`)
if (brez.size) console.log(`\nBrez grba na Sportnetu (${brez.size}): ${[...brez].join(', ')}`)

if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi')
  process.exit(0)
}

if (!existsSync(MAPA)) mkdirSync(MAPA, { recursive: true })
let preneseno = 0
for (const n of nacrt) {
  try {
    await pocakaj()
    let o = await fetch(n.url, { headers: vir.glave })
    if (o.status === 404) {
      const zdaj = await grbIzProfila(n.klub.id)
      if (zdaj && zdaj !== n.url) {
        await pocakaj()
        o = await fetch(zdaj, { headers: vir.glave })
      }
    }
    if (!o.ok) throw new Error(String(o.status))
    const datoteka = `${MAPA}/${n.pot.split('/').pop()}`
    writeFileSync(datoteka, Buffer.from(await o.arrayBuffer()))
    zmanjsaj(datoteka)
    const { error: e } = await db.from('teams').update({ logo_url: n.pot }).eq('id', n.klub.id)
    if (e) throw new Error(e.message)
    console.log(`  ✓ ${n.klub.name} (${Math.round(statSync(datoteka).size / 1024)} kB)`)
    preneseno++
  } catch (e) {
    console.log(`  ✗ ${n.klub.name}: ${e.message}`)
  }
}
console.log(`\nPrenesenih grbov: ${preneseno}`)
