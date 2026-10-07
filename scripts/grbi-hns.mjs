// Grbi hrvaških klubov s HNS Semaforja (semafor.hns.family).
//
//   node scripts/grbi-hns.mjs                          # načrt za vse hrvaške lige
//   ... --tekmovanje hr-mz-1mnl                        # samo ena liga
//   ... --pisi      (prenese v public/grbi/hr-*.{png,jpg,gif} in zapiše logo_url)
//   ... --prepisi   (tudi klubi, ki grb že imajo)
//
// Grb kluba je v glavi vsake strani tekme (`grbiTekme` v viri/hns.mjs):
// domači levo (`club1`), gostje desno (`club2`). Za vsak klub brez grba
// vzamemo njegovo najnovejšo uvoženo tekmo (`matches.source_url` =
// /utakmice/<id>/) in stran tekme določi, kateri grb je čigav — po MESTU, ne
// po `alt`, ker se ime v bazi lahko razlikuje od imena na Semaforju. Klub brez
// uvožene tekme poiščemo v razporedu lige (ena stran na ligo).
//
// Shranimo izvirnik (200–300 px) namesto pomanjšanega 80 px, pomanjšamo na
// največ 256 px kot pri drugih virih. Nadomestne slike ne shranimo: naslov
// zunaj COMET-ove mape slik ali ista slika (naslov ali vsebina) pri več
// klubih ostane brez grba — klub obdrži grb iz začetnic.
//
// Za načrt zadošča javni (anon) ključ: brez `--pisi` skripta samo bere.
// Pisanje potrebuje servisni ključ in teče v delovnem toku *Grbi klubov*
// (`vir = hns`). Beremo vljudno kot uvoz: User-Agent SLFF, 500 ms premora.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import vir, { vrsticeRazporeda, grbiTekme, jeNadomestniGrb, izvirnikGrba, deljeniGrbi } from './viri/hns.mjs'
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
// Načrt samo bere, zato zadošča javni ključ; pisanje zahteva servisnega.
const KLJUC = env.SUPABASE_SERVICE_ROLE_KEY || (pisi ? null : env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
if (!KLJUC) {
  console.error(pisi ? 'Za --pisi manjka SUPABASE_SERVICE_ROLE_KEY' : 'Manjka SUPABASE_SERVICE_ROLE_KEY ali anon ključ')
  process.exit(1)
}
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

const prenesi = (url) => prenesiSPonovitvami(url, { glave: vir.glave, premorMs: vir.premorMs })
async function stran(url) {
  const o = await prenesi(url)
  if (!o.ok) throw new Error(`HTTP ${o.status}`)
  return o.text()
}

// `sips` je macOS, `convert` (ImageMagick) GitHub Actions; brez obeh ostane
// izvirnik (pri Semaforju največ ~300 px, torej sprejemljivo).
const manjka = new Set()
function zmanjsaj(pot) {
  const orodja = [
    ['sips', ['--resampleHeightWidthMax', String(NAJVECJA_STRANICA), pot]],
    ['convert', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
  ].filter(([ukaz]) => !manjka.has(ukaz))
  for (const [ukaz, a] of orodja) {
    try {
      execFileSync(ukaz, a, { stdio: 'ignore' })
      return
    } catch (e) {
      if (e.code === 'ENOENT') manjka.add(ukaz)
      else console.log(`  (${ukaz} ni zmanjšal ${pot.split('/').pop()}: ${e.message.split('\n')[0]})`)
    }
  }
}

const imeDatoteke = (ime) =>
  'hr-' +
  ime
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

const KONCNICE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }
const koncnicaNaslova = (url) =>
  (String(url).match(/\.(png|jpe?g|gif|svg|webp)(?:$|\?)/i)?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg')

// --- lige in klubi -------------------------------------------------------------
let q = db.from('competitions').select('id, slug, source_league_code').eq('source', 'hns').order('slug')
if (samoLiga) q = q.eq('slug', samoLiga)
const { data: lige, error: eLige } = await q
if (eLige) throw new Error(eLige.message)
if (!lige?.length) {
  console.error(samoLiga ? `Hrvaške lige "${samoLiga}" ni (source = hns).` : 'Ni hrvaških lig (source = hns).')
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
const zGrbom = [...klubi.values()].filter((k) => k.logo_url)
const iscemo = [...klubi.values()].filter((k) => prepisi || !k.logo_url)
console.log(
  `Lige: ${lige.map((l) => l.slug).join(', ')}\nKlubov: ${klubi.size}, z grbom ${zGrbom.length}, iščemo ${iscemo.length}${prepisi ? ' (--prepisi)' : ''}`,
)
if (!iscemo.length) process.exit(0)

// ključ imena -> id kluba (za preverbo imena v glavi tekme in za razpored)
const poKljucu = await mapaKlubov(db, vir)
const idIzImena = (ime) => poKljucu.get(vir.kljucKluba(ime)) ?? poKljucu.get(vir.poenostavi(ime)) ?? null

// --- ena tekma na klub -----------------------------------------------------------
// Najnovejša uvožena tekma (grb je takšen, kot ga ima klub zdaj).
const tekmaKluba = new Map() // team_id -> { url, stran: 'domaci'|'gostje', datum }
const iscemoId = new Set(iscemo.map((k) => k.id))
for (const l of lige) {
  const tekme = await vseVrstice((od, do_) =>
    db
      .from('matches')
      .select('id, home_team_id, away_team_id, source_url, played_on, rounds!inner(competition_id)')
      .eq('rounds.competition_id', l.id)
      .like('source_url', '%/utakmice/%')
      .order('id')
      .range(od, do_),
  )
  for (const t of tekme) {
    for (const [id, s] of [[t.home_team_id, 'domaci'], [t.away_team_id, 'gostje']]) {
      if (!iscemoId.has(id)) continue
      const prej = tekmaKluba.get(id)
      if (!prej || (t.played_on ?? '') > (prej.datum ?? '')) tekmaKluba.set(id, { url: t.source_url, stran: s, datum: t.played_on })
    }
  }
}

// Kdor tekme z zapisnikom nima, ga poiščemo v razporedu lige (tudi neodigrana
// tekma ima glavo z grboma).
for (const l of lige) {
  const brez = iscemo.filter((k) => !tekmaKluba.has(k.id) && k.lige.has(l.id))
  if (!brez.length || !l.source_league_code) continue
  let razpored
  try {
    razpored = vrsticeRazporeda(await stran(vir.naslovRazporeda(l.source_league_code)))
  } catch (e) {
    console.log(`  ${l.slug}: razporeda ni mogoče prebrati (${e.message})`)
    continue
  }
  for (const t of razpored) {
    for (const [ime, s] of [[t.domaci, 'domaci'], [t.gostje, 'gostje']]) {
      const id = idIzImena(ime)
      if (id && iscemoId.has(id) && !tekmaKluba.has(id))
        tekmaKluba.set(id, { url: vir.naslovZapisnika(l.source_league_code, t.id), stran: s, datum: t.datum })
    }
  }
}

// --- grbi s strani tekem ---------------------------------------------------------
const najdeni = [] // { klub, src, izvirnik, imeVira }
const brezTekme = []
const brezGrba = []
const zaPregled = []
const strani = new Map() // url -> grbiTekme (tekma dveh iskanih klubov se prebere enkrat)
for (const k of iscemo.sort((a, b) => a.name.localeCompare(b.name, 'hr'))) {
  const t = tekmaKluba.get(k.id)
  if (!t) {
    brezTekme.push(k.name)
    continue
  }
  let g = strani.get(t.url)
  if (!g) {
    try {
      g = grbiTekme(await stran(t.url))
    } catch (e) {
      zaPregled.push(`${k.name}: stran tekme ni dosegljiva (${e.message}) ${t.url}`)
      continue
    }
    strani.set(t.url, g)
  }
  const grb = g[t.stran]
  if (!grb || jeNadomestniGrb(grb.src)) {
    brezGrba.push(`${k.name} (${grb ? grb.src : 'v glavi tekme ni slike'}) ${t.url}`)
    continue
  }
  // Mesto v glavi odloča; ime je le varovalka. Če ime na tem mestu pripada
  // DRUGEMU našemu klubu, je nekaj narobe (tekma obrnjena v bazi) — ne ugibamo.
  const idVira = grb.ime ? idIzImena(grb.ime) : null
  if (idVira && idVira !== k.id) {
    zaPregled.push(`${k.name}: na mestu ${t.stran === 'domaci' ? 'domačih' : 'gostov'} je "${grb.ime}" (drug klub) ${t.url}`)
    continue
  }
  najdeni.push({ klub: k, src: grb.src, izvirnik: izvirnikGrba(grb.src), imeVira: grb.ime, tekma: t.url })
}

// Ista slika pri več klubih je privzeta slika, ne grb.
const deljeniNaslovi = deljeniGrbi(najdeni.map((n) => ({ klub: n.klub.id, kljuc: n.izvirnik ?? n.src })))
const nacrt = []
for (const n of najdeni) {
  if (deljeniNaslovi.has(n.izvirnik ?? n.src)) brezGrba.push(`${n.klub.name} (ista slika kot pri drugem klubu: ${n.src})`)
  else nacrt.push(n)
}

// Ime datoteke: po imenu kluba, ob trku z drugim klubom še id.
const zasedene = new Map()
for (const n of nacrt) {
  let osnova = imeDatoteke(n.klub.name)
  if (zasedene.has(osnova) && zasedene.get(osnova) !== n.klub.id) osnova += `-${n.klub.id}`
  zasedene.set(osnova, n.klub.id)
  n.osnova = osnova
  n.pot = `/grbi/${osnova}.${koncnicaNaslova(n.izvirnik ?? n.src)}`
}

console.log(`\nGrbov najdenih: ${nacrt.length} / ${iscemo.length}`)
for (const n of nacrt) {
  const ime = n.imeVira && vir.kljucKluba(n.imeVira) !== vir.kljucKluba(n.klub.name) ? `  [Semafor: ${n.imeVira}]` : ''
  const prej = n.klub.logo_url ? `  (prepiše ${n.klub.logo_url})` : ''
  console.log(`  ${n.klub.name} → ${n.izvirnik ?? n.src}${ime}${prej}`)
}
if (brezGrba.length) console.log(`\nBrez grba na Semaforju (${brezGrba.length}):\n  ${brezGrba.join('\n  ')}`)
if (brezTekme.length) console.log(`\nBrez tekme na Semaforju (${brezTekme.length}): ${brezTekme.join(', ')}`)
if (zaPregled.length) console.log(`\nZa ročni pregled, NE zapišemo (${zaPregled.length}):\n  ${zaPregled.join('\n  ')}`)

if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi (servisni ključ)')
  process.exit(0)
}

// --- prenos ------------------------------------------------------------------------
// Najprej vse slike v pomnilnik: ista VSEBINA pri več klubih (privzeta slika
// pod različnimi naslovi) se pokaže šele po prenosu.
const preneseni = []
let padlo = 0
for (const n of nacrt) {
  let slika = null
  for (const url of [n.izvirnik, n.src].filter(Boolean)) {
    try {
      const o = await prenesi(url)
      const vrsta = (o.headers.get('content-type') ?? '').split(';')[0].trim()
      // Neobstoječa velikost vrne 404 s HTML; sliko sprejmemo le kot sliko.
      if (!o.ok || !vrsta.startsWith('image/')) {
        await o.body?.cancel().catch(() => {})
        continue
      }
      slika = { buf: Buffer.from(await o.arrayBuffer()), vrsta, url }
      break
    } catch {}
  }
  if (!slika || slika.buf.length < 200) {
    console.log(`  ✗ ${n.klub.name}: slike ni bilo mogoče prenesti`)
    padlo++
    continue
  }
  const konc = KONCNICE[slika.vrsta] ?? koncnicaNaslova(slika.url)
  preneseni.push({ ...n, ...slika, pot: `/grbi/${n.osnova}.${konc}`, hash: createHash('sha1').update(slika.buf).digest('hex') })
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
    if (!p.pot.endsWith('.svg')) zmanjsaj(datoteka)
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
