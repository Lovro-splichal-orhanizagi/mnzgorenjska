// TEST ONLY: genuine schedule headers and unavailable raw facts; individual rows
// below are visibly synthetic, never source observations or production input.
import {readFileSync}from'node:fs'
import {calendar}from'./dfb-calendar-test-fixture.mjs'
import {dfbPolicyBinding,dfbHistoricalScope,unavailableDfbFixture,dfbStatisticsCoverage,collectDfbHistorical}from'./dfb-historical-policy.mjs'
import {getHistoricalStatisticsPolicy,classifyHistoricalStatistics}from'./lib/historical-statistics-policy.mjs'
import {parserSha256}from'./vklopi-dfb-regijo.mjs'
import {receiptSha256}from'./viri/dfb-calendar.mjs'
import {captureWorkflow,replayWorkflow,captureStep,policyReplayStep}from'./dfb-replay-proof.mjs'
export function nordWestPolicyFixture(region='nord'){
 const slug=`de-regionalliga-${region}`,scope=dfbHistoricalScope(slug),p=getHistoricalStatisticsPolicy(slug),future=new Date(Date.now()+3*86400000).toISOString().slice(0,10),competition={slug,source:'dfb',source_policy:p.id,firstFantasyPlayedOn:future},binding=dfbPolicyBinding(competition),source=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-historical-calendars.json',import.meta.url))).seasons.find(s=>s.region===region)
 const documents=new Map(),nepopolni=[]
 for(const e of p.entries){documents.set(e.sourceUrl,readFileSync(new URL(scope.documents[e.sourceMatchId].file,new URL('./viri/',import.meta.url)),'utf8'));nepopolni.push({id:'de-dfb-'+e.sourceMatchId,url:e.sourceUrl,status:'DFB_INVALID_REPORT',razlog:scope.documents[e.sourceMatchId].strictDiagnostic})}
 const archiveSchedule=Array.from({length:34},(_,i)=>({stevilka:i+1,tekme:source.fixtures.filter(f=>f.round===i+1).map(f=>({id:f.id.slice(7),domaci:f.home,gostje:f.away,domaciId:f.homeSourceClubId,gostjeId:f.awaySourceClubId,datum:f.date,ura:f.time,izid:{domaci:f.homeGoals,gostje:f.awayGoals},url:f.url,odigrana:true}))}))
 const classified=collectDfbHistorical({slug,sezona:'2025/26',razpored:archiveSchedule,zapisniki:source.fixtures.filter(f=>!p.entries.some(e=>'de-dfb-'+e.sourceMatchId===f.id)),nepopolni,historicalPolicy:{competition,documents}})
 const name=(club,i)=>`${club} TEST ONLY Player ${i}`
 const normal=(f,played)=>{
  const appearances=[],starters=[],goals=[],scores=[0,0]
  for(const[side,club]of[f.home,f.away].entries())for(let i=0;i<12;i++){
   const keeper=i===0,started=i<11,scored=played&&i===1?(side?f.awayGoals:f.homeGoals):0,against=side?f.homeGoals:f.awayGoals
   appearances.push({side,name:name(club,i),shirt_number:i+1,started,minute_on:started?0:75,minute_off:i===10?75:90,minutes_played:i===10?75:started?90:15,goals:scored,own_goals:0,penalties_scored:0,penalties_missed:0,yellow_cards:0,red_cards:0,goals_conceded:against,clean_sheet:against===0&&started,is_goalkeeper:keeper})
   if(started)starters.push({side,name:name(club,i),keeper,proof:keeper?'oznaka-T':null})
   for(let g=0;g<scored;g++){scores[side]++;goals.push({side,name:name(club,i),minute:g+1,is_own_goal:false,is_penalty:false,score_home:scores[0],score_away:scores[1]})}
  }
  return{...f,played,statisticsStatus:'available',homeGoals:played?f.homeGoals:null,awayGoals:played?f.awayGoals:null,starters:played?starters:[],appearances:played?appearances:[],goals:played?goals:[],warnings:[]}
 }
 const archive=source.fixtures.map(f=>{const c=classified.get(f.id);if(!c)return normal(f,true);const t=archiveSchedule.flatMap(r=>r.tekme).find(t=>'de-dfb-'+t.id===f.id);return unavailableDfbFixture(t,f.round,c)})
 const currentSchedule=calendar(region).fixtures
 // Closed DFB schedule captures show these Nord fixtures as "- : - / verl.",
 // so keep their actual identities and dates in the native SQL regression packet.
 if(region==='nord'){
  const placeholderRounds=currentSchedule.filter(f=>f.round===12&&/^Club /.test(f.home)&&/^Club /.test(f.away))
  if(placeholderRounds.length<2)throw Error('Nord test calendar needs two round-12 placeholder fixtures')
  const clubs=new Map([
   [placeholderRounds[0].home,['Atlas Delmenhorst','atlas-delmenhorst']],
   [placeholderRounds[0].away,['FC St. Pauli II','fc-st-pauli-ii']],
   [placeholderRounds[1].home,['Eintracht Norderstedt','eintracht-norderstedt']],
   [placeholderRounds[1].away,['Bremer SV','bremer-sv']],
  ])
  for(const f of currentSchedule){
   if(clubs.has(f.home))[f.home,f.homeSourceClubId]=clubs.get(f.home)
   if(clubs.has(f.away))[f.away,f.awaySourceClubId]=clubs.get(f.away)
  }
  const postponed=[
   {id:'2423176',round:11,home:'1. FC Phönix Lübeck',away:'VfB Oldenburg',date:'2026-09-26',url:'https://datencenter.dfb.de/datencenter/regionalliga-nord/2026-2027/11-spieltag/1-fc-phoenix-luebeck-vfb-oldenburg-2423176'},
   {id:'2423187',round:12,home:'Atlas Delmenhorst',away:'FC St. Pauli II',date:'2026-10-03',url:'https://datencenter.dfb.de/datencenter/regionalliga-nord/2026-2027/12-spieltag/atlas-delmenhorst-fc-st-pauli-ii-2423187'},
   {id:'2423188',round:12,home:'Eintracht Norderstedt',away:'Bremer SV',date:'2026-10-03',url:'https://datencenter.dfb.de/datencenter/regionalliga-nord/2026-2027/12-spieltag/eintracht-norderstedt-bremer-sv-2423188'},
  ]
  for(const p of postponed){
   const f=currentSchedule.find(x=>x.round===p.round&&x.home===p.home&&x.away===p.away)
   if(!f)throw Error(`Nord test calendar missing source-confirmed postponed fixture ${p.id}`)
   Object.assign(f,{id:p.id,date:p.date,url:p.url,postponed:true})
  }
 }
 const current=currentSchedule.map(f=>{
  const date=f.postponed?f.date:f.round<=2?new Date(Date.now()-(3-f.round)*86400000).toISOString().slice(0,10):new Date(Date.parse(future)+(f.round-3)*5*86400000).toISOString().slice(0,10)
  const url=f.postponed?f.url:`https://datencenter.dfb.de/datencenter/regionalliga-${region}/2026-2027/${f.round}-spieltag/TEST-ONLY-${f.id}`
  return normal({...f,id:'de-dfb-'+f.id,date,time:'14:00',homeGoals:0,awayGoals:0,url},f.round<=2)
 })
 const at=new Date().toISOString(),sourceCommit='a'.repeat(40),parser=parserSha256()
 const seasons=[archive,current].map((fixtures,i)=>{const season=i?'2026/27':'2025/26',s={season,code:`regionalliga-${region}/${i?'2026-2027':'2025-2026'}`,capturedAt:at,runId:String(500+i),jobId:String(600+i),documentsSha256:'c'.repeat(64),fixtures,statisticsCoverage:dfbStatisticsCoverage(fixtures),evidenceMode:'policy-replay'};s.lineage={capture:{runId:String(100+i),jobId:String(200+i),commit:'b'.repeat(40),workflow:captureWorkflow,step:captureStep(season),conclusion:i?'success':'failure',workflowSha256:'c'.repeat(64),parserSha256:'d'.repeat(64),artifactId:String(300+i),artifactDigest:'sha256:'+'e'.repeat(64),indexSha256:'f'.repeat(64),documentsSha256:s.documentsSha256,capturedAt:at},replay:{runId:s.runId,jobId:s.jobId,commit:sourceCommit,workflow:replayWorkflow,step:policyReplayStep,workflowSha256:'1'.repeat(64),parserSha256:parser,artifactId:String(700+i),artifactDigest:'sha256:'+'2'.repeat(64),generatedAt:at,statisticsPolicyId:binding.id,statisticsPolicySha256:binding.sha256,firstFantasyPlayedOn:binding.firstFantasyPlayedOn}};return s})
 return{version:4,provenanceVersion:2,calendarReceiptSha256:receiptSha256,slug,sourceCommit,parserSha256:parser,statisticsPolicy:binding,seasons}
}
