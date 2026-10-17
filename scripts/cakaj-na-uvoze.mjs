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
import { locenaHkrati } from './hkratnost.mjs'
import { vseVrstice } from './strani.mjs'

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
// Katere države in zveze tečejo hkrati: scripts/hkratnost.mjs.
// Države, katerih lige bere eno samo spletišče s skupnim proračunom branja
// (jalgpall.ee: robots.txt Crawl-Delay 5 s za vse nas skupaj). Dva zagona iste
// države bi brala hkrati in skupaj prehitro, zato se tu križa VSAK zagon iste
// države: nočni in ročni, vklopljena in nevklopljena liga, tudi *Grbi klubov*
// tega vira (run-name "Grbi klubov <vir>").
// Španija: vse lige bere fcf.cat (en zapisnik na tekmo, 3 s med zahtevki).
// Turčija: vse lige bere tff.org (3 s med zahtevki, brez dovoljenja TFF).
// Nemčija: en uvoz + en ločeno serializiran audit DFB, vsak s premorom 6 s.
const SKUPEN_VIR = { EE: 'jalgpall', ES: 'fcf', TR: 'tff', NO: 'nff', DE: 'dfb' }

const { GITHUB_RUN_ID, GITHUB_REPOSITORY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!GITHUB_RUN_ID || !GITHUB_REPOSITORY) {
  console.error('Teče le v GitHub Actions (GITHUB_RUN_ID, GITHUB_REPOSITORY).')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// V produkciji je več kot 1000 lig; tudi poznejši kandidati morajo dobiti državo.
let lige
try {
  lige = await vseVrstice((od, do_) => db.from('competitions')
    .select('slug, active, source, countries!inner(code), federations(code)')
    .order('id').range(od, do_))
} catch (error) {
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

const gh = (...a) => execFileSync('gh', [...a, '-R', GITHUB_REPOSITORY], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
// Žeton delovnega toka ima ~1000 klicev API na uro za ves repozitorij. Štirje
// uvozi, ki čakajo vsak s 5–6 klici na minuto, so ga 13. 10. porabili in vsi
// so padli. Zato poizvedujemo na KORAK_MIN minut in omejitev počakamo.
const KORAK_MIN = 3
const jeOmejitev = (e) => /rate limit/i.test(String(e?.stderr ?? e?.message ?? ''))
async function ghPocakaj(...a) {
  for (let poskus = 1; ; poskus++) {
    try {
      return gh(...a)
    } catch (e) {
      if (!jeOmejitev(e) || poskus >= 20) throw e
      console.log(`Omejitev GitHub API — počakam 5 min (${poskus}/20)`)
      await new Promise((r) => setTimeout(r, 300_000))
    }
  }
}
const moj = samoTece ? null : JSON.parse(await ghPocakaj('run', 'view', GITHUB_RUN_ID, '--json', 'startedAt')).startedAt
const mojId = Number(GITHUB_RUN_ID)

// Ali zagon drugega toka piše v iste vrstice kot ta?
function seKrize(tok, naslov, id) {
  // One batch always owns ES; its optional list is not a single league slug.
  if (tok === 'vklop-katalonije.yml') return !mojaDrzava || mojaDrzava === 'ES'
  if (tok === 'zdruzi-klube.yml' || tok === 'tedensko-cene.yml') return true
  if (tok === 'razdeli-zlite-igralce.yml') {
    const p = drzavaPopravka(naslov)
    if (!p.pise) return false
    return !p.drzava || !mojaDrzava || p.drzava === mojaDrzava
  }
  if (['uvoz-lige.yml', 'uvoz-dfb-regije.yml', 'vklop-dfb-regije.yml'].includes(tok)) {
    const slug = ligaZagona(tok, naslov)
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
    // Od 13. 10. 2026 tudi vklopljene lige različnih zvez in Slovaška
    // (pravilo in razlogi: scripts/hkratnost.mjs).
    if (mojaLiga && locenaHkrati(mojaDrzava, { zveza: mojaZveza, aktivna: mojaJeAktivna }, liga)) return false
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

// Regionalni uvoz/vklop uporabljata enak obseg države in lige kot ročni
// uvoz. Neznan/starejši naslov ostane konservativno brez znanega obsega.
function ligaZagona(tok, naslov) {
  const vzorci = {
    'uvoz-lige.yml': /^Uvoz lige (\S+)$/,
    'uvoz-dfb-regije.yml': /^Uvoz odobrene DFB regije (de-regionalliga-(?:nord|west|suedwest|bayern))$/,
    'vklop-dfb-regije.yml': /^Preverjen vklop DFB regije (de-regionalliga-(?:nord|west|suedwest|bayern))$/,
  }
  return vzorci[tok]?.exec(naslov ?? '')?.[1]
}

if (samoTece) {
  const tecejo = []
  for (const tok of ['uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'uvoz-dfb-regije.yml', 'vklop-dfb-regije.yml', 'vklop-katalonije.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml', 'razdeli-zlite-igralce.yml']) {
    const zagoni = JSON.parse(gh('run', 'list', '--workflow', tok, '--limit', '50', '--json', 'databaseId,status,displayTitle'))
    for (const z of zagoni) {
      if (z.status === 'completed') continue
      // Ročni uvoz nevklopljene lige ne piše v nič, kar preverba gleda.
      const slug = ligaZagona(tok, z.displayTitle)
      // Vklop lahko še neaktivno ligo med preverbo vključi: nanj čakamo.
      if (['uvoz-lige.yml', 'uvoz-dfb-regije.yml'].includes(tok) && slug && ligaPoSlugu.get(slug)?.aktivna === false) continue
      tecejo.push(`${z.displayTitle} (${z.databaseId})`)
    }
  }
  if (!tecejo.length) process.exit(0)
  console.log(`Uvoz še teče: ${tecejo.join(', ')}`)
  process.exit(3)
}

for (let min = KORAK_MIN; min <= NAJVEC_MIN; min += KORAK_MIN) {
  const pred = []
  const tokovi = ['uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'uvoz-dfb-regije.yml', 'vklop-dfb-regije.yml', 'vklop-katalonije.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml', 'razdeli-zlite-igralce.yml']
  if (SKUPEN_VIR[mojaDrzava]) tokovi.push('grbi.yml')
  for (const tok of tokovi) {
    // Brez --status: tudi čakajoči (queued) starejši zagon mora priti prvi.
    const zagoni = JSON.parse(
      await ghPocakaj('run', 'list', '--workflow', tok, '--limit', '50', '--json', 'databaseId,startedAt,status,displayTitle'),
    )
    for (const z of zagoni) {
      if (z.status === 'completed' || z.databaseId === mojId || !(z.startedAt > '2000')) continue
      const starejsi = z.startedAt < moj || (z.startedAt === moj && z.databaseId < mojId)
      if (!starejsi) continue
      let krize = true
      try {
        krize = seKrize(tok, z.displayTitle, z.databaseId)
      } catch (e) {
        // Ob omejitvi API ne vemo: varno je čakati (krize ostane true).
        if (!jeOmejitev(e)) throw e
      }
      if (krize) pred.push(`${z.displayTitle} (${z.databaseId})`)
    }
  }
  if (!pred.length) process.exit(0)
  console.log(`Pred mano teče še ${pred.length} uvozov (${pred.join(', ')}) — čakam (${min}/${NAJVEC_MIN} min)`)
  await new Promise((r) => setTimeout(r, KORAK_MIN * 60_000))
}
console.log(`::error::Starejši uvoz iste države teče že ${NAJVEC_MIN} minut.`)
process.exit(1)
