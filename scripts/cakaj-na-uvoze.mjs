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

if (process.argv.includes('--fcf-inventory-source-only')) {
  try {
    const { runFcfInventorySourceCoordinatorCLI } = await import('./fcf-inventory-source-coordination.mjs')
    process.exit(await runFcfInventorySourceCoordinatorCLI({ args: process.argv.slice(2), env: process.env }))
  } catch { console.error('FCF source-only coordination failed closed.'); process.exit(1) }
}

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
  // Bounded multi-country activation is a global database writer; preview only reads.
  if (tok === 'vklop-obstojecih-lig.yml') return !/^Obstojece lige predogled /.test(naslov ?? '')
  if (tok === 'uvoz-fcf-zgodovina.yml') {
    if (/^FCF history (cache-export|seed-stage) /.test(naslov ?? '')) return false
    return !mojaDrzava || mojaDrzava === 'ES'
  }
  if(tok==='mlsz-reviewed-history.yml'){if(/^MLSZ reviewed history (prepare|preview) /.test(naslov??''))return false;return !mojaDrzava||mojaDrzava==='HU'}
  if(tok==='mfa-nl-reviewed-history.yml'){if(/^MFA NL reviewed history (prepare|preview|receipt) mt-nl[12]$/.test(naslov??''))return false;return !mojaDrzava||mojaDrzava==='MT'}
  if(tok==='mfa-challenge-reviewed-history.yml'){if(/^MFA Challenge reviewed history (prepare|preview|receipt) mt-challenge$/.test(naslov??''))return false;return !mojaDrzava||mojaDrzava==='MT'}
  if(tok==='mfa-reviewed-history.yml'){if(/^MFA reviewed history (prepare|preview|receipt) mt-premier$/.test(naslov??''))return false;return !mojaDrzava||mojaDrzava==='MT'}
  if(tok==='uvoz-hr-zenske.yml')return !mojaDrzava||mojaDrzava==='HR'
  // Catalan activation and the fixed public FCF reader always share ES scope.
  if (['vklop-katalonije.yml', 'fcf-javni-dokazi.yml'].includes(tok)) return !mojaDrzava || mojaDrzava === 'ES'
  if (['uskladi-pozicije.yml', 'izstop-kluba.yml', 'cene-lig.yml'].includes(tok)) {
    const p = obsegVzdrzevanja(tok, naslov)
    return p.pise && (!p.drzava || !mojaDrzava || p.drzava === mojaDrzava)
  }
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
    if (mojaLiga === slug) return true
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
  // Popravek lahko piše v vklopljene lige: čaka na vse posle svoje države.
  // Pri skupnem viru se čaka le na posel te države ("uvoz EE"): zagon kot
  // celota teče, dokler ne konča najdaljši posel (AT ure), EE je gotov v
  // minutah (ee-premium-liiga je 11. 10. 2026 čakal 120 minut in padel).
  if (tok === 'uvoz-zapisnikov.yml') {
    if (popravek && !mojaDrzava) return true
    if (!popravek && !SKUPEN_VIR[mojaDrzava]) return mojaLiga ? mojaJeAktivna : false
    // Država ima lahko več košev ("uvoz HU 1/3" …, scripts/nocni-kosi.mjs).
    const jobs = JSON.parse(gh('run', 'view', String(id), '--json', 'jobs')).jobs
    if (!Array.isArray(jobs)) return true
    const ime = `uvoz ${mojaDrzava}`
    const posli = jobs.filter((j) => j.name === ime || j.name?.startsWith(`${ime} `))
    if (!posli.length || posli.some((j) => j.status !== 'completed')) return true
    if (posli.length === 1 && posli[0].name === ime) return false
    // Preveri tudi manjkajoče koše v delnem odgovoru API. Število nosi ime
    // dejanskega starejšega zagona; matrika se je medtem lahko spremenila.
    const kosi = posli.map((j) => /^ (\d+)\/(\d+)$/.exec(j.name.slice(ime.length)))
    const kosov = Number(kosi[0]?.[2])
    return !(kosov > 1) || posli.length !== kosov ||
      kosi.some((m) => !m || Number(m[2]) !== kosov || Number(m[1]) < 1 || Number(m[1]) > kosov) ||
      new Set(kosi.map((m) => Number(m?.[1]))).size !== kosov
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

// Position sync spans a source or league; withdrawal spans one league. Old
// run names carry no reliable scope, so an already in-flight writer is global.
// Pricing may still be writing after making readiness pass: always a writer.
function obsegVzdrzevanja(tok, naslov) {
  if (tok === 'cene-lig.yml') return { pise: true, drzava: null }
  const vzorec = tok === 'uskladi-pozicije.yml'
    ? /^Uskladi pozicije ([a-z0-9-]+) \((pisi|suho)\)$/
    : /^Izstop kluba ([a-z0-9-]+) \((pisi|suho)\)$/
  const m = vzorec.exec(naslov ?? '')
  if (!m) return { pise: true, drzava: null }
  return { pise: m[2] === 'pisi', drzava: ligaPoSlugu.get(m[1])?.drzava ?? drzavaVira.get(m[1]) ?? null }
}

// History inventory may remain active behind arbitrarily many newer exports.
// Read the complete bounded REST enumeration in both directions, never latest50.
function readFcfHistoryRuns() {
  try {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(GITHUB_REPOSITORY)) throw Error('repository')
    const result = [], seen = new Set()
    let count = null
    for (let page = 1; page <= 100; page++) {
      const data = JSON.parse(execFileSync('gh', ['api', '--method', 'GET', `repos/${GITHUB_REPOSITORY}/actions/workflows/uvoz-fcf-zgodovina.yml/runs?per_page=100&page=${page}`], {
        encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
      }))
      if (!Number.isSafeInteger(data.total_count) || data.total_count < 0 || data.total_count > 10000 || count !== null && count !== data.total_count || !Array.isArray(data.workflow_runs) || data.workflow_runs.length > 100) throw Error('pagination')
      count = data.total_count
      for (const row of data.workflow_runs) {
        if (!Number.isSafeInteger(row.id) || row.id <= 0 || seen.has(row.id) || row.repository?.full_name !== GITHUB_REPOSITORY || row.path !== '.github/workflows/uvoz-fcf-zgodovina.yml' || row.event !== 'workflow_dispatch' || !Number.isSafeInteger(row.run_attempt) || row.run_attempt < 1 || !/^[a-f0-9]{40}$/.test(row.head_sha ?? '') || !['queued','in_progress','waiting','pending','requested','completed'].includes(row.status)) throw Error('run identity')
        seen.add(row.id)
        if (row.status === 'completed') continue
        const startedAt = row.run_started_at ?? row.created_at
        if (typeof startedAt !== 'string' || !startedAt.endsWith('Z') || !Number.isFinite(Date.parse(startedAt)) || startedAt < '2000') throw Error('ordering')
        result.push({ databaseId: row.id, status: row.status, displayTitle: typeof row.display_title === 'string' ? row.display_title : '', startedAt })
      }
      if (seen.size === count) return result
      if (seen.size > count || data.workflow_runs.length < 100) throw Error('missing page')
    }
    throw Error('page bound')
  } catch { throw Error('FCF history run discovery incomplete; source held') }
}

if (samoTece) {
  const tecejo = []
  for (const tok of ['mlsz-reviewed-history.yml', 'mfa-nl-reviewed-history.yml', 'mfa-challenge-reviewed-history.yml', 'mfa-reviewed-history.yml', 'uvoz-hr-zenske.yml', 'uvoz-fcf-zgodovina.yml', 'uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'uvoz-dfb-regije.yml', 'vklop-dfb-regije.yml', 'vklop-katalonije.yml', 'vklop-obstojecih-lig.yml', 'uskladi-pozicije.yml', 'izstop-kluba.yml', 'cene-lig.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml', 'razdeli-zlite-igralce.yml']) {
    const zagoni = tok === 'uvoz-fcf-zgodovina.yml' ? readFcfHistoryRuns() : JSON.parse(gh('run', 'list', '--workflow', tok, '--limit', '50', '--json', 'databaseId,status,displayTitle'))
    for (const z of zagoni) {
      if (z.status === 'completed') continue
      if (['mlsz-reviewed-history.yml', 'mfa-nl-reviewed-history.yml', 'mfa-challenge-reviewed-history.yml', 'mfa-reviewed-history.yml','uvoz-fcf-zgodovina.yml', 'vklop-obstojecih-lig.yml'].includes(tok) && !seKrize(tok, z.displayTitle, z.databaseId)) continue
      // Ročni uvoz nevklopljene lige ne piše v nič, kar preverba gleda.
      const slug = ligaZagona(tok, z.displayTitle)
      // Vklop lahko še neaktivno ligo med preverbo vključi: nanj čakamo.
      if (['uvoz-lige.yml', 'uvoz-dfb-regije.yml'].includes(tok) && slug && ligaPoSlugu.get(slug)?.aktivna === false) continue
      if (['uskladi-pozicije.yml', 'izstop-kluba.yml'].includes(tok) && !obsegVzdrzevanja(tok, z.displayTitle).pise) continue
      tecejo.push(`${z.displayTitle} (${z.databaseId})`)
    }
  }
  if (!tecejo.length) process.exit(0)
  console.log(`Uvoz še teče: ${tecejo.join(', ')}`)
  process.exit(3)
}

for (let min = KORAK_MIN; min <= NAJVEC_MIN; min += KORAK_MIN) {
  const pred = []
  const tokovi = ['mlsz-reviewed-history.yml', 'mfa-nl-reviewed-history.yml', 'mfa-challenge-reviewed-history.yml', 'mfa-reviewed-history.yml', 'uvoz-hr-zenske.yml', 'uvoz-fcf-zgodovina.yml', 'fcf-javni-dokazi.yml', 'uvoz-zapisnikov.yml', 'uvoz-lige.yml', 'uvoz-dfb-regije.yml', 'vklop-dfb-regije.yml', 'vklop-katalonije.yml', 'vklop-obstojecih-lig.yml', 'uskladi-pozicije.yml', 'izstop-kluba.yml', 'cene-lig.yml', 'zdruzi-klube.yml', 'tedensko-cene.yml', 'razdeli-zlite-igralce.yml']
  if (SKUPEN_VIR[mojaDrzava]) tokovi.push('grbi.yml')
  for (const tok of tokovi) {
    // Brez --status: tudi čakajoči (queued) starejši zagon mora priti prvi.
    const zagoni = tok === 'uvoz-fcf-zgodovina.yml' ? readFcfHistoryRuns() : JSON.parse(
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
