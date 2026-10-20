// Razdeli igralce, v katerih je uvoz zlil dva soimenjaka različnih klubov
// (Petrović Lazar, rs-srpska-istok, oktober 2026: vratar Morave in igralec
// Malošišta v istih krogih, en zapis, vsota točk obeh).
//
// Kandidate najde `zliti_igralci` (trk: isti dan ali isti krog za dva kluba,
// brez šifre vira), razdeli jih `razdeli_zlitega_igralca` — vsakega v svoji
// transakciji (migracija 20261011233100, tam je opisano, kateri klub obdrži
// id in kaj se preseli). Brez `--pisi` le načrt. Ponoven zagon razdeljenega
// igralca preskoči (`brez-spora`).
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/razdeli-zlite-igralce.mjs --vir fsb      # načrt
//   ... --tekmovanje rs-srpska-istok --pisi
//   ... --igralec 127766                                                               # en igralec
//   (brez --vir/--tekmovanje: vse lige)
//
// V produkciji teče prek delovnega toka *Razdeli zlite igralce*.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { vseVrstice } from './strani.mjs'

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

function arg(ime) {
  const i = process.argv.indexOf('--' + ime)
  if (i < 0) return null
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v.trim() || null : null
}

const env = izEnv()
const BASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const pisi = process.argv.includes('--pisi')
const liga = arg('tekmovanje')
const vir = arg('vir')
const igralec = arg('igralec')
const ohraniKlub = arg('ohrani-klub')
if (igralec && !/^\d+$/.test(igralec)) {
  console.error(`--igralec mora biti število (${igralec})`)
  process.exit(1)
}
if (ohraniKlub && !/^\d+$/.test(ohraniKlub)) {
  console.error(`--ohrani-klub mora biti število (${ohraniKlub})`)
  process.exit(1)
}
if (ohraniKlub && (!igralec || !liga)) {
  console.error('--ohrani-klub zahteva --igralec in --tekmovanje')
  process.exit(1)
}
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

console.log(
  `${pisi ? 'RAZDELJUJEM' : 'Načrt (brez --pisi nič ne zapišem)'} — ` +
    `${liga ? `liga ${liga}` : vir ? `vir ${vir}` : 'vse lige'}${igralec ? `, igralec ${igralec}` : ''}`,
)

let kandidati = await vseVrstice((od, do_) =>
  db
    .rpc('zliti_igralci', { p_liga: liga, p_vir: vir })
    .order('player_id')
    .range(od, do_),
)
if (igralec) kandidati = kandidati.filter((k) => String(k.player_id) === igralec)

const zaDelitev = kandidati.filter((k) => !k.preskok)
const preskoceni = kandidati.filter((k) => k.preskok)

// Preskočeni po razlogu in viru: igralec s šifro je ena oseba (dvojna
// registracija, prestop s prestavljeno tekmo, krogi faz z isto številko).
const RAZLOG = {
  sifra: 'šifra vira — ista oseba, ne delim',
  'prestavljena-tekma': 'isti krog tedne narazen — prestop s prestavljeno tekmo',
  anonimiziran: 'anonimiziran — preglej ročno',
}
if (preskoceni.length) {
  console.log(`\nPreskočenih: ${preskoceni.length}`)
  const skupine = new Map()
  for (const k of preskoceni) {
    const kljuc = `${k.preskok}|${k.vir}|${k.aktivna ? 'aktivna' : 'neaktivna'}`
    skupine.set(kljuc, [...(skupine.get(kljuc) ?? []), k])
  }
  for (const [kljuc, vrste] of [...skupine].sort()) {
    const [razlog, v, akt] = kljuc.split('|')
    const lig = new Set(vrste.map((k) => k.liga)).size
    console.log(`  ${v} (${akt}): ${vrste.length} igralcev v ${lig} ligah — ${RAZLOG[razlog] ?? razlog}`)
    if (razlog !== 'sifra') for (const k of vrste) console.log(`    ${k.player_id} ${k.ime} (${k.liga})`)
  }
}

console.log(`\nZa delitev: ${zaDelitev.length} igralcev`)
const datum = (d) => {
  const [l, m, dan] = String(d ?? '').split('-')
  return dan ? `${Number(dan)}. ${Number(m)}. ${l}` : '?'
}
let razdeljenih = 0
let novih = 0
let napak = 0
for (const k of zaDelitev) {
  const rpcArgs = { p_igralec: k.player_id, p_pisi: pisi }
  if (ohraniKlub) rpcArgs.p_ohrani_klub = ohraniKlub
  const { data: r, error } = await db.rpc('razdeli_zlitega_igralca', rpcArgs)
  if (error) {
    console.error(`\n✗ ${k.player_id} ${k.ime} (${k.liga}): ${error.message}`)
    napak++
    continue
  }
  if (r.stanje !== 'nacrt' && r.stanje !== 'razdeljen') {
    console.log(`\n· ${k.player_id} ${k.ime} (${k.liga}): ${r.stanje}`)
    continue
  }
  const klubi = new Map((r.klubi ?? []).map((x) => [x.klub, x]))
  const ohrani = klubi.get(r.ohrani.klub)
  console.log(`\n${pisi ? '→' : '·'} ${k.player_id} ${k.ime} (${k.liga}, ${k.vir}, ${k.aktivna ? 'aktivna' : 'neaktivna'})`)
  console.log(
    `    ostane: ${ohrani?.ime ?? r.ohrani.klub} — ${ohrani?.nastopov ?? '?'} nastopov ` +
      `${datum(ohrani?.od)}–${datum(ohrani?.do)}${r.ohrani.vratar ? ', vratar' : ''} ` +
      `[${r.ohrani.pravilo}${r.ohrani.lastnikov ? `, lastnikov ${r.ohrani.lastnikov}` : ''}]`,
  )
  for (const x of klubi.values())
    if (x.klub !== r.ohrani.klub && !x.trk)
      console.log(`    ostane tudi: ${x.ime} — ${x.nastopov} nastopov (brez trka)`)
  for (const nov of r.novi ?? []) {
    const kl = klubi.get(nov.klub)
    console.log(
      `    ${nov.zapis === 'nov' ? 'nov igralec' : 'obstoječi soimenjak'}${nov.igralec ? ` ${nov.igralec}` : ''}: ` +
        `${nov.ime_kluba} — ${nov.nastopov} nastopov ${datum(kl?.od)}–${datum(kl?.do)}` +
        `${nov.golov ? `, ${nov.golov} golov` : ''}${nov.asistenc ? `, ${nov.asistenc} asistenc` : ''}${nov.vratar ? ', vratar' : ''}`,
    )
    novih++
  }
  if (pisi) console.log(`    točke preračunane za ${r.krogov} krogov`)
  razdeljenih++
}

console.log(
  `\n${pisi ? 'Razdeljenih' : 'Za razdelitev'}: ${razdeljenih} igralcev → ${novih} ločenih zapisov` +
    `${napak ? `, napak: ${napak}` : ''}.`,
)
if (!pisi && razdeljenih) console.log('Za zapis dodaj --pisi (delovni tok: pisi = true).')
if (napak) process.exitCode = 1
