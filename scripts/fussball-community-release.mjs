// The reviewed community route keeps the ordinary readiness assessment intact.
// It adds exact source/cache admission; it never rewrites native source policy.
import {createHash} from 'node:crypto'
import {oceniPripravljenost,najcenejsiKader} from '../src/lib/pripravljenost.ts'
import {validateGermanyCandidate} from './bulk-germany-source.mjs'
import {isFussballCommunityCandidate,FUSSBALL_COMMUNITY_SOURCE_POLICY} from './fussball-community-policy.mjs'
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const require=(ok,message)=>{if(!ok)throw Object.assign(Error(`FUSSBALL community release: ${message}`),{dataHold:true,reason_code:'COMMUNITY_CARD_RELEASE_HOLD'})}
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v
export const canonicalFussballAdmissionSha256=manifest=>hash(canonical(manifest))
export function assertReviewedFussballCommunityCandidate(candidate){
 require(isFussballCommunityCandidate(candidate),'reviewed community candidate required')
 const {id,...catalog}=candidate
 try{validateGermanyCandidate(catalog)}catch(error){require(false,error.message)}
 return candidate
}
function bound({candidate,snapshot}){
 assertReviewedFussballCommunityCandidate(candidate)
 const c=snapshot?.competition,b=snapshot?.fussball_cards
 require(c&&c.active===false&&Number.isSafeInteger(c.id)&&c.id===candidate.id&&c.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY&&c.date_only_deadline_policy===null&&['slug','source','source_league_code','country_code'].every(k=>c[k]===candidate[k]),'inactive exact installed native competition required')
 require(b?.installed===true&&b.enabled===true&&b.source_policy===FUSSBALL_COMMUNITY_SOURCE_POLICY&&b.current_code===candidate.source_league_code&&Array.isArray(b.archive_codes)&&hash([...b.archive_codes].sort())===hash(candidate.archives.map(a=>a.code).sort()),'installed enabled current/archive scope required')
 require(Array.isArray(snapshot.fantasy?.teams)&&!snapshot.fantasy.teams.length&&Array.isArray(snapshot.fantasy?.lineups)&&!snapshot.fantasy.lineups.length,'fantasy activity prevents community bootstrap')
 return b
}
export function inspectFussballCommunityReadiness({candidate,snapshot,state}){
 bound({candidate,snapshot})
 for(const key of ['aktivnih','privzetih','klubov','najvisja_cena','nastopov_s_klopi','golov_brez_nastopa','krogov_tekoce'])require(state?.[key]!=null&&Number.isFinite(Number(state[key])),`normal readiness state missing: ${key}`)
 const assessment=oceniPripravljenost({aktivnih:Number(state.aktivnih),privzetih:Number(state.privzetih),klubov:Number(state.klubov),najvisjaCena:Number(state.najvisja_cena),poPozicijah:state.po_pozicijah,nastopovSKlopi:Number(state.nastopov_s_klopi),golovBrezNastopa:Number(state.golov_brez_nastopa),krogovTekoce:Number(state.krogov_tekoce),igralci:state.igralci})
 require(assessment.pripravljena,assessment.tezave.map(t=>`${t.kljuc}: ${t.kaj}`).join('; '))
 return {assessment,cheapest_squad:najcenejsiKader(state.igralci)}
}
export function buildFussballCardAdmission({candidate,pack,snapshot,proof,seedCacheReceipt,expectedSha,runId,now=new Date()}){
 const binding=bound({candidate,snapshot}),time=+new Date(now)
 require(Number.isFinite(time)&&proof?.version===1&&proof.contract_id==='bulk-native-community-cards-v1'&&proof.expected_sha===expectedSha&&proof.snapshot_sha256===hash(snapshot)&&proof.pack_sha256===hash(pack)&&proof.schedule_complete===true&&proof.activationEligible===false&&proof.pending_inventory_sha256===binding.pending_inventory_sha256,'full native source proof/snapshot/pending inventory differs')
 const receipt=seedCacheReceipt,cache=receipt?.cache
 require(/^[a-f0-9]{40}$/.test(expectedSha??'')&&/^[1-9]\d*$/.test(runId??'')&&receipt?.version===1&&receipt.expected_sha===expectedSha&&receipt.run_id===runId&&receipt.persisted===true&&Number.isSafeInteger(cache?.id)&&cache.id>0&&cache.key===`zapisniki-DE-bulk-${runId}-1`&&cache.ref==='refs/heads/main'&&typeof cache.version==='string'&&cache.version&&Number.isSafeInteger(cache.size_in_bytes)&&cache.size_in_bytes>0,'exact durable nightly cache receipt required')
 require(snapshot.season===candidate.season&&Array.isArray(snapshot.rounds)&&Array.isArray(snapshot.matches),'native opening inventory missing')
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time))
 const opening=snapshot.rounds.filter(r=>r.season===candidate.season&&Number.isFinite(Date.parse(r.deadline_at))&&Date.parse(r.deadline_at)>time&&r.played_on>=today&&r.lineups_locked_at==null).sort((a,b)=>a.number-b.number).find(r=>{
  const matches=snapshot.matches.filter(m=>m.round_id===r.id)
  return matches.length>0&&matches.every(m=>!m.imported_at&&m.zapisnik_id==null&&m.home_goals===0&&m.away_goals===0&&m.statistics_status==='available'&&m.played_on>=today&&Array.isArray(m.appearance_rows)&&!m.appearance_rows.length&&Array.isArray(m.goal_rows)&&!m.goal_rows.length)
 })
 require(opening,'untouched future opening round required')
 const playedReports=[]
 require(Array.isArray(pack.seasons)&&Array.isArray(binding.registered_reports),'full registered source report inventory missing')
 for(const scope of [{code:candidate.source_league_code,season:candidate.season},...candidate.archives]){
  const season=pack.seasons.find(s=>s.code===scope.code&&s.season===scope.season)
  require(season&&Array.isArray(season.reports)&&Array.isArray(season.pendingReports),'both source seasons and typed reports required')
  const reports=[...season.reports,...season.pendingReports];require(reports.length>0,'source season has no played reports')
  for(const report of reports){
   const matches=snapshot.matches.filter(m=>m.zapisnik_id===report.id),registration=binding.registered_reports.find(r=>r.report_id===report.id&&r.source_code===scope.code)
   require(matches.length===1&&registration?.match_id===matches[0].id&&registration.revision_sha256===report.cardEnvelope?.revisionSha256&&/^[a-f0-9]{64}$/.test(registration.revision_sha256)&&!matches[0].kontumacija&&(matches[0].imported_at||matches[0].statistics_status==='pending_cards'),'played source/native revision inventory differs')
   playedReports.push({matchId:matches[0].id,reportId:report.id,revisionSha256:registration.revision_sha256})
  }
 }
 playedReports.sort((a,b)=>a.matchId-b.matchId)
 require(new Set(playedReports.map(r=>r.matchId)).size===playedReports.length&&playedReports.length===proof.reports&&playedReports.length===binding.registered_reports.length,'complete distinct played report inventory differs')
 const manifest={version:1,currentCode:candidate.source_league_code,archiveCodes:candidate.archives.map(a=>a.code),sourceProofSha256:hash(proof),nightlyCacheSha256:hash(receipt),pendingInventorySha256:binding.pending_inventory_sha256,playedReports,openingRoundId:opening.id}
 return {manifest,sha256:canonicalFussballAdmissionSha256(manifest),openingRound:structuredClone(opening)}
}
