// Počaka na starejše zagone iz družine uvozov, ki pišejo v iste vrstice.
//
// Prej je vsak uvoz čakal na VSE starejše uvoze. Pri 130 ligah traja nočni
// uvoz ob vikendih (vsako uro) dve do štiri ure, ročni uvoz nove lige je
// zato čakal dve uri in padel (Madžarska, 9. 10. 2026: hu-sz-1), ta pa je
// zadrževal osveževanje točk v živih ligah.
//
// Kaj si uvozi res delijo:
//   - klubi so enolični po DRŽAVI (`teams_drzava_ime_idx`), igralci pripadajo
//     eni ligi, tekme in krogi tudi. Uvoza dveh držav se ne dotakneta istih
//     vrstic, zato tečeta hkrati.
//   - ročni uvoz NEVKLOPLJENE lige se nočnega ne dotakne (nočni bere le
//     vklopljene): ne čakata drug na drugega. Ročni uvozi iste države
//     čakajo drug na drugega.
//   - zdruzi-klube in tedensko-cene segata čez vse lige: nanju čaka vsak.
//
// Uporaba (v delovnem toku, z GH_TOKEN in ključem baze):
//   node scripts/cakaj-na-uvoze.mjs --drzava HR    # nočni uvoz, posel ene države
//   node scripts/cakaj-na-uvoze.mjs --liga hu-za-2 # ročni uvoz lige
//   node scripts/cakaj-na-uvoze.mjs --tece         # preverba podatkov: izhod 3, če
//                                                  # kak uvoz vklopljenih lig ravno piše
//
// Preverba podatkov, ki teče med uvozom, vidi napol zapisane tekme (gol brez
// nastopa, posnetek točk pred preračunom) in javi lažne težave — 9. 10. se je
// to zgodilo prvič, ko so države začele teči hkrati. Konec uvoza jo tako ali
// tako sproži znova (workflow_run).
//
// Ročni uvoz nosi ligo v imenu zagona (`run-name: Uvoz lige <slug>`); zagon
// brez nje (starejši) šteje kot uvoz neznane države in nanj se čaka.
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const arg = (ime) => {
  const i = process.argv.indexOf(ime)
  return i > -1 ? process.argv[i + 1] : null
}
const mojaLiga = arg('--liga')
const samoTece = process.argv.includes('--tece')
let mojaDrzava = arg('--drzava')?.toUpperCase() ?? null
const NAJVEC_MIN = Number(arg('--najvec') ?? 120)

const { GITHUB_RUN_ID, GITHUB_REPOSITORY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!GITHUB_RUN_ID || !GITHUB_REPOSITORY) {
  console.error('Teče le v GitHub Actions (GITHUB_RUN_ID, GITHUB_REPOSITORY).')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: lige, error } = await db.from('competitions').select('slug, active, countries!inner(code)')
if (error) {
  console.error(`Lig ni mogoče prebrati: ${error.message}`)
  process.exit(1)
}
const ligaPoSlugu = new Map(lige.map((l) => [l.slug, { aktivna: l.active, drzava: l.countries.code }]))

let mojaJeAktivna = true
if (mojaLiga) {
  const l = ligaPoSlugu.get(mojaLiga)
  // Neznana liga: korak "Preveri, da liga obstaja" jo zavrne; tu čakamo kot prej.
  mojaDrzava = l?.drzava ?? null
  mojaJeAktivna = l?.aktivna ?? true
}

const gh = (...a) => execFileSync('gh', [...a, '-R', GITHUB_REPOSITORY], { encoding: 'utf8' })
const moj = samoTece ? null : JSON.parse(gh('run', 'view', GITHUB_RUN_ID, '--json', 'startedAt')).startedAt
const mojId = Number(GITHUB_RUN_ID)

// Ali zagon drugega toka piše v iste vrstice kot ta?
function seKrize(tok, naslov) {
  if (tok === 'zdruzi-klube.yml' || tok === 'tedensko-cene.yml') return true
  if (tok === 'uvoz-lige.yml') {
    const slug = /^Uvoz lige (\S+)$/.exec(naslov ?? '')?.[1]
    const liga = slug ? ligaPoSlugu.get(slug) : null
    if (!liga || !mojaDrzava) return true
    // Nočni uvoz bere le vklopljene lige, zato ga ročni uvoz nevklopljene ne
    // zadeva (madžarske lige pred vklopom: sicer bi vsak urni zagon čakal
    // na tekoči ročni uvoz).
    if (!mojaLiga && !liga.aktivna) return false
    return liga.drzava === mojaDrzava
  }
  // Nočni uvoz piše le v vklopljene lige. Ročni uvoz nevklopljene ga ne moti;
  // med seboj pa nočne zagone vrsti že skupina `uvoz-zapisnikov`.
  if (tok === 'uvoz-zapisnikov.yml') return mojaLiga ? mojaJeAktivna : false
  return true
}

if (samoTece) {
  const tecejo = []
  for (const tok of ['uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml']) {
    const zagoni = JSON.parse(gh('run', 'list', '--workflow', tok, '--limit', '50', '--json', 'databaseId,status,displayTitle'))
    for (const z of zagoni) {
      if (z.status === 'completed') continue
      // Ročni uvoz nevklopljene lige ne piše v nič, kar preverba gleda.
      const slug = /^Uvoz lige (\S+)$/.exec(z.displayTitle ?? '')?.[1]
      if (tok === 'uvoz-lige.yml' && slug && ligaPoSlugu.get(slug)?.aktivna === false) continue
      tecejo.push(`${z.displayTitle} (${z.databaseId})`)
    }
  }
  if (!tecejo.length) process.exit(0)
  console.log(`Uvoz še teče: ${tecejo.join(', ')}`)
  process.exit(3)
}

for (let min = 1; min <= NAJVEC_MIN; min++) {
  const pred = []
  for (const tok of ['uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml']) {
    // Brez --status: tudi čakajoči (queued) starejši zagon mora priti prvi.
    const zagoni = JSON.parse(
      gh('run', 'list', '--workflow', tok, '--limit', '50', '--json', 'databaseId,startedAt,status,displayTitle'),
    )
    for (const z of zagoni) {
      if (z.status === 'completed' || z.databaseId === mojId || !(z.startedAt > '2000')) continue
      const starejsi = z.startedAt < moj || (z.startedAt === moj && z.databaseId < mojId)
      if (starejsi && seKrize(tok, z.displayTitle)) pred.push(`${z.displayTitle} (${z.databaseId})`)
    }
  }
  if (!pred.length) process.exit(0)
  console.log(`Pred mano teče še ${pred.length} uvozov (${pred.join(', ')}) — čakam (${min}/${NAJVEC_MIN} min)`)
  await new Promise((r) => setTimeout(r, 60_000))
}
console.log(`::error::Starejši uvoz iste države teče že ${NAJVEC_MIN} minut.`)
process.exit(1)
