// Grbi klubov iz NZS — za lige, ki jih NZS objavlja.
//
// `prenesi-grbe.mjs` je rocni seznam naslovov, sestavljen za Gorenjsko in
// Ljubljano. Za drzavne lige tega ni treba: NZS ob vsaki tekmi izrise grba
// obeh klubov in ju v HTML postavi kot `<img src="…" alt="SD Šenčur">`. Ime
// kluba in grb sta torej v isti znacki in ju ni treba ugibati.
//
// Pokriva 1. SNL, 2. SNL, obe 3. SNL in mladinske SML. Regionalnih lig (MNZ) NZS ne objavlja
// in zanje tega vira ni — tam klub ostane pri grbu iz zacetnic, ki ga narise
// `src/components/Grb.jsx`.
//
//   node scripts/prenesi-grbe-nzs.mjs           # samo nacrt
//   ... --pisi                                  # prenese in zapise
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { poenostavi } from './klubi.mjs'

/**
 * Kljuc za ujemanje imen med viroma.
 *
 * NZS pise uradna imena ("SD Šenčur", "NK Brežice 1919"), MNZ pa tista s
 * sponzorji ("Eltron Šenčur", "Brežice 1919 Terme Čatež"). Zato odstranimo
 * vrsto drustva in primerjamo ZAPOREDJE BESED, ne golega podniza: "NK Dob"
 * se tako ne ujame z "Dobrepolje", kar bi se pri podnizu zgodilo.
 */
const VRSTA_DRUSTVA =
  /^(nk|nd|sd|md|mnk|fc|ns|kmn|dns|znk|sk|ask|nogometni|drustvo|sportno|logo|logotip|grb)$/

function besede(ime) {
  return poenostavi(ime)
    .split(' ')
    .filter((b) => b && !VRSTA_DRUSTVA.test(b))
}

/** Ali se krajse zaporedje besed pojavi v daljsem. */
function vsebuje(dolge, kratke) {
  if (!kratke.length || kratke.length > dolge.length) return false
  for (let i = 0; i + kratke.length <= dolge.length; i++) {
    if (kratke.every((b, j) => dolge[i + j] === b)) return true
  }
  return false
}

/**
 * Zanesljivo ujemanje je samo ENAKO zaporedje besed.
 *
 * Delno ujemanje je premalo: "Dren Vrhnika" in "NK Vrhnika" sta RAZLICNA
 * kluba, prav tako "Fama Vipava" in "NK Vipava". Napacen grb na profilu kluba
 * je vidna napaka, zato tu raje ne ugibamo — kar ni enako, gre na seznam za
 * rocni pregled.
 */
function seUjemata(a, b) {
  const x = besede(a)
  const y = besede(b)
  return x.length > 0 && x.length === y.length && x.every((b2, i) => b2 === y[i])
}

/** Delno ujemanje — samo za predlog cloveku, nikoli za samodejni zapis. */
function morda(a, b) {
  const x = besede(a)
  const y = besede(b)
  return vsebuje(x, y) || vsebuje(y, x)
}

const MAPA = 'public/grbi'
const NAJVECJA_STRANICA = 256
const pisi = process.argv.includes('--pisi')

// Poti do razporedov, kjer NZS izrise grbe. Stran 0 zadosca: v enem krogu
// nastopijo vsi klubi lige.
const LIGE = [
  'prva-liga-telemach',
  '2-slovenska-nogometna-liga',
  '3-slovenska-nogometna-liga-zahod',
  '3-slovenska-nogometna-liga-vzhod',
  // Mladinske lige: isti klubi, a NZS jih tu piše brez sponzorja, zato
  // grb dobi tudi klub, ki ga je članska liga imenovala drugače.
  '1-sml-eon-nextgen',
  '2-sml-vzhod',
  '2-sml-zahod',
]

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
const env = { ...izEnv(), ...process.env }
const BASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const KLJUC = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KLJUC) { console.error('Manjka SUPABASE_URL ali servisni ključ.'); process.exit(1) }
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

// `sips` je macOS, `convert` (ImageMagick) je na ubuntu-latest v GitHub
// Actions, kjer skripta tece z zivim kljucem. Brez obeh ostane izvirnik.
// Orodje, ki ga ni (ENOENT), si zapomnimo in ga ne kličemo več; napaka pri
// ENI sliki (nenavaden format) pa ne sme izklopiti manjšanja za vse naslednje.
const manjka = new Set()
let opozorjeno = false
function zmanjsaj(pot) {
  const orodja = [
    ['sips', ['--resampleHeightWidthMax', String(NAJVECJA_STRANICA), pot]],
    ['convert', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
  ].filter(([ukaz]) => !manjka.has(ukaz))
  for (const [ukaz, arg] of orodja) {
    try {
      execFileSync(ukaz, arg, { stdio: 'ignore' })
      return
    } catch (e) {
      if (e.code === 'ENOENT') manjka.add(ukaz)
      else console.log(`  (${ukaz} ni zmanjšal ${pot.split('/').pop()}: ${e.message.split('\n')[0]})`)
    }
  }
  if (orodja.length === 0 && !opozorjeno) {
    opozorjeno = true
    console.log('  (ne sips ne convert nista na voljo — grbi ostanejo v izvirni velikosti)')
  }
}

/**
 * NZS ponuja tudi pomanjsane izpeljanke
 * (`/styles/flag_medium/public/media/image/X.png.webp?itok=…`). Iz njih
 * potegnemo izvirnik, ker je ostrejsi in brez zetona, ki potece.
 */
function izvirnik(src) {
  const m = src.match(/\/styles\/[^/]+\/public\/media\/image\/(.+?)(\.webp)?(?:\?|$)/)
  if (m) return `/sites/default/files/media/image/${m[1]}`
  return src.split('?')[0]
}

const koncnica = (url) =>
  (url.match(/\.(png|jpe?g|svg|webp)(?:$|\?)/i)?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg')

// --- poberi pare (ime kluba → grb) ------------------------------------------
const najdeni = new Map() // kljuc kluba -> absoluten naslov grba
for (const liga of LIGE) {
  const url = `https://www.nzs.si/klubi/moski/${liga}/tekme?page=0%2C0`
  let html
  try {
    const o = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (SLFF grbi)' } })
    if (!o.ok) throw new Error(`HTTP ${o.status}`)
    html = await o.text()
  } catch (e) {
    console.log(`  ${liga}: strani ni bilo mogoče prebrati (${e.message})`)
    continue
  }
  let n = 0
  for (const m of html.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/g)) {
    const [, src, alt] = m
    if (!src.includes('/media/image/') || !alt.trim()) continue
    // Logotipi tekmovanj in sponzorjev nimajo imena kluba v `alt`.
    if (/logo|sponzor|nzs|fundacija|union/i.test(src) && !/^[A-ZŠČŽ]/.test(alt)) continue
    const kljuc = poenostavi(alt)
    if (!kljuc || !besede(alt).length) continue
    if (!najdeni.has(kljuc)) {
      najdeni.set(kljuc, { naslov: `https://www.nzs.si${izvirnik(src)}`, ime: alt.trim() })
      n++
    }
  }
  console.log(`  ${liga}: ${n} novih grbov`)
}
console.log(`\nGrbov pri viru: ${najdeni.size}`)

// --- poveži z našimi klubi ---------------------------------------------------
const { data: klubi, error } = await db.from('teams').select('id, name, logo_url')
if (error) { console.error(error.message); process.exit(1) }

const nacrt = []
const zaPregled = []
for (const k of klubi ?? []) {
  if (k.logo_url) continue
  const zadetki = [...najdeni.values()].filter((v) => seUjemata(k.name, v.ime))
  if (zadetki.length === 0) {
    const predlogi = [...najdeni.values()].filter((v) => morda(k.name, v.ime))
    if (predlogi.length) zaPregled.push({ klub: k.name, predlogi: predlogi.map((p) => p.ime) })
    continue
  }
  if (zadetki.length > 1) {
    // Dvoumnega ujemanja ne ugibamo: napacen grb je vidna napaka.
    console.log(`  ? ${k.name}: več možnosti (${zadetki.map((z) => z.ime).join(', ')}) — preskočeno`)
    continue
  }
  const zadetek = zadetki[0]
  const datoteka = poenostavi(k.name).split(' ').join('-')
  nacrt.push({ klub: k, vir: zadetek, pot: `/grbi/${datoteka}.${koncnica(zadetek.naslov)}` })
}

console.log(`\nZanesljivih ujemanj (enako ime): ${nacrt.length}`)
for (const n of nacrt) console.log(`  ${n.klub.name}  ←  ${n.vir.ime}  →  ${n.pot}`)

if (zaPregled.length) {
  console.log(`\nZa ročni pregled (ime se ne ujema natanko, NE zapišemo): ${zaPregled.length}`)
  for (const z of zaPregled) console.log(`  ? ${z.klub}  ←  ${z.predlogi.join(' / ')}`)
}

if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi')
  process.exit(0)
}

if (!existsSync(MAPA)) mkdirSync(MAPA, { recursive: true })
let preneseno = 0, padlo = 0
for (const n of nacrt) {
  try {
    const o = await fetch(n.vir.naslov, { headers: { 'User-Agent': 'Mozilla/5.0 (SLFF grbi)' } })
    if (!o.ok) throw new Error(`HTTP ${o.status}`)
    const slika = Buffer.from(await o.arrayBuffer())
    const datoteka = `${MAPA}/${n.pot.split('/').pop()}`
    writeFileSync(datoteka, slika)
    // SVG je vektorski; `sips` ga ne zna in ga tudi ni treba manjšati.
    if (!n.pot.endsWith('.svg')) zmanjsaj(datoteka)
    const { error: e2 } = await db.from('teams').update({ logo_url: n.pot }).eq('id', n.klub.id)
    if (e2) throw new Error(e2.message)
    console.log(`  ✓ ${n.klub.name} (${Math.round(statSync(datoteka).size / 1024)} kB)`)
    preneseno++
  } catch (e) {
    console.log(`  ✗ ${n.klub.name}: ${e.message}`)
    padlo++
  }
}
console.log(`\nPreneseno: ${preneseno}, neuspelo: ${padlo}`)
process.exit(padlo ? 1 : 0)
