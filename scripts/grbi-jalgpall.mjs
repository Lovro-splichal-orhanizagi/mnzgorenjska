// Grbi estonskih klubov z jalgpall.ee.
//
//   node scripts/grbi-jalgpall.mjs                       # načrt za vse estonske lige
//   ... --tekmovanje ee-esiliiga                         # samo ena liga
//   ... --pisi      (prenese v public/grbi/ee-*.{png,jpg,gif} in zapiše logo_url)
//   ... --prepisi   (tudi klubi, ki grb že imajo)
//
// Grb kluba je v glavi vsakega zapisnika (`grbiZapisnika` v viri/jalgpall.mjs):
// domači levo, gostje desno. Za vsak klub brez grba poiščemo v razporedu lige
// (ena stran na ligo) tekmo z zapisnikom in iz nje vzamemo grb po MESTU; ena
// stran pokrije oba kluba. Ista slika pri več klubih je privzeta slika, ne grb.
//
// robots.txt slike dovoli; pogojev uporabe jalgpall.ee nima (le "Kõik õigused
// kaitstud"). Če EJL ali klub prosi, naj grbov ne uporabljamo, skripte ne
// poganjaj in grbe odstrani. Beremo vljudno kot uvoz: User-Agent SLFF, 5 s.
//
// Za načrt zadošča javni (anon) ključ; pisanje potrebuje servisni ključ in teče
// v delovnem toku *Grbi klubov* (`vir = jalgpall`).
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import vir, { vrsticeRazporeda, grbiZapisnika, jeIzziv } from './viri/jalgpall.mjs'
import { deljeniGrbi } from './viri/hns.mjs'
import { mapaKlubov } from './klubi.mjs'
import { vseVrstice } from './strani.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

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
const env = { ...izEnv(), ...process.env }
const arg = (ime) => {
  const i = process.argv.indexOf(ime)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const pisi = process.argv.includes('--pisi')
const prepisi = process.argv.includes('--prepisi')
const samoLiga = arg('--tekmovanje')

const BASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const KLJUC = env.SUPABASE_SERVICE_ROLE_KEY || (pisi ? null : env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
if (!KLJUC) {
  console.error(pisi ? 'Za --pisi manjka SUPABASE_SERVICE_ROLE_KEY' : 'Manjka SUPABASE_SERVICE_ROLE_KEY ali anon ključ')
  process.exit(1)
}
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

const prenesi = (url) => prenesiSPonovitvami(url, { glave: vir.glave, premorMs: vir.premorMs })
async function stran(url) {
  const o = await prenesi(url)
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok) throw new Error(`HTTP ${o.status}`)
  return t
}

// `sips` je macOS, `magick`/`convert` (ImageMagick) GitHub Actions (grbi.yml).
function zmanjsaj(pot) {
  for (const [ukaz, a] of [
    ['sips', ['--resampleHeightWidthMax', String(NAJVECJA_STRANICA), pot]],
    ['magick', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
    ['convert', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
  ]) {
    try {
      execFileSync(ukaz, a, { stdio: 'ignore' })
      return
    } catch {}
  }
}

const imeDatoteke = (ime) =>
  'ee-' + ime.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const KONCNICE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }

// --- lige in klubi -------------------------------------------------------------
let q = db.from('competitions').select('id, slug, source_league_code').eq('source', 'jalgpall').order('slug')
if (samoLiga) q = q.eq('slug', samoLiga)
const { data: lige, error: eLige } = await q
if (eLige) throw new Error(eLige.message)
if (!lige?.length) {
  console.error(samoLiga ? `Estonske lige "${samoLiga}" ni (source = jalgpall).` : 'Ni estonskih lig (source = jalgpall).')
  process.exit(1)
}

const vrstice = await vseVrstice((od, do_) =>
  db.from('competition_teams').select('team_id, competition_id, name, logo_url')
    .in('competition_id', lige.map((l) => l.id)).order('team_id').order('competition_id').range(od, do_),
)
const klubi = new Map()
for (const v of vrstice) if (!klubi.has(v.team_id)) klubi.set(v.team_id, { id: v.team_id, name: v.name, logo_url: v.logo_url, liga: v.competition_id })
const iscemo = [...klubi.values()].filter((k) => prepisi || !k.logo_url)
console.log(`Lige: ${lige.map((l) => l.slug).join(', ')}\nKlubov: ${klubi.size}, iščemo ${iscemo.length}${prepisi ? ' (--prepisi)' : ''}`)
if (!iscemo.length) process.exit(0)

const poKljucu = await mapaKlubov(db, vir)
const idIzImena = (ime) => poKljucu.get(vir.kljucKluba(ime)) ?? null
const iscemoId = new Set(iscemo.map((k) => k.id))

// --- zapisnik na klub iz razporeda ------------------------------------------------
const tekmaKluba = new Map() // team_id -> { id zapisnika, stran }
for (const l of lige) {
  if (!iscemo.some((k) => k.liga === l.id) || !l.source_league_code) continue
  let razpored
  try {
    razpored = vrsticeRazporeda(await stran(vir.naslovRazporeda(l.source_league_code)))
  } catch (e) {
    console.log(`  ${l.slug}: razporeda ni mogoče prebrati (${e.message})`)
    continue
  }
  for (const t of razpored.filter((x) => x.id))
    for (const [ime, s] of [[t.domaci, 'domaci'], [t.gostje, 'gostje']]) {
      const id = idIzImena(ime)
      if (id && iscemoId.has(id) && !tekmaKluba.has(id)) tekmaKluba.set(id, { id: t.id, stran: s })
    }
}

// --- grbi z glave zapisnika ---------------------------------------------------------
const najdeni = []
const brez = []
const strani = new Map()
for (const k of iscemo) {
  const t = tekmaKluba.get(k.id)
  if (!t) { brez.push(`${k.name} (ni zapisnika v razporedu)`); continue }
  if (!strani.has(t.id)) strani.set(t.id, grbiZapisnika(await stran(vir.naslovZapisnika(null, t.id))))
  const grb = strani.get(t.id)[t.stran]
  if (!grb) { brez.push(`${k.name} (v glavi zapisnika ${t.id} ni slike)`); continue }
  const idVira = idIzImena(grb.ime)
  if (idVira && idVira !== k.id) { brez.push(`${k.name}: na mestu je "${grb.ime}" (drug klub), zapisnik ${t.id}`); continue }
  najdeni.push({ klub: k, src: grb.src })
}
const deljeni = deljeniGrbi(najdeni.map((n) => ({ klub: n.klub.id, kljuc: n.src })))
const nacrt = []
for (const n of najdeni) {
  if (deljeni.has(n.src)) brez.push(`${n.klub.name} (ista slika kot pri drugem klubu)`)
  else nacrt.push(n)
}

console.log(`\nGrbov najdenih: ${nacrt.length} / ${iscemo.length}`)
for (const n of nacrt) console.log(`  ${n.klub.name} → ${n.src}${n.klub.logo_url ? `  (prepiše ${n.klub.logo_url})` : ''}`)
if (brez.length) console.log(`\nBrez grba (${brez.length}):\n  ${brez.join('\n  ')}`)
if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi (servisni ključ)')
  process.exit(0)
}

// --- prenos -------------------------------------------------------------------------
const preneseni = []
let padlo = 0
for (const n of nacrt) {
  try {
    const o = await prenesi(n.src)
    const vrsta = (o.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!o.ok || !vrsta.startsWith('image/')) throw new Error(`HTTP ${o.status} ${vrsta}`)
    const buf = Buffer.from(await o.arrayBuffer())
    if (buf.length < 200) throw new Error('prazna slika')
    preneseni.push({ ...n, buf, konc: KONCNICE[vrsta] ?? 'png', hash: createHash('sha1').update(buf).digest('hex') })
  } catch (e) {
    console.log(`  ✗ ${n.klub.name}: ${e.message}`)
    padlo++
  }
}
// Ista VSEBINA pod različnimi naslovi je privzeta slika.
const deljeneVsebine = deljeniGrbi(preneseni.map((p) => ({ klub: p.klub.id, kljuc: p.hash })))
if (!existsSync(MAPA)) mkdirSync(MAPA, { recursive: true })
let preneseno = 0
for (const p of preneseni) {
  if (deljeneVsebine.has(p.hash)) { console.log(`  – ${p.klub.name}: ista slika kot pri drugem klubu — preskočeno`); continue }
  const pot = `/grbi/${imeDatoteke(p.klub.name)}-${p.klub.id}.${p.konc}`
  writeFileSync(`public${pot}`, p.buf)
  if (p.konc !== 'svg') zmanjsaj(`public${pot}`)
  let zapis = db.from('teams').update({ logo_url: pot }).eq('id', p.klub.id)
  if (!prepisi) zapis = zapis.or('logo_url.is.null,logo_url.eq.')
  const { error } = await zapis
  if (error) { console.log(`  ✗ ${p.klub.name}: ${error.message}`); padlo++; continue }
  console.log(`  ✓ ${p.klub.name}`)
  preneseno++
}
console.log(`\nPreneseno: ${preneseno}, neuspelo: ${padlo}`)
process.exit(padlo ? 1 : 0)
