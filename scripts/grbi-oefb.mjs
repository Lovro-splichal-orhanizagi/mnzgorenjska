// Grbi avstrijskih klubov z oefb.at.
//
//   node scripts/grbi-oefb.mjs                              # načrt za vse AKTIVNE avstrijske lige
//   ... --tekmovanje at-k-kaerntner-liga                    # samo ena liga (tudi neaktivna)
//   ... --pisi      (prenese v public/grbi/at-*.png in zapiše logo_url)
//   ... --prepisi   (tudi klubi, ki grb že imajo)
//
// Razpored lige (ena stran na ligo) ima pri vsaki tekmi id grba obeh ekip
// (`heimMannschaftLogo`, `gastMannschaftLogo`); ime ekipe iz razporeda da
// `imeEkipe` kot pri uvozu, zato se ujame s `teams`. Slika je
// /oefb2/images/1278650591628556536_<id>-1,0-256x256-256x256.png — strežnik jo
// pomanjša sam, zato zahtevamo kar največjih 256 px kot pri drugih virih.
//
// DOVOLJENJE: robots.txt oefb.at splošnim robotom PREPOVE /oefb2/images/.
// Grbe od tam beremo SAMO zato, ker je ÖFB to izrecno dovolil (odgovor na
// mail lastniku, 9. 10. 2026; vprašali smo prav za /oefb2/images/). Če ÖFB
// dovoljenje umakne, skripte ne poganjaj več.
//
// Ponoven zagon pobere klube, ki so med tem prišli z uvozom novih lig. Ista
// slika (id ali vsebina) pri več klubih je privzeta slika, ne grb — preskočimo.
//
// Za načrt zadošča javni (anon) ključ: brez `--pisi` skripta samo bere bazo
// in strani razporeda (slik ne). Pisanje potrebuje servisni ključ in teče v
// delovnem toku *Grbi klubov* (`vir = oefb`). Beremo vljudno kot uvoz:
// User-Agent SLFF, 1,5 s premora.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vir, { vrsticeRazporeda, naslovGrba } from './viri/oefb.mjs'
import { deljeniGrbi } from './viri/hns.mjs'
import { mapaKlubov } from './klubi.mjs'
import { vseVrstice } from './strani.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const MAPA = 'public/grbi'

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

const imeDatoteke = (ime) =>
  'at-' +
  ime
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

// --- lige in klubi -------------------------------------------------------------
// Brez --tekmovanje le aktivne lige: neaktivne se še uvažajo.
let q = db.from('competitions').select('id, slug, source_league_code').eq('source', 'oefb').order('slug')
q = samoLiga ? q.eq('slug', samoLiga) : q.eq('active', true)
const { data: lige, error: eLige } = await q
if (eLige) throw new Error(eLige.message)
if (!lige?.length) {
  console.error(samoLiga ? `Avstrijske lige "${samoLiga}" ni (source = oefb).` : 'Ni aktivnih avstrijskih lig (source = oefb).')
  process.exit(1)
}

const vrstice = await vseVrstice((od, do_) =>
  db
    .from('competition_teams')
    .select('team_id, competition_id, name, logo_url')
    .in('competition_id', lige.map((l) => l.id))
    .order('team_id')
    .order('competition_id')
    .range(od, do_),
)
const klubi = new Map() // team_id -> { id, name, logo_url, lige: Set }
for (const v of vrstice) {
  if (!klubi.has(v.team_id)) klubi.set(v.team_id, { id: v.team_id, name: v.name, logo_url: v.logo_url, lige: new Set() })
  klubi.get(v.team_id).lige.add(v.competition_id)
}
const iscemo = [...klubi.values()].filter((k) => prepisi || !k.logo_url)
console.log(
  `Lige: ${lige.map((l) => l.slug).join(', ')}\nKlubov: ${klubi.size}, z grbom ${klubi.size - [...klubi.values()].filter((k) => !k.logo_url).length}, iščemo ${iscemo.length}${prepisi ? ' (--prepisi)' : ''}`,
)
if (!iscemo.length) process.exit(0)

const poKljucu = await mapaKlubov(db, vir)
const idIzImena = (ime) => poKljucu.get(vir.kljucKluba(ime)) ?? poKljucu.get(vir.poenostavi(ime)) ?? null

// --- id grba iz razporeda (ena stran na ligo) ------------------------------------
const iscemoId = new Set(iscemo.map((k) => k.id))
const grbKluba = new Map() // team_id -> { id, imeVira }
for (const l of lige) {
  if (!iscemo.some((k) => k.lige.has(l.id)) || !l.source_league_code) continue
  let razpored
  try {
    const o = await prenesi(vir.naslovRazporeda(l.source_league_code))
    if (!o.ok) throw new Error(`HTTP ${o.status}`)
    razpored = vrsticeRazporeda(await o.text())
  } catch (e) {
    console.log(`  ${l.slug}: razporeda ni mogoče prebrati (${e.message})`)
    continue
  }
  for (const t of razpored) {
    for (const [ime, grb] of [[t.domaci, t.grbDomaci], [t.gostje, t.grbGostje]]) {
      const id = idIzImena(ime)
      if (id && iscemoId.has(id) && grb && !grbKluba.has(id)) grbKluba.set(id, { id: grb, imeVira: ime })
    }
  }
}

const brezGrba = []
const najdeni = []
for (const k of iscemo.sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
  const g = grbKluba.get(k.id)
  if (g) najdeni.push({ klub: k, ...g })
  else brezGrba.push(k.name)
}
const deljeniId = deljeniGrbi(najdeni.map((n) => ({ klub: n.klub.id, kljuc: n.id })))
const nacrt = []
for (const n of najdeni) {
  if (deljeniId.has(n.id)) brezGrba.push(`${n.klub.name} (ista slika kot pri drugem klubu: ${n.id})`)
  else nacrt.push(n)
}

// Ime datoteke: po imenu kluba, ob trku z drugim klubom še id.
const zasedene = new Map()
for (const n of nacrt) {
  let osnova = imeDatoteke(n.klub.name)
  if (zasedene.has(osnova) && zasedene.get(osnova) !== n.klub.id) osnova += `-${n.klub.id}`
  zasedene.set(osnova, n.klub.id)
  n.pot = `/grbi/${osnova}.png`
  n.url = naslovGrba(n.id)
}

console.log(`\nGrbov najdenih: ${nacrt.length} / ${iscemo.length}`)
for (const n of nacrt) {
  const ime = vir.kljucKluba(n.imeVira) !== vir.kljucKluba(n.klub.name) ? `  [oefb: ${n.imeVira}]` : ''
  const prej = n.klub.logo_url ? `  (prepiše ${n.klub.logo_url})` : ''
  console.log(`  ${n.klub.name} → ${n.url}${ime}${prej}`)
}
if (brezGrba.length) console.log(`\nBrez grba v razporedu (${brezGrba.length}):\n  ${brezGrba.join('\n  ')}`)

if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi (servisni ključ)')
  process.exit(0)
}

// --- prenos ------------------------------------------------------------------------
// Najprej vse slike v pomnilnik: ista VSEBINA pri več klubih je privzeta slika.
const preneseni = []
let padlo = 0
for (const n of nacrt) {
  try {
    const o = await prenesi(n.url)
    const vrsta = (o.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!o.ok || vrsta !== 'image/png') throw new Error(`HTTP ${o.status} ${vrsta}`)
    const buf = Buffer.from(await o.arrayBuffer())
    if (buf.length < 200) throw new Error('prazna slika')
    preneseni.push({ ...n, buf, hash: createHash('sha1').update(buf).digest('hex') })
  } catch (e) {
    console.log(`  ✗ ${n.klub.name}: ${e.message}`)
    padlo++
  }
}
const deljeneVsebine = deljeniGrbi(preneseni.map((p) => ({ klub: p.klub.id, kljuc: p.hash })))

if (!existsSync(MAPA)) mkdirSync(MAPA, { recursive: true })
let preneseno = 0
for (const p of preneseni) {
  if (deljeneVsebine.has(p.hash)) {
    console.log(`  – ${p.klub.name}: ista slika kot pri drugem klubu (privzeta) — preskočeno`)
    continue
  }
  try {
    const datoteka = `${MAPA}/${p.pot.split('/').pop()}`
    writeFileSync(datoteka, p.buf)
    let zapis = db.from('teams').update({ logo_url: p.pot }).eq('id', p.klub.id)
    // Brez --prepisi tudi baza varuje grb, ki ga je kdo vpisal med tem zagonom.
    if (!prepisi) zapis = zapis.or('logo_url.is.null,logo_url.eq.')
    const { error: e } = await zapis
    if (e) throw new Error(e.message)
    console.log(`  ✓ ${p.klub.name} (${Math.round(statSync(datoteka).size / 1024)} kB)`)
    preneseno++
  } catch (e) {
    console.log(`  ✗ ${p.klub.name}: ${e.message}`)
    padlo++
  }
}
console.log(`\nPreneseno: ${preneseno}, neuspelo: ${padlo}`)
process.exit(padlo ? 1 : 0)
