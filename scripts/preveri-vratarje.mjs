// Kdo je vratar samo zato, ker se je zapisnik enkrat zmotil?
//
// Uvoz iz oznake (V) igralca za vselej prekrsti v vratarja. Ce zapisnik
// kapetanu napise (V) namesto (K), sta v postavi dva vratarja in kapetan ostane
// GK — tako je Milivojevic (Jezero Medvode, mladinci) postal vratar po
// enem samem zapisniku 3. kroga 26/27. Uvoz tega ne dela vec, zgodovina pa je
// ostala.
//
// Lazni vratar ima prepoznaven vzorec: vsako tekmo, ki jo zacne, zacne tudi
// pravi vratar njegove ekipe. Skripta za vsakega GK presteje, koliko tekem je
// zacel brez drugega GK ("sam") in koliko z njim ("z drugim"), in izpise
// tiste, ki sami niso zaceli nikoli. Nicesar ne zapise.
//
// Pravi vratar se na seznamu lahko znajde, ce je vse tekme odigral ob laznem
// (npr. oba sta nova in sta se srecala le na eni tekmi) — zato je stolpec
// "z drugim" pomemben: kdor ima eno tekmo, je dvomljiv, kdor jih ima deset, ni.
//
// Z `--zapisniki` skripta za vsakega sumljivega prebere zapisnike tekem, ki
// jih je zacel ob drugem GK, in presteje, kolikokrat ga zapisnik res oznaci
// za vratarja. Steje le oznaka, ko je v postavi ekipe en sam (V); ce jih je
// vec (Sportnet: klub vpise "goalkeeper" trem), je oznaka dvoumna (?).
//   LAZEN    — vec zapisnikov ga ima v polju kot na golu (Milivojevic)
//   VRATAR   — obratno; lazen je verjetno tisti ob njem
//   NEJASNO  — izenaceno ali same dvoumne oznake
// Pomurski viri (Ptuj, Murska Sobota, Lendava) imajo en zapisnik za cel krog
// in jih skripta ne bere — ostanejo za rocni pregled.
//
//   node scripts/preveri-vratarje.mjs                      # vse aktivne lige
//   node scripts/preveri-vratarje.mjs --tekmovanje mladinci
//   node scripts/preveri-vratarje.mjs --zapisniki          # z razsodbo
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { vseVrstice } from './strani.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'
import { vZapisnik } from './viri/sportnet.mjs'
import { parsirajZapisnik as zapisnikCms } from './zapisnik.mjs'
import { parsirajZapisnik as zapisnikMaribor } from './zapisnik-maribor.mjs'
import { parsirajZapisnik as zapisnikNzs } from './zapisnik-nzs.mjs'
import { parsirajZapisnik as zapisnikGorica } from './zapisnik-gorica.mjs'

const RAZCLENI = {
  'www.mnzgkranj.si': zapisnikCms,
  'www.mnzljubljana-zveza.si': zapisnikCms,
  'www.mnzcelje.com': zapisnikCms,
  'mnzmaribor.si': zapisnikMaribor,
  'www.nzs.si': zapisnikNzs,
  'mnzgorica.si': zapisnikGorica,
  'sutaze.api.sportnet.online': (besedilo, meta) => vZapisnik(JSON.parse(besedilo), meta),
}
const GLAVE = { 'User-Agent': 'SLFF fantasy (https://slff.eu)' }

/** Postava ekipe iz zapisnika tekme ali null, ce vira ne znamo brati. */
const zapisniki = new Map()
async function zapisnikTekme(tekma) {
  if (zapisniki.has(tekma.id)) return zapisniki.get(tekma.id)
  const razcleni = tekma.source_url && RAZCLENI[new URL(tekma.source_url).host]
  let z = null
  if (razcleni) {
    try {
      const odgovor = await prenesiSPonovitvami(tekma.source_url, { glave: GLAVE, premorMs: 300, log: () => {} })
      if (odgovor.ok) z = razcleni(await odgovor.text(), { zapisnikId: tekma.zapisnik_id, url: tekma.source_url })
    } catch (e) {
      console.error(`  ${tekma.source_url}: ${e.message}`)
    }
  }
  zapisniki.set(tekma.id, z)
  return z
}

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
const KLJUC = process.env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

const i = process.argv.indexOf('--tekmovanje')
const samo = i > 0 ? process.argv[i + 1] : null
const beriZapisnike = process.argv.includes('--zapisniki')
const razsodbe = { LAZEN: 0, VRATAR: 0, 'NI ZAPISNIKA': 0 }

let q = db.from('competitions').select('id, slug').order('sort_order')
q = samo ? q.eq('slug', samo) : q.eq('active', true)
const { data: lige, error } = await q
if (error) { console.error(error.message); process.exit(1) }
if (!lige?.length) { console.error(`ni lige ${samo ?? '(aktivne)'}`); process.exit(1) }

let skupaj = 0
for (const liga of lige) {
  const vratarji = await vseVrstice((od, do_) =>
    db.from('players')
      .select('id, full_name, position_source, teams(name)')
      .eq('competition_id', liga.id).eq('position', 'GK')
      .order('id').range(od, do_),
  )
  const poId = new Map(vratarji.map((p) => [p.id, p]))
  const idji = [...poId.keys()]

  const nastopi = []
  for (let k = 0; k < idji.length; k += 300) {
    const kos = idji.slice(k, k + 300)
    nastopi.push(...(await vseVrstice((od, do_) =>
      db.from('appearances')
        .select('id, match_id, team_id, player_id, shirt_number')
        .in('player_id', kos).eq('started', true)
        .order('id').range(od, do_),
    )))
  }

  // tekma+ekipa -> GK, ki so jo zaceli
  const naTekmi = new Map()
  for (const a of nastopi) {
    const kljuc = `${a.match_id}|${a.team_id}`
    if (!naTekmi.has(kljuc)) naTekmi.set(kljuc, [])
    naTekmi.get(kljuc).push(a.player_id)
  }
  const skupniNastopi = new Map() // player_id -> nastopi, ko je zacel se drug GK
  for (const a of nastopi) {
    if (naTekmi.get(`${a.match_id}|${a.team_id}`).length < 2) continue
    if (!skupniNastopi.has(a.player_id)) skupniNastopi.set(a.player_id, [])
    skupniNastopi.get(a.player_id).push(a)
  }

  const stevec = new Map() // player_id -> { sam, zDrugim, drugi: Map(id -> n) }
  for (const ids of naTekmi.values()) {
    for (const id of ids) {
      const s = stevec.get(id) ?? { sam: 0, zDrugim: 0, drugi: new Map() }
      if (ids.length === 1) s.sam++
      else {
        s.zDrugim++
        for (const o of ids) if (o !== id) s.drugi.set(o, (s.drugi.get(o) ?? 0) + 1)
      }
      stevec.set(id, s)
    }
  }

  const sumljivi = [...stevec.entries()]
    .filter(([, s]) => s.sam === 0 && s.zDrugim > 0)
    .sort((a, b) => b[1].zDrugim - a[1].zDrugim)
  if (!sumljivi.length) continue

  console.log(`\n${liga.slug} — ${sumljivi.length} sumljivih`)
  for (const [id, s] of sumljivi) {
    const p = poId.get(id)
    const [drugiId] = [...s.drugi.entries()].sort((a, b) => b[1] - a[1])[0]
    const drugi = poId.get(drugiId)
    const drugiSam = stevec.get(drugiId)?.sam ?? 0
    const razsodba = beriZapisnike ? await razsodi(skupniNastopi.get(id) ?? []) : ''
    console.log(
      (razsodba ? `  ${razsodba.padEnd(34)}` : '') +
      `  ${String(id).padStart(6)}  ${p.full_name.padEnd(28)} ${(p.teams?.name ?? '?').padEnd(26)}` +
      ` z drugim ${String(s.zDrugim).padStart(2)}  ob ${drugi?.full_name ?? '?'} (sam ${drugiSam})` +
      (p.position_source !== 'zapisnik' ? `  [${p.position_source}]` : ''),
    )
  }
  skupaj += sumljivi.length
}
console.log(`\nskupaj ${skupaj} sumljivih vratarjev`)
if (beriZapisnike) console.log(Object.entries(razsodbe).map(([k, v]) => `${k} ${v}`).join(', '))

/** Kolikokrat zapisnik igralca oznaci za vratarja na tekmah z drugim GK. */
async function razsodi(nastopiIgralca) {
  const idji = [...new Set(nastopiIgralca.map((a) => a.match_id))]
  const { data: tekme, error: e } = await db
    .from('matches').select('id, zapisnik_id, source_url, home_team_id').in('id', idji)
  if (e) throw new Error(e.message)
  let prebranih = 0
  let vratar = 0 // edini (V) v postavi svoje ekipe
  let dvoumno = 0 // (V), a v postavi jih je vec — tak zapisnik ne pove nicesar
  const drugace = new Map() // pozicija iz zapisnika, kadar ni vratar (Sportnet)
  for (const a of nastopiIgralca) {
    const tekma = tekme.find((t) => t.id === a.match_id)
    const z = tekma && (await zapisnikTekme(tekma))
    if (!z) continue
    const ekipa = a.team_id === tekma.home_team_id ? z.domaci : z.gostje
    const vrstica = (ekipa?.postava ?? []).find((x) => x.st === a.shirt_number)
    if (!vrstica) continue
    prebranih++
    if (vrstica.vratar && ekipa.postava.filter((x) => x.vratar).length > 1) dvoumno++
    else if (vrstica.vratar) vratar++
    else if (vrstica.pozicija) drugace.set(vrstica.pozicija, (drugace.get(vrstica.pozicija) ?? 0) + 1)
  }
  if (!prebranih) {
    razsodbe['NI ZAPISNIKA']++
    return 'NI ZAPISNIKA'
  }
  const polje = prebranih - vratar - dvoumno
  const kaj = vratar > polje ? 'VRATAR' : polje > vratar ? 'LAZEN' : 'NEJASNO'
  razsodbe[kaj] = (razsodbe[kaj] ?? 0) + 1
  const sicer = [...drugace.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return `${kaj} (V ${vratar}, ?${dvoumno}, polje ${polje}${sicer ? ` ${sicer}` : ''})`
}
