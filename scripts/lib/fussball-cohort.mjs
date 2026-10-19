// Offline capability measurement only. Never imports, fetches or activates.
import {readFileSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {razberiKrog} from '../viri/fussball.mjs'
import {razberiFantasyZapisnik} from '../viri/fussball-statistika.mjs'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const requireValue = (condition, message) => {if (!condition) throw Error(message)}
function boundAsset(asset, baseDirectory) {
  requireValue(asset && typeof asset.file === 'string' && /^[a-f0-9]{64}$/.test(asset.sha256 ?? ''), 'Asset requires file and SHA256')
  const file=resolve(baseDirectory, asset.file), bytes=readFileSync(file)
  requireValue(bytes.length <= 10_000_000, 'Asset exceeds offline pilot size limit')
  requireValue(digest(bytes) === asset.sha256, `Asset hash differs: ${asset.file}`)
  return {file, bytes}
}
function boundFonts(asset, baseDirectory) {
  const {file, bytes}=boundAsset(asset, baseDirectory), manifest=JSON.parse(bytes)
  requireValue(manifest.fonts && Object.keys(manifest.fonts).length <= 30, 'Invalid font manifest')
  const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id, asset]) => {
    const {bytes}=boundAsset(asset, dirname(file))
    return [id, {bytes, sha256:asset.sha256}]
  }))
  return {fonts, provenance:manifest.provenance}
}
const matchId = url => url?.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1]
const lineupId = url => url?.match(/^https:\/\/www\.fussball\.de\/ajax\.match\.lineup\/-\/mode\/PAGE\/spiel\/([A-Z0-9]{32})\/ticker-id\/selectedTickerId$/)?.[1]
const sameResult = (a,b) => a?.domaci === b?.domaci && a?.gostje === b?.gostje

function inspectLeague(league, baseDirectory) {
  const started=performance.now(), rounds=new Map(), fixtures=new Map(), issues=[]
  let advertised=null, supportedReports=0, appearances=0, unattributedYellows=0
  const issue=(code, id, error) => issues.push({code, id, reason:error.message})
  try {
    requireValue(/^20\d{2}\/\d{2}$/.test(league.season??'') && +league.season.slice(5)===(+league.season.slice(0,4)+1)%100, 'Invalid season')
    requireValue(Array.isArray(league.rounds) && league.rounds.length<=80 && Array.isArray(league.reports) && league.reports.length<=5000, 'Invalid bounded capture inventory')
    requireValue(league.reports.every(r=>/^[A-Z0-9]{32}$/.test(r?.id??'')), 'Invalid report identity')
  } catch (error) {
    return {key:league.key,staffel:league.staffel,season:league.season,status:'HOLD',capturedInventoryComplete:false,
      seasonCoverageVerified:false,advertisedRounds:null,capturedRounds:0,missingRounds:[],capturedFixtures:0,playedFixtures:0,
      supportedReports:0,appearances:0,unattributedYellows:0,missingReports:[],unresolvedRoundFixtures:[],
      issues:[{code:'METADATA_INVALID',id:league.key,reason:error.message}],durationMs:Math.round(performance.now()-started),activationEligible:false,sezonskiUvozPodprt:false}
  }
  for (const record of league.rounds) {
    try {
      const {fonts}=boundFonts(record.fonts, baseDirectory)
      const r=razberiKrog(boundAsset(record.page, baseDirectory).bytes.toString('utf8'), {staffel:league.staffel, fonts})
      requireValue(r.sezona === league.season, 'Round season differs from selected season')
      requireValue(!rounds.has(r.krog), 'Duplicate captured round')
      const numbers=r.krogi.map(r=>r.krog)
      requireValue(!advertised || JSON.stringify(advertised) === JSON.stringify(numbers), 'Advertised round inventory changed')
      // Validate the whole page before adding its fixtures to the cohort.
      const next=new Map(fixtures)
      for (const f of [...r.tekme, ...r.prestavljene]) {
        const previous=next.get(f.id)
        if (previous) {
          requireValue(['datum','ura','domaci','gostje'].every(k=>previous[k]===f[k]) && sameResult(previous.rezultat,f.rezultat), `Conflicting schedule fixture ${f.id}`)
          requireValue(previous.krog == null || f.krog == null || previous.krog === f.krog, `Fixture belongs to two rounds: ${f.id}`)
        }
        next.set(f.id, {...f, krog:previous?.krog ?? f.krog})
      }
      advertised=numbers;rounds.set(r.krog, record.page.sha256)
      fixtures.clear();for (const [id,f] of next) fixtures.set(id,f)
    } catch (error) {issue('ROUND_INVALID', record.page?.file ?? null, error)}
  }
  const reports=new Map(league.reports.map(r=>[r.id,r]))
  const missingReports=[...fixtures.values()].filter(f=>f.rezultat && !reports.has(f.id)).map(f=>f.id).sort()
  for (const record of league.reports) {
    try {
      const {fonts, provenance}=boundFonts(record.fonts, baseDirectory)
      requireValue(matchId(provenance?.matchUrl) === record.id && lineupId(provenance?.lineupUrl) === record.id, 'Font manifest does not bind report and lineup identity')
      const fixture=fixtures.get(record.id)
      requireValue(fixture?.rezultat, 'Report missing from captured played schedule')
      const result=razberiFantasyZapisnik(boundAsset(record.main,baseDirectory).bytes.toString('utf8'), boundAsset(record.lineup,baseDirectory).bytes.toString('utf8'), {id:record.id, lineupId:record.id, fonts})
      const z=result.z
      requireValue(result.reportStatistikaPripravljena === true, 'Report statistics unavailable')
      requireValue(z.domaci.ime===fixture.domaci && z.gostje.ime===fixture.gostje && z.datum===fixture.datum && z.ura===fixture.ura && (fixture.krog==null || z.krog===fixture.krog) && sameResult(z.rezultat,fixture.rezultat), 'Report disagrees with captured schedule')
      supportedReports++;appearances+=result.nastopi.length;unattributedYellows+=result.nepripisaniRumeni.length
    } catch (error) {issue('REPORT_INVALID', record.id, error)}
  }
  const missingRounds=(advertised ?? []).filter(n=>!rounds.has(n))
  const unresolvedRoundFixtures=[...fixtures.values()].filter(f=>f.krog==null).map(f=>f.id).sort()
  // This measures the declared capture inventory. The saved round parser does
  // not independently prove that a source page contains every fixture row.
  // A complete inventory therefore NEVER establishes complete season coverage.
  const capturedInventoryComplete=!!advertised && !missingRounds.length && !missingReports.length && !unresolvedRoundFixtures.length && !issues.length
  return {key:league.key, staffel:league.staffel, season:league.season,
    status:capturedInventoryComplete?'CAPTURE_INVENTORY_COMPLETE':'HOLD', capturedInventoryComplete,seasonCoverageVerified:false,
    advertisedRounds:advertised?.length ?? null, capturedRounds:rounds.size, missingRounds,
    capturedFixtures:fixtures.size, playedFixtures:[...fixtures.values()].filter(f=>f.rezultat).length,
    supportedReports, appearances, unattributedYellows, missingReports, unresolvedRoundFixtures, issues,
    durationMs:Math.round(performance.now()-started), activationEligible:false, sezonskiUvozPodprt:false}
}

export function auditFussballCohort(index, {baseDirectory=process.cwd()}={}) {
  requireValue(index?.version===1 && Array.isArray(index.leagues) && index.leagues.length>0 && index.leagues.length<=10, 'Pilot requires 1 to 10 explicit leagues, version 1')
  const keys=new Set(), staffels=new Set(), ids=new Set()
  for (const l of index.leagues) {
    requireValue(typeof l.key==='string' && l.key.length>0 && !keys.has(l.key), 'Invalid or duplicate league key')
    requireValue(/^[A-Z0-9]{32}-G$/.test(l.staffel??'') && !staffels.has(l.staffel), 'Invalid or duplicate staffel')
    for (const r of Array.isArray(l.reports) ? l.reports : []) {
      if (/^[A-Z0-9]{32}$/.test(r?.id??'')) {
        requireValue(!ids.has(r.id), 'Duplicate report identity across cohort')
        ids.add(r.id)
      }
    }
    keys.add(l.key);staffels.add(l.staffel)
  }
  const leagues=index.leagues.map(l=>inspectLeague(l,baseDirectory))
  return {version:1, mode:'offline-capability-audit', providerRequests:0, databaseWrites:0,
    completeInventories:leagues.filter(l=>l.capturedInventoryComplete).length,
    seasonCoverageVerified:false, activationEligible:false, leagues}
}
