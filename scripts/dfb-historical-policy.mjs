// Provider-only adapter. Shared policy owns approval and availability semantics.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,classifyHistoricalStatistics} from './lib/historical-statistics-policy.mjs'
import {verifyDfbCalendar} from './viri/dfb-calendar.mjs'
import {vZapisnik} from './viri/dfb.mjs'
export const DFB_HISTORICAL_POLICY='de-dfb-suedwest-2025-historical-unavailable-v1'
const sha=x=>createHash('sha256').update(x).digest('hex')
const scopes=JSON.parse(readFileSync(new URL('./viri/dfb-historical-receipts.json',import.meta.url))).scopes
scopes['de-regionalliga-suedwest']={policyId:DFB_HISTORICAL_POLICY,ids:['2402929','2403004'],clubNames:{'tsg-balingen':'TSG Balingen','kickers-offenbach':'Kickers Offenbach','tsv-steinbach-haiger':'TSV Steinbach Haiger'},documents:{'2402929':{time:'14:00',strictDiagnostic:'dfb: nepopolna začetna postava ali vratar'},'2403004':{time:'14:00',strictDiagnostic:'dfb: podvojen rumeni karton brez izključitve'}}}
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};freeze(scopes)
export function dfbHistoricalScope(slug){if(!Object.hasOwn(scopes,slug))throw Error('DFB historical policy: unreviewed scope');return scopes[slug]}
const fail=message=>{throw Error(`DFB historical policy: ${message}`)}
export function dfbHistoricalPolicy(competition){
 const policy=getHistoricalStatisticsPolicy(competition?.slug),{policyId,ids}=dfbHistoricalScope(competition?.slug)
 if(competition.source!=='dfb'||competition.source_policy!==policyId||policy?.id!==policyId||policy.sourcePolicy!==policyId||policy.season!=='2025/26'||JSON.stringify(policy.entries.map(e=>e.sourceMatchId).sort())!==JSON.stringify(ids))fail('unreviewed scope/policy set')
 const first=competition.firstFantasyPlayedOn
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(first??'')||!Number.isFinite(Date.parse(first+'T00:00:00Z'))||new Date(first+'T00:00:00Z').toISOString().slice(0,10)!==first)fail('valid planned first fantasy fixture date required')
 return policy
}
export function dfbPolicyBinding(competition){
 const policy=dfbHistoricalPolicy(competition)
 return {id:policy.id,sha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:competition.firstFantasyPlayedOn}
}
export function dfbFixtureEnvelope(t,round,season,slug='de-regionalliga-suedwest'){
 return {sourceMatchId:String(t.dfbId??t.id).replace(/^de-dfb-/,''),sourceCompetitionId:`${slug.slice(3)}/${season.slice(0,4)}-20${season.slice(-2)}`,sourcePhase:null,sourceRound:round,playedOn:t.datum,homeSourceClubId:t.domaciId,awaySourceClubId:t.gostjeId,sourceUrl:t.url,observedHomeScore:t.izid?.domaci,observedAwayScore:t.izid?.gostje,season}
}
export function collectDfbHistorical({slug:target,sezona,razpored,zapisniki,nepopolni,historicalPolicy}){
 if(!historicalPolicy)return new Map()
 const {competition,documents}=historicalPolicy,policy=dfbHistoricalPolicy(competition),{ids,clubNames,documents:defects}=dfbHistoricalScope(competition.slug)
 if(target!==competition.slug||!['2025/26','2026/27'].includes(sezona)||!(documents instanceof Map))fail('closed source map/scope required')
 const expected=sezona==='2025/26'?ids:[],out=new Map(),reports=new Set(zapisniki.map(r=>r.id))
 for(const r of razpored)for(const t of r.tekme){
  const sourceId=String(t.dfbId??t.id),entry=policy.entries.find(e=>e.sourceMatchId===sourceId)
  if(!entry)continue
  if(sezona!==policy.season||!t.odigrana||reports.has('de-dfb-'+sourceId)||out.has('de-dfb-'+sourceId))fail('unreviewed season/duplicate/statistical report at exception')
  if(t.ura!==defects[sourceId].time)fail('fixture kickoff differs')
  if(t.domaci!==clubNames[entry.homeSourceClubId]||t.gostje!==clubNames[entry.awaySourceClubId])fail('fixture club names differ')
  const raw=documents.get(t.url)
  if(typeof raw!=='string')fail('missing captured exception bytes')
  const classification=classifyHistoricalStatistics({competition,fixture:dfbFixtureEnvelope(t,r.stevilka,sezona,competition.slug),rawSha256:sha(raw),policy})
  if(classification.kind!=='unavailable_historical')fail('expected exact historical classification')
  // Preserve the authentic strict failure as a separate fact, never accept a
  // newly parseable or differently broken source as the reviewed defect.
  let error
  try{vZapisnik(raw,{id:sourceId,tekma:t,liga:competition.slug.slice(3)})}catch(e){error=e}
  const diagnostic=nepopolni.filter(n=>n.id==='de-dfb-'+sourceId)
  const reason=defects[sourceId].strictDiagnostic
  if(error?.koda!=='DFB_INVALID_REPORT'||error.message!==reason||diagnostic.length!==1||diagnostic[0].url!==t.url||diagnostic[0].status!==error.koda||diagnostic[0].razlog!==reason)fail('strict defect/diagnostic changed')
  out.set('de-dfb-'+sourceId,classification)
 }
 if(JSON.stringify([...out.keys()].map(id=>id.slice(7)).sort())!==JSON.stringify(expected))fail('missing/extra historical exceptions')
 return out
}
export function unavailableDfbFixture(t,round,classification){
 const e=classification.exception,policy=Object.keys(scopes).map(slug=>getHistoricalStatisticsPolicy(slug)).find(p=>p.entries.some(entry=>entry.sourceMatchId===e.sourceMatchId))
 if(!policy)fail('unknown unavailable policy')
 return {id:'de-dfb-'+e.sourceMatchId,round,date:t.datum,time:t.ura??null,home:t.domaci,away:t.gostje,played:true,
 homeGoals:e.observedHomeScore,awayGoals:e.observedAwayScore,url:e.sourceUrl,starters:null,warnings:[],appearances:null,goals:null,
 statisticsStatus:'unavailable_historical',statisticsReason:e.reasonCode,statisticsPolicyId:policy.id,statisticsPolicySha256:classification.policySha256,sourceRawSha256:e.rawSha256,
 sourceFixture:{sourceMatchId:e.sourceMatchId,sourceCompetitionId:e.sourceCompetitionId,sourcePhase:e.sourcePhase,sourceRound:e.sourceRound,playedOn:e.playedOn,homeSourceClubId:e.homeSourceClubId,awaySourceClubId:e.awaySourceClubId,sourceUrl:e.sourceUrl,observedHomeScore:e.observedHomeScore,observedAwayScore:e.observedAwayScore,season:'2025/26'}}
}
export function dfbStatisticsCoverage(fixtures){
 const played=fixtures.filter(f=>f.played),unavailable=fixtures.filter(f=>f.statisticsStatus==='unavailable_historical')
 return {fixtureCount:fixtures.length,playedCount:played.length,availableStatisticsCount:played.length-unavailable.length,unavailableHistoricalCount:unavailable.length,strictStatisticsCoverage:unavailable.length===0,policyCoverage:true}
}
function verifyAvailableFixture(f){
 if(!Array.isArray(f.starters)||!Array.isArray(f.appearances)||!Array.isArray(f.goals)||!Array.isArray(f.warnings)||['statisticsReason','statisticsPolicyId','statisticsPolicySha256','sourceRawSha256','sourceFixture'].some(k=>f[k]!=null))fail('normal fixture cannot carry unavailable evidence')
 if(!f.played){
  if(f.starters.length||f.appearances.length||f.goals.length||f.homeGoals!==null||f.awayGoals!==null)fail('future fixture cannot carry played statistics')
  return
 }
 if(!Number.isSafeInteger(f.homeGoals)||f.homeGoals<0||!Number.isSafeInteger(f.awayGoals)||f.awayGoals<0||f.goals.length!==f.homeGoals+f.awayGoals)fail('normal played goals/score differ')
 const key=p=>JSON.stringify([p.side,p.name,Boolean(p.keeper??p.is_goalkeeper)]),canonical=rows=>rows.map(key).sort()
 if(f.starters.length!==22||f.starters.some(p=>![0,1].includes(p.side)||typeof p.name!=='string'||!p.name||typeof p.keeper!=='boolean'||p.proof!==(p.keeper?'oznaka-T':null)))fail('normal played starter/keeper proof missing')
 for(const side of[0,1])if(f.starters.filter(p=>p.side===side).length!==11||f.starters.filter(p=>p.side===side&&p.keeper).length!==1)fail('normal played XI/keeper coverage missing')
 if(f.appearances.some(p=>![0,1].includes(p.side)||typeof p.name!=='string'||!p.name||typeof p.started!=='boolean'||typeof p.is_goalkeeper!=='boolean'||typeof p.clean_sheet!=='boolean'||['minute_on','minute_off','minutes_played','goals','own_goals','penalties_scored','penalties_missed','yellow_cards','red_cards','goals_conceded'].some(k=>!Number.isSafeInteger(p[k])||p[k]<0))||JSON.stringify(canonical(f.starters))!==JSON.stringify(canonical(f.appearances.filter(p=>p.started))))fail('normal played appearances differ from verified starters')
 const scores=[0,0]
 for(const g of f.goals){
  if(![0,1].includes(g.side)||!Number.isSafeInteger(g.minute)||g.minute<1||typeof g.is_own_goal!=='boolean'||typeof g.is_penalty!=='boolean'||!f.appearances.some(p=>p.side===g.side&&p.name===g.name))fail('normal played goal actor/side/minute missing')
  scores[g.is_own_goal?1-g.side:g.side]++
 }
 if(scores[0]!==f.homeGoals||scores[1]!==f.awayGoals)fail('normal played goal sides differ from score')
}
function verifySeasonShape(s,slug){
 const clubs=new Set(),keepers=new Set()
 if(s.code!==`${slug.slice(3)}/${s.season.slice(0,4)}-20${s.season.slice(-2)}`)fail('manifest historical policy season scope differs')
 verifyDfbCalendar({code:s.code,teams:18,rounds:34,fixtures:s.fixtures})
 if(s.fixtures.length!==306)fail('manifest season fixture count differs')
 for(const f of s.fixtures){
  if(!/^de-dfb-[1-9]\d{0,9}$/.test(f.id)||typeof f.home!=='string'||!f.home||typeof f.away!=='string'||!f.away||f.home===f.away||!Number.isSafeInteger(f.round)||f.round<1||f.round>34||typeof f.played!=='boolean'||s.season==='2025/26'&&!f.played)fail('manifest duplicate/invalid fixture or incomplete archive')
  clubs.add(f.home);clubs.add(f.away)
  if(f.statisticsStatus==='available'&&f.played)for(const p of f.starters??[])if(p.keeper&&p.proof==='oznaka-T')keepers.add(p.side===0?f.home:f.away)
 }
 if(clubs.size!==18||[...clubs].some(c=>!keepers.has(c)))fail('manifest club/verified keeper coverage differs')
 for(let round=1;round<=34;round++){
  const fixtures=s.fixtures.filter(f=>f.round===round)
  if(fixtures.length!==9||new Set(fixtures.flatMap(f=>[f.home,f.away])).size!==18)fail('manifest round participation differs')
 }
}
export function verifyDfbPolicySeason(s,binding){
 const slug=Object.keys(scopes).find(slug=>scopes[slug].policyId===binding?.id),{policyId,ids,clubNames,documents:defects}=dfbHistoricalScope(slug)
 const competition={slug,source:'dfb',source_policy:policyId,firstFantasyPlayedOn:binding?.firstFantasyPlayedOn},policy=dfbHistoricalPolicy(competition)
 if(JSON.stringify(binding)!==JSON.stringify(dfbPolicyBinding(competition))||!Array.isArray(s.fixtures)||!['2025/26','2026/27'].includes(s.season))fail('manifest policy binding differs')
 verifySeasonShape(s,slug)
 const unavailable=s.fixtures.filter(f=>f.statisticsStatus==='unavailable_historical'),expected=s.season==='2025/26'?ids:[]
 if(JSON.stringify(unavailable.map(f=>f.id.slice(7)).sort())!==JSON.stringify(expected)||JSON.stringify(s.statisticsCoverage)!==JSON.stringify(dfbStatisticsCoverage(s.fixtures)))fail('manifest historical IDs/coverage differ')
 for(const f of s.fixtures){
  if(f.statisticsStatus==='available'){
   verifyAvailableFixture(f)
  }else if(f.statisticsStatus==='unavailable_historical'){
   if(f.starters!==null||f.appearances!==null||f.goals!==null||f.played!==true)fail('unavailable statistics must be null, never zero rows')
   const classification=classifyHistoricalStatistics({competition,fixture:f.sourceFixture,rawSha256:f.sourceRawSha256,policy}),e=classification.exception
   if(classification.kind!=='unavailable_historical'||f.id!=='de-dfb-'+e.sourceMatchId||f.round!==e.sourceRound||f.date!==e.playedOn||f.url!==e.sourceUrl||f.home!==clubNames[e.homeSourceClubId]||f.away!==clubNames[e.awaySourceClubId]||f.time!==defects[e.sourceMatchId].time||f.homeGoals!==e.observedHomeScore||f.awayGoals!==e.observedAwayScore||f.statisticsReason!==e.reasonCode||f.statisticsPolicyId!==policy.id||f.statisticsPolicySha256!==classification.policySha256)fail('manifest unavailable metadata differs')
  }else fail('unknown statistics status')
 }
 return true
}
