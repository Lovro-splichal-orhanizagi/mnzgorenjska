// Prenese grbe klubov v `public/grbi/` in jih poveže s klubi v bazi.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/prenesi-grbe.mjs
//   ... --pisi        (dejansko prenese in zapiše; brez tega samo pokaže načrt)
//   SUPABASE_URL=...  (za projekt v oblaku)
//
// Uradnih grbov MNZ Gorenjska ne objavlja. Večina klubov 1. GNL nima spletne
// strani, ima pa NK Kranj (Zarica) ob najavah tekem objavljene grbe vseh
// nasprotnikov — od tam jih vzamemo. Ključ v spodnjem seznamu je poenostavljeno
// ime kluba, kot ga vidi `uvoz-razporeda.mjs`, da se ujemata ne glede na vezaje.
//
// Klubi, ki igrajo samo mladinsko ligo, pri NK Kranj niso zbrani — njihove
// grbe vzamemo z njihovih klubskih strani.
//
// Grbi so blagovne znamke klubov; uporabljamo jih za prikaz kluba, kar je pri
// navijaških straneh običajno. Če kak klub tega ne želi, se vrstica pobriše in
// aplikacija zanj spet nariše grb iz začetnic.
//
// MNZ Ljubljana grbov ne objavlja, jih pa ima NK Vir na svoji strani zbrane za
// napovedi tekem (`tl_files/Klubski grbi/`) — od tam vzamemo 2. ljubljansko
// ligo, manjkajoča dva kluba z njunih strani. (1. LJ ligo smo dodali ročno.)
//
// Vsak prenesen grb takoj pomanjšamo na največ 256 px (`sips`, sistemsko na
// macOS) — vir jih ponuja tudi po 800 px in 1 MB, v aplikaciji pa se grb
// izriše pri ~22–32 px. Če `sips` ni na voljo, grb ostane v izvirni velikosti.
import { createClient } from '@supabase/supabase-js'
import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'

const MAPA = 'public/grbi'
const NAJVECJA_STRANICA = 256
const NKK = 'https://nkkranj.si/wp-content/uploads'
const NKV = 'https://www.nkvir.si/tl_files/Klubski%20grbi'

const GRBI = {
  'bled bohinj hirter': `${NKK}/2026/07/grb-hirter-bled.png`,
  britof: `${NKK}/2026/07/grb-britof.png`,
  'eltron preddvor': `${NKK}/2026/07/grb-sd-storzic-preddvor.png`,
  'jezero medvode': `${NKK}/2026/07/grb-jezero-medvode.png`,
  'kranjska gora': `${NKK}/2026/07/kranjska-gora.png`,
  'niko zelezniki': `${NKK}/2026/07/niko-zelezniki.png`,
  polet: `${NKK}/2026/07/polet.png`,
  'sava kranj': `${NKK}/2026/07/grb-nk-sava-kranj.png`,
  'topdom dom trade bitnje': `${NKK}/2026/07/bitnje.png`,
  'trzic 2012': `${NKK}/2026/07/trzic-2012.png`,
  'velesovo cerklje': `${NKK}/2026/07/grb-velesovo-cerklje.png`,
  visoko: `${NKK}/2026/07/grb-sd-visoko.png`,
  'zarica kranj': `${NKK}/2026/06/Grb-nk_zarica_kranj.png`,

  // samo mladinska liga
  jesenice: `${NKK}/2026/07/grb-jesenice.png`,
  sencur:
    'https://sportnodrustvo-sencur.si/resources/files/pic/Drago/razno/grb.jpg.JPG',
  'sobec lesce': 'http://www.nk-lesce.si/wp-content/themes/nklesce/images/logo.png',
  'eksist ziri': 'https://nklub-ziri.si/wp-content/uploads/2018/11/site-icon.png',

  // MNZ Ljubljana, 2. liga — člani. Ključi so podvojeni, ker arhiv klub
  // ponekod vpiše s predpono ("ŠD Vir"), drugod brez ("Vir"); odvečen ključ,
  // ki se ne ujame z nobenim klubom, ne škodi.
  kamnik: `${NKV}/kamnik_90x90.png`,
  'termit moravce': `${NKV}/moravce_90x90.png`,
  moravce: `${NKV}/moravce_90x90.png`,
  'sd vir': `${NKV}/vir_90x90.png`,
  vir: `${NKV}/vir_90x90.png`,
  komenda: `${NKV}/komenda_90x90.png`,
  crnuce: `${NKV}/crnuce_90x90.png`,
  sentjernej: `${NKV}/sentjernej_90x90.png`,
  'nk iak kresnice': `${NKV}/kresnice_90x90.png`,
  'iak kresnice': `${NKV}/kresnice_90x90.png`,
  kresnice: `${NKV}/kresnice_90x90.png`,
  'nk ugar ribnica':
    'https://www.nkugar.si/wp-content/uploads/2025/08/logo-nk-ugar-pravi-2.png',
  'ugar ribnica':
    'https://www.nkugar.si/wp-content/uploads/2025/08/logo-nk-ugar-pravi-2.png',
  ribnica:
    'https://www.nkugar.si/wp-content/uploads/2025/08/logo-nk-ugar-pravi-2.png',
  ihan: 'https://nkihan.si/wp-content/uploads/2021/02/1932.png',
}

// Pomanjša datoteko na kvadrat NAJVECJA_STRANICA px (ohrani razmerje, ne
// poveča manjših). `sips` je na macOS vedno na voljo; drugje tiho preskočimo.
let sipsManjka = false
function zmanjsaj(pot) {
  if (sipsManjka) return
  try {
    execFileSync(
      'sips',
      ['--resampleHeightWidthMax', String(NAJVECJA_STRANICA), pot],
      { stdio: 'ignore' },
    )
  } catch (e) {
    sipsManjka = true
    console.log(`  (sips ni na voljo — grbi ostanejo v izvirni velikosti: ${e.code ?? e.message})`)
  }
}

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

const env = izEnv()
const BASE =
  process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const pisi = process.argv.includes('--pisi')
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

// Enako poenostavljanje kot pri uvozu razporeda: brez ločil in velikih črk.
const poenostavi = (ime) =>
  ime
    .toLowerCase()
    .replace(/[^a-zčšž0-9]+/g, ' ')
    .trim()

// Šumniki gredo v osnovne črke, da se ključi in imena datotek ujemajo.
const kljuc = (ime) =>
  poenostavi(ime).replace(/č/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z')

// Grb ni vedno PNG (grb ŠD Šenčur je JPEG), ime datoteke pa naj pove resnico.
const koncnica = (url) =>
  (url.match(/\.(png|jpe?g|svg|webp)(?:$|\?)/i)?.[1] ?? 'png')
    .toLowerCase()
    .replace('jpeg', 'jpg')

const { data: klubi, error } = await db.from('teams').select('id, name, logo_url')
if (error) {
  console.error(error.message)
  process.exit(1)
}

const nacrt = []
for (const k of klubi) {
  const vir = GRBI[kljuc(k.name)]
  if (!vir) {
    console.log(`  ${k.name}: grba ni v seznamu — ostane grb iz začetnic`)
    continue
  }
  const datoteka = kljuc(k.name).split(' ').join('-')
  nacrt.push({ klub: k, vir, pot: `/grbi/${datoteka}.${koncnica(vir)}` })
}

console.log(`\nGrbov za prenos: ${nacrt.length} / ${klubi.length} klubov`)
for (const n of nacrt) console.log(`  ${n.klub.name} → ${n.pot}`)

if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi')
  process.exit(0)
}

if (!existsSync(MAPA)) mkdirSync(MAPA, { recursive: true })

let preneseno = 0
for (const n of nacrt) {
  try {
    const odgovor = await fetch(n.vir)
    if (!odgovor.ok) throw new Error(`${odgovor.status}`)
    const slika = Buffer.from(await odgovor.arrayBuffer())
    const datoteka = `${MAPA}/${n.pot.split('/').pop()}`
    writeFileSync(datoteka, slika)
    zmanjsaj(datoteka)
    const koncna = statSync(datoteka).size

    const { error: eKlub } = await db
      .from('teams')
      .update({ logo_url: n.pot })
      .eq('id', n.klub.id)
    if (eKlub) throw new Error(eKlub.message)

    const izvirna = Math.round(slika.length / 1024)
    const zdaj = Math.round(koncna / 1024)
    console.log(
      `  ✓ ${n.klub.name} (${zdaj} kB${zdaj !== izvirna ? `, prej ${izvirna} kB` : ''})`,
    )
    preneseno++
  } catch (e) {
    console.log(`  ✗ ${n.klub.name}: ${e.message}`)
  }
}

console.log(`\nPrenesenih grbov: ${preneseno}`)
