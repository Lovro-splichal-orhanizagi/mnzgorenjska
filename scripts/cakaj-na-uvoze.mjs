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
// Popravek (razdeli-zlite-igralce): piše v lige enega vira/lige, zato čaka le na
// uvoze TE države — vklopljene in nevklopljene. Prej je čakal na vse starejše
// uvoze vseh držav, vsi novejši uvozi pa nanj: 11. 10. 2026 je dve uri stalo vse.
const popravek = process.argv.includes('--popravek')
const popravekVir = arg('--vir')
const popravekLiga = arg('--tekmovanje')
// Države, kjer zveze pod državno nimajo skupnih klubov. Ročni uvoz
// nevklopljene lige ločene zveze teče hkrati z uvozom nevklopljene lige iste
// države; državne zveze (`drzavne`, mešajo vse) čakajo na vse in vsi nanje.
// `istaZveza: false`: lige ISTE ločene zveze se vseeno vrstijo (le različne
// zveze tečejo hkrati).
// Avstrija: deželne zveze, državna ÖFB (Bundesliga, 2. Liga, Regionalliga).
// Romunija: vsaka županijska zveza (`ajf-<judet>`, vira hlf in frf) je svoja
// piramida; državni sta LPF (SuperLiga) in FRF (Liga 2, Liga 3). Lige iste
// županije si lahko delijo klube (rezerve, II. ekipe) in strežnik frf-ajf.ro (arhiv
// ~10 s na tekmo), zato županija uvaža eno ligo naenkrat.
// Srbija: regionalne zveze (FSV, FSRZS, FSRIS, FS Beograd) so ločene piramide,
// državna je FSS (Superliga, Prva liga); vse fssid lige bere fss.rs, zato koliko
// jih teče hkrati omeji veriga, ki jih zažene (dve naenkrat, 2 s premora vsaka).
// Madžarska: vármegye zveze (BLSZ in 19 županij) so ločene piramide, državna
// je MLSZ (NB I–III). Vse bere isti Adatbank, zato hkratnost omeji veriga.
const LOCENE_ZVEZE = {
  AT: { drzavne: ['oefb'], istaZveza: true },
  RO: { drzavne: ['lpf', 'frf'], istaZveza: false },
  RS: { drzavne: ['fss'], istaZveza: true },
  HU: { drzavne: ['mlsz'], istaZveza: true },
}
// Države, katerih lige bere eno samo spletišče s skupnim proračunom branja
// (jalgpall.ee: robots.txt Crawl-Delay 5 s za vse nas skupaj). Dva zagona iste
// države bi brala hkrati in skupaj prehitro, zato se tu križa VSAK zagon iste
// države: nočni in ročni, vklopljena in nevklopljena liga, tudi *Grbi klubov*
// tega vira (run-name "Grbi klubov <vir>").
// Španija: vse lige bere fcf.cat (en zapisnik na tekmo, 3 s med zahtevki).
const SKUPEN_VIR = { EE: 'jalgpall', ES: 'fcf' }

const { GITHUB_RUN_ID, GITHUB_REPOSITORY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!GITHUB_RUN_ID || !GITHUB_REPOSITORY) {
  console.error('Teče le v GitHub Actions (GITHUB_RUN_ID, GITHUB_REPOSITORY).')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: lige, error } = await db.from('competitions').select('slug, active, source, countries!inner(code), federations(code)')
if (error) {
  console.error(`Lig ni mogoče prebrati: ${error.message}`)
  process.exit(1)
}
const ligaPoSlugu = new Map(
  lige.map((l) => [l.slug, { aktivna: l.active, drzava: l.countries.code, zveza: l.federations?.code ?? null }]),
)

// Država vira: iz katerekoli lige tega vira (vir ima eno državo).
const drzavaVira = new Map(lige.map((l) => [l.source, l.countries.code]))
if (popravek) mojaDrzava = ligaPoSlugu.get(popravekLiga)?.drzava ?? drzavaVira.get(popravekVir) ?? null

// Zagon popravka: "Razdeli zlite igralce <liga|vir|vse>[ (pisi)]". Brez (pisi)
// le izpiše načrt in ne piše nikamor.
function drzavaPopravka(naslov) {
  const m = /^Razdeli zlite igralce (\S+)( \(pisi\))?$/.exec(naslov ?? '')
  if (!m) return { pise: true, drzava: null }
  return { pise: !!m[2], drzava: ligaPoSlugu.get(m[1])?.drzava ?? drzavaVira.get(m[1]) ?? null }
}

let mojaJeAktivna = true
let mojaZveza = null
if (mojaLiga) {
  const l = ligaPoSlugu.get(mojaLiga)
  // Neznana liga: korak "Preveri, da liga obstaja" jo zavrne; tu čakamo kot prej.
  mojaDrzava = l?.drzava ?? null
  mojaJeAktivna = l?.aktivna ?? true
  mojaZveza = l?.zveza ?? null
}

const gh = (...a) => execFileSync('gh', [...a, '-R', GITHUB_REPOSITORY], { encoding: 'utf8' })
const moj = samoTece ? null : JSON.parse(gh('run', 'view', GITHUB_RUN_ID, '--json', 'startedAt')).startedAt
const mojId = Number(GITHUB_RUN_ID)

// Ali zagon drugega toka piše v iste vrstice kot ta?
function seKrize(tok, naslov, id) {
  if (tok === 'zdruzi-klube.yml' || tok === 'tedensko-cene.yml') return true
  if (tok === 'razdeli-zlite-igralce.yml') {
    const p = drzavaPopravka(naslov)
    if (!p.pise) return false
    return !p.drzava || !mojaDrzava || p.drzava === mojaDrzava
  }
  if (tok === 'uvoz-lige.yml') {
    const slug = /^Uvoz lige (\S+)$/.exec(naslov ?? '')?.[1]
    const liga = slug ? ligaPoSlugu.get(slug) : null
    if (!liga || !mojaDrzava) return true
    // Nočni uvoz bere le vklopljene lige, zato ga ročni uvoz nevklopljene ne
    // zadeva (madžarske lige pred vklopom: sicer bi vsak urni zagon čakal
    // na tekoči ročni uvoz).
    if (liga.drzava !== mojaDrzava) return false
    if (popravek) return true
    if (SKUPEN_VIR[mojaDrzava]) return true
    if (!mojaLiga && !liga.aktivna) return false
    // Ročna uvoza nevklopljenih lig pišeta vsak v svoje igralce in tečeta
    // hkrati, v AT/RS/HU tudi iz iste dežele (od 10. 10. 2026; prej le iz
    // različnih), v Romuniji le iz različnih županij (od 11. 10. 2026).
    // Hkratni vpis istega novega kluba ujame klubId, isto tekmo skupnega arhiva
    // preskok tekme druge lige. Državna zveza (Bundesliga, Regionalliga;
    // romunska SuperLiga, Liga 2, Liga 3) meša dežele/županije, zato čaka na
    // vse. Koliko jih teče, omeji vrsta Avstrije oz. veriga, ki jih zažene.
    const locene = LOCENE_ZVEZE[mojaDrzava]
    if (locene && mojaLiga && !mojaJeAktivna && !liga.aktivna && mojaZveza && liga.zveza &&
        !locene.drzavne.includes(mojaZveza) && !locene.drzavne.includes(liga.zveza) &&
        (locene.istaZveza || mojaZveza !== liga.zveza)) return false
    return true
  }
  // Nočni uvoz piše le v vklopljene lige. Ročni uvoz nevklopljene ga ne moti;
  // med seboj pa nočne zagone vrsti že skupina `uvoz-zapisnikov`.
  // Nočni zagon nosi vse države; pri skupnem viru se nanj čaka vedno.
  // Popravek lahko piše v vklopljene lige, zato čaka tudi na nočni uvoz.
  // Pri skupnem viru se čaka le na posel te države ("uvoz EE"): zagon kot
  // celota teče, dokler ne konča najdaljši posel (AT ure), EE je gotov v
  // minutah (ee-premium-liiga je 11. 10. 2026 čakal 120 minut in padel).
  if (tok === 'uvoz-zapisnikov.yml') {
    if (popravek) return true
    if (!SKUPEN_VIR[mojaDrzava]) return mojaLiga ? mojaJeAktivna : false
    // Država ima lahko več košev ("uvoz HU 1/3" …, scripts/nocni-kosi.mjs).
    const posli = JSON.parse(gh('run', 'view', String(id), '--json', 'jobs')).jobs
      .filter((j) => j.name === `uvoz ${mojaDrzava}` || j.name.startsWith(`uvoz ${mojaDrzava} `))
    return !posli.length || posli.some((j) => j.status !== 'completed')
  }
  if (tok === 'grbi.yml') return !!SKUPEN_VIR[mojaDrzava] && naslov === `Grbi klubov ${SKUPEN_VIR[mojaDrzava]}`
  return true
}

if (samoTece) {
  const tecejo = []
  for (const tok of ['uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml', 'razdeli-zlite-igralce.yml']) {
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
  const tokovi = ['uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml', 'razdeli-zlite-igralce.yml']
  if (SKUPEN_VIR[mojaDrzava]) tokovi.push('grbi.yml')
  for (const tok of tokovi) {
    // Brez --status: tudi čakajoči (queued) starejši zagon mora priti prvi.
    const zagoni = JSON.parse(
      gh('run', 'list', '--workflow', tok, '--limit', '50', '--json', 'databaseId,startedAt,status,displayTitle'),
    )
    for (const z of zagoni) {
      if (z.status === 'completed' || z.databaseId === mojId || !(z.startedAt > '2000')) continue
      const starejsi = z.startedAt < moj || (z.startedAt === moj && z.databaseId < mojId)
      if (starejsi && seKrize(tok, z.displayTitle, z.databaseId)) pred.push(`${z.displayTitle} (${z.databaseId})`)
    }
  }
  if (!pred.length) process.exit(0)
  console.log(`Pred mano teče še ${pred.length} uvozov (${pred.join(', ')}) — čakam (${min}/${NAJVEC_MIN} min)`)
  await new Promise((r) => setTimeout(r, 60_000))
}
console.log(`::error::Starejši uvoz iste države teče že ${NAJVEC_MIN} minut.`)
process.exit(1)
