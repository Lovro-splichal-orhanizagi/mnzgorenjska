// Provider-only adapter. Shared policy owns approval and availability semantics.
import {createHash} from 'node:crypto'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,classifyHistoricalStatistics} from './lib/historical-statistics-policy.mjs'
import {vZapisnik} from './viri/dfb.mjs'
export const DFB_HISTORICAL_POLICY='de-dfb-suedwest-2025-historical-unavailable-v1'
const slug='de-regionalliga-suedwest',ids=['2402929','2403004'],sha=x=>createHash('sha256').update(x).digest('hex')
const clubNames={'tsg-balingen':'TSG Balingen','kickers-offenbach':'Kickers Offenbach','tsv-steinbach-haiger':'TSV Steinbach Haiger'}
const fail=message=>{throw Error(`DFB historical policy: ${message}`)}
export function dfbHistoricalPolicy(competition){
 const policy=getHistoricalStatisticsPolicy(competition?.slug)
 if(competition?.slug!==slug||competition.source!=='dfb'||competition.source_policy!==DFB_HISTORICAL_POLICY||policy?.id!==DFB_HISTORICAL_POLICY||policy.sourcePolicy!==DFB_HISTORICAL_POLICY||policy.season!=='2025/26'||JSON.stringify(policy.entries.map(e=>e.sourceMatchId).sort())!==JSON.stringify(ids))fail('unreviewed scope/policy set')
 const first=competition.firstFantasyPlayedOn
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(first??'')||!Number.isFinite(Date.parse(first+'T00:00:00Z'))||new Date(first+'T00:00:00Z').toISOString().slice(0,10)!==first)fail('valid planned first fantasy fixture date required')
 return policy
}
export function dfbPolicyBinding(competition){
 const policy=dfbHistoricalPolicy(competition)
 return {id:policy.id,sha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:competition.firstFantasyPlayedOn}
}
export function dfbFixtureEnvelope(t,round,season){
 return {sourceMatchId:String(t.dfbId??t.id).replace(/^de-dfb-/,''),sourceCompetitionId:`regionalliga-suedwest/${season.slice(0,4)}-20${season.slice(-2)}`,sourcePhase:null,sourceRound:round,playedOn:t.datum,homeSourceClubId:t.domaciId,awaySourceClubId:t.gostjeId,sourceUrl:t.url,observedHomeScore:t.izid?.domaci,observedAwayScore:t.izid?.gostje,season}
}
export function collectDfbHistorical({slug:target,sezona,razpored,zapisniki,nepopolni,historicalPolicy}){
 if(!historicalPolicy)return new Map()
 const {competition,documents}=historicalPolicy,policy=dfbHistoricalPolicy(competition)
 if(target!==competition.slug||!['2025/26','2026/27'].includes(sezona)||!(documents instanceof Map))fail('closed source map/scope required')
 const expected=sezona==='2025/26'?ids:[],out=new Map(),reports=new Set(zapisniki.map(r=>r.id))
 for(const r of razpored)for(const t of r.tekme){
  const sourceId=String(t.dfbId??t.id),entry=policy.entries.find(e=>e.sourceMatchId===sourceId)
  if(!entry)continue
  if(sezona!==policy.season||!t.odigrana||reports.has('de-dfb-'+sourceId)||out.has('de-dfb-'+sourceId))fail('unreviewed season/duplicate/statistical report at exception')
  if(t.ura!=='14:00')fail('fixture kickoff differs')
  if(t.domaci!==clubNames[entry.homeSourceClubId]||t.gostje!==clubNames[entry.awaySourceClubId])fail('fixture club names differ')
  const raw=documents.get(t.url)
  if(typeof raw!=='string')fail('missing captured exception bytes')
  const classification=classifyHistoricalStatistics({competition,fixture:dfbFixtureEnvelope(t,r.stevilka,sezona),rawSha256:sha(raw),policy})
  if(classification.kind!=='unavailable_historical')fail('expected exact historical classification')
  // Preserve the authentic strict failure as a separate fact, never accept a
  // newly parseable or differently broken source as the reviewed defect.
  let error
  try{vZapisnik(raw,{id:sourceId,tekma:t,liga:'regionalliga-suedwest'})}catch(e){error=e}
  const diagnostic=nepopolni.filter(n=>n.id==='de-dfb-'+sourceId)
  const reason=sourceId==='2402929'?'dfb: nepopolna začetna postava ali vratar':'dfb: podvojen rumeni karton brez izključitve'
  if(error?.koda!=='DFB_INVALID_REPORT'||error.message!==reason||diagnostic.length!==1||diagnostic[0].url!==t.url||diagnostic[0].status!==error.koda||diagnostic[0].razlog!==reason)fail('strict defect/diagnostic changed')
  out.set('de-dfb-'+sourceId,classification)
 }
 if(JSON.stringify([...out.keys()].map(id=>id.slice(7)).sort())!==JSON.stringify(expected))fail('missing/extra historical exceptions')
 return out
}
export function unavailableDfbFixture(t,round,classification){
 const e=classification.exception
 return {id:'de-dfb-'+e.sourceMatchId,round,date:t.datum,time:t.ura??null,home:t.domaci,away:t.gostje,played:true,
 homeGoals:e.observedHomeScore,awayGoals:e.observedAwayScore,url:e.sourceUrl,starters:null,warnings:[],appearances:null,goals:null,
 statisticsStatus:'unavailable_historical',statisticsReason:e.reasonCode,statisticsPolicyId:DFB_HISTORICAL_POLICY,statisticsPolicySha256:classification.policySha256,sourceRawSha256:e.rawSha256,
 sourceFixture:{sourceMatchId:e.sourceMatchId,sourceCompetitionId:e.sourceCompetitionId,sourcePhase:e.sourcePhase,sourceRound:e.sourceRound,playedOn:e.playedOn,homeSourceClubId:e.homeSourceClubId,awaySourceClubId:e.awaySourceClubId,sourceUrl:e.sourceUrl,observedHomeScore:e.observedHomeScore,observedAwayScore:e.observedAwayScore,season:'2025/26'}}
}
export function dfbStatisticsCoverage(fixtures){
 const played=fixtures.filter(f=>f.played),unavailable=fixtures.filter(f=>f.statisticsStatus==='unavailable_historical')
 return {fixtureCount:fixtures.length,playedCount:played.length,availableStatisticsCount:played.length-unavailable.length,unavailableHistoricalCount:unavailable.length,strictStatisticsCoverage:unavailable.length===0,policyCoverage:true}
}
export function verifyDfbPolicySeason(s,binding){
 const competition={slug,source:'dfb',source_policy:DFB_HISTORICAL_POLICY,firstFantasyPlayedOn:binding?.firstFantasyPlayedOn},policy=dfbHistoricalPolicy(competition)
 if(JSON.stringify(binding)!==JSON.stringify(dfbPolicyBinding(competition))||!Array.isArray(s.fixtures)||!['2025/26','2026/27'].includes(s.season))fail('manifest policy binding differs')
 const unavailable=s.fixtures.filter(f=>f.statisticsStatus==='unavailable_historical'),expected=s.season==='2025/26'?ids:[]
 if(JSON.stringify(unavailable.map(f=>f.id.slice(7)).sort())!==JSON.stringify(expected)||JSON.stringify(s.statisticsCoverage)!==JSON.stringify(dfbStatisticsCoverage(s.fixtures)))fail('manifest historical IDs/coverage differ')
 for(const f of s.fixtures){
  if(f.statisticsStatus==='available'){
   if(!Array.isArray(f.starters)||!Array.isArray(f.appearances)||!Array.isArray(f.goals)||f.statisticsReason!=null||f.statisticsPolicyId!=null||f.sourceRawSha256!=null)fail('normal fixture cannot carry unavailable evidence')
  }else if(f.statisticsStatus==='unavailable_historical'){
   if(f.starters!==null||f.appearances!==null||f.goals!==null||f.played!==true)fail('unavailable statistics must be null, never zero rows')
   const classification=classifyHistoricalStatistics({competition,fixture:f.sourceFixture,rawSha256:f.sourceRawSha256,policy}),e=classification.exception
   if(classification.kind!=='unavailable_historical'||f.id!=='de-dfb-'+e.sourceMatchId||f.round!==e.sourceRound||f.date!==e.playedOn||f.url!==e.sourceUrl||f.home!==clubNames[e.homeSourceClubId]||f.away!==clubNames[e.awaySourceClubId]||f.time!=='14:00'||f.homeGoals!==e.observedHomeScore||f.awayGoals!==e.observedAwayScore||f.statisticsReason!==e.reasonCode||f.statisticsPolicyId!==policy.id||f.statisticsPolicySha256!==classification.policySha256)fail('manifest unavailable metadata differs')
  }else fail('unknown statistics status')
 }
 return true
}
