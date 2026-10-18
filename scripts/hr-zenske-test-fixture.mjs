// GENERATED TEST-ONLY SQL surface. No raw documents exist for these synthetic
// normal observations: the production packet reader MUST reject this object.
import {readFileSync} from 'node:fs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {hnsWomenRoundCutoff} from './hr-zenske-deadline.mjs'
export function syntheticHnsWomenManifest() {
 const p=getHistoricalStatisticsPolicy('hr-prva-hnlz'),now=new Date().toISOString(),hash='b'.repeat(64),schedules=[],persistedFixtures=[],reports=[]
 const appearances=(home,away,id)=>[home,away].flatMap((club,side)=>{
  const person=(i,extra={})=>({side,sourcePersonId:String(900000000+Number(club)*100+i),fullName:`TEST ONLY ${club} person ${i}`,shirt_number:i+1,started:true,minute_on:0,minute_off:90,minutes_played:90,goals:0,own_goals:0,penalties_scored:0,penalties_missed:0,yellow_cards:0,red_cards:0,goals_conceded:0,clean_sheet:true,is_goalkeeper:i===0,...extra})
  const people=Array.from({length:11},(_,i)=>person(i))
  if(side===0){Object.assign(people[1],{minute_off:60,minutes_played:60});people.push(person(11,{started:false,minute_on:60,minutes_played:30}))}
  if(id==='100511758'&&side===1){Object.assign(people[0],{minute_off:51,minutes_played:51,red_cards:1});Object.assign(people[1],{minute_off:52,minutes_played:52});people.push(person(12,{started:false,minute_on:52,minutes_played:38,is_goalkeeper:true}))}
  if(id==='100511726'){if(side===0)people[2].goals=1;else for(const person of people){person.clean_sheet=false;if(person.is_goalkeeper)person.goals_conceded=1}}
  return people
 })
 for(const [code,season,file]of [['108043476','2025/26','hns-zenske-archive-phase-fixtures.json'],['114471579','2026/27','hns-zenske-current-fixtures.json']]) {
  const fixtures=JSON.parse(readFileSync(new URL('./vzorci/'+file,import.meta.url))).fixtures.map(raw=>{
   const f={...raw,sourceRound:raw.krog,sourcePhase:code==='114471579'?null:({base:'Magenta liga - Liga',playoff:'Magenta liga 25/26 Play off',playout:'Magenta liga 25/26 Play out'})[raw.publishedPhase],krog:raw.krog+(code==='108043476'&&raw.publishedPhase!=='base'?14:0),postponed:raw.id==='114471614'}
   if(code==='114471579'&&f.krog>=9){f.datum=new Date(Date.now()+7*(f.krog-8)*86400000).toISOString().slice(0,10);f.ura=null}
   const played=code==='108043476'||f.krog<9&&!f.postponed,exception=p.entries.find(e=>e.sourceMatchId===f.id)
   f.izid=played?{domaci:exception?.observedHomeScore??(f.id==='100511726'?1:0),gostje:exception?.observedAwayScore??0}:null
   const {rawSha256,reasonCode,...sourceIdentity}=exception??{},historical=exception?{policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),reasonCode}:null
   const evidence={sourceMatchId:f.id,sourceCompetitionId:code,season,internalRound:f.krog,sourceRound:f.sourceRound,sourcePhase:f.sourcePhase,playedOn:f.datum,kickoff:f.ura,homeSourceClubId:f.domaciId,awaySourceClubId:f.gostjeId,homeName:f.domaci,awayName:f.gostje,played,explicitPostponed:f.postponed,homeGoals:f.izid?.domaci??null,awayGoals:f.izid?.gostje??null,sourceUrl:`https://semafor.hns.family/utakmice/${f.id}/x/`,statisticsStatus:exception?'unavailable_historical':'available',rawSha256:played?rawSha256??hash:null,capturedAt:played?now:null,warnings:played&&!exception?[]:null,quality:played&&!exception?{explicitKeeperSides:2,warnings:[],keeperTransitions:[]}:null,historicalStatistics:historical,sourceFixture:exception?{...sourceIdentity,season}:null,appearances:exception?null:played?appearances(f.domaciId,f.gostjeId,f.id):[],goals:exception?null:f.id==='100511726'?[{side:0,sourcePersonId:String(900000000+Number(f.domaciId)*100+2),minute:20,is_own_goal:false,is_penalty:false,score_home:1,score_away:0}]:[]}
   persistedFixtures.push(evidence)
   if(played)reports.push({id:f.id,statisticsStatus:evidence.statisticsStatus,rawSha256:evidence.rawSha256})
   return f
  })
  schedules.push({code,season,sha256:hash,capturedAt:now,fixtures})
 }
 const future={round:9,...hnsWomenRoundCutoff(schedules[1].fixtures.filter(f=>f.krog===9),{policy:'midnight-local-v1'})}
 return{testOnly:'GENERATED SQL TEST SURFACE; NOT ORIGINAL RAW EVIDENCE; NEVER OPERATIONAL',version:1,slug:'hr-prva-hnlz',source:'hns',sourcePolicy:'hr-hnlz-v1',dateOnlyDeadlinePolicy:'midnight-local-v1',sourceCommit:'a'.repeat(40),parserSha256:hash,currentPhase:'initial14rounds_only',statisticsPolicy:{id:p.id,sha256:historicalStatisticsPolicySha256(p),firstFantasyPlayedOn:future.playedOn},sourceBudget:{hnsRequests:142,otherRequests:1,total:143,refusalObserved:false},firstFantasyRound:9,future,schedules,reports,persistedFixtures,coverage:{fixtureCount:131,archiveComplete:75,currentPublishedPlayed:31,normalComplete:103,unavailableHistorical:3,pending:25,explicitPostponed:1,eligibleCurrentClubs:8},releaseReady:true,releaseBlockingPendingIds:[]}
}
